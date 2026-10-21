---
title: AI Engineering — fundamentos, streaming y RAG con vector databases
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 9 AI Engineering — AI Engineering Fundamentals; RAG and Vector Databases
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; Supabase — pgvector | https://supabase.com/docs/guides/database/extensions/pgvector
---

## Objetivo

Llamar a un modelo de lenguaje desde JavaScript, transmitir su respuesta en streaming y construir un pipeline RAG con embeddings en una base de datos vectorial.

## Qué hacer

1. (≈ 20 min) **Módulo 9 AI Engineering → AI Engineering Fundamentals** (incluye *Streaming AI Responses*, *Token Costs & Context Windows* y el reto de la app "Gift Genie").
2. (≈ 70 min) **RAG and Vector Databases**: crear un embedding, preparar la base vectorial, dividir texto en fragmentos, insertarlos y buscar por similitud.
3. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman. Ya viste RAG en el módulo 07 (AI Engineering de Chip Huyen) y en DataCamp con LangChain: aquí lo implementas en JavaScript.

## Conceptos clave

- **Chat completions**: envías un array de mensajes con roles (`system`, `user`, `assistant`) y el modelo genera el siguiente; el modelo no recuerda nada entre llamadas, el historial lo mandas tú.
- **Tokens y ventana de contexto**: pagas por tokens de entrada y salida, y el total no puede pasar la ventana del modelo.
- **Streaming**: el servidor envía la respuesta por partes (Server-Sent Events) y la interfaz la muestra mientras se genera.
- **Embedding**: vector de números que representa el significado de un texto; textos parecidos quedan cerca.
- **RAG**: recuperas los fragmentos más similares a la pregunta y los añades al prompt para que el modelo responda con tus datos.
- **Chunking**: dividir documentos en fragmentos con algo de solapamiento; ni tan grandes que diluyan el significado ni tan pequeños que pierdan contexto.

## Preguntas de repaso

1. ¿Por qué un chatbot tiene que reenviar el historial de mensajes en cada llamada?
   R: Porque la API del modelo no guarda estado entre peticiones; el "recuerdo" de la conversación es el array de mensajes que la app envía cada vez, limitado por la ventana de contexto.
2. Explica los pasos de RAG desde que llega la pregunta del usuario.
   R: Calcular el embedding de la pregunta, buscar en la base vectorial los fragmentos más similares (por ejemplo, por similitud coseno), insertarlos en el prompt como contexto y pedir al modelo que responda usando ese contexto.
3. ¿Qué gana el usuario con el streaming de respuestas?
   R: Ve las primeras palabras en cientos de milisegundos en lugar de esperar varios segundos a la respuesta completa; la latencia percibida baja mucho aunque el tiempo total sea el mismo.

## Explícalo con tus palabras

Explica qué es un embedding a alguien sin formación técnica, usando la idea de un mapa donde las palabras parecidas viven cerca.
