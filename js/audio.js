import { AUDIO_MASTER_GAIN } from './config.js?v=011';

export class AudioEngine {
  constructor(){
    this.ctx = null;
    this.master = null;
    this.next = 0;
    this.step = 0;
    this.timer = null;
    this.started = false;
  }

  async start(){
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;

    if(!this.ctx){
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = AUDIO_MASTER_GAIN;
      this.master.connect(this.ctx.destination);
      this.next = this.ctx.currentTime + 0.05;
    }

    if(this.ctx.state === 'suspended'){
      try { await this.ctx.resume(); } catch (err) {}
    }

    if(!this.started){
      this.started = true;
      this.timer = setInterval(() => this.scheduleMusic(), 90);
      this.beep(420, 0.035, 'sine', 0.025);
    }
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

    const bpm = 75;
    const transpose = -6;
    const beat = 60 / bpm;
    const swing = 0.58;
    const melody = [62,65,69,72,71,69,67,64,62,65,69,74,72,71,69,67];
    const bass = [38,38,43,43,36,36,45,45];

    while(this.next < this.ctx.currentTime + 0.45){
      const i = this.step % 16;
      const bar = Math.floor(this.step / 4) % 4;
      const duration = beat * (i % 2 === 0 ? swing : 1 - swing);

      if(i % 2 === 0) this.note(bass[(this.step / 2 | 0) % bass.length] + transpose, this.next, beat * 0.42, 'triangle', 0.16);

      if(i % 4 === 0){
        const chords = [[62,65,69],[67,71,74],[60,64,67],[57,61,67]][bar];
        chords.forEach((m, k) => this.note(m + transpose, this.next + k * 0.012, beat * 0.9, 'sine', 0.045));
      }

      if(i !== 6 && i !== 14) this.note(melody[i] + transpose, this.next, duration * 0.72, 'square', 0.055);

      this.next += duration;
      this.step++;
    }
  }
}

function midiToFreq(midi){
  return 440 * Math.pow(2, (midi - 69) / 12);
}
