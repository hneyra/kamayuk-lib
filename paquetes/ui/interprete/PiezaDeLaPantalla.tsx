import type { ComponentType, ReactNode } from 'react';

import { Alerta } from '../shadcn/alerta.tsx';
import type { TextosDeLaPantalla } from '../textos.tsx';
import { esBloque, resolverTexto, seCumple } from './componer.ts';
import type { DatosDeLaPantalla } from './datos.ts';
import { EstadoDeLaLectura, FalloDeUnaLectura } from './EstadoDeLaLectura.tsx';
import { ActoDeLaPantalla } from './ActoDeLaPantalla.tsx';
import type { InteraccionDeLaPantalla } from './interaccion.ts';
import type { HojaDelMarco } from './hoja.ts';
import { MaestroDetalle } from './MaestroDetalle.tsx';
import { PestanasDeLaPantalla } from './PestanasDeLaPantalla.tsx';
import { PieDeOperaciones } from './PieDeOperaciones.tsx';
import type { ComunDeUnaPieza, PiezaDeLaPantalla, Texto, TonoDeInsignia } from './tipos.ts';

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
  /** Lo que la pantalla sabe hacer: sus actos, sus acciones y a donde puede ir (#66). */
  readonly interaccion: InteraccionDeLaPantalla;
  /**
   * Como se dibuja un bloque. Lo pone `Pantalla`, que es quien tiene lo tecleado; aqui solo se le
   * dice que va en el sitio del cuerpo y que va encima.
   */
  readonly dibujarBloque: (sustituto: { enLugarDelCuerpo?: ReactNode; encimaDelCuerpo?: ReactNode }) => ReactNode;
  /** La ruta y el marco de la hoja, si la pantalla va dentro de uno (#67). */
  readonly hoja?: HojaDelMarco;
  /** El tono de una insignia deducido de su texto: lo usa la fila del maestro (#67). */
  readonly tonoDeLaInsignia: (texto: string) => TonoDeInsignia;
  /** Dibuja la hija `j` de `hijasDe(pieza)`, con su indice: lo pone `Pantalla` (#67). */
  readonly dibujarHija: (j: number) => ReactNode;
}

export function PiezaDeLaPantalla({
  pieza,
  indice,
  datos,
  traducir,
  textos,
  piezas,
  interaccion,
  dibujarBloque,
  hoja,
  tonoDeLaInsignia,
  dibujarHija,
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
  // Un acto solo existe abierto (#66): cerrado no dibuja ni su lectura, ni su espera ni sus fallos.
  if (pieza.tipo === 'acto' && interaccion.abierto?.clave !== pieza.clave) return null;

  const estadoPropio = estadoDe(comun, datos, textos, texto);
  const encima = fallosDeLasVecinas(comun, datos, textos);

  if (esBloque(pieza)) {
    return dibujarBloque({ enLugarDelCuerpo: estadoPropio, encimaDelCuerpo: encima });
  }

  // Fuera de un bloque no hay cabecera que conservar: el estado ocupa el sitio de la pieza.
  if (estadoPropio !== undefined) return estadoPropio;

  let cuerpo: ReactNode;
  // Un `switch` por la clase, y no una cadena de `if` cuyo ultimo `else` se quedaba con **cualquier**
  // clase como `delConsumidor` (#111): con una octava, compilaba y se dibujaba como una pieza del
  // consumidor que nadie registro. Ver el `default`.
  switch (pieza.tipo) {
    case 'pestanas':
      // Las dos piezas que componen la hoja (#67): dibujan sus hijas por `dibujarHija`, con el mismo
      // despachador, asi que una pestana hereda `cuando`, `lectura` y `fallosDe` sin hacer nada.
      cuerpo = (
        <PestanasDeLaPantalla
          pieza={pieza}
          nombrados={datos.nombrados}
          traducir={traducir}
          textos={textos}
          hoja={hoja}
          dibujarHija={dibujarHija}
        />
      );
      break;
    case 'maestroDetalle':
      cuerpo = (
        <MaestroDetalle
          pieza={pieza}
          datos={datos}
          nombrados={datos.nombrados}
          traducir={traducir}
          textos={textos}
          tonoDeLaInsignia={tonoDeLaInsignia}
          hoja={hoja}
          dibujarHija={dibujarHija}
        />
      );
      break;
    case 'aviso': {
      const parrafo = pieza.texto === undefined ? '' : texto(pieza.texto);
      cuerpo = (
        <Alerta tono={pieza.tono} titulo={texto(pieza.titulo)}>
          {parrafo === '' ? undefined : parrafo}
        </Alerta>
      );
      break;
    }
    case 'acto':
      cuerpo = (
        <ActoDeLaPantalla
          // Otra apertura, otro formulario: lo escrito para una fila no pasa a la siguiente.
          key={JSON.stringify(interaccion.abierto?.parametros ?? {})}
          acto={pieza}
          datos={datos}
          traducir={traducir}
          textos={textos}
          interaccion={interaccion}
        />
      );
      break;
    case 'delConsumidor': {
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
      break;
    }
    default: {
      // **Una clase de pieza nueva no compila aqui** (#111): el `bloque` y el `pie` ya salieron
      // arriba, asi que lo que queda es `never` mientras cada clase tenga su `case`. Con una octava
      // en `PiezaDeLaPantalla`, esta asignacion es TS2322 con el `tsconfig` de cada consumidor.
      // Y si llega igual —una definicion sin tipos, o forzada con `as`—, revienta diciendo cual
      // es, como `tipoDe` con un tipo de campo: dibujarla como otra cosa la esconderia.
      const desconocida: never = pieza;
      throw new Error(
        `«${String((desconocida as { readonly tipo?: unknown }).tipo)}» no es una clase de pieza del interprete.`,
      );
    }
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
