---
title: Advanced React — compound components
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 16 Advanced React.js — Reusability (segundo tercio)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; patterns.dev — Compound Pattern | https://www.patterns.dev/react/compound-pattern/
---

## Objetivo

Construir componentes compuestos (Menu, Toggle) que comparten estado implícito a través de Context y ofrecen una API flexible.

## Qué hacer

1. (≈ 85 min) **Reusability**, segundo tercio: *Aside: Compound Components Intro*, *Compound Components in React* (partes 1 a 3), *Aside - Compound components w/ dot syntax*, *Add context to the Menu component*, *Toggle Context* y el quiz.
2. (≈ 35 min) Recuerdo activo: preguntas de repaso y consigna Feynman. Relaciónalo con los patrones de diseño del módulo 03.

## Conceptos clave

- **Compound components**: varias piezas que funcionan juntas (`<Menu>`, `<Menu.Button>`, `<Menu.Dropdown>`, `<Menu.Item>`) como `<select>` y `<option>` en HTML.
- **Estado implícito**: el padre guarda el estado (abierto o cerrado) y lo comparte con sus piezas por Context; quien usa el componente no lo cablea a mano.
- **Sintaxis con punto**: `Menu.Button = MenuButton` agrupa las piezas en un espacio de nombres y deja clara la relación.
- **Inversión de control**: quien usa el componente decide la estructura y el contenido; el componente aporta el comportamiento.

## Preguntas de repaso

1. ¿Qué ventaja tiene `<Menu><Menu.Button/><Menu.Dropdown>...</Menu.Dropdown></Menu>` frente a `<Menu items={[...]} buttonText="..."/>`?
   R: Que el consumidor controla la estructura, el orden y el contenido de cada pieza sin que el componente tenga que prever cada variante con más props; la configuración por props crece sin límite.
2. ¿Cómo comparten el estado las piezas de un compound component?
   R: El componente padre crea el estado y lo provee mediante un Context; cada pieza lo lee con `useContext`, sin que el usuario pase props entre ellas.
3. ¿Qué analogía en HTML nativo tiene este patrón?
   R: `<select>` con `<option>`, o `<table>` con `<tr>` y `<td>`: piezas separadas que solo tienen sentido juntas y comparten estado implícito.

## Explícalo con tus palabras

Explica el patrón compound components a alguien que conoce `<select>` y `<option>` pero no React.
