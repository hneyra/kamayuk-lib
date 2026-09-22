import { Fragment, useId, useState } from 'react';

import { Insignia } from '../Insignia.tsx';
import { Alerta } from '../shadcn/alerta.tsx';
import { CAPA_CABECERA_FIJA } from '../shadcn/capas.ts';
import { Boton } from '../shadcn/boton.tsx';
import { Campo } from '../shadcn/campo.tsx';
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
import type { Ausencia, CeldaDeLaTabla, FilaDeLaTabla } from './datos.ts';
import { GrupoDeAcciones } from './GrupoDeAcciones.tsx';
import { cambiosEn, valorEnLaRuta, type EnLaRuta, type HojaDelMarco } from './hoja.ts';
import type { InteraccionDeLaPantalla } from './interaccion.ts';
import { campoOrdenado, MandoDeOrden, MandoDePaginas, type SitioDeLaTabla } from './MandosDeLaTabla.tsx';
import {
  conteoDelFiltro,
  type FiltroElegido,
  filtrarLasFilas,
  filtroPuesto,
  notaDeLaCelda,
  paginaDeLaTabla,
  resolverInsignia,
  SIN_FILTRO,
  textoDeLaCelda,
} from './reglas-de-las-tablas.ts';
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
 *
 * <h2>Y las cinco cosas que trae #61</h2>
 *
 * <table>
 *   <tr><td>`paginacion`</td><td>que pagina se ve, servida o cortada aqui. Sin ella, todas las filas
 *     que lleguen, como hasta #65</td></tr>
 *   <tr><td>`orden`</td><td>por que campo, de la lista blanca que el servidor admite, con `aria-sort`
 *     en la columna cuyo `campo` es ese</td></tr>
 *   <tr><td>celda `{ texto, nota }`</td><td>`null` se dice con palabra, y nunca con `''` ni con un
 *     `0` (`celda-nula-con-palabra-y-nota`)</td></tr>
 *   <tr><td>`vacioConSalida`</td><td>el vacio lleva su boton dentro (`vacio-con-su-salida`)</td></tr>
 *   <tr><td>`filasDeContenido`</td><td>las filas que SON el texto de la pantalla y viajan en la
 *     definicion (`filas-de-contenido-que-viajan`)</td></tr>
 * </table>
 *
 * **La pagina y el orden viven en la ruta**, no aqui: con `hoja` se escriben ahi y de ahi se
 * restituyen, como la pestana de #67. Sin `hoja` —la pantalla montada fuera del marco— la tabla los
 * guarda en su estado, y entonces no sobreviven a recargar, que es lo unico que no puede dar.
 *
 * <h2>Y el filtro local de #86, que es lo contrario: NUNCA sale de aqui</h2>
 *
 * `filtroLocal` (`filtro-en-el-cliente-con-conteo`) acota las filas que llegaron —antes de cortar la
 * pagina en cliente; la pagina misma en servidor— con lo elegido en el estado de la tabla, y ni lo
 * escribe en la ruta ni lo pide: ver `FiltroLocalDeLaTabla`. Solo se ofrece cuando HAY filas —sin
 * dato o con `[]` no hay nada que acotar—; puesto, el conteo dice «N de M» en una region viva, y si
 * no deja ninguna se dice con su propia frase, que no es el `vacio` de la tabla.
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
  const nombreDeLaTabla = tabla.clave ?? tabla.titulo;
  const acciones = tabla.accionesPorFila;
  const texto = (t: Texto) => resolverTexto(t, nombrados, traducir, textos.datoAusente);
  // Sin `hoja`, la pagina y el orden viven aqui. No sobreviven a recargar, y es lo unico que no dan.
  const [sinMarco, fijarSinMarco] = useState<Readonly<Record<string, string>>>({});
  // El filtro local vive SIEMPRE aqui, con hoja o sin ella: no viaja (#86).
  const [elegido, fijarElegido] = useState<FiltroElegido>(SIN_FILTRO);
  const sitio: SitioDeLaTabla = {
    leer: (donde: EnLaRuta) => (hoja === undefined ? (sinMarco[donde] ?? null) : valorEnLaRuta(hoja.ruta, donde)),
    fijar: (cambios) => {
      if (hoja === undefined) {
        fijarSinMarco((antes) => {
          const despues = { ...antes };
          for (const [donde, valor] of Object.entries(cambios)) {
            if (valor === null) delete despues[donde];
            else despues[donde] = valor;
          }
          return despues;
        });
        return;
      }
      // Un solo movimiento, aunque cambien dos sitios a la vez: ver `cambiosEn`.
      hoja.moverLaRuta(cambiosEn(cambios));
    },
  };

  // Las filas que VIAJAN en la definicion ganan a los datos y a la ausencia: son el texto de la
  // pantalla, y no hay ninguna operacion que las conteste (#61, `filas-de-contenido-que-viajan`).
  const deContenido = tabla.filasDeContenido;
  const todas: readonly FilaDeLaTabla[] | undefined =
    deContenido === undefined ? filas : deContenido.map((celdas) => ({ celdas: celdas.map(texto) }));

  // Se ofrece solo con filas delante; puesto, acota las que llegaron ANTES de cortar la pagina.
  const filtro = tabla.filtroLocal;
  const hayFiltro = filtro !== undefined && todas !== undefined && todas.length > 0;
  const filtrando = hayFiltro && filtroPuesto(elegido);
  const filtradas = todas === undefined || !filtrando ? todas : filtrarLasFilas(filtro, todas, elegido);

  const paginacion = tabla.paginacion;
  const pagina =
    paginacion === undefined
      ? undefined
      : paginaDeLaTabla(
          paginacion,
          {
            pagina: sitio.leer(paginacion.enLaRuta),
            tamano: paginacion.tamanoEnLaRuta === undefined ? null : sitio.leer(paginacion.tamanoEnLaRuta),
          },
          {
            hayMas: paginacion.hayMas === undefined ? undefined : nombrados?.get(paginacion.hayMas),
            paginas: paginacion.paginas === undefined ? undefined : nombrados?.get(paginacion.paginas),
          },
          filtradas?.length ?? 0,
        );
  // Solo en cliente se corta: en servidor, las filas que llegaron YA son la pagina.
  const dibujadas =
    filtradas === undefined || pagina?.recorte === undefined
      ? filtradas
      : filtradas.slice(pagina.recorte.desde, pagina.recorte.hasta);

  // El conteo se cuenta solo cuando HAY filas: ver el docblock. El que da el sistema, se escribe. Y
  // se cuentan TODAS y no la pagina: una tabla de 54 129 filas no tiene 100.
  const rotuloDelConteo =
    todas === undefined || filtrando ? null : (conteo ?? (todas.length === 0 ? null : textos.registros(todas.length)));
  // Con el filtro puesto, lo que dice la barra es la diferencia: las que deja de las que llegaron, y
  // el total solo si el sistema lo dio (#86).
  const conteoFiltrado =
    !filtrando || filtradas === undefined || todas === undefined || filtro === undefined
      ? undefined
      : conteoDelFiltro(
          filtradas.length,
          todas.length,
          filtro.total === undefined ? undefined : nombrados?.get(filtro.total),
        );
  /** Cambiar lo elegido: en la paginacion de cliente vuelve a la primera pagina, que puede no existir ya. */
  const elegir = (cambio: (antes: FiltroElegido) => FiltroElegido) => {
    fijarElegido(cambio);
    if (paginacion?.en === 'cliente' && (pagina?.pagina ?? 0) !== 0) sitio.fijar({ [paginacion.enLaRuta]: null });
  };
  // `vacioConSalida` gana a `vacio` si la definicion trae los dos. Son dos campos y no una union
  // porque la union rompe la compilacion de `caja`: ver el docblock de `DefinicionDeTabla`.
  const conSalida = tabla.vacioConSalida !== undefined && tabla.vacioConSalida.titulo !== '' ? tabla.vacioConSalida : undefined;
  const vacio = tabla.vacio === undefined || tabla.vacio === '' ? undefined : tabla.vacio;
  const hayVacio = conSalida !== undefined || vacio !== undefined;
  const columnasDibujadas = tabla.columnas.length + (acciones === undefined ? 0 : 1);
  const ordenado = tabla.orden === undefined ? undefined : campoOrdenado(tabla.orden, sitio.leer(tabla.orden.enLaRuta));
  const descendente = tabla.orden !== undefined && sitio.leer(tabla.orden.sentidoEnLaRuta) === tabla.orden.descendente;

  return (
    <div className={tabla.cabeceraFija === true ? 'flex min-h-0 flex-1 flex-col' : undefined}>
      <TarjetaBarraDeTabla>
        <p id={idDelTitulo} className="m-0 flex-1 min-w-[140px] text-[13px] font-bold">
          {traducir(tabla.titulo)}
        </p>
        {rotuloDelConteo === null ? null : (
          <span className="text-[11.5px] text-tinta-3">{rotuloDelConteo}</span>
        )}
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
            paginacion={paginacion}
            sitio={sitio}
            nombrados={nombrados}
            traducir={traducir}
            textos={textos}
          />
        )}
        {tabla.accion === undefined ? null : (
          <Boton type="button" tamano="menudo">
            {traducir(tabla.accion)}
          </Boton>
        )}
      </TarjetaBarraDeTabla>

      {!hayFiltro ? null : (
        <FiltroDeLaTabla
          filtro={filtro}
          elegido={elegido}
          elegir={elegir}
          nombreDeLaTabla={traducir(tabla.titulo)}
          texto={texto}
          textos={textos}
        />
      )}

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
                // La columna que se esta ordenando lo ANUNCIA, y se sabe cual por su `campo`: el
                // mismo valor que viaja en la ruta. Una columna sin `campo` nunca lo lleva.
                aria-sort={
                  c.campo !== undefined && c.campo === ordenado ? (descendente ? 'descending' : 'ascending') : undefined
                }
                className={tabla.cabeceraFija === true ? `sticky top-0 ${CAPA_CABECERA_FIJA}` : undefined}
              >
                {traducir(c.rotulo)}
                {c.campo === undefined ? null : (
                  // El nombre del campo y su dominio NO se traducen: son codigo, como las
                  // operaciones del pie de #44.
                  <span
                    data-slot="campo-de-la-columna"
                    className="block font-normal normal-case tracking-normal text-tinta-3"
                  >
                    <code>{c.campo}</code>
                    {c.dominio === undefined ? null : (
                      <span data-slot="dominio-de-la-columna" className="block">
                        {c.dominio}
                      </span>
                    )}
                  </span>
                )}
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
          {(dibujadas ?? []).map((fila, i) => {
            const detalle = detalleDe(tabla, fila, traducir, textos);
            const idDelDetalle = detalle === '' ? undefined : `${raiz}-detalle-${String(i)}`;
            const bordes = idDelDetalle === undefined ? undefined : 'border-b-0';
            return (
              // La clave es la que da la fila o, sin ella, la fila entera, y no el indice: dos filas
              // no suelen ser iguales —llevan su identificador— y con el indice, reordenar deja a
              // React reusando la fila equivocada.
              <Fragment key={fila.clave ?? claveDeLasCeldas(fila.celdas)}>
                <TablaFila
                  impar={i % 2 === 1}
                  data-realzada={fila.realzada === true ? '' : undefined}
                  aria-current={fila.realzada === true ? 'true' : undefined}
                  className={fila.realzada === true ? 'bg-azul-suave' : undefined}
                >
                  {fila.celdas.map((celda, j) => {
                    const columna = tabla.columnas[j];
                    const clave = columna?.rotulo ?? j;
                    const leido = textoDeLaCelda(celda);
                    const nota = notaDeLaCelda(celda);
                    // Con regla, el tono lo dice la regla y `tonoDeLaInsignia` NO se llama (AC-2).
                    if (columna?.insignia !== undefined) {
                      const insignia = resolverInsignia(columna.insignia, leido ?? undefined, fila.datos, traducir);
                      return (
                        <TablaCelda key={clave} className={bordes} title={nota}>
                          {insignia !== undefined ? (
                            <Insignia tono={insignia.tono}>{insignia.texto}</Insignia>
                          ) : leido === null ? (
                            <SinDato tabla={tabla} texto={texto} textos={textos} nota={nota} />
                          ) : (
                            leido
                          )}
                        </TablaCelda>
                      );
                    }
                    if (leido === null) {
                      // Nunca una celda en blanco, y nunca un cero: un cero es una afirmacion (#61).
                      return (
                        <TablaCelda key={clave} cifra={columna?.alineadoDerecha === true} className={bordes}>
                          <SinDato tabla={tabla} texto={texto} textos={textos} nota={nota} />
                        </TablaCelda>
                      );
                    }
                    return j === tabla.columnaDeInsignia ? (
                      <TablaCelda key={clave} className={bordes} title={nota}>
                        <Insignia tono={tonoDeLaInsignia(leido)}>{leido}</Insignia>
                      </TablaCelda>
                    ) : (
                      <TablaCelda
                        key={clave}
                        cifra={columna?.alineadoDerecha === true}
                        identifica={j === 0}
                        className={bordes}
                        title={nota}
                      >
                        {leido}
                      </TablaCelda>
                    );
                  })}
                  {acciones === undefined ? null : (
                    <TablaCelda className={bordes}>
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

      {todas === undefined ? (
        <p
          data-sin-dato=""
          className="m-0 px-[15px] py-[10px] bg-sup text-[12px] leading-[1.5] text-tinta-3 italic text-pretty"
        >
          {traducir(ausencia.enElCampo)}
        </p>
      ) : null}

      {todas !== undefined && todas.length === 0 && conSalida !== undefined ? (
        // El vacio con su salida DENTRO (#61): la frase sola deja a quien la lee sin saber a donde
        // ir, y buscar en el arbol cual de las hojas crea el primero es adivinar.
        <div data-vacio="" className="flex flex-col items-center gap-[10px] px-[15px] py-[18px] text-center">
          <p className="m-0 text-[13px] font-bold text-tinta">{texto(conSalida.titulo)}</p>
          {conSalida.texto === undefined || conSalida.texto === '' ? null : (
            <p className="m-0 text-[12.5px] leading-[1.5] text-tinta-3 text-pretty">{texto(conSalida.texto)}</p>
          )}
          {conSalida.acciones === undefined || conSalida.acciones.length === 0 ? null : (
            <GrupoDeAcciones
              acciones={conSalida.acciones}
              nombrados={nombrados}
              traducir={traducir}
              textos={textos}
              interaccion={interaccion}
            />
          )}
        </div>
      ) : null}

      {todas !== undefined && todas.length === 0 && conSalida === undefined && vacio !== undefined ? (
        <p
          data-vacio=""
          className="m-0 px-[15px] py-[18px] text-center text-[13px] leading-[1.5] text-tinta-3 text-pretty"
        >
          {texto(vacio)}
        </p>
      ) : null}

      {todas !== undefined && todas.length > 0 && filtradas?.length === 0 && filtro !== undefined ? (
        // La lista llego CON filas y es el filtro el que no deja ninguna: esto no es el `vacio` de la
        // tabla —que dice que la lectura contesto una lista vacia— y la salida esta a la vista.
        <p
          data-sin-coincidencias=""
          className="m-0 px-[15px] py-[18px] text-center text-[13px] leading-[1.5] text-tinta-3 text-pretty"
        >
          {filtro.sinCoincidencias === undefined || filtro.sinCoincidencias === ''
            ? textos.ningunaPasaElFiltro
            : texto(filtro.sinCoincidencias)}
        </p>
      ) : null}

      {todas !== undefined && todas.length === 0 && !hayVacio ? (
        // Nunca una tabla muda (AC-3): una lista vacia sin motivo es un defecto de la definicion, y
        // se ve en la pantalla, como la pieza del consumidor sin registrar de #44.
        <div className="px-[15px] py-[10px]">
          <Alerta tono="atencion" data-tabla-sin-motivo={nombreDeLaTabla}>
            {textos.tablaSinMotivo}
          </Alerta>
        </div>
      ) : null}

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

/**
 * **El buscador y los chips del filtro local** (#86, `filtro-en-el-cliente-con-conteo`).
 *
 * Un grupo con nombre —el de la tabla dentro, como sus mandos de pagina—, un campo de busqueda con su
 * nombre accesible y un boton por chip que se queda pulsado con `aria-pressed`. Nada de esto escribe
 * en la ruta: lo elegido sube a `elegir`, que es el estado de la tabla.
 */
function FiltroDeLaTabla({
  filtro,
  elegido,
  elegir,
  nombreDeLaTabla,
  texto,
  textos,
}: {
  readonly filtro: NonNullable<DefinicionDeTabla<Texto>['filtroLocal']>;
  readonly elegido: FiltroElegido;
  readonly elegir: (cambio: (antes: FiltroElegido) => FiltroElegido) => void;
  readonly nombreDeLaTabla: string;
  readonly texto: (t: Texto) => string;
  readonly textos: TextosDeLaPantalla;
}) {
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

/**
 * Lo que ocupa una celda sin dato: la palabra de la tabla, o la del saco, y **nunca un blanco**
 * (#61, `celda-nula-con-palabra-y-nota`).
 *
 * El motivo se anuncia con `title` —el de la celda si lo trae, y el de la tabla si no—, porque una
 * raya sola no distingue «ninguna operacion publica este dato» de «esto esta roto».
 */
function SinDato({
  tabla,
  texto,
  textos,
  nota,
}: {
  readonly tabla: DefinicionDeTabla<Texto>;
  readonly texto: (t: Texto) => string;
  readonly textos: TextosDeLaPantalla;
  readonly nota: string | undefined;
}) {
  const deLaTabla = tabla.sinDato;
  const palabra = deLaTabla === undefined ? textos.celdaSinDato : texto(deLaTabla.texto);
  const porQue = nota ?? (deLaTabla?.nota === undefined ? textos.porQueLaCeldaNoTieneDato : texto(deLaTabla.nota));
  return (
    <span data-celda-sin-dato="" className="text-tinta-3" title={porQue}>
      {palabra}
    </span>
  );
}

/** La clave de React de una fila sin `clave`: lo que se lee en sus celdas, unido. */
function claveDeLasCeldas(celdas: readonly CeldaDeLaTabla[]): string {
  return celdas.map((celda) => textoDeLaCelda(celda) ?? '').join('|');
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
