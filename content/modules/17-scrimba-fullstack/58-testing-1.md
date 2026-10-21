---
title: Testing — tipos de tests y primeros tests de componentes
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 15 Testing — Welcome to the Testing Module; Types of testing; Write your first test; What we will test: Meme Generator; Test user interactions
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; Vitest | https://vitest.dev/guide/ ; Testing Library — Queries | https://testing-library.com/docs/queries/about
---

## Objetivo

Escribir tests de componentes React que comprueban el comportamiento que ve el usuario, incluidas sus interacciones.

## Qué hacer

1. (≈ 85 min) **Módulo 15 Testing**, primera mitad: *Welcome to the Testing Module*, *Types of testing*, *Write your first test*, *What we will test: Meme Generator* y *Test user interactions*. Ya viste por qué testear, test doubles y TDD en el módulo 02: aquí lo aplicas a React.
2. (≈ 35 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Pirámide de tests**: muchos unitarios (rápidos y aislados), algunos de integración (piezas juntas) y pocos end-to-end (la app real en un navegador).
- **Estructura AAA**: Arrange (preparar), Act (actuar), Assert (comprobar).
- **Testing Library**: renderiza el componente y lo consulta como un usuario: `getByRole`, `getByLabelText`, `getByText`; evita detalles de implementación.
- **`get` vs `query` vs `find`**: `getBy` falla si no encuentra; `queryBy` devuelve `null` (para comprobar ausencia); `findBy` espera de forma asíncrona.
- **`user-event`**: simula interacciones reales (`await user.click(button)`, `await user.type(input, "hola")`).

## Preguntas de repaso

1. ¿Por qué se prefiere `getByRole("button", { name: /generar/i })` a buscar por clase CSS?
   R: Porque consulta como lo haría un usuario o un lector de pantalla; el test no se rompe al cambiar clases o estructura y, de paso, verifica que el elemento es accesible.
2. ¿Cuándo usas `queryBy...` en lugar de `getBy...`?
   R: Cuando quieres afirmar que algo no está en pantalla: `expect(screen.queryByText("Error")).toBeNull()`. `getBy` lanzaría una excepción antes de llegar a la aserción.
3. ¿Qué es un detalle de implementación y por qué no deberías testearlo?
   R: Algo interno que el usuario no ve, como el nombre de una variable de estado o qué hook usas. Si el test depende de ello, se rompe al refactorizar aunque el comportamiento siga siendo correcto, y deja de dar confianza.

## Explícalo con tus palabras

Explica qué comprueba un buen test del Meme Generator y qué no debería comprobar.
