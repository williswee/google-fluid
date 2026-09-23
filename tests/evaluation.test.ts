import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { latencySummary, MODES, parseArgs, runEvaluation, summarize } from "../scripts/evaluate";

describe("evaluation datasets", () => {
  it("keeps disjoint, balanced, labeled development and held-out cases", async () => {
    const datasets = await Promise.all(["development", "held-out"].map(async (split) => {
      const data = JSON.parse(await readFile(new URL(`../evaluation/${split}.json`, import.meta.url), "utf8"));
      expect(data.split).toBe(split);
      expect(data.cases).toHaveLength(15);
      for (const mode of MODES) expect(data.cases.filter((item: { expected: string }) => item.expected === mode)).toHaveLength(3);
      for (const item of data.cases) {
        expect(item.id).toEqual(expect.any(String));
        expect(item.draft.trim().length).toBeGreaterThan(0);
        expect(Buffer.byteLength(item.draft, "utf8")).toBeLessThanOrEqual(2_000);
        expect(item.rationale).toEqual(expect.any(String));
      }
      return data.cases;
    }));
    const allCases = datasets.flat();
    expect(new Set(allCases.map((item) => item.id)).size).toBe(allCases.length);
    expect(new Set(allCases.map((item) => item.draft)).size).toBe(allCases.length);
  });
});

describe("evaluation report integrity", () => {
  it("separates request failures from completed classification accuracy", () => {
    const summary = summarize([
      { id: "one", scenario: "test", expected: "web", actual: "web", correct: true, elapsedMs: 100, serverLatencyMs: 70 },
      { id: "two", scenario: "test", expected: "web", actual: "general", correct: false, elapsedMs: 200, serverLatencyMs: 120 },
      { id: "three", scenario: "test", expected: "image", elapsedMs: 900, error: { code: "BUDGET_EXHAUSTED" } },
    ]);
    expect(summary).toMatchObject({ attempted: 3, completed: 2, failed: 1, correct: 1, accuracy: 0.5 });
    expect(summary.clientRoundTripMs).toEqual({ count: 2, p50: 100, p95: 200, max: 200 });
    expect(summary.perMode.image.accuracy).toBeNull();
    expect(summary.confusionMatrix.web.general).toBe(1);
  });

  it("does not turn an unavailable result into zero latency or zero accuracy", () => {
    expect(latencySummary([])).toEqual({ count: 0, p50: null, p95: null, max: null });
    expect(summarize([]).accuracy).toBeNull();
  });

  it("rejects credentials and non-origin endpoint URLs", () => {
    for (const baseUrl of ["https://secret@example.com", "https://example.com?token=secret", "https://example.com/api", "file:///tmp/demo"]) {
      expect(() => parseArgs(["--base-url", baseUrl])).toThrow();
    }
    expect(parseArgs(["--base-url", "http://127.0.0.1:3000/"])).toMatchObject({ split: "development", baseUrl: "http://127.0.0.1:3000" });
  });
});

describe("protected evaluation requests", () => {
  const temporaryDirectories: string[] = [];
  const originalExitCode = process.exitCode;

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    process.exitCode = originalExitCode;
    await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
  });

  async function outputPath() {
    const directory = await mkdtemp(path.join(tmpdir(), "fluid-evaluation-"));
    temporaryDirectories.push(directory);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    return path.join(directory, "report.json");
  }

  it("uses the normal same-origin endpoint and reports only live responses", async () => {
    const output = await outputPath();
    const request = vi.fn()
      .mockResolvedValueOnce(Response.json({ liveAvailable: true }))
      .mockResolvedValueOnce(Response.json({ mode: "general", probabilities: { general: 0.8, image: 0.05, web: 0.05, research: 0.05, sketch: 0.05 }, model: "jev-1.13.0", source: "live", latencyMs: 52 }));
    vi.stubGlobal("fetch", request);
    await runEvaluation({ split: "development", baseUrl: "http://localhost:3000", output, maxCases: 1 });
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][0]).toBe("http://localhost:3000/api/intent");
    expect(request.mock.calls[1][1].headers.Origin).toBe("http://localhost:3000");
    const report = JSON.parse(await readFile(output, "utf8"));
    expect(report).toMatchObject({ status: "completed", partialSample: true, summary: { completed: 1, correct: 1, accuracy: 1 } });
    expect(report.observations[0]).not.toHaveProperty("draft");
  });

  it("does not make inference requests when live configuration is unavailable", async () => {
    const output = await outputPath();
    const request = vi.fn().mockResolvedValue(Response.json({ liveAvailable: false }));
    vi.stubGlobal("fetch", request);
    await runEvaluation({ split: "development", baseUrl: "http://localhost:3000", output });
    expect(request).toHaveBeenCalledTimes(1);
    expect(JSON.parse(await readFile(output, "utf8"))).toMatchObject({ status: "blocked", stopReason: "live_unavailable", summary: { attempted: 0 } });
  });

  it("stops at a budget refusal without retries or raw provider error details", async () => {
    const output = await outputPath();
    const request = vi.fn()
      .mockResolvedValueOnce(Response.json({ liveAvailable: true }))
      .mockResolvedValueOnce(Response.json({ code: "BUDGET_EXHAUSTED", error: "sensitive-provider-detail" }, { status: 503 }));
    vi.stubGlobal("fetch", request);
    await runEvaluation({ split: "development", baseUrl: "http://localhost:3000", output, maxCases: 3 });
    expect(request).toHaveBeenCalledTimes(2);
    const raw = await readFile(output, "utf8");
    expect(raw).not.toContain("sensitive-provider-detail");
    expect(JSON.parse(raw)).toMatchObject({ status: "interrupted", stopReason: "BUDGET_EXHAUSTED", summary: { attempted: 1, completed: 0, failed: 1 } });
  });

  it("refuses to overwrite a report before consuming live allowance", async () => {
    const output = await outputPath();
    await writeFile(output, "existing result");
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    await expect(runEvaluation({ split: "development", baseUrl: "http://localhost:3000", output })).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
    expect(await readFile(output, "utf8")).toBe("existing result");
  });
});
