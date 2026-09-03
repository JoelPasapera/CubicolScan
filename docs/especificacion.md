# Especificación

## El recorrido del docente

1. Abre la app. Si es la primera vez, pega su clave. No vuelve a hacerlo.
2. Arrastra las fotos de su registro, o las elige, o saca una con el móvil.
   Una, dos o las que sean. Puede girarlas, ordenarlas y quitarlas.
3. Pulsa "Leer registro" y ve qué hoja se está leyendo. Puede cancelar.
4. Aparece la cabecera leída y la tabla completa, con la misma cuadrícula del
   papel. Las casillas dudosas están en amarillo. Al pulsar en una fila, la
   foto de su hoja aparece al lado, con zoom.
5. Corrige lo que haga falta escribiendo encima, o confirma con Intro.
   "Ir a la siguiente duda" salta de una casilla dudosa a la siguiente.
   Puede añadir o quitar filas.
6. Pulsa "Descargar Excel" y obtiene el archivo. Si quedan dudas o avisos
   graves, se le pregunta antes.

Nada más. Sin cuentas, sin guardar, sin menús.

## Cómo se arranca

Archivos estáticos. En desarrollo: `node servidor.js` y abrir
`http://localhost:8080`. Con `?demo` al final se carga un registro inventado
sin gastar lecturas. Para los docentes, cualquier alojamiento estático.

## Módulos

Un archivo por responsabilidad. Los de `nucleo/` y `exportar/` no saben nada
de pantallas ni de red (se prueban con Node); los de `interfaz/` no saben nada
de servicios.

```
index.html
servidor.js            servidor de archivos para desarrollo, sin dependencias
estilos/
  base.css             colores, tipografía, botones, campos
  interfaz.css         pantallas, zona de fotos, tabla, panel de foto
src/
  main.js              arranque y cableado: fotos → lectura → fusión → revisión → Excel
  config.js            dirección del servicio, modelo, tamaños; nada visible al usuario
  demo.js              registro inventado para el modo ?demo
  estado/
    almacen.js         el estado de la app, en un solo sitio
  nucleo/
    plantillas.js      las columnas por año (ver plantilla-registro.md)
    registro.js        el modelo: cabecera + filas; normalización de notas y claves
    fusion.js          unir varias hojas en un registro; solapes, huecos, mezclas
    dudas.js           qué casillas marcar para revisar
  servicios/
    lectura.js         mandar la foto y recibir la tabla; texto de instrucciones
    clave.js           guardar y leer la clave del navegador
    imagen.js          girar, reducir y preparar la foto; huella para repetidas
  exportar/
    zip.js             escritor mínimo de zip (un .xlsx es un zip con XML)
    excel.js           el .xlsx: cuadrícula, cabeceras combinadas, colores de tinta
  interfaz/
    carga.js           zona de fotos: subir, girar, ordenar, quitar
    ajustes.js         ventana de la clave
    cabecera.js        los cinco campos de arriba
    tabla.js           la tabla editable con la cuadrícula del papel
    foto.js            panel con la foto de la hoja de la fila enfocada
    avisos.js          errores y estados
pruebas/
  ejecutar.js          pruebas con Node de los módulos sin pantalla
  navegador.py         la app entera en Chromium sin ventana (playwright)
```

## Cómo se unen las hojas

Cada foto se lee por separado y devuelve sus filas con el `N°` que trae. La
unión es por ese número, no por el orden en que se subieron las fotos ni por el
nombre del archivo. Cada fila recibe un identificador estable (hoja + número),
para que las correcciones del docente sobrevivan si se vuelve a leer.

Casos resueltos, no ignorados:

- **Se solapan.** Dos fotos traen la fila 23. Gana la primera y se avisa.
- **Hoja repetida.** Todas las filas de una foto ya estaban en otra: se ignora
  y se avisa. Además, la misma foto (mismos bytes) no se deja subir dos veces.
- **Falta un tramo.** Una foto acaba en 22 y la siguiente empieza en 30. Se dice
  cuáles faltan y se avisa como grave antes de descargar.
- **Falta la primera hoja.** El registro empieza en 23: se avisa.
- **Son de registros distintos.** Las cabeceras no coinciden (otro salón, otro
  curso): aviso grave.
- **Continuación leída con otra plantilla.** Si una hoja sin cabecera se leyó
  antes de conocer el año del registro y con otra variante, se vuelve a leer
  con la variante correcta.

## Qué devuelve el servicio de lectura

Un objeto por foto. Este es el contrato entre `lectura.js` y el resto: si
cambia, cambia aquí primero.

```json
{
  "hoja": { "tipo": "con_cabecera", "variante": "2026", "primerN": 1, "ultimoN": 22 },
  "cabecera": {
    "anio": "2026",
    "salon": "Virgen del Apocalipsis - 4TO C",
    "curso": "INGLES",
    "periodo": "2do Bimestre",
    "docente": "APELLIDOS, Nombres"
  },
  "filas": [
    {
      "n": 1,
      "alumno": "APELLIDOS NOMBRES, Nombre",
      "notas": { "T1": "16", "T2": "16", "R1. MEN": "16", "PC1 / MENSUAL": "13" },
      "tinta": { "PC1 / MENSUAL": "rojo" }
    }
  ]
}
```

Reglas del contrato:

