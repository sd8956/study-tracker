---
title: Spiders de Scrapy
kind: course
hours: 2
sources: DataCamp — Web Scraping in Python, cap. 4
links: Web Scraping in Python (DataCamp) | https://www.datacamp.com/courses/web-scraping-with-python
---

## Objetivo

Construir spiders de Scrapy que recorren varias páginas siguiendo enlaces y extraen datos de cada una con callbacks.

## Qué hacer

1. Abre *Web Scraping in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 4 «Spiders» (~75 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Lee el `robots.txt` de un sitio que te interese y anota qué rutas permite rastrear (5 min).
4. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
5. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **scrapy.Spider**: clase con `name`, `start_requests()` y métodos de parseo.
- **Callbacks**: cada `scrapy.Request(url, callback=self.parse_x)` dice qué método procesa la respuesta.
- **Seguir enlaces**: `response.follow(url, callback=...)` encadena páginas (lista → detalle).
- **CrawlerProcess**: ejecuta el spider desde un script de Python.
- **Scraping responsable**: respetar `robots.txt`, términos de uso y no saturar el servidor (delays).

## Preguntas de repaso

1. ¿Cómo recorre un spider una lista de cursos y luego la página de cada curso?
   R: En el primer callback extrae los enlaces de la lista y, por cada uno, hace `yield response.follow(link, callback=self.parse_curso)`; `parse_curso` extrae los datos de la página de detalle.
2. ¿Por qué los métodos de un spider usan `yield` en lugar de `return`?
   R: Porque pueden producir muchas peticiones o resultados de forma incremental; Scrapy los consume como un generator y los procesa de forma asíncrona.
3. Menciona dos prácticas de scraping responsable.
   R: Respetar `robots.txt` y los términos del sitio, y limitar la frecuencia de peticiones (por ejemplo `DOWNLOAD_DELAY`) para no sobrecargar el servidor.

## Explícalo con tus palabras

Explica el flujo de un spider (petición → respuesta → callback → nuevas peticiones o datos) como una araña que recorre su tela.
