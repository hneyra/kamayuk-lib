// Viola: ninguna cifra tributaria literal en el codigo (regla 5, RNF-053).
//
// LA MUESTRA DE LA PROHIBICION OPCIONAL. No la enciende esta libreria ni la enciende `rentas`:
// la enciende el sistema que PUBLICA las cifras, que hoy es `normativa` —el sistema cuyo trabajo
// entero es que estas cifras vivan en datos versionados, firmados a dos manos (ADR-0007) y
// sellados por ejercicio—. Viene verbatim de su V6 (`c01fe9a:frontend/verificaciones/muestras/
// cifra-tributaria-literal.ts`), que es donde se midio.
//
// Y el modo de fallo no es que se vea mal: es que se vea BIEN. Una alicuota escrita aqui se
// muestra igual que una leida del conjunto sellado, no cambia cuando cambia la ordenanza
// —cambiarla exige un despliegue, que es exactamente lo que RNF-053 impide— y no aparece en
// ninguna comprobacion de las que verifican el corpus.
//
// Las CINCO formas de abajo son las cinco ataduras de `ATADURAS_DE_CIFRA`, una por cada sitio
// donde un literal queda pegado a un nombre. Quitar una del selector deja su linea en verde.

// 1. Un decreto supremo la fija cada ano; aqui se queda congelada en el bundle.
export const uit = 5500;

// 2. La forma que de verdad se escribiria en estas interfaces: como texto, porque un importe es
// `string` (regla 1). Una prohibicion que solo mirase los numeros la dejaria pasar.
export const alicuotaPredial = '0.006';

// 3. Los tres tramos del predial, clavados en un objeto.
export const TRAMOS_DEL_PREDIAL = {
  tramo1: 0.002,
  tramo2: 0.006,
  tramo3: 0.01,
};

// 4. Una fila del cuadro de valores unitarios, en una propiedad de clase.
export class CuadroDeValoresUnitarios {
  readonly valorUnitarioC3 = '412.88';
}

// 5. Y por omision, que es donde una cifra se esconde mejor: el parametro no se pasa nunca y
// nadie vuelve a leer la firma.
export function depreciar(valor: string, depreciacion = 0.05) {
  return `${valor} ${depreciacion}`;
}
