import { Boton } from '../shadcn/boton.tsx';
import { TarjetaBarraDeTabla } from '../shadcn/tarjeta.tsx';
import type { Nombrados } from './componer.ts';
import { useEntorno } from './entorno.tsx';
import type { SitioDeLaHoja } from './hoja.ts';
import { MandoDeOrden } from './MandosDeLaTabla.tsx';
import type { ConteoDelFiltro } from './reglas-de-las-tablas.ts';
import type { DefinicionDeTabla, Texto } from './tipos.ts';

/**
 * **La barra de una tabla: su titulo, su conteo, el orden y el alta** (#27, #61, #86; aparte de
 * `TablaDelBloque` desde #120).
 *
 * No cuenta nada: el conteo le llega dicho —el del sistema, o las filas que hay— y, con el filtro
 * local puesto, la diferencia entre las que deja y las que llegaron. El titulo lleva `id` porque la
 * rejilla y su marco se nombran con el.
 */
export function BarraDeLaTabla({
  tabla,
  idDelTitulo,
  conteo,
  hayFiltro,
  conteoFiltrado,
  sitio,
  nombrados,
}: {
  readonly tabla: DefinicionDeTabla<Texto>;
  readonly idDelTitulo: string;
  /** Lo que dice el conteo, o `null` si no se dice ninguno. */
  readonly conteo: string | null;
  /** Si el filtro local se ofrece: es lo que hace existir su region viva, aun vacia. */
  readonly hayFiltro: boolean;
  /** Con el filtro puesto, las que deja de las que llegaron. */
  readonly conteoFiltrado: ConteoDelFiltro | undefined;
  readonly sitio: SitioDeLaHoja;
  readonly nombrados: Nombrados | undefined;
}) {
  const { traducir, textos } = useEntorno();
  return (
    <TarjetaBarraDeTabla>
      <p id={idDelTitulo} className="m-0 flex-1 min-w-[140px] text-[13px] font-bold">
        {traducir(tabla.titulo)}
      </p>
      {conteo === null ? null : <span className="text-[11.5px] text-tinta-3">{conteo}</span>}
      {/* La region viva existe mientras el filtro se ofrece, vacia hasta que se pone: una que aparece
          ya con el texto dentro no la anuncian todos los lectores de pantalla (#86, como `descartar`). */}
      {!hayFiltro ? null : (
        <span role="status" data-slot="conteo-del-filtro" className="text-[11.5px] text-tinta-3">
          {conteoFiltrado === undefined
            ? null
            : textos.filasQueDejaElFiltro(conteoFiltrado.visibles, conteoFiltrado.recibidas, conteoFiltrado.total)}
        </span>
      )}
      {tabla.orden === undefined ? null : (
        <MandoDeOrden
          orden={tabla.orden}
          paginacion={tabla.paginacion}
          sitio={sitio}
          nombrados={nombrados}
        />
      )}
      {tabla.accion === undefined ? null : (
        <Boton type="button" tamano="menudo">
          {traducir(tabla.accion)}
        </Boton>
      )}
    </TarjetaBarraDeTabla>
  );
}
