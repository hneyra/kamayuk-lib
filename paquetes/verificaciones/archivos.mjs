/**
 * **Las herramientas de las guardas de texto, escritas una vez** (#126).
 *
 * Toda guarda de texto de este repositorio hace lo mismo con otro patron: recorre un arbol, aparta
 * lo que no es fuente, lee cada archivo sin comentarios, lo parte en lineas y junta un `Hallazgo`
 * por cada linea que casa. Hasta #126 cada una se lo escribia: **seis recorredores recursivos**,
 * `APARTADAS` **definida cinco veces con tres contenidos distintos**, **cinco copias** del escaner
 * de lineas, cuatro `interface Hallazgo` y tres formas de normalizar una ruta. Es el defecto que
 * `comentarios.mjs` ya advertia en su cabecera —«la copia que se queda vieja es la que vigila»— un
 * piso mas arriba.
 *
 * <h2>Por que es JavaScript y no TypeScript</h2>
 *
 * Por lo mismo que `comentarios.mjs`: el guion `el-arnes-del-request-no-se-copia.mjs` lo ejecuta
 * un consumidor con `node`, contra su propio arbol, sin Vite ni `tsc` de por medio, y ese guion
 * recorre y escanea igual que las guardas de aqui. Escribirlo una vez en `.ts` para las guardas y
 * otra en `.mjs` para el guion seria volver a tener dos copias. `texto.ts` lo reexporta, asi que
 * las guardas lo siguen importando de donde importaban lo demas.
 *
 * Los tipos van en JSDoc: `tsconfig.json` tiene `allowJs` y `checkJs`, asi que `tsc` los comprueba
 * igual que si el archivo fuera `.ts`.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

import { sinComentarios } from './comentarios.mjs';

/**
 * **Lo que ningun recorrido mira**: lo que no es fuente de este arbol, y las muestras, que violan
 * las reglas a proposito.
 *
 * Es UNA lista. Quien necesita apartar mas —el guion del arnes aparta ademas `build` y `coverage`,
 * porque corre en arboles de consumidores que los tienen— la EXTIENDE en su sitio y lo dice, en vez
 * de escribirse otra que se quede vieja.
 *
 * @type {ReadonlySet<string>}
 */
export const APARTADAS = new Set(['node_modules', 'dist', 'muestras']);

/**
 * Un archivo de pruebas, en cualquiera de las extensiones que un consumidor pueda usar.
 *
 * Es la forma mas ancha de las que habia —la del guion del arnes—: en el arbol de esta libreria
 * no hay ni un `.spec.*` ni un `.test.mjs`, asi que para las guardas de aqui barre lo mismo que la
 * estrecha, y el dia que un consumidor escriba un `.test.js` el guion lo sigue viendo como prueba.
 */
export const PRUEBAS = /\.(?:test|spec)\.(?:ts|tsx|mts|cts|js|mjs|cjs)$/;

/**
 * @typedef {object} OpcionesDelRecorrido
 * @property {Iterable<string>} extensiones las que se recogen, con su punto: `['.ts', '.tsx']`
 * @property {ReadonlySet<string>} [apartadas] los nombres que no se miran. Por omision, `APARTADAS`
 * @property {boolean} [pruebas] si se recogen tambien los archivos de pruebas. Por omision, no
 * @property {boolean} [ocultas] si se baja a los directorios que empiezan por punto. Por omision,
 *   si: en `paquetes/` no hay ninguno, y un recorrido que los saltara en silencio podria dejar
 *   fuera fuente de verdad. El guion del arnes los salta, y dice por que
 */

/**
 * **Los archivos de un arbol**, en orden, bajando a todos los niveles.
 *
 * Devuelve rutas absolutas si `raiz` lo es. El orden es el de `sort()` en cada directorio, que es
 * lo que hace que dos recorridos del mismo arbol den la misma lista —y el mismo rojo— en cualquier
 * sistema de archivos.
 *
 * @param {string} raiz
 * @param {OpcionesDelRecorrido} opciones
 * @returns {string[]}
 */
