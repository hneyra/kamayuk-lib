import type { ReactNode } from 'react';

import { Tarjeta, TarjetaCabecera, TarjetaCampos, TarjetaNota, TarjetaPie } from '../shadcn/tarjeta.tsx';
import type { TextosDeLaPantalla } from '../textos.tsx';
import { CampoDelBloque } from './CampoDelBloque.tsx';
import type { InteraccionDeLaPantalla } from './interaccion.ts';
import { type Nombrados, resolverTexto } from './componer.ts';
import type { Ausencia, Coordenada, DatosDeUnaTabla, FilaDeLaTabla } from './datos.ts';
import { coordenada } from './datos.ts';
import { TablaDelBloque } from './TablaDelBloque.tsx';
import type { DefinicionDeBloque, DefinicionDeTabla, TonoDeInsignia, Texto } from './tipos.ts';

/**
 * Un bloque: la tarjeta con su cabecera, su nota, su rejilla de campos y su tabla (#27).
 *
 * Las cuatro zonas son opcionales salvo la cabecera, y las definiciones las usan en todas las
 * combinaciones: hay bloques que solo son una tabla, y bloques que solo son campos.
 *
 * <h2>Desde #44, el cuerpo puede ser el estado de su lectura</h2>
 *
 * Con `enLugarDelCuerpo`, **la cabecera y la nota se quedan** y el cuerpo —campos, tabla y pie— se
 * sustituye por la espera, las barras o el fallo. Se quedan porque dicen que parte de la hoja es
 * esta, y eso es cierto tambien mientras se pide: una tarjeta que pierde su titulo al fallar deja
 * un fallo sin sujeto. Con `encimaDelCuerpo`, el fallo de una lectura vecina va arriba y el cuerpo
 * sigue.
 *
 * <h2>Desde #65, mas de una tabla, y sus filas por nombre</h2>
 *
 * `tabla` y despues cada una de `tablas`, en su orden. Una tabla con `clave` toma sus filas de
 * `DatosDeLaPantalla.tablas`; una sin ella, las del bloque por su indice, como en #27.
 */

export interface BloqueDeLaPantallaProps {
  readonly bloque: DefinicionDeBloque<Texto>;
  /** Lo tecleado y lo sabido, por indice de campo. Lo que no esta aqui no se sabe. */
  readonly valores: Readonly<Record<number, string | boolean>>;
  /** Las filas de su tabla, si se saben. */
  readonly filas?: readonly (readonly string[])[];
  readonly conteo?: string;
  /** Las filas de las tablas con `clave` (#65). */
  readonly datosDeLasTablas?: ReadonlyMap<string, DatosDeUnaTabla>;
  /** Quien atiende las acciones de sus filas (#65): la misma interaccion que las del bloque (#66). */
  readonly interaccion: InteraccionDeLaPantalla;
  readonly ausencia: Ausencia;
  /** La palabra del hueco para campos concretos. Ver `datos.ts`. */
  readonly ausenciaPorCampo?: ReadonlyMap<Coordenada, string>;
  /** El indice de este bloque, para componer la coordenada de sus campos. */
  readonly indice: number;
  readonly alCambiar: (indiceDelCampo: number, valor: string | boolean) => void;
  readonly traducir: (texto: string) => string;
  readonly textos: TextosDeLaPantalla;
  readonly tonoDeLaInsignia: (texto: string) => TonoDeInsignia;
  /** Los datos con nombre, para los textos que llevan uno dentro (#44). */
  readonly nombrados?: Nombrados;
  /** El estado de su lectura, cuando no esta `con-datos`: sustituye al cuerpo (#44). */
  readonly enLugarDelCuerpo?: ReactNode;
  /** El fallo de las lecturas vecinas, encima del cuerpo y sin taparlo (#44). */
  readonly encimaDelCuerpo?: ReactNode;
  /** Los botones de la cabecera, ya montados (#66). Se quedan aunque el cuerpo sea un estado. */
  readonly acciones?: ReactNode;
}

