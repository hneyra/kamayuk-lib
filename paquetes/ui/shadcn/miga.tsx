import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '../utilidades.ts';

/**
 * La miga de la cabecera: dónde está uno, en dos pasos —el módulo y la hoja—.
 *
 * <h2>Es una LISTA, aunque el artboard la dibuje con `span`</h2>
 *
 * V8 la pinta con `<nav aria-label="Ruta">` y tres `span` sueltos, y el aspecto que sale es
 * correcto. Lo que se pierde es lo que no se ve: un lector de pantalla anuncia «Ruta» y luego tres
 * trozos de texto sin relación, sin decir cuántos son ni cuál es el actual. Con `<ol>`/`<li>` y
 * `aria-current="page"` en el último, anuncia «lista de 2 elementos» y marca dónde está — que es
 * toda la utilidad de una miga.
 *
 * <h2>El separador es del ADORNO, y por eso lleva `aria-hidden`</h2>
 *
 * La barra entre dos pasos no es información: es puntuación. Leída en voz alta convierte «Valores /
 * Cartera» en «Valores barra Cartera», y dos niveles más abajo la frase deja de entenderse.
 */

export type MigaProps = ComponentProps<'nav'>;

export function Miga({ className, children, ...resto }: MigaProps) {
  return (
    <nav data-slot="miga" aria-label="Ruta" className={className} {...resto}>
      <ol className="flex items-center gap-[7px] text-[12.5px] text-tinta-3">{children}</ol>
    </nav>
  );
}

export interface PasoDeLaMigaProps extends ComponentProps<'li'> {
  /** El último paso: es dónde está uno, y va en negrita. */
  readonly actual?: boolean;
  /** Dibuja la barra ANTES de este paso. El primero no la lleva. */
  readonly conSeparador?: boolean;
  /** Deja pasar el hijo tal cual —un enlace, un botón—, a la manera de shadcn. */
  readonly asChild?: boolean;
}

export function PasoDeLaMiga({
  actual = false,
  conSeparador = false,
  asChild = false,
  className,
  children,
  ...resto
}: PasoDeLaMigaProps) {
  const Pieza = asChild ? Slot.Root : 'span';
  return (
    <li className="flex items-center gap-[7px]" {...resto}>
      {conSeparador ? (
        <span aria-hidden="true" className="text-tinta-4 select-none">
          /
        </span>
      ) : null}
      <Pieza
        data-slot="paso-de-la-miga"
        aria-current={actual ? 'page' : undefined}
        className={cn('whitespace-nowrap', actual ? 'font-bold text-tinta-2' : 'font-normal', className)}
      >
        {children}
      </Pieza>
    </li>
  );
}
