import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { CONFIG, NewGameOptions, SeasonLength } from '../engine';
import { Crest, Logo } from './art';
import { Btn, Overline, s } from './components';
import { C, clubColor } from './theme';

const DEFAULT_NAMES = ['Atlético Barrio', 'Real Chamartín', 'Sporting Ribera', 'Unión Levante', 'Deportivo Norte', 'Racing Meseta', 'CF Bahía', 'Rayo Sur'];
const SEASONS: { key: SeasonLength; label: string; note: string }[] = [
  { key: 'corta', label: 'Corta', note: `${CONFIG.seasonLengths.corta} jornadas` },
  { key: 'estandar', label: 'Estándar', note: `${CONFIG.seasonLengths.estandar} jornadas` },
  { key: 'larga', label: 'Larga', note: `${CONFIG.seasonLengths.larga} jornadas` },
];

export function SetupScreen({ onStart, onHelp }: { onStart: (o: NewGameOptions) => void; onHelp: () => void }) {
  const [count, setCount] = useState(4);
  const [season, setSeason] = useState<SeasonLength>('estandar');
  const [players, setPlayers] = useState(DEFAULT_NAMES.map((name, i) => ({ name, isBot: i > 0 })));
  const patch = (i: number, p: Partial<{ name: string; isBot: boolean }>) =>
    setPlayers((all) => all.map((x, j) => (j === i ? { ...x, ...p } : x)));

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 18 }}>
        <Logo size={128} />
        <Text style={{ color: C.text, fontSize: 40, fontWeight: '900', letterSpacing: -1 }}>
          FUT<Text style={{ color: C.accent }}>CARDS</Text>
        </Text>
        <Text style={[s.p, { textAlign: 'center', marginTop: 4 }]}>Ficha, amplía tu estadio y gana la liga a golpe de dado.</Text>
        <Btn small kind="ghost" label="¿Cómo se juega?" onPress={onHelp} style={{ marginTop: 12 }} />
      </View>

      <View style={[s.row, { marginBottom: 10 }]}>
        <View style={{ flex: 1 }}>
          <Overline>CLUBES EN LA LIGA</Overline>
          <Text style={{ color: C.text, fontSize: 22, fontWeight: '900' }}>{count} clubes</Text>
        </View>
        <Btn label="−" small kind="ghost" onPress={() => setCount((c) => Math.max(CONFIG.minPlayers, c - 1))} style={{ width: 44 }} />
        <Btn label="+" small kind="ghost" onPress={() => setCount((c) => Math.min(CONFIG.maxPlayers, c + 1))} style={{ width: 44, marginLeft: 8 }} />
      </View>

      {players.slice(0, count).map((p, i) => (
        <View key={i} style={[s.panel, s.row, { paddingVertical: 8, marginBottom: 8 }]}>
          <Crest name={p.name || `Club ${i + 1}`} color={clubColor(i)} size={34} />
          <TextInput
            value={p.name}
            onChangeText={(name) => patch(i, { name })}
            maxLength={20}
            accessibilityLabel={`Nombre del club ${i + 1}`}
            style={{ flex: 1, color: C.text, fontSize: 16, fontWeight: '700', paddingVertical: 6, marginHorizontal: 10 }}
            placeholderTextColor={C.faint}
            placeholder={`Club ${i + 1}`}
          />
          <Btn small kind={p.isBot ? 'ghost' : 'primary'} label={p.isBot ? 'IA' : 'Persona'} onPress={() => patch(i, { isBot: !p.isBot })} style={{ width: 84 }} />
        </View>
      ))}

      <View style={{ marginTop: 10, marginBottom: 22 }}>
        <Overline>DURACIÓN DE LA TEMPORADA</Overline>
        <View style={[s.row, { gap: 8, marginTop: 8 }]}>
          {SEASONS.map((x) => (
            <View key={x.key} style={{ flex: 1 }}>
              <Btn small kind={season === x.key ? 'primary' : 'ghost'} label={x.label} onPress={() => setSeason(x.key)} />
              <Text style={{ color: C.faint, fontSize: 11, textAlign: 'center', marginTop: 4 }}>{x.note}</Text>
            </View>
          ))}
        </View>
      </View>

      <Btn label="Empezar la pretemporada" onPress={() => onStart({ players: players.slice(0, count), season })} />
    </ScrollView>
  );
}
