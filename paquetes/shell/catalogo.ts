import type { NombreDeIcono } from '../ui/index.ts';

/**
 * **El catálogo entra por parámetro, y es la decisión que gobierna todo este paquete** (#13, AC3).
 *
 * <h2>Por qué esto va primero y no la barra</h2>
 *
 * Porque es lo que decide la forma de las otras seis piezas. El armazón sabe que hay módulos, que
 * un módulo tiene hojas y que una hoja se abre; **lo que no puede saber es cuáles**. Escrito al
 * revés —la barra y el árbol contra una forma concreta, y el catálogo parametrizado después— cada
 * pieza queda atada a los rótulos de un sistema y «parametrizar» pasa a ser una reescritura.
 *
 * La regla es de ADR-0030 §4: *«una librería común no puede contener lógica de negocio de un
 * contexto»*. Aquí cuesta de verdad, porque el armazón es justo la pieza que dibuja el negocio de
 * otro. La salida es que **nada de este archivo nombra un módulo, un rótulo ni una ruta**: son
 * datos que llegan, y la única demostración de que sirve para más de un sistema es montarlo con un
 * catálogo inventado y ver que funciona igual. Eso lo hace `catalogo.test.ts`.
 *
 * <h2>El icono se nombra, no se dibuja</h2>
 *
 * Un módulo trae el NOMBRE de un icono de `@kamayuk/ui` —`balanza`, `local`, `capas`—, no sus
 * trazos. El trazo es común; **qué módulo lleva cuál es del sistema que consume** y por eso entra
 * con el catálogo. Es la misma frontera que `iconos.ts` dibuja con su nombre genérico.
 *
 * <h2>`seEscribe` es un dato de la hoja, y decide las acciones al pie (AC8)</h2>
 *
 * Ver `acciones.ts`. Es obligatorio a propósito: con valor por omisión, una pantalla que sí se
 * escribe y a la que se le olvidó el campo ofrecería «Exportar» e «Imprimir» y **no habría forma
 * de guardar**, sin que nada se pusiera rojo. Obligado, el compilador lo pide una vez por hoja.
 */

/** Una hoja del árbol: lo que se abre, y lo único que el hash sabe nombrar. */
export interface Destino {
  /**
   * La clave del destino. Única en TODO el catálogo, no sólo dentro de su módulo: es lo que
   * viaja al hash y lo que el armazón usa para saber qué hoja está sucia.
   */
  readonly clave: string;
  readonly rotulo: string;
  /**
   * El slug con que se enlaza, si se quiere uno distinto de la clave.
   *
   * Existe porque una clave puede ser corta y opaca —pensada para no chocar con otras cuarenta— y
   * la barra de direcciones la lee una persona. Por omisión, la clave.
   */
  readonly slug?: string;
  /**
   * Si la pantalla tiene campos que se escriben. **Lo decide el dato, no el autor de la pantalla**:
   * de aquí salen «Limpiar»+«Guardar» o «Exportar»+«Imprimir» (AC8).
   */
  readonly seEscribe: boolean;
  /**
   * **Qué hay que HACER en esta pantalla** — la barra gris de V8, bajo el título.
   *
   * Es distinta de la nota del módulo, que dice qué ES. Mezcladas en una sola frase, lo segundo
   * se pierde, y es lo único que alguien que abre la pantalla por primera vez necesita.
   *
   * Es dato del SISTEMA y no del marco: son cuarenta frases distintas en un sistema como
   * `rentas`, escritas para enseñar el procedimiento de cada pantalla. Por eso viaja en el
   * catálogo y no la inventa el armazón.
   *
   * Opcional de verdad: sin ella la barra **no se dibuja**, en vez de dibujarse vacía. Un filo
   * que encierra nada es peor que ningún filo.
   */
  readonly instruccion?: string;
  /**
   * **Lo que esta hoja guarda en la ruta** (#67, `estado-en-la-ruta`): un sujeto
   * —`#/<slug>/<sujeto>`— y los parametros que nombra —`?ver=historial`—.
   *
   * Sin declarar, nada: la direccion es `#/<slug>`, la de hoy. Lo que llegue sin estar declarado se
   * ignora con aviso, y la hoja se abre igual. Un parametro no puede llamarse `sujeto`. Ver
   * `ruta.ts`.
   */
  readonly enLaRuta?: {
    readonly sujeto?: boolean;
    readonly parametros?: readonly string[];
  };
  /**
   * **El acceso que protege esta hoja** (#67, `acceso-por-hoja`): el de su lectura principal.
   *
   * **El marco no lo usa para nada**, y es a proposito: no filtra, no consulta y no importa
   * `@kamayuk/sesion`. Viaja con la hoja para que el SISTEMA —que tiene la sesion y la matriz de
   * permisos— filtre el catalogo antes de pasarlo (ver `Catalogo`) o diga por que falta una parte.
   * Que significa una hoja sin acceso lo decide el sistema: el marco no inventa un centinela.
   */
  readonly acceso?: string;
  /** Los accesos de las OTRAS lecturas de la hoja: sin ellos se abre, pero le falta una parte. */
  readonly tambien?: readonly string[];
  /**
   * **La hoja ocupa el alto entero, sin el margen del marco** (#67, `hoja-a-sangre`).
   *
   * Para las que llevan su propio desplazamiento —un maestro-detalle, una tabla de cabecera fija—:
   * con el margen y el desplazamiento del marco alrededor, sus columnas se desplazarian por separado
   * dentro de un tercer desplazamiento. Quien pone el margen es el marco, asi que es una propiedad
   * de la hoja en el catalogo y no algo que la pantalla pueda quitarse desde dentro.
   */
  readonly aSangre?: boolean;
}

