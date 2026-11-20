import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import {
  GameState,
  Player,
  SquadEntry,
  activeNumbers,
  basePrice,
  cardName,
  footballer,
  isBooked,
  isOut,
  isProtected,
  onStreak,
  pipsOf,
  standings,
  roleOf,
  tierForPrice,
} from '../engine';
import { useAccount } from '../account/useAccount';
import { Avatar, Crest } from './art';
import { useMyClub } from '../account/club';
import { isMuted, setMuted, soundAvailable } from './sound';
import { C, NATIVE_DRIVER, POS_COLOR, TIER_COLOR, clubColor } from './theme';

export function Btn(props: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger' | 'muted';
  small?: boolean;
  style?: ViewStyle;
}) {
  const kind = props.kind ?? 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.onPress}
      style={({ pressed }) => [
        s.btn,
        props.small && s.btnSmall,
        kind === 'ghost' && s.btnGhost,
        kind === 'muted' && s.btnMuted,
        kind === 'danger' && s.btnDanger,
        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
        props.style,
      ]}
    >
      <Text style={[s.btnText, props.small && { fontSize: 13 }, kind === 'ghost' && { color: C.text }, kind === 'muted' && { color: C.faint }, kind === 'danger' && { color: '#fff' }]}>
        {props.label}
      </Text>
    </Pressable>
  );
}

/** Ficha de número, como las del Catán: el tamaño de la fila de puntos indica su frecuencia. */
export function NumberToken({ n, extra, size = 38, dim }: { n: number; extra?: boolean; size?: number; dim?: boolean }) {
  const hot = n === 6 || n === 8;
  return (
    <View
      style={[
        s.token,
        { width: size, height: size, borderRadius: size / 2 },
        extra && { backgroundColor: C.accent, borderColor: '#B98A10' },
        dim && { backgroundColor: C.panelAlt, borderColor: C.line },
      ]}
    >
      <Text style={{ color: dim ? C.faint : hot ? C.hot : C.chipText, fontWeight: '900', fontSize: size * 0.42, lineHeight: size * 0.48 }}>{n}</Text>
      <Text style={{ color: dim ? C.faint : hot ? C.hot : C.chipText, fontSize: size * 0.2, lineHeight: size * 0.2, letterSpacing: -0.5 }}>{'•'.repeat(pipsOf(n))}</Text>
    </View>
  );
}

export function Tag({ text, color }: { text: string; color?: string }) {
  return (
    <View style={[s.tag, color ? { borderColor: color, backgroundColor: color + '1F' } : null]}>
      <Text style={[s.tagText, color ? { color } : null]}>{text}</Text>
    </View>
  );
}

export function Overline({ children }: { children: React.ReactNode }) {
  return <Text style={s.overline}>{children}</Text>;
}

