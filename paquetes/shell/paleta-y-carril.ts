import { useCallback, useEffect, useState } from 'react';

/** El ancho por debajo del cual el carril se va a un cajón. Es el mismo del artboard. */
const ANCHO_ESTRECHO = 1040;

/**
 * Si la pantalla es estrecha.
 *
 * El `typeof` no es superstición: en una prueba o en un renderizado de servidor puede no haber
 * `matchMedia`, y un armazón que reventara por preguntar por el ancho dejaría sin marco a quien
 * sólo quería dibujar una pantalla. Sin respuesta, se supone ancha — que es la forma que no esconde
 * nada.
 */
function useEsEstrecho(): boolean {
  const [estrecho, setEstrecho] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }
    const consulta = window.matchMedia(`(max-width: ${String(ANCHO_ESTRECHO)}px)`);
    const alCambiar = (): void => {
      setEstrecho(consulta.matches);
    };
    alCambiar();
    if (typeof consulta.addEventListener !== 'function') {
      return;
    }
    consulta.addEventListener('change', alCambiar);
    return () => {
      consulta.removeEventListener('change', alCambiar);
    };
  }, []);
  return estrecho;
}

export interface EstadoDelCarril {
  readonly abierto: boolean;
  readonly alternar: () => void;
  readonly cerrar: () => void;
  /** Por debajo de `ANCHO_ESTRECHO`, el carril es un cajón. */
  readonly enCajon: boolean;
  readonly filtro: string;
  readonly setFiltro: (filtro: string) => void;
  readonly moduloDesplegado: string | null;
  readonly setModuloDesplegado: (modulo: string | null) => void;
}

/** **El estado del carril** (#119): abierto o no, en cajón o no, su filtro y el módulo desplegado. */
export function useCarril(moduloDelDestino: string | null): EstadoDelCarril {
  const enCajon = useEsEstrecho();
  const [abierto, setAbierto] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [moduloDesplegado, setModuloDesplegado] = useState<string | null>(null);

  /**
   * El arbol despliega el modulo del DESTINO, y no el que se abrio la ultima vez.
   *
   * Va en un efecto sobre el destino y no dentro de la funcion que navega, y la diferencia se ve al
   * arrancar: una direccion pegada con un destino dentro abre la pantalla sin pasar por el arbol, y
   * sin esto la hoja actual quedaria marcada dentro de un modulo plegado. O sea: el arbol diria que
   * no hay nada abierto mientras hay algo abierto.
   *
   * Y no se deriva —`moduloDesplegado ?? el del destino`— a proposito: asi, plegar a mano el modulo
   * de la pantalla en la que uno esta funciona, en vez de volver a abrirse en la siguiente pintada.
   */
  useEffect(() => {
    if (moduloDelDestino !== null) {
      setModuloDesplegado(moduloDelDestino);
    }
  }, [moduloDelDestino]);

  return {
    abierto,
    alternar: () => {
      setAbierto((antes) => !antes);
    },
    cerrar: () => {
      setAbierto(false);
    },
    enCajon,
    filtro,
    setFiltro,
    moduloDesplegado,
    setModuloDesplegado,
  };
}

export interface EstadoDeLaPaleta {
  readonly abierta: boolean;
  readonly consulta: string;
  readonly setConsulta: (consulta: string) => void;
  /** Abre la paleta con la consulta vacía. */
  readonly abrir: () => void;
  /** La cierra. Estable: la navegación la llama al irse. */
  readonly cerrar: () => void;
}

/** **La paleta de mando** (#119): abierta o no, lo que se busca y el atajo `Ctrl+K`/`Cmd+K` (AC7 de #13). */
export function usePaleta(): EstadoDeLaPaleta {
  const [abierta, setAbierta] = useState(false);
  const [consulta, setConsulta] = useState('');

  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent): void => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'k') {
        evento.preventDefault();
        setConsulta('');
        setAbierta((antes) => !antes);
      }
    };
    window.addEventListener('keydown', alPulsar);
    return () => {
      window.removeEventListener('keydown', alPulsar);
    };
  }, []);

  const cerrar = useCallback(() => {
    setAbierta(false);
  }, []);

  return {
    abierta,
    consulta,
    setConsulta,
    abrir: () => {
      setConsulta('');
      setAbierta(true);
    },
    cerrar,
  };
}
