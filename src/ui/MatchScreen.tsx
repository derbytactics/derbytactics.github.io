import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { GameState, MatchReport, footballer } from '../engine';
import { Btn, s } from './components';
import { Chronicle, StandingsTable } from './GameScreen';
import { C } from './theme';

const DIE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

/** Antes del partido: resumen del mercado y botón de saque inicial. */
export function KickoffScreen({ state, onPlay }: { state: GameState; onPlay: () => void }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: C.dim }}>Jornada {state.jornada} de {state.totalJornadas}</Text>
      <Text style={s.h1}>¡Se cierra el mercado!</Text>
      <Text style={[s.p, { marginVertical: 10 }]}>Seis ocasiones de gol: en cada una se tiran dos dados y marcan todos los futbolistas con ese número. Con un 7 interviene el VAR.</Text>
      <Btn label="⚽ Jugar la jornada" onPress={onPlay} />
      <Text style={[s.h2, { marginTop: 20 }]}>Lo que ha pasado en el mercado</Text>
      <Chronicle state={state} max={12} />
    </ScrollView>
  );
}

export function MatchScreen({ state, report, onNext }: { state: GameState; report: MatchReport; onNext: () => void }) {
  const [shown, setShown] = useState(0);
  const total = report.rolls.length;
  const done = shown >= total;
  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setShown((x) => x + 1), 1100);
    return () => clearTimeout(t);
  }, [shown, done]);
  const name = (id: number) => state.players[id].name;
  const last = state.jornada >= state.totalJornadas;

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: C.dim }}>Jornada {report.jornada} de {state.totalJornadas}</Text>
      <Text style={s.h1}>{done ? 'Final de la jornada' : `Ocasión ${shown + 1} de ${total}…`}</Text>

      {report.rolls.slice(0, shown).map((r, i) => (
        <View key={i} style={[s.panel, { marginTop: i === 0 ? 12 : 0 }]}>
          <View style={s.row}>
            <Text style={{ fontSize: 30, color: C.text }}>{DIE[r.dice[0]]}{DIE[r.dice[1]]}</Text>
            <Text style={{ color: r.sum === 7 ? C.danger : C.accent, fontSize: 22, fontWeight: '800', marginLeft: 10 }}>{r.sum}</Text>
            <Text style={[s.p, { marginLeft: 10, flex: 1 }]}>
              {r.sum === 7
                ? r.varDraws.length
                  ? `VAR: sin goles. Roban carta: ${r.varDraws.map(name).join(', ')}.`
                  : 'VAR: sin goles.'
                : r.goals.length === 0
                  ? 'Nadie marca.'
                  : r.goals.map((g) => `${footballer(g.cardId).name} (${name(g.playerId)})${g.goals > 1 ? ' ×2' : ''}`).join(' · ')}
            </Text>
          </View>
        </View>
      ))}

      {!done ? (
        <Btn kind="ghost" label="Saltar al resultado" onPress={() => setShown(total)} style={{ marginTop: 12 }} />
      ) : (
        <>
          <Text style={[s.h2, { marginTop: 12 }]}>Recuento y reparto</Text>
          <View style={s.panel}>
            {report.results.map((r) => (
              <View key={r.playerId} style={[s.row, { paddingVertical: 4 }]}>
                <Text style={{ color: C.dim, width: 22 }}>{r.rank}.</Text>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: C.text, fontWeight: '600' }}>{name(r.playerId)}</Text>
                  <Text style={{ color: C.dim, fontSize: 12 }}>
                    premio {r.prize}M · taquilla {r.closedDoors ? '0M (puerta cerrada)' : `${r.ticket}M${r.clubDay ? ' (Día del club)' : ''}`}
                  </Text>
                </View>
                <Text style={{ color: C.text, width: 44, textAlign: 'right', fontWeight: '700' }}>{r.goals}⚽</Text>
                <Text style={{ color: C.accent, width: 58, textAlign: 'right', fontWeight: '700' }}>+{r.points} pts</Text>
              </View>
            ))}
          </View>
          <Text style={s.h2}>Clasificación</Text>
          <StandingsTable state={state} />
          <Btn label={last ? '🏆 Ver el final de temporada' : 'Siguiente jornada →'} onPress={onNext} />
        </>
      )}
    </ScrollView>
  );
}
