/**
 * **Las cifras de pruebas las escribe un guion, no una mano** (#128).
 *
 * <h2>El defecto del que sale, contado</h2>
 *
 * `CLAUDE.md` dice cuantas pruebas tiene cada paquete y cuantas hay en total, y hasta #128 esas
 * cifras se escribian a mano: cada PR corria `yarn test`, sumaba y editaba la tabla. Medido sobre
 * `origin/main@2530761`: de los ultimos 40 merges de primer padre, **26 tocaron `CLAUDE.md`**, y
 * los conflictos de acumulacion en esa tabla ya estaban en el propio registro. Y las cifras se
 * quedaban viejas sin que nada se pusiera rojo: el `README.md` de la raiz decia **118, 74, 364, 113
 * y 171** pruebas donde se median **124, 117, 533, 124 y 188** —cinco de sus seis cifras—, y la
 * fila de `verificaciones` ya lo habia confesado una vez («144 en 8, se habia quedado vieja»).
 *
 * <h2>Que hace</h2>
 *
 *     yarn cifras               # mide y reescribe
 *     yarn cifras --comprobar   # mide y sale con RC=1 si alguna cifra escrita no es la medida
 *
 * Mide con `vitest list --json`, que **recoge** las pruebas sin correrlas, y **con los mismos
 * argumentos que `yarn test` y `yarn test:capas`**: los lee de `package.json` en vez de copiarlos,
 * porque una copia se queda vieja sola y entonces esto contaria una suite que ya no es la que corre.
 * Agrupa por `paquetes/<p>/` y reescribe **solo** el texto entre dos marcadores de una misma linea:
 *
 *     <!-- cifras:<paquete> -->…<!-- /cifras -->   y   <!-- cifras:total -->…<!-- /cifras -->
 *
 * Lo de fuera de los marcadores no lo toca. **Un conflicto en una cifra se resuelve ejecutando esto,
 * no sumando.** `--comprobar` corre dentro de `yarn verificar`, asi que corre en la CI.
 *
 * <h2>Lo que NO deja pasar en verde</h2>
 *
 * Una guarda de cifras que no encuentra cifras que mirar no comprueba nada, y lo haria en verde:
 *
 *   - un paquete con pruebas **sin su marcador** en un archivo que tiene que llevarlo;
 *   - un marcador con una clave que no es un paquete ni `total` —una errata, o un paquete que se fue—;
 *   - un marcador que abre y no cierra en la misma linea;
 *   - una medida vacia: si `vitest list` no devolviera ni una prueba, reescribir seria escribir ceros.
 *
 * Las cuatro salen en rojo diciendolo, en los dos modos, y sin escribir nada.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** La raiz de `kamayuk-lib`: el padre de `paquetes/`. */
const RAIZ = fileURLToPath(new URL('../..', import.meta.url));

/**
 * Donde hay cifras, y que tiene que llevar cada archivo.
 *
 * `CLAUDE.md` las lleva todas —cada paquete y el total—, porque es donde se leen. El `README.md`
 * de la raiz lleva una por paquete en su tabla, y entra aqui porque **era el que tenia cinco de
 * seis mal**: dejarlo fuera seria dejar fuera justo el sitio donde el defecto estaba vivo.
 *
 * Es una lista escrita y no un barrido de todos los `.md`, a proposito: `docs/agent/HISTORY.md`
 * cita cifras de su dia —son historia, y reescribirlas seria falsificar el registro— y el propio
 * `CLAUDE.md` explica los marcadores con palabras.
 *
 * **Y que sea una lista escrita no la deja sin vigilar**, que es lo que la revision de #128 midio:
 * sacar el `README.md` de aqui, con su cifra de `api` devuelta a mano a la vieja, dejaba las
 * pruebas y `yarn cifras --comprobar` en verde. Ahora lo cazan dos cosas en
 * `las-cifras-las-escribe-un-guion.test.ts`: que la lista lleve los dos archivos —el `README.md`,
 * por ser donde el defecto estaba vivo— y que ningun `.md` del arbol lleve un marcador sin estar
 * en ella (`marcadoresSinMedir`), porque un marcador que no mide nadie parece una cifra medida.
 *
 * @type {readonly { archivo: string, conElTotal: boolean }[]}
 */
export const DONDE_HAY_CIFRAS = [
  { archivo: 'CLAUDE.md', conElTotal: true },
  { archivo: 'README.md', conElTotal: false },
];

