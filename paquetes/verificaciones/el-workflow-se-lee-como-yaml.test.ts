// @vitest-environment node
//
// Lee el workflow del disco y analiza muestras en memoria. No es un DOM lo que necesita.

import { describe, expect, it } from 'vitest';

import { listasDeRutas } from './rutas-de-la-ci.ts';
import { analizarWorkflow, leerWorkflow, ordenDe, pasosDe, trabajoDe, valorEn } from './workflow.ts';

/**
 * **Lo que `workflow.ts` promete a las guardas de la CI** (#114).
 *
 * Las guardas que lo usan —`los-consumidores-se-miran`, `la-rama-del-consumidor`,
 * `las-acciones-corren-en-node-24` y `las-cifras-las-escribe-un-guion`— tienen sus muestras sobre
 * lo que cada una vigila. Esto vigila el lector: que un comentario no llega al objeto, que un
 * comentario del SHELL no llega a la orden, que lo que no se puede leer revienta diciendo que
 * archivo era, y que una forma inesperada no rompe a quien pregunta.
 */

const PAQUETES_YML = '.github/workflows/paquetes.yml';

describe('un workflow se lee como YAML', () => {
  it('EL CENTINELA: el workflow de este arbol se lee, y tiene los dos trabajos que las guardas miran', () => {
    // Sin esto, un lector que devolviera un objeto vacio dejaria a cada guarda preguntando por
    // trabajos que no estan; saldrian rojas, pero por el lector y sin decirlo.
    const workflow = leerWorkflow(PAQUETES_YML);
    expect(trabajoDe(workflow, 'verificar'), 'no se leyo el trabajo `verificar`').not.toBeNull();
    expect(pasosDe(trabajoDe(workflow, 'consumidores')).length, 'no se leyeron los pasos de `consumidores`').toBeGreaterThan(3);
  });

  it('LA MUESTRA: un comentario de YAML no llega al objeto, ni en su linea ni detras de un escalar', () => {
    const workflow = analizarWorkflow(
      [
        'jobs:',
        '  x:',
        '    steps:',
        '      # - run: yarn verificar',
        '      - run: yarn test # --comprobar',
        '        with:',
        '          # check-latest: true',
        '          node-version: "24"',
      ].join('\n'),
    );
    const pasos = pasosDe(trabajoDe(workflow, 'x'));
    expect(pasos, 'el paso comentado se leyo como paso').toHaveLength(1);
    expect(ordenDe(pasos[0] ?? {}), 'el comentario de detras entro en la orden').toBe('yarn test');
    expect(valorEn(pasos[0], 'with'), 'la clave comentada entro en el mapa').toEqual({ 'node-version': '24' });
  });

  it('LA MUESTRA: dentro de un `run: |`, la linea de comentario del SHELL no es orden, y un `#` en un texto si', () => {
    const [paso] = pasosDe(
      trabajoDe(
        analizarWorkflow(
          ['jobs:', '  x:', '    steps:', '      - run: |', '          # yarn verificar', '          echo "#10"'].join('\n'),
        ),
        'x',
      ),
    );
    expect(ordenDe(paso ?? {})).toBe('echo "#10"\n');
    expect(ordenDe({ uses: 'actions/checkout@v7' }), 'un paso sin `run` no ejecuta orden propia').toBe('');
  });

  it('LA MUESTRA: lo que no se puede leer revienta NOMBRANDO el archivo, en vez de dar un objeto', () => {
    expect(() => analizarWorkflow('jobs: [', 'roto.yml')).toThrow(/«roto\.yml» no es un YAML/);
    // Una clave repetida: GitHub se quedaria con una de las dos, y aqui no se adivina cual.
    expect(() => analizarWorkflow('on: push\non: pull_request', 'repetido.yml')).toThrow(/«repetido\.yml»/);
    expect(() => analizarWorkflow('- una lista', 'lista.yml')).toThrow(/«lista\.yml» no es un mapa/);
  });

  it('LA MUESTRA: una forma inesperada vuelve vacia, y no como un `TypeError`', () => {
    const workflow = analizarWorkflow('jobs:\n  - x\n  - y');
    expect(trabajoDe(workflow, 'x')).toBeNull();
    expect(pasosDe(null)).toEqual([]);
    expect(pasosDe(analizarWorkflow('steps: nada'))).toEqual([]);
    expect(valorEn(workflow, 'jobs', 'x', 'steps')).toBeUndefined();
    // Una clave del prototipo no es una clave del workflow.
    expect(trabajoDe(analizarWorkflow('jobs: {}'), 'constructor')).toBeNull();
  });

  it('LA MUESTRA: las `paths` se leen aunque un comentario se meta entre dos rutas o vayan en una linea', () => {
    // La lectura por lineas de antes de #114 cortaba la primera en el comentario y no veia la segunda.
    const texto = [
      'on:',
      '  push:',
      '    paths:',
      '      - "paquetes/**"',
      '      # la de abajo, desde #128',
      '      - "CLAUDE.md"',
      '  pull_request:',
      '    paths: ["paquetes/**", "CLAUDE.md"]',
    ].join('\n');
    expect(listasDeRutas(texto)).toEqual([
      ['paquetes/**', 'CLAUDE.md'],
      ['paquetes/**', 'CLAUDE.md'],
    ]);
  });
});
