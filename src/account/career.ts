/** Modo carrera en este dispositivo: la carrera y la temporada a medias se guardan aparte. */
import { CareerState, CrestDesign, GameState, finishCareerSeason, newCareer } from '../engine';
import { load, remove, save } from '../net/storage';

const KEY = 'futcards.career.v1';

interface Saved {
  career: CareerState;
  /** Temporada en curso (o terminada y aún sin cerrar). */
  game: GameState | null;
}

export const loadCareer = (): Saved | null => load<Saved>(KEY);

export function startCareer(club: { name: string; crest?: CrestDesign }): CareerState {
  const career = newCareer(club);
  save(KEY, { career, game: null });
  return career;
}

/** Guarda la temporada tal como va. */
export function saveCareerGame(game: GameState) {
  const s = loadCareer();
  if (!s || !game.career || game.career.season !== s.career.season) return;
  save(KEY, { ...s, game });
}

/** Cierra la temporada terminada (una sola vez) y devuelve la carrera ya actualizada. */
export function closeCareerSeason(game: GameState): CareerState | null {
  const s = loadCareer();
  if (!s) return null;
  if (game.career && game.career.season === s.career.season && game.phase === 'finished') {
    const career = finishCareerSeason(s.career, game);
    save(KEY, { career, game: null });
    return career;
  }
  return s.career;
}

export const abandonCareer = () => remove(KEY);
