import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { diaDeUnaFecha, fechaDeUnDia, fechaLeida } from '../shadcn/fecha.ts';
import { cambioAlElegir, eleccionDe, momentoDeLaEleccion, valorElegido } from './campos-en-la-ruta.ts';
import type { DatosDeLaPantalla } from './datos.ts';
import { EL_SUJETO, type CambioDeLaRuta, type HojaDelMarco, type RutaDeLaHoja } from './hoja.ts';
import { MUESTRAS_DE_LOS_CAMPOS_EN_LA_RUTA } from './muestras-de-los-campos-en-la-ruta.ts';
import { Pantalla, type PantallaProps } from './Pantalla.tsx';
import type { DefinicionDeBloque, DefinicionDePantalla, OpcionDelCampo, PiezaDeLaPantalla, Texto } from './tipos.ts';

/**
 * **Lo que se elige en un campo sale del bloque: vive en la ruta de la hoja** (#94).
 *
 * Hasta este issue el interprete se guardaba lo tecleado en el estado de `<Pantalla>` y no lo
 * publicaba por ningun sitio —ni en `nombrados`, ni por una `prop`—, asi que una caja de filtro no
 * podia acotar nada: la pagina y el orden llegaban a la ruta, y un filtro no.
 *
 * Se prueban las dos mitades por separado, como manda la casa: las reglas puras sin montar nada, y
 * el cableado montando la pantalla con una hoja de prueba —la ruta en un estado, cada cambio
 * anotado— que es el marco sin el hash.
 */

const SIN_FRASE = { enElCampo: '—', explicacion: '', tono: 'info' } as const;

const RUTA_VACIA: RutaDeLaHoja = { sujeto: null, parametros: {} };

