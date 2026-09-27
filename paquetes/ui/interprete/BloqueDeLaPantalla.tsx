import type { ReactNode } from 'react';

import { Insignia } from '../Insignia.tsx';
import { Tarjeta, TarjetaCabecera, TarjetaCampos, TarjetaNota, TarjetaPie } from '../shadcn/tarjeta.tsx';
import { CampoDelBloque } from './CampoDelBloque.tsx';
import { eleccionDe, momentoDeLaEleccion } from './campos-en-la-ruta.ts';
import type { DatosDeLaPantalla, FilaDeLaTabla } from './datos.ts';
import { coordenada } from './datos.ts';
import { useEntorno, useTexto } from './entorno.tsx';
import type { AccionesDeLaHoja } from './interaccion.ts';
import { ProsaConMarcas } from './ProsaConMarcas.tsx';
import { tablasDe } from './reglas-de-las-tablas.ts';
import { TablaDelBloque } from './TablaDelBloque.tsx';
import type { DefinicionDeBloque, DefinicionDeTabla, Texto } from './tipos.ts';

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
 *
 * <h2>Desde #86, insignias fijas y un codigo en la cabecera</h2>
 *
 * `insignias` y `aLaDerecha` van en el hueco `junto` de `TarjetaCabecera`, fuera del encabezado: el
 * nombre accesible del titulo no cambia. Sin ninguna de las dos, la cabecera es la de siempre.
 *
 * Y `notaConMarcas`, que gana a `nota`: la misma `TarjetaNota`, con `code` y `strong` dentro de la
 * frase (`texto-con-marcas`). Sin ella, la nota es la de siempre.
 *
 * <h2>Desde #125, diez `props`, y no diecinueve</h2>
 *
 * `traducir`, `textos`, `tonoDeLaInsignia` y `hoja` los toma del entorno de la pantalla
 * (`entorno.tsx`), y sus filas, su conteo, las tablas con nombre, la ausencia, la de cada campo y
 * sus `nombrados` los lee de `datos`, que es lo que eran: seis cortes del mismo objeto.
 */

export interface BloqueDeLaPantallaProps {
  readonly bloque: DefinicionDeBloque<Texto>;
  /** Lo tecleado y lo sabido, por indice de campo. Lo que no esta aqui no se sabe. */
  readonly valores: Readonly<Record<number, string | boolean>>;
  /**
   * Los datos de la pantalla, con los de la hoja: de aqui salen sus filas y su conteo (por su
   * `indice`), las tablas con `clave` (#65), la ausencia, la de cada campo y los `nombrados`.
   */
  readonly datos: DatosDeLaPantalla;
  /** Quien atiende las acciones de sus filas (#65): las mismas que las del bloque (#66, #125). */
  readonly accionesDeLaHoja: AccionesDeLaHoja;
  /** El indice de este bloque: sus filas en `datos`, y la coordenada de sus campos. */
  readonly indice: number;
  readonly alCambiar: (indiceDelCampo: number, valor: string | boolean) => void;
  /**
   * Salir de un campo que escribe en la ruta `alSalir`, o pulsar Intro en el (#94). Solo se ata a
   * esos campos: en los demas no hay nada que llevar a ninguna parte al salir.
   */
  readonly alSalirDelCampo?: (indiceDelCampo: number) => void;
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
  datos,
  accionesDeLaHoja,
  indice,
  alCambiar,
  alSalirDelCampo,
  enLugarDelCuerpo,
  encimaDelCuerpo,
  acciones,
}: BloqueDeLaPantallaProps) {
  const { traducir, textos } = useEntorno();
  const { nombrados, ausencia, ausenciaPorCampo } = datos;
  const texto = useTexto(nombrados);
  // `''` no se dibuja, ni se traduce: es como la definicion dice «este bloque no tiene nota».
  const nota = bloque.nota === '' ? '' : texto(bloque.nota);
  const pie = bloque.pie === undefined || bloque.pie === '' ? '' : texto(bloque.pie);
  const lasTablas = tablasDe(bloque);
  /** Las filas y el conteo de una tabla: por su nombre si lo tiene, por el indice del bloque si no. */
  const datosDe = (tabla: DefinicionDeTabla<Texto>): { filas?: readonly FilaDeLaTabla[]; conteo?: string } => {
    if (tabla.clave !== undefined) return datos.tablas?.get(tabla.clave) ?? {};
    return { filas: datos.filas?.get(indice)?.map((celdas) => ({ celdas })), conteo: datos.conteos?.get(indice) };
  };
  // Una tabla de cabecera fija se desplaza dentro de su marco, y ese marco solo tiene alto si cada
  // contenedor hasta la hoja lo cede: la tarjeta tambien se estira y se deja encoger (#65).
  const cedeElAlto = lasTablas.some((tabla) => tabla.cabeceraFija === true);
  const insignias = bloque.insignias ?? [];
  const codigo = bloque.aLaDerecha === undefined ? '' : texto(bloque.aLaDerecha.codigo);
  // Solo si hay algo que poner: sin ello, la cabecera no gana ni el hueco (#86).
  const junto =
    insignias.length === 0 && codigo === '' ? undefined : (
      <>
        {insignias.map((insignia, i) => (
          // El tono es DATO de la definicion, como en toda insignia desde #65: nunca sale del texto.
          <Insignia key={i} tono={insignia.tono}>
            {texto(insignia.texto)}
          </Insignia>
        ))}
        {codigo === '' ? null : (
          <span data-slot="codigo-de-la-cabecera" className="ml-auto font-mono text-[12.5px] font-bold">
            {codigo}
          </span>
        )}
      </>
    );
  return (
    <Tarjeta className={cedeElAlto ? 'flex min-h-0 flex-1 flex-col' : undefined}>
      <TarjetaCabecera junto={junto}>{texto(bloque.titulo)}</TarjetaCabecera>
      {acciones === undefined ? null : (
        <div data-slot="acciones-del-bloque" className="border-b border-linea-2 px-[15px] py-[10px]">
          {acciones}
        </div>
      )}
      {bloque.notaConMarcas !== undefined && bloque.notaConMarcas.length > 0 ? (
        // Gana a `nota` (#86, `texto-con-marcas`): la misma tarjeta, con los tramos dentro.
        <TarjetaNota>
          <ProsaConMarcas marcas={bloque.notaConMarcas} nombrados={nombrados} />
        </TarjetaNota>
      ) : nota === '' ? null : (
        <TarjetaNota>{nota}</TarjetaNota>
      )}
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
              {...(alSalirDelCampo !== undefined &&
              eleccionDe(campo) !== undefined &&
              momentoDeLaEleccion(campo) === 'alSalir'
                ? {
                    alSalir: () => {
                      alSalirDelCampo(i);
                    },
                  }
                : {})}
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
              nombrados={nombrados}
              accionesDeLaHoja={accionesDeLaHoja}
            />
          ))}
      {enLugarDelCuerpo !== undefined || pie === '' ? null : <TarjetaPie>{pie}</TarjetaPie>}
    </Tarjeta>
  );
}
