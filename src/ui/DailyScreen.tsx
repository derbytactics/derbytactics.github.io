import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, Share, Text, View } from 'react-native';
import { backendEnabled } from '../account/api';
import { useAccount } from '../account/useAccount';
import { unlock } from '../account/achievements';
import { DAILY, GameState, dailyKey, dailyLeague, dailyNumber } from '../engine';
import { DailyRankingRow, DailyResult, dailyRanking, dailyStreak, recordDaily, shareText, todayResult } from '../account/daily';
import { Btn, Overline, leagueLabel, s } from './components';
import { I, Icon } from './icons';
import { C, DISPLAY } from './theme';

const URL = 'https://derbytactics.github.io/';

/** Tarjeta del reto de hoy en «Jugar aquí». */
export function DailyCard({ playing, onPlay, onResult, primary = true }: { playing: boolean; onPlay: () => void; onResult: () => void; primary?: boolean }) {
  const day = dailyKey();
  const done = todayResult();
  const streak = dailyStreak(day);
  return (
    <View style={[s.panel, { borderColor: C.accent }]}>
      <View style={s.row}>
        <Icon name="calendar-star" size={22} color={C.accent} style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Overline>RETO DIARIO #{dailyNumber(day)} · {leagueLabel(dailyLeague(day)).toUpperCase()}</Overline>
          <Text style={{ color: C.text, fontWeight: '800', marginTop: 1 }}>
            {DAILY.jornadas} jornadas contra {DAILY.clubs - 1} rivales: el mismo partido para todo el mundo
          </Text>
        </View>
        {streak > 0 ? (
          <View style={{ alignItems: 'center', marginLeft: 8 }}>
            <Text style={{ fontSize: 20 }}>🔥</Text>
            <Text style={{ color: C.accent, fontWeight: '900', fontSize: 12 }}>{streak} {streak === 1 ? 'día' : 'días'}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ marginTop: 10 }}>
        {done ? (
          <Btn kind="ghost" icon={I.trophy} label={`Hoy: ${done.position}.º · ${done.points} pts · ver resultado`} onPress={onResult} />
        ) : (
          <Btn kind={primary ? 'primary' : 'secondary'} icon="calendar-star" label={playing ? 'Continuar el reto de hoy' : 'Jugar el reto de hoy'} onPress={onPlay} />
        )}
      </View>
      <Text style={{ color: C.faint, fontSize: 12, marginTop: 6, textAlign: 'center' }}>
        {done ? 'Vuelve mañana para el siguiente.' : 'Un intento al día. Juega cada día para mantener la racha.'}
      </Text>
    </View>
  );
}

async function share(text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (Platform.OS !== 'web') {
      await Share.share({ message: text });
      return 'shared';
    }
    const nav = (globalThis as { navigator?: Navigator }).navigator;
    if (nav?.share) {
      await nav.share({ text });
      return 'shared';
    }
    await nav?.clipboard?.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** Resultado del reto: puesto, racha, compartir y ranking del día. */
export function DailyResultView({ result }: { result: DailyResult }) {
  const { session, profile } = useAccount();
  const streak = dailyStreak(result.day);
  const [rows, setRows] = useState<DailyRankingRow[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const text = shareText(result, streak, URL);
  useEffect(() => {
    if (!backendEnabled()) return;
    // Se pide un poco después, para dar tiempo a que llegue el propio resultado.
    const t = setTimeout(() => dailyRanking(result.day).then(setRows, () => setRows([])), 1200);
    return () => clearTimeout(t);
  }, [result.day]);
  return (
    <View>
      <View style={[s.panel, { borderColor: C.accent, alignItems: 'center' }]}>
        <Overline>RETO DIARIO #{result.number}</Overline>
        <Text style={{ color: C.text, fontSize: 40, ...DISPLAY, marginTop: 4 }}>
          {result.position}.º <Text style={{ color: C.dim, fontSize: 20 }}>de {result.clubs}</Text>
        </Text>
        <Text style={{ color: C.text, fontWeight: '800', marginTop: 2 }}>
          {result.points} puntos · goles {result.goals}-{result.against}
        </Text>
        {streak > 0 ? <Text style={{ color: C.accent, fontWeight: '900', marginTop: 6 }}>🔥 {streak} {streak === 1 ? 'día' : 'días seguidos'}</Text> : null}
        <View style={{ backgroundColor: C.panelAlt, borderRadius: 10, padding: 10, marginTop: 12, alignSelf: 'stretch' }}>
          <Text style={{ color: C.dim, fontSize: 13, lineHeight: 19 }}>{text}</Text>
        </View>
        <Btn
          icon="share-variant"
          label="Compartir resultado"
          onPress={() => share(text).then((r) => setNote(r === 'copied' ? 'Copiado: pégalo donde quieras.' : r === 'failed' ? 'No se ha podido compartir.' : null))}
          style={{ alignSelf: 'stretch', marginTop: 10 }}
        />
        {note ? <Text style={{ color: C.dim, marginTop: 6 }}>{note}</Text> : null}
      </View>
      {backendEnabled() ? (
        <View style={s.panel}>
          <Overline>RANKING DEL DÍA</Overline>
          {!session ? <Text style={[s.p, { marginTop: 6 }]}>Entra con tu cuenta para salir en el ranking del reto.</Text> : null}
          {rows === null ? <Text style={[s.p, { marginTop: 6 }]}>Cargando…</Text> : rows.length === 0 ? <Text style={[s.p, { marginTop: 6 }]}>Aún no hay resultados hoy.</Text> : null}
          {(rows ?? []).map((r, i) => (
            <View key={r.username} style={[s.row, s.tr, r.username === profile?.username && { backgroundColor: C.panelAlt }]}>
              <Text style={{ color: i < 3 ? C.accent : C.faint, width: 26, fontWeight: '800' }}>{i + 1}</Text>
              <Text numberOfLines={1} style={{ color: C.text, flex: 1, fontWeight: '700' }}>{r.username}</Text>
              <Text style={{ color: C.dim, width: 54, textAlign: 'right' }}>{r.goals}-{r.against}</Text>
              <Text style={{ color: C.accent, width: 56, textAlign: 'right', fontWeight: '900' }}>{r.points} pts</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Al terminar el reto (dentro de la pantalla final): se apunta el resultado y se enseña. */
export function DailyEnd({ game }: { game: GameState }) {
  const [result] = useState(() => recordDaily(game));
  useEffect(() => {
    if (result) unlock(dailyStreak() >= 7 ? ['reto', 'racha7'] : ['reto']);
  }, [result]);
  return result ? <DailyResultView result={result} /> : null;
}

/** «Ver resultado» desde el menú: el reto de hoy ya jugado. */
export function DailyResultScreen({ onClose }: { onClose: () => void }) {
  const result = todayResult();
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={[s.row, { marginBottom: 12 }]}>
        <Text style={[s.h1, { flex: 1 }]}>Reto de hoy</Text>
        <Btn small kind="ghost" label="Cerrar" onPress={onClose} />
      </View>
      {result ? <DailyResultView result={result} /> : <Text style={s.p}>Aún no has jugado el reto de hoy.</Text>}
    </ScrollView>
  );
}
