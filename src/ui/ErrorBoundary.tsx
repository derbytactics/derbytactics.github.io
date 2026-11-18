import React from 'react';
import { Text, View } from 'react-native';
import { backendEnabled, rpc } from '../account/api';
import { Btn, s } from './components';
import { C } from './theme';

let reported = 0;
/** Envía un informe de error al servidor (si hay cuentas configuradas). Nunca lanza. */
export function reportError(message: string, stack?: string, context?: string) {
  if (!backendEnabled() || reported >= 5) return;
  reported += 1;
  rpc('log_client_error', { p_message: String(message).slice(0, 500), p_stack: String(stack ?? '').slice(0, 4000), p_context: String(context ?? '').slice(0, 300) }, false).catch(() => {});
}

/** En navegador, recoge también los errores que no pasan por React. */
export function installGlobalErrorHandlers() {
  const w = globalThis as { addEventListener?: (type: string, cb: (e: any) => void) => void };
  if (typeof w.addEventListener !== 'function') return;
  w.addEventListener('error', (e) => reportError(e?.message ?? 'error', e?.error?.stack, 'window.onerror'));
  w.addEventListener('unhandledrejection', (e) => reportError(String(e?.reason?.message ?? e?.reason ?? 'rejection'), e?.reason?.stack, 'unhandledrejection'));
}

/** Si una pantalla falla, enseña un aviso con salida en lugar de dejar la app en blanco. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode; onReset: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    reportError(error.message, error.stack, (info.componentStack ?? '').slice(0, 300));
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
        <Text style={{ fontSize: 44 }}>🤕</Text>
        <Text style={[s.h1, { textAlign: 'center', marginTop: 8 }]}>Algo ha fallado</Text>
        <Text style={[s.p, { textAlign: 'center', marginVertical: 12 }]}>
          Ha habido un error inesperado. Si tenías una partida en este dispositivo, sigue guardada: vuelve al menú y continúala.
        </Text>
        <Btn
          label="Volver al menú"
          onPress={() => {
            this.setState({ error: null });
            this.props.onReset();
          }}
        />
      </View>
    );
  }
}
