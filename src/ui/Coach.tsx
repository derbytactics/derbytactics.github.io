import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GameState, footballer, ruleWords } from '../engine';
import { Icon } from './icons';

/** En la partida guiada, los consejos de primera vez no hacen falta: ya habla el entrenador. */
export const TutorialContext = React.createContext(false);

/** Lo que dice el entrenador en cada momento de la partida guiada. */
export function coachTip(g: GameState, seat: number): string | null {
  const me = g.players[seat];
  if (!me) return null;
  const w = ruleWords(g.league);
  const has = (pos: string) => me.squad.some((e) => footballer(e.cardId).position === pos);
  const myTurn = g.phase === 'market' && g.turnOrder[g.turnIndex] === seat;
  switch (g.phase) {
    case 'market':
      if (!myTurn) return 'Los rivales están fichando. Espera tu turno.';
      if (g.turn.signed) return 'Solo se ficha una vez por turno. Cuando quieras, pulsa «Terminar turno».';
      if (!has('POR')) return `Empieza por ${w.aKeeper}: busca una carta con «POR» y pulsa «Fichar». Los números 6 y 8 son los que más salen.`;
      if (!has('DEL')) return `Ahora ${w.aForward} («DEL»): es quien más ataca. Los delanteros con 6 y 8 son los que más marcan.`;
      if (me.squad.length < 5) return `Completa el equipo con ${w.mids} y defensas. Fíjate en «Actúa con»: cuantos más números frecuentes, mejor.`;
      if (g.jornada === 1) return 'Ya tienes equipo. Puedes seguir fichando o pulsar «Terminar turno» para empezar la liga.';
      return 'En el mercado también puedes ampliar el estadio (en «Plantilla») o jugar cartas (en «Cartas»). Al acabar, «Terminar turno».';
    case 'lineup':
      return me.starters ? 'Esperando a que los rivales elijan…' : 'Elige 5 titulares. La app ya te propone la mejor alineación: pulsa «Confirmar alineación».';
    case 'match':
      if (g.match?.pending?.[0]?.playerId === seat) return 'Una jugada te afecta y tienes una carta para cambiarla: decide si la juegas.';
      return 'Tira los dados: con el número que salga atacan tus delanteros y medios que lo tengan, y los rivales intentan pararlo. Lee la crónica.';
    case 'summary':
      return 'Reparto: cuantos más goles de diferencia, más puntos de liga y más dinero. Sigue al mercado de la siguiente jornada.';
    case 'finished':
      return '¡Primera liga terminada! Ya sabes jugar. Prueba el reto diario, una carrera o una liga con amigos.';
    default:
      return null;
  }
}

/** Banda del entrenador, arriba de la partida guiada. Se puede plegar. */
export function Coach({ game, seat }: { game: GameState; seat: number }) {
  const [hidden, setHidden] = useState(false);
  const tip = coachTip(game, seat);
  if (!tip) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hidden ? 'Mostrar la guía' : `Guía: ${tip}. Pulsa para plegarla.`}
      onPress={() => setHidden((x) => !x)}
      style={{ backgroundColor: '#17324A', borderBottomWidth: 1, borderBottomColor: '#7FB2FF', paddingHorizontal: 16, paddingVertical: hidden ? 6 : 10, flexDirection: 'row', alignItems: 'center' }}
    >
      <Icon name="whistle" size={hidden ? 16 : 22} color="#7FB2FF" style={{ marginRight: 10 }} />
      {hidden ? (
        <Text style={{ color: '#7FB2FF', fontWeight: '800', fontSize: 12, flex: 1 }}>GUÍA · pulsa para verla</Text>
      ) : (
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#7FB2FF', fontWeight: '900', fontSize: 11, letterSpacing: 0.8 }}>EL ENTRENADOR</Text>
          <Text style={{ color: '#E6F0FB', fontSize: 14, lineHeight: 19, marginTop: 1 }}>{tip}</Text>
        </View>
      )}
    </Pressable>
  );
}
