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

  // ── Los actos, las acciones y la navegacion (#66) ────────────────────────────────────────────
  /** El boton de la cabecera de un acto abierto, que lo cierra sin enviar nada. */
  readonly cerrarElActo: string;
  /** El motivo del primario mientras la escritura viaja. No es «se puede pulsar». */
  readonly escribiendo: string;
  /** El motivo de una accion cuya operacion esta pendiente. */
  readonly enCurso: string;
  /** «Falta rellenar: …», con los rotulos ya traducidos. La lista la une el idioma. */
  readonly faltaRellenar: (rotulos: readonly string[]) => string;
  /** La observacion no llega al minimo de la definicion. Las dos cifras entran donde el idioma las ponga. */
  readonly observacionCorta: (minimo: number, tiene: number) => string;
  /** La observacion pasa del maximo de la definicion. */
  readonly observacionLarga: (maximo: number, tiene: number) => string;
  /** Un acto o una accion que nadie atiende: el sistema no registro su manejador. Nunca un boton mudo. */
  readonly sinQuienLoAtienda: (clave: string) => string;
  /** El titulo de la confirmacion de lo irreversible. */
  readonly estoNoSeDeshace: string;
  /** La salida que envia lo irreversible. */
  readonly siConfirmar: string;
  /** La salida que no hace nada. Es la que se enfoca al abrir. */
  readonly cancelar: string;
  /** Lo que se dice cuando el sistema acepta la escritura y la definicion no dio su propia frase. */
  readonly actoHecho: string;
  /** El manejador rechazo y nadie puso el fallo en `lecturas`: una costura rota, dicha. */
  readonly rechazoSinFallo: (clave: string) => string;
  /** Una accion que va a otra hoja, en una pantalla montada sin marco que sepa ir. */
  readonly sinNavegacion: string;
  /** Una accion que va a una hoja que el catalogo de hoy no ofrece. */
  readonly hojaNoOfrecida: string;
  /** Una accion que va a otra hoja con un dato que todavia no llego: nunca viaja un hueco. */
  readonly faltaElDato: (nombre: string) => string;

  // #65
  /** El aviso de una tabla vacia cuya definicion no dice por que (#65). Nunca una tabla muda. */
  readonly tablaSinMotivo: string;
  /** El nombre del grupo de botones de una fila, con su primera celda, si la definicion no da otro (#65). */
  readonly accionesDeLaFila: (fila: string) => string;

  // ── Los mandos de una tabla (#61) ─────────────────────────────────────────────────────────────
  //
  // Van al saco y NO a la definicion, a proposito: «Anterior» y «Siguiente» se dicen igual en las
  // cuatro interfaces, y escribirlos en cada definicion seria la misma palabra copiada tantas veces
  // como tablas haya, divergiendo a la tercera. Lo que SI es de la definicion es la mecanica: donde
  // viaja la pagina, que tamanos se ofrecen y que campos admite el servidor.

  /** El mando que va a la pagina anterior. */
  readonly paginaAnterior: string;
  /** Y el que va a la siguiente. */
  readonly paginaSiguiente: string;
  /** «Pagina N», cuando no se sabe cuantas hay. La cifra va donde el idioma la ponga. */
  readonly pagina: (pagina: number) => string;
  /** «Pagina N de M», cuando se sabe. */
  readonly paginaDe: (pagina: number, paginas: number) => string;
  /** Por que «Anterior» no lleva a ningun sitio. Nunca un `disabled` mudo (#66). */
  readonly yaEsLaPrimeraPagina: string;
  /** Y por que «Siguiente» tampoco: en servidor lo dijo el servidor; en cliente, las filas que quedan. */
  readonly noHayMasPaginas: string;
  /** El nombre accesible del selector de cuantas filas por pagina. No se dibuja. */
  readonly filasPorPagina: string;
  /** El nombre accesible del selector de orden. No se dibuja. */
  readonly ordenarLaLista: string;
  /** El mando del sentido dice lo que HARA al pulsarlo, no el sentido que ya hay puesto. */
  readonly pasarAAscendente: string;
  readonly pasarADescendente: string;
  /** La flecha del sentido puesto. Es un signo, y entra por el saco igual: hay escrituras que lo giran. */
  readonly flechaAscendente: string;
  readonly flechaDescendente: string;
  /** El nombre accesible de la barra de mandos de una tabla, con el nombre de la tabla dentro. */
  readonly mandosDeLaTabla: (tabla: string) => string;
  /** Lo que ocupa una celda que llego sin dato, cuando su tabla no dice su propia palabra (#61). */
  readonly celdaSinDato: string;
  /** Y por que esta vacia, anunciado en la celda. Nunca una celda en blanco y sin motivo. */
  readonly porQueLaCeldaNoTieneDato: string;

  // ── Los campos, los actos y la prosa (#86) ────────────────────────────────────────────────────
  /** Lo que se anuncia tras descartar lo escrito en un acto, si su definicion no da su `dicho`. */
  readonly loEscritoSeDescarto: string;
  /** El error bajo un campo obligatorio vacio, tras el primer intento, si el campo no dice el suyo. */
  readonly campoObligatorio: string;
  /** El nombre accesible del grupo del buscador y los chips de una tabla, con su nombre dentro. */
  readonly filtrarLaTabla: (tabla: string) => string;
  /**
   * «N de M», o «N de M · T en total» cuando el sistema dio el total. Las cifras van donde el idioma
   * las ponga. **Sin total, no se escribe ninguno**: M es lo que llego, no lo que hay.
   */
  readonly filasQueDejaElFiltro: (visibles: number, recibidas: number, total: string | undefined) => string;
  /** Lo que se dice cuando el filtro no deja ninguna fila. NO es el `vacio` de la tabla: la lista llego con filas. */
  readonly ningunaPasaElFiltro: string;
  /** Por que no se puede guardar todavia: el dato con el texto —o con su nombre— aun no llego. */
  readonly faltaParaGuardar: (nombre: string) => string;
  /** Por que no se puede guardar en este navegador, si la accion no dice su propia frase. Nunca un boton mudo. */
  readonly sinDescarga: string;
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

  // #66
  cerrarElActo: 'Cerrar',
  escribiendo: 'Escribiendo…',
  enCurso: 'En curso…',
  faltaRellenar: (rotulos) => `Falta rellenar: ${rotulos.join(', ')}.`,
  observacionCorta: (minimo, tiene) =>
    `La observacion tiene ${String(tiene)} ${tiene === 1 ? 'caracter' : 'caracteres'} y necesita al menos ${String(minimo)}.`,
  observacionLarga: (maximo, tiene) =>
    `La observacion tiene ${String(tiene)} caracteres y no puede pasar de ${String(maximo)}.`,
  sinQuienLoAtienda: (clave) => `Nadie atiende «${clave}» en esta pantalla: pulsarlo no haria nada.`,
  estoNoSeDeshace: 'Esto no se deshace',
  siConfirmar: 'Si, confirmar',
  cancelar: 'Cancelar',
  actoHecho: 'El servidor acepto la escritura.',
  rechazoSinFallo: (clave) =>
    `La escritura «${clave}» no se completo, y nadie ha dado su fallo: esta pantalla no sabe decir por que.`,
  sinNavegacion: 'Esta pantalla no esta dentro de un marco que sepa abrir otra hoja.',
  hojaNoOfrecida: 'Esa hoja no esta entre las que esta cuenta puede abrir.',
  faltaElDato: (nombre) => `Todavia no se sabe «${nombre}», y sin el no hay a donde ir.`,

  // #65
  tablaSinMotivo: 'Esta lista no tiene filas, y la definicion de la pantalla no dice por que.',
  accionesDeLaFila: (fila) => `Acciones de «${fila}»`,

  // #61
  paginaAnterior: 'Anterior',
  paginaSiguiente: 'Siguiente',
  pagina: (pagina) => `Pagina ${String(pagina)}`,
  paginaDe: (pagina, paginas) => `Pagina ${String(pagina)} de ${String(paginas)}`,
  yaEsLaPrimeraPagina: 'Esta es la primera pagina: no hay ninguna antes.',
  noHayMasPaginas: 'No hay ninguna pagina despues de esta.',
  filasPorPagina: 'Cuantas filas por pagina',
  ordenarLaLista: 'Ordenar la lista',
  pasarAAscendente: 'Ordenar de menor a mayor',
  pasarADescendente: 'Ordenar de mayor a menor',
  flechaAscendente: '↑',
  flechaDescendente: '↓',
  mandosDeLaTabla: (tabla) => `Mandos de «${tabla}»`,
  celdaSinDato: '—',
  porQueLaCeldaNoTieneDato: 'Aqui no hay dato, y no es un cero.',

  // #86
  loEscritoSeDescarto: 'Se descarto lo escrito: el formulario esta como al abrirlo.',
  campoObligatorio: 'Hay que rellenarlo para poder enviar.',
  filtrarLaTabla: (tabla) => `Filtrar «${tabla}»`,
  filasQueDejaElFiltro: (visibles, recibidas, total) =>
    `${String(visibles)} de ${String(recibidas)}${total === undefined ? '' : ` · ${total} en total`}`,
  ningunaPasaElFiltro: 'Ninguna de las filas que llegaron pasa el filtro. Quitelo para verlas todas.',
  faltaParaGuardar: (nombre) => `Todavia no se ha leido «${nombre}»: no hay nada que guardar.`,
  sinDescarga: 'Este navegador no permite guardar archivos desde la pagina.',
};

/** Los dos sacos que `Pantalla` recibe juntos, y lo que una pieza del consumidor recibe ya fundido. */
export type TextosDeLaPantalla = TextosDelInterprete & TextosDeLasPiezas;
