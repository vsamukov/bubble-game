/**
 * Offline Procedural Web Audio Engine for Bubble Bloom
 * Synthesizes popping, merging, ambient water bloops, and warning vibrations
 * without any external audio asset dependencies.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.7;
  private ambientGain: GainNode | null = null;
  private ambientOscs: OscillatorNode[] = [];
  private isAmbientPlaying: boolean = false;
  private lastTensionTime: number = 0;

  constructor() {
    // Read persisted audio preference
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('bubble_bloom_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
    }
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public enableAudio() {
    this.initContext();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('bubble_bloom_muted', String(muted));
    }
    if (muted && this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(0, this.ctx.currentTime);
    } else if (!muted && this.ambientGain && this.ctx && this.isAmbientPlaying) {
      this.ambientGain.gain.setTargetAtTime(0.08 * this.volume, this.ctx.currentTime, 0.5);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.ambientGain && this.ctx && !this.isMuted && this.isAmbientPlaying) {
      this.ambientGain.gain.setTargetAtTime(0.08 * this.volume, this.ctx.currentTime, 0.1);
    }
  }

  /**
   * Play bubble pop sound. Pitch dynamically scales with size:
   * Tiny bubbles: bright high snap (900-1400Hz)
   * Big bubbles: deep underwater thud (100-240Hz)
   */
  public playPop(radius: number) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Inversely map radius (approx 15 to 200) to pitch
      const clampedR = Math.max(15, Math.min(220, radius));
      const t = (clampedR - 15) / (220 - 15);
      const startFreq = 1200 * Math.pow(0.12, t); // from 1200Hz down to ~144Hz
      const endFreq = startFreq * 0.28;
      const duration = 0.04 + (clampedR / 220) * 0.12;

      // 1. Tonal downward sweep oscillator
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = clampedR > 80 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);

      oscGain.gain.setValueAtTime(0.4 * this.volume, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.02);

      // 2. Translucent click / membrane rupture transient
      const clickBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.015), this.ctx.sampleRate);
      const output = clickBuffer.getChannelData(0);
      for (let i = 0; i < clickBuffer.length; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (clickBuffer.length * 0.25));
      }
      const clickSource = this.ctx.createBufferSource();
      clickSource.buffer = clickBuffer;

      const clickFilter = this.ctx.createBiquadFilter();
      clickFilter.type = 'bandpass';
      clickFilter.frequency.setValueAtTime(startFreq * 1.5, now);
      clickFilter.Q.setValueAtTime(2, now);

      const clickGain = this.ctx.createGain();
      clickGain.gain.setValueAtTime(0.3 * this.volume, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

      clickSource.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(this.ctx.destination);

      clickSource.start(now);

      // Haptic feedback if available
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(clampedR > 90 ? [25, 20, 15] : 12);
        } catch {
          // ignore
        }
      }
    } catch {
      // Audio context may be closed or locked
    }
  }

  /**
   * Harmonious ascending merge chime.
   * Plays harmonic chord intervals in a serene pentatonic scale.
   */
  public playMerge(combinedRadius: number, combo: number = 1) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Pentatonic intervals
      const pentatonic = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
      const index = Math.min(pentatonic.length - 1, (combo - 1) % pentatonic.length);
      const baseFreq = pentatonic[index];
      const duration = 0.35;

      // Bell-like chime: Carrier + Soft overtone
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(baseFreq * 0.85, now);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.08);

      // Harmonious fifth overtone
      osc2.frequency.setValueAtTime(baseFreq * 1.5, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.25 * this.volume, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration + 0.05);
      osc2.stop(now + duration + 0.05);

      // Light tactile buzz
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([15, 25, 20]);
        } catch {
          // ignore
        }
      }
    } catch {
      // Audio safety
    }
  }

  /**
   * Tension warning sound when moving near rupture velocity.
   * Gentle, soft harmonic friction tone.
   */
  public playTensionWarning(intensity: number) {
    if (this.isMuted) return;
    const nowMs = performance.now();
    if (nowMs - this.lastTensionTime < 180) return; // throttle
    this.lastTensionTime = nowMs;

    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      // Vibrating high tension pitch
      const freq = 650 + intensity * 350;
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq + 40, now + 0.12);

      const vol = Math.min(0.18, 0.05 + intensity * 0.12) * this.volume;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Audio safety
    }
  }

  /**
   * Soft water bloop when new bubble is born
   */
  public playSpawn() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';

      const start = 320 + Math.random() * 80;
      osc.frequency.setValueAtTime(start, now);
      osc.frequency.exponentialRampToValueAtTime(start * 1.8, now + 0.08);

      gain.gain.setValueAtTime(0.12 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // Audio safety
    }
  }

  /**
   * Milestone tier evolution celebration
   */
  public playTierUp(tier: number) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [329.63, 392.0, 493.88, 587.33, 659.25];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.001, now + idx * 0.07);
        gain.gain.linearRampToValueAtTime(0.2 * this.volume, now + idx * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.45);
      });
    } catch {
      // Audio safety
    }
  }

  /**
   * Harmonious letter success chime
   */
  public playLetterSuccess(index: number = 0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
      const freq = notes[index % notes.length];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.28 * this.volume, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.38);

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([20, 20]);
        } catch {}
      }
    } catch {}
  }

  /**
   * Wrong letter ingestion: playful gentle boing/buzz
   */
  public playWrongLetter() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.2);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);

      gain.gain.setValueAtTime(0.25 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.28);

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([60, 40, 60]);
        } catch {}
      }
    } catch {}
  }

  /**
   * Word victory triumphant celebration fanfare!
   */
  public playWordVictory() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // C major triumph: C5, E5, G5, C6 arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0.001, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.3 * this.volume, now + idx * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + (idx === notes.length - 1 ? 0.7 : 0.35));

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.75);
      });

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([30, 40, 30, 40, 80]);
        } catch {}
      }
    } catch {}
  }

  /**
   * Game Over sad chime
   */
  public playGameOver() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [293.66, 261.63, 220.0, 174.61];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);

        gain.gain.setValueAtTime(0.001, now + idx * 0.15);
        gain.gain.linearRampToValueAtTime(0.22 * this.volume, now + idx * 0.15 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.45);
      });
    } catch {}
  }

  /**
   * Magical chime when a burst coalesced bubble is reformed / recovered
   */
  public playBubbleRecovered() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Rising warm arpeggio: F4, A4, C5, F5
      const notes = [349.23, 440.0, 523.25, 698.46];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.001, now + idx * 0.07);
        gain.gain.linearRampToValueAtTime(0.24 * this.volume, now + idx * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.38);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.4);
      });
    } catch {}
  }

  /**
   * Generative ambient meditation drone (pure offline Web Audio)
   */
  public startAmbient() {
    if (this.isAmbientPlaying) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.001, now);
      if (!this.isMuted) {
        this.ambientGain.gain.linearRampToValueAtTime(0.06 * this.volume, now + 2.5);
      }
      this.ambientGain.connect(this.ctx.destination);

      // Low frequency warm pad notes: F#1 (46.25Hz), C#2 (69.3Hz), A#2 (116.5Hz)
      const freqs = [46.25, 69.3, 116.54, 138.59];
      this.ambientOscs = freqs.map((f, i) => {
        const osc = this.ctx!.createOscillator();
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, now);

        // Sub-filter for warmth
        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(260 + i * 40, now);

        osc.connect(filter);
        filter.connect(this.ambientGain!);
        osc.start(now);
        return osc;
      });

      this.isAmbientPlaying = true;
    } catch {
      // Audio safety
    }
  }

  public stopAmbient() {
    if (!this.isAmbientPlaying || !this.ctx || !this.ambientGain) return;
    try {
      const now = this.ctx.currentTime;
      this.ambientGain.gain.linearRampToValueAtTime(0.0001, now + 1.0);
      setTimeout(() => {
        this.ambientOscs.forEach(osc => {
          try {
            osc.stop();
            osc.disconnect();
          } catch {
            // ignore
          }
        });
        this.ambientOscs = [];
        this.isAmbientPlaying = false;
      }, 1050);
    } catch {
      this.isAmbientPlaying = false;
    }
  }

  public toggleAmbient(): boolean {
    if (this.isAmbientPlaying) {
      this.stopAmbient();
      return false;
    } else {
      this.startAmbient();
      return true;
    }
  }

  public getIsAmbientPlaying(): boolean {
    return this.isAmbientPlaying;
  }
}

export const sound = new SoundEngine();
