# Equilibrio

Todos los valores están en `src/engine/config.ts`. Se han afinado con `npm run simulate`, que juega partidas completas entre bots con cinco estilos de juego y mide si alguno domina.

Para probar una variante sin tocar código:

```bash
FUT_OVERRIDES='{"prize":{"first":10,"last":4}}' FUT_SIZES=4,8 npm run simulate -- 1000
```

## Decisiones de diseño

| Problema | Solución |
|---|---|
| El que va ganando cobra más y se escapa | El colista abre el mercado; el 7 (VAR) regala cartas a la mitad baja; las sanciones apuntan al líder; el premio del último (3M) no está tan lejos del primero (8M). |
| Con 2 jugadores salían muchos menos dados que con 8 | El partido son siempre 6 tiradas comunes, sea cual sea el número de clubes. |
| Comprar solo cracks o solo morralla | Precio cuadrático (los cracks cuestan más por punto) frente a un límite de 6 fichas (al final hacen falta). |
| Las cláusulas como robo sin coste | El dueño cobra el 130% y puede refichar; hay protección tras cada fichaje, blindaje y carta de cantera. |
| El dinero no valía nada en la última jornada | Balance final: 1 punto por cada 20M. Da además sentido al estadio como inversión. |
| Mercado atascado con cartas que nadie quiere | Cada jornada rota la carta más antigua. |

## Qué se cambió durante el afinado

| Valor | Primera versión | Final | Motivo |
|---|---|---|---|
| Taquilla por gol (niveles 1-5) | 2/3/4/5/6 | 1/2/3/5/7 | Sobraba dinero (120M sin gastar por club) y ampliar apenas se notaba. |
| Coste de ampliar | 15/25/35/50 | 10/18/28/40 | Apostar por el estadio perdía casi siempre. |
| Premio 1º / último | 10 / 4 | 8 / 3 | Menos dinero en circulación. |
| Precio | 2·p + 0,15·p² | 2,2·p + 0,12·p² | Los cracks eran demasiado caros para lo que rinden. |
| Venta al banco | 60% | 50% | Rotar la plantilla salía casi gratis. |
| Cláusula / blindada | 150% / 250% | 130% / 200% | Casi nadie llegaba a pagar una. |
| Carta especial | 4M | 5M | Comprar siempre carta era la mejor jugada. |
| Balance final | no existía | 1 punto / 20M | Ver tabla anterior. |

## Resultados (1500 partidas por mesa, temporada de 12 jornadas)

Ratio de victorias de cada estilo respecto a lo esperado por azar (1,00 = justo):

| Clubes | Equilibrado | Estrellas | Cantidad | Ladrillo | Tiburón |
|---|---|---|---|---|---|
| 2 | 1,00 | 0,86 | 0,88 | 1,18 | 1,07 |
| 3 | 1,09 | 0,69 | 1,15 | 0,94 | 1,12 |
| 4 | 1,04 | 0,77 | 1,18 | 0,96 | 1,04 |
| 6 | 1,23 | 0,76 | 1,25 | 0,66 | 1,10 |
| 8 | 1,23 | 0,87 | 1,25 | 0,63 | 1,02 |

- **Equilibrado:** de todo un poco. **Estrellas:** espera a jugadores buenos. **Cantidad:** llena la plantilla cuanto antes. **Ladrillo:** estadio primero. **Tiburón:** cartas y cláusulas.

| Clubes | Goles por club y jornada | Gana el líder del primer tercio | Puntos del colista frente al campeón | Estadio final medio | Cláusulas por partida | Cartas jugadas |
|---|---|---|---|---|---|---|
| 2 | 5,5 | 55% | 78% | 2,9 | 0,1 | 16 |
| 3 | 5,4 | 50% | 70% | 2,9 | 0,3 | 19 |
| 4 | 5,3 | 34% | 69% | 2,9 | 0,4 | 32 |
| 6 | 5,3 | 24% | 67% | 3,0 | 0,7 | 50 |
| 8 | 5,2 | 15% | 66% | 3,0 | 0,9 | 68 |

## Problemas conocidos

- **Estadio primero rinde mal con 6-8 clubes** (0,63-0,66). Con tantos rivales, llegar tarde a los goles cuesta demasiados puestos por jornada.
- **Esperar a los cracks sigue siendo algo flojo** (0,7-0,9).
- **Quien elige primero en pretemporada gana algo menos** de lo justo (por ejemplo 21% frente a 25% con 4 clubes): el último de la serpiente juega dos turnos seguidos.
- **Los bots pagan pocas cláusulas** (menos de una por partida). Es prudencia de la IA más que una medida fiable del coste; habrá que revisarlo con partidas entre personas.
- **Con 8 clubes el líder temprano gana poco más que por azar** (15% frente a 12,5%): mucha remontada, quizá demasiada para quien busque un juego más estratégico. Subir el premio del primero lo corrige.
- Todo esto mide bots con reglas sencillas. Sirve para descartar estrategias rotas, no sustituye a probarlo con gente.
