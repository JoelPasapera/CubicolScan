// Datos de ejemplo con nombres inventados. Sirven para probar la pantalla
// de revisión y el Excel sin gastar lecturas (abre la app con ?demo al final
// de la dirección). Ningún nombre real.

const NOMBRES = [
  'ACERO PRUEBA, Ana Lucía', 'BOSQUE MODELO, Bruno Andrés', 'CAMPO EJEMPLO, Camila Sofía',
  'DELTA MUESTRA, Diego Martín', 'ESTE FICTICIO, Elena Paz', 'FARO SUPUESTO, Fabio León',
  'GAMA INVENTADA, Gabriela Ines', 'HITO SIMULADO, Héctor Joel', 'ISLA DEMO, Irene Valeria',
  'JADE PRUEBA, Julián Tomás', 'KILO MODELO, Karla Ximena', 'LAGO EJEMPLO, Luis Ángel',
  'MONTE MUESTRA, Mía Fernanda', 'NORTE FICTICIO, Nicolás Adrián', 'OCASO SUPUESTO, Olivia Rosa',
  'PRADO INVENTADO, Pablo Esteban', 'QUINTA SIMULADA, Queralt Noa', 'RÍO DEMO, Rafael Ignacio',
  'SOL PRUEBA, Sara Belén', 'TORRE MODELO, Thiago Manuel', 'UMBRAL EJEMPLO, Úrsula Mar',
  'VALLE MUESTRA, Valentina Cruz', 'VIENTO FICTICIO, Vicente Aarón', 'XENIA SUPUESTA, Ximena Lía',
  'YUNQUE INVENTADO, Yago Emilio', 'ZARZA SIMULADA, Zoe Alba', 'ÁLAMO DEMO, Álvaro Nahuel',
  'BAHÍA PRUEBA, Bianca Iris', 'CERRO MODELO, César Iker', 'DUNA EJEMPLO, Daniela Sol',
];

function notasDe(semilla) {
  const v = (base, salto) => String(Math.max(8, Math.min(20, base + ((semilla * salto) % 5) - 2))).padStart(2, '0');
  return {
    T1: v(16, 3), T2: v(16, 5), T3: v(16, 7), T4: v(15, 2), T5: v(16, 4), T6: v(15, 6),
    'R1. MEN': v(16, 1), 'R2. BIM': v(16, 8),
    'REV1-MEN': v(16, 2), 'REV2-BIM': v(16, 9),
    'PC1 / MENSUAL': v(15, 4), 'PC2 / BIM': v(17, 3), 'PC3 / BIM': v(16, 5),
    'ORAL1 / PERSONAL': v(17, 6), 'ORAL2/ CONVERSATION': v(18, 2),
    'Examen Mensual / Reading and Writing': v(17, 7),
    'Bimestral - Proyect': v(18, 3),
  };
}

function fila(n, hoja) {
  const notas = notasDe(n + hoja);
  const tinta = { 'ORAL1 / PERSONAL': 'rojo', 'ORAL2/ CONVERSATION': 'rojo' };
  if (n % 4 === 0) {
    notas['PC1 / MENSUAL'] = '08';
    tinta['PC1 / MENSUAL'] = 'rojo';
  }
  // Dudas a propósito, para ver cómo se marcan.
  if (n === 3) {
    notas.T3 = '8';
    notas['PC2 / BIM'] = '1?';
  }
  if (n === 5) notas['PROMEDIO (1)'] = '16';
  if (n === 27) delete notas.T4;
  return { n, alumno: NOMBRES[n - 1], notas, tinta };
}

export function lecturasDemo() {
  const hoja1 = {
    hojaId: 'demo-hoja-1',
    hoja: { tipo: 'con_cabecera', variante: '2026', primerN: 1, ultimoN: 22 },
    cabecera: { anio: '2026', salon: 'Aula de ejemplo - 4TO C', curso: 'INGLES', periodo: '2do Bimestre', docente: 'DOCENTE EJEMPLO, Nombre' },
    filas: Array.from({ length: 22 }, (_, i) => fila(i + 1, 1)),
  };
  const hoja2 = {
    hojaId: 'demo-hoja-2',
    hoja: { tipo: 'continuacion', variante: '2026', primerN: 23, ultimoN: 30 },
    cabecera: { anio: '', salon: '', curso: '', periodo: '', docente: '' },
    filas: Array.from({ length: 8 }, (_, i) => fila(i + 23, 2)),
  };
  return [hoja1, hoja2];
}
