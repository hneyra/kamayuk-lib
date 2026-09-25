/**
 * LA MUESTRA de `el-marco-no-decide-permisos` (#112). Viola la regla A PROPOSITO.
 *
 * Es un archivo del marco —`paquetes/shell/`— que se asoma a la sesion y a la API para decidir un
 * permiso, escrito de **todas las formas** en las que un import relativo llega a ellas. Vive aqui
 * y no en `shell/` porque `muestras/` es donde la casa mira, y las rutas estan escritas como
 * si el archivo estuviera alli: aqui no se compila ni se lintea, solo se lee.
 *
 * La primera linea es la unica forma que la expresion regular de antes veia. Las cuatro
 * siguientes se le escapaban: el import de directorio —que con `moduleResolution: bundler`
 * resuelve—, el de efecto, el dinamico y el `export … from`. La ultima es un comentario y NO
 * cuenta. Si alguien "arregla" este archivo, la guarda se queda sin demostracion y sale roja sola.
 */
import { peldanoDe } from '../sesion/escalera.ts';
import { crearIdentidad } from '../sesion';
import '../sesion/identidad.ts';
export { crearCliente } from '../api';

export const identidad = () => import('../sesion/identidad.ts');

export function puede(): boolean {
  return peldanoDe !== undefined && crearIdentidad !== undefined;
}

// import { crearIdentidad } from '../sesion/identidad.ts';
