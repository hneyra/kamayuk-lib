// @vitest-environment node
//
// Compila fuentes con el compilador de TypeScript. No es un DOM lo que necesita.

import { join, relative } from 'node:path';

import ts from 'typescript';
import { beforeAll, describe, expect, it } from 'vitest';

import { RAIZ } from './texto.ts';

/**
 * **LA EXHAUSTIVIDAD DEL INTERPRETE VIAJA A LOS CONSUMIDORES** (#111).
 *
 * El lint de este repositorio lleva `switch-exhaustiveness-check`, y ningun consumidor lo corre sobre
 * esta fuente: el `link:` la deja en `node_modules`, que su config ignora. Lo que **si** corre cada
 * consumidor es su `tsc`, que compila esta fuente con SU `tsconfig`. Asi que lo que protege a los
 * cinco es lo que el compilador ve por si solo: los tipos de retorno anotados de `CampoDelBloque`,
 * `EstadoDeLaLectura` y `claveDeLaAccion`, y las asignaciones a `never` de `PiezaDeLaPantalla` y
 * `claseDe`.
 *
 * Y eso es justo lo que no vigilaba nada. Medido en la revision de #111: quitada la anotacion
 * `: ReactElement` de `CampoDelBloque` y de `EstadoDeLaLectura`, `yarn typecheck`, `yarn lint` y
 * `yarn test` salian verdes; con un quinto estado anadido encima, `tsc` seguia en RC=0 —el
 * consumidor volvia a compilar un hueco— y solo el lint LOCAL lo decia.
 *
 * <h2>Como se mide, y por que asi</h2>
 *
 * Por cada union que el interprete agota se anade, **en memoria**, un miembro nuevo —el arbol no se
 * toca— y se compila con **las opciones minimas de un consumidor**: `strict` y las que hacen falta
 * para leer la fuente (`jsx`, `moduleResolution: bundler`, `allowImportingTsExtensions`), y
 * **ninguno** de los flags de `tsconfig.base.json` —ni `noImplicitReturns`, que no esta, ni
 * `noUncheckedIndexedAccess` ni `noFallthroughCasesInSwitch`—. Un flag de aqui no protege a nadie.
 *
 * Se exige el conjunto **exacto** de diagnosticos: el codigo, y el archivo donde se olvido la rama.
 * Exacto y no «contiene», por dos cosas: un rojo que sale lejos y por casualidad —el TS2538 de
 * `GrupoDeAcciones` que daba una quinta clase de accion antes de #111— no es la proteccion; y un
 * miembro inyectado que rompiera otra cosa diria que la inyeccion ya no es la que se queria medir.
 * Tambien por eso cada reemplazo comprueba que encontro su texto: si la fuente cambia de forma, esto
 * sale rojo diciendolo, y no verde sin haber inyectado nada.
 */

const INTERPRETE = join(RAIZ, 'paquetes', 'ui', 'interprete');
const CAMPOS = join(RAIZ, 'paquetes', 'ui', 'shadcn', 'campos.ts');
const TIPOS = join(INTERPRETE, 'tipos.ts');
const DATOS = join(INTERPRETE, 'datos.ts');
const TIPOS_DE_LOS_ACTOS = join(INTERPRETE, 'tipos-de-los-actos.ts');
const ACCIONES = join(INTERPRETE, 'acciones.ts');

/** Las piezas que agotan una union. Lo demas entra por sus imports. */
const RAICES = ['CampoDelBloque.tsx', 'EstadoDeLaLectura.tsx', 'PiezaDeLaPantalla.tsx', 'GrupoDeAcciones.tsx', 'acciones.ts'].map(
  (archivo) => join(INTERPRETE, archivo),
);

/**
 * Las de un consumidor que no se parece en nada a este repositorio: `--strict` y lo imprescindible
 * para leer la fuente. Es el mismo `tsc` minimo con el que se midio el rojo previo de #111.
 */
const OPCIONES_DE_UN_CONSUMIDOR: ts.CompilerOptions = {
  strict: true,
  jsx: ts.JsxEmit.ReactJSX,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  allowImportingTsExtensions: true,
  target: ts.ScriptTarget.ES2022,
  skipLibCheck: true,
  types: ['node'],
  noEmit: true,
};

/** Un reemplazo que no encuentra su texto no es una inyeccion: lanza, y la prueba sale roja. */
type Inyeccion = Readonly<Record<string, readonly (readonly [string, string])[]>>;

const aplicar = (archivo: string, texto: string, reemplazos: readonly (readonly [string, string])[]): string =>
  reemplazos.reduce((actual, [antes, despues]) => {
    if (!actual.includes(antes)) {
      throw new Error(`${relative(RAIZ, archivo)} cambio de forma: la inyeccion no encontro «${antes}».`);
    }
    return actual.replace(antes, despues);
  }, texto);

/** Las fuentes sin tocar se leen una vez: cada compilacion solo vuelve a leer lo que inyecta. */
const leidas = new Map<string, ts.SourceFile | undefined>();

