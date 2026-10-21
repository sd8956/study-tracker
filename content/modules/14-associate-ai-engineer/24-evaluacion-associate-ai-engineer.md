---
title: Evaluación — Associate AI Engineer for Developers
kind: evaluation
hours: 3
sources: Associate AI Engineer for Developers (DataCamp), todo el track
links: Associate AI Engineer for Developers (DataCamp) | https://app.datacamp.com/learn/career-tracks/associate-ai-engineer-for-developers
---

## Objetivo

Comprobar que puedes diseñar y construir aplicaciones con LLMs de forma responsable. Hazla como un examen: 3 horas, sin DataCamp, sin notas y sin buscar en internet. Primero responde todas las preguntas por escrito (o en un archivo `.py`/`.sql` cuando pidan código) durante unas 2 horas. Luego usa el tutor de la app para calificar cada respuesta contra la respuesta modelo, y dedica la última hora a repasar en DataCamp los capítulos donde fallaste.

## Preguntas de evaluación

1. Escribe una llamada mínima a Chat Completions con el SDK `openai` contra un endpoint compatible, leyendo la clave del entorno.
   R: Cliente con `base_url` y clave del entorno; el texto sale de `choices[0].message.content`:
   ```python
   import os
   from openai import OpenAI

   client = OpenAI(base_url="https://api.nan.builders/v1", api_key=os.environ["NAN_API_KEY"])
   r = client.chat.completions.create(
       model="deepseek-v4-flash",
       messages=[{"role": "system", "content": "Responde en una frase."},
                 {"role": "user", "content": "¿Qué es un embedding?"}],
       temperature=0.2,
   )
   print(r.choices[0].message.content)
   ```
2. ¿Por qué un chatbot necesita reenviar el historial y qué estrategias evitan que crezca sin límite?
   R: Porque la API es sin estado. Estrategias: ventana de los últimos N mensajes, resumen de la conversación antigua, o guardar hechos relevantes y recuperarlos cuando hagan falta.
3. Diseña un prompt que clasifique tickets de soporte en `facturacion`, `tecnico` u `otro` y devuelva JSON.
   R: Rol y tarea claros; las tres etiquetas con una definición corta de cada una; dos o tres ejemplos (few-shot); el ticket entre delimitadores; y la orden de responder solo con `{"categoria": "...", "confianza": 0-1}`. En el código se valida el JSON y que la categoría esté en la lista.
4. Describe el ciclo de function calling y dónde validas los argumentos.
   R: Envías mensajes y definiciones de herramientas; el modelo devuelve una llamada con nombre y argumentos; tu código valida los argumentos (tipos, rangos, permisos) antes de ejecutar; devuelves el resultado como mensaje de herramienta y el modelo redacta la respuesta final.
5. Calcula la similitud coseno entre a = [1, 0] y b = [1, 1] y explica qué significa.
   R: cos = (1·1 + 0·1) / (1 · √2) = 1/√2 ≈ 0,707. Los vectores apuntan en direcciones parecidas pero no iguales: textos relacionados, no idénticos.
6. ¿Qué es un namespace en una base vectorial y cuándo lo usarías?
   R: Una partición lógica de un índice. Lo usas para aislar datos de distintos clientes o usuarios (multitenancy) y para que cada consulta busque solo en su subconjunto.
7. ¿Cuándo eliges RAG y cuándo fine-tuning?
   R: RAG para conocimiento que cambia o que necesita citas; fine-tuning para comportamiento, formato o estilo consistente que el prompting no logra, o para reducir costo con un modelo más pequeño especializado.
8. Escribe una chain LCEL que traduzca un texto al inglés y devuelva un string.
   R: Plantilla, modelo y parser unidos con `|`:
   ```python
   from langchain_core.prompts import ChatPromptTemplate
   from langchain_core.output_parsers import StrOutputParser

   prompt = ChatPromptTemplate.from_template("Traduce al inglés:\n{texto}")
   chain = prompt | llm | StrOutputParser()
   chain.invoke({"texto": "Hola mundo"})
   ```
9. ¿Qué diferencia hay entre una tool, un resource y un prompt en MCP?
   R: Tool: acción que el modelo invoca (puede tener efectos). Resource: datos de solo lectura identificados por URI que la app usa como contexto. Prompt: plantilla de instrucciones reutilizable que ofrece el servidor.
10. Menciona cuatro prácticas de LLMOps que aplicarías antes y después de desplegar tu app RAG.
   R: Antes: conjunto de evaluación con métricas de recuperación y de respuesta, y pruebas sin red de la lógica. Después: monitoreo de latencia, costo por petición y errores; registro de preguntas y feedback; y gestión de secretos y protección contra prompt injection.

## Explícalo con tus palabras

Explica en dos minutos la arquitectura de tu app RAG: dónde están los datos, cómo se recupera el contexto, cómo se genera la respuesta y cómo la evalúas.
