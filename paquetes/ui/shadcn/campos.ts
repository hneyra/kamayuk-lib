/**
 * Los SIETE tipos de campo del artboard, y que pieza dibuja cada uno.
 *
 * <h2>Por que esto es dato y no un `switch` dentro del interprete</h2>
 *
 * Porque la correspondencia es lo que hay que poder comprobar. Escondida en un `switch`, un tipo
 * que se deja de dibujar —o que cae al `default` y sale como campo de texto— no lo delata nada: la
 * pantalla se ve bien y el desplegable se ha convertido en un cuadro donde se puede teclear
 * cualquier cosa. Como tabla, una prueba la recorre entera.
 *
 * <h2>El septimo no es un tipo: es un modificador</h2>
 *
 * Un `1` al final —`'s1'`, `'a1'`— **no cambia el control**: lo estira a todo el ancho de la
 * rejilla. Por eso se pela antes de mirar la letra, y por eso `anchoCompleto()` va aparte.
 *
 * <h2>`''` y `'t'` son el mismo control</h2>
 *
 * El artboard usa los dos para un campo de texto. No se normaliza a uno: se aceptan los dos y se
 * dice aqui, porque «normalizar» significaria tocar las definiciones y dejar de poder compararlas
 * con el artboard letra a letra.
 */

export type TipoDeCampo =
  /** Texto. */
  | ''
  /** Texto, el otro nombre que el artboard le da. */
  | 't'
  /** Desplegable de lista cerrada. El tercer elemento son LAS OPCIONES. */
  | 's'
  /** Fecha. */
  | 'd'
  /** Solo lectura. El tercer elemento es EL VALOR que muestra. */
  | 'r'
  /** Casilla de si o no. El tercer elemento es la etiqueta de la marca. */
  | 'c'
  /** Area de texto libre. */
  | 'a';

/**
 * **Cuando un campo escribe en la ruta lo que se eligio en el**, si su definicion no lo dice (#94).
 *
 * Se declara aqui y no en `interprete/tipos.ts`, que lo reexporta con su tabla, porque es una de
 * las columnas de `COMPORTAMIENTO_POR_TIPO`: el momento por omision SALE del tipo, y esta capa no
 * importa el interprete.
 */
export type MomentoDeLaEleccion = 'alElegir' | 'alSalir';

/** Lo que un tipo de campo decide, entero. Ver `COMPORTAMIENTO_POR_TIPO`. */
export interface ComportamientoDeUnTipo {
  /** El nombre de la pieza que lo dibuja. Es el que exportan `index.ts` y los archivos. */
  readonly pieza: string;
  /** Si se escribe. Es lo que decide si la pantalla se guarda y si el campo viaja en un acto. */
  readonly seEscribe: boolean;
  /**
   * Cuando escribe en la ruta si su `eleccion` no dice `cuando`: `alElegir` el que se elige de un
   * gesto —la lista y el calendario—, y `alSalir` el que se teclea, que tiene tantos estados
   * intermedios como letras. El de solo lectura y la casilla no llevan `eleccion` (ver
   * `interprete/tipos.ts`), y el suyo es el de siempre, `alSalir`: nadie lo lee.
   */
  readonly momento: MomentoDeLaEleccion;
  /**
   * Si SIEMPRE tiene valor. Solo la casilla: desmarcada es `false`, que es una respuesta, y no un
   * hueco. Por eso nace en `false`, nunca falta al enviar y viaja aunque no se marque.
   */
  readonly siempreTieneValor: boolean;
}

