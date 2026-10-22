---
title: Algoritmo de Dijkstra y caminos con pesos
kind: lesson
hours: 2
sources: Grokking Algorithms, cap. 7 "Dijkstra's Algorithm" (pp. 134–159) | Cracking the Coding Interview, cap. 4 "Graphs" (pp. 117–120)
links: VisuAlgo, caminos más cortos | https://visualgo.net/en/sssp
---

## Objetivo

Encontrar el camino de menor costo en grafos con pesos usando el algoritmo de Dijkstra: entender por qué funciona, ejecutarlo a mano con una tabla, implementarlo en TypeScript con un min-heap y saber cuándo no sirve (pesos negativos).

## Estudio

### De "menos pasos" a "menor costo"

En la sesión anterior, BFS encontraba el camino con **menos aristas**. Pero en muchos problemas las aristas no valen lo mismo. Ir de tu casa al trabajo puede tener una ruta de 3 tramos que tarda 50 minutos y otra de 5 tramos que tarda 25. Si te importa el tiempo, el camino "más corto" en aristas no es el mejor.

Cuando cada arista tiene un **peso** (minutos, kilómetros, dinero, latencia), el grafo es **ponderado**, y la pregunta pasa a ser: ¿cuál es el camino de **menor peso total**? Para eso existe el **algoritmo de Dijkstra** (publicado por Edsger Dijkstra en 1959).

Un ejemplo donde BFS falla:

```
        A ──1── B
        │       │
        8       1
        │       │
        D ──1── C
```

De A a D, BFS elige la arista directa A–D (1 arista, costo 8). El camino A → B → C → D tiene 3 aristas pero costo 1 + 1 + 1 = 3. Dijkstra encuentra el de costo 3.

### La idea en una frase

Dijkstra mantiene, para cada nodo, **el mejor costo conocido hasta ahora** desde el origen, y repite: **toma el nodo no procesado más barato, dalo por definitivo y usa sus aristas para mejorar los costos de sus vecinos**.

Los cuatro pasos:

1. Encuentra el nodo **más barato** (menor costo conocido) que todavía no hayas procesado.
2. Para cada vecino de ese nodo, comprueba si llegar **a través de él** es más barato que el costo que tenías. Si lo es, actualiza el costo y anota de dónde vienes (el **padre**). Esto se llama **relajar** la arista.
3. Marca el nodo como procesado.
4. Repite hasta procesar todos los nodos (o hasta procesar el destino).

### Ejecución a mano con una tabla

Grafo dirigido con pesos (minutos entre lugares de una ciudad):

```
            ┌──── 6 ────► [Museo] ─── 1 ───┐
            │                ▲             ▼
        [Casa]               3          [Parque]
            │                │             ▲
            └──── 2 ────► [Café] ── 5 ─────┘
```

Aristas: Casa→Museo 6, Casa→Café 2, Café→Museo 3, Café→Parque 5, Museo→Parque 1.

Queremos el camino más barato de Casa a Parque. Se empieza con una tabla de costos (∞ para lo desconocido) y una de padres:

| Nodo | Costo | Padre |
| --- | --- | --- |
| Casa | 0 | — |
| Museo | ∞ | — |
| Café | ∞ | — |
| Parque | ∞ | — |

**Iteración 1.** El más barato sin procesar es Casa (0). Relajamos sus aristas:

- Museo: 0 + 6 = 6 < ∞ → costo 6, padre Casa.
- Café: 0 + 2 = 2 < ∞ → costo 2, padre Casa.

Casa queda procesada.

| Nodo | Costo | Padre |
| --- | --- | --- |
| Museo | 6 | Casa |
| Café | 2 | Casa |
| Parque | ∞ | — |

**Iteración 2.** El más barato sin procesar es Café (2). Relajamos:

- Museo: 2 + 3 = 5 < 6 → **mejora**: costo 5, padre Café.
- Parque: 2 + 5 = 7 < ∞ → costo 7, padre Café.

| Nodo | Costo | Padre |
| --- | --- | --- |
| Museo | 5 | Café |
| Parque | 7 | Café |

**Iteración 3.** El más barato sin procesar es Museo (5). Relajamos:

