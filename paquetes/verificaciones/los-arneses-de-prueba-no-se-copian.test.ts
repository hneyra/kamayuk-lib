// @vitest-environment node
//
// Lee el arbol de archivos, no un DOM. Bajo jsdom el `fileURLToPath` de `texto.ts` revienta con
// «The URL must be of scheme file» (medido en #2).

import { join } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { PAQUETES, PRUEBAS, RAIZ, archivosDe, leer, rutaDesde } from './texto.ts';

/**
 * **Cada ayudante de las pruebas se define UNA vez: en su arnes** (#127, AC2).
 *
 * Hasta #127 los ayudantes de las pruebas se copiaban de archivo en archivo: el remiendo de jsdom
 * en ocho, `SIN_FRASE` en siete, `monta` en seis, `ConHoja` en cinco, `fetchQueContesta` y
 * `problema` en dos. #127 los junto en cuatro arneses, y el recuento de «una definicion» se hizo
 * con `git grep`, a mano: **nada impedia volver a pegar una copia**. Medido por la verificacion
 * independiente de #127: `function problema(…)` pegado otra vez en `descargar.test.ts` dejaba
 * `vitest`, `eslint` y `tsc` en verde. Esto es lo que lo impide.
 *
 * <h2>Lo que mira</h2>
 *
 *   - **Los nombres que exporta cada arnes**, sacados de su arbol sintactico —no de una lista
 *     escrita aqui, que se quedaria vieja el dia que un arnes gane un ayudante—. En todo
 *     `paquetes/`, pruebas incluidas, ninguna otra declaracion de funcion, variable, clase, tipo o
 *     interfaz puede llevar uno de esos nombres, **a ninguna profundidad**: una copia dentro de un
 *     `describe` es la misma copia.
 *   - **La instalacion de `ResizeObserver`** fuera de `arnes-del-dom.ts`, de cualquiera de las
 *     formas: `x.ResizeObserver = …` o `x['ResizeObserver'] = …`, con `=` o con la asignacion
 *     logica —`??=`, la del «instalalo si falta», `||=` y `&&=`—; `vi.stubGlobal('ResizeObserver', …)`,
 *     `Object.defineProperty(x, 'ResizeObserver', …)` y `Reflect.set(x, 'ResizeObserver', …)`; y
 *     **una clave `ResizeObserver` en un literal de objeto**, que es lo que se le pasa a
 *     `Object.assign` o a `Object.defineProperties`, directo o por una variable. Es el remiendo que
 *     SOLO tenian las ocho copias, y el que AC5 rompe. Hasta la segunda vuelta de #127 solo veia el
 *     `=` y las dos llamadas: `??=` y `Object.assign(globalThis, { ResizeObserver: … })` pegados en
 *     `armazon.test.tsx` salian en verde (medido por la verificacion independiente).
 *
 *   - **Los `setupFiles` de `vitest.config.ts`**, leidos de su arbol y no de una lista escrita aqui:
 *     corren antes de CADA suite, asi que un remiendo instalado en `vitest.setup.ts` es exactamente
 *     el «global» que `arnes-del-dom.ts` prohibe, y ademas tapa la rotura del AC5. Hasta la
 *     revision de #151 el barrido solo recorria `paquetes/`: `globalThis.ResizeObserver ??= class {…}`
 *     al final de `vitest.setup.ts` salia en verde, 6 de 6 (medido por la revision independiente).
 *
 * <h2>Lo que no mira, dicho</h2>
 *
 * **Una copia con OTRO nombre.** Busca los nombres que exporta cada arnes; un `function montar()`
 * con un `const CATALOGO` al lado —los nombres de antes de #127— o un `fetchQueResponde` en `api`
 * salen en verde. Lo estructural, la instalacion de `ResizeObserver`, si se ve con cualquier nombre.
 *
 * **Y el precio de mirar a cualquier profundidad en las pruebas**: una variable local de una prueba
 * que se llame como un ayudante —`const problema = await respuesta.json()`— sale roja, con el
 * mensaje de la copia. Se renombra la local; no se aparta el archivo.
 *
 *
 * Los otros tres remiendos (`requestAnimationFrame`, `scrollIntoView`, `matchMedia`) aparecen
 * sueltos en cuatro suites que no son copias del bloque y que #127 no toca: las tres `capa-*` —que
 * se acotan a proposito su `rAF` sincrono, y `yarn test:capas` no cambia (AC3)—, `piezas.test.tsx`
 * y `el-texto-propio-es-dato.test.tsx`, donde se midio el de `matchMedia` (#13). Una guarda sobre
 * esos tres nombres tendria que llevar esas cuatro excepciones, y no protegeria mas que la de
 * `ResizeObserver`, que ninguna de ellas instala.
 *
 * Mira por el arbol sintactico de TypeScript y no por el texto: un comentario que nombra la copia
 * —como los docblocks de los arneses, que cuentan de donde salieron— no cuenta.
 */

