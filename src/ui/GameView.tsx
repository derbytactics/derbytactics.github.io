import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, Vibration, View } from 'react-native';
import { Action, GameState, currentPlayer, currentRoller } from '../engine';
import { Crest } from './art';
import { recordGame } from '../account/club';
import { checkGame } from '../account/achievements';
import { setCurrentLeague } from './currentLeague';
import { DrawShow } from './DrawShow';
import { turnFor } from '../net/turns';
import { play } from './sound';
import { isMuted } from './sfx';
import { Btn, Chronicle, ExitContext, NavBar, RosterContext, useBack, Overline, PhaseStepper, Popup, StandingsTable, jornadaLabel, navJornada, s } from './components';
import { EndScreen } from './EndScreen';
import { GameScreen } from './GameScreen';
import { MatchScreen } from './MatchScreen';
import { LineupScreen, LineupWaiting } from './LineupScreen';
import { C } from './theme';
import { ClubColorsContext, clubPalette, useClubColor } from './clubColors';
import { I } from './icons';

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
  const crestKey = JSON.stringify(props.game.players.map((p) => p.crest ?? null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const palette = useMemo(() => clubPalette(props.game.players.map((p) => p.crest)), [crestKey]);
  const [leaving, setLeaving] = useState(false);
  // «Atrás» en Android: pregunta antes de salir de la partida (o cierra la pregunta).
  useBack(() => {
    setLeaving((x) => !x);
    return true;
  });
  // Las reglas (abiertas desde la barra) hablan como la liga de esta partida.
  const league = props.game.league;
  useEffect(() => {
    setCurrentLeague(league);
    return () => setCurrentLeague(undefined);
  }, [league]);
  // En línea, cuando te toca (fichar, elegir alineación, tirar o decidir un giro), el móvil vibra y
  // suena: por si lo tienes en la mesa sin mirar. Contra la IA no, porque te toca enseguida.
  const turnKey = turnFor(props.game, props.seat)?.key ?? null;
  const lastTurn = useRef<string | null>(turnKey);
  useEffect(() => {
    // Solo al pasar de «esperando» a «te toca»: si encadenas dos turnos seguidos, no vuelve a vibrar.
    if (turnKey && lastTurn.current === null && props.online && !isMuted()) {
      Vibration.vibrate(400);
      play('whistle');
    }
    lastTurn.current = turnKey;
  }, [turnKey, props.online]);
  const finished = props.game.phase === 'finished';
  // Al acabar la temporada, se apunta en el historial del club de este dispositivo.
  useEffect(() => {
    if (finished) recordGame(props.game, props.seat ?? 0, !!props.online);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);
  // Álbum y logros: al fichar y al volver del partido (no durante la narración, para no destripar el resultado).
  const seat = props.seat ?? 0;
  const squadKey = props.game.players[seat]?.squad.map((e) => e.cardId).join(',');
  const phase = props.game.phase;
  useEffect(() => {
    if (phase === 'market' || phase === 'lineup' || phase === 'finished') checkGame(props.game, seat, !!props.online);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squadKey, phase, props.game.jornada]);
  return (
    <ClubColorsContext.Provider value={palette}>
    <RosterContext.Provider value={props.game.roster}>
    <ExitContext.Provider value={() => setLeaving(true)}>
      <View style={{ flex: 1 }}>
        <NavBar subtitle={navJornada(props.game)} />
        <GameBody {...props} />
        <DrawShow key={props.game.gameId} state={props.game} seat={props.seat ?? (props.game.players.findIndex((p) => !p.isBot) >= 0 ? props.game.players.findIndex((p) => !p.isBot) : null)} />
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
    </ClubColorsContext.Provider>
  );
}

function GameBody(props: Parameters<typeof GameView>[0]) {
  const clubColor = useClubColor();
  const { game, seat, dispatch, online } = props;
  /** Convocatoria ya enviada que se quiere cambiar (en línea). */
  const [editLineup, setEditLineup] = useState('');
  const me = currentPlayer(game);
  const turnKey = `${game.jornada}-${game.turnIndex}`;
  const focus = seat === null ? undefined : [seat];
  const last = game.jornada >= game.totalJornadas;

  if (game.phase === 'finished') return <EndScreen state={game} onRestart={props.onExit} extra={props.endExtra} />;
  if (game.phase === 'lineup') {
    const pending = game.players.filter((p) => !p.starters);
    const lineupKey = `lineup-${game.jornada}`;
    const confirm = (playerId: number) => (cardIds: string[]) => dispatch({ type: 'setLineup', playerId, cardIds });
    if (seat !== null) {
      // En línea: cada móvil elige la suya, a la vez que los demás.
      const mine = game.players[seat];
      if (mine.starters && editLineup !== `${lineupKey}-${mine.starters.join()}`) {
        return (
          <LineupWaiting
            state={game}
            me={mine}
            waitingFor={pending.map((p) => p.name)}
            onChange={() => setEditLineup(`${lineupKey}-${mine.starters!.join()}`)}
            onForce={online?.onBotTurn}
          />
        );
      }
      return <LineupScreen key={lineupKey} state={game} me={mine} onConfirm={(ids) => { setEditLineup(''); return confirm(seat)(ids); }} />;
    }
    // En este móvil juega una sola persona contra la IA (las partidas antiguas con varias van una tras otra).
    const cur = pending.find((p) => !p.isBot)!;
    return <LineupScreen key={`${lineupKey}-${cur.id}`} state={game} me={cur} onConfirm={confirm(cur.id)} />;
  }
  if (game.phase === 'match' || game.phase === 'summary') {
    const footer = !online ? undefined : !online.iAmReady ? (
      <Btn icon={last ? I.trophy : 'check'} label={last ? 'Listo: ver el final' : 'Listo para la siguiente jornada'} onPress={online.onReady} />
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
        online={!!online}
        onSkip={online ? undefined : () => dispatch({ type: 'playMatch' })}
        act={dispatch}
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
  return <GameScreen key={turnKey} state={game} me={cur} dispatch={dispatch} />;
}
