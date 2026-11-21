import { describe, expect, it } from 'vitest';
import { clubPalette } from './palette';

const crest = (primary: string, secondary: string) => ({ shape: 0, pattern: 0, emblem: 0, primary, secondary });

describe('color de cada club', () => {
  it('sale del escudo', () => {
    expect(clubPalette([crest('#C8102E', '#F4F1E8'), crest('#1C6DD0', '#F4F1E8')])).toEqual(['#C8102E', '#1C6DD0']);
  });
  it('si el escudo es negro o blanco usa el otro color', () => {
    expect(clubPalette([crest('#111418', '#F2B705')])[0]).toBe('#F2B705');
  });
  it('dos clubes no comparten color', () => {
    const [a, b] = clubPalette([crest('#C8102E', '#F4F1E8'), crest('#C8102E', '#1E7B3A')]);
    expect(a).toBe('#C8102E');
    expect(b).toBe('#1E7B3A');
  });
  it('los colores muy oscuros se aclaran para verse sobre el fondo', () => {
    const [navy] = clubPalette([crest('#0B2A5B', '#111418')]);
    expect(navy).not.toBe('#0B2A5B');
  });
  it('sin escudo, el color de siempre', () => {
    expect(clubPalette([undefined, undefined])).toEqual(['#E5484D', '#3E8BFF']);
  });
});
