// La tabla de revisión: la misma cuadrícula del papel, con cada nota en una
// casilla editable y las dudas marcadas. Se escribe encima para corregir;
// Intro confirma una casilla dudosa y baja a la siguiente fila.

import { tramosDe } from '../nucleo/plantillas.js';

let contenedor = null;
let acciones = null;

function crearEntradaNota(fila, columna) {
  const entrada = document.createElement('input');
  entrada.type = 'text';
  entrada.inputMode = 'numeric';
  entrada.maxLength = 3;
  entrada.autocomplete = 'off';
  entrada.className = 'nota';
  entrada.value = fila.notas[columna.clave] ?? '';
  entrada.dataset.fila = fila.id;
  entrada.dataset.clave = columna.clave;
  entrada.setAttribute('aria-label', `${columna.etiqueta}, fila ${fila.n ?? 'sin número'}`);
  if (fila.tinta?.[columna.clave] === 'rojo') entrada.classList.add('nota--roja');
  return entrada;
}

function aplicarDuda(celda, motivo) {
  celda.classList.toggle('duda', Boolean(motivo));
  if (motivo) celda.title = `${motivo}. Corrige o confirma con Intro.`;
  else celda.removeAttribute('title');
}

function pintarFila(fila, indice, columnas) {
  const tr = document.createElement('tr');
  tr.dataset.fila = fila.id;
  tr.dataset.indice = String(indice);

  const tdNumero = document.createElement('td');
  tdNumero.className = 'celda-numero';
  const numero = document.createElement('input');
  numero.type = 'text';
  numero.inputMode = 'numeric';
  numero.className = 'numero';
  numero.value = fila.n ?? '';
  numero.dataset.fila = fila.id;
  numero.dataset.campo = 'n';
  numero.setAttribute('aria-label', 'Número de fila');
  tdNumero.append(numero);

  const tdNombre = document.createElement('td');
  tdNombre.className = 'celda-nombre';
  const nombre = document.createElement('input');
  nombre.type = 'text';
  nombre.className = 'nombre';
  nombre.value = fila.alumno ?? '';
  nombre.autocomplete = 'off';
  nombre.dataset.fila = fila.id;
  nombre.dataset.campo = 'alumno';
  nombre.setAttribute('aria-label', 'Apellidos y nombres');
  tdNombre.append(nombre);
  tr.append(tdNumero, tdNombre);

  for (const columna of columnas) {
    const td = document.createElement('td');
    td.className = 'celda-nota';
    if (columna.sueleVacia) td.classList.add('celda-nota--suele-vacia');
    td.append(crearEntradaNota(fila, columna));
    aplicarDuda(td, fila.dudas?.[columna.clave]);
    tr.append(td);
  }

  const tdFila = document.createElement('td');
  tdFila.className = 'celda-fila';
  pintarAvisosFila(tdFila, fila);
  tr.append(tdFila);

  return tr;
}

function pintarAvisosFila(td, fila) {
  td.replaceChildren();
  if (fila.dudasFila?.length) {
    const marca = document.createElement('span');
    marca.className = 'marca-fila';
    marca.textContent = fila.dudasFila.join(' · ');
    td.append(marca);
  }
  const quitar = document.createElement('button');
  quitar.type = 'button';
  quitar.className = 'boton boton--icono boton--quitar';
  quitar.textContent = '✕';
  quitar.title = 'Quitar esta fila';
  quitar.setAttribute('aria-label', `Quitar la fila ${fila.n ?? ''}`);
  quitar.dataset.quitar = fila.id;
  td.append(quitar);
}

function pintarCabeceraTabla(variante) {
  const thead = document.createElement('thead');
  const filaGrupos = document.createElement('tr');
  const filaColumnas = document.createElement('tr');

  const thNumero = document.createElement('th');
  thNumero.rowSpan = 2;
  thNumero.className = 'cab-fija cab-numero';
  thNumero.textContent = 'N°';
  const thNombre = document.createElement('th');
  thNombre.rowSpan = 2;
  thNombre.className = 'cab-fija cab-nombre';
  thNombre.textContent = 'APELLIDOS Y NOMBRES';
  filaGrupos.append(thNumero, thNombre);

  for (const tramo of tramosDe(variante)) {
    if (tramo.grupo) {
      const thGrupo = document.createElement('th');
      thGrupo.colSpan = tramo.columnas.length;
      thGrupo.className = 'cab-grupo';
      thGrupo.textContent = tramo.grupo;
      filaGrupos.append(thGrupo);
      for (const columna of tramo.columnas) filaColumnas.append(pintarThColumna(columna, 1));
    } else {
      for (const columna of tramo.columnas) filaGrupos.append(pintarThColumna(columna, 2));
    }
  }

  const thFila = document.createElement('th');
  thFila.rowSpan = 2;
  thFila.className = 'cab-fija cab-avisos';
  thFila.textContent = 'Avisos';
  filaGrupos.append(thFila);

  thead.append(filaGrupos, filaColumnas);
  return thead;
}

