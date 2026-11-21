# Salida a producción

Estado de cada punto y qué queda por hacer. Lo marcado como **Tu parte** necesita una decisión, una cuenta o un dato que solo tiene el titular del juego.

## Hecho

| Punto | Qué hay |
|---|---|
| Textos legales | Política de privacidad y condiciones de uso en `src/legal/texts.ts`, enlazadas desde la bienvenida, el menú, la ayuda y la cuenta. Salen marcadas como **borrador** hasta que se rellenen titular y contacto. |
| Partida guardada | La partida de un solo dispositivo se guarda tras cada jugada y se continúa desde el menú. |
| Sesión en la app nativa | El almacenamiento local funciona también fuera del navegador (sesión, avatar, partida guardada). |
| Errores | Pantalla de error con salida al menú, y registro de errores en la tabla `client_errors` de Supabase. |
| Integración continua | En cada subida: tipos, tests, lint (avisa, no bloquea), pruebas del esquema SQL contra PostgreSQL y publicación de la web. |
| IA | La IA ficha mirando los números de los rivales. |
| Mesas de 2 | Derechos de TV (5M) y una carta especial por jornada. |
| Primera partida | Consejos de primera vez en mercado, club, rivales y partido; se pueden volver a ver desde la ayuda. |
| Sonido | Efectos sintetizados en navegador, con botón de silencio. |
| Icono y configuración de apps | Iconos, pantalla de arranque y favicon generados a partir del logotipo; `app.json` y `eas.json` preparados. |
| Móvil | Probado en navegador emulando un iPhone: sin desbordes y con una temporada completa jugada. |

## Costes: cómo publicar sin gastar

| Pieza | Coste | Notas |
|---|---|---|
| Web en GitHub Pages | Gratis | Sin límite práctico para este juego. |
| Instalar en el móvil desde la web (PWA) | Gratis | Icono en la pantalla de inicio y pantalla completa, sin tiendas. Instrucciones en la ayuda del juego. |
| Cuentas en Supabase (plan gratuito) | Gratis | Hasta 50.000 usuarios activos al mes y 500 MB de base de datos, de sobra. **El proyecto se pausa tras 7 días sin uso**: se reactiva a mano desde el panel. |
| Partidas en línea (Supabase Realtime) | Gratis | Hasta 200 conexiones a la vez (unas 25 salas de 8) y 100 mensajes por segundo. Si Supabase no responde, se usan servidores públicos. |
| Servidor propio con funciones de Supabase | Gratis dentro del plan gratuito | Solo hace falta si se abre a desconocidos con ranking. |
| Correo de confirmación | Gratis | Desactivando la confirmación por correo. Un SMTP gratuito (Brevo, Resend) necesita dominio propio. |
| Dominio propio | ~10 €/año | Opcional. Sin él, la dirección es `juanrafernandez.github.io/DerbyTactics`. |
| Marca en la OEPM (España) | ~150 € la primera clase, cada año revisan la tasa | Opcional. Usar un nombre no registrado es legal; registrarlo solo protege frente a que otro lo registre. |
| Marca en la EUIPO (UE) | ~850 € | Opcional. |
| App Store | 99 $/año | Opcional: la PWA cubre iPhone gratis. |
| Google Play | 25 $ una vez | Opcional: la PWA cubre Android gratis. |
| Compilar con EAS | Gratis (plan gratuito, con cola) | Solo si se va a tiendas. |

**Recomendación sin presupuesto:** web + PWA + Supabase gratis. Coste cero. Si el juego engancha, el primer gasto con sentido es Google Play (25 $), y después la marca.

## Dirección sin tu nombre de usuario (gratis)

Hoy la web es `juanrafernandez.github.io/DerbyTactics`. Para quitar el usuario sin pagar:

1. En GitHub, **+ → New organization → Free**, con el nombre `derbytactics` (o el que esté libre).
2. En el repositorio, **Settings → General → Danger Zone → Transfer**, y pásalo a la organización.
3. En la organización, renombra el repositorio a `derbytactics.github.io`. La web queda en `https://derbytactics.github.io/`, sin ruta. La publicación ya lo detecta sola.
4. En el repositorio, **Settings → Pages → Source: GitHub Actions**, y en **Settings → Secrets and variables → Actions → Variables** vuelve a crear `SUPABASE_URL` y `SUPABASE_ANON_KEY` si no se han conservado.
5. **Actions → Publicar web en GitHub Pages → Run workflow**.
6. En Supabase, cambia la *Site URL* y las *Redirect URLs* a la dirección nueva.

Tu nombre seguirá apareciendo como titular en los textos legales: la ley exige identificar al responsable de los datos. Solo desaparecería si el titular fuese una empresa o asociación.

## Tu parte

Ordenados por prioridad. Cada paso dice dónde se hace.

### 1. Nombre

Decidido: **DerbyTactics** (FutCards ya lo usa otra app y «FUT» recuerda a *FIFA Ultimate Team*). Ya cambiado en el juego, en `app.json` (`com.derbytactics.app`) y en los textos legales.

