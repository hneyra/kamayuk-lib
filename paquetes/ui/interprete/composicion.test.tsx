import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { TEXTOS_DE_LAS_PIEZAS } from '../textos.tsx';
import { piezasSinRegistrar } from './componer.ts';
import { indicesDeLasPiezas, nombradosConLaHoja, pestanaAbierta, recorrerLasPiezas } from './composicion.ts';
import type { DatosDeLaPantalla } from './datos.ts';
import { actoEnLaRuta, type CambioDeLaRuta, type HojaDelMarco, type RutaDeLaHoja } from './hoja.ts';
import { MUESTRAS_DE_LA_COMPOSICION } from './muestras-de-la-composicion.ts';
import { MUESTRAS_DE_LOS_ACTOS } from './muestras.ts';
import { Pantalla, type PantallaProps } from './Pantalla.tsx';
import type { DefinicionDePantalla, DefinicionDePestanas, PiezaDeLaPantalla } from './tipos.ts';

/**
 * **Las dos piezas de #67 que componen la hoja: el maestro-detalle y las pestanas.**
 *
 * Aqui se montan SIN el marco. La mitad «recargar restituye» con la barra de direcciones de verdad
 * la mide `shell/estado-en-la-ruta.test.tsx`, que monta el `Armazon` entero; aqui se mide que las
 * piezas **leen** la ruta que reciben y **escriben** el cambio justo, con una hoja de prueba que
 * guarda la ruta en un estado — que es exactamente lo que el marco hace con el hash.
 */

type Definicion = DefinicionDePantalla<PiezaDeLaPantalla>;

const SIN_FRASE = { enElCampo: '—', explicacion: '', tono: 'info' } as const;

/** Una hoja de prueba: la ruta en un estado, y cada cambio anotado. Es el marco, sin el hash. */
function ConHoja({
  inicial,
  cambios,
  definicion,
  datos,
  extra = {},
}: {
  readonly inicial: RutaDeLaHoja;
  readonly cambios: CambioDeLaRuta[];
  readonly definicion: Definicion;
  readonly datos: DatosDeLaPantalla;
  readonly extra?: Partial<PantallaProps>;
}) {
  const [ruta, setRuta] = useState<RutaDeLaHoja>(inicial);
  const hoja: HojaDelMarco = {
    ruta,
    marco: { ejercicio: '2026' },
    moverLaRuta: (cambio) => {
      cambios.push(cambio);
      setRuta((antes) => ({
        sujeto: cambio.sujeto === undefined ? antes.sujeto : cambio.sujeto,
        parametros: Object.fromEntries(
          Object.entries({ ...antes.parametros, ...cambio.parametros }).filter(
            (par): par is [string, string] => par[1] !== null,
          ),
        ),
      }));
    },
  };
  const conActo = extra.actoAbierto === null ? actoEnLaRuta(hoja) : {};
  return <Pantalla definicion={definicion} datos={datos} tonoDeLaInsignia={() => 'ok'} hoja={hoja} {...extra} {...conActo} />;
}

const MAESTRO = MUESTRAS_DE_LA_COMPOSICION['maestro-detalle'];
const PESTANAS = MUESTRAS_DE_LA_COMPOSICION.pestanas;

describe('EL CENTINELA: las muestras de #67 son las dos del interprete, y se dibujan', () => {
  it('estan las dos claves, ni una mas', () => {
    expect(Object.keys(MUESTRAS_DE_LA_COMPOSICION).sort()).toEqual(['maestro-detalle', 'pestanas']);
  });

  it.each(Object.entries(MUESTRAS_DE_LA_COMPOSICION))('«%s» se monta sin marco y dibuja su pieza', (hueco, muestra) => {
    const { container } = render(
      <Pantalla definicion={muestra.definicion} datos={muestra.datos} tonoDeLaInsignia={() => 'ok'} />,
    );
    expect(container.querySelector(`[data-pieza="${hueco}"]`), `la muestra «${hueco}» no dibujo su pieza`).not.toBeNull();
  });
});

