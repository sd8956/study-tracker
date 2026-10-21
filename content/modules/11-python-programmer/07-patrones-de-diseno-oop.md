---
title: Diseño orientado a objetos — ABCs, interfaces y factory method
kind: course
hours: 2
sources: DataCamp — Intermediate Object-Oriented Programming in Python, cap. 3
links: Intermediate Object-Oriented Programming in Python (DataCamp) | https://www.datacamp.com/courses/intermediate-object-oriented-programming-in-python
---

## Objetivo

Definir plantillas con abstract base classes, usar interfaces formales e informales y construir objetos con el patrón factory method.

## Qué hacer

1. Abre *Intermediate Object-Oriented Programming in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Object-oriented design patterns» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **ABC**: `from abc import ABC, abstractmethod`: una clase abstracta no se puede instanciar hasta que las subclases implementen sus métodos abstractos.
- **Interfaz informal**: duck typing: basta con que el objeto tenga los métodos esperados.
- **Interfaz formal**: ABC o `typing.Protocol` que declara explícitamente el contrato.
- **Factory method**: un método decide qué subclase crear según los datos, y el cliente no conoce las clases concretas.

## Preguntas de repaso

1. ¿Qué pasa si instancias una subclase de una ABC que no implementó un `@abstractmethod`?
   R: Python lanza `TypeError` al crear la instancia, indicando qué métodos abstractos faltan.
2. ¿Qué diferencia hay entre una interfaz informal y una formal en Python?
   R: La informal confía en duck typing y falla en ejecución si falta un método; la formal (ABC o Protocol) declara el contrato y lo verifica al instanciar (ABC) o con un verificador estático (Protocol).
3. Da un ejemplo de factory method.
   R: Una función `crear_notificador(canal)` que devuelve `EmailNotificador()` o `SmsNotificador()` según el canal; el resto del código solo llama a `.enviar()` sin saber qué clase recibió.

## Explícalo con tus palabras

Explica el patrón factory method con una pizzería que recibe pedidos y decide qué pizza preparar.
