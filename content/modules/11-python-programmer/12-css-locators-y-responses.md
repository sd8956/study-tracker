---
title: CSS locators, encadenamiento y Response
kind: course
hours: 2
sources: DataCamp — Web Scraping in Python, cap. 3
links: Web Scraping in Python (DataCamp) | https://www.datacamp.com/courses/web-scraping-with-python
---

## Objetivo

Seleccionar elementos con CSS locators, combinarlos con XPath encadenando selectores y usar objetos Response de Scrapy.

## Qué hacer

1. Abre *Web Scraping in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «CSS Locators, Chaining, and Responses» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **CSS locators**: `div > p` hijo directo, `div p` descendiente, `.clase`, `#id`, `a::attr(href)`, `p::text`.
- **Encadenamiento**: `sel.css('div.item').xpath('./a/@href')` combina ambos lenguajes.
- **Response**: objeto que representa la página descargada; tiene `.css()`, `.xpath()`, `.url` y `.follow()`.
- **extract / extract_first**: obtienen todos los resultados o el primero (en versiones modernas, `getall()` y `get()`).

## Preguntas de repaso

1. Traduce a CSS el XPath `//div[@class="precio"]/span`.
   R: `div.precio > span`.
2. ¿Cómo obtienes con CSS el texto de todos los `h2`?
   R: `response.css('h2::text').getall()` (o `.extract()`).
3. ¿Qué aporta un `Response` frente a un `Selector` creado desde texto?
   R: Además de seleccionar, conoce la URL de la página y puede seguir enlaces (`follow`) resolviendo URLs relativas, lo que permite recorrer varias páginas.

## Explícalo con tus palabras

Explica cuándo te resulta más cómodo CSS y cuándo XPath, con un ejemplo de cada uno.
