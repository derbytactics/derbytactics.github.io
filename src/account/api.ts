/**
 * Cuentas de usuario sobre Supabase, hablando directamente con sus API HTTP
 * (autenticación y funciones SQL de supabase/schema.sql). Sin dependencias.
 *
 * Si no hay servidor configurado, `backendEnabled()` es false y el juego funciona sin cuentas.
 */
import { isOffensive } from '../engine/moderation';
import { load, remove, save } from '../net/storage';

interface Backend {
  url: string;
  key: string;
}
export function backend(): Backend | null {
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
  avatar?: string | null;
  /** Club guardado en la cuenta (nombre y escudo), si ya tiene. */
  club?: { name: string; crest: unknown } | null;
  /** Entró con Google o Apple y todavía no ha elegido nombre de usuario. */
  needs_username?: boolean;
}

/** Proveedores externos con los que se puede entrar. */
export type Provider = 'google' | 'apple';
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
  /** Entrar con Google o Apple ha fallado o se ha cancelado: motivo para enseñar. */
  linkError: string | null;
  /** Avatar elegido (se guarda en el dispositivo y, con cuenta, también en el perfil). */
  avatar: string;
  /** Proveedores externos activados en Supabase (solo en el navegador). */
  providers: Provider[];
}
const AVATAR_KEY = 'futcards.avatar';
let state: AccountState = { session: load<Session>(SESSION_KEY), profile: null, linkError: null, avatar: load<string>(AVATAR_KEY) ?? 'a1', providers: [] };
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


export async function refreshProfile(): Promise<Profile | null> {
  if (!state.session) return null;
  try {
    const profile = await rpc<Profile>('my_profile');
    set({ profile, ...(profile?.avatar ? { avatar: profile.avatar } : {}) });
    if (profile?.avatar) save(AVATAR_KEY, profile.avatar);
    // Cuenta sin avatar todavía: hereda el que se eligió en este dispositivo.
    else if (profile) rpc('set_avatar', { p_avatar: state.avatar }).catch(() => {});
    return profile;
  } catch {
    return state.profile;
  }
}



/** Dirección a la que vuelve la app nativa tras entrar (esquema `scheme` de app.json). */
const NATIVE_RETURN = 'derbytactics://auth';

/** Crea la sesión con los datos que devuelve Supabase al volver de Google o Apple. */
async function acceptTokens(params: URLSearchParams): Promise<boolean> {
  const access = params.get('access_token');
  const refresh = params.get('refresh_token');
  if (!access || !refresh) return false;
  try {
    const user = await call<{ id: string; email: string }>('/auth/v1/user', { method: 'GET', token: access });
    set({
      session: { access_token: access, refresh_token: refresh, expires_at: Math.floor(Date.now() / 1000) + Number(params.get('expires_in') ?? 3600), user: { id: user.id, email: user.email } },
    });
    return true;
  } catch {
    return false;
  }
}

/** Mensaje para un error devuelto por Google o Apple, o null si no lo hay. */
function oauthError(params: URLSearchParams): string | null {
  if (!params.get('error') && !params.get('error_code')) return null;
  const detail = `${params.get('error')} ${params.get('error_code')} ${params.get('error_description')}`;
  if (/access_denied|cancel/i.test(detail)) return 'Has cancelado el acceso. Puedes intentarlo de nuevo cuando quieras.';
  return `No se ha podido entrar: ${params.get('error_description') ?? params.get('error')}`;
}

/**
 * Entra con Google o Apple.
 * En el navegador, la página va a su pantalla y vuelve a esta misma dirección (con la sala, si la hay);
 * la sesión llega en el fragmento y la recoge `initAccount`.
 * En la app nativa se abre una sesión segura del sistema que vuelve a `derbytactics://auth`.
 */
export async function signInWith(provider: Provider): Promise<void> {
  const b = backend();
  if (!b) return;
  const loc = (globalThis as { location?: Location }).location;
  if (loc?.assign) {
    const back = loc.origin + loc.pathname + loc.search;
    loc.assign(`${b.url}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(back)}`);
    return;
  }
  // iPhone: ventana nativa de Apple (sin web ni clave que caduque); el token se canjea en Supabase.
  if (provider === 'apple' && (await import('react-native')).Platform.OS === 'ios') return signInWithAppleNative();
  const WebBrowser = await import('expo-web-browser');
  const r = await WebBrowser.openAuthSessionAsync(`${b.url}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(NATIVE_RETURN)}`, NATIVE_RETURN);
  if (r.type !== 'success') return; // Cerrado por el usuario.
  const [beforeHash, fragment = ''] = r.url.split('#');
  const params = new URLSearchParams(fragment);
  const error = oauthError(new URLSearchParams(beforeHash.split('?')[1] ?? '')) ?? oauthError(params);
  if (error) {
    set({ linkError: error });
    return;
  }
  set({ linkError: null });
  if (await acceptTokens(params)) await refreshProfile();
}