/** Los arneses, por su ruta desde `paquetes/`. */
const ARNESES = [
  'verificaciones/arnes-del-dom.ts',
  'api/respuestas-de-prueba.ts',
  'shell/arnes-del-armazon.tsx',
  'ui/interprete/arnes-del-interprete.tsx',
] as const;

/** El unico sitio donde se instala `ResizeObserver`. */
const EL_DEL_DOM = 'verificaciones/arnes-del-dom.ts';

/** Una declaracion con nombre, o una instalacion de `ResizeObserver`, en una linea de un archivo. */
interface Sitio {
  readonly nombre: string;
  readonly linea: number;
}

function arbolDe(texto: string, archivo: string): ts.SourceFile {
  const tipo = archivo.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(archivo, texto, ts.ScriptTarget.Latest, true, tipo);
}

function lineaDe(fuente: ts.SourceFile, nodo: ts.Node): number {
  return fuente.getLineAndCharacterOfPosition(nodo.getStart(fuente)).line + 1;
}

const exportado = (nodo: ts.Node): boolean =>
  ts.canHaveModifiers(nodo) &&
  (ts.getModifiers(nodo) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

/** Lo que exporta un arnes: el nombre de cada declaracion de primer nivel con `export`. */
export function exportadosDe(texto: string, archivo: string): string[] {
  const fuente = arbolDe(texto, archivo);
  const nombres: string[] = [];
  for (const sentencia of fuente.statements) {
    if (!exportado(sentencia)) continue;
    if (ts.isVariableStatement(sentencia)) {
      for (const d of sentencia.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) nombres.push(d.name.text);
      }
    } else if (
      (ts.isFunctionDeclaration(sentencia) ||
        ts.isClassDeclaration(sentencia) ||
        ts.isInterfaceDeclaration(sentencia) ||
        ts.isTypeAliasDeclaration(sentencia)) &&
      sentencia.name !== undefined
    ) {
      nombres.push(sentencia.name.text);
    }
  }
  return nombres;
}

/**
 * Cada declaracion con nombre de un archivo: a cualquier profundidad en una prueba, y solo las de
 * primer nivel en el resto. Una variable local de una funcion de produccion no es una copia —medido:
 * `const problema = cuerpoDeProblema(texto)` en `api/subir.ts` salia como tal—, y una prueba que se
 * copia un ayudante lo escribe dentro de su `describe` tanto como fuera.
 */
export function declaracionesDe(texto: string, archivo: string): Sitio[] {
  const hondo = PRUEBAS.test(archivo);
  const fuente = arbolDe(texto, archivo);
  const sitios: Sitio[] = [];
  const visitar = (nodo: ts.Node): void => {
    if (
      (ts.isFunctionDeclaration(nodo) ||
        ts.isClassDeclaration(nodo) ||
        ts.isInterfaceDeclaration(nodo) ||
        ts.isTypeAliasDeclaration(nodo)) &&
      nodo.name !== undefined
    ) {
      sitios.push({ nombre: nodo.name.text, linea: lineaDe(fuente, nodo) });
    } else if (ts.isVariableDeclaration(nodo) && ts.isIdentifier(nodo.name)) {
      sitios.push({ nombre: nodo.name.text, linea: lineaDe(fuente, nodo) });
    }
    if (hondo || nodo === fuente || ts.isVariableStatement(nodo) || ts.isVariableDeclarationList(nodo)) {
      ts.forEachChild(nodo, visitar);
    }
  };
  visitar(fuente);
  return sitios;
}

