---
title: Advanced React — rutas protegidas y flujo de login
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 16 Advanced React.js — Routing (último cuarto)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; React Router — Navigate | https://reactrouter.com/api/components/Navigate
---

## Objetivo

Proteger secciones de la app que requieren login y redirigir al usuario de vuelta tras autenticarse, entendiendo qué protege y qué no protege el frontend.

## Qué hacer

1. (≈ 90 min) **Routing**, último cuarto: *Protected Routes Intro*, *Protected Routes - Implementing "auth"*, *AuthRequired Layout Route*, *Navigate*, formulario de login, *Navigate to /host route after login*, manejo de errores de la petición y el quiz final de la sección.
2. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Layout de protección**: una ruta `AuthRequired` que, si no hay usuario, devuelve `<Navigate to="/login" replace state={{ from: location }} />`; si lo hay, devuelve `<Outlet />`.
- **Volver al origen**: el login lee `location.state.from` y tras autenticarse navega allí con `useNavigate()`.
- **`replace`**: sustituye la entrada del historial para que "atrás" no devuelva a la página protegida y provoque otra redirección.
- **La seguridad está en el servidor**: proteger rutas en React solo mejora la experiencia; cualquiera puede modificar el JavaScript. La API debe verificar la sesión en cada petición (sesión 45).
- **Estados del formulario**: enviando, error y éxito; deshabilita el botón mientras se envía.

## Preguntas de repaso

1. ¿Una ruta protegida en React impide que alguien vea los datos privados?
   R: No. Solo oculta la interfaz; el código del cliente se puede modificar. Lo que protege los datos es que la API verifique la autenticación y la autorización en cada petición.
2. ¿Por qué se pasa `replace` al redirigir al login?
   R: Para reemplazar la entrada del historial de la página protegida; si no, al pulsar "atrás" el usuario volvería a ella y sería redirigido otra vez al login, en bucle.
3. ¿Cómo vuelve el usuario a la página que quería visitar tras iniciar sesión?
   R: La ruta protegida guarda la ubicación original en el `state` de la redirección (`state={{ from: location }}`); el login la lee y, tras autenticarse, navega a `from.pathname` (o a una página por defecto).

## Explícalo con tus palabras

Explica el viaje completo de un usuario no autenticado que intenta abrir `/host/income`.
