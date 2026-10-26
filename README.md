# Gato al vuelo

Un juego 2D de obstáculos inspirado en Flappy Bird, protagonizado por un gato negro de ojos amarillos. Desarrollado con HTML5 Canvas, CSS y JavaScript puro, sin dependencias, fuentes remotas ni recursos externos. Los gráficos pixel art se dibujan mediante código original.

## Jugar

Abre **index.html** directamente en un navegador moderno. No necesitas instalar paquetes, compilar ni configurar un servidor. Funciona también sin conexión.

1. Pulsa **Jugar** o **Espacio** para empezar.
2. Usa **Espacio**, haz clic o toca el área del juego para impulsarte.
3. Evita las tuberías, el suelo y el borde superior. Cada pareja superada suma un punto.
4. Tras perder, pulsa **Volver a jugar** o Espacio para reiniciar.

El récord se guarda en `localStorage` cuando el navegador lo permite. Si el almacenamiento está bloqueado, el juego funciona y mantiene el récord durante la sesión; en archivos locales la persistencia puede depender del navegador.

## Archivos

- `index.html`: estructura, marcadores y pantallas de inicio y fin.
- `styles.css`: interfaz adaptable a móviles y computadoras.
- `game.js`: física, entradas, colisiones, puntuación, almacenamiento y dibujos.

El bucle usa `requestAnimationFrame` y simulación con pasos fijos de 1/120 s para mantener la física consistente entre frecuencias de pantalla. Al ocultar la pestaña se descarta el tiempo ausente; los saltos largos de tiempo se limitan para evitar avances bruscos.

## Comprobaciones

Con Node.js disponible, comprueba la sintaxis con `node --check game.js` (Node no es necesario para jugar).

Prueba manual: inicia con el botón y con Espacio; comprueba clic y toque, atraviesa una pareja para sumar un único punto, choca con cada límite, reinicia y recarga para comprobar el récord. Repite en una ventana estrecha para comprobar la interfaz móvil.

## Vidas, recuperación y escala

Cada partida comienza con tres corazones. Un choque descuenta una sola vida y congela el escenario durante 0,4 s, con parpadeo, partículas y un destello rojo suave. Después, el gato reaparece en una zona segura con 1,5 s de invulnerabilidad. La puntuación se conserva; Game Over llega después de la animación del tercer impacto.

Parámetros ajustables al principio de `game.js`:

- `MAX_LIVES`: vidas iniciales (3); los corazones se generan automáticamente.
- `HIT_PAUSE`: pausa y animación de daño (0.4 segundos).
- `INVULNERABILITY`: protección después de reaparecer (1.5 segundos).
- `WORLD_SCALE`: escala de renderizado (0.85); amplía el mundo visible sin cambiar el contenedor.
- `PIPE_WIDTH`: ancho de tubería (54 unidades, aproximadamente 20 % menos).
- `PIPE_INTERVAL`: tiempo entre parejas (1.7 segundos).
- `GAP`: abertura vertical (174 unidades de mundo, sin cambios).

La cámara escala tanto los gráficos como sus posiciones; las colisiones usan las mismas coordenadas de mundo. La reaparición desplaza juntos los obstáculos próximos, manteniendo sus separaciones y sin conceder puntos artificiales.

Ejecuta las pruebas de simulación sin dependencias con `node --test tests/game.test.cjs`. Comprueban vidas, pausa, inmunidad, recuperación, puntuación, Game Over, generación, dimensiones de colisión y física a varias frecuencias de pantalla.

## Monedas y niveles

- Recoge monedas doradas en el hueco de las tuberías. Cada moneda cuenta una sola vez y produce un destello de partículas.
- Cada 10 monedas obtienes una recuperación. Si tienes tres vidas, queda guardada como carga; si falta una vida, se usa automáticamente. Las cargas guardadas se aplican después de la animación de daño, incluso si el impacto habría sido mortal. Nunca se superan tres vidas.
- El marcador indica monedas totales, progreso al siguiente grupo de diez y cargas disponibles.
- Cada tubería superada suma un punto al nivel y al total. Las metas son 5, 7, 9, 11, 13… (`5 + (nivel - 1) × 2`). El récord utiliza el total y se guarda cada vez que aumenta.
- Al alcanzar la meta se congelan obstáculos y físicas. El gato celebra y cae confeti durante 1,5 s. La pantalla de victoria permanece hasta pulsar **Siguiente nivel**.
- La transición limpia los obstáculos y conserva vidas, monedas, cargas y total. Pulsa **Despegar**, Espacio o el área de juego para iniciar el nuevo nivel. Desde la versión 1.4, la velocidad aumenta un 7 % compuesto por nivel, según la fórmula documentada abajo.
- Game Over muestra nivel alcanzado, total y monedas. Una nueva partida reinicia todo excepto el récord.

