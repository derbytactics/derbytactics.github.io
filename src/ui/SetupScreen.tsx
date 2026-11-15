import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { CONFIG, NewGameOptions, SeasonLength } from '../engine';
import { Btn, s } from './components';
import { C } from './theme';

const DEFAULT_NAMES = ['Atlético Barrio', 'Real Chamartín', 'Sporting Ribera', 'Unión Levante', 'Deportivo Norte', 'Racing Meseta', 'CF Bahía', 'Rayo Sur'];
const SEASONS: { key: SeasonLength; label: string }[] = [
  { key: 'corta', label: `Corta · ${CONFIG.seasonLengths.corta} jornadas` },
  { key: 'estandar', label: `Estándar · ${CONFIG.seasonLengths.estandar}` },
  { key: 'larga', label: `Larga · ${CONFIG.seasonLengths.larga}` },
];

export function SetupScreen({ onStart }: { onStart: (o: NewGameOptions) => void }) {
  const [count, setCount] = useState(4);
  const [season, setSeason] = useState<SeasonLength>('estandar');
  const [players, setPlayers] = useState(DEFAULT_NAMES.map((name, i) => ({ name, isBot: i > 0 })));
  const patch = (i: number, p: Partial<{ name: string; isBot: boolean }>) =>
    setPlayers((all) => all.map((x, j) => (j === i ? { ...x, ...p } : x)));

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={s.h1}>⚽ Futcards</Text>
      <Text style={[s.p, { marginBottom: 16 }]}>
        Eres el presidente de un club recién ascendido. Ficha futbolistas, amplía tu estadio, paga cláusulas y gana la liga:
        cada jornada se tiran los dados y marcan los jugadores con ese número.
      </Text>

      <Text style={s.h2}>Clubes: {count}</Text>
      <View style={[s.row, { marginBottom: 16, gap: 8 }]}>
        <Btn label="−" small kind="ghost" onPress={() => setCount((c) => Math.max(CONFIG.minPlayers, c - 1))} />
        <Btn label="+" small kind="ghost" onPress={() => setCount((c) => Math.min(CONFIG.maxPlayers, c + 1))} />
        <Text style={s.p}>de {CONFIG.minPlayers} a {CONFIG.maxPlayers}</Text>
      </View>

      {players.slice(0, count).map((p, i) => (
        <View key={i} style={[s.panel, s.row, { gap: 8 }]}>
          <TextInput
            value={p.name}
            onChangeText={(name) => patch(i, { name })}
            maxLength={20}
            accessibilityLabel={`Nombre del club ${i + 1}`}
            style={{ flex: 1, color: C.text, fontSize: 16, fontWeight: '600', paddingVertical: 6 }}
            placeholderTextColor={C.dim}
            placeholder={`Club ${i + 1}`}
          />
          <Btn small kind={p.isBot ? 'ghost' : 'primary'} label={p.isBot ? '🤖 IA' : '🧑 Humano'} onPress={() => patch(i, { isBot: !p.isBot })} />
        </View>
      ))}

      <Text style={[s.h2, { marginTop: 8 }]}>Temporada</Text>
      <View style={[s.row, { flexWrap: 'wrap', gap: 8, marginBottom: 24 }]}>
        {SEASONS.map((x) => (
          <Btn key={x.key} small kind={season === x.key ? 'primary' : 'ghost'} label={x.label} onPress={() => setSeason(x.key)} />
        ))}
      </View>

      <Btn label="Empezar la pretemporada" onPress={() => onStart({ players: players.slice(0, count), season })} />
    </ScrollView>
  );
}
