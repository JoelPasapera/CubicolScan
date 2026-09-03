// Manda una foto al servicio de lectura y devuelve la tabla que leyó.
// El contrato de salida está en docs/especificacion.md; si cambia, cambia
// allí primero.

import { CONFIG } from '../config.js';
import { VARIANTES, describirParaLectura, obtenerVariante } from '../nucleo/plantillas.js';

export class ErrorLectura extends Error {
  constructor(codigo, mensaje, detalle = null) {
    super(mensaje);
    this.name = 'ErrorLectura';
    this.codigo = codigo;
    this.detalle = detalle;
  }
}

const CAMPOS_CABECERA = ['anio', 'salon', 'curso', 'periodo', 'docente'];

export function construirPrompt(varianteConocida = null) {
  const variante = obtenerVariante(varianteConocida);
  const descripciones = Object.values(VARIANTES).map(describirParaLectura).join('\n\n');

  const instruccionVariante = variante
    ? `Esta hoja pertenece a un registro de la variante ${variante.anio}. Usa exactamente las claves de esa variante, aunque la hoja no traiga cabecera.`
    : `Determina la variante: si la hoja tiene cabecera, por el año del título. Si es una continuación sin cabecera, por la disposición: la variante 2026 tiene ${VARIANTES[2026].columnas.length} columnas de notas y la 2020 tiene ${VARIANTES[2020].columnas.length}; en la 2026 las seis tareas empiezan en la tercera columna de notas, y en la 2020 en la segunda.`;

  return `Eres un transcriptor meticuloso. La imagen es la foto de un "REGISTRO AUXILIAR" de notas de un colegio: una cuadrícula impresa con una fila por alumno y las notas escritas a mano en bolígrafo azul o rojo, en escala de 0 a 20, con dos dígitos ("08", "15", "20"). La foto puede estar girada 90 grados o algo torcida.

Tu tarea es transcribir la hoja a JSON tal cual está, sin interpretar, corregir ni completar nada.

Hay dos tipos de hoja:
- CON CABECERA: arriba dice "REGISTRO AUXILIAR - <año>" con Salón, Curso, Periodo y Profesor o Profesora, y la cuadrícula lleva los nombres de columna impresos (a menudo en vertical). El primer alumno es el N° 1.
- CONTINUACIÓN: solo trae filas de alumnos, sin cabecera ni nombres de columna. El primer N° es mayor que 1 (por ejemplo 23).

${descripciones}

${instruccionVariante}

Reglas:
1. Las claves de "notas" son exactamente las de la lista de la variante. No inventes otras ni cambies su escritura.
2. Cada nota es un texto de dos dígitos, tal como está escrita: "08", nunca 8 ni "8".
3. Si una casilla está en blanco, no la incluyas. Nunca pongas "", null ni "00" para una casilla vacía.
4. Si una casilla tiene algo escrito que no consigues leer, pon "?" como valor. Si lees un dígito con seguridad y el otro no, pon el dígito seguro y "?" en el lugar del otro (por ejemplo "1?").
5. No calcules promedios ni rellenes columnas de PROMEDIO: solo transcribe lo que hay escrito a mano.
6. No desplaces columnas. Las casillas vacías siguen ocupando su sitio: cuenta la posición de cada nota desde la izquierda y usa las franjas de color de la cuadrícula para no perder la cuenta. Comprueba en cada fila que el número de notas no supera el número de columnas.
7. Si una nota está tachada y corregida al lado, transcribe la corrección.
8. "tinta": indica "rojo" solo en las casillas escritas en bolígrafo rojo. Si todas son azules, deja el objeto vacío.
9. "n" es el número impreso al principio de la fila. Léelo; nunca lo deduzcas del orden.
10. "alumno": apellidos y nombres tal como están impresos, con sus mayúsculas, tildes y comas.
11. Incluye todas las filas que tengan nombre, también las que no tengan ninguna nota (con "notas": {}).
12. Devuelve las filas en el orden en que aparecen.

Responde solo con el JSON, sin texto antes ni después y sin marcas de código, con esta forma exacta:
{
  "hoja": { "tipo": "con_cabecera" o "continuacion", "variante": "2026" o "2020", "primerN": 1, "ultimoN": 22 },
  "cabecera": { "anio": "2026", "salon": "", "curso": "", "periodo": "", "docente": "" },
  "filas": [
    { "n": 1, "alumno": "APELLIDOS, Nombres", "notas": { "T1": "16", "PC1 / MENSUAL": "13" }, "tinta": { "PC1 / MENSUAL": "rojo" } }
  ]
}
En una hoja de continuación, los cinco campos de "cabecera" van con "".`;
}

