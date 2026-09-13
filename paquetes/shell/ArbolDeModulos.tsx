import { CuerpoDelPlegable, DisparadorDelPlegable, FOCO, Icono, Plegable, cn } from '../ui/index.ts';

import { modulosQueCasan } from './busqueda.ts';
import type { Catalogo } from './catalogo.ts';
import { useTextos } from './contexto.tsx';

/**
 * El árbol de módulos: la primera de las tres listas que sólo ofrecen lo que el catálogo trae.
 *
 * <h2>El filtro abre lo que casa, y eso no es comodidad</h2>
 *
 * Mientras hay texto, **todos** los módulos que casan quedan abiertos. Sin eso, buscar y tener que
 * abrir después serían dos gestos para uno, y —peor— una búsqueda que casa por el nombre del módulo
 * dejaría a la vista una fila cerrada: la respuesta correcta, con el contenido escondido.
 *
 * <h2>La hoja actual se marca de tres formas a la vez, y ninguna sobra</h2>
 *
 * `aria-current="page"` para quien no ve la pantalla, la guía de 2 px para quien la recorre de un
 * vistazo, y el peso 700 para quien la lee. El color solo no bastaría: `--azul-suave` sobre
 * `--fondo` es una diferencia que se pierde en una pantalla mal calibrada, que es la mayoría de las
 * de una ventanilla.
 */

export interface ArbolDeModulosProps {
  readonly catalogo: Catalogo;
  readonly filtro: string;
  /** El módulo desplegado. `null`: ninguno. Con filtro, se ignora y se abren los que casan. */
  readonly moduloDesplegado: string | null;
  readonly alDesplegar: (clave: string | null) => void;
  /** La hoja abierta, o `null` si no hay ninguna. */
  readonly destinoActual: string | null;
  /** Las hojas con cambios sin guardar. */
  readonly sucias: ReadonlySet<string>;
  readonly alIr: (clave: string) => void;
}

export function ArbolDeModulos({
  catalogo,
  filtro,
  moduloDesplegado,
  alDesplegar,
  destinoActual,
  sucias,
  alIr,
}: ArbolDeModulosProps) {
  const textos = useTextos();
  const hayFiltro = filtro.trim() !== '';
  const casan = modulosQueCasan(catalogo, filtro);

  if (casan.length === 0) {
    return (
      <p data-slot="arbol-sin-coincidencias" className="mx-[10px] my-4 text-[12.5px] leading-[1.5] text-tinta-3 text-pretty">
        {textos.nadaCasaEnElArbol(filtro.trim())}
      </p>
    );
  }

  return (
    <div data-slot="arbol-de-modulos">
      {casan.map(({ modulo, destinos }) => {
        const abierto = hayFiltro || moduloDesplegado === modulo.clave;
        return (
          <Plegable
            key={modulo.clave}
            open={abierto}
            onOpenChange={(quiere) => {
              alDesplegar(quiere ? modulo.clave : null);
            }}
          >
            <DisparadorDelPlegable
              className={abierto ? 'bg-azul-suave text-info-tinta' : 'bg-transparent text-tinta'}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-[15px] shrink-0 place-items-center text-tinta-4 transition-transform',
                  abierto ? 'rotate-90' : 'rotate-0',
                )}
              >
                <Icono nombre="chevronDerecha" tamano={11} grosor={2.6} />
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-sm',
                  abierto ? 'bg-azul text-sobre-azul' : 'bg-fondo text-tinta-3',
                )}
              >
                <Icono nombre={modulo.icono} tamano={14} />
              </span>
              <span className="min-w-0 flex-1 text-left leading-[1.2]">
                <span className="block truncate text-[13px] font-semibold">{modulo.rotulo}</span>
                {abierto ? (
                  <span className="block truncate text-[10.5px] text-tinta-3">{modulo.nota}</span>
                ) : null}
              </span>
            </DisparadorDelPlegable>
            <CuerpoDelPlegable>
              <div className="mb-[7px] ml-[43px] mt-0.5 flex flex-col gap-px border-l border-linea">
                {destinos.map((destino) => {
                  const actual = destino.clave === destinoActual;
                  return (
                    <button
                      key={destino.clave}
                      type="button"
                      data-slot="hoja-del-arbol"
                      aria-current={actual ? 'page' : undefined}
                      onClick={() => {
                        alIr(destino.clave);
                      }}
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-2 rounded-r-sm border-0 py-[7px] pl-0 pr-2',
                        `hover:bg-sup ${FOCO}`,
                        actual
                          ? 'bg-azul-suave font-bold text-info-tinta'
                          : 'bg-transparent font-normal text-tinta-2',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          '-ml-px w-3 shrink-0',
                          actual ? 'h-0.5 bg-azul' : 'h-px bg-linea',
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate text-left text-[12.5px]">
                        {destino.rotulo}
                      </span>
                      {sucias.has(destino.clave) ? (
                        <span
                          data-slot="marca-sin-guardar"
                          className="shrink-0 text-[9px] font-bold uppercase tracking-[.05em] text-tinta-3"
                        >
                          {textos.sinGuardar}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </CuerpoDelPlegable>
          </Plegable>
        );
      })}
    </div>
  );
}
