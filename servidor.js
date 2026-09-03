// Servidor de archivos para trabajar en local. Sin dependencias.
//   node servidor.js
// y abrir http://localhost:8080
//
// Hace falta un servidor porque los navegadores no cargan módulos JS desde
// un archivo abierto directamente. Para los docentes la app va alojada en
// una dirección web; esto es solo para desarrollo.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('.', import.meta.url));
const puerto = Number(process.env.PUERTO ?? process.argv[2] ?? 8080);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
};

const servidor = createServer(async (peticion, respuesta) => {
  const rutaPedida = decodeURIComponent(new URL(peticion.url, 'http://x').pathname);
  const limpia = normalize(rutaPedida).replace(/^(\.\.[/\\])+/, '');
  let ruta = join(raiz, limpia === '/' || limpia === '\\' ? 'index.html' : limpia);

  if (!ruta.startsWith(raiz)) {
    respuesta.writeHead(403);
    respuesta.end();
    return;
  }

  try {
    const info = await stat(ruta);
    if (info.isDirectory()) ruta = join(ruta, 'index.html');
    const contenido = await readFile(ruta);
    respuesta.writeHead(200, {
      'content-type': TIPOS[extname(ruta).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    respuesta.end(contenido);
  } catch {
    respuesta.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    respuesta.end('No encontrado');
  }
});

servidor.listen(puerto, () => {
  console.log(`Registro a Excel: http://localhost:${puerto}`);
  console.log(`Modo de ejemplo sin clave: http://localhost:${puerto}/?demo`);
  console.log('Ctrl+C para parar.');
});
