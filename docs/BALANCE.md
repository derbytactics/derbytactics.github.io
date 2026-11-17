# Equilibrio

Todos los valores están en `src/engine/config.ts`. Se afinan con `npm run simulate`, que juega temporadas completas entre bots con distintas tácticas y mide si alguna domina.

Para probar una variante sin tocar código:

```bash
FUT_OVERRIDES='{"roles":{"DEF":{"attack":0,"defense":2}}}' FUT_SIZES=4,8 npm run simulate -- 1000
FUT_STYLES=equilibrado,ofensivo,defensivo,medios npm run simulate   # solo las tácticas jugables
```

## El miedo principal: ¿gana siempre quien llena el equipo de delanteros?

No. Es la peor táctica de las probadas. Ratio de campeonatos respecto a lo esperado por azar (1,00 = justo), 600 temporadas de 12 jornadas por tamaño de mesa, con las seis tácticas mezcladas:

| Clubes | Equilibrado 1-2-2-2 | Ofensivo 1-1-1-4 | Defensivo 1-3-2-1 | Medios 1-1-4-1 | Todo delanteros 0-0-1-6 | Sin portero 0-2-2-3 |
|---|---|---|---|---|---|---|
| 2 | 1,18 | 0,92 | 1,15 | 1,21 | 0,49 | 1,05 |
| 4 | 1,51 | 0,91 | 1,31 | 1,40 | 0,18 | 0,69 |
| 8 | 1,95 | 1,04 | 1,64 | 1,23 | 0,00 | 0,14 |

Las cuatro primeras suben de 1,00 porque se reparten lo que pierden las dos extremas. Enfrentadas solo entre ellas (600 temporadas por mesa):

| Clubes | Equilibrado | Ofensivo | Defensivo | Medios |
|---|---|---|---|---|
| 2 | 1,15 | 0,87 | 1,05 | 0,93 |
| 4 | 1,09 | 0,95 | 0,98 | 0,98 |
| 6 | 1,23 | 0,97 | 1,01 | 0,79 |
| 8 | 1,11 | 1,07 | 1,15 | 0,67 |

Con esta muestra, diferencias de ±0,12 son ruido. En esas partidas se para en torno al 46% de las jugadas.

## Por qué no domina el ataque

- **Suma cero:** cada gol a favor es un gol en contra de alguien. Un equipo sin defensa encaja todo lo que marca el resto.
- **Solo caben 7:** cada delantero de más es un defensor de menos.
- **Se corrige solo:** si todos atacan, los defensores quedan libres en el mercado y valen mucho; si todos defienden, hacen falta jugadas combinadas para marcar.

## Qué se decidió durante el afinado

| Decisión | Motivo |
|---|---|
| Atacan delantero (2) y medio (1); defienden portero (2) y defensa (2) | En la primera versión el medio atacaba 1 y defendía 1, y era mejor que un defensa en todo. Ahora nadie hace las dos cosas. |
| Sin contragolpe como regla | Un defensa no ataca. La contra es narrativa: si paras y además tienes atacantes con ese número, la crónica enlaza las dos cosas. |
| Defensa con fuerza 2 | Sin contragolpe y con fuerza 1, la táctica defensiva ganaba la mitad de lo esperado y la ofensiva hasta 1,77 veces. |
| Precio por posición: portero ×0,5, defensa ×0,75, medio ×0,45, delantero ×1 | Es lo que deja las cuatro tácticas jugables entre 0,67 y 1,23. |
| Portero con 3-4 números | Solo cabe uno; tiene que cubrir mucho para ser útil. |
| Caja inicial de 80M y taquilla 2/3/4/6/8 | Con 60M las plantillas acababan con menos de 6 de 7 futbolistas. |
| Taquilla por jugada de gol, no por rival batido | Si no, con 8 clubes un gol llenaba el estadio siete veces. |
| Una tirada por club y jornada | Cada persona tira sus dados. Con un 7, quien tira roba carta. |

## Problemas conocidos

- **Con pocos clubes pasan pocas cosas por jornada.** Con 2 hay solo 2 tiradas: de media, menos de una jugada de ataque y unos 0,6 goles por club y jornada, y muchas jornadas acaban 0-0. Con 4 hay unas 2 jugadas por club; con 8, unas 4.
- **Con 8 clubes hay mucho más dinero que con 2:** más tiradas, más goles y más taquilla. La caja final media pasa de unos 30M con 2 clubes a más de 150M con 8.
- **La táctica de medios 1-1-4-1 se queda corta con 6-8 clubes** (0,67-0,79): un medio suelto lo para casi cualquiera.
- **El portero casi nunca llega a 3 paradas en una jornada con pocos clubes**, porque hay pocas tiradas.
- **Los bots no miran los números de los rivales** al fichar. Una persona que sí lo haga jugará mejor que ellos; el equilibrio real entre tácticas puede moverse cuando lo pruebe gente.
- Todo esto mide bots con reglas sencillas. Sirve para descartar estrategias rotas, no sustituye a probarlo con personas.

## Versión anterior

El juego clásico (plantilla de 6, todos los futbolistas marcan con su número y gana la jornada quien más goles hace) está guardado en la rama `respaldo/v0.1-clasico`.