export function BloqueDeLaPantalla({
  bloque,
  valores,
  filas,
  conteo,
  datosDeLasTablas,
  interaccion,
  ausencia,
  ausenciaPorCampo,
  indice,
  alCambiar,
  traducir,
  textos,
  tonoDeLaInsignia,
  nombrados,
  enLugarDelCuerpo,
  encimaDelCuerpo,
  acciones,
}: BloqueDeLaPantallaProps) {
  const texto = (t: Texto) => resolverTexto(t, nombrados, traducir, textos.datoAusente);
  // `''` no se dibuja, ni se traduce: es como la definicion dice «este bloque no tiene nota».
  const nota = bloque.nota === '' ? '' : texto(bloque.nota);
  const pie = bloque.pie === undefined || bloque.pie === '' ? '' : texto(bloque.pie);
  const lasTablas: readonly DefinicionDeTabla<Texto>[] = [
    ...(bloque.tabla === undefined ? [] : [bloque.tabla]),
    ...(bloque.tablas ?? []),
  ];
  /** Las filas y el conteo de una tabla: por su nombre si lo tiene, por el indice del bloque si no. */
  const datosDe = (tabla: DefinicionDeTabla<Texto>): { filas?: readonly FilaDeLaTabla[]; conteo?: string } => {
    if (tabla.clave !== undefined) return datosDeLasTablas?.get(tabla.clave) ?? {};
    return { filas: filas?.map((celdas) => ({ celdas })), conteo };
  };
  // Una tabla de cabecera fija se desplaza dentro de su marco, y ese marco solo tiene alto si cada
  // contenedor hasta la hoja lo cede: la tarjeta tambien se estira y se deja encoger (#65).
  const cedeElAlto = lasTablas.some((tabla) => tabla.cabeceraFija === true);
  return (
    <Tarjeta className={cedeElAlto ? 'flex min-h-0 flex-1 flex-col' : undefined}>
      <TarjetaCabecera>{texto(bloque.titulo)}</TarjetaCabecera>
      {acciones === undefined ? null : (
        <div data-slot="acciones-del-bloque" className="border-b border-linea-2 px-[15px] py-[10px]">
          {acciones}
        </div>
      )}
      {nota === '' ? null : <TarjetaNota>{nota}</TarjetaNota>}
      {enLugarDelCuerpo}
      {enLugarDelCuerpo === undefined ? encimaDelCuerpo : null}
      {enLugarDelCuerpo !== undefined || bloque.campos.length === 0 ? null : (
        <TarjetaCampos>
          {bloque.campos.map((campo, i) => (
            <CampoDelBloque
              // La etiqueta mas su tipo: dos campos del mismo bloque no comparten rotulo, y el
              // indice haria que reordenar reusara el control equivocado con el valor del anterior.
              key={`${campo.etiqueta}|${campo.tipo}`}
              campo={campo}
              valor={valores[i]}
              ausencia={ausencia}
              enElCampo={ausenciaPorCampo?.get(coordenada(indice, i))}
              alCambiar={(v) => {
                alCambiar(i, v);
              }}
              traducir={traducir}
              textos={textos}
              nombrados={nombrados}
            />
          ))}
        </TarjetaCampos>
      )}
      {enLugarDelCuerpo !== undefined
        ? null
        : lasTablas.map((tabla) => (
            <TablaDelBloque
              // Por su nombre, o su titulo: dos tablas del mismo bloque no comparten ninguno de los dos.
              key={tabla.clave ?? tabla.titulo}
              tabla={tabla}
              {...datosDe(tabla)}
              ausencia={ausencia}
              traducir={traducir}
              textos={textos}
              tonoDeLaInsignia={tonoDeLaInsignia}
              nombrados={nombrados}
              interaccion={interaccion}
            />
          ))}
      {enLugarDelCuerpo !== undefined || pie === '' ? null : <TarjetaPie>{pie}</TarjetaPie>}
    </Tarjeta>
  );
}
