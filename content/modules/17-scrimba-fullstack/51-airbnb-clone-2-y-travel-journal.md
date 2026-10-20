---
title: React — render de listas, keys y solo project Travel Journal
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 14 React.js Fundamentals — Build an AirBnb Experiences clone (segunda mitad); Solo Project (PRO) - Travel Journal
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; React — Renderizado de listas | https://es.react.dev/learn/rendering-lists
---

## Objetivo

Generar componentes desde datos con `map`, usar `key` correctamente y aplicar renderizado condicional, primero en el clon y luego solo en el Travel Journal.

## Qué hacer

1. (≈ 50 min) **Build an AirBnb Experiences clone**, segunda mitad: datos en un archivo aparte, `map` a componentes, `key`, spread de props y badges condicionales ("SOLD OUT", "ONLINE").
2. (≈ 45 min) **Travel Journal**: un diario de viajes con una entrada por objeto de datos (`Entry`), generado con `map`. Si la sección PRO no está disponible para ti, haz el mismo enunciado por tu cuenta.
3. (≈ 25 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **`map` a JSX**: `data.map(item => <Card key={item.id} {...item} />)`.
- **`key`**: identificador estable y único entre hermanos que permite a React saber qué elemento es cuál entre renders; no uses el índice si la lista se reordena o cambia.
- **Spread de props**: `{...item}` pasa todas las propiedades; cómodo, pero oculta qué usa el componente.
- **Renderizado condicional**: `cond && <Badge />` o `cond ? <A /> : <B />`; cuidado con `0 && ...`, que pinta un 0.

## Preguntas de repaso

1. ¿Para qué sirve la prop `key` y por qué no conviene usar el índice?
   R: Para que React identifique cada elemento de una lista entre renders y actualice solo lo que cambió. Si usas el índice y la lista se reordena o se inserta algo al principio, las keys pasan a apuntar a otros elementos y se mezclan el estado y los inputs.
2. ¿Qué se pinta con `{items.length && <List />}` cuando `items` está vacío y cómo lo corriges?
   R: Se pinta un `0`, porque `0 && ...` devuelve 0 y React lo renderiza. Corrección: `{items.length > 0 && <List />}`.
3. ¿Qué ventaja y qué desventaja tiene pasar props con `{...item}`?
   R: Ventaja: menos código cuando el objeto ya tiene la forma que espera el componente. Desventaja: no se ve qué props usa el componente y puedes pasar datos de más sin darte cuenta.

## Explícalo con tus palabras

Explica qué hace React con las `key` cuando insertas una entrada nueva al principio del diario.
