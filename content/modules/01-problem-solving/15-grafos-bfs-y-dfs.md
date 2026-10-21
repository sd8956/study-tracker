---
title: Grafos, búsqueda en anchura y en profundidad
kind: lesson
hours: 2
sources: Grokking Algorithms, cap. 6 "Breadth-First Search" (pp. 114–133) | Cracking the Coding Interview, cap. 4 "Graphs" y "Graph Search" (pp. 117–123)
links: VisuAlgo, recorridos de grafos | https://visualgo.net/en/dfsbfs
---

## Objetivo

Modelar problemas como grafos, representarlos en TypeScript (lista de adyacencia), recorrerlos con BFS y DFS, encontrar el camino más corto en grafos sin pesos y aplicar orden topológico a dependencias.

## Estudio

### Qué es un grafo

Un **grafo** modela **conexiones**. Tiene **nodos** (o vértices) y **aristas** (o arcos) que los unen. Ya conoces un tipo de grafo: los árboles son grafos sin ciclos con una raíz. Pero los grafos son más generales: cualquier nodo puede conectarse con cualquier otro, puede haber ciclos y puede no haber una raíz.

Ejemplos:

- Red social: personas (nodos) y amistades (aristas).
- Mapa: ciudades e intersecciones (nodos) y calles (aristas).
- Dependencias: paquetes de npm (nodos) y "depende de" (aristas).
- Web: páginas (nodos) y enlaces (aristas).
- Un tablero o una grilla: celdas (nodos) y celdas vecinas (aristas).

Muchos problemas que no parecen de grafos lo son. "¿Cuál es la menor cantidad de movimientos para resolver este puzzle?" es un grafo donde cada estado del puzzle es un nodo y cada movimiento válido es una arista. Reconocer el grafo escondido es la mitad del trabajo.

### Variantes de grafos

| Variante | Significado | Ejemplo |
| --- | --- | --- |
| No dirigido | la arista va en ambos sentidos | amistad en una red social |
| Dirigido | la arista tiene sentido (A → B no implica B → A) | "sigue a" en una red social, dependencias |
| Ponderado | cada arista tiene un peso (costo, distancia, tiempo) | mapa con kilómetros |
| Cíclico / acíclico | tiene o no caminos que vuelven al origen | un **DAG** (grafo dirigido acíclico) modela dependencias |
| Conexo | existe un camino entre cualquier par de nodos | red sin islas |

### Representaciones

**Lista de adyacencia:** para cada nodo, la lista de sus vecinos. En TypeScript, un `Map<string, string[]>` es perfecto (fíjate que es una tabla hash: el grafo se apoya en lo que aprendiste dos sesiones atrás).

```ts
type Graph = Map<string, string[]>;

const friends: Graph = new Map([
  ["tú", ["alicia", "bruno", "clara"]],
  ["alicia", ["pedro"]],
  ["bruno", ["pedro", "ana"]],
  ["clara", ["tomás", "julia"]],
  ["pedro", []], ["ana", []], ["tomás", []], ["julia", []],
]);
```

**Matriz de adyacencia:** una matriz `n × n` donde `m[i][j]` es `true` (o el peso) si hay arista de `i` a `j`.

| | Lista de adyacencia | Matriz de adyacencia |
| --- | --- | --- |
| Memoria | O(V + E) | O(V²) |
| ¿Existe arista u→v? | O(grado de u) | O(1) |
| Recorrer vecinos de u | O(grado de u) | O(V) |
| Mejor para | grafos dispersos (la mayoría) | grafos densos o consultas de arista muy frecuentes |

`V` es la cantidad de nodos y `E` la de aristas. La mayoría de los grafos reales son **dispersos** (cada persona tiene cientos de amigos, no miles de millones), así que la lista de adyacencia es la elección por defecto.

### Búsqueda en anchura (BFS)

**Problema:** buscas a alguien en tu red que venda mangos. Primero preguntas a tus amigos; si ninguno vende, preguntas a los amigos de tus amigos; y así. Quieres además encontrar al vendedor **más cercano** (con menos intermediarios).

