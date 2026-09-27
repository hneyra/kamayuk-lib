import type { ReactElement } from 'react';

import { Alerta } from '../shadcn/alerta.tsx';
import type { TextosDeLaPantalla } from '../textos.tsx';
import type { Nombrados } from './componer.ts';
import type { Ausencia } from './datos.ts';
import { GrupoDeAcciones } from './GrupoDeAcciones.tsx';
import type { InteraccionDeLaPantalla } from './interaccion.ts';
import { elVacioQueDice, type LoQueDiceSinFilas } from './reglas-de-las-tablas.ts';
import type { DefinicionDeTabla, Texto } from './tipos.ts';

/**
 * **Lo que dice una tabla en lugar de filas** (#27, #61, #65, #86; una pieza desde #120).
 *
 * <h2>Sin dato, sin filas y con filas son TRES cosas (#65, `tabla-con-vacio`)</h2>
 *
 * <table>
 *   <tr><td>sin dato (`filas` ausente)</td><td>la ausencia de #27: no se pudo pedir, y se dice por
 *     que</td></tr>
 *   <tr><td>`[]`</td><td>la lectura CONTESTO una lista vacia, y eso es una respuesta: se dice con
 *     el `vacio` de la definicion —o con su `vacioConSalida`, que lleva el boton dentro (#61)—. Sin
 *     ninguno, un aviso del saco —nunca una tabla muda—</td></tr>
 *   <tr><td>con filas</td><td>las filas, y su conteo; o, si el filtro local no deja ninguna, su
 *     propia frase (#86), que no es el `vacio`</td></tr>
 * </table>
 *
 * Todas van **fuera** de la `<table>`, por lo mismo que la nota: dentro serian una fila mas, y un
 * lector de pantalla la contaria como dato.
 *
 * <h2>Cual, lo decide `queDiceSinFilas`, y aqui sale UNA</h2>
 *
 * Hasta #120 eran cinco condicionales seguidos, cada uno con su propia condicion, y nada impedia que
 * dos se cumplieran a la vez. Ahora esta pieza recibe la respuesta de `queDiceSinFilas` y dibuja esa:
 * un `switch` con un `case` por respuesta y el retorno anotado **`ReactElement | null`**, asi que una
 * sexta que no tenga el suyo no compila —TS2366, con el `tsconfig` de cada consumidor—.
 *
 * **Y la anotacion no puede ser `ReactNode`**, medido en la revision de #120: `ReactNode` admite
 * `undefined`, el `switch` que se queda corto cae por el final devolviendolo, y `tsc` salia en RC=0
 * con una sexta respuesta sin su `case`; solo el lint de aqui lo decia, y el consumidor no lo corre.
 * Lo vigila `la-exhaustividad-viaja.test.ts`.
 */
export function SinFilasDeLaTabla({
  dice,
  tabla,
  ausencia,
  traducir,
  texto,
  textos,
  nombrados,
  interaccion,
}: {
  readonly dice: LoQueDiceSinFilas;
  readonly tabla: DefinicionDeTabla<Texto>;
  readonly ausencia: Ausencia;
  readonly traducir: (texto: string) => string;
  readonly texto: (t: Texto) => string;
  readonly textos: TextosDeLaPantalla;
  readonly nombrados: Nombrados | undefined;
  readonly interaccion: InteraccionDeLaPantalla;
}): ReactElement | null {
  const { conSalida, vacio } = elVacioQueDice(tabla);
  switch (dice) {
    case 'ausencia':
      return (
        <p data-sin-dato="" className="m-0 px-[15px] py-[10px] bg-sup text-[12px] leading-[1.5] text-tinta-3 italic text-pretty">
          {traducir(ausencia.enElCampo)}
        </p>
      );
    case 'vacioConSalida':
      // El vacio con su salida DENTRO (#61): la frase sola deja a quien la lee sin saber a donde ir,
      // y buscar en el arbol cual de las hojas crea el primero es adivinar.
      return conSalida === undefined ? null : (
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
      );
    case 'vacio':
      return vacio === undefined ? null : (
        <p data-vacio="" className="m-0 px-[15px] py-[18px] text-center text-[13px] leading-[1.5] text-tinta-3 text-pretty">
          {texto(vacio)}
        </p>
      );
    case 'sinCoincidencias': {
      // La lista llego CON filas y es el filtro el que no deja ninguna: esto no es el `vacio` de la
      // tabla —que dice que la lectura contesto una lista vacia— y la salida esta a la vista.
      const frase = tabla.filtroLocal?.sinCoincidencias;
      return (
        <p
          data-sin-coincidencias=""
          className="m-0 px-[15px] py-[18px] text-center text-[13px] leading-[1.5] text-tinta-3 text-pretty"
        >
          {frase === undefined || frase === '' ? textos.ningunaPasaElFiltro : texto(frase)}
        </p>
      );
    }
    case 'sinMotivo':
      // Nunca una tabla muda (AC-3): una lista vacia sin motivo es un defecto de la definicion, y se
      // ve en la pantalla, como la pieza del consumidor sin registrar de #44.
      return (
        <div className="px-[15px] py-[10px]">
          <Alerta tono="atencion" data-tabla-sin-motivo={tabla.clave ?? tabla.titulo}>
            {textos.tablaSinMotivo}
          </Alerta>
        </div>
      );
  }
}
