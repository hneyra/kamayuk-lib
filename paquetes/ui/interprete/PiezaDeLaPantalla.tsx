import type { ComponentType, ReactNode } from 'react';

import { Alerta } from '../shadcn/alerta.tsx';
import type { TextosDeLaPantalla } from '../textos.tsx';
import { esBloque, resolverTexto, seCumple } from './componer.ts';
import type { DatosDeLaPantalla } from './datos.ts';
import { EstadoDeLaLectura, FalloDeUnaLectura } from './EstadoDeLaLectura.tsx';
import { PieDeOperaciones } from './PieDeOperaciones.tsx';
import type { ComunDeUnaPieza, PiezaDeLaPantalla, Texto } from './tipos.ts';

/**
 * **Una pieza de la definicion, con sus tres modificadores aplicados** (#44).
 *
 * Aqui y solo aqui se decide, para cualquier pieza, lo que `ComunDeUnaPieza` declara, y en este
 * orden:
 *
 *   1. **`cuando`** — si no se cumple, la pieza no existe. Su indice no se mueve: lo decide quien
 *      recorre `bloques`, no esto.
 *   2. **`lectura`** — si su estado no es `con-datos`, se dibuja el estado en el sitio de la pieza
 *      (en un bloque, en el sitio de su cuerpo). Una clave sin estado es un aviso visible.
 *   3. **`fallosDe`** — el fallo de cada vecina, encima, sin tapar la pieza.
 *
 * Que este en un sitio es lo que impide que cada pieza nueva de #65, #66 o #67 lo resuelva a su
 * manera: una pieza nueva solo tiene que dibujarse con datos.
 */

/** Lo que recibe el componente de una pieza del consumidor: lo mismo que el interprete tiene (AC-2). */
export interface PropsDeUnaPiezaDelConsumidor {
  /** La clave con la que la definicion la nombro. Un mismo componente puede servir dos claves. */
  readonly clave: string;
  /** Su sitio en `bloques`, para encontrar lo suyo en `datos` si lo busca por coordenada. */
  readonly indice: number;
  readonly datos: DatosDeLaPantalla;
  readonly traducir: (texto: string) => string;
  /** Los dos sacos del interprete, ya fundidos con lo que el sistema paso. */
  readonly textos: TextosDeLaPantalla;
}

/** El registro `clave -> componente` que el sistema pasa a `<Pantalla piezas>`. */
export type PiezasDelConsumidor = Readonly<Record<string, ComponentType<PropsDeUnaPiezaDelConsumidor>>>;

export interface PiezaDeLaPantallaProps {
  readonly pieza: PiezaDeLaPantalla;
  readonly indice: number;
  readonly datos: DatosDeLaPantalla;
  readonly traducir: (texto: string) => string;
  readonly textos: TextosDeLaPantalla;
  readonly piezas: PiezasDelConsumidor | undefined;
  /**
   * Como se dibuja un bloque. Lo pone `Pantalla`, que es quien tiene lo tecleado; aqui solo se le
   * dice que va en el sitio del cuerpo y que va encima.
   */
  readonly dibujarBloque: (sustituto: { enLugarDelCuerpo?: ReactNode; encimaDelCuerpo?: ReactNode }) => ReactNode;
}

