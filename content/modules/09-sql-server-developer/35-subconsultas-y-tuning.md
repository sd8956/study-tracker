---
title: Subconsultas, EXISTS y herramientas de tuning
kind: course
hours: 2
sources: DataCamp — Improving Query Performance in SQL Server, caps. 3–4
links: Improving Query Performance in SQL Server (DataCamp) | https://www.datacamp.com/courses/improving-query-performance-in-sql-server
---

## Objetivo

Elegir entre subconsultas, `IN`, `EXISTS`, `INTERSECT`/`EXCEPT` y joins para comprobar presencia o ausencia, y medir con `STATISTICS TIME/IO`, índices y planes de ejecución.

## Qué hacer

1. Abre *Improving Query Performance in SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Sub-queries and presence or absence» y el capítulo 4 «Query performance tuning» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Subconsulta correlacionada**: se evalúa por cada fila externa; puede ser costosa.
- **EXISTS / NOT EXISTS**: se detienen al encontrar la primera coincidencia; seguros con `NULL`.
- **NOT IN y NULL**: si la subconsulta devuelve algún `NULL`, `NOT IN` no devuelve filas.
- **INTERSECT / EXCEPT**: presencia o ausencia comparando conjuntos completos.
- **SET STATISTICS TIME / IO ON**: muestran tiempo de CPU y lecturas lógicas por tabla.
- **Clustered vs nonclustered index**: el clustered ordena físicamente la tabla (uno por tabla); el nonclustered es una estructura aparte con punteros.
- **Plan de ejecución**: muestra operadores (seek, scan, join) y su costo estimado.

## Preguntas de repaso

1. ¿Por qué `NOT EXISTS` es más seguro que `NOT IN` para encontrar ausencias?
   R: Porque si la subconsulta de `NOT IN` contiene un `NULL`, la comparación da desconocido para todas las filas y el resultado sale vacío; `NOT EXISTS` no tiene ese problema.
2. ¿Qué métrica de `STATISTICS IO` miras primero y por qué?
   R: Las lecturas lógicas (logical reads): cuentan páginas leídas desde memoria, son estables entre ejecuciones y reflejan cuánto trabajo hizo la consulta.
3. ¿Qué diferencia hay entre un index seek y un index scan?
   R: El seek navega el árbol del índice directo a las filas que cumplen el filtro; el scan recorre todo el índice. Con filtros selectivos, el seek lee muchas menos páginas.
4. ¿Por qué no conviene crear índices en todas las columnas?
   R: Porque cada índice ocupa espacio y se actualiza en cada `INSERT`/`UPDATE`/`DELETE`, haciendo más lentas las escrituras.

## Explícalo con tus palabras

Explica un índice clustered y uno nonclustered usando un libro: el orden de las páginas y el índice al final.