- Las claves de `notas` son exactamente los nombres de columna de la plantilla.
  La fusión tolera variaciones de acentos y mayúsculas y descarta, avisando,
  las claves que no existen.
- Una celda vacía no aparece en `notas`. No se manda `""` ni `null`.
- Las notas van como texto de dos dígitos, no como número. `08` tiene que
  seguir siendo `08`. Si llega un número suelto, se convierte a dos dígitos.
- Una casilla ilegible llega como `"?"` o con el dígito dudoso como `?`
  (`"1?"`). Eso la marca como duda.
- Si la foto es una continuación, `cabecera` viene con los campos vacíos.

El texto de instrucciones que se manda con la foto se genera en
`construirPrompt()` a partir de `plantillas.js`, así que las claves y su orden
siempre coinciden con la plantilla. Si se conoce la variante del registro
(por una hoja con cabecera ya leída), se fija; si no, se pide deducirla.

## Cómo se marcan las dudas

Pedirle al servicio que puntúe su propia confianza no sirve: esa cifra no
significa nada real. Se marcan por reglas propias, que sí son comprobables:

Por casilla:
- Contiene `?` (el servicio no la leyó bien).
- No es un número.
- Tiene un solo dígito.
- Es mayor que 20.
- Está en una columna que suele estar vacía (los tres PROMEDIO, Actitud,
  Revisión de Cuadernos, Rev. Libro, PC. Calificadas, Orales).

Por fila:
- Sin número o sin nombre.
- Número repetido o salto en la numeración respecto a la fila anterior.
- Bastantes menos notas que las demás filas (cuatro o más por debajo de la
  mediana, cuando la mediana es al menos seis).

Una casilla deja de contar como duda cuando el docente la corrige o la
confirma con Intro. La cuenta de dudas se muestra siempre arriba de la tabla.

Hay una regla más, mejor que todas estas, pero cuesta el doble por registro:
leer cada foto dos veces y marcar donde las dos lecturas no coincidan. Está
pendiente de decidir; no implementarla sin preguntar.

## El Excel

Se escribe sin librerías: `zip.js` construye el contenedor y `excel.js` los
XML del formato. Es una hoja, "Registro":

- Fila 1: título del registro (`REGISTRO AUXILIAR - <año>`), combinado.
- Filas 2 y 3: Salón, Curso, Periodo y Docente.
- Filas 5 y 6: cabecera de la cuadrícula. Los grupos (Tareas Virtuales,
  Trabajo en Clase) combinados horizontalmente con fondo celeste; los nombres
  de columna en vertical, como en el papel; N° y APELLIDOS Y NOMBRES
  combinados en vertical.
- Desde la fila 7: un alumno por fila, ordenados por N°.
- Las notas se escriben como texto, para que `08` sobreviva, en azul; las
  escritas en bolígrafo rojo, en rojo.
- Columnas vacías en el papel, vacías en el Excel. Sin ceros ni guiones.
- Sin fórmulas y sin promedios calculados. Es una copia, no una hoja de cálculo.
- Fuente Arial. Cabecera y dos primeras columnas fijadas al desplazarse.
  Configurado para imprimir apaisado ajustado a una página de ancho.
- El nombre del archivo sale de la cabecera: `salon_curso_periodo.xlsx`.

`pruebas/ejecutar.js` genera `pruebas/salida/muestra-2026.xlsx` y
`muestra-2020.xlsx` para abrirlos y comprobar la cuadrícula a ojo.

## La clave

Se guarda en el navegador del docente y en ningún otro sitio. No va nunca en la
dirección web, ni en la consola, ni en el repositorio.

Si la clave falta, la app abre la ventana para pegarla. Si no vale, lo dice con
claridad y ofrece abrir los ajustes, sin perder las fotos ya subidas ni lo
revisado en pantalla.

En la interfaz se llama "clave del servicio de lectura". No se nombra el
proveedor en ningún texto visible.

## Privacidad

Los registros llevan nombres y notas de menores. Por eso:

- Las fotos y los nombres solo salen del navegador hacia el servicio de lectura.
  A ningún otro sitio, por ningún motivo. La app no carga fuentes ni recursos
  de terceros.
- Nada se guarda al cerrar la pestaña: ni fotos, ni tablas, ni nombres. Lo único
  que persiste es la clave. Al cerrar o recargar con trabajo a medias, el
  navegador pide confirmación.
- Ningún nombre de alumno se escribe en la consola, ni siquiera al depurar.
- Las fotos se reducen antes de mandarse (lado mayor de 2576 px como mucho),
  lo justo para que se lean bien.

Si en algún momento hace falta guardar registros entre sesiones, es una decisión
nueva y hay que hablarla. No se añade de paso.

## Cuando algo falla

Cada uno dice qué pasó y qué hacer:

- El archivo subido no es una imagen, o está dañado.
- La misma foto subida dos veces.
- Clave que falta o no vale (abre los ajustes).
- Sin conexión, servicio saturado, demasiadas peticiones, lectura demasiado
  larga o foto rechazada (ofrece reintentar).
- Respuesta del servicio que no se puede interpretar.
- Hoja con más contenido del que cabe en una lectura (pide partir la foto).
- Fotos de registros distintos mezcladas; filas que faltan entre hojas; hoja
  repetida; registro que no empieza en 1; año sin plantilla propia.

Ninguno deja la pantalla en blanco ni borra el trabajo ya revisado.
