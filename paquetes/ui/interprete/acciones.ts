import { seEscribe, tipoDe } from '../shadcn/campos.ts';
import type { TextosDeLaPantalla } from '../textos.tsx';
import { datosQueLee, type Nombrados, resolverTexto, seCumple } from './componer.ts';
import type {
  CampoDelActo,
  DefinicionDeAccion,
  DefinicionDeActo,
  DestinoDeUnaAccion,
  GuardadoComoArchivo,
  Impedimento,
  ManejadoresDeLasAcciones,
  ManejadoresDeLosActos,
  NavegacionDeLaPantalla,
  PeticionDeNavegacion,
} from './tipos-de-los-actos.ts';
import type { Texto } from './tipos.ts';

/**
 * **Las reglas de #66 que no dibujan nada**: por que un boton no se puede pulsar, que viaja al
 * enviar un acto y a donde lleva una accion.
 *
 * Son funciones puras por lo mismo que las de `componer.ts`: se prueban sin montar, y la decision de
 * si un boton esta impedido **y con que motivo** es la que hay que poder recorrer entera. Escondida
 * dentro del JSX, un motivo que se pierde no lo delata nada: el boton se ve apagado y ya.
 *
 * Todas devuelven **un** motivo, el primero que aplica, y nunca una lista: `normativa` lo midio en su
 * V6 (H06) —el mismo motivo en el `title`, en el pie y en el aviso— y un boton con tres motivos a la
 * vez obliga a quien lo lee a adivinar cual arreglar primero.
 */

type Traducir = (texto: string) => string;

/** Un `Texto` resuelto con las palabras del saco. */
const resolver = (texto: Texto, nombrados: Nombrados, traducir: Traducir, textos: TextosDeLaPantalla) =>
  resolverTexto(texto, nombrados, traducir, textos.datoAusente);

/** El motivo del primer impedimento que se cumple, ya resuelto. `undefined`: ninguno impide. */
export function motivoDeLosImpedimentos(
  impedimentos: readonly Impedimento[] | undefined,
  nombrados: Nombrados,
  traducir: Traducir,
  textos: TextosDeLaPantalla,
): string | undefined {
  const primero = impedimentos?.find((impedimento) => seCumple(impedimento.si, nombrados));
  return primero === undefined ? undefined : resolver(primero.motivo, nombrados, traducir, textos);
}

/** Un dato que no esta: ausente, `null` o `''`. Un `false` SI es un dato. */
const falta = (nombrados: Nombrados, nombre: string): boolean => {
  const valor = nombrados?.get(nombre);
  return valor === undefined || valor === null || valor === '';
};

/**
 * La peticion de una accion que `va`, o el nombre del primer dato que le falta.
 *
 * **Nunca viaja un hueco**: con un dato ausente, `resolverTexto` escribe la palabra del saco —«—»—, y
 * esa raya acabaria en la direccion como si fuera el sujeto. Asi que antes de resolver se mira que
 * esten todos los datos que el sujeto y los parametros nombran.
 */
export function peticionDe(
  va: DestinoDeUnaAccion,
  nombrados: Nombrados,
  traducir: Traducir,
  textos: TextosDeLaPantalla,
): { readonly peticion: PeticionDeNavegacion } | { readonly faltaElDato: string } {
  const textosQueViajan = [
    ...(va.sujeto === undefined ? [] : [va.sujeto]),
    ...Object.values(va.parametros ?? {}),
  ];
  const ausente = textosQueViajan.flatMap(datosQueLee).find((nombre) => falta(nombrados, nombre));
  if (ausente !== undefined) return { faltaElDato: ausente };
  return {
    peticion: {
      hoja: va.hoja,
      ...(va.sujeto === undefined ? {} : { sujeto: resolver(va.sujeto, nombrados, traducir, textos) }),
      ...(va.parametros === undefined
        ? {}
        : { parametros: resolverTodos(va.parametros, nombrados, traducir, textos) }),
    },
  };
}

/** Un registro de textos, resuelto clave a clave. Las claves son codigo y no se traducen. */
export function resolverTodos(
  registro: Readonly<Record<string, Texto>> | undefined,
  nombrados: Nombrados,
  traducir: Traducir,
  textos: TextosDeLaPantalla,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Object.entries(registro ?? {}).map(([clave, texto]) => [clave, resolver(texto, nombrados, traducir, textos)]),
  );
}

