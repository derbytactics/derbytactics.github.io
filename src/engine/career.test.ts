import { describe, expect, it } from 'vitest';
import { CAREER, DIVISIONS, careerBudget, careerRivals, createCareerSeason, finishCareerSeason, newCareer } from './career';
import { GameState, apply, standings } from './engine';
import { botAction, styleOf } from './bots';

/** Juega una temporada entera con la IA (también en tu club). */
function playSeason(g: GameState): GameState {
  g.players[0].isBot = true;
  for (let i = 0; i < 20000 && g.phase !== 'finished'; i++) {
    if (g.phase === 'market') g = apply(g, botAction(g, styleOf(g, g.turnOrder[g.turnIndex])));
    else if (g.phase === 'match') g = apply(g, { type: 'playMatch' });
    else if (g.phase === 'summary') g = apply(g, { type: 'nextJornada' });
  }
  return g;
}
/** Fuerza tu puesto final cambiando los puntos. */
function withPosition(g: GameState, pos: number): GameState {
  const c = structuredClone(g);
  const order = standings(c).map((p) => p.id).filter((id) => id !== 0);
  order.splice(pos - 1, 0, 0);
  order.forEach((id, i) => (c.players[id].points = 100 - i * 10));
  return c;
}

describe('modo carrera', () => {
  const start = newCareer({ name: 'Real Ribera' }, 77);
  it('empieza en Tercera, con rivales fijos para la carrera y con su estilo', () => {
    expect(start.division).toBe(0);
    expect(careerRivals(start).map((r) => r.name)).toEqual(careerRivals(start).map((r) => r.name));
    expect(new Set(careerRivals(start).map((r) => r.style)).size).toBe(CAREER.clubs - 1);
    const g = createCareerSeason(start);
    expect(g.totalJornadas).toBe(CAREER.jornadas);
    expect(g.players).toHaveLength(CAREER.clubs);
    expect(g.players[0].money).toBe(careerBudget(start));
    expect(g.players.slice(1).every((p) => p.squad.length === DIVISIONS[0].squad)).toBe(true);
    expect(g.career).toEqual({ division: 0, season: 1 });
  });
  it('tu plantilla, sus nombres y tu estadio pasan a la temporada siguiente', () => {
    const g = playSeason(createCareerSeason(start));
    const next = finishCareerSeason(start, g);
    expect(next.season).toBe(2);
    expect(next.squad.map((e) => e.cardId)).toEqual(g.players[0].squad.map((e) => e.cardId));
    expect(next.stadium).toBe(g.players[0].stadium);
    expect(next.money).toBe(Math.floor(g.players[0].money * CAREER.carryShare));
    const g2 = createCareerSeason(next);
    for (const e of next.squad) expect(g2.roster![e.cardId]).toEqual(g.roster![e.cardId]);
    expect(g2.players[0].squad.map((e) => e.cardId)).toEqual(next.squad.map((e) => e.cardId));
    // Tus futbolistas no salen en el mercado ni en el mazo, ni los tienen los rivales.
    const mine = new Set(next.squad.map((e) => e.cardId));
    expect([...g2.market, ...g2.footballDeck, ...g2.players.slice(1).flatMap((p) => p.squad.map((e) => e.cardId))].some((id) => mine.has(id))).toBe(false);
  });
  it('el campeón sube, el último baja (salvo en Tercera) y en la Liga de Campeones se gana el título', () => {
    const g = playSeason(createCareerSeason(start));
    expect(finishCareerSeason(start, withPosition(g, 1)).division).toBe(1);
    expect(finishCareerSeason(start, withPosition(g, CAREER.clubs)).division).toBe(0);
    const second = { ...start, division: 1 };
    const g2 = playSeason(createCareerSeason(second));
    expect(finishCareerSeason(second, withPosition(g2, CAREER.clubs)).division).toBe(0);
    expect(finishCareerSeason(second, withPosition(g2, 2)).history.at(-1)!.outcome).toBe('permanencia');
    const top = { ...start, division: DIVISIONS.length - 1 };
    const won = finishCareerSeason(top, withPosition(playSeason(createCareerSeason(top)), 1));
    expect(won.division).toBe(DIVISIONS.length - 1);
    expect(won.titles).toBe(1);
    expect(won.history.at(-1)!.outcome).toBe('campeon');
  });
  it('no se puede cerrar dos veces la misma temporada', () => {
    const g = playSeason(createCareerSeason(start));
    const next = finishCareerSeason(start, g);
    expect(finishCareerSeason(next, g)).toBe(next);
  });
});
