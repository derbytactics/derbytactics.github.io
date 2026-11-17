/**
 * Crónica de cada tirada, contada desde el punto de vista de un club (o neutral).
 * Devuelve las noticias en el orden en que deben aparecer, una a una.
 */
import { GameState, Play, RollReport, activeNumbers, footballer, isOut } from '../engine';

export type NewsKind = 'attack' | 'goal' | 'stopped' | 'counterAgainst' | 'concede' | 'save' | 'counterFor' | 'info' | 'var' | 'card';

export interface News {
  kind: NewsKind;
  title: string;
  text: string;
  /** Futbolistas que protagonizan la noticia (para dibujar sus retratos). */
  cards?: string[];
  /** Club al que pertenecen esos futbolistas. */
  club?: number;
  /** Carta especial robada (solo se enseña a quien la roba). */
  specialCardId?: string;
}

const list = (names: string[]) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`);

/** Elección estable: la misma tirada se cuenta siempre igual, aunque se vuelva a pintar. */
function picker(seed: number) {
  let k = seed * 7919 + 13;
  return <T,>(options: T[]): T => {
    k = (Math.imul(k ^ (k >>> 15), 2246822519) + 374761393) | 0;
    return options[Math.abs(k) % options.length];
  };
}

const SHOT = ['remata de primeras', 'se planta ante el portero y dispara', 'engancha una volea', 'cabecea al segundo palo', 'define con la zurda', 'chuta raso y cruzado', 'fusila desde el punto de penalti'];
const LONG_SHOT = ['arma la pierna desde la frontal', 'prueba suerte desde fuera del área', 'se saca un zapatazo lejano', 'dispara desde treinta metros'];
const PASS = ['filtra un pase espectacular', 'pone un centro medido', 'se inventa una asistencia de tacón', 'rompe líneas con un pase al hueco', 'cuelga un balón perfecto al área', 'da el pase de la muerte'];
const WALL = ['tiran una pared en el área', 'combinan al primer toque', 'se asocian en la frontal'];
const GOAL_TITLE = ['¡GOOOL!', '¡Golazo!', '¡A la red!', '¡Gol!'];
const BEAT = ['Bates a', 'Superas a', 'La mandas a la red de', 'Perforas la portería de'];
const KEEPER_SAVE = ['vuela y la saca con la manopla', 'detiene abajo, muy seguro', 'despeja a córner con una mano salvadora', 'adivina el lado y la atrapa', 'saca un pie milagroso'];
const DEF_STOP = ['se anticipa y corta el pase', 'roba la pelota con un cruce perfecto', 'mete la pierna y despeja', 'gana el duelo y recupera', 'tapa el disparo con el cuerpo'];
const COUNTER = ['recupera y lanza la contra', 'roba y sale como un rayo', 'corta y monta el contragolpe', 'se la quita y conduce hasta el área'];
const CONCEDE_TITLE = ['Gol en contra', 'Te marcan', 'Encajas'];
const RESTART = ['Sacas de centro y te lanzas al ataque.', 'No hay tiempo para lamentarse: balón al centro y arriba.', 'Respondes nada más sacar de centro.'];
const NOTHING = [
  (n: number) => `Nadie ataca con el ${n}. El balón se pierde por la banda.`,
  (n: number) => `Con el ${n} no hay jugada: partido trabado en el centro del campo.`,
  (n: number) => `El ${n} no le sirve a nadie. Saque de puerta.`,
];
const VAR = ['El árbitro se lleva la mano al pinganillo: revisión del VAR. No hay jugada.', 'Parón por el VAR. Nadie ataca en esta tirada.', 'El VAR detiene el partido. Esta tirada no cuenta.'];

/** Describe cómo se arma una jugada de ataque según quién participa. */
function buildUp(play: Play, pick: ReturnType<typeof picker>): { title: string; text: string } {
  const mids = play.cards.filter((id) => footballer(id).position === 'MED').map((id) => footballer(id).name);
  const fwds = play.cards.filter((id) => footballer(id).position === 'DEL').map((id) => footballer(id).name);
  if (fwds.length === 0) return { title: 'Disparo lejano', text: `${list(mids)} ${pick(LONG_SHOT)}.` };
  if (mids.length > 0) return { title: 'Jugada combinada', text: `${list(mids)} ${pick(PASS)} y ${list(fwds)} ${pick(SHOT)}.` };
  if (fwds.length > 1) return { title: 'Jugada en el área', text: `${list(fwds)} ${pick(WALL)} y rematan a puerta.` };
  return { title: 'Remate a puerta', text: `${fwds[0]} ${pick(SHOT)}.` };
}

/** Quién defiende en un club con un número: su portero (si lo tiene ahí) y sus defensas. */
function defenders(state: GameState, clubId: number, n: number) {
  const J = state.jornada;
  const active = state.players[clubId].squad.filter((e) => !isOut(e, J) && activeNumbers(e, J).includes(n)).map((e) => footballer(e.cardId));
  return {
    keeper: active.find((f) => f.position === 'POR') ?? null,
    backs: active.filter((f) => f.position === 'DEF'),
  };
}

/** Jugada contada en tercera persona, para quien no participa. */
function neutral(state: GameState, sum: number, play: Play, pick: ReturnType<typeof picker>): News {
  const name = (id: number) => state.players[id].name;
  const b = buildUp(play, pick);
  const parts = [b.text];
  if (play.scored.length) parts.push(`Gol a ${list(play.scored.map(name))}.`);
  const plain = play.stopped.filter((x) => !x.counter);
  const counters = play.stopped.filter((x) => x.counter);
  if (plain.length) parts.push(`${list(plain.map((x) => name(x.playerId)))} lo ${plain.length > 1 ? 'paran' : 'para'}.`);
  if (counters.length) parts.push(`${list(counters.map((x) => name(x.playerId)))} ${counters.length > 1 ? 'roban y marcan' : 'roba y marca'} a la contra.`);
  return { kind: 'info', title: `${name(play.playerId)} · ${b.title.toLowerCase()}`, text: parts.join(' '), cards: play.cards, club: play.playerId };
}

/**
 * Noticias de una tirada. `viewer` es el club de quien mira; con null se cuenta de forma neutral.
 * `seed` debe ser estable para la tirada (por ejemplo, jornada × 100 + número de tirada).
 */
export function rollNews(state: GameState, roll: RollReport, seed: number, viewer: number | null): News[] {
  const pick = picker(seed + (viewer ?? 0) * 31);
  const name = (id: number) => state.players[id].name;
  const n = roll.sum;

  if (n === 7) {
    const out: News[] = [{ kind: 'var', title: 'VAR', text: pick(VAR) }];
    const drawers = roll.varDraws.map((d) => d.playerId);
    const mine = roll.varDraws.find((d) => d.playerId === viewer);
    if (mine) out.push({ kind: 'card', title: '¡Te llevas una carta!', text: 'Como vas en la mitad baja de la tabla, el VAR te compensa con una carta especial.', specialCardId: mine.cardId });
    const others = drawers.filter((id) => id !== viewer);
    if (others.length) out.push({ kind: 'info', title: 'Cartas del VAR', text: `${list(others.map(name))} ${others.length > 1 ? 'roban' : 'roba'} una carta especial.` });
    return out;
  }
  if (roll.plays.length === 0) return [{ kind: 'info', title: `Sale el ${n}`, text: pick(NOTHING)(n) }];
  if (viewer === null) return roll.plays.map((pl) => neutral(state, n, pl, pick));

  const out: News[] = [];
  const mine = roll.plays.find((pl) => pl.playerId === viewer);
  const rivals = roll.plays.filter((pl) => pl.playerId !== viewer);
  const conceded = rivals.filter((pl) => pl.scored.includes(viewer));
  const saved = rivals.filter((pl) => pl.stopped.some((x) => x.playerId === viewer));
  const mineDef = defenders(state, viewer, n);

  // 1. Lo que te llega: primero lo que encajas y luego lo que paras.
  for (const pl of conceded) {
    const b = buildUp(pl, pick);
    const why = mineDef.keeper || mineDef.backs.length ? `Tu defensa con el ${n} no basta contra un ataque de fuerza ${pl.power}.` : `No tienes a nadie que defienda el ${n}.`;
    out.push({ kind: 'concede', title: pick(CONCEDE_TITLE), text: `${name(pl.playerId)}: ${b.text} ${why}`, cards: pl.cards, club: pl.playerId });
  }
  for (const pl of saved) {
    const st = pl.stopped.find((x) => x.playerId === viewer)!;
    const b = buildUp(pl, pick);
    const hero = st.keeper && mineDef.keeper ? mineDef.keeper : mineDef.backs[0] ?? mineDef.keeper;
    const action = hero?.position === 'POR' ? pick(KEEPER_SAVE) : pick(DEF_STOP);
    out.push({
      kind: 'save',
      title: hero?.position === 'POR' ? pick(['¡Paradón!', '¡Qué mano!', '¡Para tu portero!']) : pick(['¡Bien defendido!', '¡Balón recuperado!', '¡Corte providencial!']),
      text: `${name(pl.playerId)}: ${b.text} Pero ${hero?.name ?? 'tu defensa'} ${action}.`,
      cards: hero ? [hero.id] : undefined,
      club: viewer,
    });
    if (st.counter) {
      const back = mineDef.backs[0];
      out.push({
        kind: 'counterFor',
        title: '¡Contragolpe y gol!',
        text: `${back?.name ?? 'Tu defensa'} ${pick(COUNTER)}: pillas descolocado a ${name(pl.playerId)} y marcas.`,
        cards: back ? [back.id] : undefined,
        club: viewer,
      });
    }
  }

  // 2. Tu ataque.
  if (mine) {
    const b = buildUp(mine, pick);
    out.push({ kind: 'attack', title: b.title, text: `${conceded.length ? pick(RESTART) + ' ' : ''}${b.text}`, cards: mine.cards, club: viewer });
    if (mine.scored.length) {
      out.push({ kind: 'goal', title: pick(GOAL_TITLE), text: `${pick(BEAT)} ${list(mine.scored.map(name))}.`, cards: mine.cards, club: viewer });
    }
    const plain = mine.stopped.filter((x) => !x.counter);
    if (plain.length) {
      const lines = plain.map((x) => {
        const d = defenders(state, x.playerId, n);
        return x.keeper && d.keeper ? `${d.keeper.name} (${name(x.playerId)}) ${pick(KEEPER_SAVE)}` : `${d.backs[0]?.name ?? 'la defensa'} (${name(x.playerId)}) ${pick(DEF_STOP)}`;
      });
      out.push({ kind: 'stopped', title: mine.scored.length ? 'No a todos' : pick(['Te la paran', 'Sin premio', 'Se queda en nada']), text: `${lines.join('. ')}.` });
    }
    for (const x of mine.stopped.filter((y) => y.counter)) {
      const d = defenders(state, x.playerId, n);
      out.push({
        kind: 'counterAgainst',
        title: '¡Te pillan a la contra!',
        text: `${d.backs[0]?.name ?? 'Su defensa'} (${name(x.playerId)}) ${pick(COUNTER)} y te marca. Ningún medio cubría tu ataque.`,
        cards: d.backs[0] ? [d.backs[0].id] : undefined,
        club: x.playerId,
      });
    }
  }

  // 3. Si nada de esto te toca, un resumen de lo que hacen los demás.
  if (out.length === 0) {
    out.push({ kind: 'info', title: `Sale el ${n}`, text: `A ti no te afecta: ni atacas ni te atacan con el ${n}.` });
    for (const pl of roll.plays.slice(0, 2)) out.push(neutral(state, n, pl, pick));
  }
  return out;
}

/** Goles a favor y en contra de un club en una tirada. */
export function rollScore(roll: RollReport, club: number): { gf: number; gc: number } {
  let gf = 0;
  let gc = 0;
  for (const pl of roll.plays) {
    const counters = pl.stopped.filter((x) => x.counter);
    if (pl.playerId === club) {
      gf += pl.scored.length;
      gc += counters.length;
    } else {
      if (pl.scored.includes(club)) gc += 1;
      if (counters.some((x) => x.playerId === club)) gf += 1;
    }
  }
  return { gf, gc };
}
