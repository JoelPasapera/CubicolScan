// Escribe el .xlsx directamente, sin librerías: el formato es un zip con
// unos pocos XML y aquí solo hace falta una hoja con celdas de texto,
// celdas combinadas, bordes y colores. Es una copia del papel: misma
// cuadrícula, mismas cabeceras agrupadas, mismas casillas vacías.
// Sin fórmulas y sin promedios calculados.

import { tramosDe } from '../nucleo/plantillas.js';
import { crearZip } from './zip.js';

const FILA_TITULO = 1;
const FILA_DATOS_1 = 2;
const FILA_DATOS_2 = 3;
const FILA_GRUPOS = 5;
const FILA_COLUMNAS = 6;
const PRIMERA_FILA_ALUMNO = 7;

const ESTILO = Object.freeze({
  normal: 0,
  titulo: 1,
  etiqueta: 2,
  valor: 3,
  grupo: 4,
  columnaRotada: 5,
  cabeceraFija: 6,
  numero: 7,
  nombre: 8,
  notaAzul: 9,
  notaRoja: 10,
});

export function letraColumna(indice) {
  let n = indice;
  let letras = '';
  while (n > 0) {
    const resto = (n - 1) % 26;
    letras = String.fromCharCode(65 + resto) + letras;
    n = Math.floor((n - 1) / 26);
  }
  return letras;
}

function escapar(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function celdaTexto(columna, fila, texto, estilo) {
  const ref = `${letraColumna(columna)}${fila}`;
  if (texto === '' || texto === null || texto === undefined) return `<c r="${ref}" s="${estilo}"/>`;
  return `<c r="${ref}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${escapar(texto)}</t></is></c>`;
}

// Etiqueta en negrita y valor normal dentro de la misma celda.
function celdaEtiquetada(columna, fila, etiqueta, valor, estilo) {
  const ref = `${letraColumna(columna)}${fila}`;
  return `<c r="${ref}" s="${estilo}" t="inlineStr"><is><r><rPr><b/><sz val="10"/><rFont val="Arial"/></rPr><t xml:space="preserve">${escapar(etiqueta)} </t></r><r><rPr><sz val="10"/><rFont val="Arial"/></rPr><t xml:space="preserve">${escapar(valor)}</t></r></is></c>`;
}

function celdaNumero(columna, fila, numero, estilo) {
  const ref = `${letraColumna(columna)}${fila}`;
  if (!Number.isFinite(numero)) return `<c r="${ref}" s="${estilo}"/>`;
  return `<c r="${ref}" s="${estilo}"><v>${numero}</v></c>`;
}

function xmlEstilos() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="7">
<font><sz val="10"/><name val="Arial"/></font>
<font><b/><sz val="12"/><name val="Arial"/></font>
<font><b/><sz val="10"/><name val="Arial"/></font>
<font><b/><sz val="9"/><name val="Arial"/></font>
<font><b/><sz val="8"/><name val="Arial"/></font>
<font><sz val="10"/><color rgb="FF1F3F9E"/><name val="Arial"/></font>
<font><sz val="10"/><color rgb="FFC00000"/><name val="Arial"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFCDEDF2"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="11">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" textRotation="90" wrapText="1"/></xf>
<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
<xf numFmtId="49" fontId="5" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="49" fontId="6" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

function xmlLibro() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Registro" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
}

function xmlRelacionesLibro() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function xmlRelacionesRaiz() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function xmlTiposContenido() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
}

