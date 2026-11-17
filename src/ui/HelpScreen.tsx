import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { CONFIG } from '../engine';
import { Avatar, Die, StadiumArt, Trophy } from './art';
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
        title="Monta tu equipo"
        text={`Caben ${CONFIG.squadSize} futbolistas y un solo portero; el resto, con la táctica que quieras. Cada uno actúa cuando sale uno de sus números (el 6 y el 8 son los que más salen). Un fichaje por turno.`}
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
        title="Ataque contra defensa"
        text="Se tiran dos dados 6 veces, en un solo partido de todos contra todos. Con el número que sale: cada delantero suma 2 de ataque y cada medio 1; el portero suma 2 de defensa, y cada defensa y cada medio 1. Tu jugada es gol contra cada rival cuya defensa en ese número sea menor que tu ataque."
        art={
          <View style={[s.row, { gap: 6 }]}>
            <Die value={5} size={40} />
            <Die value={3} size={40} />
          </View>
        }
      />
      <Step
        n={3}
        title="Qué hace cada posición"
        text="Delantero: remata (ataque 2), solo lo para un portero o varios defensores. Medio: ataca 1 y defiende 1; junto a un delantero forma una jugada combinada que un portero solo no para. Defensa: defiende 1 y, si la jugada se para, sale a la contra y marca al que atacó. Portero: defiende 2, cobra prima por parada y con 3 paradas en una jornada gana una carta."
        art={<Text style={{ fontSize: 40 }}>🧤</Text>}
      />
      <Step
        n={4}
        title="Reparto: puntos y dinero"
        text={`La jornada se ordena por diferencia de goles: quien queda más arriba se lleva más puntos de liga y más premio (de ${CONFIG.prize.first}M a ${CONFIG.prize.last}M). Además cobras taquilla por cada jugada de gol: amplía tu estadio para cobrar más. Con un 7 entra el VAR: no hay jugadas y los últimos de la tabla roban carta.`}
        art={<StadiumArt level={4} color="#3E8BFF" width={92} />}
      />
      <Step
        n={5}
        title="Juega sucio (con elegancia)"
        text="Paga la cláusula de un rival y llévate a su estrella. Lanza sanciones con cartas especiales: multas, partidos a puerta cerrada, lesiones… O protégete blindando a tus jugadores."
        art={<Text style={{ fontSize: 40 }}>🚨</Text>}
      />
      <Step
        n={6}
        title="Gana la liga"
        text={`Tras la última jornada, cada ${CONFIG.moneyPerPoint}M en caja suman 1 punto extra. El club con más puntos es campeón.`}
        art={<Trophy size={64} />}
      />
      <Btn label="Entendido" onPress={onClose} />
    </ScrollView>
  );
}