/**
 * **Todo lo que depende del tipo de un campo, en UNA tabla** (#124).
 *
 * Hasta #124 esto vivia repartido en comprobaciones sueltas —`tipo !== 'r'`, `tipo === 's' || tipo
 * === 'd'`, `tipo !== 'c'` dos veces, `'s'` y `'c'` en los valores iniciales— y solo `PIEZA_POR_TIPO`
 * obligaba a tocar algo al anadir un tipo. Medido: con un octavo tipo en `TipoDeCampo` y en
 * `PIEZA_POR_TIPO`, `tsc` solo avisaba en `CampoDelBloque`; el resto le daba en silencio el
 * comportamiento del campo de texto —se escribe, escribe `alSalir`, puede faltar—.
 *
 * Con el `satisfies`, un tipo sin su fila no compila, y la fila obliga a decidir las cuatro cosas.
 * **Sin `as const` en el literal, las piezas se ensancharian a `string`**, y `PIEZA_POR_TIPO`, que se
 * publica, perderia su tipo literal: lo afirma una barrera de `barreras-de-campos-y-tablas.tsx`.
 */
export const COMPORTAMIENTO_POR_TIPO = {
  '': { pieza: 'Campo', seEscribe: true, momento: 'alSalir', siempreTieneValor: false },
  t: { pieza: 'Campo', seEscribe: true, momento: 'alSalir', siempreTieneValor: false },
  s: { pieza: 'Desplegable', seEscribe: true, momento: 'alElegir', siempreTieneValor: false },
  d: { pieza: 'Calendario', seEscribe: true, momento: 'alElegir', siempreTieneValor: false },
  r: { pieza: 'Dato', seEscribe: false, momento: 'alSalir', siempreTieneValor: false },
  c: { pieza: 'Casilla', seEscribe: true, momento: 'alSalir', siempreTieneValor: true },
  a: { pieza: 'Area', seEscribe: true, momento: 'alSalir', siempreTieneValor: false },
} as const satisfies Record<TipoDeCampo, ComportamientoDeUnTipo>;

/** Los siete, en el orden de la tabla. `Object.keys` da `string[]`: las claves son las de la tabla. */
export const TIPOS_DE_CAMPO = Object.keys(COMPORTAMIENTO_POR_TIPO) as readonly TipoDeCampo[];

/** La pieza de cada tipo, con su tipo LITERAL: `PIEZA_POR_TIPO.s` es `'Desplegable'` y no `string`. */
type PiezaPorTipo = { readonly [T in TipoDeCampo]: (typeof COMPORTAMIENTO_POR_TIPO)[T]['pieza'] };

/**
 * El nombre de la pieza que dibuja cada tipo. Es el que exportan `index.ts` y los archivos.
 *
 * **Sale de `COMPORTAMIENTO_POR_TIPO`** (#124), con su forma publica intacta —las mismas siete claves
 * en el mismo orden y los mismos literales—. La asercion la respalda el tipo de arriba, que sale
 * de la misma tabla que se recorre, y la barrera que compara el resultado con los siete literales.
 */
export const PIEZA_POR_TIPO = Object.fromEntries(
  TIPOS_DE_CAMPO.map((tipo) => [tipo, COMPORTAMIENTO_POR_TIPO[tipo].pieza]),
) as PiezaPorTipo;

/** Un campo se escribe salvo que sea de solo lectura. Es lo que decide si la pantalla se guarda. */
export const seEscribe = (tipo: TipoDeCampo): boolean => COMPORTAMIENTO_POR_TIPO[tipo].seEscribe;

/** El `1` final: de ancho completo en la rejilla. No cambia el control. */
export const anchoCompleto = (crudo: string): boolean => crudo.includes('1');

/**
 * La letra, sin el modificador de ancho.
 *
 * Revienta con un tipo que no esta en la tabla en vez de caer en «campo de texto»: un tipo
 * desconocido es una definicion mal escrita, y dibujarla como texto la esconde.
 */
export function tipoDe(crudo: string): TipoDeCampo {
  const letra = crudo.replace('1', '');
  if (!(letra in COMPORTAMIENTO_POR_TIPO)) {
    throw new Error(
      `«${crudo}» no es un tipo de campo. Los siete son: ${TIPOS_DE_CAMPO.map((t) => `«${t}»`).join(', ')}.`,
    );
  }
  return letra as TipoDeCampo;
}
