import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { HostCard, backendEnabled, getAccount, refreshProfile, rpc } from '../account/api';
import { useAccount } from '../account/useAccount';
import { CONFIG, CrestDesign, SeasonLength, standings } from '../engine';
import { RoomState, botStep, finalSeats, hostAct, hostReady, kickSeat, pendingReady, playTurnForAbsent, setLobby, startGame } from '../net/room';
import { GuestSession, HostSession } from '../net/session';
import { deviceId } from '../net/storage';
import { Stars } from './AccountScreen';
import { Crest } from './art';
import { Btn, LeaguePicker, NavBar, Overline, s } from './components';
import { GameView } from './GameView';
import { C, clubColor } from './theme';

const SEASONS: { key: SeasonLength; label: string }[] = [
  { key: 'corta', label: `Corta · ${CONFIG.seasonLengths.corta}` },
  { key: 'estandar', label: `Estándar · ${CONFIG.seasonLengths.estandar}` },
  { key: 'larga', label: `Larga · ${CONFIG.seasonLengths.larga}` },
];

function inviteLink(code: string): string | null {
  const loc = (globalThis as { location?: Location }).location;
  return loc?.origin ? `${loc.origin}${loc.pathname}?sala=${code}` : null;
}

function Offline({ connected }: { connected: boolean }) {
  if (connected) return null;
  return (
    <View style={{ backgroundColor: C.danger, padding: 6 }}>
      <Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center', fontSize: 12 }}>Sin conexión. Reintentando…</Text>
    </View>
  );
}

/** Asientos de la sala de espera. Con `onKick`, el anfitrión puede expulsar a un invitado. */
function Seats({ room, mine, onKick }: { room: RoomState; mine: number; onKick?: (seat: number) => void }) {
  return (
    <>
      {Array.from({ length: room.clubs }, (_, i) => {
        const seat = room.seats[i];
        return (
          <View key={i} style={[s.panel, s.row, { paddingVertical: 8, marginBottom: 8, borderStyle: seat ? 'solid' : 'dashed' }]}>
            {seat ? <Crest name={seat.name} color={clubColor(i)} design={seat.crest} size={34} /> : <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.panelAlt }} />}
            <Text numberOfLines={1} style={{ flex: 1, marginLeft: 10, color: seat ? C.text : C.faint, fontWeight: '700', fontSize: 16 }}>
              {seat ? seat.name : 'Asiento libre'}
            </Text>
            <Text style={{ color: i === mine ? C.accent : C.faint, fontSize: 12, fontWeight: '700' }}>
              {!seat ? 'IA si nadie entra' : i === mine ? 'TÚ' : i === 0 ? 'ANFITRIÓN' : 'CONECTADO'}
            </Text>
            {onKick && seat && i > 0 ? <Btn small kind="ghost" label="Expulsar" onPress={() => onKick(i)} style={{ marginLeft: 8 }} /> : null}
          </View>
        );
      })}
    </>
  );
}

/** Valoración del anfitrión por un invitado registrado, al acabar la partida. */
function RateHost({ gameId, hostName }: { gameId: string; hostName: string }) {
  const [stars, setStars] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={[s.panel, { alignItems: 'center', borderColor: C.accent }]}>
      <Overline>¿QUÉ TAL COMO ANFITRIÓN?</Overline>
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 16, marginVertical: 6 }}>Valora a {hostName}</Text>
      <Stars
        value={stars}
        size={34}
        onPick={(n) => {
          setStars(n);
          rpc('rate_host', { p_game: gameId, p_stars: n }).then(() => setError(null), (e: Error) => setError(e.message));
        }}
      />
      <Text style={[s.p, { fontSize: 12, marginTop: 6, textAlign: 'center' }]}>
        {error ?? (stars ? '¡Gracias! Puedes cambiarla desde tu historial.' : 'Tu valoración ayuda a los demás a elegir sala.')}
      </Text>
    </View>
  );
}

function Connecting({ text, error, onExit, children }: { text: string; error?: string | null; onExit: () => void; children?: React.ReactNode }) {
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={[s.h2, { textAlign: 'center' }]}>{error ?? text}</Text>
      {children ? <View style={{ alignSelf: 'stretch', marginTop: 12 }}>{children}</View> : null}
      <Btn small kind="ghost" label="Volver" onPress={onExit} style={{ marginTop: 16 }} />
    </View>
  );
}

// ---------------------------------------------------------------- Anfitrión

