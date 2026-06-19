import {
  APP_VERSION,
  BUILD_TIMESTAMP_CL,
  WALL,
  PATH,
  STORAGE_KEYS,
  PLAYER_BASE_SPEED_CELLS_PER_SECOND,
  PLAYER_MAX_SPEED_CELLS_PER_SECOND,
  PLAYER_ACCEL_CELLS_PER_SECOND,
  PLAYER_LANE_CORRECTION_CELLS_PER_SECOND,
  PLAYER_COLLISION_RADIUS_SCALE,
  clamp
} from './config.js?v=018';
import { buildMaze } from './maze.js?v=018';
import { AudioEngine } from './audio.js?v=018';

export class LaberinOjoGame {
  constructor(){
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.stage = document.getElementById('stage');
    this.overlay = document.getElementById('overlay');
    this.teleportBtn = document.getElementById('teleportBtn');
    this.levelTxt = document.getElementById('levelTxt');
    this.timeTxt = document.getElementById('timeTxt');
    this.livesEl = document.getElementById('lives');
    this.versionTag = document.getElementById('versionTag');
    this.versionTag.textContent = `${APP_VERSION} · ${BUILD_TIMESTAMP_CL}`;

    this.audio = new AudioEngine();
    this.audio.start();
    this.dpr = 1;
    this.viewW = 0;
    this.viewH = 0;
    this.cell = 24;
    this.ox = 0;
    this.oy = 0;
    this.level = Number(localStorage.getItem(STORAGE_KEYS.level) || 1);
    this.best = JSON.parse(localStorage.getItem(STORAGE_KEYS.best) || '{}');
    this.lastT = performance.now();
    this.running = false;
    this.elapsed = 0;

    this.bindEvents();
    this.resize();
    this.newLevel(this.level);
    this.running = false;
    this.updateHud();
    this.deferStartupResize();
    requestAnimationFrame(t => this.loop(t));
  }

