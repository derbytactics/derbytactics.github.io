# Ver la app en tu iPhone

Hay tres formas, de más rápida a más completa.

## 1. Desde Safari (ya funciona)

Abre https://derbytactics.github.io/ en Safari → Compartir → «Añadir a pantalla de inicio». Es la versión web a pantalla completa, con cuentas de Google y Apple.

## 2. App nativa en tu iPhone, compilada en tu Mac (recomendada para probar)

Necesitas Xcode y el iPhone conectado por cable (o en la misma red, si ya lo tienes emparejado con Xcode).

```bash
git clone https://github.com/derbytactics/derbytactics.github.io.git DerbyTactics
cd DerbyTactics
git checkout claude/football-card-game-repo-q6v9z2   # mientras no se cambie la rama principal
npm install
npx expo run:ios --device
```

- Elige tu iPhone en la lista. La primera vez genera la carpeta `ios/` (no se edita a mano) y compila con Xcode.
- Si pide equipo de firma, elige tu equipo de Apple Developer. El identificador es `com.derbytactics.app`, el mismo App ID que creaste para Sign in with Apple.
- En el iPhone, si avisa de desarrollador no fiable: Ajustes → General → VPN y gestión de dispositivos → confía en tu certificado. Y activa el **Modo desarrollador** si lo pide (Ajustes → Privacidad y seguridad).
- Con la app abierta, los cambios del código se recargan solos mientras el Mac siga ejecutando el comando.

## 3. Compilación con EAS (para pasársela a otros)

```bash
npx eas-cli@latest login            # cuenta gratuita de expo.dev
npx eas-cli@latest build -p ios --profile production
npx eas-cli@latest submit -p ios    # la sube a App Store Connect → TestFlight
```

Con TestFlight puedes invitar a amigos por correo sin publicar en la App Store. El plan gratuito de EAS compila en cola (puede tardar).

## Antes de entrar con Google o Apple en la app nativa

En Supabase → Authentication → URL Configuration → Redirect URLs, añade `derbytactics://**`. Sin eso, después de elegir la cuenta se vuelve a la web en lugar de a la app.

## Estado

La app nativa no se ha ejecutado nunca en un dispositivo real: lo de este documento es su primera prueba. Si algo falla, copia el error que salga en la terminal o en la pantalla.
