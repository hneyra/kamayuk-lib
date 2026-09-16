import { Command } from 'cmdk';
import type { ComponentProps } from 'react';

import { TEXTOS_DE_LA_UI } from '../textos.tsx';
import { cn } from '../utilidades.ts';
import { CAPA_PANEL_DE_LA_PALETA, CAPA_VELO_DE_LA_PALETA } from './capas.ts';

/**
 * La paleta de mando: `Ctrl/Cmd+K`, se escribe, se elige y se va.
 *
 * Es el `Command` de shadcn, que por debajo es `cmdk` —no hay primitiva de Radix para esto— montado
 * sobre un `Dialog` de Radix, que es lo que le da el velo, el atrapado de foco y el `Esc`.
 *
 * <h2>Lo que `cmdk` aporta y no se ve: el teclado</h2>
 *
 * La lista se recorre con las flechas SIN sacar el foco de la caja de texto, `Enter` abre la
 * resaltada y `Home`/`End` saltan a los extremos. Escrito a mano eso son cuatro manejadores de
 * teclado y un índice resaltado que hay que mantener a mano con cada tecleo; y el que se olvida
 * siempre es el que vuelve a subir el resaltado al primero cuando la búsqueda cambia, que deja la
 * paleta abriendo el resultado de la búsqueda anterior.
 *
 * <h2>Aquí NO se filtra: el filtro es del armazón</h2>
 *
 * `cmdk` trae su propio buscador difuso, y va apagado (`shouldFilter={false}`). El armazón ya filtra
 * el catálogo —y el recorte a doce y el pie que cuenta cuántos casan salen de ahí—, así que dejar
 * los dos encendidos daría dos listas distintas: la que el pie cuenta y la que se ve.
 *
 * <h2>Los dos remiendos que jsdom necesita para montarla</h2>
 *
 * `cmdk` mide su lista con un `ResizeObserver` y desplaza la opción resaltada a la vista. jsdom no
 * implementa ninguna de las dos, y sin los remiendos revienta al montar:
 *
 *     ReferenceError: ResizeObserver is not defined      node_modules/cmdk/dist/index.mjs:1:8384
 *     TypeError: e.scrollIntoView is not a function      node_modules/cmdk/dist/index.mjs:1:4286
 *
 * Con los dos puestos, montarla abierta cuesta 227 ms — no es de las caras. Ver el javadoc de
 * `menu.tsx`: lo caro es el posicionador, y esto no lo lleva.
 */

export interface PaletaDeMandoProps extends ComponentProps<typeof Command.Dialog> {
  /** Lo que el lector de pantalla anuncia al abrirla. */
  readonly label: string;
}

export function PaletaDeMando({ className, label, children, ...resto }: PaletaDeMandoProps) {
  return (
    <Command.Dialog
      label={label}
      shouldFilter={false}
      data-slot="paleta-de-mando"
      overlayClassName={`fixed inset-0 ${CAPA_VELO_DE_LA_PALETA} bg-velo-paleta`}
      contentClassName={cn(
        `fixed left-1/2 top-[11vh] ${CAPA_PANEL_DE_LA_PALETA} w-[min(620px,92vw)] -translate-x-1/2`,
        'overflow-hidden rounded-sm border border-linea bg-superficie shadow-sombra-2 outline-none',
        className,
      )}
      {...resto}
    >
      {children}
    </Command.Dialog>
  );
}

export type BuscadorDeLaPaletaProps = ComponentProps<typeof Command.Input>;

export function BuscadorDeLaPaleta({ className, ...resto }: BuscadorDeLaPaletaProps) {
  return (
    <Command.Input
      data-slot="buscador-de-la-paleta"
      className={cn(
        'w-full flex-1 border-0 bg-transparent text-[15px] text-tinta outline-none',
        'placeholder:text-tinta-3',
        className,
      )}
      {...resto}
    />
  );
}

export interface ListaDeLaPaletaProps extends Omit<ComponentProps<typeof Command.List>, 'label'> {
  /**
   * El nombre accesible de la lista. **Sin el viene EN INGLES**: `cmdk` monta
   * `aria-label="Suggestions"` por omision, igual que `sonner` montaba `Notifications` (#13). No se
   * dibuja en ninguna parte, asi que una paleta entera en castellano se anunciaba con una palabra en
   * ingles y mirar la pantalla no lo ensena. Lo destapo la guarda de #19.
   */
  readonly rotulo?: string;
}

export function ListaDeLaPaleta({
  rotulo = TEXTOS_DE_LA_UI.sugerencias,
  className,
  ...resto
}: ListaDeLaPaletaProps) {
  return (
    <Command.List
      data-slot="lista-de-la-paleta"
      label={rotulo}
      className={cn('max-h-[54vh] overflow-auto', className)}
      {...resto}
    />
  );
}

export type OpcionDeLaPaletaProps = ComponentProps<typeof Command.Item>;

export function OpcionDeLaPaleta({ className, ...resto }: OpcionDeLaPaletaProps) {
  return (
    <Command.Item
      data-slot="opcion-de-la-paleta"
      className={cn(
        'flex w-full cursor-pointer select-none items-baseline gap-[11px] border-b border-linea-2',
        'px-[15px] py-[10px] text-left text-[13.5px] text-tinta outline-none',
        'data-[selected=true]:bg-sup',
        className,
      )}
      {...resto}
    />
  );
}

export type VacioDeLaPaletaProps = ComponentProps<typeof Command.Empty>;

export function VacioDeLaPaleta({ className, ...resto }: VacioDeLaPaletaProps) {
  return (
    <Command.Empty
      data-slot="vacio-de-la-paleta"
      className={cn('px-[15px] py-4 text-[13px] leading-[1.5] text-tinta-3 text-pretty', className)}
      {...resto}
    />
  );
}
