import { useId, useRef, useState } from 'react';

import { BotonConMotivo } from '../shadcn/boton-con-motivo.tsx';
import type { TextosDeLaPantalla } from '../textos.tsx';
import { motivoDeLaAccion, peticionDe, resolverTodos } from './acciones.ts';
import { type Nombrados, resolverTexto } from './componer.ts';
import type { InteraccionDeLaPantalla } from './interaccion.ts';
import type { DefinicionDeAccion } from './tipos-de-los-actos.ts';

/**
 * **Una fila de acciones**: la de la cabecera de un bloque, o la de un acto ya hecho (#66,
 * `acciones-del-bloque`, `impedido-con-motivo` y `navegar-a-otra-hoja`).
 *
 * Cada boton decide si se puede pulsar con `motivoDeLaAccion`, y **los motivos se dibujan una vez
 * cada uno**, debajo de la fila: dos botones impedidos por «falta elegir un grupo» comparten el
 * parrafo y los dos lo nombran en `aria-describedby`.
 *
 * <h2>Lo que hace cada clase de accion al pulsarla</h2>
 *
 * <table>
 *   <tr><td>`abre`</td><td>abre el acto de esta hoja, con lo de `con` ya resuelto</td></tr>
 *   <tr><td>`va`</td><td>pide al marco ir a otra hoja. **El marco decide**: con la hoja sucia
 *     pregunta, y lo que su catalogo no ofrece no lo abre</td></tr>
 *   <tr><td>`hace`</td><td>llama a su operacion; si devuelve una promesa, el boton esta en curso
 *     hasta que acabe, y otra pulsacion no la vuelve a llamar</td></tr>
 * </table>
 *
 * #65 (`acciones-por-fila`) puede montar esta misma pieza con los `nombrados` de la fila.
 */

/** `abre:x`, `va:x` o `hace:x`: lo que deja a una guarda encontrar el boton sin leer su rotulo. */
function claveDeLaAccion(accion: DefinicionDeAccion): string {
  if (accion.abre !== undefined) return `abre:${accion.abre}`;
  if (accion.va !== undefined) return `va:${accion.va.hoja}`;
  return `hace:${accion.hace}`;
}

export interface GrupoDeAccionesProps {
  readonly acciones: readonly DefinicionDeAccion[];
  readonly nombrados: Nombrados;
  readonly traducir: (texto: string) => string;
  readonly textos: TextosDeLaPantalla;
  readonly interaccion: InteraccionDeLaPantalla;
  /** Lo que ademas describe a cada boton: el detalle de la fila, en una accion por fila (#65). */
  readonly describidoPor?: string;
}

export function GrupoDeAcciones({ acciones, nombrados, traducir, textos, interaccion, describidoPor }: GrupoDeAccionesProps) {
  const raiz = useId();
  const [pendientes, setPendientes] = useState<ReadonlySet<number>>(() => new Set());
  // El estado llega una pintada tarde: la segunda pulsacion de un doble clic la veria libre. La
  // referencia no espera a pintar, y es la que de verdad corta la segunda llamada.
  const enVuelo = useRef(new Set<number>());

  if (acciones.length === 0) return null;

  const contexto = {
    nombrados,
    traducir,
    textos,
    actos: interaccion.actos,
    alHacer: interaccion.alHacer,
    navegacion: interaccion.navegacion,
  };

  const filas = acciones.map((accion, indice) => ({
    accion,
    indice,
    motivo: motivoDeLaAccion(accion, { ...contexto, enCurso: pendientes.has(indice) }),
  }));
  const motivos = [...new Set(filas.flatMap((fila) => (fila.motivo === undefined ? [] : [fila.motivo])))];
  const idDe = (motivo: string) => `${raiz}-motivo-${String(motivos.indexOf(motivo))}`;

  const pulsar = (accion: DefinicionDeAccion, indice: number) => {
    if (accion.abre !== undefined) {
      interaccion.abrirActo(accion.abre, resolverTodos(accion.con, nombrados, traducir, textos));
      return;
    }
    if (accion.va !== undefined) {
      const resuelta = peticionDe(accion.va, nombrados, traducir, textos);
      if ('peticion' in resuelta) interaccion.navegacion?.ir(resuelta.peticion);
      return;
    }
    const operacion = interaccion.alHacer?.[accion.hace];
    if (operacion === undefined || enVuelo.current.has(indice)) return;
    const resultado = operacion();
    if (!(resultado instanceof Promise)) return;
    enVuelo.current.add(indice);
    setPendientes((antes) => new Set(antes).add(indice));
    const soltar = () => {
      enVuelo.current.delete(indice);
      setPendientes((antes) => {
        const quedan = new Set(antes);
        quedan.delete(indice);
        return quedan;
      });
    };
    // Rechazada, el boton vuelve a estar libre: el fallo lo dice el sistema en `lecturas`.
    resultado.then(soltar, soltar);
  };

  return (
    <div data-slot="grupo-de-acciones" className="flex flex-col gap-[6px]">
      <div className="flex flex-wrap items-center gap-2">
        {filas.map(({ accion, indice, motivo }) => (
          <BotonConMotivo
            key={indice}
            type="button"
            tamano="menudo"
            variante={accion.principal === true ? 'primario' : 'secundario'}
            data-accion={claveDeLaAccion(accion)}
            motivo={motivo}
            idDelMotivo={motivo === undefined ? undefined : idDe(motivo)}
            enCurso={pendientes.has(indice)}
            aria-describedby={describidoPor}
            onClick={() => {
              pulsar(accion, indice);
            }}
          >
            {resolverTexto(accion.rotulo, nombrados, traducir, textos.datoAusente)}
          </BotonConMotivo>
        ))}
      </div>
      {motivos.map((motivo) => (
        <p key={motivo} id={idDe(motivo)} data-slot="motivo" className="m-0 text-[12.5px] leading-[1.5] text-tinta-3 text-pretty">
          {motivo}
        </p>
      ))}
    </div>
  );
}