- Parque: 5 + 1 = 6 < 7 → **mejora**: costo 6, padre Museo.

**Iteración 4.** Queda Parque (6). No tiene aristas salientes. Fin.

Resultado: costo mínimo Casa → Parque = **6**. Camino, siguiendo padres hacia atrás: Parque ← Museo ← Café ← Casa, es decir **Casa → Café → Museo → Parque** (2 + 3 + 1). El camino "obvio" Casa → Museo → Parque costaba 7, y el de "menos aristas" también.

Observa cómo los costos solo **bajan** con el tiempo: cada relajación encuentra un camino mejor o no cambia nada. Esa es la intuición del algoritmo.

### ¿Por qué funciona? (y la condición que necesita)

La clave está en el paso 1: cuando tomas el nodo no procesado más barato, digamos con costo `c`, **no puede existir un camino más barato hacia él** que todavía no conozcas. ¿Por qué? Cualquier otro camino tendría que pasar por algún nodo no procesado, y todos esos cuestan al menos `c`; sumarle aristas solo puede **aumentar** el costo… **siempre que los pesos no sean negativos**.

Esa es la condición fundamental: **Dijkstra solo funciona con pesos mayores o iguales a cero**.

### Pesos negativos: dónde Dijkstra se rompe

Imagina un sistema de canjes donde algunas operaciones te **devuelven** algo (peso negativo):

```
  Inicio ──5──► A ──(−7)──► B
     │                      ▲
     └────────── 1 ─────────┘   (Inicio→B cuesta 1)
```

Dijkstra procesa B primero (costo 1, el más barato) y lo da por definitivo. Pero el camino Inicio → A → B cuesta 5 + (−7) = −2, que es mejor. Cuando Dijkstra procesa A, ya cerró B y no lo corrige (o, si lo corrige, los vecinos de B ya se calcularon con el valor viejo). El resultado es incorrecto.

Para pesos negativos se usa **Bellman-Ford**: relaja **todas** las aristas `V − 1` veces. Es más lento, O(V · E), pero tolera pesos negativos y además **detecta ciclos negativos** (un ciclo cuya suma es negativa, donde "el camino más barato" no existe porque puedes dar vueltas bajando el costo infinitamente). En arbitraje de divisas, un ciclo negativo en un grafo de logaritmos de tasas de cambio es literalmente una oportunidad de ganar dinero.

### Terminología

- **Grafo ponderado:** las aristas tienen pesos.
- **Ciclo:** camino que vuelve al nodo de origen. En un grafo no dirigido, cada arista es en la práctica un ciclo de dos nodos (A→B→A).
- **Relajar una arista u→v de peso w:** si `costo[u] + w < costo[v]`, actualizar `costo[v]` y `padre[v] = u`.
- **Camino más corto de origen único:** Dijkstra calcula el costo mínimo desde un origen hacia **todos** los nodos, no solo hacia uno. Si solo te interesa un destino, puedes parar cuando lo procesas.

### Implementación en TypeScript

La versión más simple busca el nodo más barato recorriendo todos (O(V) por iteración, O(V²) total). Es aceptable para grafos pequeños, pero la versión estándar usa un **min-heap** (cola de prioridad) de la sesión 13 para obtener el más barato en O(log V).

```ts
type WeightedGraph = Map<string, Array<[string, number]>>; // nodo → [vecino, peso][]

interface Result { cost: Map<string, number>; parent: Map<string, string | null> }

export function dijkstra(graph: WeightedGraph, source: string): Result {
  const cost = new Map<string, number>([[source, 0]]);
  const parent = new Map<string, string | null>([[source, null]]);
  const done = new Set<string>();
  const heap = new PairMinHeap();            // guarda [costo, nodo]
  heap.push([0, source]);

  while (heap.size > 0) {
    const [c, node] = heap.pop()!;
    if (done.has(node)) continue;            // entrada vieja: ya procesado con menor costo
    done.add(node);
    for (const [next, w] of graph.get(node) ?? []) {
      if (w < 0) throw new Error("Dijkstra no admite pesos negativos");
      const candidate = c + w;
      if (candidate < (cost.get(next) ?? Infinity)) {   // relajar
        cost.set(next, candidate);
        parent.set(next, node);
        heap.push([candidate, next]);
      }
    }
  }
  return { cost, parent };
}

export function pathTo(parent: Map<string, string | null>, target: string): string[] | null {
  if (!parent.has(target)) return null;
  const path: string[] = [];
  for (let n: string | null = target; n !== null; n = parent.get(n) ?? null) path.push(n);
  return path.reverse();
}
```

