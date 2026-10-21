---
title: Árboles binarios de búsqueda, heaps y tries
kind: lesson
hours: 2
sources: Cracking the Coding Interview, cap. 4 "Trees and Graphs", Types of Trees, Binary Tree Traversal, Binary Heaps y Tries (pp. 112–117) | Grokking Algorithms, cap. 11 "Trees" (pp. 222–225) | Think Like a Programmer, cap. 6 "Recursion and Binary Trees" (pp. 204–207)
links: VisuAlgo, BST y AVL | https://visualgo.net/en/bst ; VisuAlgo, heap binario | https://visualgo.net/en/heap
---

## Objetivo

Conocer la terminología de árboles, implementar un árbol binario de búsqueda (insertar, buscar, recorrer, validar), entender por qué el balanceo importa, implementar un min-heap como cola de prioridad y usar un trie para búsquedas por prefijo.

## Estudio

### Vocabulario básico

Un **árbol** es una estructura jerárquica formada por **nodos** conectados por **aristas**, con un nodo especial llamado **raíz** y sin ciclos. Cada nodo puede tener hijos; un nodo sin hijos es una **hoja**. Ejemplos cotidianos: el sistema de carpetas, el organigrama de una empresa, el DOM de una página web, el árbol genealógico.

```
            raíz → [A]               nivel 0
                  /   \
               [B]     [C]           nivel 1
              /   \       \
           [D]    [E]     [F]        nivel 2  (D, E, F son hojas)
```

- **Padre / hijo:** B es padre de D y E.
- **Profundidad de un nodo:** cuántas aristas lo separan de la raíz (E tiene profundidad 2).
- **Altura del árbol:** la profundidad máxima (aquí 2).
- **Subárbol:** cualquier nodo con todos sus descendientes es a su vez un árbol.

Un **árbol binario** es un árbol donde cada nodo tiene **como máximo dos** hijos (izquierdo y derecho). Variantes con nombre, útiles en entrevistas:

| Tipo | Definición |
| --- | --- |
| Completo | todos los niveles llenos excepto quizá el último, que se llena de izquierda a derecha |
| Lleno (full) | cada nodo tiene 0 o 2 hijos, nunca 1 |
| Perfecto | completo y lleno: todas las hojas en el mismo nivel; tiene exactamente 2ʰ⁺¹ − 1 nodos |
| Balanceado | la altura es O(log n); los subárboles izquierdo y derecho de cada nodo tienen alturas parecidas |

### El árbol binario de búsqueda (BST)

Un **árbol binario de búsqueda** agrega una regla de orden: para **cada** nodo, todos los valores de su subárbol izquierdo son menores y todos los de su subárbol derecho son mayores.

```
            50
          /    \
        30      70
       /  \    /  \
     20   40  60   80
```

Esa regla convierte al árbol en una **búsqueda binaria hecha estructura**. Para buscar 60: 60 > 50, voy a la derecha; 60 < 70, voy a la izquierda; encontrado. En cada paso descarto un subárbol entero.

Atención a un error frecuente de definición: no basta con que **cada hijo** sea menor o mayor que **su padre**. La regla es sobre **todo el subárbol**. Este árbol **no** es un BST, aunque cada hijo cumpla la regla con su padre:

```
        50
       /
     30
       \
        60    ← está en el subárbol izquierdo de 50 pero es mayor que 50
```

### Implementación de un BST

```ts
class BSTNode {
  left: BSTNode | null = null;
  right: BSTNode | null = null;
  constructor(public value: number) {}
}

export class BinarySearchTree {
  private root: BSTNode | null = null;

  insert(value: number): void {
    this.root = insertAt(this.root, value);
  }

  has(value: number): boolean {
    let node = this.root;
    while (node !== null) {
      if (value === node.value) return true;
      node = value < node.value ? node.left : node.right;
    }
    return false;
  }

  min(): number | undefined {
    let node = this.root;
    if (node === null) return undefined;
    while (node.left !== null) node = node.left; // el mínimo está lo más a la izquierda
    return node.value;
  }

  inOrder(): number[] {
    const out: number[] = [];
    const visit = (n: BSTNode | null) => {
      if (!n) return;
      visit(n.left); out.push(n.value); visit(n.right);
    };
    visit(this.root);
    return out;
  }
}

function insertAt(node: BSTNode | null, value: number): BSTNode {
  if (node === null) return new BSTNode(value);         // lugar vacío: aquí va
  if (value < node.value) node.left = insertAt(node.left, value);
  else if (value > node.value) node.right = insertAt(node.right, value);
  return node;                                         // duplicados se ignoran
}
```

