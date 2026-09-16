import { Fragment, useId } from 'react';

import { Insignia } from '../Insignia.tsx';
import { Alerta } from '../shadcn/alerta.tsx';
import { CAPA_CABECERA_FIJA } from '../shadcn/capas.ts';
import { Boton } from '../shadcn/boton.tsx';
import {
  Tabla,
  TablaCabecera,
  TablaCelda,
  TablaCuerpo,
  TablaFila,
  TablaNota,
  TablaRotulo,
} from '../shadcn/tabla.tsx';
import { TarjetaBarraDeTabla } from '../shadcn/tarjeta.tsx';
import type { TextosDeLaPantalla } from '../textos.tsx';
import { AccionesDeLaFila } from './AccionesDeLaFila.tsx';
import { type Nombrados, resolverTexto, seCumple } from './componer.ts';
import type { Ausencia, FilaDeLaTabla } from './datos.ts';
import type { InteraccionDeLaPantalla } from './interaccion.ts';
import { resolverInsignia } from './reglas-de-las-tablas.ts';
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
 * Dentro seria una fila mas, y un lector de pantalla la contaria como dato.
 *
 * <h2>Sin dato, sin filas y con filas son TRES cosas (#65, `tabla-con-vacio`)</h2>
 *
 * <table>
 *   <tr><td>sin dato (`filas` ausente)</td><td>la ausencia de #27: no se pudo pedir, y se dice por
 *     que</td></tr>
 *   <tr><td>`[]`</td><td>la lectura CONTESTO una lista vacia, y eso es una respuesta: se dice con
 *     el `vacio` de la definicion. Sin el, un aviso del saco —nunca una tabla muda—</td></tr>
 *   <tr><td>con filas</td><td>las filas, y su conteo</td></tr>
 * </table>
 *
 * En ninguno de los dos primeros se escribe un conteo que no haya dado el sistema: «0 registros»
 * sobre una lista vacia repite con un numero lo que la frase ya dice, y sobre una que nadie ha
 * pedido es afirmar que esta vacia sin saberlo. Las dos frases van **fuera** de la `<table>`, por
 * lo mismo que la nota.
 *
 * <h2>Lo que las filas traen desde #65</h2>
 *
 * Una fila es `{ celdas, datos? }`: las celdas se leen, y los datos los leen las reglas —el tono
 * de la insignia de una columna, el detalle de la fila, las acciones que ofrece—. Las filas de #27
 * (`string[]`) llegan aqui ya envueltas en `{ celdas }` y se dibujan igual que antes.
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
  /** Los datos con nombre de la pantalla, para el `vacio` que lleve uno (#65). */
  readonly nombrados?: Nombrados;
  /** Quien atiende las acciones de las filas: la misma interaccion que las del bloque (#66). */
  readonly interaccion: InteraccionDeLaPantalla;
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
}: TablaDelBloqueProps) {
  const raiz = useId();
  const idDelTitulo = `${raiz}-titulo`;
  const nombreDeLaTabla = tabla.clave ?? tabla.titulo;
  const acciones = tabla.accionesPorFila;

  // El conteo se cuenta solo cuando HAY filas: ver el docblock. El que da el sistema, se escribe.
  const rotuloDelConteo =
    filas === undefined ? null : (conteo ?? (filas.length === 0 ? null : textos.registros(filas.length)));
  const vacio = tabla.vacio === undefined || tabla.vacio === '' ? '' : resolverTexto(tabla.vacio, nombrados, traducir, textos.datoAusente);
  const columnasDibujadas = tabla.columnas.length + (acciones === undefined ? 0 : 1);

  return (
    <div className={tabla.cabeceraFija === true ? 'flex min-h-0 flex-1 flex-col' : undefined}>
      <TarjetaBarraDeTabla>
        <p id={idDelTitulo} className="m-0 flex-1 min-w-[140px] text-[13px] font-bold">
          {traducir(tabla.titulo)}
        </p>
        {rotuloDelConteo === null ? null : (
          <span className="text-[11.5px] text-tinta-3">{rotuloDelConteo}</span>
        )}
        {tabla.accion === undefined ? null : (
          <Boton type="button" tamano="menudo">
            {traducir(tabla.accion)}
          </Boton>
        )}
      </TarjetaBarraDeTabla>

      <Tabla
        style={{ minWidth: `${String(columnasDibujadas * 130)}px` }}
        marco={
          tabla.cabeceraFija === true
            ? {
                // El marco se desplaza el mismo, en las dos direcciones, y la cabecera se le pega.
                // Es una region con nombre y ENTRA en el tabulador: sin foco, quien no usa raton no
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
        <TablaCabecera>
          <TablaFila>
            {tabla.columnas.map((c) => (
              <TablaRotulo
                key={c.rotulo}
                cifra={c.alineadoDerecha}
                className={tabla.cabeceraFija === true ? `sticky top-0 ${CAPA_CABECERA_FIJA}` : undefined}
              >
                {traducir(c.rotulo)}
              </TablaRotulo>
            ))}
            {acciones === undefined ? null : (
              <TablaRotulo className={tabla.cabeceraFija === true ? `sticky top-0 ${CAPA_CABECERA_FIJA}` : undefined}>
                {traducir(acciones.columna)}
              </TablaRotulo>
            )}
          </TablaFila>
        </TablaCabecera>
        <TablaCuerpo>
          {(filas ?? []).map((fila, i) => {
            const detalle = detalleDe(tabla, fila, traducir, textos);
            const idDelDetalle = detalle === '' ? undefined : `${raiz}-detalle-${String(i)}`;
            return (
              // La clave es la que da la fila o, sin ella, la fila entera, y no el indice: dos filas
              // no suelen ser iguales —llevan su identificador— y con el indice, reordenar deja a
              // React reusando la fila equivocada.
              <Fragment key={fila.clave ?? fila.celdas.join('|')}>
                <TablaFila
                  impar={i % 2 === 1}
                  data-realzada={fila.realzada === true ? '' : undefined}
                  aria-current={fila.realzada === true ? 'true' : undefined}
                  className={fila.realzada === true ? 'bg-azul-suave' : undefined}
                >
                  {fila.celdas.map((celda, j) => {
                    const columna = tabla.columnas[j];
                    const clave = columna?.rotulo ?? j;
                    // Con regla, el tono lo dice la regla y `tonoDeLaInsignia` NO se llama (AC-2).
                    if (columna?.insignia !== undefined) {
                      const insignia = resolverInsignia(columna.insignia, celda, fila.datos, traducir);
                      return (
                        <TablaCelda key={clave} className={idDelDetalle === undefined ? undefined : 'border-b-0'}>
                          {insignia === undefined ? celda : <Insignia tono={insignia.tono}>{insignia.texto}</Insignia>}
                        </TablaCelda>
                      );
                    }
                    return j === tabla.columnaDeInsignia ? (
                      <TablaCelda key={clave} className={idDelDetalle === undefined ? undefined : 'border-b-0'}>
                        <Insignia tono={tonoDeLaInsignia(celda)}>{celda}</Insignia>
                      </TablaCelda>
                    ) : (
                      <TablaCelda
                        key={clave}
                        cifra={columna?.alineadoDerecha === true}
                        identifica={j === 0}
                        className={idDelDetalle === undefined ? undefined : 'border-b-0'}
                      >
                        {celda}
                      </TablaCelda>
                    );
                  })}
                  {acciones === undefined ? null : (
                    <TablaCelda className={idDelDetalle === undefined ? undefined : 'border-b-0'}>
                      <AccionesDeLaFila
                        definicion={acciones}
                        fila={fila}
                        nombrados={nombrados}
                        traducir={traducir}
                        textos={textos}
                        interaccion={interaccion}
                        idDelDetalle={idDelDetalle}
                      />
                    </TablaCelda>
                  )}
                </TablaFila>
                {idDelDetalle === undefined ? null : (
                  // A todo el ancho y en la banda de SU fila: es la segunda linea de esa fila, no
                  // una fila mas.
                  <TablaFila impar={i % 2 === 1} data-detalle-de-fila="">
                    <TablaCelda
                      id={idDelDetalle}
                      colSpan={columnasDibujadas}
                      className="pt-0 text-[12.5px] leading-[1.55] text-tinta-3 text-pretty"
                    >
                      {detalle}
                    </TablaCelda>
                  </TablaFila>
                )}
              </Fragment>
            );
          })}
        </TablaCuerpo>
      </Tabla>

      {filas === undefined ? (
        <p
          data-sin-dato=""
          className="m-0 px-[15px] py-[10px] bg-sup text-[12px] leading-[1.5] text-tinta-3 italic text-pretty"
        >
          {traducir(ausencia.enElCampo)}
        </p>
      ) : null}

      {filas !== undefined && filas.length === 0 && vacio !== '' ? (
        <p data-vacio="" className="m-0 px-[15px] py-[18px] text-center text-[13px] leading-[1.5] text-tinta-3 text-pretty">
          {vacio}
        </p>
      ) : null}

      {filas !== undefined && filas.length === 0 && vacio === '' ? (
        // Nunca una tabla muda (AC-3): una lista vacia sin motivo es un defecto de la definicion, y
        // se ve en la pantalla, como la pieza del consumidor sin registrar de #44.
        <div className="px-[15px] py-[10px]">
          <Alerta tono="atencion" data-tabla-sin-motivo={nombreDeLaTabla}>
            {textos.tablaSinMotivo}
          </Alerta>
        </div>
      ) : null}

      {tabla.nota === undefined ? null : <TablaNota>{traducir(tabla.nota)}</TablaNota>}
    </div>
  );
}

/** La segunda linea de una fila, o `''` si la fila no la lleva. Se resuelve con los datos DE LA FILA. */
function detalleDe(
  tabla: DefinicionDeTabla<Texto>,
  fila: FilaDeLaTabla,
  traducir: (texto: string) => string,
  textos: TextosDeLaPantalla,
): string {
  const detalle = tabla.detalleDeFila;
  if (detalle === undefined || !seCumple(detalle.cuando, fila.datos)) return '';
  return resolverTexto(detalle.texto, fila.datos, traducir, textos.datoAusente);
}
