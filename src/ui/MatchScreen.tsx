import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, Text, View } from 'react-native';
import { GameState, MatchResult, RollReport, currentRoller, penaltiesOf, standings, ticketPerGoal, words } from '../engine';
import { Avatar, Crest, Die } from './art';
import { NumberLine, SpecialCardFace } from './GameScreen';
import { Btn, FootballerCard, Overline, PhaseStepper, Pop, RosterContext, StandingsTable, s } from './components';
import { News, NewsKind, rollNews, rollScore } from './narrative';
import { Sfx, play } from './sound';
import { Tip } from './Tip';
import { C, NATIVE_DRIVER, clubColor } from './theme';

const ordinal = (n: number) => `${n}.º`;

/** Ritmo de la crónica: tiempo de dados, entre noticias y de lectura final antes de poder seguir. */
const SPEED = (globalThis as { __FUTCARDS_SPEED__?: number }).__FUTCARDS_SPEED__ ?? 1;
const DICE_MS = 1000 / SPEED;
const NEWS_MS = 2800 / SPEED;
const READ_MS = 1200 / SPEED;
/** Segundos que da el árbitro para seguir una vez leída la jugada. */
const REFEREE_S = 5;
const TICK_MS = 1000 / SPEED;

function useCountUp(target: number, run: boolean): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run || target <= 0) return;
    let cur = 0;
    const t = setInterval(() => {
      cur += 1;
      setV(cur);
      if (cur >= target) clearInterval(t);
    }, Math.max(40, 700 / target));
    return () => clearInterval(t);
  }, [target, run]);
  // Sin nada que contar (cero o negativo), se enseña el valor tal cual.
  return run && target <= 0 ? target : v;
}

function Stat({ label, value, color, big }: { label: string; value: string; color?: string; big?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: color ?? C.text, fontSize: big ? 40 : 28, fontWeight: '900', lineHeight: 46 }}>{value}</Text>
      <Text style={[s.overline, { textAlign: 'center' }]}>{label}</Text>
    </View>
  );
}