Observa `insertAt`: devuelve el (sub)árbol resultante y el padre se reasigna su hijo. Este estilo ("devuelve el nuevo subárbol") evita casos especiales para la raíz vacía, igual que el nodo centinela en listas.

El **recorrido inorden** de un BST produce los valores **ordenados**: primero todo lo menor (izquierda), luego el nodo, luego todo lo mayor (derecha). Esto da un ordenamiento gratis y una forma de validar un BST.

### Borrar en un BST

Borrar tiene tres casos:

1. **El nodo es una hoja:** se quita sin más.
2. **Tiene un solo hijo:** el hijo ocupa su lugar.
3. **Tiene dos hijos:** se reemplaza su valor por el de su **sucesor** (el mínimo de su subárbol derecho) y luego se borra ese sucesor, que tiene como mucho un hijo (caso 1 o 2).

```
borrar 50 (dos hijos)        sucesor = mínimo del subárbol derecho = 60
        50                           60
      /    \                       /    \
    30      70        →          30      70
           /  \                            \
         60    80                           80
```

### Costo y el problema del balanceo

Buscar, insertar y borrar recorren un camino desde la raíz: cuestan **O(h)**, donde `h` es la altura.

- Si el árbol está **balanceado**, `h ≈ log n`: operaciones O(log n).
- Si insertas valores **ya ordenados** (1, 2, 3, 4, 5…), cada uno va a la derecha del anterior y el árbol degenera en una lista: `h = n`, operaciones O(n).

```
insertar 1,2,3,4,5 en orden:
1
 \
  2
   \
    3
     \
      4
       \
        5        ← altura 5: es una lista enlazada disfrazada
```

Para garantizar O(log n) existen **árboles autobalanceados** (AVL, rojo-negro) que, después de cada inserción o borrado, hacen **rotaciones** locales para mantener la altura logarítmica. No necesitas implementarlos de memoria; sí saber que existen y que son la base de estructuras como `TreeMap` en Java o los índices ordenados de muchas bases de datos. Las bases de datos usan una variante, el **B-tree**, donde cada nodo tiene **muchos** hijos (cientos), para que el árbol sea muy bajo y cada nivel sea una lectura de disco.

### BST frente a tabla hash

| | Tabla hash | BST balanceado |
| --- | --- | --- |
| Buscar / insertar / borrar | O(1) promedio | O(log n) garantizado |
| Recorrer en orden | no | sí, O(n) |
| Mínimo / máximo | O(n) | O(log n) |
| Rango "entre a y b" | O(n) | O(log n + k) |
| Siguiente mayor que x | O(n) | O(log n) |

Si solo necesitas "¿está?" y "dame el valor", usa hash. Si necesitas **orden**, usa un árbol.

### Validar un BST

Problema clásico: comprueba si un árbol binario es un BST válido. El error común es comparar solo cada nodo con sus hijos directos (ya viste el contraejemplo). La solución correcta pasa **límites** hacia abajo: cada nodo debe estar dentro de un rango `(min, max)` que se va estrechando.

```ts
function isValidBST(node: BSTNode | null, min = -Infinity, max = Infinity): boolean {
  if (node === null) return true;
  if (node.value <= min || node.value >= max) return false;
  return isValidBST(node.left, min, node.value) && isValidBST(node.right, node.value, max);
}
```

Al bajar a la izquierda, el valor del nodo se convierte en el nuevo máximo; a la derecha, en el nuevo mínimo. O(n) tiempo. Alternativa: hacer un recorrido inorden y comprobar que la secuencia es estrictamente creciente.

### Construir un BST balanceado desde un array ordenado

