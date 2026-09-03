// Pruebas de los módulos que no tocan pantalla. Se ejecutan con:
//   node pruebas/ejecutar.js
// Generan además pruebas/salida/muestra-2026.xlsx y muestra-2020.xlsx
// para abrirlos en Excel y comprobar la cuadrícula a ojo.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { VARIANTES, describirParaLectura, detectarVariante, tramosDe } from '../src/nucleo/plantillas.js';
import { limpiarNotas, nombreArchivo, normalizarNota } from '../src/nucleo/registro.js';
import { fusionar } from '../src/nucleo/fusion.js';
import { evaluarDudas } from '../src/nucleo/dudas.js';
import { crc32, crearZip } from '../src/exportar/zip.js';
import { generarExcel, letraColumna, xmlHoja } from '../src/exportar/excel.js';
import { construirPrompt, interpretarRespuesta } from '../src/servicios/lectura.js';
import { lecturasDemo } from '../src/demo.js';

const aqui = dirname(fileURLToPath(import.meta.url));
let fallos = 0;

function comprobar(condicion, mensaje) {
  if (condicion) {
    console.log(`  ok  ${mensaje}`);
  } else {
    fallos += 1;
    console.log(`  FALLO  ${mensaje}`);
  }
}

console.log('plantillas');
comprobar(VARIANTES[2026].columnas.length === 25, 'la variante 2026 tiene 25 columnas de notas');
comprobar(VARIANTES[2020].columnas.length === 27, 'la variante 2020 tiene 27 columnas de notas');
for (const variante of Object.values(VARIANTES)) {
  const claves = variante.columnas.map((c) => c.clave);
  comprobar(new Set(claves).size === claves.length, `claves únicas en ${variante.anio}`);
}
comprobar(detectarVariante('2026')?.anio === '2026', 'detecta 2026');
comprobar(detectarVariante('REGISTRO AUXILIAR - 2020')?.anio === '2020', 'detecta 2020 dentro del título');
comprobar(detectarVariante('2023') === null, 'un año sin plantilla devuelve null');
comprobar(tramosDe(VARIANTES[2026]).filter((t) => t.grupo).length === 2, '2026 tiene dos grupos');
comprobar(describirParaLectura(VARIANTES[2026]).includes('"PC1 / MENSUAL"'), 'la descripción para lectura lista las claves');

console.log('registro');
comprobar(normalizarNota(8) === '08', 'un número suelto se pasa a dos dígitos');
comprobar(normalizarNota('08') === '08', '"08" se queda "08"');
comprobar(normalizarNota(' 16 ') === '16', 'se recortan espacios');
const limpias = limpiarNotas({ T1: '16', 'revision de cuadernos': '15', Inventada: '10', T2: '' }, VARIANTES[2026].columnas);
comprobar(limpias.notas.T1 === '16', 'conserva claves exactas');
comprobar(limpias.notas['Revisión de Cuadernos'] === '15', 'empareja claves sin acentos ni mayúsculas');
comprobar(limpias.desconocidas.includes('Inventada'), 'separa las claves desconocidas');
comprobar(!('T2' in limpias.notas), 'una nota vacía no se guarda');
comprobar(nombreArchivo({ salon: 'Virgen del Rosario - 5TO A', curso: 'INGLES', periodo: '2do Bimestre' }) === 'Virgen-del-Rosario-5TO-A_INGLES_2do-Bimestre.xlsx', 'nombre de archivo');

console.log('fusión');
const [hoja1, hoja2] = lecturasDemo();
const { registro, variante, avisos } = fusionar([hoja2, hoja1]);
comprobar(variante.anio === '2026', 'toma la variante de la cabecera');
comprobar(registro.filas.length === 30, 'une las dos hojas (30 filas)');
comprobar(registro.filas[0].n === 1 && registro.filas[29].n === 30, 'ordena por N° aunque las fotos vengan al revés');
comprobar(avisos.length === 0, `sin avisos en una unión limpia (${avisos.map((a) => a.texto).join(' | ')})`);

const conHueco = fusionar([hoja1, { ...hoja2, filas: hoja2.filas.filter((f) => f.n !== 25) }]);
comprobar(conHueco.avisos.some((a) => a.texto.includes('Faltan las filas 25')), 'avisa de las filas que faltan');

const conSolape = fusionar([hoja1, hoja1]);
comprobar(conSolape.avisos.some((a) => a.texto.includes('repite las mismas filas')), 'detecta una hoja repetida');
comprobar(conSolape.registro.filas.length === 22, 'la hoja repetida no duplica filas');

const soloContinuacion = fusionar([hoja2]);
comprobar(soloContinuacion.avisos.some((a) => a.texto.includes('cabecera')), 'avisa si falta la cabecera');
comprobar(soloContinuacion.avisos.some((a) => a.texto.includes('empieza en el N° 23')), 'avisa si falta la primera hoja');

