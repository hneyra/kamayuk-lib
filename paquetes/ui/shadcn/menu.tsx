import { DropdownMenu } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '../utilidades.ts';

/**
 * El menú que cuelga de un disparador. En V8 es el de la sesión, arriba a la derecha.
 *
 * <h2>La opción peligrosa se marca, y no se esconde</h2>
 *
 * V8 pinta «Cerrar sesión» en `--mal-tinta` y la deja donde está, la última. Es la decisión
 * correcta: esconderla obliga a buscarla cada vez —se usa todos los días—, y ponerla igual que las
 * otras tres la convierte en un tropiezo. El color no la separa físicamente; la separa al leerla.
 *
 * <h2>Y esta es LA pieza cara del armazón bajo jsdom. Medido</h2>
 *
 * Abrirla cuesta segundos, y no por ser una capa: por el POSICIONADOR. Con `radix-ui` pelado y el
 * `requestAnimationFrame` ya remendado, en un archivo por pieza:
 *
 *     DropdownMenu   12 409 ms de archivo    <- popper
 *     AlertDialog       208 ms
 *     Dialog            233 ms
 *     Command (cmdk)    227 ms
 *     Sonner            151 ms
 *
 * Y el gasto **no está en abrir** —montar 35 ms, abrir 79 ms, la consulta 9 ms: 213 ms en total
 * dentro del `it`— sino en desmontar el popper al limpiar. De ahí que sólo ésta viva en un
 * `capa-*.test.tsx` aparte y las otras cuatro quepan juntas en un archivo normal, que tarda 305 ms.
 * Es la misma familia que `Emergente` (Popover) y `Desplegable` (Select), las dos que ya estaban
 * apartadas desde #11: **lo caro es `@radix-ui/react-popper`, no la capa**.
 */

export const Menu = DropdownMenu.Root;
export const DisparadorDelMenu = DropdownMenu.Trigger;

export type ListaDelMenuProps = ComponentProps<typeof DropdownMenu.Content>;

export function ListaDelMenu({ className, sideOffset = 0, align = 'end', ...resto }: ListaDelMenuProps) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        data-slot="lista-del-menu"
        sideOffset={sideOffset}
        align={align}
        className={cn(
          'z-50 min-w-[min(262px,calc(100vw-24px))] overflow-hidden border border-linea bg-superficie',
          'rounded-b-sm shadow-sombra-2 outline-none',
          className,
        )}
        {...resto}
      />
    </DropdownMenu.Portal>
  );
}

export interface OpcionDelMenuProps extends ComponentProps<typeof DropdownMenu.Item> {
  /** La que no se deshace: se pinta en la tinta del error. Ver el javadoc. */
  readonly peligrosa?: boolean;
}

export function OpcionDelMenu({ className, peligrosa = false, ...resto }: OpcionDelMenuProps) {
  return (
    <DropdownMenu.Item
      data-slot="opcion-del-menu"
      data-peligrosa={peligrosa ? '1' : '0'}
      className={cn(
        'block w-full cursor-pointer select-none border-b border-linea-2 px-[15px] py-[11px]',
        'text-left text-[13.5px] outline-none last:border-b-0',
        'data-[highlighted]:bg-sup',
        peligrosa ? 'text-mal-tinta' : 'text-azul',
        className,
      )}
      {...resto}
    />
  );
}

export type SeparadorDelMenuProps = ComponentProps<typeof DropdownMenu.Separator>;

export function SeparadorDelMenu({ className, ...resto }: SeparadorDelMenuProps) {
  return (
    <DropdownMenu.Separator
      data-slot="separador-del-menu"
      className={cn('h-px bg-linea', className)}
      {...resto}
    />
  );
}
