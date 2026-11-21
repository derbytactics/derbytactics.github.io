import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CREST_COLORS, CREST_EMBLEMS, CREST_PATTERNS, CREST_SHAPES, CrestDesign, isOffensive, randomClubName, randomCrest } from '../engine';
import { Crest } from './art';
import { MyClub, setMyClub } from '../account/club';
import { EMBLEM_NAMES, PATTERN_NAMES, SHAPE_NAMES } from './crest';
import { Btn, Overline, s } from './components';
import { C } from './theme';

const rnd = () => Math.random();

function Swatches({ value, onPick, label }: { value: string; onPick: (c: string) => void; label: string }) {
  return (
    <View style={[s.row, { flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 14 }]}>
      {CREST_COLORS.map((c) => (
        <Pressable
          key={c}
          accessibilityRole="button"
          accessibilityLabel={`${label} ${c}`}
          onPress={() => onPick(c)}
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c, borderWidth: value === c ? 3 : 1, borderColor: value === c ? C.accent : C.line }}
        />
      ))}
    </View>
  );
}

/** Fila de miniaturas para elegir una opción del escudo. */
function Options({ count, names, value, render, onPick }: { count: number; names: string[]; value: number; render: (i: number) => CrestDesign; onPick: (i: number) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8, marginBottom: 14 }} contentContainerStyle={{ gap: 8 }}>
      {Array.from({ length: count }, (_, i) => (
        <Pressable
          key={i}
          accessibilityRole="button"
          accessibilityLabel={names[i]}
          onPress={() => onPick(i)}
          style={{ alignItems: 'center', padding: 6, borderRadius: 12, borderWidth: 2, borderColor: value === i ? C.accent : 'transparent', backgroundColor: value === i ? C.panelAlt : 'transparent', width: 66 }}
        >
          <Crest name="FC" color="#000000" size={44} design={render(i)} />
          <Text numberOfLines={1} style={{ color: value === i ? C.accent : C.dim, fontSize: 11, fontWeight: '700', marginTop: 4 }}>{names[i]}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/**
 * Crear o editar el club del jugador. Con `first` es obligatorio (no se puede cerrar sin guardar).
 */
export function ClubScreen({ initial, first, inGame, onClose }: { initial: MyClub | null; first?: boolean; inGame?: boolean; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [crest, setCrest] = useState<CrestDesign>(initial?.crest ?? randomCrest(rnd));
  const [warn, setWarn] = useState<string | null>(null);
  const patch = (p: Partial<CrestDesign>) => setCrest((c) => ({ ...c, ...p }));
  const saveClub = () => {
    const n = name.trim();
    if (n.length < 3) return setWarn('El nombre del club necesita al menos 3 letras.');
    if (isOffensive(n)) return setWarn('Ese nombre no está permitido. Elige otro.');
    setMyClub({ name: n, crest });
    onClose();
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={[s.row, { marginBottom: 6 }]}>
        <Text style={[s.h1, { flex: 1 }]}>{first ? 'Funda tu club' : 'Mi club'}</Text>
        {!first ? <Btn small kind="ghost" label="Cerrar" onPress={onClose} /> : null}
      </View>
      <Text style={[s.p, { marginBottom: 14 }]}>
        {first
          ? 'Tienes un club, y es solo tuyo: ponle nombre y diseña su escudo. Lo llevarás a todas tus partidas, en este dispositivo y en línea.'
          : 'Puedes cambiar el nombre y el escudo cuando quieras.'}
        {inGame ? ' Los cambios se verán a partir de tu próxima partida.' : ''}
      </Text>

      <View style={{ alignItems: 'center', marginBottom: 14 }}>
        <Crest name={name.trim() || 'Mi club'} color={crest.primary} size={148} design={crest} />
        <Text numberOfLines={1} style={{ color: C.text, fontSize: 22, fontWeight: '900', marginTop: 8 }}>{name.trim() || 'Tu club'}</Text>
      </View>

      <Overline>NOMBRE DEL CLUB</Overline>
      <View style={[s.panel, s.row, { paddingVertical: 4, marginTop: 6 }]}>
        <TextInput
          value={name}
          onChangeText={(t) => {
            setName(t);
            setWarn(null);
          }}
          maxLength={20}
          accessibilityLabel="Nombre de tu club"
          placeholder="Por ejemplo, Atlético Ribera"
          placeholderTextColor={C.faint}
          style={{ flex: 1, minWidth: 0, color: C.text, fontSize: 18, fontWeight: '700', paddingVertical: 8 }}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Nombre al azar" onPress={() => setName(randomClubName(rnd))} hitSlop={8}>
          <Text style={{ fontSize: 22 }}>🎲</Text>
        </Pressable>
      </View>
      {warn ? <Text style={{ color: C.danger, fontWeight: '700', marginBottom: 10 }}>{warn}</Text> : null}

      <View style={[s.row, { marginBottom: 4 }]}>
        <Text style={[s.h2, { flex: 1 }]}>Escudo</Text>
        <Btn small kind="ghost" label="🎲 Sorpréndeme" onPress={() => setCrest(randomCrest(rnd))} />
      </View>

      <Overline>FORMA</Overline>
      <Options count={CREST_SHAPES} names={SHAPE_NAMES} value={crest.shape} render={(i) => ({ ...crest, shape: i })} onPick={(i) => patch({ shape: i })} />
      <Overline>EMBLEMA</Overline>
      <Options count={CREST_EMBLEMS} names={EMBLEM_NAMES} value={crest.emblem} render={(i) => ({ ...crest, emblem: i })} onPick={(i) => patch({ emblem: i })} />
      <Overline>DIBUJO</Overline>
      <Options count={CREST_PATTERNS} names={PATTERN_NAMES} value={crest.pattern} render={(i) => ({ ...crest, pattern: i })} onPick={(i) => patch({ pattern: i })} />
      <Overline>COLOR PRINCIPAL</Overline>
      <Swatches label="Color principal" value={crest.primary} onPick={(c) => patch({ primary: c })} />
      <Overline>COLOR SECUNDARIO</Overline>
      <Swatches label="Color secundario" value={crest.secondary} onPick={(c) => patch({ secondary: c })} />

      <Btn label={first ? 'Fundar mi club' : 'Guardar cambios'} onPress={saveClub} style={{ marginTop: 6 }} />
    </ScrollView>
  );
}
