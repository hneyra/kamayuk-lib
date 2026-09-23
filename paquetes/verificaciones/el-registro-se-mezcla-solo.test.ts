// @vitest-environment node
//
// Monta repositorios de git de ensayo en una carpeta temporal. No es un DOM lo que necesita.

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { devNull, tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { leerElWorkflow, listasDeRutas } from './rutas-de-la-ci.ts';
import { RAIZ } from './texto.ts';

/**
 * **El registro se mezcla solo** (#128), y lo que eso cuesta.
 *
 * `.gitattributes` le pone `merge=union` a `docs/agent/HISTORY.md`: sus filas sólo se añaden, todas
 * al final de la misma tabla, y dos PR abiertos a la vez chocaban **siempre** en la misma línea
 * —de los últimos 40 merges de primer padre, 39 tocaron ese archivo—.
 *
 * <h2>Por qué es una prueba y no una medida a mano</h2>
 *
 * AC-4 pide «una prueba local de `merge=union` con dos ramas que añaden fila», y hasta la revisión
 * de #128 era una medida hecha una vez en un repositorio de ensayo. Y **nada vigilaba que el
 * atributo siguiera declarado**: medido, borrar la línea de `.gitattributes` dejaba las 212 pruebas
 * de `verificaciones`, la autoprueba del registro y la guarda en verde, y el conflicto de siempre
 * volvía en el primer par de PR. Así que aquí se monta la mezcla **con el `.gitattributes` del
 * árbol, leído tal cual**, y se exige que salga limpia; y la muestra es la misma mezcla sin él, que
 * tiene que chocar —es el rojo previo, y demuestra que lo de arriba mide el atributo y no otra
 * cosa—.
 *
 * <h2>El precio, también ensayado</h2>
 *
 * Cuando dos ramas **editan** la misma fila, `union` tampoco avisa: deja las dos versiones. Eso lo
 * caza la guarda del registro, que exige una fila por issue, y aquí se corre sobre lo que la mezcla
 * dejó.
 *
 * <h2>Aislado</h2>
 *
 * Nada de la configuración de quien corre la prueba entra en los repositorios de ensayo: ni la
 * global, ni la del sistema, ni un `core.attributesFile` que declarase otra mezcla, ni un `GIT_DIR`
 * heredado —que, corriendo desde un gancho de git, haría que estas órdenes tocaran el repositorio de
 * verdad—.
 */

const REGISTRO = 'docs/agent/HISTORY.md';
const GUARDA = join(RAIZ, 'docs/00-gobierno/verificar-fila-del-registro.mjs');
const ATRIBUTOS_DEL_ARBOL = readFileSync(join(RAIZ, '.gitattributes'), 'utf8');

const CABECERA = '| Verificación | Cómo se demostró que puede fallar | Resultado |\n|---|---|---|\n';
const FILA_DE_MAIN = '| **Lo de antes (#1).** Algo | La rotura | El rojo |\n';
const BASE = `# Registro\n\n${CABECERA}${FILA_DE_MAIN}`;

/** El entorno de quien corre la prueba, sin nada de git, y con la configuración a cero. */
function entornoAislado(): NodeJS.ProcessEnv {
  const entorno = Object.fromEntries(Object.entries(process.env).filter(([clave]) => !clave.startsWith('GIT_')));
  return {
    ...entorno,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: devNull,
    GIT_AUTHOR_NAME: 'Ensayo',
    GIT_AUTHOR_EMAIL: 'ensayo@kamayuk.invalid',
    GIT_COMMITTER_NAME: 'Ensayo',
    GIT_COMMITTER_EMAIL: 'ensayo@kamayuk.invalid',
  };
}

function git(carpeta: string, ...argumentos: string[]): { codigo: number; salida: string } {
  const resultado = spawnSync(
    'git',
    ['-c', `core.attributesFile=${devNull}`, '-c', 'commit.gpgsign=false', ...argumentos],
    { cwd: carpeta, encoding: 'utf8', env: entornoAislado() },
  );
  if (resultado.error) throw resultado.error;
  return { codigo: resultado.status ?? -1, salida: `${resultado.stdout}${resultado.stderr}` };
}

/** Como `git`, pero una orden que falla aquí es un ensayo mal montado, no un resultado. */
function gitQueNoFalla(carpeta: string, ...argumentos: string[]): string {
  const { codigo, salida } = git(carpeta, ...argumentos);
  if (codigo !== 0) throw new Error(`git ${argumentos.join(' ')} salió con ${String(codigo)}:\n${salida}`);
  return salida;
}

/** Un repositorio de ensayo con el registro de `BASE` y esos atributos, en `main`. */
function conUnRepositorio<T>(atributos: string, hacer: (carpeta: string) => T): T {
  const carpeta = mkdtempSync(join(tmpdir(), 'kamayuk-union-'));
  try {
    gitQueNoFalla(carpeta, 'init', '-q', '-b', 'main');
    writeFileSync(join(carpeta, '.gitattributes'), atributos);
    mkdirSync(join(carpeta, 'docs/agent'), { recursive: true });
    writeFileSync(join(carpeta, REGISTRO), BASE);
    gitQueNoFalla(carpeta, 'add', '-A');
    gitQueNoFalla(carpeta, 'commit', '-q', '-m', 'base');
    return hacer(carpeta);
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
}

/**
 * Dos ramas que cambian el registro cada una a su manera, la segunda mezclada en la primera.
 *
 * @returns el código de `git merge`, lo que dijo, el registro que quedó y cuántas marcas de
 *          conflicto tiene.
 */
function mezclar(
  atributos: string,
  una: (registro: string) => string,
  otra: (registro: string) => string,
): { codigo: number; salida: string; registro: string; marcas: number } {
  return conUnRepositorio(atributos, (carpeta) => {
    for (const [rama, cambiar] of [
      ['una', una],
      ['otra', otra],
    ] as const) {
      gitQueNoFalla(carpeta, 'checkout', '-q', '-b', rama, 'main');
      writeFileSync(join(carpeta, REGISTRO), cambiar(BASE));
      gitQueNoFalla(carpeta, 'commit', '-q', '-am', rama);
    }
    gitQueNoFalla(carpeta, 'checkout', '-q', 'una');
    const { codigo, salida } = git(carpeta, 'merge', '--no-edit', 'otra');
    const registro = readFileSync(join(carpeta, REGISTRO), 'utf8');
    const marcas = registro.split('\n').filter((linea) => /^(<{7}|={7}|>{7})/.test(linea)).length;
    return { codigo, salida, registro, marcas };
  });
}

const FILA_UNA = '| **Lo de una rama (#2).** Algo | La rotura | El rojo |\n';
const FILA_OTRA = '| **Lo de la otra (#3).** Algo | La rotura | El rojo |\n';
const anadir = (fila: string) => (registro: string) => `${registro}${fila}`;
const editarLaDeMain = (texto: string) => (registro: string) =>
  registro.replace(FILA_DE_MAIN, `| **Lo de antes (#1).** ${texto} | La rotura | El rojo |\n`);

describe('el registro se mezcla solo', () => {
  it('AC-4, con el `.gitattributes` del árbol: dos ramas que añaden su fila se mezclan sin conflicto, con las dos', () => {
    const { codigo, salida, registro, marcas } = mezclar(ATRIBUTOS_DEL_ARBOL, anadir(FILA_UNA), anadir(FILA_OTRA));
    expect(codigo, salida).toBe(0);
    expect(marcas).toBe(0);
    expect(registro).toBe(`${BASE}${FILA_UNA}${FILA_OTRA}`);
  });

  it('LA MUESTRA, que es el rojo previo: sin el atributo, las mismas dos ramas chocan', () => {
    const { codigo, salida, marcas } = mezclar('', anadir(FILA_UNA), anadir(FILA_OTRA));
    expect(codigo).toBe(1);
    expect(salida).toContain(`CONFLICT (content): Merge conflict in ${REGISTRO}`);
    expect(marcas).toBe(3);
  });

  it('EL PRECIO: dos ramas que EDITAN la misma fila dejan las dos versiones sin avisar, y la guarda lo dice', () => {
    const { codigo, salida, registro, marcas } = mezclar(
      ATRIBUTOS_DEL_ARBOL,
      editarLaDeMain('Lo que dijo una rama'),
      editarLaDeMain('Lo que dijo la otra'),
    );
    expect(codigo, salida).toBe(0);
    expect(marcas).toBe(0);
    expect(registro).toContain('Lo que dijo una rama');
    expect(registro).toContain('Lo que dijo la otra');

    const carpeta = mkdtempSync(join(tmpdir(), 'kamayuk-union-guarda-'));
    try {
      writeFileSync(join(carpeta, 'registro.md'), registro);
      writeFileSync(join(carpeta, 'cuerpo.txt'), '');
      const guarda = spawnSync(
        process.execPath,
        [GUARDA, '--registro', join(carpeta, 'registro.md'), '--cuerpo', join(carpeta, 'cuerpo.txt')],
        { encoding: 'utf8', env: entornoAislado() },
      );
      expect(guarda.status).toBe(1);
      expect(guarda.stderr).toContain('#1 tiene 2 filas');
    } finally {
      rmSync(carpeta, { recursive: true, force: true });
    }
  });

  it('el atributo es del registro y de nada más: `CLAUDE.md` se edita, y una unión duplicaría cada línea', () => {
    const salida = conUnRepositorio(ATRIBUTOS_DEL_ARBOL, (carpeta) =>
      gitQueNoFalla(carpeta, 'check-attr', 'merge', '--', REGISTRO, 'CLAUDE.md', 'README.md'),
    );
    expect(salida.trim().split('\n')).toEqual([
      `${REGISTRO}: merge: union`,
      'CLAUDE.md: merge: unspecified',
      'README.md: merge: unspecified',
    ]);
  });

  it('y la CI se dispara cuando cambia `.gitattributes`, en `push` y en `pull_request`', () => {
    // Sin esto, un PR que sólo borrara la línea del atributo no correría la prueba que lo vigila.
    const listas = listasDeRutas(leerElWorkflow());
    expect(listas, 'el workflow dejó de tener sus dos listas de `paths`').toHaveLength(2);
    for (const lista of listas) {
      expect(lista, '«.gitattributes» no dispara la CI').toContain('.gitattributes');
    }
  });
});
