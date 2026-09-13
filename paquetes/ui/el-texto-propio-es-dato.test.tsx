import { render } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { elRojo, loQueNoPasoPorElSaco, marca, marcarElSaco } from '../verificaciones/marcas.ts';

import { FechaDeCalculo } from './FechaDeCalculo.tsx';
import { Importe } from './Importe.tsx';
import { Campo } from './shadcn/campo.tsx';
import { Avisos } from './shadcn/avisos.tsx';
import { Etiqueta } from './shadcn/etiqueta.tsx';
import { Miga, PasoDeLaMiga } from './shadcn/miga.tsx';
import { TEXTOS_DE_LA_UI } from './textos.tsx';

/**
 * **Las palabras que `@kamayuk/ui` decía por su cuenta salen del saco** (#19, AC1).
 *
 * <h2>Por qué aquí el inventario es CORTO, y por qué eso es la respuesta y no una excusa</h2>
 *
 * `@kamayuk/ui` casi no tiene texto propio, **por construcción**: un `Boton` no sabe qué pone
 * dentro, una `Alerta` tampoco, una `Tabla` menos. El texto ya entraba como `children` desde #11.
 * Las seis excepciones son las que se escaparon, y casi todas son del tipo que no se ve mirando la
 * pantalla: tres nombres accesibles que no se dibujan en ninguna parte, una marca entre paréntesis y
 * dos palabras pegadas a un dato.
 *
 * <h2>Cómo se comprueba, y qué NO cubre</h2>
 *
 * Igual que el armazón: se monta cada pieza con el saco marcado y se exige que no llegue nada sin
 * marcar, ni por un nodo de texto **ni por un atributo anunciado** —que es donde estaban escondidos
 * tres de los seis—.
 *
 * Lo que esto **no** puede hacer, y hay que decirlo: aquí no hay un árbol único que montar, así que
 * una pieza NUEVA con una palabra escrita dentro no aparecería en esta lista sola. Esa mitad la
 * cierra `verificaciones/el-texto-visible-es-dato.test.ts`, que exige que **el único sitio de estos
 * dos paquetes donde puede haber texto literal sean los dos archivos de textos**. Las dos guardas
 * contestan preguntas distintas y hacen falta las dos.
 *
 * `ListaDeLaPaleta` —la que traía «Suggestions» en inglés— no se monta aquí porque su
 * `Command.List` necesita un `Command` por encima: la cubre el armazón, con la paleta abierta.
 */

beforeAll(() => {
  // jsdom NO trae `matchMedia`, y `sonner` la llama al resolver el modo `system`. Medido en #13:
  // `TypeError: window.matchMedia is not a function` en `sonner/dist/index.mjs:1072`.
  window.matchMedia = ((consulta: string) => ({
    matches: false,
    media: consulta,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

/** El saco de la ui, marcado clave a clave. */
const MARCADOS = marcarElSaco(TEXTOS_DE_LA_UI);

/**
 * Lo que llega a la persona sin ser una palabra. Un importe formateado y una fecha formateada son
 * **datos**: «S/ 1,842.60» no tiene traducción, y el formato lo decide `@kamayuk/formato`.
 */
const DATOS_QUE_NO_SE_TRADUCEN = new Set([
  'S/ 1,842.60',
  '06/09/2026',
  // La barra de la miga. Es adorno del artboard y lleva `aria-hidden`.
  '/',
]);

/** Cada pieza con texto propio, montada con el saco marcado. */
const PIEZAS: readonly (readonly [string, () => React.ReactElement])[] = [
  [
    'Miga',
    () => (
      <Miga rotulo={MARCADOS.ruta}>
        <PasoDeLaMiga>{marca('paso')}</PasoDeLaMiga>
        <PasoDeLaMiga actual conSeparador>
          {marca('paso.actual')}
        </PasoDeLaMiga>
      </Miga>
    ),
  ],
  [
    'Etiqueta',
    () => (
      <Etiqueta
        rotulo={marca('rotulo')}
        opcional
        marcaDeOpcional={MARCADOS.opcional}
        ayuda={marca('ayuda')}
        error={marca('error')}
      >
        <Campo />
      </Etiqueta>
    ),
  ],
  [
    'FechaDeCalculo',
    () => <FechaDeCalculo fecha="2026-09-06" rotulo={MARCADOS.cifrasActualizadas} />,
  ],
  [
    'Importe',
    () => <Importe valor="1842.6" fechaCalculo="2026-09-06" rotuloDeLaFecha={MARCADOS.aLaFecha} />,
  ],
  ['Avisos', () => <Avisos rotulo={MARCADOS.avisos} />],
];

describe('EL CENTINELA: la lista tiene sujeto, y el arnes ve un literal cuando lo hay', () => {
  it('hay piezas que montar, y el saco tiene una clave por cada palabra', () => {
    expect(PIEZAS.length).toBeGreaterThanOrEqual(5);
    expect(Object.keys(TEXTOS_DE_LA_UI).length).toBeGreaterThanOrEqual(6);
  });

  it('una pieza que IGNORA el saco sale roja', () => {
    // Es la mitad que impide que esto pase por estar roto. Se dibuja lo mismo que `Etiqueta`
    // dibujaba antes de #19 —la marca escrita dentro— y el recorrido tiene que verla.
    const { container } = render(
      <p aria-label="Un nombre accesible sin marcar">
        {marca('rotulo')} <span>(opcional)</span>
      </p>,
    );
    const fuera = loQueNoPasoPorElSaco(container, DATOS_QUE_NO_SE_TRADUCEN).map((e) => e.texto);
    expect(fuera).toContain('(opcional)');
    expect(fuera, 'el recorrido no mira los atributos anunciados').toContain(
      'Un nombre accesible sin marcar',
    );
  });
});

describe('EL AC1: ninguna pieza escribe una palabra por su cuenta', () => {
  it.each(PIEZAS)('«%s» saca todas sus palabras del saco', (nombre, dibujar) => {
    render(dibujar());
    const fuera = loQueNoPasoPorElSaco(document.body, DATOS_QUE_NO_SE_TRADUCEN);
    expect(fuera, elRojo(fuera, `«${nombre}»`)).toEqual([]);
  });
});

describe('EL AC4: sin pasar nada, lo que se ve es lo de hoy', () => {
  it('las cinco siguen en castellano', () => {
    const { container } = render(
      <>
        <Miga>
          <PasoDeLaMiga>uno</PasoDeLaMiga>
        </Miga>
        <Etiqueta rotulo="Ejercicio" opcional>
          <Campo />
        </Etiqueta>
        <FechaDeCalculo fecha="2026-09-06" />
        <Importe valor="1842.6" fechaCalculo="2026-09-06" />
      </>,
    );
    expect(container.querySelector('nav')?.getAttribute('aria-label')).toBe('Ruta');
    expect(container.textContent).toContain('(opcional)');
    expect(container.textContent).toContain('Cifras actualizadas al 06/09/2026');
    expect(container.textContent).toContain('al 06/09/2026');
  });
});
