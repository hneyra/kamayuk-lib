import { useId } from 'react';

import { BotonConMotivo } from '../shadcn/boton-con-motivo.tsx';
import { Boton } from '../shadcn/boton.tsx';
import { Desplegable, Opcion } from '../shadcn/desplegable.tsx';
import type { TextosDeLaPantalla } from '../textos.tsx';
import { type Nombrados, resolverTexto } from './componer.ts';
import type { EnLaRuta } from './hoja.ts';
import type { PaginaDeUnaTabla } from './reglas-de-las-tablas.ts';
import type { OrdenDeLaTabla, PaginacionDeLaTabla, Texto } from './tipos.ts';

/**
 * **Los mandos de una tabla: por que campo se ordena, y que pagina se ve** (#61,
 * `paginacion-y-orden-en-el-servidor` y `tablas-grandes`).
 *
 * Suben de las dos piezas locales de `catastro` —`frontend/src/pantallas/piezas/paginacion.tsx` y
 * `orden.tsx` (catastro#137, PR catastro#139)—, que se escribieron alli porque una sola hoja las
 * usaba. Las pide tambien `normativa` (`normativa/frontend/diseno/HUECOS.md`, H01 y H21), y con dos
 * sistemas suben (ADR-0030 §4, «probar con dos»). Su adopcion en `catastro` es catastro#144: aqui
 * **no se toca `catastro`**.
 *
 * <h2>Ninguno de los dos hace lo que anuncia: lo ESCRIBE en la ruta</h2>
 *
 * El interprete no pide datos y no ordena filas. Cambiar de pagina o de campo mueve la ruta de la
 * hoja, y quien lee la ruta —el sistema— pide lo que toque. Es lo mismo que hacen la pestana y el
 * maestro de #67, y por el mismo motivo: lo que no vive aqui no se le puede desincronizar de la
 * barra de direcciones.
 *
 * <h2>Lo impedido, con su motivo</h2>
 *
 * «Anterior» en la primera y «Siguiente» en la ultima son `BotonConMotivo` (#66): `aria-disabled`,
 * **nunca `disabled`**, siguen en el orden del tabulador y dicen por que. Quien navega con teclado
 * llega a los dos y se entera de donde esta.
 *
 * <h2>El orden va por lista blanca, y la libreria no la inventa</h2>
 *
 * Se ofrecen **exactamente** los campos que la definicion escribe, porque el servidor los admite por
 * lista cerrada y uno que no esta es un 422. Los dos valores del sentido tambien son dato: uno
 * escribe `ASCENDENTE` y otro `asc`, y esta pieza no tiene por que saber cual.
 *
 * Cambiar de orden **vuelve a la primera pagina**, en un solo movimiento de la ruta: seguir en la
 * pagina 7 de otro orden es una lectura que nadie quiso.
 */

/** Como se lee y como se escribe el sitio de la tabla: la ruta de la hoja, o el estado de la tabla. */
export interface SitioDeLaTabla {
  readonly leer: (sitio: EnLaRuta) => string | null;
  readonly fijar: (cambios: Readonly<Record<EnLaRuta, string | null>>) => void;
}

export interface MandoDeOrdenProps {
  readonly orden: OrdenDeLaTabla<Texto>;
  /** Donde vive la pagina, si la tabla pagina: cambiar de orden vuelve a la primera. */
  readonly paginacion?: PaginacionDeLaTabla;
  readonly sitio: SitioDeLaTabla;
  readonly nombrados: Nombrados;
  readonly traducir: (texto: string) => string;
  readonly textos: TextosDeLaPantalla;
}

/** El campo por el que se ordena hoy: el de la ruta si es uno de los admitidos, o el primero. */
export function campoOrdenado(orden: OrdenDeLaTabla<Texto>, enLaRuta: string | null): string {
  if (enLaRuta !== null && orden.campos.some((campo) => campo.valor === enLaRuta)) return enLaRuta;
  return orden.campos[0]?.valor ?? '';
}