/** Una hoja de prueba: la ruta en un estado, y cada cambio anotado. Es el marco, sin el hash. */
function ConHoja({
  inicial = RUTA_VACIA,
  cambios,
  definicion,
  datos = { ausencia: SIN_FRASE },
  extra = {},
}: {
  readonly inicial?: RutaDeLaHoja;
  readonly cambios: CambioDeLaRuta[];
  readonly definicion: DefinicionDePantalla<PiezaDeLaPantalla>;
  readonly datos?: DatosDeLaPantalla;
  readonly extra?: Partial<PantallaProps>;
}) {
  const [ruta, setRuta] = useState<RutaDeLaHoja>(inicial);
  const hoja: HojaDelMarco = {
    ruta,
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
  return <Pantalla definicion={definicion} datos={datos} tonoDeLaInsignia={() => 'ok'} hoja={hoja} {...extra} />;
}

/** Una hoja de una sola caja de busqueda que escribe al salir. */
const CON_BUSCADOR: DefinicionDePantalla<PiezaDeLaPantalla> = {
  instruccion: 'Acote.',
  bloques: [
    {
      titulo: 'Catalogo',
      nota: '',
      campos: [{ etiqueta: 'Buscar', tipo: 't', eleccion: { enLaRuta: 'descripcion' } }],
    },
  ],
};

describe('las reglas puras: quien escribe, cuando, que vale y que movimiento produce', () => {
  it('un campo de solo lectura no declara eleccion, y uno de entrada si', () => {
    expect(eleccionDe({ etiqueta: 'Cobrado', tipo: 'r' })).toBeUndefined();
    expect(eleccionDe({ etiqueta: 'Buscar', tipo: 't' })).toBeUndefined();
    expect(eleccionDe({ etiqueta: 'Buscar', tipo: 't', eleccion: { enLaRuta: 'q' } })).toEqual({ enLaRuta: 'q' });
  });

  it('el momento por omision sale del TIPO: de un gesto, `alElegir`; tecleado, `alSalir`', () => {
    const conEleccion = { eleccion: { enLaRuta: 'q' } } as const;
    expect(momentoDeLaEleccion({ etiqueta: 'A', tipo: 's', opciones: ['uno'], ...conEleccion })).toBe('alElegir');
    expect(momentoDeLaEleccion({ etiqueta: 'A', tipo: 'd', ...conEleccion })).toBe('alElegir');
    // El ancho completo no cambia el control, asi que tampoco el momento.
    expect(momentoDeLaEleccion({ etiqueta: 'A', tipo: 'd1', ...conEleccion })).toBe('alElegir');
    expect(momentoDeLaEleccion({ etiqueta: 'A', tipo: 't', ...conEleccion })).toBe('alSalir');
    expect(momentoDeLaEleccion({ etiqueta: 'A', tipo: '', ...conEleccion })).toBe('alSalir');
    expect(momentoDeLaEleccion({ etiqueta: 'A', tipo: 'a', ...conEleccion })).toBe('alSalir');
  });

  it('y lo declarado gana al del tipo', () => {
    expect(
      momentoDeLaEleccion({ etiqueta: 'A', tipo: 'd', eleccion: { enLaRuta: 'q', cuando: 'alSalir' } }),
    ).toBe('alSalir');
    expect(
      momentoDeLaEleccion({ etiqueta: 'A', tipo: 't', eleccion: { enLaRuta: 'q', cuando: 'alElegir' } }),
    ).toBe('alElegir');
  });

  it('lo que vale hoy sale de la ruta, y el sujeto tambien es un sitio', () => {
    const ruta: RutaDeLaHoja = { sujeto: 'A-1', parametros: { descripcion: 'bodega' } };
    expect(valorElegido({ etiqueta: 'B', tipo: 't', eleccion: { enLaRuta: 'descripcion' } }, ruta)).toBe('bodega');
    expect(valorElegido({ etiqueta: 'B', tipo: 't', eleccion: { enLaRuta: EL_SUJETO } }, ruta)).toBe('A-1');
    // Sin declararlo no hay nada que restituir, aunque la ruta traiga un parametro con ese nombre.
    expect(valorElegido({ etiqueta: 'B', tipo: 't' }, ruta)).toBeUndefined();
    expect(valorElegido({ etiqueta: 'B', tipo: 't', eleccion: { enLaRuta: 'otra' } }, ruta)).toBeUndefined();
  });

  describe('el movimiento que produce elegir', () => {
    const conDosTablas: DefinicionDeBloque<Texto, OpcionDelCampo> = {
      titulo: 'B',
      nota: '',
      campos: [{ etiqueta: 'Buscar', tipo: 't', eleccion: { enLaRuta: 'descripcion' } }],
      tabla: {
        titulo: 'Una',
        columnas: [],
        paginacion: { en: 'servidor', enLaRuta: 'pagina', tamano: 20, hayMas: 'hayMas' },
      },
      tablas: [
        {
          titulo: 'Otra',
          clave: 'otra',
          columnas: [],
          paginacion: { en: 'cliente', enLaRuta: 'paginaDeLaOtra', tamano: 10 },
        },
      ],
    };

    it('lleva el valor Y devuelve a la primera pagina las tablas del bloque, en UN cambio', () => {
      expect(cambioAlElegir(conDosTablas, { enLaRuta: 'descripcion' }, 'bodega')).toEqual({
        parametros: { pagina: '0', paginaDeLaOtra: '0', descripcion: 'bodega' },
      });
    });

    it('un valor vacio QUITA el parametro: `?descripcion=` no es haber elegido nada', () => {
      expect(cambioAlElegir(conDosTablas, { enLaRuta: 'descripcion' }, '')).toEqual({
        parametros: { pagina: '0', paginaDeLaOtra: '0', descripcion: null },
      });
    });

    it('un bloque sin tablas mueve un solo sitio', () => {
      const bloque: DefinicionDeBloque<Texto, OpcionDelCampo> = { titulo: 'B', nota: '', campos: [] };
      expect(cambioAlElegir(bloque, { enLaRuta: 'fecha' }, '2026-03-15')).toEqual({
        parametros: { fecha: '2026-03-15' },
      });
    });

    it('el sujeto es un sitio, y va aparte de los parametros', () => {
      const bloque: DefinicionDeBloque<Texto, OpcionDelCampo> = { titulo: 'B', nota: '', campos: [] };
      expect(cambioAlElegir(bloque, { enLaRuta: EL_SUJETO }, 'A-1')).toEqual({ sujeto: 'A-1' });
    });

    it('si una tabla pagina en el MISMO sitio que el campo, gana el campo', () => {
      // Es una definicion mal escrita; de las dos formas de salir mal, perder la pagina se ve y
      // perder el filtro no.
      const chocan: DefinicionDeBloque<Texto, OpcionDelCampo> = {
        titulo: 'B',
        nota: '',
        campos: [],
        tabla: {
          titulo: 'Una',
          columnas: [],
          paginacion: { en: 'servidor', enLaRuta: 'q', tamano: 20, hayMas: 'hayMas' },
        },
      };
      expect(cambioAlElegir(chocan, { enLaRuta: 'q' }, 'bodega')).toEqual({ parametros: { q: 'bodega' } });
    });
  });
});

describe('una fecha viaja en ISO y se lee en dd/mm/aaaa', () => {
  it('el dia elegido se compone con sus partes LOCALES', () => {
    // Marzo es el 2 en `Date`. Y las nueve de la noche del 15 en Lima siguen siendo el 15.
    expect(fechaDeUnDia(new Date(2026, 2, 15, 21, 4))).toBe('2026-03-15');
    expect(fechaDeUnDia(new Date(2026, 0, 1))).toBe('2026-01-01');
  });

  it('y se vuelve a leer como el MISMO dia, en cualquier zona', () => {
    const dia = diaDeUnaFecha('2026-03-15');
    expect(dia?.getFullYear()).toBe(2026);
    expect(dia?.getMonth()).toBe(2);
    expect(dia?.getDate()).toBe(15);
    // La ida y la vuelta, que es lo que `new Date('2026-03-15')` NO da: ese es medianoche UTC, y
    // leido en Lima —UTC-5— es el dia de antes. Aqui no se afirma contra la zona del corredor —que
    // es UTC y taparia justo el caso—, sino contra la unica propiedad que tiene que valer siempre.
    expect(dia === undefined ? '' : fechaDeUnDia(dia)).toBe('2026-03-15');
    for (const fecha of ['2026-01-01', '2026-12-31', '2026-07-28']) {
      const leido = diaDeUnaFecha(fecha);
      expect(leido === undefined ? '' : fechaDeUnDia(leido)).toBe(fecha);
    }
  });

  it('lo que no es una fecha no se adivina', () => {
    expect(diaDeUnaFecha('15/03/2026')).toBeUndefined();
    expect(diaDeUnaFecha('ayer')).toBeUndefined();
    expect(diaDeUnaFecha('')).toBeUndefined();
    // Y un dia que no existe no se corre a marzo en silencio.
    expect(diaDeUnaFecha('2026-02-31')).toBeUndefined();
  });

  it('lo que se lee lleva las dos cifras, y lo que no es ISO sale tal cual', () => {
    expect(fechaLeida('2026-03-15')).toBe('15/03/2026');
    expect(fechaLeida('15 de marzo')).toBe('15 de marzo');
  });
});

describe('lo que ya estaba en la ruta rellena el campo al montar (AC-2)', () => {
  it('la caja de busqueda ensena lo que acota', () => {
    render(
      <ConHoja
        inicial={{ sujeto: null, parametros: { descripcion: 'bodega' } }}
        cambios={[]}
        definicion={CON_BUSCADOR}
      />,
    );
    expect(screen.getByRole('textbox', { name: /Buscar/ })).toHaveValue('bodega');
  });

  it('y la fecha la ensena como se lee, no como viaja', () => {
    render(
      <ConHoja
        inicial={{ sujeto: null, parametros: { fecha: '2026-03-15' } }}
        cambios={[]}
        definicion={MUESTRAS_DE_LOS_CAMPOS_EN_LA_RUTA['dia-en-la-ruta'].definicion}
      />,
    );
    // El nombre del disparador de una fecha ES lo que lleva escrito: ver `Pantalla.test.tsx`.
    expect(screen.getByRole('button', { name: '15/03/2026' })).toBeTruthy();
  });

  it('sin `enLaRuta`, la ruta NO rellena nada aunque traiga un parametro con ese nombre', () => {
    const sinEleccion: DefinicionDePantalla<PiezaDeLaPantalla> = {
      instruccion: '',
      bloques: [{ titulo: 'B', nota: '', campos: [{ etiqueta: 'Buscar', tipo: 't' }] }],
    };
    render(
      <ConHoja
        inicial={{ sujeto: null, parametros: { descripcion: 'bodega' } }}
        cambios={[]}
        definicion={sinEleccion}
      />,
    );
    expect(screen.getByRole('textbox', { name: /Buscar/ })).toHaveValue('');
  });
});

describe('cuando se escribe (AC-1)', () => {
  it('`alSalir`: teclear NO mueve la ruta, y salir del campo la mueve UNA vez', async () => {
    const cambios: CambioDeLaRuta[] = [];
    render(<ConHoja cambios={cambios} definicion={CON_BUSCADOR} />);
    const caja = screen.getByRole('textbox', { name: /Buscar/ });
    await userEvent.type(caja, 'bodega');
    // Seis teclas, cero direcciones: es la razon de ser de `alSalir`.
    expect(cambios).toEqual([]);
    expect(caja).toHaveValue('bodega');
    await userEvent.tab();
    expect(cambios).toEqual([{ parametros: { descripcion: 'bodega' } }]);
    // Y lo que se ve sigue siendo lo escrito, ahora desde la ruta.
    expect(screen.getByRole('textbox', { name: /Buscar/ })).toHaveValue('bodega');
  });

  it('Intro tambien lo escribe, sin salir del campo', async () => {
    const cambios: CambioDeLaRuta[] = [];
    render(<ConHoja cambios={cambios} definicion={CON_BUSCADOR} />);
    await userEvent.type(screen.getByRole('textbox', { name: /Buscar/ }), 'bodega{Enter}');
    expect(cambios).toEqual([{ parametros: { descripcion: 'bodega' } }]);
  });

  it('salir sin haber escrito nada no vuelve a pedir lo mismo', async () => {
    const cambios: CambioDeLaRuta[] = [];
    render(
      <ConHoja
        inicial={{ sujeto: null, parametros: { descripcion: 'bodega' } }}
        cambios={cambios}
        definicion={CON_BUSCADOR}
      />,
    );
    await userEvent.click(screen.getByRole('textbox', { name: /Buscar/ }));
    await userEvent.tab();
    expect(cambios).toEqual([]);
  });

  it('borrar lo escrito y salir QUITA el parametro', async () => {
    const cambios: CambioDeLaRuta[] = [];
    render(
      <ConHoja
        inicial={{ sujeto: null, parametros: { descripcion: 'bodega' } }}
        cambios={cambios}
        definicion={CON_BUSCADOR}
      />,
    );
    await userEvent.clear(screen.getByRole('textbox', { name: /Buscar/ }));
    await userEvent.tab();
    expect(cambios).toEqual([{ parametros: { descripcion: null } }]);
    expect(screen.getByRole('textbox', { name: /Buscar/ })).toHaveValue('');
  });

  it('`alElegir`: escribe en cuanto cambia, sin esperar a salir', async () => {
    // Se ejerce sobre un campo de texto —que declara `alElegir` a mano— y no sobre una lista, a
    // proposito: abrir un desplegable de Radix bajo jsdom contagia de lentitud a todo lo que venga
    // despues en el mismo archivo (ver `shadcn/piezas.test.tsx`). Que una lista sea `alElegir` por
    // omision lo dice la regla pura de arriba, sin montar nada.
    const cambios: CambioDeLaRuta[] = [];
    const alTeclear: DefinicionDePantalla<PiezaDeLaPantalla> = {
      instruccion: '',
      bloques: [
        {
          titulo: 'B',
          nota: '',
          campos: [{ etiqueta: 'Estado', tipo: 't', eleccion: { enLaRuta: 'estado', cuando: 'alElegir' } }],
        },
      ],
    };
    render(<ConHoja cambios={cambios} definicion={alTeclear} />);
    await userEvent.type(screen.getByRole('textbox', { name: /Estado/ }), 'ab');
    // Una direccion por tecla: es lo que `alSalir` evita, y por eso es el valor por omision de lo
    // que se teclea.
    expect(cambios).toEqual([{ parametros: { estado: 'a' } }, { parametros: { estado: 'ab' } }]);
  });
});

describe('cambiar el filtro vuelve a la primera pagina, en un solo movimiento (AC-3)', () => {
  it('la pagina de la tabla del bloque se reinicia con el mismo cambio', async () => {
    const cambios: CambioDeLaRuta[] = [];
    render(
      <ConHoja
        inicial={{ sujeto: null, parametros: { pagina: '7' } }}
        cambios={cambios}
        definicion={MUESTRAS_DE_LOS_CAMPOS_EN_LA_RUTA['filtro-en-la-ruta'].definicion}
        datos={MUESTRAS_DE_LOS_CAMPOS_EN_LA_RUTA['filtro-en-la-ruta'].datos}
      />,
    );
    await userEvent.type(screen.getByRole('textbox', { name: /Buscar/ }), 'bodega');
    await userEvent.tab();
    // UNO, y con las dos cosas dentro: con dos movimientos habria una direccion intermedia —el
    // filtro nuevo con la pagina 7— que alguien pide.
    expect(cambios).toHaveLength(1);
    expect(cambios[0]).toEqual({ parametros: { pagina: '0', descripcion: 'bodega' } });
  });
});

describe('sin ello, el campo se comporta exactamente como hoy (AC-1 y AC-4)', () => {
  it('un campo sin `eleccion` no mueve la ruta, y lo tecleado se ve', async () => {
    const cambios: CambioDeLaRuta[] = [];
    const sinEleccion: DefinicionDePantalla<PiezaDeLaPantalla> = {
      instruccion: '',
      bloques: [{ titulo: 'B', nota: '', campos: [{ etiqueta: 'Nota', tipo: 't' }] }],
    };
    render(<ConHoja cambios={cambios} definicion={sinEleccion} />);
    await userEvent.type(screen.getByRole('textbox', { name: /Nota/ }), 'hola');
    await userEvent.tab();
    expect(cambios).toEqual([]);
    expect(screen.getByRole('textbox', { name: /Nota/ })).toHaveValue('hola');
  });

  it('y sin `hoja` un campo que SI la declara sigue escribiendose, en la pantalla', async () => {
    render(
      <Pantalla definicion={CON_BUSCADOR} datos={{ ausencia: SIN_FRASE }} tonoDeLaInsignia={() => 'ok'} />,
    );
    await userEvent.type(screen.getByRole('textbox', { name: /Buscar/ }), 'bodega');
    await userEvent.tab();
    expect(screen.getByRole('textbox', { name: /Buscar/ })).toHaveValue('bodega');
  });
});

describe('un filtro no es trabajo sin guardar', () => {
  it('escribir en un campo que va a la ruta NO ensucia la hoja', async () => {
    const alEnsuciar = vi.fn();
    render(<ConHoja cambios={[]} definicion={CON_BUSCADOR} extra={{ alEnsuciar }} />);
    await userEvent.type(screen.getByRole('textbox', { name: /Buscar/ }), 'bodega');
    await userEvent.tab();
    expect(alEnsuciar).not.toHaveBeenCalled();
  });

  it('y un campo normal SI la ensucia, aunque el filtro se haya tocado antes', async () => {
    // Es el motivo por el que lo que va a la ruta se guarda aparte: `alEnsuciar` solo avisa la
    // primera vez que el saco pasa de vacio a lleno, asi que un filtro metido en el mismo saco
    // habria dejado a la hoja sin avisar nunca mas.
    const alEnsuciar = vi.fn();
    const mixto: DefinicionDePantalla<PiezaDeLaPantalla> = {
      instruccion: '',
      bloques: [
        {
          titulo: 'B',
          nota: '',
          campos: [
            { etiqueta: 'Buscar', tipo: 't', eleccion: { enLaRuta: 'descripcion' } },
            { etiqueta: 'Nota', tipo: 't' },
          ],
        },
      ],
    };
    render(<ConHoja cambios={[]} definicion={mixto} extra={{ alEnsuciar }} />);
    await userEvent.type(screen.getByRole('textbox', { name: /Buscar/ }), 'bodega');
    expect(alEnsuciar).not.toHaveBeenCalled();
    await userEvent.type(screen.getByRole('textbox', { name: /Nota/ }), 'ab');
    expect(alEnsuciar).toHaveBeenCalledTimes(1);
  });
});

describe('EL CENTINELA: las muestras de #94 son las dos, y se dibujan', () => {
  it('estan las dos claves, ni una mas', () => {
    expect(Object.keys(MUESTRAS_DE_LOS_CAMPOS_EN_LA_RUTA).sort()).toEqual(['dia-en-la-ruta', 'filtro-en-la-ruta']);
  });

  it('el filtro se monta con su tabla y sus filas', () => {
    const muestra = MUESTRAS_DE_LOS_CAMPOS_EN_LA_RUTA['filtro-en-la-ruta'];
    render(<ConHoja cambios={[]} definicion={muestra.definicion} datos={muestra.datos} />);
    expect(screen.getByRole('textbox', { name: /Buscar/ })).toBeTruthy();
    expect(screen.getByText('Venta al por menor en puestos')).toBeTruthy();
  });

  it('el dia se monta con su marcador mientras no hay ninguno elegido', () => {
    const muestra = MUESTRAS_DE_LOS_CAMPOS_EN_LA_RUTA['dia-en-la-ruta'];
    render(<ConHoja cambios={[]} definicion={muestra.definicion} datos={muestra.datos} />);
    expect(screen.getByRole('button', { name: 'dd/mm/aaaa' })).toBeTruthy();
  });
});

/**
 * **Lo que NO se prueba aqui, y donde se prueba: elegir un dia EN el calendario.**
 *
 * Lo que el calendario entrega pasa solo por `onSelect`, y para llegar ahi hay que **abrir la
 * capa**. Bajo jsdom eso no cabe, y esta medido de tres maneras:
 *
 *   · escrita con `userEvent` en este archivo: **118 s**, y caducada a los 5 s;
 *   · con `fireEvent`, cuadros inmediatos y `pretendToBeVisual` apagado, al final de este archivo:
 *     pasa sola en **7 s** —el archivo va de 3,4 s a 37 s—, pero **dentro de `yarn test` entero
 *     vuelve a caducar**: `Test timed out in 5000ms` con los otros cuarenta y nueve archivos
 *     corriendo al lado;
 *   · en su propio archivo `capa-*`, que es lo que manda #11: con cuatro archivos de capa
 *     `yarn test:capas` deja de caber y caducan **tres de los cuatro**, los de #11 incluidos.
 *
 * Asi que se queda **sin prueba de jsdom**, a proposito y escrito: lo que compone el valor
 * —`fechaDeUnDia`— se prueba puro aqui arriba, y **el gesto entero se prueba en un navegador de
 * verdad**, en el consumidor que lo pide: `caja`#98 recorre con Playwright la hoja `cierre-caja`,
 * elige un dia en este mismo calendario y comprueba que la direccion queda en `?fecha=aaaa-mm-dd`.
 * Es donde abrir una capa cuesta milisegundos en vez de dos minutos.
 */
