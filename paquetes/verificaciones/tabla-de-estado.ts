/**
 * **La tabla de estado de `CLAUDE.md` cabe en una línea por pieza** (#128): lo que la guarda
 * comprueba, aparte de la guarda.
 *
 * Vive aquí, y no dentro de `el-estado-cabe-en-una-linea.test.ts`, por lo mismo que `cifras.mjs`
 * separa `decidir` de `principal()`: hasta la revisión de #128 la guarda **sólo miraba el
 * `CLAUDE.md` real**, y medido en una copia desechable, subir el límite a `400 * 100` o borrar la
 * fila entera del intérprete la dejaban en `Tests 4 passed (4)`. Una comprobación que sólo se
 * ejerce sobre el árbol que ya cumple no demuestra que sepa ver otra cosa. Aquí recibe el texto y
 * la lista de lo movido, y su prueba le pasa también muestras fabricadas que la violan.
 */

/** Ninguna línea de la tabla pasa de esto, en **bytes**: así se midió la de 10 445. */
export const LIMITE_EN_BYTES = 400;

/** La cabecera que abre la tabla de estado. Si cambia, la guarda sale roja diciéndolo. */
export const CABECERA = '| Pieza | Estado |';

export interface LineaDeLaTabla {
  readonly numero: number;
  readonly texto: string;
}

/** Las líneas de la tabla de estado: desde su cabecera hasta la primera que no empieza por `|`. */
export function tablaDeEstado(lineas: readonly string[]): LineaDeLaTabla[] {
  const desde = lineas.indexOf(CABECERA);
  if (desde < 0) return [];
  const tabla: LineaDeLaTabla[] = [];
  for (let i = desde; i < lineas.length && (lineas[i] ?? '').startsWith('|'); i += 1) {
    tabla.push({ numero: i + 1, texto: lineas[i] ?? '' });
  }
  return tabla;
}

/** Los `README.md` que enlaza una línea, tal como los escribe: rutas desde la raíz. */
export function readmesQueEnlaza(linea: string): string[] {
  return [...linea.matchAll(/\]\(([^)\s]*README\.md)\)/g)].map((enlace) => enlace[1] ?? '');
}

/**
 * Lo que está mal en la tabla de estado de un `CLAUDE.md`, en frases que dicen dónde.
 *
 *   - la tabla no está: sin ella no hay nada que medir, y eso no puede salir en verde;
 *   - una línea pasa de {@link LIMITE_EN_BYTES} bytes;
 *   - **un README de lo movido no lo enlaza ninguna fila**. Lo movido es cada `README.md` de
 *     `paquetes/**` —el de `paquetes/ui/interprete/`, que no es un paquete, incluido— y el de cada
 *     paquete aunque falte: AC-5 pide que lo movido siga enlazado **desde la tabla**, y contar sólo
 *     los paquetes dejaba borrar la fila del intérprete, la más grande que se movió, en verde;
 *   - una fila enlaza un `README.md` que no está.
 *
 * @param claude   El texto de `CLAUDE.md`.
 * @param movidos  Los `README.md` que la tabla tiene que enlazar, como rutas desde la raíz.
 * @param existe   Si esa ruta, desde la raíz, es un archivo.
 */
export function faltasDeLaTabla({
  claude,
  movidos,
  existe,
}: {
  claude: string;
  movidos: readonly string[];
  existe: (ruta: string) => boolean;
}): string[] {
  const tabla = tablaDeEstado(claude.split('\n'));
  if (tabla.length === 0) {
    return [`CLAUDE.md: no se encontró «${CABECERA}», y sin la tabla no hay nada que medir.`];
  }
  const faltas: string[] = [];

  for (const { numero, texto } of tabla) {
    const bytes = Buffer.byteLength(texto, 'utf8');
    if (bytes > LIMITE_EN_BYTES) {
      faltas.push(
        `CLAUDE.md:${String(numero)} mide ${String(bytes)} bytes, y el límite es ` +
          `${String(LIMITE_EN_BYTES)}: lo narrativo va en el README.md de su pieza, no en la tabla.`,
      );
    }
  }

  const filas = tabla.slice(2);
  const enlaces = filas.flatMap(({ numero, texto }) => readmesQueEnlaza(texto).map((ruta) => ({ numero, ruta })));
  const enlazados = new Set(enlaces.map(({ ruta }) => ruta));
  for (const ruta of movidos) {
    if (!enlazados.has(ruta)) {
      faltas.push(`${ruta} no lo enlaza ninguna fila de la tabla: lo movido tiene que seguir enlazado desde ella.`);
    }
  }
  for (const { numero, ruta } of enlaces) {
    if (!existe(ruta)) {
      faltas.push(`CLAUDE.md:${String(numero)} enlaza ${ruta}, y no está.`);
    }
  }
  return faltas;
}
