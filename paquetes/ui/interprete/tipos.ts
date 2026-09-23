import type { ComponentProps } from 'react';

import type { Insignia } from '../Insignia.tsx';
import type { TipoDeCampo } from '../shadcn/campos.ts';
import type { DefinicionDeAccion, DefinicionDeActo } from './tipos-de-los-actos.ts';
import type { EnLaRuta } from './hoja.ts';

/**
 * Los tipos de **una pantalla como dato**: lo que el interprete lee (#27).
 *
 * Suben de `rentas/frontend/src/pantallas/tipos.ts` (UI-5, `rentas`#85), donde nacieron para las
 * cuarenta pantallas de V8. Sube **la mitad que el interprete lee** —campo, tabla, bloque y
 * pantalla— y se queda en cada sistema la otra mitad —el arbol, sus hojas y sus operaciones—: el
 * arbol es de quien tiene los modulos, y la regla de ADR-0030 §4 no deja que una libreria comun
 * sepa cuales son.
 *
 * <h2>Por que dato y no un componente por pantalla</h2>
 *
 * Porque el artboard no dibuja cuarenta pantallas: dibuja **una** que interpreta una tabla, en un
 * solo `bloques(clave)`. Cuarenta componentes escritos a mano divergen a la tercera semana y nadie
 * puede decir cuales; cuarenta definiciones sobre un interprete no pueden.
 *
 * <h2>Por que se llaman `Definicion…` y no `Campo` o `Tabla`</h2>
 *
 * Porque este paquete ya exporta `Campo` y `Tabla`, y son **las piezas** que las dibujan. Un
 * consumidor que importara las dos cosas del mismo sitio tendria dos `Campo` distintos, y el que
 * gana depende del orden del `import`. El sistema que prefiera los nombres cortos los reexporta con
 * alias en su propio arbol, que es lo que hace `rentas`.
 *
 * <h2>Por que los tipos son ESTRECHOS, y no `string`</h2>
 *
 * El tipo de un campo no es texto libre: son **siete** —y su variante de ancho completo—, y el
 * interprete no sabe hacer nada con un octavo. Con `string`, `{ tipo: 'select' }` compilaria y se
 * dibujaria como una caja de texto vacia, en silencio. Con la union no llega ni al `yarn build`.
 *
 * Y el campo es una **union discriminada**: lo que acompana a un desplegable son sus opciones, a
 * una casilla su etiqueta y a un campo que se escribe su ayuda, asi que cada rama nombra lo suyo.
 * Lo vigilan las barreras de `verificaciones/tipos/barreras-de-tipos.tsx`.
 */

/**
 * El mismo tipo con la marca de **ancho completo**.
 *
 * Un `1` al final es lo que el interprete busca —ver `anchoCompleto()`— para sacar el campo de la
 * rejilla y darle la fila entera. Por eso `''` y `'1'` son el mismo control con distinto ancho, y no
 * dos tipos.
 */
export type ConAnchoCompleto<T extends string> = T | `${T}1`;

/** Los catorce valores que un `tipo` puede tomar: los siete de `TipoDeCampo`, con y sin ancho. */
export type TipoDeCampoConAncho = ConAnchoCompleto<TipoDeCampo>;

/**
 * **Cuando un campo escribe en la ruta lo que se eligio en el** (#94).
 *
 * <table>
 *   <tr><td>`alElegir`</td><td>en cuanto cambia. Es el de una lista y el de un calendario: un solo
 *     gesto ES la eleccion entera, y no hay nada intermedio que escribir</td></tr>
 *   <tr><td>`alSalir`</td><td>al salir del campo, y al pulsar Intro. Es el de lo que se teclea: un
 *     movimiento de la ruta por valor terminado, y **nunca uno por tecla**</td></tr>
 * </table>
 *
 * <h2>La tercera que se miro —con retardo— NO esta, y esto es por que</h2>
 *
 * Un retardo mueve la ruta **mientras se escribe**: `bod`, `bode`, `bodeg`, `bodega` son cuatro
 * direcciones que nadie quiso pedir, cuatro lecturas para quien escucha la ruta y cuatro entradas
 * en el boton de atras del navegador. `alSalir` da exactamente una, y el gesto que la produce
 * —salir del campo, o Intro— es deliberado. El dia que una hoja demuestre que lo necesita, entra
 * como un tercer valor de esta union sin tocar a nadie.
 */
export type MomentoDeLaEleccion = 'alElegir' | 'alSalir';

/**
 * **Donde vive en la ruta lo que se elige en un campo** (#94).
 *
 * Es lo mismo que ya hacen la pagina, el orden, la pestana y el maestro: el interprete no pide
 * datos y no filtra filas — **escribe en la ruta de la hoja**, y quien lee la ruta pide lo que
 * toque. Hasta este issue un campo era el unico mando de una pantalla que no tenia por donde
 * salir: lo tecleado se quedaba en el estado de `<Pantalla>` y no llegaba ni a `nombrados` ni a la
 * ruta, asi que una caja de filtro no podia acotar nada.
 *
 * <h2>No hace falta un segundo canal hacia `nombrados`, y por eso no se abre</h2>
 *
 * `#94` lo pide para que `resolverTexto`, `seCumple` y los `parametros` de una accion `va` puedan
 * leer lo elegido. Ya pueden: desde #67 la ruta de la hoja entra en `nombrados` como `ruta.<clave>`
 * (`nombradosConLaHoja`). Un campo que escribe en `?descripcion=` se lee como `ruta.descripcion`
 * en cualquiera de los tres sitios, sin publicar el estado interno del interprete —que cambia en
 * cada tecla— por una segunda puerta.
 *
 * <h2>Cambiar lo elegido vuelve a la primera pagina, en UN movimiento</h2>
 *
 * Por lo mismo que cambiar de orden (#61): seguir en la pagina 7 de otro filtro es una lectura que
 * nadie quiso, y dos `moverLaRuta` seguidos pasan por una direccion intermedia —el filtro nuevo
 * con la pagina vieja— que alguien pide. Se reinician los sitios de paginacion **de las tablas de
 * su propio bloque**, que son las que el filtro acota; ver `cambioAlElegir`.
 *
 * <h2>Sin `hoja`, el campo se comporta exactamente como hoy</h2>
 *
 * `<Pantalla>` montada fuera del marco no tiene donde escribir, asi que lo elegido se queda en su
 * estado, como antes de #94. Es la misma regla que la pagina y el orden de una tabla.
 */
export interface EleccionDelCampo {
  /** El sitio de la ruta: un parametro, o `EL_SUJETO`. Es tambien como se lee en `nombrados`. */
  readonly enLaRuta: EnLaRuta;
  /** Sin el, `alElegir` en los campos de un solo gesto y `alSalir` en los que se teclean. */
  readonly cuando?: MomentoDeLaEleccion;
}

/**
 * Un desplegable de lista cerrada. Sus opciones son el dato; sin ellas no dibuja nada.
 *
 * **Generico en sus opciones, y por omision de cadenas** (#65): `rentas` mete `campo.opciones` en
 * una lista de cadenas (`src/i18n/catalogo-de-claves.ts:56`), asi que la de hoy no se ensancha. La
 * de las piezas —la de `DefinicionDeBloque<Texto>`— admite `{ valor, rotulo }`.
 */