describe('los indices de las piezas anidadas: en ANCHURA', () => {
  const anidada: Definicion = {
    instruccion: '',
    bloques: [
      { titulo: 'a', nota: '', campos: [] },
      {
        tipo: 'pestanas',
        enLaRuta: 'ver',
        rotulo: 'r',
        pestanas: [
          { clave: 'uno', rotulo: 'Uno', bloques: [{ titulo: 'b', nota: '', campos: [] }] },
          { clave: 'dos', rotulo: 'Dos', bloques: [{ titulo: 'c', nota: '', campos: [] }, { titulo: 'd', nota: '', campos: [] }] },
        ],
      },
      { titulo: 'e', nota: '', campos: [] },
    ],
  };

  it('los de primer nivel conservan el indice de siempre, y los anidados siguen detras', () => {
    expect([...indicesDeLasPiezas(anidada)]).toEqual([
      ['0', 0],
      ['1', 1],
      ['2', 2],
      ['1.0', 3],
      ['1.1', 4],
      ['1.2', 5],
    ]);
    const titulos = recorrerLasPiezas(anidada).map(({ pieza }) => ('titulo' in pieza ? pieza.titulo : pieza.tipo));
    expect(titulos).toEqual(['a', 'pestanas', 'e', 'b', 'c', 'd']);
  });

  it('un bloque dentro de una pestana recibe SUS filas por ese indice', () => {
    const { container } = render(
      <Pantalla
        definicion={PESTANAS.definicion}
        datos={PESTANAS.datos}
        tonoDeLaInsignia={() => 'ok'}
        hoja={{ ruta: { sujeto: null, parametros: { ver: 'historial' } }, moverLaRuta: () => {} }}
      />,
    );
    expect(within(container.querySelector('[role="tabpanel"]') as HTMLElement).getByText('06/09/2026')).toBeTruthy();
  });

  it('`piezasSinRegistrar` encuentra la que va dentro de una pestana CERRADA', () => {
    const definicion: Definicion = {
      instruccion: '',
      bloques: [
        {
          tipo: 'pestanas',
          enLaRuta: 'ver',
          rotulo: 'r',
          pestanas: [
            { clave: 'uno', rotulo: 'Uno', bloques: [] },
            { clave: 'dos', rotulo: 'Dos', bloques: [{ tipo: 'delConsumidor', clave: 'escondida' }] },
          ],
        },
      ],
    };
    expect(piezasSinRegistrar(definicion, {})).toEqual(['escondida']);
  });
});

