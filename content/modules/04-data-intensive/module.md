---
title: Sistemas intensivos en datos
phase: books
summary: Al terminar podrás explicar cómo almacenan, replican, particionan y procesan datos las bases de datos y los sistemas distribuidos modernos, y elegir con criterio entre sus trade-offs.
---

Este módulo convierte *Designing Data-Intensive Applications* (Martin Kleppmann) en 24 sesiones de estudio. No necesitas abrir el libro: cada sesión explica las ideas con texto propio, diagramas ASCII, tablas comparativas y ejemplos de sistemas reales (PostgreSQL, MySQL, Cassandra, DynamoDB, Kafka, ZooKeeper, Spark…).

## Recorrido

- **Parte I — Fundamentos (sesiones 01–09).** Fiabilidad, escalabilidad y mantenibilidad; modelos de datos y lenguajes de consulta; cómo guardan los datos los motores de almacenamiento (hash indexes, LSM-trees, B-trees, almacenamiento columnar); codificación y evolución de esquemas. Incluye el **proyecto 1**: un key-value store log-structured con hash index y compactación en TypeScript.
- **Parte II — Datos distribuidos (sesiones 10–21).** Replicación (líder-seguidor, multi-líder, sin líder), particionamiento, transacciones y niveles de aislamiento, los problemas reales de los sistemas distribuidos (redes, relojes, pausas), linealizabilidad, orden causal y consenso. Incluye el **proyecto 2**: un simulador de replicación líder-seguidor con lag donde observas anomalías de *read-your-writes*.
- **Parte III — Datos derivados (sesiones 22–23).** Batch processing y stream processing.
- **Evaluación final (sesión 25).** Abre con un repaso breve de la visión final del libro (integración de datos, corrección end-to-end y ética) y sigue con preguntas de razonamiento que cruzan todo el módulo, corregidas por el tutor.

## Cómo estudiarlo

1. Lee el `## Estudio` activamente: cada vez que aparezca un diagrama, intenta predecir qué pasa antes de leer la explicación.
2. Responde las preguntas de repaso sin mirar la respuesta modelo (active recall); luego compara.
3. Haz el ejercicio. Los ejercicios de código usan TypeScript (Node ≥ 22) o SQL sobre PostgreSQL/SQLite.
4. Cierra con la consigna Feynman: explícalo en voz alta como si se lo contaras a alguien que empieza.

## Conexión con el resto de la ruta

Este módulo es la base técnica del módulo 05 (system design) y del 06 (microservicios): allí se asume que entiendes replicación, particionamiento, consistencia y colas de mensajes. También prepara la última fase de la ruta (cloud y seguridad), donde vas a operar servicios gestionados como RDS, DynamoDB o Kinesis que implementan exactamente estas ideas.
