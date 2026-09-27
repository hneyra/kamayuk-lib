import { useId, useState } from 'react';

import { Tabla, TablaCuerpo, TablaNota } from '../shadcn/tabla.tsx';
import type { TextosDeLaPantalla } from '../textos.tsx';
import { BarraDeLaTabla } from './BarraDeLaTabla.tsx';
import { type Nombrados, resolverTexto } from './componer.ts';
import type { Ausencia, FilaDeLaTabla } from './datos.ts';
import { useEleccionDeLaFila } from './eleccion-de-la-fila.ts';
import { CabeceraDelBloque, claveDeLaFila, FilaDelBloque } from './FilaDelBloque.tsx';
import { FiltroDeLaTabla } from './FiltroDeLaTabla.tsx';
import { type HojaDelMarco, useSitioDeLaHoja } from './hoja.ts';
import type { InteraccionDeLaPantalla } from './interaccion.ts';
import { campoOrdenado, MandoDePaginas } from './MandosDeLaTabla.tsx';
import { type FiltroElegido, lasFilasQueSeVen, queDiceSinFilas, SIN_FILTRO } from './reglas-de-las-tablas.ts';
import { SinFilasDeLaTabla } from './SinFilasDeLaTabla.tsx';
import type { DefinicionDeTabla, TonoDeInsignia, Texto } from './tipos.ts';

/**
 * La tabla de un bloque: su barra, la rejilla y la nota de debajo (#27).
 *
 * <h2>El ancho minimo sale de las columnas, y no de un numero escrito</h2>
 *
 * 130 px por columna, que es lo que hace el artboard. Un `min-width` fijo obligaria a tocarlo cada
 * vez que una tabla gane o pierda una columna, y la que se quedara corta partiria sus cifras.
 *
 * <h2>La nota va FUERA de la tabla, a proposito</h2>
 *
 * Dentro seria una fila mas, y un lector de pantalla la contaria como dato. Lo mismo las frases de
 * «sin filas»: cual se dice lo contesta `queDiceSinFilas`, y la dibuja `SinFilasDeLaTabla`. En
 * ninguna se escribe un conteo que no haya dado el sistema: «0 registros» sobre una lista vacia
 * repite con un numero lo que la frase ya dice, y sobre una que nadie ha pedido es afirmar que esta
 * vacia sin saberlo.
 *
 * <h2>Lo que las filas traen desde #65, y lo que trae #61</h2>
 *
 * Una fila es `{ celdas, datos? }`: las celdas se leen, y los datos los leen las reglas —el tono de
 * la insignia de una columna, el detalle de la fila, las acciones que ofrece—. Las de #27
 * (`string[]`) llegan ya envueltas en `{ celdas }`. De #61, la pagina (`paginacion`), el orden
 * (`orden`, con `aria-sort` en la columna cuyo `campo` es ese), la celda `{ texto, nota }`, el vacio
 * con su salida y `filasDeContenido`, las filas que SON el texto de la pantalla.
 *
 * **La pagina, el orden y la fila elegida (#95) viven en la ruta**, no aqui: los lee y los escribe
 * `useSitioDeLaHoja`, como la pestana y el maestro de #67. Sin `hoja` —la pantalla montada fuera del
 * marco— la tabla los guarda en su estado, y entonces no sobreviven a recargar, que es lo unico que
 * no puede dar. **El filtro local de #86 es lo contrario: NUNCA sale de aqui** (`FiltroDeLaTabla`).
 *
 * <h2>En piezas desde #120</h2>
 *
 * Hasta #120 esto era una sola funcion de 469 lineas con diez trabajos. Lo que queda aqui es leer:
 * que filas hay, cuales deja el filtro, que pagina se ve y que conteo se dice. La barra es
 * `BarraDeLaTabla`; las filas y sus celdas, `FilaDelBloque`; la eleccion y su teclado,
 * `useEleccionDeLaFila`; el filtro, `FiltroDeLaTabla`; lo que se dice sin filas, `SinFilasDeLaTabla`.
 */

export interface TablaDelBloqueProps {
  readonly tabla: DefinicionDeTabla<Texto>;
  /** Las filas que se sepan. Ausente: no hay dato, y se dice. `[]`: no hay filas, y se dice por que. */
  readonly filas?: readonly FilaDeLaTabla[];
  /** El conteo del encabezado, si quien pide los datos lo sabe. */
  readonly conteo?: string;
  readonly ausencia: Ausencia;
  readonly traducir: (texto: string) => string;
  readonly textos: TextosDeLaPantalla;
  readonly tonoDeLaInsignia: (texto: string) => TonoDeInsignia;
  /** Los datos con nombre de la pantalla, para el `vacio` que lleve uno (#65) y la paginacion (#61). */
  readonly nombrados?: Nombrados;
  /** Quien atiende las acciones de las filas: la misma interaccion que las del bloque (#66). */
  readonly interaccion: InteraccionDeLaPantalla;
  /** La ruta de la hoja, donde viven la pagina y el orden (#61). Sin ella, los guarda la tabla. */
  readonly hoja?: HojaDelMarco;
}

