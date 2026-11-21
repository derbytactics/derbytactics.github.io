import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { LEGAL, legalReady, privacy, terms } from '../legal/texts';
import { Btn, s } from './components';
import { C } from './theme';

export type LegalTab = 'privacidad' | 'condiciones';

export function LegalScreen({ initial, onClose }: { initial: LegalTab; onClose: () => void }) {
  const [tab, setTab] = useState<LegalTab>(initial);
  const sections = tab === 'privacidad' ? privacy() : terms();
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={[s.row, { marginBottom: 14 }]}>
        <Text style={[s.h1, { flex: 1 }]}>{tab === 'privacidad' ? 'Privacidad' : 'Condiciones de uso'}</Text>
        <Btn small kind="ghost" label="Cerrar" onPress={onClose} />
      </View>
      <View style={[s.row, { gap: 8, marginBottom: 14 }]}>
        <Btn small kind={tab === 'privacidad' ? 'selected' : 'ghost'} label="Privacidad" onPress={() => setTab('privacidad')} style={{ flex: 1 }} />
        <Btn small kind={tab === 'condiciones' ? 'selected' : 'ghost'} label="Condiciones" onPress={() => setTab('condiciones')} style={{ flex: 1 }} />
      </View>
      {!legalReady() ? (
        <View style={[s.panel, { borderColor: C.danger }]}>
          <Text style={{ color: '#FFB3B5', fontWeight: '700' }}>Borrador: faltan los datos del titular y la revisión legal antes de publicar el juego.</Text>
        </View>
      ) : null}
      <Text style={[s.p, { fontSize: 12, marginBottom: 12 }]}>Última actualización: {LEGAL.updated}</Text>
      {sections.map((sec) => (
        <View key={sec.title} style={{ marginBottom: 14 }}>
          <Text style={s.h2}>{sec.title}</Text>
          {sec.body.map((p, i) => (
            <Text key={i} style={[s.p, { marginBottom: 8 }]}>{p}</Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