function compilar(inyeccion: Inyeccion): string[] {
  const base = ts.createCompilerHost(OPCIONES_DE_UN_CONSUMIDOR);
  const host: ts.CompilerHost = {
    ...base,
    getSourceFile(archivo, idioma, ...resto) {
      const reemplazos = inyeccion[archivo];
      if (reemplazos !== undefined) {
        const texto = base.readFile(archivo);
        if (texto === undefined) throw new Error(`No se pudo leer ${archivo}.`);
        return ts.createSourceFile(archivo, aplicar(archivo, texto, reemplazos), idioma);
      }
      if (!leidas.has(archivo)) leidas.set(archivo, base.getSourceFile(archivo, idioma, ...resto));
      return leidas.get(archivo);
    },
  };
  const programa = ts.createProgram({ rootNames: RAICES, options: OPCIONES_DE_UN_CONSUMIDOR, host });
  const tocados = Object.keys(inyeccion);
  const noInyectados = tocados.filter((archivo) => programa.getSourceFile(archivo) === undefined);
  if (noInyectados.length > 0) {
    throw new Error(`La compilacion no leyo ${noInyectados.map((a) => relative(RAIZ, a)).join(', ')}: no hubo inyeccion.`);
  }
  return ts
    .getPreEmitDiagnostics(programa)
    .map((d) => `${d.file === undefined ? '(global)' : relative(RAIZ, d.file.fileName)} TS${d.code}`);
}

const CASOS: readonly { readonly que: string; readonly inyeccion: Inyeccion; readonly rojo: readonly string[] }[] = [
  {
    que: 'un octavo tipo de campo, sin su rama en CampoDelBloque',
    inyeccion: {
      [CAMPOS]: [
        ["  | 'a';", "  | 'a'\n  | 'x';"],
        ["  a: 'Area',", "  a: 'Area',\n  x: 'Equis',"],
      ],
    },
    rojo: ['paquetes/ui/interprete/CampoDelBloque.tsx TS2366'],
  },
  {
    que: 'un quinto estado de lectura, sin su rama en EstadoDeLaLectura',
    inyeccion: {
      [DATOS]: [["  | { readonly estado: 'con-datos' };", "  | { readonly estado: 'con-datos' }\n  | { readonly estado: 'caducada' };"]],
    },
    rojo: ['paquetes/ui/interprete/EstadoDeLaLectura.tsx TS2366'],
  },
  {
    que: 'una octava clase de pieza, sin su case en PiezaDeLaPantalla',
    inyeccion: {
      [TIPOS]: [
        [
          '  | DefinicionDePestanas;',
          "  | DefinicionDePestanas\n  | (ComunDeUnaPieza & { readonly tipo: 'otra'; readonly clave: string });",
        ],
      ],
    },
    rojo: ['paquetes/ui/interprete/PiezaDeLaPantalla.tsx TS2322'],
  },
  {
    que: 'una quinta clase de accion, sin su pregunta en claseDe',
    inyeccion: {
      [TIPOS_DE_LOS_ACTOS]: [
        [
          '        readonly hace?: never;\n      }\n  );',
          '        readonly hace?: never;\n      }\n' +
            '    | { readonly imprime: string; readonly abre?: never; readonly va?: never; readonly hace?: never; readonly guarda?: never }\n  );',
        ],
      ],
    },
    rojo: ['paquetes/ui/interprete/acciones.ts TS2322'],
  },
  {
    que: 'la quinta clase ya en claseDe, sin su case en la clave de data-accion',
    inyeccion: {
      [TIPOS_DE_LOS_ACTOS]: [
        [
          '        readonly hace?: never;\n      }\n  );',
          '        readonly hace?: never;\n      }\n' +
            '    | { readonly imprime: string; readonly abre?: never; readonly va?: never; readonly hace?: never; readonly guarda?: never }\n  );',
        ],
      ],
      [ACCIONES]: [
        [
          "  | { readonly clase: 'guarda';",
          "  | { readonly clase: 'imprime'; readonly accion: Extract<DefinicionDeAccion, { readonly imprime: string }> }\n  | { readonly clase: 'guarda';",
        ],
        [
          "  if (accion.guarda !== undefined) return { clase: 'guarda', accion };",
          "  if (accion.guarda !== undefined) return { clase: 'guarda', accion };\n  if ('imprime' in accion) return { clase: 'imprime', accion };",
        ],
      ],
    },
    // Solo la clave: `pulsar` devuelve `void` y `motivoDeLaAccion` admite `undefined`, y ahi la rama
    // que falta no la ve el compilador —la ve `switch-exhaustiveness-check`, en el lint de aqui—.
    rojo: ['paquetes/ui/interprete/GrupoDeAcciones.tsx TS2366'],
  },
];

describe('la exhaustividad del interprete sale con el tsconfig de un consumidor (#111)', () => {
  const medido = new Map<string, string[]>();

  // Cinco compilaciones del interprete, fuera del presupuesto de un caso por lo mismo que el
  // `beforeAll` de `reglas-de-eslint.test.ts` (#36): medido, la primera cuesta 2,8 s en frio —leer
  // React y Radix— y las siguientes 1,4 s. Dentro de cada caso, una maquina cargada lo pondria en
  // rojo por la maquina y no por lo que se mide.
  beforeAll(() => {
    medido.set('sin inyectar nada', compilar({}));
    for (const { que, inyeccion } of CASOS) medido.set(que, compilar(inyeccion));
  }, 60_000);

  it('sin inyectar nada, compila limpio con las opciones de un consumidor', () => {
    // Sin esto, un rojo previo cualquiera haria que los casos de abajo compararan contra ruido.
    expect(medido.get('sin inyectar nada')).toEqual([]);
  });

  for (const { que, rojo } of CASOS) {
    it(`${que}: rojo en su sitio`, () => {
      expect(
        medido.get(que),
        `Con ${que}, un consumidor debe dejar de compilar ahi. Si sale vacio, el retorno anotado o la\n` +
          'asignacion a `never` se perdio, y el consumidor vuelve a compilar un hueco sin ningun aviso.',
      ).toEqual(rojo);
    });
  }
});
