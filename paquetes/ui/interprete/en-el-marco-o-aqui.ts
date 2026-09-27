import { useState } from 'react';

/**
 * **Lo guarda quien lo da, o lo guarda la pieza** (#120).
 *
 * Seis sitios del interprete escribian lo mismo con otras palabras: si el marco —la ruta de la hoja,
 * lo tecleado de `useHoja()`, el acto abierto que pasa el sistema— guarda un valor, la pieza lo lee
 * de ahi y le pasa cada cambio; si no, lo guarda en su estado y el cambio se aplica ahi. La tabla,
 * el maestro y las pestanas lo hacian con la ruta; la pantalla, con lo tecleado y con el acto
 * abierto; el acto, con su propio tecleado. Seis `hoja === undefined ? … : …` que tenian que decir
 * lo mismo, y ninguno lo comprobaba contra los demas.
 *
 * <h2>Un CAMBIO, y no el valor nuevo</h2>
 *
 * `C` es lo que viaja: un cambio de la ruta, una funcion sobre lo tecleado, el acto nuevo. Aqui se
 * aplica con `aplicar` **dentro** de `setState`, asi que dos cambios del mismo gesto se aplican uno
 * sobre lo que dejo el otro —el motivo de `CambioDeLoTecleado`—; fuera, lo aplica quien lo guarda.
 *
 * Con `fuera`, el estado de aqui **no se lee ni se escribe**: una copia del valor del marco es un
 * segundo sitio que puede discrepar del primero, y el que manda es el que se puede compartir.
 */

/** Lo que guarda otro: su valor, y como pedirle que lo cambie. */
export interface EnElMarco<T, C> {
  readonly valor: T;
  readonly cambiar: (cambio: C) => void;
}

/**
 * El valor de `fuera`, si lo hay; si no, el de la pieza, que nace con `inicial` y cambia con
 * `aplicar`. Se llama siempre, con marco o sin el: es un hook.
 */
export function useEnElMarcoOAqui<T, C>(
  fuera: EnElMarco<T, C> | undefined,
  inicial: T,
  aplicar: (antes: T, cambio: C) => T,
): EnElMarco<T, C> {
  const [aqui, fijarAqui] = useState<T>(inicial);
  if (fuera !== undefined) return fuera;
  return {
    valor: aqui,
    cambiar: (cambio) => {
      fijarAqui((antes) => aplicar(antes, cambio));
    },
  };
}
