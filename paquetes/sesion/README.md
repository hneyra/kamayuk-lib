# `@kamayuk/sesion`

`crearIdentidad(config, textos?)` con PKCE S256 y `peldanoDe(fallo, textos?)` con sus **nueve**
peldaños.

Viene de `rentas`, el único de los cuatro que se autenticaba, y **nada dentro nombra a un sistema**:
lo que lo ataba eran tres datos, hoy parámetros; las dos frases que todavía suponían `rentas` —«no
hay padrón que enseñar», «revise con qué cuenta está entrando»— se fueron con #52.

## La escalera: `peldanoDe()`

Nueve peldaños, y **dos los trajo #52**, cuando `identidad` y `normativa` fueron a dibujar pantallas
que ESCRIBEN: el **409**, que caía en «avería · Reintente» siendo el remedio contrario, y el 422
**`ORDEN_NO_ADMITIDO`**, que compartía título y remedio con `VALIDACION` aunque no lo provoca quien
escribe sino la pantalla.

**Que la unión no crezca sin enterarse** lo vigila `LAS_NUEVE_CLAVES`
(`verificaciones/tipos/barreras-de-tipos.tsx`), un `Record` completo sobre `Peldano['clave']` —la
misma forma que la guarda de `ciudadano`, que ya decidió los dos nuevos en su `main`—: una décima
clave sale roja en `yarn typecheck` de aquí, con su nombre.

**Dos subclases se miran por su clase y no por su estado** (#109): `ArchivoRechazado` —0 si lo
rechazó el cliente sin mandar un byte, 413/415 si lo rechazó el servidor— cae en `no-valido` con un
título y un remedio por motivo (`demasiado-grande`, `tipo-no-admitido`), y `NoEsUnDocumento` —un
200 con datos— en `orden-no-admitido`, porque la petición la compuso la pantalla. Antes caían los
tres en «avería · Reintente… avise a soporte», y reintentar con el mismo archivo no puede funcionar
nunca. **La unión no crece**: lo propio va en `titulo`, `detalle` y `remedio`.

Cada peldaño dice además `reintentable` y lleva la `incidencia` del 500 **como campo**, no dentro de
una frase. Y **sus palabras son dato** —treinta desde #52 y nueve más, al final del saco, desde
#109—: `TEXTOS_DE_LA_ESCALERA` en `textos.ts`, que entra
como `Partial` por el segundo argumento —opcional: con uno solo contesta lo de siempre— igual que
`<Armazon textos>`, y lo vigila la cuarta forma de `el-texto-visible-es-dato`.

## La puerta: `crearIdentidad(config)`

`entrar()` pregunta al documento de descubrimiento antes de navegar y devuelve `FallaDeLaPuerta` si
el emisor no contesta; `urlDeLaCuenta()`/`abrirLaCuenta()` llevan a la consola de cuenta de Keycloak
**derivándola del realm**, no escrita a mano.

**La sonda sube con `credentials: 'omit'`**, y no es adorno: medido en Chromium, con el emisor en el
mismo origen que la interfaz —el caso del clúster, `https://<dominio>/keycloak/…`— sin esa línea le
van las cookies de la sesión.

**Lo que dice cuando no se pudo entrar es dato** (#118): las dieciséis frases del `motivo` y el
`detalle` de cada `Vuelta` fallida, y el respaldo del `motivo` de `FallaDeLaPuerta`, viven en
`TEXTOS_DE_LA_PUERTA` (`textos.ts`) y entran como `Partial` por el segundo argumento —opcional: con
uno solo dice lo de siempre—, igual que las de la escalera. Lo que dijeron el emisor
(`error_description`) y el navegador («Failed to fetch») sigue siendo dato y no pasa por el saco.
`identidad.ts` era la única excepción de la cuarta forma de `el-texto-visible-es-dato`; ya no hay
ninguna, y una frase escrita dentro sale roja con su línea.

**Y está en piezas** (#122): `crearIdentidad` compone y no calcula. Las cuentas del PKCE —los
aleatorios, el reto S256 y `base64url` en los dos sentidos, que `quien-entro.ts` también usa— viven
en `pkce.ts`; las cinco claves del rebote, en `rebote.ts`, un almacén con nombre (`guardarIda`,
`tomarIda` —que **lee y borra**—, `contarIda`, `marcarSalida`…) en vez de dieciocho llamadas
sueltas a `sessionStorage`. **Los dos `fetch` —la sonda y el canje— se quedan en `identidad.ts`**,
que es el sitio declarado, y no se inyecta `fetch` como parámetro: uno con su forma y otro nombre se
saltaría `fetch-fuera-del-cliente`. Un `fetch` en una pieza sale rojo del lint, también como `globalThis.fetch`, `window.fetch`, `fetch.call`, un alias o un `typeof fetch`. Los números tienen
nombre —`ESPERA_DE_LA_SONDA`, `ESPERA_DEL_CANJE`, `LARGO_DEL_VERIFICADOR`, `LARGO_DEL_ESTADO`,
`TOPE_DE_IDAS_POR_OMISION`— y `la-puerta-en-piezas.test.ts` mide los topes: 180 líneas la fábrica
y 60 el canje. Nada de esto se exporta: la API de `crearIdentidad` no cambia.

## Quién entró: `quienEntro()` (#70)

El `nombre`, el `usuario` y la `municipalidad` que el emisor puso en el `id_token` del último canje
—el mismo que ya se guardaba para el `id_token_hint`—, en memoria, `null` antes del canje y después
de `salir()`, y **sin validar la firma**, porque el backend es quien valida y esto es para dibujar.

**Un `id_token` ilegible o ausente no rompe el canje**: da `null` y el `access_token` sigue
sirviendo.

El campo **no** se llama `municipalidadId` y está medido por qué: ese identificador lo prohíbe
`municipalidad-en-el-cliente`, y el rojo sale dos veces —al declararlo y **al leerlo**, que es lo
que escribiría cada consumidor—.

---

Este archivo dice **el estado** del paquete, y salió de la tabla de [`CLAUDE.md`](../../CLAUDE.md)
en #128. Cuántas pruebas tiene lo escribe `yarn cifras` en esa tabla; por qué cada cosa es como es
—lo que se midió, con qué rotura y qué rojo salió— vive en
[`docs/agent/HISTORY.md`](../../docs/agent/HISTORY.md), una fila por issue.
