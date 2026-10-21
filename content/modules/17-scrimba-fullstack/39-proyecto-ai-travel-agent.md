---
title: Proyecto — AI Travel Agent
kind: project
hours: 3
sources: Scrimba Fullstack Developer Path — Módulo 9 AI Engineering — Solo Project - AI Travel Agent
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; OpenAI — Function calling | https://platform.openai.com/docs/guides/function-calling
---

## Objetivo

Construir solo un agente de viajes que, a partir de un formulario (origen, destino, fechas, presupuesto), usa herramientas para consultar el clima y opciones de vuelo y hotel, y devuelve un plan de viaje.

## Qué hacer

1. (≈ 15 min) Lee el enunciado de **Solo Project - AI Travel Agent** en Scrimba. Puedes usar la API de OpenAI que propone Scrimba o tu cuenta de NaN Builders, que es compatible con el formato de OpenAI (`https://api.nan.builders/v1`, modelo `deepseek-v4-flash`).
2. (≈ 2 h 15 min) Construye:
   - Formulario con validación (fechas coherentes, presupuesto positivo).
   - Al menos dos herramientas: `getWeather(city, date)` (una API real del clima) y `searchOptions(...)` (puede devolver datos simulados).
   - El bucle del agente con function calling, un máximo de 5 iteraciones y manejo de errores de cada herramienta.
   - Respuesta final mostrada en streaming o, como mínimo, con un estado de "pensando".
   - La API key nunca en el código del navegador: usa un pequeño servidor o función que la lea de una variable de entorno (si aún no lo sabes hacer, déjalo en un `.env` local y anótalo como deuda para la sesión de Node).
3. (≈ 30 min) Prueba tres viajes distintos, uno con una herramienta que falla. Escribe en el README cómo funciona el bucle y sube a GitHub.

## Conceptos clave

- **Herramientas con descripciones precisas**: el modelo elige herramientas por su descripción; describe cuándo usarla y qué devuelve.
- **Fallo de herramienta**: devuelve al modelo un mensaje de error claro en lugar de romper el bucle; puede decidir otra estrategia.

## Explícalo con tus palabras

Explica qué hace tu agente en cada vuelta del bucle para el viaje que probaste y qué pasó cuando falló una herramienta.
