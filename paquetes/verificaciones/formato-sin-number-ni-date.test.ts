// @vitest-environment node
//
// Lee el DISCO, no un DOM: en `jsdom`, `import.meta.url` no es una URL `file:` y `fileURLToPath`
// revienta con «The URL must be of scheme file».

import { join, sep } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { PAQUETES, RAIZ, archivosDeProduccion, leer } from './texto.ts';

/**
 * **En `@kamayuk/formato` no hay ni un `Number` ni un `Date`** (regla 1, #108).
 *
 * `CLAUDE.md` lo afirmaba y no era verdad: medido sobre `origin/main@2530761`,
 * `formato.ts:176` hacia `MESES[Number(mes) - 1]` y `formato.ts:182`
 * `` `${String(Number(dia))} de ${nombre}` ``. Los dos eran inocuos —un mes y un dia—, y los dos
 * pasaban la CI en verde, que es lo que no lo era: las prohibiciones de ESLint
 * (`importe-convertido-a-number`) solo cazan `Number(...)` sobre un identificador con nombre de
 * importe, asi que la proxima persona que escribiera `Number(valor)` en este paquete tambien
 * pasaba. La regla se cumplia por costumbre.
 *
 * <h2>Con el comprobador de TypeScript, y no por texto</h2>
 *
 * La primera version barria el texto sin comentarios buscando cinco palabras, y la revision
 * independiente de #108 le encontro dos roturas que NO mordian, las dos medidas en
 * `formato.ts:136` con la salida intacta y la guarda, ESLint y `tsc` en verde:
 *
 *   - `` `${String(+dia)}` ``: un `+` unario es coma flotante igual que `Number()`, sin ninguna
 *     de las cinco palabras;
 *   - `` `${'//'.slice(2)}${String(Number(dia))}` ``: `sinComentarios` borra desde cualquier `//`
 *     que no siga a `:`, tambien dentro de una cadena, y el `Number` de detras quedaba invisible.
 *
 * Las dos son el mismo defecto: un texto no sabe que es cadena, que es comentario ni que tipo
 * tiene cada cosa. Aqui cada archivo pasa por un `Program` de TypeScript con las opciones del
 * `tsconfig.json` de la raiz: los comentarios no son nodos, las cadenas si, y el comprobador dice
 * el tipo de cada operando. Se denuncian cuatro cosas:
 *
 *   - una palabra: un identificador `Number`, `Date`, `Intl`, `parseInt` o `parseFloat` —coma
 *     flotante, un entero que ya no sabe de centimos, la zona horaria del puesto (en Lima,
 *     `new Date("2026-09-06")` es el 5), y los formateadores de `Intl`, que piden un `Date` o un
 *     `number`—, o una cadena que es exactamente una de ellas (`globalThis['Date']`);
 *   - `coercion`: un operador que convierte a numero lo que no lo es —`+x`, `-x`, `~x`, `x++`,
 *     `x * 1`, `x | 0`…— sobre un operando que no es `number` ni `bigint`. `-centimos` en
 *     `aritmetica.ts` es un `bigint` y se calla;
 *   - `conversion`: un `as` hacia `number`, `any`, `unknown` o `never` desde algo que no es
 *     `number`: `dia as unknown as number` no convierte nada, pero apaga al compilador para que
 *     lo haga el operador de despues;
 *   - `any`: una llamada o un acceso por indice que da `any` —`JSON.parse(dia)`—, porque desde un
 *     `any` el compilador ya no vigila nada de lo anterior.
 *
 * **Lo que no ve, y se dice**: una cifra sacada de un texto con `indexOf` o `charCodeAt`
 * (`'0123456789'.indexOf(c)`) es un `number` legitimo para el compilador, igual que el
 * `numero.length` con el que `documento.ts` compara longitudes. Prohibir todo `number` pondria
 * rojo ese `length`; lo que se vigila es la conversion, no la existencia de un entero.
 *
 * Es solo `formato` y no los seis paquetes a proposito: `api` y `ui` usan `Date` y `Number` con
 * todo derecho —un `Content-Length`, un calendario— y la promesa de «ni uno» es de este paquete.
 */

