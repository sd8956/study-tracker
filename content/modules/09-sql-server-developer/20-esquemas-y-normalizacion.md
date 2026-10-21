---
title: Star schema, snowflake y normalización
kind: course
hours: 2
sources: DataCamp — Database Design, cap. 2
links: Database Design (DataCamp) | https://www.datacamp.com/courses/database-design
---

## Objetivo

Construir star y snowflake schemas y normalizar hasta 1NF, 2NF y 3NF entendiendo las anomalías que se evitan.

## Qué hacer

1. Abre *Database Design* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «Database Schemas and Normalization» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Star schema**: una tabla de hechos con dimensiones desnormalizadas a su alrededor.
- **Snowflake schema**: las dimensiones se normalizan en varias tablas (más joins, menos redundancia).
- **1NF**: cada celda tiene un valor atómico y no hay grupos repetidos.
- **2NF**: 1NF y ninguna columna depende solo de una parte de una clave compuesta.
- **3NF**: 2NF y ninguna columna no clave depende de otra columna no clave (sin dependencias transitivas).
- **Anomalías**: de inserción, actualización y borrado: lo que la normalización evita.

## Preguntas de repaso

1. Una tabla `pedidos(pedido_id, cliente_id, cliente_ciudad, total)` ¿cumple 3NF? ¿Por qué?
   R: No: `cliente_ciudad` depende de `cliente_id`, que no es la clave; es una dependencia transitiva. Se mueve a una tabla `clientes(cliente_id, ciudad)`.
2. ¿Qué gana y qué pierde un snowflake frente a un star schema?
   R: Gana menos redundancia y actualizaciones más consistentes; pierde simplicidad y velocidad de lectura porque las consultas necesitan más joins.
3. ¿Qué es una anomalía de actualización? Da un ejemplo.
   R: Cuando un mismo dato está repetido en varias filas y al cambiarlo olvidas alguna, quedando inconsistente. Ejemplo: la dirección de un cliente copiada en cada pedido; si se muda y solo cambias algunos pedidos, ahora tiene dos direcciones.
4. ¿Por qué los warehouses suelen preferir desnormalizar?
   R: Porque priorizan lecturas rápidas y simples para análisis; las escrituras son por lotes y controladas, así que el riesgo de anomalías es menor.

## Explícalo con tus palabras

Normaliza en voz alta, paso a paso hasta 3NF, una hoja de cálculo de inscripciones a cursos (alumno, curso, profesor, oficina del profesor).