Parámetros adicionales en `game.js`: `COINS_PER_LIFE` (10), `COIN_EVERY` (una moneda cada N parejas), `COIN_RADIUS`, `BASE_TARGET` (5), `TARGET_INCREMENT` (2), `LEVEL_SPEED_FACTOR` (1.07) y `VICTORY_DURATION` (1.5 s). Se conservan la gravedad, el impulso, el zoom y los tiempos de daño anteriores.

Las pruebas incluyen recolección única, recompensas acumuladas, límite de vidas, objetivos exactos de niveles 1 y 2, victoria única sin generación, conservación al avanzar y prioridad de las colisiones sobre los puntos.


## Versión 1.5: progresión, velocidad y Dash Felino

Las metas de nivel son `5 + (nivel - 1) * 2`; la velocidad es `SPEED * (1.07 ** (nivel - 1))`. Se calculan desde la base al cambiar de nivel; reiniciar vuelve al nivel 1 sin acumular multiplicadores.

| Nivel | Meta | Multiplicador normal | Velocidad normal (unidades/s) |
| --- | --- | --- | --- |
| 1 | 5 | 1.000000x | 160.000000 |
| 2 | 7 | 1.070000x | 171.200000 |
| 3 | 9 | 1.144900x | 183.184000 |
| 4 | 11 | 1.225043x | 196.006880 |
| 5 | 13 | 1.310796x | 209.727362 |
| 6 | 15 | 1.402552x | 224.408277 |
| 7 | 17 | 1.500730x | 240.116856 |
| 8 | 19 | 1.605781x | 256.925036 |
| 9 | 21 | 1.718186x | 274.909789 |
| 10 | 23 | 1.838459x | 294.153474 |

La física vertical y las dimensiones de las tuberías no cambian. La separación horizontal crece con la velocidad del nivel para conservar el tiempo de reacción. El aviso **+7% velocidad** aparece desde el segundo nivel durante los primeros dos segundos de juego.

- **Shift izquierdo o derecho** o el botón **ϟ DASH** activa la habilidad. El botón no produce un salto. Espacio y clic/toque en el escenario siguen impulsando al gato.
- Cada nivel comienza con una carga. Daño y monedas no la recargan; un nuevo nivel o una partida nueva sí.
- El gato permanece en su posición horizontal habitual: no hay avance seguido de retroceso. El mundo recibe un impulso **aditivo**, independiente de la velocidad base del nivel.
- El impulso acelera con `smoothstep` durante 0,2 s y frena durante los últimos 0,35 s del dash, hasta recuperar la velocidad normal al cumplirse un segundo. La estela, las líneas y el brillo aparecen y desaparecen gradualmente; la postura se mezcla con la animación normal.
- La invulnerabilidad del dash dura un segundo de simulación. Si termina superpuesto a una tubería o junto a suelo/techo, se activa una salida de seguridad de **como máximo 0,25 s**, sin renovarse: el escenario despeja la superposición suavemente y, si hace falta, el gato se separa verticalmente del borde con interpolación. No se teletransporta ni se recolocan tuberías instantáneamente. Esta protección de salida es distinta de la recuperación de vida de 1,5 s.
- Las monedas se detectan a lo largo del movimiento entre pasos, para que una aceleración no las salte. Cada moneda y pareja siguen contabilizándose una sola vez.
- El dash no funciona durante inicio, daño, victoria, transición o Game Over. La victoria cancela impulso y salida de seguridad.

