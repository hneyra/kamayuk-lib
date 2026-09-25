// MUESTRA: viola `@typescript-eslint/switch-exhaustiveness-check` a proposito (#111).
//
// No se compila ni se lintea desde el arbol —`muestras/` esta en los `ignores` y en el `exclude`—:
// la lintea `reglas-de-eslint.test.ts` EN ESTA RUTA, la de verdad, con `ignore: false` y la muestra
// en `allowDefaultProject`. No con una ruta sintetica, como las demas muestras: la regla necesita
// tipos, y el servicio de proyectos no tipa una ruta que no existe («was not found by the project
// service», medido en #111).
//
// Es la forma que el compilador NO ve: un `switch` en una funcion que no devuelve nada, como el
// `pulsar` de `GrupoDeAcciones`. Con una cuarta clase y sin su `case`, compila en verde y pulsar el
// boton no hace nada.

type ClaseDeLaMuestra = 'abre' | 'va' | 'hace' | 'guarda';

export function pulsar(clase: ClaseDeLaMuestra, hechas: string[]): void {
  switch (clase) {
    case 'abre':
      hechas.push('abre');
      return;
    case 'va':
      hechas.push('va');
      return;
    case 'hace':
      hechas.push('hace');
      return;
  }
}
