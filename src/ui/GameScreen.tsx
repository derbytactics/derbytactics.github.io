import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  Action,
  CONFIG,
  GameState,
  Player,
  SPECIAL_INFO,
  SpecialKind,
  check,
  clauseOf,
  lineup,
  strengthOn,
  sellValue,
  shieldCost,
  signPrice,
  specialCard,
  ticketPerGoal,
  upgradeCost,
  words,
  ruleWords,
} from '../engine';
import { Crest, StadiumArt } from './art';
import { Btn, Chronicle, FootballerCard, NumberToken, Overline, PhaseStepper, Popup, StandingsTable, Tag, s } from './components';
import { Tip } from './Tip';
import { C, POS_COLOR, DISPLAY } from './theme';
import { useClubColor } from './clubColors';
import { CARD_TYPE } from './cardTypes';
import { I, Icon, IconName } from './icons';

const J_IS_PRESEASON = (st: GameState) => st.jornada === 1 && st.turnOrder.length > st.players.length;

type Tab = 'mercado' | 'plantilla' | 'rivales' | 'cartas';

export const SPECIAL_ICON: Record<SpecialKind, IconName> = {
  incidentes: 'alarm-light',
  puertaCerrada: 'door-closed-lock',
  lesion: 'bandage',
  amarilla: 'card',
  roja: 'card-remove',
  penalti: 'soccer-field',
  racha: 'fire',
  olfato: 'target',
  cantera: 'sprout',
  patrocinador: 'handshake',
  diaDelClub: 'party-popper',
  subvencion: 'crane',
  ojeador: 'binoculars',
  abogados: 'scale-balance',
  salvada: 'shield-alert',
  cantada: 'hand-back-left-off',
};
/** Las tarjetas se pintan de su color. */
const SPECIAL_ICON_COLOR: Partial<Record<SpecialKind, string>> = { amarilla: '#F5C542', roja: '#E5484D' };

/** Carta especial dibujada con su icono, tipo y efecto. */
export function SpecialCardFace({ id, children }: { id: string; children?: React.ReactNode }) {
  const c = specialCard(id);
  const info = SPECIAL_INFO[c.kind];
  const type = CARD_TYPE[info.timing];
  const tint = type.color;
  return (
    <View style={[s.card, { borderColor: tint + '88' }]}>
      {/* Banda del tipo: se ve de un vistazo cuándo se juega. */}
      <View style={[s.row, { backgroundColor: tint + '2E', paddingHorizontal: 12, paddingVertical: 5 }]}>
        <Icon name={type.icon} size={15} color={tint} style={{ marginRight: 6 }} />
        <Text style={[s.tier, { color: tint }]}>{type.label}</Text>
        <Text style={{ color: C.dim, fontSize: 12, fontWeight: '700', marginLeft: 8, flex: 1 }} numberOfLines={1}>· {info.target === 'passive' ? 'Actúa sola desde tu mano' : type.when}</Text>
      </View>
      <View style={[s.row, { padding: 12, alignItems: 'flex-start' }]}>
        <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: tint + '26', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={SPECIAL_ICON[c.kind]} size={28} color={SPECIAL_ICON_COLOR[c.kind] ?? tint} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          {info.sanction ? <Text style={[s.tier, { color: C.danger }]}>CONTRA UN RIVAL</Text> : null}
          <Text style={s.cardName}>{info.title}</Text>
          <Text style={[s.p, { marginTop: 3 }]}>{info.text(c)}</Text>
        </View>
      </View>
      {children ? <View style={s.cardActions}>{children}</View> : null}
    </View>
  );
}

/**
 * Tu fuerza con cada número: ataque (espada) y defensa (escudo).
 * Con `state`, añade cuántos rivales pararían hoy tu ataque con ese número.
 */
