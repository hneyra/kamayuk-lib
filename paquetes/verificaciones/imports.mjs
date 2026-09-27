/**
 * **Lo que un archivo importa, leido por el analizador de TypeScript y no por una expresion
 * regular** (#112).
 *
 * <h2>El defecto del que sale, medido</h2>
 *
 * Tres guardas de este arbol decidian que es un import con su propia expresion regular, y las tres
 * se saltaban formas reales:
 *
 *   - `sin-nombre-publico-entre-paquetes` buscaba `from '@kamayuk/<paquete>'`, `require(…)` e
 *     `import(…)`. **No veia** `import '@kamayuk/ui';`, ni `import '@kamayuk/ui/estilos.css';` —y
 *     `ui` publica ese subcamino de verdad—, ni `from '@kamayuk/verificaciones/prohibiciones'`,
 *     porque `[a-z-]+['"]` no admite un subcamino.
 *   - `el-marco-no-decide-permisos` buscaba `from '…/sesion/'`. **No veia** `from '../sesion'`
 *     —import de directorio, que con `moduleResolution: bundler` resuelve—, ni
 *     `import '../sesion/x.ts'`, ni `import('../sesion/x.ts')`.
 *   - `el-arnes-del-request-no-se-copia.mjs` llevaba otra del mismo tipo.
 *
 * Y al reves tambien fallaban: una CADENA con la forma de un import —la que escribe una prueba
 * para comprobar la guarda— contaba como import. Medido: al anadir a la prueba de la guarda del
 * nombre publico la lista de lineas que esperaba de su muestra, la guarda salio roja contra su
 * propia prueba, nombrando tres de esas cadenas.
 *
 * <h2>Lo que se usa, y por que el arbol sintactico entero</h2>
 *
 * `ts.createSourceFile` y un recorrido de sus nodos: la declaracion `import` —de efecto, `type`,
 * `with {…}`—, la `export … from` —con `*`, `* as x`, `type` y llaves—, `import x = require(…)`,
 * las llamadas `import(…)` y `require(…)` con un literal, y el tipo `import('x')`. **Los
 * comentarios, las cadenas y el texto JSX quedan fuera por construccion**, porque se mira el nodo y
 * no el texto: una cadena con la forma de un import es un `StringLiteral` dentro de otra cosa, y
 * `<p>import 'x'</p>` es un `JsxText`.
 *
 * **Por que no `ts.preProcessFile`, que fue lo primero**: es el recolector de dependencias del
 * compilador y es mas barato, pero no es exhaustivo. Medido por la segunda verificacion
 * independiente de #112, con TypeScript 5.9.3: `export * as api from '@kamayuk/api';` y
 * `export type * as s from '../sesion';` dan `[]`, y la expresion regular de antes SI los veia
 * —llevan `from '…'`—, asi que en esa forma la guarda nueva era peor que la vieja. Tampoco
 * distinguia el texto JSX del codigo. La lista entera de formas esta en
 * `sin-nombre-publico-entre-paquetes.test.ts`, una por linea, y la prueba exige cada una.
 *
 * El nombre del archivo decide como se lee (`.tsx` y `.js*` admiten JSX, `.ts` no), igual que en
 * el compilador: leido como `.tsx`, un `.ts` con `<T>valor` se descompone.
 *
 * Lo que **no** ve, dicho: un import cuyo especificador no es un literal (`import(variable)`,
 * ``require(`${x}`)``), que ninguna guarda estatica puede resolver.
 *
 * <h2>Por que es JavaScript y no TypeScript</h2>
 *
 * Por lo mismo que `archivos.mjs` y `comentarios.mjs`: el guion `el-arnes-del-request-no-se-copia`
 * lo ejecuta un consumidor con `node`, contra su propio arbol, sin Vite ni `tsc` de por medio.
 *
 * <h2>De donde sale `typescript` en el arbol de un consumidor</h2>
 *
 * **Primero de junto a esta libreria, y si no, del arbol que se barre.** En el trabajo
 * `consumidores` de la CI, esta libreria es un clon **sin `node_modules`** —solo instala el
 * consumidor— y `node` resuelve el guion enlazado a su RUTA REAL, asi que un `import 'typescript'`
 * escrito aqui buscaria subiendo por `kamayuk-lib/` y no lo encontraria. Es el mismo rojo de #4
 * por otra puerta. Cada consumidor es un proyecto TypeScript y tiene su `typescript`, asi que se le
 * pide a el. Lo ensaya `el-arnes-del-request-se-publica.test.ts` con una copia del guion sin
 * `node_modules` alrededor.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join } from 'node:path';

import { sinComentarios } from './comentarios.mjs';
import { rutaDesde } from './archivos.mjs';

/**
 * El modulo `typescript`.
 *
 * @typedef {typeof import('typescript')} Analizador
 */

