/**
 * Avisos push «Te toca» en las salas en línea (solo app nativa y con cuenta).
 *
 * - Cada invitado con cuenta, al entrar en una sala, pide permiso de avisos y guarda en Supabase
 *   el identificador de avisos de su móvil (Expo).
 * - Cuando a un invitado le toca, el móvil del anfitrión pide a Supabase que le avise
 *   (`notify_turn`), y Supabase manda el aviso con el servicio de Expo.
 * - Con la app en pantalla no se enseña el aviso (ya vibra y suena); al tocarlo, se vuelve a la sala.
 */
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { load, remove, save } from '../net/storage';
import { TurnKind } from '../net/turns';
import { backendEnabled, getAccount, rpc } from './api';

const TOKEN_KEY = 'futcards.push.token';
const native = Platform.OS === 'ios' || Platform.OS === 'android';
const signedIn = () => backendEnabled() && !!getAccount().session;

if (native) {
  // Con la app abierta no hace falta el aviso: el juego ya vibra y pita cuando te toca.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

/** Pide permiso (la primera vez) y guarda el identificador de avisos de este móvil en la cuenta. */
export async function enablePush(): Promise<boolean> {
  if (!native || !signedIn()) return false;
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return false;
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (load<string>(TOKEN_KEY) !== token || !load<boolean>(`${TOKEN_KEY}.sent`)) {
      await rpc('set_push_token', { p_token: token });
      save(TOKEN_KEY, token);
      save(`${TOKEN_KEY}.sent`, true);
    }
    return true;
  } catch {
    // Sin permiso, sin red o en el simulador: se juega igual, solo que sin avisos.
    return false;
  }
}

/** Al cerrar sesión: este móvil deja de recibir los avisos de la cuenta. */
export async function disablePush(): Promise<void> {
  const token = load<string>(TOKEN_KEY);
  remove(`${TOKEN_KEY}.sent`);
  if (!token || !signedIn()) return;
  await rpc('clear_push_token', { p_token: token }).catch(() => {});
}

/** Anfitrión: avisa al invitado del asiento `seat` de que le toca. No espera ni falla. */
export function notifyTurn(gameId: string, seat: number, kind: TurnKind) {
  if (!signedIn()) return;
  rpc('notify_turn', { p_game: gameId, p_seat: seat, p_kind: kind }).catch(() => {});
}

/**
 * Al tocar un aviso (con la app abierta, en segundo plano o cerrada), entrega el código de la
 * sala para volver a ella. Devuelve la función para dejar de escuchar.
 */
const handled = new Set<string>();
export function onPushOpen(open: (code: string) => void): () => void {
  if (!native) return () => {};
  const handle = (r: Notifications.NotificationResponse | null) => {
    // Cada aviso se atiende una vez (al volver a montar, el último sigue ahí).
    const id = r?.notification.request.identifier;
    if (!id || handled.has(id)) return;
    handled.add(id);
    const code = (r?.notification.request.content.data as { code?: unknown } | undefined)?.code;
    if (typeof code === 'string' && /^[A-Z]{5}$/.test(code)) open(code);
  };
  Notifications.getLastNotificationResponseAsync().then(handle, () => {});
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
