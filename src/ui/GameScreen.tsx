import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import {
  Action,
  CONFIG,
  GameState,
  Player,
  SPECIAL_INFO,
  check,
  clauseOf,
  sellValue,
  shieldCost,
  signPrice,
  specialCard,
  standings,
  ticketPerGoal,
  upgradeCost,
} from '../engine';
import { Btn, FootballerCard, Tag, s } from './components';
import { C } from './theme';

type Tab = 'mercado' | 'plantilla' | 'rivales' | 'cartas' | 'cronica';

export function StandingsTable({ state, highlight }: { state: GameState; highlight?: number }) {
  return (
    <View style={s.panel}>
      {standings(state).map((p, i) => (
        <View key={p.id} style={[s.row, { paddingVertical: 3 }]}>
          <Text style={{ color: C.dim, width: 22 }}>{i + 1}.</Text>
          <Text numberOfLines={1} style={{ color: p.id === highlight ? C.accent : C.text, flex: 1, fontWeight: '600' }}>
            {p.isBot ? '🤖 ' : ''}
            {p.name}
          </Text>
          <Text style={{ color: C.text, width: 58, textAlign: 'right', fontWeight: '700' }}>{p.points} pts</Text>
          <Text style={{ color: C.dim, width: 44, textAlign: 'right' }}>{p.goals}⚽</Text>
          <Text style={{ color: C.dim, width: 52, textAlign: 'right' }}>{p.money}M</Text>
          <Text style={{ color: C.dim, width: 36, textAlign: 'right' }}>🏟{p.stadium}</Text>
        </View>
      ))}
    </View>
  );
}

export function Chronicle({ state, max = 25 }: { state: GameState; max?: number }) {
  return (
    <View style={s.panel}>
      {state.log
        .slice(-max)
        .reverse()
        .map((l, i) => (
          <Text key={i} style={[s.p, { marginBottom: 4 }]}>
            <Text style={{ color: C.accent }}>J{l.jornada} </Text>
            {l.text}
          </Text>
        ))}
    </View>
  );
}

