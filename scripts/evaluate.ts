import { readFile, mkdir, open } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import { MODES, type ModeId } from "../lib/intent";

export { MODES };
export type Mode = ModeId;
type Split = "development" | "held-out" | "all";
type EvalCase = { id: string; expected: Mode; scenario: string; draft: string };
type LatencySummary = { count: number; p50: number | null; p95: number | null; max: number | null };
type Observation = {
  id: string;
  expected: Mode;
  scenario: string;
  actual?: Mode;
  correct?: boolean;
  model?: string;
  source?: "live";
  probabilities?: Record<Mode, number>;
  elapsedMs: number;
  serverLatencyMs?: number;
  error?: { code: string; httpStatus?: number };
};
type Options = { split: Split; baseUrl: string; output?: string; maxCases?: number };

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isMode = (value: unknown): value is Mode => typeof value === "string" && MODES.includes(value as Mode);
const round = (value: number) => Math.round(value * 100) / 100;

export function latencySummary(values: number[]): LatencySummary {
  const sorted = values.filter((value) => Number.isFinite(value) && value >= 0).sort((a, b) => a - b);
  const percentile = (fraction: number) => sorted.length ? round(sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)]) : null;
  return { count: sorted.length, p50: percentile(0.5), p95: percentile(0.95), max: sorted.length ? round(sorted[sorted.length - 1]) : null };
}

export function summarize(observations: Observation[]) {
  const completed = observations.filter((item) => item.actual !== undefined);
  const correct = completed.filter((item) => item.correct).length;
  const perMode = Object.fromEntries(MODES.map((mode) => {
    const items = completed.filter((item) => item.expected === mode);
    const matches = items.filter((item) => item.correct).length;
    return [mode, { completed: items.length, correct: matches, accuracy: items.length ? matches / items.length : null }];
  }));
  const confusionMatrix = Object.fromEntries(MODES.map((expected) => [expected,
    Object.fromEntries(MODES.map((actual) => [actual, completed.filter((item) => item.expected === expected && item.actual === actual).length])),
  ]));
  return {
    attempted: observations.length,
    completed: completed.length,
    failed: observations.length - completed.length,
    correct,
    accuracy: completed.length ? correct / completed.length : null,
    perMode,
    confusionMatrix,
    clientRoundTripMs: latencySummary(completed.map((item) => item.elapsedMs)),
    serverReportedMs: latencySummary(completed.flatMap((item) => item.serverLatencyMs === undefined ? [] : [item.serverLatencyMs])),
  };
}

