import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Crest, Trophy } from './art';
import { HistoryEntry, useHistory } from '../account/club';
import { Btn, Overline, s } from './components';
import { C, clubColor, DISPLAY } from './theme';
import { I, Icon } from './icons';

function when(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: C.accent, fontSize: 25, ...DISPLAY }}>{value}</Text>
      <Text style={{ color: C.dim, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

function Game({ g }: { g: HistoryEntry }) {
  const [open, setOpen] = useState(false);
  const won = g.position === 1;
  return (
    <Pressable accessibilityRole="button" onPress={() => setOpen(!open)} style={[s.panel, won && { borderColor: C.accent }]}>
      <View style={s.row}>
        <Crest name={g.club} color={clubColor(0)} design={g.crest} size={40} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Overline>
            {when(g.date)} · {g.online ? 'EN LÍNEA' : 'UN DISPOSITIVO'}{g.league === 'femenina' ? ' · FEMENINA' : g.league === 'mixta' ? ' · MIXTA' : ''} · {g.jornadas} JORNADAS
          </Overline>
          <Text style={{ color: won ? C.accent : C.text, fontSize: 20, ...DISPLAY, marginTop: 2 }}>
            {won ? <Icon name={I.trophy} size={18} color={C.accent} /> : null}
            {won ? (g.league === 'femenina' ? ' Campeonas' : ' Campeón') : `${g.position}.º de ${g.clubs}`}
          </Text>
          <Text style={[s.p, { fontSize: 12 }]}>
            {g.points} pts · {g.goals} goles a favor, {g.against} en contra{won ? '' : ` · Campeón: ${g.champion}`}
          </Text>
        </View>
        <Text style={{ color: C.faint, fontSize: 16 }}>{open ? '▴' : '▾'}</Text>
      </View>
      {open ? (
        <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 }}>
          {g.table.map((p, i) => (
            <View key={i} style={[s.row, { paddingVertical: 3, borderRadius: 8, backgroundColor: p.mine ? C.panelAlt : 'transparent' }]}>
              <Text style={{ color: i === 0 ? C.accent : C.faint, width: 22, fontWeight: '800' }}>{i + 1}</Text>
              <Crest name={p.name} color={clubColor(i)} design={p.crest} size={22} />
              <Text numberOfLines={1} style={{ color: C.text, flex: 1, fontWeight: p.mine ? '900' : '600', marginLeft: 8 }}>
                {p.name}
                {p.bot ? <Text style={{ color: C.faint }}> · IA</Text> : null}
              </Text>
              <Text style={{ color: C.dim, width: 54, textAlign: 'right', fontSize: 12 }}>
                {p.goals}-{p.against}
              </Text>
              <Text style={{ color: C.text, width: 50, textAlign: 'right', fontWeight: '800' }}>{p.points} pts</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

/** Historial de las partidas terminadas en este dispositivo. */
export function HistoryScreen({ onClose }: { onClose: () => void }) {
  const history = useHistory();
  const titles = history.filter((g) => g.position === 1).length;
  const avg = history.length ? history.reduce((a, g) => a + g.position, 0) / history.length : 0;
  const goals = history.reduce((a, g) => a + g.goals, 0);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={[s.row, { marginBottom: 14 }]}>
        <Text style={[s.h1, { flex: 1 }]}>Historial</Text>
        <Btn small kind="ghost" label="Cerrar" onPress={onClose} />
      </View>
      {history.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <Trophy size={72} />
          <Text style={[s.p, { textAlign: 'center', marginTop: 10 }]}>Aún no has terminado ninguna temporada. Cuando acabes una, aparecerá aquí con la clasificación final.</Text>
        </View>
      ) : (
        <>
          <View style={[s.panel, s.row, { paddingVertical: 14 }]}>
            <Stat label="TEMPORADAS" value={String(history.length)} />
            <Stat label="TÍTULOS" value={String(titles)} />
            <Stat label="PUESTO MEDIO" value={avg.toFixed(1).replace('.', ',')} />
            <Stat label="GOLES" value={String(goals)} />
          </View>
          {history.map((g) => (
            <Game key={g.id} g={g} />
          ))}
          <Text style={[s.p, { fontSize: 12, textAlign: 'center' }]}>Se guardan las últimas 100 temporadas terminadas en este dispositivo.</Text>
        </>
      )}
    </ScrollView>
  );
}
