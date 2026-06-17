import { APP_VERSION, BUILD_TIMESTAMP_CL, WALL, PATH, STORAGE_KEYS, clamp } from './config.js?v=009';
import { buildMaze } from './maze.js?v=009';
import { AudioEngine } from './audio.js?v=009';

export class LaberinOjoGame {
  constructor(){
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.stage = document.getElementById('stage');
    this.overlay = document.getElementById('overlay');
    this.teleportBtn = document.getElementById('teleportBtn');
    this.dpad = document.getElementById('dpad');
    this.levelTxt = document.getElementById('levelTxt');
    this.timeTxt = document.getElementById('timeTxt');
    this.livesEl = document.getElementById('lives');
    this.versionTag = document.getElementById('versionTag');
    this.versionTag.textContent = `${APP_VERSION} · ${BUILD_TIMESTAMP_CL}`;

    this.audio = new AudioEngine();
    this.dpr = 1; this.viewW = 0; this.viewH = 0; this.cell = 24; this.ox = 0; this.oy = 0;
    this.level = Number(localStorage.getItem(STORAGE_KEYS.level) || 1);
    this.best = JSON.parse(localStorage.getItem(STORAGE_KEYS.best) || '{}');
    this.lastT = performance.now(); this.running = false; this.elapsed = 0;

    this.bindEvents();
    this.resize();
    this.newLevel(this.level);
    this.running = false;
    this.updateHud();
    this.deferStartupResize();
    requestAnimationFrame(t => this.loop(t));
  }

