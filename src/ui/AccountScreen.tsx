import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  HistoryRow,
  Provider,
  chooseUsername,
  signInWith,
  RankingRow,
  deleteAccount,
  refreshProfile,
  rpc,
  setAvatar,
  signOut,
} from '../account/api';
import { useAccount } from '../account/useAccount';
import { Trophy, USER_AVATARS, UserAvatar } from './art';
import { Btn, LegalLinks, Overline, s } from './components';
import { C } from './theme';

type Tab = 'perfil' | 'historial' | 'ranking';

function Field(props: { label: string; value: string; onChange: (t: string) => void; secure?: boolean; email?: boolean; max?: number }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Overline>{props.label.toUpperCase()}</Overline>
      <View style={[s.panel, { paddingVertical: 4, marginTop: 6, marginBottom: 0 }]}>
        <TextInput
          value={props.value}
          onChangeText={props.onChange}
          secureTextEntry={props.secure}
          autoCapitalize={props.email || props.secure ? 'none' : 'words'}
          autoCorrect={false}
          keyboardType={props.email ? 'email-address' : 'default'}
          maxLength={props.max ?? 80}
          accessibilityLabel={props.label}
          placeholderTextColor={C.faint}
          style={{ color: C.text, fontSize: 16, fontWeight: '600', paddingVertical: 8 }}
        />
      </View>
    </View>
  );
}

function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.7 17.8 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 7-10.3 7-17.7z" />
      <Path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" />
      <Path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-5 2.3-8.2 2.3-6.2 0-11.5-4.2-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </Svg>
  );
}

function AppleMark({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#FFFFFF" d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.6 1.3-.1 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.6-1-2.6-4.3zM13.9 4.9c.7-.8 1.2-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z" />
    </Svg>
  );
}

/** Botones de Google y Apple, solo si están activados en el servidor. */
export function ProviderButtons({ providers }: { providers: Provider[] }) {
  if (!providers.length) return null;
  const style = (dark: boolean) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    height: 48,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: dark ? '#000000' : '#FFFFFF',
    borderWidth: 1,
    borderColor: dark ? '#FFFFFF' : '#DADCE0',
  });
  return (
    <View style={{ marginBottom: 6 }}>
      {providers.includes('apple') ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Continuar con Apple" onPress={() => signInWith('apple')} style={style(true)}>
          <AppleMark />
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Continuar con Apple</Text>
        </Pressable>
      ) : null}
      {providers.includes('google') ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Continuar con Google" onPress={() => signInWith('google')} style={style(false)}>
          <GoogleMark />
          <Text style={{ color: '#1F1F1F', fontSize: 16, fontWeight: '700' }}>Continuar con Google</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** La primera vez que se entra con Google o Apple: elegir nombre de usuario (no se usa el nombre real). */
export function UsernamePrompt() {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await chooseUsername(name.trim());
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 32 }}>
      <Text style={s.h1}>Elige tu nombre de usuario</Text>
      <Text style={[s.p, { marginBottom: 16 }]}>
        Es el que verán los demás en las salas y en el ranking. No usamos tu nombre real.
      </Text>
      <Field label="Nombre de usuario" value={name} onChange={setName} max={16} />
      {error ? <Text style={{ color: C.danger, fontWeight: '700', marginBottom: 10 }}>{error}</Text> : null}
      <Btn kind={busy || name.trim().length < 3 ? 'muted' : 'primary'} label={busy ? 'Un momento…' : 'Guardar'} onPress={() => !busy && name.trim().length >= 3 && save()} />
      <Btn small kind="ghost" label="Cerrar sesión" onPress={() => signOut()} style={{ marginTop: 10 }} />
    </ScrollView>
  );
}