/**
 * Los `.md` que pueden llevar un marcador sin que nadie lo mida: **solo el registro**. Sus filas
 * copian rojos literales —y un rojo de este guion lleva el marcador dentro—, y lo que dicen es
 * historia de su dia: medirlo y reescribirlo seria falsificarlo.
 *
 * @type {readonly string[]}
 */
export const CITAN_SIN_MEDIR = ['docs/agent/HISTORY.md'];

/** La clave del total. Ningun paquete puede llamarse asi. */
export const TOTAL = 'total';

/** Un marcador entero, con su texto: abre y cierra en la misma linea. */
const MARCADOR = /<!-- cifras:([a-z0-9-]+) -->(.*?)<!-- \/cifras -->/g;

/** Solo la apertura: sirve para contar las que no cierran. */
const APERTURA = /<!-- cifras:([a-z0-9-]+) -->/g;

/**
 * Los `.md` que llevan un marcador de cifras y no estan en la lista de los que se miden, cada uno
 * con la linea de su primer marcador.
 *
 * Un marcador asi **parece una cifra medida y no lo es**: `yarn cifras` no lo lee, se queda viejo y
 * nada se pone rojo. Es el mismo defecto que el guion viene a cerrar, por la puerta de la lista.
 * Una explicacion con palabras —`<!-- cifras:<paquete> -->`, como la de `CLAUDE.md`— no cuenta:
 * su clave no es una clave.
 *
 * @param {readonly { archivo: string, texto: string }[]} archivos  Rutas desde la raiz, con `/`.
 * @param {readonly { archivo: string }[]} lista
 * @returns {string[]}  `archivo:linea`
 */
export function marcadoresSinMedir(archivos, lista) {
  const medidos = new Set([...lista.map(({ archivo }) => archivo), ...CITAN_SIN_MEDIR]);
  const unMarcador = new RegExp(APERTURA.source);
  /** @type {string[]} */
  const sueltos = [];
  for (const { archivo, texto } of archivos) {
    if (medidos.has(archivo)) continue;
    const indice = texto.split('\n').findIndex((linea) => unMarcador.test(linea));
    if (indice >= 0) sueltos.push(`${archivo}:${String(indice + 1)}`);
  }
  return sueltos;
}

/**
 * @typedef {{ name: string, file: string }} PruebaListada
 * @typedef {{ pruebas: number, archivos: number, pruebasDeCapa: number, archivosDeCapa: number }} Medida
 * @typedef {{ archivo: string, linea: number, clave: string, escrito: string, medido: string }} Diferencia
 */

// ---------------------------------------------------------------------------------------------
// Leer las ordenes de `package.json`
// ---------------------------------------------------------------------------------------------

/**
 * Parte una orden de `package.json` en palabras, como lo haria el shell para una orden SIMPLE:
 * espacios, y comillas simples o dobles. Lo que no sepa leer —comillas sin cerrar, o una orden
 * compuesta con `&&`, `;` o `|`— lo dice lanzando, en vez de contar otra cosa.
 *
 * @param {string} orden
 * @returns {string[]}
 */
export function partirOrden(orden) {
  /** @type {string[]} */
  const palabras = [];
  let actual = '';
  let hayPalabra = false;
  /** @type {string | null} */
  let comilla = null;
  for (const letra of orden) {
    if (comilla !== null) {
      if (letra === comilla) {
        comilla = null;
      } else {
        actual += letra;
      }
      continue;
    }
    if (letra === "'" || letra === '"') {
      comilla = letra;
      hayPalabra = true;
      continue;
    }
    if (/\s/.test(letra)) {
      if (hayPalabra) palabras.push(actual);
      actual = '';
      hayPalabra = false;
      continue;
    }
    if (letra === '&' || letra === ';' || letra === '|') {
      throw new Error(`«${orden}» es una orden compuesta, y esto solo sabe leer una simple.`);
    }
    actual += letra;
    hayPalabra = true;
  }
  if (comilla !== null) {
    throw new Error(`«${orden}» deja una comilla ${comilla} sin cerrar.`);
  }
  if (hayPalabra) palabras.push(actual);
  return palabras;
}

/**
 * Los argumentos que una orden `vitest run …` le pasa a vitest, para pasarselos a `vitest list`.
 *
 * @param {string} nombre  El nombre de la orden en `package.json`, para decir cual no se pudo leer.
 * @param {string | undefined} orden
 * @returns {string[]}
 */
