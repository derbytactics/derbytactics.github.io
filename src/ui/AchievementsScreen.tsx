import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ACHIEVEMENTS, FOOTBALLERS, POSITIONS, ROLE_NAME, achievement, basePrice, tierForPrice } from '../engine';
import { dismissUnlock, useAlbum, useNextUnlock, useUnlocked } from '../account/achievements';
import { Avatar } from './art';
import { Btn, FootballerCard, Overline, Pop, Popup, RosterContext, s } from './components';
import { Icon, IconName } from './icons';
import { C, DISPLAY, POS_COLOR, SHADOW, TIER_COLOR, TOP_INSET } from './theme';

const fmtDate = (d: string) => d.split('-').reverse().join('/');

function Tabs({ tab, onTab }: { tab: 'logros' | 'album'; onTab: (t: 'logros' | 'album') => void }) {
  return (
    <View style={[s.row, { gap: 8, marginBottom: 12 }]}>
      {(['logros', 'album'] as const).map((t) => (
        <Pressable
          key={t}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === t }}
          onPress={() => onTab(t)}
          style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: tab === t ? C.selLine : C.line, backgroundColor: tab === t ? C.sel : 'transparent' }}
        >
          <Text style={{ color: C.text, fontWeight: '800' }}>{t === 'logros' ? 'Logros' : 'Álbum'}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Progress({ value, total, color }: { value: number; total: number; color: string }) {
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: C.panelAlt, marginTop: 8, overflow: 'hidden' }}>
      <View style={{ width: `${Math.round((value / total) * 100)}%`, height: 8, backgroundColor: color }} />
    </View>
  );
}

function AchievementList() {
  const unlocked = useUnlocked();
  const done = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;
  return (
    <>
      <View style={s.panel}>
        <Overline>LOGROS</Overline>
        <Text style={{ color: C.text, fontSize: 24, ...DISPLAY, marginTop: 2 }}>
          {done} de {ACHIEVEMENTS.length}
        </Text>
        <Progress value={done} total={ACHIEVEMENTS.length} color={C.accent} />
      </View>
      {/* Primero los conseguidos (del más reciente al más antiguo), luego los que faltan. */}
      {[...ACHIEVEMENTS].sort((x, y) => (unlocked[y.id] ?? '').localeCompare(unlocked[x.id] ?? '')).map((a) => {
        const date = unlocked[a.id];
        return (
          <View key={a.id} style={[s.row, s.panel, { paddingVertical: 10, borderColor: date ? C.accent : C.line, opacity: date ? 1 : 0.6 }]}>
            <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: date ? C.accent + '30' : C.panelAlt, marginRight: 10 }}>
              <Icon name={(date ? a.icon : 'lock') as IconName} size={22} color={date ? C.accent : C.faint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontWeight: '800' }}>{a.title}</Text>
              <Text style={{ color: C.dim, fontSize: 12, marginTop: 1 }}>{a.text}</Text>
            </View>
            {date ? <Text style={{ color: C.faint, fontSize: 11, marginLeft: 6 }}>{fmtDate(date)}</Text> : null}
          </View>
        );
      })}
    </>
  );
}

