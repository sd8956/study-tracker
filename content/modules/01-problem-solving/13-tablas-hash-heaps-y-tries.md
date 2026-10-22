---
title: Tablas hash por dentro, heaps y tries
kind: lesson
hours: 3
sources: Grokking Algorithms, cap. 5 "Hash Tables" (pp. 92–113) | Cracking the Coding Interview, cap. 1 "Hash Tables" (p. 100), cap. 4 "Trees and Graphs", Types of Trees, Binary Heaps y Tries (pp. 112–117) y apéndice "Hash Table Collision Resolution" (p. 648) | Grokking Algorithms, cap. 11 "Trees" (pp. 222–225)
links: VisuAlgo, tablas hash | https://visualgo.net/en/hashtable ; VisuAlgo, heap binario | https://visualgo.net/en/heap ; MDN, Map | https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Map
---

## Objetivo

Entender cómo funciona por dentro una tabla hash (función hash, colisiones, factor de carga, redimensionamiento) y cuándo se degrada; usarla para convertir búsquedas repetidas en consultas O(1); e implementar un min-heap como cola de prioridad y un trie para búsquedas por prefijo, sabiendo cuándo cada estructura le gana a las otras.

## Estudio

### Tres preguntas, tres estructuras

Esta sesión junta tres estructuras porque cada una responde muy bien a una pregunta distinta:

| Pregunta | Estructura | Costo típico |
| --- | --- | --- |
| "¿Está esta clave?, ¿qué valor tiene?" | tabla hash | O(1) promedio |
| "¿Cuál es el menor (o el mayor) ahora mismo?" | heap | O(1) consultar, O(log n) sacar o meter |
| "¿Qué palabras empiezan con este prefijo?" | trie | O(longitud del prefijo) |

Ninguna sirve para todo. El objetivo es que, al leer un problema, reconozcas cuál de las tres preguntas está haciendo.

### Tabla hash: calcular dónde está en lugar de buscarlo

Con una libreta desordenada, encontrar un precio es O(n); ordenada, O(log n) con búsqueda binaria. Una tabla hash lo hace en O(1) promedio porque no busca: **calcula** la posición. Tiene un array interno de `m` **cubetas** (*buckets*). Para guardar `("manzana", 0.67)` calcula `hash("manzana") % m`, digamos 4, y guarda el par en la cubeta 4. Para leerlo, repite el cálculo y va directo ahí.

```
hash("manzana") % 8 = 4
hash("leche")   % 8 = 1
hash("pan")     % 8 = 6

índice:  0     1       2   3   4        5   6     7
        [   | leche  |   |   | manzana |   | pan |   ]
```

La pieza central es la **función hash**, que debe ser determinista (la misma clave da siempre el mismo número), repartir bien claves distintas, ser rápida y producir un índice válido (con módulo). Una función simple para strings, al estilo de Java:

```ts
function hashString(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0; // mantener en 32 bits
  }
  return h >>> 0; // entero sin signo
}
```

¿Por qué multiplicar por 31 y no solo sumar los códigos? Con una suma, "amor" y "roma" (y todos los anagramas) colisionarían. Multiplicar en cada paso hace que **la posición** de cada carácter cambie el resultado. Otras malas ideas: usar la primera letra (todas las palabras con "a" juntas) o la longitud ("pan", "sal" y "sol" juntas).

### Colisiones

Con más claves que cubetas, varias claves comparten cubeta por fuerza, y aun con pocas pueden coincidir por azar: con 23 personas ya es más probable que no que dos cumplan años el mismo día. Dos estrategias:

- **Encadenamiento** (*separate chaining*): cada cubeta guarda una lista de pares. Insertar agrega a la lista; buscar la recorre comparando claves.
- **Direccionamiento abierto** (*open addressing*): todo vive en el array. Si la posición está ocupada, pruebas la siguiente (sondeo lineal) hasta encontrar un hueco; al buscar, sigues el mismo recorrido hasta encontrar la clave o un hueco vacío. Es más amigable con la caché, pero borrar es delicado: si vacías una posición, cortas la cadena de sondeo de las claves que pasaron por ella. Por eso se deja una **lápida** (*tombstone*) que la búsqueda salta y la inserción puede reutilizar.

