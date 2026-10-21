---
title: Evaluación — AI Engineering with LangChain
kind: evaluation
hours: 3
sources: AI Engineering with LangChain (DataCamp), todo el track
links: AI Engineering with LangChain (DataCamp) | https://app.datacamp.com/learn/skill-tracks/ai-engineering-with-langchain
---

## Objetivo

Comprobar que puedes construir, evaluar y operar aplicaciones con LangChain y LangGraph. Hazla como un examen: 3 horas, sin DataCamp, sin notas y sin buscar en internet. Primero responde todas las preguntas por escrito (o en un archivo `.py`/`.sql` cuando pidan código) durante unas 2 horas. Luego usa el tutor de la app para calificar cada respuesta contra la respuesta modelo, y dedica la última hora a repasar en DataCamp los capítulos donde fallaste.

## Preguntas de evaluación

1. Escribe cómo configurarías `ChatOpenAI` y `OpenAIEmbeddings` de LangChain contra NaN Builders y explica `check_embedding_ctx_length=False`.
   R: Ambos con `base_url` y clave del entorno:
   ```python
   import os
   from langchain_openai import ChatOpenAI, OpenAIEmbeddings

   base = "https://api.nan.builders/v1"
   llm = ChatOpenAI(base_url=base, model="deepseek-v4-flash", api_key=os.environ["NAN_API_KEY"])
   emb = OpenAIEmbeddings(base_url=base, model="qwen3-embedding",
                          api_key=os.environ["NAN_API_KEY"], check_embedding_ctx_length=False)
   ```
   Con `check_embedding_ctx_length=False`, LangChain envía el texto tal cual en lugar de tokenizarlo con el tokenizador de OpenAI, que no corresponde a otros modelos.
2. ¿Qué hace `with_structured_output` y por qué es útil en un nodo de clasificación?
   R: Hace que el modelo devuelva un objeto que cumple un esquema (Pydantic o JSON Schema). En un clasificador garantiza que la ruta sea uno de los valores permitidos y el código puede usarla sin parsear texto.
3. Diseña un dataset y dos evaluadores para un chatbot de soporte.
   R: Dataset: 30–50 conversaciones reales o realistas con la resolución esperada. Evaluadores: uno algorítmico (¿la respuesta incluye el enlace correcto o la categoría correcta?) y un LLM-as-judge con rúbrica (¿resolvió la tarea?, ¿fue cortés?, ¿inventó políticas?). Se registran también costo y latencia por conversación.
4. ¿Qué partes debe tener una plantilla de prompt bien diseñada?
   R: Propósito, rol, especificación de entrada, especificación de salida, instrucciones claras y ejemplos.
5. Escribe tres reglas para ejecutar de forma segura el SQL que genera un LLM.
   R: 1) Conexión con un usuario de solo lectura y permisos mínimos. 2) Aceptar solo una sentencia `SELECT` sobre tablas de una lista blanca. 3) Imponer un límite de filas y un timeout, y registrar cada consulta.
6. ¿Qué diferencia hay entre llamadas a herramientas en paralelo y en serie? Da un ejemplo de cada una.
   R: En paralelo, herramientas independientes en el mismo turno: el clima de Bogotá y de Madrid. En serie, una depende del resultado de otra: buscar el id del cliente y luego consultar sus pedidos.
7. Escribe un nodo de LangGraph y una arista condicional que decidan entre terminar o regenerar según un contador de intentos.
   R: La función de la arista lee el estado y devuelve el nombre del siguiente nodo:
   ```python
   def decidir(state):
       if state["aprobado"] or state["intentos"] >= 2:
           return "fin"
       return "regenerar"

   graph.add_conditional_edges("revisar", decidir, {"fin": END, "regenerar": "regenerar"})
   ```
8. ¿Cuándo usarías routing y cuándo reflexión?
   R: Routing cuando las entradas son de tipos distintos que necesitan tratamientos especializados. Reflexión cuando la calidad de una salida mejora con una crítica y una corrección (redacción, código), siempre con un límite de iteraciones.
9. ¿Por qué un agente ReAct sin límites es arriesgado en producción?
   R: Porque puede entrar en bucles, acumular errores, gastar tokens sin control y ejecutar acciones no deseadas. Se controla con límites de pasos, herramientas con mínimo privilegio, confirmación humana para acciones con efectos y monitoreo.
10. ¿Cómo distingues si un mal resultado de tu RAG viene de la recuperación o de la generación?
   R: Revisando los chunks recuperados: si la información correcta no está entre ellos, falla la recuperación (chunking, embeddings, k, filtros); si está y la respuesta igual es mala, falla la generación (prompt, modelo, instrucciones de citar).

## Explícalo con tus palabras

Explica en dos minutos cómo llevarías tu agente de estudio a producción: evaluación, límites, seguridad y monitoreo.
