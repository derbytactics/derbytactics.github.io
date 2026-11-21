/**
 * Filtro de nombres ofensivos (usuarios y clubes). La misma lista y la misma lógica están en
 * `supabase/schema.sql` (función `is_offensive`), para que no se pueda saltar desde fuera de la app;
 * un test comprueba que las listas coinciden.
 *
 * Cómo se compara: se quitan tildes, se pasa a minúsculas, se deshacen los trucos habituales
 * (0→o, 1→i, 3→e, 4→a, 5→s, 7→t, @→a, $→s) y se juntan las letras repetidas ("puuuta" → "puta").
 * El nombre se parte en palabras por espacios, signos y mayúsculas internas ("ElCulo" → "el culo").
 * - EXACT: una palabra es la raíz o su plural ("Culo FC"), para no bloquear "Penedès" o "Vergara".
 * - PREFIX: una palabra empieza por la raíz ("Mierdoso").
 * - ANYWHERE: la raíz aparece en cualquier parte del nombre, aunque esté pegada ("ElGilipollasFC").
 * - REPEATED: siglas de letras repetidas, que se comparan sin juntar letras ("KKK").
 */

export const BLOCKED_EXACT = [
  'puta', 'puto', 'culo', 'cono', 'pene', 'polla', 'verga', 'chocho', 'ojete', 'zorra', 'marica', 'nazi', 'idiota',
  'dick', 'cock', 'mamon',
];

export const BLOCKED_PREFIX = [
  'mierd', 'joder', 'follar', 'imbecil', 'sudaca', 'travelo', 'bollera', 'porno', 'hdp', 'heil',
  'fuck', 'shit', 'bitch', 'cunt', 'whore', 'slut', 'nigga',
];

export const BLOCKED_ANYWHERE = [
  'hijoputa', 'hijodeputa', 'putamadre', 'gilipollas', 'maricon', 'cabron', 'subnormal', 'retrasado', 'mongolo',
  'pedofilo', 'violador', 'negrata', 'hitler', 'siegheil', 'nigger', 'faggot', 'motherfucker',
];

export const BLOCKED_REPEATED = ['kkk', 'xxx'];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };

/** Minúsculas, sin tildes, sin trucos de números y sin letras repetidas. */
export function normalizeWord(w: string): string {
  return w
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[013457@$]/g, (c) => LEET[c])
    .replace(/[^a-z]/g, '')
    .replace(/(.)\1+/g, '$1');
}

const EXACT = BLOCKED_EXACT.map(normalizeWord);
const PREFIX = BLOCKED_PREFIX.map(normalizeWord);
const ANYWHERE = BLOCKED_ANYWHERE.map(normalizeWord);

/** True si el nombre contiene algo de la lista. */
export function isOffensive(name: string): boolean {
  const words = name
    .replace(/([a-záéíóúüñ])([A-ZÁÉÍÓÚÜÑ])/g, '$1 $2')
    .split(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9@$]+/)
    .map(normalizeWord)
    .filter(Boolean);
  const joined = words.join('');
  const plain = name.toLowerCase().replace(/[^a-z]/g, '');
  return (
    BLOCKED_REPEATED.some((r) => plain.includes(r)) ||
    words.some((w) => EXACT.some((r) => w === r || w === r + 's' || w === r + 'es')) ||
    words.some((w) => PREFIX.some((r) => w.startsWith(r))) ||
    ANYWHERE.some((r) => joined.includes(r))
  );
}