export function archivosDe(raiz, { extensiones, apartadas = APARTADAS, pruebas = false, ocultas = true }) {
  const admitidas = new Set(extensiones);
  /** @type {string[]} */
  const salida = [];
  /** @param {string} directorio */
  const recorrer = (directorio) => {
    for (const entrada of readdirSync(directorio).sort()) {
      if (apartadas.has(entrada)) continue;
      const completa = join(directorio, entrada);
      if (statSync(completa).isDirectory()) {
        if (!ocultas && entrada.startsWith('.')) continue;
        recorrer(completa);
        continue;
      }
      if (!pruebas && PRUEBAS.test(entrada)) continue;
      if (!admitidas.has(extname(entrada))) continue;
      salida.push(completa);
    }
  };
  recorrer(raiz);
  return salida;
}

/**
 * **La unica normalizacion de rutas de las guardas**: relativa a `raiz`, con `/` en cualquier
 * sistema.
 *
 * Habia tres —`replace(PAQUETES, 'paquetes')`, lo mismo con `replaceAll('\\', '/')` detras, y
 * `relative(RAIZ, …)` a secas— y solo una de ellas daba la misma cadena en Windows. Es la que se
 * escribe en el rojo y la que se compara con un sitio declarado (`'paquetes/api/subir.ts'`).
 *
 * @param {string} raiz
 * @param {string} archivo
 * @returns {string}
 */
export function rutaDesde(raiz, archivo) {
  return relative(raiz, archivo).split(sep).join('/');
}

/**
 * @typedef {object} LineaQueCasa
 * @property {number} linea numero de linea, empezando en 1
 * @property {string} texto la linea, sin espacios a los lados
 */

/**
 * **El unico `Hallazgo`**: una linea de un archivo que casa con el patron de una guarda.
 *
 * @typedef {object} Hallazgo
 * @property {string} archivo la ruta desde la raiz barrida, normalizada con `rutaDesde`
 * @property {number} linea numero de linea, empezando en 1
 * @property {string} texto la linea, sin espacios a los lados
 */

/**
 * Las lineas de un texto que casan con el patron —o con alguno de los patrones—, **sin
 * comentarios**.
 *
 * Sin comentarios por lo que manda `CLAUDE.md` y explica `comentarios.mjs`: los docblocks dicen de
 * donde salio cada pieza, y una guarda que obligara a borrarlo pediria falsificar el registro. El
 * numero de linea es el del archivo: `sinComentarios` conserva los saltos de linea (#42).
 *
 * @param {string} texto el contenido, con sus comentarios
 * @param {RegExp | readonly RegExp[]} patron
 * @returns {LineaQueCasa[]}
 */
export function lineasDelTextoQueCasan(texto, patron) {
  const patrones = Array.isArray(patron) ? patron : [patron];
  /** @type {LineaQueCasa[]} */
  const salida = [];
  sinComentarios(texto)
    .split('\n')
    .forEach((linea, indice) => {
      if (patrones.some((uno) => uno.test(linea))) salida.push({ linea: indice + 1, texto: linea.trim() });
    });
  return salida;
}

/**
 * Las lineas de unos archivos que casan con el patron, cada una con su archivo, **sin
 * comentarios**.
 *
 * @param {readonly string[]} archivos
 * @param {RegExp | readonly RegExp[]} patron
 * @param {string} raiz desde donde se escribe la ruta de cada hallazgo
 * @returns {Hallazgo[]}
 */
export function lineasQueCasan(archivos, patron, raiz) {
  return archivos.flatMap((archivo) =>
    lineasDelTextoQueCasan(readFileSync(archivo, 'utf8'), patron).map(({ linea, texto }) => ({
      archivo: rutaDesde(raiz, archivo),
      linea,
      texto,
    })),
  );
}
