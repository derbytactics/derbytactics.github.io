import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { load, save } from '../net/storage';
import { Btn, s } from './components';
import { C } from './theme';

const KEY = 'futcards.tips';
const seen = () => load<string[]>(KEY) ?? [];
/** Vuelve a enseñar todos los consejos (desde la ayuda). */
export const resetTips = () => save(KEY, []);

/** Consejo para la primera vez que se llega a una pantalla. Se oculta al pulsar «Entendido» y no vuelve a salir. */
export function Tip({ id, title, children }: { id: string; title: string; children: string }) {
  const [hidden, setHidden] = useState(() => seen().includes(id));
  if (hidden) return null;
  return (
    <View style={{ backgroundColor: '#17324A', borderColor: '#7FB2FF', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 }}>
      <Text style={[s.overline, { color: '#7FB2FF' }]}>CONSEJO · PRIMERA VEZ</Text>
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 15, marginTop: 2 }}>{title}</Text>
      <Text style={[s.p, { color: '#D4E4F7', marginTop: 4 }]}>{children}</Text>
      <View style={{ alignItems: 'flex-start', marginTop: 8 }}>
        <Btn
          small
          kind="ghost"
          label="Entendido"
          onPress={() => {
            save(KEY, [...new Set([...seen(), id])]);
            setHidden(true);
          }}
        />
      </View>
    </View>
  );
}
