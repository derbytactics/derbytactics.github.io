/**
 * Efectos de sonido: la tabla de tonos y el silencio, comunes a la web y a la app nativa.
 * En la web se sintetizan al vuelo (`sound.ts`); en la app nativa se reproducen los WAV de
 * `assets/sfx`, generados a partir de esta misma tabla con `npm run sounds`.
 */
import { load, save } from '../net/storage';

export type Sfx = 'dice' | 'goal' | 'concede' | 'save' | 'stopped' | 'whistle' | 'card' | 'tap';
export const SFX_NAMES: Sfx[] = ['dice', 'goal', 'concede', 'save', 'stopped', 'whistle', 'card', 'tap'];

export type Wave = 'sine' | 'square' | 'triangle' | 'sawtooth';
/** Un tono: frecuencia (Hz), inicio y duración (s), forma de onda y volumen. */
export type Tone = [freq: number, start: number, dur: number, wave: Wave, gain: number];

export const SFX: Record<Sfx, Tone[]> = {
  dice: Array.from({ length: 7 }, (_, i): Tone => [180 + ((i * 53) % 140), i * 0.085, 0.05, 'square', 0.05]),
  goal: [523, 659, 784, 1047].map((f, i): Tone => [f, i * 0.11, 0.28, 'triangle', 0.14]),
  concede: [392, 330, 262].map((f, i): Tone => [f, i * 0.14, 0.3, 'sawtooth', 0.07]),
  save: [
    [196, 0, 0.12, 'square', 0.1],
    [294, 0.1, 0.22, 'triangle', 0.12],
  ],
  stopped: [[220, 0, 0.18, 'triangle', 0.08]],
  whistle: [
    [2100, 0, 0.16, 'square', 0.05],
    [2300, 0.2, 0.3, 'square', 0.05],
  ],
  card: [660, 880].map((f, i): Tone => [f, i * 0.09, 0.2, 'sine', 0.1]),
  tap: [[440, 0, 0.06, 'sine', 0.05]],
};

let muted: boolean | null = null;
const MUTE_KEY = 'futcards.mute';
export const isMuted = () => (muted ??= load<boolean>(MUTE_KEY) ?? false);
export function setMuted(value: boolean) {
  muted = value;
  save(MUTE_KEY, value);
}
