import { Collapsible } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '../utilidades.ts';
import { FOCO } from './foco.ts';

/**
 * Lo que se pliega: un módulo del carril con sus hojas debajo.
 *
 * Es la única de las siete piezas del armazón que **no es una capa**: no sale por encima de nada,
 * no monta un portal y no atrapa el foco. Empuja lo que tiene debajo, que es justo lo que un árbol
 * de navegación tiene que hacer — una capa taparía las filas siguientes y obligaría a cerrarla para
 * seguir mirando.
 *
 * `Collapsible` y no `Accordion` a propósito: el artboard deja abierto **un** módulo a la vez, pero
 * el filtro los abre TODOS mientras hay texto, y un acordeón —que impone uno— no puede hacer eso.
 * Quién está abierto lo decide el armazón; esto sólo sabe abrirse y cerrarse.
 */

export type PlegableProps = ComponentProps<typeof Collapsible.Root>;
export const Plegable = Collapsible.Root;

export type DisparadorDelPlegableProps = ComponentProps<typeof Collapsible.Trigger>;

export function DisparadorDelPlegable({ className, ...resto }: DisparadorDelPlegableProps) {
  return (
    <Collapsible.Trigger
      data-slot="disparador-del-plegable"
      className={cn(
        'flex w-full items-center gap-2 rounded-sm px-2 py-[7px] text-left',
        'cursor-pointer transition-colors hover:bg-sup',
        FOCO,
        className,
      )}
      {...resto}
    />
  );
}

export type CuerpoDelPlegableProps = ComponentProps<typeof Collapsible.Content>;

export function CuerpoDelPlegable({ className, ...resto }: CuerpoDelPlegableProps) {
  return (
    <Collapsible.Content data-slot="cuerpo-del-plegable" className={className} {...resto} />
  );
}
