import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  Action,
  CONFIG,
  GameState,
  Player,
  SPECIAL_INFO,
  SpecialKind,
  activeNumbers,
  check,
  clauseOf,
  expectedGoals,
  isOut,
  sellValue,
  shieldCost,
  signPrice,
  specialCard,
  ticketPerGoal,
  upgradeCost,
} from '../engine';
import { Crest, StadiumArt } from './art';
import { Btn, Chronicle, FootballerCard, NumberToken, Overline, PhaseStepper, StandingsTable, Tag, jornadaLabel, s } from './components';
import { C, clubColor } from './theme';

type Tab = 'mercado' | 'plantilla' | 'rivales' | 'cartas' | 'cronica';

export const SPECIAL_ICON: Record<SpecialKind, string> = {
  incidentes: '🚨',
  puertaCerrada: '🚪',
  lesion: '🩹',
  roja: '🟥',
  racha: '🔥',
  olfato: '🎯',
  cantera: '🌱',
  patrocinador: '🤝',
  diaDelClub: '🎉',
  subvencion: '🏗',
  ojeador: '🔭',
  abogados: '⚖️',
};

/** Qué números cubre tu plantilla y con cuántos jugadores. */
export function NumberLine({ player, jornada, highlight }: { player: Player; jornada: number; highlight?: number }) {
  const count = (n: number) => player.squad.filter((e) => !isOut(e, jornada) && activeNumbers(e, jornada).includes(n)).length;
  return (
    <View style={[s.row, { justifyContent: 'space-between' }]}>
      {[2, 3, 4, 5, 6, 8, 9, 10, 11, 12].map((n) => {
        const c = count(n);
        return (
          <View key={n} style={{ alignItems: 'center' }}>
            <View style={highlight === n ? { borderRadius: 20, borderWidth: 2, borderColor: C.accent, padding: 1 } : { padding: 3 }}>
              <NumberToken n={n} size={27} dim={c === 0} />
            </View>
            <Text style={{ color: c ? C.text : C.faint, fontSize: 11, fontWeight: '800', marginTop: 2 }}>{c ? `×${c}` : '–'}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function GameScreen(props: { state: GameState; me: Player; dispatch: (a: Action) => string | null; onHelp: () => void }) {
  const { state, me } = props;
  const [tab, setTab] = useState<Tab>('mercado');
  const [error, setError] = useState<string | null>(null);
  /** Carta especial pendiente de elegir objetivo. */
  const [pending, setPending] = useState<number | null>(null);
  const logStart = useRef(state.log.length);
  const J = state.jornada;
  const color = clubColor(me.id);
  const rivals = state.players.filter((p) => p.id !== me.id);

  const act = (a: Action) => {
    setError(props.dispatch(a));
    setPending(null);
  };
  const why = (a: Action) => check(state, a);
  const upCost = upgradeCost(me);
  const lastAction = state.log.length > logStart.current ? state.log[state.log.length - 1].text : null;

  /** Botón de acción: si no se puede, se atenúa y explica el motivo al pulsarlo. */
  const ActionBtn = ({ label, action }: { label: string; action: Action }) => (
    <Btn small kind={why(action) ? 'muted' : 'primary'} label={label} onPress={() => act(action)} />
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'mercado', label: 'Mercado' },
    { key: 'plantilla', label: `Mi club · ${me.squad.length}/${CONFIG.squadSize}` },
    { key: 'rivales', label: 'Rivales' },
    { key: 'cartas', label: `Cartas · ${me.hand.length}` },
    { key: 'cronica', label: 'Crónica' },
  ];
  const todo: { label: string; done: boolean; tab: Tab }[] = [
    { label: state.turn.signed ? 'Fichaje hecho' : '1 fichaje', done: state.turn.signed, tab: 'mercado' },
    { label: state.turn.upgraded ? 'Estadio ampliado' : 'Ampliar estadio', done: state.turn.upgraded || upCost === null, tab: 'plantilla' },
    { label: state.turn.boughtCard ? 'Carta comprada' : 'Comprar carta', done: state.turn.boughtCard, tab: 'cartas' },
    { label: `Jugar cartas ${state.turn.cardsPlayed}/${CONFIG.special.maxPlayedPerTurn}`, done: state.turn.cardsPlayed >= CONFIG.special.maxPlayedPerTurn, tab: 'cartas' },
  ];

  const pendingCard = pending !== null && me.hand[pending] ? specialCard(me.hand[pending]) : null;
  const pendingTarget = pendingCard ? SPECIAL_INFO[pendingCard.kind].target : null;
  const canStillSign = !state.turn.signed && me.squad.length < CONFIG.squadSize && state.market.some((id) => signPrice(state, id) <= me.money);

  return (
    <View style={{ flex: 1 }}>
      <PhaseStepper step={0} label={`${jornadaLabel(state)} · TURNO ${state.turnIndex + 1} DE ${state.turnOrder.length}`} />

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={s.row}>
          <Crest name={me.name} color={color} size={46} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Overline>TE TOCA</Overline>
            <Text numberOfLines={1} style={s.h1}>{me.name}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Overline>CAJA</Overline>
            <Text style={{ color: C.accent, fontSize: 26, fontWeight: '900' }}>{me.money}M</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Cómo se juega" onPress={props.onHelp} style={{ marginLeft: 10, width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: C.dim, fontWeight: '800' }}>?</Text>
          </Pressable>
        </View>

        <View style={[s.row, { flexWrap: 'wrap', marginTop: 10 }]}>
          {todo.map((t) => (
            <Pressable key={t.label} onPress={() => setTab(t.tab)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 6 }}>
              <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: t.done ? C.good : C.faint, backgroundColor: t.done ? C.good : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {t.done ? <Text style={{ color: C.bg, fontSize: 10, fontWeight: '900' }}>✓</Text> : null}
              </View>
              <Text style={{ color: t.done ? C.faint : C.text, fontSize: 12, fontWeight: '700', marginLeft: 5 }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {me.closedDoorsUntil >= J || me.clubDayJornada === J || state.turn.scout || me.subsidy ? (
          <View style={[s.row, { flexWrap: 'wrap', marginTop: 4 }]}>
            {me.closedDoorsUntil >= J ? <Tag text={`🚪 Puerta cerrada hasta J${me.closedDoorsUntil}`} color={C.danger} /> : null}
            {me.clubDayJornada === J ? <Tag text="🎉 Día del club: taquilla ×2" color={C.good} /> : null}
            {state.turn.scout ? <Tag text="🔭 Ojeador: −30% en tu fichaje" color={C.good} /> : null}
            {me.subsidy ? <Tag text="🏗 Subvención: ampliación a mitad de precio" color={C.good} /> : null}
          </View>
        ) : null}

        {error ? (
          <View style={{ backgroundColor: C.danger + '22', borderColor: C.danger, borderWidth: 1, borderRadius: 10, padding: 9, marginTop: 6 }}>
            <Text style={{ color: '#FFB3B5', fontWeight: '700' }}>✋ {error}</Text>
          </View>
        ) : lastAction ? (
          <View style={{ backgroundColor: C.good + '1F', borderColor: C.good, borderWidth: 1, borderRadius: 10, padding: 9, marginTop: 6 }}>
            <Text style={{ color: '#B6F0D2', fontWeight: '700' }}>✓ {lastAction}</Text>
          </View>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: 10 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {tabs.map((t) => (
          <Btn key={t.key} small kind={tab === t.key ? 'primary' : 'ghost'} label={t.label} onPress={() => { setTab(t.key); setPending(null); }} />
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {tab === 'mercado' ? (
          <>
            <Text style={[s.p, { marginBottom: 10 }]}>
              Ficha a un futbolista: marcará cada vez que salga uno de sus números en los dados. Los números rojos (6 y 8) son los que más salen.
            </Text>
            {state.market.map((id) => (
              <FootballerCard key={id} cardId={id}>
                <ActionBtn label={`Fichar · ${signPrice(state, id)}M`} action={{ type: 'sign', cardId: id }} />
                {signPrice(state, id) > me.money ? <Text style={{ color: C.faint, fontSize: 12 }}>Te faltan {signPrice(state, id) - me.money}M</Text> : null}
              </FootballerCard>
            ))}
            <Text style={[s.p, { marginBottom: 12 }]}>Quedan {state.footballDeck.length} futbolistas por salir al mercado.</Text>
            <StandingsTable state={state} highlight={me.id} />
          </>
        ) : null}

        {tab === 'plantilla' ? (
          <>
            <View style={s.panel}>
              <View style={[s.row, { alignItems: 'flex-start' }]}>
                <View style={{ flex: 1 }}>
                  <Overline>ESTADIO · NIVEL {me.stadium} DE 5</Overline>
                  <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', marginTop: 2 }}>{ticketPerGoal(me.stadium)}M por gol</Text>
                  <Text style={[s.p, { marginTop: 2 }]}>
                    {upCost !== null ? `Al ampliar cobrarás ${ticketPerGoal(me.stadium + 1)}M por cada gol.` : 'Tu estadio ya es el más grande de la liga.'}
                  </Text>
                </View>
                <StadiumArt level={me.stadium} color={color} width={150} />
              </View>
              {upCost !== null ? (
                <View style={{ marginTop: 10, alignItems: 'flex-start' }}>
                  <ActionBtn label={`Ampliar estadio · ${upCost}M`} action={{ type: 'upgradeStadium' }} />
                </View>
              ) : null}
            </View>

            <View style={s.panel}>
              <Overline>TUS NÚMEROS</Overline>
              <Text style={[s.p, { marginVertical: 6 }]}>
                Cuántos de tus jugadores marcan con cada número. Esperas unos {expectedGoals(me, J).toFixed(1)} goles por jornada.
              </Text>
              <NumberLine player={me} jornada={J} />
            </View>

            {me.squad.length === 0 ? <Text style={s.p}>Aún no tienes futbolistas. Ve al mercado y ficha.</Text> : null}
            {me.squad.map((e) => (
              <FootballerCard key={e.cardId} cardId={e.cardId} entry={e} state={state} owner={me}>
                <Btn small kind="ghost" label={`Vender · +${sellValue(e.cardId)}M`} onPress={() => act({ type: 'sell', cardId: e.cardId })} />
                {!e.shielded ? <ActionBtn label={`Blindar · ${shieldCost(e.cardId)}M`} action={{ type: 'shield', cardId: e.cardId }} /> : null}
                <Text style={{ color: C.faint, fontSize: 12 }}>Cláusula {clauseOf(e)}M</Text>
              </FootballerCard>
            ))}
          </>
        ) : null}

        {tab === 'rivales' ? (
          <>
            <Text style={[s.p, { marginBottom: 10 }]}>Paga la cláusula de un rival y te lo llevas sin que pueda negarse. El dinero va a su club.</Text>
            {rivals.map((r) => (
              <View key={r.id} style={{ marginBottom: 14 }}>
                <View style={[s.row, { marginBottom: 8 }]}>
                  <Crest name={r.name} color={clubColor(r.id)} size={30} />
                  <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text style={[s.h2, { marginBottom: 0 }]}>{r.name}</Text>
                    <Text style={{ color: C.dim, fontSize: 12 }}>
                      {r.points} pts · {r.money}M · estadio N{r.stadium} · {r.hand.length} carta(s) en mano
                    </Text>
                  </View>
                </View>
                {r.squad.length === 0 ? <Text style={s.p}>Sin futbolistas.</Text> : null}
                {r.squad.map((e) => (
                  <FootballerCard key={e.cardId} cardId={e.cardId} entry={e} state={state} owner={r}>
                    <ActionBtn label={`Pagar cláusula · ${clauseOf(e)}M`} action={{ type: 'clause', ownerId: r.id, cardId: e.cardId }} />
                  </FootballerCard>
                ))}
              </View>
            ))}
          </>
        ) : null}

        {tab === 'cartas' ? (
          <>
            {pendingCard ? (
              <View style={[s.panel, { borderColor: C.accent }]}>
                <Overline>ELIGE OBJETIVO</Overline>
                <Text style={[s.h2, { marginTop: 4 }]}>
                  {SPECIAL_ICON[pendingCard.kind]} {SPECIAL_INFO[pendingCard.kind].title}
                </Text>
                {pendingTarget === 'ownFootballer'
                  ? me.squad.map((e) => (
                      <FootballerCard key={e.cardId} cardId={e.cardId} entry={e} state={state} owner={me}>
                        <Btn small label="Elegir" onPress={() => act({ type: 'playCard', handIndex: pending!, targetCardId: e.cardId })} />
                      </FootballerCard>
                    ))
                  : null}
                {pendingTarget === 'ownFootballer' && me.squad.length === 0 ? <Text style={[s.p, { marginBottom: 8 }]}>Necesitas al menos un futbolista.</Text> : null}
                {pendingTarget === 'rival'
                  ? rivals.map((r) => (
                      <Pressable key={r.id} onPress={() => act({ type: 'playCard', handIndex: pending!, targetPlayerId: r.id })} style={[s.row, { borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 10, marginBottom: 8 }]}>
                        <Crest name={r.name} color={clubColor(r.id)} size={28} />
                        <Text style={{ color: C.text, fontWeight: '700', marginLeft: 8, flex: 1 }}>{r.name}</Text>
                        <Text style={{ color: C.dim }}>{r.points} pts · {r.money}M</Text>
                      </Pressable>
                    ))
                  : null}
                {pendingTarget === 'rivalFootballer'
                  ? rivals.map((r) => (
                      <View key={r.id}>
                        <Text style={[s.p, { marginBottom: 4, fontWeight: '700' }]}>{r.name}</Text>
                        {r.squad.map((e) => (
                          <FootballerCard key={e.cardId} cardId={e.cardId} entry={e} state={state} owner={r}>
                            <Btn small label="Elegir" onPress={() => act({ type: 'playCard', handIndex: pending!, targetPlayerId: r.id, targetCardId: e.cardId })} />
                          </FootballerCard>
                        ))}
                      </View>
                    ))
                  : null}
                <Btn small kind="ghost" label="Cancelar" onPress={() => setPending(null)} />
              </View>
            ) : null}

            {me.hand.length === 0 ? <Text style={[s.p, { marginBottom: 10 }]}>No tienes cartas especiales. Cómpralas aquí o consíguelas gratis cuando salga un 7 y vayas en la mitad baja de la tabla.</Text> : null}
            {me.hand.map((id, i) => {
              const c = specialCard(id);
              const info = SPECIAL_INFO[c.kind];
              const needsTarget = info.target !== 'self' && info.target !== 'passive';
              const tint = info.sanction ? C.danger : info.target === 'passive' ? '#7FB2FF' : C.good;
              return (
                <View key={id} style={[s.card, { borderColor: tint + '66' }]}>
                  <View style={[s.cardBand, { backgroundColor: tint }]} />
                  <View style={[s.row, { padding: 12, alignItems: 'flex-start' }]}>
                    <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: tint + '26', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 24 }}>{SPECIAL_ICON[c.kind]}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[s.tier, { color: tint }]}>{info.sanction ? 'SANCIÓN · CONTRA UN RIVAL' : info.target === 'passive' ? 'DEFENSA · AUTOMÁTICA' : 'VENTAJA · PARA TU CLUB'}</Text>
                      <Text style={s.cardName}>{info.title}</Text>
                      <Text style={[s.p, { marginTop: 3 }]}>{info.text(c)}</Text>
                    </View>
                  </View>
                  <View style={s.cardActions}>
                    {info.target !== 'passive' ? <Btn small label="Jugar" onPress={() => (needsTarget ? setPending(i) : act({ type: 'playCard', handIndex: i }))} /> : null}
                    <Btn small kind="ghost" label="Descartar" onPress={() => act({ type: 'discardCard', handIndex: i })} />
                  </View>
                </View>
              );
            })}
            <Btn kind={why({ type: 'buySpecial' }) ? 'muted' : 'primary'} label={`Comprar carta especial · ${CONFIG.special.cost}M`} onPress={() => act({ type: 'buySpecial' })} />
            <Text style={[s.p, { marginTop: 8 }]}>
              Se roba boca abajo. Máximo {CONFIG.special.handLimit} en mano y {CONFIG.special.maxPlayedPerTurn} jugadas por turno.
            </Text>
          </>
        ) : null}

        {tab === 'cronica' ? <Chronicle state={state} max={60} /> : null}
      </ScrollView>

      <View style={{ padding: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line }}>
        <Text style={{ color: canStillSign ? C.accent : C.faint, fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
          {canStillSign ? 'Aún puedes fichar a un futbolista este turno' : 'Cuando acabes, pasa el turno'}
        </Text>
        <Btn label="Terminar turno →" onPress={() => act({ type: 'endTurn' })} />
      </View>
    </View>
  );
}