  bindEvents(){
    const down = e => this.onDown(e);
    const move = e => this.onMove(e);
    const up = e => this.onUp(e);

    if(window.PointerEvent){
      this.stage.addEventListener('pointerdown', down);
      this.stage.addEventListener('pointermove', move);
      this.stage.addEventListener('pointerup', up);
      this.stage.addEventListener('pointercancel', up);
      this.teleportBtn.addEventListener('pointerdown', e => this.onTeleportPress(e));
    } else {
      this.stage.addEventListener('touchstart', down, { passive:false });
      this.stage.addEventListener('touchmove', move, { passive:false });
      this.stage.addEventListener('touchend', up, { passive:false });
      this.stage.addEventListener('mousedown', down);
      this.stage.addEventListener('mousemove', move);
      this.stage.addEventListener('mouseup', up);
      this.teleportBtn.addEventListener('touchstart', e => this.onTeleportPress(e), { passive:false });
      this.teleportBtn.addEventListener('mousedown', e => this.onTeleportPress(e));
    }

    window.addEventListener('resize', () => this.recenterAfterResize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.recenterAfterResize(), 120));
    document.addEventListener('visibilitychange', () => { if(!document.hidden) this.recenterAfterResize(); });
  }

  deferStartupResize(){
    requestAnimationFrame(() => this.recenterAfterResize());
    setTimeout(() => this.recenterAfterResize(), 120);
    setTimeout(() => this.recenterAfterResize(), 450);
  }

  resize(){
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = this.stage.getBoundingClientRect();
    this.viewW = rect.width || (window.innerWidth || 360);
    this.viewH = rect.height || Math.max(280, (window.innerHeight || 640) - 110);
    this.canvas.width = Math.max(1, Math.floor(this.viewW * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(this.viewH * this.dpr));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.fitMaze();
  }

  recenterAfterResize(){
    const previous = this.player ? { x:this.player.cellX, y:this.player.cellY } : null;
    this.resize();
    if(!this.player) return;

    const safeCell = previous && this.isPathCell(previous.x, previous.y) ? previous : this.startCell;
    const center = this.cellCenter(safeCell);
    this.player.cellX = safeCell.x;
    this.player.cellY = safeCell.y;
    this.player.x = center.x;
    this.player.y = center.y;
    this.player.renderX = center.x;
    this.player.renderY = center.y;
    this.player.speedCells = 0;
    this.player.r = this.cell * .32;
  }

  fitMaze(){
    if(!this.rows || !this.cols) return;
    this.cell = Math.max(8, Math.floor(Math.min(this.viewW / this.cols, this.viewH / this.rows)));
    this.ox = (this.viewW - this.cell * this.cols) / 2;
    this.oy = (this.viewH - this.cell * this.rows) / 2;
  }

  newLevel(level){
    this.level = level;
    localStorage.setItem(STORAGE_KEYS.level, String(this.level));

    const mazeData = buildMaze(this.level);
    this.maze = mazeData.grid;
    this.rows = mazeData.rows;
    this.cols = mazeData.cols;
    this.startCell = mazeData.start;
    this.goalCell = mazeData.goal;
    this.levelParams = mazeData.params;
    this.fitMaze();

    const start = this.cellCenter(this.startCell);
    this.player = {
      cellX:this.startCell.x,
      cellY:this.startCell.y,
      x:start.x,
      y:start.y,
      renderX:start.x,
      renderY:start.y,
      speedCells:0,
      r:this.cell * .32,
      dir:{x:0,y:0},
      wanted:{x:0,y:0},
      lives:5,
      damageUntil:0,
      penalty:0,
      blink:0,
      teleportUntil:0
    };

    this.input = { active:false, sx:0, sy:0, x:0, y:0, mode:'none' };
    this.startMs = performance.now();
    this.elapsed = 0;
    this.running = true;
    this.updateHud();
  }

  cellCenter(c){
    return { x:this.ox + (c.x + .5) * this.cell, y:this.oy + (c.y + .5) * this.cell };
  }

  isPathCell(x, y){
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows && this.maze?.[y]?.[x] === PATH;
  }

  startGameIfNeeded(){
    this.audio.start();
    this.overlay.style.display = 'none';
    if(!this.running){
      this.newLevel(this.level);
      this.recenterAfterResize();
    }
  }

  dominant(dx, dy){
    if(Math.hypot(dx, dy) < 18) return {x:0,y:0};
    return Math.abs(dx) > Math.abs(dy) ? {x:Math.sign(dx), y:0} : {x:0, y:Math.sign(dy)};
  }

  getEventPoint(e){
    return e.changedTouches ? e.changedTouches[0] : e;
  }

  setLook(dir){
    if(!dir.x && !dir.y) return;
    this.player.wanted = dir;
    this.player.dir = dir;
  }

  pixelCell(x, y){
    return {
      x:Math.floor((x - this.ox) / this.cell),
      y:Math.floor((y - this.oy) / this.cell)
    };
  }

  canOccupy(x, y){
    const r = this.cell * PLAYER_COLLISION_RADIUS_SCALE;
    const points = [
      [x, y],
      [x - r, y],
      [x + r, y],
      [x, y - r],
      [x, y + r]
    ];
    return points.every(([px, py]) => {
      const c = this.pixelCell(px, py);
      return this.isPathCell(c.x, c.y);
    });
  }

  syncPlayerCell(){
    const c = this.pixelCell(this.player.x, this.player.y);
    if(this.isPathCell(c.x, c.y)){
      this.player.cellX = c.x;
      this.player.cellY = c.y;
    }
  }

  moveAxis(dx, dy, now){
    if(!dx && !dy) return true;
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;
    if(this.canOccupy(nx, ny)){
      this.player.x = nx;
      this.player.y = ny;
      this.player.renderX = nx;
      this.player.renderY = ny;
      this.syncPlayerCell();
      return true;
    }

    this.player.speedCells = 0;
    this.damage(now);
    return false;
  }

  currentInputDir(){
    if(!this.input?.active || this.input.mode !== 'drag') return {x:0,y:0};
    return this.dominant(this.input.x - this.input.sx, this.input.y - this.input.sy);
  }

  updateContinuousMovement(dt, now){
    if(!this.running || !this.player) return;
    const dir = this.currentInputDir();
    if(!dir.x && !dir.y){
      this.player.speedCells = 0;
      return;
    }

    this.setLook(dir);
    this.player.speedCells = Math.min(
      PLAYER_MAX_SPEED_CELLS_PER_SECOND,
      Math.max(PLAYER_BASE_SPEED_CELLS_PER_SECOND, this.player.speedCells + PLAYER_ACCEL_CELLS_PER_SECOND * dt)
    );

    const speedPx = this.player.speedCells * this.cell;
    const primary = speedPx * dt;
    const laneSpeed = PLAYER_LANE_CORRECTION_CELLS_PER_SECOND * this.cell * dt;
    const currentCell = this.pixelCell(this.player.x, this.player.y);
    const lane = this.cellCenter(currentCell);

    if(dir.x){
      const correction = clamp(lane.y - this.player.y, -laneSpeed, laneSpeed);
      this.moveAxis(0, correction, now);
      this.moveAxis(dir.x * primary, 0, now);
    } else {
      const correction = clamp(lane.x - this.player.x, -laneSpeed, laneSpeed);
      this.moveAxis(correction, 0, now);
      this.moveAxis(0, dir.y * primary, now);
    }

    this.checkGoal();
  }

  onDown(e){
    e.preventDefault();
    this.startGameIfNeeded();
    const t = this.getEventPoint(e);
    this.input.active = true;
    this.input.mode = 'drag';
    this.input.sx = t.clientX;
    this.input.sy = t.clientY;
    this.input.x = t.clientX;
    this.input.y = t.clientY;
  }

  onMove(e){
    if(!this.input?.active || this.input.mode !== 'drag') return;
    e.preventDefault();
    const t = this.getEventPoint(e);
    this.input.x = t.clientX;
    this.input.y = t.clientY;
    const dir = this.dominant(this.input.x - this.input.sx, this.input.y - this.input.sy);
    if(dir.x || dir.y) this.setLook(dir);
  }

  onUp(e){
    if(!this.input) return;
    e.preventDefault();
    this.input.active = false;
    this.input.mode = 'none';
    if(this.player) this.player.speedCells = 0;
  }

  onTeleportPress(e){
    e.preventDefault();
    e.stopPropagation();
    this.startGameIfNeeded();
    this.teleportPlayer();
  }

  teleportPlayer(){
    if(!this.running || !this.player) return;

    const maxDist = this.player.r * 6;
    const here = {x:this.player.cellX, y:this.player.cellY};
    const radiusCells = Math.ceil(maxDist / this.cell) + 1;
    const options = [];

    for(let y = here.y - radiusCells; y <= here.y + radiusCells; y++){
      for(let x = here.x - radiusCells; x <= here.x + radiusCells; x++){
        if(!this.isPathCell(x, y)) continue;
        const c = this.cellCenter({x, y});
        const d = Math.hypot(c.x - this.player.x, c.y - this.player.y);
        if(d <= maxDist) options.push({x, y, d, rnd:Math.random()});
      }
    }

    if(!options.length) return;

    options.sort((a, b) => a.d - b.d || a.rnd - b.rnd);
    const pick = options[Math.min(options.length - 1, Math.floor(Math.random() * Math.min(8, options.length)))];
    const c = this.cellCenter(pick);
    this.player.cellX = pick.x;
    this.player.cellY = pick.y;
    this.player.x = c.x;
    this.player.y = c.y;
    this.player.renderX = c.x;
    this.player.renderY = c.y;
    this.player.speedCells = 0;
    this.player.teleportUntil = performance.now() + 280;
    this.audio.beep(660, .05, 'square', .04);
    this.checkGoal();
  }

  damage(now){
    if(now < this.player.damageUntil) return;
    this.player.lives--;
    this.player.penalty += this.levelParams.wallPenalty;
    this.player.damageUntil = now + 650;
    this.player.blink = now + 650;
    this.audio.beep(110, .08, 'sawtooth', .05);

    if(this.player.lives <= 0){
      this.running = false;
      setTimeout(() => this.newLevel(this.level), 450);
    }
  }

  checkGoal(){
    if(this.player.cellX !== this.goalCell.x || this.player.cellY !== this.goalCell.y) return;
    const finalTime = this.elapsed + this.player.penalty;
    this.best[this.level] = Math.min(this.best[this.level] || Infinity, finalTime);
    localStorage.setItem(STORAGE_KEYS.best, JSON.stringify(this.best));
    this.newLevel(this.level + 1);
  }

  update(dt, now){
    if(!this.running) return;
    this.elapsed = (now - this.startMs) / 1000;
    this.updateContinuousMovement(dt, now);

    this.updateHud();
  }

  updateHud(){
    this.levelTxt.textContent = this.level;
    this.timeTxt.textContent = (this.elapsed + (this.player?.penalty || 0)).toFixed(2);
    this.livesEl.innerHTML = '';
    for(let i = 0; i < 5; i++){
      const d = document.createElement('div');
      d.className = 'life' + (i >= this.player.lives ? ' off' : '') + (this.player.lives === 1 && i === 0 ? ' low' : '');
      this.livesEl.appendChild(d);
    }
  }

  draw(){
    this.ctx.clearRect(0, 0, this.viewW, this.viewH);
    this.drawMaze();
    this.drawGoal();
    this.drawPlayer();
    if(this.input?.active && this.input.mode === 'drag') this.drawJoystick();
  }

  drawMaze(){
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.ox, this.oy);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for(let y = 0; y < this.rows; y++){
      for(let x = 0; x < this.cols; x++){
        if(this.maze[y][x] !== WALL) continue;
        const px = x * this.cell;
        const py = y * this.cell;
        const grad = ctx.createLinearGradient(px, py, px + this.cell, py + this.cell);
        grad.addColorStop(0, '#083cbd');
        grad.addColorStop(1, '#1ed6ff');
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(39,215,255,.7)';
        ctx.shadowBlur = 8;
        const r = Math.max(4, this.cell * .18);
        this.roundRect(px + 1.2, py + 1.2, this.cell - 2.4, this.cell - 2.4, r);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,.18)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawGoal(){
    const ctx = this.ctx;
    const goal = this.cellCenter(this.goalCell);
    const pulse = 1 + Math.sin(performance.now() / 1000 * 5) * .08;
    ctx.save();
    ctx.translate(goal.x, goal.y);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = 'rgba(255,216,77,.9)';
    ctx.shadowBlur = 22;
    ctx.strokeStyle = '#ffd84d';
    ctx.lineWidth = Math.max(3, this.cell * .1);
    ctx.beginPath();
    ctx.arc(0, 0, this.cell * .34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,216,77,.18)';
    ctx.beginPath();
    ctx.arc(0, 0, this.cell * .24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawPlayer(){
    const ctx = this.ctx;
    const now = performance.now();
    if(now < this.player.blink && Math.floor(now / 70) % 2 === 0) return;

    const look = this.player.wanted.x || this.player.wanted.y ? this.player.wanted : this.player.dir;
    const lx = look.x * this.player.r * .34;
    const ly = look.y * this.player.r * .34;

    if(now < this.player.teleportUntil){
      ctx.save();
      ctx.translate(this.player.renderX, this.player.renderY);
      ctx.globalAlpha = .75;
      ctx.strokeStyle = '#ff4c6a';
      ctx.lineWidth = 3;
      ctx.setLineDash([3,3]);
      ctx.beginPath();
      ctx.arc(0, 0, this.player.r * 1.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.player.renderX, this.player.renderY);
    ctx.shadowColor = this.player.lives === 1 ? 'rgba(255,76,106,.9)' : 'rgba(255,255,255,.8)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = this.player.lives === 1 ? '#ffe2e8' : '#f8fbff';
    ctx.beginPath();
    ctx.arc(0, 0, this.player.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#6ee7ff';
    ctx.beginPath();
    ctx.arc(lx, ly, this.player.r * .48, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#040611';
    ctx.beginPath();
    ctx.arc(lx + look.x * this.player.r * .12, ly + look.y * this.player.r * .12, this.player.r * .23, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.player.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawJoystick(){
    const ctx = this.ctx;
    const dx = this.input.x - this.input.sx;
    const dy = this.input.y - this.input.sy;
    const strength = Math.min(1, Math.hypot(dx, dy) / 80);
    const dir = this.dominant(dx, dy);
    const active = dir.x ? (dir.x > 0 ? 'right' : 'left') : dir.y ? (dir.y > 0 ? 'down' : 'up') : '';
    const gap = 13;
    const armWidth = 15;
    const armHeight = 26;

    ctx.save();
    ctx.translate(this.input.sx, this.input.sy);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1.35;
    ctx.strokeStyle = `rgba(255,216,77,${.34 + .18 * strength})`;
    ctx.fillStyle = 'rgba(255,216,77,.045)';
    ctx.shadowColor = 'rgba(255,216,77,.28)';
    ctx.shadowBlur = 10;

    this.drawJoystickArm(-armWidth / 2, -gap - armHeight, armWidth, armHeight, active === 'up');
    this.drawJoystickArm(-armWidth / 2, gap, armWidth, armHeight, active === 'down');
    this.drawJoystickArm(-gap - armHeight, -armWidth / 2, armHeight, armWidth, active === 'left');
    this.drawJoystickArm(gap, -armWidth / 2, armHeight, armWidth, active === 'right');

    ctx.globalAlpha = .48 + .24 * strength;
    ctx.strokeStyle = 'rgba(255,216,77,.7)';
    ctx.fillStyle = 'rgba(255,216,77,.08)';
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 5);
    ctx.stroke();

    if(strength > .18){
      ctx.globalAlpha = .28 + .22 * strength;
      ctx.strokeStyle = 'rgba(255,216,77,.75)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(dx * .42, dy * .42);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawJoystickArm(x, y, w, h, active){
    const ctx = this.ctx;
    ctx.save();
    if(active){
      ctx.fillStyle = 'rgba(255,216,77,.14)';
      ctx.strokeStyle = 'rgba(255,216,77,.82)';
      ctx.shadowBlur = 14;
    }
    this.roundRect(x, y, w, h, 5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  roundRect(x, y, w, h, r){
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  loop(t){
    const dt = Math.min(.05, (t - this.lastT) / 1000);
    this.lastT = t;
    this.update(dt, t);
    this.draw();
    requestAnimationFrame(next => this.loop(next));
  }
}
