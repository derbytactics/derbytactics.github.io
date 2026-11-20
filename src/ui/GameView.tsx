import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Action, GameState, currentPlayer, currentRoller } from '../engine';
import { Crest } from './art';
import { recordGame } from '../account/club';
import { Btn, Chronicle, ExitContext, NavBar, RosterContext, Overline, PhaseStepper, Popup, StandingsTable, jornadaLabel, navJornada, s } from './components';
import { EndScreen } from './EndScreen';
import { GameScreen } from './GameScreen';
import { MatchScreen } from './MatchScreen';
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
  /** Qué supone salir a mitad de partida, y acciones extra en ese aviso. */
  exitText: string;
  exitExtra?: React.ReactNode;
  /** Contenido extra en la pantalla final (valoración del anfitrión, si puntúa…). */
  endExtra?: React.ReactNode;
}) {
  const [leaving, setLeaving] = useState(false);
  const finished = props.game.phase === 'finished';
  // Al acabar la temporada, se apunta en el historial del club de este dispositivo.
  useEffect(() => {
    if (finished) recordGame(props.game, props.seat ?? 0, !!props.online);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);
  return (
    <RosterContext.Provider value={props.game.roster}>
    <ExitContext.Provider value={() => setLeaving(true)}>
      <View style={{ flex: 1 }}>
        <NavBar subtitle={navJornada(props.game)} />
        <GameBody {...props} />
        {leaving ? (
          <Popup overline="SALIR DE LA PARTIDA" title="¿Seguro que quieres salir?" color={C.danger} button="Seguir jugando" onClose={() => setLeaving(false)}>
            <Text style={[s.p, { textAlign: 'center', marginBottom: 12 }]}>{props.exitText}</Text>
            {props.exitExtra}
            <Btn kind="danger" label="Salir" onPress={props.onExit} style={{ marginBottom: 4 }} />
          </Popup>
        ) : null}
      </View>
    </ExitContext.Provider>
    </RosterContext.Provider>
  );
}

function GameBody(props: Parameters<typeof GameView>[0]) {
  const { game, seat, dispatch, online } = props;
  /** Turno que la persona ya ha confirmado tener en la mano (solo al compartir dispositivo). */
  const [handoff, setHandoff] = useState('');
  const me = currentPlayer(game);
  const turnKey = `${game.jornada}-${game.turnIndex}`;
  const focus = seat === null ? undefined : [seat];
  const last = game.jornada >= game.totalJornadas;

  if (game.phase === 'finished') return <EndScreen state={game} onRestart={props.onExit} extra={props.endExtra} />;
  if (game.phase === 'match' || game.phase === 'summary') {
    const footer = !online ? undefined : !online.iAmReady ? (
      <Btn label={last ? '🏆 Listo: ver el final' : '✓ Listo para la siguiente jornada'} onPress={online.onReady} />
    ) : (
      <View style={[s.panel, { alignItems: 'center' }]}>
        <Text style={{ color: C.text, fontWeight: '800' }}>✓ Estás listo</Text>
        <Text style={[s.p, { textAlign: 'center', marginTop: 4 }]}>Esperando a {online.waitingFor.join(', ') || 'los demás'}…</Text>
        {online.onForceNext ? <Btn small kind="ghost" label="Continuar sin esperar" onPress={online.onForceNext} style={{ marginTop: 10 }} /> : null}
      </View>
    );
    const roller = currentRoller(game);
    const absent = roller !== null && !game.players[roller].isBot && roller !== seat;
    return (
      <MatchScreen
        key={game.jornada}
        state={game}
        focus={focus}
        // En un solo dispositivo se tira desde aquí por todos; en línea, cada móvil tira por su club
        // y el anfitrión, además, por los de la IA.
        canRoll={(r) => (seat === null ? true : r === seat || (!!online?.isHost && game.players[r].isBot))}
        onRoll={() => dispatch({ type: 'roll' })}
        onNext={() => dispatch({ type: 'nextJornada' })}
        footer={footer}
        waitingExtra={online?.onBotTurn && absent ? <Btn small kind="ghost" label="¿No responde? Tirar por él" onPress={online.onBotTurn} style={{ marginTop: 10 }} /> : undefined}
        onForceAbsent={online?.onBotTurn && absent ? online.onBotTurn : undefined}
      />
    );
  }

  const cur = me!;
  const mine = seat === null ? !cur.isBot : cur.id === seat;
  if (!mine) {
    return (
      <View style={{ flex: 1 }}>
        <PhaseStepper step={0} label={jornadaLabel(game)} />
        <View style={{ padding: 16 }}>
          <View style={[s.row, { marginBottom: 14 }]}>
            <Crest name={cur.name} color={clubColor(cur.id)} design={cur.crest} size={46} />
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
        <Crest name={cur.name} color={clubColor(cur.id)} design={cur.crest} size={96} />
        <Text style={[s.p, { marginTop: 16 }]}>Pasa el dispositivo a</Text>
        <Text style={[s.h1, { textAlign: 'center', marginTop: 4, marginBottom: 20 }]}>{cur.name}</Text>
        <Btn label="Soy yo, empezar mi turno" onPress={() => setHandoff(turnKey)} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }
  return <GameScreen key={turnKey} state={game} me={cur} dispatch={dispatch} />;
}
