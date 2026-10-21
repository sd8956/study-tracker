---
title: Testing — mocks de servicios externos y TDD con accesibilidad
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 15 Testing — Mock external services: Test; Accessibility testing with a side of TDD; The AriaLiveStatus Component Challenge; The WordLetters Component Challenge
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; Vitest — Mocking | https://vitest.dev/guide/mocking.html ; Mock Service Worker | https://mswjs.io/docs/
---

## Objetivo

Testear componentes que dependen de la red sin llamar a la red real, y practicar TDD construyendo componentes accesibles.

## Qué hacer

1. (≈ 85 min) **Módulo 15 Testing**, segunda mitad: *Mock external services: Test*, *Accessibility testing with a side of TDD*, *The AriaLiveStatus Component Challenge* y *The WordLetters Component Challenge*. En los retos, escribe el test primero (rojo), luego el código (verde) y luego refactoriza.
2. (≈ 35 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Mockear la red**: sustituir `fetch` o interceptar peticiones (con `vi.fn`, `vi.spyOn` o Mock Service Worker) para que el test sea rápido, determinista y no dependa de un servicio externo.
- **Tipos de dobles**: stub (devuelve datos fijos), spy (registra llamadas), mock (con expectativas) y fake (implementación simplificada); módulo 02.
- **Probar estados asíncronos**: `findBy...` espera a que aparezca el resultado; prueba también el estado de error.
- **TDD**: rojo → verde → refactor; el test describe el comportamiento antes de que exista el código.
- **Tests de accesibilidad**: comprobar roles, nombres accesibles y regiones `aria-live` hace que la accesibilidad no se rompa al refactorizar.

## Preguntas de repaso

1. ¿Por qué no deberías llamar a la API real en un test de componente?
   R: Porque el test se vuelve lento, frágil (falla si la API cae o cambia sus datos) y no determinista, y puede tener efectos reales. Con un doble controlas exactamente la respuesta, incluidos los errores.
2. Describe el ciclo de TDD aplicado al componente `AriaLiveStatus`.
   R: Rojo: escribes un test que renderiza el componente con un mensaje y espera encontrar un elemento con `role="status"` (o `aria-live`) con ese texto; falla porque no existe. Verde: escribes el mínimo código para pasarlo. Refactor: mejoras nombres y estructura con el test en verde.
3. ¿Por qué hay que probar también el caso de error de una petición mockeada?
   R: Porque es un camino real que el usuario verá; si no lo pruebas, un cambio puede dejar la interfaz rota o en blanco cuando la red falle sin que ningún test lo detecte.

## Explícalo con tus palabras

Explica a un compañero cuándo un mock ayuda y cuándo puede ocultar un bug real.