Si ya tienes los datos ordenados, puedes construir un BST de altura mínima en O(n) con divide y vencerás: el elemento del **medio** es la raíz (así la mitad de los valores queda a cada lado), y cada mitad se construye recursivamente de la misma forma.

```ts
function buildBalanced(sorted: number[], lo = 0, hi = sorted.length - 1): BSTNode | null {
  if (lo > hi) return null;
  const mid = lo + Math.floor((hi - lo) / 2);
  const node = new BSTNode(sorted[mid]);
  node.left = buildBalanced(sorted, lo, mid - 1);
  node.right = buildBalanced(sorted, mid + 1, hi);
  return node;
}
```

Con `[10, 20, 30, 40, 50, 60, 70]` la raíz es 40, sus hijos 20 y 60, y las hojas 10, 30, 50 y 70: un árbol perfecto de altura 2. Compara con insertar esos mismos valores uno por uno en orden, que produce una cadena de altura 6. Es la misma estructura de la búsqueda binaria, ahora usada para **construir** en lugar de para buscar.

### El k-ésimo menor en un BST

**Problema:** devuelve el k-ésimo valor más pequeño de un BST. Como el recorrido inorden produce los valores ordenados, basta recorrer en inorden y **contar**, deteniéndose al llegar al k-ésimo. No hace falta generar la lista completa.

```ts
function kthSmallest(root: BSTNode | null, k: number): number | undefined {
  let count = 0;
  let answer: number | undefined;
  const visit = (n: BSTNode | null): void => {
    if (!n || answer !== undefined) return;   // poda: ya lo encontramos
    visit(n.left);
    if (answer !== undefined) return;
    if (++count === k) { answer = n.value; return; }
    visit(n.right);
  };
  visit(root);
  return answer;
}
```

Costo O(h + k): bajas hasta el mínimo (altura) y luego avanzas `k` posiciones. Si esta consulta fuera muy frecuente sobre un árbol que cambia, podrías guardar en cada nodo el **tamaño de su subárbol**; entonces sabrías en cada paso si el k-ésimo está a la izquierda, es el nodo actual o está a la derecha, y la consulta bajaría a O(h). Es otra aplicación de la idea de **información auxiliar mantenida en cada operación**, como el mínimo por nivel en la pila de la sesión 08.

### Heaps: el mínimo siempre a mano

Un **min-heap** es un árbol binario **completo** donde cada nodo es **menor o igual** que sus hijos. Consecuencia: la raíz es siempre el mínimo. (Un max-heap es lo contrario.) No es un BST: no hay orden entre hermanos ni entre subárboles, solo entre padre e hijos.

```
            2
          /   \
         5     3
        / \   /
       9   7 8
```

Como es completo, un heap se guarda **en un array** sin punteros, por niveles: `[2, 5, 3, 9, 7, 8]`. Para el nodo en el índice `i`:

```
padre(i)      = Math.floor((i - 1) / 2)
hijoIzq(i)    = 2i + 1
hijoDer(i)    = 2i + 2
```

**Insertar:** pones el elemento al final (el siguiente hueco del último nivel) y lo **subes** (*sift up*) intercambiándolo con su padre mientras sea menor que él.

**Extraer el mínimo:** guardas la raíz, mueves el último elemento a la raíz y lo **bajas** (*sift down*) intercambiándolo con el menor de sus hijos mientras sea mayor que alguno.

Ambas operaciones recorren a lo sumo la altura: **O(log n)**. Leer el mínimo (`peek`) es O(1).

```ts
export class MinHeap {
  private data: number[] = [];

  get size(): number { return this.data.length; }
  peek(): number | undefined { return this.data[0]; }

  push(value: number): void {
    const a = this.data;
    a.push(value);
    let i = a.length - 1;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (a[parent] <= a[i]) break;
      [a[parent], a[i]] = [a[i], a[parent]];
      i = parent;
    }
  }

  pop(): number | undefined {
    const a = this.data;
    if (a.length === 0) return undefined;
    const top = a[0];
    const last = a.pop()!;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let smallest = i;
        if (l < a.length && a[l] < a[smallest]) smallest = l;
        if (r < a.length && a[r] < a[smallest]) smallest = r;
        if (smallest === i) break;
        [a[smallest], a[i]] = [a[i], a[smallest]];
        i = smallest;
      }
    }
    return top;
  }
}
```

