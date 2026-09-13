// @vitest-environment node
//
// Lee el JSON y el workflow del disco. No es un DOM lo que necesita.

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * **La CI mira a sus consumidores, y la lista es DATO** (#10).
 *
 * <h2>El hueco que esto tapa, y que costo dos veces</h2>
 *
 * Con `link:` no hay `npm publish` que actue de compuerta, ni rango semver que de margen, ni
 * lockfile del consumidor que fije nada: **cada `main` de aqui es, sin intermediario, el `main` de
 * los sistemas**. Y lo que esta CI verificaba hasta #10 es que la libreria es coherente CONSIGO
 * MISMA, que no es su contrato.
 *
 *   · **#8** renombro `--radius-radio` a `--radius`: 217 pruebas en verde aqui y `rentas` en rojo
 *     con «expected 44 to be 42». Se cazo corriendo la suite del consumidor A MANO.
 *   · **#14** anadio `cmdk` y `sonner` como `peerDependencies`: verde aqui, y `rentas` con tres
 *     archivos sin recoger. Esa vez lo dijo antes una guarda DEL CONSUMIDOR, no esta CI.
 *
 * <h2>Por que esta guarda, si el trabajo de CI ya existe</h2>
 *
 * Porque el trabajo puede quedarse sin sujeto sin que nadie lo note: una lista vacia, un JSON que
 * el workflow deja de leer, o una orden mal escrita dan un trabajo **en verde que no mira nada**.
 * Es la misma forma de fallo que este repositorio ya conoce —una guarda que no puede fallar— y
 * aqui se aplica al guardian.
 */

const JSON_DE_CONSUMIDORES = 'consumidores.json';
const WORKFLOW = '.github/workflows/paquetes.yml';

interface Consumidor {
  readonly repositorio: string;
  readonly directorio: string;
  readonly ruta: string;
  readonly orden: string;
}

const declarado = JSON.parse(readFileSync(JSON_DE_CONSUMIDORES, 'utf8')) as {
  consumidores: Consumidor[];
};
const workflow = readFileSync(WORKFLOW, 'utf8');

describe('la CI mira a sus consumidores', () => {
  it('EL CENTINELA: hay al menos un consumidor declarado', () => {
    // Una lista vacia deja el trabajo de CI con cero casos de matriz y en VERDE. Es exactamente el
    // modo de fallo que la guarda existe para impedir, aplicado a si misma.
    expect(declarado.consumidores.length, 'no hay ni un consumidor declarado').toBeGreaterThanOrEqual(1);
  });

  it('cada consumidor dice las cuatro cosas que hacen falta para correrlo', () => {
    // Sin `directorio` el enlace del consumidor no resuelve —`link:` sube dos niveles y tiene que
    // caer JUNTO a la libreria—, y sin `orden` no se sabe que ejecutar: `rentas` encadena lint,
    // tipos y pruebas en `yarn verificar`, y otro sistema podria llamarla de otra forma.
    const incompletos = declarado.consumidores
      .filter((c) => !c.repositorio || !c.directorio || !c.ruta || !c.orden)
      .map((c) => `  ${JSON.stringify(c)}`);
    expect(
      incompletos,
      `Hay consumidores a los que les falta algo:\n${incompletos.join('\n')}`,
    ).toEqual([]);
  });

  it('el `directorio` es el que el `link:` del consumidor espera', () => {
    // `link:../../kamayuk-lib/paquetes/ui` desde `<directorio>/<ruta>` sube dos niveles. Si el
    // directorio no es el ultimo trozo del repositorio, el clon cae en otro sitio y la CI mide
    // otra cosa — o no mide nada, porque el enlace resuelve al clon equivocado.
    const torcidos = declarado.consumidores
      .filter((c) => c.directorio !== c.repositorio.split('/').pop())
      .map((c) => `  ${c.repositorio} se clona en «${c.directorio}»`);
    expect(torcidos, `El directorio no cuadra con el repositorio:\n${torcidos.join('\n')}`).toEqual([]);
  });

  it('el workflow LEE la lista, en vez de traerla escrita dentro', () => {
    // Es lo que hace que anadir `catastro` sea una linea de datos y no un `job` copiado. Con la
    // lista escrita en el YAML, el JSON se quedaria de adorno y nadie lo notaria.
    expect(workflow, 'el workflow no lee `consumidores.json`').toContain('consumidores.json');
    expect(workflow, 'el workflow no pasa la lista a la matriz').toContain('fromJSON');
    for (const consumidor of declarado.consumidores) {
      expect(
        workflow.includes(`'${consumidor.repositorio}'`) || workflow.includes(`"${consumidor.repositorio}"`),
        `el workflow trae «${consumidor.repositorio}» escrito dentro: la lista deja de ser dato`,
      ).toBe(false);
    }
  });

  it('mide DOS veces: la linea base y esta rama', () => {
    // Sin la linea base, un consumidor roto por su cuenta pone este repositorio en rojo por un
    // motivo ajeno. Un guardian que da falsos positivos se acaba ignorando, y con el se ignora el
    // positivo de verdad.
    expect(workflow, 'no hay linea base con la libreria en `main`').toMatch(/checkout --quiet --detach origin\/main/);
    expect(workflow, 'no se prueba con esta rama').toMatch(/checkout --quiet --detach "\$GITHUB_SHA"/);
  });

  it('y el veredicto va en un paso APARTE, porque los dos anteriores no fallan solos', () => {
    // `continue-on-error` en los dos pasos de medida es lo que permite comparar; sin un paso que
    // decida despues, el trabajo saldria VERDE con los dos en rojo.
    expect(workflow).toContain('continue-on-error: true');
    expect(workflow, 'no hay paso de veredicto').toContain('El veredicto');
    expect(workflow, 'el veredicto no falla nunca').toMatch(/ESTA RAMA ROMPE A/);
  });
});
