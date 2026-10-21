---
title: Advanced React — persistencia y autenticación con Supabase
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 16 Advanced React.js — Persistence; Authentication
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; Supabase — Auth | https://supabase.com/docs/guides/auth ; Supabase — Row Level Security | https://supabase.com/docs/guides/database/postgres/row-level-security
---

## Objetivo

Persistir los datos de la app en Postgres con Supabase y añadir autenticación real con sesiones y Row Level Security.

## Qué hacer

1. (≈ 90 min) **Persistence** y **Authentication**: *Supabase project setup*, *Set up Database Environment Variable*, *Query the database using supabase-js*, sign-in (función y componente), *Auth Session state*, *Add user to Auth.Users*, *User profiles table*, *RLS: Authenticated users only* y la protección de rutas del carrito.
2. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman. Este mismo proyecto de Study Tracker usó Supabase con RLS antes de pasar a SQLite local: compara ambos enfoques.

## Conceptos clave

- **Backend as a Service**: Supabase da Postgres, autenticación y una API automática; el cliente consulta directamente con `supabase-js`.
- **Variables de entorno en el frontend**: `import.meta.env.VITE_...`; todo lo que llega al navegador es público. La anon key puede ser pública; la service role key, nunca.
- **Sesión**: tras el login, el cliente guarda un token (JWT) y lo envía en cada consulta; `onAuthStateChange` avisa cuando cambia la sesión.
- **Row Level Security**: políticas en la base de datos que deciden qué filas puede leer o escribir cada usuario (`auth.uid() = user_id`). Es la verdadera barrera de seguridad cuando el cliente consulta directamente.
- **Tabla de perfiles**: los datos propios del usuario van en una tabla `profiles` enlazada a `auth.users` por el id.

## Preguntas de repaso

1. Si la anon key de Supabase está en el código del navegador, ¿qué impide que alguien lea todos los datos?
   R: Las políticas de Row Level Security: con RLS activado, cada consulta se evalúa según el usuario autenticado (su JWT) y solo devuelve las filas que las políticas permiten. Sin RLS, la anon key daría acceso a todo.
2. ¿Por qué nunca debe llegar la service role key al frontend?
   R: Porque se salta RLS y tiene acceso total a la base de datos; quien la vea en el navegador podría leer, modificar o borrar cualquier dato.
3. ¿Por qué guardar los datos de perfil en una tabla `profiles` y no en `auth.users`?
   R: Porque `auth.users` la gestiona el sistema de autenticación y no está pensada para exponerse ni modificarse libremente; una tabla propia enlazada por el id te permite tus columnas y tus políticas RLS.

## Explícalo con tus palabras

Explica la diferencia entre proteger datos con un servidor propio (sesión 45) y con Supabase y RLS.
