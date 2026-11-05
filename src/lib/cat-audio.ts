import { CatSoundCategory } from '../types/domain';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Plays one of the 3 Cat Companion sound categories (Meow, Purr, Trill)
   * using procedural Web Audio synthesis for zero-latency tactile feedback.
   */
  public playCatSound(category: CatSoundCategory, variantPitch = 1.0) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (category === CatSoundCategory.MEOW) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';

      const baseFreq = 460 * variantPitch;
      osc.frequency.setValueAtTime(baseFreq * 0.85, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, now + 0.09);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.72, now + 0.28);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.11, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    } else if (category === CatSoundCategory.TRILL) {
      // Rapid rising melodic chirp
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';

      const baseFreq = 540 * variantPitch;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.setValueAtTime(baseFreq * 1.18, now + 0.04);
      osc.frequency.setValueAtTime(baseFreq * 1.35, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, now + 0.18);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (category === CatSoundCategory.PURR) {
      // Warm low-frequency purr envelope
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110 * variantPitch, now);
      osc.frequency.linearRampToValueAtTime(135 * variantPitch, now + 0.18);
      osc.frequency.linearRampToValueAtTime(105 * variantPitch, now + 0.35);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    }
  }

  /**
   * Plays a metallic gold coin clink for the Welcome Calendar Slot-Flip and Wealth Stat particle impacts.
   */
  public playCoinClink(pitchMultiplier = 1.0) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = [1318.5 * pitchMultiplier, 2637 * pitchMultiplier];

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.035);
      gain.gain.setValueAtTime(0.001, now + idx * 0.035);
      gain.gain.linearRampToValueAtTime(0.08 / (idx + 1), now + idx * 0.035 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + idx * 0.035 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.035);
      osc.stop(now + idx * 0.035 + 0.27);
    });
  }
}

export const soundEngine = new SoundEngine();
