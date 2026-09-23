// MUESTRA: viola `@typescript-eslint/switch-exhaustiveness-check` a proposito (#111).
//
// No se compila ni se lintea desde el arbol —`muestras/` esta en los `ignores` y en el `exclude`—:
// la lintea `reglas-de-eslint.test.ts` como texto, con una ruta sintetica dentro de `paquetes/ui/`.
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
