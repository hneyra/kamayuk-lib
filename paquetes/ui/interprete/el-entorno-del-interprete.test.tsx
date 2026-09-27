import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ActoDeLaPantalla } from './ActoDeLaPantalla.tsx';
import { BloqueDeLaPantalla } from './BloqueDeLaPantalla.tsx';
import type { Ausencia } from './datos.ts';
import { GrupoDeAcciones } from './GrupoDeAcciones.tsx';
import type { AccionesDeLaHoja, CicloDelActo } from './interaccion.ts';
import { MaestroDetalle } from './MaestroDetalle.tsx';
import { Pantalla } from './Pantalla.tsx';
import { PestanasDeLaPantalla } from './PestanasDeLaPantalla.tsx';
import { TablaDelBloque } from './TablaDelBloque.tsx';

/**
 * **Una pieza del interprete montada fuera de `<Pantalla>` revienta diciendolo** (#125, AC-4).
 *
 * Desde #125, `traducir`, `textos`, `tonoDeLaInsignia` y `hoja` no bajan de pieza en pieza como
 * `props`: los da `Pantalla` una vez, en `EntornoDelInterprete` (`entorno.tsx`), y cada pieza los
 * toma de ahi. Un contexto con valor por omision —el saco de palabras de la libreria, `traducir`
 * tal cual— haria que una pieza montada sin `Pantalla` pintara igual: sin las palabras del sistema,
 * con un tono de insignia inventado y sin ruta, y sin que nada lo dijera. Por eso el contexto nace
 * **sin valor**, y leerlo sin proveedor lanza.
 *
 * No es una pieza por prueba: es cada componente que dibuja una clase de pieza desde la pantalla
 * —el bloque, su tabla, las pestanas, el maestro, el acto y el grupo de acciones—, porque cualquiera
 * de ellos que conservara una salida por omision seria el agujero.
 */

const SIN_DATO: Ausencia = { enElCampo: 'sin conectar', explicacion: '', tono: 'info' };

const ACCIONES: AccionesDeLaHoja = {
  actos: undefined,
  alHacer: undefined,
  navegacion: undefined,
  abrirActo: () => {},
};

const CICLO: CicloDelActo = {
  abierto: { clave: 'abrir' },
  alEnsuciar: () => {},
  alQuedarGuardada: () => {},
  marcarSucia: () => {},
  alDescartar: () => {},
  tecleadoDeLosActos: undefined,
};

/** Lo que dice el error: que falta `<Pantalla>`, y no un `undefined` leido tres niveles mas abajo. */
const FUERA_DE_LA_PANTALLA = /se monto fuera de <Pantalla>/;

const PIEZAS_SUELTAS: readonly (readonly [string, () => ReactElement])[] = [
  [
    'BloqueDeLaPantalla',
    () => (
      <BloqueDeLaPantalla
        bloque={{ titulo: 'Un bloque', nota: '', campos: [] }}
        valores={{}}
        datos={{ ausencia: SIN_DATO }}
        indice={0}
        alCambiar={() => {}}
        accionesDeLaHoja={ACCIONES}
      />
    ),
  ],
  [
    'TablaDelBloque',
    () => (
      <TablaDelBloque
        tabla={{ titulo: 'Una tabla', columnas: [{ rotulo: 'Uno', alineadoDerecha: false }] }}
        filas={[{ celdas: ['a'] }]}
        ausencia={SIN_DATO}
        accionesDeLaHoja={ACCIONES}
      />
    ),
  ],
  [
    'PestanasDeLaPantalla',
    () => (
      <PestanasDeLaPantalla
        pieza={{
          tipo: 'pestanas',
          enLaRuta: 'ver',
          rotulo: 'Vistas',
          pestanas: [{ clave: 'una', rotulo: 'Una', bloques: [] }],
        }}
        nombrados={undefined}
        dibujarHija={() => null}
      />
    ),
  ],
  [
    'MaestroDetalle',
    () => (
      <MaestroDetalle
        pieza={{
          tipo: 'maestroDetalle',
          enLaRuta: 'sujeto',
          maestro: { rotulo: 'Registros', filas: 'registros', fila: { titulo: '{nombre}' }, vacio: 'Ninguno.' },
          detalle: { sinEleccion: 'Elija uno.', noEstaEnLaLista: 'No esta.', bloques: [] },
        }}
        datos={{ ausencia: SIN_DATO }}
        nombrados={undefined}
        dibujarHija={() => null}
      />
    ),
  ],
  [
    'ActoDeLaPantalla',
    () => (
      <ActoDeLaPantalla
        acto={{
          tipo: 'acto',
          clave: 'abrir',
          titulo: 'Abrir',
          campos: [],
          observacion: { etiqueta: 'Observacion', largo: { minimo: 0, maximo: 200 } },
        }}
        datos={{ ausencia: SIN_DATO }}
        accionesDeLaHoja={ACCIONES}
        ciclo={CICLO}
      />
    ),
  ],
  [
    'GrupoDeAcciones',
    () => (
      <GrupoDeAcciones
        acciones={[{ rotulo: 'Volver a leer', hace: 'releer' }]}
        nombrados={undefined}
        accionesDeLaHoja={ACCIONES}
      />
    ),
  ],
];

describe('una pieza del interprete fuera de <Pantalla> revienta diciendolo (#125, AC-4)', () => {
  it.each(PIEZAS_SUELTAS)('%s, montado sin la pantalla, lanza y nombra lo que falta', (_nombre, pieza) => {
    // React avisa por consola del error de dibujo antes de relanzarlo: es el ruido esperado, no un fallo.
    const silencio = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => render(pieza())).toThrow(FUERA_DE_LA_PANTALLA);
    } finally {
      silencio.mockRestore();
    }
  });

  it('EL CENTINELA: la lista no esta vacia, y dentro de <Pantalla> la misma pieza se dibuja', () => {
    // Sin esto, una lista vaciada dejaria el `it.each` sin casos y en verde.
    expect(PIEZAS_SUELTAS.length).toBeGreaterThanOrEqual(6);
    const { container } = render(
      <Pantalla
        definicion={{ instruccion: '', bloques: [{ titulo: 'Un bloque', nota: '', campos: [] }] }}
        datos={{ ausencia: SIN_DATO }}
        tonoDeLaInsignia={() => 'ok'}
      />,
    );
    expect(container.textContent).toContain('Un bloque');
  });
});
