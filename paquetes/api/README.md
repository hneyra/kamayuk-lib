# `@kamayuk/api`

`crearCliente({ prefijo, token })` y cuatro operaciones sobre el mismo prefijo, el mismo token
—leído en **cada** llamada, con la misma función— y el mismo `ErrorDeLaApi`.

## Las cuatro operaciones

- **`solicitar`**.
- **`solicitarRespuesta(ruta, opciones?)`**, que devuelve `{ estado, cabeceras, texto }` con el
  cuerpo **tal cual llegó** —sin `JSON.parse`, sin `JSON.stringify` y sin `trim`—, para el recurso
  que viene firmado con una huella en una cabecera: reserializar el objeto da otro texto (`1.0`
  vuelve `1`, un escape vuelve la letra) y por tanto otra huella, y **comprobarla es del sistema que
  la pide, no de aquí**. Es **la misma petición que `solicitar`** —las dos las compone `pedir()`,
  así que compartirlo es una propiedad del código y no una promesa del docblock— y **no mira el
  `Content-Type`**: un 200 con JSON es su caso normal, lo contrario que `descargar`.
- **`descargar(ruta, { nombre?, senal? })`**, que devuelve
  `{ nombre, tipoDeMedio, contenido: Blob }` **sin tocar el DOM** —un 200 con JSON lanza
  `NoEsUnDocumento`, subclase de `ErrorDeLaApi` y no un `codigo` inventado, y el nombre sale de
  `Content-Disposition` antes que del argumento—.
- **`subir<T>(ruta, { archivo, nombre?, campo?, campos?, metodo?, senal?, alAvanzar?, limiteDeBytes?, admite? })`**,
  un `multipart/form-data` cuyos tres desenlaces llegan distinguidos a la pantalla:
  `ArchivoRechazado` con `motivo` `'demasiado-grande'` o `'tipo-no-admitido'` —local, `estado: 0` y
  **sin mandar un byte**, o del 413/415 del servidor— y el 422 de la casa como `ErrorDeLaApi`.

`OpcionesDeSolicitud` lleva `claveDeIdempotencia?`, que sale como `Idempotency-Key` y **en blanco
lanza antes de llamar a `fetch`** —el backend trata una clave en blanco como si no hubiera clave, y
el reintento duplicaría sin avisar—, y **no tiene ninguna cabecera libre**: ni `cabeceras` ni
`headers`, porque por ahí se sobrescribiría el `Authorization` o viajaría el inquilino (regla 2,
ADR-0005), y lo vigilan tres barreras de tipo.

Entregar el documento al usuario es otra función, **`entregarAlNavegador(documento)`**, **la única
del paquete que toca el DOM**.

## Los errores

Las clases de error viven en `errores.ts`, aparte del cliente, porque juntas cerraban un ciclo.

**Y desde #52 `ErrorDeLaApi` conserva las CINCO extensiones del contrato y no dos**: `codigo`,
`mensaje`, `detalles` —`[]` cuando no llega, porque el backend no escribe el miembro con la lista
vacía—, `incidencia` —el identificador con el que soporte encuentra la causa, sólo en los 5xx— y
`parametroQueFalta` —`{ejercicio, llave?}` **tal cual llega y sin interpretar**, que es lo único que
separa dos 404 que traen el mismo `codigo`—. Son las mismas cinco en los cinco sistemas, medidas
sobre sus `ManejadorDeErrores.java`.

## Dos cosas que no se tocan

- El `Content-Type` del multipart **no se fija a mano**: lo pone el navegador con su `boundary`, y
  lo vigilan dos pruebas, una de ellas sobre la lista entera de cabeceras.
- El `XMLHttpRequest` que da el avance de subida —lo que `fetch` no da sin `duplex: 'half'`, que es
  sólo Chromium, sólo HTTP/2, y mediría lo escrito y no lo recibido— vive **sólo** en `subir.ts`,
  que es lo que vigila `el-xhr-vive-en-un-solo-sitio.test.ts`.

---

Este archivo dice **el estado** del paquete, y salió de la tabla de [`CLAUDE.md`](../../CLAUDE.md)
en #128. Cuántas pruebas tiene lo escribe `yarn cifras` en esa tabla; por qué cada cosa es como es
—lo que se midió, con qué rotura y qué rojo salió— vive en
[`docs/agent/HISTORY.md`](../../docs/agent/HISTORY.md), una fila por issue.
