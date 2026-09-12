import { AlertDialog } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '../utilidades.ts';

/**
 * La pregunta que corta el paso: «esto tiene cambios sin guardar».
 *
 * <h2>`AlertDialog` y no `Dialog`, y la diferencia MEDIDA</h2>
 *
 * Probado sobre esta pieza, no supuesto:
 *
 * <table>
 *   <tr><td>pulsar fuera</td><td><b>no</b> cierra</td></tr>
 *   <tr><td>`Esc`</td><td>cierra</td></tr>
 *   <tr><td>foco al abrir</td><td>el `Cancel` — aquí, «Seguir editando»</td></tr>
 * </table>
 *
 * Lo primero es lo que un `Dialog` no da: pulsar fuera es el gesto de quien quiere seguir a lo
 * suyo, y cerrando el aviso ahí se saldría de la pantalla sin haber contestado a la pregunta. Lo
 * segundo se deja como está —Radix no lo quita y quitarlo sería atrapar a quien no sabe salir—,
 * pero entonces **`Esc` tiene que significar la salida que no rompe nada**: quien lo monta conecta
 * el cierre a «seguir editando» y no a «salir», que es lo que hace `AvisoDeCambios` en
 * `@kamayuk/shell`. Y el tercero es el que hace que un Enter distraído no pierda el trabajo.
 *
 * Además pone `role="alertdialog"` y ata el título y la nota al diálogo, de modo que el lector de
 * pantalla anuncia la pregunta entera y no sólo «diálogo».
 *
 * <h2>Tres salidas, y las tres se dibujan</h2>
 *
 * V8 pone «Salir y perder los cambios» a la IZQUIERDA, en la tinta del error, separada del par de
 * la derecha por un hueco elástico; y «Seguir editando» + «Guardar y cerrar» juntas a la derecha,
 * la última en azul. Las tres se ven a la vez: un diálogo de dos botones obligaría a que una de las
 * tres respuestas fuera la cruz de cerrar, que es la que nadie sabe qué hace.
 */

export const Confirmacion = AlertDialog.Root;
export const DisparadorDeConfirmacion = AlertDialog.Trigger;

export type PanelDeConfirmacionProps = ComponentProps<typeof AlertDialog.Content>;

export function PanelDeConfirmacion({ className, children, ...resto }: PanelDeConfirmacionProps) {
  return (
    <AlertDialog.Portal>
      <AlertDialog.Overlay data-slot="velo-de-confirmacion" className="fixed inset-0 z-[88] bg-velo" />
      <AlertDialog.Content
        data-slot="panel-de-confirmacion"
        className={cn(
          'fixed left-1/2 top-1/2 z-[89] w-[min(460px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2',
          'overflow-hidden rounded-sm bg-superficie shadow-sombra-2 outline-none',
          className,
        )}
        {...resto}
      >
        {children}
      </AlertDialog.Content>
    </AlertDialog.Portal>
  );
}

export type TituloDeConfirmacionProps = ComponentProps<typeof AlertDialog.Title>;

export function TituloDeConfirmacion({ className, ...resto }: TituloDeConfirmacionProps) {
  return (
    <AlertDialog.Title
      data-slot="titulo-de-confirmacion"
      className={cn('m-0 px-5 pt-[18px] text-[16px] font-bold text-pretty', className)}
      {...resto}
    />
  );
}

export type NotaDeConfirmacionProps = ComponentProps<typeof AlertDialog.Description>;

export function NotaDeConfirmacion({ className, ...resto }: NotaDeConfirmacionProps) {
  return (
    <AlertDialog.Description
      data-slot="nota-de-confirmacion"
      className={cn(
        'mx-0 mb-0 mt-[7px] px-5 pb-[14px] text-[13.5px] leading-[1.55] text-tinta-2 text-pretty',
        className,
      )}
      {...resto}
    />
  );
}

/** La fila de las tres salidas, con su hueco elástico en medio. */
export type SalidasDeConfirmacionProps = ComponentProps<'div'>;

export function SalidasDeConfirmacion({ className, ...resto }: SalidasDeConfirmacionProps) {
  return (
    <div
      data-slot="salidas-de-confirmacion"
      className={cn(
        'flex flex-wrap items-center gap-[9px] border-t border-linea-2 bg-sup px-5 py-[13px]',
        className,
      )}
      {...resto}
    />
  );
}

/** El hueco que separa la salida destructiva de las otras dos. */
export function HuecoDeConfirmacion() {
  return <span aria-hidden="true" className="min-w-2 flex-1" />;
}

export type ConfirmarProps = ComponentProps<typeof AlertDialog.Action>;

/** La salida principal, en azul. Cierra el diálogo. */
export function Confirmar({ className, ...resto }: ConfirmarProps) {
  return (
    <AlertDialog.Action
      data-slot="confirmar"
      className={cn(
        'cursor-pointer rounded-sm bg-azul px-[18px] py-[10px] text-[13.5px] font-bold text-sobre-azul',
        'outline-none hover:bg-azul-hover focus-visible:ring-[3px] focus-visible:ring-foco',
        className,
      )}
      {...resto}
    />
  );
}

export type DescartarProps = ComponentProps<typeof AlertDialog.Action>;

/**
 * La salida que pierde el trabajo. Es un `Action` y NO un `Cancel`, y la diferencia se nota:
 * Radix enfoca el `Cancel` al abrir, así que ponerla ahí dejaría el foco encima de «perder los
 * cambios» y un Enter distraído los perdería. El `Cancel` es el que no rompe nada.
 */
export function Descartar({ className, ...resto }: DescartarProps) {
  return (
    <AlertDialog.Action
      data-slot="descartar"
      className={cn(
        'cursor-pointer rounded-sm border border-borde-boton bg-superficie px-[15px] py-[9px]',
        'text-[13.5px] text-mal-tinta outline-none',
        'hover:border-borde-hover focus-visible:ring-[3px] focus-visible:ring-foco',
        className,
      )}
      {...resto}
    />
  );
}

export type CancelarProps = ComponentProps<typeof AlertDialog.Cancel>;

/** La salida que no hace nada. Es la que Radix enfoca al abrir, a propósito. */
export function Cancelar({ className, ...resto }: CancelarProps) {
  return (
    <AlertDialog.Cancel
      data-slot="cancelar"
      className={cn(
        'cursor-pointer rounded-sm border border-borde-boton bg-superficie px-[15px] py-[9px]',
        'text-[13.5px] text-tinta outline-none',
        'hover:border-borde-hover focus-visible:ring-[3px] focus-visible:ring-foco',
        className,
      )}
      {...resto}
    />
  );
}
