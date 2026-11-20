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
- Recuperación de contraseña por correo y borrado de cuenta desde el perfil.
- **Club e historial de temporadas:** el club (nombre y escudo) y las temporadas terminadas, en línea o en un dispositivo, se guardan en la cuenta (`set_my_club`, `save_seasons`, `my_seasons`). Al entrar se juntan con lo del dispositivo: se sube lo que falte y, si la cuenta ya tenía club, se usa ese salvo que se haya cambiado en este dispositivo con la misma cuenta. Lo guardado por otra cuenta en el mismo dispositivo no se mezcla.
- **Avatar** a elegir entre un conjunto de retratos; con cuenta se guarda en el perfil y, como invitado, en el dispositivo.
- Al abrir el juego se elige entre **entrar con tu cuenta** o **jugar como invitado**.

## Puesta en marcha (unos 10 minutos, gratis)

1. Crea una cuenta y un proyecto en [supabase.com](https://supabase.com) (plan gratuito).
2. En el **editor SQL** del proyecto, pega el contenido de [`supabase/schema.sql`](../supabase/schema.sql) y ejecútalo.
3. En **Authentication → URL Configuration**, pon como *Site URL* la dirección del juego (`https://juanrafernandez.github.io/DerbyTactics/`) y añade `https://juanrafernandez.github.io/DerbyTactics/**` en *Redirect URLs*. Si no, los enlaces de los correos llevan a `localhost:3000` y no funcionan.
4. Decide si quieres confirmación por correo (**Authentication → Providers → Email → Confirm email**). El envío de correos incluido en el plan gratuito está muy limitado: para probar con amigos es más cómodo desactivarla. Con ella activada, y para recuperar contraseñas, conviene configurar un servidor de correo propio.
5. En **Project Settings → API**, copia la *Project URL* y la clave pública (*anon* / *publishable*).
6. En GitHub, en **Settings → Secrets and variables → Actions → Variables** del repositorio, crea:
   - `SUPABASE_URL` con la Project URL.
   - `SUPABASE_ANON_KEY` con la clave pública.
7. Vuelve a publicar la web (cualquier cambio subido lo hace, o «Run workflow» en la pestaña Actions).

La clave pública está pensada para ir en el cliente: no da acceso a las tablas, que solo se pueden usar a través de las funciones de `schema.sql`. **No uses nunca la clave `service_role` en el juego.**

Los nombres de los menús de Supabase pueden cambiar; estos pasos no se han podido comprobar contra un proyecto real (ver «Límites»).

Para desarrollo local, exporta `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` antes de `npm run web`.

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