export function argumentosDeVitest(nombre, orden) {
  if (orden === undefined) {
    throw new Error(`\`package.json\` no tiene la orden «${nombre}», y es la que dice que se cuenta.`);
  }
  const palabras = partirOrden(orden);
  if (palabras[0] !== 'vitest' || palabras[1] !== 'run') {
    throw new Error(
      `La orden «${nombre}» es «${orden}» y no empieza por «vitest run»: no se sabe que cuenta. ` +
        'Contar otra cosa que lo que corre seria escribir una cifra de otra suite.',
    );
  }
  return palabras.slice(2);
}

// ---------------------------------------------------------------------------------------------
// Medir
// ---------------------------------------------------------------------------------------------

/**
 * Los paquetes que hay: los directorios de `paquetes/` con su `package.json`.
 *
 * Se leen del disco y no de una lista, para que un paquete nuevo pida su marcador solo.
 *
 * @param {string} raiz
 * @returns {string[]}
 */
export function paquetesDe(raiz) {
  const donde = join(raiz, 'paquetes');
  return readdirSync(donde)
    .filter((nombre) => statSync(join(donde, nombre)).isDirectory())
    .filter((nombre) => existsSync(join(donde, nombre, 'package.json')))
    .sort();
}

/**
 * Agrupa por paquete lo que `vitest list --json` devolvio.
 *
 * @param {readonly PruebaListada[]} pruebas
 * @param {string} raiz
 * @returns {Map<string, { pruebas: number, archivos: Set<string> }>}
 */
export function agrupar(pruebas, raiz) {
  /** @type {Map<string, { pruebas: number, archivos: Set<string> }>} */
  const grupos = new Map();
  for (const prueba of pruebas) {
    const ruta = relative(raiz, prueba.file).split(sep).join('/');
    const paquete = /^paquetes\/([^/]+)\//.exec(ruta)?.[1];
    if (paquete === undefined) {
      // Hoy `vitest.config.ts` solo incluye `paquetes/**`, asi que esto no pasa. El dia que pase,
      // una prueba que no es de ningun paquete no se reparte a ojo ni se tira: se dice.
      throw new Error(
        `«${ruta}» no vive en ningun \`paquetes/<p>/\`, y esto solo sabe contar por paquete.`,
      );
    }
    const grupo = grupos.get(paquete) ?? { pruebas: 0, archivos: new Set() };
    grupo.pruebas += 1;
    grupo.archivos.add(ruta);
    grupos.set(paquete, grupo);
  }
  return grupos;
}

/**
 * Las medidas de cada paquete, con los de capa aparte.
 *
 * @param {{ paquetes: readonly string[], normales: readonly PruebaListada[], deCapa: readonly PruebaListada[], raiz: string }} entrada
 * @returns {Map<string, Medida>}
 */
export function medir({ paquetes, normales, deCapa, raiz }) {
  const deNormales = agrupar(normales, raiz);
  const deLasCapas = agrupar(deCapa, raiz);
  for (const paquete of [...deNormales.keys(), ...deLasCapas.keys()]) {
    if (!paquetes.includes(paquete)) {
      throw new Error(`Hay pruebas en «paquetes/${paquete}/», y ahi no hay ningun paquete.`);
    }
  }
  /** @type {Map<string, Medida>} */
  const medidas = new Map();
  for (const paquete of paquetes) {
    const normal = deNormales.get(paquete);
    const capa = deLasCapas.get(paquete);
    medidas.set(paquete, {
      pruebas: normal?.pruebas ?? 0,
      archivos: normal?.archivos.size ?? 0,
      pruebasDeCapa: capa?.pruebas ?? 0,
      archivosDeCapa: capa?.archivos.size ?? 0,
    });
  }
  return medidas;
}

/**
 * La suma de todos los paquetes.
 *
 * @param {ReadonlyMap<string, Medida>} medidas
 * @returns {Medida}
 */
export function sumar(medidas) {
  const suma = { pruebas: 0, archivos: 0, pruebasDeCapa: 0, archivosDeCapa: 0 };
  for (const medida of medidas.values()) {
    suma.pruebas += medida.pruebas;
    suma.archivos += medida.archivos;
    suma.pruebasDeCapa += medida.pruebasDeCapa;
    suma.archivosDeCapa += medida.archivosDeCapa;
  }
  return suma;
}

