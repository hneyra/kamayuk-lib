# `@kamayuk/formato`

Fechas, importes y documento de identidad, copiado **verbatim** de `rentas/frontend/src/dominio/`.

Es la **hoja limpia del grafo**: no importa nada de nadie, y no hay ni un `Number` ni un `Date` en
todo el paquete (regla 1). **Lo vigila una guarda**, `formato-sin-number-ni-date` —con `Intl`,
`parseInt`, `parseFloat` y `Math`, y con el comprobador de TypeScript, así que tampoco pasa un
`+dia`, un `as unknown as number` ni lo que le miente al comprobador: un `as T`, un predicado, una
sobrecarga, un `declare` o un `@ts-expect-error`—: hasta #108 se cumplía por costumbre, y había dos
`Number` que la CI dejaba pasar. La aritmética de este paquete es de `bigint`; sobre `number`, sólo
el signo de un literal.

Lo que es un importe o una fecha **servidos** se decide en un solo sitio, `partir.ts`, interno y sin
exportar: `formatearImporte`, `compararImportes`, `sumarImportes` y las dos fechas lo usan, y
`compararImportes` compara centimos en `bigint` con el mismo `centimosDe` que suma.

## Lo que le falta

**`codigo predial` y `placa`**, que ADR-0030 §4 le encarga y **no se inventan**: entran el día que
el sistema dueño del dato diga cuál es su forma.

---

Este archivo dice **el estado** del paquete, y salió de la tabla de [`CLAUDE.md`](../../CLAUDE.md)
en #128. Cuántas pruebas tiene lo escribe `yarn cifras` en esa tabla; por qué cada cosa es como es
—lo que se midió, con qué rotura y qué rojo salió— vive en
[`docs/agent/HISTORY.md`](../../docs/agent/HISTORY.md), una fila por issue.
