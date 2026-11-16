/**
 * Cuentas de usuario sobre Supabase, hablando directamente con sus API HTTP
 * (autenticación y funciones SQL de supabase/schema.sql). Sin dependencias.
 *
 * Si no hay servidor configurado, `backendEnabled()` es false y el juego funciona sin cuentas.
 */
import { load, remove, save } from '../net/storage';

interface Backend {
  url: string;
  key: string;
}
function backend(): Backend | null {
  const injected = (globalThis as { __FUTCARDS_BACKEND__?: Backend }).__FUTCARDS_BACKEND__;
  if (injected) return injected;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url: url.replace(/\/$/, ''), key } : null;
}
export const backendEnabled = () => backend() !== null;

export interface Session {
  access_token: string;
  refresh_token: string;
  /** Segundos desde 1970. */
  expires_at: number;
  user: { id: string; email: string };
}
export interface Profile {
  id: string;
  username: string;
  games: number;
  wins: number;
  host_games: number;
  host_abandons: number;
  host_banned_until: string | null;
  stars: number | null;
  votes: number;
}
export interface HostCard {
  username: string;
  host_games: number;
  host_abandons: number;
  stars: number | null;
  votes: number;
}
export interface RankingRow {
  username: string;
  wins: number;
  games: number;
  stars: number | null;
  host_games: number;
}
export interface HistoryRow {
  id: string;
  code: string;
  status: 'playing' | 'finished' | 'abandoned';
  ranked: boolean;
  started_at: string;
  i_hosted: boolean;
  host: string;
  position: number | null;
  points: number | null;
  goals: number | null;
  my_rating: number | null;
  players: { name: string; position: number | null; points: number | null; is_bot: boolean; registered: boolean }[];
}

const SESSION_KEY = 'futcards.session';
const MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, 'Correo o contraseña incorrectos.'],
  [/already registered|already been registered/i, 'Ya hay una cuenta con ese correo.'],
  [/email not confirmed/i, 'Confirma tu correo con el enlace que te hemos enviado.'],
  [/password should be at least|weak password/i, 'La contraseña debe tener al menos 6 caracteres.'],
  [/valid email|invalid format|invalid email/i, 'Ese correo no parece válido.'],
  [/rate limit|too many/i, 'Demasiados intentos. Espera un momento.'],
  [/failed to fetch|network/i, 'No hay conexión con el servidor.'],
];
function friendly(raw: string): string {
  return MESSAGES.find(([re]) => re.test(raw))?.[1] ?? raw;
}

