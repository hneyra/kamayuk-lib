import type { ReactNode } from 'react';

/**
 * **Las palabras que el sistema de diseño dice por su cuenta** (#19).
 *
 * <h2>Por qué esto existe teniendo casi todo el paquete el texto como `children`</h2>
 *
 * Porque «casi» no es «todo». `@kamayuk/ui` recibe sus palabras de quien lo usa —un `Boton` no
 * sabe qué pone dentro, una `Alerta` tampoco— y por eso no necesita un saco: el texto ya es un
 * parámetro. **Las seis excepciones son las que se escaparon**, y casi todas son del tipo que no se
 * ve: tres son nombres accesibles que no se dibujan en ninguna parte —y dos de ellos llegaban **en
 * inglés** desde `sonner` y desde `cmdk`—, una es una marca de tres letras entre paréntesis y las
 * otras dos son las palabras que envuelven a un dato.
 *
 * Un segundo idioma con estas cinco dentro dejaría la pantalla **a medias**: el cuerpo traducido y
 * la miga anunciándose como «Ruta», el campo opcional marcado «(opcional)» y cada importe con un
 * «al» en castellano pegado a la fecha.
 *
 * <h2>Y aquí NO hay contexto ni proveedor, a diferencia del armazón</h2>
 *
 * Estas piezas son hojas: quien las dibuja las tiene delante y les puede pasar la palabra como le
 * pasa el resto. Un proveedor obligaría a montarlo para dibujar una miga, que es exactamente el
 * coste que el issue rechaza para `i18next`. Así que **cada palabra entra por `props`, con su
 * valor por omisión sacado de aquí**, y quien no traduzca sigue viendo lo de hoy.
 *
 * <h2>Las dos que envuelven un dato son funciones, y tienen que serlo</h2>
 *
 * «Cifras actualizadas al 31/12/2026» y «al 31/12/2026» no se pueden partir en dos cadenas sin
 * decidir por el traductor **de qué lado cae la fecha**, y en más de un idioma cae del otro. Como
 * función, el dato entra donde el idioma lo ponga; y entra ya formateado y ya envuelto en su
 * `<strong>`, porque el formato de un importe y de una fecha es de `@kamayuk/formato` y no se
 * traduce.
 */

export interface TextosDeLaUi {
  /** El nombre accesible de la miga. No se dibuja: lo lee el lector de pantalla. */
  readonly ruta: string;
  /** La marca de un campo que se puede dejar en blanco. Ver `etiqueta.tsx`: lo obligatorio no se marca. */
  readonly opcional: string;
  /** El nombre accesible de la región viva de los avisos. Ver `avisos.tsx`: sin él viene en inglés. */
  readonly avisos: string;
  /**
   * El nombre accesible de la lista de la paleta de mando. **Venía en inglés, y lo destapó la guarda
   * de #19**: sin `label`, `cmdk` monta `aria-label="Suggestions"` en su `Command.List`. Es el mismo
   * defecto que `sonner` tenía en #13 y de la misma familia — no se dibuja en ninguna parte, así que
   * mirar la pantalla no lo enseña.
   */
  readonly sugerencias: string;
  /** La línea bajo una tabla de cifras. La fecha llega formateada y en negrita. */
  readonly cifrasActualizadas: (fecha: ReactNode) => ReactNode;
  /** Lo que acompaña a un importe para decir a qué día es. Ver la regla 9: no existe «la deuda». */
  readonly aLaFecha: (fecha: ReactNode) => ReactNode;
}

/** Lo que hoy se ve. Quien no pase nada, sigue viendo esto. */
export const TEXTOS_DE_LA_UI: TextosDeLaUi = {
  ruta: 'Ruta',
  opcional: '(opcional)',
  avisos: 'Avisos',
  sugerencias: 'Sugerencias',
  cifrasActualizadas: (fecha) => <>Cifras actualizadas al {fecha}</>,
  aLaFecha: (fecha) => <>al {fecha}</>,
};
