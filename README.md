# LaberinOjo

Mini juego arcade modular para móvil y escritorio, publicado como sitio estático en GitHub Pages.

## Concepto

Controlas un ojo circular dentro de laberintos ortogonales estáticos. El objetivo es llegar a la meta en el menor tiempo posible.

## Versión actual

```text
v0.0.1.7 · 2026-06-18 22:22 CLT
```

## Regla obligatoria de versionado

Cada cambio del juego debe incrementar la versión secuencialmente:

```text
v0.0.1.2 → v0.0.1.3 → v0.0.1.4 → v0.0.1.5
```

La regla está automatizada con:

```bash
npm run bump
```

Las reglas completas están en:

```text
CORE_RULES.md
```

El script actualiza:

- `js/config.js`
- `index.html`
- `js/main.js`
- `js/game.js`
- `js/maze.js`
- `js/audio.js`
- `README.md`
- `package.json`
- cache keys `?v=XXX`
- timestamp en zona horaria Chile

## Mecánicas actuales

- Movimiento continuo por píxeles con colisión contra muros del laberinto.
- Alineación suave al carril del laberinto para sostener giros limpios.
- Joystick/arrastre traducido a dirección sostenida.
- Velocidad base moderada con aceleración progresiva mientras se mantiene el arrastre.
- Cruceta proyectada sutil durante el arrastre como feedback direccional.
- Laberintos infinitos generados por semilla determinística.
- Dificultad creciente por tamaño, complejidad y penalización.
- 5 vidas por intento.
- Intentar moverse contra pared resta vida y suma penalización de tiempo.
- Al morir, el nivel se reinicia y las vidas se recuperan.
- Botón rojo de teletransporte de emergencia.
- El teletransporte puede saltar muros si el destino sano cabe dentro del rango.
- Música procedural simple con Web Audio API, inicializada al cargar y reanudada por gesto si el navegador bloquea autoplay.
- Ciclo musical aproximado: 6.4 segundos a 75 BPM.
- Música configurada a 75 BPM y transposición total de -6 semitonos.
- Inicio musical inmediato: `scheduleMusic()` se llama apenas el `AudioContext` queda running.
- Volumen maestro centralizado en `AUDIO_MASTER_GAIN = 0.5`.
- Audio robustecido con `AudioContext.resume()` en gestos de usuario.
- Cada carga nueva limpia el progreso local y parte desde nivel 1.
- CSS/JS usan cache-busting por versión para reducir caché agresivo en WebViews.

## Estructura del repo

```text
susi_juegos/
├── CORE_RULES.md
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
| `CORE_RULES.md` | Reglas obligatorias del proyecto. |
| `index.html` | Entrada principal para GitHub Pages. |
| `css/styles.css` | Estética visual, HUD, overlay, botón rojo y layout mobile-first. |
| `js/main.js` | Bootstrap del juego. |
| `js/game.js` | Motor principal: input, movimiento por grilla, interpolación visual, daño, HUD, render y teletransporte. |
| `js/maze.js` | Generación de laberintos por semilla. |
| `js/audio.js` | Música procedural, efectos sonoros, reanudación del contexto de audio y scheduling inmediato. |
| `js/config.js` | Versión, timestamp, constantes, volumen, música, dificultad y utilidades. |
| `scripts/bump-version.mjs` | Incrementa versión, timestamp y cache keys. |
| `apps-script-ranking.gs` | Backend opcional para ranking global con Google Sheets. |

## Cómo jugar

1. Abre `index.html` o la URL publicada en GitHub Pages.
2. Toca la pantalla para comenzar.
3. Arrastra en cualquier dirección para moverte de forma continua.
4. Usa la cruceta proyectada como referencia visual del gesto.
5. Usa el botón rojo si necesitas un teletransporte corto de emergencia.
6. Llega al portal amarillo.
7. Intenta reducir tu tiempo final.

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
