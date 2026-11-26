/**
 * Uso del juego, anónimo: qué modo se juega, con cuántos clubes, en qué nivel y cómo acaba.
 * Sin cuenta ni identificador del dispositivo. Sirve para decidir qué mejorar.
 */
import { Platform } from 'react-native';
import { GameState, levelOf, standings } from '../engine';
import { load, save } from '../net/storage';
import { backendEnabled, rpc } from './api';

export type UsageMode = 'amistoso' | 'reto' | 'carrera' | 'guiada' | 'enLinea' | 'cercana';
type Kind = 'start' | 'finish' | 'abandon';

const KEY = 'futcards.usage.v1';

/** El modo de una partida, visto desde este dispositivo. */
export function usageMode(game: GameState, online: false | 'enLinea' | 'cercana'): UsageMode {
  if (online) return online;
  if (game.tutorial) return 'guiada';
  if (game.daily) return 'reto';
  if (game.career) return 'carrera';
  return 'amistoso';
}

/** Apunta un evento (una sola vez por partida y tipo en este dispositivo). No espera ni falla. */
export function logUsage(kind: Kind, game: GameState, mode: UsageMode, seat: number | null) {
  if (!backendEnabled()) return;
  const id = `${kind}:${game.gameId ?? ''}:${game.daily ?? ''}:${game.career?.season ?? ''}`;
  const seen = load<string[]>(KEY) ?? [];
  if (seen.includes(id)) return;
  save(KEY, [...seen, id].slice(-60));
  const bot = game.players.find((p) => p.isBot);
  const me = seat !== null ? game.players[seat] : null;
  const position = kind === 'finish' && me ? standings(game).findIndex((p) => p.id === me.id) + 1 : null;
  rpc(
    'log_usage',
    {
      p_kind: kind,
      p_mode: mode,
      p_clubs: game.players.length,
      p_level: bot ? levelOf(bot) : null,
      p_league: game.league ?? 'masculina',
      p_jornada: game.jornada,
      p_jornadas: game.totalJornadas,
      p_position: position,
      p_platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web',
    },
    false,
  ).catch(() => {});
}
