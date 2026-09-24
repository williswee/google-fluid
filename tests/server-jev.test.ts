import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const sdk = vi.hoisted(() => ({
  requests: vi.fn(),
  construct: vi.fn(),
}));
vi.mock("@typesafe-ai/sdk", () => ({
  choice: (question: string, criteria: unknown) => ({ type: "choice", question, criteria }),
  TypeSafeClient: class {
    constructor(options: unknown) { sdk.construct(options); }
    systemOne(...args: unknown[]) { return sdk.requests(...args); }
  },
}));

import { classifyDraft, JEV_MODEL } from "../lib/server/jev";
import type { LiveConfig } from "../lib/server/config";
import { MODES } from "../lib/intent";

const config: LiveConfig = {
  typesafeApiKey: "test-only-placeholder",
  supabaseUrl: "https://example.supabase.co",
  supabaseServiceRoleKey: "test-only-placeholder",
  rateLimitSecret: "test-only-ratelimit-secret-at-least-32-chars",
  onVercel: false,
};
beforeEach(() => {
  sdk.requests.mockReset();
  sdk.requests.mockResolvedValue({
    model: JEV_MODEL,
    answers: {
      intent: { type: "choice", probabilities: Object.fromEntries(MODES.map((mode) => [mode, mode === "weather" ? 1 : 0])) },
    },
    usage: { input_tokens: 900 },
  });
});

describe("Jev client integration", () => {
  it("asks one search Choice question in one request with no retries or diagnostic body logging", async () => {
    const signal = new AbortController().signal;
    const { result } = await classifyDraft(config, "A test draft", signal);
    expect(sdk.requests).toHaveBeenCalledTimes(1);
    expect(sdk.requests).toHaveBeenCalledWith({
      model: JEV_MODEL,
      state: { draft: "A test draft" },
      questions: {
        intent: expect.objectContaining({ type: "choice" }),
      },
    }, { signal });
    expect(Object.keys(sdk.requests.mock.calls[0][0].questions)).toEqual(["intent"]);
    expect(sdk.construct).toHaveBeenLastCalledWith(expect.objectContaining({
      timeout: 5_000,
      retry: { maxRetries: 0 },
      logLevel: "off",
      baseURL: "https://api.typesafe.ai",
    }));
    expect(result).toMatchObject({ mode: "weather", model: JEV_MODEL, source: "live" });
  });

  it("reuses the warm client while retaining per-request drafts and cancellation signals", async () => {
    const first = new AbortController().signal;
    const second = new AbortController().signal;
    await classifyDraft(config, "First test draft", first);
    const constructions = sdk.construct.mock.calls.length;
    await classifyDraft({ ...config }, "Second test draft", second);
    expect(sdk.construct).toHaveBeenCalledTimes(constructions);
    expect(sdk.requests.mock.calls[0][0].state).toEqual({ draft: "First test draft" });
    expect(sdk.requests.mock.calls[1][0].state).toEqual({ draft: "Second test draft" });
    expect(sdk.requests.mock.calls[0][1].signal).toBe(first);
    expect(sdk.requests.mock.calls[1][1].signal).toBe(second);
  });

  it("replaces a cached client when its server credential changes", async () => {
    await classifyDraft(config, "First test draft", new AbortController().signal);
    const constructions = sdk.construct.mock.calls.length;
    await classifyDraft({ ...config, typesafeApiKey: "rotated-test-only-placeholder" }, "Second test draft", new AbortController().signal);
    expect(sdk.construct).toHaveBeenCalledTimes(constructions + 1);
    expect(sdk.construct).toHaveBeenLastCalledWith(expect.objectContaining({ apiKey: "rotated-test-only-placeholder" }));
  });
});
