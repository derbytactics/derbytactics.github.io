import { CONFIG } from './config';

export type Position = 'POR' | 'DEF' | 'MED' | 'DEL';
export type Tier = 'Cantera' | 'Plata' | 'Oro' | 'Crack';

export interface Footballer {
  id: string;
  name: string;
  position: Position;
  /** Números de dado (2-12, nunca 7) con los que actúa. */
  numbers: number[];
}

/**
 * Fuerza de cada posición cuando sale uno de sus números.
 * El ataque de un club es la suma de sus atacantes con ese número; la defensa, la de sus defensores.
 * Una jugada es gol contra cada rival cuya defensa sea menor que el ataque.
 */
export const ROLE_NAME: Record<Position, { label: string; plural: string }> = {
  POR: { label: 'Portero', plural: 'porteros' },
  DEF: { label: 'Defensa', plural: 'defensas' },
  MED: { label: 'Medio', plural: 'medios' },
  DEL: { label: 'Delantero', plural: 'delanteros' },
};
export const roleOf = (position: Position) => CONFIG.roles[position];
export const POSITIONS: Position[] = ['POR', 'DEF', 'MED', 'DEL'];

/** "Pips" tipo Catán: de cuántas formas sale ese número con 2 dados (sobre 36). */
export function pipsOf(n: number): number {
  return n === 7 ? 0 : 6 - Math.abs(7 - n);
}
export function totalPips(numbers: number[]): number {
  return numbers.reduce((a, n) => a + pipsOf(n), 0);
}
/** Precio según la frecuencia de sus números y lo que cotiza su posición. */
export function priceFor(position: Position, pips: number): number {
  const f = CONFIG.price.factor[position];
  return Math.max(1, Math.round(f * (CONFIG.price.perPip * pips + CONFIG.price.quad * pips * pips)));
}
export function tierForPrice(price: number): Tier {
  if (price >= 38) return 'Crack';
  if (price >= 24) return 'Oro';
  if (price >= 11) return 'Plata';
  return 'Cantera';
}

/** Combinaciones de números por posición. Los porteros cubren más números; los delanteros, menos. */
const SETS: Record<Position, number[][]> = {
  POR: [
    [5, 6, 8, 9], [4, 6, 8, 10], [3, 6, 8, 11], [5, 6, 8], [6, 8, 9, 10], [4, 5, 6, 8],
    [4, 5, 9, 10], [2, 6, 8, 12], [3, 5, 9, 11], [4, 6, 9], [5, 8, 10], [3, 4, 10, 11],
    [2, 5, 9, 12], [6, 9, 11], [4, 8, 12],
  ],
  DEF: [
    [6, 8], [6, 8], [5, 6, 9], [4, 8, 9], [5, 8], [6, 9], [5, 6], [8, 9], [4, 6, 10], [5, 8, 10],
    [3, 6], [8, 11], [4, 9], [5, 10], [4, 5], [9, 10], [3, 8], [6, 11], [2, 6, 12], [3, 4, 11],
    [10, 11, 12], [2, 3, 4], [5, 9], [4, 10],
  ],
  MED: [
    [6, 8], [5, 6, 9], [4, 6, 8], [5, 8, 9], [6, 8, 10], [5, 6], [8, 9], [6, 9], [5, 8], [4, 5, 9],
    [5, 9, 10], [3, 6, 9], [4, 8, 10], [4, 6], [8, 10], [5, 9], [4, 10], [3, 8, 11], [3, 6, 11],
    [4, 9], [5, 10], [3, 5], [9, 11], [2, 6], [8, 12], [3, 4, 11],
  ],
  DEL: [
    [6, 8, 9], [5, 6, 8], [6, 8], [6, 8], [5, 6], [8, 9], [6, 9], [5, 8], [6, 10], [4, 8],
    [6], [6], [8], [8], [5, 9], [4, 10], [5], [9], [5, 10], [4, 9],
    [3, 6], [8, 11], [4], [10], [3, 9], [5, 11], [3], [11], [2, 12], [3, 11],
  ],
};