// ---------------------------------------------------------------------------------------------
// Escribir
// ---------------------------------------------------------------------------------------------

/** @param {number} n @param {string} una @param {string} varias */
function cuantas(n, una, varias) {
  return `${String(n)} ${n === 1 ? una : varias}`;
}

/**
 * El texto que va entre los marcadores. Es la forma que `CLAUDE.md` ya escribia a mano, para que
 * poner los marcadores alrededor de una cifra correcta no cambie ni un caracter.
 *
 * @param {string} clave  Un paquete, o `total`.
 * @param {ReadonlyMap<string, Medida>} medidas
 * @returns {string}
 */
export function textoDe(clave, medidas) {
  if (clave === TOTAL) {
    const suma = sumar(medidas);
    const capa =
      suma.pruebasDeCapa === 0
        ? ''
        : `, más ${suma.pruebasDeCapa === 1 ? 'la' : 'las'} ${String(suma.pruebasDeCapa)} de capa`;
    return (
      `**En total: ${cuantas(suma.pruebas, 'prueba', 'pruebas')} en ` +
      `${cuantas(suma.archivos, 'archivo', 'archivos')}${capa}.**`
    );
  }
  const medida = medidas.get(clave);
  if (medida === undefined) {
    throw new Error(`«${clave}» no es un paquete.`);
  }
  const capa =
    medida.pruebasDeCapa === 0
      ? ''
      : `, más ${medida.pruebasDeCapa === 1 ? 'la' : 'las'} **${String(medida.pruebasDeCapa)}** de capa`;
  return (
    `**${cuantas(medida.pruebas, 'prueba', 'pruebas')}** en ` +
    `${cuantas(medida.archivos, 'archivo', 'archivos')}${capa}`
  );
}

/**
 * Reescribe las cifras de un archivo, y dice que cambio y que no pudo leer.
 *
 * Es pura: recibe el texto y devuelve el texto. Escribir en el disco es de `principal()`.
 *
 * @param {string} texto
 * @param {ReadonlyMap<string, Medida>} medidas
 * @param {{ archivo: string, conElTotal: boolean }} donde
 * @returns {{ texto: string, diferencias: Diferencia[], problemas: string[] }}
 */
export function reescribir(texto, medidas, donde) {
  /** @type {Diferencia[]} */
  const diferencias = [];
  /** @type {string[]} */
  const problemas = [];
  /** @type {Set<string>} */
  const vistas = new Set();

  const lineas = texto.split('\n').map((linea, indice) => {
    const numero = indice + 1;
    const abiertas = [...linea.matchAll(APERTURA)].length;
    const cerradas = [...linea.matchAll(MARCADOR)].length;
    if (abiertas !== cerradas) {
      problemas.push(
        `${donde.archivo}:${String(numero)}: un marcador «cifras» abre y no cierra en la misma ` +
          'linea con «<!-- /cifras -->». Lo que habria entre medias no lo leeria nadie.',
      );
      return linea;
    }
    return linea.replace(MARCADOR, (entero, clave, escrito) => {
      if (clave !== TOTAL && !medidas.has(clave)) {
        problemas.push(
          `${donde.archivo}:${String(numero)}: «cifras:${clave}» no es ningun paquete de ` +
            `\`paquetes/\` ni «${TOTAL}». Los paquetes son: ${[...medidas.keys()].join(', ')}.`,
        );
        return entero;
      }
      vistas.add(clave);
      const medido = textoDe(clave, medidas);
      if (escrito !== medido) {
        diferencias.push({ archivo: donde.archivo, linea: numero, clave, escrito, medido });
      }
      return `<!-- cifras:${clave} -->${medido}<!-- /cifras -->`;
    });
  });

  const exigidas = [...medidas.keys(), ...(donde.conElTotal ? [TOTAL] : [])];
  for (const clave of exigidas) {
    if (!vistas.has(clave)) {
      problemas.push(
        `${donde.archivo}: falta el marcador «cifras:${clave}». Una cifra sin marcador no la ` +
          'mide nadie, y se queda vieja en verde.',
      );
    }
  }

  return { texto: lineas.join('\n'), diferencias, problemas };
}

/**
 * Los numeros que cambian entre lo escrito y lo medido, en el orden en que aparecen.
 *
 * @param {string} escrito
 * @param {string} medido
 * @returns {{ escrito: string, medido: string }[]}
 */
