# ⚽ DerbyTactics

Juego de cartas de fútbol para **2 a 8 jugadores**, multiplataforma (iOS, Android y web) con Expo + React Native + TypeScript.

Eres el presidente de un club recién ascendido. Con 80M en caja tienes que montar una plantilla de fútbol 7 (un portero y la táctica que quieras), llenar el estadio y ganar la liga. Cada futbolista lleva números de dado, como las casillas del Catán. Cada jornada es un partido de todos contra todos: cuando sale un número, quien tiene delanteros o medios con él ataca, y los rivales lo paran si su portero y sus defensas con ese número suman al menos la misma fuerza. Los clubes tiran los dados por turnos y cada tirada se narra jugada a jugada.

- **Jugar en el navegador:** https://juanrafernandez.github.io/DerbyTactics/
- **Qué falta para producción:** [docs/PRODUCCION.md](docs/PRODUCCION.md)
- **Reglas completas:** [docs/REGLAS.md](docs/REGLAS.md)
- **Equilibrio y cómo se ha afinado:** [docs/BALANCE.md](docs/BALANCE.md)

## Qué incluye

- **Cuentas de usuario (opcionales):** historial de partidas, ranking por victorias y reputación de anfitriones con sanciones temporales. Ver [docs/CUENTAS.md](docs/CUENTAS.md).
- **Multijugador en línea:** cada persona desde su móvil, con salas por código o enlace de invitación.
- Partida en un solo dispositivo contra rivales controlados por la IA (varias tácticas). Para jugar con otras personas, cada una en su móvil (en línea).
- Mercado de fichajes, cláusulas, blindajes, ampliación de estadio, 51 cartas especiales, recuento de goles y reparto por posición cada jornada.
- **Tu club:** cada persona funda un único club (nombre y escudo a medida: forma, dibujo, emblema y colores) que se guarda en el dispositivo y la acompaña a todas sus partidas. Desde el menú lateral se cambia el nombre o el escudo y se consulta el historial de temporadas terminadas.
- **Reto diario, modo carrera, logros y álbum de futbolistas** (ver [docs/REGLAS.md](docs/REGLAS.md)).
- Futbolistas con nombres y caras nuevos en cada partida, de todas las procedencias (`src/engine/identity.ts`). Los rivales de la IA también reciben nombre y escudo al azar.
- **Liga masculina o femenina** a elegir en cada partida (también en las salas en línea): cambian los nombres, las caras y los textos; las reglas son las mismas. Hay avatares de usuario de hombre y de mujer.
- Ilustraciones vectoriales generadas por código (retratos con volumen, escudos, dados, estadio) y guía de pasos en pantalla.
- Motor de reglas independiente de la interfaz (`src/engine`), determinista y con tests.
- Simulador de partidas entre bots para medir el equilibrio (`npm run simulate`).

## Jugar en línea con amigos

1. Una persona abre el juego, elige **Con amigos en línea** y pulsa **Crear una sala** (hace falta entrar con la cuenta): juega con su club.
2. Comparte el código de 5 letras o el enlace de invitación.
3. Los demás abren el enlace (o eligen **Con amigos en línea** y escriben el código) y entran con su club.
4. El anfitrión elige cuántos clubes hay y pulsa **Empezar**. Los asientos libres los lleva la IA.

Cómo funciona y qué límites tiene:

- El dispositivo del anfitrión dirige la partida: debe mantener el juego abierto. Si se le cierra, puede volver con **Reanudar mi sala**.
- Si alguien pierde la conexión, al volver a entrar con el mismo código recupera su club. Si no vuelve, el anfitrión puede hacer que la IA juegue su turno.
- Los mensajes pasan por **Supabase Realtime**, del mismo proyecto que las cuentas (`src/net/realtime.ts`). Sin cuentas configuradas, o si Supabase no responde al crear la sala, se usan servidores MQTT públicos y gratuitos (`src/net/mqtt.ts`), sin garantía de disponibilidad. La primera letra del código de sala indica cuál: A, B o C son los públicos.
- El estado completo (incluidas las cartas en mano de todos) llega a cada dispositivo; la interfaz solo enseña las tuyas.

## Empezar

```bash
npm install
npm run web        # navegador
npm run android    # Android (Expo Go o emulador)
npm run ios        # iOS (requiere macOS, o Expo Go)
```

```bash
npm test           # tests del motor
npm run typecheck  # TypeScript
npm run simulate   # 2000 partidas de bots por tamaño de mesa
npm run test:db    # pruebas de la base de datos (necesita PostgreSQL local)
```

## Estructura

```
App.tsx              Decide la pantalla según la fase de la partida
src/engine/
  config.ts          Todos los valores de equilibrio
  cards.ts           95 futbolistas y 51 cartas especiales
  engine.ts          Estado, validación y aplicación de acciones
  bots.ts            IA con varias tácticas
  daily.ts, career.ts, achievements.ts  Reto diario, carrera y logros
  engine.test.ts     Tests
src/account/         Cuentas: sesión, perfil y llamadas al servidor
supabase/            Esquema de la base de datos y sus pruebas
src/net/             Multijugador: protocolo de sala, sesiones y transportes (Supabase Realtime y MQTT)
src/ui/              Pantallas y componentes
scripts/simulate.ts  Simulador de equilibrio
docs/                Reglas y notas de equilibrio
```

## Pendiente

Ver [docs/PRODUCCION.md](docs/PRODUCCION.md).
