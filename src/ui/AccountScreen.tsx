import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import {
  HistoryRow,
  RankingRow,
  clearLinkError,
  deleteAccount,
  refreshProfile,
  requestPasswordReset,
  resendConfirmation,
  rpc,
  setAvatar,
  setNewPassword,
  signIn,
  signOut,
  signUp,
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
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const { linkError } = useAccount();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  /** Se ofrece reenviar el correo cuando la cuenta está creada pero sin confirmar. */
  const [canResend, setCanResend] = useState(false);
  const resend = () =>
    resendConfirmation(email).then(
      () => setMsg({ ok: true, text: 'Correo reenviado. Abre el enlace más reciente; los anteriores dejan de valer.' }),
      (e: Error) => setMsg({ ok: false, text: e.message }),
    );

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    clearLinkError();
    try {
      if (mode === 'login') await signIn(email, password);
      else if (mode === 'register') {
        if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
        const inside = await signUp(email, password, username);
        if (!inside) {
          setCanResend(true);
          setMsg({ ok: true, text: 'Cuenta creada. Te hemos enviado un correo: abre el enlace para confirmarla y entra.' });
        }
      } else {
        await requestPasswordReset(email);
        setMsg({ ok: true, text: 'Si ese correo tiene cuenta, recibirás un enlace para elegir una contraseña nueva.' });
      }
    } catch (e) {
      const text = (e as Error).message;
      if (/confirma tu correo/i.test(text)) setCanResend(true);
      setMsg({ ok: false, text });
    }
    setBusy(false);
  };

  return (
    <>
      <View style={[s.row, { gap: 8, marginBottom: 16 }]}>
        <Btn small kind={mode === 'login' ? 'primary' : 'ghost'} label="Entrar" onPress={() => { setMode('login'); setMsg(null); }} style={{ flex: 1 }} />
        <Btn small kind={mode === 'register' ? 'primary' : 'ghost'} label="Crear cuenta" onPress={() => { setMode('register'); setMsg(null); }} style={{ flex: 1 }} />
      </View>
      {mode === 'register' ? <Field label="Nombre de usuario" value={username} onChange={setUsername} max={16} /> : null}
      <Field label="Correo" value={email} onChange={setEmail} email />
      {mode !== 'forgot' ? <Field label="Contraseña" value={password} onChange={setPassword} secure /> : null}
      {linkError && !msg ? <Text style={{ color: C.danger, fontWeight: '700', marginBottom: 10 }}>{linkError}</Text> : null}
      {msg ? <Text style={{ color: msg.ok ? C.good : C.danger, fontWeight: '700', marginBottom: 10 }}>{msg.text}</Text> : null}
      {(canResend || linkError) && mode !== 'forgot' ? (
        <Btn small kind="ghost" label="Reenviar el correo de confirmación" onPress={() => (email.trim() ? resend() : setMsg({ ok: false, text: 'Escribe tu correo para reenviarlo.' }))} style={{ marginBottom: 10 }} />
      ) : null}
      <Btn
        kind={busy ? 'muted' : 'primary'}
        label={busy ? 'Un momento…' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Crear mi cuenta' : 'Enviarme el enlace'}
        onPress={() => !busy && submit()}
      />
      {mode === 'login' ? <Btn small kind="ghost" label="He olvidado mi contraseña" onPress={() => { setMode('forgot'); setMsg(null); }} style={{ marginTop: 10 }} /> : null}
      {mode === 'register' ? (
        <Text style={[s.p, { fontSize: 12, marginTop: 12 }]}>
          Al crear la cuenta aceptas las condiciones de uso y la política de privacidad (enlaces abajo). Guardamos tu correo (solo para entrar y recuperar la contraseña), tu nombre de usuario y tus partidas. Puedes borrar la cuenta cuando quieras desde tu perfil.
        </Text>
      ) : null}
    </>
  );
}

function NewPassword() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Text style={[s.p, { marginBottom: 12 }]}>Elige una contraseña nueva para tu cuenta.</Text>
      <Field label="Contraseña nueva" value={password} onChange={setPassword} secure />
      {error ? <Text style={{ color: C.danger, fontWeight: '700', marginBottom: 10 }}>{error}</Text> : null}
      <Btn label="Guardar contraseña" onPress={() => setNewPassword(password).catch((e: Error) => setError(e.message))} />
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
            <Text style={{ color: g.ranked ? C.accent : C.faint, fontSize: 11, fontWeight: '800' }}>{g.ranked ? 'PUNTUABLE' : g.status === 'finished' ? 'AMISTOSA' : ''}</Text>
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
  const { session, recovering } = useAccount();
  const [tab, setTab] = useState<Tab>(initialTab ?? 'perfil');
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={[s.row, { marginBottom: 14 }]}>
        <Text style={[s.h1, { flex: 1 }]}>{recovering ? 'Nueva contraseña' : session ? 'Mi cuenta' : 'Tu cuenta'}</Text>
        <Btn small kind="ghost" label="Cerrar" onPress={onClose} />
      </View>
      {recovering ? (
        <NewPassword />
      ) : (
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
      )}
      <LegalLinks />
    </ScrollView>
  );
}