export function PiezaDeLaPantalla({
  pieza,
  indice,
  datos,
  traducir,
  textos,
  piezas,
  dibujarBloque,
}: PiezaDeLaPantallaProps) {
  const texto = (t: Texto) => resolverTexto(t, datos.nombrados, traducir, textos.datoAusente);

  // El pie no tiene modificadores, y lo dice su tipo: sigue ahi con el servidor caido.
  if (pieza.tipo === 'pie') {
    return (
      <PieDeOperaciones
        lee={pieza.lee}
        escribe={pieza.escribe}
        falta={pieza.falta === undefined ? undefined : texto(pieza.falta)}
        textos={textos}
      />
    );
  }

  const comun: ComunDeUnaPieza = pieza;
  if (!seCumple(comun.cuando, datos.nombrados)) return null;

  const estadoPropio = estadoDe(comun, datos, textos, texto);
  const encima = fallosDeLasVecinas(comun, datos, textos);

  if (esBloque(pieza)) {
    return dibujarBloque({ enLugarDelCuerpo: estadoPropio, encimaDelCuerpo: encima });
  }

  // Fuera de un bloque no hay cabecera que conservar: el estado ocupa el sitio de la pieza.
  if (estadoPropio !== undefined) return estadoPropio;

  let cuerpo: ReactNode;
  if (pieza.tipo === 'aviso') {
    const parrafo = pieza.texto === undefined ? '' : texto(pieza.texto);
    cuerpo = (
      <Alerta tono={pieza.tono} titulo={texto(pieza.titulo)}>
        {parrafo === '' ? undefined : parrafo}
      </Alerta>
    );
  } else {
    const Componente = piezas !== undefined && Object.hasOwn(piezas, pieza.clave) ? piezas[pieza.clave] : undefined;
    cuerpo =
      Componente === undefined ? (
        // Nunca un hueco en blanco (AC-2): una clave que nadie registro se ve, y dice cual es.
        <Alerta tono="atencion" data-pieza-sin-registrar={pieza.clave}>
          {textos.piezaSinRegistrar(pieza.clave)}
        </Alerta>
      ) : (
        <Componente clave={pieza.clave} indice={indice} datos={datos} traducir={traducir} textos={textos} />
      );
  }

  return encima === undefined ? (
    cuerpo
  ) : (
    <div className="flex flex-col gap-[10px]">
      {encima}
      {cuerpo}
    </div>
  );
}

/** Lo que la pieza dibuja en su sitio por su lectura, o `undefined` si esta `con-datos` o no tiene. */
function estadoDe(
  comun: ComunDeUnaPieza,
  datos: DatosDeLaPantalla,
  textos: TextosDeLaPantalla,
  texto: (t: Texto) => string,
): ReactNode {
  if (comun.lectura === undefined) return undefined;
  const { clave, espera } = comun.lectura;
  const estado = datos.lecturas?.get(clave);
  if (estado === undefined) {
    // Declarada y sin estado es un defecto de la costura, y se dice. Dibujar «pidiendo» seria
    // mentir para siempre, y dibujar la pieza seria ensenar datos que nadie ha leido.
    return (
      <div className="px-[15px] py-[14px]">
        <Alerta tono="atencion" data-lectura-sin-estado={clave}>
          {textos.lecturaSinEstado(clave)}
        </Alerta>
      </div>
    );
  }
  if (estado.estado === 'con-datos') return undefined;
  return (
    <EstadoDeLaLectura
      estado={estado}
      espera={estado.estado === 'en-espera' && espera !== undefined ? texto(espera) : undefined}
      textos={textos}
    />
  );
}

/** El fallo de las lecturas vecinas. Su espera y su «pidiendo» no tapan nada, y no se dicen aqui. */
function fallosDeLasVecinas(
  comun: ComunDeUnaPieza,
  datos: DatosDeLaPantalla,
  textos: TextosDeLaPantalla,
): ReactNode {
  const fallos = (comun.fallosDe ?? []).flatMap((clave) => {
    // La lectura propia ya dice su fallo en el sitio del cuerpo: repetirlo encima lo diria dos veces.
    if (clave === comun.lectura?.clave) return [];
    const estado = datos.lecturas?.get(clave);
    return estado?.estado === 'fallo' ? [{ clave, estado }] : [];
  });
  if (fallos.length === 0) return undefined;
  return fallos.map(({ clave, estado }) => (
    <div key={clave} data-fallo-de={clave}>
      <FalloDeUnaLectura fallo={estado} textos={textos} />
    </div>
  ));
}