Recorrido de `pop` sobre `[2, 5, 3, 9, 7, 8]`:

```
sacar 2, mover 8 a la raíz:   [8, 5, 3, 9, 7]
8 vs hijos 5 y 3 → menor 3:   [3, 5, 8, 9, 7]
8 en índice 2 no tiene hijos → fin.  Nuevo mínimo: 3
```

**Usos del heap:**

- **Cola de prioridad:** tareas por urgencia, eventos por tiempo, el algoritmo de Dijkstra (próxima sesión).
- **Los k mayores de un stream enorme:** mantén un min-heap de tamaño `k`; si llega un valor mayor que la raíz, saca la raíz y mete el nuevo. O(n log k) y solo O(k) de memoria.
- **Mediana en tiempo real:** dos heaps (un max-heap con la mitad inferior y un min-heap con la superior).
- **Heapsort:** meter todo y sacar uno por uno da O(n log n).

JavaScript no trae un heap en su librería estándar, así que es habitual tener una implementación propia o usar una librería.

### Tries: árboles de prefijos

Un **trie** es un árbol donde cada nodo representa un **prefijo** y cada arista un carácter. Las palabras se leen recorriendo desde la raíz; un nodo marcado como "fin de palabra" indica que el camino hasta él forma una palabra completa.

```
palabras: "sol", "solo", "son", "mar"
        (raíz)
        /    \
       s      m
       |      |
       o      a
      / \     |
     l*  n*   r*
     |
     o*            (* = fin de palabra)
```

```ts
class TrieNode {
  children = new Map<string, TrieNode>();
  isWord = false;
}

export class Trie {
  private root = new TrieNode();

  insert(word: string): void {
    let node = this.root;
    for (const ch of word) {
      let next = node.children.get(ch);
      if (!next) { next = new TrieNode(); node.children.set(ch, next); }
      node = next;
    }
    node.isWord = true;
  }

  private find(prefix: string): TrieNode | null {
    let node = this.root;
    for (const ch of prefix) {
      const next = node.children.get(ch);
      if (!next) return null;
      node = next;
    }
    return node;
  }

  has(word: string): boolean { return this.find(word)?.isWord ?? false; }
  hasPrefix(prefix: string): boolean { return this.find(prefix) !== null; }
}
```

Buscar una palabra o un prefijo cuesta **O(L)**, donde `L` es la longitud de la palabra, sin importar cuántas palabras haya. Una tabla hash también busca palabras completas rápido, pero no responde bien "¿hay alguna palabra que empiece con *so*?" ni "dame todas las que empiezan con *so*". Por eso los tries se usan en **autocompletado**, correctores ortográficos y enrutadores de URLs.

### Recorridos en profundidad y en anchura

Ya conoces los recorridos en profundidad (preorden, inorden, postorden). Existe otro: **por niveles** (*level order* o BFS), que visita primero la raíz, luego todos los de profundidad 1, luego los de profundidad 2. Usa una **cola**:

```ts
function levelOrder(root: BSTNode | null): number[][] {
  const levels: number[][] = [];
  let current = root ? [root] : [];
  while (current.length > 0) {
    levels.push(current.map((n) => n.value));
    const next: BSTNode[] = [];
    for (const n of current) {
      if (n.left) next.push(n.left);
      if (n.right) next.push(n.right);
    }
    current = next;
  }
  return levels;
}
```

(Aquí usamos un array por nivel en lugar de una cola explícita, lo que evita `shift` y además agrupa por nivel.) Este recorrido es el puente hacia la siguiente sesión: la búsqueda en anchura en **grafos** es exactamente esta idea, con la diferencia de que un grafo puede tener ciclos.

### Errores comunes

- **Validar un BST comparando solo padre e hijos**: hay que respetar los límites de todos los ancestros.
- **Olvidar el balanceo**: un BST alimentado con datos ordenados es una lista; O(log n) solo vale balanceado.
- **Confundir heap con BST**: el heap solo ordena padre-hijos; no sirve para buscar un valor arbitrario (O(n)).
- **Errores de índice en el heap**: `2i + 1` y `2i + 2` para hijos, `⌊(i − 1) / 2⌋` para el padre, con índices desde 0.
- **No marcar fin de palabra en el trie**: sin `isWord`, "so" parecería una palabra porque es prefijo de "sol".

