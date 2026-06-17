#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const FILES = {
  config: 'js/config.js',
  index: 'index.html',
  main: 'js/main.js',
  game: 'js/game.js',
  maze: 'js/maze.js',
  readme: 'README.md'
};

const now = new Date();
const formatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Santiago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

function read(path){
  return readFileSync(path, 'utf8');
}

function write(path, content){
  writeFileSync(path, content, 'utf8');
}

function getCurrentVersion(){
  const config = read(FILES.config);
  const match = config.match(/APP_VERSION\s*=\s*'v(\d+)\.(\d+)\.(\d+)\.(\d+)'/);
  if(!match) throw new Error('APP_VERSION not found in js/config.js');
  return match.slice(1).map(Number);
}

function bumpVersion(parts){
  const next = [...parts];
  for(let i = next.length - 1; i >= 0; i--){
    if(next[i] < 9){
      next[i]++;
      for(let j = i + 1; j < next.length; j++) next[j] = 0;
      return next;
    }
  }
  return [next[0] + 1, 0, 0, 0];
}

function versionString(parts){
  return `v${parts.join('.')}`;
}

function cacheKey(version){
  const last = version.split('.').at(-1);
  const numeric = version.replace(/^v/, '').split('.').join('');
  return numeric.padStart(3, '0').slice(-3) || last.padStart(3, '0');
}

function chileTimestamp(){
  return `${formatter.format(now).replace(' ', ' ')} CLT`;
}

function replaceOrThrow(path, regex, replacement){
  const old = read(path);
  const next = old.replace(regex, replacement);
  if(next === old) throw new Error(`No replacement made in ${path}`);
  write(path, next);
}

const explicit = process.argv[2];
const current = versionString(getCurrentVersion());
const next = explicit || versionString(bumpVersion(getCurrentVersion()));
const key = cacheKey(next);
const timestamp = chileTimestamp();

replaceOrThrow(FILES.config, /APP_VERSION\s*=\s*'v\d+\.\d+\.\d+\.\d+'/, `APP_VERSION = '${next}'`);
replaceOrThrow(FILES.config, /BUILD_TIMESTAMP_CL\s*=\s*'[^']+'/, `BUILD_TIMESTAMP_CL = '${timestamp}'`);

replaceOrThrow(FILES.index, /styles\.css\?v=\d+/g, `styles.css?v=${key}`);
replaceOrThrow(FILES.index, /main\.js\?v=\d+/g, `main.js?v=${key}`);
replaceOrThrow(FILES.index, /v\d+\.\d+\.\d+\.\d+/g, next);

replaceOrThrow(FILES.main, /game\.js\?v=\d+/g, `game.js?v=${key}`);
replaceOrThrow(FILES.game, /config\.js\?v=\d+/g, `config.js?v=${key}`);
replaceOrThrow(FILES.game, /maze\.js\?v=\d+/g, `maze.js?v=${key}`);
replaceOrThrow(FILES.game, /audio\.js\?v=\d+/g, `audio.js?v=${key}`);
replaceOrThrow(FILES.maze, /config\.js\?v=\d+/g, `config.js?v=${key}`);

replaceOrThrow(FILES.readme, /v\d+\.\d+\.\d+\.\d+ · \d{4}-\d{2}-\d{2} \d{2}:\d{2} CLT/, `${next} · ${timestamp}`);

console.log(`Version bumped: ${current} -> ${next}`);
console.log(`Cache key: ${key}`);
console.log(`Timestamp: ${timestamp}`);