function extraerJson(texto) {
  const sinMarcas = String(texto ?? '').replace(/```(?:json)?/gi, '').trim();
  const inicio = sinMarcas.indexOf('{');
  const fin = sinMarcas.lastIndexOf('}');
  if (inicio === -1 || fin === -1 || fin <= inicio) return null;
  try {
    return JSON.parse(sinMarcas.slice(inicio, fin + 1));
  } catch {
    return null;
  }
}

// Convierte el texto devuelto por el servicio en una lectura con forma conocida.
// No normaliza valores: eso lo hace la fusión, que conoce la plantilla.
export function interpretarRespuesta(texto) {
  const datos = extraerJson(texto);
  if (!datos || typeof datos !== 'object') {
    throw new ErrorLectura('formato', 'La respuesta del servicio de lectura no se pudo interpretar. Vuelve a intentarlo.');
  }
  if (!Array.isArray(datos.filas)) {
    throw new ErrorLectura('formato', 'El servicio de lectura no devolvió filas. Prueba con una foto más nítida.');
  }

  const cabecera = {};
  for (const campo of CAMPOS_CABECERA) cabecera[campo] = String(datos.cabecera?.[campo] ?? '').trim();

  const filas = datos.filas
    .filter((f) => f && typeof f === 'object')
    .map((f) => ({
      n: f.n,
      alumno: String(f.alumno ?? '').trim(),
      notas: f.notas && typeof f.notas === 'object' ? f.notas : {},
      tinta: f.tinta && typeof f.tinta === 'object' ? f.tinta : {},
    }));

  const tipo = datos.hoja?.tipo === 'continuacion' ? 'continuacion' : 'con_cabecera';
  const variante = obtenerVariante(datos.hoja?.variante)?.anio ?? null;

  return {
    hoja: {
      tipo,
      variante,
      primerN: Number.parseInt(datos.hoja?.primerN, 10) || null,
      ultimoN: Number.parseInt(datos.hoja?.ultimoN, 10) || null,
    },
    cabecera,
    filas,
  };
}

async function leerDetalleError(respuesta) {
  try {
    const datos = await respuesta.json();
    return datos?.error?.message ?? null;
  } catch {
    return null;
  }
}

function traducirError(estado, detalle) {
  if (estado === 401 || estado === 403) {
    return new ErrorLectura('clave', 'La clave del servicio de lectura no vale. Revísala en Ajustes.', detalle);
  }
  if (estado === 429) {
    return new ErrorLectura('limite', 'El servicio de lectura está recibiendo demasiadas peticiones. Espera un minuto y vuelve a intentarlo.', detalle);
  }
  if (estado === 400 || estado === 413) {
    return new ErrorLectura('imagen', 'El servicio de lectura rechazó la foto. Prueba con una foto más nítida o más pequeña.', detalle);
  }
  if (estado >= 500) {
    return new ErrorLectura('saturado', 'El servicio de lectura no responde ahora mismo. Vuelve a intentarlo en unos minutos.', detalle);
  }
  return new ErrorLectura('desconocido', 'No se pudo leer la foto. Vuelve a intentarlo.', detalle);
}

// imagen: { base64, mediaType }. Devuelve la lectura interpretada.
export async function leerHoja(imagen, { clave, varianteConocida = null, senal = null } = {}) {
  if (!clave) throw new ErrorLectura('clave', 'Falta la clave del servicio de lectura. Ponla en Ajustes.');

  const cuerpo = {
    model: CONFIG.modelo,
    max_tokens: CONFIG.maxTokensSalida,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: imagen.mediaType, data: imagen.base64 } },
          { type: 'text', text: construirPrompt(varianteConocida) },
        ],
      },
    ],
  };

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), CONFIG.tiempoMaximoMs);
  if (senal) senal.addEventListener('abort', () => controlador.abort(), { once: true });

  let respuesta;
  try {
    respuesta = await fetch(CONFIG.urlServicio, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': clave,
        'anthropic-version': CONFIG.versionApi,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(cuerpo),
      signal: controlador.signal,
    });
  } catch (error) {
    clearTimeout(temporizador);
    if (error?.name === 'AbortError') {
      if (senal?.aborted) throw new ErrorLectura('cancelado', 'Lectura cancelada.');
      throw new ErrorLectura('tiempo', 'La lectura tardó demasiado. Vuelve a intentarlo; si se repite, prueba con una foto más nítida.');
    }
    throw new ErrorLectura('red', 'No hay conexión con el servicio de lectura. Comprueba tu internet y vuelve a intentarlo.');
  }
  clearTimeout(temporizador);

  if (!respuesta.ok) throw traducirError(respuesta.status, await leerDetalleError(respuesta));

  const datos = await respuesta.json();
  const texto = (datos.content ?? [])
    .filter((bloque) => bloque.type === 'text')
    .map((bloque) => bloque.text)
    .join('\n');

  if (datos.stop_reason === 'max_tokens') {
    throw new ErrorLectura('largo', 'La hoja tiene más contenido del que se pudo leer de una vez. Saca la foto en dos partes, cada una con la mitad de las filas.');
  }

  return interpretarRespuesta(texto);
}
