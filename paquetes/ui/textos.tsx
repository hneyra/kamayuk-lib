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

/**
 * **Las palabras que el interprete de pantallas dice por su cuenta** (#27).
 *
 * Todo lo demas que el interprete dibuja viene de la definicion o de la ausencia, y eso lo traduce
 * quien las escribe —ver `traducir` en `interprete/Pantalla.tsx`—. Estas tres son las que no vienen
 * de ninguna de las dos, y en `rentas` salian de su `i18next`: aqui no puede ser, porque
 * `i18next` como `peerDependency` obligaria a los cuatro sistemas a montarlo antes de dibujar un
 * campo (#19, AC3).
 *
 * **`registros` es una función por lo mismo que `cifrasActualizadas`**: el número entra donde el
 * idioma lo ponga, y el plural lo decide quien traduce —hay idiomas con más de dos formas, y
 * `i18next` las sabe—.
 */
export interface TextosDelInterprete {
  /** La marca de un campo que se puede dejar en blanco. La misma que `TEXTOS_DE_LA_UI.opcional`. */
  readonly opcional: string;
  /** Lo que se lee en una fecha que nadie ha elegido todavía. */
  readonly marcadorDeFecha: string;
  /** El conteo de la barra de una tabla, cuando HAY filas. Sin filas no se escribe nada. */
  readonly registros: (cuantos: number) => string;
}

/** Lo que `rentas` veía hasta #27. Quien no pase nada, ve esto. */
export const TEXTOS_DEL_INTERPRETE: TextosDelInterprete = {
  opcional: TEXTOS_DE_LA_UI.opcional,
  marcadorDeFecha: 'dd/mm/aaaa',
  registros: (cuantos) => (cuantos === 1 ? '1 registro' : `${String(cuantos)} registros`),
};

/**
 * **Las palabras que dicen las piezas de #44**: los estados de una lectura, el pie de operaciones
 * y el aviso de lo que no se pudo dibujar.
 *
 * <h2>Por que es un saco hermano y no cuatro claves mas en `TextosDelInterprete`</h2>
 *
 * Porque `TextosDelInterprete` lo construye entero su consumidor. `rentas` lo tiene escrito como
 * `satisfies Record<keyof TextosDelInterprete, string>` (`src/i18n/textosDelMarco.ts:133`) y lo
 * devuelve como `TextosDelInterprete` desde un `useMemo` con sus tres claves (`:146-156`): una
 * cuarta lo deja sin compilar, y lo nuevo tiene que ser aditivo. `Pantalla` recibe los dos sacos
 * juntos en `textos`, y el que `rentas` pasa sigue cabiendo.
 *
 * Estas palabras solo salen cuando la definicion usa las piezas nuevas, que `rentas` no usa: su
 * guarda de cobertura no las echa de menos, y el dia que las use las pasara por aqui.
 */
export interface TextosDeLasPiezas {
  /** Lo que se lee bajo las barras mientras se pide. Nunca una cifra. */
  readonly pidiendo: string;
  /** Lo que se dice en `en-espera` cuando la definicion no dio su propia frase. */
  readonly enEspera: string;
  /** El boton que vuelve a pedir. Solo sale donde reintentar puede cambiar algo. */
  readonly reintentar: string;
  /** La linea del identificador que soporte necesita. Es una funcion: el dato va donde diga el idioma. */
  readonly incidencia: (identificador: string) => string;
  /** «La sirve» o «La sirven», delante de las operaciones que leen la hoja. */
  readonly lasQueLeen: (cuantas: number) => string;
  /** «La escribe» o «La escriben», delante de las que la escriben. */
  readonly lasQueEscriben: (cuantas: number) => string;
  /** El aviso de una pieza del consumidor cuya clave nadie registro. Nunca un hueco en blanco. */
  readonly piezaSinRegistrar: (clave: string) => string;
  /** El aviso de una lectura declarada cuyo estado nadie dio. Decir «pidiendo» seria mentir para siempre. */
  readonly lecturaSinEstado: (clave: string) => string;
  /** Lo que ocupa el sitio de un dato que no llego, dentro de un texto. */
  readonly datoAusente: string;
}

/** Lo que se ve si nadie pasa nada. */
export const TEXTOS_DE_LAS_PIEZAS: TextosDeLasPiezas = {
  pidiendo: 'Pidiendo al servidor…',
  enEspera: 'Todavia no hay nada que pedir.',
  reintentar: 'Reintentar',
  incidencia: (identificador) => `Incidencia ${identificador}`,
  lasQueLeen: (cuantas) => (cuantas === 1 ? 'La sirve' : 'La sirven'),
  lasQueEscriben: (cuantas) => (cuantas === 1 ? 'La escribe' : 'La escriben'),
  piezaSinRegistrar: (clave) =>
    `Esta parte de la pantalla no se puede dibujar: nadie ha registrado la pieza «${clave}».`,
  lecturaSinEstado: (clave) =>
    `Esta parte de la pantalla no sabe en que estado esta su lectura: nadie ha dado el de «${clave}».`,
  datoAusente: '—',
};

/** Los dos sacos que `Pantalla` recibe juntos, y lo que una pieza del consumidor recibe ya fundido. */
export type TextosDeLaPantalla = TextosDelInterprete & TextosDeLasPiezas;
