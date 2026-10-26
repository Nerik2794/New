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

## Versión 1.2: monedas y niveles

- Recoge monedas doradas en el hueco de las tuberías. Cada moneda cuenta una sola vez y produce un destello de partículas.
- Cada 10 monedas obtienes una recuperación. Si tienes tres vidas, queda guardada como carga; si falta una vida, se usa automáticamente. Las cargas guardadas se aplican después de la animación de daño, incluso si el impacto habría sido mortal. Nunca se superan tres vidas.
- El marcador indica monedas totales, progreso al siguiente grupo de diez y cargas disponibles.
- Cada tubería superada suma un punto al nivel y al total. Las metas son 15, 20, 25, 30, 35… (`15 + (nivel - 1) × 5`). El récord utiliza el total y se guarda cada vez que aumenta.
- Al alcanzar la meta se congelan obstáculos y físicas. El gato celebra y cae confeti durante 1,5 s. La pantalla de victoria permanece hasta pulsar **Siguiente nivel**.
- La transición limpia los obstáculos y conserva vidas, monedas, cargas y total. Pulsa **Despegar**, Espacio o el área de juego para iniciar el nuevo nivel. Desde la versión 1.3, la velocidad aumenta un 5 % compuesto por nivel, según la fórmula documentada abajo.
- Game Over muestra nivel alcanzado, total y monedas. Una nueva partida reinicia todo excepto el récord.

Parámetros adicionales en `game.js`: `COINS_PER_LIFE` (10), `COIN_EVERY` (una moneda cada N parejas), `COIN_RADIUS`, `BASE_TARGET` (15), `TARGET_INCREMENT` (5), `LEVEL_SPEED_FACTOR` (1.05) y `VICTORY_DURATION` (1.5 s). Se conservan la gravedad, el impulso, el zoom y los tiempos de daño anteriores.

Las pruebas incluyen recolección única, recompensas acumuladas, límite de vidas, objetivos exactos de niveles 1 y 2, victoria única sin generación, conservación al avanzar y prioridad de las colisiones sobre los puntos.


## Versión 1.3: dificultad progresiva y Dash Felino

La velocidad horizontal de cada nivel es `SPEED * (LEVEL_SPEED_FACTOR ** (nivel - 1))`. Con base 160 y factor 1.05: nivel 1 = 160, nivel 2 = 168, nivel 5 ≈ 194.48 y nivel 10 ≈ 248.21 unidades/s. No se aplica el límite anterior ni se acumulan incrementos sobre partidas previas. La gravedad, salto, tuberías y aberturas conservan sus dimensiones. El intervalo entre parejas se mantiene en tiempo de desplazamiento: aumenta su distancia con la velocidad para conservar el margen de reacción; las monedas acompañan a sus tuberías.

- **Shift izquierdo o derecho**, o el botón **ϟ DASH**, activa el Dash Felino. El botón no produce un salto. Espacio y clic/toque en el escenario siguen impulsando al gato.
- Cada nivel comienza con una carga, consumida al activarla. Recibir daño o recoger monedas no la recarga. Solo un nivel nuevo o una partida nueva la restauran.
- Durante exactamente un segundo de simulación, el gato avanza, deja una estela pixel art y atraviesa obstáculos sin daño. Las monedas y los puntos siguen contando. El botón muestra el tiempo restante; después queda gris.
- Al terminar, vuelve suavemente a su posición. Los obstáculos en el corredor de retorno se desplazan juntos con sus monedas para garantizar una salida segura. Se conserva su estado de puntuación/recolección y no se concede invulnerabilidad adicional por el dash. La protección de recuperación de una vida, si ya existía, mantiene su temporizador independiente.
- No se activa durante inicio, daño, victoria, transición o Game Over. Completar un nivel cancela el dash y da paso a la celebración. El aviso **+5% velocidad** aparece desde el segundo nivel y permanece durante los primeros dos segundos de juego.

Parámetros configurables: `LEVEL_SPEED_FACTOR` (1.05), `DASH_DURATION` (1 s), `DASH_DISTANCE` (100 unidades), `DASH_RETURN` (0.35 s) y `DASH_SCROLL_FACTOR` (1.8). `SPEED` sigue siendo la velocidad base. La cuenta del dash utiliza el mismo paso fijo y la misma pausa por pestaña oculta que la física.

Pruebas: `node --test tests/game.test.cjs`. La suite comprueba la fórmula en niveles 1, 2, 5 y 10; duración exacta, límites, salida segura, cargas, monedas, puntos y victoria durante el dash, además de las mecánicas anteriores. Para una comprobación manual, abre `index.html` en Chrome, inicia, usa Shift o el botón y verifica que no se pueda repetir hasta el siguiente nivel. No se requiere servidor ni instalación.
