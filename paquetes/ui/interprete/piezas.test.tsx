import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { TEXTOS_DE_LAS_PIEZAS, TEXTOS_DEL_INTERPRETE } from '../textos.tsx';
import { piezasSinRegistrar, resolverTexto, seCumple } from './componer.ts';
import { coordenada, type DatosDeLaPantalla, type EstadoDeUnaLectura } from './datos.ts';
import { MUESTRA_DEL_PUNTO_DE_EXTENSION, MUESTRAS_DEL_INTERPRETE } from './muestras.ts';
import { Pantalla, type PantallaProps } from './Pantalla.tsx';
import type { PropsDeUnaPiezaDelConsumidor } from './PiezaDeLaPantalla.tsx';
import type { DefinicionDePantalla, PiezaDeLaPantalla } from './tipos.ts';

/**
 * **Las piezas de #44: el punto de extension y los estados de una lectura, y los seis huecos que
 * se componen con ellos.**
 *
 * Cada `describe` es un hueco de la tabla de #44 —con su nombre de `HUECOS.md`— o el AC-2. Las
 * definiciones son neutras por lo mismo que en `Pantalla.test.tsx`: una prueba de la libreria
 * escrita con las palabras de un sistema es la API de ese sistema con otro nombre.
 */

type Definicion = DefinicionDePantalla<PiezaDeLaPantalla>;

const SIN_FRASE = { enElCampo: '—', explicacion: '', tono: 'info' } as const;

const monta = (definicion: Definicion, datos: Partial<DatosDeLaPantalla> = {}, extra: Partial<PantallaProps> = {}) =>
  render(
    <Pantalla
      definicion={definicion}
      datos={{ ausencia: SIN_FRASE, ...datos }}
      tonoDeLaInsignia={() => 'ok'}
      {...extra}
    />,
  );

const lecturas = (...pares: (readonly [string, EstadoDeUnaLectura])[]) => new Map(pares);

const FALLO: Extract<EstadoDeUnaLectura, { estado: 'fallo' }> = {
  estado: 'fallo',
  peldano: {
    titulo: 'No tiene el permiso que esta parte necesita',
    detalle: 'Falta el permiso de lectura.',
    remedio: 'Lo concede quien administra los permisos.',
    incidencia: 'INC-7F3A',
  },
  detalles: ['Campo pedido: nombre'],
  loQueFalta: 'Falta publicar el conjunto del ejercicio.',
};