// Construye el XML de la hoja. Se exporta para poder probarlo.
export function xmlHoja(registro, variante) {
  const columnas = variante.columnas;
  const primeraNota = 3; // A = N°, B = nombres, C en adelante = notas
  const ultima = primeraNota + columnas.length - 1;
  const filas = [];
  const combinadas = [];
  const combinar = (c1, f1, c2, f2) => combinadas.push(`${letraColumna(c1)}${f1}:${letraColumna(c2)}${f2}`);

  // Título y datos de cabecera.
  filas.push(`<row r="${FILA_TITULO}" ht="24" customHeight="1">${celdaTexto(1, FILA_TITULO, variante.titulo, ESTILO.titulo)}</row>`);
  combinar(1, FILA_TITULO, ultima, FILA_TITULO);

  const cab = registro.cabecera;
  const columnaEtiqueta2 = Math.min(13, ultima - 2);
  filas.push(
    `<row r="${FILA_DATOS_1}">${[
      celdaEtiquetada(2, FILA_DATOS_1, 'Salón:', cab.salon, ESTILO.valor),
      celdaEtiquetada(columnaEtiqueta2, FILA_DATOS_1, 'Curso:', cab.curso, ESTILO.valor),
    ].join('')}</row>`,
  );
  filas.push(
    `<row r="${FILA_DATOS_2}">${[
      celdaEtiquetada(2, FILA_DATOS_2, 'Periodo:', cab.periodo, ESTILO.valor),
      celdaEtiquetada(columnaEtiqueta2, FILA_DATOS_2, 'Docente:', cab.docente, ESTILO.valor),
    ].join('')}</row>`,
  );

  // Cabecera de la cuadrícula: grupos arriba, nombres de columna debajo.
  const celdasGrupos = [
    celdaTexto(1, FILA_GRUPOS, 'N°', ESTILO.cabeceraFija),
    celdaTexto(2, FILA_GRUPOS, 'APELLIDOS Y NOMBRES', ESTILO.cabeceraFija),
  ];
  const celdasColumnas = [
    celdaTexto(1, FILA_COLUMNAS, '', ESTILO.cabeceraFija),
    celdaTexto(2, FILA_COLUMNAS, '', ESTILO.cabeceraFija),
  ];
  combinar(1, FILA_GRUPOS, 1, FILA_COLUMNAS);
  combinar(2, FILA_GRUPOS, 2, FILA_COLUMNAS);

  let indice = primeraNota;
  for (const tramo of tramosDe(variante)) {
    const desde = indice;
    const hasta = indice + tramo.columnas.length - 1;
    if (tramo.grupo) {
      celdasGrupos.push(celdaTexto(desde, FILA_GRUPOS, tramo.grupo, ESTILO.grupo));
      for (let c = desde + 1; c <= hasta; c += 1) celdasGrupos.push(celdaTexto(c, FILA_GRUPOS, '', ESTILO.grupo));
      if (hasta > desde) combinar(desde, FILA_GRUPOS, hasta, FILA_GRUPOS);
      tramo.columnas.forEach((columna, i) => {
        celdasColumnas.push(celdaTexto(desde + i, FILA_COLUMNAS, columna.etiqueta, ESTILO.columnaRotada));
      });
    } else {
      tramo.columnas.forEach((columna, i) => {
        const c = desde + i;
        celdasGrupos.push(celdaTexto(c, FILA_GRUPOS, columna.etiqueta, ESTILO.columnaRotada));
        celdasColumnas.push(celdaTexto(c, FILA_COLUMNAS, '', ESTILO.columnaRotada));
        combinar(c, FILA_GRUPOS, c, FILA_COLUMNAS);
      });
    }
    indice = hasta + 1;
  }
  filas.push(`<row r="${FILA_GRUPOS}" ht="24" customHeight="1">${celdasGrupos.join('')}</row>`);
  filas.push(`<row r="${FILA_COLUMNAS}" ht="150" customHeight="1">${celdasColumnas.join('')}</row>`);

  // Alumnos.
  registro.filas.forEach((fila, i) => {
    const r = PRIMERA_FILA_ALUMNO + i;
    const celdas = [
      celdaNumero(1, r, fila.n, ESTILO.numero),
      celdaTexto(2, r, fila.alumno, ESTILO.nombre),
    ];
    columnas.forEach((columna, j) => {
      const estilo = fila.tinta?.[columna.clave] === 'rojo' ? ESTILO.notaRoja : ESTILO.notaAzul;
      celdas.push(celdaTexto(primeraNota + j, r, fila.notas[columna.clave] ?? '', estilo));
    });
    filas.push(`<row r="${r}" ht="16" customHeight="1">${celdas.join('')}</row>`);
  });

  const ultimaFila = PRIMERA_FILA_ALUMNO + Math.max(registro.filas.length, 1) - 1;
  const anchos = [
    `<col min="1" max="1" width="5" customWidth="1"/>`,
    `<col min="2" max="2" width="38" customWidth="1"/>`,
    `<col min="${primeraNota}" max="${ultima}" width="5.5" customWidth="1"/>`,
  ];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:${letraColumna(ultima)}${ultimaFila}"/>
<sheetViews><sheetView workbookViewId="0" tabSelected="1"><pane xSplit="2" ySplit="${FILA_COLUMNAS}" topLeftCell="C${PRIMERA_FILA_ALUMNO}" activePane="bottomRight" state="frozen"/><selection pane="bottomRight" activeCell="C${PRIMERA_FILA_ALUMNO}" sqref="C${PRIMERA_FILA_ALUMNO}"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${anchos.join('')}</cols>
<sheetData>${filas.join('')}</sheetData>
<mergeCells count="${combinadas.length}">${combinadas.map((ref) => `<mergeCell ref="${ref}"/>`).join('')}</mergeCells>
<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
}

// Devuelve los bytes del .xlsx.
export function generarExcel(registro, variante, { fecha = new Date() } = {}) {
  return crearZip(
    [
      { nombre: '[Content_Types].xml', datos: xmlTiposContenido() },
      { nombre: '_rels/.rels', datos: xmlRelacionesRaiz() },
      { nombre: 'xl/workbook.xml', datos: xmlLibro() },
      { nombre: 'xl/_rels/workbook.xml.rels', datos: xmlRelacionesLibro() },
      { nombre: 'xl/styles.xml', datos: xmlEstilos() },
      { nombre: 'xl/worksheets/sheet1.xml', datos: xmlHoja(registro, variante) },
    ],
    fecha,
  );
}
