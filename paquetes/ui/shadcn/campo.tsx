import type { ComponentProps } from 'react';

import { cn } from '../utilidades.ts';
import { CONTROL } from './control.ts';

/**
 * Los tres controles de texto de V8: el campo, el area y el dato de solo lectura.
 *
 * <h2>Por que el dato de solo lectura lleva filo DISCONTINUO</h2>
 *
 * Porque no es un campo desactivado: es un valor que **este** formulario no decide. V8 lo dibuja
 * con borde discontinuo y papel `--sup` en vez de `--superficie`, y eso comunica la diferencia
 * sin una sola palabra. Un `<input disabled>` diria otra cosa —«esto se podria escribir y ahora
 * no»— y ademas lo sacaria del recorrido del tabulador, con lo que quien navega con teclado no
 * llegaria nunca a leer la cifra.
 *
 * Por eso es un `<output>` y no un `<input readonly>`: es la salida de un calculo hecho en otro
 * sitio, se lee, y no se envia con el formulario.
 */

export type CampoProps = ComponentProps<'input'>;

export function Campo({ className, type = 'text', ...resto }: CampoProps) {
  return <input data-slot="campo" type={type} className={cn(CONTROL, className)} {...resto} />;
}

export type AreaProps = ComponentProps<'textarea'>;

/** El campo libre. Tres lineas, que es lo que V8 dibuja, y crece si el navegador lo permite. */
export function Area({ className, rows = 3, ...resto }: AreaProps) {
  return (
    <textarea
      data-slot="area"
      rows={rows}
      className={cn(CONTROL, 'resize-y field-sizing-content min-h-[68px]', className)}
      {...resto}
    />
  );
}

export type DatoProps = ComponentProps<'output'>;

/** El valor que se consulta y no se escribe. Filo discontinuo: ver el javadoc. */
export function Dato({ className, children, ...resto }: DatoProps) {
  return (
    <output
      data-slot="dato"
      className={cn(
        'block min-h-9 leading-[19px] border border-dashed border-borde-campo rounded-sm',
        'px-[10px] py-2 bg-sup text-[13.5px] text-tinta-2',
        className,
      )}
      {...resto}
    >
      {/* Un dato vacio deja el hueco con su raya, que es lo que V8 dibuja: la ausencia de cifra
          tambien es informacion, y un hueco en blanco se lee como «todavia no cargo». */}
      {children === undefined || children === null || children === '' ? '—' : children}
    </output>
  );
}
