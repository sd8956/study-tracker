---
title: Responses API — herramientas, salidas estructuradas y streaming
kind: course
hours: 2
sources: DataCamp — Working with the OpenAI Responses API, caps. 2–3
links: Working with the OpenAI Responses API (DataCamp) | https://www.datacamp.com/courses/working-with-the-openai-responses-api
---

## Objetivo

Darle herramientas al modelo (web search y funciones propias), obtener salidas estructuradas confiables en JSON, hacer streaming de eventos y combinar texto con imágenes.

## Qué hacer

1. Abre *Working with the OpenAI Responses API* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «Building Tools for LLMs» y el capítulo 3 «Advanced Patterns for Production» (~75 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. En tu máquina, con Chat Completions y NaN Builders, implementa una herramienta `obtener_hora(zona)` con function calling y haz el ciclo completo: el modelo pide la herramienta, tu código la ejecuta y devuelves el resultado (20 min).
4. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
5. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Herramientas alojadas**: como web search: el proveedor las ejecuta por ti.
- **Function calling**: describes funciones con JSON Schema; el modelo decide llamar una y devuelve los argumentos; tu código la ejecuta y devuelve el resultado al modelo.
- **Structured outputs**: pedir que la salida cumpla un JSON Schema estricto (por ejemplo con modelos de Pydantic).
- **Streaming**: recibir la respuesta como eventos a medida que se genera; mejora la latencia percibida.
- **Multimodalidad**: enviar imágenes junto con texto como entrada.

## Preguntas de repaso

1. Describe el ciclo completo de function calling.
   R: 1) Envías el mensaje con la definición de las herramientas. 2) El modelo responde con una llamada a herramienta (nombre y argumentos JSON). 3) Tu código valida los argumentos y ejecuta la función. 4) Envías el resultado al modelo como mensaje de herramienta. 5) El modelo genera la respuesta final usando ese resultado.
2. ¿Quién ejecuta la función en function calling, el modelo o tu código?
   R: Tu código. El modelo solo decide qué función llamar y con qué argumentos; por eso debes validar los argumentos antes de ejecutar.
3. ¿Qué ventaja tiene structured outputs frente a pedir JSON en el prompt?
   R: Garantiza que la respuesta cumple el esquema (campos, tipos), en lugar de depender de que el modelo siga la instrucción; reduce el código de validación y reintento.
4. ¿Por qué se usa streaming en interfaces de chat?
   R: Porque el usuario ve el texto aparecer de inmediato en lugar de esperar la respuesta completa; la latencia percibida baja aunque el tiempo total sea el mismo.

## Explícalo con tus palabras

Explica function calling como un jefe (el modelo) que delega tareas a un asistente (tu código) y espera el informe.
