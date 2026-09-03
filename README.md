# Registro a Excel

Convierte la foto de un registro auxiliar de notas, rellenado a mano, en un
Excel idéntico al papel.

## Arrancar

    node servidor.js

y abrir `http://localhost:8080`. No hay nada que instalar: solo hace falta
Node. Con `http://localhost:8080/?demo` se ve un registro inventado sin gastar
lecturas.

La primera vez, la app pide la clave del servicio de lectura. Se guarda en el
navegador y no sale de ahí.

## Probar

    node pruebas/ejecutar.js
    python pruebas/navegador.py

La segunda necesita Python con `playwright` y su Chromium.

## Carpetas

- `src/` la aplicación, por módulos (ver `docs/especificacion.md`).
- `estilos/` el aspecto.
- `docs/` qué es el registro y cómo funciona la app.
- `pruebas/` pruebas; `pruebas/salida/` se genera y no se guarda.
- `ejemplos/` fotos reales de registros. Contiene datos de alumnos: está fuera
  del repositorio y no se comparte.

Reglas de trabajo en `CLAUDE.md`; lista de revisión antes de guardar en
`REVIEW.md`.