Si todas las claves caen en la misma cubeta, la tabla se vuelve una lista y todo cuesta O(n).

| Operación | Promedio | Peor caso |
| --- | --- | --- |
| Buscar, insertar, borrar | O(1) | O(n) |

### Factor de carga y redimensionamiento

El **factor de carga** es `elementos / cubetas`. Cuanto más alto, más colisiones. Cuando supera un umbral (típicamente 0,7–0,75), la tabla crea un array con el **doble** de cubetas y reinserta todo, porque cada clave recalcula su cubeta con el nuevo tamaño. Reinsertar cuesta O(n), pero como el tamaño se duplica, ocurre cada vez menos: es el mismo argumento del array dinámico de la sesión 03, y la inserción queda en **O(1) amortizado**.

Dos matices del "O(1)". Calcular el hash de un string cuesta O(longitud de la clave), así que con claves largas no es gratis. Y en sistemas expuestos a atacantes, alguien puede enviar a propósito claves que colisionen (*hash flooding*) para degradar la tabla a O(n); por eso los lenguajes usan funciones hash con semilla aleatoria.

### Una implementación didáctica

```ts
export class HashMap<V> {
  private buckets: Array<Array<[string, V]>>;
  private count = 0;

  constructor(capacity = 8) {
    this.buckets = Array.from({ length: capacity }, () => []);
  }

  private index(key: string): number {
    return hashString(key) % this.buckets.length;
  }

  get(key: string): V | undefined {
    for (const [k, v] of this.buckets[this.index(key)]) if (k === key) return v;
    return undefined;
  }

  set(key: string, value: V): void {
    const bucket = this.buckets[this.index(key)];
    for (const pair of bucket) {
      if (pair[0] === key) { pair[1] = value; return; } // actualizar existente
    }
    bucket.push([key, value]);
    this.count++;
    if (this.count / this.buckets.length > 0.75) this.resize();
  }

  private resize(): void {
    const old = this.buckets;
    this.buckets = Array.from({ length: old.length * 2 }, () => []);
    for (const bucket of old) for (const [k, v] of bucket) this.buckets[this.index(k)].push([k, v]);
  }

  get size(): number { return this.count; }
}
```

Mientras el factor de carga sea bajo, cada cubeta tiene en promedio menos de un elemento y recorrerla es O(1).

En el día a día usas `Map` y `Set`. Prefiere `Map` a un objeto `{}` cuando las claves son dinámicas: acepta cualquier tipo de clave, recuerda el orden de **inserción**, da `size` en O(1) y no tiene claves heredadas peligrosas como `__proto__`. Ojo: compara claves objeto **por referencia**; para una clave compuesta por valor, como una coordenada, usa un string `` `${x},${y}` ``. Y comprueba con `map.has(k)`, no con `if (map.get(k))`, que falla si el valor guardado es `0` o `""`.

### El patrón del complemento

La tabla hash convierte "¿ya vi algo con tal propiedad?" en una consulta O(1). Problema clásico: en un array sin ordenar, devuelve los índices de dos números que sumen `target`. Todos los pares es O(n²). Con hash, en una pasada preguntas si ya viste `target - x`:

```ts
function twoSum(nums: number[], target: number): [number, number] | null {
  const indexOf = new Map<number, number>(); // valor → índice
  for (let i = 0; i < nums.length; i++) {
    const j = indexOf.get(target - nums[i]);
    if (j !== undefined) return [j, i];
    indexOf.set(nums[i], i); // después de buscar, para no emparejarlo consigo mismo
  }
  return null;
}
```

O(n) tiempo y espacio. El orden importa: si guardaras `nums[i]` antes de buscar, con `target = 10` un único 5 se encontraría a sí mismo.

### Sumas prefijo con hash

El mismo patrón, más fuerte: ¿cuántos subarrays **contiguos** suman exactamente `k`, con números que pueden ser negativos? Con negativos, una ventana deslizante no sirve, porque agregar un elemento puede bajar la suma.

