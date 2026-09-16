import { Popover } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '../utilidades.ts';
import { CAPA_FLOTANTE } from './capas.ts';

/**
 * La capa que sale anclada a lo que la abre.
 *
 * Por si sola no dibuja nada del artboard: es el soporte del campo de fecha, y de lo que venga
 * despues que tenga que salirse del recorte de la tarjeta. Se separa del calendario porque son
 * dos cosas —donde sale una capa, y que hay dentro— y mezclarlas obliga a duplicar el anclaje la
 * primera vez que otra pieza lo necesite.
 */

export const Emergente = Popover.Root;
export const DisparadorEmergente = Popover.Trigger;

export type CapaProps = ComponentProps<typeof Popover.Content>;

export function Capa({ className, sideOffset = 4, align = 'start', ...resto }: CapaProps) {
  return (
    <Popover.Portal>
      <Popover.Content
        data-slot="capa"
        sideOffset={sideOffset}
        align={align}
        className={cn(
          `${CAPA_FLOTANTE} rounded-sm border border-linea bg-superficie p-3 shadow-sombra-2 outline-none`,
          className,
        )}
        {...resto}
      />
    </Popover.Portal>
  );
}
