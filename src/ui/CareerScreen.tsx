import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { CAREER, CareerState, DIVISIONS, GameState, OUTCOME_TEXT, STYLE_MOTTO, careerBudget, careerRivals } from '../engine';
import { closeCareerSeason, loadCareer } from '../account/career';
import { unlock } from '../account/achievements';
import { Crest } from './art';
import { Btn, Overline, leagueLabel, s } from './components';
import { I, Icon } from './icons';
import { C, DISPLAY, clubColor } from './theme';

const OUTCOME_COLOR = { campeon: C.accent, ascenso: C.good, descenso: C.danger, permanencia: C.dim } as const;

/** Tarjeta del modo carrera en «Jugar aquí». */
export function CareerCard({ onPlay, onOpen }: { onPlay: () => void; onOpen: () => void }) {
  const saved = loadCareer();
  const c = saved?.career;
  return (
    <View style={[s.panel, { borderColor: C.good }]}>
      <View style={s.row}>
        <Icon name="stairs-up" size={22} color={C.good} style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Overline>MODO CARRERA</Overline>
          <Text style={{ color: C.text, fontWeight: '800', marginTop: 1 }}>
            {c ? `${DIVISIONS[c.division].name} · temporada ${c.season}` : 'Empieza en Tercera y llega a la Liga de Campeones'}
          </Text>
          {c ? (
            <Text style={{ color: C.dim, fontSize: 12, marginTop: 2 }}>
              {c.titles ? `🏆 ${c.titles} título${c.titles === 1 ? '' : 's'} · ` : ''}Tu plantilla se queda de una temporada a otra
            </Text>
          ) : (
            <Text style={{ color: C.dim, fontSize: 12, marginTop: 2 }}>El campeón sube, el último baja. Tu plantilla se queda.</Text>
          )}
        </View>
      </View>
      <View style={[s.row, { gap: 8, marginTop: 10 }]}>
        <Btn kind="secondary" label={!c ? 'Empezar mi carrera' : saved?.game ? `Seguir la temporada ${c.season}` : `Jugar la temporada ${c.season}`} onPress={onPlay} style={{ flex: 1 }} />
        {c ? <Btn kind="ghost" icon={I.trophy} label="Vitrina" onPress={onOpen} /> : null}
      </View>
    </View>
  );
}

function History({ c }: { c: CareerState }) {
  if (!c.history.length) return <Text style={s.p}>Aún no has terminado ninguna temporada.</Text>;
  return (
    <>
      {[...c.history].reverse().map((h) => (
        <View key={h.season} style={[s.row, s.tr]}>
          <Text style={{ color: C.faint, width: 30, fontWeight: '800' }}>T{h.season}</Text>
          <Text numberOfLines={1} style={{ color: C.text, flex: 1, fontWeight: '700' }}>{DIVISIONS[h.division].name}</Text>
          <Text style={{ color: C.dim, width: 46, textAlign: 'right' }}>{h.position}.º</Text>
          <Text style={{ color: OUTCOME_COLOR[h.outcome], width: 110, textAlign: 'right', fontWeight: '800' }}>{h.outcome === 'campeon' ? '🏆 Campeón' : OUTCOME_TEXT[h.outcome]}</Text>
        </View>
      ))}
    </>
  );
}

/** Rivales de la división actual, con su estilo. */
function Rivals({ c }: { c: CareerState }) {
  return (
    <>
      {careerRivals(c).map((r, i) => (
        <View key={r.name} style={[s.row, { marginTop: 8 }]}>
          <Crest name={r.name} color={clubColor(i + 1)} design={r.crest} size={28} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={{ color: C.text, fontWeight: '800' }}>{r.name}</Text>
            <Text style={{ color: C.dim, fontSize: 12 }}>{STYLE_MOTTO[r.style]} · empieza con {r.squad.length} futbolistas</Text>
          </View>
        </View>
      ))}
    </>
  );
}

