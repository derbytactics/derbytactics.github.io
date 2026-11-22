import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CONFIG, CrestDesign, League, NewGameOptions, SeasonLength, randomClubName, randomCrest } from '../engine';
import { Crest, Logo } from './art';
import { MyClub } from '../account/club';
import { Btn, LeaguePicker, Wordmark, LegalLinks, NavBar, Overline, s, useBack } from './components';
import { C, clubColor, DISPLAY } from './theme';
import { I, Icon } from './icons';
import { DailyCard } from './DailyScreen';
import { CareerCard } from './CareerScreen';
import { NearbyPanel } from './NearbyPanel';
import { nearbyAvailable } from '../net/nearby';

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
  /** Sala cercana, sin internet (solo donde haya módulo nativo). */
  onHostNearby: () => void;
  onJoin: (code: string) => void;
  /** Sala propia guardada en este dispositivo, si la hay. */
  resumeCode: string | null;
  onResume: () => void;
  initialCode: string;
  /** Descripción de la partida local guardada, si la hay. */
  savedLocal: string | null;
  onContinueLocal: () => void;
  /** Reto diario: si hay uno a medias, empezarlo o seguirlo, y ver el resultado de hoy. */
  dailyPlaying: boolean;
  onDaily: () => void;
  onDailyResult: () => void;
  /** Modo carrera: jugar o seguir la temporada, y abrir la vitrina. */
  onCareer: () => void;
  onCareerOpen: () => void;
  /** Comprueba si esta persona puede crear salas; devuelve el motivo si no. */
  hostGate: () => Promise<string | null>;
}) {
  const { onStart } = props;
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
      <Crest name={club.name} color={club.crest.primary} design={club.crest} size={42} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Overline>TU CLUB</Overline>
        <Text numberOfLines={1} style={{ color: C.text, fontSize: 20, ...DISPLAY }}>{club.name}</Text>
      </View>
      <Btn small kind="ghost" label="Cambiar" onPress={props.onEditClub} />
    </View>
  );

  // En este móvil se juega contra la IA: los rivales siempre los lleva ella.
  const start = () =>
    onStart({ players: [{ name: club.name, isBot: false, crest: club.crest }, ...rivals.slice(0, count - 1).map((r, i) => ({ ...r, isBot: true, name: r.name.trim() || `Club ${i + 2}` }))], season, league });
  // «Atrás» en Android: vuelve a jugar aquí o pliega las opciones antes de salir de la app.
  useBack(() => {
    if (mode === 'online') return setMode('local'), true;
    return false;
  });

  return (
    <View style={{ flex: 1 }}>
    <NavBar />
    {/* En iPhone, al abrirse el teclado la lista deja sitio y sube la casilla activa a la vista. */}
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={{ alignItems: 'center', marginTop: 4, marginBottom: 16 }}>
        <Logo size={88} />
        <View style={{ marginTop: 6 }}>
          <Wordmark size={40} />
        </View>
        <Text style={[s.p, { textAlign: 'center', marginTop: 2 }]}>Ficha, amplía tu estadio y gana la liga a golpe de dado.</Text>
      </View>

      <View accessibilityRole="tablist" style={[s.row, { marginBottom: 16, backgroundColor: C.panel, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: C.line }]}>
        {(['local', 'online'] as const).map((m) => (
          <Pressable
            key={m}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === m }}
            onPress={() => {
              setMode(m);
              setWarn(null);
            }}
            style={{ flex: 1, minHeight: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: mode === m ? C.sel : 'transparent', borderWidth: 1, borderColor: mode === m ? C.selLine : 'transparent' }}
          >
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{m === 'local' ? 'Jugar aquí' : nearbyAvailable() ? 'Con amigos' : 'Con amigos en línea'}</Text>
          </Pressable>
        ))}
      </View>

      {mode === 'online' ? (
        <>
          <Text style={[s.p, { marginBottom: 14 }]}>Cada persona juega desde su móvil. Una crea la sala y pasa el código a las demás.</Text>
          {myClubCard}
          {warn ? <Text style={{ color: C.danger, fontWeight: '700', marginBottom: 10 }}>{warn}</Text> : null}

          <Btn label="Crear una sala" onPress={() => props.hostGate().then((why) => (why ? setWarn(why) : props.onHost()))} />
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
              style={{ color: C.accent, fontSize: 34, ...DISPLAY, letterSpacing: 8, textAlign: 'center', paddingVertical: 6 }}
            />
          </View>
          <Btn
            kind={code.length === 5 ? 'primary' : 'muted'}
            label="Unirme a la sala"
            onPress={() => (code.length === 5 ? props.onJoin(code) : setWarn('El código tiene 5 letras.'))}
          />
          <NearbyPanel onHost={props.onHostNearby} onJoin={props.onJoin} />
        </>
      ) : (
        <>
          <DailyCard playing={props.dailyPlaying} onPlay={props.onDaily} onResult={props.onDailyResult} />
          <CareerCard onPlay={props.onCareer} onOpen={props.onCareerOpen} />
          {props.savedLocal ? (
            <View style={[s.panel, { borderColor: C.accent }]}>
              <Overline>PARTIDA A MEDIAS</Overline>
              <Text style={{ color: C.text, fontWeight: '700', marginVertical: 6 }}>{props.savedLocal}</Text>
              <Btn label="Continuar la partida" onPress={props.onContinueLocal} />
            </View>
          ) : null}
          {myClubCard}

          <View style={[s.panel, { paddingBottom: 4 }]}>
              <View style={[s.row, { marginBottom: 10 }]}>
                <View style={{ flex: 1 }}>
                  <Overline>CLUBES EN LA LIGA</Overline>
                  <Text style={{ color: C.text, fontSize: 22, ...DISPLAY }}>{count} clubes</Text>
                </View>
                <Btn label="−" small kind="ghost" onPress={() => setCount((c) => Math.max(CONFIG.minPlayers, c - 1))} style={{ width: 48 }} />
                <Btn label="+" small kind="ghost" onPress={() => setCount((c) => Math.min(CONFIG.maxPlayers, c + 1))} style={{ width: 48, marginLeft: 8 }} />
              </View>

              <Overline>RIVALES</Overline>
              <View style={{ height: 6 }} />
              {rivals.slice(0, count - 1).map((p, i) => (
                <View key={i} style={[s.row, { paddingVertical: 4, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: C.line }]}>
                  <Crest name={p.name || `Club ${i + 2}`} color={clubColor(i + 1)} design={p.crest} size={32} />
                  <TextInput
                    value={p.name}
                    onChangeText={(name) => patch(i, { name })}
                    maxLength={20}
                    accessibilityLabel={`Nombre del club rival ${i + 1}`}
                    style={{ flex: 1, minWidth: 0, color: C.text, fontSize: 16, fontWeight: '700', paddingVertical: 10, marginHorizontal: 10 }}
                    placeholderTextColor={C.faint}
                    placeholder={`Club ${i + 2}`}
                  />
                  <Pressable accessibilityRole="button" accessibilityLabel="Otro nombre y escudo al azar" onPress={() => reroll(i)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={I.shuffle} size={24} color={C.dim} />
                  </Pressable>
                </View>
              ))}
              <Text style={[s.p, { fontSize: 13, marginBottom: 8 }]}>Los rivales los lleva la IA. Para jugar con amigos, cada uno en su móvil: «Con amigos en línea».</Text>

              <View style={{ height: 6 }} />
              <LeaguePicker value={league} onPick={setLeague} />
              <View style={{ marginBottom: 12 }}>
                <Overline>DURACIÓN DE LA TEMPORADA</Overline>
                <View style={[s.row, { gap: 8, marginTop: 8 }]}>
                  {SEASONS.map((x) => (
                    <View key={x.key} style={{ flex: 1 }}>
                      <Btn small kind={season === x.key ? 'selected' : 'ghost'} label={x.label} onPress={() => setSeason(x.key)} />
                      <Text style={{ color: C.dim, fontSize: 12, textAlign: 'center', marginTop: 4 }}>{x.note}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
        </>
      )}

      <LegalLinks />
    </ScrollView>
    {mode === 'local' ? (
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg }}>
        <Btn
          kind={props.savedLocal ? 'ghost' : 'primary'}
          icon={I.ball}
          label={props.savedLocal ? 'Empezar una nueva partida' : 'Jugar contra la IA'}
          onPress={start}
        />
        {props.savedLocal ? <Text style={[s.p, { fontSize: 13, marginTop: 4, textAlign: 'center' }]}>Sustituye a la partida a medias.</Text> : null}
      </View>
    ) : null}
    </View>
  );
}
