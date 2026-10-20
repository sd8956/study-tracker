---
title: Introducción a los triggers
kind: course
hours: 2
sources: DataCamp — Building and Optimizing Triggers in SQL Server, cap. 1
links: Building and Optimizing Triggers in SQL Server (DataCamp) | https://www.datacamp.com/courses/building-and-optimizing-triggers-in-sql-server
---

## Objetivo

Entender qué es un trigger, crear el primero en T-SQL y saber cuándo conviene y cuándo hay alternativas mejores.

## Qué hacer

1. Abre *Building and Optimizing Triggers in SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Introduction to Triggers» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Trigger**: código que se ejecuta automáticamente ante un evento (`INSERT`, `UPDATE`, `DELETE`, DDL o logon).
- **Tablas inserted y deleted**: pseudotablas con las filas nuevas y las viejas de la operación que disparó el trigger.
- **Usos típicos**: auditoría, mantener datos derivados, impedir cambios no permitidos.
- **Alternativas**: restricciones (`CHECK`, foreign keys), columnas calculadas, stored procedures.

## Preguntas de repaso

1. ¿Qué contienen `inserted` y `deleted` en un `UPDATE`?
   R: `deleted` tiene los valores anteriores de las filas modificadas e `inserted` los nuevos.
2. ¿Por qué un trigger debe estar escrito para muchas filas y no para una?
   R: Porque se ejecuta una vez por instrucción, no por fila: un `UPDATE` que cambia 1.000 filas dispara el trigger una vez con 1.000 filas en `inserted`.
3. ¿Cuándo preferirías una restricción `CHECK` a un trigger?
   R: Cuando la regla se expresa sobre la propia fila (por ejemplo `precio > 0`): es más simple, más rápida y declarativa.

## Explícalo con tus palabras

Explica qué es un trigger usando la analogía de una alarma que se activa al abrir una puerta.
