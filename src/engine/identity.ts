/**
 * Identidades de la partida: nombre y rasgos de cada futbolista, nombres de club y escudos.
 * Todo es dato puro y serializable. Se genera con un generador propio derivado de la semilla,
 * para no alterar la secuencia aleatoria de las reglas.
 */
import { nextRandom } from './rng';

/** Rasgos visuales de un futbolista; la interfaz decide cómo dibujarlos. */
export type Ethnicity = 'europeo' | 'mediterraneo' | 'africano' | 'magrebi' | 'asiaEste' | 'asiaSur' | 'mestizo';
export const ETHNICITIES: Ethnicity[] = ['europeo', 'mediterraneo', 'africano', 'magrebi', 'asiaEste', 'asiaSur', 'mestizo'];

export interface Identity {
  name: string;
  eth: Ethnicity;
  /** Entero que fija los rasgos de la cara (peinado, ojos, barba…). */
  face: number;
}

export interface CrestDesign {
  /** Silueta del escudo (0..CREST_SHAPES-1). */
  shape: number;
  /** Dibujo de fondo (0..CREST_PATTERNS-1). */
  pattern: number;
  /** Emblema central (0..CREST_EMBLEMS-1). */
  emblem: number;
  primary: string;
  secondary: string;
}

export const CREST_SHAPES = 6;
export const CREST_PATTERNS = 9;
export const CREST_EMBLEMS = 12;
export const CREST_COLORS = [
  '#C8102E', '#7A1F2B', '#E8590C', '#F2B705', '#1E7B3A', '#0B5D3B', '#1C6DD0',
  '#0B2A5B', '#6BB5E8', '#5B2A86', '#111418', '#F4F1E8', '#8C8F94', '#00857C',
];

export type Rand = () => number;

/** Generador independiente a partir de una semilla. */
export function makeRand(seed: number): Rand {
  let s = seed | 0;
  return () => {
    const r = nextRandom(s);
    s = r.seed;
    return r.value;
  };
}
const pick = <T>(r: Rand, items: readonly T[]): T => items[Math.floor(r() * items.length) % items.length];
function weighted<T>(r: Rand, items: readonly [T, number][]): T {
  const total = items.reduce((a, [, w]) => a + w, 0);
  let x = r() * total;
  for (const [item, w] of items) {
    x -= w;
    if (x < 0) return item;
  }
  return items[items.length - 1][0];
}

// ---------------------------------------------------------------- Nombres de futbolista

interface NamePool {
  weight: number;
  firsts: string[];
  lasts: string[];
  /** Con qué probabilidad sale cada aspecto en esta cantera. */
  looks: [Ethnicity, number][];
}

