import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { GameState, MatchReport, MatchResult, Play, RollReport, footballer, standings, ticketPerGoal } from '../engine';
import { Avatar, Crest, Die } from './art';
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
            Un solo partido, todos contra todos. Se tiran los dados 6 veces: quien tenga delanteros o medios con ese número ataca a todos los rivales, y cada rival lo para si su portero y sus defensas con ese número suman al menos la misma fuerza. Con un 7 entra el VAR.
          </Text>
        </View>
        {humans.map((p) => (
          <View key={p.id} style={[s.panel, { borderColor: clubColor(p.id) + '88' }]}>
            <View style={[s.row, { marginBottom: 8 }]}>
              <Crest name={p.name} color={clubColor(p.id)} size={24} />
              <Text style={{ color: C.text, fontWeight: '800', marginLeft: 8, flex: 1 }}>{p.name}</Text>
              <Overline>TUS NÚMEROS</Overline>
            </View>
            <NumberLine player={p} jornada={state.jornada} state={state} />
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
      <Text style={{ color: color ?? C.text, fontSize: big ? 40 : 28, fontWeight: '900', lineHeight: 46 }}>{value}</Text>
      <Text style={[s.overline, { textAlign: 'center' }]}>{label}</Text>
    </View>
  );
}

/** Tarjeta grande con lo que ha conseguido un club en la jornada. */
function HeroResult({ state, r }: { state: GameState; r: MatchResult }) {
  const p = state.players[r.playerId];
  const color = clubColor(p.id);
  const pts = useCountUp(r.points, true);
  const income = r.prize + r.ticket + r.saveBonus;
  const money = useCountUp(income, true);
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
        <Stat label="A FAVOR – EN CONTRA" value={`${r.goals}–${r.against}`} />
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
            : `taquilla ${r.ticket}M (${r.scoringPlays} ${r.scoringPlays === 1 ? 'jugada de gol' : 'jugadas de gol'} × ${ticketPerGoal(p.stadium)}M${r.clubDay ? ' × 2 Día del club' : ''})`}
          {r.saves ? ` · ${r.saves} ${r.saves === 1 ? 'parada' : 'paradas'} del portero: ${r.saveBonus}M` : ''}
        </Text>
        {r.counters || r.keeperCard ? (
          <Text style={{ color: C.good, fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>
            {r.counters ? `${r.counters} ${r.counters === 1 ? 'gol' : 'goles'} a la contra` : ''}
            {r.counters && r.keeperCard ? ' · ' : ''}
            {r.keeperCard ? 'Tu portero gana una carta especial por sus paradas' : ''}
          </Text>
        ) : null}
        <Text style={{ color: C.text, fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>
          Llevas {p.points} puntos · vas {ordinal(leaguePos)} en la liga · {p.money}M en caja
        </Text>
      </View>
    </View>
  );
}

const list = (names: string[]) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`);

/** Cuenta lo que pasa en una jugada de ataque, con tono de crónica. */
export function narrate(state: GameState, sum: number, play: Play): string {
  const club = state.players[play.playerId].name;
  const who = list(play.cards.map((id) => footballer(id).name));
  const name = (id: number) => state.players[id].name;
  const kind = play.cards.length > 1 ? 'Jugada combinada' : footballer(play.cards[0]).position === 'MED' ? 'Tiro lejano' : 'Remate';
  const parts: string[] = [`${kind} de ${who} (${club}) con el ${sum}.`];
  if (play.scored.length) parts.push(`Gol a ${list(play.scored.map(name))}.`);
  const plain = play.stopped.filter((x) => !x.counter);
  const counters = play.stopped.filter((x) => x.counter);
  if (plain.length) parts.push(`Lo ${plain.length > 1 ? 'paran' : 'para'} ${list(plain.map((x) => name(x.playerId)))}.`);
  if (counters.length) parts.push(`${list(counters.map((x) => name(x.playerId)))} ${counters.length > 1 ? 'roban y marcan' : 'roba y marca'} a la contra.`);
  return parts.join(' ');
}

/** Una línea del acta: qué salió y qué jugadas hubo. */
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
            VAR: sin jugadas.{roll.varDraws.length ? ` Roban carta: ${roll.varDraws.map((d) => name(d.playerId)).join(', ')}.` : ''}
          </Text>
        ) : roll.plays.length === 0 ? (
          <Text style={s.p}>Nadie atacaba con el {roll.sum}.</Text>
        ) : (
          roll.plays.map((pl, i) => {
            const own = mine.includes(pl.playerId) || pl.scored.some((id) => mine.includes(id)) || pl.stopped.some((x) => mine.includes(x.playerId));
            return (
              <Text key={i} style={{ color: own ? C.text : C.dim, fontWeight: own ? '700' : '500', fontSize: 13, lineHeight: 19, marginBottom: 2 }}>
                <Text style={{ color: clubColor(pl.playerId) }}>● </Text>
                {narrate(state, roll.sum, pl)}
              </Text>
            );
          })
        )}
      </View>
    </View>
  );
}

function Banner({ color, title, children, trigger }: { color: string; title: string; children: React.ReactNode; trigger: number }) {
  return (
    <Pop trigger={trigger} style={{ alignSelf: 'stretch', marginTop: 12 }}>
      <View style={{ borderRadius: 16, borderWidth: 2, borderColor: color, backgroundColor: color + '26', padding: 12 }}>
        <Text style={{ color, fontSize: 24, fontWeight: '900', textAlign: 'center', letterSpacing: 0.5 }}>{title}</Text>
        {children}
      </View>
    </Pop>
  );
}

export function MatchScreen(props: { state: GameState; report: MatchReport; onNext: () => void; focus?: number[]; footer?: React.ReactNode }) {
  const { state, report, onNext, focus } = props;
  const [shown, setShown] = useState(0);
  const [reparto, setReparto] = useState(false);
  const total = report.rolls.length;
  /** Clubes de quien mira esta pantalla: lo que les pasa se destaca a lo grande. */
  const mine = focus ?? state.players.filter((p) => !p.isBot).map((p) => p.id);
  const isMine = (id: number) => mine.includes(id);
  const visible = report.rolls.slice(0, shown);
  const current = visible[visible.length - 1];
  const name = (id: number) => state.players[id].name;

  // Lo que le pasa a quien mira en la tirada actual.
  const plays = current?.plays ?? [];
  const myAttacks = plays.filter((pl) => isMine(pl.playerId));
  const myGoals = myAttacks.filter((pl) => pl.scored.length > 0);
  const myStopped = myAttacks.filter((pl) => pl.scored.length === 0);
  const conceded = plays.filter((pl) => pl.scored.some(isMine));
  const saved = plays.filter((pl) => pl.stopped.some((x) => isMine(x.playerId)));
  const counterAgainst = myAttacks.flatMap((pl) => pl.stopped.filter((x) => x.counter && !isMine(x.playerId)));
  const myDraws = current ? current.varDraws.filter((d) => isMine(d.playerId)) : [];
  const involved = myAttacks.length + conceded.length + saved.length + myDraws.length > 0;

  // Las tiradas avanzan solas, con más pausa cuando te afecta. La última no se quita sola.
  useEffect(() => {
    if (reparto || shown >= total) return;
    const delay = shown === 0 ? 900 : involved ? 5200 : 3000;
    const t = setTimeout(() => setShown((x) => x + 1), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, reparto, total]);

  const last = state.jornada >= state.totalJornadas;
  const score = (id: number) => {
    let gf = 0;
    let gc = 0;
    for (const r of visible) {
      for (const pl of r.plays) {
        const counters = pl.stopped.filter((x) => x.counter);
        if (pl.playerId === id) {
          gf += pl.scored.length;
          gc += counters.length;
        } else {
          if (pl.scored.includes(id)) gc += 1;
          if (counters.some((x) => x.playerId === id)) gf += 1;
        }
      }
    }
    return { gf, gc };
  };
  const maxGoals = Math.max(1, ...report.results.map((r) => r.goals));
  const humans = report.results.filter((r) => isMine(r.playerId));
  const heroes = humans.length ? humans : report.results.filter((r) => r.rank === 1).slice(0, 1);
  const tone = !current ? 'ghost' : current.sum === 7 ? 'var' : 'light';
  const attackers = (pl: Play) => list(pl.cards.map((id) => footballer(id).name));

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

              {conceded.length ? (
                <Banner color={C.danger} title={myGoals.length ? 'Encajas…' : '¡Gol en contra!'} trigger={shown}>
                  {conceded.map((pl, i) => (
                    <Text key={i} style={{ color: C.text, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>
                      {attackers(pl)} <Text style={{ color: clubColor(pl.playerId) }}>({name(pl.playerId)})</Text> te marca{pl.cards.length > 1 ? 'n en jugada combinada' : ''}: tu defensa no llega a fuerza {pl.power} con el {current!.sum}.
                    </Text>
                  ))}
                </Banner>
              ) : null}

              {myGoals.length ? (
                <Banner color={C.accent} title={conceded.length ? '…¡y respondes! ¡GOOOL!' : '¡GOOOL!'} trigger={shown}>
                  {conceded.length ? <Text style={{ color: C.dim, textAlign: 'center', fontSize: 12, marginTop: 2 }}>Sacas de centro, te lanzas al ataque y marcas.</Text> : null}
                  {myGoals.map((pl, i) => (
                    <View key={i} style={{ marginTop: 8 }}>
                      <View style={[s.row, { justifyContent: 'center', gap: 6 }]}>
                        {pl.cards.map((id) => (
                          <Avatar key={id} seed={id} size={46} jersey={clubColor(pl.playerId)} ring={C.accent} />
                        ))}
                      </View>
                      <Text style={{ color: C.text, fontSize: 16, fontWeight: '900', textAlign: 'center', marginTop: 4 }}>{attackers(pl)}</Text>
                      <Text style={{ color: C.text, fontWeight: '700', textAlign: 'center', marginTop: 2 }}>
                        {pl.scored.length} {pl.scored.length === 1 ? 'gol' : 'goles'}: marcas a {list(pl.scored.map(name))}.
                      </Text>
                      {pl.stopped.length ? (
                        <Text style={{ color: C.dim, fontSize: 12, textAlign: 'center', marginTop: 2 }}>
                          Te lo {pl.stopped.length > 1 ? 'paran' : 'para'} {list(pl.stopped.map((x) => name(x.playerId)))}.
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </Banner>
              ) : null}

              {myStopped.length ? (
                <Banner color="#8FA89A" title="Te la paran" trigger={shown}>
                  {myStopped.map((pl, i) => (
                    <Text key={i} style={{ color: C.text, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>
                      {attackers(pl)} lo intenta con el {current!.sum}, pero {list(pl.stopped.map((x) => name(x.playerId)))} {pl.stopped.length > 1 ? 'tienen' : 'tiene'} defensa suficiente.
                    </Text>
                  ))}
                </Banner>
              ) : null}

              {counterAgainst.length ? (
                <Banner color={C.danger} title="¡Contragolpe!" trigger={shown}>
                  <Text style={{ color: C.text, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>
                    {list(counterAgainst.map((x) => name(x.playerId)))} {counterAgainst.length > 1 ? 'roban' : 'roba'} el balón con su defensa y te {counterAgainst.length > 1 ? 'marcan' : 'marca'} a la contra.
                  </Text>
                </Banner>
              ) : null}

              {saved.length ? (
                <Banner color={C.good} title={saved.some((pl) => pl.stopped.some((x) => isMine(x.playerId) && x.keeper)) ? '¡Paradón!' : '¡Bien defendido!'} trigger={shown}>
                  {saved.map((pl, i) => {
                    const st = pl.stopped.find((x) => isMine(x.playerId))!;
                    return (
                      <Text key={i} style={{ color: C.text, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>
                        Paras a {attackers(pl)} <Text style={{ color: clubColor(pl.playerId) }}>({name(pl.playerId)})</Text>
                        {st.counter ? ' y tu defensa sale a la contra: ¡gol!' : '.'}
                      </Text>
                    );
                  })}
                </Banner>
              ) : null}

              {myDraws.length ? (
                <Banner color={C.good} title="📺 ¡El VAR te da una carta!" trigger={shown}>
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
                </Banner>
              ) : null}

              <View style={{ marginTop: 14, alignItems: 'center' }}>
                {!current ? <Text style={s.p}>Los dados están en el aire…</Text> : null}
                {current && current.sum === 7 ? (
                  <Text style={{ color: '#FFB3B5', fontWeight: '800', textAlign: 'center' }}>
                    ¡VAR! No hay jugadas.{current.varDraws.length ? ` Roban carta: ${current.varDraws.map((d) => name(d.playerId)).join(', ')}.` : ''}
                  </Text>
                ) : null}
                {current && current.sum !== 7 && plays.length === 0 ? <Text style={s.p}>Nadie ataca con el {current.sum}. Balón al centro del campo.</Text> : null}
                {current && current.sum !== 7 && plays.length > 0 && !involved ? <Text style={s.p}>Hay jugadas con el {current.sum}, pero a ti no te afectan. Están en el acta.</Text> : null}
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
              <View style={s.row}>
                <Text style={[s.overline, { flex: 1 }]}>MARCADOR EN DIRECTO</Text>
                <Text style={s.overline}>A FAVOR : EN CONTRA</Text>
              </View>
              {state.players.map((p) => {
                const sc = score(p.id);
                const active = plays.some((pl) => pl.playerId === p.id || pl.scored.includes(p.id) || pl.stopped.some((x) => x.playerId === p.id));
                return (
                  <View key={p.id} style={[s.row, { marginTop: 8, padding: 6, borderRadius: 10, backgroundColor: active ? clubColor(p.id) + '2E' : 'transparent' }]}>
                    <Crest name={p.name} color={clubColor(p.id)} size={28} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text numberOfLines={1} style={{ color: C.text, fontWeight: '700', fontSize: 13 }}>
                        {p.name}
                        {isMine(p.id) && mine.length < state.players.length ? <Text style={{ color: C.accent }}> · TÚ</Text> : null}
                      </Text>
                      <View style={{ height: 6, borderRadius: 3, backgroundColor: C.panelAlt, marginTop: 4 }}>
                        <View style={{ height: 6, borderRadius: 3, backgroundColor: clubColor(p.id), width: `${Math.min(100, (100 * sc.gf) / maxGoals)}%` }} />
                      </View>
                    </View>
                    <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', width: 64, textAlign: 'right' }}>
                      {sc.gf}
                      <Text style={{ color: C.faint }}> : </Text>
                      <Text style={{ color: C.dim }}>{sc.gc}</Text>
                    </Text>
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
            <Text style={[s.p, { marginBottom: 12 }]}>La jornada se ordena por diferencia de goles. Cuanto más arriba, más puntos de liga y mejor premio.</Text>
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
                  <Text style={[s.td, { width: 50, color: C.text, fontWeight: '800' }]}>{r.goals}:{r.against}</Text>
                  <Text style={[s.td, { width: 52, color: C.accent, fontWeight: '900', fontSize: 15 }]}>+{r.points}</Text>
                  <Text style={[s.td, { width: 56, color: C.good, fontWeight: '800' }]}>+{r.prize + r.ticket + r.saveBonus}M</Text>
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
