// @vitest-environment node
//
// Llama a la funcion y corre los guiones como proceso. No es un DOM lo que necesita.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { leerArgumentos } from './argumentos.mjs';

/**
 * **Los argumentos de los guiones los trocea `parseArgs`, y las frases siguen siendo las de antes**
 * (#129, AC4).
 *
 * Hasta #129 cada guion de este paquete que admite opciones las leia con un bucle escrito a mano
 * —`rama-del-consumidor.mjs`, `el-arnes-del-request-no-se-copia.mjs` y `cifras.mjs`—, y ninguno
 * entendia `--opcion=valor`. Ahora los tres pasan por `leerArgumentos`, y lo que esta prueba sujeta
 * es la otra mitad del AC: **el mismo codigo de salida y las mismas lineas** para lo que ya se
 * escribia bien y para lo que se escribia mal. Las dos frases —«Opcion desconocida: X» y «Falta el
 * valor de X»— son las que los bucles decian, letra por letra.
 */

const OPCIONES = { consumidor: 'texto', cuerpo: 'texto', comprobar: 'marca' } as const;

describe('`leerArgumentos`: lo que se escribe bien', () => {
  it('un texto por su nombre, y una marca que esta o no esta', () => {
    expect(leerArgumentos(['--consumidor', 'duenno/sistema', '--comprobar'], OPCIONES)).toEqual({
      consumidor: 'duenno/sistema',
      comprobar: true,
    });
    expect(leerArgumentos([], OPCIONES)).toEqual({});
  });

  it('`--opcion=valor`, que ninguno de los bucles entendia', () => {
    expect(leerArgumentos(['--cuerpo=cuerpo.txt'], OPCIONES)).toEqual({ cuerpo: 'cuerpo.txt' });
  });

  it('como los bucles: el valor es la palabra siguiente, empiece como empiece, y la ultima gana', () => {
    expect(leerArgumentos(['--consumidor', '--comprobar'], OPCIONES)).toEqual({ consumidor: '--comprobar' });
    expect(leerArgumentos(['--cuerpo', 'a', '--cuerpo', 'b'], OPCIONES)).toEqual({ cuerpo: 'b' });
  });
});

describe('`leerArgumentos`: lo que se escribe mal, con las frases de siempre', () => {
  it.each([
    [['--otra'], 'Opcion desconocida: --otra'],
    [['--otra=1'], 'Opcion desconocida: --otra=1'],
    [['-x'], 'Opcion desconocida: -x'],
    [['suelto'], 'Opcion desconocida: suelto'],
    [['--consumidor', 'a/b', 'suelto'], 'Opcion desconocida: suelto'],
    [['--comprobar=si'], 'Opcion desconocida: --comprobar=si'],
    [['--', '--consumidor'], 'Opcion desconocida: --'],
    [['--consumidor'], 'Falta el valor de --consumidor'],
  ])('%j → «%s»', (argumentos, frase) => {
    expect(() => leerArgumentos(argumentos, OPCIONES)).toThrow(new Error(frase));
  });
});

/**
 * Y como proceso, que es como los corre quien los usa: el mismo `RC=1` y la misma linea `Error:`
 * que con el bucle, medidas antes de cambiarlo (`--otra` y la opcion sin valor, en los dos).
 */
describe('los guiones, como proceso, dicen lo mismo que antes de #129', () => {
  const correr = (guion: string, argumentos: readonly string[]) =>
    spawnSync(process.execPath, [fileURLToPath(new URL(`./${guion}`, import.meta.url)), ...argumentos], {
      encoding: 'utf8',
    });

  it.each([
    ['rama-del-consumidor.mjs', ['--consumidor', 'duenno/sistema', '--otra'], 'Error: Opcion desconocida: --otra'],
    ['rama-del-consumidor.mjs', ['--consumidor'], 'Error: Falta el valor de --consumidor'],
    ['el-arnes-del-request-no-se-copia.mjs', ['--otra'], 'Error: Opcion desconocida: --otra'],
    ['el-arnes-del-request-no-se-copia.mjs', ['--raiz'], 'Error: Falta el valor de --raiz'],
    // La guarda del registro, desde la revision del PR de #129: su copia no esta atada a las otras seis.
    ['../../docs/00-gobierno/verificar-fila-del-registro.mjs', ['--otra', 'x'], 'Error: Opcion desconocida: --otra'],
    ['../../docs/00-gobierno/verificar-fila-del-registro.mjs', ['--base'], 'Error: Falta el valor de --base'],
  ])('%s %j → RC=1 y «%s»', (guion, argumentos, linea) => {
    const salida = correr(guion, argumentos);
    expect(salida.status).toBe(1);
    expect(salida.stderr.split('\n')).toContain(linea);
  });

  it('y la guarda del registro entiende ya `--base=rama`, que su bucle tomaba por una opcion sin valor', () => {
    const salida = correr('../../docs/00-gobierno/verificar-fila-del-registro.mjs', ['--base=origin/main', '--cuerpo', '']);
    expect(salida.stderr).not.toContain('Falta el valor de --base=origin/main');
    expect(salida.status).toBe(0);
  });

  it('y `rama-del-consumidor` sin `--consumidor` sigue saliendo con 2, diciendolo', () => {
    const salida = correr('rama-del-consumidor.mjs', []);
    expect(salida.status).toBe(2);
    expect(salida.stderr).toContain('FALLO: falta --consumidor duenno/sistema.');
  });
});