/** Las palabras prohibidas, como identificador o como cadena exacta. */
const PALABRAS: ReadonlySet<string> = new Set(['Number', 'Date', 'Intl', 'parseInt', 'parseFloat']);

/** Los operadores binarios que convierten sus operandos a numero. `+` no: con una cadena, concatena. */
const ARITMETICOS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.MinusToken,
  ts.SyntaxKind.AsteriskToken,
  ts.SyntaxKind.SlashToken,
  ts.SyntaxKind.PercentToken,
  ts.SyntaxKind.AsteriskAsteriskToken,
  ts.SyntaxKind.AmpersandToken,
  ts.SyntaxKind.BarToken,
  ts.SyntaxKind.CaretToken,
  ts.SyntaxKind.LessThanLessThanToken,
  ts.SyntaxKind.GreaterThanGreaterThanToken,
  ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken,
  ts.SyntaxKind.MinusEqualsToken,
  ts.SyntaxKind.AsteriskEqualsToken,
  ts.SyntaxKind.SlashEqualsToken,
  ts.SyntaxKind.PercentEqualsToken,
  ts.SyntaxKind.AsteriskAsteriskEqualsToken,
  ts.SyntaxKind.AmpersandEqualsToken,
  ts.SyntaxKind.BarEqualsToken,
  ts.SyntaxKind.CaretEqualsToken,
  ts.SyntaxKind.LessThanLessThanEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
]);

/** Los unarios que convierten: `+`, `-`, `~`, `++` y `--`. `!` da un booleano. */
const UNARIOS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.PlusToken,
  ts.SyntaxKind.MinusToken,
  ts.SyntaxKind.TildeToken,
  ts.SyntaxKind.PlusPlusToken,
  ts.SyntaxKind.MinusMinusToken,
]);

/**
 * Las opciones del `tsconfig.json` de la raiz —el mismo compilador que corre `yarn verificar`—
 * **sin sus `types`**: los de Node y de `jest-dom` son de las pruebas, `formato` viaja a un
 * navegador sin ellos, y cargarlos triplicaba lo que tarda cada `Program`.
 */
const OPCIONES: ts.CompilerOptions = (() => {
  const ruta = join(RAIZ, 'tsconfig.json');
  const leido = ts.readConfigFile(ruta, (archivo) => ts.sys.readFile(archivo));
  if (leido.error !== undefined) {
    throw new Error(ts.flattenDiagnosticMessageText(leido.error.messageText, '\n'));
  }
  return { ...ts.parseJsonConfigFileContent(leido.config, ts.sys, RAIZ).options, types: [] };
})();

/**
 * Los archivos del disco ya analizados, de un `Program` al siguiente. Casi todo lo que cuesta es
 * `lib.*.d.ts`, que no cambia; un archivo de `formato` tampoco cambia mientras corre la prueba.
 */
const ANALIZADOS = new Map<string, ts.SourceFile>();

interface Hallazgo {
  readonly archivo: string;
  readonly linea: number;
  readonly que: string;
}

/**
 * Lo que se denuncia en cada archivo. `virtuales` son archivos que no estan en el disco —las
 * pruebas de que la guarda sabe callarse— y se sirven al compilador como si estuvieran.
 */