const NAMES = [
  'Leo Manzanares', 'Kiko Bermejo', 'Dani Rey', 'Yeray Cienfuegos', 'Nico Valdés', 'Hugo Trujillo', 'Samu Okoro', 'Iker Lasarte',
  'Bruno Castaño', 'Marc Ribera', 'Thiago Pardo', 'Álex Montoya', 'Rubén Sarabia', 'Joel Arrieta', 'Pau Ferrer', 'Mateo Lozano',
  'Izan Cabello', 'Gael Navas', 'Unai Beitia', 'Erik Sandoval', 'Aitor Zubiri', 'Jorge Maldonado', 'Luca Bianchi', 'Omar Benali',
  'Sergio Quintana', 'Adrián Pombo', 'Víctor Llorente', 'Raúl Escobar', 'Diego Salinas', 'Mario Cuenca', 'Toni Gallardo', 'Pedro Vizcaíno',
  'Jon Etxeberria', 'Cristian Mora', 'Fran Céspedes', 'Borja Lerma', 'Guille Roldán', 'Isma Carmona', 'Chema Tejada', 'Rober Olmedo',
  'Nando Peralta', 'Quique Barrios', 'Edu Sanchís', 'Javi Pinto', 'Carlos Mendieta', 'Andrés Vidal', 'Miguelito Ros', 'Santi Cobo',
  'Nacho Durán', 'Pablo Yuste', 'Lolo Gimeno', 'Tino Aguirre', 'Chus Pacheco', 'Manu Tirado', 'Rafa Oliva', 'Koke Bustos',
  'Dario Lima', 'Fede Arce', 'Juanma Prieto', 'Óscar Leal', 'Abel Marín', 'Ximo Bosch', 'Teo Garrido', 'Lucas Ferreiro',
  'Íñigo Barrena', 'Marcos Tello', 'Saúl Herrero', 'Dídac Roca', 'Julen Aranda', 'Biel Morales', 'Hernán Paz', 'Aleix Soler',
  'Rodri Campos', 'Ander Goñi', 'Curro Vargas', 'Pol Vilanova', 'Ramiro Sosa', 'Enzo Ferrari', 'Yago Pazos', 'Noel Cabrera',
  'Tomás Alcaraz', 'Gorka Urrutia', 'Elías Montero', 'Bernat Pons', 'Germán Rubio', 'Kevin Ortega', 'Simón Calvo', 'Moha Rahmani',
  'Felipe Lara', 'Arnau Ribas', 'Darío Becerra', 'Ibai Zabala', 'César Blanco', 'Martín Cano', 'Jaime Palacios', 'Néstor Vega',
];

export const FOOTBALLERS: Footballer[] = (() => {
  const out: Footballer[] = [];
  // Se reparten los nombres alternando posiciones para que no queden agrupados.
  const queues = POSITIONS.map((pos) => SETS[pos].map((numbers) => ({ pos, numbers })));
  let i = 0;
  while (queues.some((q) => q.length)) {
    for (const q of queues) {
      const next = q.shift();
      if (!next) continue;
      out.push({ id: `f${i + 1}`, name: NAMES[i], position: next.pos, numbers: [...next.numbers].sort((a, b) => a - b) });
      i++;
    }
  }
  return out;
})();

const BY_ID = new Map(FOOTBALLERS.map((f) => [f.id, f]));
export function footballer(id: string): Footballer {
  const f = BY_ID.get(id);
  if (!f) throw new Error(`Futbolista desconocido: ${id}`);
  return f;
}
export function basePrice(id: string): number {
  const f = footballer(id);
  return priceFor(f.position, totalPips(f.numbers));
}

// ---------------------------------------------------------------- Cartas especiales

export type SpecialKind =
  | 'incidentes'
  | 'puertaCerrada'
  | 'lesion'
  | 'roja'
  | 'racha'
  | 'olfato'
  | 'cantera'
  | 'patrocinador'
  | 'diaDelClub'
  | 'subvencion'
  | 'ojeador'
  | 'abogados';

export type TargetType = 'self' | 'rival' | 'rivalFootballer' | 'ownFootballer' | 'passive';

export interface SpecialCard {
  id: string;
  kind: SpecialKind;
  /** Solo para "olfato": el número que añade. */
  value?: number;
}

