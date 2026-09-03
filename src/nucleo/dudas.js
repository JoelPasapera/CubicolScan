// Qué casillas conviene revisar. Son reglas propias y comprobables;
// no se le pide al servicio que puntúe su propia seguridad.

export function idCelda(fila, clave) {
  return `${fila.id}|${clave}`;
}

export function motivoDudaNota(valor, columna) {
  const v = String(valor ?? '').trim();
  if (v === '') return null;
  if (v.includes('?')) return 'No se pudo leer bien';
  if (!/^\d+$/.test(v)) return 'No es un número';
  if (v.length === 1) return 'Tiene un solo dígito';
  if (Number(v) > 20) return 'Es mayor que 20';
  if (columna?.sueleVacia) return 'Esta columna suele estar vacía';
  return null;
}

function mediana(valores) {
  if (valores.length === 0) return 0;
  const orden = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(orden.length / 2);
  return orden.length % 2 ? orden[medio] : (orden[medio - 1] + orden[medio]) / 2;
}

// Marca las dudas en cada fila y devuelve cuántas hay en total.
// `revisadas` guarda las casillas que el docente ya confirmó o corrigió.
export function evaluarDudas(registro, variante, revisadas = new Set()) {
  const columnas = variante.columnas;
  const filas = registro.filas;
  const cuentas = filas.map((f) => Object.keys(f.notas).length);
  const habitual = mediana(cuentas);
  let total = 0;

  filas.forEach((fila, indice) => {
    fila.dudas = {};
    fila.dudasFila = [];

    for (const columna of columnas) {
      const valor = fila.notas[columna.clave];
      if (valor === undefined) continue;
      if (revisadas.has(idCelda(fila, columna.clave))) continue;
      const motivo = motivoDudaNota(valor, columna);
      if (motivo) {
        fila.dudas[columna.clave] = motivo;
        total += 1;
      }
    }

    if (!Number.isInteger(fila.n)) fila.dudasFila.push('Sin número de fila');
    if (!fila.alumno) fila.dudasFila.push('Sin nombre');

    const anterior = filas[indice - 1];
    if (anterior && Number.isInteger(fila.n) && Number.isInteger(anterior.n)) {
      if (fila.n === anterior.n) fila.dudasFila.push('Número repetido');
      else if (fila.n - anterior.n !== 1) fila.dudasFila.push('Salto en la numeración');
    }

    if (habitual >= 6 && cuentas[indice] <= habitual - 4) {
      fila.dudasFila.push('Tiene bastantes menos notas que las demás filas');
    }

    total += fila.dudasFila.length;
  });

  return total;
}
