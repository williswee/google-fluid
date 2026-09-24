/** All dimensions are CSS pixels; height and velocity are positive upwards. */
export const DINO = {
  x: 36,
  width: 34,
  height: 38,
  groundY: 164,
  worldHeight: 210,
  initialSpeed: 175,
  maxSpeed: 260,
  acceleration: 1.8,
  gravity: 1250,
  jumpVelocity: 430,
  firstObstacleDelay: 1.2,
  minimumGapSeconds: 1.12,
  maxDeltaSeconds: 0.1,
  substepSeconds: 1 / 120,
  playerInsetX: 7,
  playerInsetTop: 5,
  playerInsetBottom: 4,
  obstacleInsetX: 3,
  obstacleInsetTop: 3,
} as const;

export type DinoObstacle = {
  id: number;
  x: number;
  width: number;
  height: number;
};

export type DinoRun = {
  distance: number;
  elapsed: number;
  score: number;
  jumpHeight: number;
  velocity: number;
  obstacles: DinoObstacle[];
  crashed: boolean;
  speed: number;
  worldWidth: number;
  /** Upcoming cactus position along the track, independent of the viewport. */
  nextObstacleDistance: number;
  nextObstacleId: number;
};

const CACTI = [
  { width: 18, height: 32, extraGapSeconds: 0.12 },
  { width: 24, height: 40, extraGapSeconds: 0 },
  { width: 16, height: 28, extraGapSeconds: 0.2 },
  { width: 26, height: 42, extraGapSeconds: 0.08 },
  { width: 20, height: 36, extraGapSeconds: 0.16 },
  { width: 14, height: 30, extraGapSeconds: 0.04 },
] as const;

function worldWidthOrDefault(width: number): number {
  return Number.isFinite(width) ? Math.max(280, Math.min(width, 4096)) : 640;
}

function speedAtDistance(distance: number): number {
  return Math.min(DINO.maxSpeed, Math.sqrt(DINO.initialSpeed ** 2 + 2 * DINO.acceleration * distance));
}

export function createDinoRun(worldWidth: number): DinoRun {
  const width = worldWidthOrDefault(worldWidth);
  return {
    distance: 0,
    elapsed: 0,
    score: 0,
    jumpHeight: 0,
    velocity: 0,
    obstacles: [],
    crashed: false,
    speed: DINO.initialSpeed,
    worldWidth: width,
    nextObstacleDistance: width + DINO.initialSpeed * DINO.firstObstacleDelay,
    nextObstacleId: 0,
  };
}

export function jumpDino(state: DinoRun): DinoRun {
  if (state.crashed || state.jumpHeight !== 0 || state.velocity !== 0) return state;
  return { ...state, velocity: DINO.jumpVelocity };
}

/** Touching edges are safe. Insets omit the tail, toes and cactus tips. */
export function dinoCollides(jumpHeight: number, obstacle: DinoObstacle): boolean {
  const playerLeft = DINO.x + DINO.playerInsetX;
  const playerRight = DINO.x + DINO.width - DINO.playerInsetX;
  const playerTop = DINO.groundY - DINO.height - jumpHeight + DINO.playerInsetTop;
  const playerBottom = DINO.groundY - jumpHeight - DINO.playerInsetBottom;
  const cactusLeft = obstacle.x + DINO.obstacleInsetX;
  const cactusRight = obstacle.x + obstacle.width - DINO.obstacleInsetX;
  const cactusTop = DINO.groundY - obstacle.height + DINO.obstacleInsetTop;
  return playerLeft < cactusRight && playerRight > cactusLeft
    && playerTop < DINO.groundY && playerBottom > cactusTop;
}

/** Pure simulation; a stalled tab advances at most 100ms, with small collision steps. */
export function stepDino(state: DinoRun, deltaSeconds: number, worldWidth: number): DinoRun {
  if (state.crashed || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return state;

  const next: DinoRun = {
    ...state,
    worldWidth: worldWidthOrDefault(worldWidth),
    obstacles: state.obstacles.map(obstacle => ({ ...obstacle })),
  };
  if (next.obstacles.some(obstacle => dinoCollides(next.jumpHeight, obstacle))) {
    next.crashed = true;
    return next;
  }

  const duration = Math.min(deltaSeconds, DINO.maxDeltaSeconds);
  const steps = Math.ceil(duration / DINO.substepSeconds);
  const dt = duration / steps;
  for (let step = 0; step < steps; step += 1) {
    const acceleratingTime = Math.min(dt, Math.max(0, (DINO.maxSpeed - next.speed) / DINO.acceleration));
    const travel = next.speed * acceleratingTime + DINO.acceleration * acceleratingTime ** 2 / 2
      + DINO.maxSpeed * (dt - acceleratingTime);
    next.speed = Math.min(DINO.maxSpeed, next.speed + DINO.acceleration * dt);
    next.distance += travel;
    next.elapsed += dt;
    next.score = Math.floor(next.distance / 10);

    if (next.jumpHeight > 0 || next.velocity > 0) {
      next.jumpHeight += next.velocity * dt - DINO.gravity * dt ** 2 / 2;
      next.velocity -= DINO.gravity * dt;
      if (next.jumpHeight <= 0) {
        next.jumpHeight = 0;
        next.velocity = 0;
      }
    }

    next.obstacles = next.obstacles
      .map(obstacle => ({ ...obstacle, x: obstacle.x - travel }))
      .filter(obstacle => obstacle.x + obstacle.width > 0);

    while (next.nextObstacleDistance - next.distance <= next.worldWidth + 32) {
      const cactus = CACTI[next.nextObstacleId % CACTI.length];
      next.obstacles.push({
        id: next.nextObstacleId,
        x: next.nextObstacleDistance - next.distance,
        width: cactus.width,
        height: cactus.height,
      });
      // Plan gaps using speed at this point on the track, including future acceleration.
      const gapSpeed = speedAtDistance(next.nextObstacleDistance);
      next.nextObstacleDistance += cactus.width + gapSpeed * (DINO.minimumGapSeconds + cactus.extraGapSeconds);
      next.nextObstacleId += 1;
    }

    if (next.obstacles.some(obstacle => dinoCollides(next.jumpHeight, obstacle))) {
      next.crashed = true;
      break;
    }
  }
  return next;
}