describe('EL AC-2: el punto de extension', () => {
  const PiezaDePrueba = ({ clave, indice, datos, traducir, textos }: PropsDeUnaPiezaDelConsumidor) => (
    <p data-pieza-de-prueba={clave}>
      {traducir(`indice ${String(indice)}`)} {datos.nombrados?.get('dato')} {textos.datoAusente}
    </p>
  );

  it('una clave registrada monta SU componente, con los mismos datos, traducir y textos', () => {
    const recibido: PropsDeUnaPiezaDelConsumidor[] = [];
    const Espia = (props: PropsDeUnaPiezaDelConsumidor) => {
      recibido.push(props);
      return <PiezaDePrueba {...props} />;
    };
    const traducir = (t: string) => `«${t}»`;
    const datos: DatosDeLaPantalla = { ausencia: SIN_FRASE, nombrados: new Map([['dato', 'valor']]) };
    render(
      <Pantalla
        definicion={MUESTRA_DEL_PUNTO_DE_EXTENSION.definicion}
        datos={datos}
        tonoDeLaInsignia={() => 'ok'}
        traducir={traducir}
        textos={{ datoAusente: 'nada' }}
        piezas={{ registrada: Espia }}
      />,
    );

    expect(screen.getByText('«indice 0» valor nada')).toBeTruthy();
    const props = recibido.at(-1);
    expect(props?.clave).toBe('registrada');
    expect(props?.datos, 'la pieza no recibe LOS datos de la pantalla').toBe(datos);
    expect(props?.traducir, 'la pieza no recibe EL traducir del sistema').toBe(traducir);
    // Los dos sacos, fundidos con lo que el sistema paso: el suyo gana, el resto es el castellano.
    expect(props?.textos.datoAusente).toBe('nada');
    expect(props?.textos.registros(2)).toBe(TEXTOS_DEL_INTERPRETE.registros(2));
    expect(props?.textos.pidiendo).toBe(TEXTOS_DE_LAS_PIEZAS.pidiendo);
  });

  it('una clave SIN registrar dibuja un aviso visible que la nombra, y nunca un hueco en blanco', () => {
    const { container } = render(
      <Pantalla
        definicion={MUESTRA_DEL_PUNTO_DE_EXTENSION.definicion}
        datos={MUESTRA_DEL_PUNTO_DE_EXTENSION.datos}
        tonoDeLaInsignia={() => 'ok'}
        piezas={{ registrada: PiezaDePrueba }}
      />,
    );
    const aviso = container.querySelector('[data-pieza-sin-registrar="olvidada"]');
    expect(aviso, 'la clave «olvidada» no dejo NINGUN aviso: se dibujo un hueco en blanco').not.toBeNull();
    expect(aviso?.textContent).toBe(TEXTOS_DE_LAS_PIEZAS.piezaSinRegistrar('olvidada'));
    expect(aviso?.getAttribute('role'), 'el aviso no se anuncia').toBe('status');
    // Y la registrada, al lado, no se ve afectada.
    expect(container.querySelector('[data-pieza-de-prueba="registrada"]')).not.toBeNull();
    expect(container.querySelector('[data-pieza-sin-registrar="registrada"]')).toBeNull();
  });

  it('sin `piezas`, TODAS las claves avisan: no hay un registro por omision que las trague', () => {
    const { container } = monta(MUESTRA_DEL_PUNTO_DE_EXTENSION.definicion);
    expect(container.querySelectorAll('[data-pieza-sin-registrar]')).toHaveLength(2);
  });

  it('una clase de pieza que no existe REVIENTA diciendo cual, y no se dibuja como pieza del consumidor (#111)', () => {
    // Hasta #111 el ultimo `else` se quedaba con cualquier clase: esta salia como un aviso de
    // «pieza sin registrar» —o, con su clave registrada, como el componente de otro—. El compilador
    // ya no la deja escribir; lo que se prueba aqui es la que llega igual, forzada con `as`.
    const rara = { tipo: 'otra', clave: 'registrada' } as unknown as PiezaDeLaPantalla;
    const Nunca = () => <p data-pieza-de-prueba="nunca" />;
    expect(() => monta({ instruccion: '', bloques: [rara] }, {}, { piezas: { registrada: Nunca } })).toThrow(
      /«otra» no es una clase de pieza del interprete/,
    );
  });

  it('una clave heredada de `Object.prototype` no cuenta como registrada', () => {
    const { container } = monta({ instruccion: '', bloques: [{ tipo: 'delConsumidor', clave: 'toString' }] }, {}, { piezas: {} });
    expect(container.querySelector('[data-pieza-sin-registrar="toString"]')).not.toBeNull();
  });

  it('`piezasSinRegistrar` las lista sin montar nada, en orden y sin repetir', () => {
    const definicion: Definicion = {
      instruccion: '',
      bloques: [
        { tipo: 'delConsumidor', clave: 'b' },
        { titulo: 'x', nota: '', campos: [] },
        { tipo: 'delConsumidor', clave: 'a' },
        { tipo: 'delConsumidor', clave: 'b' },
        { tipo: 'delConsumidor', clave: 'c' },
      ],
    };
    expect(piezasSinRegistrar(definicion, { a: PiezaDePrueba })).toEqual(['b', 'c']);
    expect(piezasSinRegistrar(definicion, undefined)).toEqual(['b', 'a', 'c']);
  });

  it('con una lectura que no esta `con-datos`, el componente NO se monta', () => {
    const montadas: string[] = [];
    const Cuenta = ({ clave }: PropsDeUnaPiezaDelConsumidor) => {
      montadas.push(clave);
      return null;
    };
    monta(
      { instruccion: '', bloques: [{ tipo: 'delConsumidor', clave: 'x', lectura: { clave: 'l' } }] },
      { lecturas: lecturas(['l', { estado: 'pidiendo' }]) },
      { piezas: { x: Cuenta } },
    );
    expect(montadas).toEqual([]);
    expect(screen.getByText(TEXTOS_DE_LAS_PIEZAS.pidiendo)).toBeTruthy();
  });
});

