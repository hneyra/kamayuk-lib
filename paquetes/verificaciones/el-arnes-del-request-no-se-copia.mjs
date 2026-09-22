/**
 * **El arnes del `Request` se importa; no se copia** (#92).
 *
 * <h2>El defecto del que sale, contado</h2>
 *
 * El arreglo que permite correr con Node 24 —un `Request` de arnes que acepta la senal creada por
 * jsdom, ver `arnes-del-request.ts`— nacio en el `vitest.setup.ts` de esta libreria (#90) y a los
 * pocos dias estaba **copiado** en el de otro sistema, y hacia falta en tres mas. Cinco copias de
 * la misma costura, con su docblock de treinta lineas cada una, es exactamente lo que esta
 * libreria existe para evitar (ADR-0038). Y una costura copiada no envejece igual en los cinco:
 * la que se queda vieja no avisa, porque **sigue en verde**.
 *
 * <h2>Que vigila esto, y que NO puede vigilar</h2>
 *
 * **Esta libreria no puede leer el arbol de un consumidor**: no lo tiene clonado, y el trabajo
 * `consumidores` de la CI clona el consumidor para correr SU suite, no para que una prueba de aqui
 * le lea los archivos. Cualquier guarda de aqui que afirmara algo sobre el `vitest.setup.ts` de
 * otro repositorio estaria afirmando lo que no midio. Asi que la vigilancia es de dos piezas, y
 * cada una corre donde puede:
 *
 *   1. **Aqui**: `el-arnes-del-request-se-publica.test.ts` barre este arbol con este mismo modulo
 *      y exige que la asignacion del `Request` global aparezca en **un solo archivo** —el
 *      publicado— y que `vitest.setup.ts` lo IMPORTE en vez de llevar la copia. Es la que impide
 *      que la copia vuelva por donde se fue.
 *   2. **En el consumidor**: este mismo guion, que se ejecuta contra su propio arbol sin instalar
 *      nada y sin Vite ni `tsc` de por medio:
 *
 *          node node_modules/@kamayuk/verificaciones/el-arnes-del-request-no-se-copia.mjs
 *
 *      Sale con RC=1 y nombra archivo y linea si alguien ha vuelto a escribir el arnes a mano, y
 *      dice la linea exacta con la que se cambia. Lo ejecuta el consumidor porque es el unico que
 *      tiene delante su arbol; que lo enchufe a su `verificar` es decision suya, y **eso es lo que
 *      esta guarda no puede forzar** — queda dicho aqui en vez de fingir que si.
 *
 * <h2>Por que busca la ASIGNACION del global y no la clase</h2>
 *
 * Porque una clase que extiende `Request` y no se instala no hace nada, y quien copia el arnes
 * tiene que instalarlo: `globalThis.Request = …`, o el mismo global escrito de otra forma, o un
 * `Object.defineProperty`. Buscar la clase, o el nombre del docblock, daria rojo a quien solo cita
 * el problema; buscar la asignacion da rojo exactamente a quien lo reimplementa.
 *
 * Y se busca **sobre el texto sin comentarios** (`comentarios.mjs`), por lo que manda `CLAUDE.md`:
 * los docblocks de este producto explican de donde salio cada pieza, y una guarda que obligara a
 * no poder escribir `globalThis.Request` dentro de una explicacion estaria pidiendo falsificar el
 * registro.
 *
 * <h2>Uso</h2>
 *
 *     node paquetes/verificaciones/el-arnes-del-request-no-se-copia.mjs [--raiz <directorio>]
 *
 * Sin `--raiz` mira el directorio desde el que se invoca.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { sinComentarios } from './comentarios.mjs';

/** La subruta publicada. Lo que un consumidor escribe, y lo que resuelve por su `exports`. */
export const EL_MODULO = '@kamayuk/verificaciones/arnes-del-request';

/**
 * **La linea exacta que se anade al `vitest.setup.ts` de un consumidor.**
 *
 * Es un dato y no una frase del README a proposito: la prueba de aqui comprueba que esta cadena
 * nombra una subruta que el `package.json` publica de verdad, y que el README dice ESTA y no otra.
 * Una linea documentada que no resuelve es peor que ninguna.
 */
export const LA_LINEA = `import '${EL_MODULO}';`;

