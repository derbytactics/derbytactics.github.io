import { League } from '../engine';

/**
 * Liga de la partida que se está jugando en este dispositivo (la pone GameView mientras está en
 * pantalla), para que las reglas, abiertas desde cualquier sitio, hablen como la liga.
 */
let current: League | undefined;
export const setCurrentLeague = (l: League | undefined) => {
  current = l;
};
export const currentLeague = () => current;