describe('`pestanas`', () => {
  const definicion = PESTANAS.definicion.bloques[0] as DefinicionDePestanas;

  it('la abierta es la de la ruta, y un valor que no es ninguna abre la primera', () => {
    expect(pestanaAbierta(definicion, 'historial')?.clave).toBe('historial');
    expect(pestanaAbierta(definicion, 'otra')?.clave).toBe('vigente');
    expect(pestanaAbierta(definicion, null)?.clave).toBe('vigente');
  });

  it('LA RUTA LA RESTITUYE: con `?ver=historial` sale abierta, y solo se dibuja la abierta', () => {
    render(
      <ConHoja
        inicial={{ sujeto: null, parametros: { ver: 'historial' } }}
        cambios={[]}
        definicion={PESTANAS.definicion}
        datos={PESTANAS.datos}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Movimientos (3)' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Vigente' }).getAttribute('aria-selected')).toBe('false');
    expect(screen.getByRole('heading', { name: 'El historial' })).toBeTruthy();
    // La cerrada NO se monta: la que no se pinta no pide.
    expect(screen.queryByRole('heading', { name: 'La version vigente' })).toBeNull();
    const panel = screen.getByRole('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe(screen.getByRole('tab', { name: 'Movimientos (3)' }).id);
  });

  it('CAMBIAR DE PESTANA ESCRIBE LA RUTA: el parametro y nada mas', async () => {
    const cambios: CambioDeLaRuta[] = [];
    const teclado = userEvent.setup({ delay: null });
    render(
      <ConHoja
        inicial={{ sujeto: '42', parametros: { filtro: 'x' } }}
        cambios={cambios}
        definicion={PESTANAS.definicion}
        datos={PESTANAS.datos}
      />,
    );
    await teclado.click(screen.getByRole('tab', { name: 'Movimientos (3)' }));
    expect(cambios, 'cambiar de pestana no escribio la ruta').toEqual([{ parametros: { ver: 'historial' } }]);
    expect(screen.getByRole('heading', { name: 'El historial' })).toBeTruthy();
  });

  it('EL TECLADO: el tabulador entra por la abierta, y ←/→/Inicio/Fin cambian de pestana', async () => {
    const cambios: CambioDeLaRuta[] = [];
    const teclado = userEvent.setup({ delay: null });
    render(
      <ConHoja
        inicial={{ sujeto: null, parametros: {} }}
        cambios={cambios}
        definicion={PESTANAS.definicion}
        datos={PESTANAS.datos}
      />,
    );
    await teclado.tab();
    expect(document.activeElement, 'el tabulador no entro por la pestana abierta').toBe(
      screen.getByRole('tab', { name: 'Vigente' }),
    );
    await teclado.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Movimientos (3)' }));
    expect(screen.getByRole('tab', { name: 'Movimientos (3)' }).getAttribute('aria-selected')).toBe('true');
    await teclado.keyboard('{ArrowRight}');
    // Da la vuelta.
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Vigente' }));
    await teclado.keyboard('{End}');
    await teclado.keyboard('{Home}');
    expect(cambios).toEqual([
      { parametros: { ver: 'historial' } },
      { parametros: { ver: 'vigente' } },
      { parametros: { ver: 'historial' } },
      { parametros: { ver: 'vigente' } },
    ]);
    // Y del tab se sale al panel, no a la otra pestana: tabulador itinerante.
    await teclado.tab();
    expect(document.activeElement).toBe(screen.getByRole('tabpanel'));
  });

  it('sin hoja, la eleccion vive en la pieza y se cambia igual', async () => {
    const teclado = userEvent.setup({ delay: null });
    render(<Pantalla definicion={PESTANAS.definicion} datos={PESTANAS.datos} tonoDeLaInsignia={() => 'ok'} />);
    await teclado.click(screen.getByRole('tab', { name: 'Movimientos (3)' }));
    expect(screen.getByRole('heading', { name: 'El historial' })).toBeTruthy();
  });

  it('la ruta y el marco llegan a `nombrados`: `cuando` y las plantillas los leen', () => {
    const definicion: Definicion = {
      instruccion: '',
      bloques: [
        { tipo: 'aviso', tono: 'info', titulo: { plantilla: 'Ejercicio {marco.ejercicio}' } },
        { tipo: 'aviso', tono: 'info', titulo: 'Solo en el historial', cuando: { dato: 'ruta.ver', vale: 'historial' } },
      ],
    };
    const { rerender } = render(
      <ConHoja inicial={{ sujeto: null, parametros: {} }} cambios={[]} definicion={definicion} datos={{ ausencia: SIN_FRASE }} />,
    );
    expect(screen.getByText('Ejercicio 2026')).toBeTruthy();
    expect(screen.queryByText('Solo en el historial')).toBeNull();
    rerender(
      <ConHoja
        key="otra"
        inicial={{ sujeto: null, parametros: { ver: 'historial' } }}
        cambios={[]}
        definicion={definicion}
        datos={{ ausencia: SIN_FRASE }}
      />,
    );
    expect(screen.getByText('Solo en el historial')).toBeTruthy();
  });

  it('lo que el sistema pone en `nombrados` con el mismo nombre GANA a lo de la hoja', () => {
    const hoja: HojaDelMarco = { ruta: { sujeto: '1', parametros: {} }, marco: { ejercicio: '2026' }, moverLaRuta: () => {} };
    const juntos = nombradosConLaHoja(hoja, new Map([['marco.ejercicio', '2030']]));
    expect(juntos?.get('marco.ejercicio')).toBe('2030');
    expect(juntos?.get('ruta.sujeto')).toBe('1');
    // Y sin hoja, el MISMO objeto: una pieza del consumidor que compare por identidad no ve nada.
    const suyos = new Map([['a', 'b']]);
    expect(nombradosConLaHoja(undefined, suyos)).toBe(suyos);
  });
});

