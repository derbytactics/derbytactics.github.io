import React from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { CONFIG, League, ruleWords } from '../engine';
import { currentLeague } from './currentLeague';
import { faceFromSeed } from './portrait';
import { Avatar, Die, StadiumArt, Trophy } from './art';
import { Btn, LegalLinks, NumberToken, Overline, s } from './components';
import { resetTips } from './Tip';
import { C } from './theme';
import { I, Icon } from './icons';

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

export function HelpScreen({ onClose, league = currentLeague() }: { onClose: () => void; league?: League }) {
  const w = ruleWords(league);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={s.h1}>Cómo se juega</Text>
      <Text style={[s.p, { marginBottom: 14 }]}>Cada jornada tiene tres pasos: mercado, partido y reparto. Gana quien sume más puntos de liga al final de la temporada.</Text>
      <Step
        n={1}
        title="Monta tu equipo"
        text={`Caben ${CONFIG.squadSize} futbolistas, con ${w.aKeeper} y dos ${w.forwards} como mucho; el resto, con la táctica que quieras. ${w.fem ? 'Cada una' : 'Cada uno'} actúa cuando sale uno de sus números (el 6 y el 8 son los que más salen). En tu turno de mercado puedes fichar una vez, ampliar el estadio, comprar una carta especial y jugar hasta ${CONFIG.special.maxPlayedPerTurn}. Antes de cada partido eliges en secreto ${CONFIG.starters} titulares: el resto se queda en el banquillo.`}
        art={
          <View style={{ alignItems: 'center' }}>
            <Avatar seed="f1" who={w.fem ? { ...faceFromSeed('f1'), fem: true } : undefined} size={50} jersey="#E5484D" ring={C.accent} />
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
        text={`Un solo partido de todos contra todos. Cada club tira los dados una vez. Con el número que sale atacan ${w.fem ? 'las' : 'los'} que lo tengan: ${w.eachForward} suma 2 y ${w.eachMid} 1. Cada rival defiende con ${w.fem ? 'las suyas' : 'los suyos'}: ${w.theKeeper} suma 2 y ${w.eachBack} 1. Tu jugada es gol contra cada rival cuya defensa en ese número sea menor que tu ataque.`}
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
        text={`${w.Forward}: ataque 2; ${w.it} para ${w.theKeeper}. Como mucho 2 por club. ${w.Mid}: ataque 1; con ${w.aForward} forma la jugada combinada (fuerza 3), que solo paran ${w.theKeeper} y ${w.aBack} juntos. Defensa: defensa 1 en tres o cuatro números; corta a ${w.fem ? 'las medias' : 'los medios'} y completa ${w.toTheKeeper}. ${w.Keeper}: defensa 2 en tres o cuatro números; cobra prima por parada y con 3 en una jornada gana una carta.`}
        art={<Icon name={I.save} size={44} color={C.accent} />}
      />
      <Step
        n={4}
        title="Reparto: puntos y dinero"
        text={`La jornada se ordena por diferencia de goles: quien queda más arriba se lleva más puntos de liga y más premio (de ${CONFIG.prize.first}M a ${CONFIG.prize.last}M). Además cobras taquilla por cada jugada de gol: amplía tu estadio para cobrar más. Si sacas un 7 entra el VAR: no hay jugada, pero te llevas una carta especial.`}
        art={<StadiumArt level={4} color="#3E8BFF" width={92} />}
      />
      <Step
        n={5}
        title="Juega sucio (con elegancia)"
        text={`Paga la cláusula de un rival y llévate a su estrella. Lanza sanciones con cartas especiales: multas, partidos a puerta cerrada, lesiones… O protégete blindando a tus ${w.players}.`}
        art={<Icon name="alarm-light" size={44} color={C.danger} />}
      />
      <Step
        n={6}
        title="Gana la liga"
        text={`Tras la última jornada, cada ${CONFIG.moneyPerPoint}M en caja suman 1 punto extra. El club con más puntos es campeón.`}
        art={<Trophy size={64} />}
      />
      {Platform.OS === 'web' ? (
        <View style={{ marginBottom: 14 }}>
          <Text style={[s.p, { fontWeight: '800', color: C.text }]}>Instálalo en tu móvil</Text>
          <Text style={s.p}>
            Sin tienda y gratis: en iPhone, abre el juego en Safari, pulsa Compartir y «Añadir a pantalla de inicio». En Android, en Chrome, menú ⋮ y «Instalar aplicación» o «Añadir a pantalla de inicio». Se abrirá a pantalla completa, como una app.
          </Text>
        </View>
      ) : null}
      <Btn label="Entendido" onPress={onClose} />
      <Btn small kind="ghost" label="Volver a ver los consejos de primera vez" onPress={() => { resetTips(); onClose(); }} style={{ marginTop: 10 }} />
      <LegalLinks />
    </ScrollView>
  );
}