export function numerosQueDifieren(escrito, medido) {
  const deLoEscrito = escrito.match(/\d+/g) ?? [];
  const deLoMedido = medido.match(/\d+/g) ?? [];
  /** @type {{ escrito: string, medido: string }[]} */
  const cambios = [];
  const largo = Math.max(deLoEscrito.length, deLoMedido.length);
  for (let i = 0; i < largo; i += 1) {
    const uno = deLoEscrito[i] ?? '(nada)';
    const otro = deLoMedido[i] ?? '(nada)';
    if (uno !== otro) cambios.push({ escrito: uno, medido: otro });
  }
  return cambios;
}

/**
 * Como se dice una diferencia: los numeros primero —lo que AC-1 pide nombrar— y los dos textos
 * enteros debajo, para que se vea que cambio y en que frase.
 *
 * Los numeros se emparejan por posicion **solo si la frase tiene la misma forma**. Si no la tiene
 * —una cifra escrita a mano con otras palabras—, emparejarlos diria «escrito 3, medido 25» de dos
 * numeros que no cuentan lo mismo, y eso es peor que no decir nada: se dice que cambia la forma.
 *
 * @param {Diferencia} diferencia
 * @returns {string}
 */
export function describir(diferencia) {
  const forma = (/** @type {string} */ texto) => texto.replace(/\d+/g, '#');
  const mismaForma = forma(diferencia.escrito) === forma(diferencia.medido);
  const numeros = numerosQueDifieren(diferencia.escrito, diferencia.medido)
    .map(({ escrito, medido }) => `escrito ${escrito}, medido ${medido}`)
    .join('; ');
  return (
    `  · ${diferencia.archivo}:${String(diferencia.linea)}, «cifras:${diferencia.clave}»: ` +
    `${mismaForma ? numeros : 'lo escrito no tiene la forma que escribe el guion'}\n` +
    `      escrito: ${diferencia.escrito}\n` +
    `      medido:  ${diferencia.medido}`
  );
}

/**
 * **Lo que decide el guion**: con la medida y el texto de cada archivo, que codigo de salida, que se
 * dice y que se escribe. No toca el disco ni corre `vitest`; eso es de `principal()`, que solo lee,
 * llama a esto y hace lo que esto dice.
 *
 * Es la puerta que decide el RC de la CI, y hasta la revision de #128 vivia dentro de
 * `principal()`, donde **no la llamaba ninguna prueba**: medido, cambiar `diferencias.length > 0`
 * por `> 1` y tocar a mano una sola cifra dejaba `yarn cifras --comprobar` diciendo «Las cifras
 * escritas son las medidas» con RC=0, y las pruebas en verde. Aqui se le pasan entradas fabricadas.
 *
 * **Y que `principal()` la obedezca tambien se prueba**, porque la segunda revision midio el mismo
 * hueco un eslabon mas abajo: `if (codigo > 1) process.exit(codigo)` en `principal()` imprimia
 * `FALLO` y salia con RC=0, con `decidir` y sus pruebas intactas. Lo caza
 * `el-guion-de-las-cifras-obedece.test.ts`, que corre ESTE archivo como proceso, copiado en una raiz
 * fabricada y con un `vitest` falso, y exige el codigo, lo dicho y lo que queda en el disco.
 *
 * Los codigos: **2** si la medida viene vacia —escribirla seria escribir ceros—; **1** si hay una
 * cifra que no se puede leer, en los dos modos, o si con `--comprobar` alguna escrita no es la
 * medida; **0** en lo demas. Con `--comprobar`, o con algo ilegible, `porEscribir` va vacio.
 *
 * @param {{
 *   comprobar: boolean,
 *   medidas: ReadonlyMap<string, Medida>,
 *   archivos: readonly { donde: { archivo: string, conElTotal: boolean }, texto: string }[],
 * }} entrada
 * @returns {{ codigo: 0 | 1 | 2, informe: string[], porEscribir: { archivo: string, texto: string }[] }}
 */