/** Lo que una accion necesita para decidir si se puede pulsar. */
export interface ContextoDeUnaAccion {
  readonly nombrados: Nombrados;
  readonly traducir: Traducir;
  readonly textos: TextosDeLaPantalla;
  readonly actos: ManejadoresDeLosActos | undefined;
  readonly alHacer: ManejadoresDeLasAcciones | undefined;
  readonly navegacion: NavegacionDeLaPantalla | undefined;
  /** Si la operacion de esta accion esta pendiente (solo las que `hace`). */
  readonly enCurso: boolean;
  /**
   * Si este navegador sabe descargar (solo las que `guarda`, #86). Sin el, se supone que si: quien
   * llama sin decirlo es el de antes de #86, que no tenia ninguna accion que lo necesitara.
   */
  readonly ofreceDescarga?: boolean;
}

/**
 * **Por que no se puede pulsar una accion**, o `undefined` si se puede (#66, `impedido-con-motivo`).
 *
 * En este orden: en curso · lo que la definicion declara · nadie la atiende · y, si `va`, que el
 * catalogo no ofrezca la hoja o que falte un dato. Una que `guarda` (#86) no la atiende nadie del
 * sistema —la entrega el navegador—: la impide que el navegador no sepa descargar, o que el texto o
 * su nombre no hayan llegado. Lo de la definicion va antes que lo de la costura
 * porque es lo que la persona puede arreglar: «falta elegir un grupo» se arregla eligiendo, y «nadie
 * atiende esto» no se arregla desde la pantalla.
 */
export function motivoDeLaAccion(accion: DefinicionDeAccion, contexto: ContextoDeUnaAccion): string | undefined {
  const { nombrados, traducir, textos } = contexto;
  if (contexto.enCurso) return textos.enCurso;
  const declarado = motivoDeLosImpedimentos(accion.impedida, nombrados, traducir, textos);
  if (declarado !== undefined) return declarado;
  if (accion.abre !== undefined) {
    // Abrir un formulario que no va a poder enviarse haria rellenarlo para nada: se dice ANTES de
    // abrirlo. Si llega abierto por la ruta, su primario lo dice tambien, en su sitio.
    if (!atiende(contexto.actos, accion.abre)) return textos.sinQuienLoAtienda(accion.abre);
    // Y un acto que se abre sobre una fila no se abre sin la fila: actuaria a ciegas.
    const ausente = Object.values(accion.con ?? {})
      .flatMap(datosQueLee)
      .find((nombre) => falta(nombrados, nombre));
    return ausente === undefined ? undefined : textos.faltaElDato(ausente);
  }
  if (accion.hace !== undefined) {
    return atiende(contexto.alHacer, accion.hace) ? undefined : textos.sinQuienLoAtienda(accion.hace);
  }
  if (accion.guarda !== undefined) {
    // Primero el navegador: si no sabe descargar, esperar a que llegue el texto no arregla nada.
    if (contexto.ofreceDescarga === false) {
      return accion.sinDescarga === undefined ? textos.sinDescarga : resolver(accion.sinDescarga, nombrados, traducir, textos);
    }
    if (textoQueSeGuarda(accion.guarda, nombrados) === undefined) return textos.faltaParaGuardar(accion.guarda.texto.desde);
    // Y el nombre: con un dato ausente se guardaria un archivo llamado «—».
    const ausente = datosQueLee(accion.guarda.nombre).find((nombre) => falta(nombrados, nombre));
    return ausente === undefined ? undefined : textos.faltaParaGuardar(ausente);
  }
  if (contexto.navegacion === undefined) return textos.sinNavegacion;
  if (!contexto.navegacion.ofrece(accion.va.hoja)) return textos.hojaNoOfrecida;
  const resuelta = peticionDe(accion.va, nombrados, traducir, textos);
  return 'faltaElDato' in resuelta ? textos.faltaElDato(resuelta.faltaElDato) : undefined;
}

/**
 * **El texto que una accion `guarda` pone en el archivo**, tal como esta en `nombrados`, o
 * `undefined` si no llego (#86, `guardar-como-archivo`).
 *
 * Tal cual: sin `traducir`, sin plantilla y sin `trim`, porque es lo que se verifico. Un booleano no
 * es un texto, y `''` no es nada que guardar.
 */