/** Carta de futbolista. Con `entry` muestra además su estado en la plantilla. */
export function FootballerCard(props: { cardId: string; entry?: SquadEntry; state?: GameState; owner?: Player; children?: React.ReactNode }) {
  const f = footballer(props.cardId);
  const roster = React.useContext(RosterContext);
  const who = props.state?.roster?.[f.id] ?? roster?.[f.id];
  const J = props.state?.jornada ?? 0;
  const e = props.entry;
  const nums = e ? activeNumbers(e, J) : f.numbers;
  const tier = tierForPrice(basePrice(f.id));
  const tint = TIER_COLOR[tier];
  const pos = POS_COLOR[f.position];
  const role = roleOf(f.position);
  const out = e ? isOut(e, J) : false;
  return (
    <View style={[s.card, { borderColor: tint + '55' }]}>
      <View style={[s.cardBand, { backgroundColor: tint }]} />
      <View style={[s.row, { padding: 12, opacity: out ? 0.6 : 1 }]}>
        <View>
          <Avatar seed={f.id} who={who} size={58} jersey={props.owner ? clubColor(props.owner.id) : '#7C8F84'} ring={tint} />
          <View style={[s.posBadge, { backgroundColor: pos }]}>
            <Text style={s.posText}>{f.position}</Text>
          </View>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[s.tier, { color: tint }]}>{tier.toUpperCase()}</Text>
          <Text numberOfLines={1} style={s.cardName}>{who?.name ?? f.name}</Text>
          <View style={[s.row, { marginTop: 3 }]}>
            {role.attack > 0 ? <Text style={[s.power, { color: POS_COLOR.DEL }]}>⚔ Ataque {role.attack}</Text> : null}
            {role.defense > 0 ? <Text style={[s.power, { color: POS_COLOR.DEF }]}>🛡 Defensa {role.defense}</Text> : null}
            <Text style={s.cardMeta}>{basePrice(f.id)}M</Text>
          </View>
        </View>
        <View style={[s.row, { gap: 4 }]}>
          {nums.map((n) => (
            <NumberToken key={n} n={n} extra={!f.numbers.includes(n)} />
          ))}
        </View>
      </View>
      {e && (out || isBooked(e, J) || onStreak(e, J) || isProtected(e, J) || e.shielded) ? (
        <View style={[s.row, { paddingHorizontal: 12, paddingBottom: 6, flexWrap: 'wrap' }]}>
          {out ? <Tag text={`🩹 De baja hasta J${e.outUntil}`} color={C.danger} /> : null}
          {!out && isBooked(e, J) ? <Tag text="🟨 Amonestado: −1 de fuerza" color={C.accent} /> : null}
          {onStreak(e, J) ? <Tag text={`🔥 Doble fuerza hasta J${e.streakUntil}`} color={C.accent} /> : null}
          {isProtected(e, J) ? <Tag text={`🔒 Intransferible hasta J${e.noClauseUntil}`} color={C.good} /> : null}
          {e.shielded ? <Tag text="🛡 Blindado" color={C.good} /> : null}
        </View>
      ) : null}
      {props.children ? <View style={s.cardActions}>{props.children}</View> : null}
    </View>
  );
}

/** Aparición con rebote; se repite cada vez que cambia `trigger`. */
export function Pop({ trigger, children, style }: { trigger?: unknown; children: React.ReactNode; style?: ViewStyle }) {
  const v = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    v.setValue(0.6);
    Animated.spring(v, { toValue: 1, friction: 5, tension: 150, useNativeDriver: NATIVE_DRIVER }).start();
  }, [trigger, v]);
  return <Animated.View style={[style, { transform: [{ scale: v }], opacity: v.interpolate({ inputRange: [0.6, 0.85], outputRange: [0, 1], extrapolate: 'clamp' }) }]}>{children}</Animated.View>;
}

/** Aviso a pantalla completa: hay que pulsar para cerrarlo, así no se pasa por alto. */
export function Popup(props: { icon?: React.ReactNode; overline: string; title: string; color?: string; children?: React.ReactNode; button?: string; onClose: () => void }) {
  const color = props.color ?? C.accent;
  return (
    <View style={s.backdrop}>
      <Pop style={{ width: '100%', maxWidth: 420 }}>
        <View style={[s.popup, { borderColor: color }]}>
          <View style={{ height: 6, backgroundColor: color }} />
          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ padding: 18, alignItems: 'center' }}>
            {props.icon}
            <Text style={[s.overline, { color, marginTop: props.icon ? 10 : 0 }]}>{props.overline}</Text>
            <Text style={[s.h1, { textAlign: 'center', marginTop: 4, fontSize: 24 }]}>{props.title}</Text>
            <View style={{ alignSelf: 'stretch', marginTop: 10 }}>{props.children}</View>
          </ScrollView>
          <View style={{ padding: 14, paddingTop: 0 }}>
            <Btn label={props.button ?? 'Entendido'} onPress={props.onClose} />
          </View>
        </View>
      </Pop>
    </View>
  );
}

