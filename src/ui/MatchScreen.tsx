import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { GameState, MatchReport, MatchResult, RollReport, footballer, standings, ticketPerGoal } from '../engine';
import { Avatar, Ball, Crest, Die } from './art';
import { NumberLine, SpecialCardFace } from './GameScreen';
import { Btn, Chronicle, Overline, PhaseStepper, Pop, StandingsTable, jornadaLabel, s } from './components';
import { C, clubColor } from './theme';

const ordinal = (n: number) => `${n}.º`;

/** Antes del partido: qué va a pasar y con qué números marca cada persona. */
export function KickoffScreen({ state, onPlay, focus }: { state: GameState; onPlay: () => void; focus?: number[] }) {
  const humans = state.players.filter((p) => (focus ? focus.includes(p.id) : !p.isBot));
  return (
    <View style={{ flex: 1 }}>
      <PhaseStepper step={1} label={jornadaLabel(state)} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ alignItems: 'center', marginVertical: 12 }}>
          <View style={[s.row, { gap: 10 }]}>
            <Die value={6} size={64} />
            <Die value={2} size={64} />
          </View>
          <Text style={[s.h1, { marginTop: 14, textAlign: 'center' }]}>Mercado cerrado. ¡A jugar!</Text>
          <Text style={[s.p, { textAlign: 'center', marginTop: 6 }]}>
            Se tiran los dados 6 veces. En cada tirada marcan todos los futbolistas que tengan ese número. Con un 7 entra el VAR: nadie marca y los últimos de la tabla roban carta.
          </Text>
        </View>
        {humans.map((p) => (
          <View key={p.id} style={[s.panel, { borderColor: clubColor(p.id) + '88' }]}>
            <View style={[s.row, { marginBottom: 8 }]}>
              <Crest name={p.name} color={clubColor(p.id)} size={24} />
              <Text style={{ color: C.text, fontWeight: '800', marginLeft: 8, flex: 1 }}>{p.name}</Text>
              <Overline>TUS NÚMEROS</Overline>
            </View>
            <NumberLine player={p} jornada={state.jornada} />
          </View>
        ))}
        <Btn label="🎲 Tirar los dados" onPress={onPlay} />
        <Text style={[s.h2, { marginTop: 22 }]}>Lo que ha pasado en el mercado</Text>
        <Chronicle state={state} max={10} />
      </ScrollView>
    </View>
  );
}

function useCountUp(target: number, run: boolean): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (target <= 0) return setV(target);
    let cur = 0;
    const t = setInterval(() => {
      cur += 1;
      setV(cur);
      if (cur >= target) clearInterval(t);
    }, Math.max(40, 700 / target));
    return () => clearInterval(t);
  }, [target, run]);
  return v;
}

function Stat({ label, value, color, big }: { label: string; value: string; color?: string; big?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: color ?? C.text, fontSize: big ? 40 : 28, fontWeight: '900', lineHeight: big ? 46 : 46 }}>{value}</Text>
      <Text style={s.overline}>{label}</Text>
    </View>
  );
}

