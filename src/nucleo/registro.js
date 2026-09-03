// El modelo: un registro es una cabecera más una lista de filas de alumnos.
// No sabe nada de pantallas ni de servicios.

let contador = 0;

export function generarId(prefijo = 'id') {
  if (globalThis.crypto?.randomUUID) return `${prefijo}-${globalThis.crypto.randomUUID()}`;
  contador += 1;
  return `${prefijo}-${Date.now().toString(36)}-${contador}`;
}

export function cabeceraVacia() {
  return { anio: '', salon: '', curso: '', periodo: '', docente: '' };
}

export function crearRegistro() {
  return { variante: null, cabecera: cabeceraVacia(), filas: [] };
}

export function crearFila({ n = null, alumno = '', notas = {}, tinta = {}, hojaId = null } = {}) {
  return {
    id: generarId('fila'),
    n: Number.isInteger(n) ? n : null,
    alumno: String(alumno ?? '').trim(),
    notas: { ...notas },
    tinta: { ...tinta },
    hojaId,
    dudas: {},
    dudasFila: [],
  };
}

// "08" se queda "08". Un número suelto se pasa a texto de dos dígitos.
export function normalizarNota(valor) {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) return '';
    return Number.isInteger(valor) && valor >= 0 && valor < 100
      ? String(valor).padStart(2, '0')
      : String(valor);
  }
  return String(valor).trim();
}

// Para emparejar claves aunque vengan con variaciones de acentos o espacios.
export function normalizarClave(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Separa las notas que corresponden a columnas de la plantilla de las que no.
export function limpiarNotas(notasCrudas, columnas) {
  const porClave = new Map(columnas.map((c) => [normalizarClave(c.clave), c.clave]));
  const notas = {};
  const desconocidas = [];
  for (const [clave, valor] of Object.entries(notasCrudas ?? {})) {
    const nota = normalizarNota(valor);
    if (nota === '') continue;
    const canonica = porClave.get(normalizarClave(clave));
    if (canonica) notas[canonica] = nota;
    else desconocidas.push(clave);
  }
  return { notas, desconocidas };
}

export function limpiarTinta(tintaCruda, columnas) {
  const porClave = new Map(columnas.map((c) => [normalizarClave(c.clave), c.clave]));
  const tinta = {};
  for (const [clave, valor] of Object.entries(tintaCruda ?? {})) {
    const canonica = porClave.get(normalizarClave(clave));
    const color = String(valor ?? '').toLowerCase();
    if (canonica && color === 'rojo') tinta[canonica] = 'rojo';
  }
  return tinta;
}

export function ordenarFilas(filas) {
  return [...filas].sort((a, b) => {
    if (a.n === null && b.n === null) return 0;
    if (a.n === null) return 1;
    if (b.n === null) return -1;
    return a.n - b.n;
  });
}

function limpiarParaArchivo(texto) {
  return String(texto ?? '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function nombreArchivo(cabecera) {
  const partes = [cabecera.salon, cabecera.curso, cabecera.periodo]
    .map(limpiarParaArchivo)
    .filter(Boolean);
  return `${partes.length ? partes.join('_') : 'registro'}.xlsx`;
}
