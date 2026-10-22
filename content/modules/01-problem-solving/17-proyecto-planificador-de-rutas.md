---
title: Proyecto, planificador de rutas en un grafo
kind: project
hours: 3
sources: Grokking Algorithms, caps. 6–7 (pp. 114–159) | Cracking the Coding Interview, cap. 4 "Trees and Graphs" (pp. 112–123)
links: OpenFlights, datos públicos de rutas aéreas | https://openflights.org/data
---

## Objetivo

Integrar en una pequeña aplicación de consola en TypeScript todo lo de grafos: una clase `Graph` bien encapsulada, BFS, DFS, orden topológico, Dijkstra con heap y Dijkstra con estado ampliado, aplicados a un mapa de rutas que tú mismo modelas y pruebas.

## Estudio

### Del algoritmo suelto a la herramienta

Hasta ahora escribiste algoritmos como funciones sueltas sobre un `Map`. En un proyecto real, esos algoritmos viven detrás de una **interfaz** que esconde la representación, igual que tu `HashMap` y tu `MinHeap` de la sesión 13 esconden sus arrays internos. Una buena clase `Graph`:

- Valida al agregar aristas (no hay pesos negativos si vas a usar Dijkstra, los nodos existen).
- Decide internamente si usa lista o matriz de adyacencia, sin que el resto del programa lo sepa.
- Expone operaciones con nombres del dominio: `shortestByStops`, `cheapestRoute`, `reachableFrom`.

### Formato de datos sugerido

Un archivo CSV propio y pequeño (15–30 ciudades) que puedas razonar a mano:

```
from,to,minutes,price
BOG,MDE,55,120
BOG,CTG,90,180
MDE,CTG,70,140
...
```

Los vuelos son aristas **dirigidas**. Cada arista tiene dos pesos posibles (tiempo y precio); tu código debe permitir elegir cuál usar como costo.

## Qué hacer

### Bloque 1 (40 min): modelo y carga

1. Crea `Graph` con lista de adyacencia interna (`Map<string, Edge[]>`, donde `Edge = { to, minutes, price }`). Métodos: `addNode`, `addEdge` (valida que los pesos sean no negativos), `neighbors(node)`, `nodes()`, `edgeCount`.
2. Escribe `loadCsv(path)` que lea el archivo y construya el grafo, reportando con número de línea cualquier fila mal formada.
3. Diseña tu CSV con al menos 15 ciudades y 40 rutas, incluyendo: una ciudad inalcanzable, un par de ciudades donde la ruta con menos escalas **no** es la más barata y otro donde la más barata **no** es la más rápida.

Terminado cuando: tests de `Graph` (nodos inexistentes, peso negativo rechazado, aristas dirigidas) y de `loadCsv` (fila mal formada con su número de línea) pasan.

### Bloque 2 (60 min): consultas

Implementa como métodos o funciones que reciben un `Graph`:

1. `fewestStops(from, to)`: BFS; devuelve la ruta con menos vuelos.
2. `reachableFrom(from)`: DFS iterativo; devuelve todas las ciudades alcanzables.
3. `cheapest(from, to, by: "price" | "minutes")`: Dijkstra con min-heap y lazy deletion; devuelve costo y ruta.
4. `cheapestWithMaxStops(from, to, maxFlights)`: Dijkstra con estado ampliado `(ciudad, vuelosUsados)`.
5. `itinerary(tasks)`: orden topológico para una lista de tareas de viaje con dependencias (por ejemplo, "pasaporte" antes de "visa", "visa" antes de "comprar vuelo"); lanza un error si hay dependencia circular.

Terminado cuando: cada consulta tiene tests con los casos especiales de tu CSV (inalcanzable, ruta con menos escalas ≠ más barata, más barata ≠ más rápida, límite de escalas que cambia la respuesta).

### Bloque 3 (40 min): interfaz de consola

Un script `routes.ts` que acepte comandos:

```
npx tsx routes.ts stops BOG MAD
npx tsx routes.ts cheapest BOG MAD --by price
npx tsx routes.ts cheapest BOG MAD --by minutes --max-flights 2
npx tsx routes.ts reachable BOG
```

Imprime la ruta como `BOG → MIA → MAD (2 vuelos, 845 USD, 610 min)`. Ante una ciudad desconocida, imprime un mensaje claro y sale con código distinto de 0.

Terminado cuando: los cuatro comandos funcionan sobre tu CSV y los mensajes de error son comprensibles.

### Bloque 4 (40 min): rendimiento y reflexión

1. Genera un grafo aleatorio con semilla de 50.000 nodos y 300.000 aristas. Mide `cheapest` con heap frente a una versión sin heap (búsqueda lineal del mínimo) para 10, 100 y 1.000 consultas aleatorias (si la versión sin heap tarda demasiado, mide en un grafo de 5.000 nodos y extrapola).
2. Escribe `NOTES.md` en tu proyecto: qué algoritmo usa cada comando y por qué, su Big O con `V` y `E` de tu grafo, los resultados de la medición y una situación real donde usarías estado ampliado.

Terminado cuando: la tabla de mediciones muestra la diferencia entre O((V + E) log V) y O(V²) y `NOTES.md` explica cada elección en no más de una página.

### Extensión opcional

- Implementa A\* en una grilla usando la distancia Manhattan como heurística y cuenta cuántos nodos expande frente a Dijkstra.
- Carga datos reales de OpenFlights (respeta su licencia) y responde: ¿cuántos vuelos como mínimo separan tu ciudad de Tokio?

## Conceptos clave

- **Encapsulación del grafo**: ocultar la representación interna detrás de operaciones del dominio.
- **Arista dirigida con varios pesos**: una conexión con sentido y más de una métrica de costo; el algoritmo elige cuál optimizar.
- **Estado ampliado**: nodo compuesto (por ejemplo ciudad y vuelos usados) que permite respetar restricciones con un algoritmo de caminos estándar.
- **Grafo de prueba diseñado**: datos pequeños construidos a propósito para cubrir los casos donde los algoritmos difieren.

## Preguntas de repaso

1. ¿Por qué conviene diseñar a propósito un grafo pequeño con casos donde BFS y Dijkstra dan respuestas distintas?
   R: Porque así los tests demuestran que cada consulta optimiza lo que dice optimizar. Si en todos los casos de prueba el camino con menos escalas también fuera el más barato, un error que usara BFS en lugar de Dijkstra pasaría desapercibido.
2. ¿Qué ganas al esconder la lista de adyacencia dentro de una clase `Graph`?
   R: Puedes validar las aristas en un único lugar, cambiar la representación interna sin tocar los algoritmos ni la interfaz de consola, y el resto del programa usa operaciones con nombres del dominio en lugar de manipular mapas directamente.
3. ¿Cómo cambia el costo de Dijkstra cuando usas estado ampliado `(ciudad, vuelosUsados)` con un máximo de `k` vuelos?
   R: El grafo de estados tiene hasta V · (k + 1) nodos y E · (k + 1) aristas, así que el costo crece aproximadamente en un factor k + 1: O(k · (V + E) log(k · V)).
4. ¿Por qué el orden topológico es la herramienta adecuada para el itinerario de tareas?
   R: Porque las tareas con dependencias forman un grafo dirigido, y un orden topológico es exactamente una secuencia donde cada tarea aparece después de todas sus dependencias. Además, si no existe (hay un ciclo), el algoritmo lo detecta y se puede reportar la dependencia circular.

## Explícalo con tus palabras

Explica a alguien que planea un viaje por qué "la ruta con menos escalas", "la más barata" y "la más rápida" pueden ser tres rutas distintas, y qué algoritmo calcula cada una.
