import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed/800ExtraBold';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackHandler, Platform, Text, View } from 'react-native';
import { backendEnabled, getAccount, initAccount, refreshProfile, subscribeAccount } from './src/account/api';
import { useAccount } from './src/account/useAccount';
import { Action, BOT_STYLES, CrestDesign, GameState, apply, botAction, check, createGame, currentPlayer } from './src/engine';
import { RoomState } from './src/net/room';
import { GUEST_KEY, HOST_KEY, normalizeCode } from './src/net/session';
import { hydrateStorage, load, remove, save } from './src/net/storage';
import { AccountScreen, UsernamePrompt, formatDate } from './src/ui/AccountScreen';
import { reloadClub, syncClub, useClubSyncing, useMyClub } from './src/account/club';
import { ClubScreen } from './src/ui/ClubScreen';
import { ErrorBoundary, installGlobalErrorHandlers } from './src/ui/ErrorBoundary';
import { GameView } from './src/ui/GameView';
import { HelpScreen } from './src/ui/HelpScreen';
import { HistoryScreen } from './src/ui/HistoryScreen';
import { LegalScreen, LegalTab } from './src/ui/LegalScreen';
import { OnlineGuest, OnlineHost } from './src/ui/Online';
import { SetupScreen } from './src/ui/SetupScreen';
import { SideMenu } from './src/ui/SideMenu';
import { BackContext, NavContext } from './src/ui/components';
import { C, TOP_INSET } from './src/ui/theme';

type Mode =
  | { kind: 'menu' }
  | { kind: 'local' }
  | { kind: 'host'; name: string; crest?: CrestDesign; resume: RoomState | null }
  | { kind: 'guest'; code: string; name: string; crest?: CrestDesign };

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
  const [legal, setLegal] = useState<LegalTab | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clubOpen, setClubOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const club = useMyClub();
  const clubSyncing = useClubSyncing();
  /** En la app nativa hay que cargar lo guardado antes de pintar nada. */
  const [booted, setBooted] = useState(Platform.OS === 'web');
  const account = useAccount();
  // Fuentes de marcador e iconos: si tardan o fallan, se pinta igual con las del sistema.
  const [fontsLoaded, fontError] = useFonts({ BarlowCondensed_700Bold, BarlowCondensed_800ExtraBold, ...MaterialCommunityIcons.font });
  const [fontTimeout, setFontTimeout] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontTimeout(true), 3000);
    return () => clearTimeout(t);
  }, []);
  const fontsReady = fontsLoaded || !!fontError || fontTimeout;
  const userId = account.session?.user.id;
  // Con cuenta, el club y el historial se sincronizan al entrar.
  useEffect(() => {
    if (booted && userId) syncClub();
  }, [booted, userId]);
  // Al cerrar sesión o borrar la cuenta (desde donde sea): se cierran las ventanas y se vuelve al inicio.
  // Si había una partida en marcha, sigue; la bienvenida aparece al volver al menú.
  useEffect(() => {
    let had = !!getAccount().session;
    return subscribeAccount(() => {
      const has = !!getAccount().session;
      if (had && !has) {
        setAccountOpen(false);
        setMenuOpen(false);
        setClubOpen(false);
        setHistoryOpen(false);
      }
      had = has;
    });
  }, []);
  useEffect(() => {
    hydrateStorage(Platform.OS === 'web' ? null : AsyncStorage)
      .then(() => reloadClub())
      .then(() => initAccount())
      .finally(() => setBooted(true));
  }, []);
  // Botón «atrás» de Android: primero cierra la ventana que esté encima; si no hay, lo atiende la pantalla.
  const backStack = useRef<(() => boolean)[]>([]);
  const registerBack = useCallback((h: () => boolean) => {
    backStack.current.push(h);
    return () => {
      backStack.current = backStack.current.filter((x) => x !== h);
    };
  }, []);
  const overlays = useRef<{ open: boolean; close: () => void }[]>([]);
  overlays.current = [
    { open: menuOpen, close: () => setMenuOpen(false) },
    { open: !!legal, close: () => setLegal(null) },
    { open: help, close: () => setHelp(false) },
    { open: historyOpen, close: () => setHistoryOpen(false) },
    { open: clubOpen, close: () => setClubOpen(false) },
    { open: accountOpen, close: () => setAccountOpen(false) },
  ];
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const top = overlays.current.find((o) => o.open);
      if (top) {
        top.close();
        return true;
      }
      for (let i = backStack.current.length - 1; i >= 0; i--) if (backStack.current[i]()) return true;
      return false;
    });
    return () => sub.remove();
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
  if (!booted || !fontsReady) {
    body = null;
  } else if (mode.kind === 'host') {
    body = <OnlineHost name={mode.name} crest={mode.crest} resume={mode.resume} onHelp={onHelp} onExit={toMenu} />;
  } else if (mode.kind === 'guest') {
    body = <OnlineGuest code={mode.code} name={mode.name} crest={mode.crest} onHelp={onHelp} onExit={toMenu} />;
  } else if (mode.kind === 'local' && game) {
    body = <GameView game={game} seat={null} dispatch={dispatch} onHelp={onHelp} onExit={toMenu} exitText="La partida queda guardada en este dispositivo: podrás continuarla desde el menú." />;
  } else if (!club && clubSyncing) {
    body = <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: C.dim, fontWeight: '700' }}>Cargando tu club…</Text></View>;
  } else if (!club) {
    // Cada persona tiene un club: se crea antes de jugar la primera vez.
    body = <ClubScreen first initial={null} onClose={() => {}} onLogin={backendEnabled() && !account.session ? () => setAccountOpen(true) : undefined} />;
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
        club={club}
        onEditClub={() => setClubOpen(true)}
        onHost={() => setMode({ kind: 'host', name: club.name, crest: club.crest, resume: null })}
        onJoin={(code) => setMode({ kind: 'guest', code, name: club.name, crest: club.crest })}
        resumeCode={savedHost?.code ?? null}
        onResume={() => savedHost && setMode({ kind: 'host', name: savedHost.seats[0].name, crest: savedHost.seats[0].crest, resume: savedHost })}
        initialCode={codeFromLink() || savedGuest?.code || ''}
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
    <BackContext.Provider value={registerBack}>
    <NavContext.Provider value={{ onHelp, onAccount: () => setAccountOpen(true), onMenu: () => setMenuOpen(true), onLegal: setLegal }}>
    <ErrorBoundary onReset={toMenu}>
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: TOP_INSET }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
        {body}
        {/* Menú, club, historial y ayuda se superponen: así no se corta la conexión de una partida en línea. */}
        {clubOpen && club ? (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg }}>
            <ClubScreen initial={club} inGame={mode.kind !== 'menu'} onClose={() => setClubOpen(false)} />
          </View>
        ) : null}
        {historyOpen ? (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg }}>
            <HistoryScreen onClose={() => setHistoryOpen(false)} />
          </View>
        ) : null}
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
        {account.profile?.needs_username ? (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg }}>
            <UsernamePrompt />
          </View>
        ) : null}
        {menuOpen ? (
          <SideMenu
            onClose={() => setMenuOpen(false)}
            onClub={() => setClubOpen(true)}
            onHistory={() => setHistoryOpen(true)}
            onAccount={() => setAccountOpen(true)}
            onHelp={onHelp}
            onLegal={setLegal}
          />
        ) : null}
      </View>
      <StatusBar style="light" />
    </View>
    </ErrorBoundary>
    </NavContext.Provider>
    </BackContext.Provider>
  );
}
