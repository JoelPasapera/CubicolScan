// Prepara la foto antes de mandarla: la endereza según el giro elegido,
// la reduce a un tamaño que se lee bien y la deja en JPEG. También calcula
// una huella para detectar la misma foto subida dos veces.

import { CONFIG } from '../config.js';

export async function huellaArchivo(archivo) {
  try {
    const bytes = await archivo.arrayBuffer();
    const resumen = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(resumen)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Sin crypto.subtle (por ejemplo en http sin https): huella aproximada.
    return `${archivo.name}|${archivo.size}|${archivo.lastModified}`;
  }
}

function cargarConImg(archivo) {
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolver(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rechazar(new Error('No se pudo abrir la foto. Comprueba que es una imagen (JPG o PNG).'));
    };
    img.src = url;
  });
}

async function cargarImagen(archivo) {
  if (globalThis.createImageBitmap) {
    try {
      return await createImageBitmap(archivo, { imageOrientation: 'from-image' });
    } catch {
      // Se cae al método clásico.
    }
  }
  return cargarConImg(archivo);
}

// rotacion: 0, 90, 180 o 270 grados en el sentido de las agujas del reloj.
export async function prepararImagen(archivo, rotacion = 0) {
  const origen = await cargarImagen(archivo);
  const anchoOrigen = origen.width ?? origen.naturalWidth;
  const altoOrigen = origen.height ?? origen.naturalHeight;
  if (!anchoOrigen || !altoOrigen) throw new Error('La foto está vacía o dañada. Prueba con otra.');

  const escala = Math.min(1, CONFIG.ladoMaximoImagen / Math.max(anchoOrigen, altoOrigen));
  const ancho = Math.round(anchoOrigen * escala);
  const alto = Math.round(altoOrigen * escala);
  const girada = rotacion % 180 !== 0;

  const lienzo = document.createElement('canvas');
  lienzo.width = girada ? alto : ancho;
  lienzo.height = girada ? ancho : alto;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.translate(lienzo.width / 2, lienzo.height / 2);
  ctx.rotate((rotacion * Math.PI) / 180);
  ctx.drawImage(origen, -ancho / 2, -alto / 2, ancho, alto);
  if (typeof origen.close === 'function') origen.close();

  const dataUrl = lienzo.toDataURL('image/jpeg', CONFIG.calidadJpeg);
  return {
    dataUrl,
    base64: dataUrl.slice(dataUrl.indexOf(',') + 1),
    mediaType: 'image/jpeg',
    ancho: lienzo.width,
    alto: lienzo.height,
  };
}

// Miniatura pequeña para la lista de hojas, para no cargar la página con fotos grandes.
export function miniaturaDe(dataUrl, ladoMaximo = 360) {
  return new Promise((resolver) => {
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, ladoMaximo / Math.max(img.width, img.height));
      const lienzo = document.createElement('canvas');
      lienzo.width = Math.round(img.width * escala);
      lienzo.height = Math.round(img.height * escala);
      lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);
      resolver(lienzo.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolver(dataUrl);
    img.src = dataUrl;
  });
}
