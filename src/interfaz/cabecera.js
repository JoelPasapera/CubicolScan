// Los datos de arriba del registro: salón, curso, periodo, docente y año.
// Se pueden corregir a mano.

const CAMPOS = [
  { clave: 'salon', etiqueta: 'Salón' },
  { clave: 'curso', etiqueta: 'Curso' },
  { clave: 'periodo', etiqueta: 'Periodo' },
  { clave: 'docente', etiqueta: 'Docente' },
  { clave: 'anio', etiqueta: 'Año' },
];

export function pintarCabecera(contenedor, registro, { alCambiar }) {
  contenedor.replaceChildren();
  for (const campo of CAMPOS) {
    const etiqueta = document.createElement('label');
    etiqueta.className = `campo campo--${campo.clave}`;
    const texto = document.createElement('span');
    texto.textContent = campo.etiqueta;
    const entrada = document.createElement('input');
    entrada.type = 'text';
    entrada.value = registro.cabecera[campo.clave] ?? '';
    entrada.autocomplete = 'off';
    entrada.addEventListener('input', () => {
      registro.cabecera[campo.clave] = entrada.value;
      alCambiar?.(campo.clave, entrada.value);
    });
    etiqueta.append(texto, entrada);
    contenedor.append(etiqueta);
  }
}