describe('`estados-de-una-lectura`', () => {
  const bloque: Definicion = {
    instruccion: '',
    bloques: [
      {
        titulo: 'Detalle',
        nota: 'Lo que se sabe del registro.',
        campos: [{ etiqueta: 'Codigo', tipo: 'r' }],
        pie: 'Una linea al pie.',
        lectura: { clave: 'detalle', espera: 'Escriba el identificador y aqui saldra su detalle.' },
      },
    ],
  };

  it('en espera: la frase de la hoja, y ni un campo', () => {
    const { container } = monta(bloque, { lecturas: lecturas(['detalle', { estado: 'en-espera' }]) });
    expect(container.querySelector('[data-estado-de-la-lectura="en-espera"]')?.textContent).toBe(
      'Escriba el identificador y aqui saldra su detalle.',
    );
    expect(container.querySelector('[data-slot="dato"]')).toBeNull();
  });

  it('en espera SIN frase en la definicion: la del saco, nunca vacio', () => {
    const { container } = monta(
      { instruccion: '', bloques: [{ titulo: 'D', nota: '', campos: [], lectura: { clave: 'l' } }] },
      { lecturas: lecturas(['l', { estado: 'en-espera' }]) },
    );
    expect(container.querySelector('[data-estado-de-la-lectura="en-espera"]')?.textContent).toBe(
      TEXTOS_DE_LAS_PIEZAS.enEspera,
    );
  });

  it('pidiendo: barras, `aria-busy` y la palabra del saco. NUNCA una cifra', () => {
    const { container } = monta(bloque, { lecturas: lecturas(['detalle', { estado: 'pidiendo' }]) });
    const pidiendo = container.querySelector('[data-estado-de-la-lectura="pidiendo"]');
    expect(pidiendo?.getAttribute('aria-busy')).toBe('true');
    expect(pidiendo?.textContent).toBe(TEXTOS_DE_LAS_PIEZAS.pidiendo);
    expect(pidiendo?.textContent).not.toMatch(/\d/);
  });

  it('fallo: dibuja EL PELDANO RECIBIDO, linea a linea, y no lo traduce', () => {
    const { container } = monta(
      bloque,
      { lecturas: lecturas(['detalle', FALLO]) },
      { traducir: (t) => `«${t}»` },
    );
    const fallo = container.querySelector('[data-estado-de-la-lectura="fallo"]');
    expect(fallo, 'el bloque en fallo no dibujo ningun fallo').not.toBeNull();
    const dentro = within(fallo as HTMLElement);
    // Cada linea del peldano, TAL CUAL: sin comillas de traducir. El peldano ya viene en el idioma
    // de la sesion, y el detalle es lo que dijo el servidor.
    expect(dentro.getByText(FALLO.peldano.titulo)).toBeTruthy();
    expect(dentro.getByText(FALLO.peldano.detalle)).toBeTruthy();
    expect(dentro.getByText(FALLO.peldano.remedio ?? '')).toBeTruthy();
    expect(dentro.getByText('Campo pedido: nombre')).toBeTruthy();
    expect(dentro.getByText(FALLO.loQueFalta ?? '')).toBeTruthy();
    expect(dentro.getByText(TEXTOS_DE_LAS_PIEZAS.incidencia('INC-7F3A'))).toBeTruthy();
    // `mal` por omision, que es el que interrumpe al lector de pantalla.
    expect(fallo?.querySelector('[data-slot="alerta"]')?.getAttribute('data-tono')).toBe('mal');
  });

  it('fallo en un bloque: la cabecera y la nota SE QUEDAN, y el cuerpo entero se va', () => {
    const { container } = monta(bloque, { lecturas: lecturas(['detalle', FALLO]) });
    expect(screen.getByRole('heading', { name: 'Detalle' })).toBeTruthy();
    expect(screen.getByText('Lo que se sabe del registro.')).toBeTruthy();
    expect(container.querySelector('[data-slot="dato"]'), 'un campo sobrevivio al fallo').toBeNull();
    expect(container.querySelector('[data-slot="tarjeta-pie"]'), 'el pie sobrevivio al fallo').toBeNull();
  });

  it('el tono lo decide el sistema: `atencion` cuando no es una averia', () => {
    const { container } = monta(bloque, { lecturas: lecturas(['detalle', { ...FALLO, tono: 'atencion' }]) });
    expect(container.querySelector('[data-slot="alerta"]')?.getAttribute('data-tono')).toBe('atencion');
  });

  it('«Reintentar» SOLO sale si el sistema da con que, y se pulsa con el TECLADO', async () => {
    const teclado = userEvent.setup({ delay: null });
    const { unmount } = monta(bloque, { lecturas: lecturas(['detalle', FALLO]) });
    expect(screen.queryByRole('button', { name: TEXTOS_DE_LAS_PIEZAS.reintentar })).toBeNull();
    unmount();

    let veces = 0;
    monta(bloque, {
      lecturas: lecturas([
        'detalle',
        {
          ...FALLO,
          reintentar: () => {
            veces += 1;
          },
        },
      ]),
    });
    await teclado.tab();
    const boton = screen.getByRole('button', { name: TEXTOS_DE_LAS_PIEZAS.reintentar });
    expect(document.activeElement, 'el tabulador no llega a «Reintentar»').toBe(boton);
    await teclado.keyboard('{Enter}');
    await teclado.keyboard(' ');
    expect(veces).toBe(2);
  });

  it('con datos: el cuerpo, con su pie', () => {
    const { container } = monta(bloque, {
      lecturas: lecturas(['detalle', { estado: 'con-datos' }]),
      valores: new Map([[coordenada(0, 0), 'R-42']]),
    });
    expect(container.querySelector('[data-slot="dato"]')?.textContent).toBe('R-42');
    expect(container.querySelector('[data-estado-de-la-lectura]')).toBeNull();
    expect(container.querySelector('[data-slot="tarjeta-pie"]')?.textContent).toBe('Una linea al pie.');
  });

  it('una lectura declarada SIN estado en los datos lo dice, y no se inventa «pidiendo»', () => {
    const { container } = monta(bloque);
    const aviso = container.querySelector('[data-lectura-sin-estado="detalle"]');
    expect(aviso?.textContent).toBe(TEXTOS_DE_LAS_PIEZAS.lecturaSinEstado('detalle'));
    expect(container.querySelector('[data-estado-de-la-lectura="pidiendo"]')).toBeNull();
    expect(container.querySelector('[data-slot="dato"]')).toBeNull();
  });

  it('dos bloques, dos lecturas: un fallo en uno y datos en el otro, cada uno con lo suyo (#61 H7)', () => {
    const { container } = monta(
      {
        instruccion: '',
        bloques: [
          { titulo: 'Uno', nota: '', campos: [{ etiqueta: 'A', tipo: 'r' }], lectura: { clave: 'uno' } },
          { titulo: 'Dos', nota: '', campos: [{ etiqueta: 'B', tipo: 'r' }], lectura: { clave: 'dos' } },
        ],
      },
      {
        lecturas: lecturas(['uno', FALLO], ['dos', { estado: 'con-datos' }]),
        valores: new Map([[coordenada(1, 0), 'dato de dos']]),
      },
    );
    const [uno, dos] = [...container.querySelectorAll('[data-slot="tarjeta"]')];
    expect(uno?.querySelector('[data-estado-de-la-lectura="fallo"]')).not.toBeNull();
    expect(dos?.querySelector('[data-estado-de-la-lectura]')).toBeNull();
    expect(dos?.querySelector('[data-slot="dato"]')?.textContent).toBe('dato de dos');
  });
});

