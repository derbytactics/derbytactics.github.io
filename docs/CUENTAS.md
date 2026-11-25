# Cuentas, historial, ranking y anfitriones

Las cuentas son opcionales: si el juego se compila sin los datos del servidor, funciona como antes (cualquiera crea salas y no se guarda nada). Con ellos:

- **Solo los usuarios registrados pueden crear salas.** Para unirse a la sala de un amigo no hace falta cuenta.
- **Historial:** cada usuario ve sus partidas en línea, con la clasificación final y quién fue el anfitrión.
- **Ranking por victorias.** Solo puntúan las partidas en línea terminadas con **al menos dos usuarios registrados**; el resto se guardan como amistosas.
- **Reputación del anfitrión:** al acabar, los invitados registrados le valoran de 1 a 5 estrellas. Su media y sus partidas terminadas y abandonadas se ven en la sala de espera.
- **Sanciones temporales** (no puede crear salas):
  - Dos o más partidas abandonadas en 7 días: 24 horas por cada abandono a partir del segundo (máximo 7 días).
  - Media inferior a 2,5 estrellas en sus 5 últimas valoraciones, con al menos 3: 24 horas.
- **Qué cuenta como abandono:** que el anfitrión salga con la partida a medias, que pase 30 minutos sin dar señales, o que un invitado avise tras 10 minutos sin señales.
- **Se entra con Google o con Apple**, sin contraseñas ni correos de confirmación. La primera vez se elige un nombre de usuario. La cuenta se borra desde el perfil.
- **Club e historial de temporadas:** el club (nombre y escudo) y las temporadas terminadas, en línea o en un dispositivo, se guardan en la cuenta (`set_my_club`, `save_seasons`, `my_seasons`). Al entrar se juntan con lo del dispositivo: se sube lo que falte y, si la cuenta ya tenía club, se usa ese salvo que se haya cambiado en este dispositivo con la misma cuenta. Lo guardado por otra cuenta en el mismo dispositivo no se mezcla.
- **Avisos «Te toca» (push, desde la 1.1.0):** al entrar con cuenta en una sala en línea, la app pide permiso de avisos y guarda el identificador de avisos de Expo del móvil (`set_push_token`; tabla `push_tokens`, hasta 5 móviles por cuenta). Cuando a un invitado le toca, el móvil del anfitrión llama a `notify_turn(partida, asiento, qué)`: solo el anfitrión de una partida en juego puede hacerlo, solo a asientos con cuenta y como mucho un aviso cada 15 s por persona y partida (`push_log`). La base de datos manda el aviso al servicio de Expo con `pg_net`. Al cerrar sesión, `clear_push_token` lo borra. Con la app abierta no se enseña el aviso (ya vibra); al tocarlo se vuelve a la sala.
- **Logros y álbum:** se guardan en la cuenta (`save_collection`, `my_collection`; tabla `collections`). El servidor junta lo que recibe con lo que tenía y nunca borra nada: de cada logro se queda la fecha más antigua y del álbum, la primera entrada de cada futbolista. Al entrar se juntan con lo del dispositivo (lo de invitado se suma; lo de otra cuenta, no) y cada novedad se sube al momento. Al cerrar sesión se borran del dispositivo.
- **Nombres ofensivos:** el mismo filtro en la app (`src/engine/moderation.ts`) y en el servidor (`is_offensive` en `schema.sql`) rechaza nombres de usuario y de club ofensivos; el anfitrión cambia por uno al azar el nombre ofensivo de un invitado. Desde el ranking se puede **denunciar** un nombre: con tres personas distintas se retira solo y su dueño debe elegir otro. Las denuncias quedan en la tabla `name_reports` (Supabase → Table Editor) por si quieres revisarlas. En la sala de espera, el anfitrión puede **expulsar** a un invitado.
- **Avatar** a elegir entre un conjunto de retratos; con cuenta se guarda en el perfil y, como invitado, en el dispositivo.
- Al abrir el juego se elige entre **entrar con Google o Apple** o **jugar como invitado**.

## Puesta en marcha (unos 10 minutos, gratis)

