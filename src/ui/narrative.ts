/**
 * Crónica de cada tirada, contada desde el punto de vista de un club (o neutral).
 * Devuelve las noticias en el orden en que deben aparecer, una a una.
 */
import { GameState, Play, RollReport, activeNumbers, cardName, footballer, isOut } from '../engine';

/** Futbolista con el nombre que lleva en esta partida. */
const fb = (state: GameState, id: string) => ({ ...footballer(id), name: cardName(state, id) });

export type NewsKind = 'attack' | 'goal' | 'stopped' | 'concede' | 'save' | 'info' | 'var' | 'card';

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
/** Tras una parada propia, cómo sale el balón hacia el ataque. */
const OUTLET_KEEPER = ['saca rápido con la mano', 'pone el balón en juego en largo', 'no se lo piensa y lanza la contra'];
const OUTLET_BACK = ['sale jugando desde atrás', 'levanta la cabeza y lanza en largo', 'inicia la contra'];
const MID_RUN = ['desborda por banda', 'conduce hasta la frontal', 'se va de dos rivales'];
const THROUGH = ['pase al hueco', 'balón largo a la espalda de la defensa', 'envío medido'];
const CONCEDE_TITLE = ['Gol en contra', 'Te marcan', 'Encajas'];
const RESTART = ['Sacas de centro y te lanzas al ataque.', 'No hay tiempo para lamentarse: balón al centro y arriba.', 'Respondes nada más sacar de centro.'];
const NOTHING = [
  (n: number) => `Nadie ataca con el ${n}. El balón se pierde por la banda.`,
  (n: number) => `Con el ${n} no hay jugada: partido trabado en el centro del campo.`,
  (n: number) => `El ${n} no le sirve a nadie. Saque de puerta.`,
];
const VAR = ['El árbitro se lleva la mano al pinganillo: revisión del VAR. No hay jugada.', 'Parón por el VAR. Nadie ataca en esta tirada.', 'El VAR detiene el partido. En esta tirada no hay jugada.'];

/** Describe cómo se arma una jugada de ataque según quién participa. */
function buildUp(state: GameState, play: Play, pick: ReturnType<typeof picker>): { title: string; text: string } {
  const mids = play.cards.filter((id) => footballer(id).position === 'MED').map((id) => cardName(state, id));
  const fwds = play.cards.filter((id) => footballer(id).position === 'DEL').map((id) => cardName(state, id));
  const midsMany = mids.length > 1;
  if (fwds.length === 0) {
    return { title: 'Disparo lejano', text: midsMany ? `${list(mids)} combinan en la frontal y disparan desde lejos.` : `${mids[0]} ${pick(LONG_SHOT)}.` };
  }
  if (mids.length > 0) {
    const pass = midsMany ? pick(['mueven el balón con criterio y lo ponen al área', 'triangulan y filtran el pase', 'tocan rápido y encuentran el hueco']) : pick(PASS);
    return { title: 'Jugada combinada', text: `${list(mids)} ${pass} y ${list(fwds)} ${fwds.length > 1 ? 'rematan a puerta' : pick(SHOT)}.` };
  }
  if (fwds.length > 1) return { title: 'Jugada en el área', text: `${list(fwds)} ${pick(WALL)} y rematan a puerta.` };
  return { title: 'Remate a puerta', text: `${fwds[0]} ${pick(SHOT)}.` };
}

/** Quién defiende en un club con un número: su portero (si lo tiene ahí) y sus defensas. */
function defenders(state: GameState, clubId: number, n: number) {
  const J = state.jornada;
  const active = state.players[clubId].squad.filter((e) => !isOut(e, J) && activeNumbers(e, J).includes(n)).map((e) => fb(state, e.cardId));
  return {
    keeper: active.find((f) => f.position === 'POR') ?? null,
    backs: active.filter((f) => f.position === 'DEF'),
  };
}