const POOLS: NamePool[] = [
  {
    weight: 22,
    firsts: ['Álvaro', 'Sergio', 'Pablo', 'Iker', 'Hugo', 'Dani', 'Marc', 'Pau', 'Javi', 'Rubén', 'Unai', 'Aitor', 'Raúl', 'Adrián', 'Nacho', 'Borja', 'Íñigo', 'Gorka', 'Mario', 'Carlos', 'Izan', 'Gael', 'Yeray', 'Kiko', 'Chema', 'Isma'],
    lasts: ['García', 'Moreno', 'Navarro', 'Ortega', 'Castaño', 'Etxeberria', 'Ribera', 'Vidal', 'Lozano', 'Cabello', 'Llorente', 'Zubiri', 'Pons', 'Herrero', 'Sarabia', 'Gallardo', 'Arrieta', 'Montoya', 'Soler', 'Quintana', 'Cienfuegos', 'Bermejo', 'Manzanares', 'Lasarte', 'Trujillo', 'Roldán'],
    looks: [['mediterraneo', 6], ['europeo', 3], ['mestizo', 1], ['africano', 1], ['magrebi', 1]],
  },
  {
    weight: 12,
    firsts: ['Thiago', 'Mateo', 'Santiago', 'Joaquín', 'Facundo', 'Emiliano', 'Julián', 'Nahuel', 'Matías', 'Franco', 'Lautaro', 'Valentín', 'Sebastián', 'Agustín', 'Brayan', 'Jhon', 'Kevin', 'Wilmar'],
    lasts: ['Paredes', 'Benítez', 'Acosta', 'Rojas', 'Medina', 'Sosa', 'Ferreyra', 'Cáceres', 'Villalba', 'Correa', 'Quiroga', 'Ledesma', 'Núñez', 'Giménez', 'Mosquera', 'Valencia', 'Arboleda', 'Cuadrado'],
    looks: [['mestizo', 5], ['mediterraneo', 3], ['africano', 2], ['europeo', 1]],
  },
  {
    weight: 9,
    firsts: ['Gabriel', 'Vinícius', 'Rodrigo', 'Lucas', 'Matheus', 'Caio', 'Rafael', 'Gustavo', 'João', 'Bruno', 'Wesley', 'Ronaldo', 'Davi', 'Luan'],
    lasts: ['Silva', 'Souza', 'Oliveira', 'Santos', 'Costa', 'Pereira', 'Almeida', 'Ribeiro', 'Carvalho', 'Moura', 'Barbosa', 'Teixeira', 'Nascimento', 'Gomes'],
    looks: [['mestizo', 4], ['africano', 3], ['europeo', 2], ['mediterraneo', 1]],
  },
  {
    weight: 11,
    firsts: ['Samuel', 'Moussa', 'Ibrahima', 'Kwame', 'Chidi', 'Emeka', 'Seydou', 'Amadou', 'Yaw', 'Kofi', 'Ousmane', 'Babajide', 'Tunde', 'Lamine', 'Cheikh', 'Pape', 'Wilfried', 'Serge'],
    lasts: ['Okoro', 'Diallo', 'Mensah', 'Traoré', 'Adeyemi', 'Ndiaye', 'Kouassi', 'Okafor', 'Boateng', 'Sarr', 'Koné', 'Camara', 'Eze', 'Diop', 'Asante', 'Bamba', 'Touré', 'Mbeki'],
    looks: [['africano', 1]],
  },
  {
    weight: 8,
    firsts: ['Youssef', 'Hakim', 'Achraf', 'Ilias', 'Bilal', 'Amine', 'Karim', 'Nabil', 'Rachid', 'Sofiane', 'Mehdi', 'Ayoub', 'Omar', 'Zakaria', 'Moha', 'Anass'],
    lasts: ['Benali', 'El Amrani', 'Rahmani', 'Haddad', 'Bennani', 'Ziani', 'Mansouri', 'Belkacem', 'Saidi', 'Tahiri', 'Lahlou', 'Cherif', 'Idrissi', 'Ouali', 'Boudiaf', 'Kaddouri'],
    looks: [['magrebi', 5], ['mediterraneo', 1], ['africano', 1]],
  },
  {
    weight: 3,
    firsts: ['Kenta', 'Takumi', 'Daichi', 'Ren', 'Haruto', 'Sota', 'Yuto', 'Kaoru', 'Ritsu', 'Hiroki'],
    lasts: ['Tanaka', 'Sato', 'Nakamura', 'Kobayashi', 'Watanabe', 'Ito', 'Yamamoto', 'Kubo', 'Endo', 'Mori'],
    looks: [['asiaEste', 1]],
  },
  {
    weight: 3,
    firsts: ['Min-jun', 'Ji-ho', 'Seung-woo', 'Hyun', 'Dong-hyun', 'Jae-sung', 'Tae-yang', 'Sang-ho'],
    lasts: ['Kim', 'Park', 'Lee', 'Choi', 'Jung', 'Kang', 'Hwang', 'Son'],
    looks: [['asiaEste', 1]],
  },
  {
    weight: 2,
    firsts: ['Wei', 'Hao', 'Jun', 'Lei', 'Bo', 'Zhen', 'Yang', 'Tao'],
    lasts: ['Chen', 'Wang', 'Zhang', 'Liu', 'Huang', 'Zhao', 'Wu', 'Lin'],
    looks: [['asiaEste', 1]],
  },
  {
    weight: 4,
    firsts: ['Arjun', 'Rohan', 'Vikram', 'Aarav', 'Imran', 'Faisal', 'Sunil', 'Karan', 'Ravi', 'Hamza', 'Zayn', 'Dev'],
    lasts: ['Sharma', 'Singh', 'Patel', 'Khan', 'Iqbal', 'Rao', 'Chowdhury', 'Mehta', 'Malik', 'Gill', 'Nair', 'Ahmed'],
    looks: [['asiaSur', 1]],
  },
  {
    weight: 4,
    firsts: ['Lars', 'Erik', 'Magnus', 'Mikkel', 'Oskar', 'Rasmus', 'Viktor', 'Emil', 'Henrik', 'Sindre'],
    lasts: ['Hansen', 'Larsen', 'Lindqvist', 'Berg', 'Nilsson', 'Andersen', 'Solberg', 'Holm', 'Dahl', 'Eriksen'],
    looks: [['europeo', 8], ['africano', 1]],
  },
  {
    weight: 4,
    firsts: ['Jonas', 'Niklas', 'Lukas', 'Timo', 'Jannik', 'Leon', 'Florian', 'Kai', 'Moritz', 'Felix'],
    lasts: ['Müller', 'Schneider', 'Becker', 'Vogel', 'Krämer', 'Hoffmann', 'Wagner', 'Fischer', 'Brandt', 'Weber'],
    looks: [['europeo', 6], ['africano', 1], ['magrebi', 1]],
  },
  {
    weight: 6,
    firsts: ['Luka', 'Ivan', 'Dmitri', 'Marko', 'Petar', 'Andrei', 'Filip', 'Nikola', 'Bogdan', 'Mateusz', 'Kamil', 'Dušan'],
    lasts: ['Petrović', 'Kovač', 'Novak', 'Horvat', 'Ivanov', 'Popescu', 'Kowalski', 'Nowak', 'Jovanović', 'Marić', 'Babić', 'Dragan'],
    looks: [['europeo', 1]],
  },
  {
    weight: 5,
    firsts: ['Jack', 'Harry', 'Callum', 'Liam', 'Ryan', 'Connor', 'Owen', 'Jamie', 'Tyler', 'Mason', 'Kieran', 'Reece'],
    lasts: ['Walker', 'Hughes', 'Bennett', 'Clarke', 'Murphy', 'Doyle', 'Fletcher', 'Reid', 'Morgan', 'Kelly', 'Barnes', 'Shaw'],
    looks: [['europeo', 6], ['africano', 3], ['asiaSur', 1]],
  },
  {
    weight: 5,
    firsts: ['Lorenzo', 'Matteo', 'Federico', 'Alessandro', 'Davide', 'Nicolò', 'Riccardo', 'Andrea', 'Simone', 'Gianluca'],
    lasts: ['Rossi', 'Bianchi', 'Romano', 'Conti', 'Esposito', 'Ricci', 'Marino', 'Greco', 'Gallo', 'Moretti'],
    looks: [['mediterraneo', 6], ['europeo', 2], ['africano', 1]],
  },
  {
    weight: 6,
    firsts: ['Théo', 'Mathis', 'Clément', 'Adrien', 'Maxime', 'Baptiste', 'Kylian', 'Ousmane', 'Youssouf', 'Enzo', 'Nolan', 'Rayan'],
    lasts: ['Martin', 'Bernard', 'Dubois', 'Lefèvre', 'Moreau', 'Laurent', 'Girard', 'Fontaine', 'Rousseau', 'Chevalier', 'Kanté', 'Mendy'],
    looks: [['europeo', 4], ['africano', 4], ['magrebi', 2]],
  },
];

