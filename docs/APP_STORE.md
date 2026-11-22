# Ficha de la App Store

Todo lo que pide App Store Connect, listo para copiar. Identificador: `com.derbytactics.app`.

## Información de la app

| Campo | Valor |
|---|---|
| Nombre (30) | DerbyTactics |
| Subtítulo (30) | Fútbol, cartas y dados |
| Categoría principal | Juegos → Cartas |
| Categoría secundaria | Juegos → Deportes |
| URL de soporte | https://derbytactics.github.io/soporte.html |
| URL de marketing | https://derbytactics.github.io/ |
| URL de la política de privacidad | https://derbytactics.github.io/privacidad.html |
| Copyright | 2026 Juan Ramón Fernández Calvo |
| Idioma principal | Español (España) |

**Texto promocional (170):**
Monta tu equipo de 7, ficha con cabeza y gana la liga a golpe de dado. Contra la IA o con amigos, cada uno desde su móvil.

**Palabras clave (100, separadas por comas, sin espacios):**
futbol,cartas,dados,liga,fichajes,estadio,mesa,amigos,multijugador,estrategia,manager,equipo

**Descripción:**

DerbyTactics es un juego de cartas de fútbol para 2 a 8 jugadores. Ficha futbolistas, amplía tu estadio, juega cartas especiales y gana la liga jornada a jornada.

CÓMO SE JUEGA
• Monta un equipo de 7: portero, defensas, medios y delanteros. Cada futbolista actúa con unos números del dado: los que más salen cuestan más.
• En cada jornada se juega un partido de todos contra todos. Cada club tira los dados: con el número que sale atacan tus delanteros y medios, y defienden el portero y los defensas de cada rival.
• Gana puntos de liga según la diferencia de goles, cobra premios y taquilla, y amplía tu estadio para ingresar más.
• Juega sucio con elegancia: paga la cláusula de la estrella de un rival, saca tarjetas, lesiones, penaltis o partidos a puerta cerrada.

CON AMIGOS O CONTRA LA IA
• Partidas rápidas contra la IA en tu móvil, sin conexión.
• Salas en línea: uno crea la sala, comparte el código y cada uno juega desde su móvil. La IA ocupa los asientos libres.
• Funda tu club con su escudo, guarda tu historial y escala en el ranking.

SIN TRAMPAS NI PAGOS
• Los millones del juego son ficticios: no se compran con dinero real.
• Sin anuncios.
• Puedes jugar sin cuenta. Con cuenta (Apple o Google) creas salas y entras en el ranking.

## Privacidad (App Privacy)

¿Recopilas datos? **Sí.** Ninguno se usa para rastrear (tracking) ni para publicidad.

| Tipo de dato | Vinculado al usuario | Uso |
|---|---|---|
| Información de contacto → Correo electrónico | Sí | Funcionalidad de la app |
| Información de contacto → Nombre (lo envía Google; no se muestra ni se usa) | Sí | Funcionalidad de la app |
| Identificadores → ID de usuario | Sí | Funcionalidad de la app |
| Contenido del usuario → Contenido de juego (club, historial, resultados) | Sí | Funcionalidad de la app |
| Contenido del usuario → Otro contenido (nombre de usuario y de club) | Sí | Funcionalidad de la app |
| Diagnóstico → Datos de fallos | Sí | Funcionalidad de la app |

## Clasificación por edad

Responde **Ninguno/No** a violencia, contenido sexual, lenguaje soez, drogas, terror, juegos de azar con dinero real y simulación de apuestas (es un juego de dados con dinero ficticio, sin casino ni apuestas). A **contenido generado por usuarios**: **Sí** (nombres de usuario y de club visibles para otros; hay filtro, denuncia y expulsión). Sin chat. Deja que App Store Connect calcule la edad resultante.

## Notas para la revisión

> Se puede jugar sin cuenta: en la portada, «Jugar sin cuenta» → «Jugar contra la IA».
> Las salas en línea necesitan dos dispositivos; crear una sala pide entrar con Apple (vale el Apple ID del revisor). Para unirse a una sala no hace falta cuenta.
> Los millones del juego son ficticios: no hay compras ni dinero real.
> Borrar la cuenta: menú ☰ → «Mi cuenta» → «Borrar mi cuenta».

No hace falta cuenta de prueba.

## Capturas

App Store Connect acepta capturas de 6,1"/6,3" (1179 × 2556). En `store/capturas-6.3/` hay siete, en el orden recomendado: partido, reparto, mercado, turno de un rival, preparar partida, tu club y portada. En `store/capturas/` hay tres de 6,9" (1320 × 2868), por si te las pide. Las de partida (mercado, partido y reparto) es mejor hacerlas en el propio iPhone durante una partida contra la IA: botón lateral + subir volumen. Si tu iPhone no es de 6,9", usa el simulador «iPhone 16 Pro Max» de Xcode.

## Compilar y subir a TestFlight

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p ios --profile production
npx eas-cli@latest submit -p ios --latest
```

La primera vez EAS pregunta por tu Apple ID y crea los certificados. La versión es la 1.0.0; el número de compilación lo sube EAS solo.
