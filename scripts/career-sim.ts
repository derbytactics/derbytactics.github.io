/**
 * Simula carreras completas con la IA llevando tu club, para ver si subir de división
 * es razonable. Uso: npx tsx scripts/career-sim.ts [carreras] [temporadas]
 */
import { DIVISIONS, GameState, apply, botAction, createCareerSeason, finishCareerSeason, newCareer, styleOf } from '../src/engine';

const careers = Number(process.argv[2] ?? 200);
const seasons = Number(process.argv[3] ?? 12);
const reached = new Array(DIVISIONS.length).fill(0);
const promoted = new Array(DIVISIONS.length).fill(0);
const played = new Array(DIVISIONS.length).fill(0);
const relegated = new Array(DIVISIONS.length).fill(0);
let titles = 0;
let squadSizes = 0;
let squadCount = 0;

for (let k = 0; k < careers; k++) {
  let c = newCareer({ name: 'Mi club' }, 1000 + k);
  let best = 0;
  for (let s = 0; s < seasons; s++) {
    let g: GameState = createCareerSeason(c);
    g.players[0].isBot = true;
    g.players[0].style = 'equilibrado';
    for (let i = 0; i < 20000 && g.phase !== 'finished'; i++) {
      if (g.phase === 'market') g = apply(g, botAction(g, styleOf(g, g.turnOrder[g.turnIndex])));
      else if (g.phase === 'match') g = apply(g, { type: 'playMatch' });
      else if (g.phase === 'summary') g = apply(g, { type: 'nextJornada' });
      else break;
    }
    played[c.division]++;
    squadSizes += c.squad.length;
    squadCount++;
    c = finishCareerSeason(c, g);
    const last = c.history[c.history.length - 1];
    if (last.outcome === 'ascenso') promoted[last.division]++;
    if (last.outcome === 'descenso') relegated[last.division]++;
    best = Math.max(best, c.division);
  }
  reached[best]++;
  titles += c.titles;
}
console.log(`${careers} carreras de ${seasons} temporadas, tu club con la IA (equilibrado):`);
DIVISIONS.forEach((d, i) => {
  console.log(`  ${d.name}: temporadas ${played[i]} · asciende ${played[i] ? Math.round((100 * promoted[i]) / played[i]) : 0}% · desciende ${played[i] ? Math.round((100 * relegated[i]) / played[i]) : 0}% · máximo alcanzado ${Math.round((100 * reached[i]) / careers)}%`);
});
console.log(`  títulos por carrera: ${(titles / careers).toFixed(2)} · plantilla media al empezar temporada: ${(squadSizes / squadCount).toFixed(1)}`);
