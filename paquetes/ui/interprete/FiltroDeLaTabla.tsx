import { Boton } from '../shadcn/boton.tsx';
import { Campo } from '../shadcn/campo.tsx';
import { useEntorno } from './entorno.tsx';
import type { FiltroElegido } from './reglas-de-las-tablas.ts';
import type { DefinicionDeTabla, Texto } from './tipos.ts';

/**
 * **El buscador y los chips del filtro local** (#86, `filtro-en-el-cliente-con-conteo`; aparte de
 * `TablaDelBloque` desde #120).
 *
 * <h2>Lo contrario de la pagina y el orden: NUNCA sale de la tabla</h2>
 *
 * `filtroLocal` acota las filas que llegaron —antes de cortar la pagina en cliente; la pagina misma
 * en servidor— con lo elegido en el estado de la tabla, y ni lo escribe en la ruta ni lo pide. Solo
 * se ofrece cuando HAY filas —sin dato o con `[]` no hay nada que acotar—; puesto, el conteo dice «N
 * de M» en una region viva, y si no deja ninguna se dice con su propia frase, que no es el `vacio` de
 * la tabla (`queDiceSinFilas`).
 *
 * Un grupo con nombre —el de la tabla dentro, como sus mandos de pagina—, un campo de busqueda con su
 * nombre accesible y un boton por chip que se queda pulsado con `aria-pressed`. Nada de esto escribe
 * en la ruta: lo elegido sube a `elegir`, que es el estado de la tabla.
 */
export function FiltroDeLaTabla({
  filtro,
  elegido,
  elegir,
  nombreDeLaTabla,
  texto,
}: {
  readonly filtro: NonNullable<DefinicionDeTabla<Texto>['filtroLocal']>;
  readonly elegido: FiltroElegido;
  readonly elegir: (cambio: (antes: FiltroElegido) => FiltroElegido) => void;
  readonly nombreDeLaTabla: string;
  readonly texto: (t: Texto) => string;
}) {
  const { textos } = useEntorno();
  const { buscador, chips = [] } = filtro;
  return (
    <div
      data-slot="filtro-local"
      role="group"
      aria-label={textos.filtrarLaTabla(nombreDeLaTabla)}
      className="flex flex-wrap items-center gap-2 border-t border-linea-2 px-[15px] py-[10px]"
    >
      {buscador === undefined ? null : (
        <Campo
          type="search"
          aria-label={texto(buscador.rotulo)}
          placeholder={buscador.marcador === undefined ? undefined : texto(buscador.marcador)}
          value={elegido.busqueda}
          onChange={(evento) => {
            const busqueda = evento.target.value;
            elegir((antes) => ({ ...antes, busqueda }));
          }}
          className="w-auto min-w-[200px] flex-1"
        />
      )}
      {chips.map((chip, i) => {
        const pulsado = elegido.chips.includes(i);
        return (
          <Boton
            key={i}
            type="button"
            tamano="menudo"
            variante={pulsado ? 'primario' : 'secundario'}
            aria-pressed={pulsado}
            data-chip={chip.si.dato}
            onClick={() => {
              elegir((antes) => ({
                ...antes,
                chips: antes.chips.includes(i) ? antes.chips.filter((j) => j !== i) : [...antes.chips, i],
              }));
            }}
          >
            {texto(chip.rotulo)}
          </Boton>
        );
      })}
    </div>
  );
}
