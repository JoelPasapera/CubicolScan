// La clave vive en el navegador del docente y en ningún otro sitio.
// Nunca se escribe en consola ni se manda a otro sitio que no sea el servicio.

import { CONFIG } from '../config.js';

function almacen() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function obtenerClave() {
  return almacen()?.getItem(CONFIG.claveAlmacen)?.trim() || '';
}

export function hayClave() {
  return obtenerClave() !== '';
}

// Devuelve un texto de error si la clave no tiene pinta de valer, o '' si vale.
export function comprobarFormatoClave(clave) {
  const limpia = String(clave ?? '').trim();
  if (limpia === '') return 'Pega la clave que te dieron.';
  if (/\s/.test(limpia)) return 'La clave no puede llevar espacios. Revisa que la hayas copiado entera.';
  if (limpia.length < 20) return 'La clave es demasiado corta. Revisa que la hayas copiado entera.';
  return '';
}

export function guardarClave(clave) {
  const limpia = String(clave ?? '').trim();
  const error = comprobarFormatoClave(limpia);
  if (error) throw new Error(error);
  const guardado = almacen();
  if (!guardado) throw new Error('Este navegador no permite guardar la clave. Prueba con otro navegador o sin modo privado.');
  guardado.setItem(CONFIG.claveAlmacen, limpia);
}

export function borrarClave() {
  almacen()?.removeItem(CONFIG.claveAlmacen);
}
