import type { DocumentoDescargado } from './cliente.ts';

/**
 * Pone en el disco de quien mira la pantalla un documento que `descargar()` ya bajo.
 *
 * Crea un enlace con `download`, lo pulsa y revoca la URL del `Blob`. Es lo unico de
 * `@kamayuk/api` que toca el DOM, y vive aparte de `crearCliente` a proposito: asi el cliente se
 * prueba sin navegador, y la pantalla decide CUANDO entregar —despues de ensenar que llego, o
 * nunca, si lo que queria era previsualizarlo—.
 *
 * ```ts
 * entregarAlNavegador(await cliente.descargar('/reportes/42/resumen.pdf?formato=PDF'));
 * ```
 *
 * <h2>La URL se revoca al volver del clic, y esta medido que se puede</h2>
 *
 * Cada `URL.createObjectURL` retiene el `Blob` entero en memoria hasta que se revoca o se cierra
 * la pestana: en un puesto que baja cien documentos en un turno sin recargar, no revocar es
 * retener cien PDF. Revocar tan pronto tiene el riesgo contrario —que la descarga no llegue a
 * leer el `Blob`—, y por eso se midio con esta misma funcion en Chromium 151 (Playwright,
 * 2026-09-14): 5 MiB bajados **byte a byte iguales**, `download.failure()` nulo, la URL ya revocada
 * al volver y ningun enlace en la pagina.
 *
 * <h2>Lo que NO esta medido</h2>
 *
 * Colgar el enlace de `body` antes del clic **no hace falta en Chromium**: el contrafactual, con el
 * `appendChild` quitado, baja los mismos 5 MiB. Se cuelga igual porque en Firefox el clic sobre un
 * enlace desconectado no descargaba, y eso aqui es lectura y no medicion: en la maquina donde se
 * escribio no hay Firefox. Ni Safari. Cuesta dos lineas y no deja rastro en la pagina.
 */
export function entregarAlNavegador(documento: DocumentoDescargado): void {
  const url = URL.createObjectURL(documento.contenido);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = documento.nombre;
  enlace.hidden = true;

  document.body.appendChild(enlace);
  try {
    enlace.click();
  } finally {
    enlace.remove();
    URL.revokeObjectURL(url);
  }
}
