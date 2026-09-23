import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { Insignia } from '../Insignia.tsx';
import { Alerta } from '../shadcn/alerta.tsx';
import { FOCO } from '../shadcn/foco.ts';
import type { TextosDeLaPantalla } from '../textos.tsx';
import { cn } from '../utilidades.ts';
import { resolverTexto, type Nombrados } from './componer.ts';
import type { DatosDeLaPantalla, FilaDeUnaLista } from './datos.ts';
import { EstadoDeLaLectura } from './EstadoDeLaLectura.tsx';
import { cambioEn, valorEnLaRuta, type HojaDelMarco } from './hoja.ts';
import type { DefinicionDeMaestroDetalle, Texto, TonoDeInsignia } from './tipos.ts';

/**
 * **Lista a la izquierda, detalle a la derecha** (#67, `maestro-detalle`).
 *
 * <h2>Lo elegido vive en la ruta</h2>
 *
 * Con `hoja`, elegir una fila **escribe la ruta** —`#/<slug>/42`— y la ruta **la restituye**:
 * recargar deja elegida la misma y realzada. Sin `hoja`, la eleccion va en el estado de la pieza.
 *
 * <h2>El teclado: la eleccion NO sigue al foco</h2>
 *
 * La lista es un `listbox` de `option` con `aria-selected` y tabulador itinerante: el tabulador
 * entra por la elegida (o por la primera), ↑/↓ mueven el foco, Inicio/Fin van a los extremos, e
 * **Intro o Espacio eligen**. WAI-ARIA admite las dos formas, y aqui se toma la que no pide: elegir
 * cambia la ruta, y la ruta hace que el sistema pida el detalle. Si la eleccion siguiera al foco,
 * bajar diez filas con la flecha serian diez lecturas del detalle y nueve respuestas tiradas.
 *
 * <h2>Las cuatro cosas que dice el detalle</h2>
 *
 * Sin eleccion, `sinEleccion`. Con una eleccion que no vino en la lista —otra pagina, otro filtro,
 * un enlace compartido—, el detalle **se dibuja igual** y encima dice `noEstaEnLaLista`: el detalle
 * se pide por su clave y no depende de la lista, y esconderlo castigaria al enlace compartido. Y con
 * la lista sin contestar todavia, eso no se dice: no se sabe.
 *
 * <h2>Y el detalle que se dibuja sin eleccion (#95)</h2>
 *
 * Con `detalle.sinEleccionSeDibuja`, sin nada elegido el detalle **no se sustituye**: se dibuja con
 * su cabecera y sus piezas, y `sinEleccion` va encima diciendo por que no tiene dato, en el sitio
 * donde iria `noEstaEnLaLista`. Lo que cada pieza dice mientras tanto es de su lectura, que el
 * sistema pone en `en-espera`: la pieza no inventa un estado. Sin el dato, el todo o nada de #67.
 */

/** El ancho de la lista en el artboard: el de la V6 de `catastro` (`Catastro.tsx:856`). */
const ANCHO_POR_OMISION = 376;

export interface MaestroDetalleProps {
  readonly pieza: DefinicionDeMaestroDetalle;
  readonly datos: DatosDeLaPantalla;
  readonly nombrados: Nombrados;
  readonly traducir: (texto: string) => string;
  readonly textos: TextosDeLaPantalla;
  readonly tonoDeLaInsignia: (texto: string) => TonoDeInsignia;
  readonly hoja: HojaDelMarco | undefined;
  /** Dibuja la hija `j` del detalle. */
  readonly dibujarHija: (j: number) => ReactNode;
}

