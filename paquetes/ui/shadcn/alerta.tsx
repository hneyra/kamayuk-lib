import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps, ReactNode } from 'react';

import { Icono } from '../Icono.tsx';
import type { NombreDeIcono } from '../iconos.ts';
import { cn } from '../utilidades.ts';

/**
 * El aviso que encabeza una pantalla, y que NO es una insignia.
 *
 * La diferencia importa porque las dos usan los cuatro tonos del artboard y se confunden: la
 * **insignia** califica un dato de una fila —«Vencida», «Conforme»—; la **alerta** dice algo de la
 * pantalla entera y normalmente pide un acto: «534 observados sin emision, que es lo que hay que
 * corregir».
 *
 * <h2>De donde salen sus valores, ya que el artboard no la dibuja</h2>
 *
 * El artboard la **declara** —el arbol la nombra pieza a pieza, con su uso escrito— pero no la
 * pinta: ninguna de sus cuarenta capturas la muestra. Asi que sus colores no se copian de un
 * pixel: se componen con los mismos cuatro pares de tokens que la insignia usa, que son los que
 * el propio artboard definio para decir «esto va bien / ojo / esto esta mal / entérate». Queda
 * dicho aqui para que nadie busque el original y crea que se perdio.
 *
 * El tono `mal` lleva `role="alert"` y los otros no: un aviso que interrumpe al lector de pantalla
 * en cada cambio de pantalla deja de ser un aviso y se convierte en ruido.
 */

const variantes = cva('flex items-start gap-[10px] rounded-sm border px-[14px] py-[11px] text-[13px] leading-[1.5]', {
  variants: {
    tono: {
      ok: 'bg-ok-fondo text-ok-tinta border-ok-tinta/25',
      atencion: 'bg-atencion-fondo text-atencion-tinta border-atencion-tinta/25',
      mal: 'bg-mal-fondo text-mal-tinta border-mal-borde/40',
      info: 'bg-info-fondo text-info-tinta border-info-tinta/25',
    },
  },
  defaultVariants: { tono: 'info' },
});

const ICONO_POR_TONO = {
  ok: 'visto',
  atencion: 'alerta',
  mal: 'alerta',
  info: 'informacion',
} as const satisfies Record<'ok' | 'atencion' | 'mal' | 'info', NombreDeIcono>;

export interface AlertaProps
  extends Omit<ComponentProps<'div'>, 'title'>,
    VariantProps<typeof variantes> {
  /** El titulo del aviso. Va en negrita, en la misma linea que el icono. */
  readonly titulo?: ReactNode;
}

export function Alerta({ className, tono, titulo, children, ...resto }: AlertaProps) {
  const cual = tono ?? 'info';
  return (
    <div
      data-slot="alerta"
      data-tono={cual}
      role={cual === 'mal' ? 'alert' : 'status'}
      className={cn(variantes({ tono }), className)}
      {...resto}
    >
      <span className="shrink-0 mt-px">
        <Icono nombre={ICONO_POR_TONO[cual]} tamano={17} />
      </span>
      <div className="min-w-0">
        {titulo === undefined ? null : <p className="m-0 font-bold">{titulo}</p>}
        {children === undefined ? null : <div className="text-pretty">{children}</div>}
      </div>
    </div>
  );
}