/** Estrellas de valoración; con `onPick` se pueden pulsar. */
export function Stars({ value, onPick, size = 20 }: { value: number | null; onPick?: (n: number) => void; size?: number }) {
  return (
    <View style={s.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} disabled={!onPick} onPress={() => onPick?.(n)} accessibilityLabel={`${n} estrellas`} hitSlop={6}>
          <Text style={{ fontSize: size, color: value !== null && n <= Math.round(value) ? C.accent : C.line, marginRight: 2 }}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Selector de avatar: vale con cuenta y como invitado. */
export function AvatarPicker() {
  const { avatar } = useAccount();
  return (
    <View style={s.panel}>
      <Overline>TU AVATAR</Overline>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
        {USER_AVATARS.map((a) => (
          <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={`Avatar ${a.id.slice(1)}`} onPress={() => setAvatar(a.id)} style={{ opacity: a.id === avatar ? 1 : 0.55 }}>
            <UserAvatar id={a.id} size={52} ring={a.id === avatar ? C.accent : C.line} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function AuthForm() {
  const { linkError, providers } = useAccount();
  return (
    <>
      <ProviderButtons providers={providers} />
      {!providers.length ? (
        <Text style={[s.p, { textAlign: 'center', marginBottom: 10 }]}>
          Ahora mismo no se puede entrar con cuenta. Comprueba tu conexión o juega como invitado.
        </Text>
      ) : null}
      {linkError ? <Text style={{ color: C.danger, fontWeight: '700', marginBottom: 10 }}>{linkError}</Text> : null}
    </>
  );
}


function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: C.text, fontSize: 26, fontWeight: '900' }}>{value}</Text>
      <Text style={s.overline}>{label}</Text>
    </View>
  );
}

function ProfileTab() {
  const { profile, session } = useAccount();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    refreshProfile();
  }, []);
  if (!profile) return <Text style={s.p}>Cargando tu perfil…</Text>;
  const banned = profile.host_banned_until ? formatDate(profile.host_banned_until) : null;
  return (
    <>
      <View style={s.panel}>
        <Overline>{session?.user.email}</Overline>
        <Text style={[s.h1, { marginTop: 2 }]}>{profile.username}</Text>
        <View style={[s.row, { marginTop: 14 }]}>
          <StatBox label="VICTORIAS" value={`${profile.wins}`} />
          <StatBox label="PARTIDAS" value={`${profile.games}`} />
          <StatBox label="% VICTORIAS" value={profile.games ? `${Math.round((100 * profile.wins) / profile.games)}%` : '–'} />
        </View>
      </View>

      <View style={[s.panel, banned ? { borderColor: C.danger } : null]}>
        <Overline>COMO ANFITRIÓN</Overline>
        <View style={[s.row, { marginTop: 8 }]}>
          <Stars value={profile.stars} size={24} />
          <Text style={{ color: C.text, fontWeight: '800', marginLeft: 8 }}>
            {profile.stars !== null ? `${profile.stars} · ${profile.votes} ${profile.votes === 1 ? 'valoración' : 'valoraciones'}` : 'Sin valoraciones todavía'}
          </Text>
        </View>
        <Text style={[s.p, { marginTop: 6 }]}>
          {profile.host_games} partidas terminadas · {profile.host_abandons} abandonadas
        </Text>
        {banned ? (
          <Text style={{ color: C.danger, fontWeight: '800', marginTop: 8 }}>Sancionado: no puedes crear salas hasta el {banned}.</Text>
        ) : (
          <Text style={[s.p, { fontSize: 12, marginTop: 8 }]}>
            Abandonar dos partidas en una semana, o tener una media por debajo de 2,5 estrellas en tus últimas valoraciones, impide crear salas durante un tiempo.
          </Text>
        )}
      </View>

      <Btn kind="ghost" label="Cerrar sesión" onPress={() => signOut()} />
      {error ? <Text style={{ color: C.danger, fontWeight: '700', marginTop: 10 }}>{error}</Text> : null}
      {confirm ? (
        <View style={[s.panel, { borderColor: C.danger, marginTop: 12 }]}>
          <Text style={{ color: C.text, fontWeight: '700', marginBottom: 10 }}>Se borrarán tu cuenta, tus victorias y tu historial. No se puede deshacer.</Text>
          <View style={[s.row, { gap: 8 }]}>
            <Btn small kind="danger" label="Sí, borrar mi cuenta" onPress={() => deleteAccount().catch((e: Error) => setError(e.message))} style={{ flex: 1 }} />
            <Btn small kind="ghost" label="Cancelar" onPress={() => setConfirm(false)} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <Btn small kind="ghost" label="Borrar mi cuenta" onPress={() => setConfirm(true)} style={{ marginTop: 10 }} />
      )}
    </>
  );
}

const STATUS: Record<HistoryRow['status'], string> = { playing: 'En juego', finished: 'Terminada', abandoned: 'Abandonada' };

function HistoryTab() {
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadRows = () => rpc<HistoryRow[]>('my_history').then(setRows, (e: Error) => setError(e.message));
  useEffect(() => {
    loadRows();
  }, []);
  if (error) return <Text style={{ color: C.danger }}>{error}</Text>;
  if (!rows) return <Text style={s.p}>Cargando…</Text>;
  if (rows.length === 0) return <Text style={s.p}>Aún no has jugado ninguna partida en línea con tu cuenta. Tus temporadas, también las de un dispositivo, están en el menú → Historial de partidas.</Text>;
  return (
    <>
      <Text style={[s.p, { fontSize: 12, marginBottom: 10 }]}>Salas en línea en las que has jugado, con su anfitrión. Todas tus temporadas, también las de un dispositivo, están en el menú → Historial de partidas.</Text>
      {rows.map((g) => (
        <View key={g.id} style={s.panel}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Overline>
                {formatDate(g.started_at)} · SALA {g.code}
              </Overline>
              <Text style={{ color: C.text, fontSize: 18, fontWeight: '900', marginTop: 2 }}>
                {g.status === 'finished' && g.position ? (g.position === 1 ? '🏆 Campeón' : `${g.position}.º puesto`) : STATUS[g.status]}
              </Text>
            </View>
            <Text style={{ color: g.ranked ? C.accent : C.faint, fontSize: 12, fontWeight: '800' }}>{g.ranked ? 'PUNTUABLE' : g.status === 'finished' ? 'AMISTOSA' : ''}</Text>
          </View>
          <View style={{ marginTop: 8 }}>
            {g.players.map((p, i) => (
              <View key={i} style={[s.row, { paddingVertical: 2 }]}>
                <Text style={{ color: C.faint, width: 22 }}>{p.position ?? '–'}</Text>
                <Text numberOfLines={1} style={{ color: C.text, flex: 1, fontWeight: '600' }}>
                  {p.name}
                  {p.is_bot ? <Text style={{ color: C.faint }}> · IA</Text> : null}
                </Text>
                <Text style={{ color: C.dim }}>{p.points !== null ? `${p.points} pts` : ''}</Text>
              </View>
            ))}
          </View>
          <View style={[s.row, { marginTop: 8, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 }]}>
            <Text style={[s.p, { flex: 1, fontSize: 12 }]}>{g.i_hosted ? 'Fuiste el anfitrión' : `Anfitrión: ${g.host}`}</Text>
            {!g.i_hosted && g.status !== 'playing' ? (
              <Stars value={g.my_rating} onPick={(n) => rpc('rate_host', { p_game: g.id, p_stars: n }).then(loadRows, (e: Error) => setError(e.message))} />
            ) : null}
          </View>
        </View>
      ))}
    </>
  );
}

function RankingTab() {
  const { profile } = useAccount();
  const [rows, setRows] = useState<RankingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    rpc<RankingRow[]>('ranking', {}, false).then(setRows, (e: Error) => setError(e.message));
  }, []);
  if (error) return <Text style={{ color: C.danger }}>{error}</Text>;
  if (!rows) return <Text style={s.p}>Cargando…</Text>;
  if (rows.length === 0) return <Text style={s.p}>Todavía no hay partidas puntuables. Cuentan las partidas en línea terminadas con al menos dos usuarios registrados.</Text>;
  return (
    <View style={s.panel}>
      <View style={[s.row, { marginBottom: 6 }]}>
        <Text style={[s.th, { flex: 1, textAlign: 'left' }]}>RANKING POR VICTORIAS</Text>
        <Text style={[s.th, { width: 44 }]}>VIC</Text>
        <Text style={[s.th, { width: 44 }]}>PART</Text>
        <Text style={[s.th, { width: 48 }]}>%</Text>
      </View>
      {rows.map((r, i) => (
        <View key={r.username} style={[s.row, s.tr, r.username === profile?.username && { backgroundColor: C.panelAlt }]}>
          <Text style={{ color: i < 3 ? C.accent : C.faint, width: 26, fontWeight: '800' }}>{i + 1}</Text>
          <Text numberOfLines={1} style={{ color: C.text, flex: 1, fontWeight: '700' }}>{r.username}</Text>
          <Text style={[s.td, { width: 44, color: C.accent, fontWeight: '900', fontSize: 15 }]}>{r.wins}</Text>
          <Text style={[s.td, { width: 44 }]}>{r.games}</Text>
          <Text style={[s.td, { width: 48 }]}>{Math.round((100 * r.wins) / r.games)}%</Text>
        </View>
      ))}
      <Text style={[s.p, { fontSize: 12, marginTop: 8 }]}>Cuentan las partidas en línea terminadas con al menos dos usuarios registrados.</Text>
    </View>
  );
}

