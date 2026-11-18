# Equilibrio

Todos los valores están en `src/engine/config.ts`. Se afinan con `npm run simulate`, que juega temporadas completas entre bots con distintas tácticas y mide si alguna domina.

Para probar una variante sin tocar código:

```bash
FUT_OVERRIDES='{"roles":{"DEF":{"attack":0,"defense":2}}}' FUT_SIZES=4,8 npm run simulate -- 1000
FUT_STYLES=equilibrado,ofensivo,defensivo,medios npm run simulate   # solo las tácticas jugables
```

## ¿Hay alguna alineación que gane siempre?

No. Con los delanteros limitados a 2 por club, las tácticas se diferencian por cómo reparten medios y defensas. Ratio de campeonatos respecto a lo esperado por azar (1,00 = justo), 500 temporadas de 12 jornadas por tamaño de mesa.

Las cuatro tácticas con las que juega la IA, enfrentadas entre sí:

| Clubes | Equilibrado 1-2-2-2 | Ofensivo 1-1-3-2 | Defensivo 1-3-1-2 | Cerrojo 1-4-1-1 |
|---|---|---|---|---|
| 2 | 1,03 | 0,92 | 1,07 | 0,98 |
| 4 | 1,15 | 1,34 | 0,99 | 0,51 |
| 6 | 1,35 | 1,22 | 1,05 | 0,38 |
| 8 | 1,13 | 0,98 | 1,26 | 0,62 |

Mezcladas con dos extremos (sin portero 0-2-3-2 y sin defensas 0-0-5-2):

| Clubes | Equilibrado | Ofensivo | Defensivo | Cerrojo | Sin portero | Sin defensas |
|---|---|---|---|---|---|---|
| 2 | 1,13 | 0,84 | 1,21 | 0,90 | 1,11 | 0,81 |
| 4 | 1,46 | 1,35 | 1,18 | 0,59 | 0,77 | 0,66 |
| 8 | 1,86 | 1,34 | 1,50 | 1,08 | 0,14 | 0,07 |

Con esta muestra, diferencias de ±0,13 son ruido. Entre las cuatro tácticas jugables se para en torno al 52% de las jugadas.

## Por qué no domina el ataque

- **Suma cero:** cada gol a favor es un gol en contra de alguien. Un equipo sin defensa encaja todo lo que marca el resto.
- **Dos delanteros como mucho:** el resto del ataque son medios, que valen la mitad y los corta cualquier defensa.
- **Solo caben 7:** cada atacante de más es un defensor de menos.

## Qué se decidió durante el afinado

| Decisión | Motivo |
|---|---|
| Atacan delantero (2) y medio (1); defienden portero (2) y defensa (1) | En la primera versión el medio atacaba 1 y defendía 1, y era mejor que un defensa en todo. Ahora nadie hace las dos cosas. |
| Defensa con fuerza 1 pero 3-4 números, y barato (×0,38) | Con fuerza 2 era un segundo portero. Con fuerza 1 y pocos números, defender no compensaba. Con muchos números cubre campo: corta medios y completa al portero. |
| Máximo 2 delanteros | Sin límite, los medios sobraban: siempre era mejor otro delantero. |
| Sin contragolpe como regla | Un defensa no ataca. La contra es narrativa: si paras y además tienes atacantes con ese número, la crónica enlaza las dos cosas. |
| Precio por posición: portero ×0,45, defensa ×0,38, medio ×0,75, delantero ×1,05 | Es lo que deja las tres tácticas razonables entre 0,92 y 1,35. |
| Caja inicial de 80M y taquilla 2/3/4/6/8 | Con 60M las plantillas acababan con menos de 6 de 7 futbolistas. |
| Taquilla por jugada de gol, no por rival batido | Si no, con 8 clubes un gol llenaba el estadio siete veces. |
| Una tirada por club y jornada | Cada persona tira sus dados. Con un 7, quien tira roba carta. |

## Problemas conocidos

- **Con pocos clubes pasan pocas cosas por jornada.** Con 2 hay solo 2 tiradas: de media, menos de una jugada de ataque y unos 0,6 goles por club y jornada, y muchas jornadas acaban 0-0. Con 4 hay unas 2 jugadas por club; con 8, unas 4.
- **Con 8 clubes hay mucho más dinero que con 2:** más tiradas, más goles y más taquilla. La caja final media pasa de unos 30M con 2 clubes a más de 150M con 8.
- **El cerrojo 1-4-1-1 rinde poco con 4-8 clubes** (0,38-0,62): con un solo delantero y un solo medio apenas marca.
- **Se para más de la mitad de las jugadas** entre tácticas razonables. Si resulta frustrante, se corrige encareciendo a los defensas.
- **El portero casi nunca llega a 3 paradas en una jornada con pocos clubes**, porque hay pocas tiradas.
- **Los bots no miran los números de los rivales** al fichar. Una persona que sí lo haga jugará mejor que ellos; el equilibrio real entre tácticas puede moverse cuando lo pruebe gente.
- Todo esto mide bots con reglas sencillas. Sirve para descartar estrategias rotas, no sustituye a probarlo con personas.

## Versión anterior

El juego clásico (plantilla de 6, todos los futbolistas marcan con su número y gana la jornada quien más goles hace) está guardado en la rama `respaldo/v0.1-clasico`.
