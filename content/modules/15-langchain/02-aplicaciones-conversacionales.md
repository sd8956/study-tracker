---
title: Aplicaciones conversacionales con memoria y streaming
kind: course
hours: 2
sources: DataCamp — LLM Application Fundamentals with LangChain, Conversational Applications
links: LLM Application Fundamentals with LangChain (DataCamp) | https://www.datacamp.com/courses/llm-application-fundamentals-with-langchain
---

## Objetivo

Construir chatbots que mantienen el contexto entre turnos, persisten la conversación en una base de datos y muestran la respuesta en streaming.

## Qué hacer

1. Abre *LLM Application Fundamentals with LangChain* en DataCamp (ver enlaces de la sesión) y completa la segunda parte del curso, «Conversational Applications» (estructura de mensajes, prompts de chatbot, lógica de conversación, UI con Gradio, persistencia en base de datos y streaming), y cualquier capítulo restante (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Mensajes**: `SystemMessage`, `HumanMessage`, `AIMessage` estructuran la conversación.
- **MessagesPlaceholder**: reserva en un prompt template el lugar del historial.
- **Persistencia**: guardar los mensajes por sesión en una base de datos para retomarlos.
- **Streaming**: `.stream()` entrega tokens a medida que se generan.
- **Generators con yield**: la función de la UI hace `yield` del texto acumulado para que Gradio lo vaya mostrando.

## Preguntas de repaso

1. ¿Para qué sirve `MessagesPlaceholder` en un `ChatPromptTemplate`?
   R: Para insertar el historial de mensajes en una posición del prompt, entre el system message y el mensaje nuevo del usuario.
2. ¿Por qué guardar la conversación en una base de datos y no solo en memoria?
   R: Para que sobreviva a reinicios del servidor, permita varias sesiones o usuarios y se pueda auditar o analizar después.
3. ¿Cómo se implementa streaming en una interfaz de chat con Python?
   R: Iterando sobre `chain.stream(...)` y haciendo `yield` del texto acumulado en cada fragmento; la UI (por ejemplo Gradio) actualiza el mensaje con cada `yield`.

## Explícalo con tus palabras

Explica por qué el streaming mejora la experiencia aunque la respuesta tarde lo mismo en completarse.
