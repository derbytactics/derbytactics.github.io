/**
 * Reto diario en este dispositivo: resultados guardados, racha de días seguidos, texto para
 * compartir y, con cuenta, envío al ranking del día.
 */
import { GameState, dailyKey, dailyNumber, previousDay, standings } from '../engine';
import { load, remove, save } from '../net/storage';
import { getAccount, rpc } from './api';

export interface DailyResult {
  day: string;
  number: number;
  position: number;
  clubs: number;
  points: number;
  goals: number;
  against: number;
  /** Ya enviado al ranking (o no hace falta). */
  submitted?: boolean;
}
export interface DailyRankingRow {
  username: string;
  points: number;
  goals: number;
  against: number;
  position: number;
}

const RESULTS_KEY = 'futcards.daily.results.v1';
/** Partida del reto a medias (aparte de la partida normal). */
export const DAILY_GAME_KEY = 'futcards.daily.game.v1';

export const dailyResults = () => load<Record<string, DailyResult>>(RESULTS_KEY) ?? {};
export const todayResult = () => dailyResults()[dailyKey()] ?? null;
export const savedDailyGame = () => {
  const g = load<GameState>(DAILY_GAME_KEY);
  return g && g.daily === dailyKey() && g.phase !== 'finished' ? g : null;
};
export const saveDailyGame = (g: GameState) => (g.phase === 'finished' ? remove(DAILY_GAME_KEY) : save(DAILY_GAME_KEY, g));

/** Días seguidos con el reto jugado, contando hoy o, si hoy aún no, hasta ayer. */
export function dailyStreak(today = dailyKey()): number {
  const all = dailyResults();
  let day = all[today] ? today : previousDay(today);
  let n = 0;
  while (all[day]) {
    n++;
    day = previousDay(day);
  }
  return n;
}

/** Apunta el resultado de un reto terminado (solo el primero de cada día) y lo envía al ranking. */
export function recordDaily(game: GameState): DailyResult | null {
  if (!game.daily || game.phase !== 'finished') return null;
  const all = dailyResults();
  if (!all[game.daily]) {
    const me = game.players[0];
    all[game.daily] = {
      day: game.daily,
      number: dailyNumber(game.daily),
      position: standings(game).findIndex((p) => p.id === me.id) + 1,
      clubs: game.players.length,
      points: me.points,
      goals: me.goals,
      against: me.against,
    };
    save(RESULTS_KEY, all);
  }
  void submitPending();
  return all[game.daily];
}

/** Envía al ranking los resultados que aún no estén (al terminar o al entrar con la cuenta). */
export async function submitPending(): Promise<void> {
  if (!getAccount().session) return;
  const all = dailyResults();
  for (const r of Object.values(all)) {
    if (r.submitted) continue;
    try {
      await rpc('submit_daily', { p_day: r.day, p_points: r.points, p_goals: r.goals, p_against: r.against, p_position: r.position });
      r.submitted = true;
    } catch (e) {
      // Un reto antiguo ya no admite resultados: no se reintenta.
      if (/ya no admite/.test((e as Error).message)) r.submitted = true;
    }
  }
  save(RESULTS_KEY, all);
}

export const dailyRanking = (day: string) => rpc<DailyRankingRow[]>('daily_ranking', { p_day: day }, false);

const MEDAL = ['🥇', '🥈', '🥉'];
/** Texto para compartir, al estilo de los retos diarios. */
export function shareText(r: DailyResult, streak: number, url?: string): string {
  const last = r.position === r.clubs;
  // El titular cambia con el resultado: presumir si ganas, picar si quedas cerca, reírse si pierdes.
  const head =
    r.position === 1
      ? `🏆 ¡He ganado el reto diario #${r.number} de DerbyTactics!`
      : last
        ? `😅 Hoy el reto diario #${r.number} de DerbyTactics me ha ganado a mí (${r.position}.º de ${r.clubs})`
        : `${MEDAL[r.position - 1] ?? '⚽'} ${r.position}.º de ${r.clubs} en el reto diario #${r.number} de DerbyTactics`;
  const goals = `⚽ ${r.goals} ${r.goals === 1 ? 'gol marcado' : 'goles marcados'} y ${r.against} ${r.against === 1 ? 'encajado' : 'encajados'} · ${r.points} puntos`;
  return [
    head,
    goals,
    streak > 1 ? `🔥 Llevo ${streak} días seguidos` : null,
    '',
    r.position === 1 ? '¿Me igualas? Hoy todo el mundo juega el mismo partido 👇' : '¿Me superas? Hoy todo el mundo juega el mismo partido 👇',
    url ?? null,
  ]
    .filter((x) => x !== null)
    .join('\n');
}
