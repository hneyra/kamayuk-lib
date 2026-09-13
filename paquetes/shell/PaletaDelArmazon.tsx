import {
  BuscadorDeLaPaleta,
  Icono,
  ListaDeLaPaleta,
  OpcionDeLaPaleta,
  PaletaDeMando,
  VacioDeLaPaleta,
} from '../ui/index.ts';

import { pieDeLaPaleta, resultadosDelMando } from './busqueda.ts';
import type { Catalogo } from './catalogo.ts';
import { useTextos } from './contexto.tsx';

/**
 * La paleta de mando: la segunda de las tres listas, y la única que llega a los cuarenta destinos
 * sin abrir un solo módulo.
 *
 * <h2>Lo que hace falta para que sirva de algo, y que no es el filtro</h2>
 *
 * Es **el módulo a la derecha de cada resultado**. Sin él, buscar «Panel» devuelve tres o cuatro
 * filas idénticas y hay que abrirlas para saber cuál era; con él, la lista se lee de un vistazo.
 * El artboard lo pone en `--tinta-3` y en 11.5 px: presente para desambiguar, no para competir con
 * el rótulo.
 *
 * <h2>Y el pie cuenta los que casan, no los que se ven</h2>
 *
 * Ver `busqueda.ts`. Un pie que dijera «12 de 40» con treinta coincidencias estaría escondiendo que
 * la búsqueda no discrimina nada.
 */

export interface PaletaDelArmazonProps {
  readonly catalogo: Catalogo;
  readonly abierta: boolean;
  readonly consulta: string;
  readonly alEscribir: (consulta: string) => void;
  readonly alCerrar: () => void;
  readonly alIr: (clave: string) => void;
}

export function PaletaDelArmazon({
  catalogo,
  abierta,
  consulta,
  alEscribir,
  alCerrar,
  alIr,
}: PaletaDelArmazonProps) {
  const textos = useTextos();
  const resultados = resultadosDelMando(catalogo, consulta);

  return (
    <PaletaDeMando
      label={textos.buscarUnDestino}
      open={abierta}
      onOpenChange={(quiere) => {
        if (!quiere) alCerrar();
      }}
    >
      <div className="flex items-center gap-[10px] border-b border-linea px-[15px] py-[13px]">
        <Icono nombre="lupa" tamano={16} />
        <BuscadorDeLaPaleta
          value={consulta}
          onValueChange={alEscribir}
          placeholder={textos.marcadorDeLaPaleta}
        />
        <kbd className="shrink-0 rounded-[3px] border border-linea px-[5px] py-0.5 font-[inherit] text-[10.5px] text-tinta-3">
          {textos.cerrarLaPaleta}
        </kbd>
      </div>
      <ListaDeLaPaleta rotulo={textos.sugerenciasDeLaPaleta}>
        <VacioDeLaPaleta>{textos.nadaCasaEnLaPaleta}</VacioDeLaPaleta>
        {resultados.map((resultado) => (
          <OpcionDeLaPaleta
            key={resultado.clave}
            value={resultado.clave}
            onSelect={() => {
              alIr(resultado.clave);
            }}
          >
            <span className="min-w-0 flex-1 truncate">{resultado.rotulo}</span>
            <span className="shrink-0 text-[11.5px] text-tinta-3">{resultado.modulo}</span>
          </OpcionDeLaPaleta>
        ))}
      </ListaDeLaPaleta>
      <p className="m-0 bg-sup px-[15px] py-[9px] text-[11.5px] text-tinta-3">
        {pieDeLaPaleta(catalogo, consulta, textos)}
      </p>
    </PaletaDeMando>
  );
}
