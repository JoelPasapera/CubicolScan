// Zona de fotos. Cada foto es una hoja del mismo registro.

import { actualizar, obtenerEstado, notificar } from '../estado/almacen.js';
import { generarId } from '../nucleo/registro.js';
import { huellaArchivo, miniaturaDe, prepararImagen } from '../servicios/imagen.js';
import { mostrarError } from './avisos.js';

const ESTADOS = {
  preparando: 'Preparando…',
  pendiente: 'Lista para leer',
  leyendo: 'Leyendo…',
  leida: 'Leída',
  error: 'No se pudo leer',
};

let elementos = null;
let acciones = null;

async function anadirArchivos(lista) {
  const estado = obtenerEstado();
  const archivos = [...lista].filter((a) => a && a.size > 0);
  if (archivos.length === 0) return;

  for (const archivo of archivos) {
    if (!archivo.type.startsWith('image/')) {
      mostrarError(`"${archivo.name}" no es una foto. Sube archivos JPG o PNG.`);
      continue;
    }
    const huella = await huellaArchivo(archivo);
    if (estado.hojas.some((h) => h.huella === huella)) {
      mostrarError(`"${archivo.name}" ya estaba subida. No se ha añadido dos veces.`);
      continue;
    }
    const hoja = {
      id: generarId('hoja'),
      nombre: archivo.name,
      archivo,
      huella,
      rotacion: 0,
      imagen: null,
      miniatura: null,
      estado: 'preparando',
      error: null,
    };
    estado.hojas.push(hoja);
    notificar();
    await prepararHoja(hoja);
  }
}

async function prepararHoja(hoja) {
  const estado = obtenerEstado();
  hoja.estado = 'preparando';
  hoja.imagen = null;
  notificar();
  try {
    hoja.imagen = await prepararImagen(hoja.archivo, hoja.rotacion);
    hoja.miniatura = await miniaturaDe(hoja.imagen.dataUrl);
    hoja.estado = 'pendiente';
    hoja.error = null;
  } catch (e) {
    hoja.estado = 'error';
    hoja.error = e.message;
    mostrarError(`${hoja.nombre}: ${e.message}`);
  }
  estado.lecturas.delete(hoja.id);
  notificar();
}

function mover(id, paso) {
  const estado = obtenerEstado();
  const indice = estado.hojas.findIndex((h) => h.id === id);
  const destino = indice + paso;
  if (indice < 0 || destino < 0 || destino >= estado.hojas.length) return;
  const [hoja] = estado.hojas.splice(indice, 1);
  estado.hojas.splice(destino, 0, hoja);
  notificar();
}

function quitar(id) {
  const estado = obtenerEstado();
  estado.hojas = estado.hojas.filter((h) => h.id !== id);
  estado.lecturas.delete(id);
  notificar();
}

async function girar(id) {
  const estado = obtenerEstado();
  const hoja = estado.hojas.find((h) => h.id === id);
  if (!hoja) return;
  hoja.rotacion = (hoja.rotacion + 90) % 360;
  await prepararHoja(hoja);
}

function botonIcono(texto, etiqueta, alPulsar, desactivado = false) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'boton boton--icono';
  boton.textContent = texto;
  boton.title = etiqueta;
  boton.setAttribute('aria-label', etiqueta);
  boton.disabled = desactivado;
  boton.addEventListener('click', alPulsar);
  return boton;
}

function pintarHoja(hoja, indice, total) {
  const item = document.createElement('li');
  item.className = `hoja hoja--${hoja.estado}`;

  const figura = document.createElement('div');
  figura.className = 'hoja__foto';
  if (hoja.miniatura) {
    const img = document.createElement('img');
    img.src = hoja.miniatura;
    img.alt = '';
    figura.append(img);
  }

  const datos = document.createElement('div');
  datos.className = 'hoja__datos';
  const titulo = document.createElement('p');
  titulo.className = 'hoja__titulo';
  titulo.textContent = `Hoja ${indice + 1}`;
  const nombre = document.createElement('p');
  nombre.className = 'hoja__nombre';
  nombre.textContent = hoja.nombre;
  const estadoTexto = document.createElement('p');
  estadoTexto.className = 'hoja__estado';
  estadoTexto.textContent = hoja.estado === 'error' && hoja.error ? hoja.error : ESTADOS[hoja.estado];
  datos.append(titulo, nombre, estadoTexto);

  const botones = document.createElement('div');
  botones.className = 'hoja__botones';
  botones.append(
    botonIcono('↻', 'Girar la foto', () => girar(hoja.id), hoja.estado === 'preparando' || hoja.estado === 'leyendo'),
    botonIcono('↑', 'Subir de posición', () => mover(hoja.id, -1), indice === 0),
    botonIcono('↓', 'Bajar de posición', () => mover(hoja.id, 1), indice === total - 1),
    botonIcono('✕', 'Quitar esta foto', () => quitar(hoja.id), hoja.estado === 'leyendo'),
  );

  item.append(figura, datos, botones);
  return item;
}

function pintar(estado) {
  const { lista, botonLeer, zona } = elementos;
  lista.replaceChildren(...estado.hojas.map((hoja, i) => pintarHoja(hoja, i, estado.hojas.length)));
  zona.classList.toggle('zona-carga--con-hojas', estado.hojas.length > 0);

  const listas = estado.hojas.filter((h) => h.estado === 'pendiente' || h.estado === 'leida');
  const ocupada = estado.hojas.some((h) => h.estado === 'preparando' || h.estado === 'leyendo');
  const pendientes = estado.hojas.filter((h) => h.estado === 'pendiente').length;
  botonLeer.disabled = listas.length === 0 || ocupada || estado.fase === 'leyendo';
  botonLeer.textContent = pendientes === 0 && listas.length > 0 ? 'Volver a la revisión' : 'Leer registro';
}

export function iniciarCarga({ zona, entradaArchivos, entradaCamara, botonElegir, botonCamara, lista, botonLeer, alLeer }) {
  elementos = { zona, lista, botonLeer };
  acciones = { alLeer };

  botonElegir.addEventListener('click', () => entradaArchivos.click());
  botonCamara.addEventListener('click', () => entradaCamara.click());

  for (const entrada of [entradaArchivos, entradaCamara]) {
    entrada.addEventListener('change', async () => {
      await anadirArchivos(entrada.files);
      entrada.value = '';
    });
  }

  zona.addEventListener('dragover', (evento) => {
    evento.preventDefault();
    zona.classList.add('zona-carga--sobre');
  });
  zona.addEventListener('dragleave', () => zona.classList.remove('zona-carga--sobre'));
  zona.addEventListener('drop', async (evento) => {
    evento.preventDefault();
    zona.classList.remove('zona-carga--sobre');
    await anadirArchivos(evento.dataTransfer?.files ?? []);
  });

  botonLeer.addEventListener('click', () => acciones.alLeer());

  return { pintar };
}
