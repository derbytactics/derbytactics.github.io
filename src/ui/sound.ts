/**
 * Efectos de sonido sintetizados (sin archivos). Solo suenan donde hay Web Audio (navegador);
 * en la app nativa no hacen nada.
 */
import { load, save } from '../net/storage';

type Ctx = AudioContext;
let ctx: Ctx | null = null;
let muted: boolean | null = null;
const MUTE_KEY = 'futcards.mute';

export const isMuted = () => (muted ??= load<boolean>(MUTE_KEY) ?? false);
export function setMuted(value: boolean) {
  muted = value;
  save(MUTE_KEY, value);
}
/** Dónde hay sonido disponible (para enseñar o no el botón de silencio). */
export const soundAvailable = () => typeof (globalThis as { AudioContext?: unknown }).AudioContext === 'function';

function audio(): Ctx | null {
  if (isMuted() || !soundAvailable()) return null;
  try {
    ctx ??= new (globalThis as unknown as { AudioContext: new () => Ctx }).AudioContext();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12) {
  const c = audio();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export type Sfx = 'dice' | 'goal' | 'concede' | 'save' | 'stopped' | 'whistle' | 'card' | 'tap';

export function play(sfx: Sfx) {
  switch (sfx) {
    case 'dice':
      for (let i = 0; i < 7; i++) tone(180 + ((i * 53) % 140), i * 0.085, 0.05, 'square', 0.05);
      break;
    case 'goal':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.28, 'triangle', 0.14));
      break;
    case 'concede':
      [392, 330, 262].forEach((f, i) => tone(f, i * 0.14, 0.3, 'sawtooth', 0.07));
      break;
    case 'save':
      tone(196, 0, 0.12, 'square', 0.1);
      tone(294, 0.1, 0.22, 'triangle', 0.12);
      break;
    case 'stopped':
      tone(220, 0, 0.18, 'triangle', 0.08);
      break;
    case 'whistle':
      tone(2100, 0, 0.16, 'square', 0.05);
      tone(2300, 0.2, 0.3, 'square', 0.05);
      break;
    case 'card':
      [660, 880].forEach((f, i) => tone(f, i * 0.09, 0.2, 'sine', 0.1));
      break;
    case 'tap':
      tone(440, 0, 0.06, 'sine', 0.05);
      break;
  }
}
