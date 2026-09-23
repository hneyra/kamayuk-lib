/**
 * LA OTRA MITAD de la muestra de la cuarta forma: **el mismo peldano, hecho bien** (#52).
 *
 * Es `frase-escrita-dentro.ts` con las palabras fuera: entran por un saco y aqui solo se
 * referencian. La guarda tiene que dar **cero hallazgos** sobre este archivo.
 *
 * Su papel es el que una muestra sola no puede cumplir: una forma que denuncia todo pasaria la
 * prueba de «muerde» y seria inservible. Aqui se comprueba que tambien **sabe callarse**, y sobre
 * codigo que contiene claves, codigos del contrato y un tipo de medio, que es lo que de verdad
 * hay alrededor de una frase.
 *
 * Fuera de `tsc`, de ESLint y de `vitest`, como todas las muestras.
 */

interface Peldano {
  readonly clave: string;
  readonly titulo: string;
  readonly detalle: string;
  readonly remedio: string;
}

interface ElSaco {
  readonly hayQueVolverAIdentificarse: string;
  readonly sinTokenValido: string;
  readonly vuelvaAIdentificarse: string;
}

export function peldanoDelCuatrocientosUno(dijoElBackend: string | null, saco: ElSaco): Peldano {
  return {
    clave: 'sin-identidad',
    titulo: saco.hayQueVolverAIdentificarse,
    detalle: dijoElBackend ?? saco.sinTokenValido,
    remedio: saco.vuelvaAIdentificarse,
  };
}

/** Claves, codigos del contrato y un tipo de medio: ninguno es una frase, y ninguno sale rojo. */
export const LAS_CLAVES = ['sin-identidad', 'sin-municipalidad', 'orden-no-admitido'] as const;
export const LOS_CODIGOS = ['NO_AUTENTICADO', 'SIN_PRIVILEGIO', 'ORDEN_NO_ADMITIDO'] as const;
export const EL_TIPO_DE_MEDIO = 'application/problem+json';

/** Y una plantilla cuyos trozos son puntuacion tampoco: la frase entera la pone quien llama. */
export function conSuEstado(dijo: string, estado: number): string {
  return `${dijo} (${String(estado)})`;
}
