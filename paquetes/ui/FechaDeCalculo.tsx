import type { ReactNode } from 'react';

import { formatearFecha, type Fecha } from '../formato/index.ts';

import { TEXTOS_DE_LA_UI } from './textos.tsx';

/**
 * La linea que dice a que dia son las cifras de la pantalla (regla 9: no existe «la deuda»).
 *
 * **Las palabras entran como dato y la fecha no** (#19). El formato de una fecha es de
 * `@kamayuk/formato` y no se traduce; lo que se traduce es la frase que la envuelve, y entra
 * entera como funcion porque en otro idioma la fecha no cae necesariamente al final.
 */

export interface FechaDeCalculoProps {
  readonly fecha: Fecha;
  /** Como se dice. La fecha llega ya formateada y ya en negrita. Por omision, en castellano. */
  readonly rotulo?: (fecha: ReactNode) => ReactNode;
}

export function FechaDeCalculo({
  fecha,
  rotulo = TEXTOS_DE_LA_UI.cifrasActualizadas,
}: FechaDeCalculoProps) {
  return (
    <p className="m-0 text-[12.5px] text-tinta-3">
      {rotulo(<strong className="font-bold">{formatearFecha(fecha)}</strong>)}
    </p>
  );
}
