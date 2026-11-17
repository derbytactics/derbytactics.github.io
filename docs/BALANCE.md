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
| 2 | 1,10 | 1,14 | 0,95 | 1,34 | 0,71 | 0,76 |
| 4 | 1,37 | 1,24 | 1,08 | 1,66 | 0,29 | 0,36 |
| 8 | 1,55 | 1,27 | 1,57 | 1,46 | 0,03 | 0,12 |

Las cuatro primeras suben de 1,00 porque se reparten lo que pierden las dos extremas. Enfrentadas solo entre ellas (600 temporadas por mesa):

| Clubes | Equilibrado | Ofensivo | Defensivo | Medios |
|---|---|---|---|---|
| 2 | 0,97 | 1,11 | 0,83 | 1,09 |
| 4 | 0,95 | 1,28 | 0,77 | 0,99 |
| 6 | 1,11 | 1,10 | 0,81 | 0,98 |
| 8 | 1,07 | 0,94 | 1,11 | 0,87 |

Con esta muestra, diferencias de ±0,12 son ruido. En esas mismas partidas se para en torno al 38% de las jugadas.

## Por qué no domina el ataque

- **Suma cero:** cada gol a favor es un gol en contra de alguien. Un equipo sin defensa encaja todo lo que marca el resto.
- **El contragolpe castiga atacar a ciegas:** si te paran una jugada y el rival tiene un defensa en ese número, te marca.
- **Solo caben 7:** cada delantero de más es un defensor de menos.
- **Se corrige solo:** si todos atacan, los defensores quedan libres en el mercado y valen mucho; si todos defienden, hacen falta jugadas combinadas para marcar.

## Qué se decidió durante el afinado

| Decisión | Motivo |
|---|---|
| Atacan delantero (2) y medio (1); defienden portero (2) y defensa (1) | En la primera versión el medio atacaba 1 y defendía 1, y era mejor que un defensa en todo. Ahora nadie hace las dos cosas. |
| Contragolpe del defensa | Sin él, la táctica defensiva ganaba 0,6-0,7: defender no daba nada positivo. |
| El medio anula el contragolpe | Da al medio un papel propio más allá de «delantero flojo», y hace que atacar solo con delanteros tenga riesgo. |
| Precio por posición: portero ×0,5, defensa ×0,7, medio ×0,6, delantero ×1,05 | Es lo que deja las cuatro tácticas jugables entre 0,77 y 1,28. |
| Portero con 3-4 números | Solo cabe uno; tiene que cubrir mucho para ser útil. |
| Caja inicial de 80M y taquilla 2/3/4/6/8 | Con 60M las plantillas acababan con menos de 6 de 7 futbolistas. |
| Taquilla por jugada de gol, no por rival batido | Si no, con 8 clubes un gol llenaba el estadio siete veces. |
| Tiradas por turnos, mínimo 6 | Cada club tira los dados. Con 4 u 8 clubes hay 8 tiradas; con 5, 10. |

## Problemas conocidos

- **El defensivo 1-3-2-1 queda algo por debajo con 2-6 clubes** (0,77-0,83) y el ofensivo algo por encima con 4 (1,28).
- **El número de tiradas no es igual en todas las mesas** (6, 8 o 10): con 4, 5 u 8 clubes hay más goles por jornada.
- **Sobra dinero al final con muchos clubes.** Los bots dejan de gastar en las últimas jornadas.
- **Los bots no miran los números de los rivales** al fichar. Una persona que sí lo haga jugará mejor que ellos; el equilibrio real entre tácticas puede moverse cuando lo pruebe gente.
- Todo esto mide bots con reglas sencillas. Sirve para descartar estrategias rotas, no sustituye a probarlo con personas.

## Versión anterior

El juego clásico (plantilla de 6, todos los futbolistas marcan con su número y gana la jornada quien más goles hace) está guardado en la rama `respaldo/v0.1-clasico`.
