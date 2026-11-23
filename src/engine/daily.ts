/**
 * Reto diario: la misma partida para todo el mundo cada día. La fecha decide la semilla, los
 * rivales y su escudo; así el mercado y los dados salen igual para todos los que lo juegan.
 */
import { CrestDesign, LEAGUES, League, makeRand, randomClubName, randomCrest } from './identity';
import { GameState, createGame } from './engine';

export const DAILY = { jornadas: 4, clubs: 4 };
/** Primer reto (número 1). */
const FIRST_DAY = Date.UTC(2026, 10, 22);

/** Día en el calendario del dispositivo, como AAAA-MM-DD. */
export function dailyKey(date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Número del reto (el del 22 de noviembre de 2026 es el 1). */
export function dailyNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - FIRST_DAY) / 86400000) + 1;
}

/** Día anterior a una clave AAAA-MM-DD. */
export function previousDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dailyKey(new Date(y, m - 1, d - 1));
}

function seedOf(key: string): number {
  let h = 2166136261;
  for (const ch of `derbytactics-reto-${key}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h | 0;
}

/** La partida del reto de ese día, con tu club y tres rivales de la IA iguales para todos. */
/** La liga del reto: cambia cada día, la misma para todo el mundo. */
export const dailyLeague = (key: string): League => LEAGUES[(seedOf(key) >>> 0) % LEAGUES.length];

export function createDailyGame(key: string, me: { name: string; crest?: CrestDesign }): GameState {
  const seed = seedOf(key);
  const r = makeRand(seed ^ 0x2f6b9d);
  const taken = [me.name];
  const rivals = Array.from({ length: DAILY.clubs - 1 }, () => {
    const name = randomClubName(r, taken);
    taken.push(name);
    return { name, isBot: true, crest: randomCrest(r) };
  });
  return createGame({ players: [{ name: me.name, isBot: false, crest: me.crest }, ...rivals], seed, jornadas: DAILY.jornadas, daily: key, league: dailyLeague(key) });
}
