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
