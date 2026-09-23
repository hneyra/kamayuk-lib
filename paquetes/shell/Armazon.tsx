import { Fragment, useMemo, useState } from 'react';
import { Outlet, RouterProvider, createHashRouter, useLocation } from 'react-router-dom';

import { Avisos } from '../ui/index.ts';

import { AccionesAlPie } from './AccionesAlPie.tsx';
import { AvisoDeCambios } from './AvisoDeCambios.tsx';
import { BarraGlobal } from './BarraGlobal.tsx';
import { CabeceraDePantalla } from './CabeceraDePantalla.tsx';
import { CarrilDeModulos } from './CarrilDeModulos.tsx';
import { PaletaDelArmazon } from './PaletaDelArmazon.tsx';
import { destinoDeSlug, indiceDelCatalogo, type Catalogo, type HojaDelCatalogo } from './catalogo.ts';
import {
  ProveedorDeLaConfiguracion,
  ProveedorDeLaHoja,
  ProveedorDeLosTextos,
  useArmazon,
  useHoja,
  useTextos,
  type AvisoDeLaRuta,
  type ConfiguracionDelArmazon,
} from './contexto.tsx';
import { useHojaAbierta } from './hoja-abierta.ts';
import { useNavegacionGuardada } from './navegacion-guardada.ts';
import { ProveedorDeLaNavegacion } from './navegacion.tsx';
import { useCarril, usePaleta } from './paleta-y-carril.ts';
import { useRegistroDeHojas } from './registro-de-hojas.ts';
import { leerLaRuta } from './ruta.ts';
import { TEXTOS_DEL_ARMAZON, type TextosDelArmazon } from './textos.ts';

/**
 * **El armazón**: lo que rodea a la pantalla y es igual en los cuatro sistemas (#13).
 *
 * <h2>El enrutado es por HASH, y con `createHashRouter` (AC5)</h2>
 *
 * No se pasa a rutas de verdad, y el motivo no es de comodidad. Las cuatro interfaces las sirve el
 * mismo Traefik bajo su propio prefijo (ADR-0030 §2): una ruta real obligaría al servidor a
 * reescribir cualquier profundidad hacia `index.html`, en los cuatro. Y el retorno de la
 * autenticación es **la raíz de la aplicación** (`rentas`#73), con la URI de vuelta escrita en el
 * realm de Keycloak: con rutas reales, cada destino enlazable exigiría su propia URI de retorno
 * registrada, o la vuelta perdería la pantalla.
 *
 * La forma canónica es `#/<slug>`. Se navega con `replace` y jamás con `push`: abrir un destino no
 * es navegar, es cambiar de pantalla dentro de la misma aplicación, y en un turno de ventanilla se
 * abren decenas. Con `push`, el «atrás» del navegador habría que pulsarlo cuarenta veces para salir,
 * lo que convierte ese botón en una trampa.
 *
 * <h2>La tabla de rutas NO sale del catálogo, y desde #20 tampoco podría</h2>
 *
 * Hay **una sola ruta**, `*`, y lo que decide si se abre la pantalla o se dibuja el aviso es el
 * render: `useHojaDeLaRuta` busca el slug del `pathname` en el catálogo de hoy, y sin hoja se
 * dibuja `<DestinoNoOfrecido />`. La propiedad del AC4 es la misma —lo que el catálogo no trae no
 * se abre, ni por el hash— y ahora la sostiene **el mismo dato que dibuja las tres listas**, que es
 * lo que hace imposible que una diga una cosa y la otra diga otra.
 *
 * Hasta #20 había una ruta por destino ofrecido. Era correcto mientras el catálogo fuera
 * constante, y **no lo es nunca**: sale de cruzar tres operaciones del backend, así que en el
 * primer render no se sabe todavía. Un catálogo nuevo obligaba a un `createHashRouter` nuevo, y ahí
 * el armazón se caía con `useHoja() fuera de una pantalla`. La causa exacta está medida y no es
 * «el contexto se pierde»: `RouterProvider` guarda el estado del enrutador en un `useState`
 * **sembrado una sola vez**, así que con el enrutador nuevo la pintada siguiente usa todavía las
 * coincidencias del viejo, y `useRoutesImpl` las vuelve a apuntar contra el manifiesto NUEVO
 * *por el identificador de ruta* —`manifest[m.route.id] || m.route`, en `react-router@7.18.3`—.
 * Los identificadores son posicionales (`0-1`, `0-2`…), de modo que cambiar el catálogo reapunta
 * cada coincidencia a la ruta que por accidente ocupe ese hueco en la tabla nueva: donde caía una
 * ruta de destino se dibujaba `<Pantalla />` **sin que hubiera hoja**, y `useHoja()` reventaba.
 *
 * Con una ruta y nada más, el enrutador se construye **una vez** y esa ventana no existe.
 *
 * Lo que la cuenta no puede abrir tampoco sale en el árbol, ni en la paleta, ni en la miga, y por
 * la misma razón: las tres recorren el catálogo y no hay otro que recorrer.
 *
 * <h2>Y desde #19 tampoco escribe una palabra (`kamayuk-lib`#19)</h2>
 *
 * Las treinta y una cadenas que el marco decía por su cuenta —«Volver», «Guardar», «Buscar»,
 * «Seguir editando», el nombre de la región de avisos— entran por `textos`, con el castellano por
 * omisión. Sin eso, un sistema que traduzca sus pantallas se queda con **la pantalla a medias**: el
 * cuerpo traducido y el marco en castellano, que se lee como una traducción rota y no como un marco
 * sin traducir. Ver `textos.ts`.
 *
 * <h2>Y nada de aquí dentro nombra un sistema (AC2)</h2>
 *
 * Ni un módulo, ni un rótulo, ni una ruta de API, ni un slug. Todo lo que se dibuja entra por la
 * configuración. Lo vigila `sin-suponer-un-sistema`, que barre este paquete entero.
 */

