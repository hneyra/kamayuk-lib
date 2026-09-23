# `@kamayuk/formato`

Fechas, importes y documento de identidad, copiado **verbatim** de `rentas/frontend/src/dominio/`.

Es la **hoja limpia del grafo**: no importa nada de nadie, y no hay ni un `Number` ni un `Date` en
todo el paquete (regla 1).

## Lo que le falta

**`codigo predial` y `placa`**, que ADR-0030 §4 le encarga y **no se inventan**: entran el día que
el sistema dueño del dato diga cuál es su forma.

---

Este archivo dice **el estado** del paquete, y salió de la tabla de [`CLAUDE.md`](../../CLAUDE.md)
en #128. Cuántas pruebas tiene lo escribe `yarn cifras` en esa tabla; por qué cada cosa es como es
—lo que se midió, con qué rotura y qué rojo salió— vive en
[`docs/agent/HISTORY.md`](../../docs/agent/HISTORY.md), una fila por issue.
