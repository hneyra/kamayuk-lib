// @vitest-environment node
//
// Llama a la funcion y corre el guion como proceso. No es un DOM lo que necesita.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { loQueFaltaParaDecidir, veredicto } from './veredicto.mjs';

/**
 * **El veredicto del trabajo `consumidores`, con su tabla de ocho casos** (#115).
 *
 * El paso «El veredicto» de `paquetes.yml` es lo unico entre un PR de esta libreria y el `main` de
 * los sistemas que la enlazan, y hasta #115 era un `if`/`exit` de cuatro caminos en bash que
 * ninguna prueba ejecutaba: lo «vigilaban» dos presencias de texto (`/ESTA RAMA ROMPE A/` y
 * `/NO CIERRA CON/`), y cambiar un `exit 0` por un `exit 1` seguia en verde.
 *
 * La tabla es el producto de las tres cosas que el veredicto lee: la linea base ✓/✗, la medida con
 * esta rama ✓/✗, y si el PR nombro una rama del consumidor. Cada caso fija el CODIGO DE SALIDA y la
 * PRIMERA LINEA DEL VEREDICTO —la que sigue a las tres de cabecera—, que es lo que ve quien abre el
 * registro de la CI.
 *
 * **La tabla se midio primero contra el bash de hoy**, antes de mover nada, corriendo el `run:` del
 * paso con `bash -eo pipefail` como lo corre GitHub: los ocho casos coincidian. Y con la salida
 * ENTERA de los ocho, no solo la primera linea: la del bash y la de `veredicto.mjs` son identicas
 * byte a byte. Esta es la version que mide el guion, y el bash ya no existe.
 *
 * Que el workflow llame al guion, con las entradas bien cableadas y en un `run:` corto, lo vigila
 * `los-consumidores-se-miran.test.ts`.
 */

const QUIEN = 'hneyra/rentas';
const RAMA_NOMBRADA = 'ui-115-el-ajuste';
const GUION = fileURLToPath(new URL('./veredicto.mjs', import.meta.url));

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

const casos = TABLA.map((caso) => [nombreDe(caso), caso] as const);

const decidir = (caso: Caso) =>
  veredicto({ base: caso.base, rama: caso.rama, quien: QUIEN, ramaDelConsumidor: caso.ramaDelConsumidor });

/** El guion como lo corre el paso: las cuatro variables en el entorno y nada mas. */
function correrElGuion(entorno: Readonly<Record<string, string>>) {
  const salida = spawnSync(process.execPath, [GUION], {
    encoding: 'utf8',
    env: { PATH: process.env['PATH'] ?? '', ...entorno },
  });
  return { codigo: salida.status, salida: salida.stdout, error: salida.stderr };
}

describe('el veredicto del trabajo `consumidores` (#115)', () => {
  it('la tabla tiene los ocho casos, cada uno una vez', () => {
    expect(new Set(TABLA.map(nombreDe)).size).toBe(8);
  });

  it.each(casos)('%s', (_nombre, caso) => {
    const { codigo, lineas } = decidir(caso);
    expect({ codigo, primera: lineas[3] }).toEqual({ codigo: caso.codigo, primera: caso.primera });
  });

  it('las tres lineas de cabecera dicen contra que se midio, en los ocho casos', () => {
    for (const caso of TABLA) {
      expect(decidir(caso).lineas.slice(0, 3), nombreDe(caso)).toEqual([
        `el consumidor se midio en:     ${caso.ramaDelConsumidor || 'su rama por omision'}`,
        `linea base (libreria en main): ${caso.base}`,
        `con esta rama:                 ${caso.rama}`,
      ]);
    }
  });

  it('con rama nombrada, la linea base roja se anuncia como ESPERADA y no bloquea', () => {
    const conBaseRoja = veredicto({ base: 'failure', rama: 'success', quien: QUIEN, ramaDelConsumidor: RAMA_NOMBRADA });
    expect(conBaseRoja.lineas[4]).toMatch(/^::notice::La linea base salio ROJA, y aqui eso se ESPERA/);
    const conBaseVerde = veredicto({ base: 'success', rama: 'success', quien: QUIEN, ramaDelConsumidor: RAMA_NOMBRADA });
    expect(conBaseVerde.lineas.some((linea) => linea.startsWith('::notice::'))).toBe(false);
  });

  it('un `outcome` que no es `success` cuenta como rojo, como en el bash: `cancelled` y `skipped` tambien', () => {
    for (const rojo of ['cancelled', 'skipped']) {
      expect(veredicto({ base: 'success', rama: rojo, quien: QUIEN, ramaDelConsumidor: '' }).codigo).toBe(1);
      expect(veredicto({ base: rojo, rama: rojo, quien: QUIEN, ramaDelConsumidor: RAMA_NOMBRADA }).codigo).toBe(1);
    }
  });
});

describe('y el guion, como proceso, hace lo que la funcion dice', () => {
  it.each(casos)('%s', (_nombre, caso) => {
    const esperado = decidir(caso);
    const { codigo, salida } = correrElGuion({
      BASE: caso.base,
      RAMA: caso.rama,
      QUIEN,
      RAMA_DEL_CONSUMIDOR: caso.ramaDelConsumidor,
    });
    expect({ codigo, salida }).toEqual({ codigo: esperado.codigo, salida: `${esperado.lineas.join('\n')}\n` });
  });

  it('LA MUESTRA: sin entradas —un `id` de paso renombrado da la cadena vacia— no decide, y sale con 2', () => {
    // Con el bash, `BASE` y `RAMA` vacias y sin rama nombrada caian en «ya estaba rojo»: VERDE.
    const { codigo, salida } = correrElGuion({ BASE: '', RAMA: '', QUIEN, RAMA_DEL_CONSUMIDOR: '' });
    expect(codigo).toBe(2);
    expect(salida).toContain('::error::EL VEREDICTO NO SE PUEDE DECIDIR');
    expect(loQueFaltaParaDecidir({ BASE: 'success', RAMA: 'exito', QUIEN: '' })).toEqual([
      'RAMA vale «exito», que no es un resultado de paso de GitHub (success, failure, cancelled, skipped)',
      'QUIEN va vacio: no se sabe de que consumidor es el veredicto',
    ]);
    expect(loQueFaltaParaDecidir({ BASE: 'failure', RAMA: 'success', QUIEN })).toEqual([]);
  });
});