/** Tarjeta grande con lo que ha conseguido un club en la jornada. */
function HeroResult({ state, r }: { state: GameState; r: MatchResult }) {
  const p = state.players[r.playerId];
  const color = clubColor(p.id);
  const pts = useCountUp(r.points, true);
  const income = r.prize + r.ticket + r.saveBonus;
  const money = useCountUp(income, true);
  const leaguePos = standings(state).findIndex((x) => x.id === p.id) + 1;
  const n = state.players.length;
  const headline = r.rank === 1 ? '¡Ganas la jornada!' : r.rank === n ? 'Jornada para olvidar' : `${ordinal(r.rank)} de ${n} en la jornada`;
  return (
    <View style={{ borderRadius: 16, borderWidth: 2, borderColor: color, backgroundColor: C.panel, marginBottom: 12, overflow: 'hidden' }}>
      <View style={[s.row, { backgroundColor: color + '33', padding: 12 }]}>
        <Crest name={p.name} color={color} design={p.crest} size={40} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Overline>{p.name.toUpperCase()}</Overline>
          <Text style={{ color: C.text, fontSize: 20, fontWeight: '900' }}>{headline}</Text>
        </View>
        {r.rank === 1 ? <Text style={{ fontSize: 30 }}>🥇</Text> : null}
      </View>
      <View style={[s.row, { paddingVertical: 12, paddingHorizontal: 8 }]}>
        <Stat label="A FAVOR – EN CONTRA" value={`${r.goals}–${r.against}`} />
        <View style={{ width: 1, height: 44, backgroundColor: C.line }} />
        <Stat label="PUNTOS DE LIGA" value={`+${pts}`} color={C.accent} big />
        <View style={{ width: 1, height: 44, backgroundColor: C.line }} />
        <Stat label="INGRESOS" value={`+${money}M`} color={C.good} />
      </View>
      <View style={{ borderTopWidth: 1, borderTopColor: C.line, padding: 10 }}>
        <Text style={{ color: C.dim, fontSize: 12, textAlign: 'center' }}>
          Premio por posición {r.prize}M ·{' '}
          {r.closedDoors
            ? 'taquilla 0M (puerta cerrada)'
            : `taquilla ${r.ticket}M (${r.scoringPlays} ${r.scoringPlays === 1 ? 'jugada de gol' : 'jugadas de gol'} × ${ticketPerGoal(p.stadium)}M${r.clubDay ? ' × 2 Día del club' : ''})`}
          {r.saves ? ` · ${r.saves} ${r.saves === 1 ? 'parada' : 'paradas'} ${words(state).fem ? 'de la portera' : 'del portero'}: ${r.saveBonus}M` : ''}
        </Text>
        {r.keeperCard ? (
          <Text style={{ color: C.good, fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>Tu {words(state).keeper} gana una carta especial por sus paradas</Text>
        ) : null}
        <Text style={{ color: C.text, fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>
          Llevas {p.points} puntos · vas {ordinal(leaguePos)} en la liga · {p.money}M en caja
        </Text>
      </View>
    </View>
  );
}

const NEWS_STYLE: Record<NewsKind, { color: string; icon: string }> = {
  attack: { color: '#C9D3DC', icon: '⚽' },
  goal: { color: C.accent, icon: '🥅' },
  stopped: { color: '#8FA89A', icon: '🧤' },
  concede: { color: C.danger, icon: '😖' },
  save: { color: C.good, icon: '🧤' },
  info: { color: C.line, icon: '•' },
  var: { color: C.danger, icon: '📺' },
  card: { color: C.good, icon: '🃏' },
};

/** Una noticia de la tirada: aparece con una pequeña animación. */
function NewsCard({ news, big }: { news: News; big: boolean }) {
  const roster = React.useContext(RosterContext);
  const st = NEWS_STYLE[news.kind];
  const strong = news.kind === 'goal' || news.kind === 'concede' || news.kind === 'save';
  return (
    <Pop style={{ alignSelf: 'stretch', marginTop: 8 }}>
      <View style={{ borderRadius: 14, borderWidth: strong ? 2 : 1, borderColor: st.color, backgroundColor: strong ? st.color + '24' : C.panelAlt, padding: 12 }}>
        <View style={s.row}>
          {news.cards?.length && news.club !== undefined ? (
            <View style={[s.row, { marginRight: 10 }]}>
              {news.cards.slice(0, 2).map((id, i) => (
                <View key={id} style={{ marginLeft: i ? -14 : 0 }}>
                  <Avatar seed={id} who={roster?.[id]} size={big && strong ? 46 : 38} jersey={clubColor(news.club!)} ring={st.color} />
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 22, marginRight: 10 }}>{st.icon}</Text>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: strong ? st.color : C.text, fontSize: strong ? 20 : 14, fontWeight: '900' }}>{news.title}</Text>
            <Text style={{ color: C.text, fontSize: 14, lineHeight: 20, marginTop: 2 }}>{news.text}</Text>
          </View>
        </View>
        {news.specialCardId ? (
          <View style={{ marginTop: 10 }}>
            <SpecialCardFace id={news.specialCardId} />
          </View>
        ) : null}
      </View>
    </Pop>
  );
}

/** Barra que se llena mientras se lee la jugada; al completarse se puede seguir. */
function ReadingBar({ duration, token }: { duration: number; token: string }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: NATIVE_DRIVER }).start();
  }, [token, duration, v]);
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: C.panelAlt, overflow: 'hidden', marginTop: 8 }}>
      <Animated.View style={{ height: 6, width: '100%', backgroundColor: C.accent, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-420, 0] }) }] }} />
    </View>
  );
}

/**
 * Botón con cuenta atrás: si nadie lo pulsa, el árbitro ordena seguir y se ejecuta solo.
 * `token` reinicia la cuenta cuando cambia lo que se está esperando.
 */
