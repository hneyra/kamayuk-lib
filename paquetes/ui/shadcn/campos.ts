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

/** El nombre de la pieza que dibuja cada tipo. Es el que exportan `index.ts` y los archivos. */
export const PIEZA_POR_TIPO = {
  '': 'Campo',
  t: 'Campo',
  s: 'Desplegable',
  d: 'Calendario',
  r: 'Dato',
  c: 'Casilla',
  a: 'Area',
} as const satisfies Record<TipoDeCampo, string>;

export const TIPOS_DE_CAMPO = Object.keys(PIEZA_POR_TIPO) as readonly TipoDeCampo[];

/** Un campo se escribe salvo que sea de solo lectura. Es lo que decide si la pantalla se guarda. */
export const seEscribe = (tipo: TipoDeCampo): boolean => tipo !== 'r';

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
  if (!(letra in PIEZA_POR_TIPO)) {
    throw new Error(
      `«${crudo}» no es un tipo de campo. Los siete son: ${TIPOS_DE_CAMPO.map((t) => `«${t}»`).join(', ')}.`,
    );
  }
  return letra as TipoDeCampo;
}