BFS (*breadth-first search*) responde dos preguntas:

1. ¿Existe un camino de A a B?
2. ¿Cuál es el camino **más corto** (en número de aristas) de A a B?

La idea es explorar **por capas**: primero todos los nodos a distancia 1, luego todos los de distancia 2, etc. Para garantizar ese orden, los nodos por visitar se guardan en una **cola**: los que se descubren primero se procesan primero.

```
capa 0:  tú
capa 1:  alicia, bruno, clara          ← se encolan primero
capa 2:  pedro, ana, tomás, julia      ← se procesan después de toda la capa 1
```

Si usaras una pila en lugar de una cola, podrías procesar a un amigo de amigo antes que a un amigo directo, y ya no sabrías que encontraste el **más cercano**.

```ts
export function bfsFind(graph: Graph, start: string, isTarget: (n: string) => boolean): string | null {
  const queue: string[] = [start];
  let head = 0;                       // índice de la cola: evitamos shift()
  const visited = new Set<string>([start]);
  while (head < queue.length) {
    const node = queue[head++];
    if (isTarget(node)) return node;
    for (const neighbor of graph.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);        // marcar al encolar, no al procesar
        queue.push(neighbor);
      }
    }
  }
  return null;
}
```

Dos detalles críticos:

- **El conjunto `visited`.** En un grafo puede haber ciclos (A es amigo de B y B de A). Sin marcar los visitados, BFS daría vueltas para siempre o procesaría nodos muchas veces. En los árboles no hacía falta porque no hay ciclos.
- **Marcar al encolar.** Si marcas al procesar (al sacar de la cola), el mismo nodo puede encolarse varias veces desde distintos vecinos antes de procesarse. Funciona, pero hace trabajo extra.

### Reconstruir el camino más corto

Saber que existe un vendedor no basta; queremos el camino. Truco: guarda para cada nodo **desde dónde llegaste** (su padre en el recorrido). Al encontrar el destino, sigues los padres hacia atrás.

```ts
export function shortestPath(graph: Graph, start: string, goal: string): string[] | null {
  const parent = new Map<string, string | null>([[start, null]]);
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];
    if (node === goal) {
      const path: string[] = [];
      for (let n: string | null = goal; n !== null; n = parent.get(n)!) path.push(n);
      return path.reverse();
    }
    for (const next of graph.get(node) ?? []) {
      if (!parent.has(next)) {        // parent también sirve de "visitado"
        parent.set(next, node);
        queue.push(next);
      }
    }
  }
  return null;
}
```

¿Por qué el primer camino encontrado es el más corto? Porque BFS procesa los nodos en orden de distancia creciente: cuando el destino sale de la cola, todos los nodos más cercanos ya fueron procesados, así que no puede existir un camino más corto que no hayas visto.

**Costo:** cada nodo entra a la cola una vez (O(V)) y cada arista se examina una vez al recorrer los vecinos (O(E)). Total: **O(V + E)**. Memoria O(V) para la cola y los visitados.

### BFS en una grilla

Un uso muy frecuente: el camino más corto en un laberinto representado como grilla, donde `#` es pared.

```
S . . #
# # . #
. . . .
# . # E
```

No hace falta construir el grafo explícitamente: los vecinos de la celda `(r, c)` son las cuatro celdas adyacentes que estén dentro de la grilla y no sean pared. La clave de cada nodo puede ser el string `` `${r},${c}` `` o el número `r * cols + c`.

```ts
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

function gridDistance(grid: string[], start: [number, number], end: [number, number]): number {
  const rows = grid.length, cols = grid[0].length;
  const dist = new Map<number, number>([[start[0] * cols + start[1], 0]]);
  const queue: [number, number][] = [start];
  for (let head = 0; head < queue.length; head++) {
    const [r, c] = queue[head];
    const d = dist.get(r * cols + c)!;
    if (r === end[0] && c === end[1]) return d;
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc, key = nr * cols + nc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (grid[nr][nc] === "#" || dist.has(key)) continue;
      dist.set(key, d + 1);
      queue.push([nr, nc]);
    }
  }
  return -1;
}
```