export interface CampoDeLista<O extends OpcionDelCampo = string> {
  readonly etiqueta: string;
  /** El nombre del campo del contrato, junto a la etiqueta (#61, `cabecera-con-campo-y-dominio`). */
  readonly campo?: string;
  readonly tipo: ConAnchoCompleto<'s'>;
  /** Las opciones, en su orden. La primera es la que el interprete deja seleccionada. */
  readonly opciones: readonly O[];
  /** La linea de debajo (#65, `ayuda-en-una-lista`): «solo los campos que el servidor admite». */
  readonly ayuda?: string;
  /** Donde vive lo elegido en la ruta de la hoja (#94). Sin ella, se queda en la pantalla. */
  readonly eleccion?: EleccionDelCampo;
  /** Se puede dejar sin elegir, y se marca asi (#86, `obligatorio-u-opcional-por-campo`). */
  readonly opcional?: boolean;
  /** Lo que se dice bajo el campo cuando falta y es obligatorio (#86). Ver `MensajesDelCampo`. */
  readonly mensajes?: MensajesDelCampo;
}

/**
 * Un campo que solo se muestra: lo calcula el backend y la pantalla no lo escribe.
 *
 * **No lleva su valor, y ese es el punto** (`rentas`#97). Una cifra de ejemplo dentro de la
 * definicion viaja en el paquete que se sirve, y en un sistema que maneja dinero una cifra asi
 * **se lee como real**: es peor que un hueco. El valor entra por `DatosDeLaPantalla`, y cuando no
 * esta el hueco dice por que.
 */
export interface CampoDeSoloLectura {
  readonly etiqueta: string;
  /** El nombre del campo del contrato, junto a la etiqueta (#61, `cabecera-con-campo-y-dominio`). */
  readonly campo?: string;
  readonly tipo: ConAnchoCompleto<'r'>;
  /**
   * Se pinta como insignia, con el tono que dice la regla (#65, `dato-con-insignia`). La regla lee
   * el valor del campo o, con `segun`, un dato de `DatosDeLaPantalla.nombrados`.
   */
  readonly insignia?: ReglaDeLaInsignia;
  /**
   * La linea de debajo (#86, `ayuda-en-un-campo-de-solo-lectura`): de donde sale el dato, o por que
   * aqui no se corrige —«lo calcula el servidor con la tabla vigente»—. Es una frase, y pasa por
   * `traducir`. Hasta #86 un campo de solo lectura la callaba aunque la definicion la trajera.
   */
  readonly ayuda?: string;
  // **Aqui no hay `eleccion` (#94)**: un campo de solo lectura muestra lo que otro decidio, y no
  // hay nada que elegir. No hace falta un `eleccion?: never` para impedirlo —se escribio, se midio
  // y sobraba—: `DefinicionDeCampo` esta discriminada por `tipo`, asi que TypeScript estrecha a
  // esta rama antes de mirar las propiedades de mas y `{ tipo: 'r', eleccion }` sale con TS2353.
  // Lo vigila `barreras-de-campos-y-tablas.tsx`.
}

/**
 * Una casilla. Su texto no es ayuda: es lo que se lee AL LADO de la marca.
 *
 * **No lleva `eleccion` (#94)**, y no es un olvido: escribir un booleano en una ruta obliga a
 * elegir COMO se escribe —`true`, `1`, o la presencia del parametro a secas—, y ese vocabulario es
 * del backend que lo lee, no de esta libreria. Una casilla que tenga que acotar una lectura se
 * declara como lista de dos opciones, cuyos valores los escribe el sistema.
 */
export interface CampoDeCasilla {
  readonly etiqueta: string;
  /** El nombre del campo del contrato, junto a la etiqueta (#61, `cabecera-con-campo-y-dominio`). */
  readonly campo?: string;
  readonly tipo: ConAnchoCompleto<'c'>;
  /** La etiqueta de la marca. */
  readonly casilla: string;
}

/** Los tipos que se escriben: texto, fecha y area. */
export type TipoDeEntrada = ConAnchoCompleto<'' | 'd' | 'a' | 't'>;

/** Un campo que se escribe, con su ayuda opcional debajo. */
export interface CampoDeEntrada {
  readonly etiqueta: string;
  /** El nombre del campo del contrato, junto a la etiqueta (#61, `cabecera-con-campo-y-dominio`). */
  readonly campo?: string;
  readonly tipo: TipoDeEntrada;
  /**
   * La linea de ayuda. La mayoria no la lleva. **Ya no decide si el campo es opcional** (#86): hasta
   * aqui una ayuda que dijera «opcional» marcaba el campo, y la regla fallaba por los dos lados —una
   * ayuda traducida o que no lo nombraba dejaba sin marca lo opcional, y «no es opcional» lo marcaba—.
   * Eso lo dice `opcional`.
   */
  readonly ayuda?: string;
  /**
   * El texto gris dentro del campo vacio (#65, `marcador`): «el numero que devolvio el alta». Es una
   * frase, y pasa por `traducir`. En una fecha sustituye a `textos.marcadorDeFecha`.
   */
  readonly marcador?: string;
  /**
   * Donde vive lo elegido en la ruta de la hoja (#94). Sin ella, se queda en la pantalla.
   *
   * **En una fecha lo que viaja es ISO** (`aaaa-mm-dd`), que es lo que un backend lee y lo que
   * ordena; lo que se LEE en el campo sigue siendo `dd/mm/aaaa`. Ver `fecha.ts`.
   */
  readonly eleccion?: EleccionDelCampo;
  /**
   * **Se puede dejar en blanco, y se marca «(opcional)»** (#86, `obligatorio-u-opcional-por-campo`).
   *
   * Es un dato y no una deduccion: lo mismo que en un acto (`CampoDelActo.opcional`) decide si el
   * campo es obligatorio al enviar, aqui decide la marca. Una sola fuente para las dos cosas: un
   * campo marcado «(opcional)» que el acto exigia —o al reves— es lo que la regla vieja permitia.
   */
  readonly opcional?: boolean;
  /** Lo que se dice bajo el campo cuando falta y es obligatorio (#86). Ver `MensajesDelCampo`. */
  readonly mensajes?: MensajesDelCampo;
}

/**
 * **Lo que un campo dice de si mismo cuando esta mal** (#86, `errores-tras-el-primer-intento`).
 *
 * Solo `obligatorio` por ahora: es el unico error que el interprete sabe ver sin preguntar al
 * servidor. Sin el, la frase del saco (`textos.campoObligatorio`). Un `Texto`, asi que puede llevar
 * un dato: «Falta el codigo del grupo {grupo}».
 */
export interface MensajesDelCampo {
  readonly obligatorio?: Texto;
}

/** Un campo de un bloque, discriminado por su `tipo`. Generico en las opciones de su lista (#65). */
export type DefinicionDeCampo<O extends OpcionDelCampo = string> =
  | CampoDeLista<O>
  | CampoDeSoloLectura
  | CampoDeCasilla
  | CampoDeEntrada;

