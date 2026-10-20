---
title: RAISERROR, THROW y mensajes personalizados
kind: course
hours: 2
sources: DataCamp — Transactions and Error Handling in SQL Server, cap. 2
links: Transactions and Error Handling in SQL Server (DataCamp) | https://www.datacamp.com/courses/transactions-and-error-handling-in-sql-server
---

## Objetivo

Lanzar errores propios con `RAISERROR` y `THROW`, relanzar errores desde un CATCH y construir mensajes personalizados.

## Qué hacer

1. Abre *Transactions and Error Handling in SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «Raising, throwing and customizing your errors» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **RAISERROR**: lanza un error con mensaje, severidad y estado; permite formato tipo printf (`%s`, `%d`).
- **THROW**: forma moderna recomendada; sin parámetros dentro de un CATCH relanza el error original.
- **Números de error de usuario**: `THROW` usa números ≥ 50000.
- **FORMATMESSAGE / sp_addmessage**: construir mensajes con parámetros o registrarlos en el catálogo.
- **Punto y coma antes de THROW**: la instrucción anterior debe terminar con `;`.

## Preguntas de repaso

1. ¿Qué ventaja tiene `THROW;` sin parámetros dentro de un CATCH?
   R: Relanza el error original con su número, mensaje y línea intactos, así quien llamó ve el error real en lugar de uno genérico.
2. Escribe cómo lanzarías un error si un producto no existe.
   R: `IF NOT EXISTS (SELECT 1 FROM products WHERE product_id = @id) THROW 51000, 'El producto no existe.', 1;`
3. Menciona dos diferencias entre `RAISERROR` y `THROW`.
   R: `THROW` puede relanzar el error original sin parámetros y siempre usa severidad 16; `RAISERROR` permite elegir severidad y formatear el mensaje con parámetros, pero no relanza el error original tal cual. Microsoft recomienda `THROW` para código nuevo.

## Explícalo con tus palabras

Explica por qué «tragarse» un error en un CATCH sin relanzarlo ni registrarlo es peligroso.
