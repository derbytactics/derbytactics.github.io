# Respuesta a App Review (Guideline 2.1 - Information Needed)

Apple pide un vídeo grabado en un iPhone real y seis respuestas. Hay que contestar en App Store Connect (Resolution Center, en el mensaje de la revisión) **y** pegar las mismas respuestas en **App Review Information → Notes** de la versión, para futuros envíos.

## 1. Guion del vídeo (unos 4-5 minutos)

Grábalo en tu iPhone con la grabación de pantalla de iOS (Centro de control → botón de grabar; si no está: Ajustes → Centro de control → añadir «Grabación de pantalla»). Usa la compilación de TestFlight de la versión enviada. **Empieza con la app cerrada del todo**: el vídeo tiene que arrancar abriéndola desde el icono.

Para no perder tu cuenta, haz la parte de cuenta con un **Apple ID secundario** o crea la cuenta y bórrala al final (el borrado es justo lo que piden ver).

1. **Abrir la app** desde el icono de la pantalla de inicio.
2. **Portada:** se ve que se puede «Jugar sin cuenta» o entrar con Apple o Google.
3. **Entrar con Apple** (Sign in with Apple). Elegir **nombre de usuario** si lo pide.
4. **Fundar el club:** nombre y escudo.
5. **Partida contra la IA** (es lo principal): «Jugar un amistoso» → elegir liga → sorteo → **fichar** un par de futbolistas → «Terminar turno» hasta la convocatoria → **confirmar la alineación** → **tirar los dados** y dejar que se vea la crónica → **reparto** de la jornada. No hace falta acabar la liga: con una jornada basta. Salir con «Salir ✕».
6. **Reto diario:** abrirlo un momento (se ve que es la misma partida para todos).
7. **Salas en línea:** «Con amigos» → «Crear una sala» → se ve el **código** y la sala de espera. Si tienes otro móvil, que entre y enseña el botón **«Expulsar»** (el anfitrión puede sacar a un jugador). Cerrar la sala.
8. **Contenido de otros usuarios y denuncias:** menú ☰ → «Mi cuenta» → **ranking** → pulsar el nombre de otro jugador → **«Denunciar»** (enséñalo, no hace falta confirmar si no hay nadie que denunciar).
9. **Borrado de la cuenta:** «Mi cuenta» → **«Borrar mi cuenta»** → confirmar → se vuelve a la portada.

Súbelo en la respuesta (App Store Connect admite adjuntar el vídeo; si pesa mucho, súbelo a iCloud Drive o Google Drive y pega el enlace).

## 2-6. Respuestas (en inglés, para pegar)

```
Hello, thank you for reviewing DerbyTactics. Please find the requested information below. A screen recording from a physical iPhone is attached.

1. Screen recording
The attached video starts by launching the app and shows: Sign in with Apple, choosing a username, creating a club, a full match day against the AI (transfer market, secret line-up, dice match and results), the daily challenge, creating an online room (with the host's option to remove a player), reporting another user's name from the ranking, and deleting the account from "Mi cuenta" > "Borrar mi cuenta".

2. Purpose and audience
DerbyTactics is a turn-based football card and dice game in Spanish for teenagers and adults who enjoy football and board games. Each player manages a club: signs footballers, picks a secret line-up and plays match days decided by dice rolls and special cards, competing for the league. It can be played alone against the computer (friendly leagues, a daily challenge and a career mode), with friends online, or with nearby iPhones without internet. All money in the game is fictional: there are no purchases, no ads and no real-money gambling.

3. How to access the main features
No login is required. On the first screen, tap "Jugar sin cuenta", create a club (any name), and then:
- Play against the AI: "Jugar un amistoso" > "Elegir liga y empezar".
- Daily challenge: "Jugar el reto de hoy".
- Career: "Empezar mi carrera".
- Online rooms: "Con amigos" > "Crear una sala" (creating a room requires signing in with Apple; your own Apple ID works) and a second device joins with the 5-letter code.
- Nearby play without internet: "Con amigos" > "Crear una sala cercana" on one iPhone and "Entrar" on another iPhone nearby (needs two devices; the app asks for Local Network permission only for this).
- Account deletion: menu > "Mi cuenta" > "Borrar mi cuenta".
No demo account is needed: Sign in with Apple works with the reviewer's Apple ID.

4. External services
- Supabase (database, authentication and real-time messaging for online rooms).
- Sign in with Apple and Google Sign-In (authentication, through Supabase).
- Public MQTT brokers (EMQX, HiveMQ, Mosquitto) as a fallback for online room messages if Supabase is unreachable.
- Apple Multipeer Connectivity (nearby play between iPhones, no server).
- GitHub Pages (hosts the privacy policy, terms and support pages).
No AI services, payment processors or third-party data providers are used.

5. Regional differences
The app works the same in all regions. It is only available in Spanish.

6. Regulated industries / third-party material
Not applicable. The app is not in a regulated industry and does not involve real-money gambling. It does not use any licensed third-party material: all clubs, crests, footballer names and faces are generated by the app, and it does not use real teams, players, leagues or trademarks.

User-generated content: the only user content is usernames and club names. They pass an offensive-word filter, any user can report another user's name (it is removed after three reports), hosts can remove players from their rooms, and anyone can leave a room at any time. There is no chat.
```

## Notas

- Si Apple insiste en un **bloqueo de usuarios** propio (además de expulsar y salir de la sala), se puede añadir «Bloquear a este jugador» en el ranking y en las salas.
- La 1.1.0 añadirá a los servicios externos el **servicio de notificaciones de Expo** (avisos «Te toca»): en su envío, añadir esa línea en el punto 4.
