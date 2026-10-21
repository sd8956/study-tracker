---
title: Proyecto — análisis de temas en reseñas con embeddings
kind: project
hours: 3
sources: DataCamp — proyecto Topic Analysis of Clothing Reviews with Embeddings
links: Topic Analysis of Clothing Reviews with Embeddings (proyecto DataCamp) | https://www.datacamp.com/projects/2026
---

## Objetivo

Completar el proyecto de DataCamp (agrupar reseñas de ropa en temas y hacer búsquedas por similitud) y replicarlo en tu máquina con `qwen3-embedding` de NaN Builders, agregando clustering y una evaluación simple.

## Qué hacer

1. Haz el proyecto en DataCamp (~60 min).
2. Descarga un dataset público de reseñas (el de DataCamp, *Women's Clothing E-Commerce Reviews*, está en Kaggle) y toma una muestra de 1.000 reseñas (10 min).
3. Calcula embeddings por lotes con NaN Builders, guárdalos en un archivo `.npy` para no recalcularlos y maneja errores con reintentos (30 min).
4. Agrupa con k-means (scikit-learn) en 5–8 clusters; para nombrar cada cluster, pide al LLM un título a partir de 10 reseñas de ese cluster (30 min).
5. Implementa `buscar_similares(texto, k)` y prueba tres consultas (por ejemplo «talla pequeña», «tela delgada») (15 min).
6. Evalúa: etiqueta a mano 30 reseñas con su tema y mide qué porcentaje coincide con el cluster asignado (20 min).
7. Criterio de terminado: un script que imprime los clusters con su nombre y tamaño, las búsquedas funcionan y anotas el porcentaje de acuerdo con tu etiquetado manual (15 min).

## Explícalo con tus palabras

Explica cómo pasaste de mil reseñas sueltas a cinco temas con nombre sin leerlas todas.