/** Lo que se ve cuando no hay ningún destino abierto. */
function SinDestino() {
  const textos = useTextos();
  return (
    <div data-slot="sin-destino" className="grid flex-1 place-items-center p-[30px]">
      <p className="m-0 max-w-[44ch] text-center text-[14px] leading-[1.6] text-tinta-3 text-pretty">
        {textos.sinDestinoAbierto}
      </p>
    </div>
  );
}

/**
 * Lo que se ve cuando el hash pide algo que el catálogo no ofrece.
 *
 * **Se dice, no se redirige en silencio.** Un salto mudo a la raíz deja a quien siguió un enlace
 * viejo —o a quien no tiene permiso— mirando una pantalla vacía sin saber por qué; y al que depura,
 * sin nada que buscar.
 */
function DestinoNoOfrecido() {
  const textos = useTextos();
  return (
    <div data-slot="destino-no-ofrecido" className="grid flex-1 place-items-center p-[30px]">
      <p className="m-0 max-w-[52ch] text-center text-[14px] leading-[1.6] text-tinta-3 text-pretty">
        {textos.destinoNoOfrecido}
      </p>
    </div>
  );
}

/**
 * La pantalla del destino, que la dibuja el sistema y no el armazón.
 *
 * **Con `key` por destino** (#67, y lo que #61 llama H10): sin ella, dos destinos cuya pantalla es
 * el mismo componente en el mismo sitio comparten la instancia, y lo tecleado en uno aparece en el
 * siguiente —medido con `rentas`, cuyas cuarenta pantallas son el mismo `CuerpoDeLaPantalla`—. La
 * `key` es el DESTINO y no la ruta entera: cambiar de sujeto o de pestaña no desmonta la pantalla, que
 * es lo que deja a un maestro-detalle conservar su lista mientras cambia el detalle.
 */
function Pantalla() {
  const { pantalla } = useArmazon();
  const { hoja } = useHoja();
  return <Fragment key={hoja.destino.clave}>{pantalla(hoja)}</Fragment>;
}

/**
 * La hoja que pide la ruta actual, o `null` si la ruta no nombra ninguna.
 *
 * Desde #67 mira solo el PRIMER tramo: lo de detrás es el sujeto, y la hoja no deja de ser la misma
 * por tenerlo. Ver `ruta.ts`.
 */