export function TablaDelBloque({
  tabla,
  filas,
  conteo,
  ausencia,
  traducir,
  textos,
  tonoDeLaInsignia,
  nombrados,
  interaccion,
  hoja,
}: TablaDelBloqueProps) {
  const raiz = useId();
  const idDelTitulo = `${raiz}-titulo`;
  const texto = (t: Texto) => resolverTexto(t, nombrados, traducir, textos.datoAusente);
  // La pagina, el orden y la fila elegida: en la ruta, o aqui sin `hoja`.
  const sitio = useSitioDeLaHoja(hoja);
  // El filtro local vive SIEMPRE aqui, con hoja o sin ella: no viaja (#86).
  const [elegido, fijarElegido] = useState<FiltroElegido>(SIN_FILTRO);

  // Las filas que VIAJAN en la definicion ganan a los datos y a la ausencia: son el texto de la
  // pantalla, y no hay ninguna operacion que las conteste (#61, `filas-de-contenido-que-viajan`).
  const deContenido = tabla.filasDeContenido;
  const todas: readonly FilaDeLaTabla[] | undefined =
    deContenido === undefined ? filas : deContenido.map((celdas) => ({ celdas: celdas.map(texto) }));

  // Se filtran las que llegaron y despues se corta la pagina (solo en cliente): `lasFilasQueSeVen`.
  const { hayFiltro, filtrando, filtradas, pagina, dibujadas, conteoFiltrado } = lasFilasQueSeVen(
    tabla,
    todas,
    elegido,
    sitio.leer,
    nombrados,
  );
  // El conteo se cuenta solo cuando HAY filas, y se cuentan TODAS y no la pagina: una tabla de
  // 54 129 filas no tiene 100. El que da el sistema, se escribe. Con el filtro puesto, el suyo.
  const rotuloDelConteo =
    todas === undefined || filtrando ? null : (conteo ?? (todas.length === 0 ? null : textos.registros(todas.length)));
  const paginacion = tabla.paginacion;
  /** Cambiar lo elegido: en la paginacion de cliente vuelve a la primera pagina, que puede no existir ya. */
  const elegir = (cambio: (antes: FiltroElegido) => FiltroElegido) => {
    fijarElegido(cambio);
    if (paginacion?.en === 'cliente' && (pagina?.pagina ?? 0) !== 0) sitio.fijar({ [paginacion.enLaRuta]: null });
  };
  const dice = queDiceSinFilas(tabla, todas?.length, filtradas?.length);
  const columnasDibujadas = tabla.columnas.length + (tabla.accionesPorFila === undefined ? 0 : 1);
  const ordenado = tabla.orden === undefined ? undefined : campoOrdenado(tabla.orden, sitio.leer(tabla.orden.enLaRuta));
  const descendente = tabla.orden !== undefined && sitio.leer(tabla.orden.sentidoEnLaRuta) === tabla.orden.descendente;
  const eleccion = useEleccionDeLaFila(tabla.eleccion, dibujadas, sitio);

  return (
    <div className={tabla.cabeceraFija === true ? 'flex min-h-0 flex-1 flex-col' : undefined}>
      <BarraDeLaTabla
        tabla={tabla}
        idDelTitulo={idDelTitulo}
        conteo={rotuloDelConteo}
        hayFiltro={hayFiltro}
        conteoFiltrado={conteoFiltrado}
        sitio={sitio}
        nombrados={nombrados}
        traducir={traducir}
        textos={textos}
      />

      {!hayFiltro || tabla.filtroLocal === undefined ? null : (
        <FiltroDeLaTabla
          filtro={tabla.filtroLocal}
          elegido={elegido}
          elegir={elegir}
          nombreDeLaTabla={traducir(tabla.titulo)}
          texto={texto}
          textos={textos}
        />
      )}

      <Tabla
        style={{ minWidth: `${String(columnasDibujadas * 130)}px` }}
        // Con filas elegibles, un `grid`: `aria-selected` en una fila solo se anuncia ahi (#95).
        role={eleccion.elige ? 'grid' : undefined}
        aria-labelledby={eleccion.elige ? idDelTitulo : undefined}
        marco={
          tabla.cabeceraFija === true
            ? {
                // El marco se desplaza el mismo, en las dos direcciones, y la cabecera se le pega. Es
                // una region con nombre y ENTRA en el tabulador: sin foco, quien no usa raton no
                // tiene con que desplazarla.
                className: 'overflow-auto min-h-0 flex-1',
                role: 'region',
                tabIndex: 0,
                'aria-labelledby': idDelTitulo,
                'data-cabecera-fija': '',
              }
            : undefined
        }
      >
        <CabeceraDelBloque tabla={tabla} traducir={traducir} ordenado={ordenado} descendente={descendente} />
        <TablaCuerpo>
          {(dibujadas ?? []).map((fila, i) => (
            <FilaDelBloque
              key={claveDeLaFila(fila)}
              tabla={tabla}
              fila={fila}
              indice={i}
              raiz={raiz}
              columnasDibujadas={columnasDibujadas}
              eleccion={eleccion}
              traducir={traducir}
              textos={textos}
              texto={texto}
              tonoDeLaInsignia={tonoDeLaInsignia}
              nombrados={nombrados}
              interaccion={interaccion}
            />
          ))}
        </TablaCuerpo>
      </Tabla>

      {dice === null ? null : (
        <SinFilasDeLaTabla
          dice={dice}
          tabla={tabla}
          ausencia={ausencia}
          traducir={traducir}
          texto={texto}
          textos={textos}
          nombrados={nombrados}
          interaccion={interaccion}
        />
      )}

      {/* Los mandos de la pagina van DEBAJO de la tabla, como en la V6. Sin filas no se dibujan:
          paginar lo que no llego no lleva a ninguna parte, y el vacio ya dice que hacer. */}
      {paginacion === undefined || pagina === undefined || todas === undefined || todas.length === 0 ? null : (
        <MandoDePaginas
          paginacion={paginacion}
          pagina={pagina}
          sitio={sitio}
          textos={textos}
          nombreDeLaTabla={traducir(tabla.titulo)}
        />
      )}

      {tabla.nota === undefined ? null : <TablaNota>{traducir(tabla.nota)}</TablaNota>}
    </div>
  );
}
