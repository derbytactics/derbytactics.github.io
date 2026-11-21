/**
 * Sonido en la app nativa: los WAV de `assets/sfx`, generados desde la tabla de `sfx.ts`
 * (`npm run sounds`). Se mezclan con la música del usuario y respetan el modo silencio del iPhone.
 */
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Sfx, isMuted } from './sfx';

export { isMuted, setMuted } from './sfx';
export type { Sfx } from './sfx';

const FILES: Record<Sfx, number> = {
  dice: require('../../assets/sfx/dice.wav'),
  goal: require('../../assets/sfx/goal.wav'),
  concede: require('../../assets/sfx/concede.wav'),
  save: require('../../assets/sfx/save.wav'),
  stopped: require('../../assets/sfx/stopped.wav'),
  whistle: require('../../assets/sfx/whistle.wav'),
  card: require('../../assets/sfx/card.wav'),
  tap: require('../../assets/sfx/tap.wav'),
};

const players: Partial<Record<Sfx, AudioPlayer>> = {};
let configured = false;

export const soundAvailable = () => true;

export function play(sfx: Sfx) {
  if (isMuted()) return;
  try {
    if (!configured) {
      configured = true;
      setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    }
    const p = (players[sfx] ??= createAudioPlayer(FILES[sfx]));
    p.seekTo(0);
    p.play();
  } catch {
    // Sin sonido no pasa nada: el juego sigue.
  }
}
