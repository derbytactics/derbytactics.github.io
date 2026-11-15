import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Action, BOT_STYLES, GameState, apply, botAction, check, createGame, currentPlayer } from './src/engine';
import { EndScreen } from './src/ui/EndScreen';
import { GameScreen } from './src/ui/GameScreen';
import { HelpScreen } from './src/ui/HelpScreen';
import { KickoffScreen, MatchScreen } from './src/ui/MatchScreen';
import { SetupScreen } from './src/ui/SetupScreen';
import { Crest } from './src/ui/art';
import { Btn, Chronicle, Overline, PhaseStepper, StandingsTable, jornadaLabel, s } from './src/ui/components';
import { C, TOP_INSET, clubColor } from './src/ui/theme';

export default function App() {
  const [game, setGame] = useState<GameState | null>(null);
  /** Turno (jornada-índice) que el jugador humano ya ha confirmado tener en la mano. */
  const [handoff, setHandoff] = useState('');
  const [help, setHelp] = useState(false);

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
  if (help) {
    body = <HelpScreen onClose={() => setHelp(false)} />;
  } else if (!game) {
    body = <SetupScreen onHelp={() => setHelp(true)} onStart={(o) => { setHandoff(''); setGame(createGame(o)); }} />;
  } else if (game.phase === 'finished') {
    body = <EndScreen state={game} onRestart={() => setGame(null)} />;
  } else if (game.phase === 'match') {
    body = <KickoffScreen state={game} onPlay={() => dispatch({ type: 'playMatch' })} />;
  } else if (game.phase === 'summary') {
    body = <MatchScreen key={game.jornada} state={game} report={game.lastMatch!} onNext={() => dispatch({ type: 'nextJornada' })} />;
  } else if (me!.isBot) {
    body = (
      <View style={{ flex: 1 }}>
        <PhaseStepper step={0} label={`${jornadaLabel(game)} · TURNO ${game.turnIndex + 1} DE ${game.turnOrder.length}`} />
        <View style={{ padding: 16 }}>
          <View style={[s.row, { marginBottom: 14 }]}>
            <Crest name={me!.name} color={clubColor(me!.id)} size={46} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Overline>TURNO DE LA IA</Overline>
              <Text numberOfLines={1} style={s.h1}>{me!.name}</Text>
            </View>
          </View>
          <Text style={[s.p, { marginBottom: 10 }]}>Está moviéndose en el mercado…</Text>
          <Chronicle state={game} max={6} />
          <StandingsTable state={game} highlight={me!.id} />
        </View>
      </View>
    );
  } else if (game.players.filter((p) => !p.isBot).length > 1 && handoff !== turnKey) {
    // Varias personas comparten dispositivo: las cartas en mano son secretas.
    body = (
      <View style={{ padding: 24, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Crest name={me!.name} color={clubColor(me!.id)} size={96} />
        <Text style={[s.p, { marginTop: 16 }]}>Pasa el dispositivo a</Text>
        <Text style={[s.h1, { textAlign: 'center', marginTop: 4, marginBottom: 20 }]}>{me!.name}</Text>
        <Btn label="Soy yo, empezar mi turno" onPress={() => setHandoff(turnKey)} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  } else {
    body = <GameScreen key={turnKey} state={game} me={me!} dispatch={dispatch} onHelp={() => setHelp(true)} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: TOP_INSET }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' }}>{body}</View>
      <StatusBar style="light" />
    </View>
  );
}
