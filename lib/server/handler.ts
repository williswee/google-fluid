import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { MAX_DRAFT_BYTES, type IntentError } from "../intent";
import { getLiveConfig, type LiveConfig } from "./config";
import { reserveBudget, settleBudget } from "./budget";
import { classifyDraft } from "./jev";

const MAX_BODY_BYTES = 16_384;
const JSON_HEADERS = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export interface IntentDependencies {
  getConfig: typeof getLiveConfig;
  reserve: typeof reserveBudget;
  settle: typeof settleBudget;
  classify: typeof classifyDraft;
  requestId: () => string;
}

const dependencies: IntentDependencies = {
  getConfig: getLiveConfig,
  reserve: reserveBudget,
  settle: settleBudget,
  classify: classifyDraft,
  requestId: randomUUID,
};

function failure(code: string, error: string, status: number, headers?: HeadersInit): Response {
  return Response.json({ code, error } satisfies IntentError, {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  });
}

export function clientHash(request: Request, config: LiveConfig): string {
  // Vercel overwrites these edge headers. Outside Vercel, ignore spoofable headers.
  const ip = config.onVercel
    ? (request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for"))?.split(",")[0].trim()
    : "local";
  if (!ip || (config.onVercel && !isIP(ip))) throw new Error("Client address unavailable");
  return createHmac("sha256", config.rateLimitSecret)
    .update(`fluid:v1:${new Date().toISOString().slice(0, 10)}:${ip}`)
    .digest("hex");
}

async function readDraft(request: Request): Promise<string> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_INPUT");
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error("BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const body: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  if (!body || typeof body !== "object" || !("draft" in body) || typeof body.draft !== "string") {
    throw new Error("INVALID_INPUT");
  }
  if (Buffer.byteLength(body.draft, "utf8") > MAX_DRAFT_BYTES) throw new Error("DRAFT_TOO_LARGE");
  const draft = body.draft.trim();
  if (!draft) throw new Error("INVALID_INPUT");
  return draft;
}

export async function handleIntent(
  request: Request,
  deps: IntentDependencies = dependencies,
): Promise<Response> {
  const startedAt = performance.now();
  if (request.method !== "POST") return failure("METHOD_NOT_ALLOWED", "Use POST for live routing.", 405, { Allow: "POST" });
  if (request.headers.get("origin") !== new URL(request.url).origin ||
    request.headers.get("sec-fetch-site") === "cross-site") {
    return failure("INVALID_ORIGIN", "Open this demo directly to use live routing.", 403);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return failure("INVALID_INPUT", "Send the draft as JSON.", 415);
  }
  let draft: string;
  try {
    draft = await readDraft(request);
  } catch (error) {
    const tooLarge = error instanceof Error && ["BODY_TOO_LARGE", "DRAFT_TOO_LARGE"].includes(error.message);
    return failure("INVALID_INPUT", tooLarge ? "Keep your prompt under 2,000 bytes." : "Enter a valid, nonempty prompt.", tooLarge ? 413 : 400);
  }

  const config = deps.getConfig();
  if (!config) return failure("DISABLED", "Live routing is not connected. You can still explore the example prompts.", 503);
  if (request.signal.aborted) return failure("CANCELLED", "The routing request was cancelled.", 499);
  const requestId = deps.requestId();
  try {
    const reservation = await deps.reserve(config, requestId, clientHash(request, config));
    if (!reservation.allowed) {
      if (reservation.reason === "rate_limited") {
        return failure("RATE_LIMITED", "Live routing is taking a short pause. Try again in a minute.", 429, { "Retry-After": "60" });
      }
      if (reservation.reason === "budget_exhausted") {
        return failure("BUDGET_EXHAUSTED", "This demo's live routing allowance has been used. You can still explore the example prompts.", 503);
      }
      return failure("DISABLED", "Live routing is paused. You can still explore the example prompts.", 503);
    }
  } catch {
    return failure("UNAVAILABLE", "Live routing is temporarily unavailable. Try again shortly.", 503);
  }

  try {
    const { result, inputTokens } = await deps.classify(config, draft, request.signal);
    try {
      await deps.settle(config, requestId, inputTokens);
    } catch {
      // The full reservation remains charged against the cap; no prompt or key is logged.
      console.warn("Live routing settlement unavailable; conservative reservation retained.");
    }
    return Response.json({
      ...result,
      // Includes validation, durable reservation, Jev, and budget settlement.
      // Browser/network travel time must be measured separately by the client.
      latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
    }, { headers: JSON_HEADERS });
  } catch {
    // Do not refund: the provider may have processed a timed-out or cancelled request.
    return failure("UNAVAILABLE", "Live routing could not finish. Keep typing or try again shortly.", 503);
  }
}
