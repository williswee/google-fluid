import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { chooseEffort, chooseMode, type ModeId } from "../lib/intent";
import { JEV_MODEL, parseClassification } from "../lib/server/jev";

const probabilities = (values: Partial<Record<ModeId, number>>) => ({
  general: 0,
  image: 0,
  web: 0,
  research: 0,
  sketch: 0,
  ...values,
});

describe("intent confidence policy", () => {
  it("reveals a specialized mode only for a clear winner", () => {
    expect(chooseMode(probabilities({ image: 0.9, general: 0.1 }))).toBe("image");
    expect(chooseMode(probabilities({ web: 0.7, research: 0.3 }))).toBe("web");
  });

  it("keeps incomplete or competing intent neutral", () => {
    expect(chooseMode(probabilities({ image: 0.69, sketch: 0.31 }))).toBe("general");
    expect(chooseMode(probabilities({ web: 0.5, research: 0.5 }))).toBe("general");
  });
});

describe("upstream response validation", () => {
  const response = () => ({
    model: JEV_MODEL,
    answers: {
      skill: { type: "choice", probabilities: probabilities({ research: 0.92, web: 0.08 }) },
      effort: { type: "choice", probabilities: { brief: 0.02, balanced: 0.08, deep: 0.9 } },
    },
    usage: { input_tokens: 510 },
  });

  it("keeps genuine model metadata and recorded usage", () => {
    expect(parseClassification(response(), 127.6)).toEqual({
      inputTokens: 510,
      result: {
        mode: "research",
        probabilities: probabilities({ research: 0.92, web: 0.08 }),
        effort: "deep",
        effortProbabilities: { brief: 0.02, balanced: 0.08, deep: 0.9 },
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
    Object.assign(input.answers.skill.probabilities, { image: value });
    expect(() => parseClassification(input, 10)).toThrow();
  });

  it("rejects distributions that do not sum to one", () => {
    const input = response();
    input.answers.skill.probabilities.image = 0.6;
    expect(() => parseClassification(input, 10)).toThrow();
  });

  it.each([-1, 65_537, 3.5, NaN, undefined])("retains reservations when usage cannot be trusted", (value) => {
    const input = response();
    Object.assign(input.usage, { input_tokens: value });
    expect(() => parseClassification(input, 10)).toThrow();
  });
});


describe("independent effort confidence", () => {
  it("selects confident brief or deep effort independent of the mode", () => {
    expect(chooseEffort({ brief: 0.9, balanced: 0.05, deep: 0.05 })).toBe("brief");
    expect(chooseEffort({ brief: 0.1, balanced: 0.1, deep: 0.8 })).toBe("deep");
  });

  it("falls back to balanced when effort is unclear", () => {
    expect(chooseEffort({ brief: 0.4, balanced: 0.2, deep: 0.4 })).toBe("balanced");
    expect(chooseEffort({ brief: 0.69, balanced: 0.11, deep: 0.2 })).toBe("balanced");
  });

  const upstream = (effort: unknown) => ({
    model: JEV_MODEL,
    answers: {
      skill: { type: "choice", probabilities: probabilities({ general: 0.98, web: 0.02 }) },
      effort,
    },
    usage: { input_tokens: 730 },
  });

  it("can suggest deep effort for general reasoning and preserve uncertain probabilities", () => {
    const deep = parseClassification(upstream({ type: "choice", probabilities: { brief: 0, balanced: 0.01, deep: 0.99 } }), 90);
    expect(deep.result.mode).toBe("general");
    expect(deep.result.effort).toBe("deep");
    const uncertain = { brief: 0.4, balanced: 0.2, deep: 0.4 };
    const result = parseClassification(upstream({ type: "choice", probabilities: uncertain }), 90).result;
    expect(result.effort).toBe("balanced");
    expect(result.effortProbabilities).toEqual(uncertain);
  });

  it.each([
    undefined,
    null,
    { type: "text", probabilities: { brief: 0, balanced: 1, deep: 0 } },
    { type: "choice", probabilities: { brief: 0, balanced: 1 } },
    { type: "choice", probabilities: { brief: 0, balanced: "1", deep: 0 } },
    { type: "choice", probabilities: { brief: NaN, balanced: 1, deep: 0 } },
    { type: "choice", probabilities: { brief: -0.1, balanced: 1, deep: 0.1 } },
    { type: "choice", probabilities: { brief: 0.6, balanced: 0.6, deep: 0.6 } },
  ])("rejects malformed effort instead of inventing a live result", (effort) => {
    expect(() => parseClassification(upstream(effort), 90)).toThrow();
  });
});