const OBSERVADOR = 'ResizeObserver';

const esElNombre = (nodo: ts.Node): boolean =>
  (ts.isPropertyAccessExpression(nodo) && nodo.name.text === OBSERVADOR) ||
  (ts.isElementAccessExpression(nodo) &&
    ts.isStringLiteralLike(nodo.argumentExpression) &&
    nodo.argumentExpression.text === OBSERVADOR);

/** `=` y las tres asignaciones logicas: `x.ResizeObserver ??= …` instala tanto como `=`. */
const ASIGNACIONES: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.EqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
  ts.SyntaxKind.BarBarEqualsToken,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken,
]);

/** `{ ResizeObserver: … }`, `{ ResizeObserver }`, `{ ResizeObserver() {} }` o `{ ['ResizeObserver']: … }`. */
const esLaClave = (nodo: ts.Node): boolean => {
  if (!ts.isObjectLiteralElementLike(nodo) || !ts.isObjectLiteralExpression(nodo.parent)) return false;
  const nombre = nodo.name;
  if (nombre === undefined) return false;
  if (ts.isIdentifier(nombre) || ts.isStringLiteralLike(nombre)) return nombre.text === OBSERVADOR;
  return (
    ts.isComputedPropertyName(nombre) &&
    ts.isStringLiteralLike(nombre.expression) &&
    nombre.expression.text === OBSERVADOR
  );
};

/** Donde un archivo instala `ResizeObserver`, de cualquiera de las formas del docblock. */
export function instalacionesDelObservador(texto: string, archivo: string): Sitio[] {
  const fuente = arbolDe(texto, archivo);
  const sitios: Sitio[] = [];
  const visitar = (nodo: ts.Node): void => {
    const asignacion =
      ts.isBinaryExpression(nodo) && ASIGNACIONES.has(nodo.operatorToken.kind) && esElNombre(nodo.left);
    const llamada =
      ts.isCallExpression(nodo) &&
      /(?:stubGlobal|defineProperty|Reflect\.set)$/.test(nodo.expression.getText(fuente)) &&
      nodo.arguments.some((a) => ts.isStringLiteralLike(a) && a.text === OBSERVADOR);
    if (asignacion || llamada || esLaClave(nodo)) {
      sitios.push({ nombre: OBSERVADOR, linea: lineaDe(fuente, nodo) });
    }
    ts.forEachChild(nodo, visitar);
  };
  visitar(fuente);
  return sitios;
}

/**
 * Los `setupFiles` de una configuracion de vitest, por su arbol sintactico: la propiedad
 * `setupFiles`, con una cadena o con una lista de cadenas, a cualquier profundidad. Lo que no es
 * un literal —`resolve(__dirname, 'x')`, una variable— no se puede leer sin ejecutar la
 * configuracion, y NO se salta en silencio: sale en `ilegibles`, y la guarda se pone roja con el
 * (revision del PR de #129: un segundo arranque escrito con `resolve(...)` quedaba fuera del barrido).
 */
export function archivosDeArranque(texto: string, archivo: string): { rutas: string[]; ilegibles: string[] } {
  const fuente = arbolDe(texto, archivo);
  const rutas: string[] = [];
  const ilegibles: string[] = [];
  const visitar = (nodo: ts.Node): void => {
    if (ts.isPropertyAssignment(nodo) && ts.isIdentifier(nodo.name) && nodo.name.text === 'setupFiles') {
      const valor = nodo.initializer;
      const elementos = ts.isArrayLiteralExpression(valor) ? [...valor.elements] : [valor];
      for (const e of elementos) {
        if (ts.isStringLiteralLike(e)) rutas.push(e.text);
        else ilegibles.push(`${archivo}:${String(lineaDe(fuente, e))}  ${e.getText(fuente)}`);
      }
    }
    ts.forEachChild(nodo, visitar);
  };
  visitar(fuente);
  return { rutas, ilegibles };
}

