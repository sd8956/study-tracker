---
title: Proyecto — funciones para registrar usuarios de una app
kind: project
hours: 3
sources: DataCamp — proyecto Creating Functions to Register App Users
links: Creating Functions to Register App Users (proyecto DataCamp) | https://www.datacamp.com/projects/2216
---

## Objetivo

Completar el proyecto de DataCamp (validar el formulario de registro de una app y aprobar o rechazar cada intento) y luego llevarlo a tu máquina con pruebas y validaciones más estrictas.

## Qué hacer

1. Haz el proyecto completo en DataCamp (~60 min): integra las funciones de validación existentes en el flujo de registro y escribe las funciones nuevas que aprueban o rechazan el alta.
2. Copia tu solución a un archivo `registro.py` en tu máquina (10 min).
3. Extiéndela: valida el correo con una regla simple (tiene `@` y un punto después), la contraseña (mínimo 8 caracteres, una mayúscula, un número) y que el usuario no exista ya en un `set` de usuarios registrados (40 min).
4. Haz que las funciones de validación lancen `ValueError` con un mensaje claro y que la función de registro capture esos errores y devuelva un resultado `(ok: bool, motivo: str)` (25 min).
5. Escribe al menos 8 `assert` en `checks_registro.py`: un caso válido y un caso inválido por cada regla (25 min).
6. Criterio de terminado: `python checks_registro.py` termina sin errores y cada rechazo devuelve un motivo legible para el usuario.

## Conceptos clave

- **Función pura de validación**: recibe datos, devuelve o lanza; no imprime ni modifica estado global.
- **Composición**: la función de registro llama a validadores pequeños, uno por regla.

## Explícalo con tus palabras

Explica por qué separar cada regla de validación en su propia función hace el registro más fácil de probar y de cambiar.
