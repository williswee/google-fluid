import { describe, expect, it } from 'vitest';
import { createDinoRun, DINO, dinoCollides, jumpDino, stepDino, type DinoObstacle, type DinoRun } from '../lib/dino-game';

function advance(state: DinoRun, seconds: number, dt = 1 / 120): DinoRun {
  let next = state;
  const steps = Math.round(seconds / dt);
  for (let index = 0; index < steps; index += 1) next = stepDino(next, dt, next.worldWidth);
  return next;
}

const cactus: DinoObstacle = { id: 99, x: 45, width: 26, height: 42 };

function autoJump(state: DinoRun): DinoRun {
  const upcoming = state.obstacles.find(obstacle => obstacle.x + obstacle.width > DINO.x);
  return upcoming && upcoming.x <= DINO.x + DINO.width + state.speed * 0.24 ? jumpDino(state) : state;
}

describe('desert runner jumping', () => {
  it('starts grounded and gives the first cactus a visible approach delay', () => {
    const start = createDinoRun(280);
    expect(start).toMatchObject({ jumpHeight: 0, velocity: 0, crashed: false, score: 0, speed: 175 });
    expect(advance(start, 1).obstacles).toHaveLength(0);
    const approach = advance(start, 1.3);
    expect(approach.obstacles).toHaveLength(1);
    expect(approach.obstacles[0].x).toBeGreaterThan(250);
    expect(approach.crashed).toBe(false);
  });

  it('jumps from the ground, peaks around 74px, and lands in about 0.69 seconds', () => {
    const start = createDinoRun(640);
    const jumping = jumpDino(start);
    expect(start.velocity).toBe(0);
    expect(jumping.velocity).toBeGreaterThan(0);
    const apex = advance(jumping, 0.35);
    expect(apex.jumpHeight).toBeGreaterThan(70);
    expect(apex.jumpHeight).toBeLessThan(80);
    expect(apex.velocity).toBeLessThan(0);
    expect(advance(jumping, 0.675).jumpHeight).toBeGreaterThan(0);
    const landed = advance(jumping, 0.7);
    expect(landed.jumpHeight).toBe(0);
    expect(landed.velocity).toBe(0);
    expect(jumpDino(landed).velocity).toBe(DINO.jumpVelocity);
  });

  it('rejects double jumps on ascent, descent, and the initial launch frame', () => {
    const launch = jumpDino(createDinoRun(640));
    const ascending = advance(launch, 0.1);
    const descending = advance(launch, 0.5);
    for (const state of [launch, ascending, descending]) expect(jumpDino(state)).toBe(state);
  });

  it('holds an idle runner exactly at ground level', () => {
    const idle = advance(createDinoRun(640), 2);
    expect(idle.jumpHeight).toBe(0);
    expect(idle.velocity).toBe(0);
  });
});

describe('forgiving runner collisions', () => {
  it('detects body overlap but allows the illustrated tail and cactus tips to brush', () => {
    expect(dinoCollides(0, cactus)).toBe(true);
    expect(dinoCollides(0, { ...cactus, x: 65 })).toBe(false);
    expect(dinoCollides(36, cactus)).toBe(false);
  });

  it('allows exact edge contact and detects a small overlap on either axis', () => {
    expect(dinoCollides(0, { ...cactus, x: 60 })).toBe(false);
    expect(dinoCollides(0, { ...cactus, x: 59.99 })).toBe(true);
    expect(dinoCollides(35, cactus)).toBe(false);
    expect(dinoCollides(34.99, cactus)).toBe(true);
    expect(dinoCollides(0, { ...cactus, x: 20 })).toBe(false);
    expect(dinoCollides(0, { ...cactus, x: 20.01 })).toBe(true);
  });

  it('ends on a collision and freezes the run and score until reset', () => {
    const state = { ...createDinoRun(280), obstacles: [cactus] };
    const crashed = stepDino(state, 1 / 60, 280);
    expect(crashed.crashed).toBe(true);
    expect(crashed.distance).toBe(0);
    expect(jumpDino(crashed)).toBe(crashed);
    expect(stepDino(crashed, 0.1, 280)).toBe(crashed);
    expect(createDinoRun(280).crashed).toBe(false);
  });

  it('passes safely over a tall cactus with real jumping physics', () => {
    let state = { ...createDinoRun(280), obstacles: [{ ...cactus, x: 115 }] };
    state = advance(jumpDino(state), 0.7);
    expect(state.crashed).toBe(false);
    expect(state.jumpHeight).toBe(0);
    expect(state.obstacles[0].x + state.obstacles[0].width).toBeLessThan(DINO.x);
  });

  it('catches a collision crossed within a 100ms frame instead of tunneling through it', () => {
    // It is safe both initially and at the end of this frame, but hits during the fall.
    const state: DinoRun = {
      ...createDinoRun(280),
      speed: DINO.maxSpeed,
      jumpHeight: 30,
      velocity: -300,
      obstacles: [{ id: 99, x: 43, width: 14, height: 28 }],
    };
    expect(dinoCollides(state.jumpHeight, state.obstacles[0])).toBe(false);
    expect(dinoCollides(0, { ...state.obstacles[0], x: 17 })).toBe(false);
    const result = stepDino(state, 0.1, 280);
    expect(result.crashed).toBe(true);
    expect(result.elapsed).toBeLessThan(0.1);
  });
});

