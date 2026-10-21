---
title: Diseño y arquitectura de software
phase: books
summary: Vas a poder diseñar código orientado a objetos con patrones y SOLID, modelar requisitos y dominios (UML, ERD, DDD) y estructurar un servicio con Clean/Hexagonal Architecture en TypeScript.
---

Este módulo te lleva desde la pregunta más básica ("¿qué hace que un diseño sea bueno?") hasta la estructura completa de un sistema: cómo se organizan las clases, los componentes, los modelos del negocio y las capas de una aplicación para que cambiar el software siga siendo barato con los años.

## Recorrido

1. **Fundamentos** (sesiones 1–3): qué es diseño y arquitectura, los tres paradigmas y los principios orientados a objetos que sostienen todos los patrones (programar contra interfaces, composición sobre herencia).
2. **Patrones de diseño** (sesiones 4–10): los patrones del catálogo GoF que más vas a ver en código real, agrupados en creacionales, estructurales y de comportamiento, siempre con ejemplos en TypeScript y con el "cuándo no usarlo".
3. **SOLID y componentes** (sesiones 11–14): los cinco principios a nivel de clase y los seis principios a nivel de componente (cohesión y acoplamiento). Cierra con una **evaluación intermedia** (sesión 15).
4. **Análisis y modelado** (sesiones 16–21): levantar requisitos, modelar datos y procesos (DFD), modelar objetos con UML, diseñar datos (ERD, normalización) y elegir una arquitectura de sistema. Cierra con un **proyecto** de modelado.
5. **Domain-Driven Design táctico** (sesiones 22–26): lenguaje ubicuo, capas, entidades, value objects, servicios, módulos, agregados, fábricas, repositorios y diseño flexible.
6. **Domain-Driven Design estratégico** (sesiones 27–29): bounded contexts, context map, destilación del core domain y estructura a gran escala. Cierra con un **proyecto** de modelado de dominio.
7. **Clean y Hexagonal Architecture** (sesiones 30–35): límites, regla de dependencia, Screaming Architecture, humble objects, ports & adapters y los "detalles" (base de datos, web, frameworks). Incluye un **proyecto** de servicio hexagonal en TypeScript con tests y una sesión de integración.
8. **Evaluación final** (sesión 36).

## Fuentes

- *Design Patterns: Elements of Reusable Object-Oriented Software* (Gamma, Helm, Johnson, Vlissides): cap. 1 y los patrones más usados de los caps. 3–5.
- *Clean Architecture* (Robert C. Martin): partes I–VI.
- *Domain-Driven Design* (Eric Evans): partes I, II y IV, más lo esencial de la parte III.
- *Systems Analysis and Design*, 9.ª ed. (Shelly y Rosenblatt): caps. 4, 5, 6, 9 y 10, de forma selectiva.

## Cómo se conecta

El módulo 02 (oficio y prácticas) te dio código limpio y hábitos; aquí subes un nivel de abstracción: de la función a la clase, de la clase al componente y del componente al sistema. El módulo 04 (sistemas intensivos en datos) y el 05 (system design) van a asumir que sabes separar el dominio de los detalles de infraestructura, que es justo lo que practicas aquí. El módulo 06 (microservicios) reutiliza directamente los bounded contexts y el context map de DDD.

## Técnica de estudio

Cada lección termina con preguntas de repaso (recuerdo activo y repetición espaciada), un ejercicio en TypeScript y una consigna Feynman: explícalo en voz alta como si se lo enseñaras a alguien que empieza. Los proyectos te obligan a combinar varias ideas a la vez, que es donde el diseño se aprende de verdad.