Con el laberinto de arriba, la distancia de `S` (0,0) a `E` (3,3) es 6.

### Búsqueda en profundidad (DFS)

DFS (*depth-first search*) explora **tan profundo como puede** por un camino antes de retroceder, como recorrer un laberinto con la mano apoyada en la pared. Se implementa con recursión (la pila de llamadas) o con una pila explícita.

```ts
export function dfs(graph: Graph, start: string, visit: (n: string) => void): void {
  const visited = new Set<string>();
  const go = (node: string) => {
    visited.add(node);
    visit(node);
    for (const next of graph.get(node) ?? []) if (!visited.has(next)) go(next);
  };
  go(start);
}
```

Mismo costo que BFS: **O(V + E)**. Pero **DFS no encuentra caminos más cortos**: puede llegar al destino por un camino largo antes de probar uno corto.

¿Para qué sirve entonces? Para todo lo que requiere explorar completamente o razonar sobre la estructura:

- ¿Existe algún camino de A a B? (BFS también sirve.)
- Contar **componentes conexas**: cuántas "islas" hay. Por cada nodo no visitado, lanzas un DFS y cuentas uno.
- Detectar **ciclos** en un grafo dirigido.
- **Orden topológico**.
- Backtracking (que es un DFS sobre el árbol de decisiones).

| | BFS | DFS |
| --- | --- | --- |
| Estructura | cola | pila / recursión |
| Orden | por capas (distancia) | por ramas (profundidad) |
| Camino más corto sin pesos | sí | no |
| Memoria típica | ancho de la capa más grande | profundidad del camino |
| Usos típicos | distancias mínimas, "a k pasos" | componentes, ciclos, topológico, backtracking |

### Cambiar la cola por una pila

Un experimento revelador: toma el código de BFS y cambia la cola por una pila (`push` y `pop` en lugar de avanzar `head`). El resultado es un recorrido **en profundidad**: el último vecino descubierto se explora primero, así que el algoritmo se mete por una rama antes de volver.

```ts
export function dfsIterative(graph: Graph, start: string): string[] {
  const order: string[] = [];
  const visited = new Set<string>();
  const stack = [start];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (visited.has(node)) continue;   // aquí marcamos al sacar
    visited.add(node);
    order.push(node);
    const neighbors = graph.get(node) ?? [];
    for (let i = neighbors.length - 1; i >= 0; i--) {   // al revés, para visitar en el orden natural
      if (!visited.has(neighbors[i])) stack.push(neighbors[i]);
    }
  }
  return order;
}
```

Fíjate en el cambio de política: en DFS iterativo se marca al **sacar** de la pila, porque un nodo puede apilarse varias veces y debe procesarse la vez que corresponda al camino más profundo. Esa pequeña diferencia es un buen recordatorio de que la estructura auxiliar (cola o pila) define el algoritmo: **misma plantilla, distinta estructura, distinto recorrido**. Lo mismo verás en Dijkstra, donde la estructura será una cola de prioridad.

### Detectar ciclos en un grafo dirigido

En un grafo **no** dirigido, encontrar un nodo ya visitado (que no sea tu padre) indica un ciclo. En uno **dirigido** no basta: si A → C y B → C, al llegar a C por segunda vez no hay ciclo. Lo que indica un ciclo es encontrar un nodo que está **en el camino actual** de la recursión. Para distinguirlo se usan tres estados (a menudo llamados colores):

- **Blanco:** no visitado.
- **Gris:** en el camino actual (la llamada recursiva todavía no terminó).
- **Negro:** terminado (todos sus descendientes ya fueron explorados).

```ts
export function hasDirectedCycle(graph: Graph): boolean {
  const state = new Map<string, "gray" | "black">();
  const visit = (node: string): boolean => {
    state.set(node, "gray");
    for (const next of graph.get(node) ?? []) {
      const s = state.get(next);
      if (s === "gray") return true;              // volvimos al camino actual: ciclo
      if (s === undefined && visit(next)) return true;
    }
    state.set(node, "black");
    return false;
  };
  for (const node of graph.keys()) if (!state.has(node) && visit(node)) return true;
  return false;
}
```

