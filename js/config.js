export const APP_VERSION = 'v0.0.0.6';
export const BUILD_TIMESTAMP_CL = '2026-06-17 07:48 CLT';

export const WALL = 0;
export const PATH = 1;

export const STORAGE_KEYS = {
  level: 'laberinOjoLevel',
  best: 'laberinOjoBest'
};

export function levelParams(level){
  const complexity = 1 - Math.exp(-level / 12);
  return {
    complexity,
    seed: level * 99991 + 1337,
    cols: makeOdd(9 + 2 * Math.floor(Math.sqrt(level))),
    rows: makeOdd(13 + 2 * Math.floor(1.2 * Math.sqrt(level))),
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
