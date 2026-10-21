---
title: Tipos de triggers — AFTER, INSTEAD OF, DDL y logon
kind: course
hours: 2
sources: DataCamp — Building and Optimizing Triggers in SQL Server, cap. 2
links: Building and Optimizing Triggers in SQL Server (DataCamp) | https://www.datacamp.com/courses/building-and-optimizing-triggers-in-sql-server
---

## Objetivo

Distinguir y crear triggers AFTER e INSTEAD OF sobre DML, triggers DDL y logon triggers.

## Qué hacer

1. Abre *Building and Optimizing Triggers in SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «Classification of Triggers» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **AFTER (FOR)**: se ejecuta después de que la operación se aplicó; puede deshacerla con `ROLLBACK`.
- **INSTEAD OF**: reemplaza la operación; útil para validar o para hacer actualizables ciertas vistas.
- **DDL trigger**: reacciona a `CREATE`, `ALTER`, `DROP` a nivel de base o servidor; `EVENTDATA()` da los detalles en XML.
- **Logon trigger**: se ejecuta al iniciar sesión; puede bloquear conexiones.

## Preguntas de repaso

1. ¿Cuál es la diferencia clave entre un trigger AFTER y uno INSTEAD OF?
   R: El AFTER se ejecuta cuando la operación ya ocurrió; el INSTEAD OF se ejecuta en lugar de la operación, que no ocurre a menos que el trigger la haga.
2. Da un uso real de un DDL trigger.
   R: Registrar en una tabla de auditoría quién y cuándo ejecutó `DROP TABLE` o `ALTER TABLE`, o impedir borrar tablas en producción.
3. ¿Qué riesgo tiene un logon trigger mal escrito?
   R: Puede impedir que todos (incluido el administrador) inicien sesión. Se recupera con la Dedicated Administrator Connection (DAC).

## Explícalo con tus palabras

Explica los cuatro tipos de trigger como cuatro guardias distintos de un edificio: quién vigila qué y cuándo actúa.
