---
title: Proyecto — guía de viaje a París con la API de chat
kind: project
hours: 3
sources: DataCamp — proyecto Planning a Trip to Paris with the OpenAI API
links: Planning a Trip to Paris with the OpenAI API (proyecto DataCamp) | https://www.datacamp.com/projects/1849
---

## Objetivo

Completar el proyecto de DataCamp (una guía de viaje que responde preguntas sobre París) y luego construir tu versión local con NaN Builders: un asistente de viajes de terminal con system prompt, historial y salida estructurada.

## Qué hacer

1. Haz el proyecto en DataCamp (~30 min).
2. Crea un proyecto local con un entorno virtual, instala `openai` y configura `NAN_API_KEY` en un archivo `.env` que esté en `.gitignore` (15 min).
3. Escribe un asistente de terminal con system prompt (guía turística de la ciudad que elijas), historial recortado y temperatura baja (40 min).
4. Agrega un comando `/plan N` que pida un itinerario de N días en JSON con claves `dia`, `manana`, `tarde`, `noche` y lo valide con `json.loads`; si falla, reintenta una vez con un mensaje que explique el error (40 min).
5. Maneja errores de red y de cuota con `try/except` y un reintento con espera exponencial (20 min).
6. Escribe una prueba que reemplace el cliente por un objeto falso (`monkeypatch`) y verifique la validación del JSON sin llamar a la API (25 min).
7. Criterio de terminado: el asistente mantiene la conversación, `/plan 3` devuelve un itinerario válido y la prueba pasa sin red (10 min).

## Explícalo con tus palabras

Explica por qué validas y reintentas la salida JSON en lugar de confiar en que el modelo siempre la devuelve bien.