El `PairMinHeap` es tu `MinHeap` de la sesión 13 adaptado para comparar pares por su primer elemento. Detalle de diseño importante: en lugar de implementar una operación "disminuir prioridad" (que exige saber dónde está cada nodo dentro del heap), simplemente **insertamos una entrada nueva** con el costo mejorado y, al sacar entradas viejas, las ignoramos con `if (done.has(node)) continue`. Esta técnica (*lazy deletion*) es más simple y en la práctica igual de rápida.

### La versión sin heap, para entender primero

Antes de usar el heap conviene escribir la versión más directa, que es una traducción literal de la tabla que llenaste a mano: un mapa de costos, un mapa de padres, un conjunto de procesados y una función que busca el nodo más barato sin procesar recorriendo todos.

```ts
function cheapestUnprocessed(cost: Map<string, number>, done: Set<string>): string | null {
  let best: string | null = null;
  let bestCost = Infinity;
  for (const [node, c] of cost) {
    if (!done.has(node) && c < bestCost) { best = node; bestCost = c; }
  }
  return best;
}

export function dijkstraSimple(graph: WeightedGraph, source: string) {
  const cost = new Map<string, number>([[source, 0]]);
  const parent = new Map<string, string | null>([[source, null]]);
  const done = new Set<string>();
  for (let node = cheapestUnprocessed(cost, done); node !== null; node = cheapestUnprocessed(cost, done)) {
    for (const [next, w] of graph.get(node) ?? []) {
      const candidate = cost.get(node)! + w;
      if (candidate < (cost.get(next) ?? Infinity)) { cost.set(next, candidate); parent.set(next, node); }
    }
    done.add(node);
  }
  return { cost, parent };
}
```

Esta versión es fácil de verificar contra tu tabla, y es una buena práctica de método: **primero la versión correcta y simple, después la optimización**. Una vez que tienes los tests pasando con `dijkstraSimple`, puedes reemplazar `cheapestUnprocessed` por el heap y los mismos tests te dicen si rompiste algo. Es exactamente el flujo "fuerza bruta → optimizar" de la sesión 01.

### Un problema típico: tiempo de propagación en una red

**Enunciado (propio):** una red tiene `n` servidores. Conoces el tiempo que tarda un mensaje en viajar por cada enlace dirigido `(origen, destino, milisegundos)`. Si el servidor `k` envía un mensaje que cada servidor reenvía inmediatamente a todos sus vecinos, ¿cuánto tarda en llegar a **todos**? Si alguno es inalcanzable, devuelve −1.

**Replanteo:** el mensaje llega a cada servidor por el camino más rápido posible (el reenvío ocurre por todos los enlaces a la vez, así que "gana" el camino más rápido). El tiempo de cada servidor es su costo mínimo desde `k`. El tiempo total es el **máximo** de esos costos mínimos: hay que esperar al último.

```ts
function networkDelay(edges: Array<[string, string, number]>, nodes: string[], k: string): number {
  const graph: WeightedGraph = new Map(nodes.map((n) => [n, []]));
  for (const [u, v, w] of edges) graph.get(u)!.push([v, w]);
  const { cost } = dijkstra(graph, k);
  if (cost.size < nodes.length) return -1;   // alguno nunca recibió costo
  return Math.max(...cost.values());
}
```

El algoritmo no cambió: lo que cambió es **qué haces con su resultado**. Muchos problemas de grafos con pesos son Dijkstra más una pequeña capa de interpretación: el máximo de los costos, el costo a un conjunto de destinos, el destino más barato entre varios, etc.

### Costo

Con heap: cada arista puede provocar una inserción en el heap, O(log E) cada una, y cada extracción también es logarítmica. Total: **O((V + E) log V)** (log E y log V son del mismo orden porque E ≤ V²). Sin heap, buscando el mínimo con un recorrido: O(V²), que puede ser mejor para grafos muy densos.

