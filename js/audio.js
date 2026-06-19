import {
  AUDIO_MASTER_GAIN,
  MUSIC_BPM,
  MUSIC_TRANSPOSE,
  MUSIC_LOOKAHEAD_SEC,
  MUSIC_SCHEDULE_INTERVAL_MS,
  MUSIC_START_DELAY_SEC
} from './config.js?v=019';

export class AudioEngine {
  constructor(){
    this.ctx = null;
    this.master = null;
    this.next = 0;
    this.step = 0;
    this.timer = null;
    this.started = false;
    this.unlockArmed = false;
  }

  async start(){
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;

    if(!this.ctx){
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = AUDIO_MASTER_GAIN;
      this.master.connect(this.ctx.destination);
      this.next = this.ctx.currentTime + MUSIC_START_DELAY_SEC;
    }

    if(this.ctx.state === 'suspended'){
      this.armUnlock();
      try { await this.ctx.resume(); } catch (err) {}
    }

    if(this.ctx.state !== 'running') return;

    if(!this.started){
      this.started = true;
      this.next = this.ctx.currentTime + MUSIC_START_DELAY_SEC;
      this.downbeat(this.next);
      this.scheduleMusic();
      this.timer = setInterval(() => this.scheduleMusic(), MUSIC_SCHEDULE_INTERVAL_MS);
      return;
    }

    if(this.next < this.ctx.currentTime){
      this.next = this.ctx.currentTime + MUSIC_START_DELAY_SEC;
    }
    this.scheduleMusic();
  }

  armUnlock(){
    if(this.unlockArmed || typeof window === 'undefined') return;
    this.unlockArmed = true;
    const unlock = () => {
      this.unlockArmed = false;
      this.start();
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('touchstart', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('touchstart', unlock, true);
    window.addEventListener('keydown', unlock, true);
  }

  downbeat(t){
    [38, 50, 62].forEach((m, i) => this.note(m + MUSIC_TRANSPOSE, t + i * 0.01, 0.22, i === 0 ? 'triangle' : 'square', i === 0 ? 0.2 : 0.075));
    this.beep(520, 0.045, 'sine', 0.035);
  }

  beep(freq, duration, type = 'sine', gain = 0.04){
    if(!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.value = gain;
    osc.connect(amp);
    amp.connect(this.master);
    osc.start(t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.stop(t + duration + 0.02);
  }

  note(midi, t, duration, type = 'sine', gain = 0.13){
    if(!this.ctx || this.ctx.state !== 'running') return;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = midiToFreq(midi);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(gain, t + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(amp);
    amp.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.03);
  }

  scheduleMusic(){
    if(!this.ctx || this.ctx.state !== 'running') return;

    const beat = 60 / MUSIC_BPM;
    const swing = 0.58;
    const melody = [62,65,69,72,71,69,67,64,62,65,69,74,72,71,69,67];
    const bass = [38,38,43,43,36,36,45,45];

    while(this.next < this.ctx.currentTime + MUSIC_LOOKAHEAD_SEC){
      const i = this.step % 16;
      const bar = Math.floor(this.step / 4) % 4;
      const duration = beat * (i % 2 === 0 ? swing : 1 - swing);

      if(i % 2 === 0) this.note(bass[(this.step / 2 | 0) % bass.length] + MUSIC_TRANSPOSE, this.next, beat * 0.42, 'triangle', 0.16);

      if(i % 4 === 0){
        const chords = [[62,65,69],[67,71,74],[60,64,67],[57,61,67]][bar];
        chords.forEach((m, k) => this.note(m + MUSIC_TRANSPOSE, this.next + k * 0.012, beat * 0.9, 'sine', 0.045));
      }

      if(i !== 6 && i !== 14) this.note(melody[i] + MUSIC_TRANSPOSE, this.next, duration * 0.72, 'square', 0.055);

      this.next += duration;
      this.step++;
    }
  }
}

function midiToFreq(midi){
  return 440 * Math.pow(2, (midi - 69) / 12);
}