/** Una columna de la tabla de un bloque. */
export interface ColumnaDeTabla {
  readonly rotulo: string;
  /**
   * **El nombre del campo del contrato, bajo el rotulo** (#61, `cabecera-con-campo-y-dominio`).
   *
   * No se traduce: es codigo, como las operaciones del pie de #44. Y es ademas **lo que ata una
   * columna a un campo de `orden`**: la columna cuyo `campo` es el que se esta ordenando lleva
   * `aria-sort`, sin una segunda lista que se quede vieja.
   */
  readonly campo?: string;
  /** Lo que la base admite en ese campo, cuando lo acota: `A · B · C`. Tampoco se traduce. */
  readonly dominio?: string;
  /**
   * Si la columna va pegada a la derecha.
   *
   * No es cosmetico: son las columnas de cifras, y una cifra alineada a la izquierda no se puede
   * comparar de un vistazo con la de la fila de arriba.
   */
  readonly alineadoDerecha: boolean;
  /**
   * La columna se pinta como insignia, con el tono que dice la regla y NO el que se deduzca de su
   * texto (#65, `insignia-con-tono-por-regla`). Con ella, `tonoDeLaInsignia` no se llama para esta
   * columna. Sin ella, la `columnaDeInsignia` de #27 sigue igual.
   */
  readonly insignia?: ReglaDeLaInsignia;
}

/**
 * La tabla que acompana a un bloque.
 *
 * **Sin filas y sin conteo**, por lo mismo que un campo de solo lectura no lleva su valor: lo que
 * se conserva es la FORMA —que columnas hay, cual va a la derecha, cual es la insignia—, que es lo
 * que el interprete necesita para dibujar la tabla con dato o sin el.
 */
export interface DefinicionDeTabla<T extends Texto = string> {
  readonly titulo: string;
  readonly columnas: readonly ColumnaDeTabla[];
  /** La linea de debajo: lo que hay que saber para leer la tabla sin equivocarse. */
  readonly nota?: string;
  /** El indice de la columna que se dibuja como insignia, si hay una. */
  readonly columnaDeInsignia?: number;
  /** El rotulo del boton de alta, si la lista admite anadir una fila. */
  readonly accion?: string;
  /**
   * El nombre con que los datos traen sus filas: `DatosDeLaPantalla.tablas.get(clave)` (#65). Sin
   * ella, las filas son las de `DatosDeLaPantalla.filas` por indice de bloque, como en #27.
   */
  readonly clave?: string;
  /**
   * **Por que no tiene filas**, cuando la lectura contesto una lista vacia (#65, `tabla-con-vacio`):
   * «este registro no tiene ninguna evidencia». Es una respuesta, no la ausencia de #27. Sin ella,
   * una tabla vacia lo dice con un aviso del saco: nunca una tabla muda.
   *
   */
  readonly vacio?: T;
  /**
   * **El vacio con su salida dentro** (#61, `vacio-con-su-salida`): el titulo, la frase y el boton
   * que saca de ahi. Gana a `vacio` si una definicion trae los dos.
   *
   * <h2>Por que es un campo aparte y no `vacio: T | VacioDeLaTabla<T>`</h2>
   *
   * **Medido, no supuesto**: con la union, `caja` deja de compilar. Recorre sus definiciones
   * metiendo `tabla.vacio` en una lista de claves de traduccion
   * (`src/i18n/catalogo-de-claves.ts:64`), y sobre una union esa lectura no vale:
   *
   * ```
   * src/i18n/catalogo-de-claves.ts(64,50): error TS2345: Argument of type
   *   'string | VacioDeLaTabla<string>' is not assignable to parameter of type 'string'.
   * ```
   *
   * Es el mismo motivo por el que `DefinicionDeBloque` es generica en sus textos en vez de
   * ensancharlos (#44): **lo nuevo tiene que ser aditivo**, porque estas definiciones las RECORREN
   * cuatro sistemas, y ensanchar un campo que ya leen les rompe la compilacion sin que lo pidan.
   */
  readonly vacioConSalida?: VacioDeLaTabla<T>;
  /**
   * La cabecera queda fija y el cuerpo se desplaza dentro de su propio marco
   * (#65, `tabla-de-cabecera-fija`). La altura la pone quien la contiene.
   */
  readonly cabeceraFija?: boolean;
  /** Una segunda linea bajo las filas que la tengan (#65, `detalle-de-fila`). */
  readonly detalleDeFila?: DetalleDeFila<T>;
  /** Los botones de cada fila, segun un dato suyo (#65, `acciones-por-fila`). */
  readonly accionesPorFila?: AccionesPorFila<T>;
  /**
   * **De donde sale la pagina que se ve** (#61, `paginacion-y-orden-en-el-servidor` y
   * `tablas-grandes`). Sin ella, se dibujan todas las filas que lleguen, como hasta #65.
   */
  readonly paginacion?: PaginacionDeLaTabla;
  /** **Por que campo se ordena, de la lista blanca que el servidor admite** (#61). */
  readonly orden?: OrdenDeLaTabla<T>;
  /**
   * Lo que se pinta donde una celda llega `null`, y por que (#61, `celda-nula-con-palabra-y-nota`).
   * Sin el, la raya y la frase del saco: **nunca una celda en blanco**.
   */
  readonly sinDato?: { readonly texto: T; readonly nota?: T };
  /**
   * **Las filas que son el TEXTO de la pantalla** (#61, `filas-de-contenido-que-viajan`).
   *
   * No son filas de ejemplo —que desde `rentas`#97 no viajan, y por eso una tabla no las lleva—:
   * son lo que la pantalla dice. Sin ellas no dice nada, y no hay ninguna operacion que las
   * conteste. Cada celda es un `Texto`, asi que pasan por `traducir` como cualquier frase.
   *
   * Con ellas, la tabla **no mira los datos**: ni la ausencia, ni el vacio, ni `filas`.
   */
  readonly filasDeContenido?: readonly (readonly T[])[];
  /**
   * **Un buscador y unos chips que acotan las filas que YA llegaron** (#86,
   * `filtro-en-el-cliente-con-conteo`). Sin el, la tabla no ofrece ningun filtro, como hasta #86.
   * Ver `FiltroLocalDeLaTabla`.
   */
  readonly filtroLocal?: FiltroLocalDeLaTabla<T>;
  /**
   * **La fila se elige, y lo elegido vive en la ruta** (#95, `fila-elegible-en-la-ruta`). Sin ella,
   * ninguna fila se enfoca ni se pulsa y la tabla se dibuja como hasta #95. Ver `EleccionDeLaFila`.
   */
  readonly eleccion?: EleccionDeLaFila;
}