/** Tarjeta grande con lo que ha conseguido un club en la jornada. */
function HeroResult({ state, r }: { state: GameState; r: MatchResult }) {
  const p = state.players[r.playerId];
  const color = clubColor(p.id);
  const pts = useCountUp(r.points, true);
  const money = useCountUp(r.prize + r.ticket, true);
  const leaguePos = standings(state).findIndex((x) => x.id === p.id) + 1;
  const n = state.players.length;
  const headline = r.rank === 1 ? '¡Ganas la jornada!' : r.rank === n ? 'Jornada para olvidar' : `${ordinal(r.rank)} de ${n} en la jornada`;
  return (
    <View style={{ borderRadius: 16, borderWidth: 2, borderColor: color, backgroundColor: C.panel, marginBottom: 12, overflow: 'hidden' }}>
      <View style={[s.row, { backgroundColor: color + '33', padding: 12 }]}>
        <Crest name={p.name} color={color} size={40} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Overline>{p.name.toUpperCase()}</Overline>
          <Text style={{ color: C.text, fontSize: 20, fontWeight: '900' }}>{headline}</Text>
        </View>
        {r.rank === 1 ? <Text style={{ fontSize: 30 }}>🥇</Text> : null}
      </View>
      <View style={[s.row, { paddingVertical: 12, paddingHorizontal: 8 }]}>
        <Stat label="GOLES" value={`${r.goals}`} />
        <View style={{ width: 1, height: 44, backgroundColor: C.line }} />
        <Stat label="PUNTOS DE LIGA" value={`+${pts}`} color={C.accent} big />
        <View style={{ width: 1, height: 44, backgroundColor: C.line }} />
        <Stat label="INGRESOS" value={`+${money}M`} color={C.good} />
      </View>
      <View style={{ borderTopWidth: 1, borderTopColor: C.line, padding: 10 }}>
        <Text style={{ color: C.dim, fontSize: 12, textAlign: 'center' }}>
          Premio por posición {r.prize}M ·{' '}
          {r.closedDoors
            ? 'taquilla 0M (puerta cerrada)'
            : `taquilla ${r.ticket}M (${r.goals} ${r.goals === 1 ? 'gol' : 'goles'} × ${ticketPerGoal(p.stadium)}M${r.clubDay ? ' × 2 Día del club' : ''})`}
        </Text>
        <Text style={{ color: C.text, fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>
          Llevas {p.points} puntos · vas {ordinal(leaguePos)} en la liga · {p.money}M en caja
        </Text>
      </View>
    </View>
  );
}

/** Una línea del acta: qué salió y quién marcó. */
function ActaLine({ state, roll, index, mine }: { state: GameState; roll: RollReport; index: number; mine: number[] }) {
  const name = (id: number) => state.players[id].name;
  const isVar = roll.sum === 7;
  return (
    <View style={[s.row, { alignItems: 'flex-start', paddingVertical: 7, borderTopWidth: index ? 1 : 0, borderTopColor: C.line }]}>
      <View style={{ width: 34, height: 34, borderRadius: 9, borderWidth: 1.5, borderColor: isVar ? C.danger : C.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.text, fontWeight: '800' }}>{roll.sum}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={[s.overline, { marginBottom: 2 }]}>OCASIÓN {index + 1}</Text>
        {isVar ? (
          <Text style={{ color: '#FFB3B5', fontWeight: '700' }}>
            VAR: sin goles.{roll.varDraws.length ? ` Roban carta: ${roll.varDraws.map((d) => name(d.playerId)).join(', ')}.` : ''}
          </Text>
        ) : roll.goals.length === 0 ? (
          <Text style={s.p}>Nadie tenía el {roll.sum}.</Text>
        ) : (
          roll.goals.map((g, i) => {
            const own = mine.includes(g.playerId);
            return (
              <Text key={i} style={{ color: own ? C.text : C.dim, fontWeight: own ? '800' : '500', fontSize: 14, lineHeight: 20 }}>
                {own ? '⚽ ' : ''}
                {footballer(g.cardId).name}
                {g.goals > 1 ? ' ×2' : ''} <Text style={{ color: clubColor(g.playerId), fontWeight: '800' }}>· {name(g.playerId)}</Text>
              </Text>
            );
          })
        )}
      </View>
    </View>
  );
}

export function MatchScreen(props: { state: GameState; report: MatchReport; onNext: () => void; focus?: number[]; footer?: React.ReactNode }) {
  const { state, report, onNext, focus } = props;
  const [shown, setShown] = useState(0);
  const [reparto, setReparto] = useState(false);
  const total = report.rolls.length;
  /** Clubes de quien mira esta pantalla: sus goles y cartas se celebran a lo grande. */
  const mine = focus ?? state.players.filter((p) => !p.isBot).map((p) => p.id);
  const visible = report.rolls.slice(0, shown);
  const current = visible[visible.length - 1];
  const myGoals = current ? current.goals.filter((g) => mine.includes(g.playerId)) : [];
  const myDraws = current ? current.varDraws.filter((d) => mine.includes(d.playerId)) : [];

  // Las tiradas avanzan solas, con más pausa cuando te afecta. La última no se quita sola.
  useEffect(() => {
    if (reparto || shown >= total) return;
    const delay = shown === 0 ? 900 : myGoals.length || myDraws.length ? 4500 : 2800;
    const t = setTimeout(() => setShown((x) => x + 1), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, reparto, total]);

  const name = (id: number) => state.players[id].name;
  const last = state.jornada >= state.totalJornadas;
  const goalsSoFar = (id: number) => visible.reduce((a, r) => a + r.goals.filter((g) => g.playerId === id).reduce((b, g) => b + g.goals, 0), 0);
  const maxGoals = Math.max(1, ...report.results.map((r) => r.goals));
  const humans = report.results.filter((r) => mine.includes(r.playerId));
  const heroes = humans.length ? humans : report.results.filter((r) => r.rank === 1).slice(0, 1);
  const tone = !current ? 'ghost' : current.sum === 7 ? 'var' : 'light';

  return (
    <View style={{ flex: 1 }}>
      <PhaseStepper step={reparto ? 2 : 1} label={reparto ? 'REPARTO' : 'DÍA DE PARTIDO'} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {!reparto ? (
          <>
            <View style={[s.panel, { alignItems: 'center', paddingVertical: 18 }]}>
              <Overline>{shown === 0 ? 'SALTAN AL CAMPO…' : `OCASIÓN ${shown} DE ${total}`}</Overline>
              <Pop trigger={shown} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <Die value={current?.dice[0] ?? 1} size={70} tone={tone} />
                <Die value={current?.dice[1] ?? 1} size={70} tone={tone} />
                <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: !current ? C.panelAlt : current.sum === 7 ? C.danger : C.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: !current ? C.faint : current.sum === 7 ? '#fff' : C.accentText, fontSize: 34, fontWeight: '900' }}>{current ? current.sum : '?'}</Text>
                </View>
              </Pop>

              {myGoals.length ? (
                <Pop trigger={shown} style={{ alignSelf: 'stretch', marginTop: 16 }}>
                  <View style={{ borderRadius: 16, borderWidth: 2, borderColor: clubColor(myGoals[0].playerId), backgroundColor: clubColor(myGoals[0].playerId) + '33', padding: 14, alignItems: 'center' }}>
                    <Text style={{ color: C.accent, fontSize: 34, fontWeight: '900', letterSpacing: 1 }}>¡GOOOL!</Text>
                    {myGoals.map((g, i) => (
                      <View key={i} style={[s.row, { marginTop: 10, alignSelf: 'stretch' }]}>
                        <Avatar seed={g.cardId} size={52} jersey={clubColor(g.playerId)} ring={C.accent} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={{ color: C.text, fontSize: 18, fontWeight: '900' }}>{footballer(g.cardId).name}</Text>
                          <Text style={{ color: C.dim, fontSize: 13 }}>
                            Marca con el {current!.sum} para {name(g.playerId)}
                            {g.goals > 1 ? ' · 🔥 vale doble' : ''}
                          </Text>
                        </View>
                        <View style={s.row}>
                          {Array.from({ length: g.goals }, (_, k) => (
                            <Ball key={k} size={24} />
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                </Pop>
              ) : null}

              {myDraws.length ? (
                <Pop trigger={shown} style={{ alignSelf: 'stretch', marginTop: 16 }}>
                  <View style={{ borderRadius: 16, borderWidth: 2, borderColor: C.good, backgroundColor: C.good + '22', padding: 14 }}>
                    <Text style={{ color: C.good, fontSize: 22, fontWeight: '900', textAlign: 'center' }}>📺 ¡El VAR te da una carta!</Text>
                    {myDraws.map((d) =>
                      mine.length === 1 ? (
                        <View key={d.playerId} style={{ marginTop: 10 }}>
                          <SpecialCardFace id={d.cardId} />
                        </View>
                      ) : (
                        <Text key={d.playerId} style={{ color: C.text, fontWeight: '700', textAlign: 'center', marginTop: 6 }}>
                          {name(d.playerId)} roba una carta especial: la verá en su turno.
                        </Text>
                      ),
                    )}
                  </View>
                </Pop>
              ) : null}

              <View style={{ marginTop: 14, alignItems: 'center' }}>
                {!current ? <Text style={s.p}>Los dados están en el aire…</Text> : null}
                {current && current.sum === 7 ? (
                  <Text style={{ color: '#FFB3B5', fontWeight: '800', textAlign: 'center' }}>
                    ¡VAR! Nadie marca.{current.varDraws.length ? ` Roban carta: ${current.varDraws.map((d) => name(d.playerId)).join(', ')}.` : ''}
                  </Text>
                ) : null}
                {current && current.sum !== 7 && current.goals.length === 0 ? <Text style={s.p}>Nadie tiene el {current.sum}. Balón fuera.</Text> : null}
                {current && current.sum !== 7 && current.goals.length > 0 && myGoals.length === 0 ? <Text style={s.p}>Marcan tus rivales. Tú no tienes el {current.sum}.</Text> : null}
              </View>

              <View style={[s.row, { gap: 6, marginTop: 12 }]}>
                {report.rolls.map((r, i) => {
                  const on = i < visible.length;
                  return (
                    <View key={i} style={{ width: 34, height: 34, borderRadius: 9, borderWidth: 1.5, borderColor: on ? (r.sum === 7 ? C.danger : C.accent) : C.line, backgroundColor: on && i === visible.length - 1 ? (r.sum === 7 ? C.danger + '33' : C.accent + '33') : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: on ? C.text : C.faint, fontWeight: '800' }}>{on ? r.sum : '·'}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {shown >= total ? (
              <Btn label="Ver el reparto de la jornada →" onPress={() => setReparto(true)} style={{ marginBottom: 12 }} />
            ) : (
              <View style={[s.row, { gap: 8, marginBottom: 12 }]}>
                <Btn kind="ghost" label="Siguiente tirada ▸" onPress={() => setShown((x) => Math.min(total, x + 1))} style={{ flex: 1 }} />
                <Btn kind="ghost" label="Saltar al reparto" onPress={() => { setShown(total); setReparto(true); }} style={{ flex: 1 }} />
              </View>
            )}

            <View style={s.panel}>
              <Overline>MARCADOR EN DIRECTO</Overline>
              {state.players.map((p) => {
                const g = goalsSoFar(p.id);
                const scored = !!current && current.goals.some((x) => x.playerId === p.id);
                return (
                  <View key={p.id} style={[s.row, { marginTop: 8, padding: 6, borderRadius: 10, backgroundColor: scored ? clubColor(p.id) + '2E' : 'transparent' }]}>
                    <Crest name={p.name} color={clubColor(p.id)} size={28} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text numberOfLines={1} style={{ color: C.text, fontWeight: '700', fontSize: 13 }}>
                        {p.name}
                        {mine.includes(p.id) && mine.length < state.players.length ? <Text style={{ color: C.accent }}> · TÚ</Text> : null}
                      </Text>
                      <View style={{ height: 6, borderRadius: 3, backgroundColor: C.panelAlt, marginTop: 4 }}>
                        <View style={{ height: 6, borderRadius: 3, backgroundColor: clubColor(p.id), width: `${(100 * g) / maxGoals}%` }} />
                      </View>
                    </View>
                    <Text style={{ color: C.text, fontSize: 24, fontWeight: '900', width: 40, textAlign: 'right' }}>{g}</Text>
                  </View>
                );
              })}
            </View>

            {visible.length ? (
              <View style={s.panel}>
                <Overline>ACTA DEL PARTIDO</Overline>
                <View style={{ marginTop: 6 }}>
                  {visible.map((r, i) => (
                    <ActaLine key={i} state={state} roll={r} index={i} mine={mine} />
                  ))}
                </View>
              </View>
            ) : null}
          </>
        ) : (
          <>
            <Text style={s.h1}>Final de la jornada</Text>
            <Text style={[s.p, { marginBottom: 12 }]}>Más goles, más puntos de liga y mejor premio. Además, cada gol llena tu taquilla.</Text>
            {heroes.map((r) => (
              <HeroResult key={r.playerId} state={state} r={r} />
            ))}

            <View style={s.panel}>
              <View style={[s.row, { marginBottom: 6 }]}>
                <Text style={[s.th, { flex: 1, textAlign: 'left' }]}>REPARTO DE LA JORNADA</Text>
                <Text style={[s.th, { width: 50 }]}>GOLES</Text>
                <Text style={[s.th, { width: 52 }]}>PUNTOS</Text>
                <Text style={[s.th, { width: 56 }]}>DINERO</Text>
              </View>
              {report.results.map((r) => (
                <View key={r.playerId} style={[s.row, s.tr]}>
                  <Text style={{ color: C.faint, width: 20, fontWeight: '700' }}>{r.rank}</Text>
                  <Crest name={name(r.playerId)} color={clubColor(r.playerId)} size={24} />
                  <Text numberOfLines={1} style={{ color: C.text, flex: 1, fontWeight: '700', marginLeft: 8 }}>{name(r.playerId)}</Text>
                  <View style={[s.row, { width: 50, justifyContent: 'flex-end' }]}>
                    <Text style={{ color: C.text, fontWeight: '800', marginRight: 4 }}>{r.goals}</Text>
                    <Ball size={13} dim={r.goals === 0} />
                  </View>
                  <Text style={[s.td, { width: 52, color: C.accent, fontWeight: '900', fontSize: 15 }]}>+{r.points}</Text>
                  <Text style={[s.td, { width: 56, color: C.good, fontWeight: '800' }]}>+{r.prize + r.ticket}M</Text>
                </View>
              ))}
            </View>

            <StandingsTable state={state} />
            {props.footer ?? <Btn label={last ? '🏆 Ver el final de temporada' : `Ir al mercado de la jornada ${state.jornada + 1} →`} onPress={onNext} />}

            <View style={[s.panel, { marginTop: 14 }]}>
              <Overline>ACTA DEL PARTIDO</Overline>
              <View style={{ marginTop: 6 }}>
                {report.rolls.map((r, i) => (
                  <ActaLine key={i} state={state} roll={r} index={i} mine={mine} />
                ))}
              </View>
            </View>
            <Btn kind="ghost" small label="◂ Volver a ver las tiradas" onPress={() => { setShown(0); setReparto(false); }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}
