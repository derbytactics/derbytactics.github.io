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
  /** Futbolista de la liga femenina. */
  fem?: boolean;
}

/** Liga de la partida: cambia los nombres, las caras y algunos textos. */
export type League = 'masculina' | 'femenina' | 'mixta';
export const LEAGUES: League[] = ['masculina', 'femenina', 'mixta'];

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
  /** Nombres para la liga femenina. */
  womenFirsts: string[];
  lasts: string[];
  /** Con qué probabilidad sale cada aspecto en esta cantera. */
  looks: [Ethnicity, number][];
}

/**
 * Canteras de nombres. Los pesos imitan la mezcla de las grandes ligas europeas:
 * mayoría europea y mediterránea, en torno a un 30 % de jugadores negros, algo menos de un 10 %
 * latinoamericanos mestizos, un 5 % de origen magrebí y muy pocos asiáticos (2-3 %).
 */
const POOLS: NamePool[] = [
  {
    weight: 20,
    firsts: ['Álvaro', 'Sergio', 'Pablo', 'Iker', 'Hugo', 'Dani', 'Marc', 'Pau', 'Javi', 'Rubén', 'Unai', 'Aitor', 'Raúl', 'Adrián', 'Nacho', 'Borja', 'Íñigo', 'Gorka', 'Mario', 'Carlos', 'Izan', 'Gael', 'Yeray', 'Kiko', 'Chema', 'Isma'],
    womenFirsts: ['Alexia', 'Aitana', 'Irene', 'Jenni', 'Laia', 'Mariona', 'Olga', 'Patri', 'Salma', 'Esther', 'Lucía', 'Claudia', 'Teresa', 'Ainhoa', 'Nerea', 'Marta', 'Paula', 'Andrea', 'Leire', 'Carla'],
    lasts: ['García', 'Moreno', 'Navarro', 'Ortega', 'Castaño', 'Etxeberria', 'Ribera', 'Vidal', 'Lozano', 'Cabello', 'Llorente', 'Zubiri', 'Pons', 'Herrero', 'Sarabia', 'Gallardo', 'Arrieta', 'Montoya', 'Soler', 'Quintana', 'Cienfuegos', 'Bermejo', 'Manzanares', 'Lasarte', 'Trujillo', 'Roldán'],
    looks: [['mediterraneo', 6], ['europeo', 3], ['africano', 1.5], ['mestizo', 0.5], ['magrebi', 0.5]],
  },
  {
    weight: 9,
    firsts: ['Thiago', 'Mateo', 'Santiago', 'Joaquín', 'Facundo', 'Emiliano', 'Julián', 'Nahuel', 'Matías', 'Franco', 'Lautaro', 'Valentín', 'Sebastián', 'Agustín', 'Brayan', 'Jhon', 'Kevin', 'Wilmar'],
    womenFirsts: ['Valentina', 'Camila', 'Florencia', 'Agustina', 'Micaela', 'Lorena', 'Daniela', 'Catalina', 'Yamila', 'Linda', 'Mayra', 'Karla', 'Ximena', 'Paloma'],
    lasts: ['Paredes', 'Benítez', 'Acosta', 'Rojas', 'Medina', 'Sosa', 'Ferreyra', 'Cáceres', 'Villalba', 'Correa', 'Quiroga', 'Ledesma', 'Núñez', 'Giménez', 'Mosquera', 'Valencia', 'Arboleda', 'Cuadrado'],
    looks: [['mestizo', 5], ['mediterraneo', 3], ['africano', 2], ['europeo', 1]],
  },
  {
    weight: 7,
    firsts: ['Gabriel', 'Vinícius', 'Rodrigo', 'Lucas', 'Matheus', 'Caio', 'Rafael', 'Gustavo', 'João', 'Bruno', 'Wesley', 'Ronaldo', 'Davi', 'Luan'],
    womenFirsts: ['Ana', 'Beatriz', 'Gabriela', 'Larissa', 'Luana', 'Débora', 'Kerolin', 'Tamires', 'Raquel', 'Bia', 'Júlia', 'Letícia'],
    lasts: ['Silva', 'Souza', 'Oliveira', 'Santos', 'Costa', 'Pereira', 'Almeida', 'Ribeiro', 'Carvalho', 'Moura', 'Barbosa', 'Teixeira', 'Nascimento', 'Gomes'],
    looks: [['mestizo', 4], ['africano', 4], ['europeo', 1.5], ['mediterraneo', 0.5]],
  },
  {
    weight: 12,
    firsts: ['Samuel', 'Moussa', 'Ibrahima', 'Kwame', 'Chidi', 'Emeka', 'Seydou', 'Amadou', 'Yaw', 'Kofi', 'Ousmane', 'Babajide', 'Tunde', 'Lamine', 'Cheikh', 'Pape', 'Wilfried', 'Serge'],
    womenFirsts: ['Asisat', 'Rasheedat', 'Chiamaka', 'Ajara', 'Grace', 'Barbra', 'Thembi', 'Ifeoma', 'Aminata', 'Fatou', 'Nadège', 'Halimatu', 'Rita', 'Oluwatosin'],
    lasts: ['Okoro', 'Diallo', 'Mensah', 'Traoré', 'Adeyemi', 'Ndiaye', 'Kouassi', 'Okafor', 'Boateng', 'Sarr', 'Koné', 'Camara', 'Eze', 'Diop', 'Asante', 'Bamba', 'Touré', 'Mbeki'],
    looks: [['africano', 1]],
  },
  {
    weight: 4,
    firsts: ['Youssef', 'Hakim', 'Achraf', 'Ilias', 'Bilal', 'Amine', 'Karim', 'Nabil', 'Rachid', 'Sofiane', 'Mehdi', 'Ayoub', 'Omar', 'Zakaria', 'Moha', 'Anass'],
    womenFirsts: ['Sakina', 'Ghizlane', 'Fatima', 'Nouhaila', 'Yasmin', 'Imane', 'Salma', 'Kenza', 'Inès', 'Leila', 'Samira', 'Sanaa'],
    lasts: ['Benali', 'El Amrani', 'Rahmani', 'Haddad', 'Bennani', 'Ziani', 'Mansouri', 'Belkacem', 'Saidi', 'Tahiri', 'Lahlou', 'Cherif', 'Idrissi', 'Ouali', 'Boudiaf', 'Kaddouri'],
    looks: [['magrebi', 6], ['africano', 1]],
  },
  {
    weight: 1,
    firsts: ['Kenta', 'Takumi', 'Daichi', 'Ren', 'Haruto', 'Sota', 'Yuto', 'Kaoru', 'Ritsu', 'Hiroki'],
    womenFirsts: ['Yui', 'Hina', 'Mana', 'Saki', 'Riko', 'Aoba', 'Yuka', 'Nanami'],
    lasts: ['Tanaka', 'Sato', 'Nakamura', 'Kobayashi', 'Watanabe', 'Ito', 'Yamamoto', 'Kubo', 'Endo', 'Mori'],
    looks: [['asiaEste', 1]],
  },
  {
    weight: 0.8,
    firsts: ['Min-jun', 'Ji-ho', 'Seung-woo', 'Hyun', 'Dong-hyun', 'Jae-sung', 'Tae-yang', 'Sang-ho'],
    womenFirsts: ['Ji-so', 'Min-ji', 'Seo-yeon', 'Ha-eun', 'Yu-jin', 'Da-eun'],
    lasts: ['Kim', 'Park', 'Lee', 'Choi', 'Jung', 'Kang', 'Hwang', 'Son'],
    looks: [['asiaEste', 1]],
  },
  {
    weight: 0.2,
    firsts: ['Wei', 'Hao', 'Jun', 'Lei', 'Bo', 'Zhen', 'Yang', 'Tao'],
    womenFirsts: ['Shuang', 'Li', 'Xin', 'Yan', 'Mei', 'Ying'],
    lasts: ['Chen', 'Wang', 'Zhang', 'Liu', 'Huang', 'Zhao', 'Wu', 'Lin'],
    looks: [['asiaEste', 1]],
  },
  {
    weight: 0.6,
    firsts: ['Arjun', 'Rohan', 'Vikram', 'Aarav', 'Imran', 'Faisal', 'Sunil', 'Karan', 'Ravi', 'Hamza', 'Zayn', 'Dev'],
    womenFirsts: ['Priya', 'Ananya', 'Aditi', 'Sana', 'Ayesha', 'Kavya', 'Nisha', 'Meera'],
    lasts: ['Sharma', 'Singh', 'Patel', 'Khan', 'Iqbal', 'Rao', 'Chowdhury', 'Mehta', 'Malik', 'Gill', 'Nair', 'Ahmed'],
    looks: [['asiaSur', 1]],
  },
  {
    weight: 4,
    firsts: ['Lars', 'Erik', 'Magnus', 'Mikkel', 'Oskar', 'Rasmus', 'Viktor', 'Emil', 'Henrik', 'Sindre'],
    womenFirsts: ['Ada', 'Caroline', 'Fridolina', 'Hanna', 'Ingrid', 'Sofie', 'Stina', 'Maja', 'Tuva', 'Frida'],
    lasts: ['Hansen', 'Larsen', 'Lindqvist', 'Berg', 'Nilsson', 'Andersen', 'Solberg', 'Holm', 'Dahl', 'Eriksen'],
    looks: [['europeo', 8], ['africano', 2]],
  },
  {
    weight: 6,
    firsts: ['Jonas', 'Niklas', 'Lukas', 'Timo', 'Jannik', 'Leon', 'Florian', 'Kai', 'Moritz', 'Felix'],
    womenFirsts: ['Lena', 'Lea', 'Klara', 'Sara', 'Jule', 'Giulia', 'Kathrin', 'Svenja', 'Merle', 'Alexandra'],
    lasts: ['Müller', 'Schneider', 'Becker', 'Vogel', 'Krämer', 'Hoffmann', 'Wagner', 'Fischer', 'Brandt', 'Weber'],
    looks: [['europeo', 6], ['africano', 2], ['magrebi', 0.5]],
  },
  {
    weight: 6,
    firsts: ['Luka', 'Ivan', 'Dmitri', 'Marko', 'Petar', 'Andrei', 'Filip', 'Nikola', 'Bogdan', 'Mateusz', 'Kamil', 'Dušan'],
    womenFirsts: ['Ana', 'Ivana', 'Katarina', 'Ewa', 'Natalia', 'Milena', 'Jelena', 'Daria', 'Petra', 'Nikolina'],
    lasts: ['Petrović', 'Kovač', 'Novak', 'Horvat', 'Ivanov', 'Popescu', 'Kowalski', 'Nowak', 'Jovanović', 'Marić', 'Babić', 'Dragan'],
    looks: [['europeo', 1]],
  },
  {
    weight: 8,
    firsts: ['Jack', 'Harry', 'Callum', 'Liam', 'Ryan', 'Connor', 'Owen', 'Jamie', 'Tyler', 'Mason', 'Kieran', 'Reece'],
    womenFirsts: ['Lucy', 'Beth', 'Ella', 'Georgia', 'Lauren', 'Chloe', 'Alessia', 'Keira', 'Millie', 'Jess', 'Hannah', 'Grace'],
    lasts: ['Walker', 'Hughes', 'Bennett', 'Clarke', 'Murphy', 'Doyle', 'Fletcher', 'Reid', 'Morgan', 'Kelly', 'Barnes', 'Shaw'],
    looks: [['europeo', 6], ['africano', 3], ['asiaSur', 0.3]],
  },
  {
    weight: 6,
    firsts: ['Lorenzo', 'Matteo', 'Federico', 'Alessandro', 'Davide', 'Nicolò', 'Riccardo', 'Andrea', 'Simone', 'Gianluca'],
    womenFirsts: ['Barbara', 'Cristiana', 'Sara', 'Valentina', 'Martina', 'Giulia', 'Arianna', 'Elisa', 'Chiara', 'Manuela'],
    lasts: ['Rossi', 'Bianchi', 'Romano', 'Conti', 'Esposito', 'Ricci', 'Marino', 'Greco', 'Gallo', 'Moretti'],
    looks: [['mediterraneo', 5], ['europeo', 2], ['africano', 1]],
  },
  {
    weight: 9,
    firsts: ['Théo', 'Mathis', 'Clément', 'Adrien', 'Maxime', 'Baptiste', 'Kylian', 'Ousmane', 'Youssouf', 'Enzo', 'Nolan', 'Rayan'],
    womenFirsts: ['Amandine', 'Eugénie', 'Kadidiatou', 'Wendie', 'Marie', 'Delphine', 'Grace', 'Selma', 'Clara', 'Maëlle', 'Inès', 'Sandie'],
    lasts: ['Martin', 'Bernard', 'Dubois', 'Lefèvre', 'Moreau', 'Laurent', 'Girard', 'Fontaine', 'Rousseau', 'Chevalier', 'Kanté', 'Mendy'],
    looks: [['africano', 4], ['europeo', 4], ['magrebi', 1.5]],
  },
];

