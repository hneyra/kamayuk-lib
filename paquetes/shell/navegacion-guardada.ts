import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { RutaDeLaHoja } from '../ui/index.ts';

import { slugDe, type HojaDelCatalogo } from './catalogo.ts';
import type { AvisoDeLaRuta } from './contexto.tsx';
import { ubicacionDe, type ExtraDeLaPeticion, type NavegacionDelArmazon } from './navegacion.tsx';
import { rutaDeLaHoja } from './ruta.ts';

/**
 * La ruta de una hoja como la pide `ubicacionDe`. **Todo lo que el marco escribe en la barra pasa
 * por `ubicacionDe`** —el árbol, la paleta, `ir` y `moverLaRuta`—: si dos caminos escribieran la
 * dirección, uno podría cambiar de forma sin que el otro se enterara (#67, alineado con #66).
 */
export function extraDe(ruta: RutaDeLaHoja): ExtraDeLaPeticion {
  return { ...(ruta.sujeto === null ? {} : { sujeto: ruta.sujeto }), parametros: ruta.parametros };
}

/**
 * A dónde se quería ir cuando saltó el aviso. `{ hacia: null }` es «salir a la raíz».
 *
 * Envuelto en un objeto y no como `string | null` a secas: con el segundo, «no hay nada
 * pendiente» y «volver a la raíz» serían el MISMO valor, y el aviso de «Volver» no se abriría
 * nunca — que es justo la salida por la que se pierde trabajo sin que nadie la pruebe.
 */
export interface IdaPendiente {
  readonly hacia: string | null;
  /** El sujeto y los parametros con que se pidio ir, desde una pantalla (#66). */
  readonly extra?: ExtraDeLaPeticion;
}

/** Las tres salidas del aviso de cambios sin guardar. */
export type RespuestaAlAviso = 'guardar' | 'descartar' | 'seguir';

export interface OpcionesDeLaNavegacion {
  readonly indice: ReadonlyMap<string, HojaDelCatalogo>;
  /** La hoja abierta, o `null` en la raíz. */
  readonly hoja: HojaDelCatalogo | null;
  readonly sucias: ReadonlySet<string>;
  /** Deja limpia la hoja de la que se sale: la llaman «guardar» y «descartar». */
  readonly limpiar: (clave: string) => void;
  /** El `guardar` del sistema, si lo dio. */
  readonly guardar: ((clave: string) => void) | undefined;
  /** Lo que la dirección trae y la hoja no declara. */
  readonly alIgnorar: (aviso: AvisoDeLaRuta) => void;
  /** Lo que se cierra al irse o al preguntar: la paleta. */
  readonly alIrse: () => void;
}

export interface NavegacionGuardada {
  /** Lleva a un destino, preguntando si la hoja de la que se sale tiene cambios. */
  readonly irA: (clave: string | null, extra?: ExtraDeLaPeticion) => 'abierta' | 'pregunta';
  readonly pendiente: IdaPendiente | null;
  readonly resolver: (respuesta: RespuestaAlAviso) => void;
  /** Lo que una pantalla recibe para ir a otra hoja (#66): el MISMO `irA`. */
  readonly navegacion: NavegacionDelArmazon;
}

/**
 * **La navegación con aviso** (#119): `irA`, lo pendiente y las tres salidas del aviso.
 *
 * Estaba en `Cascara`, con `alGuardarYCerrar` y `alSalirSinGuardar` escritos como dos copias de la
 * misma cola de tres líneas. Aquí la cola es una (`resolver`).
 */
export function useNavegacionGuardada({
  indice,
  hoja,
  sucias,
  limpiar,
  guardar,
  alIgnorar,
  alIrse,
}: OpcionesDeLaNavegacion): NavegacionGuardada {
  const navegar = useNavigate();
  const [pendiente, setPendiente] = useState<IdaPendiente | null>(null);

  /**
   * Lleva a un destino SIN preguntar nada. Es la mitad que no mira si hay cambios.
   *
   * Desde #67 puede llevar la ruta de la hoja a la que va; lo que esa hoja no declara se ignora con
   * aviso, igual que si llegara escrito en la barra. Sin ruta, `#/<slug>`: lo de siempre.
   */
  const saltarA = useCallback(
    (clave: string | null, extra?: ExtraDeLaPeticion) => {
      alIrse();
      if (clave === null) {
        navegar('/', { replace: true });
        return;
      }
      const destino = indice.get(clave);
      if (destino === undefined) {
        return;
      }
      const { ruta: declarada, ignorados } = rutaDeLaHoja(destino.destino, {
        sujeto: extra?.sujeto === undefined || extra.sujeto === '' ? null : extra.sujeto,
        parametros: extra?.parametros ?? {},
      });
      if (ignorados.length > 0) alIgnorar({ destino: clave, ignorados });
      navegar(ubicacionDe(slugDe(destino.destino), extraDe(declarada)), { replace: true });
    },
    [indice, navegar, alIgnorar, alIrse],
  );

  /**
   * El `null` es «salir a la raíz», que es lo que hace «Volver». Sale por el mismo sitio a
   * propósito: salir de una pantalla sucia hacia ninguna parte pierde igual de trabajo que salir
   * hacia otra.
   */
  const irA = useCallback(
    (clave: string | null, extra?: ExtraDeLaPeticion): 'abierta' | 'pregunta' => {
      if (hoja !== null && sucias.has(hoja.destino.clave) && clave !== hoja.destino.clave) {
        alIrse();
        setPendiente({ hacia: clave, ...(extra === undefined ? {} : { extra }) });
        return 'pregunta';
      }
      saltarA(clave, extra);
      return 'abierta';
    },
    [hoja, sucias, saltarA, alIrse],
  );

  const resolver = (respuesta: RespuestaAlAviso): void => {
    if (respuesta !== 'seguir' && hoja !== null) {
      if (respuesta === 'guardar') guardar?.(hoja.destino.clave);
      limpiar(hoja.destino.clave);
    }
    setPendiente(null);
    if (respuesta !== 'seguir') saltarA(pendiente?.hacia ?? null, pendiente?.extra);
  };

  const navegacion = useMemo<NavegacionDelArmazon>(
    () => ({
      ofrece: (clave) => indice.has(clave),
      ir: ({ hoja: clave, sujeto, parametros }) => {
        // Antes que `irA`: con la hoja sucia, un destino inexistente abriria el aviso de perder los
        // cambios para ir a ninguna parte.
        if (!indice.has(clave)) return 'no-ofrecida';
        return irA(clave, {
          ...(sujeto === undefined ? {} : { sujeto }),
          ...(parametros === undefined ? {} : { parametros }),
        });
      },
    }),
    [indice, irA],
  );

  return { irA, pendiente, resolver, navegacion };
}
