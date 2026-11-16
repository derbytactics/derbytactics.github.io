import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { backendEnabled, getAccount, initAccount, refreshProfile } from './src/account/api';
import { useAccount } from './src/account/useAccount';
import { Action, BOT_STYLES, GameState, apply, botAction, check, createGame, currentPlayer } from './src/engine';
import { RoomState } from './src/net/room';
import { GUEST_KEY, HOST_KEY, normalizeCode } from './src/net/session';
import { load } from './src/net/storage';
import { AccountScreen, formatDate } from './src/ui/AccountScreen';
import { GameView } from './src/ui/GameView';
import { HelpScreen } from './src/ui/HelpScreen';
import { OnlineGuest, OnlineHost } from './src/ui/Online';
import { SetupScreen } from './src/ui/SetupScreen';
import { C, TOP_INSET } from './src/ui/theme';

type Mode =
  | { kind: 'menu' }
  | { kind: 'local' }
  | { kind: 'host'; name: string; resume: RoomState | null }
  | { kind: 'guest'; code: string; name: string };

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
  const account = useAccount();
  useEffect(() => {
    initAccount().then(() => (getAccount().recovering || getAccount().linkError) && setAccountOpen(true));
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

  const toMenu = () => {
    setGame(null);
    setMode({ kind: 'menu' });
  };
  const onHelp = () => setHelp(true);

  let body: React.ReactNode;
  if (mode.kind === 'host') {
    body = <OnlineHost name={mode.name} resume={mode.resume} onHelp={onHelp} onExit={toMenu} />;
  } else if (mode.kind === 'guest') {
    body = <OnlineGuest code={mode.code} name={mode.name} onHelp={onHelp} onExit={toMenu} />;
  } else if (mode.kind === 'local' && game) {
    body = <GameView game={game} seat={null} dispatch={dispatch} onHelp={onHelp} onExit={toMenu} exitText="La partida no se guarda: si sales, se pierde." />;
  } else {
    const savedHost = load<RoomState>(HOST_KEY);
    const savedGuest = load<{ code: string; name: string }>(GUEST_KEY);
    body = (
      <SetupScreen
        onHelp={onHelp}
        onStart={(o) => {
          setGame(createGame(o));
          setMode({ kind: 'local' });
        }}
        onHost={(name) => setMode({ kind: 'host', name, resume: null })}
        onJoin={(code, name) => setMode({ kind: 'guest', code, name })}
        resumeCode={savedHost?.code ?? null}
        onResume={() => savedHost && setMode({ kind: 'host', name: savedHost.seats[0].name, resume: savedHost })}
        initialCode={codeFromLink() || savedGuest?.code || ''}
        initialName={savedGuest?.name ?? savedHost?.seats[0].name ?? account.profile?.username ?? ''}
        account={backendEnabled() ? { label: account.session ? `👤 ${account.profile?.username ?? 'Mi cuenta'}` : '👤 Entrar', onOpen: () => setAccountOpen(true) } : null}
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
      </View>
      <StatusBar style="light" />
    </View>
  );
}
