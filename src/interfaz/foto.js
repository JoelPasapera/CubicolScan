// Muestra la foto de la hoja a la que pertenece la fila que se está
// corrigiendo, con zoom, para comparar contra el papel sin salir de la app.

let panel = null;
let visor = null;
let imagen = null;
let titulo = null;
let zoom = 1;
let hojaActual = null;

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;

function aplicarZoom() {
  if (!imagen) return;
  imagen.style.width = `${Math.round(zoom * 100)}%`;
  panel.querySelector('#foto-zoom').textContent = `${Math.round(zoom * 100)} %`;
}

function cambiarZoom(factor) {
  zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * factor));
  aplicarZoom();
}

export function iniciarFoto(elemento) {
  panel = elemento;
  panel.replaceChildren();

  const barra = document.createElement('div');
  barra.className = 'foto__barra';
  titulo = document.createElement('p');
  titulo.className = 'foto__titulo';
  titulo.textContent = 'Foto de la hoja';
  const controles = document.createElement('div');
  controles.className = 'foto__controles';
  const menos = document.createElement('button');
  menos.type = 'button';
  menos.className = 'boton boton--icono';
  menos.textContent = '−';
  menos.title = 'Alejar';
  menos.setAttribute('aria-label', 'Alejar');
  menos.addEventListener('click', () => cambiarZoom(1 / 1.25));
  const nivel = document.createElement('span');
  nivel.id = 'foto-zoom';
  nivel.textContent = '100 %';
  const mas = document.createElement('button');
  mas.type = 'button';
  mas.className = 'boton boton--icono';
  mas.textContent = '+';
  mas.title = 'Acercar';
  mas.setAttribute('aria-label', 'Acercar');
  mas.addEventListener('click', () => cambiarZoom(1.25));
  controles.append(menos, nivel, mas);
  barra.append(titulo, controles);

  visor = document.createElement('div');
  visor.className = 'foto__visor';
  const vacio = document.createElement('p');
  vacio.className = 'foto__vacio';
  vacio.textContent = 'Pulsa en una casilla y aquí aparece la foto de su hoja.';
  visor.append(vacio);

  panel.append(barra, visor);
}

// hoja: la hoja de la fila enfocada. posicion: 0..1, dónde cae la fila en la foto.
export function mostrarHoja(hoja, { etiqueta = '', posicion = null } = {}) {
  if (!panel) return;
  if (!hoja?.imagen?.dataUrl) {
    visor.replaceChildren();
    const aviso = document.createElement('p');
    aviso.className = 'foto__vacio';
    aviso.textContent = 'Esta fila no viene de ninguna foto.';
    visor.append(aviso);
    titulo.textContent = etiqueta || 'Foto de la hoja';
    hojaActual = null;
    return;
  }

  if (hojaActual !== hoja.id) {
    imagen = document.createElement('img');
    imagen.src = hoja.imagen.dataUrl;
    imagen.alt = 'Foto de la hoja del registro';
    imagen.className = 'foto__imagen';
    visor.replaceChildren(imagen);
    hojaActual = hoja.id;
    aplicarZoom();
  }
  titulo.textContent = etiqueta || 'Foto de la hoja';

  if (posicion !== null && imagen) {
    const desplazar = () => {
      const alto = imagen.clientHeight;
      visor.scrollTop = Math.max(0, posicion * alto - visor.clientHeight / 2);
    };
    if (imagen.complete) desplazar();
    else imagen.addEventListener('load', desplazar, { once: true });
  }
}
