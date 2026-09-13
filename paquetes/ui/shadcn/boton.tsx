import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '../utilidades.ts';
import { FOCO } from './foco.ts';

/**
 * El primer componente de shadcn del producto, con la forma de V8.
 *
 * <h2>Que es «de shadcn» y que es de aqui</h2>
 *
 * La FORMA es la de shadcn: `cva` para las variantes, `cn()` para componer, `data-slot` para que
 * una pantalla pueda apuntar a la pieza sin depender de una clase. Los VALORES son los del
 * artboard —relleno, tamano de letra, peso, radio— y salen de los tokens, no de la paleta por
 * omision de shadcn.
 *
 * <h2>Por que este entra ahora y no los veinticinco</h2>
 *
 * Porque hacia falta UNO con el que comprobar que el `--radius` del producto gana al `0.625rem`
 * de shadcn. `kamayuk-lib`#6 dejo ese punto declarado a medias justamente por no tener ninguno:
 * un `--radius` escrito sin nada que lo lea es una afirmacion sin sujeto.
 *
 * Los demas entran cuando se usen. El CLI de shadcn los copia uno a uno al repositorio que los
 * consume, y quien sabe cuales hacen falta es quien dibuja.
 */
const variantes = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-[13.5px] ' +
    // El foco: el CONTORNO del artboard mas el halo. Ni `outline-none` ni el halo solo — ver
    // `foco.ts`, que explica por que las dos cosas juntas dejaban el contorno sin pintar.
    `transition-colors ${FOCO} ` +
    'disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variante: {
        // El primario del pie de pantalla: fondo azul, texto encima, y en negrita.
        primario: 'bg-azul text-sobre-azul font-bold hover:bg-azul-hover',
        // El secundario: papel con filo, que es como V8 dibuja «Volver» y «Limpiar».
        secundario:
          'bg-superficie text-tinta border border-borde-boton hover:border-borde-hover',
        // El de la barra global, sobre el azul oscuro.
        barra: 'bg-barra-control text-sobre-barra hover:bg-barra-hover',
        // Sin fondo ni filo, para las acciones de una fila.
        fantasma: 'text-azul hover:bg-sup',
      },
      tamano: {
        // Los tres tamanos que V8 usa, con sus rellenos exactos.
        normal: 'px-[18px] py-[9px]',
        menudo: 'px-3 py-1.5 text-[12.5px]',
        // El cuadrado de un icono solo: 32 px, el de la barra.
        icono: 'size-8 p-0',
      },
    },
    defaultVariants: { variante: 'secundario', tamano: 'normal' },
  },
);

export interface BotonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof variantes> {}

export function Boton({ className, variante, tamano, ...resto }: BotonProps) {
  return (
    <button
      data-slot="boton"
      className={cn(variantes({ variante, tamano }), className)}
      {...resto}
    />
  );
}