describe('`fallo-fuera-de-su-lectura`', () => {
  const { definicion, datos } = MUESTRAS_DEL_INTERPRETE['fallo-fuera-de-su-lectura'];

  it('el fallo de la vecina va ENCIMA, y la tabla que si llego sigue entera', () => {
    const { container } = monta(definicion, datos);
    const encima = container.querySelector('[data-fallo-de="catalogo"]');
    expect(encima).not.toBeNull();
    expect(within(encima as HTMLElement).getByText(FALLO.peldano.titulo)).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'G-01' })).toBeTruthy();
    // Y encima quiere decir ENCIMA: antes de la tabla en el orden del documento.
    const tabla = screen.getByRole('table');
    expect(encima?.compareDocumentPosition(tabla) === Node.DOCUMENT_POSITION_FOLLOWING).toBe(true);
  });

  it('la espera o el «pidiendo» de la vecina NO tapan nada, ni se dicen', () => {
    const { container } = monta(definicion, {
      ...datos,
      lecturas: lecturas(['principal', { estado: 'con-datos' }], ['catalogo', { estado: 'pidiendo' }]),
    });
    expect(container.querySelector('[data-fallo-de]')).toBeNull();
    expect(container.querySelector('[data-estado-de-la-lectura]')).toBeNull();
    expect(screen.getByRole('cell', { name: 'G-01' })).toBeTruthy();
  });

  it('si la propia tambien falla, el fallo de la propia ocupa el cuerpo y el de la vecina no se repite encima', () => {
    const { container } = monta(
      { instruccion: '', bloques: [{ titulo: 'T', nota: '', campos: [], lectura: { clave: 'p' }, fallosDe: ['p'] }] },
      { lecturas: lecturas(['p', FALLO]) },
    );
    expect(container.querySelectorAll('[data-estado-de-la-lectura="fallo"]')).toHaveLength(1);
  });

  it('vale para una pieza que no es un bloque: el fallo de una descarga encima de un aviso', () => {
    const { container } = monta(
      { instruccion: '', bloques: [{ tipo: 'aviso', tono: 'info', titulo: 'Documento', fallosDe: ['descarga'] }] },
      { lecturas: lecturas(['descarga', FALLO]) },
    );
    expect(container.querySelector('[data-fallo-de="descarga"]')).not.toBeNull();
    expect(screen.getByText('Documento')).toBeTruthy();
  });
});

