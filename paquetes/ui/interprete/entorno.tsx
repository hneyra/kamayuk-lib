import { createContext, useContext, type ReactNode } from 'react';

import type { TextosDeLaPantalla } from '../textos.tsx';
import { type Nombrados, textoCon } from './componer.ts';
import type { HojaDelMarco } from './hoja.ts';
import type { Texto, TonoDeInsignia } from './tipos.ts';

/**
 * **Lo que la pantalla le da a cada pieza, una vez** (#125). Interno: no se exporta por `index.ts`.
 *
 * Hasta #125 bajaban como `props`: medido sobre `origin/main@e42ad3a`, `textos` estaba en quince
 * interfaces `…Props`, `traducir` en once, `tonoDeLaInsignia` en siete y `hoja` en seis, y
 * `BloqueDeLaPantalla` recibia diecinueve, casi todas solo para pasarlas a su tabla. Ninguna de las cuatro cambia de una pieza a otra dentro de la misma
 * pantalla: son del sistema que la monta (`PantallaProps`). Por eso las da `Pantalla`, aqui, y cada
 * pieza las toma con `useEntorno`.
 *
 * **`nombrados` NO esta aqui**, y es a proposito: la fila, el acto y la lista del maestro ponen
 * sus datos encima de los de la pantalla, asi que cada pieza tiene los suyos y siguen siendo
 * `prop`. Lo que la pieza pide es `useTexto(nombrados)`: el cierre de `textoCon` con el entorno.
 *
 * <h2>Sin proveedor, revienta</h2>
 *
 * El contexto nace **sin valor por omision**. Uno con el saco de la libreria y `traducir` tal cual
 * haria que una pieza montada fuera de `<Pantalla>` pintara igual —sin las palabras del sistema,
 * con un tono de insignia inventado y sin ruta— y nada lo diria. Asi que leerlo sin proveedor lanza,
 * y el error dice que falta la pantalla (`el-entorno-del-interprete.test.tsx`).
 *
 * `@kamayuk/ui` sigue sin importar `@kamayuk/shell`: `hoja` es la `HojaDelMarco` de siempre, la
 * forma que el marco cumple, y llega por `PantallaProps` como antes.
 */
export interface EntornoDelInterprete {
  /** Las palabras de la definicion y de la ausencia, en el idioma de la sesion. */
  readonly traducir: (texto: string) => string;
  /** Los dos sacos del interprete, ya fundidos con lo que el sistema paso. */
  readonly textos: TextosDeLaPantalla;
  /** El tono de una celda de situacion deducido de su texto: la tabla y la fila del maestro. */
  readonly tonoDeLaInsignia: (texto: string) => TonoDeInsignia;
  /** La ruta y el marco de la hoja, si la pantalla va dentro de uno (#67). */
  readonly hoja: HojaDelMarco | undefined;
}

const Entorno = createContext<EntornoDelInterprete | null>(null);

/** Lo pone `Pantalla`, alrededor de todas sus piezas, y nadie mas. */
export function ProveedorDelEntorno({
  entorno,
  children,
}: {
  readonly entorno: EntornoDelInterprete;
  readonly children: ReactNode;
}) {
  return <Entorno.Provider value={entorno}>{children}</Entorno.Provider>;
}

/** El entorno de la pantalla. **Fuera de `<Pantalla>` lanza**: ver el docblock. */
export function useEntorno(): EntornoDelInterprete {
  const entorno = useContext(Entorno);
  if (entorno === null) {
    throw new Error(
      'Una pieza del interprete se monto fuera de <Pantalla>: sin ella no tiene traducir, textos, ' +
        'tonoDeLaInsignia ni hoja, y pintaria sin las palabras del sistema.',
    );
  }
  return entorno;
}

/** Un `Texto` resuelto con esos `nombrados` y el entorno de la pantalla: `textoCon`, con lo de aqui. */
export function useTexto(nombrados: Nombrados): (texto: Texto) => string {
  const { traducir, textos } = useEntorno();
  return textoCon(nombrados, traducir, textos);
}