/**
 * **Un import de un archivo**: lo que importa y donde.
 *
 * @typedef {object} Import
 * @property {string} especificador lo que va entre comillas, tal cual: `'../sesion'`, `'@kamayuk/ui/estilos.css'`
 * @property {number} linea numero de linea, empezando en 1
 * @property {string} texto la linea entera, sin espacios a los lados
 */

/**
 * Un `Hallazgo` de las guardas que ademas dice que especificador lo hizo hallazgo.
 *
 * @typedef {import('./archivos.mjs').Hallazgo & { especificador: string }} ImportHallado
 */

/** Lo que lanza `elAnalizador` cuando `typescript` no esta en ningun sitio donde mira. */
export class SinAnalizador extends Error {}

/**
 * **El analizador**, resuelto primero desde esta libreria y despues desde cada raiz que se le de.
 *
 * Lanza `SinAnalizador` —con un mensaje que dice donde miro— si no esta en ninguna: un barrido sin
 * analizador no puede decir nada, y seguir en verde seria afirmar lo que no se midio.
 *
 * @param {readonly string[]} [raices] los arboles donde buscarlo si no esta junto a la libreria
 * @returns {Analizador}
 */
export function elAnalizador(raices = []) {
  const desde = [import.meta.url, ...raices.map((raiz) => join(raiz, 'package.json'))];
  for (const sitio of desde) {
    try {
      return /** @type {Analizador} */ (createRequire(sitio)('typescript'));
    } catch (error) {
      if (/** @type {{ code?: unknown }} */ (error).code !== 'MODULE_NOT_FOUND') throw error;
    }
  }
  throw new SinAnalizador(
    'no se encontro `typescript`, que es con lo que se leen los imports: ni junto a ' +
      `@kamayuk/verificaciones ni en ${raices.length === 0 ? '(ninguna raiz)' : raices.join(', ')}.`,
  );
}

/**
 * El `@import` de una hoja de estilos, en las formas que el CSS admite: `@import 'x';`,
 * `@import"x";` —sin espacio, que el tokenizador de CSS acepta porque la cadena corta la palabra—,
 * `@import "x" layer(…);`, `@import url('x');` y **`@import url(x);`, sin comillas**, que es CSS
 * valido y la forma que se le escapaba a la primera version de esta expresion: exigia comillas, y
 * `@import url(@kamayuk/ui/estilos.css);` en `clasico.css` dejaba la guarda en verde (#112, medido
 * por la verificacion independiente). La palabra `@import` y `url(` no distinguen mayusculas en
 * CSS, y por eso la bandera `i`. `@importurl(x)` NO es un import —es otra palabra— y no casa: tras
 * `@import` el `url(` exige espacio.
 *
 * El analizador de TypeScript no lee CSS, y el recorrido de las guardas si.
 *
 * Grupos: 2, la cadena de la forma sin `url(`; 4, la cadena dentro de `url('…')`; 5, lo de dentro
 * de `url(…)` sin comillas.
 */
const IMPORT_DE_CSS =
  /@import(?:\s*(['"])(.*?)\1|\s+url\(\s*(?:(['"])(.*?)\3|([^\s'"()]+))\s*\))/giu;

