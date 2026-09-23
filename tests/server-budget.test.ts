import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { LAUNCH_BUDGET_NANODOLLARS, NANODOLLARS_PER_TOKEN, RESERVED_TOKENS, type ReservationDecision } from "../lib/server/budget";

const reservationCost = RESERVED_TOKENS * NANODOLLARS_PER_TOKEN;
const clientHash = "a".repeat(64);
let db: PGlite;

async function reserve(id = randomUUID(), hash = clientHash) {
  const { rows } = await db.query<{ decision: ReservationDecision }>(
    "select public.fluid_reserve($1::uuid, $2::text) as decision", [id, hash],
  );
  return rows[0].decision;
}

async function settle(id: string, tokens: number) {
  const { rows } = await db.query<{ settled: boolean }>(
    "select public.fluid_settle($1::uuid, $2::integer) as settled", [id, tokens],
  );
  return rows[0].settled;
}

async function totals() {
  const { rows } = await db.query<{ spent: string; reserved: string; cap: string }>(
    "select spent_nanodollars::text as spent, reserved_nanodollars::text as reserved, cap_nanodollars::text as cap from fluid_private.budget where id = 'launch'",
  );
  return { spent: Number(rows[0].spent), reserved: Number(rows[0].reserved), cap: Number(rows[0].cap) };
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role;");
  const sql = await readFile(new URL("../supabase/migrations/202609230001_fluid_budget.sql", import.meta.url), "utf8");
  await db.exec(sql);
}, 30_000);

beforeEach(async () => {
  await db.exec("truncate fluid_private.attempts, fluid_private.rate_buckets;");
  await db.query(
    "update fluid_private.budget set enabled = true, spent_nanodollars = 0, reserved_nanodollars = 0, cap_nanodollars = $1 where id = 'launch'",
    [LAUNCH_BUDGET_NANODOLLARS],
  );
});

afterAll(async () => db?.close());

describe("PostgreSQL budget ledger", () => {
  it("reserves the full maximum before settling actual token cost", async () => {
    const id = randomUUID();
    expect(await reserve(id)).toEqual({ allowed: true });
    expect(await totals()).toEqual({ spent: 0, reserved: reservationCost, cap: LAUNCH_BUDGET_NANODOLLARS });
    expect(await settle(id, 430)).toBe(true);
    expect(await totals()).toEqual({ spent: 430 * NANODOLLARS_PER_TOKEN, reserved: 0, cap: LAUNCH_BUDGET_NANODOLLARS });
  });

  it("does not double-charge repeated settlement or permit request ID reuse", async () => {
    const id = randomUUID();
    await reserve(id);
    expect(await reserve(id)).toEqual({ allowed: false, reason: "duplicate" });
    expect(await settle(id, 300)).toBe(true);
    expect(await settle(id, 300)).toBe(true);
    expect(await settle(id, 301)).toBe(false);
    expect((await totals()).spent).toBe(300 * NANODOLLARS_PER_TOKEN);
  });

  it("never exceeds the shared cap across simultaneously submitted reservations", async () => {
    await db.query("update fluid_private.budget set cap_nanodollars = $1 where id = 'launch'", [reservationCost * 2]);
    const results = await Promise.all(Array.from({ length: 12 }, () => reserve()));
    expect(results.filter((value) => value.allowed)).toHaveLength(2);
    expect(results.filter((value) => !value.allowed && value.reason === "budget_exhausted")).toHaveLength(10);
    expect(await totals()).toEqual({ spent: 0, reserved: reservationCost * 2, cap: reservationCost * 2 });
  });

  it("keeps unresolved attempts reserved, including after a fresh API instance", async () => {
    await db.query("update fluid_private.budget set cap_nanodollars = $1 where id = 'launch'", [reservationCost]);
    await reserve();
    expect(await reserve()).toEqual({ allowed: false, reason: "budget_exhausted" });
    expect((await totals()).reserved).toBe(reservationCost);
  });

  it("blocks the 121st attempt in a minute without reserving provider spend", async () => {
    await db.query(
      "insert into fluid_private.rate_buckets (client_hash, window_start, attempts) values ($1, date_trunc('minute', clock_timestamp()), 119)",
      [clientHash],
    );
    expect(await reserve()).toEqual({ allowed: true });
    expect(await reserve()).toEqual({ allowed: false, reason: "rate_limited" });
    expect((await totals()).reserved).toBe(reservationCost);
  });

  it("does not count old windows against a fresh minute", async () => {
    await db.query(
      "insert into fluid_private.rate_buckets (client_hash, window_start, attempts) values ($1, date_trunc('minute', clock_timestamp()) - interval '3 minutes', 120)",
      [clientHash],
    );
    expect(await reserve()).toEqual({ allowed: true });
    const { rows } = await db.query<{ count: number }>("select count(*)::integer as count from fluid_private.rate_buckets");
    expect(rows[0].count).toBe(1);
  });

  it("honors the database kill switch and rejects missing or excessive settlements", async () => {
    expect(await settle(randomUUID(), 20)).toBe(false);
    const id = randomUUID();
    await reserve(id);
    await expect(settle(id, RESERVED_TOKENS + 1)).rejects.toThrow("Invalid token usage");
    expect((await totals()).reserved).toBe(reservationCost);
    await db.exec("update fluid_private.budget set enabled = false where id = 'launch'");
    expect(await reserve()).toEqual({ allowed: false, reason: "disabled" });
  });

  it("denies browser roles access to ledger RPCs and tables", async () => {
    const { rows } = await db.query<{ anon_rpc: boolean; auth_rpc: boolean; server_rpc: boolean; anon_schema: boolean }>(`
      select has_function_privilege('anon', 'public.fluid_reserve(uuid,text)', 'execute') as anon_rpc,
             has_function_privilege('authenticated', 'public.fluid_settle(uuid,integer)', 'execute') as auth_rpc,
             has_function_privilege('service_role', 'public.fluid_reserve(uuid,text)', 'execute') as server_rpc,
             has_schema_privilege('anon', 'fluid_private', 'usage') as anon_schema
    `);
    expect(rows[0]).toEqual({ anon_rpc: false, auth_rpc: false, server_rpc: true, anon_schema: false });
  });

  it("limits the database shape to accounting and anonymous minute counters", async () => {
    const { rows } = await db.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_schema = 'fluid_private'",
    );
    const columns = rows.map((row) => row.column_name);
    expect(columns).not.toContain("draft");
    expect(columns).not.toContain("ip_address");
    expect(columns).not.toContain("response");
  });
});
