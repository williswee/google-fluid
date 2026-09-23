import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { chooseMode, type ModeId } from "../lib/intent";
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
    answers: { skill: { type: "choice", probabilities: probabilities({ research: 0.92, web: 0.08 }) } },
    usage: { input_tokens: 510 },
  });

  it("keeps genuine model metadata and recorded usage", () => {
    expect(parseClassification(response(), 127.6)).toEqual({
      inputTokens: 510,
      result: {
        mode: "research",
        probabilities: probabilities({ research: 0.92, web: 0.08 }),
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