describe('`pieza-condicional`', () => {
  const { definicion, datos } = MUESTRAS_DEL_INTERPRETE['pieza-condicional'];

  it('existe solo la pieza cuyo dato lo dice', () => {
    monta(definicion, datos);
    expect(screen.getByText('Este ejercicio no esta cerrado')).toBeTruthy();
    expect(screen.queryByText('El ejercicio esta cerrado')).toBeNull();
  });

  it('con el dato AUSENTE no existe ninguna: todavia no se sabe', () => {
    const { container } = monta(definicion, {});
    expect(container.querySelectorAll('[data-slot="alerta"]')).toHaveLength(0);
  });

  it('una pieza oculta CONSERVA su indice: el valor del bloque de detras no se corre', () => {
    const conOculta: Definicion = {
      instruccion: '',
      bloques: [
        { titulo: 'Oculto', nota: '', campos: [{ etiqueta: 'A', tipo: 'r' }], cuando: { dato: 'ver', vale: true } },
        { titulo: 'Visible', nota: '', campos: [{ etiqueta: 'B', tipo: 'r' }] },
      ],
    };
    const { container } = monta(conOculta, {
      nombrados: new Map([['ver', false]]),
      valores: new Map([
        [coordenada(0, 0), 'del oculto'],
        [coordenada(1, 0), 'del visible'],
      ]),
    });
    expect(container.querySelectorAll('[data-slot="dato"]')).toHaveLength(1);
    expect(container.querySelector('[data-slot="dato"]')?.textContent).toBe('del visible');
  });

  it('`seCumple`: `hay` distingue ausente, null y vacio de un `false`, y `vale` no convierte', () => {
    const n = new Map<string, string | boolean | null>([
      ['falso', false],
      ['nulo', null],
      ['vacio', ''],
      ['texto', 'false'],
    ]);
    expect(seCumple({ dato: 'falso', hay: true }, n)).toBe(true);
    expect(seCumple({ dato: 'nulo', hay: true }, n)).toBe(false);
    expect(seCumple({ dato: 'vacio', hay: true }, n)).toBe(false);
    expect(seCumple({ dato: 'ausente', hay: false }, n)).toBe(true);
    expect(seCumple({ dato: 'texto', vale: false }, n)).toBe(false);
    expect(seCumple({ dato: 'nulo', vale: null }, n)).toBe(true);
    expect(seCumple({ dato: 'ausente', vale: null }, n)).toBe(false);
    expect(seCumple(undefined, undefined)).toBe(true);
  });
});