describe('`maestro-detalle`', () => {
  it('LA RUTA LO RESTITUYE: el elegido sale con `aria-selected`, y el detalle con su cabecera', () => {
    render(
      <ConHoja
        inicial={{ sujeto: '42', parametros: {} }}
        cambios={[]}
        definicion={MAESTRO.definicion}
        datos={MAESTRO.datos}
      />,
    );
    const lista = screen.getByRole('listbox', { name: 'Registros' });
    const segundo = within(lista).getByRole('option', { name: /Segundo/ });
    expect(segundo.getAttribute('aria-selected')).toBe('true');
    expect(within(lista).getByRole('option', { name: /Primero/ }).getAttribute('aria-selected')).toBe('false');
    expect(segundo.textContent).toContain('Dos · A-42');
    expect(screen.getByRole('heading', { name: 'Registro 42' })).toBeTruthy();
    expect(screen.getByText('Calle Uno 123')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Lo que se sabe' })).toBeTruthy();
  });

  it('ELEGIR ESCRIBE LA RUTA: el sujeto, y nada mas', async () => {
    const cambios: CambioDeLaRuta[] = [];
    const teclado = userEvent.setup({ delay: null });
    render(<ConHoja inicial={{ sujeto: null, parametros: { ver: 'x' } }} cambios={cambios} definicion={MAESTRO.definicion} datos={MAESTRO.datos} />);
    expect(screen.getByText('Elija uno de la lista.')).toBeTruthy();
    await teclado.click(screen.getByRole('option', { name: /Primero/ }));
    expect(cambios, 'elegir en el maestro no escribio la ruta').toEqual([{ sujeto: '41' }]);
    expect(screen.getByRole('heading', { name: 'Registro 41' })).toBeTruthy();
  });

  it('EL TECLADO: el tabulador entra por el elegido, las flechas mueven el foco e Intro elige', async () => {
    const cambios: CambioDeLaRuta[] = [];
    const teclado = userEvent.setup({ delay: null });
    render(<ConHoja inicial={{ sujeto: '42', parametros: {} }} cambios={cambios} definicion={MAESTRO.definicion} datos={MAESTRO.datos} />);
    await teclado.tab();
    expect(document.activeElement, 'el tabulador no entro por el elegido').toBe(
      screen.getByRole('option', { name: /Segundo/ }),
    );
    await teclado.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(screen.getByRole('option', { name: /Primero/ }));
    // Mover el foco NO elige: elegir pide el detalle, y pedirlo en cada flecha es una lectura por tecla.
    expect(cambios).toEqual([]);
    await teclado.keyboard('{Enter}');
    expect(cambios).toEqual([{ sujeto: '41' }]);
    await teclado.keyboard('{End}');
    expect(document.activeElement).toBe(screen.getByRole('option', { name: /Segundo/ }));
    await teclado.keyboard(' ');
    expect(cambios).toEqual([{ sujeto: '41' }, { sujeto: '42' }]);
  });

  it('en un parametro y no en el sujeto, si la definicion lo dice', async () => {
    const cambios: CambioDeLaRuta[] = [];
    const [pieza] = MAESTRO.definicion.bloques;
    const definicion: Definicion = { instruccion: '', bloques: [{ ...pieza, enLaRuta: 'registro' }] };
    render(<ConHoja inicial={{ sujeto: null, parametros: { registro: '41' } }} cambios={cambios} definicion={definicion} datos={MAESTRO.datos} />);
    expect(screen.getByRole('option', { name: /Primero/ }).getAttribute('aria-selected')).toBe('true');
    await userEvent.setup({ delay: null }).click(screen.getByRole('option', { name: /Segundo/ }));
    expect(cambios).toEqual([{ parametros: { registro: '42' } }]);
  });

  it('un elegido que NO vino en la lista: el detalle se dibuja igual, y lo dice encima', () => {
    const { container } = render(
      <ConHoja inicial={{ sujeto: '99', parametros: {} }} cambios={[]} definicion={MAESTRO.definicion} datos={MAESTRO.datos} />,
    );
    expect(container.querySelector('[data-no-esta-en-la-lista="99"]')?.textContent).toBe(
      'El elegido no esta en esta pagina de la lista.',
    );
    expect(screen.getByRole('heading', { name: 'Registro 99' })).toBeTruthy();
    expect(screen.getAllByRole('option').every((o) => o.getAttribute('aria-selected') === 'false')).toBe(true);
  });

  it('con la lista PIDIENDO: sus barras en su columna, y no se dice que el elegido no esta', () => {
    const { container } = render(
      <ConHoja
        inicial={{ sujeto: '99', parametros: {} }}
        cambios={[]}
        definicion={MAESTRO.definicion}
        datos={{ ...MAESTRO.datos, lecturas: new Map([['lista', { estado: 'pidiendo' }]]) }}
      />,
    );
    const maestro = container.querySelector('[data-slot="maestro"]');
    expect(maestro?.querySelector('[data-estado-de-la-lectura="pidiendo"]')).not.toBeNull();
    expect(screen.queryByRole('listbox')).toBeNull();
    // Todavia no se sabe: decir «no esta» mientras se pide seria mentir.
    expect(container.querySelector('[data-no-esta-en-la-lista]')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Registro 99' })).toBeTruthy();
  });

  it('con la lista declarada y SIN estado, lo dice; con la lista vacia, su frase', () => {
    const { container, unmount } = render(
      <ConHoja inicial={{ sujeto: null, parametros: {} }} cambios={[]} definicion={MAESTRO.definicion} datos={{ ausencia: SIN_FRASE }} />,
    );
    expect(container.querySelector('[data-lectura-sin-estado="lista"]')?.textContent).toBe(
      TEXTOS_DE_LAS_PIEZAS.lecturaSinEstado('lista'),
    );
    unmount();
    const vacia = render(
      <ConHoja
        inicial={{ sujeto: null, parametros: {} }}
        cambios={[]}
        definicion={MAESTRO.definicion}
        datos={{ ...MAESTRO.datos, listas: new Map([['registros', []]]) }}
      />,
    );
    expect(vacia.container.querySelector('[data-slot="maestro-vacio"]')?.textContent).toBe('Ningun registro coincide.');
  });

});

describe('el acto abierto, en la ruta (`actoEnLaRuta`)', () => {
  const [acto] = MUESTRAS_DE_LOS_ACTOS['acto-con-observacion'].definicion.bloques;
  const definicion: Definicion = {
    instruccion: '',
    bloques: [
      { titulo: 'Grupos', nota: '', campos: [], acciones: [{ rotulo: 'Abrir un grupo', abre: 'abrir', con: { desde: { desde: 'grupo' } } }] },
      acto,
    ],
  };
  const datos: DatosDeLaPantalla = { ausencia: SIN_FRASE, nombrados: new Map([['grupo', '7']]) };

  it('abrir el acto ESCRIBE la ruta con lo que la accion le pasa, y la ruta lo RESTITUYE', async () => {
    const cambios: CambioDeLaRuta[] = [];
    const teclado = userEvent.setup({ delay: null });
    // `actoAbierto: null` en `extra` es la senal de `ConHoja` para cablear `actoEnLaRuta`.
    const { unmount } = render(
      <ConHoja inicial={{ sujeto: '1', parametros: { ver: 'x' } }} cambios={cambios} definicion={definicion} datos={datos} extra={{ actoAbierto: null, actos: { abrir: () => {} } }} />,
    );
    expect(screen.queryByRole('heading', { name: 'Abrir un grupo' })).toBeNull();
    await teclado.click(screen.getByRole('button', { name: 'Abrir un grupo' }));
    expect(cambios, 'abrir el acto no escribio la ruta').toEqual([{ parametros: { desde: '7', acto: 'abrir' } }]);
    expect(screen.getByRole('heading', { name: 'Abrir un grupo' })).toBeTruthy();
    unmount();

    // Recargar: la ruta que quedo escrita, y nada mas.
    render(
      <ConHoja
        inicial={{ sujeto: '1', parametros: { ver: 'x', desde: '7', acto: 'abrir' } }}
        cambios={[]}
        definicion={definicion}
        datos={datos}
        extra={{ actoAbierto: null, actos: { abrir: () => {} } }}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Abrir un grupo' }), 'recargar no restituyo el acto abierto').toBeTruthy();
  });

  it('cerrarlo quita `acto` y nada mas', () => {
    const cambios: CambioDeLaRuta[] = [];
    const hoja: HojaDelMarco = { ruta: { sujeto: null, parametros: { acto: 'abrir', ver: 'x' } }, moverLaRuta: (c) => cambios.push(c) };
    const { actoAbierto, alAbrirActo } = actoEnLaRuta(hoja);
    expect(actoAbierto).toEqual({ clave: 'abrir', parametros: { ver: 'x' } });
    alAbrirActo(null);
    expect(cambios).toEqual([{ parametros: { acto: null } }]);
  });
});
