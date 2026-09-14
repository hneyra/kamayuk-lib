// @vitest-environment node
//
// Esta guarda lee el DISCO, no un DOM: el mismo motivo por el que `sin-suponer-un-sistema` declara
// su entorno. En `jsdom`, `import.meta.url` no es una URL `file:` y `fileURLToPath` revienta.

import { describe, expect, it } from 'vitest';

import { PAQUETES, archivosDeProduccion, leer, sinComentarios } from '../verificaciones/texto.ts';

/**
 * **`XMLHttpRequest` se construye en UN archivo, y es `paquetes/api/subir.ts`.**
 *
 * Es la misma regla que `fetch-fuera-del-cliente` y por el mismo motivo: el token, el prefijo y el
 * trato de los errores se enchufan en un sitio o en veinte. La subida usa `XMLHttpRequest` porque
 * es la unica forma de saber cuanto lleva enviado —el porque entero esta en la cabecera de
 * `subir.ts`—, y esa capacidad es exactamente la que invita a que alguien se abra uno suelto «solo
 * para esta pantalla».
 *
 * <h2>Por que aqui y no como prohibicion de ESLint</h2>
 *
 * **Porque una prohibicion nueva rompe hoy a los cuatro consumidores, medido.** Cada sistema
 * deriva `PROHIBICIONES` de `@kamayuk/verificaciones` y le exige a cada clave **su muestra en SU
 * arbol** (`verificaciones/reglas-de-eslint.test.ts` compone la ruta desde la clave); ademas, una
 * prohibicion con `salvo` que el consumidor no situe en su `SALVO_EN_ESTE_ARBOL` **lanza al cargar
 * el config**, o sea que `yarn lint` ni arranca. Anadir la decima prohibicion es, por
 * construccion, un cambio coordinado en cinco repositorios; esta guarda cubre el arbol de la
 * libreria —que es donde vive la excepcion— sin pedirle nada a nadie.
 *
 * Lo que queda fuera, y se dice para que no se olvide: el `src/` de los cuatro sistemas. Hoy no
 * hay ni una llamada —medido el 2026-09-14: cero `XMLHttpRequest` en los tres frontends que
 * existen— asi que la prohibicion nacera sobre el conjunto vacio el dia que se coordine.
 */

/** El unico archivo que puede construir uno. Es el que encierra el transporte de la subida. */
const EL_SITIO = 'paquetes/api/subir.ts';

/** `new XMLHttpRequest()`, escrito como se escriba. */
const CONSTRUIR_UNO = /new\s+XMLHttpRequest\b/;

interface Hallazgo {
  readonly archivo: string;
  readonly linea: number;
}

/**
 * Los sitios donde el codigo de produccion construye un `XMLHttpRequest`, **sin comentarios**.
 *
 * Omitirlos es lo mismo que hace `sin-suponer-un-sistema`, y por lo mismo: los docblocks de estos
 * paquetes explican de que herramienta viene cada decision, y este archivo mismo tiene que poder
 * nombrarla para decir por que esta.
 */
function donde(): Hallazgo[] {
  const salida: Hallazgo[] = [];
  for (const archivo of archivosDeProduccion()) {
    sinComentarios(leer(archivo))
      .split('\n')
      .forEach((linea, indice) => {
        if (CONSTRUIR_UNO.test(linea)) {
          salida.push({
            archivo: archivo.replace(PAQUETES, 'paquetes').replaceAll('\\', '/'),
            linea: indice + 1,
          });
        }
      });
  }
  return salida;
}

describe('el transporte de la subida vive encerrado', () => {
  it('EL CENTINELA: se lee codigo de produccion de verdad', () => {
    // Sin esto, lo de abajo pasaria sobre la lista vacia — que es como una guarda se queda sin
    // sujeto y sigue en verde.
    expect(
      archivosDeProduccion().length,
      'no se leyo ni un archivo de produccion: la guarda no mide nada',
    ).toBeGreaterThan(8);
  });

  it('EL CENTINELA: el sitio declarado SI construye uno', () => {
    // La otra direccion: si `subir.ts` dejara de usarlo —porque alguien lo paso a `fetch` y con
    // el se fue el avance— esta prueba lo diria, en vez de quedarse vigilando un vacio.
    expect(
      donde().map((h) => h.archivo),
      `${EL_SITIO} ya no construye un XMLHttpRequest: o se movio el transporte, o se fue el avance de subida con el.`,
    ).toContain(EL_SITIO);
  });

  it('y NADIE MAS lo construye', () => {
    const intrusos = donde().filter((h) => h.archivo !== EL_SITIO);

    expect(
      intrusos.map((h) => `${h.archivo}:${String(h.linea)}`),
      'Un `XMLHttpRequest` fuera de `subir.ts` se salta el prefijo del sistema, el token y el\n' +
        'trato de los errores, igual que un `fetch` suelto. Si lo que hace falta es una operacion\n' +
        'nueva, se anade al cliente; si es una subida, ya esta escrita.',
    ).toEqual([]);
  });
});