/** Un módulo del árbol, con sus hojas. */
export interface ModuloDelCatalogo {
  /** La clave del módulo. Es lo que el árbol usa para saber cuál está desplegado. */
  readonly clave: string;
  readonly rotulo: string;
  /** La línea de debajo del rótulo: de qué va el módulo. */
  readonly nota: string;
  /** El nombre de su icono en `@kamayuk/ui`. Ver el javadoc del archivo. */
  readonly icono: NombreDeIcono;
  readonly destinos: readonly Destino[];
}

/**
 * El catálogo: los módulos que esta cuenta puede abrir, en el orden en que se ofrecen.
 *
 * **Ya viene filtrado, y ese reparto es deliberado.** Quién puede abrir qué lo sabe el sistema
 * —tiene la sesión, los accesos y la matriz de permisos— y el armazón no; darle aquí la lista
 * entera más un predicado obligaría a que el armazón supiera de privilegios, que es negocio de un
 * contexto. Lo que el armazón sí garantiza es que **no ofrece nada que no esté aquí dentro**, ni
 * en el carril, ni en la paleta, ni en la cabecera, ni por el hash (AC4).
 */
export type Catalogo = readonly ModuloDelCatalogo[];

/** Una hoja junto al módulo del que cuelga. Es lo que el armazón necesita para dibujar una. */
export interface HojaDelCatalogo {
  readonly modulo: ModuloDelCatalogo;
  readonly destino: Destino;
}

/** El slug con que se enlaza una hoja. Por omisión, su clave. */
export function slugDe(destino: Destino): string {
  return destino.slug ?? destino.clave;
}

/**
 * El índice plano del catálogo: de clave a hoja.
 *
 * Se construye una vez y se consulta muchas —el árbol, la paleta, la miga y el enrutador preguntan
 * por la misma hoja en cada pintada—, y recorrer diez módulos por cuarenta hojas en cada una es
 * gratis hoy y deja de serlo el día que un sistema traiga cuatrocientas.
 */
export function indiceDelCatalogo(catalogo: Catalogo): ReadonlyMap<string, HojaDelCatalogo> {
  const indice = new Map<string, HojaDelCatalogo>();
  for (const modulo of catalogo) {
    for (const destino of modulo.destinos) {
      indice.set(destino.clave, { modulo, destino });
    }
  }
  return indice;
}

/**
 * La clave que abre un slug, o `null` si no abre ninguna.
 *
 * **Es la mitad del AC4 que de verdad muerde.** Las tres listas se dibujan recorriendo el
 * catálogo, así que esconder una hoja de ellas es automático; el hash no, porque lo escribe quien
 * quiera —un enlace viejo, una dirección pegada, la vuelta de la autenticación— y un armazón que
 * abriera lo que el hash pidiera dejaría la puerta trasera abierta justo donde nadie mira.
 */
export function destinoDeSlug(catalogo: Catalogo, slug: string): string | null {
  for (const modulo of catalogo) {
    for (const destino of modulo.destinos) {
      if (slugDe(destino) === slug) {
        return destino.clave;
      }
    }
  }
  return null;
}

/** Las claves que el catálogo ofrece. Es contra esto que se valida cualquier destino. */
export function destinosOfrecidos(catalogo: Catalogo): ReadonlySet<string> {
  return new Set(catalogo.flatMap((modulo) => modulo.destinos.map((destino) => destino.clave)));
}

/**
 * Los accesos que una hoja declara: el que la protege primero y después los demás, sin repetir
 * (#67). Es lo que un sistema cruza con sus permisos para filtrar; el marco no lo cruza con nada.
 */
export function accesosDe(destino: Destino): readonly string[] {
  const todos = destino.acceso === undefined ? [...(destino.tambien ?? [])] : [destino.acceso, ...(destino.tambien ?? [])];
  return todos.filter((acceso, i) => todos.indexOf(acceso) === i);
}

/** Cuántas hojas tiene el catálogo. Lo dice el pie de la paleta. */
export function cuantosDestinos(catalogo: Catalogo): number {
  return catalogo.reduce((suma, modulo) => suma + modulo.destinos.length, 0);
}
