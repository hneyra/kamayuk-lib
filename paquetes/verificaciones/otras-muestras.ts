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
};
