// @vitest-environment node
//
// Lee los workflows del disco. No es un DOM lo que necesita.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { RAIZ } from './texto.ts';
import { usesConSuLinea } from './workflow.ts';

/**
 * **Las acciones de la CI corren en Node 24** (#93).
 *
 * <h2>El hueco que esto tapa</h2>
 *
 * El producto subio a Node 24 en #90 —`engines: ">=24"` y `node-version: "24"`—, pero eso es el
 * Node que corre NUESTRO codigo. Las acciones traen el suyo dentro: el `runs.using` de su
 * `action.yml` dice en que tiempo de ejecucion las arranca el corredor. Con las ocho referencias
 * en `@v4`, cada trabajo salia con el aviso «Node.js 20 is deprecated. The following actions
 * target Node.js 20 but are being forced to run on Node.js 24». Un aviso que el corredor fuerza
 * HOY y que manana apaga el trabajo entero.
 *
 * <h2>Por que la tabla fija la MAYOR y no lee el `action.yml`</h2>
 *
 * Lo que decide es `runs.using`, **no el numero de version**, y eso esta medido: `caja` subio
 * `actions/upload-artifact` a `@v5` y seguia declarando `node20` (hneyra/caja#90). Asi que subir
 * un major no garantiza nada, y esta guarda no puede comprobarlo por su cuenta: leer el
 * `action.yml` de cada accion **exige red**, y una guarda que necesita red no es una guarda, es
 * una que se salta el dia que la red falla —aqui el lint, los tipos y las pruebas corren sin salir
 * a ninguna parte—.
 *
 * Lo que si puede hacer, y es lo que hace, es **impedir que se vuelva atras en silencio**: la
 * tabla fija, por accion, la mayor cuyo `runs.using` SE LEYO, con el literal leido anotado al
 * lado. Su trabajo no es descubrir la mayor nueva —eso lo hace una persona, con el `curl` que el
 * rojo escribe—, es que nadie baje de la que ya se midio sin que salga rojo.
 *
 * <h2>Y lo que no sabe leer sale ROJO, no en verde</h2>
 *
 * Dos formas se van por el desague de una guarda escrita a la ligera: una accion que la tabla no
 * conoce —de la que no se sabe NADA, y no saber no es pasar— y una referencia que no es `@vN` —un
 * SHA, una rama—, cuya mayor no se puede comparar con nada. Las dos salen rojas diciendolo, que es
 * el mismo criterio con el que `lo-que-exports-promete-existe` trata una forma de `exports` que no
 * sabe leer (#24).
 *
 * <h2>Y los `uses:` salen del YAML analizado, no de un patron sobre cada linea (#114)</h2>
 *
 * Hasta #114 se buscaban con un patron anclado linea a linea, que es la cuarta forma distinta de
 * decidir que es comentario en el mismo archivo. Hoy los da `usesConSuLinea` de `workflow.ts`: los
 * de `jobs.<id>.steps[]` y el de `jobs.<id>` —un workflow reutilizable—, que son los unicos que
 * GitHub ejecuta. Un `# - uses: …` comentado o un `uses:` dentro del texto de un `run: |` ya no
 * cuentan, y un `steps` que no es una lista sale como ilegible en vez de saltarse.
 */

/** Donde viven los workflows. Se lee el DIRECTORIO, no una lista escrita: un workflow nuevo entra solo. */
const DIRECTORIO_DE_WORKFLOWS = '.github/workflows';

interface MayorMedida {
  /** La mayor cuyo `action.yml` se leyo. Por debajo de esta, rojo. */
  readonly mayor: number;
  /** El `runs.using` LITERAL que se leyo en esa mayor. Es la medicion, y por eso se copia tal cual. */
  readonly usando: string;
  /** Sobre que archivo se leyo, para que la proxima persona repita la medida y no la suponga. */
  readonly leidoEn: string;
}