/** Lo que corre antes de cada suite, con su ruta desde la raiz. */
const LEIDO_DEL_ARRANQUE = archivosDeArranque(leer(join(RAIZ, 'vitest.config.ts')), 'vitest.config.ts');
const ARRANQUE = LEIDO_DEL_ARRANQUE.rutas.map((ruta) => join(RAIZ, ruta));

/**
 * Los `.ts` y `.tsx` de los paquetes, pruebas incluidas y muestras fuera, mas los `setupFiles`.
 * `ruta` es desde `paquetes/` —la que se compara con `ARNESES`— y `mostrar`, desde la raiz.
 */
const ARCHIVOS = [...archivosDe(PAQUETES, { extensiones: ['.ts', '.tsx'], pruebas: true }), ...ARRANQUE].map(
  (archivo) => ({ ruta: rutaDesde(PAQUETES, archivo), mostrar: rutaDesde(RAIZ, archivo), texto: leer(archivo) }),
);

/** De que arnes es cada nombre exportado. */
const DUENNO = new Map<string, string>(
  ARNESES.flatMap((arnes) =>
    exportadosDe(leer(join(PAQUETES, arnes)), arnes).map((nombre) => [nombre, arnes] as const),
  ),
);

describe('los arneses de prueba se importan, no se copian (#127)', () => {
  it('EL CENTINELA: cada arnes existe, se lee, y exporta lo que el issue le pidio', () => {
    // Sin esto, un arnes renombrado o un `exportadosDe` que no viera nada dejarian el barrido sin
    // nombres que buscar, y en verde para siempre.
    for (const nombre of [
      'remendarElDom',
      'fetchQueContesta',
      'problema',
      'catalogoInventado',
      'montarElArmazon',
      'SIN_FRASE',
      'monta',
      'ConHoja',
      'descripcionDe',
      'hojaEspiada',
    ]) {
      expect(DUENNO.has(nombre), `ningun arnes exporta «${nombre}»`).toBe(true);
    }
    expect(ARCHIVOS.map((a) => a.ruta)).toEqual(expect.arrayContaining([...ARNESES]));
    expect(ARCHIVOS.length, 'el barrido no mide el arbol').toBeGreaterThan(150);
  });

  it('EL CENTINELA: el barrido lee los `setupFiles` de vitest, que corren antes de cada suite', () => {
    // Sin esto, un `setupFiles` renombrado o un `archivosDeArranque` que no viera nada dejarian el
    // arranque fuera del barrido otra vez, en verde.
    expect(ARRANQUE.map((archivo) => rutaDesde(RAIZ, archivo))).toContain('vitest.setup.ts');
    expect(ARCHIVOS.some((a) => a.mostrar === 'vitest.setup.ts'), 'el barrido no lee `vitest.setup.ts`').toBe(true);
    // Y la lectura casa con las dos formas que admite vitest: la cadena sola y la lista.
    expect(archivosDeArranque("export default { test: { setupFiles: './a.ts' } };", 'c.ts')).toEqual({
      rutas: ['./a.ts'],
      ilegibles: [],
    });
    expect(archivosDeArranque("export default { test: { setupFiles: ['./a.ts', './b.ts'] } };", 'c.ts').rutas).toEqual([
      './a.ts',
      './b.ts',
    ]);
  });

  it('y un `setupFiles` que no es un literal sale rojo: no se salta en silencio', () => {
    // Lo que se leeria ejecutando la configuracion no se sabe leyendola: se nombra, para que alguien
    // lo escriba como literal o le ensenne a la guarda a leerlo.
    expect(LEIDO_DEL_ARRANQUE.ilegibles, 'un `setupFiles` de vitest.config.ts no se puede leer sin ejecutarlo').toEqual([]);
    const muestra = "const s = './b.ts';\nexport default { test: { setupFiles: [resolve(__dirname, 'x'), s, './a.ts'] } };";
    expect(archivosDeArranque(muestra, 'c.ts')).toEqual({
      rutas: ['./a.ts'],
      ilegibles: ["c.ts:2  resolve(__dirname, 'x')", 'c.ts:2  s'],
    });
  });

  it('EL CENTINELA: el barrido ve el remiendo del arnes del DOM', () => {
    // El unico codigo que SI lo instala. Si el patron dejara de casar, ninguna copia saldria.
    const delDom = ARCHIVOS.find((a) => a.ruta === EL_DEL_DOM);
    expect(instalacionesDelObservador(delDom?.texto ?? '', EL_DEL_DOM)).toHaveLength(1);
  });

  it('ningun ayudante de un arnes se vuelve a definir fuera de el', () => {
    const copias = ARCHIVOS.flatMap(({ ruta, mostrar, texto }) =>
      declaracionesDe(texto, ruta)
        .filter(({ nombre }) => DUENNO.has(nombre) && DUENNO.get(nombre) !== ruta)
        .map(({ nombre, linea }) => `  ${mostrar}:${String(linea)}  ${nombre}  (es de ${String(DUENNO.get(nombre))})`),
    );
    expect(
      copias,
      'Un ayudante de las pruebas esta escrito otra vez fuera de su arnes. Se importa, por ruta ' +
        `relativa:\n${copias.join('\n')}`,
    ).toEqual([]);
  });

  it('`ResizeObserver` se instala en UN solo sitio: `arnes-del-dom.ts`', () => {
    const copias = ARCHIVOS.filter(({ ruta }) => ruta !== EL_DEL_DOM).flatMap(({ ruta, mostrar, texto }) =>
      instalacionesDelObservador(texto, ruta).map(({ linea }) => `  ${mostrar}:${String(linea)}`),
    );
    expect(
      copias,
      'El remiendo de jsdom esta copiado otra vez. Se llama `remendarElDom()` en el `beforeAll`:\n' +
        copias.join('\n'),
    ).toEqual([]);
  });

  it('LA MUESTRA: la copia de `problema` y la del remiendo salen, y su comentario NO cuenta', () => {
    const ruta = 'verificaciones/muestras/arnes-de-prueba-copiado.ts';
    const texto = leer(join(PAQUETES, ruta));
    const copiados = (comoSiFuera: string) =>
      declaracionesDe(texto, comoSiFuera)
        .filter(({ nombre }) => DUENNO.has(nombre))
        .map(({ nombre }) => nombre);
    // La muestra es una prueba, y se lee como la prueba que imita: la de `descargar`, donde estaba.
    expect(copiados('api/descargar.test.ts')).toEqual(['problema', 'SIN_FRASE']);
    // Leida como produccion, lo que va dentro del `describe` es local y no cuenta: la regla de la
    // profundidad, que es la que deja pasar el `const problema` de `api/subir.ts`.
    expect(copiados('api/descargar.ts')).toEqual([]);
    // Las once formas de instalarlo, cada una en su linea, y ni una mas: la muestra lo nombra
    // tambien en un comentario y en una cadena que no instalan nada.
    const formas = instalacionesDelObservador(texto, ruta);
    expect(formas).toHaveLength(11);
    expect(new Set(formas.map(({ linea }) => linea)).size).toBe(11);
    // Y el barrido de verdad no la recoge: `muestras/` esta apartado.
    expect(ARCHIVOS.some((a) => a.ruta.includes('/muestras/'))).toBe(false);
    expect(rutaDesde(RAIZ, join(PAQUETES, ruta))).toBe(`paquetes/${ruta}`);
  });

  it('y un nombre que solo se USA —un import, una llamada, una propiedad— no es una copia', () => {
    const uso = [
      "import { problema } from './respuestas-de-prueba.ts';",
      "fetchQueContesta(problema(404, 'X', 'y'));",
      'const respuesta = { problema: 1 };',
      'if (globalThis.ResizeObserver === undefined) {}',
      "const nombre = 'ResizeObserver';",
      // Leerlo, desestructurado o comparado, tampoco lo instala: un patron no es un literal.
      'const { ResizeObserver } = globalThis;',
      'const hay = globalThis.ResizeObserver ?? null;',
    ].join('\n');
    expect(declaracionesDe(uso, 'uso.ts').filter(({ nombre }) => DUENNO.has(nombre))).toEqual([]);
    expect(instalacionesDelObservador(uso, 'uso.ts')).toEqual([]);
  });
});
