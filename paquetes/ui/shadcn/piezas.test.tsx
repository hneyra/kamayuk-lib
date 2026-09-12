import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Alerta,
  Area,
  Avance,
  Campo,
  CampoDelFormulario,
  Casilla,
  Dato,
  Desplegable,
  Etiqueta,
  Formulario,
  Opcion,
  Separador,
  Tabla,
  TablaCabecera,
  TablaCelda,
  TablaCuerpo,
  TablaFila,
  TablaNota,
  TablaRotulo,
  Tarjeta,
  TarjetaCabecera,
  TarjetaCampos,
  TarjetaNota,
} from '../index.ts';

/**
 * **Las once piezas hacen lo que dicen** (#11).
 *
 * <h2>Las dos que hay que ABRIR, y por que se insiste</h2>
 *
 * `Desplegable` y `Emergente` montan su contenido en un portal y **no existe en el DOM hasta que
 * se abren**. Una prueba que compruebe que «renderizan» pasa en verde con la lista rota: el
 * disparador se pinta, nadie lo pulsa, y el dia que la lista no monte la pantalla se ve entera y
 * no se puede elegir nada. Aqui se abren.
 *
 * <h2>Lo que jsdom no trae, y que Radix necesita</h2>
 *
 * `scrollIntoView` y la captura de puntero no estan implementadas en jsdom. Sin los tres remiendos
 * de abajo, `Desplegable` revienta con `target.hasPointerCapture is not a function` — que es un
 * fallo del entorno de prueba y no de la pieza.
 */

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
});

/**
 * `delay: null` y `pointerEventsCheck: 0`, y no es afinar: sin ellos estas pruebas tardaban
 * **210 s** y tres reventaban por tiempo. Radix pone `pointer-events: none` en el `body` mientras
 * una capa esta abierta, y `userEvent` se niega a pulsar lo que no recibe puntero — un cerrojo que
 * en un navegador de verdad no existe porque la capa SI recibe el puntero.
 */
const teclado = () => userEvent.setup({ delay: null, pointerEventsCheck: 0 });

/**
 * Las dos piezas que se ABREN —`Desplegable` y `Emergente`— tienen **un archivo cada una**, y no
 * por orden: abrir una capa de Radix bajo jsdom contagia de lentitud a todo lo que venga despues
 * en el mismo archivo, de forma acumulativa, hasta hacer caducar la llamada del trabajador al
 * proceso principal. Esta medido, y `capa-del-desplegable.test.tsx` lo cuenta con las cifras.
 *
 * Lo que SI se comprueba aqui del desplegable es lo que no necesita abrirlo: que es de lista
 * cerrada.
 */

describe('la tarjeta es la de V8, y no la de shadcn', () => {
  it('tiene filo azul y cabecera azul maciza', () => {
    render(
      <Tarjeta>
        <TarjetaCabecera>Ejercicio en curso</TarjetaCabecera>
        <TarjetaNota>La ultima corrida del padron.</TarjetaNota>
      </Tarjeta>,
    );
    const tarjeta = document.querySelector('[data-slot="tarjeta"]');
    // El filo azul es la diferencia con shadcn, que lo dibuja gris. Si esto cae, la pantalla se ve
    // «bien» y no se parece al artboard, que es el defecto mas caro de descubrir.
    expect(tarjeta?.className).toContain('border-azul');
    const cabecera = document.querySelector('[data-slot="tarjeta-cabecera"]');
    expect(cabecera?.className).toContain('bg-azul');
    // El titulo es un encabezado de verdad: es como se recorre la pantalla con lector.
    expect(screen.getByRole('heading', { name: 'Ejercicio en curso' })).toBeTruthy();
  });

  it('la rejilla estira el campo marcado de ancho completo', () => {
    render(
      <TarjetaCampos>
        <Etiqueta rotulo="Observaciones" ancho>
          <Area />
        </Etiqueta>
        <Etiqueta rotulo="Ejercicio">
          <Campo />
        </Etiqueta>
      </TarjetaCampos>,
    );
    const [ancho, normal] = [...document.querySelectorAll('[data-slot="etiqueta"]')];
    expect(ancho?.getAttribute('data-ancho')).toBe('1');
    expect(normal?.getAttribute('data-ancho')).toBe('0');
  });
});

describe('la etiqueta marca lo opcional y cuelga la ayuda', () => {
  it('marca lo opcional, y NO marca lo obligatorio', () => {
    render(
      <>
        <Etiqueta rotulo="Observaciones" opcional ayuda="Hasta 500 caracteres.">
          <Area />
        </Etiqueta>
        <Etiqueta rotulo="Ejercicio">
          <Campo />
        </Etiqueta>
      </>,
    );
    expect(screen.getAllByText('(opcional)')).toHaveLength(1);
    expect(screen.getByText('Hasta 500 caracteres.')).toBeTruthy();
  });

  it('el rotulo APUNTA al control, y sigue nombrandolo con ayuda puesta', () => {
    // La primera version envolvia al control, y con ayuda o error el nombre accesible del campo se
    // convertia en «Ejercicio Hasta 500 caracteres.». Ver el javadoc de `Etiqueta`.
    render(
      <Etiqueta rotulo="Ejercicio" ayuda="Hasta 500 caracteres.">
        <Campo />
      </Etiqueta>,
    );
    const campo = screen.getByLabelText('Ejercicio');
    expect(campo.getAttribute('data-slot')).toBe('campo');
    // Y la ayuda la DESCRIBE, que es otra cosa que nombrarla.
    expect(campo.getAttribute('aria-describedby')).toBe(
      screen.getByText('Hasta 500 caracteres.').getAttribute('id'),
    );
  });
});

