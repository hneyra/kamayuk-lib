/* eslint-disable no-restricted-syntax -- este archivo VIOLA las reglas a proposito; es lo que
   verifica. Un `<Importe>` sin su fecha aqui NO es un defecto: es el caso que tiene que dejar
   de compilar el dia que alguien afloje el tipo. Va en linea y no en el config porque la
   excepcion pertenece a ESTE archivo, y una excepcion en el config se ensancha sin que nadie
   la mire. Es el mismo patron que usa `rentas`. */
import { FechaDeCalculo, Icono, Importe, Insignia } from '../../ui/index.ts';
import { formatearImporte } from '../../formato/index.ts';

/**
 * LAS BARRERAS DE TIPO. No es una prueba de vitest: es una prueba DEL COMPILADOR.
 *
 * <h2>Como funciona, y por que no hace falta ejecutarla</h2>
 *
 * Cada bloque de abajo lleva un `@ts-expect-error` sobre codigo que HOY no compila. Si manana
 * compilara —porque alguien puso un valor por omision, aflojo un tipo o amplio una union— el error
 * esperado no ocurriria, y TypeScript se pone rojo por la directiva no usada (TS2578). O sea que
 * la barrera falla cuando la propiedad se pierde, sin que nadie tenga que correr nada: la
 * comprueba `yarn typecheck`.
 *
 * Por eso este archivo tiene que estar dentro del `include` del `tsconfig.json`. Si se cayera de
 * ahi, `tsc` ni lo abriria y **las seis barreras dejarian de comprobarse en silencio**.
 *
 * <h2>Por que los imports son relativos</h2>
 *
 * Porque `sin-nombre-publico-entre-paquetes` lo exige, y por el motivo medido en #4: un import por
 * el nombre publico resuelve aqui —este repositorio es raiz de workspaces— y se rompe en el
 * consumidor, que resuelve el symlink a su ruta real.
 */

export function barreras() {
  return (
    <>
      {/* Un importe SIN su fecha de calculo. Regla 9 (RNF-075) llevada al tipo: no existe «la
          deuda», existe `deudaActualizadaA(fecha)`. */}
      {/* @ts-expect-error falta `fechaCalculo`, que es obligatoria y no tiene valor por omision */}
      <Importe valor="1842.60" />

      {/* Y no vale pasarla vacia: `undefined` no es una `Fecha`. */}
      {/* @ts-expect-error `fechaCalculo` no admite undefined */}
      <Importe valor="1842.60" fechaCalculo={undefined} />

      {/* Un importe como NUMERO. Regla 1 (RNF-055): en coma flotante el centimo se pierde antes de
          llegar a la pantalla. */}
      {/* @ts-expect-error un importe es texto decimal, jamas number */}
      <Importe valor={1842.6} fechaCalculo="2026-09-06" />

      {/* Una insignia SIN texto. Un estado que se comunica solo por color no se comunica a quien
          no distingue ese color. */}
      {/* @ts-expect-error `children` es obligatorio */}
      <Insignia tono="ok" />

      {/* Y un tono que no es de los cuatro del artboard. */}
      {/* @ts-expect-error «verde» no es un Tono */}
      <Insignia tono="verde">Vigente</Insignia>

      {/* La fecha de calculo de la pantalla, sin fecha. */}
      {/* @ts-expect-error `fecha` es obligatoria */}
      <FechaDeCalculo />

      {/* Un icono que no existe. La union se deriva de la tabla, asi que un nombre mal escrito
          no llega a produccion como un SVG vacio. */}
      {/* @ts-expect-error «triangulo» no es un NombreDeIcono */}
      <Icono nombre="triangulo" />
    </>
  );
}

/** Y fuera de JSX: el formateador tampoco acepta un numero. */
export function formatoConNumero() {
  // @ts-expect-error un importe es texto decimal, jamas number
  return formatearImporte(1842.6);
}
