/** Generador determinista (mulberry32). El estado es un entero serializable. */
export function nextRandom(seed: number): { value: number; seed: number } {
  const s = (seed + 0x6d2b79f5) | 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: s };
}
