---
title: Resolución de problemas y algoritmos
phase: books
summary: Al terminar vas a poder atacar un problema nuevo con un método, elegir la estructura de datos adecuada, analizar su costo con Big O y resolver problemas de entrevista en TypeScript explicando tu razonamiento.
---

## Para qué sirve este módulo

Este es el primer módulo de la ruta y la base de todo lo demás. Antes de hablar de arquitectura, sistemas distribuidos o IA necesitas dos músculos: **pensar con método** frente a un problema que no sabes resolver todavía y **conocer el repertorio clásico** de estructuras de datos y algoritmos, con su costo.

El módulo no sigue un libro tras otro. Está organizado por temas y mezcla tres fuentes donde tratan lo mismo:

- **Think Like a Programmer** (V. Anton Spraul): estrategias generales de resolución de problemas, descomponer, reducir, seguir el estado, recursión, clases y reutilización. Los ejemplos del libro están en C++; aquí todo se trabaja en TypeScript y los detalles de punteros se reducen a una nota.
- **Grokking Algorithms** (A. Bhargava): búsqueda binaria, Big O, arrays y listas, recursión, quicksort, tablas hash, grafos, Dijkstra, greedy, programación dinámica y KNN, con intuiciones visuales.
- **Cracking the Coding Interview, 6.ª ed.** (G. McDowell): Big O a fondo, la técnica para recorrer un problema en una entrevista y los capítulos de estructuras de datos, recursión, programación dinámica, ordenamiento y búsqueda. Sus problemas sirven de inspiración; los enunciados de aquí son propios.

## Cómo está construido

1. **Método** (sesiones 01–02): un plan para cualquier problema y práctica con problemas pequeños.
2. **Costo** (03–04): búsqueda binaria y Big O, para poder comparar soluciones.
3. **Estructuras lineales** (05–08): arrays, listas enlazadas, clases y tipos abstractos, pilas y colas.
4. **Recursión y ordenamiento** (09–11) y un **proyecto** de implementación y benchmark (12).
5. **Búsqueda rápida y jerarquías** (13–14): tablas hash, árboles y heaps.
6. **Grafos** (15–16) y un **proyecto** de rutas (17).
7. **Optimización** (18–20): greedy, NP y programación dinámica.
8. **Técnica de entrevista, KNN y oficio** (21–23) y un **proyecto** de problemas de entrevista (24).
9. **Evaluación final** del módulo (25).

## Cómo estudiar cada sesión

- Lee `Estudio` con atención activa: cada vez que aparezca código, predice qué hace antes de leer la explicación.
- Responde las preguntas de repaso **sin mirar** y compara con la respuesta modelo (active recall). Esas preguntas entran a tu mazo de repaso espaciado.
- Haz el ejercicio hasta cumplir su criterio de terminado. Si no lo cumples, la sesión no está terminada.
- Cierra con la consigna Feynman: explica el tema en voz alta o por escrito como si se lo contaras a alguien que empieza.

## Cómo se conecta con el resto

Big O, tablas hash, árboles y grafos reaparecen en el módulo de sistemas intensivos en datos (índices, B-trees, LSM), en diseño de sistemas (caches, particionado, consistent hashing) y al final de la ruta de DataCamp (estructuras de datos y algoritmos en Python). Lo que aprendas aquí en TypeScript lo vas a traducir después a Python.
