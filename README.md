# ⚽ Futcards

Juego de cartas de fútbol para **2 a 8 jugadores**, multiplataforma (iOS, Android y web) con Expo + React Native + TypeScript.

Eres el presidente de un club recién ascendido. Con 60M en caja tienes que montar una plantilla, llenar el estadio y ganar la liga. Cada futbolista lleva números de dado, como las casillas del Catán: cuando sale su número, marca. Cuantos más números y más probables, más caro es.

- **Jugar en el navegador:** https://juanrafernandez.github.io/Futcards/
- **Reglas completas:** [docs/REGLAS.md](docs/REGLAS.md)
- **Equilibrio y cómo se ha afinado:** [docs/BALANCE.md](docs/BALANCE.md)

## Qué incluye

- Partida local completa: varias personas pasándose el dispositivo y/o rivales controlados por IA (5 estilos de juego).
- Mercado de fichajes, cláusulas, blindajes, ampliación de estadio, 37 cartas especiales, recuento de goles y reparto por posición cada jornada.
- Motor de reglas independiente de la interfaz (`src/engine`), determinista y con tests.
- Simulador de partidas entre bots para medir el equilibrio (`npm run simulate`).

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
```

## Estructura

```
App.tsx              Decide la pantalla según la fase de la partida
src/engine/
  config.ts          Todos los valores de equilibrio
  cards.ts           64 futbolistas y 37 cartas especiales
  engine.ts          Estado, validación y aplicación de acciones
  bots.ts            IA con cinco personalidades
  engine.test.ts     Tests
src/ui/              Pantallas y componentes
scripts/simulate.ts  Simulador de equilibrio
docs/                Reglas y notas de equilibrio
```

## Pendiente

- Guardar y reanudar la partida.
- Multijugador en línea (el motor ya es determinista y serializable, pensado para ello).
- Ilustraciones de cartas, sonido y animación de dados.
- Tutorial interactivo.