/** Una identidad al azar (nombre único respecto a `taken`). */
export function randomIdentity(r: Rand, taken: Set<string>): Identity {
  for (let tries = 0; tries < 50; tries++) {
    const pool = weighted(r, POOLS.map((p) => [p, p.weight] as [NamePool, number]));
    const name = `${pick(r, pool.firsts)} ${pick(r, pool.lasts)}`;
    if (taken.has(name) && tries < 49) continue;
    taken.add(name);
    return { name, eth: weighted(r, pool.looks), face: Math.floor(r() * 2 ** 31) };
  }
  throw new Error('inalcanzable');
}

/** Nombres y rasgos de todos los futbolistas para una partida. */
export function generateRoster(ids: readonly string[], seed: number): Record<string, Identity> {
  const r = makeRand(seed ^ 0x2f6b9e13);
  const taken = new Set<string>();
  const out: Record<string, Identity> = {};
  for (const id of ids) out[id] = randomIdentity(r, taken);
  return out;
}

// ---------------------------------------------------------------- Clubes

const CLUB_PREFIX = ['Atlético', 'Real', 'Sporting', 'Unión', 'Deportivo', 'Racing', 'CF', 'Rayo', 'Athletic', 'Inter', 'Olímpico', 'Juventud', 'Recreativo', 'Club', 'CD', 'Estrella', 'Celtas', 'Albión'];
const CLUB_PLACE = [
  'Barrio', 'Ribera', 'Meseta', 'Bahía', 'Norte', 'Sur', 'Levante', 'Poniente', 'Montaña', 'Puerto', 'Vega', 'Sierra', 'Marisma',
  'Alameda', 'Valle', 'Costa', 'Arenal', 'Robledal', 'Castillo', 'Olivar', 'Atalaya', 'Faro', 'Dehesa', 'Rambla', 'Acantilado', 'Mirador',
];

