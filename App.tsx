import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, View } from 'react-native';
import { backendEnabled, getAccount, initAccount, refreshProfile } from './src/account/api';
import { useAccount } from './src/account/useAccount';
import { Action, BOT_STYLES, GameState, apply, botAction, check, createGame, currentPlayer } from './src/engine';
import { RoomState } from './src/net/room';
import { GUEST_KEY, HOST_KEY, normalizeCode } from './src/net/session';
import { hydrateStorage, load, remove, save } from './src/net/storage';
import { AccountScreen, formatDate } from './src/ui/AccountScreen';
import { ErrorBoundary, installGlobalErrorHandlers } from './src/ui/ErrorBoundary';
import { GameView } from './src/ui/GameView';
import { HelpScreen } from './src/ui/HelpScreen';
import { LegalScreen, LegalTab } from './src/ui/LegalScreen';
import { OnlineGuest, OnlineHost } from './src/ui/Online';
import { SetupScreen } from './src/ui/SetupScreen';
import { WelcomeScreen } from './src/ui/WelcomeScreen';
import { NavContext } from './src/ui/components';
import { C, TOP_INSET } from './src/ui/theme';

type Mode =
  | { kind: 'menu' }
  | { kind: 'local' }
  | { kind: 'host'; name: string; resume: RoomState | null }
  | { kind: 'guest'; code: string; name: string };

/** Partida de un solo dispositivo guardada para poder continuarla. */
const LOCAL_KEY = 'futcards.local.v3';
installGlobalErrorHandlers();

/** Código de sala que llega en el enlace de invitación (?sala=ABCDE). */
function codeFromLink(): string {
  try {
    const search = (globalThis as { location?: Location }).location?.search ?? '';
    return normalizeCode(new URLSearchParams(search).get('sala') ?? '');
  } catch {
    return '';
  }
}

export default function App() {
  const [mode, setMode] = useState<Mode>({ kind: 'menu' });
  const [game, setGame] = useState<GameState | null>(null);
  const [help, setHelp] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  /** Ha elegido jugar sin cuenta en esta visita. */
  const [guest, setGuest] = useState(false);
  const [legal, setLegal] = useState<LegalTab | null>(null);
  /** En la app nativa hay que cargar lo guardado antes de pintar nada. */
  const [booted, setBooted] = useState(Platform.OS === 'web');
  const account = useAccount();
  useEffect(() => {
    hydrateStorage(Platform.OS === 'web' ? null : AsyncStorage)
      .then(() => initAccount())
      .then(() => getAccount().recovering && setAccountOpen(true))
      .finally(() => setBooted(true));
  }, []);
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

  // Partida en un solo dispositivo: la IA juega sola, acción a acción, con una pequeña pausa.
  const me = mode.kind === 'local' && game ? currentPlayer(game) : null;
  // En el mercado la IA juega sola; en el partido, sus dados se tiran desde la pantalla del partido.
  useEffect(() => {
    if (!me?.isBot) return;
    const t = setTimeout(() => {
      setGame((g) => {
        const p = g && currentPlayer(g);
        return g && p?.isBot ? apply(g, botAction(g, BOT_STYLES[p.id % BOT_STYLES.length])) : g;
      });
    }, 350);
    return () => clearTimeout(t);
  }, [game, me]);

  // La partida local se guarda sola tras cada jugada y se borra al terminar la temporada.
  useEffect(() => {
    if (mode.kind !== 'local' || !game) return;
    if (game.phase === 'finished') remove(LOCAL_KEY);
    else save(LOCAL_KEY, game);
  }, [game, mode.kind]);

  const toMenu = () => {
    setGame(null);
    setMode({ kind: 'menu' });
  };
  const onHelp = () => setHelp(true);

  let body: React.ReactNode;
  if (!booted) {
    body = null;
  } else if (backendEnabled() && !account.session && !guest && mode.kind === 'menu') {
    body = <WelcomeScreen onGuest={() => setGuest(true)} startWithLogin={!!account.linkError} />;
  } else if (mode.kind === 'host') {
    body = <OnlineHost name={mode.name} resume={mode.resume} onHelp={onHelp} onExit={toMenu} />;
  } else if (mode.kind === 'guest') {
    body = <OnlineGuest code={mode.code} name={mode.name} onHelp={onHelp} onExit={toMenu} />;
  } else if (mode.kind === 'local' && game) {
    body = <GameView game={game} seat={null} dispatch={dispatch} onHelp={onHelp} onExit={toMenu} exitText="La partida queda guardada en este dispositivo: podrás continuarla desde el menú." />;
  } else {
    const savedHost = load<RoomState>(HOST_KEY);
    const savedGuest = load<{ code: string; name: string }>(GUEST_KEY);
    const savedLocal = load<GameState>(LOCAL_KEY);
    body = (
      <SetupScreen
        onHelp={onHelp}
        onStart={(o) => {
          setGame(createGame(o));
          setMode({ kind: 'local' });
        }}
        savedLocal={savedLocal && savedLocal.players ? `${savedLocal.players.filter((p) => !p.isBot).map((p) => p.name).join(', ') || 'IA'} · jornada ${savedLocal.jornada} de ${savedLocal.totalJornadas}` : null}
        onContinueLocal={() => {
          if (!savedLocal) return;
          setGame(savedLocal);
          setMode({ kind: 'local' });
        }}
        onHost={(name) => setMode({ kind: 'host', name, resume: null })}
        onJoin={(code, name) => setMode({ kind: 'guest', code, name })}
        resumeCode={savedHost?.code ?? null}
        onResume={() => savedHost && setMode({ kind: 'host', name: savedHost.seats[0].name, resume: savedHost })}
        initialCode={codeFromLink() || savedGuest?.code || ''}
        initialName={savedGuest?.name ?? savedHost?.seats[0].name ?? account.profile?.username ?? ''}
        accountsOn={backendEnabled()}
        hostGate={async () => {
          if (!backendEnabled()) return null;
          if (!getAccount().session) {
            setAccountOpen(true);
            return 'Entra con tu cuenta para crear una sala.';
          }
          const p = await refreshProfile();
          return p?.host_banned_until ? `Estás sancionado como anfitrión: no puedes crear salas hasta el ${formatDate(p.host_banned_until)}.` : null;
        }}
      />
    );
  }

  return (
    <NavContext.Provider value={{ onHelp, onAccount: () => setAccountOpen(true), onLegal: setLegal }}>
    <ErrorBoundary onReset={toMenu}>
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: TOP_INSET }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
        {body}
        {/* La ayuda se superpone: así no se corta la conexión de una partida en línea. */}
        {accountOpen ? (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg }}>
            <AccountScreen onClose={() => setAccountOpen(false)} />
          </View>
        ) : null}
        {help ? (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg }}>
            <HelpScreen onClose={() => setHelp(false)} />
          </View>
        ) : null}
        {legal ? (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg }}>
            <LegalScreen initial={legal} onClose={() => setLegal(null)} />
          </View>
        ) : null}
      </View>
      <StatusBar style="light" />
    </View>
    </ErrorBoundary>
    </NavContext.Provider>
  );
}
