import type { Nombrados } from './componer.ts';
import type { DatoConNombre } from './datos.ts';
import type {
  AccionDeFila,
  AccionesPorFila,
  DefinicionDePantalla,
  PiezaDeLaPantalla,
  ReglaDeLaInsignia,
  Texto,
  TonoDeInsignia,
} from './tipos.ts';

/**
 * **Las tres reglas de #65 que no dibujan nada**: de que tono va una insignia, que acciones ofrece
 * una fila y que tablas no dicen por que estan vacias.
 *
 * Puras, y aparte de las piezas por lo mismo que `componer.ts` (#44): se prueban sin montar, y una
 * pieza del consumidor que pinte su propia tabla usa estas y no una copia.
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
      // `''` tampoco es un motivo: es una tabla muda escrita de otra forma.
      if (tabla.vacio !== undefined && tabla.vacio !== '') continue;
      const nombre = tabla.clave ?? tabla.titulo;
      if (!faltan.includes(nombre)) faltan.push(nombre);
    }
  }
  return faltan;
}
