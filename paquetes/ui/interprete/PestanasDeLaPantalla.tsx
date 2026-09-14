import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { FOCO } from '../shadcn/foco.ts';
import type { TextosDeLaPantalla } from '../textos.tsx';
import { cn } from '../utilidades.ts';
import { resolverTexto, type Nombrados } from './componer.ts';
import { pestanaAbierta } from './composicion.ts';
import { cambioEn, valorEnLaRuta, type HojaDelMarco } from './hoja.ts';
import type { DefinicionDePestanas } from './tipos.ts';

/**
 * **Pestanas dentro de la hoja** (#67, `pestanas`).
 *
 * <h2>La abierta vive en la ruta, no aqui</h2>
 *
 * Con `hoja`, cambiar de pestana **escribe la ruta** (`?ver=historial`) y la ruta **la restituye**:
 * quien recarga o comparte el enlace ve la misma pestana. Lo que esta pieza no guarda no se le puede
 * desincronizar de la barra de direcciones. Sin `hoja` —la pantalla montada fuera del marco— la
 * guarda en su estado, y entonces no sobrevive a recargar, que es lo unico que no puede dar.
 *
 * <h2>Solo se dibuja la abierta</h2>
 *
 * Las cerradas no se montan: la que no se pinta no pide. El sistema sabe cual pedir leyendo
 * `ruta.<enLaRuta>`, y los indices de sus bloques no cambian al cambiar de pestana (ver
 * `composicion.ts`).
 *
 * <h2>El teclado, el de WAI-ARIA</h2>
 *
 * `tablist`, `tab` y `tabpanel`, con **tabulador itinerante**: el tabulador entra por la abierta y
 * sale al panel; ←/→ pasan a la anterior o la siguiente —dando la vuelta— e Inicio/Fin a la primera
 * y la ultima, y **la activan** al llegar. Activar al llegar es la opcion de WAI-ARIA para pestanas
 * cuyo panel se dibuja sin esperar, y aqui el panel dice en su sitio que esta pidiendo.
 */

export interface PestanasDeLaPantallaProps {
  readonly pieza: DefinicionDePestanas;
  readonly nombrados: Nombrados;
  readonly traducir: (texto: string) => string;
  readonly textos: TextosDeLaPantalla;
  readonly hoja: HojaDelMarco | undefined;
  /** Dibuja la hija `j` de `hijasDe(pieza)`: las de todas las pestanas, en orden. */
  readonly dibujarHija: (j: number) => ReactNode;
}

export function PestanasDeLaPantalla({ pieza, nombrados, traducir, textos, hoja, dibujarHija }: PestanasDeLaPantallaProps) {
  const [local, setLocal] = useState<string | null>(null);
  const base = useId();
  const botones = useRef<(HTMLButtonElement | null)[]>([]);
  const texto = (t: DefinicionDePestanas['rotulo']) => resolverTexto(t, nombrados, traducir, textos.datoAusente);

  const enLaRuta = hoja === undefined ? local : valorEnLaRuta(hoja.ruta, pieza.enLaRuta);
  const abierta = pestanaAbierta(pieza, enLaRuta);
  const indiceAbierta = abierta === undefined ? -1 : pieza.pestanas.indexOf(abierta);

  const abrir = (k: number, enfocar: boolean): void => {
    const pestana = pieza.pestanas[k];
    if (pestana === undefined) return;
    if (hoja === undefined) {
      setLocal(pestana.clave);
    } else if (pestana.clave !== enLaRuta) {
      hoja.moverLaRuta(cambioEn(pieza.enLaRuta, pestana.clave));
    }
    if (enfocar) botones.current[k]?.focus();
  };

  const alPulsar = (evento: KeyboardEvent<HTMLButtonElement>, k: number): void => {
    const cuantas = pieza.pestanas.length;
    const destino =
      evento.key === 'ArrowRight'
        ? (k + 1) % cuantas
        : evento.key === 'ArrowLeft'
          ? (k - 1 + cuantas) % cuantas
          : evento.key === 'Home'
            ? 0
            : evento.key === 'End'
              ? cuantas - 1
              : null;
    if (destino === null) return;
    evento.preventDefault();
    abrir(destino, true);
  };

  // Donde empiezan las hijas de la abierta dentro de `hijasDe(pieza)`.
  const inicio = pieza.pestanas.slice(0, Math.max(indiceAbierta, 0)).reduce((suma, p) => suma + p.bloques.length, 0);
  const idDe = (k: number, parte: 'rotulo' | 'cuerpo') => `${base}-${parte}-${String(k)}`;

  return (
    <div data-pieza="pestanas" className="flex min-h-0 flex-col">
      <div
        role="tablist"
        aria-label={texto(pieza.rotulo)}
        className="flex shrink-0 gap-[2px] overflow-x-auto border-b border-linea"
      >
        {pieza.pestanas.map((pestana, k) => {
          const esLaAbierta = k === indiceAbierta;
          return (
            <button
              key={pestana.clave}
              ref={(boton) => {
                botones.current[k] = boton;
              }}
              type="button"
              role="tab"
              id={idDe(k, 'rotulo')}
              data-pestana={pestana.clave}
              aria-selected={esLaAbierta}
              aria-controls={idDe(k, 'cuerpo')}
              tabIndex={esLaAbierta ? 0 : -1}
              onClick={() => {
                abrir(k, false);
              }}
              onKeyDown={(evento) => {
                alPulsar(evento, k);
              }}
              className={cn(
                '-mb-px cursor-pointer whitespace-nowrap border-0 border-b-2 bg-transparent px-[14px] py-[9px] text-[13.5px]',
                FOCO,
                esLaAbierta ? 'border-azul font-bold text-tinta' : 'border-transparent text-tinta-2 hover:text-tinta',
              )}
            >
              {texto(pestana.rotulo)}
            </button>
          );
        })}
      </div>
      {abierta === undefined ? null : (
        <div
          role="tabpanel"
          id={idDe(indiceAbierta, 'cuerpo')}
          aria-labelledby={idDe(indiceAbierta, 'rotulo')}
          data-panel-de={abierta.clave}
          // Enfocable: con el tabulador se llega al panel aunque su primera pieza no tenga controles.
          tabIndex={0}
          className={cn('flex flex-col gap-[14px] pt-[14px]', FOCO)}
        >
          {abierta.bloques.map((_, j) => dibujarHija(inicio + j))}
        </div>
      )}
    </div>
  );
}
