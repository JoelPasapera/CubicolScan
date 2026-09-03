// Arranque y cableado. Aquí se une todo: fotos → lectura → fusión → revisión → Excel.

import { actualizar, filaPorId, hojaPorId, notificar, obtenerEstado, suscribir } from './estado/almacen.js';
import { detectarVariante, obtenerVariante } from './nucleo/plantillas.js';
import { crearFila, nombreArchivo, ordenarFilas } from './nucleo/registro.js';
import { fusionar } from './nucleo/fusion.js';
import { evaluarDudas, idCelda } from './nucleo/dudas.js';
import { generarExcel } from './exportar/excel.js';
import { hayClave, obtenerClave } from './servicios/clave.js';
import { leerHoja } from './servicios/lectura.js';
import { iniciarAvisos, limpiarAvisos, mostrarAvisos, mostrarError, mostrarExito } from './interfaz/avisos.js';
import { abrirAjustes, iniciarAjustes } from './interfaz/ajustes.js';
import { iniciarCarga } from './interfaz/carga.js';
import { pintarCabecera } from './interfaz/cabecera.js';
import { enfocarSiguienteDuda, iniciarTabla, pintarTabla, refrescarAvisosFila, refrescarCelda } from './interfaz/tabla.js';
import { iniciarFoto, mostrarHoja } from './interfaz/foto.js';
import { lecturasDemo } from './demo.js';

const $ = (selector) => document.querySelector(selector);

const secciones = {
  carga: $('#seccion-carga'),
  progreso: $('#seccion-progreso'),
  revision: $('#seccion-revision'),
};

let pintarCarga = null;
let cancelarLectura = null;

// ---------- Fases ----------

function mostrarFase(fase) {
  secciones.carga.hidden = fase !== 'carga';
  secciones.progreso.hidden = fase !== 'leyendo';
  secciones.revision.hidden = fase !== 'revision';
}

function pintarProgreso({ texto, fraccion }) {
  $('#texto-progreso').textContent = texto;
  $('#barra-progreso').style.width = `${Math.round(fraccion * 100)}%`;
}

// ---------- Lectura ----------

function varianteConocidaDesdeLecturas() {
  const { hojas, lecturas } = obtenerEstado();
  for (const hoja of hojas) {
    const lectura = lecturas.get(hoja.id);
    if (lectura?.hoja?.tipo === 'con_cabecera') {
      const variante = detectarVariante(lectura.cabecera?.anio);
      if (variante) return variante.anio;
    }
  }
  return null;
}

async function leerRegistro() {
  const estado = obtenerEstado();

  if (!hayClave()) {
    abrirAjustes('Para leer el registro hace falta la clave del servicio de lectura. Pega la que te dieron.');
    return;
  }

  const pendientes = estado.hojas.filter((h) => h.estado === 'pendiente');
  if (pendientes.length === 0) {
    if (estado.hojas.some((h) => h.estado === 'leida')) construirRevision();
    return;
  }

  limpiarAvisos();
  actualizar({ fase: 'leyendo', progreso: { texto: 'Preparando…', fraccion: 0 } });
  mostrarFase('leyendo');

  const controlador = new AbortController();
  cancelarLectura = () => controlador.abort();

  let varianteConocida = varianteConocidaDesdeLecturas();
  const clave = obtenerClave();

  for (const [i, hoja] of pendientes.entries()) {
    const numero = estado.hojas.indexOf(hoja) + 1;
    actualizar({ progreso: { texto: `Leyendo la hoja ${numero} (${i + 1} de ${pendientes.length})…`, fraccion: i / pendientes.length } });
    hoja.estado = 'leyendo';
    notificar();
    try {
      const lectura = await leerHoja(hoja.imagen, { clave, varianteConocida, senal: controlador.signal });
      lectura.hojaId = hoja.id;
      estado.lecturas.set(hoja.id, lectura);
      hoja.estado = 'leida';
      hoja.error = null;
      if (!varianteConocida && lectura.hoja.tipo === 'con_cabecera') {
        varianteConocida = detectarVariante(lectura.cabecera.anio)?.anio ?? null;
      }
    } catch (error) {
      hoja.estado = 'pendiente';
      hoja.error = null;
      cancelarLectura = null;
      actualizar({ fase: 'carga' });
      mostrarFase('carga');
      if (error?.codigo === 'cancelado') return;
      const accion = error?.codigo === 'clave'
        ? { texto: 'Abrir ajustes', alPulsar: () => abrirAjustes('La clave guardada no vale. Pega una clave que valga.') }
        : { texto: 'Reintentar', alPulsar: () => leerRegistro() };
      mostrarError(`Hoja ${numero}: ${error?.message ?? 'No se pudo leer la foto.'}`, accion);
      return;
    }
  }

  // Si alguna continuación se leyó suponiendo otra variante, se vuelve a leer
  // con la variante correcta para que las notas caigan en su columna.
  if (varianteConocida) {
    const desalineadas = estado.hojas.filter((h) => {
      const l = estado.lecturas.get(h.id);
      return l && l.hoja.tipo === 'continuacion' && l.hoja.variante && l.hoja.variante !== varianteConocida;
    });
    for (const [i, hoja] of desalineadas.entries()) {
      const numero = estado.hojas.indexOf(hoja) + 1;
      actualizar({ progreso: { texto: `Ajustando la hoja ${numero} a la plantilla ${varianteConocida} (${i + 1} de ${desalineadas.length})…`, fraccion: 0.9 } });
      try {
        const lectura = await leerHoja(hoja.imagen, { clave, varianteConocida, senal: controlador.signal });
        lectura.hojaId = hoja.id;
        estado.lecturas.set(hoja.id, lectura);
      } catch {
        // Se conserva la lectura anterior; la fusión avisará si algo no cuadra.
      }
    }
  }

  cancelarLectura = null;
  actualizar({ progreso: { texto: 'Montando la tabla…', fraccion: 1 } });
  construirRevision();
}

