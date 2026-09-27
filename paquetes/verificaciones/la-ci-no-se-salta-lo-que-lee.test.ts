// @vitest-environment node
//
// Lee el workflow y el directorio de workflows del disco. No es un DOM lo que necesita.

import { describe, expect, it } from 'vitest';

import {
  LO_QUE_LAS_GUARDAS_LEEN,
  lasRutasQueLeenLasGuardas,
  leerElWorkflow,
  loQueNoDisparaLaCi,
  patronComoExpresion,
} from './rutas-de-la-ci.ts';

/**
 * **La CI no se salta un cambio que sus guardas leen** (#116). El porque entero esta en el docblock
 * de `LO_QUE_LAS_GUARDAS_LEEN`, en `rutas-de-la-ci.ts`.
 */

/** Un workflow de muestra: un `on:` escrito con estas lineas y el trabajo `verificar`. */
const conOn = (...lineas: string[]) =>
  ['on:', ...lineas, 'jobs:', '  verificar:', '    steps:', '      - run: yarn verificar'].join('\n');

/** La lista `paths:` que `paquetes.yml` traia hasta #116, en los dos eventos. */
const LA_DE_ANTES = [
  '"paquetes/**"',
  '"*.json"',
  '"*.ts"',
  '"eslint.config.js"',
  '".github/workflows/paquetes.yml"',
  '"CLAUDE.md"',
  '"README.md"',
  '".gitattributes"',
  '"**/.gitattributes"',
];

describe('la CI no se salta lo que sus guardas leen', () => {
  it('EL CENTINELA: la lista trae los workflows del directorio, `registro.yml` incluido', () => {
    // Sin esto, un directorio renombrado dejaria la comprobacion sin los workflows y en VERDE.
    expect(lasRutasQueLeenLasGuardas()).toEqual(
      expect.arrayContaining([...LO_QUE_LAS_GUARDAS_LEEN, '.github/workflows/paquetes.yml', '.github/workflows/registro.yml']),
    );
  });

  it('`verificar` corre en `push` y en `pull_request` con cualquier archivo que una guarda lea', () => {
    expect(loQueNoDisparaLaCi(leerElWorkflow(), lasRutasQueLeenLasGuardas())).toEqual([]);
  });

  it('LA MUESTRA: un `on.pull_request` con `paths:` que no trae lo que las guardas leen sale ROJO', () => {
    const lista = ['  pull_request:', '    paths:', ...LA_DE_ANTES.map((ruta) => `      - ${ruta}`), '  push:'];
    expect(loQueNoDisparaLaCi(conOn(...lista), lasRutasQueLeenLasGuardas())).toEqual([
      '«pull_request» no corre si el cambio solo toca «yarn.lock», y una guarda lo lee',
      '«pull_request» no corre si el cambio solo toca «.nvmrc», y una guarda lo lee',
      '«pull_request» no corre si el cambio solo toca «docs/agent/HISTORY.md», y una guarda lo lee',
      '«pull_request» no corre si el cambio solo toca «.github/workflows/registro.yml», y una guarda lo lee',
    ]);
  });

  it('LA MUESTRA: `paths-ignore`, un `!` que excluye, un patron ilegible y un evento que falta, ROJOS', () => {
    const archivos = ['README.md', 'paquetes/ui/x.ts'];
    expect(loQueNoDisparaLaCi(conOn('  push:', '  pull_request:', '    paths-ignore: ["**.md"]'), archivos)).toEqual([
      '«pull_request» no corre si el cambio solo toca «README.md», y una guarda lo lee',
    ]);
    expect(loQueNoDisparaLaCi(conOn('  pull_request:', '  push:', '    paths: ["**", "!*.md"]'), archivos)).toEqual([
      '«push» no corre si el cambio solo toca «README.md», y una guarda lo lee',
    ]);
    expect(loQueNoDisparaLaCi(conOn('  push:', '  pull_request:', '    paths: ["paquetes/?*"]'), archivos)).toEqual([
      '«pull_request.paths» trae «paquetes/?*», que esta guarda no sabe leer',
    ]);
    expect(loQueNoDisparaLaCi(conOn('  pull_request:'), archivos)).toEqual([
      '«push» no esta en `on:`: `verificar` no corre con ese evento',
    ]);
    expect(loQueNoDisparaLaCi('on: [pull_request]\njobs: {}', archivos)).toEqual([
      '«push» no esta en `on:`: `verificar` no corre con ese evento',
    ]);
  });

  it('LA MUESTRA: un `if:` en el trabajo `verificar` sale ROJO, y sin filtro todo pasa', () => {
    const conIf = conOn('  push:', '  pull_request:').replace('  verificar:', "  verificar:\n    if: github.event_name == 'push'");
    expect(loQueNoDisparaLaCi(conIf, ['README.md'])).toEqual([
      'el trabajo `verificar` lleva un `if:`: puede saltarse lo que sus guardas leen',
    ]);
    expect(loQueNoDisparaLaCi(conOn('  push:', '    branches: [main]', '  pull_request:'), ['README.md', 'yarn.lock'])).toEqual([]);
    expect(loQueNoDisparaLaCi('on: [push, pull_request]\njobs: {}', ['README.md'])).toEqual([]);
  });

  it('`patronComoExpresion` traduce `*`, `**` y `**/` como GitHub, y el punto no es especial', () => {
    const casa = (patron: string, archivo: string) => patronComoExpresion(patron)?.test(archivo);
    expect(casa('*.json', 'package.json')).toBe(true);
    expect(casa('*.json', 'paquetes/ui/package.json'), '`*` no cruza `/`').toBe(false);
    expect(casa('**/.gitattributes', '.gitattributes'), '`**/` es cero o mas directorios').toBe(true);
    expect(casa('**/.gitattributes', 'docs/agent/.gitattributes')).toBe(true);
    expect(casa('paquetes/**', 'paquetes/ui/interprete/hoja.ts')).toBe(true);
    expect(casa('**', '.github/workflows/registro.yml'), 'un archivo oculto no es especial').toBe(true);
    expect(casa('eslint.config.js', 'eslintXconfigXjs'), 'el punto es literal').toBe(false);
    for (const ilegible of ['a?', 'a+', '[ab]']) expect(patronComoExpresion(ilegible), ilegible).toBeNull();
  });
});
