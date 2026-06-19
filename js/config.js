export const APP_VERSION = 'v0.0.2.1';
export const BUILD_TIMESTAMP_CL = '2026-06-18 22:43 CLT';

export const WALL = 0;
export const PATH = 1;

export const AUDIO_MASTER_GAIN = 0.5;
export const MUSIC_BPM = 75;
export const MUSIC_TRANSPOSE = -6;
export const MUSIC_LOOKAHEAD_SEC = 0.65;
export const MUSIC_SCHEDULE_INTERVAL_MS = 60;
export const MUSIC_START_DELAY_SEC = 0.005;
export const PLAYER_BASE_SPEED_CELLS_PER_SECOND = 1.3;
export const PLAYER_MAX_SPEED_CELLS_PER_SECOND = 2.7;
export const PLAYER_ACCEL_CELLS_PER_SECOND = 3.6;
export const PLAYER_LANE_CORRECTION_CELLS_PER_SECOND = 7.5;
export const PLAYER_COLLISION_RADIUS_SCALE = 0.26;

export const STORAGE_KEYS = {
  level: 'laberinOjoLevel',
  best: 'laberinOjoBest'
};

export function levelParams(level){
  const ramp = Math.max(0, level - 1);
  const complexity = 1 - Math.exp(-ramp / 10);
  return {
    complexity,
    seed: level * 99991 + 1337,
    cols: makeOdd(7 + 2 * Math.floor(Math.sqrt(ramp))),
    rows: makeOdd(9 + 2 * Math.floor(1.15 * Math.sqrt(ramp))),
    loopRate: 0.04 + 0.12 * complexity,
    speedMin: 55,
    speedMax: 165 + 55 * complexity,
    wallPenalty: 0.45 + 0.45 * complexity
  };
}

export function makeOdd(n){
  return n % 2 ? n : n + 1;
}

export function clamp(value, min, max){
  return Math.max(min, Math.min(max, value));
}
