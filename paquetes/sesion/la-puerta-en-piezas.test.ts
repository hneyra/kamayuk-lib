// @vitest-environment node
//
// Esta guarda lee el DISCO, no un DOM: en `jsdom`, `import.meta.url` no es una URL `file:` y
// `fileURLToPath` revienta. Es el mismo motivo por el que lo declaran las demas guardas del arbol.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { RAIZ } from '../verificaciones/texto.ts';

/**
 * **`crearIdentidad` compone piezas, y sus numeros tienen nombre** (#122).
 *
 * Medido sobre `origin/main@d3dae33` —con #118 dentro—: `crearIdentidad` ocupaba **321 lineas**
 * (`identidad.ts:329-649`) y `canjearSiVuelve` **98** (`:499-596`), con nueve preocupaciones en un
 * mismo cierre —las URL, el PKCE, las cinco claves del rebote con sus llamadas sueltas a
 * `sessionStorage`, el token en memoria, la sonda, la ida y la vuelta, la salida y la cuenta— y
 * cinco numeros sin nombre: `AbortSignal.timeout(15_000)`, `aleatorio(64)`, `aleatorio(24)`,
 * `?? 3` y `ESPERA_DE_LA_SONDA / 1000`.
 *
 * <h2>Lo que se mide, y como</h2>
 *
 * Con el analizador de TypeScript y no con expresiones regulares, por lo mismo que
 * `el-texto-visible-es-dato`: una funcion empieza y acaba donde el arbol dice, no donde una llave
 * suelta en un comentario lo pareceria. Las lineas se cuentan **desde el nombre hasta la llave que
 * cierra, sin el docblock de delante** —que es como se midio el issue—, y los docblocks DE DENTRO
 * cuentan: una fabrica que crece a fuerza de explicarse sigue siendo una fabrica que crece.
 *
 * Un literal numerico **tiene nombre** cuando es el valor entero de una `const`: `const
 * ESPERA_DEL_CANJE = 15_000`. Cualquier otro sitio —un argumento, una division, un `??`— es un
 * numero sin nombre. **El 0 y el 1 se admiten**, que es lo que dice el criterio: son el vacio y la
 * unidad, no una decision.
 *
 * <h2>Los topes</h2>
 *
 * Son los del issue: `crearIdentidad` ≤ 180 lineas y `canjearSiVuelve` ≤ 60. No son una estetica:
 * son lo que cabe en una pantalla leyendo, y por encima de eso las nueve preocupaciones vuelven a
 * caber en un mismo cierre sin que nadie lo decida.
 */

const IDENTIDAD = join(RAIZ, 'paquetes/sesion/identidad.ts');

const TOPE_DE_CREAR_IDENTIDAD = 180;
const TOPE_DE_CANJEAR_SI_VUELVE = 60;

interface Medida {
  /** Lineas de `crearIdentidad`, o `null` si no se encontro: eso ya es un rojo. */
  readonly crearIdentidad: number | null;
  /** Lineas de `canjearSiVuelve`, o `null` si no se encontro. */
  readonly canjearSiVuelve: number | null;
  /** Cada literal numerico sin nombre, como `linea: texto`. */
  readonly sinNombre: readonly string[];
}

/** De donde empieza el nodo —sin su docblock— a donde acaba, las dos lineas incluidas. */
function lineasDe(nodo: ts.Node, fuente: ts.SourceFile): number {
  const desde = fuente.getLineAndCharacterOfPosition(nodo.getStart(fuente)).line;
  const hasta = fuente.getLineAndCharacterOfPosition(nodo.getEnd()).line;
  return hasta - desde + 1;
}

/** El nombre del nodo si lo tiene y es un identificador: una funcion, un metodo o una propiedad. */
function nombreDe(nodo: ts.Node): string | undefined {
  if (
    (ts.isFunctionDeclaration(nodo) || ts.isMethodDeclaration(nodo) || ts.isPropertyAssignment(nodo)) &&
    nodo.name !== undefined &&
    ts.isIdentifier(nodo.name)
  ) {
    return nodo.name.text;
  }
  return undefined;
}

/** `const NOMBRE = 15_000`: el literal es el valor entero de una constante con nombre. */
function tieneNombre(literal: ts.NumericLiteral): boolean {
  const padre = literal.parent;
  return (
    ts.isVariableDeclaration(padre) &&
    padre.initializer === literal &&
    (ts.getCombinedNodeFlags(padre) & ts.NodeFlags.Const) !== 0
  );
}

/** Mide un archivo fuente. La muestra de abajo pasa por aqui mismo: es lo que prueba que muerde. */
function medir(texto: string): Medida {
  const fuente = ts.createSourceFile('identidad.ts', texto, ts.ScriptTarget.Latest, true);
  let crearIdentidad: number | null = null;
  let canjearSiVuelve: number | null = null;
  const sinNombre: string[] = [];

  const visitar = (nodo: ts.Node): void => {
    const nombre = nombreDe(nodo);
    if (nombre === 'crearIdentidad') crearIdentidad = lineasDe(nodo, fuente);
    if (nombre === 'canjearSiVuelve') canjearSiVuelve = lineasDe(nodo, fuente);
    if (ts.isNumericLiteral(nodo) && !['0', '1'].includes(nodo.text) && !tieneNombre(nodo)) {
      const linea = fuente.getLineAndCharacterOfPosition(nodo.getStart(fuente)).line + 1;
      sinNombre.push(`${linea}: ${nodo.getText(fuente)}`);
    }
    ts.forEachChild(nodo, visitar);
  };
  visitar(fuente);

  return { crearIdentidad, canjearSiVuelve, sinNombre };
}

