import { Campo, PanelDelCajon, Cajon, TituloDelCajon, NotaDelCajon } from '../ui/index.ts';

import { ArbolDeModulos, type ArbolDeModulosProps } from './ArbolDeModulos.tsx';
import { useTextos } from './contexto.tsx';

/**
 * El carril de 262 px que envuelve al árbol: la caja de filtro arriba y la línea de pie abajo.
 *
 * <h2>Por qué en pantalla estrecha es un cajón, y no simplemente se esconde</h2>
 *
 * V8 lo esconde con una regla de su propia hoja de estilos —`@media (max-width: 1040px)`— y ahí
 * deja un agujero: con el carril fuera, la única forma de llegar a otro módulo es la paleta, que se
 * abre con un atajo de teclado que en una pantalla estrecha suele significar que no hay teclado.
 * En cajón, el mismo árbol sigue estando a un botón de distancia y no se come un tercio del ancho
 * mientras no se usa.
 *
 * Es un solo árbol y no dos: dibujar el carril fijo y el cajón a la vez pondría cada hoja dos veces
 * en el documento, y entonces «la hoja que dice Panel» deja de ser una.
 */

export interface CarrilDeModulosProps extends ArbolDeModulosProps {
  readonly alFiltrar: (filtro: string) => void;
  readonly pie?: string;
  /** La pantalla es estrecha: el carril va en cajón. */
  readonly enCajon: boolean;
  /** Abierto. En pantalla ancha decide si el carril se ve; en estrecha, si el cajón está fuera. */
  readonly abierto: boolean;
  readonly alCerrarElCajon: () => void;
}

function Dentro({ alFiltrar, pie, ...delArbol }: Omit<CarrilDeModulosProps, 'enCajon' | 'abierto' | 'alCerrarElCajon'>) {
  const textos = useTextos();
  return (
    <>
      <div className="shrink-0 border-b border-linea-2 p-[10px_10px_9px]">
        <Campo
          value={delArbol.filtro}
          onChange={(evento) => {
            alFiltrar(evento.target.value);
          }}
          placeholder={textos.filtrarElCarril}
          aria-label={textos.filtrarElCarril}
          className="text-[13px]"
        />
      </div>
      <div className="flex-1 overflow-auto px-[7px] pb-3 pt-1.5">
        <ArbolDeModulos {...delArbol} />
      </div>
      {pie === undefined ? null : (
        <p className="m-0 shrink-0 border-t border-linea-2 px-3 py-[10px] text-[11px] leading-[1.5] text-tinta-3 text-pretty">
          {pie}
        </p>
      )}
    </>
  );
}

export function CarrilDeModulos({ enCajon, abierto, alCerrarElCajon, ...resto }: CarrilDeModulosProps) {
  const textos = useTextos();
  if (enCajon) {
    return (
      <Cajon
        open={abierto}
        onOpenChange={(quiere) => {
          if (!quiere) alCerrarElCajon();
        }}
      >
        <PanelDelCajon lado="izquierda" data-slot="carril-de-modulos">
          <TituloDelCajon>{textos.modulos}</TituloDelCajon>
          <NotaDelCajon>{textos.elijaUnDestino}</NotaDelCajon>
          <Dentro {...resto} />
        </PanelDelCajon>
      </Cajon>
    );
  }

  if (!abierto) {
    return null;
  }

  return (
    <aside
      data-slot="carril-de-modulos"
      aria-label={textos.modulos}
      className="flex min-h-0 w-[262px] shrink-0 flex-col border-r border-linea bg-fondo"
    >
      <Dentro {...resto} />
    </aside>
  );
}
