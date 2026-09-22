import { Component, memo } from 'react';
import { describe, expect, it } from 'vitest';

// Por el INDICE, a proposito: es la puerta por la que entra el consumidor, y las dos costuras de
// #102 eran costuras de esa puerta —una funcion que no salia por ella y una firma que no aceptaba
// lo que ella misma publica—. Importado de `./componer.ts`, esto pasaria en verde con las dos.
import { esBloque, piezasSinRegistrar } from '../index.ts';
import type {
  DefinicionDePantalla,
  PiezaDeLaPantalla,
  PiezasDelConsumidor,
  PropsDeUnaPiezaDelConsumidor,
} from '../index.ts';

/**
 * **Las costuras que encontro `rentas` al estrenar `delConsumidor` (#102).**
 *
 * Las dos que se cierran aqui las encontro el primer consumidor escribiendo su guarda, que es lo
 * que `piezasSinRegistrar` existe para permitir: tuvo que **copiar** `esBloque` y **poner un `as`**
 * para pasar su registro. Esta prueba escribe esa guarda como la escribiria el, sin copia y sin
 * `as`, y por eso es tambien una barrera DEL COMPILADOR: la llamada de abajo no compila con la
 * firma de antes (`ComponentType<never>`), y el rojo de `tsc` esta anotado en `HISTORY.md`.
 *
 * La tercera —un dato con nombre que no es texto— **no se cierra**: aplanar es el contrato, y el
 * porque esta en el docblock de `DatoConNombre`.
 */

type Definicion = DefinicionDePantalla<PiezaDeLaPantalla>;

const Funcion = ({ clave }: PropsDeUnaPiezaDelConsumidor) => <p>{clave}</p>;

const Memorizada = memo(Funcion);

/** Una clase con `defaultProps`: el miembro de `ComponentType` que hacia invariante la firma. */
class DeClase extends Component<PropsDeUnaPiezaDelConsumidor> {
  static defaultProps: Partial<PropsDeUnaPiezaDelConsumidor> = { indice: 0 };
  override render() {
    return <p>{this.props.clave}</p>;
  }
}

/** El registro como lo declara un sistema: con el tipo que la libreria publica, y sin `as`. */
const REGISTRO: PiezasDelConsumidor = { funcion: Funcion, memorizada: Memorizada, deClase: DeClase };

describe('#102: la guarda del consumidor se escribe con lo que el indice publica', () => {
  it('`esBloque` sale por el indice: el consumidor no tiene que copiarlo', () => {
    expect(esBloque({ titulo: 'x', nota: '', campos: [] }), 'un bloque de #27, sin `tipo`').toBe(true);
    expect(esBloque({ tipo: 'bloque', titulo: 'x', nota: '', campos: [] })).toBe(true);
    expect(esBloque({ tipo: 'delConsumidor', clave: 'x' })).toBe(false);
    expect(esBloque({ tipo: 'aviso', tono: 'ok', titulo: 'x' })).toBe(false);
  });

  it('`piezasSinRegistrar` acepta un `PiezasDelConsumidor` de verdad —funcion, `memo` y clase—, sin `as`', () => {
    const definicion: Definicion = {
      instruccion: '',
      bloques: [
        { tipo: 'delConsumidor', clave: 'funcion' },
        { tipo: 'delConsumidor', clave: 'olvidada' },
        { tipo: 'delConsumidor', clave: 'memorizada' },
        { tipo: 'delConsumidor', clave: 'deClase' },
      ],
    };
    expect(piezasSinRegistrar(definicion, REGISTRO)).toEqual(['olvidada']);
  });
});
