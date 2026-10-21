---
title: TypeScript en React y en Express
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 17 TypeScript — TypeScript in React; TypeScript & Express
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; React — Usar TypeScript | https://es.react.dev/learn/typescript ; Express — tipos (@types/express) | https://www.npmjs.com/package/@types/express
---

## Objetivo

Tipar componentes, props, estado y eventos en React, y requests, responses y middleware en Express.

## Qué hacer

1. (≈ 50 min) **TypeScript in React**: *Welcome to TypeScript and React*, *Typing Component Props*, *Typing React Components*, estado y eventos. Opcional: anota **Solo project - Typed Tenzies** como práctica (convertir tu Tenzies a TS).
2. (≈ 40 min) **TypeScript & Express**: *Setting up an Express & TypeScript project*, *Running an Express & TypeScript project*, *Typing Express data* y *Adding and typing middleware*.
3. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Props tipadas**: `type ButtonProps = { variant: "primary" | "ghost" } & React.ComponentProps<"button">` combina props propias con todas las nativas.
- **`children`**: `children: React.ReactNode` acepta cualquier cosa renderizable.
- **Estado**: `useState<User | null>(null)` cuando el valor inicial no basta para inferir el tipo.
- **Eventos**: `(e: React.ChangeEvent<HTMLInputElement>) => ...`; o deja que TypeScript infiera cuando el manejador va en línea.
- **Express tipado**: `Request<Params, ResBody, ReqBody, Query>` y `Response<ResBody>`; `req.body` llega como datos externos, así que valídalo en tiempo de ejecución (por ejemplo, con Zod).
- **Tipos en tiempo de compilación, validación en ejecución**: TypeScript no comprueba lo que llega por la red.

## Preguntas de repaso

1. ¿Cómo tipas un componente `Button` que acepta una prop `variant` y además cualquier atributo nativo de `<button>`?
   R: Combinando tus props con las nativas: `type Props = { variant: "primary" | "ghost" } & React.ComponentProps<"button">`, y en el componente `({ variant, ...rest }: Props) => <button {...rest} />`.
2. Tipaste `req.body` como `CreateBookDto`. ¿Garantiza eso que el body tiene esa forma?
   R: No. Los tipos se borran al compilar; el body viene de la red y puede tener cualquier cosa. Hay que validarlo en ejecución (con Zod o comprobaciones manuales) y solo después tratarlo como `CreateBookDto`.
3. ¿Cuándo necesitas pasar un tipo explícito a `useState`?
   R: Cuando el valor inicial no representa todos los valores posibles, por ejemplo `useState<User | null>(null)` o `useState<string[]>([])`; si no, TypeScript infiere `null` o `never[]`.

## Explícalo con tus palabras

Explica por qué TypeScript no te protege de un body mal formado en Express y qué haces al respecto.
