import { Miga, PasoDeLaMiga } from '../ui/index.ts';

import type { HojaDelCatalogo } from './catalogo.ts';
import { useTextos } from './contexto.tsx';

/**
 * La cabecera de una pantalla: miga, título, nota y barra de instrucción.
 *
 * Es la tercera lista donde un destino puede aparecer, y por eso entra en el AC4: **la miga nombra
 * el módulo y la hoja**, así que un destino que el catálogo no ofrece no puede llegar a dibujarse
 * aquí tampoco.
 *
 * <h2>El título va en peso 400, y es una decisión del artboard que se pierde sola</h2>
 *
 * 27 px en peso normal, no en negrita. Una pantalla donde el título está en negrita y los rótulos
 * de los grupos también acaba sin jerarquía: todo pesa lo mismo y el ojo no sabe por dónde empezar.
 * A 27 px el tamaño ya distingue; la negrita encima sólo grita.
 *
 * <h2>Y la barra de instrucción dice qué HACER, no qué es</h2>
 *
 * Qué es la pantalla ya lo dice la nota bajo el título. La instrucción es la frase que sobra en una
 * pantalla obvia y que es lo único que se lee en una que no lo es.
 */

export interface CabeceraDePantallaProps {
  readonly hoja: HojaDelCatalogo;
  /** La frase de la barra gris. Si no la hay, la barra no se dibuja. */
  readonly instruccion?: string;
}

export function CabeceraDePantalla({ hoja, instruccion }: CabeceraDePantallaProps) {
  const textos = useTextos();
  return (
    <div data-slot="cabecera-de-pantalla">
      <div className="px-[18px] pb-1 pt-4">
        <Miga rotulo={textos.ruta} className="mb-[7px]">
          <PasoDeLaMiga>{hoja.modulo.rotulo}</PasoDeLaMiga>
          <PasoDeLaMiga actual conSeparador>
            {hoja.destino.rotulo}
          </PasoDeLaMiga>
        </Miga>
        <h1 className="m-0 text-[27px] font-normal tracking-[-.01em] text-tinta text-pretty">
          {hoja.destino.rotulo}
        </h1>
        <p className="mx-0 mb-0 mt-[7px] max-w-[82ch] text-[13.5px] leading-[1.55] text-tinta-2 text-pretty">
          {hoja.modulo.nota}
        </p>
      </div>
      {instruccion === undefined ? null : (
        <div className="border-y border-linea bg-sup">
          <p className="m-0 max-w-[96ch] px-[18px] py-[10px] text-[13.5px] leading-[1.55] text-tinta-2 text-pretty">
            <strong>{hoja.modulo.rotulo}:</strong> {instruccion}
          </p>
        </div>
      )}
    </div>
  );
}
