import React, { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import {
  GameState,
  LEAGUES,
  League,
  Player,
  SquadEntry,
  activeNumbers,
  basePrice,
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
import { C, NATIVE_DRIVER, POS_COLOR, SHADOW, TIER_COLOR, DISPLAY, DISPLAY_BOLD, FONTS } from './theme';
import { useClubColor } from './clubColors';
import { I, Icon, IconName } from './icons';

export function Btn(props: {
  label: string;
  onPress: () => void;
  /** primary: la acción principal (dorado) · selected: opción elegida en un selector · ghost, danger, muted. */
  kind?: 'primary' | 'selected' | 'ghost' | 'danger' | 'muted';
  small?: boolean;
  icon?: IconName;
  style?: ViewStyle;
}) {
  const kind = props.kind ?? 'primary';
  const color = kind === 'primary' ? C.accentText : kind === 'muted' ? C.faint : kind === 'danger' ? '#fff' : C.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={kind === 'selected' ? { selected: true } : undefined}
      onPress={props.onPress}
      style={({ pressed }) => [
        s.btn,
        props.small && s.btnSmall,
        kind === 'selected' && s.btnSelected,
        kind === 'ghost' && s.btnGhost,
        kind === 'muted' && s.btnMuted,
        kind === 'danger' && s.btnDanger,
        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
        props.style,
      ]}
    >
      <View style={s.row}>
        {props.icon ? <Icon name={props.icon} size={props.small ? 16 : 20} color={color} style={{ marginRight: 6 }} /> : null}
        <Text style={[s.btnText, props.small && { fontSize: 13 }, { color }]}>{props.label}</Text>
      </View>
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

export function Tag({ text, color, icon }: { text: string; color?: string; icon?: IconName }) {
  return (
    <View style={[s.tag, s.row, color ? { borderColor: color, backgroundColor: color + '1F' } : null]}>
      {icon ? <Icon name={icon} size={13} color={color ?? C.dim} style={{ marginRight: 4 }} /> : null}
      <Text style={[s.tagText, color ? { color } : null]}>{text}</Text>
    </View>
  );
}

export function Overline({ children }: { children: React.ReactNode }) {
  return <Text style={s.overline}>{children}</Text>;
}

const TIER_ICON: Record<string, IconName> = { Cantera: 'sprout', Plata: 'medal-outline', Oro: 'star', Crack: 'star-shooting' };
const ROLE_MASC: Record<string, string> = { POR: 'Portero', DEF: 'Defensa', MED: 'Medio', DEL: 'Delantero' };
const ROLE_FEM: Record<string, string> = { POR: 'Portera', DEF: 'Defensa', MED: 'Media', DEL: 'Delantera' };

/** Carta de futbolista, con marco y cabecera del color de su categoría. Con `entry` muestra además su estado en la plantilla. */
export function FootballerCard(props: { cardId: string; entry?: SquadEntry; state?: GameState; owner?: Player; children?: React.ReactNode }) {
  const clubColor = useClubColor();
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
  const roleName = (who?.fem ? ROLE_FEM : ROLE_MASC)[f.position];
  return (
    <View style={[s.card, { borderColor: tint, borderWidth: tier === 'Cantera' ? 1 : 2 }]}>
      {/* Cabecera de la carta: categoría y precio, en el color de su categoría. */}
      <View style={[s.row, { backgroundColor: tint + (tier === 'Crack' ? '44' : '26'), paddingHorizontal: 12, paddingVertical: 5 }]}>
        <Icon name={TIER_ICON[tier]} size={15} color={tint} style={{ marginRight: 5 }} />
        <Text style={[s.tier, { color: tint, flex: 1 }]}>{tier.toUpperCase()}</Text>
        <Text style={{ color: C.text, fontSize: 18, ...DISPLAY }}>{basePrice(f.id)}M</Text>
      </View>
      <View style={[s.row, { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, opacity: out ? 0.6 : 1 }]}>
        <View>
          <Avatar seed={f.id} who={who} size={66} jersey={props.owner ? clubColor(props.owner.id) : '#7C8F84'} ring={tint} />
          <View style={[s.posBadge, { backgroundColor: pos }]}>
            <Text style={s.posText}>{f.position}</Text>
          </View>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text numberOfLines={1} style={s.cardName}>{who?.name ?? f.name}</Text>
          <Text style={{ color: pos, fontSize: 13, fontWeight: '800' }}>{roleName}</Text>
          <View style={[s.row, { marginTop: 4 }]}>
            {role.attack > 0 ? <View style={[s.row, { marginRight: 10 }]}><Icon name={I.attack} size={14} color={POS_COLOR.DEL} /><Text style={[s.power, { color: POS_COLOR.DEL, marginLeft: 3 }]}>Ataque {role.attack}</Text></View> : null}
            {role.defense > 0 ? <View style={[s.row, { marginRight: 10 }]}><Icon name={I.defense} size={14} color={POS_COLOR.DEF} /><Text style={[s.power, { color: POS_COLOR.DEF, marginLeft: 3 }]}>Defensa {role.defense}</Text></View> : null}
          </View>
        </View>
      </View>
      {/* Números con los que actúa: los «sellos» de la carta. */}
      <View style={[s.row, { paddingHorizontal: 12, paddingBottom: 10, opacity: out ? 0.6 : 1 }]}>
        <Text style={[s.overline, { marginRight: 8 }]}>ACTÚA CON</Text>
        <View style={[s.row, { gap: 6, flexWrap: 'wrap', flex: 1 }]}>
          {nums.map((n) => (
            <NumberToken key={n} n={n} size={34} extra={!f.numbers.includes(n)} />
          ))}
        </View>
      </View>
      {e && (out || isBooked(e, J) || onStreak(e, J) || isProtected(e, J) || e.shielded) ? (
        <View style={[s.row, { paddingHorizontal: 12, paddingBottom: 6, flexWrap: 'wrap' }]}>
          {out ? <Tag icon={I.injury} text={`De baja hasta J${e.outUntil}`} color={C.danger} /> : null}
          {!out && isBooked(e, J) ? <Tag icon={I.yellow} text="Amonestado: −1 de fuerza" color={C.accent} /> : null}
          {onStreak(e, J) ? <Tag icon={I.streak} text={`Doble fuerza hasta J${e.streakUntil}`} color={C.accent} /> : null}
          {isProtected(e, J) ? <Tag icon={I.locked} text={`Intransferible hasta J${e.noClauseUntil}`} color={C.good} /> : null}
          {e.shielded ? <Tag icon={I.shielded} text="Blindado" color={C.good} /> : null}
        </View>
      ) : null}
      {props.children ? <View style={s.cardActions}>{props.children}</View> : null}
    </View>
  );
}

/** Aparición con rebote; se repite cada vez que cambia `trigger`. */
export function Pop({ trigger, children, style }: { trigger?: unknown; children: React.ReactNode; style?: ViewStyle }) {
  const [v] = useState(() => new Animated.Value(0.6));
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
        <Wordmark size={22} />
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
          <Icon name={muted ? I.soundOff : I.soundOn} size={20} color={C.text} />
        </Pressable>
      ) : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Reglas del juego" onPress={nav.onHelp} hitSlop={6} style={s.navHelp}>
        <Icon name="help" size={20} color={C.text} />
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

/**
 * Botón «atrás» del sistema (Android). Las pantallas registran qué hacer con `useBack`;
 * manda la última registrada. Devolver true indica que ya se ha atendido.
 */
export const BackContext = React.createContext<(handler: () => boolean) => () => void>(() => () => {});
export function useBack(handler: () => boolean, active = true) {
  const register = React.useContext(BackContext);
  const ref = React.useRef(handler);
  React.useEffect(() => {
    ref.current = handler;
  });
  React.useEffect(() => (active ? register(() => ref.current()) : undefined), [register, active]);
}

/** Si se define, las pantallas de partida muestran un botón para salir. */
export const ExitContext = React.createContext<(() => void) | null>(null);

const STEPS = ['Mercado', 'Partido', 'Reparto'];

/** Guía de la jornada: siempre visible para saber en qué paso estamos. */
export function PhaseStepper({ step }: { step: 0 | 1 | 2; label?: string }) {
  const exit = React.useContext(ExitContext);
  return (
    <View style={[s.stepper, s.row]}>
      <View style={[s.row, { flex: 1 }]}>
        {STEPS.map((name, i) => (
          <React.Fragment key={name}>
            {i > 0 ? <View style={[s.stepLine, i <= step && { backgroundColor: C.accent }]} /> : null}
            <View style={s.row} accessibilityLabel={`Paso ${i + 1}: ${name}${i === step ? ', actual' : i < step ? ', hecho' : ''}`}>
              <View style={[s.stepDot, i < step && s.stepDone, i === step && s.stepActive]}>
                <Text style={{ color: i <= step ? C.accentText : C.faint, fontWeight: '800', fontSize: 12 }}>{i < step ? '✓' : i + 1}</Text>
              </View>
              {i === step ? <Text style={{ color: C.text, fontWeight: '800', fontSize: 13, marginLeft: 6 }}>{name}</Text> : null}
            </View>
          </React.Fragment>
        ))}
      </View>
      {exit ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Salir de la partida" onPress={exit} hitSlop={8} style={{ minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end', marginLeft: 10 }}>
          <Text style={{ color: C.dim, fontWeight: '800', fontSize: 13 }}>Salir ✕</Text>
        </Pressable>
      ) : null}
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
  const clubColor = useClubColor();
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
            <Text style={{ color: C.accent, fontWeight: '800', fontSize: 12, width: 30, marginTop: 3 }}>J{l.jornada}</Text>
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
  navHelp: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center', backgroundColor: C.panel },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(3,10,7,0.86)', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 10 },
  popup: { backgroundColor: C.panel, borderRadius: 18, borderWidth: 2, overflow: 'hidden' },
  btn: { backgroundColor: C.accent, paddingVertical: 13, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 9, minHeight: 44 },
  btnSelected: { backgroundColor: C.sel, borderWidth: 1, borderColor: C.selLine },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.line },
  btnMuted: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.line, borderStyle: 'dashed' },
  btnDanger: { backgroundColor: C.danger },
  btnText: { color: C.accentText, fontWeight: '800', fontSize: 15 },
  token: { backgroundColor: C.chip, borderWidth: 2, borderColor: '#D9CFA8', alignItems: 'center', justifyContent: 'center' },
  tag: { borderWidth: 1, borderColor: C.line, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3, marginRight: 6, marginBottom: 6 },
  tagText: { color: C.dim, fontSize: 12, fontWeight: '700' },
  overline: { color: C.faint, fontSize: 14, ...DISPLAY_BOLD, letterSpacing: 1.1 },
  card: { backgroundColor: C.panel, borderRadius: 14, borderWidth: 1, marginBottom: 12, overflow: 'hidden', ...SHADOW },
  cardBand: { height: 4 },
  cardActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: '#0C2318' },
  posBadge: { position: 'absolute', bottom: -4, alignSelf: 'center', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  posText: { color: '#14261B', fontSize: 12, fontWeight: '900' },
  tier: { fontSize: 14, ...DISPLAY_BOLD, letterSpacing: 1 },
  cardName: { color: C.text, fontSize: 20, ...DISPLAY, marginTop: 0 },
  cardMeta: { color: C.dim, fontSize: 12 },
  power: { fontSize: 12, fontWeight: '800', marginRight: 8 },
  h1: { color: C.text, fontSize: 29, ...DISPLAY, letterSpacing: -0.3 },
  h2: { color: C.text, fontSize: 21, ...DISPLAY, marginBottom: 8 },
  p: { color: C.dim, fontSize: 14, lineHeight: 20 },
  panel: { backgroundColor: C.panel, borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: C.line, ...SHADOW },
  stepper: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: C.line },
  stepLine: { flex: 1, height: 2, backgroundColor: C.line, marginHorizontal: 8 },
  stepDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  stepActive: { backgroundColor: C.accent, borderColor: C.accent },
  stepDone: { backgroundColor: '#B8922C', borderColor: '#B8922C' },
  th: { color: C.faint, fontSize: 14, ...DISPLAY_BOLD, letterSpacing: 0.6, textAlign: 'right' },
  tr: { paddingVertical: 5, paddingHorizontal: 4, borderRadius: 8 },
  td: { color: C.dim, textAlign: 'right', fontSize: 13 },
});

