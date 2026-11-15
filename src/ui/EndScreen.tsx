import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { CONFIG, GameState, financeBonus, standings } from '../engine';
import { Crest, Trophy } from './art';
import { Btn, Chronicle, Overline, StandingsTable, s } from './components';
import { C, clubColor } from './theme';

export function EndScreen({ state, onRestart, extra }: { state: GameState; onRestart: () => void; extra?: React.ReactNode }) {
  const table = standings(state);
  const champ = table[0];
  // Podio: 2.º, 1.º, 3.º
  const podium = [table[1], table[0], table[2]].filter(Boolean);
  const heights = new Map([[table[0]?.id, 96], [table[1]?.id, 68], [table[2]?.id, 48]]);
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <Trophy size={104} />
        <Overline>CAMPEÓN DE LIGA</Overline>
        <Text style={[s.h1, { fontSize: 32, textAlign: 'center', marginTop: 4 }]}>{champ.name}</Text>
        <Text style={[s.p, { textAlign: 'center', marginTop: 4 }]}>
          {champ.points} puntos · {champ.goals} goles en {state.totalJornadas} jornadas
        </Text>
      </View>

      <View style={[s.row, { alignItems: 'flex-end', justifyContent: 'center', gap: 10, marginVertical: 20 }]}>
        {podium.map((p) => {
          const pos = table.indexOf(p) + 1;
          return (
            <View key={p.id} style={{ alignItems: 'center', width: 96 }}>
              <Crest name={p.name} color={clubColor(p.id)} size={pos === 1 ? 52 : 40} />
              <Text numberOfLines={1} style={{ color: C.text, fontWeight: '800', fontSize: 12, marginVertical: 4 }}>{p.name}</Text>
              <View style={{ width: '100%', height: heights.get(p.id), backgroundColor: pos === 1 ? C.accent : C.panelAlt, borderTopLeftRadius: 10, borderTopRightRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: pos === 1 ? C.accentText : C.text, fontSize: 26, fontWeight: '900' }}>{pos}</Text>
                <Text style={{ color: pos === 1 ? C.accentText : C.dim, fontSize: 11, fontWeight: '700' }}>{p.points} pts</Text>
              </View>
            </View>
          );
        })}
      </View>

      {extra}
      <StandingsTable state={state} highlight={champ.id} />
      <View style={s.panel}>
        <Overline>BALANCE FINAL · 1 PUNTO POR CADA {CONFIG.moneyPerPoint}M EN CAJA</Overline>
        {table.map((p) => (
          <View key={p.id} style={[s.row, { marginTop: 6 }]}>
            <Text numberOfLines={1} style={{ color: C.text, flex: 1, fontWeight: '600' }}>{p.name}</Text>
            <Text style={{ color: C.dim }}>{p.money}M</Text>
            <Text style={{ color: C.accent, fontWeight: '800', width: 50, textAlign: 'right' }}>+{financeBonus(p.money)}</Text>
          </View>
        ))}
        <Text style={[s.p, { fontSize: 12, marginTop: 6 }]}>Estos puntos ya están sumados en la clasificación.</Text>
      </View>
      <Btn label="Nueva partida" onPress={onRestart} />
      <Text style={[s.h2, { marginTop: 22 }]}>Crónica de la temporada</Text>
      <Chronicle state={state} max={40} />
    </ScrollView>
  );
}