/**
 * **LA MUESTRA**: la forma que tenia `identidad.ts` antes de #122, en pequeno.
 *
 * Una fabrica de mas de 180 lineas con un metodo de mas de 60 dentro, y los cinco numeros sin
 * nombre tal como estaban. Si `medir` dejara de verlos —por ejemplo porque dejara de encontrar la
 * funcion, o de contar el metodo— la guarda de abajo seguiria en verde sobre el archivo real sin
 * medir nada.
 */
const MUESTRA = [
  'const ESPERA_DE_LA_SONDA = 8_000;',
  'export function crearIdentidad(configuracion: { topeDeIdas?: number }) {',
  '  const topeDeIdas = configuracion.topeDeIdas ?? 3;',
  '  const segundos = ESPERA_DE_LA_SONDA / 1000;',
  '  const verificador = aleatorio(64);',
  '  const estado = aleatorio(24);',
  ...Array.from({ length: 120 }, (_, i) => `  const relleno${String(i)} = 0;`),
  '  return {',
  '    async canjearSiVuelve() {',
  ...Array.from({ length: 70 }, (_, i) => `      const paso${String(i)} = 1;`),
  '      return AbortSignal.timeout(15_000);',
  '    },',
  '  };',
  '}',
].join('\n');

describe('la muestra: lo que la guarda tiene que ver, lo ve', () => {
  const medida = medir(MUESTRA);

  it('cuenta la fabrica y el metodo, y los dos pasan del tope', () => {
    expect(medida.crearIdentidad).toBeGreaterThan(TOPE_DE_CREAR_IDENTIDAD);
    expect(medida.canjearSiVuelve).toBeGreaterThan(TOPE_DE_CANJEAR_SI_VUELVE);
  });

  it('ve los cinco numeros sin nombre, y NO el que lo tiene ni el 0 ni el 1', () => {
    expect(medida.sinNombre.map((h) => h.replace(/^\d+: /, ''))).toEqual([
      '3',
      '1000',
      '64',
      '24',
      '15_000',
    ]);
  });
});

describe('`crearIdentidad` compone piezas, y sus numeros tienen nombre (#122)', () => {
  const medida = medir(readFileSync(IDENTIDAD, 'utf8'));

  it(`crearIdentidad cabe en ${String(TOPE_DE_CREAR_IDENTIDAD)} lineas`, () => {
    expect(medida.crearIdentidad, 'no se encontro `crearIdentidad` en identidad.ts').not.toBeNull();
    expect(
      medida.crearIdentidad,
      'La fabrica vuelve a juntar preocupaciones: lo que no es componer va a `pkce.ts`, a\n' +
        '`rebote.ts` o a una funcion de modulo de `identidad.ts`.',
    ).toBeLessThanOrEqual(TOPE_DE_CREAR_IDENTIDAD);
  });

  it(`canjearSiVuelve cabe en ${String(TOPE_DE_CANJEAR_SI_VUELVE)} lineas`, () => {
    expect(medida.canjearSiVuelve, 'no se encontro `canjearSiVuelve` en identidad.ts').not.toBeNull();
    expect(medida.canjearSiVuelve).toBeLessThanOrEqual(TOPE_DE_CANJEAR_SI_VUELVE);
  });

  it('en identidad.ts no queda ningun literal numerico sin nombre, salvo 0 y 1', () => {
    expect(
      medida.sinNombre,
      'Un numero suelto es una decision sin explicar: dale una `const` con nombre y su porque.',
    ).toEqual([]);
  });
});

/**
 * **Lo que un consumidor lee de este archivo, leido como el lo lee** (#122).
 *
 * La guarda `el-token-vive-en-memoria` de `ciudadano` abre `@kamayuk/sesion/identidad.ts` —ese
 * archivo, no el paquete— y saca las claves con la expresion de abajo, copiada tal cual. Partir la
 * puerta movio las claves a `rebote.ts` y la CI de `consumidores` salio roja en `ciudadano`. Esto
 * es lo que impide que vuelva a pasar sin verse aqui primero.
 */
const COMO_LO_LEE_CIUDADANO = /`\$\{prefijoDeClaves\}\.([\w.]+)`/g;

describe('las claves del rebote se componen en identidad.ts, como las lee un consumidor', () => {
  it('son las cinco, y salen con la expresion de la guarda de `ciudadano`', () => {
    const claves = [...readFileSync(IDENTIDAD, 'utf8').matchAll(COMO_LO_LEE_CIUDADANO)].map((m) => m[1]);
    expect(new Set(claves)).toEqual(
      new Set(['pkce.verificador', 'pkce.estado', 'pkce.destino', 'pkce.idas', 'pkce.salida']),
    );
  });
});
