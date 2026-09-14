import type { TextosDeLaPantalla } from '../textos.tsx';

/**
 * **Que operaciones sirven la hoja, y que le falta al backend** (#44, `pie-de-operaciones`).
 *
 * Sale de la `Servida` de la V6 de `catastro` (`22e6d2e:frontend/src/ds/componentes.tsx:586`), con
 * una diferencia que es la subida misma: alli se anteponia la raiz de la API de ese sistema a cada
 * ruta, y aqui **no se antepone nada**. El prefijo es del sistema (ADR-0030 §2); la libreria dibuja
 * la operacion tal como se la dan.
 *
 * Las operaciones son codigo y van en `<code>`, sin traducir. Lo que se lee delante —«La sirve»,
 * «La sirven»— sale del saco, como funcion, porque el plural lo decide el idioma.
 *
 * **Y no depende de ninguna lectura**, ni puede: su tipo no admite `cuando` ni `lectura`. Con el
 * servidor caido la pantalla no ensena una cifra y sigue nombrando lo que le habria contestado, que
 * es la mitad util de una pantalla sin datos.
 */

export interface PieDeOperacionesProps {
  readonly lee: readonly string[];
  readonly escribe?: readonly string[];
  /** Lo que falta, ya resuelto y traducido. */
  readonly falta?: string;
  readonly textos: TextosDeLaPantalla;
}

function Operaciones({ cuales }: { readonly cuales: readonly string[] }) {
  return cuales.map((operacion, i) => (
    <span key={operacion}>
      {i > 0 ? ' · ' : ''}
      <code className="text-[12px] text-tinta-2">{operacion}</code>
    </span>
  ));
}

export function PieDeOperaciones({ lee, escribe, falta, textos }: PieDeOperacionesProps) {
  return (
    <footer
      data-slot="pie-de-operaciones"
      className="rounded-sm border border-linea bg-sup px-[15px] py-[11px] text-[12.5px] leading-[1.55] text-tinta-3 text-pretty"
    >
      {lee.length === 0 ? null : (
        <p className="m-0">
          {textos.lasQueLeen(lee.length)} <Operaciones cuales={lee} />
        </p>
      )}
      {escribe === undefined || escribe.length === 0 ? null : (
        <p className="mt-[6px] mb-0 first:mt-0">
          {textos.lasQueEscriben(escribe.length)} <Operaciones cuales={escribe} />
        </p>
      )}
      {falta === undefined || falta === '' ? null : <p className="mt-[6px] mb-0 first:mt-0">{falta}</p>}
    </footer>
  );
}
