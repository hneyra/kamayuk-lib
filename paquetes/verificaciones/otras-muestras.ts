/**
 * Las muestras que NO son de una prohibicion de ESLint, con la guarda que las reclama.
 *
 * `muestras/` es un solo directorio a proposito —es donde la casa mira— y por eso hace falta
 * decir de quien es cada archivo: la comprobacion «no hay muestras sin duenо» seria imposible de
 * escribir si unas tuvieran registro y otras no, y aflojarla a «ignora las que no reconozcas»
 * convierte una muestra huerfana en invisible, que es justo lo que esa comprobacion impide.
 */
export const OTRAS_MUESTRAS: Readonly<Record<string, string>> = {
  'supone-un-sistema': 'sin-suponer-un-sistema',
  'nombre-publico-entre-paquetes': 'sin-nombre-publico-entre-paquetes',
  'capa-flotante-por-debajo-del-velo': 'las-capas-se-apilan',
  // Las dos mitades de la cuarta forma de `el-texto-visible-es-dato` (#52): una la viola y otra
  // la cumple. Van las dos porque una forma que denunciara todo tambien «muerde», y seria
  // inservible: hace falta demostrar que ademas sabe callarse.
  'frase-escrita-dentro': 'el-texto-visible-es-dato',
  'frase-que-sale-del-saco': 'el-texto-visible-es-dato',
  'arnes-del-request-copiado': 'el-arnes-del-request-se-publica',
  'formato-con-number-o-date': 'formato-sin-number-ni-date',
  // La regla con tipos que vive en `eslint.config.js` y no en `PROHIBICIONES` (#111).
  'switch-sin-agotar': 'reglas-de-eslint',
};
