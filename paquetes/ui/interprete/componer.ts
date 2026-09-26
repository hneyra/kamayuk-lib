import { recorrerLasPiezas } from './composicion.ts';
import type { DatoConNombre } from './datos.ts';
import type {
  Condicion,
  DefinicionDeBloque,
  DefinicionDePantalla,
  PiezaDeLaPantalla,
  Texto,
  TextoConMarcas,
  TramoConMarca,
} from './tipos.ts';

/**
 * **Las tres reglas de #44 que no dibujan nada**: que dice un `Texto`, cuando existe una pieza y
 * que claves del consumidor faltan.
 *
 * Son funciones puras, y por eso van aparte de las piezas: se prueban sin montar, y una pieza del
 * consumidor —que recibe `datos` y `traducir`— puede usar las mismas en vez de escribir su copia.
 */

/** Los datos con nombre, tal como llegan en `DatosDeLaPantalla.nombrados`. */
export type Nombrados = ReadonlyMap<string, DatoConNombre> | undefined;

/**
 * **Si falta el dato** (#117): ausente, `null` o `''`. **Un `false` SI es un dato**, y tambien lo son
 * `' '` y `'0'`: esto no interpreta el valor, solo mira si llego.
 *
 * Es la regla de `hay` en `seCumple`, del dato ausente de `resolverTexto`, de la peticion de una
 * accion que `va` (`acciones.ts`) y de la insignia y la fila elegible (`reglas-de-las-tablas.ts`).
 * Hasta #117 estaba escrita en esos cuatro sitios, con el comentario copiado en dos; antes de
 * unificarlas se midio que las cuatro daban la misma tabla (`falta-el-dato.test.ts`).
 */
export const faltaElDato = (valor: DatoConNombre | undefined): valor is undefined | null | '' =>
  valor === undefined || valor === null || valor === '';

/** Un dato como texto. `true`/`false` se escriben como tales: quien quiera «Si» usa `segun`. */
function comoTexto(valor: DatoConNombre | undefined, ausente: string): string {
  if (faltaElDato(valor)) return ausente;
  return typeof valor === 'boolean' ? String(valor) : valor;
}

/** El hueco de una plantilla: `{nombre}`, con puntos si el nombre los lleva. */
const HUECO = /\{([A-Za-z0-9_.-]+)\}/g;

/**
 * Lo que dice un `Texto`.
 *
 * **`traducir` pasa por la frase y nunca por el dato**: en una plantilla se traduce la plantilla
 * y DESPUES se ponen los datos; en `segun`, el caso elegido; en `desde`, nada. Un dato que no llego
 * se escribe `ausente`, que es una palabra del saco y no un cero.
 */
export function resolverTexto(
  texto: Texto,
  nombrados: Nombrados,
  traducir: (texto: string) => string,
  ausente: string,
): string {
  if (typeof texto === 'string') return traducir(texto);
  if ('desde' in texto) return comoTexto(nombrados?.get(texto.desde), ausente);
  if ('plantilla' in texto) {
    return traducir(texto.plantilla).replace(HUECO, (_hueco, nombre: string) =>
      comoTexto(nombrados?.get(nombre), ausente),
    );
  }
  const valor = nombrados?.get(texto.segun);
  const clave = valor === undefined || valor === null ? undefined : String(valor);
  const caso = clave === undefined ? undefined : texto.casos[clave];
  if (caso !== undefined) return traducir(caso);
  return texto.otro === undefined ? ausente : traducir(texto.otro);
}

/** Un tramo de una frase con marcas, ya resuelto: que elemento lleva y que dice (#86). */
export interface TramoResuelto {
  readonly marca: 'texto' | 'codigo' | 'fuerte';
  readonly dice: string;
}

/**
 * **Lo que dice una frase con marcas, tramo a tramo** (#86, `texto-con-marcas`).
 *
 * Pura, como `resolverTexto`: quien dibuja pone cada tramo en su elemento (`ProsaConMarcas`), y una
 * pieza del consumidor que quiera la misma frase usa esto y no una copia. **El tramo `codigo` no pasa
 * por `traducir`**: es codigo, como el nombre de un campo del contrato, y traducirlo lo cambia. Los
 * datos de cada tramo se ponen igual que en `resolverTexto`, con `ausente` si no llegaron.
 */
export function resolverMarcas(
  marcas: TextoConMarcas,
  nombrados: Nombrados,
  traducir: (texto: string) => string,
  ausente: string,
): readonly TramoResuelto[] {
  return marcas.map((tramo): TramoResuelto => {
    if (tramo.codigo !== undefined) {
      return { marca: 'codigo', dice: resolverTexto(tramo.codigo, nombrados, (t) => t, ausente) };
    }
    if (tramo.fuerte !== undefined) return { marca: 'fuerte', dice: resolverTexto(tramo.fuerte, nombrados, traducir, ausente) };
    return { marca: 'texto', dice: resolverTexto(tramo.texto, nombrados, traducir, ausente) };
  });
}

/**
 * **Los nombres de dato que un texto lee**: los huecos de una plantilla, `desde`, `segun` y, en una
 * frase con marcas, los de cada tramo, en su orden (#66; las marcas desde #86).
 *
 * Es el analizador paralelo a `resolverTexto`, y vive a su lado para que no se desincronicen: lo que
 * uno pone, el otro lo nombra. Lo usan las acciones para no dejar viajar un hueco (`peticionDe`) ni
 * guardar un texto que no llego (`guarda`), y sale por el indice para la guarda del sistema que
 * calcula que datos tiene que poner en `nombrados`: **un dato leido solo dentro de una marca que
 * esto no nombrara no lo pediria nadie**, y la frase saldria con la raya del dato ausente.
 */
