---
title: La API de OpenAI y prompting básico
kind: course
hours: 2
sources: DataCamp — Working with the OpenAI API, caps. 1–2
links: Working with the OpenAI API (DataCamp) | https://www.datacamp.com/courses/working-with-the-openai-api
---

## Objetivo

Enviar peticiones a un modelo de chat con pocas líneas de código, leer la respuesta y usar prompts para generar, transformar, clasificar y analizar sentimiento, incluido few-shot prompting.

## Qué hacer

1. Abre *Working with the OpenAI API* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Introduction to the OpenAI API» y el capítulo 2 «Prompting OpenAI Models» (~75 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Reproduce en tu máquina un ejercicio del capítulo con el SDK `openai` apuntando a NaN Builders: `OpenAI(base_url="https://api.nan.builders/v1", api_key=os.environ["NAN_API_KEY"])` y modelo `deepseek-v4-flash` (15 min).
4. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
5. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Cliente y clave**: `client = OpenAI()` lee la clave de una variable de entorno; nunca la pongas en el código.
- **Chat Completions**: `client.chat.completions.create(model=..., messages=[...])`; la respuesta está en `response.choices[0].message.content`.
- **Tokens**: unidades de texto que el modelo procesa; determinan costo y límites (`usage`).
- **max_tokens / max_completion_tokens**: límite de la longitud de la respuesta.
- **temperature**: controla la aleatoriedad: baja para respuestas consistentes, alta para variedad.
- **Zero-shot, one-shot, few-shot**: dar cero, uno o varios ejemplos en el prompt para guiar el formato y el criterio.

## Preguntas de repaso

1. ¿Dónde está el texto generado en la respuesta de Chat Completions?
   R: En `response.choices[0].message.content`.
2. ¿Qué temperatura usarías para clasificar sentimiento y cuál para generar ideas de nombres? ¿Por qué?
   R: Baja (0–0.2) para clasificar, porque quieres respuestas consistentes y reproducibles; más alta (0.8–1) para generar ideas, porque quieres variedad.
3. ¿Qué es few-shot prompting y cuándo ayuda?
   R: Incluir varios ejemplos de entrada y salida esperada en el prompt. Ayuda cuando el formato o el criterio son difíciles de describir con palabras, por ejemplo una clasificación con categorías propias.
4. ¿Por qué conviene revisar `usage` en las respuestas?
   R: Porque indica los tokens de entrada y salida, que determinan el costo y te avisan si te acercas al límite de contexto.

## Explícalo con tus palabras

Explica qué viaja en una petición a un LLM y qué vuelve, como si describieras un sobre con una carta y su respuesta.
