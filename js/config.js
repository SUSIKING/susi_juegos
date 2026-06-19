export const APP_VERSION = 'v0.0.1.5';
export const BUILD_TIMESTAMP_CL = '2026-06-18 22:04 CLT';

export const WALL = 0;
export const PATH = 1;

export const AUDIO_MASTER_GAIN = 0.5;
export const MUSIC_BPM = 75;
export const MUSIC_TRANSPOSE = -6;
export const MUSIC_LOOKAHEAD_SEC = 0.65;
export const MUSIC_SCHEDULE_INTERVAL_MS = 60;
export const MUSIC_START_DELAY_SEC = 0.02;
export const PLAYER_MOVE_CELLS_PER_SECOND = 4.4;
export const PLAYER_MOVE_DURATION_MIN_MS = 130;
export const PLAYER_MOVE_DURATION_MAX_MS = 260;
export const PLAYER_STEP_COOLDOWN_MS = 130;
export const PLAYER_MOVE_ACCEL_PER_STEP = 0.12;
export const PLAYER_MOVE_ACCEL_STEPS = 6;
export const PLAYER_MOVE_ACCEL_RESET_MS = 520;

export const STORAGE_KEYS = {
  level: 'laberinOjoLevel',
  best: 'laberinOjoBest'
};

export function levelParams(level){
  const complexity = 1 - Math.exp(-level / 12);
  return {
    complexity,
    seed: level * 99991 + 1337,
    cols: makeOdd(11 + 2 * Math.floor(Math.sqrt(level))),
    rows: makeOdd(15 + 2 * Math.floor(1.2 * Math.sqrt(level))),
    loopRate: 0.02 + 0.12 * complexity,
    speedMin: 55,
    speedMax: 165 + 55 * complexity,
    wallPenalty: 0.75 + 0.35 * complexity
  };
}

export function makeOdd(n){
  return n % 2 ? n : n + 1;
}

export function clamp(value, min, max){
  return Math.max(min, Math.min(max, value));
}
