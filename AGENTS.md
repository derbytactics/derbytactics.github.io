This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Este proyecto (Futcards)

- `src/engine/` es el motor de reglas en TypeScript puro (sin React ni Expo): determinista, con semilla y estado serializable. Toda regla nueva va ahí, con test en `engine.test.ts`.
- `src/engine/config.ts` concentra los valores de equilibrio. Tras tocarlos, ejecuta `npm run simulate` y actualiza `docs/BALANCE.md`.
- `src/net/` es el multijugador en línea: `room.ts` es el protocolo puro (el anfitrión es la autoridad; test en `room.test.ts`), `mqtt.ts` el transporte y `session.ts` la conexión. Los invitados nunca aplican acciones: las envían y esperan el estado del anfitrión.
- `src/account/` y `supabase/schema.sql` son las cuentas (Supabase). Las tablas no se tocan desde el cliente: todo pasa por funciones SQL que comprueban `auth.uid()`. Tras cambiar el esquema, ejecuta `npm run test:db`. Sin `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` el juego funciona sin cuentas.
- `src/ui/` son las pantallas; `GameView.tsx` decide cuál mostrar según `state.phase`, tanto en local como en línea. Hoy no hay rutas: si se añade navegación, usar Expo Router como se indica abajo.
- Comandos: `npm test`, `npm run typecheck`, `npm run simulate`, `npm run web`.
- Textos de cara al jugador y documentación, en español.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
