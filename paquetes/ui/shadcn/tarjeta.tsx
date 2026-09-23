import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../utilidades.ts';

/**
 * La tarjeta de V8, que **no es la `Card` por omision de shadcn**.
 *
 * shadcn dibuja una tarjeta de filo gris y cabecera del mismo papel. V8 dibuja otra cosa: filo
 * AZUL y **cabecera azul maciza** con el titulo del bloque encima. Copiar la de shadcn tal cual
 * daria una pantalla que funciona y no se parece, que es justo lo que este trabajo evita.
 *
 * De shadcn se toma la FORMA —piezas sueltas que se componen, `data-slot` para apuntar a cada
 * una sin depender de una clase— y de V8 los VALORES.
 *
 * <h2>Por que las piezas son cinco y no una con `props`</h2>
 *
 * Porque un bloque de V8 tiene cuatro zonas con reglas distintas —cabecera, nota, rejilla de
 * campos y tabla— y una tarjeta con `titulo`, `nota`, `campos` y `tabla` como `props` obliga a
 * reabrir el componente cada vez que aparezca una zona nueva. Compuesta, no.
 */

export function Tarjeta({ className, ...resto }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      data-slot="tarjeta"
      className={cn('bg-superficie border border-azul rounded-md overflow-hidden', className)}
      {...resto}
    />
  );
}

/**
 * La cabecera azul maciza. El titulo va dentro, a 14.5 px y en negrita.
 *
 * <h2>`junto`: lo que acompana al titulo, FUERA del encabezado (#86)</h2>
 *
 * Las insignias fijas y el codigo de lo que se mira (`insignias-fijas-en-la-cabecera`). Van en un
 * hueco hermano del `<h2>` y no dentro, porque dentro pasarian a ser **el nombre accesible del
 * encabezado**: quien recorre la hoja de encabezado en encabezado oiria «Detalle del registro Vigente
 * R-00042» en cada salto. Es el mismo error que `Etiqueta` cuenta del `<label>` que envolvia al
 * control.
 *
 * **Sin `junto`, el DOM es el de antes byte a byte** —ni el hueco vacio, ni la clase de la fila—: hay
 * sistemas que miran esta cabecera, y lo que no se pide no se paga.
 */
export function TarjetaCabecera({
  children,
  className,
  junto,
  ...resto
}: HTMLAttributes<HTMLDivElement> & { readonly children: ReactNode; readonly junto?: ReactNode }) {
  if (junto === undefined) {
    return (
      <div
        data-slot="tarjeta-cabecera"
        className={cn('px-[15px] py-[11px] bg-azul text-sobre-azul', className)}
        {...resto}
      >
        <h2 className="m-0 text-[14.5px] font-bold">{children}</h2>
      </div>
    );
  }
  return (
    <div
      data-slot="tarjeta-cabecera"
      className={cn('flex flex-wrap items-center gap-x-[10px] gap-y-1 px-[15px] py-[11px] bg-azul text-sobre-azul', className)}
      {...resto}
    >
      <h2 className="m-0 text-[14.5px] font-bold">{children}</h2>
      <div data-slot="tarjeta-cabecera-junto" className="flex flex-1 flex-wrap items-center gap-[6px]">
        {junto}
      </div>
    </div>
  );
}

/**
 * La nota del bloque: una frase que explica el procedimiento.
 *
 * `max-w-[80ch]` no es decoracion: una linea de mas de ~80 caracteres se lee peor, y estas notas
 * estan escritas para leerse. `text-pretty` evita la palabra huerfana al final.
 */
export function TarjetaNota({ className, ...resto }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="tarjeta-nota"
      className={cn(
        'm-0 px-[15px] py-[11px] border-b border-linea-2 text-[13px] leading-[1.55] text-tinta-2 max-w-[80ch] text-pretty',
        className,
      )}
      {...resto}
    />
  );
}

/**
 * La rejilla de campos.
 *
 * `auto-fit` con minimo de 216 px es lo que hace que la pantalla se reacomode sola: tres columnas
 * en un monitor, una en un portatil estrecho, sin un solo punto de corte escrito. Un campo de
 * ancho completo se marca con `data-ancho="1"` y la regla de abajo lo estira.
 */
export function TarjetaCampos({ className, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="tarjeta-campos"
      className={cn(
        'grid grid-cols-[repeat(auto-fit,minmax(216px,1fr))] gap-x-4 gap-y-[14px] px-[15px] pt-[15px] pb-[18px]',
        '[&>[data-ancho="1"]]:col-span-full',
        className,
      )}
      {...resto}
    />
  );
}

/** La barra que corona una tabla dentro de la tarjeta: titulo, conteo y su accion. */
export function TarjetaBarraDeTabla({ className, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="tarjeta-barra-de-tabla"
      className={cn(
        'flex items-center gap-[10px] flex-wrap px-[15px] py-[11px] border-t border-linea-2',
        className,
      )}
      {...resto}
    />
  );
}

/**
 * El pie del bloque: lo que hay que saber para leer lo de arriba, **debajo** (#44).
 *
 * No es la `TarjetaNota`, y la diferencia es de lectura: la nota va arriba y dice que es el
 * bloque; el pie va abajo, en el gris de la nota de una tabla, y dice como leer lo que se acaba de
 * ver —«son cifras y no una tasa, a proposito»—. Con el filo arriba, porque debajo de una rejilla
 * sin el se leeria como un campo mas.
 */
export function TarjetaPie({ className, ...resto }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="tarjeta-pie"
      className={cn(
        'm-0 px-[15px] py-[10px] border-t border-linea-2 bg-sup text-[12.5px] leading-[1.55] text-tinta-3 text-pretty',
        className,
      )}
      {...resto}
    />
  );
}