// ---------- Revisión ----------

function claveCorreccion(fila, clave) {
  return `${fila.id}|${clave}`;
}

function aplicarCorrecciones(registro, variante) {
  const { correcciones } = obtenerEstado();
  if (correcciones.size === 0) return;
  registro.filas = registro.filas.filter((fila) => !correcciones.has(claveCorreccion(fila, '__quitada')));
  for (const fila of registro.filas) {
    for (const columna of variante.columnas) {
      const guardada = correcciones.get(claveCorreccion(fila, columna.clave));
      if (guardada === undefined) continue;
      if (guardada === '') delete fila.notas[columna.clave];
      else fila.notas[columna.clave] = guardada;
    }
    const alumno = correcciones.get(claveCorreccion(fila, '__alumno'));
    if (alumno !== undefined) fila.alumno = alumno;
  }
}

function construirRevision() {
  const estado = obtenerEstado();
  const lecturas = estado.hojas.map((h) => estado.lecturas.get(h.id)).filter(Boolean);
  const { registro, variante, avisos } = fusionar(lecturas);
  aplicarCorrecciones(registro, variante);
  for (const manual of estado.filasManuales) registro.filas.push(manual);
  registro.filas = ordenarFilas(registro.filas);
  const dudas = evaluarDudas(registro, variante, estado.revisadas);
  actualizar({ fase: 'revision', registro, variante, avisos, dudas });
  pintarRevision();
}

function pintarResumen() {
  const { registro, hojas, dudas } = obtenerEstado();
  const resumen = $('#resumen');
  resumen.replaceChildren();

  const datos = document.createElement('p');
  const alumnos = registro.filas.length;
  const fotos = hojas.filter((h) => h.estado === 'leida').length;
  datos.textContent = `${alumnos} ${alumnos === 1 ? 'alumno' : 'alumnos'} · ${fotos} ${fotos === 1 ? 'hoja' : 'hojas'}`;
  resumen.append(datos);

  const estadoDudas = document.createElement('p');
  estadoDudas.className = dudas > 0 ? 'resumen__dudas' : 'resumen__ok';
  estadoDudas.textContent = dudas > 0
    ? `${dudas} ${dudas === 1 ? 'casilla por confirmar' : 'casillas por confirmar'}`
    : 'Todo confirmado';
  resumen.append(estadoDudas);

  if (dudas > 0) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'boton boton--secundario boton--pequeno';
    boton.textContent = 'Ir a la siguiente duda';
    boton.addEventListener('click', () => enfocarSiguienteDuda());
    resumen.append(boton);
  }
}