function RefereeButton({ label, seconds, token, onGo }: { label: string; seconds: number; token: string; onGo: (forced: boolean) => void }) {
  const [left, setLeft] = useState(seconds);
  // Al cambiar lo que se espera, la cuenta vuelve a empezar (estado derivado del render anterior).
  const [counting, setCounting] = useState(token);
  if (counting !== token) {
    setCounting(token);
    setLeft(seconds);
  }
  const fired = useRef(false);
  useEffect(() => {
    fired.current = false;
    const t = setInterval(() => setLeft((x) => x - 1), TICK_MS);
    return () => clearInterval(t);
  }, [token, seconds]);
  useEffect(() => {
    if (left <= 0 && !fired.current) {
      fired.current = true;
      onGo(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);
  const go = () => {
    if (fired.current) return;
    fired.current = true;
    onGo(false);
  };
  return (
    <View>
      <Btn label={label} onPress={go} />
      <View style={[s.row, { justifyContent: 'center', marginTop: 8 }]}>
        <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: left <= 2 ? C.danger : C.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: left <= 2 ? C.danger : C.accent, fontWeight: '900', fontSize: 13 }}>{Math.max(0, left)}</Text>
        </View>
        <Text style={{ color: C.dim, fontSize: 12, fontWeight: '700', marginLeft: 8 }}>El árbitro cuenta: si no, ordena seguir</Text>
      </View>
    </View>
  );
}

/** Dados que ruedan un instante antes de mostrar el resultado. */
function Dice({ roll, rolling }: { roll: RollReport | null; rolling: boolean }) {
  const [faces, setFaces] = useState<[number, number]>([1, 1]);
  useEffect(() => {
    if (!rolling) return;
    const t = setInterval(() => setFaces([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]), 90);
    return () => clearInterval(t);
  }, [rolling]);
  const show = rolling || !roll ? faces : roll.dice;
  const tone = !roll ? 'ghost' : !rolling && roll.sum === 7 ? 'var' : 'light';
  const sum = roll && !rolling ? roll.sum : null;
  return (
    <Pop trigger={`${rolling}-${sum}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
      <Die value={show[0]} size={64} tone={tone} />
      <Die value={show[1]} size={64} tone={tone} />
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: sum === null ? C.panelAlt : sum === 7 ? C.danger : C.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: sum === null ? C.faint : sum === 7 ? '#fff' : C.accentText, fontSize: 30, fontWeight: '900' }}>{sum ?? '?'}</Text>
      </View>
    </Pop>
  );
}

/**
 * El partido, tirada a tirada. Sirve tanto mientras se juega (fase 'match') como después
 * (fase 'summary'): cada dispositivo lee las tiradas a su ritmo y luego ve el reparto.
 */
export function MatchScreen(props: {
  state: GameState;
  /** Clubes de quien mira esta pantalla. */
  focus?: number[];
  /** Si quien mira puede tirar los dados cuando le toca a ese club. */
  canRoll: (roller: number) => boolean;
  onRoll: () => void;
  onNext: () => void;
  /** Sustituye al botón de pasar de jornada (partidas en línea). */
  footer?: React.ReactNode;
  /** Contenido extra mientras se espera a que otro tire los dados. */
  waitingExtra?: React.ReactNode;
  /** Solo anfitrión: tira por una persona que no responde, pasado un tiempo. */
  onForceAbsent?: () => void;
}) {
  const { state, focus } = props;
  const live = state.phase === 'match' && !!state.match;
  const rolls = live ? state.match!.rolls : state.lastMatch?.rolls ?? [];
  const rollers = live ? state.match!.rollers : state.lastMatch?.rollers ?? [];
  const total = rollers.length;
  const report = live ? null : state.lastMatch;
  const mine = focus ?? state.players.filter((p) => !p.isBot).map((p) => p.id);
  const isMine = (id: number) => mine.includes(id);
  /** Con un solo club delante se cuenta en segunda persona; si no, de forma neutral. */
  const viewer = mine.length === 1 ? mine[0] : null;
  const name = (id: number) => state.players[id].name;

  /** Tirada que se está contando (-1: ninguna todavía). */
  const [cur, setCur] = useState(-1);
  const [rolling, setRolling] = useState(false);
  const [revealed, setRevealed] = useState(0);
  /** Ya ha pasado el tiempo mínimo de lectura de la tirada actual. */
  const [ready, setReady] = useState(true);
  const [reparto, setReparto] = useState(false);
  /** He pedido tirar: en cuanto llegue la tirada se cuenta, sin volver a preguntar. */
  const [awaiting, setAwaiting] = useState(false);
  /** Tirada que empezó porque se agotó la cuenta del árbitro. */
  const [forcedRoll, setForcedRoll] = useState(-1);
  const [showCards, setShowCards] = useState(false);

  const roll = cur >= 0 ? rolls[cur] ?? null : null;
  const news = roll ? rollNews(state, roll, state.jornada * 100 + cur, viewer) : [];

  const advance = (forced: boolean) => {
    if (cur >= rolls.length - 1) return;
    if (forced) {
      setForcedRoll(cur + 1);
      play('whistle');
    }
    setCur(cur + 1);
    setRolling(true);
    setRevealed(0);
    setReady(false);
    setAwaiting(false);
  };

  // Ritmo de cada tirada: dados → noticias una a una → tiempo mínimo de lectura.
  useEffect(() => {
    if (reparto) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    if (awaiting && ready && cur < rolls.length - 1) {
      t = setTimeout(() => advance(forcedRoll === -2), 0);
    } else if (rolling) {
      t = setTimeout(() => {
        setRolling(false);
        setRevealed(1);
      }, DICE_MS);
    } else if (!ready && cur >= 0) {
      t = revealed < news.length ? setTimeout(() => setRevealed((x) => x + 1), NEWS_MS) : setTimeout(() => setReady(true), READ_MS);
    }
    return () => {
      if (t) clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, rolling, revealed, ready, rolls.length, reparto, awaiting]);

  // Sonido: dados al tirar y un efecto por cada noticia que aparece.
  useEffect(() => {
    if (rolling) play('dice');
  }, [rolling, cur]);
  useEffect(() => {
    const nw = !rolling && revealed > 0 ? news[revealed - 1] : null;
    if (!nw) return;
    const map: Partial<Record<string, Sfx>> = { goal: 'goal', concede: 'concede', save: 'save', stopped: 'stopped', var: 'whistle', card: 'card' };
    const sfx = map[nw.kind];
    if (sfx) play(sfx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, rolling, cur]);

  const queued = cur < rolls.length - 1;
  const caughtUp = ready && !queued;
  const roller = live ? currentRoller(state) : null;
  const iRoll = roller !== null && props.canRoll(roller);
  const waitingHuman = caughtUp && live && roller !== null && !iRoll;

  // Anfitrión: si una persona no tira, pasado un tiempo se tira por ella.
  useEffect(() => {
    if (!waitingHuman || !props.onForceAbsent) return;
    const t = setTimeout(props.onForceAbsent, 12 * TICK_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingHuman, rolls.length]);

  // Si la tirada pedida no llega (conexión, turno ya pasado), se vuelve a ofrecer el botón.
  useEffect(() => {
    if (!awaiting) return;
    const t = setTimeout(() => setAwaiting(false), 6000);
    return () => clearTimeout(t);
  }, [awaiting, rolls.length]);

  const doRoll = (forced: boolean) => {
    // -2 marca que la próxima tirada llegará por orden del árbitro.
    setForcedRoll(forced ? -2 : -1);
    setAwaiting(true);
    props.onRoll();
  };
  const counted = rolls.slice(0, rolling ? cur : cur + 1);
  // Los penaltis (cartas) abren el marcador antes de la primera tirada.
  const penalties = penaltiesOf(state, state.jornada);
  const score = (id: number) =>
    counted.reduce((a, r) => ({ gf: a.gf + rollScore(r, id).gf, gc: a.gc + rollScore(r, id).gc }), {
      gf: penalties.filter((x) => x.playerId === id).length,
      gc: penalties.filter((x) => x.rival === id).length,
    });
  const maxGoals = Math.max(1, ...state.players.map((p) => score(p.id).gf));
  const delta = roll && !rolling && viewer !== null && revealed >= news.length ? rollScore(roll, viewer) : null;
  const last = state.jornada >= state.totalJornadas;
  const readToken = `${cur}`;
  const readDuration = DICE_MS + news.length * NEWS_MS + READ_MS;

  if (reparto && report) {
    const humans = report.results.filter((r) => isMine(r.playerId));
    const heroes = humans.length ? humans : report.results.filter((r) => r.rank === 1).slice(0, 1);
    return (
      <View style={{ flex: 1 }}>
        <PhaseStepper step={2} label="REPARTO" />
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={s.h1}>Final de la jornada</Text>
          <Text style={[s.p, { marginBottom: 12 }]}>La jornada se ordena por diferencia de goles. Cuanto más arriba, más puntos de liga y mejor premio.</Text>
          {heroes.map((r) => (
            <HeroResult key={r.playerId} state={state} r={r} />
          ))}
          <View style={s.panel}>
            <View style={[s.row, { marginBottom: 6 }]}>
              <Text style={[s.th, { flex: 1, textAlign: 'left' }]}>REPARTO DE LA JORNADA</Text>
              <Text style={[s.th, { width: 50 }]}>GOLES</Text>
              <Text style={[s.th, { width: 52 }]}>PUNTOS</Text>
              <Text style={[s.th, { width: 56 }]}>DINERO</Text>
            </View>
            {report.results.map((r) => (
              <View key={r.playerId} style={[s.row, s.tr]}>
                <Text style={{ color: C.faint, width: 20, fontWeight: '700' }}>{r.rank}</Text>
                <Crest name={name(r.playerId)} color={clubColor(r.playerId)} design={state.players[r.playerId].crest} size={24} />
                <Text numberOfLines={1} style={{ color: C.text, flex: 1, fontWeight: '700', marginLeft: 8 }}>{name(r.playerId)}</Text>
                <Text style={[s.td, { width: 50, color: C.text, fontWeight: '800' }]}>{r.goals}:{r.against}</Text>
                <Text style={[s.td, { width: 52, color: C.accent, fontWeight: '900', fontSize: 15 }]}>+{r.points}</Text>
                <Text style={[s.td, { width: 56, color: C.good, fontWeight: '800' }]}>+{r.prize + r.ticket + r.saveBonus}M</Text>
              </View>
            ))}
          </View>
          <StandingsTable state={state} />
          {props.footer ?? <Btn label={last ? '🏆 Ver el final de temporada' : `Ir al mercado de la jornada ${state.jornada + 1} →`} onPress={props.onNext} />}
          <Acta state={state} rolls={rolls} rollers={rollers} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <PhaseStepper step={1} label="DÍA DE PARTIDO" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {cur < 0 ? (
          <>
            <Tip id="partido" title="Así se juega el partido">
              Cada club tira los dados una vez. Con el número que salga atacan los delanteros y medios que lo tengan, y los porteros y defensas con ese mismo número intentan pararlo. Tú solo verás lo que te afecta; el resto queda en el acta.
            </Tip>
            <Text style={s.h1}>Mercado cerrado. ¡A jugar!</Text>
            <Text style={[s.p, { marginTop: 6, marginBottom: 12 }]}>
              Un partido de todos contra todos: cada club tira los dados una vez ({total} tiradas). Si te sale un 7, no hay jugada pero robas una carta especial. Con el número que salga atacan los delanteros y medios que lo tengan, y cada rival lo para si su portero y sus defensas con ese número suman al menos la misma fuerza.
            </Text>
            {penalties.map((pen, i) => (
              <View key={i} style={[s.panel, s.row, { borderColor: isMine(pen.playerId) ? C.accent : isMine(pen.rival) ? C.danger : C.line }]}>
                <Text style={{ fontSize: 24, marginRight: 10 }}>🥅</Text>
                <Text style={{ color: C.text, fontWeight: '700', flex: 1 }}>
                  Penalti a favor de {name(pen.playerId)}: lo transforma y marca a {name(pen.rival)}.
                </Text>
              </View>
            ))}
            {state.players.filter((p) => isMine(p.id)).map((p) => (
              <View key={p.id} style={[s.panel, { borderColor: clubColor(p.id) + '88' }]}>
                <View style={[s.row, { marginBottom: 8 }]}>
                  <Crest name={p.name} color={clubColor(p.id)} design={p.crest} size={24} />
                  <Text style={{ color: C.text, fontWeight: '800', marginLeft: 8, flex: 1 }}>{p.name}</Text>
                  <Overline>TUS NÚMEROS</Overline>
                </View>
                <NumberLine player={p} jornada={state.jornada} state={state} />
              </View>
            ))}
          </>
        ) : (
          <View style={[s.panel, { alignItems: 'center', paddingVertical: 16 }]}>
            <View style={[s.row, { alignSelf: 'stretch' }]}>
              <Text style={[s.overline, { flex: 1 }]}>TIRADA {cur + 1} DE {total}</Text>
              <View style={s.row}>
                <Crest name={name(rollers[cur])} color={clubColor(rollers[cur])} design={state.players[rollers[cur]].crest} size={18} />
                <Text style={[s.overline, { marginLeft: 6, color: C.dim }]}>TIRA {name(rollers[cur]).toUpperCase()}</Text>
              </View>
            </View>
            <Dice roll={roll} rolling={rolling} />
            {forcedRoll === cur ? (
              <View style={{ backgroundColor: C.panelAlt, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginTop: 10 }}>
                <Text style={{ color: C.dim, fontSize: 12, fontWeight: '700' }}>⏱ El árbitro ordena que siga el partido.</Text>
              </View>
            ) : null}
            {rolling ? <Text style={[s.p, { marginTop: 12 }]}>Los dados están en el aire…</Text> : null}
            {!rolling ? news.slice(0, revealed).map((nw, i) => <NewsCard key={`${cur}-${i}`} news={nw} big={i === revealed - 1} />) : null}
            {delta && (delta.gf || delta.gc) ? (
              <Pop style={{ marginTop: 10 }}>
                <View style={[s.row, { gap: 8 }]}>
                  {delta.gf ? <View style={{ backgroundColor: C.good + '2E', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}><Text style={{ color: C.good, fontWeight: '900' }}>+{delta.gf} a favor</Text></View> : null}
                  {delta.gc ? <View style={{ backgroundColor: C.danger + '2E', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}><Text style={{ color: C.danger, fontWeight: '900' }}>+{delta.gc} en contra</Text></View> : null}
                </View>
              </Pop>
            ) : null}
          </View>
        )}

        {/* Qué toca ahora: leer, seguir, tirar los dados, esperar o pasar al reparto. */}
        <View style={[s.panel, { borderColor: ready && !awaiting ? C.accent : C.line }]}>
          {!ready || awaiting ? (
            <>
              <Text style={{ color: C.dim, fontWeight: '700', textAlign: 'center' }}>{awaiting && ready ? 'Tirando los dados…' : 'Leyendo la jugada…'}</Text>
              <ReadingBar duration={readDuration} token={readToken} />
            </>
          ) : queued ? (
            <RefereeButton token={`q${cur}`} seconds={REFEREE_S} label={cur < 0 ? 'Ver la primera tirada ▸' : 'Ver la siguiente tirada ▸'} onGo={advance} />
          ) : live && roller !== null ? (
            iRoll ? (
              <>
                <View style={[s.row, { justifyContent: 'center', marginBottom: 8 }]}>
                  <Crest name={name(roller)} color={clubColor(roller)} design={state.players[roller].crest} size={22} />
                  <Text style={{ color: C.text, fontWeight: '800', marginLeft: 8 }}>
                    {roller === viewer ? (cur < 0 ? 'Abres tú el partido' : '¡Te toca tirar!') : `Turno de ${name(roller)}`}
                  </Text>
                </View>
                <RefereeButton
                  token={`r${rolls.length}`}
                  seconds={cur < 0 ? REFEREE_S * 2 : REFEREE_S}
                  label={roller === viewer || viewer === null ? '🎲 Tirar los dados' : `🎲 Que tire ${name(roller)}`}
                  onGo={doRoll}
                />
              </>
            ) : (
              <>
                <View style={[s.row, { justifyContent: 'center' }]}>
                  <Crest name={name(roller)} color={clubColor(roller)} design={state.players[roller].crest} size={24} />
                  <Text style={{ color: C.text, fontWeight: '800', marginLeft: 8 }}>Esperando a que {name(roller)} tire los dados…</Text>
                </View>
                {props.waitingExtra}
              </>
            )
          ) : (
            <Btn label="Ver el reparto de la jornada →" onPress={() => setReparto(true)} />
          )}
        </View>

        {/* Tus números y tus cartas, siempre a mano durante el partido. */}
        {cur >= 0
          ? state.players.filter((p) => isMine(p.id)).map((p) => (
              <View key={p.id} style={[s.panel, { borderColor: clubColor(p.id) + '66' }]}>
                <View style={[s.row, { marginBottom: 8 }]}>
                  <Crest name={p.name} color={clubColor(p.id)} design={p.crest} size={20} />
                  <Text style={[s.overline, { flex: 1, marginLeft: 8 }]}>{viewer === null ? p.name.toUpperCase() : 'TUS NÚMEROS'}</Text>
                  {viewer !== null ? <Btn small kind="ghost" label={showCards ? 'Ocultar cartas' : 'Ver mis cartas'} onPress={() => setShowCards((x) => !x)} /> : null}
                </View>
                <NumberLine player={p} jornada={state.jornada} state={state} highlight={roll && !rolling ? roll.sum : undefined} />
                {showCards && viewer !== null ? (
                  <View style={{ marginTop: 10 }}>
                    {p.squad.map((e) => (
                      <FootballerCard key={e.cardId} cardId={e.cardId} entry={e} state={state} owner={p} />
                    ))}
                  </View>
                ) : null}
              </View>
            ))
          : null}

        <View style={s.panel}>
          <View style={s.row}>
            <Text style={[s.overline, { flex: 1 }]}>MARCADOR</Text>
            <Text style={s.overline}>A FAVOR : EN CONTRA</Text>
          </View>
          {state.players.map((p) => {
            const sc = score(p.id);
            return (
              <View key={p.id} style={[s.row, { marginTop: 8, padding: 6, borderRadius: 10, backgroundColor: isMine(p.id) && viewer !== null ? clubColor(p.id) + '22' : 'transparent' }]}>
                <Crest name={p.name} color={clubColor(p.id)} design={p.crest} size={28} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text numberOfLines={1} style={{ color: C.text, fontWeight: '700', fontSize: 13 }}>
                    {p.name}
                    {viewer === p.id ? <Text style={{ color: C.accent }}> · TÚ</Text> : null}
                  </Text>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: C.panelAlt, marginTop: 4 }}>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: clubColor(p.id), width: `${Math.min(100, (100 * sc.gf) / maxGoals)}%` }} />
                  </View>
                </View>
                <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', width: 64, textAlign: 'right' }}>
                  {sc.gf}
                  <Text style={{ color: C.faint }}> : </Text>
                  <Text style={{ color: C.dim }}>{sc.gc}</Text>
                </Text>
              </View>
            );
          })}
        </View>

        {cur > 0 ? <Acta state={state} rolls={rolls.slice(0, cur)} rollers={rollers} /> : null}
      </ScrollView>
    </View>
  );
}

/** Crónica neutral de las tiradas ya jugadas. */
function Acta({ state, rolls, rollers }: { state: GameState; rolls: RollReport[]; rollers: number[] }) {
  return (
    <View style={[s.panel, { marginTop: 4 }]}>
      <Overline>ACTA DEL PARTIDO</Overline>
      <View style={{ marginTop: 6 }}>
        {penaltiesOf(state, state.jornada).map((pen, i) => (
          <Text key={`p${i}`} style={{ color: C.dim, fontSize: 13, lineHeight: 19, marginBottom: 4 }}>
            🥅 <Text style={{ color: clubColor(pen.playerId), fontWeight: '800' }}>{state.players[pen.playerId].name}</Text> marca de penalti a {state.players[pen.rival].name}.
          </Text>
        ))}
        {rolls.map((r, i) => (
          <View key={i} style={[s.row, { alignItems: 'flex-start', paddingVertical: 7, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }]}>
            <View style={{ width: 34, height: 34, borderRadius: 9, borderWidth: 1.5, borderColor: r.sum === 7 ? C.danger : C.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: C.text, fontWeight: '800' }}>{r.sum}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[s.overline, { marginBottom: 2 }]}>TIRADA {i + 1} · {state.players[rollers[i]]?.name.toUpperCase()}</Text>
              {rollNews(state, r, state.jornada * 100 + i, null).map((nw, k) => (
                <Text key={k} style={{ color: C.dim, fontSize: 13, lineHeight: 19, marginBottom: 2 }}>
                  {nw.club !== undefined ? <Text style={{ color: clubColor(nw.club), fontWeight: '800' }}>{state.players[nw.club].name}: </Text> : null}
                  {nw.text}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
