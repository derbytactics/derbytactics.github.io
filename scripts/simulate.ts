/**
 * Simulador de equilibrio: juega miles de partidas entre bots y resume
 * las métricas que usamos para afinar src/engine/config.ts.
 *
 *   npm run simulate            (2000 partidas por tamaño de mesa)
 *   npm run simulate -- 500 estandar
 */
import { SIM_STYLES, BotStyle, CONFIG, GameState, SeasonLength, apply, botAction, createGame, lineup, standings } from '../src/engine';

const BOT_STYLES = (process.env.FUT_STYLES ? (process.env.FUT_STYLES.split(',') as BotStyle[]) : SIM_STYLES);

// Permite probar variantes sin tocar el código: FUT_OVERRIDES='{"prize":{"first":8}}' npm run simulate
function merge(target: any, patch: any) {
  for (const k of Object.keys(patch)) {
    if (patch[k] && typeof patch[k] === 'object' && !Array.isArray(patch[k])) merge(target[k], patch[k]);
    else target[k] = patch[k];
  }
}
if (process.env.FUT_OVERRIDES) merge(CONFIG, JSON.parse(process.env.FUT_OVERRIDES));
const sizes = (process.env.FUT_SIZES ?? '2,3,4,6,8').split(',').map(Number);

const games = Number(process.argv[2] ?? 2000);
const season = (process.argv[3] ?? 'estandar') as SeasonLength;

function playGame(n: number, seed: number) {
  const styles: BotStyle[] = Array.from({ length: n }, (_, i) => BOT_STYLES[(seed + i) % BOT_STYLES.length]);
  let s: GameState = createGame({ players: styles.map((st, i) => ({ name: `${st}-${i}`, isBot: true })), season, seed });
  const firstPick = s.turnOrder[0];
  let earlyLeader = -1;
  let clauses = 0;
  let cards = 0;
  let steps = 0;
  let plays = 0, stopped = 0, scored = 0;
  while (s.phase !== 'finished') {
    if (++steps > 20000) throw new Error('Partida sin fin');
    const cur = s.phase === 'market' ? s.turnOrder[s.turnIndex] : 0;
    const a = botAction(s, styles[cur]);
    if (a.type === 'clause') clauses++;
    if (a.type === 'playCard') cards++;
    s = apply(s, a);
    if (a.type === 'playMatch') {
      for (const r of s.lastMatch!.rolls) for (const pl of r.plays) { plays++; stopped += pl.stopped.length; scored += pl.scored.length; }
    }
    if (s.phase === 'summary' && s.jornada === Math.ceil(s.totalJornadas / 3)) earlyLeader = standings(s)[0].id;
  }
  const table = standings(s);
  return { s, styles, table, firstPick, earlyLeader, clauses, cards, plays, stopped, scored };
}

const fmt = (x: number, d = 1) => x.toFixed(d);

for (const n of sizes) {
  const wins: Record<string, number> = {};
  const seats: Record<string, number> = {};
  let firstPickWins = 0, earlyLeaderWins = 0, clauses = 0, cards = 0;
  let goals = 0, money = 0, stadium = 0, gap = 0, lastShare = 0, plays = 0, stopped = 0, scored = 0, squad = 0, keepers = 0;
  for (let g = 0; g < games; g++) {
    const r = playGame(n, g * 7919 + n);
    const champ = r.table[0];
    wins[r.styles[champ.id]] = (wins[r.styles[champ.id]] ?? 0) + 1;
    r.styles.forEach((st) => (seats[st] = (seats[st] ?? 0) + 1));
    if (champ.id === r.firstPick) firstPickWins++;
    if (champ.id === r.earlyLeader) earlyLeaderWins++;
    clauses += r.clauses;
    cards += r.cards;
    plays += r.plays; stopped += r.stopped; scored += r.scored;
    for (const p of r.s.players) {
      squad += p.squad.length / n;
      keepers += lineup(p).POR / n;
      goals += p.goals / r.s.totalJornadas / n;
      money += p.money / n;
      stadium += p.stadium / n;
    }
    gap += (champ.points - r.table[n - 1].points) / champ.points;
    lastShare += r.table[n - 1].points / champ.points;
  }
  console.log(`\n=== ${n} jugadores · ${games} partidas · temporada ${season} (${CONFIG.seasonLengths[season]} jornadas) ===`);
  console.log(
    'Victorias por estilo (ratio sobre lo esperado, 1.00 = equilibrado): ' +
      BOT_STYLES.map((st) => `${st} ${fmt(((wins[st] ?? 0) / games) / ((seats[st] ?? 1) / (games * n)), 2)}`).join(' · '),
  );
  console.log(`Gana quien eligió primero en pretemporada: ${fmt((100 * firstPickWins) / games)}% (justo: ${fmt(100 / n)}%)`);
  console.log(`Gana el líder del primer tercio: ${fmt((100 * earlyLeaderWins) / games)}%`);
  console.log(`Puntos del colista respecto al campeón: ${fmt((100 * lastShare) / games)}%`);
  console.log(`Goles a favor por club y jornada: ${fmt(goals / games, 2)} · estadio final medio: ${fmt(stadium / games, 2)} · caja final media: ${fmt(money / games)}M`);
  console.log(`Jugadas paradas: ${fmt((100 * stopped) / (stopped + scored))}% · jugadas de ataque por club y jornada: ${fmt(plays / games / n / CONFIG.seasonLengths[season], 2)} · plantilla final: ${fmt(squad / games, 1)} · con portero: ${fmt((100 * keepers) / games)}%`);
  console.log(`Cláusulas por partida: ${fmt(clauses / games, 2)} · cartas especiales jugadas: ${fmt(cards / games, 1)}`);
}
