// Ajustes técnicos. Nada de aquí se muestra al usuario.

export const CONFIG = Object.freeze({
  // Servicio de lectura de imágenes.
  urlServicio: 'https://api.anthropic.com/v1/messages',
  versionApi: '2023-06-01',
  modelo: 'claude-sonnet-5',
  maxTokensSalida: 32000,
  tiempoMaximoMs: 240000,

  // Preparación de la foto antes de mandarla.
  ladoMaximoImagen: 2576,
  calidadJpeg: 0.9,

  // Dónde se guarda la clave en el navegador.
  claveAlmacen: 'registro-a-excel.clave',
});
