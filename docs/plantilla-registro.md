# La plantilla del registro

La cuadrícula es siempre la misma. La app no tiene que adivinar la estructura:
la conoce de antemano y solo coloca dentro lo que lee de la foto. Esto es lo que
hace posible el proyecto, así que este documento es la fuente de la verdad y
manda sobre cualquier otra cosa.

## Cabecera de la hoja

Cinco datos, impresos arriba y rellenados a mano o a máquina:

| Campo    | Ejemplo                                  |
|----------|------------------------------------------|
| Título   | `REGISTRO AUXILIAR - 2026`               |
| Salón    | `Virgen del Apocalipsis - 4TO C`         |
| Curso    | `INGLES`                                 |
| Periodo  | `2do Bimestre`                           |
| Docente  | apellidos y nombres                      |

El año sale del título y decide qué variante de plantilla se usa.

## Columnas, en orden

Las dos primeras identifican al alumno. El resto son notas.

1. `N°`
2. `APELLIDOS Y NOMBRES`
3. `PROMEDIO`
4. `Actitud frente al curso (Bimestral)`

**Tareas Virtuales** (grupo)

5. `T1`
6. `T2`
7. `T3`
8. `T4`
9. `T5`
10. `T6`

11. `PROMEDIO`

**Trabajo en Clase** (grupo)

12. `R1. MEN`
13. `R2. BIM`
14. `Revisión de Cuadernos`
15. `REV1-MEN`
16. `REV2-BIM`
17. `Rev. Libro`
18. `PC1 / MENSUAL`
19. `PC2 / BIM`
20. `PC3 / BIM`
21. `PC. Calificadas / Writing and Reading`
22. `ORAL1 / PERSONAL`
23. `ORAL2/ CONVERSATION`
24. `Orales / Speaking`

25. `PROMEDIO`
26. `Examen Mensual / Reading and Writing`
27. `Bimestral - Proyect`

Los tres `PROMEDIO` y las columnas 4, 14, 17, 21 y 24 aparecen vacías en todas
las fotos disponibles. Salen vacías en el Excel. Que estén impresas no significa
que se rellenen.

## Variante antigua

Hay registros de años anteriores con otra cabecera y otras columnas. La app
detecta el año del título y aplica la plantilla que corresponda. Diferencias de
la variante `2020`:

- El grupo se llama `Tareas` en vez de `Tareas Virtuales`.
- El segundo grupo se llama `Revisión - Trabajo en Clase` y sus columnas son:
  `T1`, `T2`, `Revisión de Cuadernos`, `T1`, `T2`, `Rev. Libro`, `PC1`, `PC2`,
  `PC3`, `PC4`, `PC5`, `PC6`, `PC. Calificadas`, `ORAL1`, `ORAL2`, `Orales`.
- Las dos últimas son `Examen Mensual` y `Examen Bimestral`.

Ojo con `T1` y `T2`: en esta variante aparecen dos veces, en grupos distintos.
No se pueden identificar solo por el nombre.

Las plantillas viven en un módulo aparte, una por año. Añadir un año futuro
tiene que ser escribir una lista de columnas más, sin tocar el resto de la app.

## Las notas

- Escala de 0 a 20, números enteros.
- Se escriben con dos dígitos: `08`, no `8`.
- Escritas a mano, en bolígrafo azul o rojo, a veces sobreescritas o tachadas.
- Una celda vacía es un dato: significa que no hay nota, y así se queda.
- El color de la tinta parece distinguir tipos de evaluación, pero no se ha
  confirmado qué significa. Se guarda como dato de cada celda por si más
  adelante hace falta; no se interpreta ni se muestra.

## Cuántos alumnos

Entre 22 y 48 por salón según las fotos disponibles. La app no asume ningún
número: lo que manda es el `N°` de cada fila.

## Cuando el registro no cabe en una hoja

La segunda foto trae solo las filas que siguen, sin cabecera de columnas y sin
cabecera de registro. Empieza en el número siguiente al último de la hoja
anterior. Es la única pista para unirlas, y por eso el `N°` de cada fila es el
dato más importante de todos: sin él no se sabe de quién son las notas.