export function AccountScreen({ onClose, initialTab }: { onClose: () => void; initialTab?: Tab }) {
  const { session } = useAccount();
  const [tab, setTab] = useState<Tab>(initialTab ?? 'perfil');
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={[s.row, { marginBottom: 14 }]}>
        <Text style={[s.h1, { flex: 1 }]}>{session ? 'Mi cuenta' : 'Tu cuenta'}</Text>
        <Btn small kind="ghost" label="Cerrar" onPress={onClose} />
      </View>
      <>
          <AvatarPicker />
          <View style={[s.row, { gap: 8, marginBottom: 14 }]}>
            <Btn small kind={tab === 'perfil' ? 'primary' : 'ghost'} label={session ? 'Perfil' : 'Entrar'} onPress={() => setTab('perfil')} style={{ flex: 1 }} />
            <Btn small kind={tab === 'historial' ? 'primary' : 'ghost'} label="Salas" onPress={() => setTab('historial')} style={{ flex: 1 }} />
            <Btn small kind={tab === 'ranking' ? 'primary' : 'ghost'} label="Ranking" onPress={() => setTab('ranking')} style={{ flex: 1 }} />
          </View>
          {tab === 'ranking' ? (
            <RankingTab />
          ) : !session ? (
            <>
              {tab === 'historial' ? <Text style={[s.p, { marginBottom: 12 }]}>Entra con tu cuenta para ver tus salas en línea.</Text> : (
                <View style={{ alignItems: 'center', marginBottom: 10 }}>
                  <Trophy size={64} />
                  <Text style={[s.p, { textAlign: 'center', marginTop: 6 }]}>Con una cuenta puedes crear salas, guardar tu club y tu historial para recuperarlos en otro dispositivo, y aparecer en el ranking. Para unirte a la sala de un amigo no hace falta.</Text>
                </View>
              )}
              <AuthForm />
            </>
          ) : tab === 'perfil' ? (
            <ProfileTab />
          ) : (
            <HistoryTab />
          )}
      </>
      <LegalLinks />
    </ScrollView>
  );
}
