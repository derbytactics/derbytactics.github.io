import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Action, BOT_STYLES, GameState, apply, botAction, check, createGame, currentPlayer } from './src/engine';
import { EndScreen } from './src/ui/EndScreen';
import { Chronicle, GameScreen, StandingsTable } from './src/ui/GameScreen';
import { KickoffScreen, MatchScreen } from './src/ui/MatchScreen';
import { SetupScreen } from './src/ui/SetupScreen';
import { Btn, s } from './src/ui/components';
import { C, TOP_INSET } from './src/ui/theme';

export default function App() {
  const [game, setGame] = useState<GameState | null>(null);
  /** Turno (jornada-índice) que el jugador humano ya ha confirmado tener en la mano. */
  const [handoff, setHandoff] = useState('');

  const gameRef = useRef(game);
  gameRef.current = game;

  const dispatch = useCallback((a: Action): string | null => {
    const g = gameRef.current;
    if (!g) return null;
    const error = check(g, a);
    if (!error) {
      gameRef.current = apply(g, a);
      setGame(gameRef.current);
    }
    return error;
  }, []);

  const me = game ? currentPlayer(game) : null;
  const turnKey = game ? `${game.jornada}-${game.turnIndex}` : '';

  // La IA juega sola, acción a acción, con una pequeña pausa para poder seguirla.
  useEffect(() => {
    if (!game || !me?.isBot) return;
    const t = setTimeout(() => {
      setGame((g) => {
        const p = g && currentPlayer(g);
        return g && p?.isBot ? apply(g, botAction(g, BOT_STYLES[p.id % BOT_STYLES.length])) : g;
      });
    }, 350);
    return () => clearTimeout(t);
  }, [game, me]);

  let body: React.ReactNode;
  if (!game) {
    body = <SetupScreen onStart={(o) => { setHandoff(''); setGame(createGame(o)); }} />;
  } else if (game.phase === 'finished') {
    body = <EndScreen state={game} onRestart={() => setGame(null)} />;
  } else if (game.phase === 'match') {
    body = <KickoffScreen state={game} onPlay={() => dispatch({ type: 'playMatch' })} />;
  } else if (game.phase === 'summary') {
    body = <MatchScreen key={game.jornada} state={game} report={game.lastMatch!} onNext={() => dispatch({ type: 'nextJornada' })} />;
  } else if (me!.isBot) {
    body = (
      <View style={{ padding: 16, flex: 1 }}>
        <Text style={{ color: C.dim }}>Jornada {game.jornada} de {game.totalJornadas} · Mercado</Text>
        <Text style={s.h1}>🤖 {me!.name}</Text>
        <Text style={[s.p, { marginBottom: 12 }]}>La IA está moviendo ficha…</Text>
        <StandingsTable state={game} highlight={me!.id} />
        <Chronicle state={game} max={6} />
      </View>
    );
  } else if (game.players.filter((p) => !p.isBot).length > 1 && handoff !== turnKey) {
    // Varias personas comparten dispositivo: las cartas en mano son secretas.
    body = (
      <View style={{ padding: 24, flex: 1, justifyContent: 'center' }}>
        <Text style={[s.p, { textAlign: 'center' }]}>Pasa el dispositivo a</Text>
        <Text style={[s.h1, { textAlign: 'center', marginVertical: 12 }]}>{me!.name}</Text>
        <Btn label="Es mi turno" onPress={() => setHandoff(turnKey)} />
      </View>
    );
  } else {
    body = <GameScreen key={turnKey} state={game} me={me!} dispatch={dispatch} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: TOP_INSET }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' }}>{body}</View>
      <StatusBar style="light" />
    </View>
  );
}
