import { Fragment } from 'react';

import { type Nombrados, resolverMarcas } from './componer.ts';
import type { TextoConMarcas } from './tipos.ts';

/**
 * **Una frase con `code` y `strong` dentro**, dibujada (#86, `texto-con-marcas`).
 *
 * Cada tramo en su elemento y **en la misma linea**: `texto` tal cual, `codigo` en `<code>` —como el
 * campo del contrato de #61 y las operaciones del pie de #44— y `fuerte` en `<strong>`. Devuelve los
 * tramos sueltos, sin envoltorio: quien la pone decide el parrafo —la nota de la tarjeta—, y asi la
 * frase sigue siendo UNA para quien la lee y para el lector de pantalla.
 *
 * Lo que dice cada tramo lo decide `resolverMarcas`, que es pura: aqui solo se elige el elemento.
 */
export function ProsaConMarcas({
  marcas,
  nombrados,
  traducir,
  ausente,
}: {
  readonly marcas: TextoConMarcas;
  readonly nombrados: Nombrados;
  readonly traducir: (texto: string) => string;
  readonly ausente: string;
}) {
  return (
    <>
      {resolverMarcas(marcas, nombrados, traducir, ausente).map((tramo, i) =>
        tramo.marca === 'codigo' ? (
          <code key={i} data-slot="marca-codigo" className="text-[12.5px] text-tinta">
            {tramo.dice}
          </code>
        ) : tramo.marca === 'fuerte' ? (
          <strong key={i} data-slot="marca-fuerte" className="font-bold text-tinta">
            {tramo.dice}
          </strong>
        ) : (
          // Un nodo de texto a pelo: sin elemento, la frase no gana una caja por tramo.
          <Fragment key={i}>{tramo.dice}</Fragment>
        ),
      )}
    </>
  );
}
