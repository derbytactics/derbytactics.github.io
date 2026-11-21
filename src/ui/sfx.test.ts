import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render } from '../../scripts/sounds';
import { SFX, SFX_NAMES } from './sfx';

describe('sonidos de la app nativa', () => {
  it('los WAV de assets/sfx están al día con la tabla de tonos (si no, ejecuta npm run sounds)', () => {
    for (const name of SFX_NAMES) {
      const file = readFileSync(new URL(`../../assets/sfx/${name}.wav`, import.meta.url));
      expect(file.equals(render(SFX[name])), name).toBe(true);
    }
  });
});
