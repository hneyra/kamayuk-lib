import { Checkbox } from 'radix-ui';
import { useId, type ComponentProps, type ReactNode } from 'react';

import { cn } from '../utilidades.ts';

/**
 * La marca de si o no, con su rotulo dentro del filo.
 *
 * <h2>Por que la casilla va dentro de una caja con filo</h2>
 *
 * Porque en la rejilla de V8 todas las celdas tienen la misma altura y el mismo filo, y una
 * casilla desnuda entre dos campos de texto rompe la linea de base de la fila entera. El filo no
 * es adorno: es lo que hace que la rejilla siga leyendose como una rejilla.
 *
 * <h2>Por que Radix y no `<input type="checkbox">`</h2>
 *
 * El nativo no admite estilo en la marca sin trucos, y el `accent-color` que usa el artboard
 * pinta el relleno pero no el filo ni el tamano. Radix da un `<button role="checkbox">` con el
 * mismo contrato de accesibilidad que el nativo —y con el `<input>` oculto que hace que el
 * formulario lo envie— y deja la marca dibujable.
 */

export interface CasillaProps extends ComponentProps<typeof Checkbox.Root> {
  /** Lo que se lee al lado de la marca. */
  readonly rotulo?: ReactNode;
}

export function Casilla({ rotulo, className, ...resto }: CasillaProps) {
  // El rotulo va en un `<span>` HERMANO y no dentro del boton, para que la caja con filo pueda
  // envolver a los dos. Sin `aria-labelledby` la casilla se queda SIN NOMBRE: se ve un rotulo al
  // lado y el lector de pantalla anuncia «casilla, no marcada» y nada mas.
  const idDelRotulo = useId();
  return (
    <span
      data-slot="casilla-caja"
      className="flex items-center gap-[9px] border border-borde-campo rounded-sm px-[10px] py-2 bg-superficie"
    >
      <Checkbox.Root
        data-slot="casilla"
        aria-labelledby={rotulo === undefined ? undefined : idDelRotulo}
        className={cn(
          'size-4 shrink-0 grid place-items-center rounded-sm border border-borde-campo bg-superficie',
          'outline-none transition-colors hover:border-borde-hover',
          'focus-visible:border-azul focus-visible:ring-[3px] focus-visible:ring-foco',
          'data-[state=checked]:bg-azul data-[state=checked]:border-azul data-[state=checked]:text-sobre-azul',
          'disabled:cursor-not-allowed disabled:opacity-60',
          'aria-invalid:border-mal-borde',
          className,
        )}
        {...resto}
      >
        <Checkbox.Indicator className="grid place-items-center text-current">
          {/* El trazo de la marca, en linea: es una sola V y no merece entrada en el catalogo de
              iconos, que es de dibujos que se reutilizan. */}
          <svg viewBox="0 0 24 24" className="size-3" aria-hidden="true">
            <path
              d="M5 12.5 10 17.5 19 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Checkbox.Indicator>
      </Checkbox.Root>
      {rotulo === undefined ? null : (
        <span id={idDelRotulo} className="text-[13px] text-tinta-2">
          {rotulo}
        </span>
      )}
    </span>
  );
}