Observa el bucle externo sobre todos los nodos: un grafo puede tener varias componentes y el ciclo puede estar en una que no es alcanzable desde el primer nodo. Este patrón ("lanzar un recorrido desde cada nodo no visitado") es el mismo que usarás para contar islas.

### Problema: contar islas

En una grilla de `1` (tierra) y `0` (agua), cuenta las islas (grupos de tierra conectados horizontal o verticalmente).

```
1 1 0 0 0
1 1 0 0 1
0 0 0 1 1
0 0 0 0 0
1 0 1 0 0      → 4 islas
```

Recorres todas las celdas; cuando encuentras tierra no visitada, sumas una isla y lanzas un DFS (o BFS) que marca toda esa isla como visitada. Cada celda se visita una vez: O(filas × columnas). Es el patrón de **componentes conexas** aplicado a una grilla.

### Orden topológico: resolver dependencias

Tienes tareas con dependencias: "para desplegar hay que compilar; para compilar hay que instalar dependencias; para correr tests hay que compilar". ¿En qué orden las haces? Es un **grafo dirigido acíclico** (DAG) y la respuesta es un **orden topológico**: una secuencia donde cada tarea aparece después de todas sus dependencias.

```
instalar → compilar → test
                 \
                  → desplegar
orden válido: instalar, compilar, test, desplegar
```

El **algoritmo de Kahn** es un BFS sobre "grados de entrada" (cuántas dependencias pendientes tiene cada nodo):

1. Calcula el grado de entrada de cada nodo.
2. Encola todos los nodos con grado 0 (no dependen de nada).
3. Saca un nodo, agrégalo al orden y "quita" sus aristas: resta 1 al grado de cada vecino; si alguno llega a 0, encólalo.
4. Si al final el orden no contiene todos los nodos, había un **ciclo** (dependencia circular) y no existe orden válido.

```ts
export function topoSort(graph: Graph): string[] | null {
  const indegree = new Map<string, number>();
  for (const node of graph.keys()) indegree.set(node, indegree.get(node) ?? 0);
  for (const targets of graph.values())
    for (const t of targets) indegree.set(t, (indegree.get(t) ?? 0) + 1);

  const queue = [...indegree].filter(([, d]) => d === 0).map(([n]) => n);
  const order: string[] = [];
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];
    order.push(node);
    for (const next of graph.get(node) ?? []) {
      const d = indegree.get(next)! - 1;
      indegree.set(next, d);
      if (d === 0) queue.push(next);
    }
  }
  return order.length === indegree.size ? order : null; // null: hay ciclo
}
```

Así es como npm, los sistemas de compilación (Make, Turborepo) y los planificadores de tareas deciden el orden de ejecución. O(V + E).

### Búsqueda bidireccional

Si buscas el camino más corto entre dos personas en una red enorme, puedes lanzar **dos** BFS a la vez, uno desde cada extremo, y parar cuando se encuentran en el medio. Si cada persona tiene `k` amigos y la distancia es `d`, un BFS normal explora del orden de `kᵈ` nodos; dos BFS que se encuentran a mitad de camino exploran unos `2 · k^(d/2)`. Con `k = 100` y `d = 6`, eso es la diferencia entre un billón y dos millones de nodos.

### Errores comunes

- **Olvidar `visited`** en grafos con ciclos: bucle infinito.
- **Usar `shift()`** para la cola de BFS en grafos grandes: O(V²) oculto.
- **Usar DFS para camino más corto**: no lo garantiza.
- **Usar BFS en grafos con pesos**: BFS minimiza el número de aristas, no la suma de pesos (para eso, Dijkstra, la próxima sesión).
- **Recursión DFS en grafos enormes**: puede desbordar la pila; usa pila explícita.
- **No modelar el grafo implícito**: muchas grillas y puzzles son grafos aunque nadie lo diga.

