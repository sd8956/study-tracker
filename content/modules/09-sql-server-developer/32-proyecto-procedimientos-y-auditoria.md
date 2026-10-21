---
title: Proyecto — stored procedures, transacciones y auditoría en StudyTracker
kind: project
hours: 3
sources: Proyecto propio sobre Transactions and Error Handling, Writing Functions and Stored Procedures y Building and Optimizing Triggers
links: Referencia de T-SQL (Microsoft Learn) | https://learn.microsoft.com/en-us/sql/t-sql/language-reference
---

## Objetivo

Agregar a tu base `StudyTracker` la lógica de negocio en T-SQL: completar sesiones y registrar repasos con stored procedures transaccionales, una función de progreso y triggers de auditoría.

## Estudio

### Requisitos

- `dbo.fn_ProgresoModulo(@modulo_id)`: inline TVF que devuelve sesiones hechas, total y porcentaje.
- `dbo.usp_CompletarSesion @sesion_id, @fecha`: valida que la sesión exista y que la anterior del mismo módulo esté completada (las sesiones son secuenciales); si no, lanza `THROW 51001`. Inserta el progreso dentro de una transacción.
- `dbo.usp_RegistrarRepaso @tarjeta_id, @acierto BIT`: guarda el repaso y mueve la tarjeta de caja de Leitner (acierto: sube una caja hasta 5; fallo: vuelve a la 1) y recalcula la próxima fecha (caja 1: 1 día, 2: 2, 3: 4, 4: 8, 5: 16). Todo en una transacción con `XACT_ABORT ON`.
- Trigger `AFTER UPDATE, DELETE` sobre progreso que guarda en `auditoria_progreso` los valores anteriores, el usuario (`SUSER_SNAME()`) y la fecha.
- Trigger DDL a nivel de base que registra cualquier `DROP TABLE`.

## Qué hacer

1. Escribe la función de progreso y pruébala con el seed (25 min).
2. Escribe `usp_CompletarSesion` con `TRY...CATCH`, transacción y `THROW`; prueba el caso feliz y el de una sesión fuera de orden (45 min).
3. Escribe `usp_RegistrarRepaso`; prueba un acierto, un fallo y una tarjeta inexistente (45 min).
4. Crea los triggers y verifica que un `UPDATE` de 3 filas genera 3 filas de auditoría (el trigger es set-based) (35 min).
5. Provoca un error a mitad de `usp_RegistrarRepaso` (por ejemplo una caja inválida que rompa el `CHECK`) y comprueba que no quedó nada a medias (15 min).
6. Criterio de terminado: un script `tests.sql` ejecuta todos los casos anteriores y muestra con `SELECT` el estado esperado tras cada uno.

## Explícalo con tus palabras

Explica por qué la validación de orden de sesiones y la escritura del progreso deben ir en la misma transacción.
