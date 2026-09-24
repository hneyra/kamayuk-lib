import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { indiceDelCatalogo, type Catalogo, type HojaDelCatalogo } from './catalogo.ts';
import type { AvisoDeLaRuta } from './contexto.tsx';
import { useRutaDeLaHoja } from './hoja-abierta.ts';
import { useNavegacionGuardada } from './navegacion-guardada.ts';

/**
 * **Dos condiciones que #119 movió de `Cascara` a sus hooks sin que ninguna prueba las mirara.**
 *
 * Las encontró la verificación independiente de #119: quitadas, las 144 pruebas del armazón
 * seguían verdes. Las dos estaban ya en la base (`Armazon.tsx` de `f514a03`), así que el hueco es
 * anterior a #119; lo que #119 hizo fue sacarlas a un sitio donde se pueden mirar sin montar el
 * armazón entero, y aquí se miran.
 *
 * <h2>(1) Ir a la hoja que ya está abierta no pregunta</h2>
 *
 * `irA` abre el aviso de cambios sin guardar cuando se SALE de una hoja sucia. Pedir la misma hoja
 * —otro sujeto desde la pantalla, o un clic en la hoja abierta del árbol— no es salir de ella: la
 * `key` es por destino, así que la pantalla no se desmonta y nada de lo tecleado se pierde.
 * Preguntar ahí sería ofrecer «Salir y perder los cambios» para no perder ninguno.
 *
 * <h2>(2) Lo ignorado de la dirección se avisa una vez por DIRECCIÓN</h2>
 *
 * No una vez por hoja: dentro de la misma hoja, cada dirección nueva que trae algo que la hoja no
 * declara es un aviso nuevo. Y tampoco una vez por pintada.
 */

const CATALOGO: Catalogo = [
  {
    clave: 'almacen',
    rotulo: 'Almacen',
    nota: 'Lo que entra y lo que sale',
    icono: 'capas',
    destinos: [
      { clave: 'alm-panel', rotulo: 'Panel del almacen', seEscribe: false },
      {
        clave: 'registros',
        rotulo: 'Registros',
        seEscribe: false,
        enLaRuta: { sujeto: true, parametros: ['ver'] },
      },
    ],
  },
];

const INDICE = indiceDelCatalogo(CATALOGO);

function hojaDe(clave: string): HojaDelCatalogo {
  const hoja = INDICE.get(clave);
  if (hoja === undefined) throw new Error(`el catalogo de la prueba no trae ${clave}`);
  return hoja;
}

function enLaDireccion(inicial: string) {
  return function Envoltura({ children }: { readonly children: ReactNode }) {
    return <MemoryRouter initialEntries={[inicial]}>{children}</MemoryRouter>;
  };
}

describe('(1) `irA` hacia la hoja que ya esta abierta y SUCIA no pregunta', () => {
  function montar() {
    const registros = hojaDe('registros');
    return renderHook(
      () => {
        const guardada = useNavegacionGuardada({
          indice: INDICE,
          hoja: registros,
          sucias: new Set(['registros']),
          limpiar: () => {},
          guardar: undefined,
          alIgnorar: () => {},
          alIrse: () => {},
        });
        const { pathname, search } = useLocation();
        return { ...guardada, direccion: pathname + search };
      },
      { wrapper: enLaDireccion('/registros/41') },
    );
  }

  it('otro sujeto de la MISMA hoja, desde la pantalla: se abre sin aviso', () => {
    const { result } = montar();
    let salida: string | undefined;
    act(() => {
      salida = result.current.navegacion.ir({ hoja: 'registros', sujeto: 'A/42' });
    });
    expect(salida, 'ir a otro sujeto de la hoja abierta abrio el aviso de perder los cambios').toBe('abierta');
    expect(result.current.pendiente).toBeNull();
    expect(result.current.direccion).toBe('/registros/A%2F42');
  });

  it('la hoja abierta pedida otra vez —el clic en el arbol—: se abre sin aviso', () => {
    const { result } = montar();
    let salida: string | undefined;
    act(() => {
      salida = result.current.irA('registros');
    });
    expect(salida, 'pedir la hoja abierta abrio el aviso de perder los cambios').toBe('abierta');
    expect(result.current.pendiente).toBeNull();
  });

  it('EL CENTINELA: hacia OTRA hoja, con la misma hoja sucia, si pregunta', () => {
    const { result } = montar();
    let salida: string | undefined;
    act(() => {
      salida = result.current.irA('alm-panel');
    });
    expect(salida).toBe('pregunta');
    expect(result.current.pendiente).toEqual({ hacia: 'alm-panel' });
    expect(result.current.direccion).toBe('/registros/41');
  });
});

describe('(2) lo que la direccion trae y la hoja no declara se avisa una vez por DIRECCION', () => {
  function montar(inicial: string) {
    const avisos: AvisoDeLaRuta[] = [];
    const registros = hojaDe('registros');
    const hook = renderHook(
      () => {
        // En linea a proposito, como la escribiria un sistema: cambia de identidad en cada pintada.
        const { ruta } = useRutaDeLaHoja(registros, (aviso) => avisos.push(aviso));
        return { ruta, navegar: useNavigate() };
      },
      { wrapper: enLaDireccion(inicial) },
    );
    const irA = (direccion: string) =>
      act(() => {
        void hook.result.current.navegar(direccion);
      });
    return { ...hook, avisos, irA };
  }

  it('dos direcciones de la MISMA hoja con cosas distintas no declaradas: dos avisos', () => {
    const { avisos, irA } = montar('/registros/41?orden=desc');
    expect(avisos).toEqual([{ destino: 'registros', ignorados: ['?orden'] }]);

    irA('/registros/41?colado=x');
    expect(avisos, 'la segunda direccion de la misma hoja no aviso: se avisa una vez por HOJA').toEqual([
      { destino: 'registros', ignorados: ['?orden'] },
      { destino: 'registros', ignorados: ['?colado'] },
    ]);
  });

  it('otra direccion con LO MISMO ignorado tambien avisa: es otra direccion', () => {
    const { avisos, irA } = montar('/registros/41?ver=vigente&orden=desc');
    irA('/registros/42?ver=historial&orden=desc');
    expect(avisos, 'la misma cosa ignorada en otra direccion no aviso').toEqual([
      { destino: 'registros', ignorados: ['?orden'] },
      { destino: 'registros', ignorados: ['?orden'] },
    ]);
  });

  it('volver a pintar SIN cambiar de direccion no avisa otra vez', () => {
    const { avisos, rerender } = montar('/registros/41?orden=desc');
    rerender();
    rerender();
    expect(avisos, 'una pintada sin direccion nueva volvio a avisar').toEqual([
      { destino: 'registros', ignorados: ['?orden'] },
    ]);
  });

  it('EL CENTINELA: una direccion sin nada ignorado no avisa', () => {
    const { avisos, irA } = montar('/registros/41?ver=vigente');
    irA('/registros/42?ver=historial');
    expect(avisos).toEqual([]);
  });
});