/** Jugada contada en tercera persona, para quien no participa. */
function neutral(state: GameState, sum: number, play: Play, pick: ReturnType<typeof picker>): News {
  const name = (id: number) => state.players[id].name;
  const b = buildUp(state, play, pick);
  const parts = [b.text];
  if (play.scored.length) parts.push(`Gol a ${list(play.scored.map(name))}.`);
  if (play.stopped.length) parts.push(`${list(play.stopped.map((x) => name(x.playerId)))} lo ${play.stopped.length > 1 ? 'paran' : 'para'}.`);
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
    const draw = roll.varDraws[0];
    if (!draw) {
      out.push({ kind: 'info', title: 'Sin carta', text: 'Quien tiró los dados tiene la mano llena y no puede robar carta.' });
    } else if (draw.playerId === viewer) {
      out.push({ kind: 'card', title: '¡Te llevas una carta!', text: 'Has sacado un 7: el VAR te compensa con una carta especial.', specialCardId: draw.cardId });
    } else {
      out.push({ kind: 'info', title: 'Carta del VAR', text: `${name(draw.playerId)} ha sacado el 7 y roba una carta especial.` });
    }
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
    const b = buildUp(state, pl, pick);
    const why = mineDef.keeper || mineDef.backs.length ? `Tu defensa con el ${n} no basta contra un ataque de fuerza ${pl.power}.` : `No tienes a nadie que defienda el ${n}.`;
    out.push({ kind: 'concede', title: pick(CONCEDE_TITLE), text: `${name(pl.playerId)}: ${b.text} ${why}`, cards: pl.cards, club: pl.playerId });
  }
  let lastHero: ReturnType<typeof fb> | null = null;
  for (const pl of saved) {
    const st = pl.stopped.find((x) => x.playerId === viewer)!;
    const b = buildUp(state, pl, pick);
    const hero = st.keeper && mineDef.keeper ? mineDef.keeper : mineDef.backs[0] ?? mineDef.keeper;
    lastHero = hero ?? lastHero;
    const action = hero?.position === 'POR' ? pick(KEEPER_SAVE) : pick(DEF_STOP);
    out.push({
      kind: 'save',
      title: hero?.position === 'POR' ? pick(['¡Paradón!', '¡Qué mano!', '¡Para tu portero!']) : pick(['¡Bien defendido!', '¡Balón recuperado!', '¡Corte providencial!']),
      text: `${name(pl.playerId)}: ${b.text} Pero ${hero?.name ?? 'tu defensa'} ${action}.`,
      cards: hero ? [hero.id] : undefined,
      club: viewer,
    });
  }

  // 2. Tu ataque. Si vienes de parar, la jugada nace de esa recuperación; si vienes de encajar, del saque de centro.
  if (mine) {
    let b = buildUp(state, mine, pick);
    if (lastHero && !conceded.length) {
      const mids = mine.cards.filter((id) => footballer(id).position === 'MED').map((id) => cardName(state, id));
      const fwds = mine.cards.filter((id) => footballer(id).position === 'DEL').map((id) => cardName(state, id));
      const outlet = `${lastHero.name} ${lastHero.position === 'POR' ? pick(OUTLET_KEEPER) : pick(OUTLET_BACK)}`;
      // Con varios medios se cuenta en plural para que la frase concuerde.
      const many = mids.length > 1;
      const run = many ? pick(['combinan por banda', 'avanzan tocando hasta la frontal', 'se van en pared']) : pick(MID_RUN);
      const text =
        fwds.length === 0
          ? `${outlet}: balón para ${list(mids)}, que ${run} y ${many ? pick(['disparan', 'chutan a puerta', 'prueban al portero']) : pick(['dispara', 'chuta a puerta', 'prueba al portero'])}.`
          : mids.length > 0
            ? `${outlet}: ${list(mids)} ${run}, ${many ? pick(['centran al área', 'la ponen atrás', 'filtran el pase']) : pick(['centra al área', 'la pone atrás', 'filtra el pase'])} y ${list(fwds)} ${fwds.length > 1 ? 'rematan a puerta' : pick(SHOT)}.`
            : `${outlet}: ${pick(THROUGH)} para ${list(fwds)}, que ${fwds.length > 1 ? pick(['encaran y disparan', 'combinan y rematan']) : pick(['encara y dispara', 'se planta solo y define', 'controla y remata'])}.`;
      b = { title: '¡A la contra!', text };
    }
    out.push({ kind: 'attack', title: b.title, text: `${conceded.length ? pick(RESTART) + ' ' : ''}${b.text}`, cards: mine.cards, club: viewer });
    if (mine.scored.length) {
      out.push({ kind: 'goal', title: pick(GOAL_TITLE), text: `${pick(BEAT)} ${list(mine.scored.map(name))}.`, cards: mine.cards, club: viewer });
    }
    if (mine.stopped.length) {
      const lines = mine.stopped.map((x) => {
        const d = defenders(state, x.playerId, n);
        return x.keeper && d.keeper ? `${d.keeper.name} (${name(x.playerId)}) ${pick(KEEPER_SAVE)}` : `${d.backs[0]?.name ?? 'la defensa'} (${name(x.playerId)}) ${pick(DEF_STOP)}`;
      });
      out.push({ kind: 'stopped', title: mine.scored.length ? 'No a todos' : pick(['Te la paran', 'Sin premio', 'Se queda en nada']), text: `${lines.join('. ')}.` });
    }
  }

  // 3. Si no te toca nada, se dice y punto: el resto de jugadas está en el acta.
  if (out.length === 0) {
    out.push({ kind: 'info', title: `Sale el ${n}`, text: pick([`A ti no te afecta: ni atacas ni te atacan con el ${n}.`, `Con el ${n} no pasa nada en tu área ni en tu ataque.`, `El ${n} no va contigo. Sigue el partido.`]) });
  }
  return out;
}

/** Goles a favor y en contra de un club en una tirada. */
export function rollScore(roll: RollReport, club: number): { gf: number; gc: number } {
  let gf = 0;
  let gc = 0;
  for (const pl of roll.plays) {
    if (pl.playerId === club) gf += pl.scored.length;
    else if (pl.scored.includes(club)) gc += 1;
  }
  return { gf, gc };
}