  bindEvents(){
    if(window.PointerEvent){
      this.stage.addEventListener('pointerdown', e => this.onDown(e));
      this.stage.addEventListener('pointermove', e => this.onMove(e));
      this.stage.addEventListener('pointerup', e => this.onUp(e));
      this.stage.addEventListener('pointercancel', e => this.onUp(e));
      this.teleportBtn.addEventListener('pointerdown', e => this.onTeleportPress(e));
    } else {
      this.stage.addEventListener('touchstart', e => this.onDown(e), { passive:false });
      this.stage.addEventListener('touchmove', e => this.onMove(e), { passive:false });
      this.stage.addEventListener('touchend', e => this.onUp(e), { passive:false });
      this.stage.addEventListener('mousedown', e => this.onDown(e));
      this.stage.addEventListener('mousemove', e => this.onMove(e));
      this.stage.addEventListener('mouseup', e => this.onUp(e));
      this.teleportBtn.addEventListener('touchstart', e => this.onTeleportPress(e), { passive:false });
      this.teleportBtn.addEventListener('mousedown', e => this.onTeleportPress(e));
    }

    this.dpad?.querySelectorAll('.dpadBtn').forEach(btn => {
      const start = e => this.onDpadDown(e, btn);
      btn.addEventListener('pointerdown', start);
      btn.addEventListener('touchstart', start, { passive:false });
      btn.addEventListener('mousedown', start);
    });

    window.addEventListener('resize', () => this.recenterAfterResize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.recenterAfterResize(), 120));
    document.addEventListener('visibilitychange', () => { if(!document.hidden) this.recenterAfterResize(); });
  }

  deferStartupResize(){ requestAnimationFrame(() => this.recenterAfterResize()); setTimeout(() => this.recenterAfterResize(), 120); setTimeout(() => this.recenterAfterResize(), 450); }
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
    const before = this.player ? this.pixelToCell(this.player.x, this.player.y) : null;
    this.resize();
    if(this.player && before && this.maze?.[before.y]?.[before.x] === PATH){ const c = this.cellCenter(before); this.player.x = c.x; this.player.y = c.y; }
    else if(this.player){ const s = this.cellCenter(this.startCell); this.player.x = s.x; this.player.y = s.y; }
    if(this.player){ this.player.r = this.cell * .32; this.player.dir = {x:0,y:0}; this.player.speed = 0; this.player.safe = []; this.pushSafePosition(); }
  }
  fitMaze(){ if(!this.rows || !this.cols) return; this.cell = Math.max(8, Math.floor(Math.min(this.viewW / this.cols, this.viewH / this.rows))); this.ox = (this.viewW - this.cell * this.cols) / 2; this.oy = (this.viewH - this.cell * this.rows) / 2; }

  newLevel(level){
    this.level = level; localStorage.setItem(STORAGE_KEYS.level, String(this.level));
    const mazeData = buildMaze(this.level);
    this.maze = mazeData.grid; this.rows = mazeData.rows; this.cols = mazeData.cols; this.startCell = mazeData.start; this.goalCell = mazeData.goal; this.levelParams = mazeData.params;
    this.fitMaze();
    const start = this.cellCenter(this.startCell);
    this.player = {x:start.x,y:start.y,r:this.cell*.32,dir:{x:0,y:0},wanted:{x:0,y:0},speed:0,lives:5,damageUntil:0,dead:false,penalty:0,blink:0,teleportUntil:0,safe:[]};
    this.pushSafePosition();
    this.input = {active:false,id:null,sx:0,sy:0,x:0,y:0,power:0,dir:{x:0,y:0},mode:'none'};
    this.startMs = performance.now(); this.elapsed = 0; this.running = true; this.updateHud();
  }

  cellCenter(c){ return {x:this.ox+(c.x+.5)*this.cell,y:this.oy+(c.y+.5)*this.cell}; }
  pixelToCell(px,py){ return {x:Math.floor((px-this.ox)/this.cell),y:Math.floor((py-this.oy)/this.cell)}; }
  isWallAt(px,py){ const x=Math.floor((px-this.ox)/this.cell), y=Math.floor((py-this.oy)/this.cell); return x<0||y<0||x>=this.cols||y>=this.rows||this.maze[y][x]===WALL; }
  circleHitsWall(x,y,r){ const pts=[[0,0],[r,0],[-r,0],[0,r],[0,-r],[r*.7,r*.7],[-r*.7,r*.7],[r*.7,-r*.7],[-r*.7,-r*.7]]; return pts.some(([dx,dy])=>this.isWallAt(x+dx,y+dy)); }
  pushSafePosition(){ if(!this.player || this.circleHitsWall(this.player.x,this.player.y,this.player.r)) return; this.player.safe.push({x:this.player.x,y:this.player.y}); if(this.player.safe.length>18) this.player.safe.shift(); }
  rollbackPlayer(){ if(!this.player?.safe?.length) return; const candidates=[...this.player.safe].reverse(); const target=candidates[Math.min(7,candidates.length-1)]; if(target && !this.circleHitsWall(target.x,target.y,this.player.r)){ this.player.x=target.x; this.player.y=target.y; this.player.safe=[target]; return; } const fallback=candidates.find(p=>!this.circleHitsWall(p.x,p.y,this.player.r)); if(fallback){ this.player.x=fallback.x; this.player.y=fallback.y; this.player.safe=[fallback]; } }
  nearbyHealthyCenters(maxDist){ const here=this.pixelToCell(this.player.x,this.player.y), radiusCells=Math.ceil(maxDist/this.cell)+1, out=[]; for(let gy=here.y-radiusCells;gy<=here.y+radiusCells;gy++) for(let gx=here.x-radiusCells;gx<=here.x+radiusCells;gx++){ if(gx<0||gy<0||gx>=this.cols||gy>=this.rows||this.maze[gy][gx]!==PATH) continue; const c=this.cellCenter({x:gx,y:gy}); const dist=Math.hypot(c.x-this.player.x,c.y-this.player.y); if(dist<=maxDist && !this.circleHitsWall(c.x,c.y,this.player.r*.92)) out.push({...c,dist,rnd:Math.random()}); } return out.sort((a,b)=>a.dist-b.dist||a.rnd-b.rnd); }
  settleAfterRelocation(){ this.player.dir={x:0,y:0}; this.player.speed=0; if(this.canMove(this.player.wanted)) this.player.dir={...this.player.wanted}; this.pushSafePosition(); }
  teleportPlayer(){ if(!this.running||!this.player) return; const centers=this.nearbyHealthyCenters(this.player.r*6); if(centers.length){ const pick=centers[Math.min(centers.length-1,Math.floor(Math.random()*Math.min(8,centers.length)))]; this.player.x=pick.x; this.player.y=pick.y; this.player.teleportUntil=performance.now()+280; this.settleAfterRelocation(); this.audio.beep(660,.05,'square',.04); return; } this.rollbackPlayer(); this.settleAfterRelocation(); this.player.teleportUntil=performance.now()+180; this.audio.beep(180,.05,'sawtooth',.035); }
  updateHud(){ this.levelTxt.textContent=this.level; this.timeTxt.textContent=(this.elapsed+(this.player?.penalty||0)).toFixed(2); this.livesEl.innerHTML=''; for(let i=0;i<5;i++){ const d=document.createElement('div'); d.className='life'+(i>=this.player.lives?' off':'')+(this.player.lives===1&&i===0?' low':''); this.livesEl.appendChild(d); } }
  dominant(dx,dy){ if(Math.hypot(dx,dy)<10) return {x:0,y:0}; return Math.abs(dx)>Math.abs(dy)?{x:Math.sign(dx),y:0}:{x:0,y:Math.sign(dy)}; }
  getEventPoint(e){ return e.changedTouches ? e.changedTouches[0] : e; }
  dirFromName(name){ return {up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}}[name] || {x:0,y:0}; }
  startGameIfNeeded(){ this.audio.start(); if(!this.running){ this.overlay.style.display='none'; this.newLevel(this.level); this.recenterAfterResize(); } else this.overlay.style.display='none'; }

  setPointer(e){ const t=this.getEventPoint(e); this.input.x=t.clientX; this.input.y=t.clientY; const dx=this.input.x-this.input.sx, dy=this.input.y-this.input.sy; this.input.power=clamp(Math.hypot(dx,dy)/80,0,1); this.input.dir=this.dominant(dx,dy); this.player.wanted=this.input.dir; }
  onDown(e){ e.preventDefault(); this.startGameIfNeeded(); const t=this.getEventPoint(e); this.input.active=true; this.input.mode='drag'; this.input.id=t.pointerId??t.identifier??'mouse'; this.input.sx=t.clientX; this.input.sy=t.clientY; this.setPointer(e); }
  onMove(e){ if(!this.input?.active || this.input.mode!=='drag') return; e.preventDefault(); this.setPointer(e); }
  onUp(e){ if(!this.input) return; e.preventDefault(); if(this.input.mode==='drag'){ this.input.active=false; this.input.power=0; this.player.wanted={x:0,y:0}; this.input.mode='none'; } }

  setDpadDirection(dir, btn){ this.dpad?.querySelectorAll('.dpadBtn').forEach(b => b.classList.remove('pressed')); btn?.classList.add('pressed'); this.input.active = true; this.input.mode = 'dpad'; this.input.power = 1; this.input.dir = dir; this.player.wanted = dir; if(this.canMove(dir)) this.player.dir = { ...dir }; }
  onDpadDown(e,btn){ e.preventDefault(); e.stopPropagation(); this.startGameIfNeeded(); this.setDpadDirection(this.dirFromName(btn.dataset.dir), btn); }
  onTeleportPress(e){ e.preventDefault(); e.stopPropagation(); this.audio.start(); this.teleportPlayer(); }

  canMove(dir){ if(!dir.x&&!dir.y) return false; const nx=this.player.x+dir.x*this.cell*.42, ny=this.player.y+dir.y*this.cell*.42; return !this.circleHitsWall(nx,ny,this.player.r*.9); }
  nearCellCenter(){ const cx=this.ox+(Math.floor((this.player.x-this.ox)/this.cell)+.5)*this.cell, cy=this.oy+(Math.floor((this.player.y-this.oy)/this.cell)+.5)*this.cell; return {ok:Math.abs(this.player.x-cx)<Math.max(2,this.cell*.13)&&Math.abs(this.player.y-cy)<Math.max(2,this.cell*.13),cx,cy}; }

  update(dt,now){
    if(!this.running) return;
    this.elapsed=(now-this.startMs)/1000;
    const center=this.nearCellCenter();
    if(center.ok){ this.player.x=center.cx; this.player.y=center.cy; if(!this.circleHitsWall(this.player.x,this.player.y,this.player.r)) this.pushSafePosition(); if(this.canMove(this.player.wanted)) this.player.dir={...this.player.wanted}; else if(!this.canMove(this.player.dir)) this.player.dir={x:0,y:0}; }
    else if(!this.player.dir.x&&!this.player.dir.y&&this.canMove(this.player.wanted)) this.player.dir={...this.player.wanted};
    const pow=this.input.active?this.input.power:Math.max(0,this.player.speed/this.levelParams.speedMax-dt*4); const shaped=Math.pow(pow,1.35); this.player.speed=pow>0?this.levelParams.speedMin+(this.levelParams.speedMax-this.levelParams.speedMin)*shaped:0;
    const nx=this.player.x+this.player.dir.x*this.player.speed*dt, ny=this.player.y+this.player.dir.y*this.player.speed*dt;
    if(!this.circleHitsWall(nx,ny,this.player.r)){ this.player.x=nx; this.player.y=ny; this.pushSafePosition(); } else this.damage(now);
    const goal=this.cellCenter(this.goalCell); if(Math.hypot(this.player.x-goal.x,this.player.y-goal.y)<this.cell*.45){ const finalTime=this.elapsed+this.player.penalty; this.best[this.level]=Math.min(this.best[this.level]||Infinity,finalTime); localStorage.setItem(STORAGE_KEYS.best,JSON.stringify(this.best)); this.newLevel(this.level+1); }
    this.updateHud();
  }

  damage(now){ if(now<this.player.damageUntil) return; this.player.lives--; this.player.penalty+=this.levelParams.wallPenalty; this.player.damageUntil=now+650; this.player.blink=now+650; this.rollbackPlayer(); this.player.dir={x:0,y:0}; this.player.speed=0; this.audio.beep(110,.08,'sawtooth',.05); if(this.player.lives<=0){ this.running=false; setTimeout(()=>this.newLevel(this.level),450); } }
  draw(){ this.ctx.clearRect(0,0,this.viewW,this.viewH); this.drawMaze(); this.drawGoal(); this.drawPlayer(); if(this.input?.active && this.input.mode==='drag') this.drawJoystick(); }
  drawMaze(){ const ctx=this.ctx; ctx.save(); ctx.translate(this.ox,this.oy); ctx.lineJoin='round'; ctx.lineCap='round'; for(let y=0;y<this.rows;y++) for(let x=0;x<this.cols;x++) if(this.maze[y][x]===WALL){ const px=x*this.cell, py=y*this.cell, grad=ctx.createLinearGradient(px,py,px+this.cell,py+this.cell); grad.addColorStop(0,'#083cbd'); grad.addColorStop(1,'#1ed6ff'); ctx.fillStyle=grad; ctx.shadowColor='rgba(39,215,255,.7)'; ctx.shadowBlur=8; const r=Math.max(4,this.cell*.18); this.roundRect(px+1.2,py+1.2,this.cell-2.4,this.cell-2.4,r); ctx.fill(); ctx.shadowBlur=0; ctx.strokeStyle='rgba(255,255,255,.18)'; ctx.lineWidth=1; ctx.stroke(); } ctx.restore(); }
  drawGoal(){ const ctx=this.ctx, goal=this.cellCenter(this.goalCell), pulse=1+Math.sin(performance.now()/1000*5)*.08; ctx.save(); ctx.translate(goal.x,goal.y); ctx.scale(pulse,pulse); ctx.shadowColor='rgba(255,216,77,.9)'; ctx.shadowBlur=22; ctx.strokeStyle='#ffd84d'; ctx.lineWidth=Math.max(3,this.cell*.1); ctx.beginPath(); ctx.arc(0,0,this.cell*.34,0,Math.PI*2); ctx.stroke(); ctx.fillStyle='rgba(255,216,77,.18)'; ctx.beginPath(); ctx.arc(0,0,this.cell*.24,0,Math.PI*2); ctx.fill(); ctx.restore(); }
  drawPlayer(){ const ctx=this.ctx, now=performance.now(); if(now<this.player.blink&&Math.floor(now/70)%2===0) return; const look=this.player.wanted.x||this.player.wanted.y?this.player.wanted:this.player.dir, lx=look.x*this.player.r*.34, ly=look.y*this.player.r*.34; if(now<this.player.teleportUntil){ ctx.save(); ctx.translate(this.player.x,this.player.y); ctx.globalAlpha=.75; ctx.strokeStyle='#ff4c6a'; ctx.lineWidth=3; ctx.setLineDash([3,3]); ctx.beginPath(); ctx.arc(0,0,this.player.r*1.62,0,Math.PI*2); ctx.stroke(); ctx.restore(); } ctx.save(); ctx.translate(this.player.x,this.player.y); ctx.shadowColor=this.player.lives===1?'rgba(255,76,106,.9)':'rgba(255,255,255,.8)'; ctx.shadowBlur=16; ctx.fillStyle=this.player.lives===1?'#ffe2e8':'#f8fbff'; ctx.beginPath(); ctx.arc(0,0,this.player.r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=8; ctx.fillStyle='#6ee7ff'; ctx.beginPath(); ctx.arc(lx,ly,this.player.r*.48,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; ctx.fillStyle='#040611'; ctx.beginPath(); ctx.arc(lx+look.x*this.player.r*.12,ly+look.y*this.player.r*.12,this.player.r*.23,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='rgba(0,0,0,.45)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,this.player.r,0,Math.PI*2); ctx.stroke(); ctx.restore(); }
  drawJoystick(){ const ctx=this.ctx, dx=this.input.x-this.input.sx, dy=this.input.y-this.input.sy, a=Math.min(1,Math.hypot(dx,dy)/80); ctx.save(); ctx.globalAlpha=.22; ctx.strokeStyle='#cfefff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(this.input.sx,this.input.sy,80,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=.32+.25*a; ctx.fillStyle='#ffd84d'; ctx.beginPath(); ctx.arc(this.input.sx+clamp(dx,-80,80),this.input.sy+clamp(dy,-80,80),18,0,Math.PI*2); ctx.fill(); ctx.restore(); }
  roundRect(x,y,w,h,r){ const ctx=this.ctx; ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
  loop(t){ const dt=Math.min(.05,(t-this.lastT)/1000); this.lastT=t; this.update(dt,t); this.draw(); requestAnimationFrame(next=>this.loop(next)); }
}
