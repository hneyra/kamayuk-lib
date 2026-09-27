import { readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

import { LineCounter, isMap, isScalar, isSeq, parseDocument } from 'yaml';

import { RAIZ } from './texto.ts';

/**
 * **Un workflow se lee como YAML, no como texto** (#114).
 *
 * <h2>El defecto que esto cierra</h2>
 *
 * Hasta #114 las guardas de la CI leian `paquetes.yml` como una cadena y le preguntaban si
 * «contenia» algo. Y un workflow de esta casa es, sobre todo, comentario: explica por que cada paso
 * es como es, y al explicarlo NOMBRA lo que el paso hace. Medido en `los-consumidores-se-miran`:
 * quitado el paso de `jq`, quitada la linea `include: ${{ fromJSON(…) }}` y renombrado el paso del
 * veredicto, **las tres comprobaciones siguieron en verde**, porque `consumidores.json`, `fromJSON`
 * y «El veredicto» los decian los comentarios de al lado. Una guarda satisfecha por la frase que
 * explica la orden, y no por la orden.
 *
 * Y cada guarda se habia hecho su propio remedio, con cuatro criterios distintos para el mismo
 * archivo: ninguno; quitar las lineas que empiezan por `#` —que no ve un `run: x # --comprobar`,
 * donde el `#` tambien es comentario de YAML—; una ventana de lineas alrededor de un paso; y un
 * patron anclado sobre cada linea. **Lo que es comentario lo decide el analizador de YAML**, que es
 * el que sabe que `#` dentro de un `run: |` es texto del guion y detras de un escalar plano no.
 *
 * <h2>Lo que este modulo da, y lo que no</h2>
 *
 * `leerWorkflow` y `analizarWorkflow` devuelven el OBJETO, y las guardas preguntan por su forma:
 * «el trabajo `consumidores` tiene `strategy.matrix.include` con `fromJSON`», «hay un paso cuyo
 * `name` es el del veredicto». Los accesores (`trabajoDe`, `pasosDe`, `ordenDe`) no suponen que el
 * archivo tenga la forma buena: lo que falta o no es un mapa vuelve como `null` o como lista vacia,
 * y la guarda que lo pide sale roja diciendo que no lo encontro, en vez de reventar con un `TypeError`
 * que no dice nada del workflow.
 *
 * `usesConSuLinea` es lo unico que necesita el DOCUMENTO y no el objeto: `las-acciones-corren-en-
 * node-24` escribe `archivo:linea` en su rojo, y la linea se pierde al pasar a objeto.
 *
 * Un YAML que no se puede analizar —o con una clave repetida, que el analizador trata como error y
 * GitHub resolveria quedandose con una de las dos— **lanza**, nombrando el archivo: no hay forma
 * que preguntarle, y devolver un objeto vacio dejaria a cada guarda decidir sola que significa.
 */

/** Un mapa de YAML ya pasado a objeto. De su contenido no se supone nada. */
export type Mapa = Readonly<Record<string, unknown>>;

export const esMapa = (valor: unknown): valor is Mapa =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

/** Un `uses:` de un workflow, con el sitio donde esta escrito. */
export interface UsoDeAccion {
  readonly archivo: string;
  /** Numero de linea, empezando en 1. */
  readonly linea: number;
  /** Lo que venia detras de `uses:`, ya analizado: una cadena en un workflow sano, y si no, lo que fuera. */
  readonly valor: unknown;
}

function documentoDe(texto: string, archivo: string, lineas?: LineCounter) {
  const documento = parseDocument(texto, lineas === undefined ? {} : { lineCounter: lineas });
  if (documento.errors.length > 0) {
    throw new Error(
      `«${archivo}» no es un YAML que se pueda leer:\n` +
        documento.errors.map((error) => `  ${error.message}`).join('\n'),
    );
  }
  return documento;
}

/**
 * El workflow como objeto, a partir de su texto. Recibe el TEXTO para que las muestras puedan
 * ensenar un workflow que este arbol no tiene —o el de este arbol con una rotura puesta— sin
 * escribir un archivo.
 */
export function analizarWorkflow(texto: string, archivo = '<texto>'): Mapa {
  const objeto: unknown = documentoDe(texto, archivo).toJS();
  if (!esMapa(objeto)) throw new Error(`«${archivo}» no es un mapa de YAML: no tiene forma de workflow`);
  return objeto;
}

/** El workflow del disco como objeto. Una ruta relativa se lee desde la raiz de este repositorio. */
export function leerWorkflow(ruta: string): Mapa {
  const completa = isAbsolute(ruta) ? ruta : join(RAIZ, ruta);
  return analizarWorkflow(readFileSync(completa, 'utf8'), ruta);
}

/** El trabajo `id` de `jobs`, o `null` si no esta o no es un mapa. */
export function trabajoDe(workflow: Mapa, id: string): Mapa | null {
  const trabajo = valorEn(workflow, 'jobs', id);
  return esMapa(trabajo) ? trabajo : null;
}

/** Los pasos de un trabajo que son mapas. Sin trabajo, o sin `steps` en forma de lista, ninguno. */
export function pasosDe(trabajo: Mapa | null): Mapa[] {
  const pasos = trabajo?.['steps'];
  return Array.isArray(pasos) ? pasos.filter(esMapa) : [];
}

/**
 * El valor en un camino de claves, o `undefined` si algun tramo falta o no es un mapa:
 * `valorEn(trabajo, 'strategy', 'matrix', 'include')`.
 */
export function valorEn(desde: unknown, ...camino: readonly string[]): unknown {
  let actual = desde;
  for (const clave of camino) {
    if (!esMapa(actual) || !Object.hasOwn(actual, clave)) return undefined;
    actual = actual[clave];
  }
  return actual;
}

/**
 * **Lo que un paso ejecuta**: su `run`, sin las lineas que el SHELL no ejecuta.
 *
 * El YAML ya quito sus comentarios —un `run: x # --comprobar` llega como `x`—, pero dentro de un
 * bloque `run: |` un `# …` es texto del guion, y alli el que lo ignora es bash. Asi que aqui se
 * quitan las lineas que, dentro del guion, empiezan por `#`: son las que bash no corre. Lo que no se
 * intenta es partir `orden # comentario` a mitad de linea, porque decidir eso exige saber si el `#`
 * esta dentro de unas comillas, y un `echo "#10"` es texto que sale.
 *
 * Sin `run` —un paso con `uses:`—, la cadena vacia: no ejecuta ninguna orden propia.
 */
export function ordenDe(paso: Mapa): string {
  const run = paso['run'];
  if (typeof run !== 'string') return '';
  return run
    .split('\n')
    .filter((linea) => !linea.trim().startsWith('#'))
    .join('\n');
}

/**
 * **Cada `uses:` que GitHub ejecuta**, con su linea: el de cada paso (`jobs.<id>.steps[].uses`) y
 * el de un trabajo que llama a un workflow reutilizable (`jobs.<id>.uses`). En ningun otro sitio de
 * un workflow un `uses:` hace nada.
 *
 * Un `steps` que no es una lista, o un paso que no es un mapa, no se salta en silencio: se le pide
 * al que llama que lo trate como ilegible, y por eso esos casos vuelven como un uso con `valor`
 * `undefined`, en la linea donde esta lo que no se supo leer.
 */
export function usesConSuLinea(texto: string, archivo: string): UsoDeAccion[] {
  const lineas = new LineCounter();
  const documento = documentoDe(texto, archivo, lineas);
  const lineaDe = (nodo: unknown): number => {
    const rango = (nodo as { range?: readonly number[] } | null)?.range;
    return rango === undefined ? 0 : lineas.linePos(rango[0] ?? 0).line;
  };
  const uso = (nodo: unknown, contenedor: unknown): UsoDeAccion => ({
    archivo,
    linea: lineaDe(nodo ?? contenedor),
    valor: isScalar(nodo) ? nodo.value : undefined,
  });

  const trabajos = isMap(documento.contents) ? documento.contents.get('jobs', true) : undefined;
  if (!isMap(trabajos)) return [];

  const salida: UsoDeAccion[] = [];
  for (const par of trabajos.items) {
    const trabajo = par.value;
    if (!isMap(trabajo)) continue;
    if (trabajo.has('uses')) salida.push(uso(trabajo.get('uses', true), trabajo));
    if (!trabajo.has('steps')) continue;
    const pasos = trabajo.get('steps', true);
    if (!isSeq(pasos)) {
      salida.push({ archivo, linea: lineaDe(pasos ?? trabajo), valor: undefined });
      continue;
    }
    for (const paso of pasos.items) {
      if (!isMap(paso)) {
        salida.push({ archivo, linea: lineaDe(paso), valor: undefined });
        continue;
      }
      if (paso.has('uses')) salida.push(uso(paso.get('uses', true), paso));
    }
  }
  return salida;
}