export function parseArgs(args: string[]): Options {
  const options: Options = { split: "development", baseUrl: "http://localhost:3000" };
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${key}.`);
    if (key === "--split" && ["development", "held-out", "all"].includes(value)) options.split = value as Split;
    else if (key === "--base-url") options.baseUrl = value;
    else if (key === "--output") options.output = value;
    else if (key === "--max-cases" && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0) options.maxCases = Number(value);
    else throw new Error(`Unknown option or invalid value: ${key}.`);
  }
  let endpoint: URL;
  try { endpoint = new URL(options.baseUrl); } catch { throw new Error("--base-url must be an HTTP(S) origin."); }
  if (!["http:", "https:"].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || !["", "/"].includes(endpoint.pathname)) {
    throw new Error("--base-url must be an HTTP(S) origin without credentials, path, query, or fragment.");
  }
  options.baseUrl = endpoint.origin;
  return options;
}

async function loadCases(split: Split): Promise<EvalCase[]> {
  const splits = split === "all" ? ["development", "held-out"] : [split];
  const cases: EvalCase[] = [];
  for (const current of splits) {
    const data = JSON.parse(await readFile(path.join(projectRoot, "evaluation", "search", `${current}.json`), "utf8"));
    if (data.schemaVersion !== 1 || data.dataset !== "search-v2" || data.split !== current || !Array.isArray(data.cases)) throw new Error(`Invalid ${current} dataset.`);
    for (const item of data.cases) {
      if (typeof item.id !== "string" || !isMode(item.expected) || typeof item.scenario !== "string" || typeof item.draft !== "string" || !item.draft.trim()) {
        throw new Error(`Invalid example in ${current} dataset.`);
      }
      cases.push(item);
    }
  }
  if (new Set(cases.map((item) => item.id)).size !== cases.length) throw new Error("Evaluation case IDs must be unique.");
  return cases;
}

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000), redirect: "error" });
  let body: unknown;
  try { body = await response.json(); } catch { body = null; }
  return { response, body: body && typeof body === "object" ? body as Record<string, unknown> : null };
}

function safeErrorCode(value: unknown, fallback: string): string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value) ? value : fallback;
}

function validProbabilities(value: unknown): value is Record<Mode, number> {
  if (!value || typeof value !== "object") return false;
  const probabilities = value as Record<string, unknown>;
  if (!MODES.every((mode) => typeof probabilities[mode] === "number" && Number.isFinite(probabilities[mode]) && (probabilities[mode] as number) >= 0 && (probabilities[mode] as number) <= 1)) return false;
  return Math.abs(MODES.reduce((sum, mode) => sum + (probabilities[mode] as number), 0) - 1) <= 0.01;
}

export async function runEvaluation(options: Options) {
  const allCases = await loadCases(options.split);
  const cases = options.maxCases ? allCases.slice(0, options.maxCases) : allCases;
  const startedAt = new Date().toISOString();
  const defaultName = `${startedAt.replace(/[:.]/g, "-")}-search-${options.split}.json`;
  const destination = path.resolve(projectRoot, options.output ?? path.join("evaluation", "results", defaultName));
  await mkdir(path.dirname(destination), { recursive: true });
  // Reserve the output before spending any live allowance. Never overwrite a report.
  const reportFile = await open(destination, "wx");
  const observations: Observation[] = [];
  let status: "completed" | "blocked" | "interrupted" = "completed";
  let stopReason: string | undefined;

  console.log(`Evaluating ${cases.length} ${options.split} cases sequentially. Requests use the application's normal budget protection.`);
  try {
    const { response, body } = await requestJson(`${options.baseUrl}/api/status`);
    if (!response.ok || body?.liveAvailable !== true) {
      status = "blocked";
      stopReason = response.ok ? "live_unavailable" : `status_http_${response.status}`;
    }
  } catch {
    status = "blocked";
    stopReason = "status_request_failed";
  }

  if (status !== "blocked") {
    for (const item of cases) {
      const started = performance.now();
      const observation: Observation = { id: item.id, expected: item.expected, scenario: item.scenario, elapsedMs: 0 };
      try {
        const { response, body } = await requestJson(`${options.baseUrl}/api/intent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Origin: options.baseUrl },
          body: JSON.stringify({ draft: item.draft }),
        });
        observation.elapsedMs = round(performance.now() - started);
        if (!response.ok) {
          observation.error = { code: safeErrorCode(body?.code, "http_error"), httpStatus: response.status };
        } else if (!body || !isMode(body.mode) || body.source !== "live" || typeof body.model !== "string" || !validProbabilities(body.probabilities) || typeof body.latencyMs !== "number" || !Number.isFinite(body.latencyMs) || body.latencyMs < 0) {
          observation.error = { code: "invalid_live_response", httpStatus: response.status };
        } else {
          observation.actual = body.mode;
          observation.correct = body.mode === item.expected;
          observation.model = body.model;
          observation.source = "live";
          observation.probabilities = body.probabilities;
          observation.serverLatencyMs = round(body.latencyMs);
        }
      } catch {
        observation.elapsedMs = round(performance.now() - started);
        observation.error = { code: "request_failed" };
      }
      observations.push(observation);
      console.log(`${item.id}: ${observation.error ? `stopped (${observation.error.code})` : `${observation.actual} ${observation.correct ? "✓" : `✗ expected ${item.expected}`} · ${observation.elapsedMs}ms`}`);
      if (observation.error) {
        status = "interrupted";
        stopReason = observation.error.code;
        break;
      }
    }
  }

  const summary = summarize(observations);
  const report = {
    schemaVersion: 1,
    dataset: "search-v2",
    startedAt,
    finishedAt: new Date().toISOString(),
    endpointOrigin: options.baseUrl,
    split: options.split,
    datasetCases: allCases.length,
    requestedCases: cases.length,
    partialSample: cases.length !== allCases.length,
    status,
    stopReason,
    methodology: "Sequential live requests through /api/intent. Accuracy excludes failed requests, which are reported separately. Latency uses completed requests and includes cold starts; percentiles use nearest rank. Client timing includes HTTP overhead; server timing is reported by the endpoint. No retries or budget bypasses.",
    summary,
    observations,
  };
  try {
    await reportFile.writeFile(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await reportFile.close();
  }
  console.log(`Report: ${path.relative(projectRoot, destination)}`);
  console.log(`Completed ${summary.completed}/${cases.length}; accuracy ${summary.accuracy === null ? "unavailable" : `${(summary.accuracy * 100).toFixed(1)}%`}; client p50/p95 ${summary.clientRoundTripMs.p50 ?? "—"}/${summary.clientRoundTripMs.p95 ?? "—"}ms.`);
  if (status !== "completed") {
    console.error(`Evaluation ${status}: ${stopReason}. No retry was made.`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv.includes("--help")) {
    console.log("Usage: npm run evaluate -- [--split development|held-out|all] [--base-url http://localhost:3000] [--max-cases N] [--output evaluation/results/name.json]\nLive requests consume the same shared, capped budget as the demo. Dataset: search-v2. Default split: development. No automatic retries.");
  } else {
    Promise.resolve().then(() => runEvaluation(parseArgs(process.argv.slice(2)))).catch(() => {
      console.error("Evaluation failed. Check the arguments, dataset, endpoint configuration, and output path. Raw server responses and secrets are not logged.");
      process.exitCode = 1;
    });
  }
}