const S = CONFIG.special;

export const SPECIAL_INFO: Record<
  SpecialKind,
  { title: string; target: TargetType; sanction: boolean; copies: number; text: (c: SpecialCard) => string }
> = {
  incidentes: {
    title: 'Incidentes en la grada',
    target: 'rival',
    sanction: true,
    copies: 4,
    text: () => `Por incidentes con su afición, el club rival que elijas paga ${S.fine}M de multa.`,
  },
  puertaCerrada: {
    title: 'A puerta cerrada',
    target: 'rival',
    sanction: true,
    copies: 3,
    text: () => `El club rival que elijas juega ${S.closedDoorsRounds} jornadas a puerta cerrada: no cobra taquilla.`,
  },
  lesion: {
    title: 'Lesión muscular',
    target: 'rivalFootballer',
    sanction: true,
    copies: 2,
    text: () => `Un futbolista rival se pierde ${S.injuryRounds} jornadas: ni ataca ni defiende.`,
  },
  roja: {
    title: 'Tarjeta roja',
    target: 'rivalFootballer',
    sanction: true,
    copies: 3,
    text: () => `Un futbolista rival queda sancionado ${S.redCardRounds} jornada: ni ataca ni defiende.`,
  },
  racha: {
    title: 'Jugador en racha',
    target: 'ownFootballer',
    sanction: false,
    copies: 4,
    text: () => `Uno de tus futbolistas juega con el doble de fuerza (ataque y defensa) durante ${S.streakRounds} jornadas.`,
  },
  olfato: {
    title: 'Olfato de gol',
    target: 'ownFootballer',
    sanction: false,
    copies: 6,
    text: (c) => `Uno de tus futbolistas también actúa con el ${c.value} durante ${S.extraNumberRounds} jornadas.`,
  },
  cantera: {
    title: 'Jugador de cantera',
    target: 'ownFootballer',
    sanction: false,
    copies: 3,
    text: () => `Nadie puede pagar la cláusula de uno de tus futbolistas durante ${S.academyRounds} jornadas.`,
  },
  patrocinador: {
    title: 'Nuevo patrocinador',
    target: 'self',
    sanction: false,
    copies: 3,
    text: () => `Firmas un patrocinio: cobras ${S.sponsor}M.`,
  },
  diaDelClub: {
    title: 'Día del club',
    target: 'self',
    sanction: false,
    copies: 2,
    text: () => 'Esta jornada cobras el doble de taquilla.',
  },
  subvencion: {
    title: 'Subvención municipal',
    target: 'self',
    sanction: false,
    copies: 2,
    text: () => `Tu próxima ampliación de estadio cuesta un ${S.subsidyDiscount * 100}% menos.`,
  },
  ojeador: {
    title: 'Ojeador estrella',
    target: 'self',
    sanction: false,
    copies: 2,
    text: () => `Tu próximo fichaje del mercado en este turno cuesta un ${S.scoutDiscount * 100}% menos.`,
  },
  abogados: {
    title: 'Gabinete jurídico',
    target: 'passive',
    sanction: false,
    copies: 3,
    text: () => 'No se juega: mientras esté en tu mano, anula automáticamente la primera sanción que te lancen.',
  },
};

const OLFATO_NUMBERS = [4, 5, 6, 8, 9, 10];

export const SPECIAL_CARDS: SpecialCard[] = (() => {
  const out: SpecialCard[] = [];
  (Object.keys(SPECIAL_INFO) as SpecialKind[]).forEach((kind) => {
    for (let i = 0; i < SPECIAL_INFO[kind].copies; i++) {
      out.push({ id: `${kind}-${i + 1}`, kind, value: kind === 'olfato' ? OLFATO_NUMBERS[i] : undefined });
    }
  });
  return out;
})();

const SPECIAL_BY_ID = new Map(SPECIAL_CARDS.map((c) => [c.id, c]));
export function specialCard(id: string): SpecialCard {
  const c = SPECIAL_BY_ID.get(id);
  if (!c) throw new Error(`Carta especial desconocida: ${id}`);
  return c;
}