/**
 * **Una fila que se elige por si misma** (#95, `fila-elegible-en-la-ruta`; medido al cerrar
 * `caja`#99, donde hubo que rodearlo con una accion `va` a la misma hoja).
 *
 * Es el hermano de `paginacion.enLaRuta` y `orden.enLaRuta`: pulsar la fila —o Intro o Espacio con
 * el foco en ella— **escribe en la ruta** el valor de su dato `desde`, y la fila cuyo valor es el
 * que dice la ruta va realzada. Recargar o compartir el enlace deja elegida la misma. El sistema lee
 * `ruta.<enLaRuta>` y pide lo que dependa de ella, como con el `maestroDetalle` de #67, cuyo maestro
 * es una lista de `titulo`/`linea`/`insignia` y en el que una tabla de ocho columnas no cabe.
 *
 * <h2>El patron ARIA es el `grid` con filas elegibles, y no una tabla con filas que se pulsan</h2>
 *
 * `aria-selected` sobre una fila **solo significa algo dentro de un `grid` o un `treegrid`** (ARIA
 * 1.2, `row`): en una tabla de datos el lector de pantalla no lo anuncia, y la fila realzada seria
 * un color y nada mas. Asi que con `eleccion` la `<table>` pasa a `role="grid"` —es la unica
 * conversion de `table` que `jsx-a11y` admite en su configuracion recomendada—, sus celdas se
 * exponen como `gridcell` (HTML-AAM) y cada fila elegible lleva `aria-selected`. Una fila con un
 * boton de eleccion dentro se miro y no entra: la eleccion es de la fila entera, y un segundo boton
 * por fila junto a las `accionesPorFila` seria una parada mas del tabulador en cada una.
 *
 * <h2>El teclado es el del maestro de #67: la eleccion NO sigue al foco</h2>
 *
 * Tabulador itinerante por filas: el tabulador entra por la elegida —o por la primera elegible—,
 * ↑/↓ mueven el foco, Inicio/Fin van a los extremos, e **Intro o Espacio eligen**. Si eligiera el
 * foco, bajar diez filas serian diez direcciones y diez lecturas pedidas por el sistema. El `grid`
 * del APG mueve el foco por CELDAS y saca del tabulador los botones de dentro; aqui el foco va por
 * filas y **los botones de `accionesPorFila` siguen en el tabulador**, porque la otra forma cambia
 * el teclado de una tabla que ya funciona (#65) y no lo pide nadie.
 *
 * <h2>Pulsar un boton de la fila NO la elige</h2>
 *
 * Un clic o una tecla que nace en un mando de la fila —una accion, tambien la impedida con su
 * motivo— es de ese mando: «Anular» sobre la fila 3 no puede mover la ruta a la fila 3.
 *
 * <h2>Sin `hoja`, en el estado de la tabla</h2>
 *
 * Como la pagina y el orden: fuera del marco lo elegido vive en la tabla y no sobrevive a recargar.
 * Cambiar de pagina o de orden **no borra la eleccion**: es otro sitio de la ruta.
 */
export interface EleccionDeLaFila {
  /**
   * Donde vive la fila elegida: un parametro, o `EL_SUJETO`. Es tambien como se lee: `ruta.<enLaRuta>`.
   * La hoja lo tiene que declarar en su `Destino.enLaRuta`, como la pagina: lo que no declara, el
   * marco lo ignora con aviso y la eleccion no sobrevive a recargar.
   */
  readonly enLaRuta: EnLaRuta;
  /**
   * El nombre del dato **de la fila** cuyo valor se escribe: `'codigo'`. Viaja tal cual, sin
   * `traducir`. **Una fila que no lo trae —ausente, `null` o `''`— no es elegible**: ni se enfoca ni
   * se pulsa, y no lleva `aria-selected`.
   */
  readonly desde: string;
}

/**
 * **Un filtro que no sale de la pantalla** (#86, `filtro-en-el-cliente-con-conteo`, H02 de
 * `normativa`).
 *
 * <h2>No viaja: ni a la ruta ni al servidor, y es a proposito</h2>
 *
 * Es lo contrario del campo con `eleccion` de #94, que escribe en la ruta para que el sistema pida
 * otra lectura. Esto acota **las filas que el servidor ya mando** —la pagina que llego o, con la
 * paginacion en cliente, todas las recibidas **antes** de cortar la pagina—, y lo que se elige vive
 * en el estado de la tabla. Mandarlo seria pedir algo que el backend no admite: un `?estado=` que no
 * esta en su lista blanca es un 422. Por eso tampoco ensucia la hoja: no es trabajo sin guardar.
 *
 * <h2>El conteo dice la diferencia, para que no se lea como filas que faltan</h2>
 *
 * Con el filtro puesto, la barra dice «N de M» —las que deja de las que llegaron— en una region viva,
 * y «T en total» **solo si el sistema dio `total`**: M es lo que hay delante, y el total del
 * servidor no se deduce de una pagina. Las palabras son del saco (`textos.filasQueDejaElFiltro`),
 * como «Pagina N de M»: la mecanica es de la definicion y el idioma no.
 *
 * <h2>Lo que dice una tabla que el filtro deja sin filas NO es su `vacio`</h2>
 *
 * `vacio` es «la lectura contesto una lista vacia» (#65); aqui la lista llego con filas y es el
 * filtro el que no deja ninguna. Se dice con `sinCoincidencias` o con la frase del saco, y la salida
 * es quitar el filtro, que esta a la vista.
 */
export interface FiltroLocalDeLaTabla<T extends Texto = string> {
  readonly buscador?: BuscadorDeLaTabla<T>;
  /**
   * Los chips, en su orden. Pulsados varios, **los del mismo dato se suman y los de datos distintos
   * se cruzan**: «Vigentes» y «Anulados» dejan los dos estados; «Vigentes» y «Con cita», las vigentes
   * que tienen cita.
   */
  readonly chips?: readonly ChipDelFiltro<T>[];
  /** El nombre del dato con cuantas filas hay EN TOTAL, si el servidor lo dice. Sin el, no se escribe. */
  readonly total?: string;
  /** Lo que se dice cuando el filtro no deja ninguna. Sin ella, `textos.ningunaPasaElFiltro`. */
  readonly sinCoincidencias?: T;
}

/** La caja de busqueda: busca lo tecleado en las celdas, sin distinguir mayusculas ni tildes. */
export interface BuscadorDeLaTabla<T extends Texto = string> {
  /** Su nombre accesible. Obligatorio: no se dibuja rotulo a la vista, y un campo sin nombre no se encuentra. */
  readonly rotulo: T;
  readonly marcador?: T;
  /** Los indices de las columnas en que busca. Sin ellos, en todas. */
  readonly columnas?: readonly number[];
}

/**
 * Un chip: un boton que se queda pulsado (`aria-pressed`) y deja las filas cuyos datos cumplen `si`.
 * Es la `Condicion` de #44, leida contra los `datos` de cada fila: el chip no mira el texto de la celda.
 */
export interface ChipDelFiltro<T extends Texto = string> {
  readonly rotulo: T;
  readonly si: Condicion;
}

/**
 * **El vacio con su salida dentro** (#61, `vacio-con-su-salida`).
 *
 * `tabla-con-vacio` de #65 pone la frase; esto pone ademas **que hacer**, que es lo que convierte
 * una lista vacia en un sitio del que se puede salir sin adivinar a donde ir. Las acciones son las
 * de #66 —abren un acto, van a otra hoja o hacen una operacion— y se impiden con su motivo igual.
 */
export interface VacioDeLaTabla<T extends Texto = string> {
  readonly titulo: T;
  /** La segunda linea: lo que toca hacer. */
  readonly texto?: T;
  /** La salida, DENTRO del vacio. Vacio o ausente, el vacio es solo su frase. */
  readonly acciones?: readonly DefinicionDeAccion[];
}

/**
 * **De donde sale la pagina que se ve** (#61, `paginacion-y-orden-en-el-servidor`, `tablas-grandes`).
 *
 * <h2>Las dos no son la misma cosa con un interruptor</h2>
 *
 * <table>
 *   <tr><td>`servidor`</td><td>las filas que llegan **ya son una pagina**. El interprete no pide:
 *     escribe la pagina en la ruta y quien lee la ruta pide. Quien dice si hay una siguiente es
 *     **el servidor** (`hayMas`), y no una cuenta de la pantalla: con el tope alcanzado, contar las
 *     filas recibidas diria que no hay mas justo cuando las hay</td></tr>
 *   <tr><td>`cliente`</td><td>llegan **todas** —decenas de miles— y aqui se monta una sola pagina.
 *     Entonces si se cuenta, porque estan todas delante</td></tr>
 * </table>
 *
 * La pagina empieza **en cero**, que es como la piden los backends del producto; la que se lee
 * empieza en uno, y esa suma es de un indice y no de un importe (regla 1).
 */
