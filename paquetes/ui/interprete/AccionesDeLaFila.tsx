import type { TextosDeLaPantalla } from '../textos.tsx';
import { type Nombrados, resolverTexto } from './componer.ts';
import type { DatoConNombre, FilaDeLaTabla } from './datos.ts';
import { GrupoDeAcciones } from './GrupoDeAcciones.tsx';
import type { InteraccionDeLaPantalla } from './interaccion.ts';
import { accionesQueOfrece } from './reglas-de-las-tablas.ts';
import type { AccionesPorFila, Texto } from './tipos.ts';

/**
 * **Los botones de UNA fila, y solo los que su estado ofrece** (#65, `acciones-por-fila`).
 *
 * Sale de `ActosDeLaFila` de la V6 de `catastro` (`fiscalizacion/Fiscalizacion.tsx:113` en
 * `22e6d2e`), con lo que alli ya estaba medido:
 *
 * · **Un `role="group"` con nombre**, y no botones sueltos: tres «Descartar» seguidos no se pueden
 *   decir en voz alta sin decir de que fila es cada uno. El nombre lo da la definicion
 *   —`nombreDelGrupo`, con los datos de la fila— o el saco con la primera celda.
 * · **«Sin acciones» es texto y no un boton apagado**: la fila no ofrece nada, y un boton que no se
 *   puede pulsar seria una parada del tabulador que no lleva a ninguna parte.
 *
 * <h2>Los botones son los del bloque (#66), no otros</h2>
 *
 * Una accion de fila es una `DefinicionDeAccion` —`abre`, `va` o `hace`, con su `impedida`— y se
 * dibuja con el mismo `GrupoDeAcciones`: el mismo motivo cuando nadie la atiende, el mismo «en
 * curso», la misma navegacion por el marco. Lo que cambia son **los datos con que se resuelve**: los
 * de la pantalla con los de la fila encima, asi que `con: { registro: { desde: 'codigo' } }` lleva
 * al acto el codigo DE ESTA fila.
 *
 * <h2>El detalle de la fila, en su descripcion</h2>
 *
 * Si la fila tiene detalle (`detalle-de-fila`), sus botones lo llevan en `aria-describedby`, ademas
 * de su motivo: quien llega con el tabulador a «Anular» oye tambien quien anulo lo de antes y por que.
 */

export interface AccionesDeLaFilaProps {
  readonly definicion: AccionesPorFila<Texto>;
  readonly fila: FilaDeLaTabla;
  /** Los datos con nombre de la pantalla. Los de la fila van encima. */
  readonly nombrados: Nombrados;
  readonly traducir: (texto: string) => string;
  readonly textos: TextosDeLaPantalla;
  readonly interaccion: InteraccionDeLaPantalla;
  /** El `id` del detalle de esta fila, si lo tiene. */
  readonly idDelDetalle?: string;
}

export function AccionesDeLaFila({
  definicion,
  fila,
  nombrados,
  traducir,
  textos,
  interaccion,
  idDelDetalle,
}: AccionesDeLaFilaProps) {
  const ofrecidas = accionesQueOfrece(definicion, fila.datos);
  if (ofrecidas.length === 0) {
    return (
      <span data-sin-acciones="" className="text-[12.5px] text-tinta-3">
        {traducir(definicion.sinAcciones)}
      </span>
    );
  }

  const deLaFila = datosDeLaFila(nombrados, fila);
  const nombre =
    definicion.nombreDelGrupo === undefined
      ? textos.accionesDeLaFila(fila.celdas[0] ?? textos.datoAusente)
      : resolverTexto(definicion.nombreDelGrupo, deLaFila, traducir, textos.datoAusente);

  return (
    <div role="group" aria-label={nombre} data-acciones-de-la-fila="">
      <GrupoDeAcciones
        acciones={ofrecidas}
        nombrados={deLaFila}
        traducir={traducir}
        textos={textos}
        interaccion={interaccion}
        describidoPor={idDelDetalle}
      />
    </div>
  );
}

/** Los datos de la pantalla con los de la fila encima: en una fila, `{codigo}` es el de la fila. */
function datosDeLaFila(nombrados: Nombrados, fila: FilaDeLaTabla): ReadonlyMap<string, DatoConNombre> {
  return new Map([...(nombrados ?? []), ...(fila.datos ?? [])]);
}