const LEAGUE_INFO: Record<League, { label: string; text: string; icon: IconName }> = {
  masculina: { label: 'Masculina', text: 'Todos los futbolistas son jugadores.', icon: 'gender-male' },
  femenina: { label: 'Femenina', text: 'Todas las futbolistas son jugadoras.', icon: 'gender-female' },
  mixta: { label: 'Mixta', text: 'Jugadores y jugadoras en todos los equipos.', icon: 'gender-male-female' },
};
export const leagueLabel = (l: League | undefined) => `Liga ${LEAGUE_INFO[l ?? 'masculina'].label.toLowerCase()}`;

/** Selector de liga (en la sala de espera): masculina, femenina o mixta. */
export function LeaguePicker({ value, onPick }: { value: League; onPick: (l: League) => void }) {
  return (
    <View style={{ marginTop: 6, marginBottom: 16 }}>
      <Overline>LIGA</Overline>
      <View style={[s.row, { gap: 8, marginTop: 8 }]}>
        {LEAGUES.map((l) => (
          <Btn key={l} small kind={value === l ? 'selected' : 'ghost'} label={LEAGUE_INFO[l].label} onPress={() => onPick(l)} style={{ flex: 1 }} />
        ))}
      </View>
      <Text style={{ color: C.faint, fontSize: 12, marginTop: 4 }}>{LEAGUE_INFO[value].text} Las reglas son las mismas.</Text>
    </View>
  );
}

