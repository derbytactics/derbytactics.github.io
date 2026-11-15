import React from 'react';
import { ScrollView, Text } from 'react-native';
import { CONFIG, GameState, financeBonus, standings } from '../engine';
import { Btn, s } from './components';
import { Chronicle, StandingsTable } from './GameScreen';
import { C } from './theme';

export function EndScreen({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  const champ = standings(state)[0];
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: C.dim }}>Final de temporada</Text>
      <Text style={s.h1}>🏆 {champ.name}</Text>
      <Text style={[s.p, { marginVertical: 10 }]}>
        Campeón con {champ.points} puntos y {champ.goals} goles. La clasificación ya incluye el balance final: 1 punto por cada{' '}
        {CONFIG.moneyPerPoint}M en caja ({champ.name}: +{financeBonus(champ.money)}).
      </Text>
      <StandingsTable state={state} highlight={champ.id} />
      <Btn label="Nueva partida" onPress={onRestart} />
      <Text style={[s.h2, { marginTop: 20 }]}>Crónica</Text>
      <Chronicle state={state} max={40} />
    </ScrollView>
  );
}
