---
title: Limitaciones, casos de uso y gestión de triggers
kind: course
hours: 2
sources: DataCamp — Building and Optimizing Triggers in SQL Server, caps. 3–4
links: Building and Optimizing Triggers in SQL Server (DataCamp) | https://www.datacamp.com/courses/building-and-optimizing-triggers-in-sql-server
---

## Objetivo

Conocer las limitaciones de los triggers, aplicarlos en casos típicos y saber deshabilitarlos, modificarlos, eliminarlos e investigar los problemáticos.

## Qué hacer

1. Abre *Building and Optimizing Triggers in SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Trigger Limitations and Use Cases» y el capítulo 4 «Trigger Optimization and Management» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Limitaciones**: lógica oculta, difícil de depurar, impacto en rendimiento y en el tamaño de las transacciones.
- **Triggers anidados y recursivos**: un trigger puede disparar otro; la recursión debe controlarse.
- **DISABLE / ENABLE TRIGGER**: desactiva un trigger temporalmente sin borrarlo.
- **sys.triggers y sys.trigger_events**: vistas de catálogo para listar triggers y los eventos que los disparan.
- **Auditoría con triggers**: guardar en una tabla histórica quién cambió qué y cuándo.

## Preguntas de repaso

1. ¿Por qué se dice que los triggers son «lógica oculta»?
   R: Porque quien ejecuta un `INSERT` no ve que se dispara código adicional; los efectos secundarios sorprenden al depurar y al estimar rendimiento.
2. ¿Cómo listas los triggers de una base y la tabla a la que pertenecen?
   R: `SELECT t.name, OBJECT_NAME(t.parent_id) AS tabla, t.is_disabled FROM sys.triggers t;`
3. ¿Cómo desactivas un trigger durante una carga masiva y lo reactivas?
   R: `DISABLE TRIGGER trg_auditoria ON dbo.orders;` antes de la carga y `ENABLE TRIGGER trg_auditoria ON dbo.orders;` después.

## Explícalo con tus palabras

Argumenta a favor y en contra de usar triggers para auditoría frente a hacerlo en la aplicación.