Replanteo: si `prefix` es la suma acumulada hasta la posición actual, un subarray que termina aquí suma `k` si antes hubo una suma prefijo igual a `prefix - k`. Otra vez el complemento, ahora contando **cuántas veces** apareció cada suma:

```ts
function countSubarraysWithSum(nums: number[], k: number): number {
  const seen = new Map<number, number>([[0, 1]]); // prefijo vacío: suma 0, una vez
  let prefix = 0;
  let count = 0;
  for (const x of nums) {
    prefix += x;
    count += seen.get(prefix - k) ?? 0;
    seen.set(prefix, (seen.get(prefix) ?? 0) + 1);
  }
  return count;
}
```

Con `[1, 2, -1, 2]` y `k = 3` encuentra `[1, 2]` y `[2, -1, 2]`: devuelve 2. El `[0, 1]` inicial representa el prefijo vacío y permite contar subarrays que empiezan en la posición 0; olvidarlo es el error típico. O(n) frente a O(n²). Hábito que vale oro: cada vez que el bucle interno de un doble bucle solo **busca algo en lo ya recorrido**, guarda lo recorrido en un `Map`.

### Cuando necesitas orden: el árbol de búsqueda en una página

La tabla hash no guarda orden. Si necesitas "el menor", "el siguiente mayor que x" o "todos entre a y b", la herramienta es un **árbol binario de búsqueda** (BST): para cada nodo, todo su subárbol izquierdo es menor y todo el derecho es mayor (la regla es sobre **subárboles completos**, no solo sobre los hijos directos). Buscar baja un nivel por paso descartando un subárbol entero, y el recorrido inorden devuelve los valores ordenados.

Su costo es O(h), la altura: O(log n) si está balanceado, O(n) si degenera, por ejemplo al insertar valores ya ordenados, que forman una cadena. Los árboles **autobalanceados** (AVL, rojo-negro) rotan nodos para mantener la altura logarítmica, y las bases de datos usan **B-trees**, con cientos de hijos por nodo para que cada nivel sea una lectura de disco. Lo implementarás en Python en DataCamp; aquí basta con saber elegir:

| | Tabla hash | BST balanceado |
| --- | --- | --- |
| Buscar, insertar, borrar | O(1) promedio | O(log n) garantizado |
| Recorrer en orden | no | O(n) |
| Mínimo, siguiente mayor | O(n) | O(log n) |
| Rango "entre a y b" | O(n) | O(log n + k) |

### Heaps: el mínimo siempre a mano

A veces no necesitas todo el orden, solo **el menor ahora mismo**, una y otra vez, mientras llegan elementos nuevos. Para eso está el **min-heap**: un árbol binario **completo** (todos los niveles llenos salvo el último, que se llena de izquierda a derecha) donde cada nodo es menor o igual que sus hijos. La raíz es siempre el mínimo. No es un BST: no hay orden entre hermanos ni entre subárboles.

```
            2
          /   \
         5     3
        / \   /
       9   7 8
```

Como es completo, se guarda en un array por niveles, sin punteros: `[2, 5, 3, 9, 7, 8]`. Con índices desde 0, los hijos de `i` están en `2i + 1` y `2i + 2`, y su padre en `⌊(i − 1) / 2⌋`.

- **Insertar:** pones el elemento al final y lo **subes** (*sift up*) intercambiándolo con su padre mientras sea menor.
- **Extraer el mínimo:** guardas la raíz, mueves el último elemento a la raíz y lo **bajas** (*sift down*) intercambiándolo con el menor de sus hijos mientras sea mayor que alguno.

Ambas recorren a lo sumo la altura de un árbol completo: **O(log n)**. Consultar el mínimo es O(1).

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

`pop` sobre `[2, 5, 3, 9, 7, 8]`: saca 2 y mueve 8 a la raíz, `[8, 5, 3, 9, 7]`; 8 es mayor que su hijo menor, 3, e intercambian: `[3, 5, 8, 9, 7]`; 8 ya no tiene hijos. Nuevo mínimo: 3.

**Usos del heap**, que vas a ver muchas veces:

