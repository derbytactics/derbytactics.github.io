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

## Tu parte

Ordenados por prioridad. Cada paso dice dónde se hace.

### 1. Nombre (antes de nada)

Ya existe una app llamada **FutCards** en la App Store, de otro desarrollador, y hay muchas apps «FUT Card…». Además «FUT» es la abreviatura de *FIFA Ultimate Team*, de Electronic Arts. Para la web entre amigos no es problema; **para publicar en tiendas conviene otro nombre**, porque Apple rechaza nombres que ya usa otra app y el parecido con «FUT» puede traer una reclamación.

- Elige 2 o 3 candidatos y búscalos en la App Store, Google Play, [OEPM](https://consultas2.oepm.es/LocalizadorWeb/) y [EUIPO](https://euipo.europa.eu/eSearch/).
- Cuando lo tengas, cambiar el nombre en el código es trabajo mío (título, textos, `app.json`, identificadores).

### 2. Textos legales

Dime el **nombre del titular** (persona o empresa) y el **correo de contacto** que quieres publicar y los pongo. Recomendación: un correo dedicado al juego, no el personal, porque será público. Después, que lo revise alguien con conocimiento legal.

Con cada publicación se generan también estas páginas públicas, que piden las tiendas:

- `…/Futcards/privacidad.html`
- `…/Futcards/condiciones.html`
- `…/Futcards/borrar-cuenta.html` (Google Play exige una URL para borrar la cuenta)

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

## Pendiente de decisión: servidor propio para las partidas en línea

Es lo único grande que falta, y no se puede resolver sin decidir dónde se aloja.

Hoy el móvil del anfitrión dirige la partida y los mensajes pasan por servidores públicos gratuitos. Eso implica:

- Sin garantía de disponibilidad, y el estado de la sala no va cifrado.
- Cada móvil recibe las cartas de todos (la pantalla solo enseña las propias).
- El resultado lo comunica el anfitrión, así que puede falsearse.

Para un juego entre amigos es aceptable. Para abrirlo a desconocidos con ranking, lo correcto es que la partida se juegue en un servidor que guarde el estado, valide cada jugada y envíe a cada jugador solo lo suyo. El motor (`src/engine`) ya es puro y determinista, pensado para ejecutarse también en servidor. Opciones:

- **Funciones de Supabase** (mismo proveedor que las cuentas): menos piezas nuevas; hay que desplegarlas desde tu cuenta.
- **Un servidor pequeño propio** con WebSocket: más control, y un coste mensual bajo.

## Pendiente menor

- Monitorización externa de errores (por ejemplo Sentry), si el registro propio se queda corto.
- Sonido en la app nativa (hoy solo suena en navegador).
- Temporadas o grupos de amigos en el ranking.
