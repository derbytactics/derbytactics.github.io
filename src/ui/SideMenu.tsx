import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { backendEnabled } from '../account/api';
import { useAccount } from '../account/useAccount';
import { Crest, UserAvatar } from './art';
import { useHistory, useMyClub } from '../account/club';
import { s } from './components';
import { C, DISPLAY } from './theme';
import { I, Icon, IconName } from './icons';

function Item({ icon, label, note, onPress }: { icon: IconName; label: string; note?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [s.row, { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: pressed ? C.panelAlt : 'transparent' }]}
    >
      <View style={{ width: 34 }}>
        <Icon name={icon} size={22} color={C.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 16, fontWeight: '800' }}>{label}</Text>
        {note ? <Text style={{ color: C.dim, fontSize: 12, marginTop: 1 }}>{note}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Menú lateral: tu club, tu historial, tu cuenta y la ayuda. */
export function SideMenu(props: {
  onClose: () => void;
  onClub: () => void;
  onHistory: () => void;
  onAccount: () => void;
  onHelp: () => void;
  onLegal: (tab: 'privacidad' | 'condiciones') => void;
}) {
  const club = useMyClub();
  const history = useHistory();
  const { avatar, profile, session } = useAccount();
  const titles = history.filter((h) => h.position === 1).length;
  const go = (f: () => void) => () => {
    props.onClose();
    f();
  };
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' }}>
      <View style={{ width: '82%', maxWidth: 320, backgroundColor: C.panel, borderRightWidth: 1, borderRightColor: C.line }}>
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 30 }}>
          <View style={{ alignItems: 'center', paddingVertical: 18, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: C.line }}>
            {club ? <Crest name={club.name} color={club.crest.primary} design={club.crest} size={96} /> : null}
            <Text numberOfLines={1} style={{ color: C.text, fontSize: 22, ...DISPLAY, marginTop: 10 }}>{club?.name ?? 'Sin club'}</Text>
            <Text style={{ color: C.dim, fontSize: 12, marginTop: 2 }}>
              {history.length} {history.length === 1 ? 'temporada' : 'temporadas'} · {titles} {titles === 1 ? 'título' : 'títulos'}
            </Text>
          </View>
          <Item icon={I.club} label="Mi club" note="Cambiar nombre y escudo" onPress={go(props.onClub)} />
          <Item icon={I.history} label="Historial de partidas" note={history.length ? `Última: ${history[0].position === 1 ? 'campeón' : `${history[0].position}.º puesto`}` : 'Aún sin partidas terminadas'} onPress={go(props.onHistory)} />
          {backendEnabled() ? (
            <Pressable accessibilityRole="button" onPress={go(props.onAccount)} style={({ pressed }) => [s.row, { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: pressed ? C.panelAlt : 'transparent' }]}>
              <View style={{ width: 34 }}>
                {session ? <UserAvatar id={avatar} size={26} /> : <Icon name="login" size={22} color={C.accent} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 16, fontWeight: '800' }}>{session ? 'Mi cuenta' : 'Entrar con tu cuenta'}</Text>
                <Text style={{ color: C.dim, fontSize: 12, marginTop: 1 }}>{session ? `${profile?.username ?? 'Conectado'} · perfil, ranking y cerrar sesión` : 'Con Google o Apple: guarda tu club y crea salas'}</Text>
              </View>
            </Pressable>
          ) : null}
          <Item icon={I.help} label="Cómo se juega" onPress={go(props.onHelp)} />
          <View style={[s.row, { paddingHorizontal: 14, marginTop: 18 }]}>
            <Pressable accessibilityRole="link" onPress={go(() => props.onLegal('privacidad'))} hitSlop={6}>
              <Text style={{ color: C.faint, fontSize: 12, textDecorationLine: 'underline' }}>Privacidad</Text>
            </Pressable>
            <Text style={{ color: C.faint, fontSize: 12, marginHorizontal: 8 }}>·</Text>
            <Pressable accessibilityRole="link" onPress={go(() => props.onLegal('condiciones'))} hitSlop={6}>
              <Text style={{ color: C.faint, fontSize: 12, textDecorationLine: 'underline' }}>Condiciones de uso</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar el menú" onPress={props.onClose} style={{ flex: 1, backgroundColor: '#000000AA' }} />
    </View>
  );
}
