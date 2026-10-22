---
title: Diseño de sistemas
phase: books
summary: Vas a poder diseñar de punta a punta un sistema a gran escala (requisitos, estimaciones, API, datos, diagrama, deep dives y trade-offs) y defenderlo por escrito.
---

## Objetivo del módulo

Este módulo convierte lo que aprendiste en el módulo 04 (Designing Data-Intensive Applications) en una caja de herramientas práctica para diseñar sistemas. DDIA te explicó **por qué** funcionan los motores de almacenamiento, la replicación, el particionado, las transacciones y el consenso. Aquí no se vuelve a enseñar eso: se usa. CAP y los quórums (módulo 04, sesiones 12 y 19) y el particionado por hash (módulo 04, sesión 14) se dan por sabidos; los casos de estudio los aplican directamente. El foco está en los **bloques de construcción** (DNS, CDN, load balancers, caches, colas, APIs, bases de datos) y en **casos de estudio** completos donde combinas esos bloques bajo restricciones reales.

## Recorrido

1. **Fundamentos y bloques de construcción (sesiones 01–13).** Escalar de un servidor a millones de usuarios; rendimiento, latencia y disponibilidad; redes; balanceo y proxies; cache y CDN; bases de datos en la práctica; asincronía; estilos de API y tiempo real; arquitectura de aplicación; resiliencia y operación; seguridad.
2. **Estimación y método (sesiones 14–15).** Cálculos back-of-the-envelope y un framework de cuatro pasos para cualquier problema de diseño.
3. **Casos de estudio (sesiones 16–29).** Alternan lecciones de 2 h y proyectos de 3 h tipo "diseña X de punta a punta": rate limiter, key-value store, generador de IDs, URL shortener, notificaciones, news feed, chat, Google Drive y un sistema tipo Uber (que incluye los índices geoespaciales que necesita), y cierran con una sesión de patrones recurrentes.
4. **Evaluación final (sesión 30).** Preguntas de evaluación con respuestas modelo y un mini caso de diseño.

## Fuentes

- *System Design Interview — An Insider's Guide* (Alex Xu). El PDF de `Books/` contiene los capítulos 1–16 (escala, estimación, framework y 12 casos de estudio).
- *The System Design Primer* (donnemartin/system-design-primer): temas de escalabilidad, apéndice de números y soluciones guiadas.
- *System Design* (karanpratapsingh/system-design): capítulos I–V, desde redes hasta casos como WhatsApp, Twitter, Netflix y Uber.

## Cómo estudiar este módulo

- **Recuerdo activo**: antes de leer el `## Estudio`, intenta responder las preguntas de repaso de la sesión anterior sin mirar.
- **Feynman**: cada sesión termina con una consigna para explicar el tema como si se lo contaras a alguien que no programa.
- **Proyectos**: en las sesiones de 3 h produces un *design doc* escrito. Guárdalos en una carpeta propia: en la evaluación final los vas a reutilizar.
- **Siempre con números**: cada decisión de diseño se justifica con una estimación o con un trade-off explícito. "Usaría Kafka" no es una respuesta; "uso una cola porque el pico es 10x el promedio y el consumidor procesa 2.000 msg/s" sí lo es.