/** Ventana «¿Qué liga jugamos?», tras pulsar jugar: masculina, femenina o mixta. */
export function LeagueChooser({ title = '¿Qué liga jugamos?', note, onPick, onClose }: { title?: string; note?: string; onPick: (l: League) => void; onClose: () => void }) {
  return (
    <Popup overline="ELIGE LA LIGA" title={title} button="Cancelar" onClose={onClose}>
      {note ? <Text style={[s.p, { textAlign: 'center', marginBottom: 10 }]}>{note}</Text> : null}
      {LEAGUES.map((l) => (
        <Pressable
          key={l}
          accessibilityRole="button"
          accessibilityLabel={`Liga ${LEAGUE_INFO[l].label}`}
          onPress={() => onPick(l)}
          style={({ pressed }) => [s.row, { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: pressed ? C.sel : C.panelAlt, marginBottom: 8 }]}
        >
          <Icon name={LEAGUE_INFO[l].icon} size={26} color={C.accent} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontWeight: '900', fontSize: 17 }}>{LEAGUE_INFO[l].label}</Text>
            <Text style={{ color: C.dim, fontSize: 12, marginTop: 1 }}>{LEAGUE_INFO[l].text}</Text>
          </View>
        </Pressable>
      ))}
      <Text style={{ color: C.faint, fontSize: 12, textAlign: 'center', marginBottom: 6 }}>Las reglas son las mismas en las tres.</Text>
    </Popup>
  );
}

/** Nombre del juego en su letra: condensada, en cursiva y con «TACTICS» en dorado. */
export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <Text accessibilityRole="header" style={{ color: C.text, fontSize: size, fontFamily: FONTS.wordmark, fontWeight: 'normal', letterSpacing: 0.3 }}>
      DERBY<Text style={{ color: C.accent }}>TACTICS</Text>
    </Text>
  );
}