/** Apellido en femenino donde la lengua lo distingue (Kowalski → Kowalska, Ivanov → Ivanova). */
function womanSurname(last: string): string {
  if (/ski$/.test(last)) return last.replace(/ski$/, 'ska');
  if (/(ov|ev)$/.test(last)) return `${last}a`;
  return last;
}

/** Una identidad al azar (nombre único respecto a `taken`). */
export function randomIdentity(r: Rand, taken: Set<string>, fem = false): Identity {
  for (let tries = 0; tries < 50; tries++) {
    const pool = weighted(r, POOLS.map((p) => [p, p.weight] as [NamePool, number]));
    const last = pick(r, pool.lasts);
    const name = fem ? `${pick(r, pool.womenFirsts)} ${womanSurname(last)}` : `${pick(r, pool.firsts)} ${last}`;
    if (taken.has(name) && tries < 49) continue;
    taken.add(name);
    return { name, eth: weighted(r, pool.looks), face: Math.floor(r() * 2 ** 31), ...(fem ? { fem: true } : {}) };
  }
  throw new Error('inalcanzable');
}

/** Nombres y rasgos de todos los futbolistas para una partida. */
export function generateRoster(ids: readonly string[], seed: number, league: League = 'masculina'): Record<string, Identity> {
  const r = makeRand(seed ^ 0x2f6b9e13);
  const taken = new Set<string>();
  const out: Record<string, Identity> = {};
  // En la mixta, cada futbolista es jugador o jugadora a partes iguales.
  for (const id of ids) out[id] = randomIdentity(r, taken, league === 'femenina' || (league === 'mixta' && r() < 0.5));
  return out;
}

