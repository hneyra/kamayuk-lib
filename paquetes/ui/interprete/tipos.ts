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
 * Un desplegable de lista cerrada. Sus opciones son el dato; sin ellas no dibuja nada.
 *
 * **Generico en sus opciones, y por omision de cadenas** (#65): `rentas` mete `campo.opciones` en
 * una lista de cadenas (`src/i18n/catalogo-de-claves.ts:56`), asi que la de hoy no se ensancha. La
 * de las piezas —la de `DefinicionDeBloque<Texto>`— admite `{ valor, rotulo }`.
 */
export interface CampoDeLista<O extends OpcionDelCampo = string> {
  readonly etiqueta: string;
  readonly tipo: ConAnchoCompleto<'s'>;
  /** Las opciones, en su orden. La primera es la que el interprete deja seleccionada. */
  readonly opciones: readonly O[];
  /** La linea de debajo (#65, `ayuda-en-una-lista`): «solo los campos que el servidor admite». */
  readonly ayuda?: string;
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
  readonly tipo: ConAnchoCompleto<'r'>;
  /**
   * Se pinta como insignia, con el tono que dice la regla (#65, `dato-con-insignia`). La regla lee
   * el valor del campo o, con `segun`, un dato de `DatosDeLaPantalla.nombrados`.
   */
  readonly insignia?: ReglaDeLaInsignia;
}

/** Una casilla. Su texto no es ayuda: es lo que se lee AL LADO de la marca. */
export interface CampoDeCasilla {
  readonly etiqueta: string;
  readonly tipo: ConAnchoCompleto<'c'>;
  /** La etiqueta de la marca. */
  readonly casilla: string;
}

/** Los tipos que se escriben: texto, fecha y area. */
export type TipoDeEntrada = ConAnchoCompleto<'' | 'd' | 'a' | 't'>;

/** Un campo que se escribe, con su ayuda opcional debajo. */
export interface CampoDeEntrada {
  readonly etiqueta: string;
  readonly tipo: TipoDeEntrada;
  /** La linea de ayuda. La mayoria no la lleva. Si dice «opcional», el campo se marca como tal. */
  readonly ayuda?: string;
  /**
   * El texto gris dentro del campo vacio (#65, `marcador`): «el numero que devolvio el alta». Es una
   * frase, y pasa por `traducir`. En una fecha sustituye a `textos.marcadorDeFecha`.
   */
  readonly marcador?: string;
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
   */
  readonly vacio?: T;
  /**
   * La cabecera queda fija y el cuerpo se desplaza dentro de su propio marco
   * (#65, `tabla-de-cabecera-fija`). La altura la pone quien la contiene.
   */
  readonly cabeceraFija?: boolean;
  /** Una segunda linea bajo las filas que la tengan (#65, `detalle-de-fila`). */
  readonly detalleDeFila?: DetalleDeFila<T>;
  /** Los botones de cada fila, segun un dato suyo (#65, `acciones-por-fila`). */
  readonly accionesPorFila?: AccionesPorFila<T>;
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
    /** Lo que ocupa el detalle sin nada elegido. */
    readonly sinEleccion: Texto;
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
}

/**
 * Los tonos de una insignia, **derivados de la pieza** y no copiados.
 *
 * Escribir aqui `'ok' | 'atencion' | 'mal' | 'info'` seria una segunda lista que, el dia que la
 * pieza cambie, se queda vieja **en verde**. Sacandolo de la pieza, no puede.
 */
export type TonoDeInsignia = ComponentProps<typeof Insignia>['tono'];
