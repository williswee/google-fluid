import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { chooseMode, MODES, type ModeId } from "../lib/intent";
import { JEV_MODEL, parseClassification } from "../lib/server/jev";

const probabilities = (values: Partial<Record<ModeId, number>>) => ({
  ...Object.fromEntries(MODES.map((mode) => [mode, 0])),
  ...values,
}) as Record<ModeId, number>;

describe("search intent confidence policy", () => {
  it.each(MODES)("accepts a confident %s classification", (mode) => {
    expect(chooseMode(probabilities({ [mode]: 1 }))).toBe(mode);
  });

  it("keeps incomplete or competing intent neutral", () => {
    expect(chooseMode(probabilities({ weather: 0.69, places: 0.31 }))).toBe("general");
    expect(chooseMode(probabilities({ news: 0.5, date: 0.5 }))).toBe("general");
    expect(chooseMode(probabilities({ news: 0.7, date: 0.3 }))).toBe("news");
  });
});

describe("upstream response validation", () => {
  const response = () => ({
    model: JEV_MODEL,
    answers: {
      intent: { type: "choice", probabilities: probabilities({ weather: 0.92, places: 0.08 }) },
    },
    usage: { input_tokens: 510 },
  });

  it("keeps genuine model metadata and recorded usage without downstream model or effort claims", () => {
    expect(parseClassification(response(), 127.6)).toEqual({
      inputTokens: 510,
      result: {
        mode: "weather",
        probabilities: probabilities({ weather: 0.92, places: 0.08 }),
        model: JEV_MODEL,
        latencyMs: 128,
        source: "live",
      },
    });
  });

  it.each([undefined, null, {}, { ...response(), model: "unexpected-model" }])("rejects malformed or unpriced models", (value) => {
    expect(() => parseClassification(value, 10)).toThrow();
  });

  it.each([NaN, Infinity, -0.1, 1.1, "0.9", undefined])("rejects invalid probabilities", (value) => {
    const input = response();
    Object.assign(input.answers.intent.probabilities, { weather: value });
    expect(() => parseClassification(input, 10)).toThrow();
  });

  it("rejects incomplete search-mode distributions rather than accepting the old composer contract", () => {
    const input = response();
    Object.assign(input.answers.intent, { probabilities: { general: 1, image: 0, web: 0, research: 0, sketch: 0 } });
    expect(() => parseClassification(input, 10)).toThrow();
  });

  it.each([undefined, null, { type: "text" }, { type: "choice", probabilities: [] }])("rejects malformed intent answers", (intent) => {
    expect(() => parseClassification({ ...response(), answers: { intent } }, 10)).toThrow();
  });

  it("rejects distributions that do not sum to one", () => {
    const input = response();
    input.answers.intent.probabilities.finance = 0.6;
    expect(() => parseClassification(input, 10)).toThrow();
  });

  it.each([-1, 65_537, 3.5, NaN, undefined])("retains reservations when usage cannot be trusted", (value) => {
    const input = response();
    Object.assign(input.usage, { input_tokens: value });
    expect(() => parseClassification(input, 10)).toThrow();
  });
});