function AlbumGrid() {
  const album = useAlbum();
  const [open, setOpen] = useState<string | null>(null);
  const have = FOOTBALLERS.filter((f) => album[f.id]).length;
  const openEntry = open ? album[open] : null;
  return (
    <>
      <View style={s.panel}>
        <Overline>ÁLBUM DE FUTBOLISTAS</Overline>
        <Text style={{ color: C.text, fontSize: 24, ...DISPLAY, marginTop: 2 }}>
          {have} de {FOOTBALLERS.length}
        </Text>
        <Text style={{ color: C.dim, fontSize: 12, marginTop: 2 }}>Cada futbolista que fichas entra en el álbum con el nombre y la cara de la primera vez.</Text>
        <Progress value={have} total={FOOTBALLERS.length} color={C.good} />
      </View>
      {POSITIONS.map((pos) => {
        const list = FOOTBALLERS.filter((f) => f.position === pos).sort((a, b) => basePrice(b.id) - basePrice(a.id));
        const got = list.filter((f) => album[f.id]).length;
        return (
          <View key={pos} style={s.panel}>
            <View style={s.row}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: POS_COLOR[pos], marginRight: 6 }} />
              <Text style={{ color: C.text, fontWeight: '800', flex: 1 }}>{ROLE_NAME[pos].plural[0].toUpperCase() + ROLE_NAME[pos].plural.slice(1)}</Text>
              <Text style={{ color: C.dim, fontWeight: '700' }}>
                {got}/{list.length}
              </Text>
            </View>
            <View style={[s.row, { flexWrap: 'wrap', gap: 8, marginTop: 10 }]}>
              {list.map((f) => {
                const e = album[f.id];
                const tint = TIER_COLOR[tierForPrice(basePrice(f.id))];
                return (
                  <Pressable
                    key={f.id}
                    accessibilityRole="button"
                    accessibilityLabel={e ? (e.identity?.name ?? f.name) : 'Futbolista sin fichar'}
                    disabled={!e}
                    onPress={() => setOpen(f.id)}
                    style={{ width: '22.5%', alignItems: 'center', paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: e ? tint : C.line, backgroundColor: e ? C.panelAlt : 'transparent' }}
                  >
                    {e ? (
                      <Avatar seed={f.id} who={e.identity} size={44} ring={tint} />
                    ) : (
                      <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderStyle: 'dashed', borderColor: tint, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: tint, fontSize: 20, ...DISPLAY }}>?</Text>
                      </View>
                    )}
                    <Text numberOfLines={1} style={{ color: e ? C.text : C.faint, fontSize: 11, fontWeight: '700', marginTop: 4, paddingHorizontal: 3 }}>
                      {e ? (e.identity?.name ?? f.name).split(' ').slice(-1)[0] : `${basePrice(f.id)}M`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
      {open && openEntry ? (
        <Popup overline="EN TU ÁLBUM" title={openEntry.identity?.name ?? FOOTBALLERS.find((f) => f.id === open)!.name} button="Cerrar" onClose={() => setOpen(null)}>
          <RosterContext.Provider value={openEntry.identity ? { [open]: openEntry.identity } : undefined}>
            <FootballerCard cardId={open} />
          </RosterContext.Provider>
          <Text style={{ color: C.dim, fontSize: 12, textAlign: 'center' }}>Fichado por primera vez el {fmtDate(openEntry.date)}</Text>
        </Popup>
      ) : null}
    </>
  );
}

/** «Logros y álbum», desde el menú lateral. */
export function AchievementsScreen({ onClose, initial = 'logros' }: { onClose: () => void; initial?: 'logros' | 'album' }) {
  const [tab, setTab] = useState(initial);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={[s.row, { marginBottom: 12 }]}>
        <Text style={[s.h1, { flex: 1 }]}>Logros y álbum</Text>
        <Btn small kind="ghost" label="Cerrar" onPress={onClose} />
      </View>
      <Tabs tab={tab} onTab={setTab} />
      {tab === 'logros' ? <AchievementList /> : <AlbumGrid />}
    </ScrollView>
  );
}

/** Aviso flotante «¡Logro desbloqueado!»: se va solo a los pocos segundos o al tocarlo. */
export function AchievementToast() {
  const id = useNextUnlock();
  useEffect(() => {
    if (!id) return;
    const t = setTimeout(dismissUnlock, 3800);
    return () => clearTimeout(t);
  }, [id]);
  if (!id) return null;
  const a = achievement(id);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: TOP_INSET + 10, left: 12, right: 12, alignItems: 'center' }}>
      <Pop trigger={id} style={{ width: '100%', maxWidth: 420 }}>
        <Pressable
          accessibilityRole="alert"
          accessibilityLabel={`Logro desbloqueado: ${a.title}`}
          onPress={dismissUnlock}
          style={[s.row, { backgroundColor: C.panel, borderColor: C.accent, borderWidth: 2, borderRadius: 14, padding: 12, ...SHADOW }]}
        >
          <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: C.accent, marginRight: 10 }}>
            <Icon name={a.icon as IconName} size={24} color={C.accentText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.overline, { color: C.accent }]}>¡LOGRO DESBLOQUEADO!</Text>
            <Text style={{ color: C.text, fontWeight: '900', fontSize: 16 }}>{a.title}</Text>
            <Text style={{ color: C.dim, fontSize: 12 }}>{a.text}</Text>
          </View>
        </Pressable>
      </Pop>
    </View>
  );
}
