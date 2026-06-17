# Ojo Maze

Mini juego arcade en HTML monolítico para móvil y escritorio.

## Concepto

Controlas un ojo circular dentro de laberintos ortogonales estáticos. El objetivo es llegar a la meta en el menor tiempo posible.

## Mecánicas actuales

- Joystick invisible: toca y arrastra en cualquier parte de la pantalla.
- Velocidad variable: arrastre corto para precisión, arrastre largo para máxima velocidad.
- Movimiento ortogonal inspirado en juegos arcade de laberinto.
- Laberintos infinitos generados por semilla determinística.
- Dificultad creciente por tamaño, complejidad y penalización.
- 5 vidas por intento.
- Chocar paredes resta vida y suma penalización de tiempo.
- Al morir, el nivel se reinicia y las vidas se recuperan.
- Música procedural simple con Web Audio API, activada por el primer toque.

## Cómo jugar

1. Abre `index.html` en el navegador.
2. Toca la pantalla para comenzar.
3. Arrastra en cualquier dirección para mover el ojo.
4. Llega al portal amarillo.
5. Intenta reducir tu tiempo final.

## Publicación recomendada

Este repo está pensado para GitHub Pages.

Ruta esperada:

```text
https://susiking.github.io/susi_juegos/
```

## Seguridad

El juego no usa dependencias externas, no solicita permisos, no usa login y no carga recursos remotos.

## Licencia

MIT License.