export function datosQueLee(texto: Texto | TextoConMarcas): readonly string[] {
  if (esTextoConMarcas(texto)) {
    return texto.flatMap((tramo) => datosQueLee(contenidoDelTramo(tramo)));
  }
  if (typeof texto === 'string') return [];
  if ('desde' in texto) return [texto.desde];
  if ('segun' in texto) return [texto.segun];
  return [...texto.plantilla.matchAll(HUECO)].flatMap((hueco) => (hueco[1] === undefined ? [] : [hueco[1]]));
}

/** El `Texto` de un tramo, sea cual sea su marca. */
function contenidoDelTramo(tramo: TramoConMarca): Texto {
  if (tramo.codigo !== undefined) return tramo.codigo;
  if (tramo.fuerte !== undefined) return tramo.fuerte;
  return tramo.texto;
}

/** Si un texto es una frase con marcas. Un `Texto` nunca es una lista. */
const esTextoConMarcas = (texto: Texto | TextoConMarcas): texto is TextoConMarcas => Array.isArray(texto);

/**
 * Si una pieza existe. Sin condicion, siempre.
 *
 * `hay` es «ni ausente, ni `null`, ni `''`»; un `false` SI es un dato. `vale` compara sin
 * convertir: `false` no vale `'false'`, porque un dato que llega como texto donde se esperaba un
 * booleano es un defecto de quien lo pone, y convertirlo aqui lo taparia.
 */
export function seCumple(condicion: Condicion | undefined, nombrados: Nombrados): boolean {
  if (condicion === undefined) return true;
  const valor = nombrados?.get(condicion.dato);
  if ('hay' in condicion) {
    return !faltaElDato(valor) === condicion.hay;
  }
  return valor !== undefined && valor === condicion.vale;
}

/**
 * Si una pieza es un bloque: los de #27 no llevan `tipo`, y siguen siendolo.
 *
 * **Sale por el indice desde #102.** La guarda que un sistema escribe sobre sus definiciones —la
 * que `piezasSinRegistrar` y `tablasSinVacio` existen para permitir— necesita distinguir un bloque
 * de las demas piezas, y sin esto `rentas` lo copio: una segunda definicion de «que es un bloque»
 * que no se entera el dia que esta cambie.
 */
export function esBloque(pieza: PiezaDeLaPantalla): pieza is DefinicionDeBloque<Texto> {
  return pieza.tipo === undefined || pieza.tipo === 'bloque';
}

/**
 * Las claves de pieza del consumidor que la definicion usa y el registro no trae, en su orden y
 * sin repetir.
 *
 * La pantalla ya lo dice montada —con un aviso visible en el sitio—, pero esa mitad solo se ve en
 * la hoja que alguien abre. Con esto, cada sistema escribe una guarda que recorre sus definiciones
 * sin montar nada.
 *
 * <h2>Por que el registro es `Record<string, unknown>` y no un registro de componentes (#102)</h2>
 *
 * Porque lo unico que esta funcion le pregunta al registro es **si trae una clave**
 * (`Object.hasOwn`), y la firma pide lo que el cuerpo lee: ni un componente, ni sus props.
 *
 * La de antes, `Readonly<Record<string, ComponentType<never>>>`, queria decir «cualquier
 * componente» y **no aceptaba el registro que esta misma libreria publica**: un
 * `PiezasDelConsumidor` declarado con su tipo —lo que escribe un sistema— no compilaba, porque
 * `ComponentType` incluye `ComponentClass`, cuyo `defaultProps?: Partial<P>` con `P = never` solo
 * admite `undefined`. Da igual lo que el registro lleve dentro: basta el tipo declarado. `rentas`
 * lo tapo con un `as` al estrenar `delConsumidor`; el rojo literal de `tsc` esta en `HISTORY.md`,
 * y la llamada sin `as` se queda como barrera en `costuras-del-consumidor.test.tsx`.
 *
 * `PiezasDelConsumidor` a secas tambien lo arreglaba, y se midio contra seis registros: los dos
 * tipos aceptan los mismos que acepta `<Pantalla piezas>` —el publicado, un `Record` con las
 * claves en una union, uno de `FunctionComponent` y un literal `as const`— y los dos rechazan un
 * registro declarado como `interface`, igual que `<Pantalla>`. **Solo difieren en uno que
 * `<Pantalla>` tampoco monta** (un componente que exige una prop que el interprete no da). No se
 * eligio por eso, sino por lo que el defecto de antes deja dicho: la firma exigia algo del VALOR que el
 * cuerpo nunca leia, y eso fue lo que se rompio. Con `unknown`, lo que cambie manana en el tipo de
 * una pieza —sus props, su forma— no puede volver a romper la guarda de nadie; que cada valor sea
 * un componente montable lo comprueba `<Pantalla piezas>` al compilar, que es donde importa. Y de
 * paso no se cierra un ciclo de tipos: `PiezaDeLaPantalla.tsx`, donde vive `PiezasDelConsumidor`,
 * ya importa este archivo.
 */
export function piezasSinRegistrar(
  definicion: DefinicionDePantalla<PiezaDeLaPantalla>,
  piezas: Readonly<Record<string, unknown>> | undefined,
): readonly string[] {
  const faltan: string[] = [];
  // Con las anidadas (#67): una pieza del consumidor dentro de una pestana cerrada tambien falta.
  for (const { pieza } of recorrerLasPiezas(definicion)) {
    if (pieza.tipo !== 'delConsumidor') continue;
    if (piezas !== undefined && Object.hasOwn(piezas, pieza.clave)) continue;
    if (!faltan.includes(pieza.clave)) faltan.push(pieza.clave);
  }
  return faltan;
}
