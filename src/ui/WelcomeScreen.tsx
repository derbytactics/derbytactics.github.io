import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { AuthForm } from './AccountScreen';
import { Logo } from './art';
import { Btn, LegalLinks, s } from './components';
import { C } from './theme';

/** Primera pantalla: entrar con Google o Apple, o jugar como invitado. */
export function WelcomeScreen({ onGuest }: { onGuest: () => void }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Logo size={130} />
        <Text style={{ color: C.text, fontSize: 44, fontWeight: '900', letterSpacing: -1 }}>
          DERBY<Text style={{ color: C.accent }}>TACTICS</Text>
        </Text>
        <Text style={[s.p, { textAlign: 'center', marginTop: 4 }]}>Ficha, amplía tu estadio y gana la liga a golpe de dado.</Text>
      </View>

      <AuthForm />
      <Text style={[s.p, { fontSize: 12, textAlign: 'center', marginBottom: 18 }]}>
        Con cuenta puedes crear salas, guardar tu club y tu historial y entrar en el ranking. La primera vez se crea sola.
      </Text>
      <Btn kind="ghost" label="Jugar como invitado" onPress={onGuest} />
      <Text style={[s.p, { fontSize: 12, textAlign: 'center', marginTop: 8 }]}>
        Como invitado puedes unirte a la sala de un amigo y jugar en este dispositivo.
      </Text>
      <LegalLinks />
    </ScrollView>
  );
}