/** Vitrina: títulos, historial y los rivales de tu división. */
export function CareerOverview({ onClose, onAbandon }: { onClose: () => void; onAbandon: () => void }) {
  const c = loadCareer()?.career;
  const [confirm, setConfirm] = useState(false);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={[s.row, { marginBottom: 12 }]}>
        <Text style={[s.h1, { flex: 1 }]}>Mi carrera</Text>
        <Btn small kind="ghost" label="Cerrar" onPress={onClose} />
      </View>
      {!c ? (
        <Text style={s.p}>Aún no has empezado una carrera.</Text>
      ) : (
        <>
          <View style={[s.panel, { alignItems: 'center', borderColor: C.good }]}>
            <Overline>{c.club.name.toUpperCase()}</Overline>
            <Text style={{ color: C.text, fontSize: 26, ...DISPLAY, marginTop: 4 }}>{DIVISIONS[c.division].name}</Text>
            <Text style={{ color: C.dim, marginTop: 2 }}>{leagueLabel(c.league)} · temporada {c.season} · empiezas con {careerBudget(c)}M</Text>
            <Text style={{ color: C.accent, fontWeight: '900', fontSize: 18, marginTop: 8 }}>🏆 {c.titles} título{c.titles === 1 ? '' : 's'} de la Liga de Campeones</Text>
            <View style={[s.row, { gap: 6, marginTop: 10 }]}>
              {DIVISIONS.map((d, i) => (
                <View key={d.key} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i <= c.division ? C.good : C.panelAlt }} />
              ))}
            </View>
          </View>
          <View style={s.panel}>
            <Overline>RIVALES DE ESTA DIVISIÓN</Overline>
            <Rivals c={c} />
          </View>
          <View style={s.panel}>
            <Overline>HISTORIAL</Overline>
            <History c={c} />
          </View>
          {confirm ? (
            <View style={[s.panel, { borderColor: C.danger }]}>
              <Text style={{ color: C.text, fontWeight: '700', marginBottom: 10 }}>Se borra la carrera entera: plantilla, historial y títulos.</Text>
              <View style={[s.row, { gap: 8 }]}>
                <Btn small kind="danger" label="Sí, empezar de cero" onPress={onAbandon} style={{ flex: 1 }} />
                <Btn small kind="ghost" label="Cancelar" onPress={() => setConfirm(false)} style={{ flex: 1 }} />
              </View>
            </View>
          ) : (
            <Btn small kind="ghost" label="Empezar una carrera nueva" onPress={() => setConfirm(true)} />
          )}
        </>
      )}
    </ScrollView>
  );
}

/** Al terminar una temporada de carrera (dentro de la pantalla final): resultado y siguiente temporada. */
export function CareerEnd({ game, onNext }: { game: GameState; onNext: () => void }) {
  const [c] = useState(() => closeCareerSeason(game));
  const outcome = c?.history[c.history.length - 1]?.outcome;
  useEffect(() => {
    if (outcome === 'ascenso') unlock(['ascenso']);
    if (outcome === 'campeon') unlock(['campeones']);
  }, [outcome]);
  if (!c) return null;
  const last = c.history[c.history.length - 1];
  if (!last) return null;
  const color = OUTCOME_COLOR[last.outcome];
  const text =
    last.outcome === 'campeon'
      ? '¡Lo has conseguido! Defiende el título la próxima temporada.'
      : last.outcome === 'ascenso'
        ? `La próxima temporada juegas en ${DIVISIONS[c.division].name}.`
        : last.outcome === 'descenso'
          ? `La próxima temporada juegas en ${DIVISIONS[c.division].name}. A recuperar la categoría.`
          : `Sigues en ${DIVISIONS[c.division].name}. Hay que quedar primero para subir.`;
  return (
    <View>
      <View style={[s.panel, { borderColor: color, alignItems: 'center' }]}>
        <Overline>MODO CARRERA · TEMPORADA {last.season}</Overline>
        <Text style={{ color, fontSize: 30, ...DISPLAY, marginTop: 4, textAlign: 'center' }}>{OUTCOME_TEXT[last.outcome]}</Text>
        <Text style={[s.p, { textAlign: 'center', marginTop: 4 }]}>{text}</Text>
        <Text style={{ color: C.dim, fontSize: 12, marginTop: 8, textAlign: 'center' }}>
          Te llevas tus {c.squad.length} futbolistas, tu estadio y {c.money}M ({Math.round(CAREER.carryShare * 100)}% de tu caja).
        </Text>
        <Btn icon="stairs-up" label={`Jugar la temporada ${c.season}`} onPress={onNext} style={{ alignSelf: 'stretch', marginTop: 12 }} />
      </View>
      <View style={s.panel}>
        <Overline>HISTORIAL</Overline>
        <History c={c} />
      </View>
    </View>
  );
}
