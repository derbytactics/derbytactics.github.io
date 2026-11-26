/**
 * Dificultad de la IA: un club de referencia (táctica equilibrada, nivel normal) juega contra la
 * IA en cada nivel. Con un nivel justo ganaría 1 de cada N ligas (N = clubes).
 *   npx tsx scripts/difficulty-sim.ts [partidas]
 */
import { BOT_STYLES, GameState, LEVELS, apply, botAction, createGame, standings, styleOf } from '../src/engine';

const games = Number(process.argv[2] ?? 300);
for (const n of [2, 4, 6]) {
  const row: string[] = [];
  for (const level of LEVELS) {
    let wins = 0;
    let pos = 0;
    for (let g = 0; g < games; g++) {
      let s: GameState = createGame({
        seed: g * 7919 + n * 31,
        season: 'estandar',
        level,
        players: Array.from({ length: n }, (_, i) => ({ name: `C${i}`, isBot: true, style: i === 0 ? 'equilibrado' : BOT_STYLES[(g + i) % BOT_STYLES.length] })),
      });
      // El club 0 es la referencia: siempre en nivel normal.
      delete s.players[0].level;
      for (let k = 0; k < 30000 && s.phase !== 'finished'; k++) {
        const cur = s.phase === 'market' ? s.turnOrder[s.turnIndex] : 0;
        s = apply(s, botAction(s, styleOf(s, cur)));
      }
      const table = standings(s);
      if (table[0].id === 0) wins++;
      pos += table.findIndex((p) => p.id === 0) + 1;
    }
    row.push(`${level}: gana ${((100 * wins) / games).toFixed(0)}% · puesto medio ${(pos / games).toFixed(2)}`);
  }
  console.log(`${n} clubes (justo: ${(100 / n).toFixed(0)}%) → ${row.join(' | ')}`);
}
