// Un .xlsx es un zip con archivos XML dentro. Este módulo escribe ese zip
// sin comprimir (método "stored"), que Excel acepta sin problema.
// Sin dependencias: unas 90 líneas bastan.

const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[n] = c >>> 0;
  }
  return tabla;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = TABLA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function fechaHoraDos(fecha) {
  const anio = Math.max(1980, fecha.getFullYear());
  const dosFecha = ((anio - 1980) << 9) | ((fecha.getMonth() + 1) << 5) | fecha.getDate();
  const dosHora = (fecha.getHours() << 11) | (fecha.getMinutes() << 5) | (fecha.getSeconds() >> 1);
  return { dosFecha, dosHora };
}

function concatenar(trozos) {
  const total = trozos.reduce((suma, t) => suma + t.length, 0);
  const salida = new Uint8Array(total);
  let posicion = 0;
  for (const trozo of trozos) {
    salida.set(trozo, posicion);
    posicion += trozo.length;
  }
  return salida;
}

// entradas: [{ nombre: 'xl/workbook.xml', datos: string | Uint8Array }]
export function crearZip(entradas, fecha = new Date()) {
  const codificador = new TextEncoder();
  const { dosFecha, dosHora } = fechaHoraDos(fecha);
  const locales = [];
  const centrales = [];
  let desplazamiento = 0;

  for (const entrada of entradas) {
    const nombre = codificador.encode(entrada.nombre);
    const datos = typeof entrada.datos === 'string' ? codificador.encode(entrada.datos) : entrada.datos;
    const crc = crc32(datos);

    const local = new Uint8Array(30 + nombre.length);
    const l = new DataView(local.buffer);
    l.setUint32(0, 0x04034b50, true);
    l.setUint16(4, 20, true);
    l.setUint16(6, 0x0800, true); // nombres en UTF-8
    l.setUint16(8, 0, true); // sin comprimir
    l.setUint16(10, dosHora, true);
    l.setUint16(12, dosFecha, true);
    l.setUint32(14, crc, true);
    l.setUint32(18, datos.length, true);
    l.setUint32(22, datos.length, true);
    l.setUint16(26, nombre.length, true);
    l.setUint16(28, 0, true);
    local.set(nombre, 30);

    const central = new Uint8Array(46 + nombre.length);
    const c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, dosHora, true);
    c.setUint16(14, dosFecha, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, datos.length, true);
    c.setUint32(24, datos.length, true);
    c.setUint16(28, nombre.length, true);
    c.setUint16(30, 0, true);
    c.setUint16(32, 0, true);
    c.setUint16(34, 0, true);
    c.setUint16(36, 0, true);
    c.setUint32(38, 0, true);
    c.setUint32(42, desplazamiento, true);
    central.set(nombre, 46);

    locales.push(local, datos);
    centrales.push(central);
    desplazamiento += local.length + datos.length;
  }

  const tamanoCentral = centrales.reduce((suma, x) => suma + x.length, 0);
  const fin = new Uint8Array(22);
  const f = new DataView(fin.buffer);
  f.setUint32(0, 0x06054b50, true);
  f.setUint16(4, 0, true);
  f.setUint16(6, 0, true);
  f.setUint16(8, entradas.length, true);
  f.setUint16(10, entradas.length, true);
  f.setUint32(12, tamanoCentral, true);
  f.setUint32(16, desplazamiento, true);
  f.setUint16(20, 0, true);

  return concatenar([...locales, ...centrales, fin]);
}
