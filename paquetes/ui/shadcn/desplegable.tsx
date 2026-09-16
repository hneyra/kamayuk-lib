import { Select } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '../utilidades.ts';
import { CAPA_FLOTANTE } from './capas.ts';
import { CONTROL } from './control.ts';

/**
 * El desplegable de LISTA CERRADA. No es un campo de texto con sugerencias.
 *
 * El artboard lo distingue del resto con su propia letra —`s`— y su derivacion de piezas lo dice
 * con todas las letras: «desplegables de lista cerrada». Quien elige aqui no puede escribir un
 * valor que no este en la lista, y esa restriccion es el punto: un tributo, un ejercicio o una
 * situacion que no existe no debe poder teclearse.
 *
 * <h2>Donde NO sirve, y esta medido</h2>
 *
 * En el giro CIIU. El propio artboard lo anota: **son 1 842 y no caben en un `Select`**. Eso pide
 * un combo con busqueda, que es otra pieza y llega con la pantalla que lo necesita.
 *
 * <h2>Por que la lista se monta en un portal</h2>
 *
 * Porque la tarjeta lleva `overflow-hidden` para que la cabecera azul no se salga del radio, y
 * una lista desplegada dentro de ese recorte se cortaria por la mitad. Con portal, la lista sale
 * del recorte y el radio de la tarjeta se conserva.
 */

export interface DesplegableProps extends ComponentProps<typeof Select.Root> {
  /** Lo que se ve cuando no hay nada elegido. */
  readonly marcador?: string;
  /** Las opciones de la lista cerrada. */
  readonly children: ReactNode;
  readonly className?: string;
  /**
   * Estos tres NO son de `Select.Root` —que no pinta nada— sino del DISPARADOR, que es el elemento
   * que el rotulo apunta y el que lleva el estado de invalido. `Etiqueta` se los mete por `Slot`
   * sin saber que pieza hay debajo, asi que esta los recoge y los baja donde corresponde.
   */
  readonly id?: string;
  readonly 'aria-describedby'?: string;
  readonly 'aria-invalid'?: boolean;
}

export function Desplegable({
  marcador,
  children,
  className,
  id,
  'aria-describedby': describe,
  'aria-invalid': invalido,
  ...resto
}: DesplegableProps) {
  return (
    <Select.Root {...resto}>
      <Select.Trigger
        data-slot="desplegable"
        id={id}
        aria-describedby={describe}
        aria-invalid={invalido}
        className={cn(CONTROL, 'flex items-center justify-between gap-2 text-left', className)}
      >
        <Select.Value placeholder={marcador} />
        <Select.Icon asChild>
          <svg viewBox="0 0 24 24" className="size-[15px] shrink-0 text-tinta-4" aria-hidden="true">
            <path
              d="m7 10 5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          data-slot="desplegable-lista"
          position="popper"
          sideOffset={4}
          className={cn(
            `${CAPA_FLOTANTE} min-w-[var(--radix-select-trigger-width)] max-h-[min(320px,var(--radix-select-content-available-height))]`,
            'overflow-hidden rounded-sm border border-linea bg-superficie shadow-sombra-2',
          )}
        >
          <Select.Viewport className="p-1">{children}</Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

export type OpcionProps = ComponentProps<typeof Select.Item>;

export function Opcion({ className, children, ...resto }: OpcionProps) {
  return (
    <Select.Item
      data-slot="opcion"
      className={cn(
        'relative flex items-center gap-2 rounded-sm px-[10px] py-[7px] text-[13.5px] text-tinta-2',
        'cursor-pointer select-none outline-none',
        'data-[highlighted]:bg-azul-suave data-[highlighted]:text-info-tinta',
        'data-[state=checked]:font-bold data-[state=checked]:text-tinta',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...resto}
    >
      <Select.ItemText>{children}</Select.ItemText>
    </Select.Item>
  );
}
