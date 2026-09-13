import { Boton } from '../ui/index.ts';

import { accionesDelPie, avisoDelPie } from './acciones.ts';
import type { Destino } from './catalogo.ts';
import { useArmazon, useTextos } from './contexto.tsx';

/**
 * Las acciones al pie de una pantalla. **Cuáles son las decide el dato** (#13, AC8).
 *
 * Ver `acciones.ts`, que es donde vive la decisión. Aquí sólo se dibuja: «Volver» a la izquierda, el
 * aviso en medio y las dos acciones a la derecha, con la principal en azul.
 *
 * <h2>Lo que el armazón NO hace es el acto</h2>
 *
 * Ni guarda, ni limpia, ni exporta, ni imprime: no sabe qué hay en la pantalla. Lo que hace es
 * ofrecer los cuatro botones correctos y avisar al sistema. Una acción que el sistema no atienda se
 * dibuja **deshabilitada** en vez de no dibujarse: un pie con un solo botón donde debería haber dos
 * se lee como una pantalla a medias, y uno que no responde al pulsarlo se lee como una avería.
 */

export interface AccionesAlPieProps {
  readonly destino: Destino;
  readonly alVolver: () => void;
}

export function AccionesAlPie({ destino, alVolver }: AccionesAlPieProps) {
  const { acciones = {} } = useArmazon();
  const textos = useTextos();

  return (
    <div
      data-slot="acciones-al-pie"
      className="flex flex-wrap items-center gap-[10px] px-[18px] pb-6 pt-0.5"
    >
      <Boton variante="secundario" onClick={alVolver}>
        {textos.volver}
      </Boton>
      <p className="m-0 min-w-[180px] flex-1 text-[12.5px] leading-[1.5] text-tinta-3 text-pretty">
        {avisoDelPie(destino, textos)}
      </p>
      {accionesDelPie(destino, textos).map((accion) => {
        const atendida = acciones[accion.acto];
        return (
          <Boton
            key={accion.acto}
            data-acto={accion.acto}
            variante={accion.principal ? 'primario' : 'secundario'}
            disabled={atendida === undefined}
            onClick={() => {
              atendida?.(destino.clave);
            }}
          >
            {accion.rotulo}
          </Boton>
        );
      })}
    </div>
  );
}
