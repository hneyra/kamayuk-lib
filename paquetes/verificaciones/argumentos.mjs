/**
 * **Los argumentos de los guiones de este paquete, troceados por `parseArgs` de `node:util`** (#129).
 *
 * Hasta #129 cada guion que admite opciones las leia con su bucle escrito a mano —el de
 * `rama-del-consumidor.mjs`, el de `el-arnes-del-request-no-se-copia.mjs` y el filtro de
 * `cifras.mjs`—, tres veces lo mismo con tres formas de equivocarse: ninguno entendia `--cuerpo=x`,
 * y el del arnes daba por buena la primera `--raiz` sin mirar lo que venia detras. Ahora trocea
 * `parseArgs`, que es de Node y sabe de `=`, de `--` y de las opciones cortas, y aqui se decide.
 *
 * El cuarto, el de `docs/00-gobierno/verificar-fila-del-registro.mjs`, NO pasa por aqui: aquel
 * guion vive fuera de los paquetes y es una copia de la guarda de los otros repositorios, que no se
 * cambia en uno solo.
 *
 * <h2>Por que `tokens` y no `strict`</h2>
 *
 * Con `strict: true`, `parseArgs` lanza en ingles —«Unknown option '--x'. To specify a positional
 * argument starting with a '-', place it at the end of the command after '--'…»— y los guiones
 * decian «Opcion desconocida: --x» y «Falta el valor de --x», que es lo que lee quien los corre y
 * lo que el AC4 de #129 pide que no cambie. Asi que se le piden los TROZOS —`tokens: true`, sin
 * `strict`— y cada trozo se juzga aqui, con las frases de los bucles letra por letra.
 *
 * Sin `strict`, ademas, el valor de un texto es la palabra siguiente empiece como empiece:
 * `--consumidor --comprobar` da `consumidor: '--comprobar'`, que es lo que hacian los bucles. Con
 * `strict` seria otro error nuevo, en ingles, para un caso que nadie ha pedido cambiar.
 */

import { parseArgs } from 'node:util';

/**
 * Como se lee cada opcion: con su valor detras (`'texto'`) o sola (`'marca'`).
 *
 * @typedef {'texto' | 'marca'} ClaseDeOpcion
 */

/**
 * Lee `argumentos` contra las `opciones` declaradas. Lanza, con la frase de siempre, ante una
 * opcion que no esta declarada, una palabra suelta, un `--`, una marca con `=valor` o un texto sin
 * valor. Si una opcion se repite, gana la ultima.
 *
 * @template {Readonly<Record<string, ClaseDeOpcion>>} O
 * @param {readonly string[]} argumentos  Lo que va detras del guion: `process.argv.slice(2)`.
 * @param {O} opciones  Las que admite el guion, y de que clase es cada una.
 * @returns {{ -readonly [K in keyof O]?: O[K] extends 'marca' ? true : string }}
 */
export function leerArgumentos(argumentos, opciones) {
  const { tokens } = parseArgs({
    args: [...argumentos],
    options: Object.fromEntries(
      Object.entries(opciones).map(([nombre, clase]) => [
        nombre,
        { type: clase === 'marca' ? 'boolean' : 'string' },
      ]),
    ),
    strict: false,
    allowPositionals: true,
    tokens: true,
  });

  /** @type {Record<string, string | true>} */
  const leidos = {};
  for (const trozo of tokens) {
    if (trozo.kind === 'positional') throw new Error(`Opcion desconocida: ${trozo.value}`);
    if (trozo.kind === 'option-terminator') throw new Error('Opcion desconocida: --');
    const escrita = trozo.inlineValue ? `${trozo.rawName}=${trozo.value ?? ''}` : trozo.rawName;
    const clase = Object.hasOwn(opciones, trozo.name) ? opciones[trozo.name] : undefined;
    if (clase === undefined || (clase === 'marca' && trozo.inlineValue)) {
      throw new Error(`Opcion desconocida: ${escrita}`);
    }
    if (clase === 'marca') {
      leidos[trozo.name] = true;
    } else if (trozo.value === undefined) {
      throw new Error(`Falta el valor de ${trozo.rawName}`);
    } else {
      leidos[trozo.name] = trozo.value;
    }
  }
  return /** @type {{ -readonly [K in keyof O]?: O[K] extends 'marca' ? true : string }} */ (leidos);
}