/** Nombres y caras de los futbolistas de la partida en curso. */
export const RosterContext = React.createContext<GameState['roster']>(undefined);

/** Nombre de un futbolista en la partida en curso. */
export function useCardName(cardId: string): string {
  const roster = React.useContext(RosterContext);
  return roster?.[cardId]?.name ?? footballer(cardId).name;
}

/** Acciones de la barra de navegación; las pone App. */
export const NavContext = React.createContext<{ onHelp: () => void; onAccount: () => void; onMenu: () => void; onLegal: (tab: 'privacidad' | 'condiciones') => void }>({
  onHelp: () => {},
  onAccount: () => {},
  onMenu: () => {},
  onLegal: () => {},
});

/** Barra superior: menú lateral con tu club, nombre del juego, jornada y ayuda. */
export function NavBar({ subtitle }: { subtitle?: string }) {
  const nav = React.useContext(NavContext);
  const { profile } = useAccount();
  const club = useMyClub();
  const [muted, setMute] = React.useState(isMuted());
  return (
    <View style={s.navbar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir el menú" onPress={nav.onMenu} hitSlop={6} style={[s.row, { gap: 8 }]}>
        <View style={{ gap: 4, paddingVertical: 4 }}>
          <View style={s.burger} />
          <View style={s.burger} />
          <View style={s.burger} />
        </View>
        {club ? <Crest name={club.name} color={club.crest.primary} design={club.crest} size={36} /> : null}
      </Pressable>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={{ color: C.text, fontSize: 17, fontWeight: '900', letterSpacing: -0.3 }}>
          FUT<Text style={{ color: C.accent }}>CARDS</Text>
        </Text>
        <Text numberOfLines={1} style={{ color: C.dim, fontSize: 12, fontWeight: '600' }}>{subtitle ?? club?.name ?? profile?.username ?? 'Invitado'}</Text>
      </View>
      {soundAvailable() ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={muted ? 'Activar sonido' : 'Silenciar'}
          onPress={() => {
            setMuted(!muted);
            setMute(!muted);
          }}
          hitSlop={6}
          style={[s.navHelp, { marginRight: 8 }]}
        >
          <Text style={{ fontSize: 15 }}>{muted ? '🔇' : '🔊'}</Text>
        </Pressable>
      ) : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Reglas del juego" onPress={nav.onHelp} hitSlop={6} style={s.navHelp}>
        <Text style={{ color: C.text, fontWeight: '900', fontSize: 16 }}>?</Text>
      </Pressable>
    </View>
  );
}

/** Texto de jornada para la barra de navegación. */
export function navJornada(state: GameState): string {
  if (state.phase === 'finished') return 'Final de temporada';
  const preseason = state.phase === 'market' && state.jornada === 1 && state.turnOrder.length > state.players.length;
  return preseason ? 'Pretemporada' : `Jornada ${state.jornada} de ${state.totalJornadas}`;
}

/** Enlaces a los textos legales, para el pie de las pantallas de entrada. */
export function LegalLinks() {
  const nav = React.useContext(NavContext);
  return (
    <View style={[s.row, { justifyContent: 'center', marginTop: 18 }]}>
      <Pressable accessibilityRole="link" onPress={() => nav.onLegal('privacidad')} hitSlop={6}>
        <Text style={{ color: C.faint, fontSize: 12, textDecorationLine: 'underline' }}>Privacidad</Text>
      </Pressable>
      <Text style={{ color: C.faint, fontSize: 12, marginHorizontal: 8 }}>·</Text>
      <Pressable accessibilityRole="link" onPress={() => nav.onLegal('condiciones')} hitSlop={6}>
        <Text style={{ color: C.faint, fontSize: 12, textDecorationLine: 'underline' }}>Condiciones de uso</Text>
      </Pressable>
    </View>
  );
}

/** Si se define, las pantallas de partida muestran un botón para salir. */
export const ExitContext = React.createContext<(() => void) | null>(null);

const STEPS = ['Mercado', 'Partido', 'Reparto'];

/** Guía de la jornada: siempre visible para saber en qué paso estamos. */
export function PhaseStepper({ step, label }: { step: 0 | 1 | 2; label: string }) {
  const exit = React.useContext(ExitContext);
  return (
    <View style={s.stepper}>
      <View style={s.row}>
        <Text style={[s.overline, { flex: 1 }]}>{label}</Text>
        {exit ? (
          <Pressable accessibilityRole="button" onPress={exit} hitSlop={8}>
            <Text style={[s.overline, { color: C.dim }]}>SALIR ✕</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={[s.row, { marginTop: 8 }]}>
        {STEPS.map((name, i) => (
          <React.Fragment key={name}>
            {i > 0 ? <View style={[s.stepLine, i <= step && { backgroundColor: C.accent }]} /> : null}
            <View style={s.row}>
              <View style={[s.stepDot, i < step && s.stepDone, i === step && s.stepActive]}>
                <Text style={{ color: i <= step ? C.accentText : C.faint, fontWeight: '800', fontSize: 12 }}>{i < step ? '✓' : i + 1}</Text>
              </View>
              <Text style={{ color: i === step ? C.text : C.faint, fontWeight: i === step ? '800' : '600', fontSize: 13, marginLeft: 6 }}>{name}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

export function jornadaLabel(state: GameState): string {
  const preseason = state.phase === 'market' && state.jornada === 1 && state.turnOrder.length > state.players.length;
  const turn = `TURNO ${state.turnIndex + 1} DE ${state.turnOrder.length}`;
  if (state.phase !== 'market') return 'DÍA DE PARTIDO';
  return preseason ? `VUELTA ${state.turnIndex < state.players.length ? 1 : 2} DE 2 · ${turn}` : turn;
}

export function StandingsTable({ state, highlight }: { state: GameState; highlight?: number }) {
  return (
    <View style={s.panel}>
      <View style={[s.row, { marginBottom: 6 }]}>
        <Text style={[s.th, { flex: 1, textAlign: "left" }]}>CLASIFICACIÓN</Text>
        <Text style={[s.th, { width: 44 }]}>PTS</Text>
        <Text style={[s.th, { width: 52 }]}>GOLES</Text>
        <Text style={[s.th, { width: 50 }]}>CAJA</Text>
        <Text style={[s.th, { width: 34 }]}>EST</Text>
      </View>
      {standings(state).map((p, i) => (
        <View key={p.id} style={[s.row, s.tr, p.id === highlight && { backgroundColor: C.panelAlt }]}>
          <Text style={{ color: C.faint, width: 20, fontWeight: '700' }}>{i + 1}</Text>
          <Crest name={p.name} color={clubColor(p.id)} design={p.crest} size={24} />
          <Text numberOfLines={1} style={{ color: C.text, flex: 1, fontWeight: '700', marginLeft: 8 }}>
            {p.name}
            {p.isBot ? <Text style={{ color: C.faint, fontWeight: '500' }}> · IA</Text> : null}
          </Text>
          <Text style={[s.td, { width: 44, color: C.accent, fontWeight: '800', fontSize: 15 }]}>{p.points}</Text>
          <Text style={[s.td, { width: 52 }]}>{p.goals}:{p.against ?? 0}</Text>
          <Text style={[s.td, { width: 50 }]}>{p.money}M</Text>
          <Text style={[s.td, { width: 34 }]}>N{p.stadium}</Text>
        </View>
      ))}
    </View>
  );
}

export function Chronicle({ state, max = 25 }: { state: GameState; max?: number }) {
  return (
    <View style={s.panel}>
      {state.log
        .slice(-max)
        .reverse()
        .map((l, i) => (
          <View key={i} style={[s.row, { alignItems: 'flex-start', marginBottom: 6 }]}>
            <Text style={{ color: C.accent, fontWeight: '800', fontSize: 11, width: 30, marginTop: 3 }}>J{l.jornada}</Text>
            <Text style={[s.p, { flex: 1, color: i === 0 ? C.text : C.dim }]}>{l.text}</Text>
          </View>
        ))}
    </View>
  );
}

export const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  burger: { width: 18, height: 2.5, borderRadius: 2, backgroundColor: C.text },
  navbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#0A1E15', borderBottomWidth: 1, borderBottomColor: C.line },
  navHelp: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center', backgroundColor: C.panel },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(3,10,7,0.86)', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 10 },
  popup: { backgroundColor: C.panel, borderRadius: 18, borderWidth: 2, overflow: 'hidden' },
  btn: { backgroundColor: C.accent, paddingVertical: 13, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 9 },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.line },
  btnMuted: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.line, borderStyle: 'dashed' },
  btnDanger: { backgroundColor: C.danger },
  btnText: { color: C.accentText, fontWeight: '800', fontSize: 15 },
  token: { backgroundColor: C.chip, borderWidth: 2, borderColor: '#D9CFA8', alignItems: 'center', justifyContent: 'center' },
  tag: { borderWidth: 1, borderColor: C.line, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3, marginRight: 6, marginBottom: 6 },
  tagText: { color: C.dim, fontSize: 11, fontWeight: '700' },
  overline: { color: C.faint, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  card: { backgroundColor: C.panel, borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  cardBand: { height: 4 },
  cardActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: '#0C2318' },
  posBadge: { position: 'absolute', bottom: -4, alignSelf: 'center', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  posText: { color: '#14261B', fontSize: 9, fontWeight: '900' },
  tier: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  cardName: { color: C.text, fontWeight: '800', fontSize: 16, marginTop: 1 },
  cardMeta: { color: C.dim, fontSize: 12 },
  power: { fontSize: 11, fontWeight: '800', marginRight: 8 },
  h1: { color: C.text, fontSize: 26, fontWeight: '900', letterSpacing: -0.3 },
  h2: { color: C.text, fontSize: 17, fontWeight: '800', marginBottom: 8 },
  p: { color: C.dim, fontSize: 14, lineHeight: 20 },
  panel: { backgroundColor: C.panel, borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: C.line },
  stepper: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  stepLine: { flex: 1, height: 2, backgroundColor: C.line, marginHorizontal: 8 },
  stepDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  stepActive: { backgroundColor: C.accent, borderColor: C.accent },
  stepDone: { backgroundColor: '#B8922C', borderColor: '#B8922C' },
  th: { color: C.faint, fontSize: 10, fontWeight: '800', letterSpacing: 1, textAlign: 'right' },
  tr: { paddingVertical: 5, paddingHorizontal: 4, borderRadius: 8 },
  td: { color: C.dim, textAlign: 'right', fontSize: 13 },
});

/** Selector de liga: masculina o femenina. */
export function LeaguePicker({ value, onPick }: { value: 'masculina' | 'femenina'; onPick: (l: 'masculina' | 'femenina') => void }) {
  return (
    <View style={{ marginTop: 6, marginBottom: 16 }}>
      <Overline>LIGA</Overline>
      <View style={[s.row, { gap: 8, marginTop: 8 }]}>
        <Btn small kind={value === 'masculina' ? 'primary' : 'ghost'} label="Masculina" onPress={() => onPick('masculina')} style={{ flex: 1 }} />
        <Btn small kind={value === 'femenina' ? 'primary' : 'ghost'} label="Femenina" onPress={() => onPick('femenina')} style={{ flex: 1 }} />
      </View>
      <Text style={{ color: C.faint, fontSize: 11, marginTop: 4 }}>
        {value === 'femenina' ? 'Todas las futbolistas son jugadoras. Las reglas son las mismas.' : 'Todos los futbolistas son jugadores. Las reglas son las mismas.'}
      </Text>
    </View>
  );
}