export function MandoDeOrden({ orden, paginacion, sitio, nombrados, traducir, textos }: MandoDeOrdenProps) {
  const id = useId();
  const campo = campoOrdenado(orden, sitio.leer(orden.enLaRuta));
  const descendente = sitio.leer(orden.sentidoEnLaRuta) === orden.descendente;
  // Volver a la primera acompana a TODO cambio de orden, y va en el mismo movimiento de la ruta.
  const aLaPrimera = paginacion === undefined ? {} : { [paginacion.enLaRuta]: '0' };
  const rotuloDelSentido = traducir(descendente ? textos.pasarAAscendente : textos.pasarADescendente);

  return (
    <div data-slot="orden-de-la-tabla" className="flex items-center gap-[9px]">
      {/* El desplegable no lleva rotulo a la vista —no hay sitio en la barra—, pero SI nombre: un
          `<label>` oculto apuntando al disparador, que es un `<button>` y por tanto etiquetable. */}
      <label htmlFor={id} className="sr-only">
        {textos.ordenarLaLista}
      </label>
      <Desplegable
        id={id}
        value={campo}
        onValueChange={(elegido) => {
          sitio.fijar({ ...aLaPrimera, [orden.enLaRuta]: elegido });
        }}
        className="w-auto min-w-[140px]"
      >
        {orden.campos.map((uno) => (
          // El VALOR es el del backend y no pasa por `traducir`; el rotulo, si.
          <Opcion key={uno.valor} value={uno.valor}>
            {resolverTexto(uno.rotulo, nombrados, traducir, textos.datoAusente)}
          </Opcion>
        ))}
      </Desplegable>
      <Boton
        type="button"
        tamano="menudo"
        data-sentido={descendente ? orden.descendente : orden.ascendente}
        // El rotulo dice lo que HARA, no lo que hay puesto: la flecha ya dice lo que hay.
        title={rotuloDelSentido}
        aria-label={rotuloDelSentido}
        onClick={() => {
          sitio.fijar({
            ...aLaPrimera,
            [orden.sentidoEnLaRuta]: descendente ? orden.ascendente : orden.descendente,
          });
        }}
      >
        {descendente ? textos.flechaDescendente : textos.flechaAscendente}
      </Boton>
    </div>
  );
}

export interface MandoDePaginasProps {
  readonly paginacion: PaginacionDeLaTabla;
  readonly pagina: PaginaDeUnaTabla;
  readonly sitio: SitioDeLaTabla;
  readonly textos: TextosDeLaPantalla;
  /** El nombre de la tabla, para el nombre accesible del grupo. */
  readonly nombreDeLaTabla: string;
}

export function MandoDePaginas({ paginacion, pagina, sitio, textos, nombreDeLaTabla }: MandoDePaginasProps) {
  const tamanos = paginacion.tamanos ?? [];
  const sitioDelTamano = paginacion.tamanoEnLaRuta;
  const idDelTamano = useId();
  // La que se lee empieza en UNO; la que viaja, en cero. Es la unica suma de la pieza, y es de un
  // indice y no de un importe (regla 1).
  const leida = pagina.pagina + 1;

  return (
    <div
      data-slot="paginacion-de-la-tabla"
      role="group"
      aria-label={textos.mandosDeLaTabla(nombreDeLaTabla)}
      className="flex flex-wrap items-center gap-2 border-t border-linea-2 px-[15px] py-[10px]"
    >
      <BotonConMotivo
        type="button"
        tamano="menudo"
        data-mando="anterior"
        motivo={pagina.pagina === 0 ? textos.yaEsLaPrimeraPagina : undefined}
        onClick={() => {
          sitio.fijar({ [paginacion.enLaRuta]: String(pagina.pagina - 1) });
        }}
      >
        {textos.paginaAnterior}
      </BotonConMotivo>
      <span data-slot="indicador-de-pagina" className="flex-1 text-center text-[12px] tabular-nums text-tinta-3">
        {pagina.paginas === undefined ? textos.pagina(leida) : textos.paginaDe(leida, pagina.paginas)}
      </span>
      <BotonConMotivo
        type="button"
        tamano="menudo"
        data-mando="siguiente"
        motivo={pagina.hayMas ? undefined : textos.noHayMasPaginas}
        onClick={() => {
          sitio.fijar({ [paginacion.enLaRuta]: String(pagina.pagina + 1) });
        }}
      >
        {textos.paginaSiguiente}
      </BotonConMotivo>
      {sitioDelTamano === undefined || tamanos.length === 0 ? null : (
        <>
          <label htmlFor={idDelTamano} className="sr-only">
            {textos.filasPorPagina}
          </label>
          <Desplegable
            id={idDelTamano}
            value={String(pagina.tamano)}
            onValueChange={(elegido) => {
              // Otro tamano es otra reparticion: la pagina 7 de 20 no es la 7 de 100.
              sitio.fijar({ [sitioDelTamano]: elegido, [paginacion.enLaRuta]: '0' });
            }}
            className="w-auto min-w-[84px]"
          >
            {tamanos.map((tamano) => (
              <Opcion key={tamano} value={String(tamano)}>
                {String(tamano)}
              </Opcion>
            ))}
          </Desplegable>
        </>
      )}
    </div>
  );
}