describe('`no-puede-con-motivo`: un aviso, un texto que viene de un dato y una condicion', () => {
  const { definicion, datos } = MUESTRAS_DEL_INTERPRETE['no-puede-con-motivo'];

  it('la lectura contesto BIEN y trae motivo: aviso con el motivo, tal cual, y no un fallo', () => {
    const { container } = monta(definicion, datos, { traducir: (t) => `«${t}»` });
    const aviso = container.querySelector('[data-slot="alerta"]');
    expect(aviso?.getAttribute('data-tono')).toBe('atencion');
    expect(within(aviso as HTMLElement).getByText('«La derivacion no propuso nada»')).toBeTruthy();
    // El motivo lo dijo el servidor: no pasa por `traducir`.
    expect(within(aviso as HTMLElement).getByText('No hay geometria que cruzar.')).toBeTruthy();
    expect(container.querySelector('[data-estado-de-la-lectura]')).toBeNull();
  });

  it('sin motivo no hay aviso; y mientras se pide, se dice que se pide', () => {
    const { container, unmount } = monta(definicion, { lecturas: datos.lecturas });
    expect(container.querySelector('[data-slot="alerta"]')).toBeNull();
    unmount();
    const pidiendo = monta(definicion, { ...datos, lecturas: lecturas(['derivacion', { estado: 'pidiendo' }]) });
    expect(pidiendo.container.querySelector('[data-estado-de-la-lectura="pidiendo"]')).not.toBeNull();
  });
});

describe('`aviso`', () => {
  it('tono, titulo y parrafo, con las palabras traducidas', () => {
    const { container } = monta(MUESTRAS_DEL_INTERPRETE.aviso.definicion, {}, { traducir: (t) => `«${t}»` });
    const aviso = container.querySelector('[data-slot="alerta"]');
    expect(aviso?.getAttribute('data-tono')).toBe('info');
    expect(aviso?.getAttribute('role')).toBe('status');
    expect(screen.getByText('«Aqui no se cierra nada»')).toBeTruthy();
    expect(screen.getByText('«Lo que se lee es la copia local de un conjunto ya cerrado.»')).toBeTruthy();
  });

  it('`mal` se anuncia como `alert`; los demas, no', () => {
    const { container } = monta({ instruccion: '', bloques: [{ tipo: 'aviso', tono: 'mal', titulo: 'Riesgo' }] });
    expect(container.querySelector('[data-slot="alerta"]')?.getAttribute('role')).toBe('alert');
  });
});

describe('`texto-con-dato`', () => {
  const traducir = (t: string) => `«${t}»`;
  const n = new Map<string, string | boolean | null>([
    ['id', '42'],
    ['vista', 'historial'],
    ['activo', true],
  ]);

  it('la plantilla se traduce y DESPUES se pone el dato, que no se traduce', () => {
    expect(resolverTexto({ plantilla: 'Registro {id}' }, n, traducir, '—')).toBe('«Registro 42»');
  });

  it('`desde` es el dato tal cual; `segun` elige un caso y lo traduce', () => {
    expect(resolverTexto({ desde: 'id' }, n, traducir, '—')).toBe('42');
    expect(resolverTexto({ segun: 'vista', casos: { historial: 'El historial' } }, n, traducir, '—')).toBe(
      '«El historial»',
    );
    expect(resolverTexto({ segun: 'activo', casos: { true: 'Si', false: 'No' } }, n, traducir, '—')).toBe('«Si»');
  });

  it('un dato que no llego se escribe con la palabra del saco, y nunca un cero', () => {
    expect(resolverTexto({ plantilla: 'Registro {otro}' }, n, traducir, '—')).toBe('«Registro —»');
    expect(resolverTexto({ desde: 'otro' }, undefined, traducir, 'nada')).toBe('nada');
    expect(resolverTexto({ segun: 'vista', casos: {} }, n, traducir, 'nada')).toBe('nada');
    expect(resolverTexto({ segun: 'vista', casos: {}, otro: 'Otra vista' }, n, traducir, 'nada')).toBe('«Otra vista»');
  });

  it('en un bloque: el titulo segun el dato y la nota con dos datos dentro', () => {
    const { definicion, datos } = MUESTRAS_DEL_INTERPRETE['texto-con-dato'];
    monta(definicion, datos);
    expect(screen.getByRole('heading', { name: 'El historial' })).toBeTruthy();
    expect(screen.getByText('Registro 42 · Ejercicio 2026')).toBeTruthy();
  });
});

