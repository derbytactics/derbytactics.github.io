/// <reference types="node" />
/**
 * Genera los WAV de la app nativa (assets/sfx) a partir de la tabla de `src/ui/sfx.ts`,
 * con la misma envolvente que la versión web. Uso: npm run sounds
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { SFX, SFX_NAMES, Tone } from '../src/ui/sfx';

const RATE = 22050;

const wave = (kind: Tone[3], phase: number) => {
  const x = phase % 1;
  if (kind === 'sine') return Math.sin(2 * Math.PI * x);
  if (kind === 'square') return x < 0.5 ? 1 : -1;
  if (kind === 'triangle') return 1 - 4 * Math.abs(x - 0.5);
  return 2 * x - 1; // sawtooth
};

/** Envolvente exponencial: 0.0001 → volumen en 20 ms → 0.0001 al final, como en Web Audio. */
function envelope(t: number, dur: number, gain: number): number {
  const lo = 0.0001;
  if (t < 0 || t > dur) return 0;
  if (t < 0.02) return lo * Math.pow(gain / lo, t / 0.02);
  return gain * Math.pow(lo / gain, (t - 0.02) / (dur - 0.02));
}

export function render(tones: Tone[]): Buffer {
  const end = Math.max(...tones.map(([, start, dur]) => start + dur)) + 0.03;
  const n = Math.ceil(end * RATE);
  const pcm = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let v = 0;
    for (const [freq, start, dur, kind, gain] of tones) v += envelope(t - start, dur, gain) * wave(kind, (t - start) * freq);
    pcm[i] = Math.max(-32767, Math.min(32767, Math.round(v * 2.5 * 32767)));
  }
  const data = Buffer.from(pcm.buffer);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

if (process.argv[1]?.endsWith('sounds.ts')) {
  mkdirSync('assets/sfx', { recursive: true });
  for (const name of SFX_NAMES) writeFileSync(`assets/sfx/${name}.wav`, render(SFX[name]));
  console.log(`Generados ${SFX_NAMES.length} sonidos en assets/sfx`);
}