function hallazgosDe(
  archivos: readonly string[],
  virtuales: ReadonlyMap<string, string> = new Map(),
): Hallazgo[] {
  const host = ts.createCompilerHost(OPCIONES, true);
  const deVerdad = {
    fileExists: host.fileExists.bind(host),
    readFile: host.readFile.bind(host),
    getSourceFile: host.getSourceFile.bind(host),
  };
  host.fileExists = (archivo) => virtuales.has(archivo) || deVerdad.fileExists(archivo);
  host.readFile = (archivo) => virtuales.get(archivo) ?? deVerdad.readFile(archivo);
  host.getSourceFile = (archivo, version, ...resto) => {
    const texto = virtuales.get(archivo);
    if (texto !== undefined) return ts.createSourceFile(archivo, texto, version, true);
    const guardado = ANALIZADOS.get(archivo);
    if (guardado !== undefined) return guardado;
    const analizado = deVerdad.getSourceFile(archivo, version, ...resto);
    if (analizado !== undefined) ANALIZADOS.set(archivo, analizado);
    return analizado;
  };

  const programa = ts.createProgram([...archivos, ...virtuales.keys()], OPCIONES, host);
  const comprobador = programa.getTypeChecker();
  const esNumerico = (nodo: ts.Expression): boolean =>
    (comprobador.getTypeAtLocation(nodo).flags & (ts.TypeFlags.NumberLike | ts.TypeFlags.BigIntLike)) !== 0;

  const salida: Hallazgo[] = [];
  for (const archivo of [...archivos, ...virtuales.keys()]) {
    const fuente = programa.getSourceFile(archivo);
    if (fuente === undefined) throw new Error(`El compilador no cargo «${archivo}»: la guarda no lo mide.`);

    const anotar = (nodo: ts.Node, que: string): void => {
      salida.push({
        archivo: archivo.replace(PAQUETES, 'paquetes'),
        linea: fuente.getLineAndCharacterOfPosition(nodo.getStart(fuente)).line + 1,
        que,
      });
    };

    const visitar = (nodo: ts.Node): void => {
      if (ts.isIdentifier(nodo) && PALABRAS.has(nodo.text)) {
        anotar(nodo, nodo.text);
      } else if ((ts.isStringLiteral(nodo) || ts.isNoSubstitutionTemplateLiteral(nodo)) && PALABRAS.has(nodo.text)) {
        anotar(nodo, `'${nodo.text}'`);
      } else if (
        (ts.isPrefixUnaryExpression(nodo) || ts.isPostfixUnaryExpression(nodo)) &&
        UNARIOS.has(nodo.operator) &&
        !esNumerico(nodo.operand)
      ) {
        anotar(nodo, `coercion ${ts.tokenToString(nodo.operator) ?? '?'}`);
      } else if (
        ts.isBinaryExpression(nodo) &&
        ARITMETICOS.has(nodo.operatorToken.kind) &&
        !(esNumerico(nodo.left) && esNumerico(nodo.right))
      ) {
        anotar(nodo, `coercion ${nodo.operatorToken.getText(fuente)}`);
      } else if (ts.isAsExpression(nodo) || ts.isTypeAssertionExpression(nodo)) {
        const destino = comprobador.getTypeAtLocation(nodo.type);
        const apaga = ts.TypeFlags.NumberLike | ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.Never;
        if ((destino.flags & apaga) !== 0 && !esNumerico(nodo.expression)) {
          anotar(nodo, `conversion as ${comprobador.typeToString(destino)}`);
        }
      } else if (
        (ts.isCallExpression(nodo) || ts.isElementAccessExpression(nodo)) &&
        (comprobador.getTypeAtLocation(nodo).flags & ts.TypeFlags.Any) !== 0
      ) {
        anotar(nodo, 'any');
      }
      ts.forEachChild(nodo, visitar);
    };
    visitar(fuente);
  }
  return salida;
}

const FORMATO = join(PAQUETES, 'formato');
const PRODUCCION = archivosDeProduccion(FORMATO);

describe('en @kamayuk/formato no hay ni un Number ni un Date (regla 1)', () => {
  it('EL CENTINELA: se barre el paquete de verdad, archivo por archivo', () => {
    // Sin esto, lo de abajo pasaria sobre la lista vacia —si alguien moviera `paquetes/formato/` o
    // el recorrido dejara de bajar— y la guarda seguiria en verde sin sujeto. Se nombran uno a uno,
    // y no se cuentan: un conteo seguiria cuadrando con uno renombrado y otro nuevo.
    // `partir.ts` va con nombre: es donde vive el analisis de lo servido, y el primer sitio donde
    // alguien pensaria en «convertir el mes a numero».
    expect(PRODUCCION.length, 'no se leyo ni un archivo de formato: la guarda no mide nada').toBeGreaterThan(0);
    for (const archivo of ['formato.ts', 'aritmetica.ts', 'partir.ts', 'documento.ts', 'valores.ts', 'index.ts']) {
      expect(
        PRODUCCION.some((a) => a.endsWith(join('formato', archivo))),
        `no se leyo «formato/${archivo}»`,
      ).toBe(true);
    }
  });

  it('ni Number, ni Date, ni Intl, ni parseInt, ni parseFloat, ni una coercion en el codigo de produccion', () => {
    const hallazgos = hallazgosDe(PRODUCCION);
    const detalle = hallazgos.map((h) => `  ${h.archivo}:${String(h.linea)}  ${h.que}`).join('\n');
    expect(
      hallazgos,
      'Un importe es texto decimal y una fecha es texto ISO (regla 1, RNF-055): un `Number` ' +
        'pierde centimos y un `Date` arrastra la zona horaria del puesto. En este paquete no hay ' +
        'ni uno, tampoco para un mes o un dia, y tampoco escondido en un `+` unario o en un `as`: ' +
        'trabaja con el texto.\n\n' +
        `Donde aparece:\n${detalle}`,
    ).toEqual([]);
  });
});

