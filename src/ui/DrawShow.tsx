import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { GameState } from '../engine';
import { load, save } from '../net/storage';
import { Crest, Die } from './art';
import { Popup, s } from './components';
import { useClubColor } from './clubColors';
import { C } from './theme';

const SEEN_KEY = 'futcards.draw.seen';
const STEP_MS = 650;

/**
 * Sorteo de la pretemporada: cada club tira los dados y quien saca más ficha antes. Se enseña una
 * vez por partida en cada dispositivo, con las tiradas apareciendo una a una.
 */
export function DrawShow({ state, seat }: { state: GameState; seat: number | null }) {
  const clubColor = useClubColor();
  const id = state.gameId ?? '';
  const preseason = state.phase === 'market' && state.jornada === 1 && state.turnIndex < state.players.length * 2;
  const [open, setOpen] = useState(() => !!state.draw && preseason && !(load<string[]>(SEEN_KEY) ?? []).includes(id));
  // Tiradas en orden: primero la de todos y después las de desempate.
  const rounds = Math.max(0, ...(state.draw ?? []).map((d) => d.rolls.length));
  const steps: { playerId: number; round: number }[] = [];
  for (let r = 0; r < rounds; r++) for (const d of state.draw ?? []) if (d.rolls[r]) steps.push({ playerId: d.playerId, round: r });
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!open || shown >= steps.length) return;
    const t = setTimeout(() => setShown((x) => x + 1), shown === 0 ? 400 : STEP_MS);
    return () => clearTimeout(t);
  }, [open, shown, steps.length]);
  if (!open || !state.draw) return null;
  const close = () => {
    save(SEEN_KEY, [...(load<string[]>(SEEN_KEY) ?? []).filter((x) => x !== id), id].slice(-30));
    setOpen(false);
  };
  const done = shown >= steps.length;
  const order = state.turnOrder.slice(0, state.players.length);
  const visible = (playerId: number, round: number) => steps.findIndex((x) => x.playerId === playerId && x.round === round) < shown;
  const rows = done ? order.map((pid) => state.draw!.find((d) => d.playerId === pid)!) : state.draw;
  return (
    <Popup overline="¿QUIÉN FICHA PRIMERO?" title="Sorteo de la pretemporada" button={done ? '¡A fichar!' : 'Saltar'} buttonKind={done ? 'primary' : 'ghost'} onClose={close}>
      <Text style={[s.p, { textAlign: 'center', marginBottom: 10 }]}>Cada club tira los dados: quien saca más ficha antes. Si hay empate, desempatan tirando otra vez. En la segunda vuelta, el orden se invierte.</Text>
      {rows.map((d, i) => {
        const p = state.players[d.playerId];
        return (
          <View key={d.playerId} style={[s.row, { paddingVertical: 6, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }]}>
            <Text style={{ color: done ? C.accent : C.faint, width: 28, fontWeight: '900' }}>{done ? `${i + 1}.º` : ''}</Text>
            <Crest name={p.name} color={clubColor(p.id)} design={p.crest} size={26} />
            <Text numberOfLines={1} style={{ color: d.playerId === seat ? C.accent : C.text, fontWeight: '800', flex: 1, marginLeft: 8 }}>
              {d.playerId === seat ? `${p.name} (tú)` : p.name}
            </Text>
            {d.rolls.map((r, k) =>
              visible(d.playerId, k) ? (
                <View key={k} style={[s.row, { marginLeft: k ? 8 : 4, opacity: k < d.rolls.length - 1 ? 0.55 : 1 }]}>
                  <Die value={r[0]} size={24} />
                  <Die value={r[1]} size={24} />
                  <Text style={{ color: C.text, fontWeight: '900', marginLeft: 4, width: 20, textAlign: 'right' }}>{r[0] + r[1]}</Text>
                </View>
              ) : null,
            )}
          </View>
        );
      })}
    </Popup>
  );
}
