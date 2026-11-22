import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { NearbyFound, browseNearby, nearbyAvailable } from '../net/nearby';
import { Btn, Overline, s } from './components';
import { Icon } from './icons';
import { C } from './theme';

/**
 * Jugar sin internet con quien tengas al lado (iPhone): crear una sala cercana o entrar en una
 * de las que se ven alrededor. Mientras está en pantalla, el móvil busca salas.
 */
export function NearbyPanel({ onHost, onJoin }: { onHost: () => void; onJoin: (code: string) => void }) {
  const [rooms, setRooms] = useState<NearbyFound[]>([]);
  useEffect(() => browseNearby(setRooms), []);
  if (!nearbyAvailable()) return null;
  return (
    <View style={[s.panel, { borderColor: C.good, marginTop: 18 }]}>
      <View style={s.row}>
        <Icon name="bluetooth" size={22} color={C.good} style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Overline>SIN INTERNET · MÓVILES CERCA</Overline>
          <Text style={{ color: C.dim, fontSize: 12, marginTop: 2 }}>En el avión o donde no haya cobertura: por Bluetooth y wifi, sin servidor. Hasta 8 móviles.</Text>
        </View>
      </View>
      {rooms.length ? (
        rooms.map((r) => (
          <View key={r.id} style={[s.row, { marginTop: 10 }]}>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: C.text, fontWeight: '800' }}>{r.name || 'Sala cercana'}</Text>
              <Text style={{ color: C.faint, fontSize: 12 }}>Sala {r.code}</Text>
            </View>
            <Btn small label="Entrar" onPress={() => onJoin(r.code)} />
          </View>
        ))
      ) : (
        <Text style={[s.p, { fontSize: 12, marginTop: 10 }]}>Buscando salas cercanas… Si tu amigo crea una, aparecerá aquí.</Text>
      )}
      <Btn kind="ghost" icon="bluetooth" label="Crear una sala cercana" onPress={onHost} style={{ marginTop: 12 }} />
    </View>
  );
}
