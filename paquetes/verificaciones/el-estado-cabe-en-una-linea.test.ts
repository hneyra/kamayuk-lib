// @vitest-environment node
//
// Lee `CLAUDE.md` y mira que existan los `README.md` que enlaza. No es un DOM lo que necesita.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { paquetesDe } from './cifras.mjs';
import { CABECERA, faltasDeLaTabla } from './tabla-de-estado.ts';
import { PAQUETES, RAIZ, archivosDe, rutaDesde } from './texto.ts';

/**
 * **La tabla de estado de `CLAUDE.md` cabe en una línea por pieza** (#128).
 *
 * <h2>El defecto del que sale, medido</h2>
 *
 * Sobre `origin/main@2530761` la tabla tenía nueve líneas que pesaban **23 889 bytes**, el 66 % de
 * un archivo que cada sesión carga entero, y la del intérprete sola medía **10 445**. Decía de sí
 * misma que «dice el ESTADO, no cómo se llegó a él», y sus filas citaban ocho y nueve issues cada
 * una. Y como cada PR escribía en ella, era el conflicto de todos: de los últimos 40 merges de
 * primer padre, 26 tocaron `CLAUDE.md`.
 *
 * Lo narrativo se fue al `README.md` de cada paquete, y la tabla quedó en una línea por pieza. Esta
 * guarda es lo que impide que vuelva a crecer por acumulación, que es como creció: nadie escribió
 * nunca una fila de diez mil bytes, se escribieron veinte añadidos de quinientos.
 *
 * <h2>Qué exige</h2>
 *
 * Lo dice `faltasDeLaTabla` (`tabla-de-estado.ts`): ninguna línea pasa de **400 bytes**, cada
 * `README.md` de lo movido lo enlaza una fila —el del intérprete incluido, que no es un paquete— y
 * cada `README.md` enlazado existe.
 *
 * <h2>Y sus muestras</h2>
 *
 * Hasta la revisión de #128 esto sólo miraba el `CLAUDE.md` real, y con el límite subido a
 * `400 * 100` o la fila del intérprete borrada seguía en verde. Ahora recibe también un
 * `CLAUDE.md` fabricado que la viola por cada puerta, y el límite se fija por los dos lados: 400
 * bytes pasan y 401 no, y 401 **bytes** en menos de 400 caracteres tampoco.
 */

/** Cada `README.md` de `paquetes/**`, como ruta desde la raíz, sin `node_modules` ni muestras. */
function readmesDeLosPaquetes(): string[] {
  return archivosDe(PAQUETES, { extensiones: ['.md'] })
    .filter((archivo) => basename(archivo) === 'README.md')
    .map((archivo) => rutaDesde(RAIZ, archivo))
    .sort();
}

/** Lo movido: el README de cada paquete —esté o no— y cualquier otro README de `paquetes/**`. */
const MOVIDOS = [
  ...new Set([...paquetesDe(RAIZ).map((paquete) => `paquetes/${paquete}/README.md`), ...readmesDeLosPaquetes()]),
].sort();

const existeEnElArbol = (ruta: string): boolean => existsSync(join(RAIZ, ruta)) && statSync(join(RAIZ, ruta)).isFile();

describe('la tabla de estado de `CLAUDE.md` cabe en una línea por pieza', () => {
  it('EL CENTINELA: lo movido es más que los paquetes, porque el intérprete no es uno', () => {
    // Sin esto, un barrido roto dejaría `MOVIDOS` en los seis paquetes, y la fila del intérprete
    // se podría borrar en verde, que es lo que la revisión midió.
    expect(MOVIDOS.length).toBeGreaterThan(paquetesDe(RAIZ).length);
    expect(MOVIDOS).toContain('paquetes/ui/interprete/README.md');
  });

  it('el `CLAUDE.md` de verdad no tiene ninguna falta', () => {
    const faltas = faltasDeLaTabla({
      claude: readFileSync(join(RAIZ, 'CLAUDE.md'), 'utf8'),
      movidos: MOVIDOS,
      existe: existeEnElArbol,
    });
    expect(faltas, `la tabla de estado:\n  ${faltas.join('\n  ')}`).toEqual([]);
  });
});

