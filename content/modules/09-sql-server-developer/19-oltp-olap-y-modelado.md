---
title: OLTP, OLAP y modelado de datos
kind: course
hours: 2
sources: DataCamp — Database Design, cap. 1
links: Database Design (DataCamp) | https://www.datacamp.com/courses/database-design
---

## Objetivo

Distinguir OLTP de OLAP, conocer bases de datos, data warehouses y data lakes, y los niveles de modelado (conceptual, lógico, físico).

## Qué hacer

1. Abre *Database Design* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Processing, Storing, and Organizing Data» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **OLTP**: procesamiento de transacciones: muchas escrituras pequeñas, datos actuales (una app de pedidos).
- **OLAP**: procesamiento analítico: lecturas grandes de datos históricos para reportes.
- **Data warehouse**: base optimizada para análisis, alimentada por ETL/ELT desde sistemas OLTP.
- **Data lake**: almacena datos crudos de cualquier tipo, estructurados o no.
- **ETL vs ELT**: transformar antes de cargar o cargar primero y transformar dentro del destino.
- **Modelo conceptual, lógico y físico**: entidades y relaciones → tablas y columnas → tipos, índices y almacenamiento.
- **Modelado dimensional**: tablas de hechos (eventos medibles) rodeadas de dimensiones (contexto).

## Preguntas de repaso

1. ¿Por qué no se suele analizar directamente sobre la base OLTP de producción?
   R: Porque las consultas analíticas son grandes y lentas y competirían con las transacciones de los usuarios; además el esquema OLTP está normalizado para escribir, no para leer en volumen.
2. ¿Qué diferencia hay entre una tabla de hechos y una dimensión?
   R: La tabla de hechos guarda eventos medibles (ventas, montos, cantidades) con foreign keys a las dimensiones; las dimensiones describen el contexto (cliente, producto, fecha).
3. ¿Cuándo eliges un data lake en lugar de un data warehouse?
   R: Cuando necesitas guardar datos crudos y variados (logs, imágenes, JSON) sin decidir aún el esquema, por ejemplo para ciencia de datos; el warehouse es para datos ya limpios y estructurados que alimentan reportes.

## Explícalo con tus palabras

Explica OLTP vs OLAP con el ejemplo de una tienda: el cajero y el gerente que mira ventas del año.