/**
 * **Lo que importa un texto de codigo** (`.ts`, `.tsx`, `.js`, `.mjs`…), en el orden en que
 * aparece. Los comentarios, las cadenas y el texto JSX no cuentan.
 *
 * @param {string} texto el contenido, con sus comentarios
 * @param {Analizador} [analizador]
 * @param {string} [nombre] el nombre del archivo: su extension decide si se lee con JSX. Por
 *   omision, `.ts`
 * @returns {Import[]}
 */
export function importsDe(texto, analizador = elAnalizador(), nombre = 'texto.ts') {
  const ts = analizador;
  const lineas = texto.split('\n');
  const fuente = ts.createSourceFile(nombre, texto, ts.ScriptTarget.Latest, false);
  /** @type {Import[]} */
  const hallados = [];

  /** @param {import('typescript').Node | undefined} nodo */
  function anotar(nodo) {
    if (nodo === undefined || !ts.isStringLiteralLike(nodo)) return;
    const linea = fuente.getLineAndCharacterOfPosition(nodo.getStart(fuente)).line + 1;
    hallados.push({ especificador: nodo.text, linea, texto: (lineas[linea - 1] ?? '').trim() });
  }

  /** @param {import('typescript').Node} nodo */
  function mirar(nodo) {
    if (ts.isImportDeclaration(nodo) || ts.isExportDeclaration(nodo)) {
      anotar(nodo.moduleSpecifier);
    } else if (ts.isImportEqualsDeclaration(nodo)) {
      if (ts.isExternalModuleReference(nodo.moduleReference)) anotar(nodo.moduleReference.expression);
    } else if (ts.isCallExpression(nodo)) {
      const quien = nodo.expression;
      const esImport = quien.kind === ts.SyntaxKind.ImportKeyword;
      const esRequire = ts.isIdentifier(quien) && quien.text === 'require';
      if ((esImport || esRequire) && nodo.arguments.length >= 1) anotar(nodo.arguments[0]);
    } else if (ts.isImportTypeNode(nodo)) {
      if (ts.isLiteralTypeNode(nodo.argument)) anotar(nodo.argument.literal);
    }
    ts.forEachChild(nodo, mirar);
  }

  mirar(fuente);
  return hallados;
}

/**
 * **Lo que importa una hoja de estilos**, sin los `@import` que estan en un comentario.
 *
 * @param {string} texto
 * @returns {Import[]}
 */
export function importsDelCss(texto) {
  const limpio = sinComentarios(texto);
  const lineas = texto.split('\n');
  return [...limpio.matchAll(IMPORT_DE_CSS)].map((casa) => {
    const linea = limpio.slice(0, casa.index).split('\n').length;
    return { especificador: casa[2] ?? casa[4] ?? casa[5] ?? '', linea, texto: (lineas[linea - 1] ?? '').trim() };
  });
}

/**
 * Lo que importa un archivo, por su extension: `.css` con `importsDelCss` y lo demas con el
 * analizador.
 *
 * @param {string} archivo
 * @param {Analizador} [analizador]
 * @returns {Import[]}
 */
export function importsDelArchivo(archivo, analizador = elAnalizador()) {
  const texto = readFileSync(archivo, 'utf8');
  return extname(archivo) === '.css' ? importsDelCss(texto) : importsDe(texto, analizador, archivo);
}

/**
 * **Los imports de unos archivos cuyo especificador cumple el criterio**, cada uno con su archivo
 * escrito como lo escriben todas las guardas (`rutaDesde`).
 *
 * @param {readonly string[]} archivos
 * @param {(especificador: string) => boolean} criterio
 * @param {string} raiz desde donde se escribe la ruta de cada hallazgo
 * @returns {ImportHallado[]}
 */
export function importsQueCasan(archivos, criterio, raiz) {
  const analizador = elAnalizador();
  return archivos.flatMap((archivo) =>
    importsDelArchivo(archivo, analizador)
      .filter(({ especificador }) => criterio(especificador))
      .map(({ especificador, linea, texto }) => ({
        archivo: rutaDesde(raiz, archivo),
        linea,
        texto,
        especificador,
      })),
  );
}