function useHojaDeLaRuta(catalogo: Catalogo): {
  readonly hoja: HojaDelCatalogo | null;
  readonly indice: ReadonlyMap<string, HojaDelCatalogo>;
} {
  const { pathname } = useLocation();
  // El indice, UNA vez por catalogo (#119): hasta aqui se reconstruia en cada cambio de direccion, y
  // `Cascara` construia otro al lado.
  const indice = useMemo(() => indiceDelCatalogo(catalogo), [catalogo]);
  const hoja = useMemo(() => {
    const leida = leerLaRuta(pathname, '');
    const clave = leida === null ? null : destinoDeSlug(catalogo, leida.slug);
    return clave === null ? null : (indice.get(clave) ?? null);
  }, [catalogo, indice, pathname]);
  return { hoja, indice };
}

/** El aviso por omisión de lo que la dirección trae y la hoja no declara. No es texto de pantalla. */
function avisarEnLaConsola({ destino, ignorados }: AvisoDeLaRuta): void {
  console.warn(
    `[@kamayuk/shell] La direccion trae ${ignorados.join(', ')} y la hoja «${destino}» no lo declara ` +
      'en `enLaRuta`: se ignora y la hoja se abre sin ello.',
  );
}

/** Lo que rodea a la pantalla: la barra, el carril, la paleta, la cabecera y el pie. */
/**
 * Lo que rodea a la pantalla: la barra, el carril, la paleta, la cabecera y el pie.
 *
 * **Compone y nada más** (#119). Hasta aquí hacía nueve cosas en 353 líneas y 26 hooks; cada una
 * vive ahora en su hook —`useCarril` y `usePaleta` (`paleta-y-carril.ts`), `useRegistroDeHojas`
 * (`registro-de-hojas.ts`, un reductor puro con sus pruebas sin DOM), `useNavegacionGuardada`
 * (`navegacion-guardada.ts`) y `useHojaAbierta` con `useRutaDeLaHoja` (`hoja-abierta.ts`)— y lo que
 * queda es la maquetación. Lo mide `la-cascara-solo-compone.test.ts`.
 */
