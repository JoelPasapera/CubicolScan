// Une las lecturas de varias fotos en un solo registro.
// La unión es por el N° de cada fila, no por el orden de las fotos.

import { VARIANTE_POR_DEFECTO, detectarVariante, obtenerVariante } from './plantillas.js';
import { cabeceraVacia, crearFila, crearRegistro, limpiarNotas, limpiarTinta, ordenarFilas } from './registro.js';

const CAMPOS_CABECERA = ['anio', 'salon', 'curso', 'periodo', 'docente'];

function tieneCabecera(cabecera) {
  return CAMPOS_CABECERA.some((campo) => String(cabecera?.[campo] ?? '').trim() !== '');
}

function limpiarCabecera(cabecera) {
  const limpia = cabeceraVacia();
  for (const campo of CAMPOS_CABECERA) limpia[campo] = String(cabecera?.[campo] ?? '').trim();
  const anio = limpia.anio.match(/\d{4}/)?.[0];
  if (anio) limpia.anio = anio;
  return limpia;
}

function mismaCabecera(a, b) {
  const clave = (c) => ['salon', 'curso', 'periodo'].map((k) => c[k].toLowerCase().replace(/\s+/g, ' ')).join('|');
  return clave(a) === clave(b);
}

function rangos(numeros) {
  const tramos = [];
  for (const n of numeros) {
    const ultimo = tramos[tramos.length - 1];
    if (ultimo && ultimo.hasta === n - 1) ultimo.hasta = n;
    else tramos.push({ desde: n, hasta: n });
  }
  return tramos.map((t) => (t.desde === t.hasta ? `${t.desde}` : `${t.desde} a ${t.hasta}`)).join(', ');
}

// lecturas: [{ hojaId, hoja: { tipo, variante }, cabecera, filas: [{ n, alumno, notas, tinta }] }]
// Devuelve { registro, variante, avisos }.
export function fusionar(lecturas, { varianteForzada = null } = {}) {
  const avisos = [];
  const registro = crearRegistro();
  const aviso = (nivel, texto) => avisos.push({ nivel, texto });

  // 1. Cabecera: la de la primera hoja que la traiga.
  const conCabecera = lecturas
    .map((l) => ({ lectura: l, cabecera: limpiarCabecera(l.cabecera) }))
    .filter((x) => tieneCabecera(x.cabecera));

  if (conCabecera.length === 0) {
    aviso('aviso', 'Ninguna foto trae la cabecera del registro. Rellena Salón, Curso, Periodo y Docente a mano antes de descargar.');
  }
  registro.cabecera = conCabecera[0]?.cabecera ?? cabeceraVacia();

  for (const otra of conCabecera.slice(1)) {
    if (!mismaCabecera(registro.cabecera, otra.cabecera)) {
      aviso('error', `Las fotos parecen de registros distintos: una es de "${registro.cabecera.salon || '?'}" y otra de "${otra.cabecera.salon || '?'}". Revisa qué fotos has subido antes de seguir.`);
      break;
    }
  }

  // 2. Variante de la cuadrícula.
  let variante = obtenerVariante(varianteForzada) ?? detectarVariante(registro.cabecera.anio);
  if (!variante) {
    const deducidas = lecturas.map((l) => obtenerVariante(l.hoja?.variante)).filter(Boolean);
    variante = deducidas[0] ?? VARIANTE_POR_DEFECTO;
    if (registro.cabecera.anio) {
      aviso('aviso', `El año ${registro.cabecera.anio} no tiene plantilla propia. Se usa la de ${variante.anio}; comprueba que las columnas coinciden.`);
    }
  }
  registro.variante = variante.anio;

  // 3. Filas, unidas por N°.
  const porN = new Map();
  const sinNumero = [];
  const desconocidas = new Set();

  lecturas.forEach((lectura, indice) => {
    const etiquetaHoja = `hoja ${indice + 1}`;
    const solapadas = [];
    let filasValidas = 0;

    for (const cruda of lectura.filas ?? []) {
      const n = Number.parseInt(cruda.n, 10);
      const { notas, desconocidas: raras } = limpiarNotas(cruda.notas, variante.columnas);
      raras.forEach((r) => desconocidas.add(r));
      const fila = crearFila({
        n: Number.isInteger(n) && n > 0 ? n : null,
        alumno: cruda.alumno,
        notas,
        tinta: limpiarTinta(cruda.tinta, variante.columnas),
        hojaId: lectura.hojaId ?? null,
      });
      if (fila.n === null) {
        sinNumero.push(fila);
        continue;
      }
      // Id estable: si se vuelve a leer, las correcciones siguen encontrando su fila.
      fila.id = `${lectura.hojaId ?? 'hoja'}:${fila.n}`;
      filasValidas += 1;
      if (porN.has(fila.n)) {
        solapadas.push(fila.n);
        continue;
      }
      porN.set(fila.n, fila);
    }

    if (filasValidas > 0 && solapadas.length === filasValidas) {
      aviso('aviso', `La ${etiquetaHoja} repite las mismas filas que otra foto (${rangos(solapadas)}). Se ha ignorado; si son fotos distintas, quita una.`);
    } else if (solapadas.length > 0) {
      aviso('aviso', `Las filas ${rangos(solapadas)} aparecen en más de una foto. Se ha conservado la primera lectura de cada una.`);
    }
  });

  if (desconocidas.size > 0) {
    aviso('aviso', `Se leyeron notas en columnas que no existen en la plantilla (${[...desconocidas].join(', ')}) y se han descartado.`);
  }

  // 4. Orden y huecos.
  const numeros = [...porN.keys()].sort((a, b) => a - b);
  registro.filas = ordenarFilas([...porN.values(), ...sinNumero]);

  if (numeros.length === 0) {
    aviso('error', 'No se ha podido leer ninguna fila con número. Prueba con una foto más nítida, derecha y con la cuadrícula completa.');
    return { registro, variante, avisos };
  }

  if (numeros[0] > 1) {
    aviso('aviso', `El registro empieza en el N° ${numeros[0]}. Si hay una primera hoja, súbela también.`);
  }

  const faltan = [];
  for (let i = 1; i < numeros.length; i += 1) {
    for (let n = numeros[i - 1] + 1; n < numeros[i]; n += 1) faltan.push(n);
  }
  if (faltan.length > 0) {
    aviso('error', `Faltan las filas ${rangos(faltan)}. Puede faltar una hoja o la foto no las recoge enteras. No conviene descargar hasta resolverlo.`);
  }

  if (sinNumero.length > 0) {
    aviso('aviso', `${sinNumero.length === 1 ? 'Una fila no trae' : `${sinNumero.length} filas no traen`} número y se ${sinNumero.length === 1 ? 'ha colocado' : 'han colocado'} al final. Ponle el número que le corresponde.`);
  }

  return { registro, variante, avisos };
}
