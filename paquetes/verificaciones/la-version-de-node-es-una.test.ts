// @vitest-environment node
//
// Lee `package.json`, `.nvmrc` y los workflows del disco. No es un DOM lo que necesita.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { RAIZ } from './texto.ts';
import { type DeclaracionesDeNode, loQueNoCuadra, mayorDe } from './version-de-node.ts';
import { analizarWorkflow, leerWorkflow } from './workflow.ts';

/**
 * **La version de Node se declara en `.nvmrc`, y los demas sitios la leen o dicen lo mismo** (#116).
 * El porque entero esta en el docblock de `version-de-node.ts`.
 */

const DIRECTORIO_DE_WORKFLOWS = '.github/workflows';

const manifiesto = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8')) as {
  engines?: { node?: unknown };
  devDependencies?: Record<string, unknown>;
};

const workflows = readdirSync(join(RAIZ, DIRECTORIO_DE_WORKFLOWS))
  .filter((nombre) => nombre.endsWith('.yml') || nombre.endsWith('.yaml'))
  .sort()
  .map((nombre) => {
    const archivo = `${DIRECTORIO_DE_WORKFLOWS}/${nombre}`;
    return { archivo, workflow: leerWorkflow(archivo) };
  });

const delArbol: DeclaracionesDeNode = {
  engines: manifiesto.engines?.node,
  nvmrc: existsSync(join(RAIZ, '.nvmrc')) ? readFileSync(join(RAIZ, '.nvmrc'), 'utf8') : null,
  tiposDeNode: manifiesto.devDependencies?.['@types/node'],
  workflows,
};

/** Un workflow de muestra con un trabajo que clona este repositorio y monta Node con `with`. */
const unWorkflow = (...conSetupNode: string[]) =>
  analizarWorkflow(
    [
      'jobs:',
      '  verificar:',
      '    steps:',
      '      - uses: actions/checkout@v7',
      '      - uses: actions/setup-node@v7',
      '        with:',
      ...conSetupNode.map((linea) => `          ${linea}`),
    ].join('\n'),
  );

/** El arbol sano, con lo que la muestra cambie. */
const sano = (cambio: Partial<DeclaracionesDeNode>): DeclaracionesDeNode => ({
  engines: '>=24',
  nvmrc: '24\n',
  tiposDeNode: '^24.5.0',
  workflows: [{ archivo: 'muestra.yml', workflow: unWorkflow('node-version-file: .nvmrc') }],
  ...cambio,
});