export type PaginacionDeLaTabla =
  | {
      readonly en: 'servidor';
      /** Donde vive la pagina abierta. Sin `hoja`, la tabla la guarda en su estado. */
      readonly enLaRuta: EnLaRuta;
      /** Cuantas filas se piden. Es dato de la definicion: el tope lo fija el backend. */
      readonly tamano: number;
      /** Los tamanos que se ofrecen, en su orden. Sin `tamanoEnLaRuta`, no se ofrece elegir. */
      readonly tamanos?: readonly number[];
      readonly tamanoEnLaRuta?: EnLaRuta;
      /** El nombre del dato BOOLEANO con lo que el servidor dijo de si hay mas. */
      readonly hayMas: string;
      /** El nombre del dato con cuantas paginas dijo que hay. Sin el se lee «Pagina N», sin total. */
      readonly paginas?: string;
    }
  | {
      readonly en: 'cliente';
      readonly enLaRuta: EnLaRuta;
      /** Cuantas filas se montan. Las demas no llegan al DOM. */
      readonly tamano: number;
      readonly tamanos?: readonly number[];
      readonly tamanoEnLaRuta?: EnLaRuta;
      /** No: las filas estan todas delante, y contarlas es la respuesta. */
      readonly hayMas?: never;
      readonly paginas?: never;
    };

/** Un campo por el que el servidor admite ordenar. `valor` viaja; `rotulo` se lee. */
export interface CampoDeOrden<T extends Texto = string> {
  /** Lo que viaja. **Nunca pasa por `traducir`**: cambiar de idioma no puede cambiar lo que se pide. */
  readonly valor: string;
  readonly rotulo: T;
}

/**
 * **Por que campo se ordena, y en que sentido** (#61, `paginacion-y-orden-en-el-servidor`).
 *
 * <h2>Lista blanca, y por eso la tabla no ordena: avisa</h2>
 *
 * El orden lo hace el servidor y va por lista cerrada —uno que no esta es un 422—, asi que lo que
 * se ofrece son **exactamente** los campos que la definicion escribe. Ninguna columna se hace
 * ordenable por tener rotulo: se ordena por lo que `campos` nombra, y la columna que lleva ese
 * `campo` es la que se anuncia con `aria-sort`.
 *
 * Los dos valores del sentido son del backend —`ASCENDENTE` en uno, `asc` en otro—, y por eso son
 * dato y no una constante de la libreria.
 */
export interface OrdenDeLaTabla<T extends Texto = string> {
  readonly campos: readonly CampoDeOrden<T>[];
  /** Donde vive el campo elegido. Sin valor, el primero de `campos`. */
  readonly enLaRuta: EnLaRuta;
  /** Donde vive el sentido. Sin valor, `ascendente`. */
  readonly sentidoEnLaRuta: EnLaRuta;
  readonly ascendente: string;
  readonly descendente: string;
}

/**
 * Una opcion de una lista **cuyo valor no es su rotulo** (#65, `opciones-con-valor-y-rotulo`).
 *
 * Lo que viaja es `valor` y lo que se lee es `rotulo`. **El valor nunca pasa por `traducir`**:
 * cambiar de idioma no puede cambiar lo que se envia. `valor: ''` es legitimo —«Todos»—.
 *
 * Las opciones de un enumerado del contrato no son otra forma: la definicion es codigo, y el
 * sistema escribe `TIPOS.map((v) => ({ valor: v, rotulo: ROTULOS[v] }))`.
 */
export interface OpcionDeLista {
  readonly valor: string;
  readonly rotulo: string;
}

/** Lo que una lista admite como opcion: una cadena —valor y rotulo a la vez, como en #27— o las dos cosas aparte. */
export type OpcionDelCampo = string | OpcionDeLista;

/** Lo que se pinta para un valor: su tono y, si no es el valor mismo, la frase que lo dice. */
export interface CasoDeInsignia {
  readonly tono: TonoDeInsignia;
  /** Una frase, y por eso pasa por `traducir`. Sin ella se pinta el valor, que es un dato y no pasa. */
  readonly texto?: string;
}

/**
 * **El tono de una insignia es dato o regla declarada, nunca deducido de su texto** (#65, AC-2).
 *
 * <table>
 *   <tr><td>`{ segun?, casos, otro }`</td><td>casos declarados. Lee el valor mismo —la celda, el
 *     campo— o, con `segun`, un dato con nombre: el de la fila en una tabla, el de la pantalla en un
 *     campo. `otro` es obligatorio: sin el la regla no es total, y lo que no casa caeria en
 *     deducir</td></tr>
 *   <tr><td>`{ tonoDesde, siNoTrae }`</td><td>el tono YA viene en los datos, decidido por el
 *     sistema. Un «0» es `mal` en una lista y `atencion` en otra (`normativa`, #61 H18)</td></tr>
 * </table>
 *
 * Los casos se buscan por el valor escrito: `true` casa con la clave `'true'`.
 */
export type ReglaDeLaInsignia =
  | {
      readonly segun?: string;
      readonly casos: Readonly<Record<string, CasoDeInsignia>>;
      readonly otro: CasoDeInsignia;
    }
  | {
      readonly tonoDesde: string;
      /** El tono si el dato no trae uno de los cuatro. */
      readonly siNoTrae: TonoDeInsignia;
    };

/**
 * La segunda linea de una fila (#65, `detalle-de-fila`): lo que solo tienen algunas filas y solo
 * dice algo junto —quien anulo, cuando y por que—. Se resuelve contra los datos DE LA FILA.
 */
export interface DetalleDeFila<T extends Texto = string> {
  readonly texto: T;
  /** Sin ella, toda fila lleva su detalle. */
  readonly cuando?: Condicion;
}

/**
 * Un boton de una fila: **una accion de #66**, con la `clave` por la que `segun.ofrece` la nombra.
 *
 * Abre un acto (`abre`, con `con` para pasarle datos de la fila), va a otra hoja (`va`) o hace una
 * operacion del sistema (`hace`), y se impide con su motivo (`impedida`), igual que las del bloque.
 * Sus textos se resuelven contra los datos de la pantalla **y los de su fila**, que ganan.
 */
export type AccionDeFila = DefinicionDeAccion & { readonly clave: string };

/**
 * **Los botones de cada fila, y cuales ofrece cada una** (#65, `acciones-por-fila`).
 *
 * La fila declara sus acciones **como las declara un bloque** (#66): lo que pasa al pulsar lo atiende
 * `<Pantalla actos>`, `alHacer` o `navegacion`, y sin quien lo atienda el boton sale impedido con su
 * motivo. Lo unico que la fila anade es **cuales ofrece**, segun un dato suyo.
 */
export interface AccionesPorFila<T extends Texto = string> {
  /** El rotulo de la columna. */
  readonly columna: string;
  /** Todas las que alguna fila puede ofrecer, en el orden en que se dibujan. */
  readonly acciones: readonly AccionDeFila[];
  /**
   * Cuales ofrece cada fila, segun un dato suyo: una tabla de transiciones por estado. Un valor que
   * no esta en `ofrece` no ofrece ninguna. Sin `segun`, todas las filas ofrecen todas.
   */
  readonly segun?: {
    readonly dato: string;
    readonly ofrece: Readonly<Record<string, readonly string[]>>;
  };
  /** Lo que se lee en la fila que no ofrece ninguna: «Sin acciones». */
  readonly sinAcciones: string;
  /** El nombre del grupo de botones de cada fila. Sin el, `textos.accionesDeLaFila(primeraCelda)`. */
  readonly nombreDelGrupo?: T;
}

