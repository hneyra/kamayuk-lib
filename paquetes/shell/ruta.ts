import { EL_SUJETO, type CambioDeLaRuta, type RutaDeLaHoja } from '../ui/index.ts';

import type { Destino } from './catalogo.ts';

/**
 * **La ruta de una hoja: `#/<slug>/<sujeto>?<parametro>=<valor>&…`** (#67, `estado-en-la-ruta`).
 *
 * <h2>La de hoy no cambia</h2>
 *
 * `#/<slug>` es la forma canonica desde #13 y la unica que `rentas` escribe. Sigue siendolo: es la
 * de una hoja **sin estado**. El sujeto y los parametros solo aparecen si la hoja los declara
 * (`Destino.enLaRuta`), y una hoja que no declara nada escribe exactamente lo de antes.
 *
 * <h2>Se parte por la PRIMERA barra, y el sujeto se codifica entero</h2>
 *
 * Es la leccion de la V6 de `catastro` (`22e6d2e:frontend/src/shell/ruta.ts`): un sujeto puede
 * llevar barras —un codigo que viene de un documento— y `split('/')` lo cortaria por la mitad **sin
 * error**, pidiendo otro registro. Asi que el sujeto es «todo lo que va detras de la primera barra»
 * y se escribe con `encodeURIComponent`, barras incluidas.
 *
 * <h2>Descodificar es de aqui, y no revienta</h2>
 *
 * Medido en `react-router@7.18.3`: `useLocation().pathname` llega **sin descodificar**
 * (`/lista/a%2Fb%20c%25`) y un tramo mal codificado —`%E0%A4%A`, un enlace truncado en un chat— solo
 * le deja un aviso de consola. `decodeURIComponent` lanza `URIError` con eso; la V6 midio que, sin
 * guarda, la pagina se queda EN BLANCO. Lo que no se puede descodificar se queda tal cual: un sujeto
 * que no casa con nada acaba en «no esta», que es una respuesta.
 */

/** Lo que la barra de direcciones dice, partido. Sin mirar aun que declara la hoja. */
export interface RutaLeida {
  readonly slug: string;
  readonly sujeto: string | null;
  readonly parametros: Readonly<Record<string, string>>;
}

function descodificar(tramo: string): string {
  try {
    return decodeURIComponent(tramo);
  } catch {
    return tramo;
  }
}

/**
 * Parte el `pathname` y el `search` de la ruta del enrutador.
 *
 * **`null` si la direccion no es de ninguna de las formas.** El unico caso es la barra sin sujeto
 * —`#/entradas/`—, que #20 midio reventando y que desde entonces se dice «no corresponde a ningun
 * destino»: no es `#/entradas` ni `#/entradas/<algo>`, y adivinar cual de las dos se quiso es
 * justo lo que deja una direccion compartida ensenando otra cosa.
 */
export function leerLaRuta(pathname: string, search: string): RutaLeida | null {
  const camino = pathname.replace(/^\//, '');
  const corte = camino.indexOf('/');
  // El slug se compara EN CRUDO, como hasta #67: es la forma que `rentas` escribe y lee, y
  // descodificarlo aqui cambiaria que direcciones abren una hoja sin que nadie lo pidiera.
  const slug = corte < 0 ? camino : camino.slice(0, corte);
  const crudo = corte < 0 ? null : camino.slice(corte + 1);
  if (crudo === '') return null;
  const parametros: Record<string, string> = {};
  for (const [clave, valor] of new URLSearchParams(search)) {
    if (valor !== '') parametros[clave] = valor;
  }
  return { slug, sujeto: crudo === null ? null : descodificar(crudo), parametros };
}

/** Lo que una hoja declara que guarda en la ruta. Sin declaracion, nada. */
function declarado(destino: Destino): { readonly sujeto: boolean; readonly parametros: ReadonlySet<string> } {
  return {
    sujeto: destino.enLaRuta?.sujeto === true,
    // `sujeto` no puede ser un parametro: es el nombre con que una pieza dice «el tramo del camino».
    parametros: new Set((destino.enLaRuta?.parametros ?? []).filter((p) => p !== EL_SUJETO)),
  };
}

/** Lo que se quedo fuera por no estar declarado, dicho como se veria en la direccion. */
export type Ignorados = readonly string[];

/**
 * De lo leido, **lo que la hoja declara**, y aparte lo que se ignoro.
 *
 * Lo que no declara no revienta ni se esconde: se deja fuera de `ruta` —la pantalla no lo ve— y se
 * devuelve en `ignorados` para que el marco lo avise. Una pantalla que recibiera parametros que
 * no pidio los acabaria leyendo, y entonces ya los declara sin decirlo.
 */
export function rutaDeLaHoja(destino: Destino, leida: Omit<RutaLeida, 'slug'>): {
  readonly ruta: RutaDeLaHoja;
  readonly ignorados: Ignorados;
} {
  const admite = declarado(destino);
  const ignorados: string[] = [];
  let sujeto: string | null = null;
  if (leida.sujeto !== null) {
    if (admite.sujeto) sujeto = leida.sujeto;
    else ignorados.push(`/${leida.sujeto}`);
  }
  const parametros: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(leida.parametros)) {
    if (admite.parametros.has(clave)) parametros[clave] = valor;
    else ignorados.push(`?${clave}`);
  }
  return { ruta: { sujeto, parametros }, ignorados };
}

/**
 * La ruta de despues de un cambio: lo que no se nombra se queda, `null` lo quita, `''` tambien —un
 * vacio no se escribe—, y lo que la hoja no declara se ignora igual que al leer.
 */
export function aplicarElCambio(
  destino: Destino,
  antes: RutaDeLaHoja,
  cambio: CambioDeLaRuta,
): { readonly ruta: RutaDeLaHoja; readonly ignorados: Ignorados } {
  const parametros: Record<string, string> = { ...antes.parametros };
  for (const [clave, valor] of Object.entries(cambio.parametros ?? {})) {
    if (valor === null || valor === '') delete parametros[clave];
    else parametros[clave] = valor;
  }
  const sujeto = cambio.sujeto === undefined ? antes.sujeto : cambio.sujeto === '' ? null : cambio.sujeto;
  return rutaDeLaHoja(destino, { sujeto, parametros });
}

/**
 * La direccion de una hoja, para `navigate`: `/<slug>`, `/<slug>/<sujeto>`, `?…`.
 *
 * Los parametros van en **orden alfabetico**: la misma pantalla tiene que dar la misma direccion
 * se llegue como se llegue, o dos enlaces a lo mismo no se pueden comparar a ojo.
 */
export function escribirLaRuta(slug: string, ruta: RutaDeLaHoja): string {
  const camino = ruta.sujeto === null ? `/${slug}` : `/${slug}/${encodeURIComponent(ruta.sujeto)}`;
  const consulta = new URLSearchParams(
    Object.entries(ruta.parametros)
      .filter(([, valor]) => valor !== '')
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  ).toString();
  return consulta === '' ? camino : `${camino}?${consulta}`;
}

/** La ruta de una hoja sin estado. Es la de todas las de `rentas`. */
export const RUTA_VACIA: RutaDeLaHoja = { sujeto: null, parametros: {} };
