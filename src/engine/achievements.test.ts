import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, albumAchievements, jornadaAchievements } from './achievements';
import { FOOTBALLERS } from './cards';
import { GameState, MatchReport, MatchResult, createGame } from './engine';

const game = () => createGame({ seed: 7, players: [{ name: 'Ana FC', isBot: false }, { name: 'B', isBot: true }, { name: 'C', isBot: true }, { name: 'D', isBot: true }] });
const result = (playerId: number, r: Partial<MatchResult>): MatchResult =>
  ({ playerId, goals: 0, against: 0, diff: 0, scoringPlays: 0, saves: 0, saveBonus: 0, keeperCard: null, rank: 1, points: 0, prize: 0, ticket: 0, ...r }) as MatchResult;
const withMatch = (g: GameState, m: Partial<MatchReport>): GameState => ({ ...g, lastMatch: { jornada: 1, rolls: [], rollers: [], results: [], ...m } });

describe('logros', () => {
  it('los identificadores no se repiten', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
  it('sin jornada jugada no hay logros', () => {
    expect(jornadaAchievements(game(), 0)).toEqual([]);
  });
  it('de jornada: gol, goleada, muro y paradas', () => {
    const g = withMatch(game(), { results: [result(0, { goals: 5, against: 0, diff: 5, saves: 3 })] });
    expect(jornadaAchievements(g, 0).sort()).toEqual(['goleada', 'muro', 'paradon', 'primerGol'].sort());
  });
  it('giros, penaltis y expulsiones propias (no las de otros ni las anuladas)', () => {
    const g = withMatch(game(), {
      rolls: [{ dice: [3, 3], sum: 6, plays: [], varDraws: [], twists: [{ kind: 'salvada', playerId: 0, attacker: 1, rival: 0 }, { kind: 'cantada', playerId: 2, attacker: 2, rival: 0 }] }],
      penalties: [{ playerId: 0, rival: 1 }],
      events: [{ beforeRoll: 0, playerId: 0, cardId: 'roja-1', targetPlayerId: 1, blocked: true }],
      results: [result(0, { against: 1 })],
    });
    expect(jornadaAchievements(g, 0).sort()).toEqual(['penalti', 'salvada']);
    g.lastMatch!.events = [{ beforeRoll: 0, playerId: 0, cardId: 'amarilla-1', targetPlayerId: 1, secondYellow: true }];
    expect(jornadaAchievements(g, 0)).toContain('roja');
  });
  it('los bots no consiguen logros', () => {
    const g = withMatch(game(), { results: [result(1, { goals: 3 })] });
    expect(jornadaAchievements(g, 1)).toEqual([]);
  });
  it('de club: cláusula, estadio y caja', () => {
    const g = game();
    Object.assign(g.players[0], { clauses: 1, stadium: 5, money: 150 });
    expect(jornadaAchievements(g, 0).sort()).toEqual(['clausula', 'estadio', 'millonario']);
  });
  it('campeón, sin portero y con cerrojo de 4 defensas', () => {
    const g = game();
    g.phase = 'finished';
    g.players[0].points = 30;
    const defs = FOOTBALLERS.filter((f) => f.position === 'DEF').slice(0, 4);
    g.players[0].squad = defs.map((f) => ({ cardId: f.id, shielded: false, noClauseUntil: 0, streakUntil: 0, outUntil: 0, extra: null }));
    expect(jornadaAchievements(g, 0).sort()).toEqual(['campeon', 'cerrojo', 'sinPortero']);
    g.players[1].points = 40;
    expect(jornadaAchievements(g, 0)).toEqual([]);
  });
  it('álbum por tramos', () => {
    expect(albumAchievements(24)).toEqual([]);
    expect(albumAchievements(50)).toEqual(['album25', 'album50']);
    expect(albumAchievements(FOOTBALLERS.length)).toContain('albumCompleto');
  });
});