export function MaestroDetalle({
  pieza,
  datos,
  nombrados,
  traducir,
  textos,
  tonoDeLaInsignia,
  hoja,
  dibujarHija,
}: MaestroDetalleProps) {
  const [local, setLocal] = useState<string | null>(null);
  const [foco, setFoco] = useState<number | null>(null);
  const opciones = useRef<(HTMLLIElement | null)[]>([]);
  const { maestro, detalle } = pieza;

  const deLaPantalla = (t: Texto) => resolverTexto(t, nombrados, traducir, textos.datoAusente);
  // En una fila, una cadena ES una plantilla: todo lo que dice una fila es de ese registro, y
  // `'{nombre}'` escrito como cadena fija dibujaria las llaves.
  const deLaFila = (t: Texto, fila: FilaDeUnaLista) =>
    resolverTexto(
      typeof t === 'string' ? { plantilla: t } : t,
      new Map(Object.entries(fila.campos)),
      traducir,
      textos.datoAusente,
    );

  const elegido = hoja === undefined ? local : valorEnLaRuta(hoja.ruta, pieza.enLaRuta);
  const elegir = (fila: FilaDeUnaLista): void => {
    if (fila.clave === elegido) return;
    if (hoja === undefined) setLocal(fila.clave);
    else hoja.moverLaRuta(cambioEn(pieza.enLaRuta, fila.clave));
  };

  // El estado de la lista. Sin lectura declarada, la lista es lo que haya en `datos.listas`.
  const estado = maestro.lectura === undefined ? undefined : datos.lecturas?.get(maestro.lectura.clave);
  const listaContesto = maestro.lectura === undefined || estado?.estado === 'con-datos';
  const filas = datos.listas?.get(maestro.filas) ?? [];
  const indiceElegido = filas.findIndex((fila) => fila.clave === elegido);
  const activa = Math.min(foco ?? Math.max(indiceElegido, 0), Math.max(filas.length - 1, 0));

  const moverElFoco = (k: number): void => {
    setFoco(k);
    opciones.current[k]?.focus();
  };

  const alPulsar = (evento: KeyboardEvent<HTMLLIElement>, k: number, fila: FilaDeUnaLista): void => {
    const ultima = filas.length - 1;
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      elegir(fila);
      return;
    }
    const destino =
      evento.key === 'ArrowDown'
        ? Math.min(k + 1, ultima)
        : evento.key === 'ArrowUp'
          ? Math.max(k - 1, 0)
          : evento.key === 'Home'
            ? 0
            : evento.key === 'End'
              ? ultima
              : null;
    if (destino === null) return;
    evento.preventDefault();
    moverElFoco(destino);
  };

  let lista: ReactNode;
  if (maestro.lectura !== undefined && estado === undefined) {
    lista = (
      <div className="px-[15px] py-[14px]">
        <Alerta tono="atencion" data-lectura-sin-estado={maestro.lectura.clave}>
          {textos.lecturaSinEstado(maestro.lectura.clave)}
        </Alerta>
      </div>
    );
  } else if (estado !== undefined && estado.estado !== 'con-datos') {
    const espera = maestro.lectura?.espera;
    lista = (
      <EstadoDeLaLectura
        estado={estado}
        espera={estado.estado === 'en-espera' && espera !== undefined ? deLaPantalla(espera) : undefined}
        textos={textos}
      />
    );
  } else if (filas.length === 0) {
    lista = (
      <p data-slot="maestro-vacio" className="m-0 px-5 py-8 text-center text-[14px] leading-[1.5] text-tinta-3 text-pretty">
        {deLaPantalla(maestro.vacio)}
      </p>
    );
  } else {
    lista = (
      <ul role="listbox" aria-label={deLaPantalla(maestro.rotulo)} className="m-0 list-none p-0">
        {filas.map((fila, k) => {
          const esLaElegida = fila.clave === elegido;
          const insignia = maestro.fila.insignia === undefined ? '' : deLaFila(maestro.fila.insignia, fila);
          const linea = maestro.fila.linea === undefined ? '' : deLaFila(maestro.fila.linea, fila);
          return (
            <li
              key={fila.clave}
              ref={(opcion) => {
                opciones.current[k] = opcion;
              }}
              role="option"
              data-fila={fila.clave}
              aria-selected={esLaElegida}
              tabIndex={k === activa ? 0 : -1}
              onClick={() => {
                setFoco(k);
                elegir(fila);
              }}
              onKeyDown={(evento) => {
                alPulsar(evento, k, fila);
              }}
              className={cn(
                'cursor-pointer border-b border-l-[3px] border-b-linea-2 px-[14px] py-[10px]',
                FOCO,
                esLaElegida ? 'border-l-azul bg-azul-suave' : 'border-l-transparent hover:bg-sup',
              )}
            >
              <span className="flex items-center gap-2">
                <span className={cn('min-w-0 flex-1 truncate text-[14px]', esLaElegida ? 'font-bold text-info-tinta' : 'text-tinta')}>
                  {deLaFila(maestro.fila.titulo, fila)}
                </span>
                {insignia === '' ? null : <Insignia tono={tonoDeLaInsignia(insignia)}>{insignia}</Insignia>}
              </span>
              {linea === '' ? null : <span className="mt-[3px] block truncate text-[12.5px] text-tinta-3">{linea}</span>}
            </li>
          );
        })}
      </ul>
    );
  }

  let cuerpoDelDetalle: ReactNode;
  if (elegido === null && detalle.sinEleccionSeDibuja !== true) {
    cuerpoDelDetalle = (
      <div data-slot="sin-eleccion" className="grid flex-1 place-items-center p-[30px]">
        <p className="m-0 max-w-[44ch] text-center text-[14px] leading-[1.6] text-tinta-3 text-pretty">
          {deLaPantalla(detalle.sinEleccion)}
        </p>
      </div>
    );
  } else {
    const subtitulo = detalle.cabecera?.subtitulo === undefined ? '' : deLaPantalla(detalle.cabecera.subtitulo);
    cuerpoDelDetalle = (
      <div className="flex flex-col gap-[14px] px-[18px] pb-6 pt-4">
        {elegido === null ? (
          // Sin eleccion, y el detalle se dibuja igual: lo dice encima, con la frase de la hoja.
          <Alerta tono="info" data-sin-eleccion="">
            {deLaPantalla(detalle.sinEleccion)}
          </Alerta>
        ) : listaContesto && indiceElegido < 0 ? (
          <Alerta tono="info" data-no-esta-en-la-lista={elegido}>
            {deLaPantalla(detalle.noEstaEnLaLista)}
          </Alerta>
        ) : null}
        {detalle.cabecera === undefined ? null : (
          <div data-slot="cabecera-del-detalle">
            <h2 className="m-0 text-[17px] font-bold tracking-[-.015em] text-pretty">{deLaPantalla(detalle.cabecera.titulo)}</h2>
            {subtitulo === '' ? null : (
              <p className="mt-1 mb-0 text-[13.5px] leading-[1.5] text-tinta-3 text-pretty">{subtitulo}</p>
            )}
          </div>
        )}
        {detalle.bloques.map((_, j) => dibujarHija(j))}
      </div>
    );
  }

  return (
    <div
      data-pieza="maestro-detalle"
      className="flex min-h-0 flex-1 overflow-hidden rounded-md border border-linea bg-superficie"
    >
      <div
        data-slot="maestro"
        className="flex min-h-0 shrink-0 flex-col overflow-auto border-r border-linea"
        style={{ width: `${String(maestro.ancho ?? ANCHO_POR_OMISION)}px` }}
      >
        {lista}
      </div>
      <div data-slot="detalle" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
        {cuerpoDelDetalle}
      </div>
    </div>
  );
}
