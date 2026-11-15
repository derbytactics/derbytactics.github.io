import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { CONFIG } from '../engine';
import { Avatar, Ball, Die, StadiumArt, Trophy } from './art';
import { Btn, NumberToken, Overline, s } from './components';
import { C } from './theme';

function Step({ n, title, text, art }: { n: number; title: string; text: string; art: React.ReactNode }) {
  return (
    <View style={[s.panel, s.row, { alignItems: 'flex-start' }]}>
      <View style={{ width: 92, alignItems: 'center', justifyContent: 'center', minHeight: 70 }}>{art}</View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Overline>PASO {n}</Overline>
        <Text style={[s.h2, { marginTop: 2, marginBottom: 4 }]}>{title}</Text>
        <Text style={s.p}>{text}</Text>
      </View>
    </View>
  );
}

export function HelpScreen({ onClose }: { onClose: () => void }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={s.h1}>Cómo se juega</Text>
      <Text style={[s.p, { marginBottom: 14 }]}>Cada jornada tiene tres pasos: mercado, partido y reparto. Gana quien sume más puntos de liga al final de la temporada.</Text>
      <Step
        n={1}
        title="Ficha en el mercado"
        text={`Cada futbolista tiene números de dado. Cuantos más números y más probables (el 6 y el 8 son los que más salen), más caro es. Caben ${CONFIG.squadSize} en tu plantilla y puedes hacer un fichaje por turno.`}
        art={
          <View style={{ alignItems: 'center' }}>
            <Avatar seed="f1" size={50} jersey="#E5484D" ring={C.accent} />
            <View style={[s.row, { gap: 3, marginTop: 6 }]}>
              <NumberToken n={6} size={26} />
              <NumberToken n={8} size={26} />
              <NumberToken n={9} size={26} />
            </View>
          </View>
        }
      />
      <Step
        n={2}
        title="Se juega el partido"
        text="Se tiran dos dados 6 veces. En cada tirada marcan todos los futbolistas, de todos los clubes, que tengan ese número. Si sale un 7 interviene el VAR: nadie marca y los últimos de la tabla roban una carta especial."
        art={
          <View style={[s.row, { gap: 6 }]}>
            <Die value={5} size={40} />
            <Die value={3} size={40} />
          </View>
        }
      />
      <Step
        n={3}
        title="Reparto: puntos y dinero"
        text={`Quien más goles marca en la jornada se lleva más puntos de liga y un premio mayor (de ${CONFIG.prize.first}M a ${CONFIG.prize.last}M). Además cobras taquilla por cada gol: amplía tu estadio para cobrar más.`}
        art={
          <View style={{ alignItems: 'center' }}>
            <StadiumArt level={4} color="#3E8BFF" width={92} />
            <View style={[s.row, { gap: 3 }]}>
              <Ball size={14} />
              <Ball size={14} />
              <Ball size={14} />
            </View>
          </View>
        }
      />
      <Step
        n={4}
        title="Juega sucio (con elegancia)"
        text="Paga la cláusula de un rival y llévate a su estrella. Lanza sanciones con cartas especiales: multas, partidos a puerta cerrada, lesiones… O protégete blindando a tus jugadores."
        art={<Text style={{ fontSize: 40 }}>🚨</Text>}
      />
      <Step
        n={5}
        title="Gana la liga"
        text={`Tras la última jornada, cada ${CONFIG.moneyPerPoint}M en caja suman 1 punto extra. El club con más puntos es campeón.`}
        art={<Trophy size={64} />}
      />
      <Btn label="Entendido" onPress={onClose} />
    </ScrollView>
  );
}
