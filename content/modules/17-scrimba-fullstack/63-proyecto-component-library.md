---
title: Proyecto — Component Library++
kind: project
hours: 3
sources: Scrimba Fullstack Developer Path — Módulo 16 Advanced React.js — Solo Project - Component Library++
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; WAI-ARIA Authoring Practices | https://www.w3.org/WAI/ARIA/apg/patterns/
---

## Objetivo

Construir solo una pequeña librería de componentes React reutilizables (badges, banners, cards, tooltips y testimonios) aplicando children, reenvío de props, variantes, compound components y custom hooks, con tests.

## Qué hacer

1. (≈ 15 min) Lee el enunciado y el diseño de **Solo Project - Component Library++**. Define la API pública de cada componente antes de programar (props, variantes, piezas).
2. (≈ 2 h 15 min) Construye:
   - `Badge` y `Banner` con variantes (`color`, `status`) y `children`.
   - `Card` y `Testimonial` como compound components donde tenga sentido.
   - `Tooltip` con un custom hook (`useToggle` o similar) que se abre con hover **y** con foco de teclado, y se cierra con Escape.
   - Al menos 2 tests por componente con Testing Library (render de variantes e interacción del tooltip).
   - Una página de demostración que muestre todas las variantes.
   - Criterio de terminado: los componentes aceptan atributos nativos con `...rest`, ninguno tiene estilos acoplados a la página de demo y todos los tests pasan.
3. (≈ 30 min) README con la API de cada componente y ejemplos. Sube a GitHub.

## Conceptos clave

- **API de componente**: lo que el consumidor ve (props y piezas) es un contrato; cambiarlo rompe a quien lo usa (ley de Hyrum, módulo 02).
- **Variantes con un mapa**: `const styles = { success: "...", error: "..." }` en lugar de `if` encadenados.

## Preguntas de repaso

1. ¿Por qué un tooltip debe abrirse también con el foco del teclado?
   R: Porque quien navega con teclado o con tecnologías de asistencia no puede hacer hover; si solo responde al ratón, la información queda inaccesible.
2. ¿Qué ventaja tiene definir la API de los componentes antes de programarlos?
   R: Obliga a pensar desde el consumidor, evita props innecesarias y deja un contrato estable que guía la implementación y los tests.

## Explícalo con tus palabras

Explica las decisiones de API de tu librería como si la presentaras a otro equipo que la va a usar.
