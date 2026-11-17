# Equilibrio

Todos los valores están en `src/engine/config.ts`. Se afinan con `npm run simulate`, que juega temporadas completas entre bots con distintas tácticas y mide si alguna domina.

Para probar una variante sin tocar código:

```bash
FUT_OVERRIDES='{"roles":{"DEF":{"attack":0,"defense":2}}}' FUT_SIZES=4,8 npm run simulate -- 1000
FUT_STYLES=equilibrado,ofensivo,defensivo,medios npm run simulate   # solo las tácticas jugables
```

## El miedo principal: ¿gana siempre quien llena el equipo de delanteros?

No. Es la peor táctica de las probadas. Ratio de campeonatos respecto a lo esperado por azar (1,00 = justo), 700 temporadas de 12 jornadas por tamaño de mesa, con las seis tácticas mezcladas:

| Clubes | Equilibrado 1-2-2-2 | Ofensivo 1-1-1-4 | Defensivo 1-3-2-1 | Medios 1-1-4-1 | Todo delanteros 0-0-1-6 | Sin portero 0-2-2-3 |
|---|---|---|---|---|---|---|
| 2 | 1,15 | 0,91 | 1,16 | 1,27 | 0,47 | 1,04 |
| 3 | 1,24 | 0,96 | 1,18 | 1,26 | 0,39 | 0,97 |
| 4 | 1,44 | 1,00 | 1,33 | 1,39 | 0,23 | 0,62 |
| 6 | 1,68 | 0,93 | 1,71 | 1,40 | 0,03 | 0,25 |
| 8 | 1,64 | 0,83 | 1,82 | 1,53 | 0,02 | 0,17 |

Las cuatro primeras suben de 1,00 porque se reparten lo que pierden las dos extremas. Enfrentadas solo entre ellas (600 temporadas por mesa):

| Clubes | Equilibrado | Ofensivo | Defensivo | Medios |
|---|---|---|---|---|
| 2 | 1,07 | 0,88 | 1,15 | 0,90 |
| 4 | 1,06 | 0,97 | 0,93 | 1,05 |
| 6 | 1,23 | 0,73 | 1,25 | 0,78 |

Con esta muestra, diferencias de ±0,12 son ruido.

## Por qué no domina el ataque

- **Suma cero:** cada gol a favor es un gol en contra de alguien. Un equipo sin defensa encaja todo lo que marca el resto.
- **El contragolpe castiga atacar a ciegas:** si te paran una jugada y el rival tiene un defensa en ese número, te marca.
- **Solo caben 7:** cada delantero de más es un defensor de menos.
- **Se corrige solo:** si todos atacan, los defensores quedan libres en el mercado y valen mucho; si todos defienden, hacen falta jugadas combinadas para marcar.

## Otros datos de la simulación (seis tácticas mezcladas)

| Clubes | Jugadas de ataque por club y jornada | Jugadas paradas | Gana el líder del primer tercio | Gana quien eligió primero | Plantilla final |
|---|---|---|---|---|---|
| 2 | 2,9 | 39% | 66% | 49% (justo 50%) | 6,7 |
| 4 | 2,9 | 40% | 41% | 26% (justo 25%) | 6,8 |
| 8 | 2,9 | 40% | 14% | 13% (justo 12,5%) | 6,9 |

## Qué se decidió durante el afinado

| Decisión | Motivo |
|---|---|
| Defensa con fuerza 1 (no 2) | Con 2 se paraba el 57% de las jugadas y un solo defensa valía lo que un portero. |
| Contragolpe del defensa | Sin él, la táctica defensiva ganaba 0,6-0,7: defender no daba nada positivo. |
| Medio barato (factor 0,7) | Un medio suelto es el ataque más débil y el que más contragolpes regala. |
| Defensa caro (factor 0,9) | Con el contragolpe, a precio bajo la táctica defensiva ganaba el doble de lo esperado. |
| Portero barato (factor 0,5) y con 3-4 números | Solo cabe uno; tiene que cubrir mucho para ser útil. |
| Caja inicial de 80M y taquilla 2/3/4/6/8 | Con 60M las plantillas acababan con menos de 6 de 7 futbolistas. |
| Taquilla por jugada de gol, no por rival batido | Si no, con 8 clubes un gol llenaba el estadio siete veces. |

## Problemas conocidos

- **Con 6-8 clubes, el ofensivo 1-1-1-4 queda algo por debajo** (0,73-0,93) y el defensivo algo por encima.
- **Sobra dinero al final con muchos clubes:** con 8, la caja final media ronda los 100M. Hay más goles que repartir y los bots dejan de gastar en las últimas jornadas.
- **Con 8 clubes el líder temprano gana poco más que por azar** (14% frente a 12,5%).
- **Los bots no miran los números de los rivales** al fichar. Una persona que sí lo haga jugará mejor que ellos; el equilibrio real entre tácticas puede moverse cuando lo pruebe gente.
- Todo esto mide bots con reglas sencillas. Sirve para descartar estrategias rotas, no sustituye a probarlo con personas.

## Versión anterior

El juego clásico (plantilla de 6, todos los futbolistas marcan con su número y gana la jornada quien más goles hace) está guardado en la rama `respaldo/v0.1-clasico`.
