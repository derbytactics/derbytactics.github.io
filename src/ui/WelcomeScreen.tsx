import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { AuthForm } from './AccountScreen';
import { Logo } from './art';
import { Btn, LegalLinks, s } from './components';
import { C } from './theme';

/** Primera pantalla: entrar con tu cuenta o jugar como invitado. */
export function WelcomeScreen({ onGuest, startWithLogin }: { onGuest: () => void; startWithLogin?: boolean }) {
  const [login, setLogin] = useState(!!startWithLogin);
  // El aviso de un enlace de correo fallido llega un instante después de abrir la app.
  useEffect(() => {
    if (startWithLogin) setLogin(true);
  }, [startWithLogin]);
  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Logo size={login ? 96 : 150} />
        <Text style={{ color: C.text, fontSize: 44, fontWeight: '900', letterSpacing: -1 }}>
          DERBY<Text style={{ color: C.accent }}>TACTICS</Text>
        </Text>
        <Text style={[s.p, { textAlign: 'center', marginTop: 4 }]}>Ficha, amplía tu estadio y gana la liga a golpe de dado.</Text>
      </View>

      {login ? (
        <>
          <AuthForm />
          <Btn kind="ghost" label="← Volver" onPress={() => setLogin(false)} style={{ marginTop: 16 }} />
        </>
      ) : (
        <>
          <Btn label="Entrar o crear cuenta" onPress={() => setLogin(true)} />
          <Text style={[s.p, { fontSize: 12, textAlign: 'center', marginTop: 8, marginBottom: 18 }]}>
            Con cuenta puedes crear salas, guardar tu historial y entrar en el ranking.
          </Text>
          <Btn kind="ghost" label="Jugar como invitado" onPress={onGuest} />
          <Text style={[s.p, { fontSize: 12, textAlign: 'center', marginTop: 8 }]}>
            Como invitado puedes unirte a la sala de un amigo y jugar en este dispositivo.
          </Text>
        </>
      )}
      <LegalLinks />
    </ScrollView>
  );
}