/**
 * Palabras que cambian con la liga. Con `cardId`, concuerdan con ese futbolista (en la liga mixta
 * cada uno tiene su género); sin él, en la mixta se usa el genérico.
 */
export function words(state: { league?: League; roster?: Record<string, Identity> }, cardId?: string) {
  const f = state.league === 'femenina' || (state.league === 'mixta' && !!cardId && !!state.roster?.[cardId]?.fem);
  return {
    fem: f,
    keeper: f ? 'portera' : 'portero',
    keepers: f ? 'porteras' : 'porteros',
    forward: f ? 'delantera' : 'delantero',
    forwards: f ? 'delanteras' : 'delanteros',
    mids: f ? 'medias' : 'medios',
    backs: f ? 'defensas' : 'defensas',
    /** «ese»/«esa» futbolista */
    that: f ? 'esa' : 'ese',
    That: f ? 'Esa' : 'Ese',
    /** «uno»/«una» */
    one: f ? 'una' : 'uno',
    /** pronombre de objeto: véndelo / véndela */
    it: f ? 'la' : 'lo',
    the: f ? 'la' : 'el',
    The: f ? 'La' : 'El',
    sentOff: f ? 'expulsada' : 'expulsado',
    booked: f ? 'amonestada' : 'amonestado',
    protectedW: f ? 'protegida' : 'protegido',
    shielded: f ? 'blindada' : 'blindado',
    yours: f ? 'tuya' : 'tuyo',
    injured: f ? 'lesionada' : 'lesionado',
  };
}