describe('runner timing and obstacle fairness', () => {
  it('stays playable at 280px through the full speed ramp, with safe landing gaps', () => {
    let state = createDinoRun(280);
    const seen = new Map<number, { trackX: number; width: number }>();
    for (let index = 0; index < 70 * 60; index += 1) {
      state = stepDino(autoJump(state), 1 / 60, 280);
      expect(state.crashed).toBe(false);
      expect(state.speed).toBeLessThanOrEqual(260);
      for (const obstacle of state.obstacles) {
        if (seen.has(obstacle.id)) continue;
        expect(obstacle.width).toBeGreaterThanOrEqual(14);
        expect(obstacle.width).toBeLessThanOrEqual(26);
        expect(obstacle.height).toBeGreaterThanOrEqual(28);
        expect(obstacle.height).toBeLessThanOrEqual(42);
        // At its first visible frame there is at least 0.8s to react, even at max speed.
        expect((obstacle.x - (DINO.x + DINO.width)) / state.speed).toBeGreaterThan(0.8);
        seen.set(obstacle.id, { trackX: state.distance + obstacle.x, width: obstacle.width });
      }
    }
    const positions = [...seen.values()];
    expect(positions.length).toBeGreaterThan(40);
    for (let index = 1; index < positions.length; index += 1) {
      const previous = positions[index - 1];
      const current = positions[index];
      const arrivalSpeed = Math.min(260, Math.sqrt(175 ** 2 + 2 * 1.8 * current.trackX));
      expect((current.trackX - previous.trackX - previous.width) / arrivalSpeed).toBeGreaterThan(1.05);
    }
    expect(state.speed).toBe(260);
    expect(state.score).toBeGreaterThan(1500);
  });

  it('produces the same obstacle sequence and score for the same inputs', () => {
    const simulate = () => {
      let state = createDinoRun(480);
      for (let index = 0; index < 1200; index += 1) state = stepDino(autoJump(state), 1 / 60, 480);
      return state;
    };
    expect(simulate()).toEqual(simulate());
  });

  it('keeps existing obstacle positions and spacing stable when the viewport changes', () => {
    const before = advance(createDinoRun(280), 1.3);
    const wide = stepDino(before, 1 / 120, 900);
    expect(wide.worldWidth).toBe(900);
    expect(wide.obstacles[0].x).toBeLessThan(before.obstacles[0].x);
    expect(wide.obstacles[0].x).toBeGreaterThan(before.obstacles[0].x - 2);
    for (let index = 1; index < wide.obstacles.length; index += 1) {
      expect(wide.obstacles[index].x - wide.obstacles[index - 1].x).toBeGreaterThan(200);
    }
  });

  it('caps long frame delays and does not mutate frozen input state or obstacles', () => {
    const state = advance(createDinoRun(280), 1.3);
    for (const obstacle of state.obstacles) Object.freeze(obstacle);
    Object.freeze(state.obstacles);
    Object.freeze(state);
    const expected = stepDino(state, 0.1, 280);
    expect(stepDino(state, 20, 280)).toEqual(expected);
    expect(expected.elapsed - state.elapsed).toBeCloseTo(0.1, 10);
    expect(expected.distance - state.distance).toBeLessThan(26);
    expect(expected.obstacles[0]).not.toBe(state.obstacles[0]);
    expect(jumpDino(state).velocity).toBe(DINO.jumpVelocity);
    expect(state.velocity).toBe(0);
  });

  it.each([0, -1, NaN, Infinity, -Infinity])('ignores invalid elapsed time %s', delta => {
    const state = jumpDino(createDinoRun(280));
    expect(stepDino(state, delta, 280)).toBe(state);
  });
});
