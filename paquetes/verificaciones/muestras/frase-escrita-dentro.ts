/**
 * LA MUESTRA de la cuarta forma de `el-texto-visible-es-dato`: **una frase escrita dentro** (#52).
 *
 * Es el peldano del 401 tal y como estaba en `paquetes/sesion/escalera.ts:99-110` antes de #52, y
 * viola la forma A PROPOSITO: las tres palabras que una persona lee estan escritas aqui, como
 * valor de una propiedad de objeto, y por ahi no hay forma de traducirlas.
 *
 * **Y ninguna de las tres formas anteriores la ve**: no hay ni un `JsxText`, ni un atributo
 * anunciado, ni el valor por omision de una `prop`. Medido: el detector de esas tres, aplicado a
 * `escalera.ts`, daba **cero hallazgos** sobre veintiseis frases.
 *
 * Este archivo esta fuera de `tsc`, fuera de ESLint y fuera de `vitest` —`muestras/` esta
 * apartada en los tres— y la guarda lo lee con el analizador de TypeScript, igual que leeria el
 * codigo de produccion. Su pareja, `frase-que-sale-del-saco.ts`, es el MISMO peldano hecho bien.
 *
 * Si alguien «arregla» este archivo, la guarda se queda sin demostracion y sale roja sola.
 */

interface Peldano {
  readonly clave: string;
  readonly titulo: string;
  readonly detalle: string;
  readonly remedio: string;
}

export function peldanoDelCuatrocientosUno(dijoElBackend: string | null): Peldano {
  return {
    // Una clave NO es una frase, y la forma no la denuncia: no tiene dos rachas de letras
    // separadas por un espacio. Esta aqui para que la muestra lo demuestre.
    clave: 'sin-identidad',
    titulo: 'Hay que volver a identificarse',
    detalle: dijoElBackend ?? 'La peticion no trae un token valido.',
    remedio:
      'La sesion caduco o todavia no se ha abierto. Vuelva a identificarse para seguir ' +
      'trabajando.',
  };
}

/** Y partida con una plantilla tampoco se escapa: los tres trozos se miran uno a uno. */
export function elDetalleDeLaAveria(operacion: string, estado: number): string {
  return `No se pudo completar ${operacion}, y el backend contesto ${String(estado)}`;
}