export function NumberLine({ player, jornada, highlight, state }: { player: Player; jornada: number; highlight?: number; state?: GameState }) {
  const rivals = state ? state.players.filter((p) => p.id !== player.id) : [];
  return (
    <View>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        {[2, 3, 4, 5, 6, 8, 9, 10, 11, 12].map((n) => {
          const st = strengthOn(player, n, jornada);
          const stoppers = rivals.filter((r) => strengthOn(r, n, jornada).defense >= st.attack).length;
          return (
            <View key={n} style={{ alignItems: 'center' }}>
              <View style={highlight === n ? { borderRadius: 20, borderWidth: 2, borderColor: C.accent, padding: 1 } : { padding: 3 }}>
                <NumberToken n={n} size={27} dim={st.attack === 0 && st.defense === 0} />
              </View>
              <View style={[s.row, { marginTop: 2, minHeight: 16 }]}>{st.attack ? <Icon name={I.attack} size={11} color={POS_COLOR.DEL} /> : null}<Text style={{ color: st.attack ? POS_COLOR.DEL : C.faint, fontSize: 12, fontWeight: '800' }}>{st.attack || '–'}</Text></View>
              <View style={[s.row, { minHeight: 16 }]}>{st.defense ? <Icon name={I.defense} size={11} color={POS_COLOR.DEF} /> : null}<Text style={{ color: st.defense ? POS_COLOR.DEF : C.faint, fontSize: 12, fontWeight: '800' }}>{st.defense || '–'}</Text></View>
              {state ? (
                <Text style={{ color: st.attack ? (stoppers === 0 ? C.good : stoppers === rivals.length ? C.danger : C.dim) : C.faint, fontSize: 12, fontWeight: '700' }}>
                  {st.attack ? `${rivals.length - stoppers}/${rivals.length}` : ''}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
      <Text style={{ color: C.faint, fontSize: 12, marginTop: 6 }}>
        <Icon name={I.attack} size={12} color={POS_COLOR.DEL} /> tu ataque · <Icon name={I.defense} size={12} color={POS_COLOR.DEF} /> tu defensa
        {state ? ' · debajo, a cuántos rivales marcarías hoy con ese número' : ''}
      </Text>
    </View>
  );
}

export function GameScreen(props: { state: GameState; me: Player; dispatch: (a: Action) => string | null }) {
  const clubColor = useClubColor();
  const { state, me } = props;
  const [tab, setTab] = useState<Tab>('mercado');
  const [error, setError] = useState<string | null>(null);
  /** Carta especial pendiente de elegir objetivo. */
  const [pending, setPending] = useState<number | null>(null);
  const [logStart] = useState(state.logSeq);
  /** Lo que le ha pasado a este club desde su último turno: se enseña al empezar. */
  const [news, setNews] = useState(() => state.log.filter((l) => l.n > me.lastSeen && l.affects?.includes(me.id)));
  /** Carta recién comprada, para enseñarla. */
  const [drawn, setDrawn] = useState<string | null>(null);
  const [handSize, setHandSize] = useState(me.hand.length);
  const preseason = J_IS_PRESEASON(state);
  const J = state.jornada;
  const rw = ruleWords(state.league);
  const color = clubColor(me.id);
  const rivals = state.players.filter((p) => p.id !== me.id);

  const act = (a: Action) => {
    setError(props.dispatch(a));
    setPending(null);
  };
  // Al comprar una carta se roba boca abajo: en cuanto llega a la mano, se enseña.
  // (Estado derivado del render anterior: el patrón que recomienda React en lugar de una referencia.)
  if (me.hand.length !== handSize) {
    setHandSize(me.hand.length);
    if (me.hand.length > handSize && state.turn.boughtCard && !drawn) setDrawn(me.hand[me.hand.length - 1]);
  }
  const why = (a: Action) => check(state, a);
  const upCost = upgradeCost(me);
  const lastAction = state.logSeq > logStart ? state.log[state.log.length - 1].text : null;

  /** Botón de acción: si no se puede, se atenúa y explica el motivo al pulsarlo. */
  const actionBtn = (label: string, action: Action) => <Btn small kind={why(action) ? 'muted' : 'primary'} label={label} onPress={() => act(action)} />;

  const tabs: { key: Tab; label: string; badge?: string }[] = [
    { key: 'mercado', label: 'Mercado' },
    { key: 'plantilla', label: 'Plantilla', badge: `${me.squad.length}/${CONFIG.squadSize}` },
    { key: 'rivales', label: 'Rivales' },
    { key: 'cartas', label: 'Cartas', badge: String(me.hand.length) },
  ];
  const pendingCard = pending !== null && me.hand[pending] ? specialCard(me.hand[pending]) : null;
  const pendingTarget = pendingCard ? SPECIAL_INFO[pendingCard.kind].target : null;
  const canStillSign = !state.turn.signed && me.squad.length < CONFIG.squadSize && state.market.some((id) => signPrice(state, id) <= me.money);
  /** Pide confirmación antes de pasar el turno sin fichar pudiendo hacerlo. */
  const [confirmEnd, setConfirmEnd] = useState(false);
  const endTurn = () => (canStillSign ? setConfirmEnd(true) : act({ type: 'endTurn' }));
  const round = state.turnIndex < state.players.length ? 1 : 2;

  return (
    <View style={{ flex: 1 }}>
      <PhaseStepper step={0} />

      <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
        <View style={s.row}>
          <Crest name={me.name} color={color} design={me.crest} size={38} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text numberOfLines={1} style={{ color: C.text, fontSize: 21, ...DISPLAY }}>{me.name}</Text>
            <Text numberOfLines={1} style={{ color: C.dim, fontSize: 12, fontWeight: '700' }}>
              Te toca · {preseason ? `pretemporada, vuelta ${round} de 2` : `turno ${state.turnIndex + 1} de ${state.turnOrder.length}`}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: C.dim, fontSize: 12, fontWeight: '700' }}>Caja</Text>
            <Text style={{ color: C.accent, fontSize: 25, ...DISPLAY }}>{me.money}M</Text>
          </View>
        </View>


        {me.closedDoorsUntil >= J || me.clubDayJornada === J || state.turn.scout || me.subsidy ? (
          <View style={[s.row, { flexWrap: 'wrap', marginTop: 4 }]}>
            {me.closedDoorsUntil >= J ? <Tag icon={I.closedDoors} text={`Puerta cerrada hasta J${me.closedDoorsUntil}`} color={C.danger} /> : null}
            {me.clubDayJornada === J ? <Tag icon={I.clubDay} text="Día del club: taquilla ×2" color={C.good} /> : null}
            {state.turn.scout ? <Tag icon={I.scout} text="Ojeador: −30% en tu fichaje" color={C.good} /> : null}
            {me.subsidy ? <Tag icon={I.subsidy} text="Subvención: ampliación a mitad de precio" color={C.good} /> : null}
          </View>
        ) : null}

        {preseason && !error && !lastAction ? (
          <View style={{ backgroundColor: C.accent + '1A', borderColor: C.accent, borderWidth: 1, borderRadius: 10, padding: 9, marginTop: 6 }}>
            <Text style={{ color: '#FBE7A6', fontWeight: '700', fontSize: 13 }}>
              {round === 1 ? 'Pretemporada: todos fichan dos veces antes de la jornada 1.' : 'Último fichaje antes del primer partido.'}
            </Text>
          </View>
        ) : null}
        {error ? (
          <View style={{ backgroundColor: C.danger + '22', borderColor: C.danger, borderWidth: 1, borderRadius: 10, padding: 9, marginTop: 6 }}>
            <View style={s.row}><Icon name={I.stop} size={16} color="#FFB3B5" style={{ marginRight: 6 }} /><Text style={{ color: '#FFB3B5', fontWeight: '700', flex: 1 }}>{error}</Text></View>
          </View>
        ) : lastAction ? (
          <View style={{ backgroundColor: C.good + '1F', borderColor: C.good, borderWidth: 1, borderRadius: 10, padding: 9, marginTop: 6 }}>
            <Text style={{ color: '#B6F0D2', fontWeight: '700' }}>✓ {lastAction}</Text>
          </View>
        ) : null}
      </View>

      <View accessibilityRole="tablist" style={[s.row, { marginTop: 10, marginHorizontal: 16, backgroundColor: C.panel, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: C.line }]}>
        {tabs.map((t) => {
          const on = tab === t.key;
          return (
            <Pressable
              key={t.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => {
                setTab(t.key);
                setPending(null);
              }}
              style={{ flex: 1, minHeight: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.sel : 'transparent', borderWidth: 1, borderColor: on ? C.selLine : 'transparent' }}
            >
              <Text numberOfLines={1} style={{ color: C.text, fontWeight: '800', fontSize: 13 }}>
                {t.label}
                {t.badge ? <Text style={{ color: on ? C.text : C.dim, fontWeight: '700' }}> {t.badge}</Text> : null}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {tab === 'mercado' ? (
          <>
            <Tip id="mercado" title={`Empieza por ${rw.aKeeper} y ${rw.aForward}`}>
              {`Tienes 80M para montar un equipo de 7. Un buen comienzo: ${rw.aKeeper} con números que salgan mucho (6 y 8), ${rw.oneOrTwo} ${rw.forwards} y ${rw.mids} que compartan número con ${rw.fem ? 'ellas' : 'ellos'}. En cada turno puedes fichar una vez, ampliar el estadio (en «Plantilla»), comprar una carta especial y jugar hasta ${CONFIG.special.maxPlayedPerTurn} (en «Cartas»). Cuando acabes, pasa el turno.`}
            </Tip>
            {state.market.map((id) => (
              <FootballerCard key={id} cardId={id}>
                {actionBtn(`Fichar · ${signPrice(state, id)}M`, { type: 'sign', cardId: id })}
                {signPrice(state, id) > me.money ? <Text style={{ color: C.faint, fontSize: 12 }}>Te faltan {signPrice(state, id) - me.money}M</Text> : null}
              </FootballerCard>
            ))}
            <Text style={[s.p, { marginBottom: 12 }]}>Quedan {state.footballDeck.length} futbolistas por salir al mercado.</Text>
            <StandingsTable state={state} highlight={me.id} />
          </>
        ) : null}

        {tab === 'plantilla' ? (
          <>
            <Tip id="club" title="Tu tabla de números">
              Para cada número ves tu ataque (espada), tu defensa (escudo) y a cuántos rivales marcarías hoy. Busca números donde los rivales no defiendan, y tapa aquellos con los que te atacan.
            </Tip>
            <View style={s.panel}>
              <View style={[s.row, { alignItems: 'flex-start' }]}>
                <View style={{ flex: 1 }}>
                  <Overline>ESTADIO · NIVEL {me.stadium} DE 5</Overline>
                  <Text style={{ color: C.text, fontSize: 25, ...DISPLAY, marginTop: 2 }}>{ticketPerGoal(me.stadium)}M por gol</Text>
                  <Text style={[s.p, { marginTop: 2 }]}>
                    {upCost !== null ? `Al ampliar cobrarás ${ticketPerGoal(me.stadium + 1)}M por cada gol.` : 'Tu estadio ya es el más grande de la liga.'}
                  </Text>
                </View>
                <StadiumArt level={me.stadium} color={color} width={150} />
              </View>
              {upCost !== null ? (
                <View style={{ marginTop: 10, alignItems: 'flex-start' }}>
                  {actionBtn(`Ampliar estadio · ${upCost}M`, { type: 'upgradeStadium' })}
                </View>
              ) : null}
            </View>

            <View style={s.panel}>
              <Overline>TU ALINEACIÓN</Overline>
              <View style={[s.row, { marginTop: 6, marginBottom: 8, flexWrap: 'wrap' }]}>
                {(['POR', 'DEF', 'MED', 'DEL'] as const).map((pos) => (
                  <Tag key={pos} text={`${lineup(me)[pos]} ${pos}`} color={lineup(me)[pos] ? POS_COLOR[pos] : undefined} />
                ))}
                {lineup(me).POR === 0 ? <Tag icon={I.warning} text={`Sin ${words(state).keeper}`} color={C.danger} /> : null}
              </View>
              <NumberLine player={me} jornada={J} state={state} />
            </View>

            {me.squad.length === 0 ? <Text style={s.p}>Aún no tienes futbolistas. Ve al mercado y ficha.</Text> : null}
            {me.squad.map((e) => (
              <FootballerCard key={e.cardId} cardId={e.cardId} entry={e} state={state} owner={me}>
                <Btn small kind="ghost" label={`Vender · +${sellValue(e.cardId)}M`} onPress={() => act({ type: 'sell', cardId: e.cardId })} />
                {!e.shielded ? actionBtn(`Blindar · ${shieldCost(e.cardId)}M`, { type: 'shield', cardId: e.cardId }) : null}
                <Text style={{ color: C.faint, fontSize: 12 }}>Cláusula {clauseOf(e)}M</Text>
              </FootballerCard>
            ))}
          </>
        ) : null}

        {tab === 'rivales' ? (
          <>
            <Tip id="rivales" title="Mira qué números tienen">
              {`Aquí ves las plantillas rivales. ${rw.aForward[0].toUpperCase() + rw.aForward.slice(1)} ${rw.yours} con el 6 vale poco si todos tienen ${rw.keeper} con el 6. Y si un rival tiene una estrella sin blindar, puedes llevártela pagando su cláusula.`}
            </Tip>
            <Text style={[s.p, { marginBottom: 10 }]}>Paga la cláusula de {rw.fem ? 'una futbolista rival y te la llevas' : 'un futbolista rival y te lo llevas'} sin que su club pueda negarse. El dinero va a su club.</Text>
            {rivals.map((r) => (
              <View key={r.id} style={{ marginBottom: 14 }}>
                <View style={[s.row, { marginBottom: 8 }]}>
                  <Crest name={r.name} color={clubColor(r.id)} design={r.crest} size={30} />
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
                    {actionBtn(`Pagar cláusula · ${clauseOf(e)}M`, { type: 'clause', ownerId: r.id, cardId: e.cardId })}
                  </FootballerCard>
                ))}
              </View>
            ))}
            <Text style={[s.h2, { marginTop: 8, marginBottom: 8 }]}>Crónica de la liga</Text>
            <Chronicle state={state} max={60} />
          </>
        ) : null}

        {tab === 'cartas' ? (
          <>
            {me.hand.length === 0 ? <Text style={[s.p, { marginBottom: 10 }]}>No tienes cartas especiales. Cómpralas aquí o consíguelas gratis cuando salga un 7 y vayas en la mitad baja de la tabla.</Text> : null}
            {me.hand.map((id, i) => {
              const info = SPECIAL_INFO[specialCard(id).kind];
              const needsTarget = info.target !== 'self' && info.target !== 'passive';
              // En el mercado solo se juegan las de despacho; el resto se guarda para el partido.
              const now = info.timing === 'despacho' && info.target !== 'passive';
              return (
                <SpecialCardFace key={id} id={id}>
                  {now && pending !== i ? <Btn small label="Jugar" onPress={() => (needsTarget ? setPending(i) : act({ type: 'playCard', handIndex: i }))} /> : null}
                  {pending === i ? (
                    <View style={{ flexBasis: '100%' }}>
                      <Overline>{pendingTarget === 'ownFootballer' ? '¿A CUÁL DE LOS TUYOS?' : pendingTarget === 'rival' ? '¿CONTRA QUÉ CLUB?' : '¿A QUÉ FUTBOLISTA RIVAL?'}</Overline>
                      <View style={{ height: 8 }} />
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
                        <Crest name={r.name} color={clubColor(r.id)} design={r.crest} size={28} />
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

                  {info.timing !== 'despacho' ? (
                    <Text style={{ color: CARD_TYPE[info.timing].color, fontSize: 12, fontWeight: '800', flex: 1 }}>
                      {info.timing === 'giro' ? 'Para el partido: cuando una jugada te afecte' : 'Para el partido: juégala desde «Mis cartas»'}
                    </Text>
                  ) : null}
                  {pending !== i ? <Btn small kind="ghost" label="Descartar" onPress={() => act({ type: 'discardCard', handIndex: i })} /> : null}
                </SpecialCardFace>
              );
            })}
            <Btn kind={why({ type: 'buySpecial' }) ? 'muted' : 'primary'} label={`Comprar carta especial · ${CONFIG.special.cost}M`} onPress={() => act({ type: 'buySpecial' })} />
            <Text style={[s.p, { marginTop: 8 }]}>
              Se roba boca abajo. Máximo {CONFIG.special.handLimit} en mano. Las de despacho se juegan aquí (hasta {CONFIG.special.maxPlayedPerTurn} por turno); las de árbitro, jugada y giro, durante el partido.
            </Text>
          </>
        ) : null}

      </ScrollView>

      <View style={{ padding: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line }}>
        <Text style={{ color: canStillSign ? C.accent : C.faint, fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
          {canStillSign ? `Aún puedes fichar a ${words(state).fem ? 'una' : 'un'} futbolista este turno` : 'Cuando acabes, pasa el turno'}
        </Text>
        <Btn label="Terminar turno →" onPress={endTurn} />
      </View>

      {news.length ? (
        <Popup overline="DESDE TU ÚLTIMO TURNO" title="Novedades en tu club" color={C.danger} icon={<Icon name={I.news} size={44} color={C.danger} />} onClose={() => setNews([])}>
          {news.map((l) => (
            <View key={l.n} style={[s.row, { alignItems: 'flex-start', marginBottom: 8 }]}>
              <Text style={{ color: C.danger, fontWeight: '900', marginRight: 8 }}>•</Text>
              <Text style={{ color: C.text, flex: 1, fontSize: 15, lineHeight: 21 }}>{l.text}</Text>
            </View>
          ))}
        </Popup>
      ) : confirmEnd ? (
        <Popup overline="TERMINAR TURNO" title="¿Pasar sin fichar?" color={C.accent} button="Seguir en el mercado" onClose={() => setConfirmEnd(false)}>
          <Text style={[s.p, { textAlign: 'center', marginBottom: 12 }]}>
            {preseason
              ? `Aún puedes fichar este turno. En pretemporada cada fichaje cuenta: si pasas, empezarás la liga con menos futbolistas.`
              : `Aún puedes fichar ${words(state).fem ? 'a una' : 'a un'} futbolista este turno. Solo se puede fichar una vez por turno.`}
          </Text>
          <Btn
            kind="ghost"
            label="Terminar sin fichar"
            onPress={() => {
              setConfirmEnd(false);
              act({ type: 'endTurn' });
            }}
            style={{ marginBottom: 4 }}
          />
        </Popup>
      ) : drawn ? (
        <Popup overline="CARTA NUEVA" title="Has robado esta carta" color={C.good} button="A la mano" onClose={() => setDrawn(null)}>
          <SpecialCardFace id={drawn} />
        </Popup>
      ) : null}
    </View>
  );
}