export function OnlineHost(props: { name: string; crest?: CrestDesign; resume: RoomState | null; onHelp: () => void; onExit: () => void }) {
  const session = useRef<HostSession | null>(null);
  const [room, setRoom] = useState<RoomState | null>(props.resume);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  /** null: aún no registrada · true/false: si la partida puntúa para el ranking. */
  const [ranked, setRanked] = useState<boolean | null>(null);
  const reported = useRef(false);

  useEffect(() => {
    let alive = true;
    const l = { onChange: (r: RoomState) => alive && setRoom(r), onStatus: (ok: boolean) => alive && setConnected(ok) };
    if (props.resume) {
      session.current = HostSession.resume(props.resume, l);
      if (!session.current) setError('No se ha podido reanudar la sala.');
    } else {
      HostSession.create(deviceId(), props.name, getAccount().session?.user.id ?? null, l, props.crest).then(
        (s2) => {
          if (!alive) return s2.close(true);
          session.current = s2;
          setRoom(s2.room);
        },
        (e: Error) => alive && setError(e.message),
      );
    }
    return () => {
      alive = false;
      session.current?.close(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // La IA de los clubes sin persona juega en el dispositivo del anfitrión.
  const g = room?.game;
  const botTurn = !!g && g.phase === 'market' && g.players[g.turnOrder[g.turnIndex]].isBot;
  useEffect(() => {
    if (!botTurn) return;
    const t = setTimeout(() => session.current?.update((r) => botStep(r)), 350);
    return () => clearTimeout(t);
  }, [botTurn, room?.seq]);

  // Con cuentas: señal de vida mientras se juega y registro del resultado al terminar.
  const gameId = room?.gameId ?? null;
  const phase = g?.phase;
  useEffect(() => {
    if (!gameId || !phase || phase === 'finished') return;
    const t = setInterval(() => rpc('heartbeat', { p_game: gameId }).catch(() => {}), 60000);
    return () => clearInterval(t);
  }, [gameId, phase]);
  useEffect(() => {
    if (!gameId || phase !== 'finished' || reported.current || !room?.game) return;
    reported.current = true;
    const table = standings(room.game);
    const results = table.map((p, i) => ({ seat: p.id, points: p.points, goals: p.goals, position: i + 1 }));
    rpc<boolean>('finish_game', { p_game: gameId, p_results: results }).then(
      (isRanked) => {
        setRanked(isRanked);
        refreshProfile();
      },
      () => {
        reported.current = false;
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, phase]);

  const exit = () => {
    if (gameId && phase && phase !== 'finished') rpc('abandon_game', { p_game: gameId }).catch(() => {});
    session.current?.close(true);
    session.current = null;
    props.onExit();
  };
  const start = async () => {
    const ses2 = session.current;
    if (!ses2) return;
    setStartError(null);
    let gid: string | null = null;
    if (backendEnabled()) {
      try {
        const seats = finalSeats(ses2.room);
        gid = await rpc<string>('start_game', {
          p_code: ses2.room.code,
          p_season: ses2.room.season,
          p_clubs: seats.length,
          p_players: seats.map((st, i) => ({ seat: i, name: st.name, is_bot: !st.clientId })),
        });
      } catch (e) {
        return setStartError((e as Error).message);
      }
    }
    ses2.update((r) => startGame(r, undefined, gid));
  };
  if (!room || !session.current) return <Connecting text="Creando la sala…" error={error} onExit={props.onExit} />;
  const ses = session.current;

  if (!room.game) {
    const link = inviteLink(room.code);
    const copy = () => {
      const nav = (globalThis as { navigator?: Navigator }).navigator;
      nav?.clipboard?.writeText(link ?? room.code).then(() => setCopied(true), () => {});
    };
    return (
      <View style={{ flex: 1 }}>
        <NavBar subtitle={`Sala ${room.code} · sala de espera`} />
        <Offline connected={connected} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Overline>SALA CREADA · COMPARTE ESTE CÓDIGO</Overline>
          <View style={[s.panel, { alignItems: 'center', marginTop: 8, borderColor: C.accent }]}>
            <Text selectable style={{ color: C.accent, fontSize: 52, fontWeight: '900', letterSpacing: 8 }}>{room.code}</Text>
            {link ? <Text selectable style={[s.p, { fontSize: 12, textAlign: 'center', marginTop: 4 }]}>{link}</Text> : null}
            {link ? <Btn small kind="ghost" label={copied ? '✓ Enlace copiado' : 'Copiar enlace de invitación'} onPress={copy} style={{ marginTop: 10 }} /> : null}
          </View>
          <Text style={[s.p, { marginBottom: 14 }]}>
            Tus amigos abren el enlace en su móvil, o entran en el juego, eligen «En línea» y escriben el código. No cierres esta pantalla: tu móvil dirige la partida.
          </Text>

          <View style={[s.row, { marginBottom: 10 }]}>
            <View style={{ flex: 1 }}>
              <Overline>CLUBES EN LA LIGA</Overline>
              <Text style={{ color: C.text, fontSize: 22, fontWeight: '900' }}>
                {room.clubs} clubes · {room.seats.length} {room.seats.length === 1 ? 'persona' : 'personas'}
              </Text>
            </View>
            <Btn label="−" small kind="ghost" onPress={() => ses.update((r) => setLobby(r, { clubs: r.clubs - 1 }))} style={{ width: 44 }} />
            <Btn label="+" small kind="ghost" onPress={() => ses.update((r) => setLobby(r, { clubs: r.clubs + 1 }))} style={{ width: 44, marginLeft: 8 }} />
          </View>
          <Seats room={room} mine={0} onKick={(i) => ses.update((r) => kickSeat(r, i))} />

          <LeaguePicker value={room.league ?? 'masculina'} onPick={(league) => ses.update((r) => setLobby(r, { league }))} />
          <View style={{ marginTop: 6, marginBottom: 20 }}>
            <Overline>DURACIÓN (JORNADAS)</Overline>
            <View style={[s.row, { gap: 8, marginTop: 8 }]}>
              {SEASONS.map((x) => (
                <Btn key={x.key} small kind={room.season === x.key ? 'primary' : 'ghost'} label={x.label} onPress={() => ses.update((r) => setLobby(r, { season: x.key }))} style={{ flex: 1 }} />
              ))}
            </View>
          </View>
          {startError ? <Text style={{ color: C.danger, fontWeight: '700', marginBottom: 10 }}>{startError}</Text> : null}
          <Btn label={room.seats.length < room.clubs ? `Empezar (la IA lleva ${room.clubs - room.seats.length})` : 'Empezar la pretemporada'} onPress={start} />
          <Btn kind="ghost" label="Cerrar la sala" onPress={exit} style={{ marginTop: 10 }} />
        </ScrollView>
      </View>
    );
  }

  const waiting = pendingReady(room);
  return (
    <View style={{ flex: 1 }}>
      <Offline connected={connected} />
      <GameView
        game={room.game}
        seat={0}
        onHelp={props.onHelp}
        onExit={exit}
        exitText={gameId ? 'Eres el anfitrión: si sales, la partida se acaba para todos y cuenta como abandonada. Dos abandonos en una semana impiden crear salas durante un tiempo.' : 'Eres el anfitrión: si sales, la partida se acaba para todos.'}
        endExtra={
          gameId && ranked !== null ? (
            <View style={[s.panel, { alignItems: 'center' }]}>
              <Text style={{ color: ranked ? C.accent : C.dim, fontWeight: '800' }}>{ranked ? '✓ Partida guardada: puntúa para el ranking' : 'Partida guardada como amistosa'}</Text>
              {!ranked ? <Text style={[s.p, { fontSize: 12, textAlign: 'center', marginTop: 4 }]}>Para el ranking hacen falta al menos dos usuarios registrados.</Text> : null}
            </View>
          ) : undefined
        }
        dispatch={(a) => {
          const res = hostAct(ses.room, a);
          if (!res.error) ses.update(() => res.room);
          return res.error;
        }}
        online={{
          isHost: true,
          connected,
          iAmReady: room.ready.includes(0),
          waitingFor: waiting.map((i) => room.seats[i].name),
          onReady: () => ses.update(hostReady),
          onForceNext: () => ses.update((r) => hostAct(r, { type: 'nextJornada' }).room),
          onBotTurn: () => ses.update(playTurnForAbsent),
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------- Invitado

export function OnlineGuest(props: { code: string; name: string; crest?: CrestDesign; onHelp: () => void; onExit: () => void }) {
  const session = useRef<GuestSession | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [connected, setConnected] = useState(false);
  const [closed, setClosed] = useState(false);
  const [slow, setSlow] = useState(false);
  const { session: account } = useAccount();
  const [hostCard, setHostCard] = useState<HostCard | null>(null);
  const [reportMsg, setReportMsg] = useState<string | null>(null);
  /** Última sala vista, para poder valorar al anfitrión aunque la cierre. */
  const lastRoom = useRef<RoomState | null>(null);
  const claimed = useRef(false);
  if (room) lastRoom.current = room;
  const gameId = room?.gameId ?? null;
  const hostUserId = room?.hostUserId ?? null;
  const mySeat = session.current?.seat ?? -1;

  // Reputación del anfitrión, para enseñarla en la sala de espera.
  useEffect(() => {
    if (hostUserId && backendEnabled()) rpc<HostCard>('host_card', { p_user: hostUserId }, false).then(setHostCard, () => {});
  }, [hostUserId]);
  // Con cuenta, cada persona reclama su propio asiento en el servidor.
  useEffect(() => {
    if (!gameId || !account || mySeat < 0 || claimed.current) return;
    claimed.current = true;
    rpc('join_game', { p_game: gameId, p_seat: mySeat }).catch(() => {
      claimed.current = false;
    });
  }, [gameId, account, mySeat]);

  useEffect(() => {
    let alive = true;
    session.current = GuestSession.join(props.code, deviceId(), props.name, {
      onChange: (r) => {
        if (!alive) return;
        // Un estado vacío significa que el anfitrión ha cerrado la sala.
        if (!r) setClosed(true);
        setRoom(r);
      },
      onStatus: (ok) => alive && setConnected(ok),
    }, props.crest);
    const t = setTimeout(() => alive && setSlow(true), 8000);
    return () => {
      alive = false;
      clearTimeout(t);
      session.current?.close(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ses = session.current;
  const exit = () => {
    ses?.close(true);
    props.onExit();
  };
  if (!ses) return <Connecting text="" error="Ese código de sala no es válido." onExit={props.onExit} />;
  if (closed) {
    const prev = lastRoom.current;
    return (
      <Connecting text="" error="El anfitrión ha cerrado la sala." onExit={props.onExit}>
        {prev?.gameId && account && prev.game ? <RateHost gameId={prev.gameId} hostName={prev.seats[0].name} /> : null}
      </Connecting>
    );
  }
  if (!room) {
    return <Connecting text={slow ? `No encuentro la sala ${ses.code}. Comprueba el código y que el anfitrión la tenga abierta.` : `Entrando en la sala ${ses.code}…`} onExit={props.onExit} />;
  }
  const seat = ses.seat;
  if (seat < 0) {
    return <Connecting text={ses.kicked ? 'El anfitrión te ha sacado de la sala.' : room.game ? 'La partida ya ha empezado sin ti.' : 'La sala está llena. Pide al anfitrión que añada un club.'} onExit={props.onExit} />;
  }

  if (!room.game) {
    return (
      <View style={{ flex: 1 }}>
        <NavBar subtitle={`Sala ${room.code} · sala de espera`} />
        <Offline connected={connected} />
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Overline>SALA {room.code}</Overline>
          <Text style={s.h1}>Estás dentro</Text>
          <Text style={[s.p, { marginBottom: 14 }]}>Esperando a que {room.seats[0].name} empiece la partida.</Text>
          {hostCard ? (
            <View style={[s.panel, s.row]}>
              <View style={{ flex: 1 }}>
                <Overline>ANFITRIÓN · {hostCard.username.toUpperCase()}</Overline>
                <Text style={[s.p, { marginTop: 2 }]}>
                  {hostCard.host_games} partidas terminadas · {hostCard.host_abandons} abandonadas
                </Text>
              </View>
              {hostCard.stars !== null ? <Stars value={hostCard.stars} /> : <Text style={{ color: C.faint, fontSize: 12 }}>Sin valorar</Text>}
            </View>
          ) : null}
          {backendEnabled() && !account ? <Text style={[s.p, { fontSize: 12, marginBottom: 10 }]}>Juegas sin cuenta: esta partida no contará en tu historial ni en el ranking.</Text> : null}
          <Text style={[s.p, { marginBottom: 10 }]}>
            {room.league === 'femenina' ? 'Liga femenina' : 'Liga masculina'} · {room.clubs} clubes · {SEASONS.find((x) => x.key === room.season)?.label ?? ''} jornadas
          </Text>
          <Seats room={room} mine={seat} />
          <Btn kind="ghost" label="Salir de la sala" onPress={exit} style={{ marginTop: 10 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Offline connected={connected} />
      <GameView
        game={room.game}
        seat={seat}
        onHelp={props.onHelp}
        onExit={exit}
        exitText="Si sales, tu club pasará a manos de la IA durante el resto de la partida."
        exitExtra={
          gameId && account ? (
            <View style={{ marginBottom: 10 }}>
              <Btn small kind="ghost" label="El anfitrión ha desaparecido: avisar" onPress={() => rpc<boolean>('report_abandon', { p_game: gameId }).then((ok) => setReportMsg(ok ? 'Partida marcada como abandonada por el anfitrión. Puedes valorarle desde tu historial.' : 'El anfitrión ha dado señales hace menos de 10 minutos. Espera un poco más.'), (e: Error) => setReportMsg(e.message))} />
              {reportMsg ? <Text style={[s.p, { fontSize: 12, textAlign: 'center', marginTop: 6 }]}>{reportMsg}</Text> : null}
            </View>
          ) : undefined
        }
        endExtra={gameId && account ? <RateHost gameId={gameId} hostName={room.seats[0].name} /> : undefined}
        dispatch={(a) => ses.act(a)}
        online={{
          isHost: false,
          connected,
          iAmReady: room.ready.includes(seat),
          waitingFor: pendingReady(room).map((i) => room.seats[i].name),
          onReady: () => ses.ready(),
        }}
      />
    </View>
  );
}
