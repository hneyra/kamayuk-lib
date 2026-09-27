import { Insignia } from '../Insignia.tsx';
import { CAPA_CABECERA_FIJA } from '../shadcn/capas.ts';
import { FOCO } from '../shadcn/foco.ts';
import { TablaCabecera, TablaCelda, TablaFila, TablaRotulo } from '../shadcn/tabla.tsx';
import type { TextosDeLaPantalla } from '../textos.tsx';
import { cn } from '../utilidades.ts';
import { AccionesDeLaFila } from './AccionesDeLaFila.tsx';
import { type Nombrados, resolverTexto, seCumple } from './componer.ts';
import type { CeldaDeLaTabla, FilaDeLaTabla } from './datos.ts';
import type { EleccionDeLasFilas } from './eleccion-de-la-fila.ts';
import type { InteraccionDeLaPantalla } from './interaccion.ts';
import { notaDeLaCelda, resolverInsignia, textoDeLaCelda } from './reglas-de-las-tablas.ts';
import type { DefinicionDeTabla, TonoDeInsignia, Texto } from './tipos.ts';

/**
 * **Las filas de la tabla de un bloque: la de la cabecera, y cada una del cuerpo con sus celdas**
 * (#27, #61, #65, #95; aparte desde #120).
 *
 * Salieron de `TablaDelBloque`, que hasta #120 las dibujaba dentro de la misma funcion que leia la
 * ruta, filtraba, paginaba y decidia que decir sin filas. No deciden nada de eso: reciben la fila,
 * la eleccion ya resuelta (`useEleccionDeLaFila`) y lo que hace falta para resolver sus textos.
 *
 * <h2>Una celda, tres formas y UNA palabra para el hueco</h2>
 *
 * Con regla de insignia (#65), la regla dice el tono y `tonoDeLaInsignia` **no se llama**; en la
 * columna de insignia de #27, lo dice `tonoDeLaInsignia`; y si no, el texto. En las tres, una celda
 * sin dato dice la palabra de la tabla o la del saco (#61, `celda-nula-con-palabra-y-nota`), y hasta
 * #120 ese `<SinDato>` estaba escrito dos veces.
 */

/** Lo que las filas de una tabla necesitan de ella para dibujarse. */
interface DeLaTabla {
  readonly tabla: DefinicionDeTabla<Texto>;
  readonly traducir: (texto: string) => string;
  readonly textos: TextosDeLaPantalla;
  /** Un texto de la definicion, resuelto con los datos de la pantalla. */
  readonly texto: (t: Texto) => string;
}

