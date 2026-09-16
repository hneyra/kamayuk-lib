import type { Nombrados } from './componer.ts';
import type { CeldaDeLaTabla, DatoConNombre } from './datos.ts';
import type {
  AccionDeFila,
  AccionesPorFila,
  DefinicionDePantalla,
  PaginacionDeLaTabla,
  PiezaDeLaPantalla,
  ReglaDeLaInsignia,
  Texto,
  TonoDeInsignia,
  VacioDeLaTabla,
} from './tipos.ts';

/**
 * **Las tres reglas de #65 que no dibujan nada**: de que tono va una insignia, que acciones ofrece
 * una fila y que tablas no dicen por que estan vacias.
 *
 * Puras, y aparte de las piezas por lo mismo que `componer.ts` (#44): se prueban sin montar, y una
 * pieza del consumidor que pinte su propia tabla usa estas y no una copia.
 *
 * **Desde #61 son cinco**: ademas, que pagina se ve (`paginaDeLaTabla`) y que dice una celda
 * (`textoDeLaCelda`, `notaDeLaCelda`). La de la pagina es la que mas gana con ser pura: se prueba
 * con 54 129 filas sin montar ni una.
 */

/**
 * Los cuatro tonos, **comprobados contra el tipo** y no copiados a ciegas: si la `Insignia` gana un
 * quinto, este objeto deja de compilar por la clave que le falta. Hace falta un valor y no solo el
 * tipo porque `tonoDesde` lee un dato que llega en tiempo de ejecucion.
 */
const LOS_TONOS = { ok: true, atencion: true, mal: true, info: true } as const satisfies Record<
  TonoDeInsignia,
  true
>;

const esTono = (valor: DatoConNombre | undefined): valor is TonoDeInsignia =>
  typeof valor === 'string' && Object.hasOwn(LOS_TONOS, valor);

/** Un dato que no esta: ausente, `null` o `''`. Un `false` SI es un dato, como en `seCumple`. */
const falta = (valor: DatoConNombre | undefined): valor is undefined | null | '' =>
  valor === undefined || valor === null || valor === '';

/** Lo que se pinta en una insignia: su tono y su texto, ya en el idioma de la sesion. */
export interface InsigniaResuelta {
  readonly tono: TonoDeInsignia;
  readonly texto: string;
}

/**
 * **De que tono va una insignia, y que dice** (#65, AC-2).
 *
 * `valor` es lo que se pinta —la celda, el valor del campo— y `nombrados` los datos donde la regla
 * busca `segun` o `tonoDesde`: los de la fila en una tabla, los de la pantalla en un campo.
 *
 * **Nunca mira el texto para decidir el tono.** Con `casos` compara, sin convertir mas que un
 * booleano a `'true'`/`'false'`, contra las claves que la definicion escribio; con `tonoDesde` toma
 * el que el sistema ya decidio. Lo que no casa es `otro` o `siNoTrae`, que la definicion tambien
 * escribio.
 *
 * Devuelve `undefined` cuando **no hay nada que pintar**: el dato que decide no llego. Pintar
 * `otro` ahi seria afirmar un estado que nadie ha leido.
 *
 * `traducir` pasa por el `texto` del caso, que es una frase, y **nunca por el valor**, que es un
 * dato.
 */
export function resolverInsignia(
  regla: ReglaDeLaInsignia,
  valor: DatoConNombre | undefined,
  nombrados: Nombrados,
  traducir: (texto: string) => string,
): InsigniaResuelta | undefined {
  if ('tonoDesde' in regla) {
    if (falta(valor)) return undefined;
    const traido = nombrados?.get(regla.tonoDesde);
    return { tono: esTono(traido) ? traido : regla.siNoTrae, texto: String(valor) };
  }
  const decide = regla.segun === undefined ? valor : nombrados?.get(regla.segun);
  if (falta(decide)) return undefined;
  const clave = String(decide);
  const caso = Object.hasOwn(regla.casos, clave) ? regla.casos[clave] : undefined;
  const elegido = caso ?? regla.otro;
  if (elegido.texto !== undefined) return { tono: elegido.tono, texto: traducir(elegido.texto) };
  // Sin frase se pinta el valor. Si la regla decide por OTRO dato y el valor no esta, el que se
  // escribe es el que decidio: nunca una insignia vacia.
  return { tono: elegido.tono, texto: falta(valor) ? clave : String(valor) };
}

