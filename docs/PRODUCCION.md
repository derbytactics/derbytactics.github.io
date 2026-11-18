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

1. **Rellenar los textos legales.** En `src/legal/texts.ts`, `LEGAL.owner` (nombre o razón social) y `LEGAL.contact` (correo). Y que los revise alguien con conocimiento legal: son un punto de partida, no asesoramiento.
2. **Volver a ejecutar `supabase/schema.sql`** en el editor SQL de tu proyecto. Añade el avatar y el registro de errores; no borra datos.
3. **Correo de Supabase.** Configurar un servidor de correo propio (SMTP) en Authentication → Emails, o desactivar la confirmación por correo. El envío incluido en el plan gratuito está muy limitado.
4. **Rama principal.** En GitHub, Settings → Branches (o en la página de ramas), renombrar la rama por defecto a `main`. La publicación ya está preparada para `main`.
5. **Dominio.** Si quieres dominio propio: comprarlo, añadirlo en Settings → Pages y actualizar la *Site URL* y las *Redirect URLs* de Supabase.
6. **Nombre.** Comprobar que «Futcards» no está registrado como marca por otro.
7. **Tiendas de apps (si las quieres).** Cuentas de desarrollador de Apple y Google (de pago), revisar los identificadores `com.juanrafernandez.futcards` en `app.json`, y generar las compilaciones con EAS (`npx eas-cli@latest build`). Nada de esto se ha podido ejecutar todavía.
8. **Probar en móviles reales**, sobre todo la app nativa, que no se ha ejecutado nunca.
9. **Probar con gente** en mesas de 2, 4 y 8 antes de dar el equilibrio por bueno.
10. **Avatares definitivos.** Hoy son doce retratos dibujados por código; si quieres otros, hay que aportar las imágenes.

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