/** La cabecera: un rotulo por columna, con su campo y su dominio, y el de las acciones. */
export function CabeceraDelBloque({
  tabla,
  traducir,
  ordenado,
  descendente,
}: Pick<DeLaTabla, 'tabla' | 'traducir'> & { readonly ordenado: string | undefined; readonly descendente: boolean }) {
  const acciones = tabla.accionesPorFila;
  const fija = tabla.cabeceraFija === true ? `sticky top-0 ${CAPA_CABECERA_FIJA}` : undefined;
  return (
    <TablaCabecera>
      <TablaFila>
        {tabla.columnas.map((c) => (
          <TablaRotulo
            key={c.rotulo}
            cifra={c.alineadoDerecha}
            // La columna que se esta ordenando lo ANUNCIA, y se sabe cual por su `campo`: el
            // mismo valor que viaja en la ruta. Una columna sin `campo` nunca lo lleva.
            aria-sort={c.campo !== undefined && c.campo === ordenado ? (descendente ? 'descending' : 'ascending') : undefined}
            className={fija}
          >
            {traducir(c.rotulo)}
            {c.campo === undefined ? null : (
              // El nombre del campo y su dominio NO se traducen: son codigo, como las
              // operaciones del pie de #44.
              <span data-slot="campo-de-la-columna" className="block font-normal normal-case tracking-normal text-tinta-3">
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
        {acciones === undefined ? null : <TablaRotulo className={fija}>{traducir(acciones.columna)}</TablaRotulo>}
      </TablaFila>
    </TablaCabecera>
  );
}

export interface FilaDelBloqueProps extends DeLaTabla {
  readonly fila: FilaDeLaTabla;
  /** Su sitio entre las dibujadas: da la banda, y el id de su detalle. */
  readonly indice: number;
  /** La raiz de los ids de la tabla (`useId`). */
  readonly raiz: string;
  readonly columnasDibujadas: number;
  readonly eleccion: EleccionDeLasFilas;
  readonly tonoDeLaInsignia: (texto: string) => TonoDeInsignia;
  readonly nombrados: Nombrados | undefined;
  readonly interaccion: InteraccionDeLaPantalla;
}

/**
 * Una fila del cuerpo, y debajo su detalle si lo lleva: a todo el ancho y en la banda de SU fila,
 * porque es la segunda linea de esa fila y no una fila mas.
 */
export function FilaDelBloque({
  tabla,
  fila,
  indice,
  raiz,
  columnasDibujadas,
  eleccion,
  traducir,
  textos,
  texto,
  tonoDeLaInsignia,
  nombrados,
  interaccion,
}: FilaDelBloqueProps) {
  const acciones = tabla.accionesPorFila;
  const detalle = detalleDe(tabla, fila, traducir, textos);
  const idDelDetalle = detalle === '' ? undefined : `${raiz}-detalle-${String(indice)}`;
  const bordes = idDelDetalle === undefined ? undefined : 'border-b-0';
  const valor = eleccion.valorDe(fila);
  const esLaElegida = valor !== null && valor === eleccion.elegida;
  return (
    <>
      <TablaFila
        impar={indice % 2 === 1}
        data-realzada={fila.realzada === true ? '' : undefined}
        aria-current={fila.realzada === true ? 'true' : undefined}
        className={cn(
          fila.realzada === true || esLaElegida ? 'bg-azul-suave' : undefined,
          // La elegida no se dice solo con color: lleva el filo azul a la izquierda, como la fila
          // elegida del maestro de #67.
          esLaElegida ? '[&>td:first-child]:shadow-[inset_3px_0_0_var(--color-azul)]' : undefined,
          valor === null ? undefined : cn('cursor-pointer', FOCO),
        )}
        // Solo las elegibles: una fila sin su dato no se enfoca, no se pulsa y no dice
        // `aria-selected`, que en un `grid` es lo que la anuncia como elegible. Sin `eleccion`,
        // todo `undefined`: ni un atributo de mas (#95).
        data-no-elegible={eleccion.elige && valor === null ? '' : undefined}
        data-elegible={valor ?? undefined}
        aria-selected={valor === null ? undefined : esLaElegida}
        tabIndex={valor === null ? undefined : valor === eleccion.activa ? 0 : -1}
        ref={valor === null ? undefined : eleccion.anotar(valor)}
        onClick={
          valor === null
            ? undefined
            : (evento) => {
                eleccion.alClicar(evento, valor);
              }
        }
        onKeyDown={
          valor === null
            ? undefined
            : (evento) => {
                eleccion.alPulsar(evento, valor);
              }
        }
      >
        {fila.celdas.map((celda, j) => (
          <CeldaDelBloque
            key={tabla.columnas[j]?.rotulo ?? j}
            tabla={tabla}
            celda={celda}
            fila={fila}
            columna={j}
            bordes={bordes}
            traducir={traducir}
            textos={textos}
            texto={texto}
            tonoDeLaInsignia={tonoDeLaInsignia}
          />
        ))}
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
        <TablaFila impar={indice % 2 === 1} data-detalle-de-fila="">
          <TablaCelda
            id={idDelDetalle}
            colSpan={columnasDibujadas}
            className="pt-0 text-[12.5px] leading-[1.55] text-tinta-3 text-pretty"
          >
            {detalle}
          </TablaCelda>
        </TablaFila>
      )}
    </>
  );
}

interface CeldaDelBloqueProps extends DeLaTabla {
  readonly celda: CeldaDeLaTabla;
  readonly fila: FilaDeLaTabla;
  /** El indice de su columna. */
  readonly columna: number;
  readonly bordes: string | undefined;
  readonly tonoDeLaInsignia: (texto: string) => TonoDeInsignia;
}

/** Una celda: la insignia por regla, la de la columna de insignia, o el texto; y sin dato, su palabra. */
function CeldaDelBloque({ tabla, celda, fila, columna: j, bordes, traducir, textos, texto, tonoDeLaInsignia }: CeldaDelBloqueProps) {
  const columna = tabla.columnas[j];
  const leido = textoDeLaCelda(celda);
  const nota = notaDeLaCelda(celda);
  // Con regla, el tono lo dice la regla y `tonoDeLaInsignia` NO se llama (#65, AC-2).
  const conRegla = columna?.insignia !== undefined;
  const porRegla =
    columna?.insignia === undefined ? undefined : resolverInsignia(columna.insignia, leido ?? undefined, fila.datos, traducir);
  const deLaColumnaDeInsignia = !conRegla && leido !== null && j === tabla.columnaDeInsignia;
  // La cifra se alinea salvo en las insignias; y la primera columna identifica la fila si es texto.
  const cifra = !conRegla && !deLaColumnaDeInsignia && columna?.alineadoDerecha === true;
  const identifica = !conRegla && !deLaColumnaDeInsignia && leido !== null && j === 0;
  return (
    // Sin regla y sin dato, el motivo lo lleva la palabra, y la celda no repite `title`.
    <TablaCelda cifra={cifra} identifica={identifica} className={bordes} title={!conRegla && leido === null ? undefined : nota}>
      {porRegla !== undefined ? (
        <Insignia tono={porRegla.tono}>{porRegla.texto}</Insignia>
      ) : leido === null ? (
        // Nunca una celda en blanco, y nunca un cero: un cero es una afirmacion (#61).
        <SinDato tabla={tabla} texto={texto} textos={textos} nota={nota} />
      ) : deLaColumnaDeInsignia ? (
        <Insignia tono={tonoDeLaInsignia(leido)}>{leido}</Insignia>
      ) : (
        leido
      )}
    </TablaCelda>
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
}: Pick<DeLaTabla, 'tabla' | 'texto' | 'textos'> & { readonly nota: string | undefined }) {
  const deLaTabla = tabla.sinDato;
  const palabra = deLaTabla === undefined ? textos.celdaSinDato : texto(deLaTabla.texto);
  const porQue = nota ?? (deLaTabla?.nota === undefined ? textos.porQueLaCeldaNoTieneDato : texto(deLaTabla.nota));
  return (
    <span data-celda-sin-dato="" className="text-tinta-3" title={porQue}>
      {palabra}
    </span>
  );
}

/**
 * La clave de React de una fila: la que da la fila o, sin ella, lo que se lee en sus celdas, unido;
 * y no el indice: dos filas no suelen ser iguales —llevan su identificador— y con el indice,
 * reordenar deja a React reusando la fila equivocada.
 */
export function claveDeLaFila(fila: FilaDeLaTabla): string {
  return fila.clave ?? fila.celdas.map((celda) => textoDeLaCelda(celda) ?? '').join('|');
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