/**
 * La mayor minima admitida por accion, con su medicion.
 *
 * Medido el 2026-09-20 con `curl -sS https://raw.githubusercontent.com/<accion>/<mayor>/action.yml`.
 * `v8` no existe en ninguna de las dos (HTTP 404), asi que `v7` es la mas alta; y el control de que
 * ese 404 significa algo esta hecho: `actions/checkout@v99` contesta 404 y `@v7.0.0` contesta 200.
 */
const MAYOR_MINIMA_POR_ACCION: Readonly<Record<string, MayorMedida>> = {
  'actions/checkout': {
    mayor: 7,
    usando: 'using: node24',
    leidoEn: 'actions/checkout@v7/action.yml',
  },
  'actions/setup-node': {
    mayor: 7,
    usando: "using: 'node24'",
    leidoEn: 'actions/setup-node@v7/action.yml',
  },
};

interface Referencia {
  readonly archivo: string;
  readonly linea: number;
  /** Lo que venia detras de `uses:`, tal cual lo dejo el YAML (sin sus comillas). */
  readonly talCual: string;
  /** El nombre de la accion, o `null` si la forma no se sabe leer. */
  readonly accion: string | null;
  /** La mayor de la referencia, o `null` si no es `@vN`: un SHA o una rama no se pueden comparar. */
  readonly mayor: number | null;
}

/** `@v7`, `@v7.0`, `@v7.0.0`. Un SHA o una rama NO casan, y eso los manda a «no se leerlo». */
const ETIQUETA_DE_MAYOR = /^v(\d+)(?:\.\d+)*$/;

/**
 * Saca las referencias a acciones de un workflow.
 *
 * Recibe el TEXTO y no lo lee del disco para que las muestras puedan ensenar un workflow que este
 * arbol no tiene, sin escribir un archivo. Lo que no es una cadena —un `uses:` vacio, un mapa, un
 * `steps` que no es una lista— entra con `accion: null`, y eso lo manda a «no se leerlo».
 */
export const referenciasDeAcciones = (archivo: string, texto: string): Referencia[] =>
  usesConSuLinea(texto, archivo).map(({ linea, valor }): Referencia => {
    if (typeof valor !== 'string') {
      const talCual = valor === undefined ? '(no es un `uses:` que se sepa leer)' : JSON.stringify(valor);
      return { archivo, linea, talCual, accion: null, mayor: null };
    }

    const talCual = valor;
    const corte = talCual.lastIndexOf('@');
    const base = { archivo, linea, talCual };

    // Sin `@` no hay version que comparar: una accion local (`./...`) o un `docker://` caen aqui.
    if (corte <= 0) return { ...base, accion: null, mayor: null };

    const etiqueta = ETIQUETA_DE_MAYOR.exec(talCual.slice(corte + 1));
    return {
      ...base,
      accion: talCual.slice(0, corte),
      mayor: etiqueta === null ? null : Number(etiqueta[1]),
    };
  });

const renglonDe = (referencia: Referencia, porque: string): string =>
  `  ${referencia.archivo}:${referencia.linea} «${referencia.talCual}» — ${porque}`;

/** Las que no son `accion@vN`: su mayor no se puede comparar con nada. */
export const lasQueNoSeSabenLeer = (referencias: readonly Referencia[]): string[] =>
  referencias
    .filter((r) => r.accion === null || r.mayor === null)
    .map((r) =>
      renglonDe(r, 'no es «<accion>@vN», asi que ninguna medicion respalda su `runs.using`'),
    );

/**
 * Lo que la tabla sabe de una accion, o `null`.
 *
 * `Object.hasOwn` no sobra ante el `undefined`: sin el, una accion que se llamara `constructor`
 * heredaria un valor del prototipo y pasaria por medida.
 */
const medidaDe = (
  tabla: Readonly<Record<string, MayorMedida>>,
  accion: string,
): MayorMedida | null => (Object.hasOwn(tabla, accion) ? (tabla[accion] ?? null) : null);

