import type { ReactNode } from 'react';

import { Tarjeta, TarjetaCabecera, TarjetaCampos, TarjetaNota, TarjetaPie } from '../shadcn/tarjeta.tsx';
import type { TextosDeLaPantalla } from '../textos.tsx';
import { CampoDelBloque } from './CampoDelBloque.tsx';
import { type Nombrados, resolverTexto } from './componer.ts';
import type { Ausencia, Coordenada } from './datos.ts';
import { coordenada } from './datos.ts';
import { TablaDelBloque } from './TablaDelBloque.tsx';
import type { DefinicionDeBloque, TonoDeInsignia, Texto } from './tipos.ts';

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
 */

export interface BloqueDeLaPantallaProps {
  readonly bloque: DefinicionDeBloque<Texto>;
  /** Lo tecleado y lo sabido, por indice de campo. Lo que no esta aqui no se sabe. */
  readonly valores: Readonly<Record<number, string | boolean>>;
  /** Las filas de su tabla, si se saben. */
  readonly filas?: readonly (readonly string[])[];
  readonly conteo?: string;
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
  return (
    <Tarjeta>
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
            />
          ))}
        </TarjetaCampos>
      )}
      {enLugarDelCuerpo !== undefined || bloque.tabla === undefined ? null : (
        <TablaDelBloque
          tabla={bloque.tabla}
          filas={filas}
          conteo={conteo}
          ausencia={ausencia}
          traducir={traducir}
          textos={textos}
          tonoDeLaInsignia={tonoDeLaInsignia}
        />
      )}
      {enLugarDelCuerpo !== undefined || pie === '' ? null : <TarjetaPie>{pie}</TarjetaPie>}
    </Tarjeta>
  );
}