describe('LA MUESTRA: la guarda muerde, y se demuestra', () => {
  const MUESTRA = join(PAQUETES, 'verificaciones/muestras/formato-con-number-o-date.ts');

  it('la muestra existe y NO la recoge el recorrido de produccion', () => {
    // Si `muestras/` entrara en el recorrido, la guarda saldria roja siempre y se acabaria
    // desactivando; si la muestra no existiera, no habria con que demostrar que muerde.
    expect(leer(MUESTRA).length).toBeGreaterThan(0);
    expect(PRODUCCION.filter((a) => a.includes(`${sep}muestras${sep}`))).toEqual([]);
  });

  it('sobre la muestra, el rojo nombra archivo, linea y que de cada forma', () => {
    // Exacto, y no «alguno»: una guarda que solo cazara `Number` seguiria «mordiendo». Las lineas
    // son las del archivo —con su docblock delante—, que es lo que el rojo tiene que decir para
    // que se mire donde es (#42). Las de la 30 y la 36 son las dos roturas que la guarda por
    // texto dejaba pasar en la revision de #108.
    const archivo = 'paquetes/verificaciones/muestras/formato-con-number-o-date.ts';
    expect(hallazgosDe([MUESTRA])).toEqual([
      { archivo, linea: 12, que: 'Number' },
      { archivo, linea: 15, que: 'Date' },
      { archivo, linea: 17, que: 'Intl' },
      { archivo, linea: 20, que: 'parseInt' },
      { archivo, linea: 24, que: 'parseFloat' },
      { archivo, linea: 30, que: 'coercion +' },
      { archivo, linea: 36, que: 'Number' },
      { archivo, linea: 39, que: 'coercion -' },
      { archivo, linea: 40, que: 'coercion ~' },
      { archivo, linea: 41, que: 'conversion as number' },
      { archivo, linea: 41, que: 'conversion as unknown' },
      { archivo, linea: 42, que: 'coercion *' },
      { archivo, linea: 43, que: 'any' },
      { archivo, linea: 44, que: "'Date'" },
    ]);
  });

  it('y sabe callarse: ni en un comentario, ni dentro de otro identificador, ni sobre un numero', () => {
    // La explicacion de por que no se usa `Number("0.1")` vive en los docblocks del paquete, y no
    // puede ponerse roja. `\b` ya no hace falta: se comparan identificadores enteros, y
    // `esNumberish` o `toDateString` no son `Number` ni `Date`. Y la aritmetica que el paquete SI
    // hace —`-centimos` sobre un `bigint`, `slice(0, -2)`, restar a un `length`— no es coercion.
    const callado = join(RAIZ, 'formato-callado.virtual.ts');
    const texto = [
      '/** `Number("0.1") + Number("0.2")` no es 0.3. */',
      '// y en linea: new Date("2026-09-06") es el 5 en Lima',
      'export const esNumberish = 1;',
      "export const toDateString = 'Number(x) // Date'.slice(0, -2);",
      'export const menos = (centimos: bigint): bigint => -centimos + 1n;',
      'export const largo = (texto: string): number => texto.length - 1;',
    ].join('\n');
    expect(hallazgosDe([], new Map([[callado, texto]]))).toEqual([]);
    // Y lo contrario, para que la de arriba no pase por no mirar: el mismo archivo virtual, con
    // una linea de codigo mas, si se ve.
    expect(hallazgosDe([], new Map([[callado, `${texto}\nexport const mes = Number(esNumberish);`]]))).toEqual([
      { archivo: callado, linea: 7, que: 'Number' },
    ]);
  });
});
