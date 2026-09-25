import { describe, expect, it } from 'vitest';

import { TEXTOS_DE_LAS_PIEZAS, TEXTOS_DEL_INTERPRETE } from '../textos.tsx';
import { peticionDe } from './acciones.ts';
import { faltaElDato, resolverTexto, seCumple, type Nombrados } from './componer.ts';
import type { DatoConNombre } from './datos.ts';
import { valorDeLaFila } from './reglas-de-las-tablas.ts';

/**
 * **«Falta el dato»: la tabla de verdad, y las cuatro reglas que la aplican** (#117).
 *
 * Hasta #117 la regla —ausente, `null` o `''` faltan; un `false` SI es un dato— estaba escrita
 * **cuatro veces**: en `acciones.ts` (la peticion de una accion que `va`), en
 * `reglas-de-las-tablas.ts` (la insignia y la fila elegible) y dos en `componer.ts` (el dato como
 * texto de `resolverTexto` y el `hay` de `seCumple`). Antes de unificarlas se midio que las cuatro
 * daban la MISMA tabla, por sus funciones publicas y sin tocar nada suyo: es la mitad de abajo de
 * este archivo, que se queda para que ninguna de las cuatro se aparte de `faltaElDato`, que es la
 * mitad de arriba.
 */

const TEXTOS = { ...TEXTOS_DEL_INTERPRETE, ...TEXTOS_DE_LAS_PIEZAS };
const AUSENTE = '«ausente»';

/** La tabla del issue, y un `true` de mas. `undefined` es un dato que no esta en `nombrados`. */
const TABLA: readonly (readonly [string, DatoConNombre | undefined, boolean])[] = [
  ['undefined (no esta)', undefined, true],
  ['null', null, true],
  ["''", '', true],
  ["' '", ' ', false],
  ['false', false, false],
  ['true', true, false],
  ["'0'", '0', false],
];

const conElDato = (valor: DatoConNombre | undefined): Nombrados =>
  valor === undefined ? new Map() : new Map([['x', valor]]);

/** Las cuatro reglas, cada una preguntada por su funcion publica: `true` si dice que falta. */
const LAS_CUATRO: Readonly<Record<string, (valor: DatoConNombre | undefined) => boolean>> = {
  'acciones.ts, peticionDe': (valor) =>
    'faltaElDato' in peticionDe({ hoja: 'h', sujeto: { desde: 'x' } }, conElDato(valor), (t) => t, TEXTOS),
  'reglas-de-las-tablas.ts, valorDeLaFila': (valor) =>
    valorDeLaFila({ enLaRuta: 'p', desde: 'x' }, { celdas: [], datos: conElDato(valor) }) === null,
  'componer.ts, resolverTexto (desde)': (valor) => resolverTexto({ desde: 'x' }, conElDato(valor), (t) => t, AUSENTE) === AUSENTE,
  'componer.ts, seCumple (hay)': (valor) => !seCumple({ dato: 'x', hay: true }, conElDato(valor)),
};

describe('`faltaElDato`: la tabla de verdad (#117)', () => {
  it.each(TABLA)('%s', (_nombre, valor, esperado) => {
    expect(faltaElDato(valor)).toBe(esperado);
  });
});

describe('las cuatro reglas que dicen «falta el dato» dan la misma tabla (#117)', () => {
  for (const [regla, falta] of Object.entries(LAS_CUATRO)) {
    it.each(TABLA)(`${regla}: %s`, (_nombre, valor, esperado) => {
      expect(falta(valor)).toBe(esperado);
    });
  }
});