## Conceptos clave

- **Árbol binario**: árbol donde cada nodo tiene como máximo dos hijos.
- **Árbol binario de búsqueda (BST)**: árbol binario donde todo el subárbol izquierdo es menor y todo el derecho es mayor que cada nodo.
- **Árbol balanceado**: árbol con altura O(log n); garantiza operaciones logarítmicas.
- **Sucesor inorden**: el menor valor mayor que un nodo; en el BST, el mínimo de su subárbol derecho.
- **Min-heap**: árbol binario completo donde cada nodo es menor o igual que sus hijos; la raíz es el mínimo.
- **Sift up / sift down**: operaciones que restauran la propiedad del heap subiendo o bajando un elemento.
- **Trie**: árbol de prefijos donde cada arista es un carácter; búsqueda en O(longitud de la palabra).
- **Recorrido por niveles**: visita los nodos por profundidad creciente usando una cola.

## Preguntas de repaso

1. ¿Por qué buscar en un BST puede ser O(log n) o O(n)?
   R: Porque la búsqueda recorre un camino desde la raíz y cuesta O(h), la altura. Si el árbol está balanceado, h es log n; si se insertaron datos ordenados y degeneró en una cadena, h es n.
2. ¿Por qué no basta comparar cada nodo con sus hijos para validar un BST?
   R: Porque la regla del BST es sobre subárboles completos: un nodo del subárbol izquierdo debe ser menor que todos sus ancestros por los que se bajó a la izquierda, no solo que su padre. La validación correcta pasa límites mínimo y máximo que se van estrechando al bajar.
3. ¿Cómo se guarda un heap en un array y cómo encuentras el padre y los hijos?
   R: Por niveles, de izquierda a derecha, aprovechando que es un árbol completo. Con índices desde 0, los hijos del nodo i están en 2i + 1 y 2i + 2, y su padre en ⌊(i − 1) / 2⌋.
4. ¿Cuánto cuestan insertar y extraer el mínimo en un min-heap, y por qué?
   R: O(log n) ambas, porque insertar sube el elemento y extraer baja el último elemento colocado en la raíz, y en ambos casos se recorre como mucho la altura de un árbol completo, que es log n. Consultar el mínimo es O(1) porque siempre está en la raíz.
5. ¿Qué ventaja tiene un trie sobre una tabla hash para un autocompletado?
   R: El trie responde de forma directa si existe alguna palabra con un prefijo dado y permite listar todas las palabras que lo comparten recorriendo el subárbol del prefijo, en tiempo proporcional a la longitud del prefijo más los resultados. Una tabla hash solo busca claves completas y obligaría a revisar todas las palabras.
6. ¿Cómo obtienes los k elementos mayores de un stream enorme usando poca memoria?
   R: Con un min-heap de tamaño k: mientras tenga menos de k elementos, se inserta; después, si llega un valor mayor que la raíz (el menor de los k guardados), se extrae la raíz y se inserta el nuevo. Cuesta O(n log k) en tiempo y O(k) en memoria.

## Ejercicio

Extiende el `BinarySearchTree` de esta sesión con `delete(value)` (los tres casos), `height()`, `isBalanced()` (en cada nodo, las alturas de los subárboles difieren como mucho en 1, en O(n)) y `range(lo, hi)` que devuelva ordenados los valores entre `lo` y `hi` sin recorrer subárboles innecesarios. Implementa también `topK(stream, k)` con tu `MinHeap`.

Criterio de terminado: un test inserta 1.000 números aleatorios, borra 500 y comprueba que `inOrder()` sigue ordenado y sin los borrados; un test inserta 1..1.000 en orden y verifica que `height()` es 1.000 (degenerado); `topK` sobre 100.000 números aleatorios coincide con ordenar y tomar los k últimos.

## Explícalo con tus palabras

Explica a un compañero en qué se diferencian un BST y un heap, para qué sirve cada uno, y por qué un heap no sirve para buscar un valor cualquiera.