describe('los tres controles de texto', () => {
  it('el campo escribe', async () => {
    const usuario = teclado();
    render(
      <Etiqueta rotulo="Contribuyente">
        <Campo />
      </Etiqueta>,
    );
    await usuario.type(screen.getByLabelText('Contribuyente'), 'Rufina');
    expect((screen.getByLabelText('Contribuyente') as HTMLInputElement).value).toBe('Rufina');
  });

  it('el dato de solo lectura NO es un campo desactivado: se lee y NO se envia', () => {
    render(<Dato>S/ 9,418,204.60</Dato>);
    const dato = document.querySelector('[data-slot="dato"]');
    // `<output>` y no `<input readonly>`: sigue en el recorrido del tabulador —quien navega con
    // teclado tiene que poder leer la cifra— y no viaja con el formulario.
    expect(dato?.tagName).toBe('OUTPUT');
    expect(dato?.hasAttribute('disabled')).toBe(false);
    expect(dato?.className).toContain('border-dashed');
  });

  it('un dato vacio pinta la raya, porque la ausencia de cifra tambien informa', () => {
    render(<Dato />);
    expect(document.querySelector('[data-slot="dato"]')?.textContent).toBe('—');
  });
});

describe('la casilla', () => {
  it('marca y desmarca, y lleva su rotulo dentro del filo', async () => {
    const usuario = teclado();
    render(<Casilla rotulo="Afecto al arbitrio" />);
    const casilla = screen.getByRole('checkbox', { name: 'Afecto al arbitrio' });
    expect(casilla.getAttribute('data-state')).toBe('unchecked');
    await usuario.click(casilla);
    expect(casilla.getAttribute('data-state')).toBe('checked');
  });
});

describe('el desplegable, sin abrirlo', () => {
  it('es de LISTA CERRADA: no hay donde teclear', () => {
    render(
      <Desplegable marcador="Elija">
        <Opcion value="2026">2026</Opcion>
      </Desplegable>,
    );
    // Un tributo o un ejercicio que no existe no debe poder escribirse. Si esto cayera, el
    // desplegable se habria convertido en un campo de texto con lista — que es otra pieza, la que
    // el artboard pide para el giro CIIU porque «son 1 842 y no caben en un Select».
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('combobox').tagName).not.toBe('INPUT');
  });
});

describe('el separador', () => {
  it('NO es decorativo por omision: separa lo que se consulta de lo que se escribe', () => {
    render(<Separador />);
    // `role="separator"` y no `none`: la separacion tiene significado y el lector debe anunciarla.
    expect(screen.getByRole('separator')).toBeTruthy();
  });
});

describe('la tabla', () => {
  it('alinea las cifras a la derecha con digitos de ancho fijo, y no parte la primera columna', () => {
    render(
      <Tabla>
        <TablaCabecera>
          <TablaFila>
            <TablaRotulo>Tributo</TablaRotulo>
            <TablaRotulo cifra>Emitido S/</TablaRotulo>
          </TablaFila>
        </TablaCabecera>
        <TablaCuerpo>
          <TablaFila>
            <TablaCelda identifica>Impuesto predial</TablaCelda>
            <TablaCelda cifra>9,418,204.60</TablaCelda>
          </TablaFila>
        </TablaCuerpo>
      </Tabla>,
    );
    const cifra = screen.getByRole('cell', { name: '9,418,204.60' });
    // Sin `tabular-nums`, «1,842» y «988» no alinean sus unidades y comparar dos importes de una
    // ojeada deja de ser posible — que es el uso principal de esta tabla.
    expect(cifra.className).toContain('tabular-nums');
    expect(cifra.className).toContain('text-right');
    expect(screen.getByRole('cell', { name: 'Impuesto predial' }).className).toContain('whitespace-nowrap');
  });

  it('las filas alternan papel, para poder seguir una hasta el final', () => {
    render(
      <Tabla>
        <TablaCuerpo>
          <TablaFila>
            <TablaCelda>par</TablaCelda>
          </TablaFila>
          <TablaFila impar>
            <TablaCelda>impar</TablaCelda>
          </TablaFila>
        </TablaCuerpo>
      </Tabla>,
    );
    const filas = screen.getAllByRole('row');
    expect(filas[0]?.className).toContain('bg-superficie');
    expect(filas[1]?.className).toContain('bg-sup');
  });

  it('el rotulo de columna es un `th` con `scope`, y la nota NO es una fila', () => {
    render(
      <>
        <Tabla>
          <TablaCabecera>
            <TablaFila>
              <TablaRotulo>Etapa</TablaRotulo>
            </TablaFila>
          </TablaCabecera>
        </Tabla>
        <TablaNota>El saldo por cobrar no es deuda perdida.</TablaNota>
      </>,
    );
    expect(screen.getByRole('columnheader', { name: 'Etapa' }).getAttribute('scope')).toBe('col');
    // La nota fuera de la tabla: dentro seria una fila mas y el lector la contaria como dato.
    expect(within(screen.getByRole('table')).queryByText(/deuda perdida/)).toBeNull();
  });
});

