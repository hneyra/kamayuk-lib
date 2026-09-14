import { Alerta } from '../shadcn/alerta.tsx';
import { Boton } from '../shadcn/boton.tsx';
import type { TextosDeLaPantalla } from '../textos.tsx';
import type { EstadoDeUnaLectura } from './datos.ts';

/**
 * **Lo que una pieza dice mientras su lectura no esta `con-datos`** (#44, `estados-de-una-lectura`).
 *
 * Que los tres estados esten en un sitio es lo que impide el desenlace peor —la parte de la hoja
 * en blanco, sin datos y sin error—, que no lo delata ningun error de consola. La V6 de `catastro`
 * lo tenia en su `<Lectura>` (`22e6d2e:frontend/src/ds/componentes.tsx:684`), y de alli sale la
 * forma: espera centrada, barras con una palabra, y el fallo con sus distinciones.
 *
 * <h2>El fallo se dibuja con el peldano que el sistema entrega</h2>
 *
 * Titulo, detalle, las lineas de `detalles`, lo que falta, el remedio y la incidencia, cada uno en
 * su linea y **ninguno por `traducir`**: el peldano ya viene en el idioma de la sesion y el detalle
 * es lo que dijo el servidor. Lo que esta pieza pone por su cuenta —«Reintentar», «Incidencia»— sale
 * del saco.
 *
 * `data-estado-de-la-lectura` no es decoracion: es lo que deja a una guarda contar estados sin
 * leer el texto, que cambia con quien la monta.
 */

export interface EstadoDeLaLecturaProps {
  /** El estado, salvo `con-datos`: con datos se dibuja la pieza y no esto. */
  readonly estado: Exclude<EstadoDeUnaLectura, { readonly estado: 'con-datos' }>;
  /** La frase de la espera, ya resuelta. Sin ella, la del saco. */
  readonly espera?: string;
  readonly textos: TextosDeLaPantalla;
}

export function EstadoDeLaLectura({ estado, espera, textos }: EstadoDeLaLecturaProps) {
  switch (estado.estado) {
    case 'en-espera':
      return (
        <div data-estado-de-la-lectura="en-espera" className="grid place-items-center px-[15px] py-[26px]">
          <p className="m-0 max-w-[52ch] text-center text-[13.5px] leading-[1.6] text-tinta-3 text-pretty">
            {espera === undefined || espera === '' ? textos.enEspera : espera}
          </p>
        </div>
      );
    case 'pidiendo':
      return (
        <div
          data-estado-de-la-lectura="pidiendo"
          role="status"
          aria-busy="true"
          className="flex flex-col gap-[9px] px-[15px] py-[14px]"
        >
          {/* Barras y no una cifra: un cero mientras se pide se lee como la respuesta. */}
          {['w-[92%]', 'w-[81%]', 'w-[70%]'].map((ancho) => (
            <span key={ancho} aria-hidden="true" className={`block h-[13px] rounded-[4px] bg-linea-2 ${ancho}`} />
          ))}
          <span className="text-[12.5px] text-tinta-3">{textos.pidiendo}</span>
        </div>
      );
    case 'fallo':
      return <FalloDeUnaLectura fallo={estado} textos={textos} />;
  }
}

export interface FalloDeUnaLecturaProps {
  readonly fallo: Extract<EstadoDeUnaLectura, { readonly estado: 'fallo' }>;
  readonly textos: TextosDeLaPantalla;
}

/** El fallo solo. Lo usan el estado de la lectura propia y el aviso del fallo de una vecina. */
export function FalloDeUnaLectura({ fallo, textos }: FalloDeUnaLecturaProps) {
  const { peldano } = fallo;
  const incidencia = peldano.incidencia;
  return (
    <div data-estado-de-la-lectura="fallo" className="px-[15px] py-[14px]">
      <Alerta tono={fallo.tono ?? 'mal'} titulo={peldano.titulo}>
        <p className="m-0">{peldano.detalle}</p>
        {fallo.detalles === undefined || fallo.detalles.length === 0 ? null : (
          <ul className="mt-[6px] mb-0 pl-[18px]">
            {fallo.detalles.map((linea) => (
              <li key={linea}>{linea}</li>
            ))}
          </ul>
        )}
        {fallo.loQueFalta === undefined ? null : <p className="mt-[6px] mb-0">{fallo.loQueFalta}</p>}
        {peldano.remedio === undefined ? null : <p className="mt-[6px] mb-0">{peldano.remedio}</p>}
        {incidencia === undefined || incidencia === null ? null : (
          <p className="mt-[6px] mb-0 tabular-nums">{textos.incidencia(incidencia)}</p>
        )}
        {fallo.reintentar === undefined ? null : (
          <div className="mt-[10px]">
            <Boton type="button" tamano="menudo" onClick={fallo.reintentar}>
              {textos.reintentar}
            </Boton>
          </div>
        )}
      </Alerta>
    </div>
  );
}