export function textoQueSeGuarda(guarda: GuardadoComoArchivo, nombrados: Nombrados): string | undefined {
  const texto = nombrados?.get(guarda.texto.desde);
  return typeof texto === 'string' && texto !== '' ? texto : undefined;
}

/** Si un registro trae manejador para una clave. `toString` no cuenta, como en `piezas` (#44). */
export const atiende = (registro: Readonly<Record<string, unknown>> | undefined, clave: string): boolean =>
  registro !== undefined && Object.hasOwn(registro, clave);

/** Lo tecleado en un acto, por `nombre`. */
export type ValoresDelActo = Readonly<Record<string, string | boolean>>;

/** Si un campo del acto se escribe: los de solo lectura se ensenan y no viajan. */
export const seEscribeElCampo = (campo: CampoDelActo): boolean => seEscribe(tipoDe(campo.tipo));

/** Un valor vacio: sin nada, o solo blancos. Una casilla SIEMPRE tiene valor: desmarcada es `false`. */
const vacio = (valor: string | boolean | undefined): boolean =>
  valor === undefined || (typeof valor === 'string' && valor.trim() === '');

/** Los campos obligatorios que estan vacios, en su orden. */
export function camposQueFaltan(campos: readonly CampoDelActo[], valores: ValoresDelActo): readonly CampoDelActo[] {
  return campos.filter(
    (campo) => seEscribeElCampo(campo) && campo.opcional !== true && tipoDe(campo.tipo) !== 'c' && vacio(valores[campo.nombre]),
  );
}

/** Lo que la observacion le pide todavia, o `undefined` si esta dentro de su largo. */
export function motivoDeLaObservacion(
  acto: DefinicionDeActo,
  observacion: string,
  textos: TextosDeLaPantalla,
): string | undefined {
  const tiene = observacion.trim().length;
  const { minimo, maximo } = acto.observacion.largo;
  if (tiene < minimo) return textos.observacionCorta(minimo, tiene);
  if (tiene > maximo) return textos.observacionLarga(maximo, tiene);
  return undefined;
}

/** Lo que el primario de un acto necesita para decidir. */
export interface ContextoDeUnActo {
  readonly valores: ValoresDelActo;
  readonly observacion: string;
  readonly enCurso: boolean;
  readonly nombrados: Nombrados;
  readonly traducir: Traducir;
  readonly textos: TextosDeLaPantalla;
  readonly atendido: boolean;
}

/**
 * **Por que no se puede enviar un acto**, o `undefined` si se puede (#66, AC-2).
 *
 * En este orden, y uno solo: escribiendo · lo que la definicion impide · nadie lo atiende · lo que
 * falta rellenar · la observacion. **La observacion va la ultima**, igual que su campo: primero los
 * obligatorios, que es lo que `normativa` midio en su V6 (H06). Pero va, siempre: sin ella no se
 * guarda, que es la regla 10.
 */
export function motivoDelActo(acto: DefinicionDeActo, contexto: ContextoDeUnActo): string | undefined {
  const { textos, traducir, nombrados } = contexto;
  if (contexto.enCurso) return textos.escribiendo;
  const declarado = motivoDeLosImpedimentos(acto.impedido, nombrados, traducir, textos);
  if (declarado !== undefined) return declarado;
  if (!contexto.atendido) return textos.sinQuienLoAtienda(acto.clave);
  const faltan = camposQueFaltan(acto.campos, contexto.valores);
  if (faltan.length > 0) return textos.faltaRellenar(faltan.map((campo) => traducir(campo.etiqueta)));
  return motivoDeLaObservacion(acto, contexto.observacion, textos);
}

/**
 * Lo que viaja al manejador: los valores que se escriben, sin los opcionales en blanco, y la
 * observacion recortada. «Lo opcional vacio no viaja» (`normativa`, H05a).
 */
export function valoresQueViajan(campos: readonly CampoDelActo[], valores: ValoresDelActo): ValoresDelActo {
  const salida: Record<string, string | boolean> = {};
  for (const campo of campos) {
    if (!seEscribeElCampo(campo)) continue;
    const valor = valores[campo.nombre];
    if (vacio(valor) && tipoDe(campo.tipo) !== 'c') continue;
    salida[campo.nombre] = valor ?? false;
  }
  return salida;
}
