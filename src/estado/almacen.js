// Todo el estado vive aquí. Las pantallas lo leen y se avisan de los cambios.
// Nada de esto se guarda al cerrar la pestaña.

const estado = {
  fase: 'carga', // 'carga' | 'leyendo' | 'revision'
  hojas: [], // { id, nombre, archivo, huella, rotacion, imagen, miniatura, estado, error }
  lecturas: new Map(), // hojaId -> lectura devuelta por el servicio
  registro: null,
  variante: null,
  avisos: [],
  dudas: 0,
  revisadas: new Set(), // celdas que el docente ya confirmó o corrigió
  correcciones: new Map(), // 'filaId|clave' -> valor, para no perderlas si se vuelve a leer
  filasManuales: [], // filas añadidas a mano en la revisión
  progreso: { texto: '', fraccion: 0 },
};

const oyentes = new Set();

export function obtenerEstado() {
  return estado;
}

export function suscribir(oyente) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function notificar() {
  for (const oyente of oyentes) oyente(estado);
}

export function actualizar(cambios) {
  Object.assign(estado, cambios);
  notificar();
}

export function hojaPorId(id) {
  return estado.hojas.find((h) => h.id === id) ?? null;
}

export function filaPorId(id) {
  return estado.registro?.filas.find((f) => f.id === id) ?? null;
}