/** Una tabla de `bloque.tablas`: con `clave`, porque por indice dos tablas no tienen de donde sacar filas distintas. */
export type DefinicionDeTablaConClave<T extends Texto = string> = DefinicionDeTabla<T> & { readonly clave: string };

/**
 * Una palabra de la definicion: **fija, o con un dato dentro** (#44, `texto-con-dato`).
 *
 * <h2>Las cuatro formas, y que pasa por `traducir` en cada una</h2>
 *
 * <table>
 *   <tr><td>`'Aqui no se sella nada'`</td><td>fija. Se traduce entera</td></tr>
 *   <tr><td>`{ plantilla: 'Registro {registroId}' }`</td><td>se traduce **la plantilla** y despues
 *     se pone el dato. El hueco nombra el dato directamente: la clave de traduccion es la plantilla
 *     misma, y no hay una segunda tabla `valores` que se desincronice</td></tr>
 *   <tr><td>`{ desde: 'motivo' }`</td><td>el dato tal cual. **No se traduce**: es lo que dijo el
 *     servidor</td></tr>
 *   <tr><td>`{ segun: 'vista', casos: {…}, otro? }`</td><td>una frase u otra segun lo que valga
 *     un dato. Se traduce el caso elegido</td></tr>
 * </table>
 *
 * **El dato nunca pasa por `traducir`**, por lo mismo que no pasa una celda: traducir un
 * identificador lo cambia. Los datos salen de `DatosDeLaPantalla.nombrados`.
 */
export type Texto =
  | string
  | { readonly plantilla: string }
  | { readonly desde: string }
  | {
      readonly segun: string;
      readonly casos: Readonly<Record<string, string>>;
      /** Lo que se dice si el dato no casa con ningun caso. Sin el, `textos.datoAusente`. */
      readonly otro?: string;
    };

/**
 * **Un tramo de una frase con marcas** (#86, `texto-con-marcas`): texto corrido, codigo o enfasis.
 *
 * Los `?: never` son los de `DefinicionDeAccion`: sin ellos TypeScript admite `{ texto, codigo }`,
 * porque en una union la comprobacion de propiedades de mas mira todas las ramas a la vez, y un
 * tramo que fuera las dos cosas no tiene ninguna lectura.
 */
export type TramoConMarca<T extends Texto = Texto> =
  | { readonly texto: T; readonly codigo?: never; readonly fuerte?: never }
  | { readonly codigo: T; readonly texto?: never; readonly fuerte?: never }
  | { readonly fuerte: T; readonly texto?: never; readonly codigo?: never };

/**
 * **Una frase con `code` y `strong` DENTRO** (#86, `texto-con-marcas`, N6 de `normativa`).
 *
 * «Lo impide `{restriccion}`: **no se puede deshacer**» es UNA frase. Con el texto como dato, la
 * marca no puede ser JSX suelto —la definicion no es codigo de React—, y partirla en tres piezas
 * de la pantalla la dejaria en tres parrafos. Asi que la frase es una lista de tramos, en su orden,
 * y el interprete dibuja cada uno con su elemento: `texto` tal cual, `codigo` en `<code>` y
 * `fuerte` en `<strong>`.
 *
 * <h2>Que pasa por `traducir`, tramo a tramo</h2>
 *
 * Cada tramo es un `Texto`, y se resuelve como cualquiera —una plantilla, un dato, un caso—, con
 * una diferencia: **el tramo `codigo` no se traduce**, igual que el nombre de un campo del contrato
 * o una operacion del pie. Es codigo, y traducirlo lo cambia. Se traducen `texto` y `fuerte`, cada
 * uno por separado: la clave de traduccion es el tramo.
 *
 * <h2>Por que no es otra forma de `Texto`</h2>
 *
 * Porque `Texto` se resuelve a `string` (`resolverTexto`) y **eso es lo que leen los sistemas**: lo
 * meten en un `aria-label`, en un `title`, en una lista de claves. Una forma que se dibuja como
 * elementos no cabe en ninguno de esos sitios, y anadirla a `Texto` ensancharia cada campo que ya
 * es un `Texto`. Por eso entra solo donde se dibuja como prosa —la nota de un bloque y la de un
 * acto— y por un campo aparte: ver `DefinicionDeBloque.notaConMarcas`.
 */
export type TextoConMarcas<T extends Texto = Texto> = readonly TramoConMarca<T>[];

/**
 * Cuando una pieza **existe** (#44, `pieza-condicional`).
 *
 * Lee `DatosDeLaPantalla.nombrados`. Un dato ausente no cumple `vale`: el aviso de «no esta
 * sellado» no sale hasta que la lectura ha contestado que no lo esta, y no antes.
 */
export type Condicion =
  | { readonly dato: string; readonly vale: string | boolean | null }
  /** `hay: true` es «ni ausente, ni `null`, ni `''`». Un `false` SI es un dato. */
  | { readonly dato: string; readonly hay: boolean };

/**
 * La lectura de la que depende una pieza (#44, `estados-de-una-lectura`).
 *
 * La pieza no pide nada —la libreria no conecta datos—: nombra la lectura por su `clave`, y el
 * estado lo pone el sistema en `DatosDeLaPantalla.lecturas`.
 */
export interface LecturaDeUnaPieza {
  readonly clave: string;
  /**
   * Lo que se dice mientras falta el sujeto para poder pedir: «Escriba el identificador y aqui
   * saldra su detalle». Es de la hoja, y por eso va en la definicion. Sin el, `textos.enEspera`.
   */
  readonly espera?: Texto;
}

/**
 * Lo que toda pieza puede declarar, **salvo el pie de operaciones** (#44).
 *
 * Son tres modificadores y no una pieza cada uno, porque se combinan: un aviso con condicion, un
 * bloque que depende de una lectura y avisa del fallo de otra, una pieza del consumidor que solo
 * se monta con datos.
 */
export interface ComunDeUnaPieza {
  /** Sin ella, la pieza existe siempre. Oculta, **conserva su indice** en `bloques`. */
  readonly cuando?: Condicion;
  /** La lectura cuyos cuatro estados dibuja esta pieza en su sitio. */
  readonly lectura?: LecturaDeUnaPieza;
  /**
   * Lecturas vecinas cuyo **fallo** se dice encima, sin tapar lo que si llego
   * (`fallo-fuera-de-su-lectura`). Solo el fallo: su espera no tapa nada.
   */
  readonly fallosDe?: readonly string[];
}

/**
 * Un grupo de campos con su titulo, su nota y —a veces— su tabla.
 *
 * <h2>Por que es generico en el tipo de sus textos, y por omision `string`</h2>
 *
 * Porque `rentas` recorre sus definiciones y mete `bloque.titulo` y `bloque.nota` en listas de
 * cadenas (`src/i18n/catalogo-de-claves.ts:51-62`). Con `titulo: Texto` a secas eso deja de
 * compilar; con el parametro, `DefinicionDeBloque` sigue siendo el de #27 y la pieza nueva es
 * `DefinicionDeBloque<Texto>`.
 */
export interface DefinicionDeBloque<
  T extends Texto = string,
  O extends OpcionDelCampo = [T] extends [string] ? string : OpcionDelCampo,
