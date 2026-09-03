// Ventana de ajustes: solo la clave del servicio de lectura.
// Se abre sola la primera vez y cuando la clave no vale.

import { borrarClave, comprobarFormatoClave, guardarClave, hayClave, obtenerClave } from '../servicios/clave.js';

let dialogo = null;
let entrada = null;
let mensaje = null;
let alGuardar = null;

function pintarEstado() {
  const tiene = hayClave();
  dialogo.querySelector('#ajustes-estado').textContent = tiene
    ? 'Hay una clave guardada en este navegador.'
    : 'Todavía no hay ninguna clave guardada.';
  dialogo.querySelector('#ajustes-borrar').hidden = !tiene;
  entrada.value = tiene ? obtenerClave() : '';
  mensaje.textContent = '';
}

export function abrirAjustes(motivo = '') {
  if (!dialogo) return;
  pintarEstado();
  dialogo.querySelector('#ajustes-motivo').textContent = motivo;
  dialogo.querySelector('#ajustes-motivo').hidden = motivo === '';
  if (typeof dialogo.showModal === 'function') dialogo.showModal();
  else dialogo.setAttribute('open', '');
  entrada.focus();
  entrada.select();
}

export function cerrarAjustes() {
  if (!dialogo) return;
  if (typeof dialogo.close === 'function' && dialogo.open) dialogo.close();
  else dialogo.removeAttribute('open');
}

export function iniciarAjustes({ elemento, botonAbrir, cuandoGuarde }) {
  dialogo = elemento;
  entrada = dialogo.querySelector('#ajustes-clave');
  mensaje = dialogo.querySelector('#ajustes-mensaje');
  alGuardar = cuandoGuarde;

  botonAbrir.addEventListener('click', () => abrirAjustes());

  dialogo.querySelector('#ajustes-guardar').addEventListener('click', () => {
    const error = comprobarFormatoClave(entrada.value);
    if (error) {
      mensaje.textContent = error;
      entrada.focus();
      return;
    }
    try {
      guardarClave(entrada.value);
    } catch (e) {
      mensaje.textContent = e.message;
      return;
    }
    cerrarAjustes();
    alGuardar?.();
  });

  dialogo.querySelector('#ajustes-borrar').addEventListener('click', () => {
    borrarClave();
    pintarEstado();
    mensaje.textContent = 'Clave borrada de este navegador.';
  });

  dialogo.querySelector('#ajustes-cancelar').addEventListener('click', () => cerrarAjustes());

  dialogo.querySelector('#ajustes-ver').addEventListener('click', (evento) => {
    const oculta = entrada.type === 'password';
    entrada.type = oculta ? 'text' : 'password';
    evento.currentTarget.textContent = oculta ? 'Ocultar' : 'Mostrar';
  });

  entrada.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      dialogo.querySelector('#ajustes-guardar').click();
    }
  });
}
