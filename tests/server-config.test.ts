import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { getLiveConfig } from "../lib/server/config";
import { GET } from "../app/api/status/route";

function configure() {
  vi.stubEnv("LIVE_INFERENCE_ENABLED", "true");
  vi.stubEnv("TYPESAFE_API_KEY", "test-only-placeholder");
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-placeholder");
  vi.stubEnv("RATE_LIMIT_SECRET", "test-only-rate-limit-secret-at-least-32");
}

afterEach(() => vi.unstubAllEnvs());

describe("live configuration", () => {
  it("requires the explicit kill-switch opt-in", () => {
    configure();
    vi.stubEnv("LIVE_INFERENCE_ENABLED", "false");
    expect(getLiveConfig()).toBeNull();
  });

  it.each(["TYPESAFE_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RATE_LIMIT_SECRET"])("fails closed when %s is missing", (key) => {
    configure();
    vi.stubEnv(key, "");
    expect(getLiveConfig()).toBeNull();
  });

  it("requires an HTTPS database and a sufficiently long HMAC secret", () => {
    configure();
    vi.stubEnv("SUPABASE_URL", "http://example.supabase.co");
    expect(getLiveConfig()).toBeNull();
    configure();
    vi.stubEnv("RATE_LIMIT_SECRET", "short");
    expect(getLiveConfig()).toBeNull();
  });

  it("reveals only a boolean in public status", async () => {
    configure();
    const response = await GET();
    expect(await response.json()).toEqual({ liveAvailable: true });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