function pintarRevision() {
  const estado = obtenerEstado();
  mostrarFase('revision');
  mostrarAvisos(estado.avisos);
  pintarCabecera($('#cabecera'), estado.registro, { alCambiar: () => {} });
  pintarTabla(estado.registro, estado.variante);
  pintarResumen();
  mostrarHoja(null);
  window.scrollTo({ top: 0 });
}

function reevaluar(fila, clave = null) {
  const estado = obtenerEstado();
  const dudas = evaluarDudas(estado.registro, estado.variante, estado.revisadas);
  estado.dudas = dudas;
  if (clave) refrescarCelda(fila.id, clave, fila.dudas[clave]);
  for (const f of estado.registro.filas) refrescarAvisosFila(f);
  pintarResumen();
}

function editarNota(filaId, clave, valor) {
  const estado = obtenerEstado();
  const fila = filaPorId(filaId);
  if (!fila) return;
  const limpio = valor.trim();
  if (limpio === '') delete fila.notas[clave];
  else fila.notas[clave] = limpio;
  estado.correcciones.set(claveCorreccion(fila, clave), limpio);
  estado.revisadas.add(idCelda(fila, clave));
  reevaluar(fila, clave);
}

function editarFila(filaId, campo, valor) {
  const estado = obtenerEstado();
  const fila = filaPorId(filaId);
  if (!fila) return;
  if (campo === 'alumno') {
    fila.alumno = valor.trim();
    estado.correcciones.set(claveCorreccion(fila, '__alumno'), fila.alumno);
  } else if (campo === 'n') {
    const n = Number.parseInt(valor, 10);
    fila.n = Number.isInteger(n) && n > 0 ? n : null;
  }
  reevaluar(fila);
}

function confirmarCelda(filaId, clave) {
  const estado = obtenerEstado();
  const fila = filaPorId(filaId);
  if (!fila) return;
  estado.revisadas.add(idCelda(fila, clave));
  reevaluar(fila, clave);
}

function quitarFila(filaId) {
  const estado = obtenerEstado();
  const fila = filaPorId(filaId);
  if (!fila) return;
  if (!window.confirm(`¿Quitar la fila ${fila.n ?? ''} ${fila.alumno}?`)) return;
  estado.registro.filas = estado.registro.filas.filter((f) => f.id !== filaId);
  estado.filasManuales = estado.filasManuales.filter((f) => f.id !== filaId);
  estado.correcciones.set(claveCorreccion(fila, '__quitada'), '1');
  pintarTabla(estado.registro, estado.variante);
  reevaluar(fila);
}

function anadirFila() {
  const estado = obtenerEstado();
  const ultima = estado.registro.filas[estado.registro.filas.length - 1];
  const fila = crearFila({ n: Number.isInteger(ultima?.n) ? ultima.n + 1 : null });
  estado.registro.filas.push(fila);
  estado.filasManuales = [...estado.filasManuales, fila];
  pintarTabla(estado.registro, estado.variante);
  reevaluar(fila);
  const entrada = document.querySelector(`input[data-fila="${fila.id}"][data-campo="alumno"]`);
  entrada?.focus();
}

function enfocarFila(filaId, indice) {
  const estado = obtenerEstado();
  const fila = filaPorId(filaId);
  if (!fila) return;
  const hoja = hojaPorId(fila.hojaId);
  const numeroHoja = hoja ? estado.hojas.indexOf(hoja) + 1 : null;
  const filasDeLaHoja = estado.registro.filas.filter((f) => f.hojaId === fila.hojaId);
  const posicionEnHoja = filasDeLaHoja.indexOf(fila);
  const posicion = filasDeLaHoja.length > 1 ? posicionEnHoja / (filasDeLaHoja.length - 1) : 0;
  mostrarHoja(hoja, {
    etiqueta: hoja ? `Hoja ${numeroHoja} · fila ${fila.n ?? '?'}` : `Fila ${fila.n ?? '?'}`,
    posicion: hoja ? 0.15 + posicion * 0.7 : null,
  });
  void indice;
}

// ---------- Excel ----------

