import { cva, type VariantProps } from 'class-variance-authority';
import { Dialog } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '../utilidades.ts';

/**
 * El cajón que entra por un lado de la pantalla. Es el `Sheet` de shadcn.
 *
 * <h2>Para qué lo quiere el armazón, y por qué no es una pieza «de repuesto»</h2>
 *
 * Para el carril de módulos cuando la pantalla es estrecha. V8 lo declara en su propia hoja de
 * estilos: `@media (max-width: 1040px) { [data-side][data-open="0"] { display: none } }` — o sea
 * que por debajo de 1040 px el carril **desaparece**, y con él la única forma de llegar a otro
 * módulo que no sea la paleta. Un carril de 262 px fijo en una pantalla de 900 px se come un tercio
 * del ancho útil; en cajón ocupa lo mismo, pero sólo mientras se usa.
 *
 * Es la misma composición que hace el `Sidebar` de shadcn, que en pantalla estrecha ES un `Sheet`.
 *
 * <h2>El título es obligatorio aunque no se dibuje</h2>
 *
 * Radix avisa por consola si un `Dialog` no tiene `Title`, y tiene razón: un cajón sin título es
 * una región que el lector de pantalla anuncia como «diálogo» y nada más. Cuando el diseño no
 * quiere verlo, se envuelve en `VisuallyHidden` — no se omite.
 */

export const Cajon = Dialog.Root;
export const DisparadorDelCajon = Dialog.Trigger;
export const CerrarElCajon = Dialog.Close;

const panel = cva(
  'fixed z-[86] flex flex-col bg-fondo shadow-sombra-2 outline-none',
  {
    variants: {
      lado: {
        izquierda: 'inset-y-0 left-0 h-full w-[min(262px,85vw)] border-r border-linea',
        derecha: 'inset-y-0 right-0 h-full w-[min(262px,85vw)] border-l border-linea',
      },
    },
    defaultVariants: { lado: 'izquierda' },
  },
);

export interface PanelDelCajonProps
  extends ComponentProps<typeof Dialog.Content>,
    VariantProps<typeof panel> {}

export function PanelDelCajon({ className, lado, children, ...resto }: PanelDelCajonProps) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay data-slot="velo-del-cajon" className="fixed inset-0 z-[85] bg-velo" />
      <Dialog.Content
        data-slot="panel-del-cajon"
        data-lado={lado ?? 'izquierda'}
        className={cn(panel({ lado }), className)}
        {...resto}
      >
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}

export type TituloDelCajonProps = ComponentProps<typeof Dialog.Title>;

export function TituloDelCajon({ className, ...resto }: TituloDelCajonProps) {
  return (
    <Dialog.Title
      data-slot="titulo-del-cajon"
      className={cn('m-0 px-[15px] py-3 text-[14.5px] font-bold text-tinta', className)}
      {...resto}
    />
  );
}

export type NotaDelCajonProps = ComponentProps<typeof Dialog.Description>;

export function NotaDelCajon({ className, ...resto }: NotaDelCajonProps) {
  return (
    <Dialog.Description
      data-slot="nota-del-cajon"
      className={cn('m-0 px-[15px] pb-3 text-[12.5px] leading-[1.5] text-tinta-3', className)}
      {...resto}
    />
  );
}
