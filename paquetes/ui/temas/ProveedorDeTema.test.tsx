import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IDENTIDADES, ProveedorDeTema, useTema } from './ProveedorDeTema.tsx';

/** Una pantalla de mentira que ensena el tema y deja cambiarlo. */
function Mando() {
  const { identidad, modo, fijarIdentidad, fijarModo } = useTema();
  return (
    <div>
      <span data-testid="identidad">{identidad}</span>
      <span data-testid="modo">{modo ?? 'sistema'}</span>
      <button onClick={() => { fijarIdentidad('sepia'); }}>sepia</button>
      <button onClick={() => { fijarModo('oscuro'); }}>oscuro</button>
      <button onClick={() => { fijarModo(null); }}>seguir al sistema</button>
    </div>
  );
}

const CONFIGURACION = { identidadPorOmision: 'institucional', prefijoDeClaves: 'kamayuk.pruebas' } as const;

const montar = () =>
  render(
    <ProveedorDeTema configuracion={CONFIGURACION}>
      <Mando />
    </ProveedorDeTema>,
  );

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-tema');
  document.documentElement.removeAttribute('data-modo');
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('los dos ejes se estampan en <html>', () => {
  it('sin nada guardado, el tema es el del servicio y el modo el del sistema', () => {
    montar();

    expect(document.documentElement.getAttribute('data-tema')).toBe('institucional');
    // AUSENTE, no «claro»: ausente significa «lo que diga el equipo». Estampar `claro` congelaria
    // en claro a quien tenga el sistema en oscuro.
    expect(document.documentElement.hasAttribute('data-modo')).toBe(false);
    expect(screen.getByTestId('modo').textContent).toBe('sistema');
  });

  it('cambiar la identidad la estampa y la recuerda', async () => {
    montar();
    await userEvent.click(screen.getByRole('button', { name: 'sepia' }));

    expect(document.documentElement.getAttribute('data-tema')).toBe('sepia');
    expect(localStorage.getItem('kamayuk.pruebas.tema')).toBe('sepia');
  });

  it('y al volver a montar, la eleccion gana al valor del servicio', () => {
    localStorage.setItem('kamayuk.pruebas.tema', 'alto-contraste');
    montar();

    expect(screen.getByTestId('identidad').textContent).toBe('alto-contraste');
  });

  it('elegir modo lo estampa; volver al sistema QUITA el atributo', async () => {
    montar();
    await userEvent.click(screen.getByRole('button', { name: 'oscuro' }));
    expect(document.documentElement.getAttribute('data-modo')).toBe('oscuro');

    await userEvent.click(screen.getByRole('button', { name: 'seguir al sistema' }));
    // `removeAttribute` y no `data-modo=""`: es lo que devuelve el mando a `prefers-color-scheme`.
    expect(document.documentElement.hasAttribute('data-modo')).toBe(false);
    expect(localStorage.getItem('kamayuk.pruebas.modo')).toBeNull();
  });
});

describe('`clasico`, la cuarta identidad (#56)', () => {
  const conClasico = () =>
    render(
      <ProveedorDeTema configuracion={{ identidadPorOmision: 'clasico', prefijoDeClaves: 'kamayuk.pruebas' }}>
        <Mando />
      </ProveedorDeTema>,
    );

  it('un servicio la trae por omision y se estampa en `data-tema`', () => {
    conClasico();

    expect(document.documentElement.getAttribute('data-tema')).toBe('clasico');
    expect(screen.getByTestId('identidad').textContent).toBe('clasico');
    // La identidad no toca el otro eje: el modo sigue siendo el del sistema.
    expect(document.documentElement.hasAttribute('data-modo')).toBe(false);
  });

  it('recordada, se RESPETA: no cae a la del servicio como un tema que ya no existe', () => {
    // Es la mitad que el tipo no ve. `IDENTIDADES` decide que valor recordado se aplica; con
    // `clasico` en `Identidad` y fuera de esa lista, elegirla funcionaria y recargar la olvidaria.
    localStorage.setItem('kamayuk.pruebas.tema', 'clasico');
    montar();

    expect(screen.getByTestId('identidad').textContent).toBe('clasico');
    expect(document.documentElement.getAttribute('data-tema')).toBe('clasico');
  });

  it('esta en `IDENTIDADES`, que es la lista que los mandos de los sistemas ofrecen', () => {
    expect(IDENTIDADES).toContain('clasico');
  });
});

describe('lo que no puede tumbar la aplicacion', () => {
  it('un tema guardado que ya no existe se ignora, no se estampa', () => {
    // Estamparlo dejaria `data-tema="tierra"` sin una sola regla que lo defina, y la pantalla
    // saldria sin colores — peor que ignorarlo.
    localStorage.setItem('kamayuk.pruebas.tema', 'tierra');
    montar();

    expect(document.documentElement.getAttribute('data-tema')).toBe('institucional');
  });

  it('un almacenamiento que LANZA al leer no impide montar', () => {
    // En una ventana privada, con las cookies bloqueadas o con el disco lleno, `localStorage`
    // lanza al leer. Sin el `try`, la aplicacion entera no monta por no poder recordar una
    // preferencia: se cambia una molestia por una pantalla en blanco.
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('acceso denegado'); },
      setItem: () => { throw new Error('acceso denegado'); },
      removeItem: () => { throw new Error('acceso denegado'); },
    });

    expect(() => montar()).not.toThrow();
    expect(document.documentElement.getAttribute('data-tema')).toBe('institucional');
  });

  it('`useTema` fuera del proveedor revienta en vez de inventar un tema', () => {
    // Devolver uno por omision dejaria una pantalla que se ve bien y cuyo mando no hace nada,
    // que es el defecto que mas tarda en encontrarse.
    expect(() => render(<Mando />)).toThrow(/fuera de <ProveedorDeTema>/);
  });

  it('las dos claves no nombran ninguna credencial', async () => {
    montar();
    await userEvent.click(screen.getByRole('button', { name: 'sepia' }));
    await userEvent.click(screen.getByRole('button', { name: 'oscuro' }));

    const vigiladas = /token|jwt|bearer|credencial|contrasena|acceso|sesion/i;
    const claves = Object.keys(localStorage);
    expect(claves.length).toBeGreaterThan(0);
    expect(claves.filter((c) => vigiladas.test(c))).toEqual([]);
  });
});