### Variantes y aplicaciones

- **Navegación (GPS):** intersecciones y tramos con tiempo estimado. En la práctica se usa **A\***, que es Dijkstra con una "pista" (heurística) que prioriza los nodos que parecen más cerca del destino, como la distancia en línea recta.
- **Enrutamiento de red:** protocolos como OSPF calculan rutas con Dijkstra sobre el grafo de enlaces con costos.
- **Grillas con terreno:** moverse por arena cuesta 3 y por camino cuesta 1. BFS no sirve; Dijkstra sí.
- **Pesos 0 y 1:** existe un truco con un deque (0-1 BFS) que es O(V + E).
- **Grafos sin pesos:** Dijkstra funciona pero es más lento que BFS; usa BFS.

### Cuando el nodo no basta: estado ampliado

Algunos problemas parecen de Dijkstra pero el resultado sale mal porque **el nodo solo no describe toda la situación**. Ejemplo: "encuentra el vuelo más barato de Bogotá a Madrid con **como mucho una escala**". Si los nodos son solo ciudades, Dijkstra encontrará el más barato con cualquier número de escalas, y si ese tiene tres, no sirve.

La solución es **ampliar el estado**: en lugar de que un nodo sea "ciudad", que sea "(ciudad, vuelos usados)". Desde `(Bogotá, 0)` puedes ir a `(Miami, 1)`; desde ahí a `(Madrid, 2)`. Los estados con más de 2 vuelos simplemente no se generan. Ahora Dijkstra corre sobre este grafo de estados y la respuesta es el menor costo entre todos los estados `(Madrid, v)` con `v ≤ 2`.

```
estado = [costo, ciudad, vuelos]
heap.push([0, "BOG", 0])
al sacar [c, ciudad, v]:
  si ciudad es el destino → respuesta c
  si v === máximoVuelos → no expandir
  para cada vuelo ciudad → siguiente con precio p:
    heap.push([c + p, siguiente, v + 1])
```

La misma técnica resuelve muchos problemas que a primera vista parecen distintos:

- Caminos en una grilla donde puedes **romper una pared** como mucho una vez: estado `(fila, columna, paredesRotas)`.
- Rutas con **combustible limitado**: estado `(ciudad, combustible)`.
- Llaves y puertas en un laberinto: estado `(posición, llaves que tienes)`.

El grafo de estados puede ser mucho más grande que el original (ciudades × vuelos posibles), así que conviene acotar bien las dimensiones extra. La idea transferible: **si el algoritmo da una respuesta que viola una restricción, probablemente al estado le falta información**. Agregar esa información al nodo convierte un problema "con restricciones" en un problema de caminos normal.

### ¿Qué algoritmo uso?

| Situación | Algoritmo | Costo |
| --- | --- | --- |
| Sin pesos (o todos iguales) | BFS | O(V + E) |
| Pesos ≥ 0 | Dijkstra con heap | O((V + E) log V) |
| Pesos negativos, sin ciclos negativos | Bellman-Ford | O(V · E) |
| DAG con cualquier peso | relajar en orden topológico | O(V + E) |
| Todos los pares de nodos, grafo pequeño | Floyd-Warshall | O(V³) |

No necesitas memorizar los tres últimos; sí saber que existen y en qué caso buscarlos.

### Errores comunes

- **Usar Dijkstra con pesos negativos**: da resultados incorrectos sin avisar (por eso nuestra implementación lanza un error).
- **Usar BFS en grafos con pesos**: minimiza aristas, no costo.
- **Buscar el mínimo recorriendo un array en cada iteración** en grafos grandes: O(V²).
- **No ignorar entradas viejas del heap**: se procesa un nodo varias veces y, si relajas desde una entrada vieja, puedes hacer trabajo inútil.
- **Olvidar el mapa de padres**: sabrás el costo pero no el camino.
- **Confundir "más corto" con "menos aristas"**: depende de si el grafo tiene pesos.

### Para llevarte

