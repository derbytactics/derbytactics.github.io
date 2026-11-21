import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { AuthForm } from './AccountScreen';
import { Logo } from './art';
import { Btn, LegalLinks, Wordmark, s } from './components';
import { I, Icon } from './icons';
import { C } from './theme';

/**
 * Portada: entrar con la cuenta o jugar sin ella. Aparece la primera vez y al cerrar sesión;
 * quien juega sin cuenta y ya tiene club entra directo.
 */
export function WelcomeScreen({ onGuest, signedOut }: { onGuest: () => void; signedOut?: boolean }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
      {signedOut ? (
        <View style={[s.panel, s.row, { borderColor: C.good, marginBottom: 20 }]}>
          <Icon name="check-circle" size={22} color={C.good} style={{ marginRight: 10 }} />
          <Text style={{ color: C.text, fontWeight: '700', flex: 1 }}>Has cerrado sesión. Tu club y tu historial siguen guardados en tu cuenta.</Text>
        </View>
      ) : null}
      <View style={{ alignItems: 'center', marginBottom: 28 }}>
        <Logo size={120} />
        <View style={{ marginTop: 8 }}>
          <Wordmark size={46} />
        </View>
        <Text style={[s.p, { textAlign: 'center', marginTop: 4 }]}>Ficha, amplía tu estadio y gana la liga a golpe de dado.</Text>
      </View>

      <AuthForm />
      <Text style={[s.p, { fontSize: 13, textAlign: 'center', marginBottom: 20 }]}>
        Con cuenta guardas tu club y tu historial en cualquier dispositivo, creas salas y entras en el ranking.
      </Text>
      <Btn kind="ghost" icon={I.ball} label="Jugar sin cuenta" onPress={onGuest} />
      <Text style={[s.p, { fontSize: 13, textAlign: 'center', marginTop: 8 }]}>
        Sin cuenta puedes jugar en este dispositivo y unirte a la sala de un amigo. Podrás entrar más tarde desde el menú.
      </Text>
      <LegalLinks />
    </ScrollView>
  );
}