function pintarThColumna(columna, filas) {
  const th = document.createElement('th');
  th.rowSpan = filas;
  th.className = 'cab-columna';
  if (columna.sueleVacia) th.classList.add('cab-columna--suele-vacia');
  const vertical = document.createElement('span');
  vertical.className = 'vertical';
  vertical.textContent = columna.etiqueta;
  th.append(vertical);
  return th;
}

function entradaVecina(entrada, paso) {
  const fila = entrada.closest('tr');
  const celda = entrada.closest('td');
  if (!fila || !celda) return null;
  const posicion = [...fila.children].indexOf(celda);
  let vecina = fila;
  for (let i = 0; i < Math.abs(paso); i += 1) {
    vecina = paso > 0 ? vecina?.nextElementSibling : vecina?.previousElementSibling;
  }
  return vecina?.children[posicion]?.querySelector('input') ?? null;
}

function manejarTeclado(evento) {
  const entrada = evento.target;
  if (!(entrada instanceof HTMLInputElement)) return;

  if (evento.key === 'Enter') {
    evento.preventDefault();
    if (entrada.dataset.clave) acciones.alConfirmar?.(entrada.dataset.fila, entrada.dataset.clave);
    entradaVecina(entrada, 1)?.focus();
    return;
  }
  if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
    const vecina = entradaVecina(entrada, evento.key === 'ArrowDown' ? 1 : -1);
    if (vecina) {
      evento.preventDefault();
      vecina.focus();
      vecina.select();
    }
  }
}

function manejarEntrada(evento) {
  const entrada = evento.target;
  if (!(entrada instanceof HTMLInputElement)) return;
  const filaId = entrada.dataset.fila;
  if (!filaId) return;
  if (entrada.dataset.clave) {
    acciones.alEditarNota?.(filaId, entrada.dataset.clave, entrada.value);
  } else if (entrada.dataset.campo) {
    acciones.alEditarFila?.(filaId, entrada.dataset.campo, entrada.value);
  }
}

function manejarFoco(evento) {
  const entrada = evento.target;
  if (!(entrada instanceof HTMLInputElement)) return;
  const tr = entrada.closest('tr');
  if (tr?.dataset.fila) {
    for (const marcada of contenedor.querySelectorAll('tr.fila--activa')) marcada.classList.remove('fila--activa');
    tr.classList.add('fila--activa');
    acciones.alEnfocarFila?.(tr.dataset.fila, Number(tr.dataset.indice));
  }
}

function manejarClic(evento) {
  const boton = evento.target.closest('button[data-quitar]');
  if (boton) acciones.alQuitarFila?.(boton.dataset.quitar);
}

export function iniciarTabla(elemento, callbacks) {
  contenedor = elemento;
  acciones = callbacks;
  contenedor.addEventListener('input', manejarEntrada);
  contenedor.addEventListener('keydown', manejarTeclado);
  contenedor.addEventListener('focusin', manejarFoco);
  contenedor.addEventListener('click', manejarClic);
}

export function pintarTabla(registro, variante) {
  const tabla = document.createElement('table');
  tabla.className = 'registro';
  tabla.append(pintarCabeceraTabla(variante));
  const tbody = document.createElement('tbody');
  registro.filas.forEach((fila, i) => tbody.append(pintarFila(fila, i, variante.columnas)));
  tabla.append(tbody);

  const pie = document.createElement('div');
  pie.className = 'tabla-pie';
  const anadir = document.createElement('button');
  anadir.type = 'button';
  anadir.className = 'boton boton--secundario boton--pequeno';
  anadir.textContent = 'Añadir fila al final';
  anadir.addEventListener('click', () => acciones.alAnadirFila?.());
  pie.append(anadir);

  contenedor.replaceChildren(tabla, pie);
}

// Actualiza solo la marca de duda de una casilla, sin volver a pintar todo.
export function refrescarCelda(filaId, clave, motivo) {
  const entrada = contenedor.querySelector(`input[data-fila="${filaId}"][data-clave="${CSS.escape(clave)}"]`);
  const celda = entrada?.closest('td');
  if (celda) aplicarDuda(celda, motivo);
}

export function refrescarAvisosFila(fila) {
  const td = contenedor.querySelector(`tr[data-fila="${fila.id}"] td.celda-fila`);
  if (td) pintarAvisosFila(td, fila);
}

// Lleva el foco a la siguiente casilla dudosa a partir de la que tiene el foco.
export function enfocarSiguienteDuda() {
  const dudosas = [...contenedor.querySelectorAll('td.duda input')];
  if (dudosas.length === 0) return false;
  const actual = document.activeElement;
  const indice = dudosas.indexOf(actual);
  const siguiente = dudosas[(indice + 1) % dudosas.length];
  siguiente.focus();
  siguiente.select();
  siguiente.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  return true;
}
