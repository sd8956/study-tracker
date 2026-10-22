---
title: "Oficio: código limpio y prácticas de ingeniería"
phase: books
summary: Vas a poder escribir TypeScript limpio y fácil de cambiar, testearlo bien, revisarlo con criterio y evolucionar sus contratos sin romper a quien los usa, como lo hace un equipo profesional.
---

Este módulo trata del **oficio**: lo que separa a alguien que "hace que funcione" de alguien cuyo código otros pueden leer, cambiar y mantener durante años. Va de lo pequeño a lo grande: primero la actitud y la comunicación, después el código línea a línea (nombres, funciones, errores), luego el diseño de unidades más grandes (clases, módulos, una pincelada de arquitectura), después los tests y, por último, las prácticas que hacen que un equipo entero escale: guías de estilo, code review, documentación, evolución de contratos y deprecación, e integración continua.

## Recorrido

1. **Mentalidad** (sesión 1): qué es ingeniería de software (tiempo, escala, trade-offs, ley de Hyrum), la actitud pragmática y el costo del código sucio, y el trabajo y la comunicación en equipo.
2. **Código limpio a escala pequeña** (sesiones 4 y 7): nombres, funciones pequeñas que hacen una sola cosa (sin argumentos flag ni niveles de abstracción mezclados) y comentarios; después objetos frente a estructuras de datos, no mutar las entradas, manejo de errores y fallos parciales, fronteras con código ajeno detrás de adaptadores y gestión de recursos. Cierra con el **proyecto 1** (sesión 10): refactorizar una base de código TypeScript deliberadamente sucia.
3. **Diseño** (sesiones 11–16): ETC, DRY, ortogonalidad, clases y cohesión, herencia frente a composición, reversibilidad y configuración, diseño simple y refactoring, arquitectura en breve (hexagonal, clean architecture, scope rule) y el catálogo de code smells. Cierra con una **evaluación parcial** (sesión 17).
4. **Herramientas y tests** (sesiones 18–24): herramientas básicas y debugging, por qué testear y unit tests limpios, test doubles, tests más grandes y property-based testing, requisitos y TDD ágil. Cierra con el **proyecto 2** (sesión 24): una kata TDD con dobles de prueba.
5. **Ingeniería a escala de equipo** (sesiones 25, 26 y 28): guías de estilo, análisis estático y documentación como código; code review; evolución de contratos y deprecación, con lo esencial de la política de ramas y de la integración y entrega continuas. Lo básico de Git lo practicas en el módulo 11 (DataCamp), y el pipeline real (GitHub Actions, gitleaks y pre-commit) lo montas en la ruta Cloud.
6. **Evaluación final** (sesión 31).

## Fuentes

- *The Pragmatic Programmer*, 20.ª edición de aniversario (Hunt y Thomas): la mayoría de los temas, agrupados por tema.
- *Clean Code* (Robert C. Martin): caps. 1–10, 12 y 17, con los ejemplos de Java traducidos a TypeScript.
- *Software Engineering at Google* (Winters, Manshreck y Wright): caps. 1–3, 8–16, 19, 20, 23 y 24, de forma selectiva.
- *The Amazing Gentleman Programming Book*: capítulos de código limpio y agilidad, comunicación, TypeScript, arquitectura hexagonal, Clean Architecture (también en el frontend), barrels, arquitectura de software y soft skills.

## Cómo se conecta

El módulo 01 te dio la capacidad de resolver problemas y razonar sobre algoritmos; este módulo te enseña a convertir esas soluciones en código que un equipo puede mantener. El módulo 03 (diseño y arquitectura) sube un nivel de abstracción: patrones, SOLID completo, DDD y Clean/Hexagonal Architecture en profundidad. Aquí solo ves una introducción a la arquitectura para que tengas el mapa.

## Técnica de estudio

Cada lección termina con preguntas de repaso (recuerdo activo; entran a tu mazo de repetición espaciada), un ejercicio en TypeScript con criterio de terminado y una consigna Feynman. Los proyectos te obligan a aplicar varias ideas a la vez sobre código concreto, que es donde el oficio se aprende de verdad. Las evaluaciones las corrige el tutor.
