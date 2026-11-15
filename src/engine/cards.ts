import { CONFIG } from './config';

export type Position = 'DEF' | 'MED' | 'DEL';
export type Tier = 'Cantera' | 'Plata' | 'Oro' | 'Crack';

export interface Footballer {
  id: string;
  name: string;
  position: Position;
  /** Números de dado (2-12, nunca 7) con los que marca. */
  numbers: number[];
}

/** "Pips" tipo Catán: de cuántas formas sale ese número con 2 dados (sobre 36). */
export function pipsOf(n: number): number {
  return n === 7 ? 0 : 6 - Math.abs(7 - n);
}
export function totalPips(numbers: number[]): number {
  return numbers.reduce((a, n) => a + pipsOf(n), 0);
}
export function priceForPips(pips: number): number {
  return Math.round(CONFIG.price.perPip * pips + CONFIG.price.quad * pips * pips);
}
export function tierForPips(pips: number): Tier {
  if (pips >= 12) return 'Crack';
  if (pips >= 9) return 'Oro';
  if (pips >= 5) return 'Plata';
  return 'Cantera';
}

type Row = [string, Position, number[]];
const ROWS: Row[] = [
  // Cracks (12-14 pips)
  ['Leo Manzanares', 'DEL', [6, 8, 9]],
  ['Kiko Bermejo', 'DEL', [5, 6, 8]],
  ['Dani "Zurdo" Rey', 'DEL', [4, 6, 8]],
  ['Yeray Cienfuegos', 'DEL', [6, 8, 10]],
  ['Nico Valdés', 'DEL', [5, 8, 9]],
  ['Hugo Trujillo', 'MED', [5, 6, 9]],
  ['Samu Okoro', 'DEL', [6, 9, 10]],
  ['Iker Lasarte', 'MED', [4, 5, 8]],
  // Oro (9-11)
  ['Bruno Castaño', 'DEL', [6, 8]],
  ['Marc Ribera', 'DEL', [6, 8]],
  ['Thiago Pardo', 'MED', [3, 6, 9]],
  ['Álex Montoya', 'MED', [4, 8, 10]],
  ['Rubén Sarabia', 'MED', [5, 9, 10]],
  ['Joel Arrieta', 'MED', [4, 5, 9]],
  ['Pau Ferrer', 'DEL', [6, 9]],
  ['Mateo Lozano', 'DEL', [5, 8]],
  ['Izan Cabello', 'DEL', [5, 6]],
  ['Gael Navas', 'DEL', [8, 9]],
  ['Unai Beitia', 'MED', [2, 6, 10]],
  ['Erik Sandoval', 'MED', [4, 8, 12]],
  ['Aitor Zubiri', 'MED', [3, 8, 11]],
  ['Jorge Maldonado', 'MED', [3, 6, 11]],
  ['Luca Bianchi', 'MED', [3, 5, 9]],
  ['Omar Benali', 'MED', [4, 9, 11]],
  // Plata (5-8)
  ['Sergio Quintana', 'DEL', [6]],
  ['Adrián Pombo', 'DEL', [6]],
  ['Víctor Llorente', 'DEL', [8]],
  ['Raúl Escobar', 'DEL', [8]],
  ['Diego Salinas', 'MED', [5, 9]],
  ['Mario Cuenca', 'MED', [4, 10]],
  ['Toni Gallardo', 'MED', [5, 10]],
  ['Pedro Vizcaíno', 'MED', [4, 9]],
  ['Jon Etxeberria', 'MED', [3, 6]],
  ['Cristian Mora', 'MED', [8, 11]],
  ['Fran Céspedes', 'DEF', [2, 6]],
  ['Borja Lerma', 'DEF', [8, 12]],
  ['Guille Roldán', 'MED', [4, 5]],
  ['Isma Carmona', 'MED', [9, 10]],
  ['Chema Tejada', 'DEF', [3, 5]],
  ['Rober Olmedo', 'DEF', [9, 11]],
  ['Nando Peralta', 'DEF', [2, 3, 4]],
  ['Quique Barrios', 'DEF', [10, 11, 12]],
  ['Edu Sanchís', 'DEF', [6, 12]],
  ['Javi Pinto', 'DEF', [2, 8]],
  ['Carlos Mendieta', 'MED', [4, 6]],
  ['Andrés Vidal', 'MED', [8, 10]],
  // Cantera (1-4)
  ['Miguelito Ros', 'MED', [5]],
  ['Santi Cobo', 'MED', [9]],
  ['Nacho Durán', 'DEF', [4]],
  ['Pablo Yuste', 'DEF', [10]],
  ['Lolo Gimeno', 'DEF', [3]],
  ['Tino Aguirre', 'DEF', [11]],
  ['Chus Pacheco', 'DEF', [2]],
  ['Manu Tirado', 'DEF', [12]],
  ['Rafa Oliva', 'DEF', [3, 11]],
  ['Koke Bustos', 'DEF', [2, 12]],
  ['Dario Lima', 'DEF', [3, 12]],
  ['Fede Arce', 'DEF', [2, 11]],
  ['Juanma Prieto', 'DEF', [2, 4]],
  ['Óscar Leal', 'DEF', [10, 12]],
  ['Abel Marín', 'MED', [5]],
  ['Ximo Bosch', 'MED', [9]],
  ['Teo Garrido', 'DEF', [4]],
  ['Lucas Ferreiro', 'DEF', [10]],
];

export const FOOTBALLERS: Footballer[] = ROWS.map(([name, position, numbers], i) => ({
  id: `f${i + 1}`,
  name,
  position,
  numbers: [...numbers].sort((a, b) => a - b),
}));

const BY_ID = new Map(FOOTBALLERS.map((f) => [f.id, f]));
export function footballer(id: string): Footballer {
  const f = BY_ID.get(id);
  if (!f) throw new Error(`Futbolista desconocido: ${id}`);
  return f;
}
export function basePrice(id: string): number {
  return priceForPips(totalPips(footballer(id).numbers));
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
    text: () => `Un futbolista rival se pierde ${S.injuryRounds} jornadas: no marca.`,
  },
  roja: {
    title: 'Tarjeta roja',
    target: 'rivalFootballer',
    sanction: true,
    copies: 3,
    text: () => `Un futbolista rival queda sancionado ${S.redCardRounds} jornada: no marca.`,
  },
  racha: {
    title: 'Delantero en racha',
    target: 'ownFootballer',
    sanction: false,
    copies: 4,
    text: () => `Los goles de uno de tus futbolistas valen doble durante ${S.streakRounds} jornadas.`,
  },
  olfato: {
    title: 'Olfato de gol',
    target: 'ownFootballer',
    sanction: false,
    copies: 6,
    text: (c) => `Uno de tus futbolistas también marca con el ${c.value} durante ${S.extraNumberRounds} jornadas.`,
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
