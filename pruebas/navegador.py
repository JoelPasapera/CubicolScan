"""Prueba de la app en un navegador real, en modo de ejemplo (sin clave).

Arranca el servidor, abre ?demo, recorre la revisión, descarga el Excel y
saca capturas en pruebas/salida/. Requiere Python con playwright y Chromium.

    python pruebas/navegador.py
"""

import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "pruebas" / "salida"
PUERTO = 8123
URL = f"http://localhost:{PUERTO}"


def comprobar(condicion, mensaje):
    print(("  ok  " if condicion else "  FALLO  ") + mensaje)
    return 0 if condicion else 1


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    servidor = subprocess.Popen([
        "node", str(RAIZ / "servidor.js"), str(PUERTO)
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.2)
    fallos = 0
    errores = []
    try:
        with sync_playwright() as p:
            navegador = p.chromium.launch()
            pagina = navegador.new_page(viewport={"width": 1400, "height": 900})
            pagina.on("console", lambda m: errores.append(f"[{m.type}] {m.text}") if m.type in ("error", "warning") else None)
            pagina.on("pageerror", lambda e: errores.append(f"[pageerror] {e}"))
            pagina.on("dialog", lambda d: d.accept())

            print("carga")
            pagina.goto(URL, wait_until="networkidle")
            pagina.wait_for_timeout(300)
            fallos += comprobar(pagina.is_visible("#seccion-carga"), "se abre en la pantalla de fotos")
            fallos += comprobar(pagina.evaluate("document.querySelector('#dialogo-ajustes').open"), "sin clave, pide la clave al entrar")
            pagina.click("#ajustes-cancelar")
            fotos = sorted((RAIZ / "ejemplos").glob("5A-rosario-2026-hoja*.jpeg"))
            if fotos:
                pagina.set_input_files("#entrada-archivos", [str(f) for f in fotos])
                pagina.wait_for_timeout(2500)
                fallos += comprobar(pagina.locator("li.hoja").count() == len(fotos), f"aparecen las {len(fotos)} fotos subidas")
                fallos += comprobar(pagina.locator("li.hoja--pendiente").count() == len(fotos), "las fotos quedan listas para leer")
                pagina.set_input_files("#entrada-archivos", [str(fotos[0])])
                pagina.wait_for_timeout(800)
                fallos += comprobar(pagina.locator("li.hoja").count() == len(fotos), "una foto repetida no se añade dos veces")
                fallos += comprobar("ya estaba subida" in pagina.locator("#avisos").inner_text(), "avisa de la foto repetida")
                pagina.click("li.hoja:first-child button[title='Girar la foto']")
                pagina.wait_for_timeout(1500)
                fallos += comprobar(pagina.locator("li.hoja--pendiente").count() == len(fotos), "girar una foto la deja lista otra vez")
                pagina.screenshot(path=str(SALIDA / "captura-carga.png"))
                pagina.click("#boton-leer")
                pagina.wait_for_timeout(300)
                fallos += comprobar(pagina.evaluate("document.querySelector('#dialogo-ajustes').open"), "leer sin clave abre los ajustes")
                pagina.click("#ajustes-cancelar")

            print("revisión (modo de ejemplo)")
            pagina.goto(f"{URL}/?demo", wait_until="networkidle")
            pagina.wait_for_timeout(400)
            fallos += comprobar(pagina.is_visible("#seccion-revision") and not pagina.is_visible("#seccion-carga"), "solo se ve la revisión")
            fallos += comprobar(pagina.locator("table.registro tbody tr").count() == 30, "30 filas en la tabla")
            fallos += comprobar(pagina.locator("td.duda").count() == 3, "3 casillas dudosas marcadas")
            anchuras = pagina.evaluate("[...document.querySelectorAll('table.registro tbody tr:first-child td.celda-nota')].map(td => td.getBoundingClientRect().width)")
            fallos += comprobar(min(anchuras) >= 40, f"todas las columnas de notas tienen anchura (mín. {min(anchuras):.0f}px)")
            pagina.click("text=Ir a la siguiente duda")
            pagina.wait_for_timeout(200)
            fallos += comprobar(pagina.evaluate("document.activeElement.dataset.clave") == "T3", "la primera duda es T3 de la fila 3")
            fallos += comprobar("Hoja 1 · fila 3" in pagina.locator(".foto__titulo").inner_text(), "el panel muestra la hoja de la fila enfocada")
            pagina.keyboard.press("Enter")
            pagina.wait_for_timeout(150)
            fallos += comprobar(pagina.locator("td.duda").count() == 2, "Intro confirma la casilla")
            fallos += comprobar(pagina.evaluate("document.activeElement.closest('tr').dataset.indice") == "3", "Intro baja a la fila siguiente")
            pagina.click("text=Ir a la siguiente duda")
            pagina.keyboard.press("Control+A")
            pagina.keyboard.type("16")
            pagina.wait_for_timeout(150)
            fallos += comprobar(pagina.locator("td.duda").count() == 1, "corregir quita la duda")
            pagina.screenshot(path=str(SALIDA / "captura-revision.png"))

            pagina.click("text=Añadir fila al final")
            pagina.wait_for_timeout(200)
            fallos += comprobar(pagina.locator("table.registro tbody tr").count() == 31, "se puede añadir una fila")
            pagina.click("table.registro tbody tr:last-child button[data-quitar]")
            pagina.wait_for_timeout(200)
            fallos += comprobar(pagina.locator("table.registro tbody tr").count() == 30, "se puede quitar una fila")

            with pagina.expect_download() as descarga:
                pagina.click("#boton-descargar")
            archivo = descarga.value
            destino = SALIDA / "descargado-demo.xlsx"
            archivo.save_as(str(destino))
            fallos += comprobar(destino.stat().st_size > 5000, f"descarga el Excel ({archivo.suggested_filename})")

            pagina.set_viewport_size({"width": 400, "height": 820})
            pagina.wait_for_timeout(300)
            pagina.screenshot(path=str(SALIDA / "captura-movil.png"))
            fallos += comprobar(pagina.evaluate("document.documentElement.scrollWidth <= 402"), "en móvil no desborda de lado")

            navegador.close()
    finally:
        servidor.terminate()

    fallos += comprobar(not errores, "sin errores de consola" + (f": {errores}" if errores else ""))
    print("\nTodo bien." if fallos == 0 else f"\n{fallos} fallo(s).")
    sys.exit(0 if fallos == 0 else 1)


if __name__ == "__main__":
    main()