/**
 * **Las acciones que ofrece una fila**, en el orden de `acciones` (#65, `acciones-por-fila`).
 *
 * Sin `segun`, todas. Con `segun`, las que `ofrece` da para el valor del dato de la fila; un valor
 * que no esta —o un dato que no llego— no ofrece ninguna, como `actosDe` de la V6.
 *
 * **Una clave de `ofrece` que no esta en `acciones` revienta**, por lo mismo que `tipoDe` con un
 * octavo tipo de campo: dibujada, seria una fila con un boton de menos y ningun aviso.
 */
export function accionesQueOfrece<T extends Texto>(
  definicion: AccionesPorFila<T>,
  datosDeLaFila: Nombrados,
): readonly AccionDeFila[] {
  if (definicion.segun === undefined) return definicion.acciones;
  const valor = datosDeLaFila?.get(definicion.segun.dato);
  if (valor === undefined || valor === null) return [];
  const clave = String(valor);
  const ofrecidas = Object.hasOwn(definicion.segun.ofrece, clave) ? definicion.segun.ofrece[clave] : undefined;
  if (ofrecidas === undefined) return [];
  for (const ofrecida of ofrecidas) {
    if (!definicion.acciones.some((a) => a.clave === ofrecida)) {
      throw new Error(
        `«${ofrecida}» no es una accion de la tabla: \`segun.ofrece\` la da para «${clave}» y \`acciones\` no la declara.`,
      );
    }
  }
  return definicion.acciones.filter((a) => ofrecidas.includes(a.clave));
}

/**
 * Las tablas de la definicion que **no dicen por que estarian vacias**: su `clave` o, sin ella, su
 * titulo, en orden y sin repetir (#65, AC-3).
 *
 * La pantalla ya lo dice montada —con un aviso visible—, pero solo en la hoja que alguien abre y
 * solo el dia que la lista llega vacia. Con esto, cada sistema escribe una guarda que recorre sus
 * definiciones sin montar nada, como `piezasSinRegistrar`.
 */
export function tablasSinVacio(definicion: DefinicionDePantalla<PiezaDeLaPantalla>): readonly string[] {
  const faltan: string[] = [];
  for (const pieza of definicion.bloques) {
    if (pieza.tipo !== undefined && pieza.tipo !== 'bloque') continue;
    for (const tabla of [...(pieza.tabla === undefined ? [] : [pieza.tabla]), ...(pieza.tablas ?? [])]) {
      // Una tabla cuyas filas VIAJAN en la definicion (#61) nunca puede llegar vacia: no lee datos.
      if ((tabla.filasDeContenido ?? []).length > 0) continue;
      if (diceElVacio(tabla.vacio, tabla.vacioConSalida)) continue;
      const nombre = tabla.clave ?? tabla.titulo;
      if (!faltan.includes(nombre)) faltan.push(nombre);
    }
  }
  return faltan;
}

/** Si una tabla dice por que estaria vacia. `''` no lo es —ni suelto ni como titulo—: es muda. */
function diceElVacio<T extends Texto>(vacio: T | undefined, conSalida: VacioDeLaTabla<T> | undefined): boolean {
  if (conSalida !== undefined && conSalida.titulo !== '') return true;
  return vacio !== undefined && vacio !== '';
}

/**
 * **Lo que se lee en una celda, y `null` cuando no hay dato** (#61, `celda-nula-con-palabra-y-nota`).
 *
 * `null` es «no hay», y quien dibuja pone entonces la palabra de la tabla, nunca `''` ni un `0`.
 * Una **cadena** es lo que se lee, tal cual y sin traducir: es un dato, como en #65.
 */
