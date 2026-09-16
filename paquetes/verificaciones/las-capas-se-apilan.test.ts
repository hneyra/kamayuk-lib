// @vitest-environment node
//
// Lee el arbol de archivos como texto. No es un DOM lo que necesita — y ese es justo el punto:
// el DOM de jsdom no podria decir nada de esto. Ver el javadoc.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * **Las capas se apilan: una superficie flotante nunca queda por debajo de un velo.**
 *
 * <h2>El modo de fallo que esta guarda existe para impedir</h2>
 *
 * Que una pieza que se superpone lleve un `z-index` elegido sin la pila entera delante. Pasó dos
 * veces en `pcf`, con el mismo síntoma las dos: **la capa se ve —el velo es translúcido— y no se
 * deja pulsar**. Es el peor modo de fallo posible, porque parece que la aplicación se ha colgado.
 *
 * La primera vez fue el desplegable de «Departamento» dentro de un `Cajon`; la segunda, cuatro
 * desplegables dentro de una `Confirmacion`, uno de ellos obligatorio — **el formulario no se
 * podía rellenar**.
 *
 * <h2>Por qué lo comprueba un barrido de texto y no una prueba de componente</h2>
 *
 * Porque **jsdom no maqueta, no apila y no tiene puntero**. Las 42 pruebas de `vitest` que montan
 * esas pantallas pasaban todas las dos veces; lo encontró Playwright, contra el bundle construido:
 *
 *     - element is visible, enabled and stable
 *     - <div data-slot="velo-del-cajon" class="fixed inset-0 z-[85] bg-velo"> intercepts pointer events
 *
 * Un navegador de verdad lo ve, pero **sólo si alguien escribe la pantalla que lo destapa**. Esta
 * guarda lo ve sin pantalla: mira los números, que es donde está la decisión.
 *
 * <h2>Las dos mitades, y por qué hacen falta las dos</h2>
 *
 * 1. **Ninguna clase de capa fuera de `capas.ts`.** Sin esto, la pila vuelve a estar repartida y
 *    el siguiente que elija un número lo hará sin verla entera, que es como se llegó aquí.
 * 2. **Toda flotante por encima de toda superficie modal.** Que es la regla de verdad; la primera
 *    mitad sólo garantiza que se pueda comprobar en un sitio.
 */

const PAQUETES = 'paquetes';
const MODULO_DE_CAPAS = join(PAQUETES, 'ui', 'shadcn', 'capas.ts');
const MUESTRA = join(PAQUETES, 'verificaciones', 'muestras', 'capa-flotante-por-debajo-del-velo.ts');

/** `muestras/` viola la regla a proposito; `dist` y `node_modules` no son fuente. */
const APARTADAS = new Set(['node_modules', 'dist', 'muestras']);

/**
 * Una clase de capa de Tailwind: `z-50`, `z-[86]`, `z-auto`.
 *
 * El limite de delante NO es `\b`: entre `-` y `z` no hay limite de palabra, asi que `-z-10` —una
 * capa negativa, que tambien es una decision de apilado— se le escaparia. Se exige inicio de
 * cadena o un caracter que separe de verdad.
 */
const CLASE_DE_CAPA = /(?:^|[\s'"`{])(-?z-(?:\[[^\]]+\]|\d+|auto))/g;

function fuentes(directorio: string): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(directorio)) {
    if (APARTADAS.has(entrada)) continue;
    const completa = join(directorio, entrada);
    if (statSync(completa).isDirectory()) {
      salida.push(...fuentes(completa));
      continue;
    }
    if (/\.(ts|tsx|css)$/.test(entrada) && !/\.test\.tsx?$/.test(entrada)) {
      salida.push(completa);
    }
  }
  return salida;
}

/** Las clases de capa de un texto, con su archivo. */
function capasDe(texto: string): string[] {
  return [...texto.matchAll(CLASE_DE_CAPA)].map((c) => c[1] as string);
}

