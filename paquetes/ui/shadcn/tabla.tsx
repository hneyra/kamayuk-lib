import type { ComponentProps } from 'react';

import { cn } from '../utilidades.ts';

/**
 * La tabla de V8: filas alternas, columnas de cifra a la derecha y la primera en negrita.
 *
 * <h2>Las tres reglas que no son estilo</h2>
 *
 * 1. **La columna de cifra va a la derecha y con `tabular-nums`.** Con cifras de ancho variable,
 *    `1 842` y `988` no alinean sus unidades y comparar dos importes de una ojeada deja de ser
 *    posible. En una pantalla de recaudacion, eso es el uso principal de la tabla.
 * 2. **La primera columna no parte.** Es la que identifica la fila —el tributo, el modulo, la
 *    etapa—; partida en dos lineas, la tabla deja de leerse como una lista.
 * 3. **Las filas alternan papel.** Con seis columnas, seguir una fila hasta el final sin la banda
 *    es exactamente donde se lee el dato de la fila de al lado.
 *
 * <h2>Por que el contenedor lleva su propio `overflow-x`</h2>
 *
 * Porque una tabla de seis columnas no cabe en un telefono y la alternativa —dejar que la pagina
 * entera se desplace de lado— rompe el resto de la pantalla. El desplazamiento se acota a la
 * tabla, que es lo unico que lo necesita.
 */

export interface TablaProps extends ComponentProps<'table'> {
  /**
   * Lo que se le pone al contenedor que se desplaza (#65, `tabla-de-cabecera-fija`). Una cabecera
   * `sticky` se pega al contenedor desplazable MAS CERCANO: si el que se desplaza en vertical fuera
   * otro, por fuera, este —con su `overflow-x`— se quedaria con la cabecera y no se moveria nunca.
   */
  readonly marco?: Omit<ComponentProps<'div'>, 'children'> & Readonly<Record<`data-${string}`, string>>;
}

export function Tabla({ className, style, marco, ...resto }: TablaProps) {
  const { className: claseDelMarco, ...restoDelMarco } = marco ?? {};
  return (
    <div
      data-slot="tabla-marco"
      className={cn('overflow-x-auto border-t border-linea-2', claseDelMarco)}
      {...restoDelMarco}
    >
      <table
        data-slot="tabla"
        className={cn('w-full border-collapse', className)}
        style={style}
        {...resto}
      />
    </div>
  );
}

export function TablaCabecera(props: ComponentProps<'thead'>) {
  return <thead data-slot="tabla-cabecera" {...props} />;
}

export function TablaCuerpo(props: ComponentProps<'tbody'>) {
  return <tbody data-slot="tabla-cuerpo" {...props} />;
}

/** `impar` pinta la banda. La lleva la fila y no un `:nth-child` para que el interprete decida. */
export function TablaFila({ className, impar = false, ...resto }: ComponentProps<'tr'> & { readonly impar?: boolean }) {
  return (
    <tr
      data-slot="tabla-fila"
      className={cn(impar ? 'bg-sup' : 'bg-superficie', className)}
      {...resto}
    />
  );
}

export function TablaRotulo({
  className,
  cifra = false,
  ...resto
}: ComponentProps<'th'> & { readonly cifra?: boolean }) {
  return (
    <th
      data-slot="tabla-rotulo"
      scope="col"
      className={cn(
        'px-[14px] py-[9px] text-left text-[11.5px] font-bold uppercase tracking-[0.05em]',
        'text-tinta-3 bg-sup border-b border-linea whitespace-nowrap',
        cifra ? 'text-right' : '',
        className,
      )}
      {...resto}
    />
  );
}

export interface TablaCeldaProps extends ComponentProps<'td'> {
  /** Cifra: a la derecha y con digitos de ancho fijo. Ver el javadoc. */
  readonly cifra?: boolean;
  /** La primera columna, que identifica la fila: en negrita y sin partir. */
  readonly identifica?: boolean;
}

export function TablaCelda({ className, cifra = false, identifica = false, ...resto }: TablaCeldaProps) {
  return (
    <td
      data-slot="tabla-celda"
      className={cn(
        'px-[14px] py-[10px] text-[13.5px] text-tinta-2 border-b border-linea-2',
        cifra ? 'text-right tabular-nums text-tinta' : '',
        identifica ? 'font-semibold text-tinta whitespace-nowrap' : '',
        className,
      )}
      {...resto}
    />
  );
}

/** La frase bajo la tabla: dice lo que las cifras NO dicen. Papel `--sup` para que no sea una fila. */
export function TablaNota({ className, ...resto }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="tabla-nota"
      className={cn('m-0 px-[15px] py-[10px] bg-sup text-[12px] leading-[1.5] text-tinta-3 text-pretty', className)}
      {...resto}
    />
  );
}
