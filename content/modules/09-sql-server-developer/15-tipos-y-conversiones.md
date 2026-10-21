---
title: Tipos de datos y conversión implícita
kind: course
hours: 2
sources: DataCamp — Functions for Manipulating Data in SQL Server, cap. 1
links: Functions for Manipulating Data in SQL Server (DataCamp) | https://www.datacamp.com/courses/functions-for-manipulating-data-in-sql-server
---

## Objetivo

Elegir el tipo de dato correcto en SQL Server y entender cuándo hay conversión implícita, cuándo explícita y su impacto en rendimiento.

## Qué hacer

1. Abre *Functions for Manipulating Data in SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Choosing the appropriate data type» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Familias de tipos**: numéricos exactos (`INT`, `DECIMAL`), aproximados (`FLOAT`), fecha/hora, texto (`VARCHAR`, `NVARCHAR`).
- **VARCHAR vs NVARCHAR**: `NVARCHAR` guarda Unicode (2 bytes por carácter); los literales Unicode llevan prefijo `N'...'`.
- **Precedencia de tipos**: al comparar tipos distintos, SQL Server convierte el de menor precedencia al de mayor.
- **Conversión implícita**: la hace el motor solo; sobre una columna indexada puede impedir usar el índice.
- **CAST y CONVERT**: conversión explícita; `CONVERT` acepta un estilo.

## Preguntas de repaso

1. ¿Por qué comparar una columna `VARCHAR` indexada con un literal `N'texto'` puede ser lento?
   R: Porque `NVARCHAR` tiene mayor precedencia: el motor convierte la columna a `NVARCHAR` fila por fila y puede no usar el índice (scan en lugar de seek).
2. ¿Qué tipo usarías para precios y por qué no `FLOAT`?
   R: `DECIMAL(p, s)` (por ejemplo `DECIMAL(10,2)`), porque es exacto. `FLOAT` es aproximado y acumula errores de redondeo.
3. ¿Qué diferencia hay entre conversión implícita y explícita?
   R: La implícita la decide el motor según la precedencia de tipos; la explícita la escribes tú con `CAST`/`CONVERT`, y así controlas el resultado y evitas sorpresas.

## Explícalo con tus palabras

Explica la precedencia de tipos con el ejemplo de comparar un número con un string que contiene un número.