/** Las que la tabla no conoce: de su `runs.using` no se sabe nada, y no saber no es pasar. */
export const lasDesconocidas = (
  referencias: readonly Referencia[],
  tabla: Readonly<Record<string, MayorMedida>> = MAYOR_MINIMA_POR_ACCION,
): string[] =>
  referencias.flatMap((r) => {
    if (r.accion === null || r.mayor === null) return [];
    if (medidaDe(tabla, r.accion) !== null) return [];
    return [renglonDe(r, 'no esta en MAYOR_MINIMA_POR_ACCION: mide su `runs.using` y anotalo ahi')];
  });

/** Las que bajan de la mayor medida. Es el defecto que #93 arreglo, volviendo. */
export const lasQueSeQuedanCortas = (
  referencias: readonly Referencia[],
  tabla: Readonly<Record<string, MayorMedida>> = MAYOR_MINIMA_POR_ACCION,
): string[] =>
  referencias.flatMap((r) => {
    if (r.accion === null || r.mayor === null) return [];
    const medida = medidaDe(tabla, r.accion);
    if (medida === null || r.mayor >= medida.mayor) return [];
    return [
      renglonDe(r, `por debajo de @v${medida.mayor}, la mayor medida con «${medida.usando}»`),
    ];
  });

// Desde la raiz del repositorio y no desde el directorio de trabajo (#114): vitest puede
// arrancar en otro sitio, y entonces el centinela saldria rojo por la ruta y no por los workflows.
const archivosDeWorkflow = readdirSync(join(RAIZ, DIRECTORIO_DE_WORKFLOWS))
  .filter((nombre) => nombre.endsWith('.yml') || nombre.endsWith('.yaml'))
  .sort();

const referencias = archivosDeWorkflow.flatMap((nombre) =>
  referenciasDeAcciones(nombre, readFileSync(join(RAIZ, DIRECTORIO_DE_WORKFLOWS, nombre), 'utf8')),
);