Dijkstra combina tres ideas del módulo: un grafo como lista de adyacencia, un heap para elegir siempre el candidato más barato y una decisión greedy que es correcta gracias a los pesos no negativos. La versión simple te deja verificar el razonamiento; la versión con heap lo vuelve práctico; y el estado ampliado te permite aplicarlo a problemas con restricciones que a primera vista no parecen de caminos. Antes de usarlo, pregúntate siempre si los pesos pueden ser negativos.

## Conceptos clave

- **Grafo ponderado**: grafo cuyas aristas tienen un peso o costo.
- **Algoritmo de Dijkstra**: calcula los caminos de menor costo desde un origen en grafos con pesos no negativos, procesando siempre el nodo más barato pendiente.
- **Relajación**: actualizar el costo de un vecino si llegar a través del nodo actual es más barato.
- **Tabla de padres**: registro del nodo previo en el mejor camino conocido; permite reconstruir la ruta.
- **Lazy deletion**: insertar entradas nuevas en el heap en lugar de actualizar las existentes e ignorar las viejas al extraerlas.
- **Bellman-Ford**: algoritmo O(V · E) que admite pesos negativos y detecta ciclos negativos.
- **Ciclo negativo**: ciclo cuya suma de pesos es negativa; hace que el camino más barato no esté definido.

## Preguntas de repaso

1. ¿Por qué BFS no sirve para encontrar el camino de menor costo en un grafo ponderado?
   R: Porque BFS minimiza el número de aristas, no la suma de sus pesos. Un camino con más aristas puede tener menor costo total, y BFS lo ignoraría al encontrar primero el de menos aristas.
2. Describe los pasos de Dijkstra.
   R: Se inicializa el costo del origen en 0 y el resto en infinito. Luego, repetidamente, se toma el nodo no procesado de menor costo, se relajan sus aristas (si llegar a un vecino a través de él es más barato, se actualizan su costo y su padre) y se marca como procesado. Se termina cuando no quedan nodos por procesar o se procesó el destino.
3. ¿Por qué Dijkstra no funciona con pesos negativos?
   R: Porque da por definitivo el costo del nodo más barato pendiente, suponiendo que ningún camino no explorado puede mejorarlo; eso solo es cierto si agregar aristas nunca reduce el costo. Con pesos negativos, un camino que pasa por un nodo más caro puede terminar siendo más barato, y el algoritmo ya habría cerrado ese nodo con un valor incorrecto.
4. ¿Cuál es el costo de Dijkstra con un min-heap y por qué conviene el heap?
   R: O((V + E) log V). El heap permite obtener el nodo más barato en O(log V) en lugar de recorrer todos los nodos en O(V) en cada iteración, lo que daría O(V²).
5. ¿Qué es la técnica de lazy deletion en Dijkstra?
   R: Cuando se mejora el costo de un nodo, en lugar de actualizar su entrada dentro del heap se inserta una entrada nueva con el costo menor. Las entradas viejas siguen en el heap y, al extraerlas, se ignoran si el nodo ya fue procesado. Simplifica la implementación sin empeorar el orden de complejidad.
6. ¿Cómo reconstruyes el camino una vez terminado Dijkstra?
   R: Siguiendo la tabla de padres desde el destino hacia atrás hasta llegar al origen (cuyo padre es nulo) e invirtiendo la secuencia obtenida.

## Ejercicio

Implementa `PairMinHeap` y `dijkstra` en TypeScript. Úsalos para resolver una grilla con costos de terreno: cada celda tiene un costo de 1 a 9 para entrar en ella y te mueves en 4 direcciones; devuelve el costo mínimo y el camino de la esquina superior izquierda a la inferior derecha. Compara el resultado con BFS (que ignora los costos) en la misma grilla.

Criterio de terminado: el ejemplo Casa–Café–Museo–Parque de esta sesión devuelve costo 6 y el camino correcto en un test; un grafo con una arista negativa lanza el error; en una grilla de 5×5 diseñada por ti, el test demuestra que el camino de Dijkstra cuesta menos que el de BFS; la grilla de 300×300 aleatoria se resuelve en menos de 1 segundo.

## Explícalo con tus palabras

Explica a alguien que usa una app de mapas por qué la ruta con menos giros no siempre es la más rápida y cómo el algoritmo va "mejorando" sus estimaciones hasta estar seguro.
