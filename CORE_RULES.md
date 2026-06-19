# CORE_RULES

Reglas obligatorias para modificar LaberinOjo.

## 1. Versionado obligatorio

Todo cambio en el repo debe incrementar la versión secuencialmente.

Secuencia:

```text
v0.0.1.1 → v0.0.1.2 → v0.0.1.3 → v0.0.1.4 → v0.0.1.5
```

Regla de acarreo:

```text
v0.0.0.9 → v0.0.1.0
v0.0.1.9 → v0.0.2.0
v0.0.9.9 → v0.1.0.0
```

## 2. Script obligatorio

Antes de cerrar cualquier modificación se debe ejecutar conceptualmente:

```bash
npm run bump
```

El script debe actualizar:

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

## 3. Timestamp automático obligatorio

El timestamp nunca se debe inventar ni escribir manualmente.

Debe ser generado por:

```text
scripts/bump-version.mjs
```

usando:

```text
America/Santiago
```

Formato esperado:

```text
YYYY-MM-DD HH:mm CLT
```

## 4. Cache-busting obligatorio

Toda nueva versión debe sincronizar cache keys.

Ejemplo:

```text
v0.0.1.1 → ?v=011
v0.0.1.2 → ?v=012
v0.0.1.3 → ?v=013
```

## 5. Respuesta final obligatoria

Toda respuesta después de modificar el repo debe informar:

- versión final;
- archivos modificados;
- commits principales;
- link de prueba con cache key.

## 6. No romper GitHub Pages

`index.html` debe seguir siendo la entrada principal del sitio.

No se deben agregar dependencias externas obligatorias para ejecutar el juego.

## 7. Seguridad

El juego no debe pedir permisos sensibles:

- cámara;
- micrófono;
- ubicación;
- contactos;
- login obligatorio.

No usar `eval()` ni cargar scripts remotos innecesarios.

## 8. Compatibilidad móvil

Todo cambio visual o de input debe considerar:

- Android Chrome;
- Firefox desktop;
- WebViews móviles como Instagram;
- pantalla vertical.

## 9. Estado del juego

Cada apertura pública debe partir desde cero salvo que se defina explícitamente una mecánica de progreso persistente.

Actualmente se limpian:

```text
laberinOjoLevel
laberinOjoBest
```

## 10. Cambios de control

El control principal es el joystick por arrastre.

Durante el arrastre debe existir feedback visible, actualmente una cruceta proyectada sutil.

## 11. Regla de honestidad técnica

Si un cambio queda incompleto, se debe decir explícitamente y no afirmar que quedó cerrado.
