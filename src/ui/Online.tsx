import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { CONFIG, SeasonLength } from '../engine';
import { RoomState, botStep, hostAct, hostReady, pendingReady, playTurnForAbsent, setLobby, startGame } from '../net/room';
import { GuestSession, HostSession } from '../net/session';
import { deviceId } from '../net/storage';
import { Crest } from './art';
import { Btn, Overline, s } from './components';
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

function Seats({ room, mine }: { room: RoomState; mine: number }) {
  return (
    <>
      {Array.from({ length: room.clubs }, (_, i) => {
        const seat = room.seats[i];
        return (
          <View key={i} style={[s.panel, s.row, { paddingVertical: 8, marginBottom: 8, borderStyle: seat ? 'solid' : 'dashed' }]}>
            {seat ? <Crest name={seat.name} color={clubColor(i)} size={34} /> : <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.panelAlt }} />}
            <Text numberOfLines={1} style={{ flex: 1, marginLeft: 10, color: seat ? C.text : C.faint, fontWeight: '700', fontSize: 16 }}>
              {seat ? seat.name : 'Asiento libre'}
            </Text>
            <Text style={{ color: i === mine ? C.accent : C.faint, fontSize: 12, fontWeight: '700' }}>
              {!seat ? 'IA si nadie entra' : i === mine ? 'TÚ' : i === 0 ? 'ANFITRIÓN' : 'CONECTADO'}
            </Text>
          </View>
        );
      })}
    </>
  );
}

function Connecting({ text, error, onExit }: { text: string; error?: string | null; onExit: () => void }) {
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={[s.h2, { textAlign: 'center' }]}>{error ?? text}</Text>
      <Btn small kind="ghost" label="Volver" onPress={onExit} style={{ marginTop: 16 }} />
    </View>
  );
}

// ---------------------------------------------------------------- Anfitrión

export function OnlineHost(props: { name: string; resume: RoomState | null; onHelp: () => void; onExit: () => void }) {
  const session = useRef<HostSession | null>(null);
  const [room, setRoom] = useState<RoomState | null>(props.resume);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    const l = { onChange: (r: RoomState) => alive && setRoom(r), onStatus: (ok: boolean) => alive && setConnected(ok) };
    if (props.resume) {
      session.current = HostSession.resume(props.resume, l);
      if (!session.current) setError('No se ha podido reanudar la sala.');
    } else {
      HostSession.create(deviceId(), props.name, l).then(
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

  const exit = () => {
    session.current?.close(true);
    session.current = null;
    props.onExit();
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
          <Seats room={room} mine={0} />

          <View style={{ marginTop: 6, marginBottom: 20 }}>
            <Overline>DURACIÓN (JORNADAS)</Overline>
            <View style={[s.row, { gap: 8, marginTop: 8 }]}>
              {SEASONS.map((x) => (
                <Btn key={x.key} small kind={room.season === x.key ? 'primary' : 'ghost'} label={x.label} onPress={() => ses.update((r) => setLobby(r, { season: x.key }))} style={{ flex: 1 }} />
              ))}
            </View>
          </View>
          <Btn label={room.seats.length < room.clubs ? `Empezar (la IA lleva ${room.clubs - room.seats.length})` : 'Empezar la pretemporada'} onPress={() => ses.update((r) => startGame(r))} />
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

export function OnlineGuest(props: { code: string; name: string; onHelp: () => void; onExit: () => void }) {
  const session = useRef<GuestSession | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [connected, setConnected] = useState(false);
  const [closed, setClosed] = useState(false);
  const [slow, setSlow] = useState(false);

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
    });
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
  if (closed) return <Connecting text="" error="El anfitrión ha cerrado la sala." onExit={props.onExit} />;
  if (!room) {
    return <Connecting text={slow ? `No encuentro la sala ${ses.code}. Comprueba el código y que el anfitrión la tenga abierta.` : `Entrando en la sala ${ses.code}…`} onExit={props.onExit} />;
  }
  const seat = ses.seat;
  if (seat < 0) {
    return <Connecting text={room.game ? 'La partida ya ha empezado sin ti.' : 'La sala está llena. Pide al anfitrión que añada un club.'} onExit={props.onExit} />;
  }

  if (!room.game) {
    return (
      <View style={{ flex: 1 }}>
        <Offline connected={connected} />
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Overline>SALA {room.code}</Overline>
          <Text style={s.h1}>Estás dentro</Text>
          <Text style={[s.p, { marginBottom: 14 }]}>Esperando a que {room.seats[0].name} empiece la partida.</Text>
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