### Para llevarte

Muchos problemas se vuelven fáciles en el momento en que dices "esto es un grafo". BFS y DFS son la misma plantilla con distinta estructura auxiliar (cola o pila) y por eso recorren en distinto orden: BFS por capas, ideal para distancias mínimas sin pesos; DFS por ramas, ideal para componentes, ciclos y dependencias.

## Conceptos clave

- **Grafo**: conjunto de nodos y aristas que modela conexiones.
- **Grafo dirigido / no dirigido**: aristas con o sin sentido.
- **DAG**: grafo dirigido acíclico; modela dependencias.
- **Lista de adyacencia**: representación que guarda, para cada nodo, sus vecinos; O(V + E) de memoria.
- **BFS**: recorrido por capas con una cola; encuentra caminos más cortos en número de aristas.
- **DFS**: recorrido en profundidad con pila o recursión; útil para componentes, ciclos y orden topológico.
- **Componente conexa**: grupo máximo de nodos conectados entre sí.
- **Orden topológico**: secuencia de un DAG donde cada nodo aparece después de todos sus predecesores.

## Preguntas de repaso

1. ¿Por qué BFS encuentra el camino más corto en un grafo sin pesos y DFS no?
   R: Porque BFS, gracias a la cola, procesa los nodos en orden de distancia creciente: todos los de distancia 1 antes que los de distancia 2, etc. La primera vez que alcanza el destino lo hace por un camino de distancia mínima. DFS sigue una rama hasta el fondo y puede llegar al destino por un camino largo antes de explorar uno corto.
2. ¿Para qué sirve el conjunto de visitados y por qué en árboles no hacía falta?
   R: Evita procesar un nodo más de una vez y entrar en bucles infinitos cuando el grafo tiene ciclos. En un árbol no hay ciclos y cada nodo se alcanza por un único camino desde la raíz, así que no se puede volver a un nodo ya visitado.
3. ¿Cuál es el costo de BFS y DFS con lista de adyacencia y por qué?
   R: O(V + E): cada nodo se procesa una vez y, al procesarlo, se recorren sus aristas, de modo que cada arista se examina una vez (o dos en grafos no dirigidos).
4. ¿Cuándo preferirías una matriz de adyacencia sobre una lista de adyacencia?
   R: Cuando el grafo es denso (muchas aristas, cerca de V²) o cuando necesitas consultar muy a menudo si existe una arista entre dos nodos concretos, porque la matriz responde en O(1). Para grafos dispersos, la lista usa mucha menos memoria.
5. ¿Cómo detecta el algoritmo de Kahn un ciclo?
   R: Si hay un ciclo, los nodos del ciclo nunca llegan a grado de entrada 0, porque siempre dependen de otro nodo del ciclo. Al terminar, el orden producido tiene menos nodos que el grafo, y eso indica que no existe un orden topológico.
6. ¿Cómo encuentras el camino (no solo la distancia) en BFS?
   R: Guardando para cada nodo descubierto el nodo desde el que se llegó (su padre). Al alcanzar el destino, se siguen los padres hacia atrás hasta el origen y se invierte la lista.

## Ejercicio

Implementa en TypeScript: `countIslands(grid)` con DFS iterativo (pila explícita), `shortestPathInGrid(grid)` que devuelva la lista de celdas del camino más corto de `S` a `E` (o `null`), y `buildOrder(projects, dependencies)` que devuelva un orden de compilación válido o lance un error indicando que hay una dependencia circular.

Criterio de terminado: tests con la grilla de islas de esta sesión (4 islas), una grilla sin tierra y una toda tierra; el laberinto de esta sesión devuelve un camino de 7 celdas (6 pasos); `buildOrder` con un ciclo `a → b → c → a` lanza el error y con un DAG de 6 proyectos devuelve un orden que respeta todas las dependencias (verificado por el test, no a ojo).

## Explícalo con tus palabras

Explica con el ejemplo del vendedor de mangos por qué BFS usa una cola y qué pasaría si usaras una pila.