async function signInWithAppleNative(): Promise<void> {
  const Apple = await import('expo-apple-authentication');
  let token: string | null;
  try {
    // Solo el correo: el nombre real no hace falta (cada jugador elige su nombre de usuario).
    token = (await Apple.signInAsync({ requestedScopes: [Apple.AppleAuthenticationScope.EMAIL] })).identityToken;
  } catch (e) {
    if ((e as { code?: string }).code !== 'ERR_REQUEST_CANCELED') set({ linkError: 'No se ha podido entrar con Apple. Inténtalo de nuevo.' });
    return;
  }
  if (!token) return set({ linkError: 'Apple no ha devuelto la identificación. Inténtalo de nuevo.' });
  try {
    const session = toSession(await call<AuthResponse>('/auth/v1/token?grant_type=id_token', { body: { provider: 'apple', id_token: token } }));
    if (!session) throw new Error('Sin sesión.');
    set({ session, linkError: null });
    await refreshProfile();
  } catch (e) {
    set({ linkError: `No se ha podido entrar con Apple: ${(e as Error).message}` });
  }
}

/** Elige el nombre de usuario (la primera vez tras entrar con Google o Apple, o para cambiarlo). */
export async function chooseUsername(name: string): Promise<void> {
  if (isOffensive(name)) throw new Error('Ese nombre no está permitido. Elige otro.');
  if (!(await rpc<boolean>('username_available', { p_username: name }, false))) {
    throw new Error('Ese nombre no está disponible: usa de 3 a 16 letras, números o espacios.');
  }
  await rpc('set_username', { p_username: name });
  await refreshProfile();
}

async function loadProviders(): Promise<void> {
  try {
    const st = await call<{ external?: Record<string, boolean> }>('/auth/v1/settings', { method: 'GET' });
    set({ providers: (['google', 'apple'] as Provider[]).filter((p) => st.external?.[p]) });
  } catch {}
}

export async function signOut(): Promise<void> {
  const t = state.session?.access_token;
  set({ session: null, profile: null });
  if (t) await call('/auth/v1/logout', { token: t }).catch(() => {});
}

export function setAvatar(id: string) {
  save(AVATAR_KEY, id);
  set({ avatar: id });
  if (state.session) rpc('set_avatar', { p_avatar: id }).catch(() => {});
}




export async function deleteAccount(): Promise<void> {
  await rpc('delete_my_account');
  set({ session: null, profile: null });
}

/**
 * Al abrir la app: recoge la sesión (o el error) que devuelven Google o Apple al volver, y carga el perfil.
 */
export async function initAccount(): Promise<void> {
  // En la app nativa lo guardado se carga después de arrancar: se vuelve a leer aquí.
  set({ session: load<Session>(SESSION_KEY), avatar: load<string>(AVATAR_KEY) ?? state.avatar });
  if (!backendEnabled()) return;
  const loc = (globalThis as { location?: Location }).location;
  void loadProviders();
  const hash = new URLSearchParams((loc?.hash ?? '').replace(/^#/, ''));
  // Google o Apple pueden devolver un error en la consulta (?error=…) o en el fragmento.
  const query = new URLSearchParams(loc?.search ?? '');
  const error = oauthError(query) ?? oauthError(hash);
  if (error) {
    set({ linkError: error });
    for (const k of ['error', 'error_code', 'error_description']) query.delete(k);
    try {
      const q = query.toString();
      (globalThis as { history?: History }).history?.replaceState(null, '', loc!.pathname + (q ? `?${q}` : ''));
    } catch {}
  }
  if (hash.get('access_token')) {
    await acceptTokens(hash);
    try {
      (globalThis as { history?: History }).history?.replaceState(null, '', loc!.pathname + loc!.search);
    } catch {}
  }
  await refreshProfile();
}
