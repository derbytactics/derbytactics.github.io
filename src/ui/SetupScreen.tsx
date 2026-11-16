import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { CONFIG, NewGameOptions, SeasonLength } from '../engine';
import { Crest, Logo } from './art';
import { Btn, NavBar, Overline, s } from './components';
import { C, clubColor } from './theme';

const DEFAULT_NAMES = ['Atlético Barrio', 'Real Chamartín', 'Sporting Ribera', 'Unión Levante', 'Deportivo Norte', 'Racing Meseta', 'CF Bahía', 'Rayo Sur'];
const SEASONS: { key: SeasonLength; label: string; note: string }[] = [
  { key: 'corta', label: 'Corta', note: `${CONFIG.seasonLengths.corta} jornadas` },
  { key: 'estandar', label: 'Estándar', note: `${CONFIG.seasonLengths.estandar} jornadas` },
  { key: 'larga', label: 'Larga', note: `${CONFIG.seasonLengths.larga} jornadas` },
];

export function SetupScreen(props: {
  onStart: (o: NewGameOptions) => void;
  onHelp: () => void;
  onHost: (name: string) => void;
  onJoin: (code: string, name: string) => void;
  /** Sala propia guardada en este dispositivo, si la hay. */
  resumeCode: string | null;
  onResume: () => void;
  initialCode: string;
  initialName: string;
  /** Hay servidor de cuentas: crear salas exige estar registrado. */
  accountsOn: boolean;
  /** Comprueba si esta persona puede crear salas; devuelve el motivo si no. */
  hostGate: () => Promise<string | null>;
}) {
  const { onStart, onHelp } = props;
  const [mode, setMode] = useState<'local' | 'online'>(props.initialCode ? 'online' : 'local');
  const [myName, setMyName] = useState(props.initialName);
  const [code, setCode] = useState(props.initialCode);
  const [warn, setWarn] = useState<string | null>(null);
  const named = (then: (name: string) => void) => (myName.trim() ? then(myName.trim()) : setWarn('Ponle nombre a tu club.'));
  const [count, setCount] = useState(4);
  const [season, setSeason] = useState<SeasonLength>('estandar');
  const [players, setPlayers] = useState(DEFAULT_NAMES.map((name, i) => ({ name, isBot: i > 0 })));
  const patch = (i: number, p: Partial<{ name: string; isBot: boolean }>) =>
    setPlayers((all) => all.map((x, j) => (j === i ? { ...x, ...p } : x)));

  return (
    <View style={{ flex: 1 }}>
    <NavBar />
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 18 }}>
        <Logo size={128} />
        <Text style={{ color: C.text, fontSize: 40, fontWeight: '900', letterSpacing: -1 }}>
          FUT<Text style={{ color: C.accent }}>CARDS</Text>
        </Text>
        <Text style={[s.p, { textAlign: 'center', marginTop: 4 }]}>Ficha, amplía tu estadio y gana la liga a golpe de dado.</Text>
        <Btn small kind="ghost" label="¿Cómo se juega?" onPress={onHelp} style={{ marginTop: 12 }} />
      </View>

      <View style={[s.row, { gap: 8, marginBottom: 18 }]}>
        <Btn kind={mode === 'local' ? 'primary' : 'ghost'} label="Un dispositivo" onPress={() => setMode('local')} style={{ flex: 1 }} />
        <Btn kind={mode === 'online' ? 'primary' : 'ghost'} label="En línea" onPress={() => setMode('online')} style={{ flex: 1 }} />
      </View>

      {mode === 'online' ? (
        <>
          <Text style={[s.p, { marginBottom: 14 }]}>Cada persona juega desde su móvil. Una crea la sala y pasa el código a las demás.</Text>
          <Overline>TU CLUB</Overline>
          <View style={[s.panel, { paddingVertical: 6, marginTop: 6 }]}>
            <TextInput
              value={myName}
              onChangeText={(t) => { setMyName(t); setWarn(null); }}
              maxLength={20}
              accessibilityLabel="Nombre de tu club"
              placeholder="Nombre de tu club"
              placeholderTextColor={C.faint}
              style={{ color: C.text, fontSize: 18, fontWeight: '700', paddingVertical: 8 }}
            />
          </View>
          {warn ? <Text style={{ color: C.danger, fontWeight: '700', marginBottom: 10 }}>{warn}</Text> : null}

          <Btn label="Crear una sala" onPress={() => named((n) => props.hostGate().then((why) => (why ? setWarn(why) : props.onHost(n))))} />
          {props.accountsOn ? <Text style={[s.p, { fontSize: 12, marginTop: 6 }]}>Para crear salas necesitas una cuenta. Para unirte, no.</Text> : null}
          {props.resumeCode ? <Btn kind="ghost" label={`Reanudar mi sala ${props.resumeCode}`} onPress={props.onResume} style={{ marginTop: 8 }} /> : null}

          <View style={[s.row, { marginVertical: 18 }]}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
            <Text style={[s.overline, { marginHorizontal: 10 }]}>O ÚNETE A UNA</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
          </View>

          <Overline>CÓDIGO DE SALA</Overline>
          <View style={[s.panel, { paddingVertical: 6, marginTop: 6 }]}>
            <TextInput
              value={code}
              onChangeText={(t) => { setCode(t.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5)); setWarn(null); }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={5}
              accessibilityLabel="Código de sala"
              placeholder="ABCDE"
              placeholderTextColor={C.faint}
              style={{ color: C.accent, fontSize: 30, fontWeight: '900', letterSpacing: 8, textAlign: 'center', paddingVertical: 6 }}
            />
          </View>
          <Btn
            kind={code.length === 5 ? 'primary' : 'muted'}
            label="Unirme a la sala"
            onPress={() => (code.length === 5 ? named((n) => props.onJoin(code, n)) : setWarn('El código tiene 5 letras.'))}
          />
        </>
      ) : (
        <>
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
        </>
      )}
    </ScrollView>
    </View>
  );
}
