import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import {
  GameState,
  SquadEntry,
  activeNumbers,
  basePrice,
  footballer,
  isOut,
  isProtected,
  onStreak,
  pipsOf,
  tierForPips,
  totalPips,
} from '../engine';
import { C, TIER_COLOR } from './theme';

export function Btn(props: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
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
        kind === 'danger' && s.btnDanger,
        pressed && { opacity: 0.7 },
        props.style,
      ]}
    >
      <Text style={[s.btnText, props.small && { fontSize: 13 }, kind !== 'primary' && { color: C.text }]}>{props.label}</Text>
    </Pressable>
  );
}

export function NumberChip({ n, extra }: { n: number; extra?: boolean }) {
  const hot = n === 6 || n === 8;
  return (
    <View style={[s.chip, extra && { backgroundColor: C.accent }]}>
      <Text style={[s.chipNum, hot && { color: C.hot }]}>{n}</Text>
      <Text style={[s.chipDots, hot && { color: C.hot }]}>{'•'.repeat(pipsOf(n))}</Text>
    </View>
  );
}

export function Tag({ text, color }: { text: string; color?: string }) {
  return (
    <View style={[s.tag, color ? { borderColor: color } : null]}>
      <Text style={[s.tagText, color ? { color } : null]}>{text}</Text>
    </View>
  );
}

/** Carta de futbolista. Con `entry` muestra además su estado en la plantilla. */
export function FootballerCard(props: {
  cardId: string;
  entry?: SquadEntry;
  state?: GameState;
  children?: React.ReactNode;
  highlight?: number;
}) {
  const f = footballer(props.cardId);
  const J = props.state?.jornada ?? 0;
  const e = props.entry;
  const nums = e ? activeNumbers(e, J) : f.numbers;
  const pips = totalPips(f.numbers);
  const tier = tierForPips(pips);
  return (
    <View style={[s.card, { borderLeftColor: TIER_COLOR[tier] }]}>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardName}>{f.name}</Text>
          <Text style={s.cardMeta}>
            {f.position} · {tier} · valor {basePrice(f.id)}M
          </Text>
        </View>
        <View style={s.row}>
          {nums.map((n) => (
            <NumberChip key={n} n={n} extra={!f.numbers.includes(n)} />
          ))}
        </View>
      </View>
      {e && (isOut(e, J) || onStreak(e, J) || isProtected(e, J) || e.shielded) ? (
        <View style={[s.row, { marginTop: 6, flexWrap: 'wrap' }]}>
          {isOut(e, J) ? <Tag text={`De baja hasta J${e.outUntil}`} color={C.danger} /> : null}
          {onStreak(e, J) ? <Tag text={`En racha ×2 hasta J${e.streakUntil}`} color={C.accent} /> : null}
          {isProtected(e, J) ? <Tag text={`Intransferible hasta J${e.noClauseUntil}`} color={C.good} /> : null}
          {e.shielded ? <Tag text="Blindado" color={C.good} /> : null}
        </View>
      ) : null}
      {props.children ? <View style={[s.row, { marginTop: 8, flexWrap: 'wrap', gap: 8 }]}>{props.children}</View> : null}
    </View>
  );
}

export const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  btn: {
    backgroundColor: C.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.line },
  btnDanger: { backgroundColor: C.danger },
  btnText: { color: C.accentText, fontWeight: '700', fontSize: 15 },
  chip: {
    backgroundColor: C.chip,
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  chipNum: { color: C.chipText, fontWeight: '800', fontSize: 15, lineHeight: 17 },
  chipDots: { color: C.chipText, fontSize: 7, lineHeight: 8 },
  tag: { borderWidth: 1, borderColor: C.line, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginRight: 6, marginBottom: 4 },
  tagText: { color: C.dim, fontSize: 11, fontWeight: '600' },
  card: {
    backgroundColor: C.panel,
    borderRadius: 12,
    borderLeftWidth: 5,
    padding: 12,
    marginBottom: 10,
  },
  cardName: { color: C.text, fontWeight: '700', fontSize: 16 },
  cardMeta: { color: C.dim, fontSize: 12, marginTop: 2 },
  h1: { color: C.text, fontSize: 28, fontWeight: '800' },
  h2: { color: C.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  p: { color: C.dim, fontSize: 14, lineHeight: 20 },
  panel: { backgroundColor: C.panel, borderRadius: 12, padding: 12, marginBottom: 10 },
});
