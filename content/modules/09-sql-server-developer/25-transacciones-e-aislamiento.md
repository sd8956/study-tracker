---
title: Transacciones y niveles de aislamiento
kind: course
hours: 2
sources: DataCamp — Transactions and Error Handling in SQL Server, caps. 3–4
links: Transactions and Error Handling in SQL Server (DataCamp) | https://www.datacamp.com/courses/transactions-and-error-handling-in-sql-server
---

## Objetivo

Agrupar operaciones en transacciones con commit y rollback, revisar `@@TRANCOUNT` y `XACT_STATE()`, y elegir el nivel de aislamiento según los problemas de concurrencia que quieres evitar.

## Qué hacer

1. Abre *Transactions and Error Handling in SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Transactions in SQL Server» y el capítulo 4 «Controlling the concurrency: Transaction isolation levels» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **ACID**: atomicidad, consistencia, aislamiento y durabilidad.
- **BEGIN TRAN / COMMIT / ROLLBACK**: inician, confirman o deshacen una transacción.
- **@@TRANCOUNT y XACT_STATE()**: cuántas transacciones abiertas hay y si la actual se puede confirmar (1), está condenada (-1) o no hay (0).
- **XACT_ABORT ON**: hace que cualquier error deshaga toda la transacción automáticamente.
- **Dirty, non-repeatable y phantom reads**: leer datos no confirmados, leer dos veces la misma fila con valores distintos, o ver aparecer filas nuevas.
- **Niveles de aislamiento**: READ UNCOMMITTED, READ COMMITTED (por defecto), REPEATABLE READ, SERIALIZABLE y SNAPSHOT.

## Preguntas de repaso

1. Escribe el patrón de una transferencia bancaria con transacción y manejo de errores.
   R: TRY con la transacción y CATCH que deshace y relanza:
   ```sql
   BEGIN TRY
     BEGIN TRAN;
       UPDATE accounts SET balance -= @monto WHERE id = @origen;
       UPDATE accounts SET balance += @monto WHERE id = @destino;
     COMMIT;
   END TRY
   BEGIN CATCH
     IF XACT_STATE() <> 0 ROLLBACK;
     THROW;
   END CATCH
   ```
2. ¿Qué problema permite READ UNCOMMITTED y por qué es arriesgado?
   R: Las dirty reads: lees cambios de otra transacción que aún no se confirmaron y podrían deshacerse, así que tomas decisiones con datos que nunca existieron.
3. ¿Qué nivel evita phantom reads y qué precio tiene?
   R: SERIALIZABLE (bloquea rangos) y también SNAPSHOT (lee una versión consistente). SERIALIZABLE reduce mucho la concurrencia y aumenta bloqueos; SNAPSHOT consume espacio en tempdb para versiones.
4. ¿Qué hace `SET XACT_ABORT ON`?
   R: Si una instrucción da error en tiempo de ejecución, SQL Server deshace toda la transacción y aborta el lote, evitando transacciones a medias.

## Explícalo con tus palabras

Explica los tres problemas de concurrencia (dirty, non-repeatable, phantom) con dos personas que editan la misma hoja de inventario.