export function textoDeLaCelda(celda: CeldaDeLaTabla): string | null {
  return typeof celda === 'string' ? celda : celda.texto;
}

/** La nota de una celda: por que dice lo que dice, o por que no dice nada. No se traduce. */
export function notaDeLaCelda(celda: CeldaDeLaTabla): string | undefined {
  return typeof celda === 'string' ? undefined : celda.nota;
}

/** Lo que se sabe de la pagina que se ve: cual es, cuantas hay y si detras viene otra. */
export interface PaginaDeUnaTabla {
  /** Empezando en cero, como viaja. Nunca negativa. */
  readonly pagina: number;
  readonly tamano: number;
  /** Cuantas hay, si se sabe. En servidor lo dice el servidor; en cliente, las filas. */
  readonly paginas?: number;
  /** Si detras viene otra. En servidor lo dice el servidor: contar las filas recibidas mentiria. */
  readonly hayMas: boolean;
  /** Desde donde y hasta donde se corta, **solo en cliente**. En servidor, las filas ya son la pagina. */
  readonly recorte?: { readonly desde: number; readonly hasta: number };
}

/**
 * **Que pagina se ve** (#61, `paginacion-y-orden-en-el-servidor` y `tablas-grandes`).
 *
 * Pura y aparte de la pieza por lo mismo que `resolverInsignia`: la cuenta de «cuantas paginas hay»
 * y «hay otra detras» es donde se cuelan los defectos de uno en uno, y aqui se prueba sin montar
 * nada — incluidas las 54 129 filas, que en una prueba de DOM tardarian minutos.
 *
 * `enLaRuta` y `tamanoEnLaRuta` llegan ya leidos, como texto, porque una ruta es texto. Lo que no
 * sea un entero ≥ 0 **no se corrige a medias**: se cae a la primera pagina y al tamano de la
 * definicion, que es lo unico que se sabe cierto.
 */
export function paginaDeLaTabla(
  paginacion: PaginacionDeLaTabla,
  sitio: { readonly pagina: string | null; readonly tamano: string | null },
  delServidor: { readonly hayMas?: DatoConNombre; readonly paginas?: DatoConNombre },
  cuantasFilas: number,
): PaginaDeUnaTabla {
  const tamano = enteroPositivo(sitio.tamano) ?? paginacion.tamano;
  const pedida = enteroNoNegativo(sitio.pagina) ?? 0;
  if (paginacion.en === 'cliente') {
    // Con las filas delante, «cuantas paginas» es una cuenta y no una suposicion. Una lista vacia
    // sigue teniendo UNA pagina: la que dice por que esta vacia.
    const paginas = Math.max(1, Math.ceil(cuantasFilas / tamano));
    // Una pagina mas alla del final deja la tabla en blanco sin decir nada: se acota a la ultima.
    const pagina = Math.min(pedida, paginas - 1);
    const desde = pagina * tamano;
    return { pagina, tamano, paginas, hayMas: desde + tamano < cuantasFilas, recorte: { desde, hasta: desde + tamano } };
  }
  const paginas = enteroPositivo(comoTexto(delServidor.paginas));
  return {
    pagina: pedida,
    tamano,
    ...(paginas === undefined ? {} : { paginas }),
    // Lo dice el servidor, y solo `true` lo dice: un dato que no llego no afirma que haya mas.
    hayMas: delServidor.hayMas === true || delServidor.hayMas === 'true',
  };
}

const comoTexto = (valor: DatoConNombre | undefined): string | null =>
  valor === undefined || valor === null || typeof valor === 'boolean' ? null : valor;

/** Un entero ≥ 0 escrito en una ruta, o `undefined` si eso no es lo que hay. */
function enteroNoNegativo(texto: string | null): number | undefined {
  if (texto === null || !/^\d+$/.test(texto)) return undefined;
  return Number(texto);
}

/** Un entero ≥ 1. El tamano cero dejaria la tabla sin filas y dividiendo por cero. */
function enteroPositivo(texto: string | null): number | undefined {
  const entero = enteroNoNegativo(texto);
  return entero === undefined || entero === 0 ? undefined : entero;
}
