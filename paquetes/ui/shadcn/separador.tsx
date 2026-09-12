import { Separator } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '../utilidades.ts';

/**
 * La linea que separa lo que se CONSULTA de lo que se ESCRIBE.
 *
 * No es adorno: el artboard la pide exactamente cuando una pantalla mezcla campos de solo lectura
 * con campos editables, y el motivo esta escrito en su propia derivacion de piezas — «separa lo
 * que se consulta de lo que se escribe». Sin ella, un dato calculado y un dato que el usuario
 * teclea se ven igual, y eso lleva a intentar corregir un numero que no es corregible aqui.
 *
 * `decorative` por omision **false**, al reves que shadcn: si la linea separa dos grupos con
 * significado distinto, es una separacion de verdad y el lector de pantalla debe anunciarla.
 */

export type SeparadorProps = ComponentProps<typeof Separator.Root>;

export function Separador({ className, decorative = false, ...resto }: SeparadorProps) {
  return (
    <Separator.Root
      data-slot="separador"
      decorative={decorative}
      className={cn(
        'shrink-0 bg-linea data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full',
        'data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
        className,
      )}
      {...resto}
    />
  );
}