- **Cola de prioridad:** tareas por urgencia, eventos por tiempo y el algoritmo de Dijkstra (sesión 16).
- **Los k mayores de un stream enorme:** un min-heap de tamaño `k` guarda los mejores hasta ahora; si llega un valor mayor que la raíz (el peor de los k), sacas la raíz y metes el nuevo. O(n log k) tiempo y O(k) memoria, mejor que ordenar todo cuando k es pequeño.
- **Mediana en tiempo real:** un max-heap con la mitad inferior y un min-heap con la superior, equilibrados en tamaño.

JavaScript no trae heap en su librería estándar, así que vas a reutilizar el tuyo en las próximas sesiones.

### Tries: árboles de prefijos

Un **trie** es un árbol donde cada arista es un carácter y cada nodo representa el prefijo formado por el camino desde la raíz. Un nodo marcado como fin de palabra indica que ese camino es una palabra completa.

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

Buscar una palabra o un prefijo cuesta **O(L)**, la longitud, sin importar cuántas palabras haya. Una tabla hash también busca palabras completas rápido, pero para "¿hay alguna que empiece con *so*?" o "dame todas las que empiezan con *so*" tendría que revisar todas las claves. El trie responde bajando al nodo del prefijo y recorriendo su subárbol. Por eso aparece en autocompletado, correctores ortográficos y enrutadores de URLs. Sin la marca `isWord`, "so" parecería una palabra solo por ser prefijo de "sol".

### Cómo elegir

| Necesitas… | Usa |
| --- | --- |
| buscar, contar, deduplicar o cachear por clave | `Map` / `Set` |
| saber si ya viste el complemento de algo | `Map` con lo recorrido |
| el mínimo o máximo una y otra vez mientras llegan datos | heap |
| los k mejores de muchos | heap de tamaño k |
| orden completo, rangos o el siguiente mayor | árbol balanceado (o un array ordenado si no cambia) |
| búsquedas por prefijo | trie |

### Errores comunes

- **Asumir O(1) siempre**: el peor caso de la tabla hash es O(n), y el hash de un string cuesta O(longitud).
- **Vaciar una posición al borrar en direccionamiento abierto**: corta las cadenas de sondeo; usa lápidas.
- **Comprobar con `if (map.get(k))`**: falla con valores `0`, `""` o `false`.
- **Esperar orden por clave de una tabla hash**: `Map` recuerda el orden de inserción, no el alfabético.
- **Olvidar el prefijo vacío** `[0, 1]` en las sumas prefijo.
- **Confundir heap con BST**: el heap no sirve para buscar un valor arbitrario (O(n)) ni para recorrer en orden.
- **Errores de índice en el heap**: hijos en `2i + 1` y `2i + 2`, padre en `⌊(i − 1) / 2⌋`, con índices desde 0.
- **No marcar fin de palabra en el trie.**

## Conceptos clave

- **Tabla hash**: estructura que asocia claves a valores calculando con una función hash la cubeta de cada clave.
- **Colisión**: dos claves distintas que caen en la misma cubeta; se resuelve con encadenamiento o direccionamiento abierto.
- **Lápida**: marca que deja el direccionamiento abierto al borrar para no cortar las cadenas de sondeo.
- **Factor de carga**: elementos divididos entre cubetas; al superar un umbral, la tabla duplica su tamaño y reinserta.
- **Patrón del complemento**: recorrer una vez guardando lo visto en un `Map` y preguntar si ya apareció lo que falta.
- **Suma prefijo**: suma acumulada hasta una posición; la diferencia entre dos sumas prefijo es la suma de un subarray.
- **Min-heap**: árbol binario completo donde cada nodo es menor o igual que sus hijos; la raíz es el mínimo.
- **Sift up / sift down**: operaciones que restauran la propiedad del heap subiendo o bajando un elemento.
- **Trie**: árbol de prefijos donde cada arista es un carácter; búsqueda en O(longitud).

## Preguntas de repaso

1. ¿Por qué la búsqueda en una tabla hash es O(1) en promedio pero O(n) en el peor caso?
   R: En promedio, con una buena función hash y un factor de carga bajo, cada cubeta tiene muy pocos elementos y basta calcular el hash e ir directo a ella. En el peor caso, si todas las claves colisionan en la misma cubeta, buscar exige recorrer una lista con todos los elementos.