const otraCabecera = { ...hoja1, cabecera: { ...hoja1.cabecera, salon: 'Otro salón - 3RO B' } };
const mezcla = fusionar([hoja1, otraCabecera]);
comprobar(mezcla.avisos.some((a) => a.nivel === 'error' && a.texto.includes('registros distintos')), 'detecta fotos de registros distintos');

console.log('dudas');
const total = evaluarDudas(registro, variante);
const fila3 = registro.filas[2];
comprobar(fila3.dudas.T3 === 'Tiene un solo dígito', 'marca un dígito suelto');
comprobar(fila3.dudas['PC2 / BIM'] === 'No se pudo leer bien', 'marca una lectura con "?"');
comprobar(registro.filas[4].dudas['PROMEDIO (1)'] === 'Esta columna suele estar vacía', 'marca una nota en columna que suele estar vacía');
comprobar(total >= 3, `cuenta las dudas (${total})`);
const revisadas = new Set([`${fila3.id}|T3`]);
comprobar(evaluarDudas(registro, variante, revisadas) === total - 1, 'una casilla revisada deja de contar');

console.log('zip');
comprobar(crc32(new TextEncoder().encode('123456789')) === 0xcbf43926, 'crc32 del texto de referencia');
const zip = crearZip([{ nombre: 'a.txt', datos: 'hola' }]);
comprobar(zip[0] === 0x50 && zip[1] === 0x4b, 'el zip empieza por PK');

console.log('excel');
comprobar(letraColumna(1) === 'A' && letraColumna(26) === 'Z' && letraColumna(27) === 'AA' && letraColumna(29) === 'AC', 'letras de columna');
const xml = xmlHoja(registro, variante);
comprobar(xml.includes('<t xml:space="preserve">08</t>'), 'las notas van como texto y conservan el cero');
comprobar(xml.includes('Tareas Virtuales'), 'la cabecera lleva el grupo');
comprobar(xml.includes('<mergeCell ref="A1:AA1"/>'), 'el título se combina en toda la anchura (25 notas = hasta AA)');
comprobar((xml.match(/s="10"/g) ?? []).length >= 1, 'las notas en rojo llevan su estilo');

const salida = join(aqui, 'salida');
mkdirSync(salida, { recursive: true });
writeFileSync(join(salida, 'muestra-2026.xlsx'), generarExcel(registro, variante));

const registro2020 = fusionar([
  {
    hojaId: 'h',
    hoja: { tipo: 'con_cabecera', variante: '2020' },
    cabecera: { anio: '2020', salon: 'Aula de prueba - 5TO A', curso: 'INGLES', periodo: '1er Bimestre', docente: 'DOCENTE DE PRUEBA, Nombre' },
    filas: [
      { n: 1, alumno: 'APELLIDO PRUEBA, Alumno Uno', notas: { T1: '16', 'Trab. T1': '16', 'Cuad. T2': '18', PC1: '15', ORAL1: '15', 'Examen Mensual': '18', 'Examen Bimestral': '19' }, tinta: { PC1: 'rojo' } },
      { n: 2, alumno: 'APELLIDO PRUEBA, Alumno Dos', notas: { T1: '15', T6: '16', 'Trab. T2': '16', 'Cuad. T1': '17', PC1: '08', ORAL2: '16', 'Examen Mensual': '18', 'Examen Bimestral': '10' }, tinta: {} },
    ],
  },
]);
comprobar(registro2020.variante.anio === '2020', 'la variante 2020 se reconoce por la cabecera');
comprobar(registro2020.registro.filas[0].notas['Cuad. T2'] === '18', 'las claves duplicadas T1/T2 se distinguen por grupo');
writeFileSync(join(salida, 'muestra-2020.xlsx'), generarExcel(registro2020.registro, registro2020.variante));

console.log('lectura');
const prompt = construirPrompt('2026');
comprobar(prompt.includes('Esta hoja pertenece a un registro de la variante 2026'), 'el prompt fija la variante cuando se conoce');
comprobar(!construirPrompt(null).includes('Esta hoja pertenece'), 'sin variante conocida, pide deducirla');
const respuesta = '```json\n{"hoja":{"tipo":"continuacion","variante":"2026","primerN":23,"ultimoN":24},"cabecera":{},"filas":[{"n":23,"alumno":"APELLIDO, Nombre","notas":{"T1":"16","T2":8},"tinta":{"T1":"rojo"}}]}\n```';
const lectura = interpretarRespuesta(respuesta);
comprobar(lectura.hoja.tipo === 'continuacion', 'lee el JSON aunque venga entre marcas de código');
comprobar(lectura.filas[0].notas.T2 === 8, 'no toca los valores crudos (eso lo hace la fusión)');
comprobar(lectura.cabecera.salon === '', 'una cabecera vacía se rellena con campos vacíos');
let errorFormato = null;
try {
  interpretarRespuesta('esto no es json');
} catch (e) {
  errorFormato = e;
}
comprobar(errorFormato?.codigo === 'formato', 'una respuesta sin JSON da error de formato');

console.log(fallos === 0 ? '\nTodo bien.' : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
