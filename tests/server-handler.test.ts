import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { clientHash, handleIntent, type IntentDependencies } from "../lib/server/handler";
import type { LiveConfig } from "../lib/server/config";
import type { IntentResult } from "../lib/intent";

const config: LiveConfig = {
  typesafeApiKey: "test-only-placeholder",
  supabaseUrl: "https://example.supabase.co",
  supabaseServiceRoleKey: "test-only-placeholder",
  rateLimitSecret: "test-only-ratelimit-secret-at-least-32-chars",
  onVercel: false,
};
const result: IntentResult = {
  mode: "image",
  probabilities: { general: 0.05, image: 0.95, web: 0, research: 0, sketch: 0 },
  model: "jev-1.13.0",
  latencyMs: 170,
  source: "live",
};

function setup() {
  return {
    getConfig: vi.fn(() => config),
    reserve: vi.fn(async () => ({ allowed: true as const })),
    settle: vi.fn(async () => undefined),
    classify: vi.fn(async () => ({ result, inputTokens: 400 })),
    requestId: vi.fn(() => "00000000-0000-4000-8000-000000000001"),
  } satisfies IntentDependencies;
}

function request(body: unknown = { draft: "Create a poster of a red moon" }, init?: RequestInit) {
  return new Request("https://chatgptfluid.vercel.app/api/intent", {
    method: "POST",
    headers: { origin: "https://chatgptfluid.vercel.app", "content-type": "application/json" },
    body: JSON.stringify(body),
    ...init,
  });
}

afterEach(() => vi.restoreAllMocks());

describe("intent endpoint", () => {
  it("reserves before calling Jev, settles confirmed usage, and reports all server work", async () => {
    const deps = setup();
    let clock = 100;
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    deps.reserve.mockImplementation(async () => {
      clock += 60;
      return { allowed: true };
    });
    deps.classify.mockImplementation(async () => {
      clock += 170;
      return { result, inputTokens: 400 };
    });
    deps.settle.mockImplementation(async () => { clock += 80; });
    const response = await handleIntent(request(), deps);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ...result, latencyMs: 310 });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(deps.reserve.mock.invocationCallOrder[0]).toBeLessThan(deps.classify.mock.invocationCallOrder[0]);
    expect(deps.classify.mock.invocationCallOrder[0]).toBeLessThan(deps.settle.mock.invocationCallOrder[0]);
    expect(deps.settle).toHaveBeenCalledWith(config, deps.requestId(), 400);
  });

  it.each([null, {}, { draft: 4 }, { draft: "   " }, { draft: "🙂".repeat(501) }])("rejects invalid or oversized drafts before reserving", async (body) => {
    const deps = setup();
    const response = await handleIntent(request(body), deps);
    expect([400, 413]).toContain(response.status);
    expect((await response.json()).code).toBe("INVALID_INPUT");
    expect(deps.reserve).not.toHaveBeenCalled();
    expect(deps.classify).not.toHaveBeenCalled();
  });

  it("accepts exactly 2,000 UTF-8 bytes", async () => {
    const deps = setup();
    expect((await handleIntent(request({ draft: "🙂".repeat(500) }), deps)).status).toBe(200);
  });

  it("caps the streamed JSON body even without content-length", async () => {
    const deps = setup();
    const response = await handleIntent(request(null, { body: " ".repeat(17_000) }), deps);
    expect(response.status).toBe(413);
    expect(deps.reserve).not.toHaveBeenCalled();
  });

  it.each(["https://evil.example", "null", ""]) ("rejects cross-origin and absent origins", async (origin) => {
    const deps = setup();
    const response = await handleIntent(request(undefined, { headers: { origin, "content-type": "application/json" } }), deps);
    expect(response.status).toBe(403);
    expect(deps.reserve).not.toHaveBeenCalled();
  });

  it("does not expose live routing with incomplete configuration", async () => {
    const deps: IntentDependencies = { ...setup(), getConfig: () => null };
    const response = await handleIntent(request(), deps);
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("DISABLED");
    expect(deps.classify).not.toHaveBeenCalled();
  });

  it.each([
    ["budget_exhausted", "BUDGET_EXHAUSTED", 503],
    ["rate_limited", "RATE_LIMITED", 429],
    ["disabled", "DISABLED", 503],
  ] as const)("never calls the provider after %s", async (reason, code, status) => {
    const deps: IntentDependencies = {
      ...setup(),
      reserve: vi.fn(async () => ({ allowed: false, reason })),
    };
    const response = await handleIntent(request(), deps);
    expect(response.status).toBe(status);
    expect((await response.json()).code).toBe(code);
    expect(deps.classify).not.toHaveBeenCalled();
    if (status === 429) expect(response.headers.get("retry-after")).toBe("60");
  });

  it("fails closed when durable budget storage is down", async () => {
    const deps = setup();
    deps.reserve.mockRejectedValue(new Error("database failure"));
    const response = await handleIntent(request(), deps);
    expect(response.status).toBe(503);
    expect(deps.classify).not.toHaveBeenCalled();
  });

  it("retains reservations for upstream timeout without retrying or leaking errors", async () => {
    const deps = setup();
    deps.classify.mockRejectedValue(new Error("sensitive upstream body"));
    const response = await handleIntent(request(), deps);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("sensitive");
    expect(deps.classify).toHaveBeenCalledTimes(1);
    expect(deps.settle).not.toHaveBeenCalled();
  });

  it("returns a completed classification if settlement fails, retaining its full reservation", async () => {
    const deps = setup();
    deps.settle.mockRejectedValue(new Error("database unavailable"));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const response = await handleIntent(request(), deps);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ...result, latencyMs: expect.any(Number) });
    expect(deps.settle).toHaveBeenCalledTimes(1);
  });

  it("avoids reserving an already cancelled draft", async () => {
    const deps = setup();
    const controller = new AbortController();
    controller.abort();
    const response = await handleIntent(request(undefined, { signal: controller.signal }), deps);
    expect(response.status).toBe(499);
    expect(deps.reserve).not.toHaveBeenCalled();
  });
});

describe("anonymous rate-limit identity", () => {
  it("hashes trusted edge IPs without retaining raw values", () => {
    const req = request(undefined, { headers: { "x-vercel-forwarded-for": "203.0.113.4" } });
    const hash = clientHash(req, { ...config, onVercel: true });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain("203.0.113.4");
    expect(hash).toBe(clientHash(req, { ...config, onVercel: true }));
  });

  it("ignores untrusted forwarded headers in local development", () => {
    const a = request(undefined, { headers: { "x-forwarded-for": "203.0.113.4" } });
    const b = request(undefined, { headers: { "x-forwarded-for": "203.0.113.5" } });
    expect(clientHash(a, config)).toBe(clientHash(b, config));
  });

  it("fails closed for missing production edge identity", () => {
    expect(() => clientHash(request(), { ...config, onVercel: true })).toThrow();
  });
});
