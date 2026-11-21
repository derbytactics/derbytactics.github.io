/**
 * Sonido en la web: los tonos de `sfx.ts` sintetizados con Web Audio (sin archivos).
 * En la app nativa se usa `sound.native.ts`.
 */
import { SFX, Sfx, Tone, isMuted } from './sfx';

export { isMuted, setMuted } from './sfx';
export type { Sfx } from './sfx';

let ctx: AudioContext | null = null;

/** Dónde hay sonido disponible (para enseñar o no el botón de silencio). */
export const soundAvailable = () => typeof (globalThis as { AudioContext?: unknown }).AudioContext === 'function';

function audio(): AudioContext | null {
  if (isMuted() || !soundAvailable()) return null;
  try {
    ctx ??= new (globalThis as unknown as { AudioContext: new () => AudioContext }).AudioContext();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

function tone(c: AudioContext, [freq, start, dur, wave, gain]: Tone) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = wave;
  o.frequency.value = freq;
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function play(sfx: Sfx) {
  const c = audio();
  if (c) for (const t of SFX[sfx]) tone(c, t);
}
