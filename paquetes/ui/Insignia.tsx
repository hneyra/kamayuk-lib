import type { ReactNode } from 'react';

import type { Tono } from '../formato/index.ts';

/**
 * Insignia de estado: «Vigente», «Vencido», «Con deuda».
 *
 * **El texto va siempre dentro, y por eso `children` no es opcional.** Un estado que se comunica
 * solo por color no se comunica a quien no distingue ese color, y en una caja de ventanilla eso
 * no es una minoria teorica: es el 8 % de los hombres. No hay variante que pinte solo un punto, y
 * no la habra — el dia que alguien la escriba, el tipo se lo impide antes de que compile.
 *
 * <h2>Por que las clases estan escritas una a una y no compuestas</h2>
 *
 * Porque Tailwind **lee el codigo fuente como texto** para saber que utilidades generar. Un
 * `bg-${tono}-fondo` no aparece en ningun archivo, asi que la clase no se genera y la insignia
 * sale sin fondo — en produccion, donde no hay nadie mirando, y no en desarrollo, donde el JIT
 * suele tenerla ya generada por otra pantalla. Escribirlas enteras es lo que lo impide.
 */
export interface InsigniaProps {
  readonly tono: Tono;
  /** El estado, escrito. Obligatorio: ver el javadoc del componente. */
  readonly children: ReactNode;
}

/** Los cuatro tonos del artboard, con sus dos clases enteras. Ver el javadoc. */
const CLASES: Readonly<Record<Tono, string>> = {
  ok: 'bg-ok-fondo text-ok-tinta',
  atencion: 'bg-atencion-fondo text-atencion-tinta',
  mal: 'bg-mal-fondo text-mal-tinta',
  info: 'bg-info-fondo text-info-tinta',
};

export function Insignia({ tono, children }: InsigniaProps) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-[9px] py-[3px] text-[11.5px] font-bold ${CLASES[tono]}`}
    >
      {children}
    </span>
  );
}