/** El numero de una clase de capa. `z-auto` no es un numero y no ordena nada. */
function numeroDe(clase: string): number | undefined {
  const crudo = /^(-?)z-(?:\[(\d+)\]|(\d+))$/.exec(clase);
  if (crudo === null) return undefined;
  const valor = Number(crudo[2] ?? crudo[3]);
  return crudo[1] === '-' ? -valor : valor;
}

/**
 * Las capas declaradas en un modulo de capas, por nombre de constante.
 *
 * Se lee el TEXTO y no se importa el modulo: la muestra tiene que poder leerse con lo mismo, y la
 * muestra esta fuera de `tsc` a proposito.
 */
function declaradas(texto: string): Map<string, number> {
  const salida = new Map<string, number>();
  for (const linea of texto.split('\n')) {
    const m = /^export const (CAPA_[A-Z_]+) = '([^']+)';/.exec(linea);
    if (m === null) continue;
    const numero = numeroDe(m[2] as string);
    if (numero !== undefined) salida.set(m[1] as string, numero);
  }
  return salida;
}

/** La regla, aplicable a cualquier modulo de capas: el de produccion y el de la muestra. */
function flotanteQueQuedaDebajo(capas: Map<string, number>): string | undefined {
  const flotantes = [...capas].filter(([nombre]) => nombre.includes('FLOTANTE'));
  const modales = [...capas].filter(
    ([nombre]) => nombre.includes('VELO') || nombre.includes('PANEL'),
  );
  for (const [nombreFlotante, flotante] of flotantes) {
    for (const [nombreModal, modal] of modales) {
      if (flotante <= modal) {
        return `${nombreFlotante} (${flotante}) no esta por encima de ${nombreModal} (${modal})`;
      }
    }
  }
  return undefined;
}

const enElDisco = fuentes(PAQUETES);
const deProduccion = declaradas(readFileSync(MODULO_DE_CAPAS, 'utf8'));

describe('las capas se apilan', () => {
  it('EL CENTINELA: hay capas que vigilar, y el modulo las declara', () => {
    // Sin esto, vaciar `capas.ts` dejaria las dos comprobaciones de abajo recorriendo listas
    // vacias y pasando en verde — que es como una guarda se queda sin sujeto sin que nadie la
    // borre.
    expect(enElDisco.length, 'no quedo ni un archivo de fuente que barrer').toBeGreaterThan(20);
    expect(deProduccion.size, '`capas.ts` no declara ni una capa').toBeGreaterThanOrEqual(9);
    expect([...deProduccion].some(([n]) => n.includes('FLOTANTE'))).toBe(true);
    expect([...deProduccion].some(([n]) => n.includes('VELO'))).toBe(true);
  });

  it('ninguna clase de capa vive fuera de `capas.ts`', () => {
    const fuera = enElDisco
      .filter((archivo) => archivo !== MODULO_DE_CAPAS)
      .flatMap((archivo) => capasDe(readFileSync(archivo, 'utf8')).map((c) => `${archivo}: ${c}`));
    expect(
      fuera,
      'la pila de capas vive en `paquetes/ui/shadcn/capas.ts` y en ningun otro sitio',
    ).toStrictEqual([]);
  });

  it('toda superficie flotante esta por encima de toda superficie modal', () => {
    expect(flotanteQueQuedaDebajo(deProduccion)).toBeUndefined();
  });

  it('LA MUESTRA: la regla muerde, en sus dos mitades', () => {
    const texto = readFileSync(MUESTRA, 'utf8');
    // (1) la flotante por debajo del velo
    expect(flotanteQueQuedaDebajo(declaradas(texto))).toBe(
      'CAPA_FLOTANTE (50) no esta por encima de CAPA_VELO_DEL_CAJON (85)',
    );
    // (2) la clase escrita fuera del modulo
    expect(capasDe(texto)).toContain('z-[87]');
  });
});
