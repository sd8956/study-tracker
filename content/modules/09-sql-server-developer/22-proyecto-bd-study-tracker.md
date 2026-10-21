---
title: Proyecto — base de datos normalizada para el Study Tracker
kind: project
hours: 3
sources: Proyecto propio sobre Introduction to Relational Databases y Database Design
links: SQL Server en Docker (Microsoft Learn) | https://learn.microsoft.com/en-us/sql/linux/quickstart-install-connect-docker ; Referencia de T-SQL (Microsoft Learn) | https://learn.microsoft.com/en-us/sql/t-sql/language-reference
---

## Objetivo

Diseñar en T-SQL, en tercera forma normal, la base de datos de esta misma app de estudio (módulos, sesiones, progreso, repasos y evaluaciones), con restricciones, vistas y roles.

## Estudio

### Dominio

- Una **fase** (libros, DataCamp, Scrimba, cloud) tiene **módulos**; un módulo tiene **sesiones** ordenadas (tipo `lesson`, `course`, `project`, `evaluation`, `task`) con horas planificadas.
- Cada día de estudio registra el **inglés** (minutos, completado) y el avance técnico.
- El **progreso** marca cuándo completaste cada sesión.
- Cada pregunta de repaso es una **tarjeta** con su caja de Leitner y su próxima fecha de repaso; cada repaso guarda el resultado.
- Una **evaluación** tiene intentos, y cada intento tiene respuestas con nota y feedback.

### Entregables

1. Diagrama entidad-relación (puede ser ASCII o Mermaid) en `docs/er.md`.
2. `01-schema.sql`: tablas con primary keys (`IDENTITY` o claves naturales justificadas), foreign keys con su `ON DELETE` razonado, `NOT NULL`, `UNIQUE` y `CHECK` (por ejemplo `hours IN (2, 3)`, caja de Leitner entre 1 y 5).
3. `02-seed.sql`: datos de ejemplo de al menos dos módulos y diez sesiones.
4. `03-views.sql`: vistas `v_progreso_por_modulo` (sesiones hechas/total, horas) y `v_tarjetas_para_hoy`.
5. `04-security.sql`: rol `lector` con `SELECT` solo sobre las vistas.

## Qué hacer

1. Lista entidades, atributos y relaciones; dibuja el diagrama ER (30 min).
2. Revisa cada tabla contra 1NF, 2NF y 3NF y anota en `docs/er.md` una decisión de normalización que tomaste (20 min).
3. Escribe `01-schema.sql` y ejecútalo en una base vacía `StudyTracker` (50 min).
4. Escribe el seed y comprueba que las restricciones rechazan datos inválidos: intenta insertar una sesión de 4 horas y una tarjeta con caja 7 y guarda el error obtenido como comentario (30 min).
5. Crea las vistas y el rol; prueba con `EXECUTE AS USER` que el rol no puede leer las tablas base (30 min).
6. Escribe tres consultas útiles sobre tu modelo (racha de días con inglés completado, horas por semana, tarjetas vencidas) (20 min).
7. Criterio de terminado: los cuatro scripts corren en orden sobre una base vacía sin errores, las vistas devuelven datos coherentes con el seed y el rol `lector` falla al leer una tabla base.

## Explícalo con tus palabras

Justifica en voz alta cada `ON DELETE` que elegiste: ¿qué debería pasar con el progreso si borras una sesión?