describe('las muestras que la violan', () => {
  const MOVIDOS_DE_LA_MUESTRA = ['paquetes/a/README.md', 'paquetes/a/sub/README.md'];
  const todoExiste = (): boolean => true;

  /** Una fila que enlaza el README de `ruta`, rellena hasta medir `bytes` bytes exactos. */
  function fila(ruta: string, bytes?: number, relleno = 'x'): string {
    const base = `| [\`${ruta}\`](${ruta}/README.md) | **Existe.** `;
    if (bytes === undefined) return `${base}Algo |`;
    const falta = bytes - Buffer.byteLength(`${base} |`, 'utf8');
    const unidad = Buffer.byteLength(relleno, 'utf8');
    const linea = `${base}${relleno.repeat(Math.floor(falta / unidad))}${'x'.repeat(falta % unidad)} |`;
    expect(Buffer.byteLength(linea, 'utf8')).toBe(bytes);
    return linea;
  }

  const claude = (...filas: string[]): string =>
    ['# Algo', '', CABECERA, '|---|---|', ...filas, '', 'Y lo demás.'].join('\n');

  const faltas = (texto: string, existe: (ruta: string) => boolean = todoExiste): string[] =>
    faltasDeLaTabla({ claude: texto, movidos: MOVIDOS_DE_LA_MUESTRA, existe });

  it('la muestra bien no tiene faltas', () => {
    expect(faltas(claude(fila('paquetes/a'), fila('paquetes/a/sub')))).toEqual([]);
  });

  // Los 400 van escritos, y no derivados de `LIMITE_EN_BYTES`: son la cifra de AC-5, y una muestra
  // que se estirase con la constante seguiría en verde con el límite subido a cien veces más.
  it('una línea de 400 bytes cabe, y una de 401 no', () => {
    expect(faltas(claude(fila('paquetes/a', 400), fila('paquetes/a/sub')))).toEqual([]);
    expect(faltas(claude(fila('paquetes/a', 401), fila('paquetes/a/sub')))).toEqual([
      `CLAUDE.md:5 mide 401 bytes, y el límite es 400: lo narrativo va en el README.md de su pieza, no en la tabla.`,
    ]);
  });

  it('el límite es de bytes y no de caracteres: 401 bytes en menos de 400 caracteres no caben', () => {
    const larga = fila('paquetes/a', 401, 'ó');
    expect(larga.length).toBeLessThan(400);
    expect(faltas(claude(larga, fila('paquetes/a/sub')))).toEqual([
      expect.stringContaining('CLAUDE.md:5 mide 401 bytes'),
    ]);
  });

  it('LA DE LA REVISIÓN: la fila del intérprete borrada sale roja, aunque no sea un paquete', () => {
    expect(faltas(claude(fila('paquetes/a')))).toEqual([
      'paquetes/a/sub/README.md no lo enlaza ninguna fila de la tabla: lo movido tiene que seguir enlazado desde ella.',
    ]);
  });

  it('una fila sin el enlace a su README sale roja', () => {
    expect(faltas(claude('| `paquetes/a` | **Existe.** Algo |', fila('paquetes/a/sub')))).toEqual([
      expect.stringContaining('paquetes/a/README.md no lo enlaza ninguna fila'),
    ]);
  });

  it('un README enlazado que no está sale rojo, con su línea', () => {
    const sinSub = (ruta: string): boolean => ruta !== 'paquetes/a/sub/README.md';
    expect(faltas(claude(fila('paquetes/a'), fila('paquetes/a/sub')), sinSub)).toEqual([
      'CLAUDE.md:6 enlaza paquetes/a/sub/README.md, y no está.',
    ]);
  });

  it('sin la tabla no hay nada que medir, y eso sale rojo', () => {
    expect(faltas('# Algo\n\n| Otra | Tabla |\n|---|---|\n')).toEqual([
      expect.stringContaining(`no se encontró «${CABECERA}»`),
    ]);
  });
});
