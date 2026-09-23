import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import type { CambioDeLaRuta, RutaDeLaHoja } from '../ui/index.ts';

import { slugDe, type HojaDelCatalogo } from './catalogo.ts';
import type { AvisoDeLaRuta, HojaAbierta } from './contexto.tsx';
import { extraDe } from './navegacion-guardada.ts';
import { ubicacionDe } from './navegacion.tsx';
import type { RegistroDeHojasEnUso } from './registro-de-hojas.ts';
import { RUTA_VACIA, aplicarElCambio, leerLaRuta, rutaDeLaHoja } from './ruta.ts';

/** Los parámetros del marco cuando el sistema no pasa ninguno. Uno solo, para no cambiar en cada pintada. */
const SIN_MARCO: Readonly<Record<string, string>> = {};

export interface RutaDeLaHojaEnUso {
  readonly ruta: RutaDeLaHoja;
  readonly moverLaRuta: (cambio: CambioDeLaRuta) => void;
}

/**
 * **La ruta de la hoja abierta**, ya filtrada por lo que declara (#67), y cómo se mueve (#119).
 *
 * Sale de la dirección en cada pintada y no se guarda en ningún estado: la barra del navegador es
 * la fuente, y lo que no se copia no se puede desincronizar de ella. Lo que la dirección trae y la
 * hoja no declara se avisa **una vez por dirección**, y no en cada pintada.
 */
export function useRutaDeLaHoja(
  hoja: HojaDelCatalogo | null,
  alIgnorar: (aviso: AvisoDeLaRuta) => void,
): RutaDeLaHojaEnUso {
  const navegar = useNavigate();
  const { pathname, search } = useLocation();
  const deLaRuta = useMemo(() => {
    if (hoja === null) return { ruta: RUTA_VACIA, ignorados: [] as readonly string[] };
    const leida = leerLaRuta(pathname, search);
    return leida === null ? { ruta: RUTA_VACIA, ignorados: [] } : rutaDeLaHoja(hoja.destino, leida);
  }, [hoja, pathname, search]);

  const ignoradosDeEstaDireccion = deLaRuta.ignorados.join('|');
  const claveDelIgnorado = hoja?.destino.clave ?? null;
  useEffect(() => {
    if (claveDelIgnorado === null || ignoradosDeEstaDireccion === '') return;
    alIgnorar({ destino: claveDelIgnorado, ignorados: ignoradosDeEstaDireccion.split('|') });
    // `alIgnorar` fuera de las dependencias a proposito: una funcion en linea del sistema cambia en
    // cada pintada, y avisaria otra vez de la misma direccion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveDelIgnorado, ignoradosDeEstaDireccion, pathname, search]);

  const { ruta: actual } = deLaRuta;
  const moverLaRuta = useCallback(
    (cambio: CambioDeLaRuta) => {
      if (hoja === null) return;
      const { ruta, ignorados } = aplicarElCambio(hoja.destino, actual, cambio);
      if (ignorados.length > 0) alIgnorar({ destino: hoja.destino.clave, ignorados });
      navegar(ubicacionDe(slugDe(hoja.destino), extraDe(ruta)), { replace: true });
    },
    [hoja, actual, navegar, alIgnorar],
  );

  return { ruta: actual, moverLaRuta };
}

/**
 * **Lo que la pantalla recibe por `useHoja()`** (#119): la hoja, su marca de sucia y lo tecleado
 * —del registro de hojas—, su ruta y los parámetros del marco. `null` en la raíz.
 */
export function useHojaAbierta(
  hoja: HojaDelCatalogo | null,
  registro: RegistroDeHojasEnUso,
  marco: Readonly<Record<string, string>> | undefined,
  alIgnorar: (aviso: AvisoDeLaRuta) => void,
): HojaAbierta | null {
  const { ruta, moverLaRuta } = useRutaDeLaHoja(hoja, alIgnorar);
  const { sucias, tecleado, cambiar } = registro;
  return useMemo((): HojaAbierta | null => {
    if (hoja === null) return null;
    const clave = hoja.destino.clave;
    return {
      hoja,
      sucia: sucias.has(clave),
      marcarSucia: () => {
        cambiar({ tipo: 'marcar', clave });
      },
      marcarGuardada: () => {
        cambiar({ tipo: 'limpiar', clave });
      },
      tecleado: tecleado.get(clave),
      alTeclear: (cambio) => {
        cambiar({ tipo: 'teclear', clave, cambio });
      },
      ruta,
      moverLaRuta,
      marco: marco ?? SIN_MARCO,
    };
  }, [hoja, sucias, tecleado, cambiar, ruta, moverLaRuta, marco]);
}
