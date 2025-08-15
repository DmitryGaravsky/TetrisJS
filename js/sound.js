// Simple sound manager using WebAudio API; generates tones to avoid external assets
export class Sound {
  constructor() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
  this.master.gain.value = 0.07;
  this._muted = false;
    this.master.connect(this.ctx.destination);
  }

  beep(freq = 440, duration = 0.08, type = 'square') {
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(1.0, t0 + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.01);
  }

  // UI wrappers
  rotate() { this.beep(660, 0.04, 'triangle'); }
  move()   { this.beep(520, 0.03, 'sine'); }
  drop()   { this.beep(220, 0.06, 'sawtooth'); }
  lock()   { this.beep(160, 0.09, 'square'); }
  clear(lines = 1) {
    const base = 520;
    for (let i = 0; i < lines; i++) {
      setTimeout(() => this.beep(base + i * 120, 0.06, 'triangle'), i * 70);
    }
  }
  gameover() {
    this.beep(200, 0.12, 'sawtooth');
    setTimeout(() => this.beep(140, 0.18, 'square'), 120);
  }

  setMuted(m) {
    this._muted = !!m;
    this.master.gain.value = this._muted ? 0 : 0.07;
  }
  toggleMute() {
    this.setMuted(!this._muted);
  }
  isMuted() { return this._muted; }
}