describe('las acciones de la CI corren en Node 24', () => {
  it('EL CENTINELA: se leyeron workflows, y traen referencias a acciones', () => {
    // Sin esto, un directorio renombrado deja las tres comprobaciones sobre una lista vacia y en
    // VERDE — que es justo el modo de fallo silencioso que este repositorio persigue.
    expect(
      archivosDeWorkflow.length,
      `no se leyo ni un workflow en «${DIRECTORIO_DE_WORKFLOWS}»`,
    ).toBeGreaterThanOrEqual(1);
    expect(
      referencias.length,
      'ningun workflow trae un `uses:`: el barrido no esta mirando nada',
    ).toBeGreaterThanOrEqual(1);
  });

  it('EL CENTINELA: la tabla de mayores medidas no esta vacia', () => {
    // Una tabla vacia manda TODO a «desconocida», que es rojo, pero deja sin ejercitar la
    // comparacion. Que este no vacia es lo que hace que el renglon de arriba mida algo.
    expect(Object.keys(MAYOR_MINIMA_POR_ACCION).length).toBeGreaterThanOrEqual(1);
  });

  it('ninguna accion baja de la mayor cuyo `runs.using` se midio', () => {
    const cortas = lasQueSeQuedanCortas(referencias);
    expect(
      cortas,
      'Hay acciones por debajo de la mayor medida. El corredor las arranca en Node 20 y avisa en\n' +
        'cada trabajo; lo que decide es el `runs.using` de su `action.yml`, no el numero:\n' +
        `${cortas.join('\n')}`,
    ).toEqual([]);
  });

  it('y ninguna accion del arbol se queda fuera de la tabla', () => {
    const desconocidas = lasDesconocidas(referencias);
    expect(
      desconocidas,
      'Hay acciones de las que no se midio nada. Baja su `action.yml` y mira su `runs.using`:\n' +
        '  curl -sS https://raw.githubusercontent.com/<accion>/<mayor>/action.yml | grep -A2 "^runs:"\n' +
        `${desconocidas.join('\n')}`,
    ).toEqual([]);
  });

  it('y ninguna referencia tiene una forma que esta guarda no sepa leer', () => {
    const ilegibles = lasQueNoSeSabenLeer(referencias);
    expect(
      ilegibles,
      'Hay referencias que no son «<accion>@vN». No pasan en verde a proposito: de una fijada por\n' +
        'SHA o por rama no se puede afirmar que mayor es, y por tanto tampoco su `runs.using`:\n' +
        `${ilegibles.join('\n')}`,
    ).toEqual([]);
  });

  it('LA MUESTRA: un `@v4` sale rojo, y el `@v7` de al lado no', () => {
    // Una guarda que no puede fallar no protege nada, y las tres de arriba se comprueban sobre el
    // disco: con los workflows sanos se quedarian verdes para siempre sin ejercitar una linea.
    const muestra = referenciasDeAcciones(
      'muestra.yml',
      [
        'jobs:',
        '  x:',
        '    steps:',
        '      - uses: actions/checkout@v4',
        '      - uses: actions/setup-node@v7',
      ].join('\n'),
    );
    expect(muestra).toHaveLength(2);
    expect(lasQueNoSeSabenLeer(muestra), 'la forma es legible y la guarda dice que no').toEqual([]);
    expect(lasDesconocidas(muestra), 'las dos estan en la tabla').toEqual([]);

    const cortas = lasQueSeQuedanCortas(muestra);
    expect(cortas, 'el `@v4` paso en verde').toHaveLength(1);
    expect(cortas[0], 'el rojo no dice donde se arregla').toContain('muestra.yml:4');
    expect(cortas[0], 'el rojo no dice a que hay que subir').toContain('@v7');
  });

  it('LA MUESTRA: y la otra direccion — un workflow al dia no saca ni un renglon', () => {
    // Sin esto, una guarda que devolviera SIEMPRE la referencia pasaria la muestra de arriba.
    const alDia = referenciasDeAcciones('muestra.yml', conPasos('      - uses: actions/checkout@v7.0.0'));
    expect(alDia, 'el `uses:` no se reconocio').toHaveLength(1);
    expect(lasQueSeQuedanCortas(alDia)).toEqual([]);
    expect(lasDesconocidas(alDia)).toEqual([]);
    expect(lasQueNoSeSabenLeer(alDia)).toEqual([]);
  });

  it('LA MUESTRA: una accion que la tabla no conoce sale roja, en vez de pasar por no saber', () => {
    // El caso que `caja` midio: `actions/upload-artifact@v5` TODAVIA declaraba `node20`. Una mayor
    // alta no dice nada por si sola, asi que lo que no se ha medido no pasa.
    const muestra = referenciasDeAcciones('muestra.yml', conPasos('      - uses: actions/upload-artifact@v5'));
    expect(
      lasQueSeQuedanCortas(muestra),
      'el numero alto la dejo pasar por la otra puerta',
    ).toEqual([]);
    const desconocidas = lasDesconocidas(muestra);
    expect(desconocidas, 'una accion sin medir paso en verde').toHaveLength(1);
    expect(desconocidas[0]).toContain('actions/upload-artifact@v5');
  });

  it('LA MUESTRA: una fijada por SHA, sin `@` o que no es una cadena sale roja DICIENDOLO, y no en verde', () => {
    for (const forma of [
      '      - uses: actions/checkout@8f4b7f84864484a7bf31766abe9204da3cbe65b3',
      '      - uses: actions/checkout@main',
      '      - uses: ./.github/actions/lo-nuestro',
      '      - uses: docker://alpine:3.20',
      // Las dos que solo existen desde que se lee el YAML (#114): lo que viene detras de `uses:` no
      // es una cadena, y de eso no se puede sacar ni accion ni mayor.
      '      - uses:',
      '      - uses: { accion: actions/checkout, version: 7 }',
    ]) {
      const muestra = referenciasDeAcciones('muestra.yml', conPasos(forma));
      expect(muestra, `«${forma.trim()}» no se reconocio como un \`uses:\``).toHaveLength(1);
      expect(lasQueNoSeSabenLeer(muestra), `«${forma.trim()}» paso en silencio`).toHaveLength(1);
      // Y no se cuela ademas por las otras dos puertas, que compararian con una mayor que no hay.
      expect(lasQueSeQuedanCortas(muestra)).toEqual([]);
      expect(lasDesconocidas(muestra)).toEqual([]);
    }
  });

  it('LA MUESTRA: unos `steps` que no son una lista salen rojos, y no como un trabajo sin acciones', () => {
    // Lo que el analizador no sabe recorrer no se salta: se dice, en la linea donde esta (#114).
    const muestra = referenciasDeAcciones(
      'muestra.yml',
      ['jobs:', '  x:', '    steps:', '      uses: actions/checkout@v4'].join('\n'),
    );
    const ilegibles = lasQueNoSeSabenLeer(muestra);
    expect(ilegibles, 'un `steps` que es un mapa paso en silencio').toHaveLength(1);
    expect(ilegibles[0], 'el rojo no dice donde').toContain('muestra.yml:4');
  });

  it('LA MUESTRA: un YAML que no se puede analizar revienta nombrando el archivo', () => {
    // Una clave repetida la resolveria GitHub quedandose con una; aqui no se adivina cual.
    expect(() => referenciasDeAcciones('roto.yml', 'jobs: [')).toThrow(/«roto\.yml» no es un YAML/);
    expect(() =>
      referenciasDeAcciones(
        'repetido.yml',
        conPasos('      - uses: actions/checkout@v7', '        uses: actions/checkout@v4'),
      ),
    ).toThrow(/«repetido\.yml» no es un YAML/);
  });

  it('LA MUESTRA: el barrido coge el `uses:` con guion y sin el, y no se come el comentario', () => {
    // Las dos formas estan en `paquetes.yml`: `- uses:` en un paso suelto y `uses:` bajo un `name:`.
    const muestra = referenciasDeAcciones(
      'muestra.yml',
      conPasos(
        '      - uses: actions/checkout@v7',
        '      - name: Con nombre',
        '        uses: "actions/setup-node@v7" # con algo detras',
      ),
    );
    expect(muestra.map((r) => r.talCual)).toEqual([
      'actions/checkout@v7',
      'actions/setup-node@v7',
    ]);
    expect(muestra.map((r) => r.linea), 'la linea de cada `uses:` no es la del archivo').toEqual([4, 6]);
  });

  it('LA MUESTRA: lo que GitHub no ejecuta no cuenta, y lo que si ejecuta fuera de `steps` si (#114)', () => {
    // Un `uses:` comentado y otro dentro del texto de un `run: |` los veia el patron de linea de
    // antes, y ninguno corre. El de un trabajo que llama a un workflow reutilizable corre, y un
    // barrido que solo mirara `steps` se lo saltaria.
    const muestra = referenciasDeAcciones(
      'muestra.yml',
      [
        'jobs:',
        '  x:',
        '    steps:',
        '      # - uses: actions/checkout@v4',
        '      - run: |',
        '          echo "uses: actions/checkout@v4"',
        '  reutilizado:',
        '    uses: actions/otro/.github/workflows/uno.yml@v4',
      ].join('\n'),
    );
    expect(muestra.map((r) => `${r.linea} ${r.talCual}`)).toEqual([
      '8 actions/otro/.github/workflows/uno.yml@v4',
    ]);
    expect(lasDesconocidas(muestra), 'el workflow reutilizado sin medir paso en verde').toHaveLength(1);
  });
});

/** Un workflow minimo con un trabajo y estos pasos, cada uno ya sangrado como paso de `steps`. */
function conPasos(...pasos: readonly string[]): string {
  return ['jobs:', '  x:', '    steps:', ...pasos].join('\n');
}
