---
title: Evaluación — Python Programming Toolbox
kind: evaluation
hours: 3
sources: Python Programming Toolbox (DataCamp), todo el track
links: Python Programming Toolbox (DataCamp) | https://app.datacamp.com/learn/skill-tracks/python-programming-toolbox
---

## Objetivo

Comprobar que dominas las herramientas del track: fechas, regex, iteradores y estructuras de datos. Hazla como un examen: 3 horas, sin DataCamp, sin notas y sin buscar en internet. Primero responde todas las preguntas por escrito (o en un archivo `.py`/`.sql` cuando pidan código) durante unas 2 horas. Luego usa el tutor de la app para calificar cada respuesta contra la respuesta modelo, y dedica la última hora a repasar en DataCamp los capítulos donde fallaste.

## Preguntas de evaluación

1. Escribe una función que convierta '2026-10-20 08:30' (hora de Bogotá) en un datetime aware en UTC.
   R: Parsear, asignar la zona de origen y convertir:
   ```python
   from datetime import datetime
   from zoneinfo import ZoneInfo

   def a_utc(texto):
       local = datetime.strptime(texto, "%Y-%m-%d %H:%M").replace(tzinfo=ZoneInfo("America/Bogota"))
       return local.astimezone(ZoneInfo("UTC"))
   ```
   Aquí `replace` es correcto porque el reloj ya está en hora de Bogotá; solo le falta la etiqueta.
2. ¿Qué devuelve `re.sub(r'(\d{4})-(\d{2})-(\d{2})', r'\3/\2/\1', '2026-10-20')`?
   R: `'20/10/2026'`: las backreferences `\3`, `\2`, `\1` reordenan los grupos capturados.
3. Escribe una regex que valide un correo simple con un lookahead que exija al menos un dígito en la parte local.
   R: `r'^(?=[^@]*\d)[\w.]+@[\w-]+\.[a-z]{2,}$'`: el lookahead `(?=[^@]*\d)` comprueba que antes de la arroba haya un dígito sin consumir caracteres.
4. ¿Qué diferencia hay entre `[x*2 for x in xs]` y `(x*2 for x in xs)`?
   R: La primera construye una lista completa en memoria; la segunda es una generator expression que produce valores bajo demanda y solo puede recorrerse una vez.
5. Escribe un generator `ventanas(xs, n)` que entregue listas de n elementos consecutivos sin solaparse.
   R: Acumula en un buffer y entrega cuando se llena; el resto sale al final:
   ```python
   def ventanas(xs, n):
       buffer = []
       for x in xs:
           buffer.append(x)
           if len(buffer) == n:
               yield buffer
               buffer = []
       if buffer:
           yield buffer
   ```
6. ¿Qué estructura de datos usarías para una cola de tareas FIFO y por qué no una list?
   R: `collections.deque`: `append` y `popleft` son O(1). Con una list, `pop(0)` es O(n) porque desplaza todos los elementos.
7. Implementa BFS que devuelva la distancia en aristas desde un nodo a todos los alcanzables en un grafo como dict de listas.
   R: Una cola y un dict de distancias que también sirve de visitados:
   ```python
   from collections import deque

   def distancias(grafo, origen):
       dist = {origen: 0}
       cola = deque([origen])
       while cola:
           nodo = cola.popleft()
           for vecino in grafo.get(nodo, []):
               if vecino not in dist:
                   dist[vecino] = dist[nodo] + 1
                   cola.append(vecino)
       return dist
   ```
8. ¿Por qué restar dos datetimes locales que cruzan un cambio de horario de verano puede dar una duración incorrecta, y cómo se evita?
   R: Porque el reloj local salta o se repite una hora, y la resta de horas de pared no refleja el tiempo real transcurrido. Se evita convirtiendo ambos a UTC (o usando datetimes aware con `zoneinfo`) antes de restar.
9. ¿Qué hace `itertools.groupby` y qué requisito tiene?
   R: Agrupa elementos consecutivos que comparten la misma clave y entrega pares `(clave, grupo)`. Requiere que los datos estén ordenados por esa clave; si no, la misma clave aparece en varios grupos.

## Explícalo con tus palabras

Explica cómo combinaste generators, regex y datetime en el proyecto como si se lo contaras a alguien en una entrevista técnica.