describe('la alerta', () => {
  it('el tono `mal` INTERRUMPE y los otros no', () => {
    render(
      <>
        <Alerta tono="mal" titulo="534 observados sin emision" />
        <Alerta tono="info" titulo="La amnistia termina el 31 de marzo" />
      </>,
    );
    // Un aviso que interrumpe al lector en cada cambio de pantalla deja de ser aviso y es ruido.
    expect(screen.getByRole('alert').textContent).toContain('534 observados');
    expect(screen.getByRole('status').textContent).toContain('amnistia');
  });

  it('lleva icono ADEMAS del color, que es lo que la hace legible sin distinguir colores', () => {
    render(<Alerta tono="ok" titulo="Conforme" />);
    const alerta = document.querySelector('[data-slot="alerta"]');
    expect(alerta?.querySelector('svg')).toBeTruthy();
    expect(alerta?.getAttribute('data-tono')).toBe('ok');
  });
});

describe('el avance', () => {
  it('escribe la cifra al lado, y no solo la barra', () => {
    render(<Avance valor={77.7} rotulo="Avance del predial" />);
    expect(screen.getByText('77.7 %')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Avance del predial' })).toBeTruthy();
  });

  it('«no se sabe» NO es cero: con `null` no se rellena nada', () => {
    const { rerender } = render(<Avance valor={null} rotulo="Corrida en marcha" />);
    expect(document.querySelector('[data-slot="avance-relleno"]')).toBeNull();
    expect(screen.getByText('—')).toBeTruthy();
    rerender(<Avance valor={0} rotulo="Corrida en marcha" />);
    // Cero SI se pinta: es una afirmacion —«no ha avanzado nada»— y `null` es la ausencia de ella.
    expect(document.querySelector('[data-slot="avance-relleno"]')).toBeTruthy();
    expect(screen.getByText('0.0 %')).toBeTruthy();
  });

  it('acota lo que se sale, en vez de pintar una barra mas larga que su caja', () => {
    render(<Avance valor={140} rotulo="Recaudado" />);
    expect(screen.getByText('100.0 %')).toBeTruthy();
  });
});

const esquema = z.object({
  ejercicio: z.string().regex(/^\d{4}$/, 'El ejercicio son cuatro digitos: 2026.'),
});

function FormularioDePrueba({ alEnviar }: { readonly alEnviar: (v: { ejercicio: string }) => void }) {
  const form = useForm<{ ejercicio: string }>({
    resolver: zodResolver(esquema),
    defaultValues: { ejercicio: '' },
  });
  return (
    <Formulario form={form} alEnviar={alEnviar}>
      <CampoDelFormulario<{ ejercicio: string }, 'ejercicio'> nombre="ejercicio" rotulo="Ejercicio">
        {(campo) => <Campo {...campo} />}
      </CampoDelFormulario>
      <button type="submit">Guardar</button>
    </Formulario>
  );
}

describe('el formulario dice QUE esta mal, y lo dice en la pieza', () => {
  it('el mensaje sale pegado al campo y ATADO a el', async () => {
    const usuario = teclado();
    render(<FormularioDePrueba alEnviar={() => {}} />);
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));

    const mensaje = await screen.findByText('El ejercicio son cuatro digitos: 2026.');
    const campo = screen.getByLabelText('Ejercicio');
    // Las DOS senales: el campo se pinta invalido y el mensaje le pertenece. Sin `describedby`, el
    // lector anuncia «Ejercicio, cuadro de edicion» y no dice que esta mal.
    expect(campo.getAttribute('aria-invalid')).toBe('true');
    expect(campo.getAttribute('aria-describedby')).toBe(mensaje.getAttribute('id'));
  });

  it('con el valor bueno, no llama al envio con basura', async () => {
    const usuario = teclado();
    const recibidos: { ejercicio: string }[] = [];
    render(<FormularioDePrueba alEnviar={(v) => recibidos.push(v)} />);

    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(recibidos, 'envio un formulario invalido').toHaveLength(0);

    await usuario.type(screen.getByLabelText('Ejercicio'), '2026');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(recibidos).toEqual([{ ejercicio: '2026' }]);
  });

  it('la validacion del navegador NO compite con la del esquema', () => {
    render(<FormularioDePrueba alEnviar={() => {}} />);
    // Con las dos activas salen DOS mensajes para el mismo campo, uno del esquema en castellano y
    // otro en el idioma del sistema operativo.
    expect(document.querySelector('form')?.hasAttribute('noValidate')).toBe(true);
  });
});
