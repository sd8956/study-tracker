---
title: Desarrollo con SQL Server (SQL Server Developer)
phase: datacamp
summary: Vas a diseñar bases de datos relacionales y escribir T-SQL de producción: consultas analíticas, funciones, stored procedures, transacciones, triggers y tuning.
---

Segundo track de DataCamp. Es el más largo de la fase (41 h, 10 cursos) y no tiene duplicados con el resto de la ruta.

**Track:** [SQL Server Developer](https://app.datacamp.com/learn/career-tracks/sql-server-developer) (career track, 41 h).

**Cursos (en el orden del track):**

1. *Introduction to SQL Server* (4 h) — sesiones 1–3.
2. *Introduction to Relational Databases in SQL* (4 h) — sesiones 4–6.
3. *Intermediate SQL Server* (4 h) — sesiones 7–9.
4. Proyecto: SQL Server local en Docker y consultas sobre un dataset propio — sesión 10.
5. *Time Series Analysis in SQL Server* (5 h) — sesiones 11–14.
6. *Functions for Manipulating Data in SQL Server* (4 h) — sesiones 15–17.
7. Evaluación parcial (cursos 1–5) — sesión 18.
8. *Database Design* (4 h) — sesiones 19–21.
9. Proyecto: base de datos normalizada para el propio Study Tracker — sesión 22.
10. *Transactions and Error Handling in SQL Server* (4 h) — sesiones 23–25.
11. *Writing Functions and Stored Procedures in SQL Server* (4 h) — sesiones 26–28.
12. *Building and Optimizing Triggers in SQL Server* (4 h) — sesiones 29–31.
13. Proyecto: stored procedures, transacciones y auditoría con triggers sobre tu base del Study Tracker — sesión 32.
14. *Improving Query Performance in SQL Server* (4 h) — sesiones 33–35.
15. Proyecto: tuning con un millón de filas — sesión 36.
16. Evaluación final — sesión 37.

**Duplicados omitidos:** ninguno.

**Entorno para los proyectos.** DataCamp ejecuta el SQL en el navegador; para los proyectos instalas SQL Server 2022 Developer en Docker (`mcr.microsoft.com/mssql/server:2022-latest`) y te conectas con `sqlcmd` o con la extensión MSSQL de VS Code. Los proyectos 22, 32 y 36 construyen una sola base de datos, `StudyTracker`, que crece sesión a sesión.