/** El unico archivo del producto donde la asignacion es legitima, tal como termina su ruta. */
export const EL_SITIO_LEGITIMO = join('verificaciones', 'arnes-del-request.ts');

/**
 * Las formas de instalar el `Request` en el global. Son las que hay, no las que se nos ocurrieron:
 * el acceso por punto, el acceso por corchete y el `defineProperty`.
 *
 * El `(?!=)` final no es adorno — sin el, `globalThis.Request === ElArnes` —que es como el propio
 * modulo comprueba si ya esta montado— contaria como una copia.
 */
export const INSTALAR_EL_REQUEST = [
  /\b(?:globalThis|global|window|self)\s*\.\s*Request\s*=(?!=)/,
  /\b(?:globalThis|global|window|self)\s*\[\s*['"`]Request['"`]\s*\]\s*=(?!=)/,
  /\bdefineProperty\s*\(\s*(?:globalThis|global|window|self)\s*,\s*['"`]Request['"`]/,
];

/**
 * Como se reconoce que un archivo ENCHUFA el arnes publicado, por su nombre publico o por una ruta
 * relativa a el.
 *
 * Tiene que ser un `import`/`require` de verdad y no la cadena a secas: **medido**, con el patron
 * suelto este mismo guion se contaba entre los que lo enchufan —declara la subruta en `EL_MODULO`,
 * no la importa— y esa lista es lo que decide si se avisa de que a un arbol le falta la linea.
 */
const IMPORTA_EL_ARNES = [
  /\b(?:import|require)\s*\(?\s*['"`][^'"`]*arnes-del-request(?:\.ts)?['"`]/,
  /\bfrom\s+['"`][^'"`]*arnes-del-request(?:\.ts)?['"`]/,
];

/** Lo que no se mira: lo que no es codigo de este arbol, y las muestras, que violan a proposito. */
const APARTADAS = new Set(['node_modules', 'dist', 'build', 'coverage', 'muestras']);

const EXTENSIONES = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs']);

/**
 * **Las pruebas quedan fuera del barrido**, y es la misma razon por la que `archivosDeProduccion`
 * las deja fuera en `texto.ts`: la prueba de esta guarda tiene que poder ESCRIBIR la linea
 * prohibida —es justo lo que comprueba— y una guarda que se pusiera roja con su propia muestra se
 * apaga el mismo dia. Lo que cuesta, dicho: una copia escondida en un archivo de pruebas no la ve.
 * Donde el arnes se instala de verdad es en el archivo de arranque del ejecutor, que SI se mira.
 */
const PRUEBAS = /\.(?:test|spec)\.(?:ts|tsx|mts|cts|js|mjs|cjs)$/;

/**
 * @typedef {object} Hallazgo
 * @property {number} linea numero de linea, empezando en 1
 * @property {string} texto la linea, sin espacios a los lados
 */

/**
 * @typedef {object} HallazgoEnArchivo
 * @property {string} archivo ruta relativa a la raiz barrida
 * @property {number} linea
 * @property {string} texto
 */

/**
 * @typedef {object} Barrido
 * @property {HallazgoEnArchivo[]} copias donde se escribio el arnes a mano
 * @property {string[]} enchufan los archivos que importan el arnes publicado
 * @property {number} mirados cuantos archivos se leyeron. Sin esto un barrido vacio parece limpio
 */

/**
 * Las lineas de un texto que INSTALAN el `Request` global.
 *
 * @param {string} texto el contenido del archivo, con sus comentarios
 * @returns {Hallazgo[]}
 */
export function copiasEn(texto) {
  /** @type {Hallazgo[]} */
  const salida = [];
  sinComentarios(texto)
    .split('\n')
    .forEach((linea, indice) => {
      if (INSTALAR_EL_REQUEST.some((patron) => patron.test(linea))) {
        salida.push({ linea: indice + 1, texto: linea.trim() });
      }
    });
  return salida;
}

/**
 * Si un texto enchufa el arnes publicado, por su nombre publico o por una ruta relativa a el.
 *
 * @param {string} texto
 * @returns {boolean}
 */
export function enchufaElArnes(texto) {
  const limpio = sinComentarios(texto);
  return IMPORTA_EL_ARNES.some((patron) => patron.test(limpio));
}

/**
 * Los archivos de codigo de un arbol. Ni `node_modules`, ni lo compilado, ni las muestras.
 *
 * @param {string} raiz
 * @returns {string[]}
 */
export function archivosDelArbol(raiz) {
  /** @type {string[]} */
  const salida = [];
  /** @param {string} directorio */
  const recorrer = (directorio) => {
    for (const entrada of readdirSync(directorio).sort()) {
      if (APARTADAS.has(entrada)) continue;
      const completa = join(directorio, entrada);
      if (statSync(completa).isDirectory()) {
        // Ningun directorio oculto: ahi no vive el arranque del ejecutor y si viven copias
        // enteras del repositorio —`.claude/worktrees/` es un arbol de trabajo por agente, con su
        // `node_modules`, y su `.gitignore` lo dice—, que se contarian dos veces.
        if (entrada.startsWith('.')) continue;
        recorrer(completa);
        continue;
      }
      if (PRUEBAS.test(entrada)) continue;
      if (!EXTENSIONES.has(extname(entrada))) continue;
      salida.push(completa);
    }
  };
  recorrer(raiz);
  return salida;
}

/**
 * Barre un arbol entero. El modulo publicado no cuenta como copia: es el original.
 *
 * @param {string} raiz
 * @returns {Barrido}
 */
export function barrer(raiz) {
  /** @type {HallazgoEnArchivo[]} */
  const copias = [];
  /** @type {string[]} */
  const enchufan = [];
  const archivos = archivosDelArbol(raiz);
  for (const archivo of archivos) {
    const texto = readFileSync(archivo, 'utf8');
    const como = relative(raiz, archivo);
    if (enchufaElArnes(texto)) enchufan.push(como);
    if (archivo.endsWith(`${sep}${EL_SITIO_LEGITIMO}`)) continue;
    for (const hallazgo of copiasEn(texto)) {
      copias.push({ archivo: como, linea: hallazgo.linea, texto: hallazgo.texto });
    }
  }
  return { copias, enchufan, mirados: archivos.length };
}

// Se ejecuta SOLO cuando se invoca como guion. Importarlo no hace nada, que es lo que permite a la
// prueba de aqui barrer con este mismo codigo en vez de con una copia suya.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal();
}

function principal() {
  const raiz = resolve(leerLaRaiz(process.argv.slice(2)));
  const { copias, enchufan, mirados } = barrer(raiz);

  console.log(`Arbol mirado: ${raiz}  (${String(mirados)} archivos de codigo)`);

  if (copias.length > 0) {
    console.error('');
    console.error('FALLO: el arnes del `Request` esta escrito a mano en este arbol.');
    console.error('');
    for (const copia of copias) {
      console.error(`  · ${copia.archivo}:${String(copia.linea)}  ${copia.texto}`);
    }
    console.error('');
    console.error('  Se publica una vez y se importa. En tu `vitest.setup.ts`:');
    console.error('');
    console.error(`      ${LA_LINEA}`);
    console.error('');
    console.error('  Y se borra la copia, docblock incluido: la explicacion vive con el codigo,');
    console.error('  en `@kamayuk/verificaciones/arnes-del-request`.');
    console.error('');
    process.exit(1);
  }

  if (enchufan.length === 0) {
    console.log('');
    console.log('Nadie escribe el arnes a mano aqui, y nadie lo enchufa tampoco.');
    console.log('Si tus pruebas montan el enrutador de datos de `react-router` sobre jsdom con');
    console.log('Node 24, esta es la linea que le falta a tu `vitest.setup.ts`:');
    console.log('');
    console.log(`    ${LA_LINEA}`);
    console.log('');
    return;
  }

  console.log(`El arnes se importa, y no se copia. Lo enchufa: ${enchufan.join(', ')}`);
}

/**
 * @param {readonly string[]} argumentos
 * @returns {string}
 */
function leerLaRaiz(argumentos) {
  for (let i = 0; i < argumentos.length; i += 1) {
    if (argumentos[i] !== '--raiz') throw new Error(`Opcion desconocida: ${String(argumentos[i])}`);
    const valor = argumentos[i + 1];
    if (valor === undefined) throw new Error('Falta el valor de --raiz');
    return valor;
  }
  return process.cwd();
}
