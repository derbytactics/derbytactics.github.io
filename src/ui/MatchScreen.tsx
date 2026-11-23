import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, Text, View } from 'react-native';
import { Action, CONFIG, GameState, MatchCardEvent, MatchResult, Player, ReactionOffer, RollReport, SPECIAL_INFO, cardName, currentRoller, fielded, footballer, isOut, penaltiesOf, specialCard, standings, substitution, ticketPerGoal, words, ruleWords } from '../engine';
import { PACES, PACE_FACTOR, getPace, setPace, usePace } from './pace';
import { CARD_TYPE } from './cardTypes';
import { Avatar, Crest, Die } from './art';
import { NumberLine, SPECIAL_ICON, SpecialCardFace } from './GameScreen';
import { Btn, FootballerCard, Overline, PhaseStepper, Pop, RosterContext, StandingsTable, s } from './components';
import { News, NewsKind, rollNews, rollScore } from './narrative';
import { Sfx, play } from './sound';
import { Tip } from './Tip';
import { C, DISPLAY, NATIVE_DRIVER } from './theme';
import { useClubColor } from './clubColors';
import { I, Icon, IconName } from './icons';

const ordinal = (n: number) => `${n}.º`;

/** Ritmo de la crónica: tiempo de dados, entre noticias y de lectura final antes de poder seguir. */
const SPEED = (globalThis as { __FUTCARDS_SPEED__?: number }).__FUTCARDS_SPEED__ ?? 1;
const DICE_MS = 1000 / SPEED;
/** Pausa entre noticias y tiempo final de lectura, según el ritmo elegido. */
const newsMs = () => (2800 * PACE_FACTOR[getPace()]) / SPEED;
const readMs = () => (1200 * PACE_FACTOR[getPace()]) / SPEED;
/** Segundos para decidir si se juega una carta de giro. */
const REACT_S = 8;
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
  const clubColor = useClubColor();
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
          <Text style={{ color: C.text, fontSize: 22, ...DISPLAY }}>{headline}</Text>
        </View>
        {r.rank === 1 ? <Icon name={I.medal} size={34} color={C.accent} /> : null}
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
          {r.saves ? ` · ${r.saves} ${r.saves === 1 ? 'parada' : 'paradas'} ${words(state, keeperOf(p)).fem ? 'de la portera' : 'del portero'}: ${r.saveBonus}M` : ''}
        </Text>
        {r.keeperCard ? (
          <Text style={{ color: C.good, fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>Tu {words(state, keeperOf(p)).keeper} gana una carta especial por sus paradas</Text>
        ) : null}
        <Text style={{ color: C.text, fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>
          Llevas {p.points} puntos · vas {ordinal(leaguePos)} en la liga · {p.money}M en caja
        </Text>
      </View>
    </View>
  );
}

const NEWS_STYLE: Record<NewsKind, { color: string; icon: IconName }> = {
  attack: { color: '#C9D3DC', icon: I.ball },
  goal: { color: C.accent, icon: I.goal },
  stopped: { color: '#8FA89A', icon: I.save },
  concede: { color: C.danger, icon: I.concede },
  save: { color: C.good, icon: I.save },
  info: { color: C.selLine, icon: 'circle-small' },
  var: { color: C.danger, icon: I.var },
  card: { color: C.good, icon: I.card },
};

/** Una noticia de la tirada: aparece con una pequeña animación. */
function NewsCard({ news, big, action }: { news: News; big: boolean; action?: React.ReactNode }) {
  const clubColor = useClubColor();
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
            <Icon name={st.icon} size={24} color={st.color} style={{ marginRight: 10 }} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: strong ? st.color : C.text, fontSize: strong ? 20 : 14, fontWeight: '900' }}>{news.title}</Text>
            <Text style={{ color: C.text, fontSize: 14, lineHeight: 20, marginTop: 2 }}>{news.text}</Text>
          </View>
          {action ? <View style={{ marginLeft: 10 }}>{action}</View> : null}
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
 * Botón de seguir. En línea lleva cuenta atrás (`auto`): si nadie lo pulsa, el árbitro ordena seguir
 * para no bloquear a los demás. En un dispositivo espera a que la persona pulse.
 * `token` reinicia la cuenta cuando cambia lo que se está esperando.
 */
function RefereeButton({ label, icon, seconds, token, auto, onGo }: { label: string; icon?: IconName; seconds: number; token: string; auto: boolean; onGo: (forced: boolean) => void }) {
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
    if (!auto) return;
    const t = setInterval(() => setLeft((x) => x - 1), TICK_MS);
    return () => clearInterval(t);
  }, [token, seconds, auto]);
  useEffect(() => {
    if (auto && left <= 0 && !fired.current) {
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
      <Btn icon={icon} label={label} onPress={go} />
      {auto ? (
      <View style={[s.row, { justifyContent: 'center', marginTop: 8 }]}>
        <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: left <= 2 ? C.danger : C.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: left <= 2 ? C.danger : C.accent, fontWeight: '900', fontSize: 13 }}>{Math.max(0, left)}</Text>
        </View>
        <Text style={{ color: C.dim, fontSize: 12, fontWeight: '700', marginLeft: 8 }}>El árbitro cuenta: si no, ordena seguir</Text>
      </View>
      ) : null}
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
        <Text style={{ color: sum === null ? C.faint : sum === 7 ? '#fff' : C.accentText, fontSize: 34, ...DISPLAY }}>{sum ?? '?'}</Text>
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
  /** Partida en línea: el árbitro sigue solo si nadie pulsa, para no bloquear a los demás. */
  online?: boolean;
  /** Un dispositivo: juega de golpe las tiradas que falten y va al resultado. */
  onSkip?: () => void;
  /** Cartas durante el partido (árbitro, jugada y giros). */
  act?: (a: Action) => string | null;
}) {
  usePace();
  const clubColor = useClubColor();
  const { state, focus } = props;
  const live = state.phase === 'match' && !!state.match;
  const rolls = live ? state.match!.rolls : state.lastMatch?.rolls ?? [];
  const rollers = live ? state.match!.rollers : state.lastMatch?.rollers ?? [];
  const total = rollers.length;
  const rw = ruleWords(state.league);
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
  // Giro pendiente: el partido espera a que alguien decida si juega su carta.
  const offer = live ? state.match!.pending?.[0] ?? null : null;
  const answers = (id: number) => (viewer === null ? !state.players[id].isBot : viewer === id);
  const myOffer = offer && offer.roll === cur && !rolling && answers(offer.playerId) ? offer : null;
  const answer = (use: boolean) => myOffer && props.act?.({ type: 'react', playerId: myOffer.playerId, use });
  // La noticia sobre la que se ofrece el giro: el gol que te marcan o la jugada que te paran.
  const offerNews = myOffer ? news.findIndex((nw) => (myOffer.kind === 'salvada' ? nw.kind === 'concede' && nw.club === myOffer.attacker : nw.kind === 'stopped')) : -1;
  const events = (live ? state.match!.events : report?.events) ?? [];
  const seenEvents = events.filter((e) => e.beforeRoll <= cur + 1);

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
      t = revealed < news.length ? setTimeout(() => setRevealed((x) => x + 1), newsMs()) : setTimeout(() => setReady(true), readMs());
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
  const readDuration = DICE_MS + news.length * newsMs() + readMs();
  // Tras leer, los giros que lleguen se enseñan al momento.
  const shownNews = ready ? news : news.slice(0, revealed);
  const reactAction = (i: number) =>
    myOffer && i === offerNews ? <ReactButton offer={myOffer} onUse={() => answer(true)} onPass={() => answer(false)} /> : undefined;

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
              <Text style={[s.th, { width: 52 }]}>PTS</Text>
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
          {props.footer ?? <Btn icon={last ? I.trophy : undefined} label={last ? 'Ver el final de temporada' : `Ir al mercado de la jornada ${state.jornada + 1} →`} onPress={props.onNext} />}
          <Acta state={state} rolls={rolls} rollers={rollers} events={events} />
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
              {`Cada club tira los dados una vez. Con el número que salga atacan ${rw.theForwards} y ${rw.mids} que lo tengan, y ${rw.theKeepers} y defensas con ese mismo número intentan pararlo. Tú solo verás lo que te afecta; el resto queda en el acta.`}
            </Tip>
            <Text style={s.h1}>Mercado cerrado. ¡A jugar!</Text>
            <Text style={[s.p, { marginTop: 6, marginBottom: 12 }]}>
              {`Un partido de todos contra todos: cada club tira los dados una vez (${total} tiradas). Si te sale un 7, no hay jugada pero robas una carta especial. Con el número que salga atacan ${rw.theForwards} y ${rw.mids} que lo tengan, y cada rival lo para si ${rw.yourKeeper} y ${rw.yourBacks} con ese número suman al menos la misma fuerza.`}
            </Text>
            {penalties.map((pen, i) => (
              <View key={i} style={[s.panel, s.row, { borderColor: isMine(pen.playerId) ? C.accent : isMine(pen.rival) ? C.danger : C.line }]}>
                <Icon name={I.goal} size={26} color={C.accent} style={{ marginRight: 10 }} />
                <Text style={{ color: C.text, fontWeight: '700', flex: 1 }}>
                  Penalti a favor de {name(pen.playerId)}: lo transforma y marca a {name(pen.rival)}.
                </Text>
              </View>
            ))}
            <Lineups state={state} highlight={(id) => isMine(id)} />
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
                <View style={s.row}><Icon name={I.timer} size={14} color={C.dim} style={{ marginRight: 5 }} /><Text style={{ color: C.dim, fontSize: 12, fontWeight: '700' }}>El árbitro ordena que siga el partido.</Text></View>
              </View>
            ) : null}
            {rolling ? <Text style={[s.p, { marginTop: 12 }]}>Los dados están en el aire…</Text> : null}
            {!rolling ? shownNews.map((nw, i) => <NewsCard key={`${cur}-${i}`} news={nw} big={i === shownNews.length - 1} action={reactAction(i)} />) : null}
            {myOffer && (offerNews < 0 || offerNews >= shownNews.length) && ready ? (
              <Pop style={{ alignSelf: 'stretch', marginTop: 8 }}>
                <View style={[s.panel, s.row, { borderColor: CARD_TYPE.giro.color, marginBottom: 0 }]}>
                  <Text style={{ color: C.text, fontWeight: '800', flex: 1 }}>
                    {viewer === null ? `${name(myOffer.playerId)}: ` : ''}
                    {myOffer.kind === 'salvada' ? `¿Evitas el gol de ${name(myOffer.attacker)}?` : `¿Fuerzas la cantada de ${name(myOffer.rival)}?`}
                  </Text>
                  <ReactButton offer={myOffer} onUse={() => answer(true)} onPass={() => answer(false)} />
                </View>
              </Pop>
            ) : null}
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
        <MatchEvents state={state} events={seenEvents} viewer={viewer} />
        <View style={[s.panel, { borderColor: ready && !awaiting ? C.accent : C.line }]}>
          {offer && !queued && ready ? (
            <View style={[s.row, { justifyContent: 'center' }]}>
              <Icon name={CARD_TYPE.giro.icon} size={18} color={CARD_TYPE.giro.color} style={{ marginRight: 8 }} />
              <Text style={{ color: C.text, fontWeight: '800', flexShrink: 1 }}>
                {myOffer ? 'Decide si juegas tu carta…' : `${name(offer.playerId)} decide si juega una carta…`}
              </Text>
            </View>
          ) : !ready || awaiting ? (
            <>
              <Text style={{ color: C.dim, fontWeight: '700', textAlign: 'center' }}>{awaiting && ready ? 'Tirando los dados…' : 'Leyendo la jugada…'}</Text>
              <ReadingBar duration={readDuration} token={readToken} />
            </>
          ) : queued ? (
            <RefereeButton auto={!!props.online} token={`q${cur}`} seconds={REFEREE_S} label={cur < 0 ? 'Ver la primera tirada ▸' : 'Ver la siguiente tirada ▸'} onGo={advance} />
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
                  auto={!!props.online}
                  token={`r${rolls.length}`}
                  seconds={cur < 0 ? REFEREE_S * 2 : REFEREE_S}
                  icon={I.dice}
                  label={roller === viewer || viewer === null ? 'Tirar los dados' : `Que tire ${name(roller)}`}
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

        {props.onSkip && (live || queued || !ready) ? (
          <Btn
            small
            kind="ghost"
            icon={I.skip}
            label="Saltar al resultado"
            onPress={() => {
              if (live) props.onSkip!();
              setReparto(true);
            }}
            style={{ alignSelf: 'center', marginBottom: 12 }}
          />
        ) : null}

        {live && viewer !== null && props.act ? <SubstitutionPanel state={state} me={state.players[viewer]} act={props.act} /> : null}
        {live && viewer !== null && props.act ? <MatchHand state={state} me={state.players[viewer]} act={props.act} /> : null}

        {/* Tus números y tus cartas, siempre a mano durante el partido. */}
        {cur >= 0
          ? state.players.filter((p) => isMine(p.id)).map((p) => (
              <View key={p.id} style={[s.panel, { borderColor: clubColor(p.id) + '66' }]}>
                <View style={[s.row, { marginBottom: 8 }]}>
                  <Crest name={p.name} color={clubColor(p.id)} design={p.crest} size={20} />
                  <Text style={[s.overline, { flex: 1, marginLeft: 8 }]}>{viewer === null ? p.name.toUpperCase() : 'TUS NÚMEROS'}</Text>
                  {viewer !== null ? <Btn small kind="ghost" label={showCards ? 'Ocultar plantilla' : 'Plantilla'} onPress={() => setShowCards((x) => !x)} /> : null}
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
                <Text style={{ color: C.text, fontSize: 25, ...DISPLAY, width: 64, textAlign: 'right' }}>
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
function Acta({ state, rolls, rollers, events = [] }: { state: GameState; rolls: RollReport[]; rollers: number[]; events?: MatchCardEvent[] }) {
  const clubColor = useClubColor();
  const cardsBefore = (i: number) =>
    events.filter((e) => e.beforeRoll === i).map((e, k) => (
      <Text key={`e${i}-${k}`} style={{ color: C.dim, fontSize: 13, lineHeight: 19, marginBottom: 4 }}>
        <Icon name={CARD_TYPE[SPECIAL_INFO[specialCard(e.cardId).kind].timing].icon} size={13} color={C.dim} /> {eventText(state, e, null)}
      </Text>
    ));
  return (
    <View style={[s.panel, { marginTop: 4 }]}>
      <Overline>ACTA DEL PARTIDO</Overline>
      <View style={{ marginTop: 6 }}>
        {rolls.map((r, i) => (
          <React.Fragment key={i}>
          {cardsBefore(i)}
          <View style={[s.row, { alignItems: 'flex-start', paddingVertical: 7, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }]}>
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
          </React.Fragment>
        ))}
        {cardsBefore(rolls.length)}
      </View>
    </View>
  );
}

/** Alineaciones descubiertas al pitido inicial: los titulares de cada club por posición. */
function Lineups({ state, highlight }: { state: GameState; highlight: (id: number) => boolean }) {
  const clubColor = useClubColor();
  const roster = React.useContext(RosterContext) ?? state.roster;
  const order = { POR: 0, DEF: 1, MED: 2, DEL: 3 } as const;
  const surname = (id: string) => (roster?.[id]?.name ?? footballer(id).name).split(' ').slice(-1)[0];
  const lineupOf = (p: Player) => [...(p.starters ?? p.squad.map((e) => e.cardId))].sort((a, b) => order[footballer(a).position] - order[footballer(b).position]);
  if (!state.players.some((p) => p.starters)) return null;
  return (
    <View style={s.panel}>
      <Overline>ALINEACIONES</Overline>
      {state.players.map((p) => (
        <View key={p.id} style={[s.row, { marginTop: 8, alignItems: 'flex-start' }]}>
          <Crest name={p.name} color={clubColor(p.id)} design={p.crest} size={22} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text numberOfLines={1} style={{ color: highlight(p.id) ? C.accent : C.text, fontWeight: '800' }}>{p.name}</Text>
            <Text style={{ color: C.dim, fontSize: 12, marginTop: 1 }}>
              {lineupOf(p).length ? lineupOf(p).map((id) => `${footballer(id).position} ${surname(id)}`).join(' · ') : 'Sin futbolistas'}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Botón de giro sobre la noticia: jugar la carta o dejar seguir, con cuenta atrás. */
function ReactButton({ offer, onUse, onPass }: { offer: ReactionOffer; onUse: () => void; onPass: () => void }) {
  const [left, setLeft] = useState(REACT_S);
  const key = `${offer.roll}-${offer.kind}-${offer.attacker}-${offer.rival}`;
  const [shown, setShown] = useState(key);
  if (shown !== key) {
    setShown(key);
    setLeft(REACT_S);
  }
  const done = useRef('');
  useEffect(() => {
    const t = setInterval(() => setLeft((x) => x - 1), TICK_MS);
    return () => clearInterval(t);
  }, [key]);
  useEffect(() => {
    if (left <= 0 && done.current !== key) {
      done.current = key;
      onPass();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);
  const go = (use: boolean) => {
    if (done.current === key) return;
    done.current = key;
    if (use) onUse();
    else onPass();
  };
  const color = CARD_TYPE.giro.color;
  return (
    <View style={{ alignItems: 'center', width: 104 }}>
      <Btn small icon={offer.kind === 'salvada' ? 'shield-alert' : 'hand-back-left-off'} label={offer.kind === 'salvada' ? 'Salvada' : 'Cantada'} onPress={() => go(true)} style={{ backgroundColor: color, borderColor: color, alignSelf: 'stretch' }} />
      <Btn small kind="ghost" label={`No (${Math.max(0, left)})`} onPress={() => go(false)} style={{ marginTop: 6, alignSelf: 'stretch' }} />
    </View>
  );
}

/** Portero (o portera) de un club, para que el texto concuerde. */
const keeperOf = (p: Player) => p.squad.find((e) => footballer(e.cardId).position === 'POR')?.cardId;

/** Texto de una carta jugada en el partido. */
function eventText(state: GameState, e: MatchCardEvent, viewer: number | null): string {
  const name = (id: number) => (id === viewer ? 'tú' : state.players[id].name);
  const kind = specialCard(e.cardId).kind;
  const by = state.players[e.playerId].name;
  const target = e.targetCardId ? `${cardName(state, e.targetCardId)} (${state.players[e.targetPlayerId!].name})` : name(e.targetPlayerId!);
  if (e.blocked) return `${by} pide «${SPECIAL_INFO[kind].title}» contra ${state.players[e.targetPlayerId!].name}, pero su gabinete jurídico la anula.`;
  switch (kind) {
    case 'amarilla':
      return e.secondYellow ? `Segunda amarilla a ${target}: a la calle. La pidió ${by}.` : `Amarilla a ${target}: jugará con menos fuerza. La pidió ${by}.`;
    case 'roja':
      return `¡Roja directa a ${target}! Fuera del partido y de la jornada siguiente. La pidió ${by}.`;
    case 'lesion':
      return `${target} se retira ${words(state, e.targetCardId).injured}. Estará ${CONFIG.special.injuryRounds} jornadas de baja.`;
    case 'penalti':
      return `¡Penalti a favor de ${by}! Gol a ${state.players[e.targetPlayerId!].name}.`;
    default:
      return `${by} juega «${SPECIAL_INFO[kind].title}».`;
  }
}

/** Cartas de árbitro y de jugada lanzadas hasta ahora en el partido. */
function MatchEvents({ state, events, viewer }: { state: GameState; events: MatchCardEvent[]; viewer: number | null }) {
  if (!events.length) return null;
  return (
    <View style={[s.panel, { borderColor: CARD_TYPE.arbitro.color + '88' }]}>
      <View style={[s.row, { marginBottom: 4 }]}>
        <Icon name={CARD_TYPE.arbitro.icon} size={16} color={CARD_TYPE.arbitro.color} style={{ marginRight: 6 }} />
        <Overline>CARTAS DEL PARTIDO</Overline>
      </View>
      {[...events].reverse().map((e, i) => {
        const kind = specialCard(e.cardId).kind;
        return (
          <View key={`${e.cardId}-${i}`} style={[s.row, { marginTop: 6, alignItems: 'flex-start' }]}>
            <Icon name={SPECIAL_ICON[kind]} size={18} color={kind === 'roja' ? C.danger : kind === 'amarilla' ? '#F5C542' : CARD_TYPE[SPECIAL_INFO[kind].timing].color} style={{ marginRight: 8, marginTop: 1 }} />
            <Text style={{ color: e.playerId === viewer || e.targetPlayerId === viewer ? C.text : C.dim, flex: 1, fontWeight: e.targetPlayerId === viewer ? '800' : '600' }}>{eventText(state, e, viewer)}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Tus cartas especiales durante el partido: las de árbitro y de jugada se lanzan desde aquí. */
function MatchHand({ state, me, act }: { state: GameState; me: Player; act: (a: Action) => string | null }) {
  const clubColor = useClubColor();
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState<{ index: number; rival: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const J = state.jornada;
  const playable = me.hand.filter((id) => ['arbitro', 'jugada'].includes(SPECIAL_INFO[specialCard(id).kind].timing)).length;
  const fire = (a: Action) => {
    const why = act(a);
    setError(why);
    if (!why) setPicking(null);
  };
  return (
    <View style={[s.panel, { borderColor: playable ? CARD_TYPE.arbitro.color : C.line }]}>
      <View style={s.row}>
        <Icon name="cards" size={18} color={playable ? CARD_TYPE.arbitro.color : C.dim} style={{ marginRight: 8 }} />
        <Text style={{ color: C.text, fontWeight: '800', flex: 1 }}>
          Mis cartas · {me.hand.length}
          {playable ? <Text style={{ color: CARD_TYPE.arbitro.color }}> · {playable} para jugar ahora</Text> : null}
        </Text>
        <Btn small kind={playable ? 'primary' : 'ghost'} label={open ? 'Cerrar' : 'Ver'} onPress={() => { setOpen((x) => !x); setPicking(null); setError(null); }} />
      </View>
      {open ? (
        <View style={{ marginTop: 10 }}>
          {me.hand.length === 0 ? <Text style={s.p}>No tienes cartas. Recibes una al empezar cada jornada.</Text> : null}
          {me.hand.map((id, index) => {
            const info = SPECIAL_INFO[specialCard(id).kind];
            const now = info.timing === 'arbitro' || info.timing === 'jugada';
            const pick = picking?.index === index ? picking : null;
            return (
              <SpecialCardFace key={`${id}-${index}`} id={id}>
                {!now ? (
                  <Text style={{ color: C.faint, fontSize: 12, fontWeight: '700' }}>{info.timing === 'giro' ? 'Te saldrá el botón cuando una jugada te afecte.' : 'Se juega en el mercado.'}</Text>
                ) : !pick ? (
                  <Btn small label="Jugar" onPress={() => { setError(null); setPicking({ index, rival: null }); }} />
                ) : pick.rival === null ? (
                  <View>
                    <Text style={{ color: C.dim, fontWeight: '700', marginBottom: 6 }}>¿Contra qué club?</Text>
                    <View style={[s.row, { flexWrap: 'wrap', gap: 6 }]}>
                      {state.players.filter((p) => p.id !== me.id).map((p) => (
                        <Btn key={p.id} small kind="ghost" label={p.name} onPress={() => (info.target === 'rival' ? fire({ type: 'matchCard', playerId: me.id, handIndex: index, targetPlayerId: p.id }) : setPicking({ index, rival: p.id }))} />
                      ))}
                      <Btn small kind="ghost" label="Cancelar" onPress={() => setPicking(null)} />
                    </View>
                  </View>
                ) : (
                  <View>
                    <Text style={{ color: C.dim, fontWeight: '700', marginBottom: 6 }}>¿A qué titular de {state.players[pick.rival].name}?</Text>
                    <View style={[s.row, { flexWrap: 'wrap', gap: 6 }]}>
                      {fielded(state.players[pick.rival]).filter((e) => !isOut(e, J)).map((e) => (
                        <Btn key={e.cardId} small kind="ghost" label={`${footballer(e.cardId).position} ${cardName(state, e.cardId)}`} onPress={() => fire({ type: 'matchCard', playerId: me.id, handIndex: index, targetPlayerId: pick.rival!, targetCardId: e.cardId })} />
                      ))}
                      <Btn small kind="ghost" label="Atrás" onPress={() => setPicking({ index, rival: null })} />
                    </View>
                  </View>
                )}
              </SpecialCardFace>
            );
          })}
          {error ? <Text style={{ color: C.danger, fontWeight: '700' }}>{error}</Text> : null}
          <Text style={{ color: C.faint, fontSize: 12, marginTop: 4 }}>Puedes jugar hasta 2 cartas de árbitro o de jugada por partido. Afectan desde la siguiente tirada.</Text>
        </View>
      ) : null}
      <View style={[s.row, { marginTop: 10, gap: 6 }]}>
        <Text style={{ color: C.faint, fontSize: 12 }}>Ritmo de la crónica:</Text>
        {PACES.map((p) => (
          <Text key={p.key} onPress={() => setPace(p.key)} style={{ color: getPace() === p.key ? clubColor(me.id) : C.dim, fontSize: 12, fontWeight: getPace() === p.key ? '900' : '600', textDecorationLine: getPace() === p.key ? 'underline' : 'none' }}>
            {p.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Cambio: si te han expulsado o lesionado a un titular y tienes suplentes, eliges quién entra. */
function SubstitutionPanel({ state, me, act }: { state: GameState; me: Player; act: (a: Action) => string | null }) {
  const sub = substitution(state, me);
  if (!sub) return null;
  const out = sub.out[0];
  return (
    <Pop style={{ alignSelf: 'stretch' }}>
      <View style={[s.panel, { borderColor: C.accent }]}>
        <View style={[s.row, { marginBottom: 6 }]}>
          <Icon name="swap-vertical-bold" size={18} color={C.accent} style={{ marginRight: 6 }} />
          <Overline>CAMBIO</Overline>
        </View>
        <Text style={{ color: C.text, fontWeight: '800' }}>
          {cardName(state, out.cardId)} no puede seguir. ¿Quién entra?
        </Text>
        <Text style={[s.p, { marginTop: 2, marginBottom: 8 }]}>Un cambio por partido. Juega desde la siguiente tirada.</Text>
        <View style={[s.row, { flexWrap: 'wrap', gap: 6 }]}>
          {sub.bench.map((e) => (
            <Btn key={e.cardId} small label={`${footballer(e.cardId).position} ${cardName(state, e.cardId)}`} onPress={() => act({ type: 'substitute', playerId: me.id, outCardId: out.cardId, inCardId: e.cardId })} />
          ))}
        </View>
      </View>
    </Pop>
  );
}
