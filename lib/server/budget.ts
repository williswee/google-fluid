import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { LiveConfig } from "./config";

export const RESERVED_TOKENS = 65_536;
export const NANODOLLARS_PER_TOKEN = 42;
export const LAUNCH_BUDGET_NANODOLLARS = 5_000_000_000;

export type ReservationDecision =
  | { allowed: true }
  | { allowed: false; reason: "budget_exhausted" | "rate_limited" | "disabled" | "duplicate" };

function createBudgetClient(config: LiveConfig) {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

// A warm instance reuses only the stateless service client. Each RPC creates its
// own request builder and timeout; no user session or draft is stored in it.
let activeClient: {
  url: string;
  key: string;
  value: ReturnType<typeof createBudgetClient>;
} | undefined;

function client(config: LiveConfig) {
  if (!activeClient || activeClient.url !== config.supabaseUrl ||
    activeClient.key !== config.supabaseServiceRoleKey) {
    activeClient = {
      url: config.supabaseUrl,
      key: config.supabaseServiceRoleKey,
      value: createBudgetClient(config),
    };
  }
  return activeClient.value;
}

/** Every caller must reserve globally before making even one upstream attempt. */
export async function reserveBudget(
  config: LiveConfig,
  requestId: string,
  clientHash: string,
): Promise<ReservationDecision> {
  const { data, error } = await client(config)
    .rpc("fluid_reserve", { p_request_id: requestId, p_client_hash: clientHash })
    .abortSignal(AbortSignal.timeout(2_500));

  if (error || !data || typeof data !== "object") throw new Error("Budget check unavailable");
  if (data.allowed === true) return { allowed: true };
  if (
    data.allowed === false &&
    ["budget_exhausted", "rate_limited", "disabled", "duplicate"].includes(data.reason)
  ) return { allowed: false, reason: data.reason };
  throw new Error("Invalid budget response");
}

/** Safe to repeat: the database settles a request only once. */
export async function settleBudget(
  config: LiveConfig,
  requestId: string,
  inputTokens: number,
): Promise<void> {
  if (!Number.isInteger(inputTokens) || inputTokens < 0 || inputTokens > RESERVED_TOKENS) {
    throw new Error("Invalid token usage");
  }
  const { data, error } = await client(config)
    .rpc("fluid_settle", { p_request_id: requestId, p_input_tokens: inputTokens })
    .abortSignal(AbortSignal.timeout(2_500));
  if (error || data !== true) throw new Error("Budget settlement unavailable");
}
