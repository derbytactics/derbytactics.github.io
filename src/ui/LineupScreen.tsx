import React, { useContext, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { GameState, Player, activeNumbers, autoLineup, footballer, isBooked, isOut, startersNeeded, ruleWords } from '../engine';
import { Avatar } from './art';
import { Btn, NumberToken, Overline, PhaseStepper, RosterContext, s } from './components';
import { NumberLine } from './GameScreen';
import { Tip } from './Tip';
import { useClubColor } from './clubColors';
import { Icon } from './icons';
import { C, POS_COLOR } from './theme';

/**
 * Convocatoria secreta: el club elige sus titulares para el partido.
 * La tabla de números se calcula contra las plantillas completas de los rivales, no contra sus
 * alineaciones (que son secretas hasta el pitido inicial).
 */
export function LineupScreen({ state, me, onConfirm }: { state: GameState; me: Player; onConfirm: (cardIds: string[]) => string | null }) {
  const clubColor = useClubColor();
  const roster = useContext(RosterContext) ?? state.roster;
  const need = startersNeeded(me);
  const [picked, setPicked] = useState<string[]>(() => me.starters ?? autoLineup(state, me));
  const [error, setError] = useState<string | null>(null);
  const suggestion = autoLineup(state, me);
  const J = state.jornada;
  const rw = ruleWords(state.league);

  const toggle = (id: string) => {
    setError(null);
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= need ? cur : [...cur, id]));
  };
  // Vista previa: yo con estos titulares; los rivales, con toda su plantilla.
  const preview: GameState = {
    ...state,
    players: state.players.map((p) => (p.id === me.id ? { ...p, starters: picked } : { ...p, starters: null })),
  };
  const bench = me.squad.length - need;

  return (
    <View style={{ flex: 1 }}>
      <PhaseStepper step={1} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <Tip id="convocatoria" title="Convocatoria secreta">
          Antes de cada partido eliges quién juega. Los rivales hacen lo mismo a la vez y nadie ve las alineaciones hasta el pitido inicial. Mira con qué números atacan sus plantillas y tapa esos números, o arriesga con más atacantes.
        </Tip>
        <Overline>CONVOCATORIA · JORNADA {J}</Overline>
        <Text style={[s.h1, { marginTop: 2 }]}>Elige tus {need} titulares</Text>
        <Text style={[s.p, { marginTop: 6, marginBottom: 12 }]}>
          Los rivales eligen a la vez y en secreto: las alineaciones se descubren al empezar el partido.
          {bench > 0 ? ` ${bench === 1 ? `${rw.theOne} se quede` : `${rw.theOnes} ${bench} que se queden`} en el banquillo no juega${bench === 1 ? '' : 'n'}.` : ''} Mira en «Rivales» con qué números atacan y defienden sus plantillas.
        </Text>

        <View style={s.panel}>
          <View style={[s.row, { marginBottom: 8 }]}>
            <Overline>CON ESTOS TITULARES</Overline>
            <View style={{ flex: 1 }} />
            <Text style={{ color: picked.length === need ? C.good : C.accent, fontWeight: '800' }}>
              {picked.length}/{need}
            </Text>
          </View>
          <NumberLine player={preview.players[me.id]} jornada={J} state={preview} />
          <Text style={{ color: C.faint, fontSize: 12, marginTop: 4 }}>Calculado contra las plantillas completas de los rivales: no sabes a quién sacarán.</Text>
        </View>

        {me.squad.map((e) => {
          const f = footballer(e.cardId);
          const who = roster?.[f.id];
          const on = picked.includes(e.cardId);
          const out = isOut(e, J);
          return (
            <Pressable
              key={e.cardId}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${who?.name ?? f.name}, ${on ? 'titular' : 'banquillo'}`}
              onPress={() => toggle(e.cardId)}
              style={[s.panel, s.row, { paddingVertical: 10, borderColor: on ? C.accent : C.line, opacity: on ? 1 : 0.72 }]}
            >
              <View>
                <Avatar seed={f.id} who={who} size={44} jersey={clubColor(me.id)} ring={on ? C.accent : C.line} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <View style={s.row}>
                  <Text style={{ color: POS_COLOR[f.position], fontWeight: '900', fontSize: 12, marginRight: 6 }}>{f.position}</Text>
                  <Text numberOfLines={1} style={{ color: C.text, fontWeight: '800', fontSize: 16, flex: 1 }}>{who?.name ?? f.name}</Text>
                </View>
                <View style={[s.row, { gap: 4, marginTop: 4, flexWrap: 'wrap' }]}>
                  {activeNumbers(e, J).map((n) => (
                    <NumberToken key={n} n={n} size={24} />
                  ))}
                  {out ? <Text style={{ color: C.danger, fontSize: 12, fontWeight: '800', marginLeft: 4 }}>De baja</Text> : null}
                  {!out && isBooked(e, J) ? <Text style={{ color: C.accent, fontSize: 12, fontWeight: '800', marginLeft: 4 }}>Amonestado</Text> : null}
                </View>
              </View>
              <View style={{ alignItems: 'center', width: 76 }}>
                <Icon name={on ? 'check-circle' : 'circle-outline'} size={26} color={on ? C.accent : C.faint} />
                <Text style={{ color: on ? C.accent : C.faint, fontSize: 11, fontWeight: '800', marginTop: 2 }}>{on ? 'TITULAR' : 'BANQUILLO'}</Text>
              </View>
            </Pressable>
          );
        })}
        {me.squad.length === 0 ? <Text style={s.p}>No tienes futbolistas: este partido no puedes atacar ni defender.</Text> : null}

        {picked.join() !== suggestion.join() ? (
          <Btn small kind="ghost" label="Usar la alineación que propone la app" onPress={() => setPicked(suggestion)} style={{ marginTop: 4 }} />
        ) : (
          <Text style={{ color: C.faint, fontSize: 12, textAlign: 'center', marginTop: 4 }}>Es la alineación que propone la app. Puedes cambiarla tocando a cada futbolista.</Text>
        )}
      </ScrollView>
      <View style={{ padding: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line }}>
        {error ? <Text style={{ color: C.danger, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>{error}</Text> : null}
        {picked.length !== need ? (
          <Text style={{ color: C.accent, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
            {picked.length < need ? `Te falta${need - picked.length === 1 ? '' : 'n'} ${need - picked.length} titular${need - picked.length === 1 ? '' : 'es'}` : `Sobran titulares: quita ${picked.length - need}`}
          </Text>
        ) : null}
        <Btn
          kind={picked.length === need ? 'primary' : 'muted'}
          icon="check"
          label="Confirmar alineación"
          onPress={() => picked.length === need && setError(onConfirm(picked))}
        />
      </View>
    </View>
  );
}

/** Ya ha enviado su alineación y espera a los demás (en línea). */
export function LineupWaiting({ state, me, waitingFor, onChange, onForce }: { state: GameState; me: Player; waitingFor: string[]; onChange: () => void; onForce?: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <PhaseStepper step={1} />
      <View style={{ padding: 16 }}>
        <Overline>CONVOCATORIA · JORNADA {state.jornada}</Overline>
        <Text style={[s.h1, { marginTop: 2 }]}>Alineación enviada</Text>
        <Text style={[s.p, { marginTop: 6, marginBottom: 14 }]}>
          Esperando a {waitingFor.join(', ') || 'los demás'}. Las alineaciones se descubren cuando todos hayan elegido.
        </Text>
        <View style={s.panel}>
          <Overline>TUS TITULARES</Overline>
          {(me.starters ?? []).map((id) => {
            const f = footballer(id);
            return (
              <Text key={id} style={{ color: C.text, fontWeight: '700', marginTop: 6 }}>
                <Text style={{ color: POS_COLOR[f.position], fontWeight: '900' }}>{f.position} </Text>
                {state.roster?.[f.id]?.name ?? f.name}
              </Text>
            );
          })}
        </View>
        <Btn small kind="ghost" label="Cambiar mi alineación" onPress={onChange} />
        {onForce ? <Btn small kind="ghost" label="¿No responden? Que la IA elija por ellos" onPress={onForce} style={{ marginTop: 10 }} /> : null}
      </View>
    </View>
  );
}