export function decidir({ comprobar, medidas, archivos }) {
  if (sumar(medidas).pruebas === 0) {
    return {
      codigo: 2,
      informe: ['MAL: `vitest list` no devolvio ni una prueba. Escribir eso seria escribir ceros.'],
      porEscribir: [],
    };
  }

  /** @type {string[]} */
  const problemas = [];
  /** @type {Diferencia[]} */
  const diferencias = [];
  /** @type {{ archivo: string, texto: string }[]} */
  const porEscribir = [];
  for (const { donde, texto } of archivos) {
    const resultado = reescribir(texto, medidas, donde);
    problemas.push(...resultado.problemas);
    diferencias.push(...resultado.diferencias);
    if (resultado.texto !== texto) porEscribir.push({ archivo: donde.archivo, texto: resultado.texto });
  }

  if (problemas.length > 0) {
    return {
      codigo: 1,
      informe: [
        '',
        'FALLO: hay cifras que no se pueden leer, y no se ha escrito nada.',
        '',
        ...problemas.map((problema) => `  · ${problema}`),
        '',
      ],
      porEscribir: [],
    };
  }

  const suma = textoDe(TOTAL, medidas);
  if (comprobar) {
    if (diferencias.length > 0) {
      return {
        codigo: 1,
        informe: [
          '',
          'FALLO: las cifras escritas no son las medidas.',
          '',
          ...diferencias.map(describir),
          '',
          '  Una cifra no se corrige sumando a mano: se ejecuta `yarn cifras`, que la vuelve',
          '  a medir con `vitest list` y reescribe solo el texto entre sus marcadores.',
          '',
        ],
        porEscribir: [],
      };
    }
    return { codigo: 0, informe: [`Las cifras escritas son las medidas: ${suma}`], porEscribir: [] };
  }

  if (diferencias.length === 0) {
    return { codigo: 0, informe: [`Las cifras ya eran las medidas: ${suma}`], porEscribir };
  }
  return {
    codigo: 0,
    informe: ['Cifras reescritas con lo medido:', ...diferencias.map(describir)],
    porEscribir,
  };
}

// ---------------------------------------------------------------------------------------------
// El guion
// ---------------------------------------------------------------------------------------------

// Se ejecuta SOLO cuando se invoca como guion. Importarlo no hace nada, que es lo que permite a
// su prueba llamar a las funciones de arriba sin correr `vitest list` dentro de vitest.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal();
}

/**
 * Lo que `vitest list --json` recoge con esos argumentos.
 *
 * @param {readonly string[]} argumentos
 * @returns {PruebaListada[]}
 */
function listar(argumentos) {
  const requerir = createRequire(import.meta.url);
  const manifiesto = requerir.resolve('vitest/package.json');
  const binario = /** @type {{ bin: { vitest: string } }} */ (
    JSON.parse(readFileSync(manifiesto, 'utf8'))
  ).bin.vitest;
  const carpeta = mkdtempSync(join(tmpdir(), 'kamayuk-cifras-'));
  const salida = join(carpeta, 'lista.json');
  try {
    execFileSync(
      process.execPath,
      [join(dirname(manifiesto), binario), 'list', `--json=${salida}`, ...argumentos],
      { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 },
    );
    return /** @type {PruebaListada[]} */ (JSON.parse(readFileSync(salida, 'utf8')));
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
}

/**
 * Lee, mide, llama a `decidir()` y hace lo que dice: escribe `porEscribir`, dice `informe` y sale con
 * `codigo`. No decide nada; si decidiera, lo decidiria donde no lo mira `decidir` y sus muestras.
 * Lo corre como proceso `el-guion-de-las-cifras-obedece.test.ts`.
 */
function principal() {
  const argumentos = process.argv.slice(2);
  const desconocidos = argumentos.filter((a) => a !== '--comprobar');
  if (desconocidos.length > 0) {
    console.error(`Opcion desconocida: ${desconocidos.join(' ')}. La unica es --comprobar.`);
    process.exit(2);
  }

  const manifiesto = /** @type {{ scripts: Record<string, string> }} */ (
    JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8'))
  );
  const normales = listar(argumentosDeVitest('test', manifiesto.scripts.test));
  const deCapa = listar(argumentosDeVitest('test:capas', manifiesto.scripts['test:capas']));

  const { codigo, informe, porEscribir } = decidir({
    comprobar: argumentos.includes('--comprobar'),
    medidas: medir({ paquetes: paquetesDe(RAIZ), normales, deCapa, raiz: RAIZ }),
    archivos: DONDE_HAY_CIFRAS.map((donde) => ({
      donde,
      texto: readFileSync(join(RAIZ, donde.archivo), 'utf8'),
    })),
  });

  for (const { archivo, texto } of porEscribir) writeFileSync(join(RAIZ, archivo), texto);
  for (const linea of informe) (codigo === 0 ? console.log : console.error)(linea);
  if (codigo !== 0) process.exit(codigo);
}
