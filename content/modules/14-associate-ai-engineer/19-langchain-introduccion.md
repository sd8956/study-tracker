---
title: LangChain — componentes, prompt templates y memoria
kind: course
hours: 2
sources: DataCamp — Developing LLM Applications with LangChain, cap. 1
links: Developing LLM Applications with LangChain (DataCamp) | https://www.datacamp.com/courses/developing-llm-applications-with-langchain
---

## Objetivo

Conocer los componentes de LangChain (modelos, prompts, parsers, chains, agents), usar modelos de Hugging Face y de OpenAI con la misma interfaz, crear prompt templates y gestionar la memoria de una conversación.

## Qué hacer

1. Abre *Developing LLM Applications with LangChain* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Introduction to LangChain & Chatbot Mechanics» (~75 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. En tu máquina, conecta LangChain a NaN Builders: `ChatOpenAI(base_url="https://api.nan.builders/v1", model="deepseek-v4-flash", api_key=os.environ["NAN_API_KEY"])` e invoca un `ChatPromptTemplate` (15 min).
4. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
5. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Interfaz unificada de modelos**: `ChatOpenAI`, `HuggingFacePipeline` y otros se usan igual con `.invoke()`.
- **PromptTemplate y ChatPromptTemplate**: plantillas con variables para construir prompts reutilizables.
- **FewShotPromptTemplate**: inserta ejemplos en la plantilla.
- **Output parsers**: convierten la salida del modelo en estructuras de Python.
- **Memoria**: estrategias para conservar contexto: historial completo, ventana de los últimos mensajes o resumen.

## Preguntas de repaso

1. ¿Qué ventaja da la interfaz unificada de modelos de LangChain?
   R: Que puedes cambiar de proveedor o de modelo (OpenAI, Hugging Face, uno compatible como NaN Builders) cambiando una línea, sin reescribir el resto de la aplicación.
2. ¿Qué diferencia hay entre una memoria de ventana y una de resumen?
   R: La de ventana guarda solo los últimos N mensajes y olvida los anteriores; la de resumen condensa la conversación antigua en un resumen que ocupa pocos tokens y conserva lo esencial.
3. ¿Para qué sirve un prompt template?
   R: Para separar la estructura fija del prompt de las variables (pregunta, contexto, idioma) y reutilizarlo de forma consistente y probada.

## Explícalo con tus palabras

Explica qué problema resuelve LangChain y qué precio pagas por usarlo frente a llamar la API directo.