> extends ComunDeUnaPieza {
  /** Opcional: un bloque sin `tipo` es un bloque, que es como lo escribe `rentas`. */
  readonly tipo?: 'bloque';
  readonly titulo: T;
  /** Que ES esta parte de la pantalla. Vacia cuando el titulo ya lo dice todo. */
  readonly nota: T;
  /**
   * **La nota, con `code` y `strong` dentro de la frase** (#86, `texto-con-marcas`). Gana a `nota`
   * si el bloque trae las dos, y se escribe con `nota: ''`.
   *
   * <h2>Por que es un campo aparte y no `nota: T | TextoConMarcas<T>`</h2>
   *
   * **Medido, no supuesto**, por la misma regla que dejo `vacioConSalida` fuera de `vacio`: con la
   * union, lo que ya lee `nota` como un `Texto` deja de compilar. En este repositorio son los dos
   * sitios que la dibujan, y son exactamente lo que escribe una pieza del consumidor con el
   * `resolverTexto` que el indice publica para eso:
   *
   * ```
   * paquetes/ui/interprete/BloqueDeLaPantalla.tsx(101,48): error TS2345: Argument of type
   *   'Texto | TextoConMarcas<Texto>' is not assignable to parameter of type 'Texto'.
   * ```
   *
   * Con el tipo condicional —`[T] extends [string] ? T : …`— el de por omision seguia siendo
   * `string` y `rentas` no lo notaba; quien lo notaba era `DefinicionDeBloque<Texto>`, que es la
   * que recorren los sistemas que usan las piezas. Aparte, no lo nota nadie.
   */
  readonly notaConMarcas?: TextoConMarcas<T>;
  /**
   * Los campos del grupo. Vacio en los bloques que solo traen una tabla. En la de hoy sus listas son
   * de cadenas; en la de las piezas admiten `{ valor, rotulo }` (#65).
   */
  readonly campos: readonly DefinicionDeCampo<O>[];
  readonly tabla?: DefinicionDeTabla<T>;
  /**
   * Mas de una tabla en el mismo bloque (#65, `varias-tablas-en-un-bloque`), cada una con sus
   * columnas, su vacio y su nota. Van despues de `tabla`, si el bloque trae las dos.
   */
  readonly tablas?: readonly DefinicionDeTablaConClave<T>[];
  /**
   * Lo que hay que saber para leer lo de arriba, **debajo** de los campos y de la tabla
   * (#44, `nota-al-pie-del-bloque`). La `nota` va arriba y dice que es el bloque; esto va abajo y
   * dice como leerlo: «son cifras y no una tasa, a proposito».
   */
  readonly pie?: T;
  /**
   * Los botones bajo la cabecera: abrir un acto, ir a otra hoja, volver a leer (#66,
   * `acciones-del-bloque`). Se quedan aunque la lectura del bloque no este `con-datos`, como la
   * cabecera. Ver `tipos-de-los-actos.ts`.
   */
  readonly acciones?: readonly DefinicionDeAccion[];
  /**
   * **Insignias fijas en la cabecera, junto al titulo** (#86, `insignias-fijas-en-la-cabecera`):
   * «Vigente», «Solo lectura». Van FUERA del encabezado, asi que el nombre accesible del titulo no
   * cambia: quien salta de encabezado en encabezado oye «Detalle del registro» y no «Detalle del
   * registro Vigente Solo lectura».
   */
  readonly insignias?: readonly InsigniaDeLaCabecera<T>[];
  /** Lo que va a la derecha de la cabecera: el codigo de lo que se mira, «R-00042» (#86). */
  readonly aLaDerecha?: { readonly codigo: T };
}

/**
 * Una insignia de la cabecera de un bloque (#86). **El tono es dato**, como en toda insignia desde
 * #65: nunca se deduce del texto. Es fija —no hay regla que la cambie segun un dato—; el texto si
 * puede llevar uno, porque es un `Texto`.
 */
export interface InsigniaDeLaCabecera<T extends Texto = Texto> {
  readonly tono: TonoDeInsignia;
  readonly texto: T;
}

/** Un aviso con tono, titulo y parrafo (#44, `aviso`). Es la `Alerta`, como dato. */
export interface DefinicionDeAviso extends ComunDeUnaPieza {
  readonly tipo: 'aviso';
  readonly tono: TonoDeInsignia;
  readonly titulo: Texto;
  readonly texto?: Texto;
}

/**
 * **El punto de extension** (#44, AC-2): una parte de la pantalla que dibuja el sistema.
 *
 * La `clave` busca un componente en `PantallaProps.piezas`. La libreria no sabe que hay detras
 * —un plano, una rejilla de casillas, un flujo de tres pasos— y no tiene por que: el componente es
 * del sistema, cierra sobre sus propios hooks y recibe lo mismo que el interprete tiene.
 *
 * No lleva un `ajustes: unknown` para configurarlo desde la definicion, a proposito: un dato sin
 * tipo es un contrato que ningun compilador lee. Dos usos distintos de la misma pieza son dos
 * claves, o un componente que lee lo suyo de `datos`.
 */
export interface DefinicionDePiezaDelConsumidor extends ComunDeUnaPieza {
  readonly tipo: 'delConsumidor';
  readonly clave: string;
}

/**
 * **Que operaciones sirven la hoja y que le falta al backend** (#44, `pie-de-operaciones`).
 *
 * <h2>No extiende `ComunDeUnaPieza`, y es a proposito</h2>
 *
 * Sin `cuando` ni `lectura`: el pie sigue diciendolo **con el servidor caido**, que es cuando mas
 * falta. Con la red cortada la pantalla no puede ensenar una cifra y sigue nombrando lo que le
 * habria contestado. Lo vigila una barrera de tipo.
 */
export interface DefinicionDelPie {
  readonly tipo: 'pie';
  /**
   * Las operaciones que la leen, **cada una con su verbo**: `'GET /recursos'`. Son codigo: no se
   * traducen, y la libreria no les antepone ningun prefijo —el prefijo es del sistema, ADR-0030 §2—.
   */
  readonly lee: readonly string[];
  /** Y las que la escriben. Van aparte: una escritura que no llega no deja la pantalla sin datos. */
  readonly escribe?: readonly string[];
  /** Lo que el backend no publica, y por eso esta pantalla no lo dibuja. */
  readonly falta?: Texto;
}

/**
 * **Lista a la izquierda, detalle a la derecha** (#67, `maestro-detalle`).
 *
 * Lo elegido vive en la ruta (`enLaRuta`) y no en la pieza: recargar o compartir el enlace deja
 * elegido lo mismo. El detalle es una lista de piezas como la de la pantalla —pestanas incluidas—,
 * y la pieza no sabe que lectura lo llena: el sistema lee `ruta.sujeto` y pide.
 */
