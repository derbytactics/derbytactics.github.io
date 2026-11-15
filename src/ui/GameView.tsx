import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Action, GameState, currentPlayer } from '../engine';
import { Crest } from './art';
import { Btn, Chronicle, Overline, PhaseStepper, StandingsTable, jornadaLabel, s } from './components';
import { EndScreen } from './EndScreen';
import { GameScreen } from './GameScreen';
import { KickoffScreen, MatchScreen } from './MatchScreen';
import { C, clubColor } from './theme';

export interface OnlineInfo {
  isHost: boolean;
  connected: boolean;
  iAmReady: boolean;
  /** Nombres de quienes aún no han pulsado «Listo» tras el reparto. */
  waitingFor: string[];
  onReady: () => void;
  onForceNext?: () => void;
  onBotTurn?: () => void;
}

/**
 * Muestra la partida en la fase que toque.
 * `seat` es el club de este dispositivo en línea; null si todos comparten dispositivo.
 */
export function GameView(props: {
  game: GameState;
  seat: number | null;
  dispatch: (a: Action) => string | null;
  onHelp: () => void;
  onExit: () => void;
  online?: OnlineInfo;
}) {
  const { game, seat, dispatch, online } = props;
  /** Turno que la persona ya ha confirmado tener en la mano (solo al compartir dispositivo). */
  const [handoff, setHandoff] = useState('');
  const me = currentPlayer(game);
  const turnKey = `${game.jornada}-${game.turnIndex}`;
  const focus = seat === null ? undefined : [seat];
  const last = game.jornada >= game.totalJornadas;

  if (game.phase === 'finished') return <EndScreen state={game} onRestart={props.onExit} />;
  if (game.phase === 'match') return <KickoffScreen state={game} focus={focus} onPlay={() => dispatch({ type: 'playMatch' })} />;
  if (game.phase === 'summary') {
    const footer = !online ? undefined : !online.iAmReady ? (
      <Btn label={last ? '🏆 Listo: ver el final' : '✓ Listo para la siguiente jornada'} onPress={online.onReady} />
    ) : (
      <View style={[s.panel, { alignItems: 'center' }]}>
        <Text style={{ color: C.text, fontWeight: '800' }}>✓ Estás listo</Text>
        <Text style={[s.p, { textAlign: 'center', marginTop: 4 }]}>Esperando a {online.waitingFor.join(', ') || 'los demás'}…</Text>
        {online.onForceNext ? <Btn small kind="ghost" label="Continuar sin esperar" onPress={online.onForceNext} style={{ marginTop: 10 }} /> : null}
      </View>
    );
    return <MatchScreen key={game.jornada} state={game} report={game.lastMatch!} focus={focus} footer={footer} onNext={() => dispatch({ type: 'nextJornada' })} />;
  }

  const cur = me!;
  const mine = seat === null ? !cur.isBot : cur.id === seat;
  if (!mine) {
    return (
      <View style={{ flex: 1 }}>
        <PhaseStepper step={0} label={`${jornadaLabel(game)} · TURNO ${game.turnIndex + 1} DE ${game.turnOrder.length}`} />
        <View style={{ padding: 16 }}>
          <View style={[s.row, { marginBottom: 14 }]}>
            <Crest name={cur.name} color={clubColor(cur.id)} size={46} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Overline>{cur.isBot ? 'TURNO DE LA IA' : 'ESPERANDO A'}</Overline>
              <Text numberOfLines={1} style={s.h1}>{cur.name}</Text>
            </View>
          </View>
          <Text style={[s.p, { marginBottom: 10 }]}>Está moviéndose en el mercado. Te avisaremos aquí cuando te toque.</Text>
          {online?.onBotTurn && !cur.isBot ? (
            <Btn small kind="ghost" label="¿No responde? Que la IA juegue este turno" onPress={online.onBotTurn} style={{ marginBottom: 12 }} />
          ) : null}
          <Chronicle state={game} max={6} />
          <StandingsTable state={game} highlight={seat ?? cur.id} />
        </View>
      </View>
    );
  }
  if (seat === null && game.players.filter((p) => !p.isBot).length > 1 && handoff !== turnKey) {
    // Varias personas comparten dispositivo: las cartas en mano son secretas.
    return (
      <View style={{ padding: 24, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Crest name={cur.name} color={clubColor(cur.id)} size={96} />
        <Text style={[s.p, { marginTop: 16 }]}>Pasa el dispositivo a</Text>
        <Text style={[s.h1, { textAlign: 'center', marginTop: 4, marginBottom: 20 }]}>{cur.name}</Text>
        <Btn label="Soy yo, empezar mi turno" onPress={() => setHandoff(turnKey)} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }
  return <GameScreen key={turnKey} state={game} me={cur} dispatch={dispatch} onHelp={props.onHelp} />;
}