2. ¿Qué es el factor de carga y qué hace la tabla cuando es demasiado alto?
   R: Es el número de elementos dividido por el número de cubetas. Cuando supera un umbral (por ejemplo 0,75), la tabla crea un array con el doble de cubetas y reinserta todo. Aunque redimensionar cuesta O(n), al duplicar ocurre cada vez menos y la inserción queda en O(1) amortizado.
3. ¿Por qué multiplicar por un número como 31 en cada paso da una mejor función hash para strings que sumar los códigos de los caracteres?
   R: Porque la suma ignora la posición de cada carácter, así que todos los anagramas producen el mismo hash. Multiplicar en cada paso hace que la contribución de cada carácter dependa de su posición.
4. En `twoSum` con un `Map`, ¿por qué se busca el complemento antes de guardar el número actual?
   R: Para no emparejar un número consigo mismo: si el objetivo es 10 y el número actual es 5, guardarlo antes haría que se encontrara a sí mismo como complemento aunque no haya otro 5 en el array.
5. ¿Cómo se guarda un heap en un array y cuánto cuestan insertar y extraer el mínimo?
   R: Por niveles, de izquierda a derecha, aprovechando que es un árbol completo; con índices desde 0, los hijos de i están en 2i + 1 y 2i + 2 y su padre en ⌊(i − 1) / 2⌋. Insertar (subir el elemento) y extraer el mínimo (bajar el último elemento puesto en la raíz) cuestan O(log n) porque recorren como mucho la altura; consultar el mínimo es O(1).
6. ¿Cómo obtienes los k elementos mayores de un stream enorme usando poca memoria?
   R: Con un min-heap de tamaño k: mientras tenga menos de k elementos, se inserta; después, si llega un valor mayor que la raíz (el menor de los k guardados), se extrae la raíz y se inserta el nuevo. Cuesta O(n log k) en tiempo y O(k) en memoria.
7. ¿Qué ventaja tiene un trie sobre una tabla hash para un autocompletado?
   R: El trie responde directamente si existe alguna palabra con un prefijo y permite listar todas las que lo comparten recorriendo el subárbol del prefijo, en tiempo proporcional a la longitud del prefijo más los resultados. Una tabla hash solo busca claves completas y obligaría a revisar todas las palabras.
8. ¿Cuándo NO conviene una tabla hash y qué usarías en su lugar?
   R: Cuando necesitas los datos ordenados por clave, consultas por rango, el mínimo o el siguiente mayor. Para eso sirve un árbol de búsqueda balanceado (O(log n) garantizado) o un array ordenado si los datos no cambian; si solo necesitas el mínimo repetidamente, un heap.

## Ejercicio

En TypeScript: (1) implementa `OpenHashMap<V>` con direccionamiento abierto y sondeo lineal (claves string), con `get`, `set`, `delete` usando lápidas y redimensionamiento al superar factor de carga 0,6; (2) implementa `topK(stream, k)` con tu `MinHeap`; (3) agrega a tu `Trie` el método `wordsWithPrefix(prefix)`, que devuelve en orden alfabético todas las palabras que empiezan con el prefijo; (4) resuelve `longestSubarrayWithSum(nums, k)`, la longitud del subarray contiguo más largo que suma `k`, con sumas prefijo en un `Map`.

Criterio de terminado: un test inserta 10.000 claves en `OpenHashMap`, borra la mitad y verifica que las restantes se siguen encontrando y que las borradas no; `topK` sobre 100.000 números aleatorios coincide con ordenar y tomar los k últimos; `wordsWithPrefix("so")` devuelve `["sol", "solo", "son"]` con las palabras del ejemplo; `longestSubarrayWithSum` es O(n) (comentario que lo justifica) y tiene tests con array vacío, sin solución y con negativos.

## Explícalo con tus palabras

Explica a alguien que no programa cómo una tabla hash encuentra el precio de un producto "sin buscarlo", qué pasa cuando dos productos caen en el mismo cajón, y por qué para "el siguiente paciente más urgente" usarías otra estructura.