export interface DefinicionDeMaestroDetalle extends ComunDeUnaPieza {
  readonly tipo: 'maestroDetalle';
  /** `'sujeto'` o el nombre de un parametro. Ver `hoja.ts`. */
  readonly enLaRuta: EnLaRuta;
  readonly maestro: {
    /** El nombre accesible de la lista. No se dibuja, y por eso es obligatorio. */
    readonly rotulo: Texto;
    /** La clave de sus filas en `DatosDeLaPantalla.listas`. */
    readonly filas: string;
    /**
     * Lo que dice cada fila. Los huecos nombran **campos de la fila**, y no datos de la pantalla:
     * cada fila es otro registro. Por eso aqui **una cadena es una plantilla** —`'{tipo} · {codigo}'`—
     * y no hace falta escribir `{ plantilla }`.
     */
    readonly fila: { readonly titulo: Texto; readonly linea?: Texto; readonly insignia?: Texto };
    /** Lo que se dice con la lista vacia. Nunca una lista en blanco. */
    readonly vacio: Texto;
    /** El ancho de la lista, en pixeles. Por omision, el del artboard. */
    readonly ancho?: number;
    /** La lectura de la lista: su espera, sus barras o su fallo van en la columna de la lista. */
    readonly lectura?: LecturaDeUnaPieza;
  };
  readonly detalle: {
    /** Lo que ocupa el detalle sin nada elegido. Con `sinEleccionSeDibuja`, lo que dice encima de el. */
    readonly sinEleccion: Texto;
    /**
     * **Sin eleccion, el detalle SE DIBUJA igual** (#95, `detalle-sin-eleccion-que-se-dibuja`), con
     * `sinEleccion` encima diciendo por que no tiene dato: su cabecera y sus piezas, y cada lectura en
     * el estado que el sistema le ponga —`en-espera`, con su frase—. Sin el, el todo o nada de #67:
     * `sinEleccion` ocupa el detalle entero.
     *
     * <h2>Por que es un campo aparte y no `sinEleccion: Texto | { dibuja, dice }`</h2>
     *
     * Por la regla que dejo `vacioConSalida` fuera de `vacio` y `notaConMarcas` fuera de `nota`, y
     * **medido**: con la union deja de compilar lo que ya lee `sinEleccion` como un `Texto` —la
     * propia pieza, y lo que escribe un sistema con el `resolverTexto` publicado—:
     *
     * ```
     * paquetes/ui/interprete/MaestroDetalle.tsx(200,25): error TS2345: Argument of type
     *   'Texto | { readonly dibuja: true; readonly dice: Texto; }' is not assignable to parameter
     *   of type 'Texto'.
     * ```
     *
     * Aparte, no lo nota nadie.
     */
    readonly sinEleccionSeDibuja?: boolean;
    /** Lo elegido no vino en la lista (otra pagina, otro filtro): se dice, y el detalle sigue. */
    readonly noEstaEnLaLista: Texto;
    readonly cabecera?: { readonly titulo: Texto; readonly subtitulo?: Texto };
    readonly bloques: readonly PiezaDeLaPantalla[];
  };
}

/** Una pestana: su clave —lo que viaja a la ruta—, su rotulo y lo que dibuja abierta. */
export interface PestanaDeLaPantalla {
  readonly clave: string;
  readonly rotulo: Texto;
  readonly bloques: readonly PiezaDeLaPantalla[];
}

/**
 * **Pestanas dentro de la hoja** (#67, `pestanas`).
 *
 * La abierta vive en la ruta, y **solo se dibujan los bloques de la abierta**: la que no se pinta
 * no pide. Un valor en la ruta que no es ninguna pestana abre la primera.
 */
export interface DefinicionDePestanas extends ComunDeUnaPieza {
  readonly tipo: 'pestanas';
  readonly enLaRuta: EnLaRuta;
  /** El nombre accesible de la tira. No se dibuja. */
  readonly rotulo: Texto;
  readonly pestanas: readonly PestanaDeLaPantalla[];
}

/** Lo que `bloques` puede llevar: el bloque de #27, las tres piezas de #44, el acto de #66 y las dos de #67. */
export type PiezaDeLaPantalla =
  | DefinicionDeBloque<Texto>
  | DefinicionDeAviso
  | DefinicionDePiezaDelConsumidor
  | DefinicionDelPie
  | DefinicionDeActo
  | DefinicionDeMaestroDetalle
  | DefinicionDePestanas;

/**
 * Una pantalla.
 *
 * <h2>Por que es generica, y por omision lleva solo bloques</h2>
 *
 * Porque ensanchar `bloques` a `PiezaDeLaPantalla` rompe a quien las lee: `rentas` recorre sus
 * cuarenta definiciones leyendo `bloque.campos` en siete sitios —`src/catalogo.ts:68`, su
 * inventario de claves, sus guardas y su `e2e`— y sobre una union esa lectura no compila. Asi que
 * `DefinicionDePantalla` sigue siendo la de #27, y quien use las piezas nuevas escribe
 * `DefinicionDePantalla<PiezaDeLaPantalla>`. `<Pantalla>` acepta las dos: un arreglo de solo lectura
 * de bloques cabe en uno de piezas.
 */
export interface DefinicionDePantalla<Pieza extends PiezaDeLaPantalla = DefinicionDeBloque> {
  /**
   * La linea de la barra de instruccion: **que hay que hacer aqui**.
   *
   * Va dentro de la pantalla y no en un registro aparte: dos registros paralelos por clave se
   * desincronizan, y una pantalla nueva sin instruccion no daria ningun error. La dibuja
   * `@kamayuk/shell`, no el interprete: el sistema la pasa al catalogo.
   */
  readonly instruccion: string;
  readonly bloques: readonly Pieza[];
  /**
   * **Como lleva esta hoja la marca de sucia y lo tecleado** (#86). Sin ella, como hasta #86: la
   * hoja solo se ensucia si el sistema cablea `alEnsuciar`, y lo tecleado muere con la pantalla.
   */
  readonly hoja?: ComportamientoDeLaHoja;
}

/**
 * **La marca de sucia y lo tecleado, como dato de la hoja** (#86).
 *
 * <h2>`suciaAlTeclear` — `la-hoja-se-marca-sucia-al-teclear`</h2>
 *
 * Con ella —y una `<Pantalla hoja>` que traiga `marcarSucia`— **cada** cambio que ensucia llama a
 * `hoja.marcarSucia()`, y al guardar un acto la hoja se limpia y lo tecleado se vacia. Hasta aqui el
 * aviso salia solo con la PRIMERA tecla de la vida de la pantalla y lo tecleado no se vaciaba nunca,
 * asi que una hoja guardada no podia volver a ensuciarse: la segunda tanda de cambios se perdia sin
 * preguntar.
 *
 * El issue la escribia con `limpiaAl: ['guardar', 'descartar']`. **No entra**, y es criterio y no
 * olvido: una lista cuyo unico valor con sentido es la lista entera es un dato que solo se puede
 * escribir mal —una hoja que siguiera sucia despues de guardar es el defecto de este hueco—.
 *
 * <h2>`conservaLoTecleado` — `lo-tecleado-y-la-negativa-sobreviven`</h2>
 *
 * **Solo `'soloSiSucia'`, la opcion C que se decidio.** Con ella, y una `<Pantalla hoja>` que traiga
 * `alTeclear`, lo tecleado —en los campos y en los actos— vive en el marco y no en la pantalla, y
 * sobrevive a irse y volver **mientras la hoja siga sucia**. Es una union de un valor a proposito: la
 * A (siempre) y la B (nunca, la de normativa#58) se miraron, y el dia que una hoja demuestre que
 * necesita otra entra como otro valor sin tocar a nadie.
 */
export interface ComportamientoDeLaHoja {
  readonly suciaAlTeclear?: boolean;
  readonly conservaLoTecleado?: 'soloSiSucia';
}

/**
 * Los tonos de una insignia, **derivados de la pieza** y no copiados.
 *
 * Escribir aqui `'ok' | 'atencion' | 'mal' | 'info'` seria una segunda lista que, el dia que la
 * pieza cambie, se queda vieja **en verde**. Sacandolo de la pieza, no puede.
 */
export type TonoDeInsignia = ComponentProps<typeof Insignia>['tono'];
