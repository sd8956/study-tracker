---
title: HTML, XPath y selectores
kind: course
hours: 2
sources: DataCamp — Web Scraping in Python, caps. 1–2
links: Web Scraping in Python (DataCamp) | https://www.datacamp.com/courses/web-scraping-with-python
---

## Objetivo

Entender la estructura de un documento HTML como árbol y navegarla con XPath y los selectores de Scrapy.

## Qué hacer

1. Abre *Web Scraping in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Introduction to HTML» y el capítulo 2 «XPaths and Selectors» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Árbol HTML**: elementos anidados con etiquetas, atributos (`class`, `id`, `href`) y texto.
- **XPath**: lenguaje para navegar el árbol: `/html/body/div[2]`, `//p` (cualquier nivel), `@class` para atributos.
- **Predicados**: `//div[@id="main"]`, `//p[2]`, `contains(@class, "x")`.
- **text()**: selecciona el texto de un elemento; `//p//text()` incluye el de sus descendientes.
- **Selector de Scrapy**: `Selector(text=html).xpath('//p').extract()` aplica XPath y extrae resultados.

## Preguntas de repaso

1. ¿Qué diferencia hay entre `/` y `//` en XPath?
   R: `/` baja un nivel a los hijos directos; `//` busca en cualquier nivel de descendientes.
2. Escribe un XPath que obtenga el `href` de todos los enlaces dentro de un `div` con `id` 'menu'.
   R: `//div[@id="menu"]//a/@href`.
3. ¿Por qué `contains(@class, "nav")` es útil?
   R: Porque los elementos suelen tener varias clases (`class="nav top"`); con `@class="nav"` no coincidirían.

## Explícalo con tus palabras

Explica XPath como dar direcciones dentro de un edificio: piso, puerta y habitación.
