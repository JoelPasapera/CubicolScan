// Las columnas del registro, por año. Esto es lo que hace posible la app:
// la cuadrícula se conoce de antemano y solo hay que colocar dentro lo leído.
// Añadir un año nuevo es añadir una entrada a VARIANTES, sin tocar nada más.

const col = (clave, etiqueta, grupo = null, sueleVacia = false) => ({
  clave,
  etiqueta: etiqueta ?? clave,
  grupo,
  sueleVacia,
});

const VARIANTE_2026 = Object.freeze({
  anio: '2026',
  titulo: 'REGISTRO AUXILIAR - 2026',
  columnas: [
    col('PROMEDIO (1)', 'PROMEDIO', null, true),
    col('Actitud frente al curso (Bimestral)', null, null, true),
    col('T1', null, 'Tareas Virtuales'),
    col('T2', null, 'Tareas Virtuales'),
    col('T3', null, 'Tareas Virtuales'),
    col('T4', null, 'Tareas Virtuales'),
    col('T5', null, 'Tareas Virtuales'),
    col('T6', null, 'Tareas Virtuales'),
    col('PROMEDIO (2)', 'PROMEDIO', null, true),
    col('R1. MEN', null, 'Trabajo en Clase'),
    col('R2. BIM', null, 'Trabajo en Clase'),
    col('Revisión de Cuadernos', null, 'Trabajo en Clase', true),
    col('REV1-MEN', null, 'Trabajo en Clase'),
    col('REV2-BIM', null, 'Trabajo en Clase'),
    col('Rev. Libro', null, 'Trabajo en Clase', true),
    col('PC1 / MENSUAL', null, 'Trabajo en Clase'),
    col('PC2 / BIM', null, 'Trabajo en Clase'),
    col('PC3 / BIM', null, 'Trabajo en Clase'),
    col('PC. Calificadas / Writing and Reading', null, 'Trabajo en Clase', true),
    col('ORAL1 / PERSONAL', null, 'Trabajo en Clase'),
    col('ORAL2/ CONVERSATION', null, 'Trabajo en Clase'),
    col('Orales / Speaking', null, 'Trabajo en Clase', true),
    col('PROMEDIO (3)', 'PROMEDIO', null, true),
    col('Examen Mensual / Reading and Writing'),
    col('Bimestral - Proyect'),
  ],
});

const VARIANTE_2020 = Object.freeze({
  anio: '2020',
  titulo: 'REGISTRO AUXILIAR - 2020',
  columnas: [
    col('PROMEDIO (1)', 'PROMEDIO', null, true),
    col('T1', null, 'Tareas'),
    col('T2', null, 'Tareas'),
    col('T3', null, 'Tareas'),
    col('T4', null, 'Tareas'),
    col('T5', null, 'Tareas'),
    col('T6', null, 'Tareas'),
    col('PROMEDIO (2)', 'PROMEDIO', null, true),
    col('Trab. T1', 'T1', 'Revisión - Trabajo en Clase'),
    col('Trab. T2', 'T2', 'Revisión - Trabajo en Clase'),
    col('Revisión de Cuadernos', null, 'Revisión - Trabajo en Clase', true),
    col('Cuad. T1', 'T1', 'Revisión - Trabajo en Clase'),
    col('Cuad. T2', 'T2', 'Revisión - Trabajo en Clase'),
    col('Rev. Libro', null, 'Revisión - Trabajo en Clase', true),
    col('PC1', null, 'Revisión - Trabajo en Clase'),
    col('PC2', null, 'Revisión - Trabajo en Clase'),
    col('PC3', null, 'Revisión - Trabajo en Clase'),
    col('PC4', null, 'Revisión - Trabajo en Clase'),
    col('PC5', null, 'Revisión - Trabajo en Clase'),
    col('PC6', null, 'Revisión - Trabajo en Clase'),
    col('PC. Calificadas', null, 'Revisión - Trabajo en Clase', true),
    col('ORAL1', null, 'Revisión - Trabajo en Clase'),
    col('ORAL2', null, 'Revisión - Trabajo en Clase'),
    col('Orales', null, 'Revisión - Trabajo en Clase', true),
    col('PROMEDIO (3)', 'PROMEDIO', null, true),
    col('Examen Mensual'),
    col('Examen Bimestral'),
  ],
});

export const VARIANTES = Object.freeze({
  2026: VARIANTE_2026,
  2020: VARIANTE_2020,
});

export const VARIANTE_POR_DEFECTO = VARIANTE_2026;

// Devuelve la variante exacta de un año, o null si no hay plantilla para él.
export function detectarVariante(anio) {
  const texto = String(anio ?? '').match(/\d{4}/)?.[0];
  return texto && VARIANTES[texto] ? VARIANTES[texto] : null;
}

export function obtenerVariante(anio) {
  return VARIANTES[String(anio)] ?? null;
}

export function clavesDe(variante) {
  return variante.columnas.map((c) => c.clave);
}

// Los grupos de columnas en orden, con cuántas columnas seguidas abarca cada uno.
// Sirve para dibujar las cabeceras agrupadas en pantalla y en el Excel.
export function tramosDe(variante) {
  const tramos = [];
  for (const columna of variante.columnas) {
    const ultimo = tramos[tramos.length - 1];
    if (ultimo && ultimo.grupo !== null && ultimo.grupo === columna.grupo) {
      ultimo.columnas.push(columna);
    } else {
      tramos.push({ grupo: columna.grupo, columnas: [columna] });
    }
  }
  return tramos;
}

// Texto que describe la cuadrícula de una variante para el servicio de lectura.
export function describirParaLectura(variante) {
  const lineas = variante.columnas.map((c, i) => {
    const partes = [`${i + 1}. "${c.clave}"`];
    if (c.grupo) partes.push(`— grupo "${c.grupo}"`);
    if (c.sueleVacia) partes.push('(suele estar vacía)');
    return partes.join(' ');
  });
  return [
    `Variante ${variante.anio} (título "${variante.titulo}"): tras las columnas N° y APELLIDOS Y NOMBRES hay exactamente ${variante.columnas.length} columnas de notas, en este orden físico de izquierda a derecha:`,
    ...lineas,
  ].join('\n');
}