function descargarExcel() {
  const estado = obtenerEstado();
  if (!estado.registro) return;

  const graves = estado.avisos.filter((a) => a.nivel === 'error');
  if (graves.length > 0) {
    const seguir = window.confirm(`Hay avisos importantes:\n\n${graves.map((a) => `• ${a.texto}`).join('\n')}\n\n¿Descargar el Excel de todas formas?`);
    if (!seguir) return;
  }
  if (estado.dudas > 0) {
    const seguir = window.confirm(`Quedan ${estado.dudas} casillas por confirmar. ¿Descargar el Excel de todas formas?`);
    if (!seguir) return;
  }

  const registroOrdenado = { ...estado.registro, filas: ordenarFilas(estado.registro.filas) };
  const bytes = generarExcel(registroOrdenado, estado.variante);
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo(estado.registro.cabecera);
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  mostrarExito(`Excel descargado: ${enlace.download}`);
}

// ---------- Demo ----------

function imagenDeEjemplo(texto) {
  const lienzo = document.createElement('canvas');
  lienzo.width = 1200;
  lienzo.height = 900;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.strokeStyle = '#9fdae3';
  for (let y = 120; y < 900; y += 30) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(1160, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#5b6673';
  ctx.font = '28px sans-serif';
  ctx.fillText(texto, 60, 80);
  const dataUrl = lienzo.toDataURL('image/jpeg', 0.7);
  return { dataUrl, base64: '', mediaType: 'image/jpeg', ancho: lienzo.width, alto: lienzo.height };
}

function cargarDemo() {
  const estado = obtenerEstado();
  const lecturas = lecturasDemo();
  estado.hojas = lecturas.map((lectura, i) => ({
    id: lectura.hojaId,
    nombre: `ejemplo-hoja-${i + 1}.jpg`,
    archivo: null,
    huella: lectura.hojaId,
    rotacion: 0,
    imagen: imagenDeEjemplo(`Foto de ejemplo · hoja ${i + 1} (datos inventados)`),
    miniatura: null,
    esEjemplo: true,
    estado: 'leida',
    error: null,
  }));
  for (const hoja of estado.hojas) hoja.miniatura = hoja.imagen.dataUrl;
  for (const lectura of lecturas) estado.lecturas.set(lectura.hojaId, lectura);
  construirRevision();
  mostrarAvisos([
    ...estado.avisos,
    { nivel: 'aviso', texto: 'Modo de ejemplo: los nombres y notas son inventados. Sirve para ver la revisión y el Excel sin gastar lecturas.' },
  ]);
}

// ---------- Arranque ----------

function arrancar() {
  iniciarAvisos($('#avisos'));

  iniciarAjustes({
    elemento: $('#dialogo-ajustes'),
    botonAbrir: $('#boton-ajustes'),
    cuandoGuarde: () => mostrarExito('Clave guardada en este navegador.'),
  });

  const carga = iniciarCarga({
    zona: $('#zona-carga'),
    entradaArchivos: $('#entrada-archivos'),
    entradaCamara: $('#entrada-camara'),
    botonElegir: $('#boton-elegir'),
    botonCamara: $('#boton-camara'),
    lista: $('#lista-hojas'),
    botonLeer: $('#boton-leer'),
    alLeer: leerRegistro,
  });
  pintarCarga = carga.pintar;

  iniciarTabla($('#contenedor-tabla'), {
    alEditarNota: editarNota,
    alEditarFila: editarFila,
    alConfirmar: confirmarCelda,
    alQuitarFila: quitarFila,
    alAnadirFila: anadirFila,
    alEnfocarFila: enfocarFila,
  });

  iniciarFoto($('#panel-foto'));

  $('#boton-descargar').addEventListener('click', descargarExcel);
  $('#boton-volver').addEventListener('click', () => {
    actualizar({ fase: 'carga' });
    mostrarFase('carga');
    window.scrollTo({ top: 0 });
  });
  $('#boton-cancelar-lectura').addEventListener('click', () => {
    cancelarLectura?.();
  });

  suscribir((estado) => {
    pintarCarga(estado);
    if (estado.fase === 'leyendo') pintarProgreso(estado.progreso);
  });

  window.addEventListener('beforeunload', (evento) => {
    const estado = obtenerEstado();
    if (estado.fase === 'revision' || estado.hojas.length > 0) {
      evento.preventDefault();
      evento.returnValue = '';
    }
  });

  notificar();

  if (new URLSearchParams(window.location.search).has('demo')) {
    cargarDemo();
    return;
  }

  mostrarFase('carga');
  if (!hayClave()) {
    abrirAjustes('Primera vez aquí: pega la clave del servicio de lectura que te dieron. Se guarda solo en este navegador.');
  }
}

arrancar();