/** Un nombre de club al azar que no esté en `taken`. */
export function randomClubName(r: Rand, taken: Iterable<string> = []): string {
  const used = new Set([...taken].map((n) => n.toLowerCase()));
  for (let tries = 0; tries < 60; tries++) {
    const name = `${pick(r, CLUB_PREFIX)} ${pick(r, CLUB_PLACE)}`;
    if (!used.has(name.toLowerCase()) && name.length <= 20) return name;
  }
  return `Club ${Math.floor(r() * 900) + 100}`;
}

/** Escudo al azar, con dos colores que contrasten. */
export function randomCrest(r: Rand): CrestDesign {
  const primary = pick(r, CREST_COLORS);
  let secondary = pick(r, CREST_COLORS);
  for (let i = 0; i < 10 && Math.abs(luma(secondary) - luma(primary)) < 0.25; i++) secondary = pick(r, CREST_COLORS);
  return {
    shape: Math.floor(r() * CREST_SHAPES),
    pattern: Math.floor(r() * CREST_PATTERNS),
    emblem: Math.floor(r() * CREST_EMBLEMS),
    primary,
    secondary,
  };
}

/** Luminosidad aproximada (0 negro, 1 blanco) de un color #RRGGBB. */
export function luma(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

const HEX = /^#[0-9A-Fa-f]{6}$/;
const idx = (v: unknown, max: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < max ? (v as number) : 0);
/** Valida un escudo que llega de fuera (otro dispositivo, almacenamiento). */
export function sanitizeCrest(c: unknown): CrestDesign | undefined {
  if (!c || typeof c !== 'object') return undefined;
  const o = c as Record<string, unknown>;
  if (typeof o.primary !== 'string' || typeof o.secondary !== 'string' || !HEX.test(o.primary) || !HEX.test(o.secondary)) return undefined;
  return { shape: idx(o.shape, CREST_SHAPES), pattern: idx(o.pattern, CREST_PATTERNS), emblem: idx(o.emblem, CREST_EMBLEMS), primary: o.primary, secondary: o.secondary };
}