async function call<T>(path: string, init: { method?: string; body?: unknown; token?: string | null } = {}): Promise<T> {
  const b = backend();
  if (!b) throw new Error('Las cuentas no están configuradas en este servidor.');
  let res: Response;
  try {
    res = await fetch(b.url + path, {
      method: init.method ?? 'POST',
      // La cabecera Authorization solo lleva la sesión del usuario; sin sesión basta con la clave pública.
      headers: { apikey: b.key, ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}), 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new Error('No hay conexión con el servidor.');
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    const d = (data ?? {}) as Record<string, string>;
    throw new Error(friendly(d.msg ?? d.message ?? d.error_description ?? d.error ?? `Error ${res.status}`));
  }
  return data as T;
}

// ---------------------------------------------------------------- Estado de la cuenta

interface AccountState {
  session: Session | null;
  profile: Profile | null;
  /** Ha llegado por un enlace de «olvidé mi contraseña» y debe elegir una nueva. */
  recovering: boolean;
  /** El enlace del correo (confirmación o contraseña) ha fallado: motivo para enseñar. */
  linkError: string | null;
}
let state: AccountState = { session: load<Session>(SESSION_KEY), profile: null, recovering: false, linkError: null };
const listeners = new Set<() => void>();
function set(patch: Partial<AccountState>) {
  state = { ...state, ...patch };
  if ('session' in patch) patch.session ? save(SESSION_KEY, patch.session) : remove(SESSION_KEY);
  listeners.forEach((l) => l());
}
export const getAccount = () => state;
export function subscribeAccount(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

type AuthResponse = { access_token?: string; refresh_token?: string; expires_in?: number; user?: { id: string; email: string } };
function toSession(r: AuthResponse): Session | null {
  if (!r.access_token || !r.refresh_token || !r.user) return null;
  return { access_token: r.access_token, refresh_token: r.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (r.expires_in ?? 3600), user: { id: r.user.id, email: r.user.email } };
}

let refreshing: Promise<string | null> | null = null;
/** Token válido de la sesión actual (lo renueva si está a punto de caducar), o null. */
async function token(): Promise<string | null> {
  const s = state.session;
  if (!s) return null;
  if (s.expires_at - 60 > Date.now() / 1000) return s.access_token;
  refreshing ??= call<AuthResponse>('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: s.refresh_token } })
    .then((r) => {
      const next = toSession(r);
      set({ session: next, ...(next ? {} : { profile: null }) });
      return next?.access_token ?? null;
    })
    .catch(() => {
      set({ session: null, profile: null });
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/** Llama a una función SQL. Con `auth`, exige sesión. */
export async function rpc<T>(fn: string, args: Record<string, unknown> = {}, auth = true): Promise<T> {
  const t = await token();
  if (auth && !t) throw new Error('Inicia sesión.');
  return call<T>(`/rest/v1/rpc/${fn}`, { body: args, token: t });
}

const here = () => {
  const loc = (globalThis as { location?: Location }).location;
  return loc?.origin ? loc.origin + loc.pathname : undefined;
};
const redirect = () => (here() ? `?redirect_to=${encodeURIComponent(here()!)}` : '');

export async function refreshProfile(): Promise<Profile | null> {
  if (!state.session) return null;
  try {
    const profile = await rpc<Profile>('my_profile');
    set({ profile });
    return profile;
  } catch {
    return state.profile;
  }
}

/** Devuelve true si la cuenta queda iniciada; false si falta confirmar el correo. */
export async function signUp(email: string, password: string, username: string): Promise<boolean> {
  if (!(await rpc<boolean>('username_available', { p_username: username }, false))) {
    throw new Error('Ese nombre no está disponible: usa de 3 a 16 letras, números o espacios.');
  }
  const r = await call<AuthResponse>(`/auth/v1/signup${redirect()}`, { body: { email: email.trim(), password, data: { username: username.trim() } } });
  const session = toSession(r);
  if (!session) return false;
  set({ session });
  await refreshProfile();
  return true;
}

export async function signIn(email: string, password: string): Promise<void> {
  const r = await call<AuthResponse>('/auth/v1/token?grant_type=password', { body: { email: email.trim(), password } });
  set({ session: toSession(r) });
  await refreshProfile();
}

export async function signOut(): Promise<void> {
  const t = state.session?.access_token;
  set({ session: null, profile: null, recovering: false });
  if (t) await call('/auth/v1/logout', { token: t }).catch(() => {});
}

/** Vuelve a enviar el correo de confirmación de una cuenta recién creada. */
export async function resendConfirmation(email: string): Promise<void> {
  await call(`/auth/v1/resend${redirect()}`, { body: { type: 'signup', email: email.trim() } });
}
export const clearLinkError = () => set({ linkError: null });

export async function requestPasswordReset(email: string): Promise<void> {
  await call(`/auth/v1/recover${redirect()}`, { body: { email: email.trim() } });
}

export async function setNewPassword(password: string): Promise<void> {
  await call('/auth/v1/user', { method: 'PUT', body: { password }, token: await token() });
  set({ recovering: false });
}

export async function deleteAccount(): Promise<void> {
  await rpc('delete_my_account');
  set({ session: null, profile: null });
}

/**
 * Al abrir la app: recoge la sesión que llega en el enlace de confirmación de correo
 * o de cambio de contraseña, y carga el perfil.
 */
export async function initAccount(): Promise<void> {
  if (!backendEnabled()) return;
  const loc = (globalThis as { location?: Location }).location;
  const hash = new URLSearchParams((loc?.hash ?? '').replace(/^#/, ''));
  if (hash.get('error') || hash.get('error_code')) {
    const expired = /expired|invalid/i.test(`${hash.get('error_code')} ${hash.get('error_description')}`);
    set({
      linkError: expired
        ? 'Ese enlace ya se ha usado o ha caducado. Si tu cuenta ya quedó confirmada, entra con tu correo y contraseña; si no, pide que te reenviemos el correo.'
        : `El enlace no ha funcionado: ${hash.get('error_description') ?? hash.get('error')}`,
    });
    try {
      (globalThis as { history?: History }).history?.replaceState(null, '', loc!.pathname + loc!.search);
    } catch {}
  }
  const access = hash.get('access_token');
  const refresh = hash.get('refresh_token');
  if (access && refresh) {
    try {
      const user = await call<{ id: string; email: string }>('/auth/v1/user', { method: 'GET', token: access });
      set({
        session: { access_token: access, refresh_token: refresh, expires_at: Math.floor(Date.now() / 1000) + Number(hash.get('expires_in') ?? 3600), user: { id: user.id, email: user.email } },
        recovering: hash.get('type') === 'recovery',
      });
    } catch {}
    try {
      (globalThis as { history?: History }).history?.replaceState(null, '', loc!.pathname + loc!.search);
    } catch {}
  }
  await refreshProfile();
}
