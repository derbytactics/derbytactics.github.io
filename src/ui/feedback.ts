/** Sonido y vibración juntos: cada momento del juego se oye (si no está silenciado) y se siente. */
import { hapticFor } from './haptics';
import { play, type Sfx } from './sound';

export function cue(sfx: Sfx) {
  play(sfx);
  hapticFor(sfx);
}