function Cascara() {
  const { catalogo, acciones = {}, pieDelCarril, marco, alIgnorarDeLaRuta = avisarEnLaConsola } = useArmazon();
  const textos = useTextos();
  const { hoja, indice } = useHojaDeLaRuta(catalogo);
  const carril = useCarril(hoja?.modulo.clave ?? null);
  const paleta = usePaleta();
  const registro = useRegistroDeHojas(hoja?.destino.clave ?? null);
  const { irA, pendiente, resolver, navegacion } = useNavegacionGuardada({
    indice,
    hoja,
    sucias: registro.sucias,
    limpiar: (clave) => {
      registro.cambiar({ tipo: 'limpiar', clave });
    },
    guardar: acciones.guardar,
    alIgnorar: alIgnorarDeLaRuta,
    alIrse: paleta.cerrar,
  });
  const deLaHoja = useHojaAbierta(hoja, registro, marco, alIgnorarDeLaRuta);
  const aSangre = hoja?.destino.aSangre === true;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-fondo">
      <BarraGlobal carrilAbierto={carril.abierto} alAlternarCarril={carril.alternar} alAbrirLaPaleta={paleta.abrir} />

      <PaletaDelArmazon
        catalogo={catalogo}
        abierta={paleta.abierta}
        consulta={paleta.consulta}
        alEscribir={paleta.setConsulta}
        alCerrar={paleta.cerrar}
        alIr={irA}
      />

      <AvisoDeCambios
        rotulo={pendiente === null ? null : (hoja?.destino.rotulo ?? '')}
        alGuardarYCerrar={() => {
          resolver('guardar');
        }}
        alSalirSinGuardar={() => {
          resolver('descartar');
        }}
        alSeguirEditando={() => {
          resolver('seguir');
        }}
      />

      <div className="flex min-h-0 flex-1 items-stretch overflow-hidden">
        <CarrilDeModulos
          catalogo={catalogo}
          filtro={carril.filtro}
          alFiltrar={carril.setFiltro}
          moduloDesplegado={carril.moduloDesplegado}
          alDesplegar={carril.setModuloDesplegado}
          destinoActual={hoja?.destino.clave ?? null}
          sucias={registro.sucias}
          alIr={irA}
          pie={pieDelCarril}
          enCajon={carril.enCajon}
          abierto={carril.abierto}
          alCerrarElCajon={carril.cerrar}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/*
            A sangre (#67): el desplazamiento y el margen dejan de ser del marco. La cabecera y el pie
            se quedan fijos arriba y abajo, y la pantalla ocupa el alto que queda con el suyo propio.
          */}
          <div
            data-slot="cuerpo-del-marco"
            data-a-sangre={aSangre ? '' : undefined}
            className={aSangre ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : 'flex flex-1 flex-col overflow-auto'}
          >
            {hoja === null ? null : <CabeceraDePantalla hoja={hoja} instruccion={hoja.destino.instruccion} />}
            <div
              data-slot="hoja-del-marco"
              className={
                aSangre
                  ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
                  : 'flex max-w-[1180px] flex-1 flex-col gap-[14px] px-[18px] pb-0 pt-4'
              }
            >
              <ProveedorDeLaNavegacion value={navegacion}>
                {deLaHoja === null ? (
                  <Outlet />
                ) : (
                  <ProveedorDeLaHoja value={deLaHoja}>
                    <Outlet />
                  </ProveedorDeLaHoja>
                )}
              </ProveedorDeLaNavegacion>
            </div>
            {hoja === null ? null : (
              <div className={aSangre ? 'shrink-0 border-t border-linea pt-3' : 'max-w-[1180px]'}>
                <AccionesAlPie
                  destino={hoja.destino}
                  alVolver={() => {
                    irA(null);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <Avisos rotulo={textos.avisos} />
    </div>
  );
}

/**
 * Lo que hay bajo la única ruta: la pantalla si el catálogo de HOY ofrece el destino del hash, y el
 * aviso si no (AC4 de #13, sostenido desde #20 por el render y no por la tabla de rutas).
 *
 * Pregunta lo mismo que `Cascara` —el mismo catálogo, el mismo `pathname`, la misma función— así
 * que las dos respuestas no pueden discrepar: donde esto dibuja `<Pantalla />`, `Cascara` ya ha
 * puesto el proveedor de la hoja, y donde no lo ha puesto, esto dibuja el aviso.
 */
function DestinoDeLaRuta() {
  const { catalogo } = useArmazon();
  const { hoja } = useHojaDeLaRuta(catalogo);
  return hoja === null ? <DestinoNoOfrecido /> : <Pantalla />;
}

/**
 * Monta el enrutador. **No recibe el catálogo, y ese es el arreglo de #20**: ver el javadoc del
 * archivo.
 */
function crearEnrutador() {
  return createHashRouter([
    {
      path: '/',
      element: <Cascara />,
      children: [
        { index: true, element: <SinDestino /> },
        { path: '*', element: <DestinoDeLaRuta /> },
      ],
    },
  ]);
}

export type ArmazonProps = ConfiguracionDelArmazon;

export function Armazon(configuracion: ArmazonProps) {
  /**
   * Uno, para toda la vida del armazón.
   *
   * En un `useState` y no en un `useMemo` a propósito: `useMemo` es una **pista** —React puede
   * tirar lo memorizado y volver a calcularlo cuando le convenga— y un enrutador nuevo a media
   * vida es justo el defecto de #20. El inicializador perezoso de `useState` sí es una promesa:
   * corre una vez. No hay quien lo ponga, y por eso no se desestructura el segundo hueco.
   */
  const [enrutador] = useState(crearEnrutador);
  /**
   * Lo que se pase, encima del castellano. Es lo que hace que traducir el marco NO sea todo o
   * nada: un saco a medias deja las demás palabras como están, en vez de dejar huecos.
   */
  const textos: TextosDelArmazon = useMemo(
    () => ({ ...TEXTOS_DEL_ARMAZON, ...configuracion.textos }),
    [configuracion.textos],
  );
  return (
    <ProveedorDeLaConfiguracion value={configuracion}>
      <ProveedorDeLosTextos value={textos}>
        <RouterProvider router={enrutador} />
      </ProveedorDeLosTextos>
    </ProveedorDeLaConfiguracion>
  );
}