export function GameScreen(props: { state: GameState; me: Player; dispatch: (a: Action) => string | null }) {
  const { state, me } = props;
  const [tab, setTab] = useState<Tab>('mercado');
  const [error, setError] = useState<string | null>(null);
  /** Carta especial pendiente de elegir objetivo. */
  const [pending, setPending] = useState<number | null>(null);
  const J = state.jornada;
  const rivals = state.players.filter((p) => p.id !== me.id);

  const act = (a: Action) => {
    setError(props.dispatch(a));
    setPending(null);
  };
  const can = (a: Action) => check(state, a) === null;
  const upCost = upgradeCost(me);
  const preseason = J === 1 && state.turnOrder.length > state.players.length;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'mercado', label: 'Mercado' },
    { key: 'plantilla', label: `Plantilla ${me.squad.length}/${CONFIG.squadSize}` },
    { key: 'rivales', label: 'Rivales' },
    { key: 'cartas', label: `Cartas ${me.hand.length}` },
    { key: 'cronica', label: 'Crónica' },
  ];

  const pendingCard = pending !== null && me.hand[pending] ? specialCard(me.hand[pending]) : null;
  const pendingTarget = pendingCard ? SPECIAL_INFO[pendingCard.kind].target : null;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ color: C.dim, fontSize: 13 }}>
          {preseason ? 'Pretemporada' : `Jornada ${J} de ${state.totalJornadas}`} · Mercado · turno {state.turnIndex + 1}/{state.turnOrder.length}
        </Text>
        <Text style={s.h1}>{me.name}</Text>
        <View style={[s.row, { marginTop: 6, flexWrap: 'wrap' }]}>
          <Tag text={`💰 ${me.money}M`} color={C.accent} />
          <Tag text={`🏟 Nivel ${me.stadium} · ${ticketPerGoal(me.stadium)}M/gol`} />
          <Tag text={`${me.points} pts`} />
          {me.closedDoorsUntil >= J ? <Tag text={`Puerta cerrada hasta J${me.closedDoorsUntil}`} color={C.danger} /> : null}
          {me.clubDayJornada === J ? <Tag text="Día del club" color={C.good} /> : null}
          {state.turn.scout ? <Tag text="Ojeador activo" color={C.good} /> : null}
          {me.subsidy ? <Tag text="Subvención lista" color={C.good} /> : null}
        </View>
        {error ? <Text style={{ color: C.danger, marginTop: 8, fontWeight: '600' }}>{error}</Text> : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {tabs.map((t) => (
          <Btn key={t.key} small kind={tab === t.key ? 'primary' : 'ghost'} label={t.label} onPress={() => { setTab(t.key); setPending(null); }} />
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {tab === 'mercado' ? (
          <>
            <StandingsTable state={state} highlight={me.id} />
            <Text style={s.h2}>Mercado de fichajes</Text>
            {state.market.map((id) => (
              <FootballerCard key={id} cardId={id}>
                <Btn small kind={can({ type: 'sign', cardId: id }) ? 'primary' : 'ghost'} label={`Fichar · ${signPrice(state, id)}M`} onPress={() => act({ type: 'sign', cardId: id })} />
              </FootballerCard>
            ))}
            <Text style={s.p}>Un fichaje por turno (mercado o cláusula). Quedan {state.footballDeck.length} futbolistas por salir.</Text>
          </>
        ) : null}

        {tab === 'plantilla' ? (
          <>
            <View style={s.panel}>
              <Text style={s.h2}>Estadio · nivel {me.stadium}</Text>
              <Text style={[s.p, { marginBottom: 8 }]}>
                Cobras {ticketPerGoal(me.stadium)}M de taquilla por cada gol.
                {upCost !== null ? ` Al ampliar: ${ticketPerGoal(me.stadium + 1)}M por gol.` : ' Estadio al máximo.'}
              </Text>
              {upCost !== null ? (
                <Btn small kind={can({ type: 'upgradeStadium' }) ? 'primary' : 'ghost'} label={`Ampliar estadio · ${upCost}M`} onPress={() => act({ type: 'upgradeStadium' })} />
              ) : null}
            </View>
            {me.squad.length === 0 ? <Text style={s.p}>Aún no tienes futbolistas. Ficha en el mercado.</Text> : null}
            {me.squad.map((e) => (
              <FootballerCard key={e.cardId} cardId={e.cardId} entry={e} state={state}>
                <Btn small kind="ghost" label={`Vender · +${sellValue(e.cardId)}M`} onPress={() => act({ type: 'sell', cardId: e.cardId })} />
                {!e.shielded ? (
                  <Btn small kind="ghost" label={`Blindar · ${shieldCost(e.cardId)}M`} onPress={() => act({ type: 'shield', cardId: e.cardId })} />
                ) : null}
                <Tag text={`Cláusula ${clauseOf(e)}M`} />
              </FootballerCard>
            ))}
          </>
        ) : null}

        {tab === 'rivales'
          ? rivals.map((r) => (
              <View key={r.id} style={{ marginBottom: 12 }}>
                <Text style={s.h2}>
                  {r.name} · {r.money}M · 🏟{r.stadium} · {r.hand.length} carta(s)
                </Text>
                {r.squad.length === 0 ? <Text style={s.p}>Sin futbolistas.</Text> : null}
                {r.squad.map((e) => (
                  <FootballerCard key={e.cardId} cardId={e.cardId} entry={e} state={state}>
                    <Btn
                      small
                      kind={can({ type: 'clause', ownerId: r.id, cardId: e.cardId }) ? 'primary' : 'ghost'}
                      label={`Pagar cláusula · ${clauseOf(e)}M`}
                      onPress={() => act({ type: 'clause', ownerId: r.id, cardId: e.cardId })}
                    />
                  </FootballerCard>
                ))}
              </View>
            ))
          : null}

        {tab === 'cartas' ? (
          <>
            {pendingCard ? (
              <View style={[s.panel, { borderWidth: 1, borderColor: C.accent }]}>
                <Text style={s.h2}>{SPECIAL_INFO[pendingCard.kind].title}: elige objetivo</Text>
                {pendingTarget === 'ownFootballer'
                  ? me.squad.map((e) => (
                      <FootballerCard key={e.cardId} cardId={e.cardId} entry={e} state={state}>
                        <Btn small label="Elegir" onPress={() => act({ type: 'playCard', handIndex: pending!, targetCardId: e.cardId })} />
                      </FootballerCard>
                    ))
                  : null}
                {pendingTarget === 'rival'
                  ? rivals.map((r) => (
                      <Btn key={r.id} kind="ghost" style={{ marginBottom: 8 }} label={`${r.name} · ${r.money}M`} onPress={() => act({ type: 'playCard', handIndex: pending!, targetPlayerId: r.id })} />
                    ))
                  : null}
                {pendingTarget === 'rivalFootballer'
                  ? rivals.map((r) => (
                      <View key={r.id}>
                        <Text style={[s.p, { marginBottom: 4 }]}>{r.name}</Text>
                        {r.squad.map((e) => (
                          <FootballerCard key={e.cardId} cardId={e.cardId} entry={e} state={state}>
                            <Btn small label="Elegir" onPress={() => act({ type: 'playCard', handIndex: pending!, targetPlayerId: r.id, targetCardId: e.cardId })} />
                          </FootballerCard>
                        ))}
                      </View>
                    ))
                  : null}
                <Btn small kind="ghost" label="Cancelar" onPress={() => setPending(null)} />
              </View>
            ) : null}
            {me.hand.length === 0 ? <Text style={[s.p, { marginBottom: 10 }]}>No tienes cartas especiales.</Text> : null}
            {me.hand.map((id, i) => {
              const c = specialCard(id);
              const info = SPECIAL_INFO[c.kind];
              const needsTarget = info.target !== 'self' && info.target !== 'passive';
              return (
                <View key={id} style={[s.card, { borderLeftColor: info.sanction ? C.danger : C.good }]}>
                  <Text style={s.cardName}>{info.title}</Text>
                  <Text style={[s.p, { marginTop: 4 }]}>{info.text(c)}</Text>
                  <View style={[s.row, { marginTop: 8, gap: 8 }]}>
                    {info.target !== 'passive' ? (
                      <Btn small label="Jugar" onPress={() => (needsTarget ? setPending(i) : act({ type: 'playCard', handIndex: i }))} />
                    ) : null}
                    <Btn small kind="ghost" label="Descartar" onPress={() => act({ type: 'discardCard', handIndex: i })} />
                  </View>
                </View>
              );
            })}
            <Btn kind={can({ type: 'buySpecial' }) ? 'primary' : 'ghost'} label={`Comprar carta especial · ${CONFIG.special.cost}M`} onPress={() => act({ type: 'buySpecial' })} />
            <Text style={[s.p, { marginTop: 8 }]}>
              Máximo {CONFIG.special.handLimit} en mano y {CONFIG.special.maxPlayedPerTurn} jugadas por turno ({state.turn.cardsPlayed} usadas).
            </Text>
          </>
        ) : null}

        {tab === 'cronica' ? <Chronicle state={state} max={60} /> : null}
      </ScrollView>

      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: C.line }}>
        <Btn label="Terminar turno" onPress={() => act({ type: 'endTurn' })} />
      </View>
    </View>
  );
}