describe('`nota-al-pie-del-bloque`', () => {
  it('va DEBAJO de los campos y de la tabla, dentro de la tarjeta y fuera de la tabla', () => {
    const { container } = monta(
      {
        instruccion: '',
        bloques: [
          {
            titulo: 'El embudo',
            nota: '',
            campos: [{ etiqueta: 'Detectados', tipo: 'r' }],
            tabla: { titulo: 'Filas', columnas: [{ rotulo: 'Uno', alineadoDerecha: false }] },
            pie: 'Son cifras y no una proporcion, a proposito.',
          },
        ],
      },
      { filas: new Map([[0, [['fila']]]]) },
      { traducir: (t) => `«${t}»` },
    );
    const pie = container.querySelector('[data-slot="tarjeta-pie"]');
    expect(pie?.textContent).toBe('«Son cifras y no una proporcion, a proposito.»');
    expect(pie?.closest('[data-slot="tarjeta"]')).not.toBeNull();
    expect(pie?.closest('table')).toBeNull();
    const tabla = screen.getByRole('table');
    expect(tabla.compareDocumentPosition(pie as Node) === Node.DOCUMENT_POSITION_FOLLOWING).toBe(true);
    // Y es el ULTIMO hijo de la tarjeta: debajo de todo lo que explica.
    expect(pie?.closest('[data-slot="tarjeta"]')?.lastElementChild).toBe(pie);
  });
});

describe('`pie-de-operaciones`', () => {
  const { definicion } = MUESTRAS_DEL_INTERPRETE['pie-de-operaciones'];

  it('las operaciones van tal cual, en `<code>` y sin prefijo; lo de delante sale del saco', () => {
    const { container } = monta(definicion, {}, { traducir: (t) => `«${t}»` });
    const pie = container.querySelector('[data-slot="pie-de-operaciones"]');
    const codigos = [...(pie?.querySelectorAll('code') ?? [])].map((c) => c.textContent);
    expect(codigos).toEqual(['GET /recursos/{id}', 'POST /recursos', 'PUT /recursos/{id}']);
    expect(pie?.textContent).toContain(TEXTOS_DE_LAS_PIEZAS.lasQueLeen(1));
    expect(pie?.textContent).toContain(TEXTOS_DE_LAS_PIEZAS.lasQueEscriben(2));
    expect(pie?.textContent).toContain('«No hay ninguna lectura que liste todos los registros.»');
  });

  it('SIGUE AHI con todas las lecturas en fallo, que es cuando mas falta', () => {
    const { container } = monta(
      {
        instruccion: '',
        bloques: [
          { titulo: 'D', nota: '', campos: [], lectura: { clave: 'l' } },
          { tipo: 'aviso', tono: 'info', titulo: 'A', lectura: { clave: 'l' } },
          ...definicion.bloques,
        ],
      },
      { lecturas: lecturas(['l', FALLO]) },
    );
    expect(container.querySelectorAll('[data-estado-de-la-lectura="fallo"]')).toHaveLength(2);
    expect(container.querySelector('[data-slot="pie-de-operaciones"]')).not.toBeNull();
  });
});

describe('la ausencia de la pantalla entera', () => {
  it('con `explicacion: ""` no hay caja vacia arriba', () => {
    const { container } = monta({ instruccion: '', bloques: [] });
    expect(container.querySelector('[data-slot="alerta"]')).toBeNull();
  });

  it('con frase, la de siempre: `rentas` no cambia de aspecto', () => {
    const { container } = monta(
      { instruccion: '', bloques: [] },
      { ausencia: { enElCampo: 'x', explicacion: 'Sin conectar.', tono: 'info' } },
    );
    expect(container.querySelector('[data-slot="alerta"]')?.textContent).toBe('Sin conectar.');
  });
});

describe('LAS MUESTRAS: una por hueco, y todas se dibujan', () => {
  const LOS_OCHO = [
    'estados-de-una-lectura',
    'pie-de-operaciones',
    'aviso',
    'pieza-condicional',
    'texto-con-dato',
    'nota-al-pie-del-bloque',
    'no-puede-con-motivo',
    'fallo-fuera-de-su-lectura',
  ];

  it('EL CENTINELA: estan los ocho huecos de la tabla de #44, ni uno menos ni uno de mas', () => {
    expect(Object.keys(MUESTRAS_DEL_INTERPRETE).sort()).toEqual([...LOS_OCHO].sort());
  });

  it.each(Object.entries(MUESTRAS_DEL_INTERPRETE))('«%s» se dibuja sin avisos de costura rota', (_hueco, muestra) => {
    const { container } = monta(muestra.definicion, muestra.datos);
    expect(container.textContent?.trim()).not.toBe('');
    expect(container.querySelector('[data-pieza-sin-registrar], [data-lectura-sin-estado]')).toBeNull();
  });
});