Parámetros en `game.js`: `TARGET_INCREMENT` (2), `LEVEL_SPEED_FACTOR` (1.07), `DASH_DURATION` (1 s), `DASH_EXTRA_SPEED` (160 unidades/s), `DASH_EASE_IN` (0.2 s), `DASH_EASE_OUT` (0.35 s), `DASH_EXIT_DURATION` (0.25 s). `SPEED` conserva la base de 160 unidades/s. La cuenta utiliza el paso fijo y pausa de pestaña de la física.

Ejecuta `node --test tests/game.test.cjs`. Se comprueban fórmulas de niveles 1, 2, 3 y 10; duración y carga del dash, salida limitada, ausencia de retroceso, continuidad del impulso, aceleración aditiva y consistencia a 30/60/120 FPS, además de vidas, monedas, puntos, niveles y récord. Manualmente, abre `index.html` en Chrome y prueba Shift y el botón; no necesitas servidor ni instalación.


## Pausa

Pulsa **Escape** o el botón pixel art de pausa en la esquina superior derecha del escenario. Se puede pausar mientras juegas o durante una animación de daño. La física, obstáculos, monedas, generación, partículas, dash, protección y animaciones de corazones quedan congelados, sin sumar puntos ni procesar colisiones.

- **Continuar** o Escape: reanuda el estado exacto. Se descarta el tiempo de reloj transcurrido en pausa para evitar saltos.
- **Reiniciar partida**: pide confirmación antes de volver al nivel 1 con tres vidas, cero puntos y monedas y dash disponible. Conserva el récord.
- **Salir del juego**: pide confirmación y regresa al menú principal; no intenta cerrar la pestaña. Desde allí puedes empezar otra partida.

Los botones admiten ratón, toque, Tab, Mayús+Tab y Enter/Espacio. El foco permanece en el diálogo. En una confirmación, Escape cancela la operación y vuelve al menú de pausa; un segundo Escape reanuda. Espacio en el menú acciona el botón enfocado sin saltar; Shift no activa el dash mientras esté pausado.

## Auditoría de velocidad de la versión 1.5

La base original era y sigue siendo `SPEED = 160` unidades de mundo por segundo. `speed()` calcula `SPEED * LEVEL_SPEED_FACTOR ** (level - 1)`, sin límite ni acumulación incremental. `nextLevel()` cambia el nivel una vez; la generación de tuberías no modifica ni la base ni el nivel.

El movimiento real utiliza `worldDelta = (speed() + dashBoost) * dt + clearanceDelta`. Tanto las tuberías como sus monedas restan exactamente ese desplazamiento. En movimiento normal, `dashBoost` y `clearanceDelta` son cero: no se encontró ningún error en el cálculo o aplicación del 7 %. El dash solo añade su impulso temporal; no cambia la velocidad base. La salida de seguridad es también temporal. No se alteraron estas fórmulas en esta versión.

La menor percepción de dificultad se explica por el espaciado: `PIPE_INTERVAL = 1.7` mantiene un intervalo equivalente de movimiento normal entre parejas. La distancia espacial entre ellas crece con la velocidad, así que el tiempo de reacción sigue siendo parecido. Se conserva este equilibrio, sin aumentar arbitrariamente el porcentaje ni cambiar la física.

El indicador **VELOCIDAD: 1.00x** usa `speed() / SPEED`, la misma fuente que aplica el desplazamiento normal, y no varía por el dash. Se actualiza al cambiar de nivel o reiniciar. Para distinguir unidades: el Canvas aplica escala 0.85; las velocidades de la tabla equivalen a `velocidad × 0.85` píxeles del bitmap por segundo, antes de la adaptación CSS al dispositivo. Esto no altera los multiplicadores.

La prueba automatizada de auditoría mueve una tubería y su moneda durante 120 pasos de 1/120 s, sin dash, en los niveles 1, 5 y 9. Los desplazamientos medidos fueron 160.000000, 209.727362 y 274.909789 unidades, respectivamente, coincidiendo con la fórmula dentro de 1e-8. No se limita a probar la función de velocidad. Otras pruebas cubren metas exactas de 5/7, meta 21 del nivel 9, congelación de estado completo, daño pausado, reanudación sin salto, confirmaciones, reinicio, salida y conservación del récord.
