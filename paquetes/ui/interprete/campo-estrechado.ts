import { tipoDe, type TipoDeCampo } from '../shadcn/campos.ts';
import type {
  CampoDeCasilla,
  CampoDeEntrada,
  CampoDeLista,
  CampoDeSoloLectura,
  DefinicionDeCampo,
  OpcionDelCampo,
} from './tipos.ts';

/**
 * **Un campo, estrechado por su tipo y no por las propiedades que trae** (#124).
 *
 * <h2>El defecto</h2>
 *
 * `CampoDelBloque` hacia `switch` sobre la letra que devuelve `tipoDe()`, y esa letra es una
 * `TipoDeCampo` suelta: no dice nada de `campo`, que seguia siendo la union entera. Asi que cada rama
 * preguntaba por la PROPIEDAD —`'opciones' in campo`, `'insignia' in campo`, `'casilla' in campo ? …
 * : ''`— y, si no casaba, pintaba una lista sin opciones o una casilla con la etiqueta vacia, en
 * silencio. La pregunta que decide que es un campo es su `tipo`, y la definicion ya esta
 * discriminada por el.
 *
 * <h2>Lo que hace</h2>
 *
 * Devuelve la letra —sin la marca de ancho— **junto al campo ya estrechado a su rama**, en una union
 * discriminada por `letra`. Quien hace `switch (estrechado.letra)` recibe en cada `case` el campo de
 * esa rama: `estrechado.campo.opciones` compila en `'s'` y no en ninguna otra.
 *
 * <h2>Por que catorce `case` y ni una asercion</h2>
 *
 * Porque el discriminante es `campo.tipo`, que lleva la marca de ancho: `'s'` y `'s1'` son la misma
 * rama. Con los catorce escritos, TypeScript estrecha `campo` solo, y el retorno anotado hace que un
 * `tipo` nuevo en `DefinicionDeCampo` sin su `case` no compile (TS2366). La letra de las entradas es
 * `Exclude<TipoDeCampo, …>` y no una lista a mano: un octavo tipo en `TipoDeCampo` cae ahi, y el
 * `switch` de `CampoDelBloque` —que agota `letra`— deja de compilar donde tiene que dibujarlo.
 *
 * <h2>Y sigue reventando con una letra que no existe</h2>
 *
 * `tipoDe()` se llama primero: una definicion escrita en JavaScript, o que llega de un JSON, no pasa
 * por el compilador, y con `'select'` tiene que reventar nombrandolo, no devolver `undefined`.
 */

/** Las letras de los campos que se escriben a mano: texto, fecha y area. */
export type LetraDeEntrada = Exclude<TipoDeCampo, 's' | 'r' | 'c'>;

/** El campo junto a su letra, discriminado por ella. Generico en las opciones, como la definicion. */
export type CampoEstrechado<O extends OpcionDelCampo = string> =
  | { readonly letra: 's'; readonly campo: CampoDeLista<O> }
  | { readonly letra: 'r'; readonly campo: CampoDeSoloLectura }
  | { readonly letra: 'c'; readonly campo: CampoDeCasilla }
  | { readonly letra: LetraDeEntrada; readonly campo: CampoDeEntrada };

export function estrecharElCampo<O extends OpcionDelCampo>(campo: DefinicionDeCampo<O>): CampoEstrechado<O> {
  // Revienta con una letra que no es de las siete. Ver el javadoc.
  tipoDe(campo.tipo);
  switch (campo.tipo) {
    case 's':
    case 's1':
      return { letra: 's', campo };
    case 'r':
    case 'r1':
      return { letra: 'r', campo };
    case 'c':
    case 'c1':
      return { letra: 'c', campo };
    case '':
    case '1':
      return { letra: '', campo };
    case 't':
    case 't1':
      return { letra: 't', campo };
    case 'd':
    case 'd1':
      return { letra: 'd', campo };
    case 'a':
    case 'a1':
      return { letra: 'a', campo };
  }
}
