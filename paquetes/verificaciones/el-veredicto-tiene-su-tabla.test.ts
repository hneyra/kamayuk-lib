// @vitest-environment node
//
// Corre el `run:` del veredicto con `bash`, como lo corre GitHub. No es un DOM lo que necesita.

import { spawnSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

import { leerWorkflow, ordenDe, pasosDe, trabajoDe } from './workflow.ts';

/**
 * **El veredicto del trabajo `consumidores`, con su tabla de ocho casos** (#115).
 *
 * El paso «El veredicto» de `paquetes.yml` es lo unico entre un PR de esta libreria y el `main` de
 * seis sistemas, y hasta #115 era un `if`/`exit` de cuatro caminos en bash que ninguna prueba
 * ejecutaba: lo «vigilaban» dos presencias de texto (`/ESTA RAMA ROMPE A/` y `/NO CIERRA CON/`), y
 * cambiar un `exit 0` por un `exit 1` seguia en verde.
 *
 * La tabla es el producto de las tres cosas que el veredicto lee: la linea base ✓/✗, la medida con
 * esta rama ✓/✗, y si el PR nombro una rama del consumidor. Cada caso fija el CODIGO DE SALIDA y la
 * PRIMERA LINEA DEL VEREDICTO —la que sigue a las tres de cabecera—, que es lo que ve quien abre el
 * registro de la CI.
 *
 * Esta primera version mide el BASH DE HOY, antes de mover nada: si los ocho casos coinciden, la
 * tabla describe la conducta que ya habia y sirve para demostrar que moverla no la cambia.
 */

const QUIEN = 'hneyra/rentas';
const RAMA_NOMBRADA = 'ui-115-el-ajuste';

interface Caso {
  readonly base: 'success' | 'failure';
  readonly rama: 'success' | 'failure';
  readonly ramaDelConsumidor: string;
  readonly codigo: 0 | 1;
  readonly primera: string;
}

const VERDE_DEL_PAR = `«${QUIEN}@${RAMA_NOMBRADA}» sale en verde con esta rama: el par cierra.`;
const ROJO_DEL_PAR = `::error::ESTA RAMA NO CIERRA CON «${QUIEN}@${RAMA_NOMBRADA}».`;
const VERDE = `«${QUIEN}» sigue en verde con esta rama.`;
const YA_ESTABA_ROJO = `::warning::«${QUIEN}» ya estaba rojo con la libreria en «main». Esta rama NO es la causa,`;
const ROMPE = `::error::ESTA RAMA ROMPE A «${QUIEN}».`;

const TABLA: readonly Caso[] = [
  // Con rama nombrada: el contrato es el PAR, y la linea base no absuelve.
  { base: 'success', rama: 'success', ramaDelConsumidor: RAMA_NOMBRADA, codigo: 0, primera: VERDE_DEL_PAR },
  { base: 'failure', rama: 'success', ramaDelConsumidor: RAMA_NOMBRADA, codigo: 0, primera: VERDE_DEL_PAR },
  { base: 'success', rama: 'failure', ramaDelConsumidor: RAMA_NOMBRADA, codigo: 1, primera: ROJO_DEL_PAR },
  { base: 'failure', rama: 'failure', ramaDelConsumidor: RAMA_NOMBRADA, codigo: 1, primera: ROJO_DEL_PAR },
  // Sin rama nombrada: lo que para el trabajo es «esta rama lo puso rojo».
  { base: 'success', rama: 'success', ramaDelConsumidor: '', codigo: 0, primera: VERDE },
  { base: 'failure', rama: 'success', ramaDelConsumidor: '', codigo: 0, primera: VERDE },
  { base: 'success', rama: 'failure', ramaDelConsumidor: '', codigo: 1, primera: ROMPE },
  { base: 'failure', rama: 'failure', ramaDelConsumidor: '', codigo: 0, primera: YA_ESTABA_ROJO },
];

const nombreDe = (caso: Caso): string =>
  `base ${caso.base === 'success' ? '✓' : '✗'}, rama ${caso.rama === 'success' ? '✓' : '✗'}, ` +
  (caso.ramaDelConsumidor === '' ? 'sin rama nombrada' : 'con rama nombrada');

/** El `run:` del paso «El veredicto» del workflow de este arbol, analizado como YAML (#114). */
const orden = ordenDe(
  pasosDe(trabajoDe(leerWorkflow('.github/workflows/paquetes.yml'), 'consumidores')).find(
    (paso) => paso['name'] === 'El veredicto',
  ) ?? {},
);

/** El bash de hoy, con las opciones con que GitHub corre un `run:` (`bash -e {0}` y `pipefail`). */
function medirElBash(caso: Caso): { codigo: number | null; lineas: string[] } {
  const salida = spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', orden], {
    encoding: 'utf8',
    env: {
      PATH: process.env['PATH'] ?? '',
      BASE: caso.base,
      RAMA: caso.rama,
      QUIEN,
      RAMA_DEL_CONSUMIDOR: caso.ramaDelConsumidor,
    },
  });
  return { codigo: salida.status, lineas: salida.stdout.split('\n') };
}

describe('el veredicto del trabajo `consumidores` (#115)', () => {
  it('el paso existe y tiene orden que correr', () => {
    expect(orden.trim(), 'no hay `run:` en el paso «El veredicto»').not.toBe('');
  });

  it('la tabla tiene los ocho casos, cada uno una vez', () => {
    expect(new Set(TABLA.map(nombreDe)).size).toBe(8);
  });

  it.each(TABLA.map((caso) => [nombreDe(caso), caso] as const))('%s', (_nombre, caso) => {
    const { codigo, lineas } = medirElBash(caso);
    expect({ codigo, primera: lineas[3] }).toEqual({ codigo: caso.codigo, primera: caso.primera });
  });
});