1. Crea una cuenta y un proyecto en [supabase.com](https://supabase.com) (plan gratuito).
2. En el **editor SQL** del proyecto, pega el contenido de [`supabase/schema.sql`](../supabase/schema.sql) y ejecútalo.
3. En **Authentication → URL Configuration**, pon como *Site URL* la dirección del juego (`https://derbytactics.github.io/`) y añade en *Redirect URLs*:
   - `https://derbytactics.github.io/**` (la web)
   - `derbytactics://**` (la app de iPhone y Android)
4. Configura Google y Apple (apartado siguiente) y, en **Authentication → Sign In / Providers → Email**, desactiva el acceso con correo: el juego ya no lo ofrece.
5. En **Project Settings → API**, copia la *Project URL* y la clave pública (*anon* / *publishable*).
6. En GitHub, en **Settings → Secrets and variables → Actions → Variables** del repositorio, crea:
   - `SUPABASE_URL` con la Project URL.
   - `SUPABASE_ANON_KEY` con la clave pública.
7. Vuelve a publicar la web (cualquier cambio subido lo hace, o «Run workflow» en la pestaña Actions).

La clave pública está pensada para ir en el cliente: no da acceso a las tablas, que solo se pueden usar a través de las funciones de `schema.sql`. **No uses nunca la clave `service_role` en el juego.**

Los nombres de los menús de Supabase pueden cambiar; estos pasos no se han podido comprobar contra un proyecto real (ver «Límites»).

Para desarrollo local, exporta `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` antes de `npm run web`.

## Entrar con Google y con Apple

Los botones aparecen solos en el juego en cuanto activas cada proveedor en Supabase. Funcionan en la web, en la versión instalada desde el navegador y en la app nativa (que abre una ventana segura del sistema y vuelve con `derbytactics://auth`).

Las cuentas creadas antes con correo y contraseña siguen existiendo. Si su dueño entra con Google usando **el mismo correo**, Supabase la reconoce y conserva su historial. Con Apple solo pasa si comparte su correo real (no el anónimo de reenvío).

Quien entra por primera vez con Google o Apple elige un nombre de usuario: el nombre real no se copia al perfil.

Necesitas la dirección de vuelta de tu proyecto: `https://<id-del-proyecto>.supabase.co/auth/v1/callback`. Aparece en Supabase → **Authentication → Sign In / Providers**, al abrir Google o Apple.

### Google (gratis)

1. En [Google Cloud](https://console.cloud.google.com/), crea un proyecto (por ejemplo «DerbyTactics»).
2. En **Google Auth Platform** (Branding / Audience): nombre de la app, correo de soporte, y en *Audience* elige **External** y publícala (**Publish app**). Mientras esté en «Testing», solo podrán entrar los correos que añadas como usuarios de prueba.
3. En **Data Access** añade el permiso `openid` (los de correo y perfil ya vienen).
4. En **Clients → Create client**, elige **Web application**:
   - *Authorized JavaScript origins*: `https://derbytactics.github.io`
   - *Authorized redirect URIs*: la dirección de vuelta de Supabase (arriba).
5. Copia el **Client ID** y el **Client Secret** en Supabase → **Authentication → Sign In / Providers → Google**, y actívalo.

### Apple (con tu cuenta de desarrollador)

En [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list):

1. **App ID** `com.derbytactics.app` con la capacidad **Sign in with Apple** marcada. Deja vacío el campo de notificaciones de servidor a servidor.
2. **Services ID**, por ejemplo `com.derbytactics.web`, asociado a ese App ID. Actívale **Sign in with Apple → Configure**:
   - *Domains*: `<id-del-proyecto>.supabase.co`
   - *Return URLs*: la dirección de vuelta de Supabase.
3. **Keys → +**, con **Sign in with Apple** marcado y asociada al App ID. Descarga el archivo `AuthKey_XXXXXXXXXX.p8` y guárdalo bien: solo se puede descargar una vez. Apunta el *Key ID* y tu *Team ID* (arriba a la derecha).
4. Genera la clave secreta con la herramienta de la [guía de Supabase para Apple](https://supabase.com/docs/guides/auth/social-sign-in/auth-apple), en Chrome o Firefox (en Safari no funciona). La clave no sale del navegador.
5. En Supabase → **Authentication → Sign In / Providers → Apple**: en *Client IDs* pon el **Services ID** en primer lugar; en *Secret Key*, la clave generada. Actívalo.

**En iPhone, Apple entra de forma nativa** (ventana del sistema, sin web). Para que Supabase acepte esos accesos, en *Client IDs* añade también el App ID detrás del Services ID, separados por coma: `com.derbytactics.web,com.derbytactics.app` (con tu Services ID real primero). En Android, Apple sigue entrando por la web.

**Importante: la clave secreta de Apple caduca a los 6 meses.** Solo afecta a la web y a Android: en iPhone el acceso nativo no la usa. Pon un recordatorio para generar otra con el mismo `.p8` y pegarla en Supabase. Si caduca, nadie podrá entrar con Apple hasta que la renueves (el resto del juego sigue funcionando).

Apple puede dar un correo anónimo de reenvío (`…@privaterelay.appleid.com`) si el usuario elige ocultar el suyo. Es normal.

## Actualizar el esquema

Cuando cambie `supabase/schema.sql` (por ejemplo, al añadirse el avatar al perfil), vuelve a pegarlo entero en el editor SQL y ejecútalo: no borra datos. Hasta entonces el juego funciona, pero lo nuevo no se guarda en la cuenta.

## Cómo funciona

- `supabase/schema.sql` crea las tablas (`profiles`, `games`, `game_players`, `host_ratings`) con acceso directo cerrado, y las funciones que usa el juego.
- El anfitrión registra la partida al empezar (`start_game`) y la cierra con el resultado (`finish_game`). Mientras se juega, manda una señal de vida cada minuto.
- Cada invitado registrado reclama **su propio** asiento (`join_game`): nadie puede apuntar a otra persona en una partida.
- `src/account/api.ts` habla con Supabase por HTTP, sin dependencias.

## Pruebas

- `npm run test:db` ejecuta `supabase/tests.sql` contra un PostgreSQL local: altas, nombres repetidos, permisos, partidas puntuables y amistosas, valoraciones, abandonos y sanciones.
- La app se ha probado de extremo a extremo (registro, crear sala, partida completa de tres dispositivos, guardado, valoración, historial, ranking, cerrar sesión y volver a entrar) contra ese mismo esquema, con una imitación local de las API de Supabase.

## Límites

- **No se ha probado contra un proyecto real de Supabase.** El esquema y los flujos están probados en local, pero la primera conexión real puede sacar algún detalle (formato de respuestas, correos de confirmación, permisos por defecto).
- **El resultado lo comunica el dispositivo del anfitrión.** Un anfitrión tramposo podría falsear el resultado de su propia sala. Lo limita que solo puntúen partidas con dos registrados y que los invitados le valoren, pero no lo impide. Evitarlo del todo exige que la partida se juegue en un servidor.
- **Un invitado puede forzar la marca de abandono** si el anfitrión lleva de verdad 10 minutos sin conexión, aunque haya sido un corte involuntario.
- En la app nativa la sesión no se conserva al cerrar (el almacenamiento local solo está implementado para web).
- El ranking es único y global; no hay temporadas ni grupos de amigos.
