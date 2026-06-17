# LaberinOjo

Mini juego arcade modular para móvil y escritorio, publicado como sitio estático en GitHub Pages.

## Concepto

Controlas un ojo circular dentro de laberintos ortogonales estáticos. El objetivo es llegar a la meta en el menor tiempo posible.

## Versión actual

```text
v0.0.0.8 · 2026-06-17 08:07 CLT
```

## Regla obligatoria de versionado

Cada cambio del juego debe incrementar la versión secuencialmente:

```text
v0.0.0.8 → v0.0.0.9 → v0.0.1.0 → v0.0.1.1
```

La regla está automatizada con:

```bash
npm run bump
```

El script actualiza:

- `js/config.js`
- `index.html`
- `js/main.js`
- `js/game.js`
- `js/maze.js`
- `README.md`
- cache keys `?v=XXX`
- timestamp en zona horaria Chile

## Mecánicas actuales

- Joystick invisible: toca y arrastra en cualquier parte de la pantalla.
- Cruceta táctil fija para compatibilidad con WebViews como Instagram.
- Cruceta en modo persistente: tocar una dirección mantiene el movimiento hasta tocar otra.
- Velocidad variable: arrastre corto para precisión, arrastre largo para máxima velocidad.
- Movimiento ortogonal inspirado en juegos arcade de laberinto.
- Laberintos infinitos generados por semilla determinística.
- Dificultad creciente por tamaño, complejidad y penalización.
- 5 vidas por intento.
- Chocar paredes resta vida y suma penalización de tiempo.
- Al morir, el nivel se reinicia y las vidas se recuperan.
- Botón rojo de teletransporte de emergencia.
- El teletransporte puede saltar muros si el destino sano cabe dentro del rango.
- Música procedural simple con Web Audio API, activada por el primer toque.
- Música configurada a 75 BPM y transposición total de -6 semitonos.
- Compatibilidad móvil reforzada para WebViews como Instagram.
- Cada carga nueva limpia el progreso local y parte desde nivel 1.
- CSS/JS usan cache-busting por versión para reducir caché agresivo en WebViews.

## Estructura del repo

```text
susi_juegos/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── main.js
│   ├── game.js
│   ├── maze.js
│   ├── audio.js
│   └── config.js
├── scripts/
│   └── bump-version.mjs
├── apps-script-ranking.gs
├── package.json
├── README.md
└── LICENSE
```

## Rol de cada archivo

| Archivo | Función |
|---|---|
| `index.html` | Entrada principal para GitHub Pages. |
| `css/styles.css` | Estética visual, HUD, overlay, cruceta, botón rojo y layout mobile-first. |
| `js/main.js` | Bootstrap del juego. |
| `js/game.js` | Motor principal: input, movimiento, colisión, daño, HUD, render y teletransporte. |
| `js/maze.js` | Generación de laberintos por semilla. |
| `js/audio.js` | Música procedural y efectos sonoros. |
| `js/config.js` | Versión, timestamp, constantes, dificultad y utilidades. |
| `scripts/bump-version.mjs` | Incrementa versión, timestamp y cache keys. |
| `apps-script-ranking.gs` | Backend opcional para ranking global con Google Sheets. |

## Cómo jugar

1. Abre `index.html` o la URL publicada en GitHub Pages.
2. Toca la pantalla para comenzar.
3. En Instagram, toca una flecha de la cruceta para fijar dirección.
4. Toca otra flecha para cambiar dirección.
5. También puedes arrastrar en cualquier dirección para mover el ojo.
6. Usa el botón rojo si necesitas un teletransporte corto de emergencia.
7. Llega al portal amarillo.
8. Intenta reducir tu tiempo final.

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
