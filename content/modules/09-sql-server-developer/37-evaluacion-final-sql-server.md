---
title: Evaluación final — SQL Server Developer
kind: evaluation
hours: 3
sources: SQL Server Developer (DataCamp), todo el track
links: SQL Server Developer (DataCamp) | https://app.datacamp.com/learn/career-tracks/sql-server-developer
---

## Objetivo

Comprobar que puedes diseñar, programar y optimizar una base de datos en SQL Server. Hazla como un examen: 3 horas, sin DataCamp, sin notas y sin buscar en internet. Primero responde todas las preguntas por escrito (o en un archivo `.py`/`.sql` cuando pidan código) durante unas 2 horas. Luego usa el tutor de la app para calificar cada respuesta contra la respuesta modelo, y dedica la última hora a repasar en DataCamp los capítulos donde fallaste.

## Preguntas de evaluación

1. Explica 3NF con un ejemplo de tabla que no la cumple y cómo la corriges.
   R: 3NF exige que ninguna columna no clave dependa de otra columna no clave. Ejemplo: `empleados(id, depto_id, depto_nombre)`: `depto_nombre` depende de `depto_id`. Se corrige creando `departamentos(depto_id, nombre)` y dejando solo `depto_id` en empleados.
2. ¿Cuándo usarías un star schema y cuándo un esquema normalizado en 3NF?
   R: Star schema para un data warehouse u OLAP: lecturas analíticas rápidas con pocos joins. 3NF para OLTP: muchas escrituras pequeñas sin anomalías de actualización.
3. Escribe el patrón correcto de transacción con manejo de errores en T-SQL.
   R: TRY envuelve la transacción; CATCH deshace si hay una abierta y relanza:
   ```sql
   SET XACT_ABORT ON;
   BEGIN TRY
     BEGIN TRAN;
       -- instrucciones
     COMMIT;
   END TRY
   BEGIN CATCH
     IF XACT_STATE() <> 0 ROLLBACK;
     THROW;
   END CATCH
   ```
4. ¿Qué es una phantom read y qué nivel de aislamiento la evita?
   R: Ocurre cuando una transacción repite una consulta por rango y aparecen filas nuevas insertadas por otra transacción. La evitan SERIALIZABLE y SNAPSHOT.
5. ¿Qué diferencia hay entre una inline TVF y un stored procedure? Da un caso para cada uno.
   R: La inline TVF devuelve una tabla y se usa dentro de un `SELECT` (por ejemplo el progreso de un módulo para unirlo con otras tablas); no puede modificar datos. El stored procedure ejecuta lógica con efectos (completar una sesión con validación y transacción) y no se usa dentro de un `SELECT`.
6. Un trigger AFTER INSERT hace `SELECT @id = id FROM inserted` y registra ese id. ¿Qué bug tiene?
   R: Asume una sola fila. Si un `INSERT` mete varias filas, solo se registra una (arbitraria). Debe escribirse set-based: `INSERT INTO auditoria (id) SELECT id FROM inserted;`.
7. Reescribe para que sea sargable: `WHERE LEFT(email, 3) = 'ana'`.
   R: `WHERE email LIKE 'ana%'`: un `LIKE` con prefijo fijo puede usar un índice sobre `email`.
8. ¿Por qué `WHERE id NOT IN (SELECT cliente_id FROM pedidos)` puede devolver cero filas inesperadamente?
   R: Porque si `cliente_id` tiene algún `NULL`, la comparación `id <> NULL` es desconocida y descarta todas las filas. Se usa `NOT EXISTS` o se filtran los `NULL` en la subconsulta.
9. ¿Qué información da `SET STATISTICS IO ON` y cómo la usas para comparar dos versiones de una consulta?
   R: Las lecturas lógicas, físicas y de read-ahead por tabla. Comparas las lecturas lógicas de cada versión: la que lee menos páginas hace menos trabajo, independientemente del estado de la caché.
10. Escribe una consulta que calcule, por mes, el total de ventas y la variación respecto al mes anterior.
   R: Agrega por mes en una CTE y usa `LAG` sobre el resultado:
   ```sql
   WITH m AS (
     SELECT DATEFROMPARTS(YEAR(fecha), MONTH(fecha), 1) AS mes, SUM(monto) AS total
     FROM ventas
     GROUP BY DATEFROMPARTS(YEAR(fecha), MONTH(fecha), 1)
   )
   SELECT mes, total, total - LAG(total) OVER (ORDER BY mes) AS variacion
   FROM m;
   ```

## Explícalo con tus palabras

Explica en dos minutos cómo diseñarías desde cero la base de una app nueva: modelado, restricciones, lógica en procedimientos y cómo vigilarías el rendimiento.
