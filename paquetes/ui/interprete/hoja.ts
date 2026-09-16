/**
 * **Lo que el interprete necesita del marco para leer y escribir la ruta de una hoja** (#67).
 *
 * <h2>Por que estos tipos viven en `@kamayuk/ui` y no en `@kamayuk/shell`</h2>
 *
 * Porque el grafo va en un solo sentido: `@kamayuk/shell` importa `@kamayuk/ui` y no al reves. El
 * interprete no puede nombrar `useHoja()`, asi que declara **la forma** de lo que necesita —la ruta
 * de la hoja, los parametros del marco y como mover la ruta— y el marco la cumple. `HojaAbierta`
 * de `@kamayuk/shell` es un superconjunto estructural de `HojaDelMarco`, y por eso el sistema
 * cablea las dos cosas en una linea: `<Pantalla hoja={useHoja()} … />`. Lo vigila una barrera de
 * tipo en `shell/estado-en-la-ruta.test.tsx`.
 *
 * <h2>La forma de la ruta</h2>
 *
 * `#/<slug>/<sujeto>?<parametro>=<valor>&…`. El slug es del catalogo; el sujeto es lo que la hoja
 * mira —un identificador, un codigo—, y los parametros, lo que se eligio en ella —la pestana, un
 * filtro—. Las dos cosas solo existen si el destino las declara (`Destino.enLaRuta`): lo que no
 * declara, el marco lo ignora con aviso.
 */

/** Lo que la ruta guarda de una hoja. **Solo lo declarado**: lo demas ya lo quito el marco. */
export interface RutaDeLaHoja {
  /** `null` sin sujeto. Nunca `''`: una direccion con la barra y sin sujeto no es de esta forma. */
  readonly sujeto: string | null;
  /** Los parametros, ya descodificados. Uno vacio no esta. */
  readonly parametros: Readonly<Record<string, string>>;
}

/**
 * Un cambio de la ruta de la MISMA hoja. **Lo que no se nombra se queda**; `null` lo quita.
 *
 * Es un cambio y no una ruta entera a proposito: la pestana no sabe que filtro hay puesto, y si
 * tuviera que reescribir la ruta entera para cambiarse a si misma, borraria el filtro al pasar.
 */
export interface CambioDeLaRuta {
  readonly sujeto?: string | null;
  readonly parametros?: Readonly<Record<string, string | null>>;
}

/** Lo que `<Pantalla hoja>` lee del marco. `useHoja()` de `@kamayuk/shell` ya lo cumple. */
export interface HojaDelMarco {
  readonly ruta: RutaDeLaHoja;
  /**
   * Los parametros globales del marco (`parametro-del-marco`): el ejercicio de la barra, por
   * ejemplo. Los pone el sistema; el interprete los lee como `marco.<clave>`.
   */
  readonly marco?: Readonly<Record<string, string>>;
  readonly moverLaRuta: (cambio: CambioDeLaRuta) => void;
}

/**
 * Donde guarda una pieza lo que se elige en ella: `'sujeto'` es el tramo del camino, y cualquier
 * otro nombre es un parametro. Por eso un destino no puede declarar un parametro llamado `sujeto`.
 */
export type EnLaRuta = string;

/** El sitio de `enLaRuta` que es el tramo del camino y no un parametro. */
export const EL_SUJETO = 'sujeto';

/** Lo que vale `enLaRuta` en una ruta, o `null` si no esta. */
export function valorEnLaRuta(ruta: RutaDeLaHoja, enLaRuta: EnLaRuta): string | null {
  if (enLaRuta === EL_SUJETO) return ruta.sujeto;
  return Object.hasOwn(ruta.parametros, enLaRuta) ? (ruta.parametros[enLaRuta] ?? null) : null;
}

/** El cambio que pone `valor` en `enLaRuta`, y nada mas. */
export function cambioEn(enLaRuta: EnLaRuta, valor: string | null): CambioDeLaRuta {
  return enLaRuta === EL_SUJETO ? { sujeto: valor } : { parametros: { [enLaRuta]: valor } };
}

/**
 * El cambio que mueve VARIOS sitios de la misma hoja **en un solo movimiento** (#61).
 *
 * Hace falta desde que una tabla ordena: cambiar de campo vuelve a la primera pagina, y las dos
 * cosas viven en la ruta. Con dos `moverLaRuta` seguidos el marco pasa por una direccion
 * intermedia —el orden nuevo con la pagina vieja— que nadie quiso pedir, y quien escuche la ruta
 * para pedir datos la pide.
 */
export function cambiosEn(sitios: Readonly<Record<EnLaRuta, string | null>>): CambioDeLaRuta {
  const parametros: Record<string, string | null> = {};
  let sujeto: string | null | undefined;
  for (const [sitio, valor] of Object.entries(sitios)) {
    if (sitio === EL_SUJETO) sujeto = valor;
    else parametros[sitio] = valor;
  }
  return {
    ...(sujeto === undefined ? {} : { sujeto }),
    ...(Object.keys(parametros).length === 0 ? {} : { parametros }),
  };
}

/**
 * **El acto abierto, en la ruta** (#67, `estado-en-la-ruta`; el acto de #66).
 *
 * `<Pantalla>` guarda el acto abierto en su estado salvo que se le pase `actoAbierto` y
 * `alAbrirActo` (#66). Esto da los dos a partir de la hoja, para que abrir un acto escriba
 * `?acto=<clave>` y recargar lo deje abierto:
 *
 * ```tsx
 * const hoja = useHoja();
 * <Pantalla hoja={hoja} {...actoEnLaRuta(hoja)} … />
 * ```
 *
 * Lo que la accion que lo abre le pasa (`con`) viaja como parametros de la misma ruta, y por eso la
 * hoja los tiene que declarar como declara `acto`: lo que no declare se ignora con aviso. Al leer, el
 * acto recibe **los parametros de la ruta menos `acto`**: la ruta no distingue cuales puso la accion,
 * y un parametro de mas no estorba a quien envia. Cerrarlo quita `acto` y **nada mas**: un filtro o
 * una pestana no son del acto.
 */
export function actoEnLaRuta(
  hoja: HojaDelMarco,
  enLaRuta: EnLaRuta = 'acto',
): {
  readonly actoAbierto: { readonly clave: string; readonly parametros: Readonly<Record<string, string>> } | null;
  readonly alAbrirActo: (clave: string | null, parametros?: Readonly<Record<string, string>>) => void;
} {
  const clave = valorEnLaRuta(hoja.ruta, enLaRuta);
  return {
    actoAbierto: clave === null ? null : { clave, parametros: sinLaClave(hoja.ruta.parametros, enLaRuta) },
    alAbrirActo: (abierto, parametros = {}) => {
      if (abierto === null) {
        hoja.moverLaRuta(cambioEn(enLaRuta, null));
        return;
      }
      const cambio = cambioEn(enLaRuta, abierto);
      hoja.moverLaRuta({ ...cambio, parametros: { ...parametros, ...cambio.parametros } });
    },
  };
}

function sinLaClave(parametros: Readonly<Record<string, string>>, clave: string): Readonly<Record<string, string>> {
  return Object.fromEntries(Object.entries(parametros).filter(([nombre]) => nombre !== clave));
}
