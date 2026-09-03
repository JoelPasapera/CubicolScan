// Avisos y errores. Cada uno dice qué pasó y, si procede, ofrece qué hacer.

let contenedor = null;

export function iniciarAvisos(elemento) {
  contenedor = elemento;
}

function crearAviso({ nivel = 'aviso', texto, accion = null }) {
  const aviso = document.createElement('div');
  aviso.className = `aviso aviso--${nivel}`;
  aviso.setAttribute('role', nivel === 'error' ? 'alert' : 'status');

  const parrafo = document.createElement('p');
  parrafo.textContent = texto;
  aviso.append(parrafo);

  if (accion) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'boton boton--secundario boton--pequeno';
    boton.textContent = accion.texto;
    boton.addEventListener('click', () => accion.alPulsar());
    aviso.append(boton);
  }
  return aviso;
}

export function limpiarAvisos() {
  if (contenedor) contenedor.replaceChildren();
}

// lista: [{ nivel: 'aviso' | 'error' | 'exito', texto, accion? }]
export function mostrarAvisos(lista) {
  if (!contenedor) return;
  contenedor.replaceChildren(...lista.map(crearAviso));
}

export function mostrarError(texto, accion = null) {
  if (!contenedor) return;
  contenedor.prepend(crearAviso({ nivel: 'error', texto, accion }));
}

export function mostrarExito(texto) {
  if (!contenedor) return;
  contenedor.prepend(crearAviso({ nivel: 'exito', texto }));
}
