# Registro de «Verificar antes de afirmar»

Cada issue deja aquí una fila con qué se implementó, **con qué rotura se demostró que la
verificación muerde** y qué rojo produjo. Es lo que impide volver a descubrir el mismo hallazgo por
tercera vez.

La doctrina —qué es una fila y qué tiene que demostrar— vive en
[`CLAUDE.md`](../../CLAUDE.md); la historia, aquí. Que la fila **exista** lo comprueba
`docs/00-gobierno/verificar-fila-del-registro.mjs`; lo que **diga**, la revisión.

**La tabla nace con una fila, y es la del repositorio mismo.** No hereda nada: la historia de los
paquetes que llegan aquí vive en el repositorio del que salieron, y copiarla sería el registro de un
trabajo que aquí no se hizo.

| Verificación | Cómo se demostró que puede fallar | Resultado |
|---|---|---|
| **Nacen las tres primeras librerías de frontend (#2).** `@kamayuk/formato` (de `rentas/frontend/src/dominio/`, verbatim), `@kamayuk/api` (**diseñado**, no extraído: los tres clientes tenían clases de error incompatibles) y `@kamayuk/sesion` (`crearIdentidad` parametrizado por realm, retorno, destino y **prefijo de claves**). Más `sin-suponer-un-sistema`, que barre el código de producción de los cinco paquetes que viajan a un navegador, omitiendo comentarios. **134 pruebas, 0 fallos** | **Cuatro roturas.** (1) `const colado = '/rentas/api/v1';` en `paquetes/api/cliente.ts`. (2) `\b` inicial en el patrón de vocabulario tributario, que hacía que `totalDeArbitrios` **no casara** — el límite de palabra no existe dentro de camelCase. (3) La guarda barriendo también `paquetes/verificaciones/`. (4) La guarda en entorno `jsdom` en vez de `node` | (1) `AssertionError: ADR-0030 §2 pone el sistema delante de la ruta… Donde aparece: paquetes/api/cliente.ts:161`. (2) `expected 0 to be greater than 0` en «y sobre la muestra, «vocabulario-tributario» encuentra lo que tiene que encontrar» — **la regla no habría mordido la forma en que el vocabulario se cuela de verdad, que es un identificador**. (3) La guarda **se delataba a sí misma**: el texto de su propia regla cita «arbitrio», porque es el ejemplo con el que ADR-0030 §4 la escribe, y ese texto es código y no comentario. (4) `TypeError: The URL must be of scheme file` en `texto.ts:6` |