Queda de tu parte:

- Confirmar que está libre en [OEPM](https://consultas2.oepm.es/LocalizadorWeb/) y [EUIPO](https://euipo.europa.eu/eSearch/) (clases 9 y 41: software y juegos), en la App Store y en Google Play. Si vas en serio, registrarlo antes de publicar.
- Opcional: renombrar el repositorio a `DerbyTactics` en GitHub (**Settings → General → Repository name**). La web pasaría a `https://juanrafernandez.github.io/DerbyTactics/` sin tocar código; GitHub redirige el repositorio, pero **no la web**, así que avisa a tus amigos y actualiza en Supabase la *Site URL* y las *Redirect URLs*.

### 2. Textos legales

Hecho: titular y correo puestos (el correo es provisional). Falta que los revise alguien con conocimiento legal; son un punto de partida, no asesoramiento.

Con cada publicación se generan también estas páginas públicas, que piden las tiendas:

- `…/DerbyTactics/privacidad.html`
- `…/DerbyTactics/condiciones.html`
- `…/DerbyTactics/borrar-cuenta.html` (Google Play exige una URL para borrar la cuenta)

### 2b. Entrar con Google y Apple

El código está hecho: los botones aparecen al activarlos en Supabase. Pasos en [`docs/CUENTAS.md`](CUENTAS.md#entrar-con-google-y-con-apple). Vuelve a ejecutar `supabase/schema.sql` antes (añade la petición de nombre de usuario). Recuerda renovar la clave de Apple cada 6 meses.

### 3. Volver a ejecutar `supabase/schema.sql`

Supabase → tu proyecto → **SQL Editor** → New query → pega el contenido entero de `supabase/schema.sql` → **Run**. No borra datos. Añade el avatar, el registro de errores y que borrar la cuenta borre también sus informes de error.

### 4. Correo de Supabase

El envío incluido solo permite unos pocos correos por hora. Dos opciones:

- **Rápida:** Authentication → Sign In / Providers → Email → desactivar *Confirm email*. Las cuentas se crean al momento; el inconveniente es que no se comprueba que el correo sea suyo, y recuperar la contraseña sigue necesitando correo.
- **Buena:** crear una cuenta gratuita en un servicio de envío (Resend, Brevo…), y en Authentication → Emails → SMTP Settings poner servidor, puerto, usuario y contraseña que te den. Necesita un dominio propio verificado para enviar desde él.

### 5. Rama principal

GitHub → repositorio → **Settings → General → Default branch** → icono de lápiz/flechas → renombrar a `main`. La publicación ya escucha `main`. Después, en **Settings → Environments → github-pages**, comprueba que `main` puede desplegar.

### 6. Dominio (opcional)

Comprar el dominio → GitHub **Settings → Pages → Custom domain** → seguir las instrucciones de DNS. Luego en Supabase → Authentication → URL Configuration, cambiar **Site URL** y añadir el dominio en **Redirect URLs**. Si cambia la raíz de la web, avísame para ajustar la ruta base.

### 7. Tiendas de apps (opcional)

- Cuenta de Apple Developer (99 $/año) y de Google Play Console (25 $ una vez).
- Cuenta gratuita en expo.dev.
- Desde tu Mac, en la carpeta del proyecto: `npx eas-cli@latest login`, después `npx eas-cli@latest build --platform all --profile preview` para una versión de prueba instalable.
- Ya comprobado aquí: el código se compila para iOS y Android sin errores, e iOS declara que no usa cifrado propio (evita una pregunta en cada envío).

### 8. Probar en móviles reales

Instala la versión `preview` de EAS en un iPhone y un Android y juega una partida local y una en línea. Hasta entonces, la app nativa no se ha ejecutado nunca.

### 9. Probar con gente

Mesas de 2, 4 y 8. Lo que más me interesa saber: si las partidas de 2 se hacen largas, si alguien encuentra una alineación que gana siempre, y si sobra dinero al final con muchos jugadores.

### 10. Avatares definitivos

Hoy son doce retratos dibujados por código. Si quieres otros, pásame las imágenes (cuadradas, 512×512, PNG) y los integro.

## Partidas en línea

Los mensajes de las salas pasan por **Supabase Realtime** (gratis en el plan actual), con los servidores públicos como reserva. El móvil del anfitrión sigue dirigiendo la partida. Lo que queda abierto:

- Cada móvil recibe las cartas de todos (la pantalla solo enseña las propias).
- El resultado lo comunica el anfitrión, así que en teoría puede falsearse. El ranking ya solo cuenta partidas con al menos dos usuarios registrados.

Si el juego se abre a desconocidos y aparecen trampas, el paso siguiente es que una función de Supabase juegue la partida con el mismo motor (`src/engine`, puro y determinista) y valide cada jugada. Hay que desplegarla desde tu cuenta.

## Pendiente menor

- Monitorización externa de errores (por ejemplo Sentry), si el registro propio se queda corto.
- Sonido en la app nativa (hoy solo suena en navegador).
- Temporadas o grupos de amigos en el ranking.