describe('la version de Node se declara en un sitio', () => {
  it('EL CENTINELA: se leyeron workflows con `setup-node`, y las tres declaraciones de `package.json`', () => {
    // Sin esto, un directorio renombrado deja la comprobacion sobre una lista vacia y en VERDE.
    const setupNodes = workflows.flatMap(({ workflow }) =>
      JSON.stringify(workflow).match(/"uses":"actions\/setup-node@/g) ?? [],
    );
    expect(setupNodes.length, 'no se leyo ni un `setup-node`').toBeGreaterThanOrEqual(1);
    expect(delArbol.engines, 'sin `engines.node`').toBeDefined();
    expect(delArbol.tiposDeNode, "sin `devDependencies['@types/node']`").toBeDefined();
  });

  it('`.nvmrc`, `engines`, la mayor de `@types/node` y cada `setup-node` dicen lo mismo', () => {
    expect(loQueNoCuadra(delArbol)).toEqual([]);
  });

  it('LA MUESTRA: el arbol sano sale verde, y el `setup-node` de un clon en otro directorio lee SU `.nvmrc`', () => {
    expect(loQueNoCuadra(sano({}))).toEqual([]);
    const enOtroDirectorio = analizarWorkflow(
      [
        'jobs:',
        '  consumidores:',
        '    steps:',
        '      - uses: actions/checkout@v7',
        '        with: { path: kamayuk-lib }',
        '      - uses: actions/checkout@v7',
        '        with: { repository: hneyra/otro, path: otro }',
        '      - uses: actions/setup-node@v7',
        '        with: { node-version-file: kamayuk-lib/.nvmrc, check-latest: true }',
      ].join('\n'),
    );
    expect(loQueNoCuadra(sano({ workflows: [{ archivo: 'muestra.yml', workflow: enOtroDirectorio }] }))).toEqual([]);
  });

  it('LA MUESTRA: un workflow con `node-version: "22"` sale ROJO, y uno con `"24"` escrito a mano tambien', () => {
    expect(loQueNoCuadra(sano({ workflows: [{ archivo: 'muestra.yml', workflow: unWorkflow('node-version: "22"') }] }))).toEqual([
      'muestra.yml, trabajo «verificar», paso 2 (`setup-node`) escribe `node-version: "22"` a mano, y `.nvmrc` dice 24: tiene que leer `.nvmrc` con `node-version-file`',
    ]);
    expect(loQueNoCuadra(sano({ workflows: [{ archivo: 'muestra.yml', workflow: unWorkflow('node-version: "24"') }] }))).toEqual([
      'muestra.yml, trabajo «verificar», paso 2 (`setup-node`) escribe `node-version: "24"` a mano: tiene que leer `.nvmrc` con `node-version-file`',
    ]);
  });

  it('LA MUESTRA: un `setup-node` sin version, o que lee otro `.nvmrc`, o sin clon delante, sale ROJO', () => {
    const conUno = (workflow: ReturnType<typeof analizarWorkflow>) =>
      loQueNoCuadra(sano({ workflows: [{ archivo: 'muestra.yml', workflow }] }));
    expect(conUno(unWorkflow('cache: yarn'))).toEqual([
      'muestra.yml, trabajo «verificar», paso 2 (`setup-node`) no dice version: se queda con la que traiga el corredor. Tiene que leer «.nvmrc»',
    ]);
    expect(conUno(unWorkflow('node-version-file: otro/.nvmrc'))).toEqual([
      'muestra.yml, trabajo «verificar», paso 2 (`setup-node`) lee «otro/.nvmrc», y el `.nvmrc` de este repositorio esta en «.nvmrc»',
    ]);
    const sinClon = analizarWorkflow(
      ['jobs:', '  x:', '    steps:', '      - uses: actions/setup-node@v7', '        with: { node-version-file: .nvmrc }'].join('\n'),
    );
    expect(conUno(sinClon)).toEqual([
      'muestra.yml, trabajo «x», paso 1 (`setup-node`): ningun paso anterior del trabajo clona este repositorio, asi que no hay `.nvmrc` que leer',
    ]);
  });

  it('LA MUESTRA: sin `.nvmrc`, o con `@types/node ^22`, o con `engines` de otra mayor, sale ROJO', () => {
    expect(loQueNoCuadra(sano({ nvmrc: null }))).toEqual([
      'no hay `.nvmrc`: la version de Node no tiene un sitio del que leerse',
    ]);
    expect(loQueNoCuadra(sano({ tiposDeNode: '^22.15.0' }))).toEqual([
      "`devDependencies['@types/node']` de `package.json` dice 22 y `.nvmrc` dice 24",
    ]);
    // El arbol de antes de #116: sin la fuente, lo demas se compara con `engines`.
    expect(loQueNoCuadra(sano({ nvmrc: null, tiposDeNode: '^22.15.0' }))).toEqual([
      'no hay `.nvmrc`: la version de Node no tiene un sitio del que leerse',
      "`devDependencies['@types/node']` de `package.json` dice 22 y `engines.node` de `package.json` dice 24",
    ]);
    expect(loQueNoCuadra(sano({ engines: '>=22' }))).toEqual([
      '`engines.node` de `package.json` dice 22 y `.nvmrc` dice 24',
    ]);
    expect(loQueNoCuadra(sano({ engines: '>=22 <25', tiposDeNode: undefined, nvmrc: 'lts/*' }))).toEqual([
      '`.nvmrc` dice «lts/*», que no es una mayor que se sepa leer',
      '`engines.node` de `package.json` dice «>=22 <25», que no es una mayor que se sepa leer',
      "`devDependencies['@types/node']` de `package.json` dice «undefined», que no es una mayor que se sepa leer",
    ]);
  });

  it('`mayorDe` lee las formas de una sola mayor, y ninguna otra', () => {
    for (const rango of ['24', 'v24', '24.21.0', '^24.5.0', '~24.1', '>=24', '>= 24.0.0', '24.x', '24\n']) {
      expect(mayorDe(rango), rango).toBe(24);
    }
    for (const rango of ['>=22 <25', '22 || 24', 'lts/*', 'node', '', '^', 24, null]) {
      expect(mayorDe(rango), String(rango)).toBeNull();
    }
  });
});