/**
 * Palabras de las reglas y los consejos según la liga. En la femenina, todo en femenino; en la
 * masculina y en la mixta, el genérico (en castellano, el de un grupo mixto).
 */
export function ruleWords(league: League | undefined) {
  const f = league === 'femenina';
  return {
    fem: f,
    /** un portero / una portera */
    aKeeper: f ? 'una portera' : 'un portero',
    theKeeper: f ? 'la portera' : 'el portero',
    theKeepers: f ? 'las porteras' : 'los porteros',
    toTheKeeper: f ? 'a la portera' : 'al portero',
    yourKeeper: f ? 'su portera' : 'su portero',
    Keeper: f ? 'Portera' : 'Portero',
    keeper: f ? 'portera' : 'portero',
    aForward: f ? 'una delantera' : 'un delantero',
    eachForward: f ? 'cada delantera' : 'cada delantero',
    forwards: f ? 'delanteras' : 'delanteros',
    theForwards: f ? 'las delanteras' : 'los delanteros',
    Forward: f ? 'Delantera' : 'Delantero',
    eachMid: f ? 'cada media' : 'cada medio',
    mids: f ? 'medias' : 'medios',
    Mid: f ? 'Media' : 'Medio',
    aBack: f ? 'una defensa' : 'un defensa',
    eachBack: f ? 'cada defensa' : 'cada defensa',
    theBacks: f ? 'las defensas' : 'los defensas',
    yourBacks: f ? 'sus defensas' : 'sus defensas',
    players: f ? 'jugadoras' : 'jugadores',
    /** «uno o dos» */
    oneOrTwo: f ? 'una o dos' : 'uno o dos',
    yours: f ? 'tuya' : 'tuyo',
    /** «El que se quede» / «La que se quede» */
    theOne: f ? 'La que' : 'El que',
    theOnes: f ? 'Las' : 'Los',
    /** «te lo llevas» / «te la llevas» */
    it: f ? 'la' : 'lo',
  };
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
