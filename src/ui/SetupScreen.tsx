import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CONFIG, CrestDesign, League, NewGameOptions, SeasonLength, randomClubName, randomCrest } from '../engine';
import { Crest, Logo } from './art';
import { MyClub } from '../account/club';
import { Btn, LeaguePicker, LegalLinks, NavBar, Overline, s } from './components';
import { C, clubColor } from './theme';

type Rival = { name: string; isBot: boolean; crest: CrestDesign };
const rnd = () => Math.random();
/** Rivales al azar: nombres y escudos nuevos cada vez. */
function randomRivals(mine: string): Rival[] {
  const taken = [mine];
  return Array.from({ length: CONFIG.maxPlayers - 1 }, () => {
    const name = randomClubName(rnd, taken);
    taken.push(name);
    return { name, isBot: true, crest: randomCrest(rnd) };
  });
}
const SEASONS: { key: SeasonLength; label: string; note: string }[] = [
  { key: 'corta', label: 'Corta', note: `${CONFIG.seasonLengths.corta} jornadas` },
  { key: 'estandar', label: 'Estándar', note: `${CONFIG.seasonLengths.estandar} jornadas` },
  { key: 'larga', label: 'Larga', note: `${CONFIG.seasonLengths.larga} jornadas` },
];

export function SetupScreen(props: {
  onStart: (o: NewGameOptions) => void;
  onHelp: () => void;
  /** El club de esta persona: lo lleva a todas sus partidas. */
  club: MyClub;
  onEditClub: () => void;
  onHost: () => void;
  onJoin: (code: string) => void;
  /** Sala propia guardada en este dispositivo, si la hay. */
  resumeCode: string | null;
  onResume: () => void;
  initialCode: string;
  /** Descripción de la partida local guardada, si la hay. */
  savedLocal: string | null;
  onContinueLocal: () => void;
  /** Hay servidor de cuentas: crear salas exige estar registrado. */
  accountsOn: boolean;
  /** Comprueba si esta persona puede crear salas; devuelve el motivo si no. */
  hostGate: () => Promise<string | null>;
}) {
  const { onStart, onHelp } = props;
  const [mode, setMode] = useState<'local' | 'online'>(props.initialCode ? 'online' : 'local');
  const { club } = props;
  const [code, setCode] = useState(props.initialCode);
  const [warn, setWarn] = useState<string | null>(null);
  const [count, setCount] = useState(4);
  const [season, setSeason] = useState<SeasonLength>('estandar');
  const [league, setLeague] = useState<League>('masculina');
  const [rivals, setRivals] = useState(() => randomRivals(club.name));
  const patch = (i: number, p: Partial<Rival>) => setRivals((all) => all.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const reroll = (i: number) =>
    patch(i, { name: randomClubName(rnd, [club.name, ...rivals.filter((_, j) => j !== i).map((r) => r.name)]), crest: randomCrest(rnd) });
  const myClubCard = (
    <View style={[s.panel, s.row, { borderColor: C.accent }]}>
      <Crest name={club.name} color={club.crest.primary} design={club.crest} size={46} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Overline>TU CLUB</Overline>
        <Text numberOfLines={1} style={{ color: C.text, fontSize: 18, fontWeight: '900' }}>{club.name}</Text>
      </View>
      <Btn small kind="ghost" label="Cambiar" onPress={props.onEditClub} />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
    <NavBar />
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 18 }}>
        <Logo size={128} />
        <Text style={{ color: C.text, fontSize: 40, fontWeight: '900', letterSpacing: -1 }}>
          DERBY<Text style={{ color: C.accent }}>TACTICS</Text>
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
          {myClubCard}
          {warn ? <Text style={{ color: C.danger, fontWeight: '700', marginBottom: 10 }}>{warn}</Text> : null}

          <Btn label="Crear una sala" onPress={() => props.hostGate().then((why) => (why ? setWarn(why) : props.onHost()))} />
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
            onPress={() => (code.length === 5 ? props.onJoin(code) : setWarn('El código tiene 5 letras.'))}
          />
        </>
      ) : (
        <>
          {props.savedLocal ? (
            <View style={[s.panel, { borderColor: C.accent }]}>
              <Overline>PARTIDA GUARDADA</Overline>
              <Text style={{ color: C.text, fontWeight: '700', marginVertical: 6 }}>{props.savedLocal}</Text>
              <Btn label="Continuar la partida" onPress={props.onContinueLocal} />
              <Text style={[s.p, { fontSize: 12, marginTop: 6 }]}>Si empiezas una nueva, esta se sustituye.</Text>
            </View>
          ) : null}
      <View style={[s.row, { marginBottom: 10 }]}>
            <View style={{ flex: 1 }}>
              <Overline>CLUBES EN LA LIGA</Overline>
              <Text style={{ color: C.text, fontSize: 22, fontWeight: '900' }}>{count} clubes</Text>
            </View>
            <Btn label="−" small kind="ghost" onPress={() => setCount((c) => Math.max(CONFIG.minPlayers, c - 1))} style={{ width: 44 }} />
            <Btn label="+" small kind="ghost" onPress={() => setCount((c) => Math.min(CONFIG.maxPlayers, c + 1))} style={{ width: 44, marginLeft: 8 }} />
          </View>

          {myClubCard}
          <Overline>RIVALES</Overline>
          <View style={{ height: 6 }} />
          {rivals.slice(0, count - 1).map((p, i) => (
            <View key={i} style={[s.panel, s.row, { paddingVertical: 8, marginBottom: 8 }]}>
              <Crest name={p.name || `Club ${i + 2}`} color={clubColor(i + 1)} design={p.crest} size={34} />
              <TextInput
                value={p.name}
                onChangeText={(name) => patch(i, { name })}
                maxLength={20}
                accessibilityLabel={`Nombre del club rival ${i + 1}`}
                style={{ flex: 1, minWidth: 0, color: C.text, fontSize: 16, fontWeight: '700', paddingVertical: 6, marginHorizontal: 10 }}
                placeholderTextColor={C.faint}
                placeholder={`Club ${i + 2}`}
              />
              <Pressable accessibilityRole="button" accessibilityLabel="Otro nombre y escudo al azar" onPress={() => reroll(i)} hitSlop={6} style={{ marginRight: 8 }}>
                <Text style={{ fontSize: 20 }}>🎲</Text>
              </Pressable>
              <Btn small kind={p.isBot ? 'ghost' : 'primary'} label={p.isBot ? 'IA' : 'Persona'} onPress={() => patch(i, { isBot: !p.isBot })} style={{ width: 84 }} />
            </View>
          ))}
          {rivals.slice(0, count - 1).some((r) => !r.isBot) ? (
            <Text style={[s.p, { fontSize: 12, marginBottom: 8 }]}>Los clubes de «Persona» se juegan pasándose el dispositivo. El historial se guarda para tu club.</Text>
          ) : null}

          <View style={{ height: 10 }} />
          <LeaguePicker value={league} onPick={setLeague} />
          <View style={{ marginBottom: 22 }}>
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

          <Btn
            label="Empezar la pretemporada"
            onPress={() => onStart({ players: [{ name: club.name, isBot: false, crest: club.crest }, ...rivals.slice(0, count - 1).map((r, i) => ({ ...r, name: r.name.trim() || `Club ${i + 2}` }))], season, league })}
          />
        </>
      )}
      <LegalLinks />
    </ScrollView>
    </View>
  );
}
