---
title: Tablas hash
kind: lesson
hours: 2
sources: Grokking Algorithms, cap. 5 "Hash Tables" (pp. 92–113) | Cracking the Coding Interview, cap. 1 "Hash Tables" (p. 100) y apéndice "Hash Table Collision Resolution" (p. 648)
links: VisuAlgo, tablas hash | https://visualgo.net/en/hashtable ; MDN, Map | https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Map
---

## Objetivo

Entender cómo funciona por dentro una tabla hash (función hash, cubetas, colisiones, factor de carga y redimensionamiento), por qué ofrece búsquedas en O(1) promedio, cuándo se degrada, y usarla con soltura en TypeScript (`Map`, `Set`) para resolver problemas de búsqueda, conteo, deduplicación y cache.

## Estudio

### El problema: buscar rápido por clave

Imagina que trabajas en una tienda y un cliente pregunta el precio de un producto. Si tienes una libreta desordenada, recorres página por página: O(n). Si la libreta está ordenada alfabéticamente, usas búsqueda binaria: O(log n). Pero hay una empleada en la tienda que se sabe **todos** los precios de memoria: le dices el nombre y responde al instante, sin importar cuántos productos haya. Eso es O(1), y es lo que logra una **tabla hash**.

Una tabla hash es probablemente la estructura de datos más útil en el día a día de un programador. Aparece con distintos nombres: `Map` y objetos en JavaScript, `dict` en Python, `HashMap` en Java, "diccionario" o "array asociativo" en general.

### La función hash

La pieza central es una **función hash**: una función que recibe una clave (un string, por ejemplo) y devuelve un número. Para servir en una tabla hash, debe cumplir:

1. **Determinista:** la misma clave da siempre el mismo número. Si "manzana" da 4 hoy, debe dar 4 mañana.
2. **Dispersa:** claves distintas deberían dar números distintos (o al menos bien repartidos). Si todas las claves dieran 4, no serviría de nada.
3. **Rápida de calcular.**
4. **Dentro de rango:** el número debe ser un índice válido del array interno (se logra con módulo).

La idea completa es sencilla: tienes un array de tamaño `m`. Para guardar el par `("manzana", 0.67)`, calculas `hash("manzana") % m`, digamos 4, y guardas el valor en la posición 4. Para buscar el precio de "manzana", vuelves a calcular el hash, obtienes 4 y vas directo a esa posición. Sin recorrer nada.

```
hash("manzana") % 8 = 4
hash("leche")   % 8 = 1
hash("pan")     % 8 = 6

índice:  0     1       2   3   4        5   6     7
        [   | leche  |   |   | manzana |   | pan |   ]
              1.49              0.67          2.10
```

Es la misma idea del histograma de la sesión de arrays (usar un dato como índice), generalizada a cualquier clave gracias a la función hash que convierte la clave en un índice.

Una función hash simple para strings (al estilo de la que usa Java) combina los caracteres con un multiplicador primo:

```ts
function hashString(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0; // mantener en 32 bits
  }
  return h >>> 0; // como entero sin signo
}
```

¿Por qué multiplicar y no simplemente sumar los códigos de los caracteres? Porque con una suma, "amor" y "roma" (y cualquier anagrama) darían el mismo hash. Multiplicar por 31 en cada paso hace que **la posición** de cada carácter importe.

### Colisiones: el problema inevitable

Si tu array tiene 8 posiciones y guardas 100 claves, por fuerza varias claves caerán en la misma posición. Incluso con pocas claves, dos pueden coincidir por azar (el famoso "problema del cumpleaños": con solo 23 personas, hay más de 50 % de probabilidad de que dos cumplan el mismo día). Cuando dos claves caen en la misma posición, hay una **colisión**.

Hay dos estrategias principales para resolverlas.

**1. Encadenamiento (separate chaining).** Cada posición del array (cubeta o *bucket*) guarda una **lista** de pares clave-valor. Al insertar, agregas a la lista de esa cubeta. Al buscar, vas a la cubeta y recorres su lista comparando claves.

```
índice 4 → [("manzana", 0.67)] → [("aguacate", 1.20)]
```

**2. Direccionamiento abierto (open addressing).** Todo vive en el propio array. Si la posición está ocupada, pruebas la siguiente (sondeo lineal), o saltas con otro patrón, hasta encontrar un hueco. Al buscar, sigues el mismo recorrido hasta encontrar la clave o un hueco vacío. Es más amigable con la caché, pero borrar es delicado (hay que dejar "lápidas" para no cortar las cadenas de búsqueda).

Las dos funcionan bien si las colisiones son pocas. Si son muchas, todo se degrada: imagina que todas las claves caen en la misma cubeta; la "tabla hash" se convierte en una lista enlazada y buscar cuesta O(n).

### Rendimiento: promedio y peor caso

| Operación | Promedio | Peor caso |
| --- | --- | --- |
| Buscar | O(1) | O(n) |
| Insertar | O(1) | O(n) |
| Borrar | O(1) | O(n) |

Comparación con lo que ya conoces:

| | Tabla hash (prom.) | Array | Lista enlazada | Array ordenado |
| --- | --- | --- | --- | --- |
| Buscar por clave | O(1) | O(n) | O(n) | O(log n) |
| Insertar | O(1) | O(1) al final | O(1) | O(n) |
| Borrar | O(1) | O(n) | O(1) con el nodo | O(n) |
| Recorrer en orden de clave | no | no | no | sí |

La tabla hash gana en casi todo, **excepto** en mantener un orden por clave. Si necesitas "el menor", "el siguiente mayor" o "todos entre A y B", una tabla hash no te ayuda: necesitas un array ordenado o un árbol balanceado.

Para mantenerse en el caso promedio, la tabla necesita dos cosas: un **factor de carga bajo** y una **buena función hash**.

### Factor de carga y redimensionamiento

El **factor de carga** es:

```
factor de carga = cantidad de elementos / cantidad de cubetas
```

Con 6 elementos en 8 cubetas, el factor es 0,75. Si supera 1, seguro hay colisiones (más elementos que cubetas). Cuanto más alto, más colisiones y listas más largas.

La solución es **redimensionar**: cuando el factor de carga supera un umbral (típicamente entre 0,7 y 0,75), creas un array con el **doble** de cubetas y reinsertas todos los elementos (cada uno recalcula su posición con el nuevo tamaño). Reinsertar cuesta O(n), pero como duplicas, ocurre cada vez menos: es el mismo argumento amortizado del array dinámico. Inserción: **O(1) amortizado**.

### Una buena función hash

Una mala función hash agrupa claves en pocas cubetas. Ejemplos de malas ideas:

- Usar solo la primera letra: todas las palabras que empiezan con "a" colisionan.
- Usar la longitud: "pan", "sal" y "sol" colisionan porque todas tienen tres letras.
- Sumar los caracteres sin ponderar posición: anagramas colisionan.

Una buena función hash reparte las claves de forma **uniforme** y **cambia mucho** con cambios pequeños en la clave. No necesitas diseñar las tuyas: los lenguajes ya traen funciones probadas. Lo importante es saber que existen, que pueden fallar, y que en sistemas expuestos a atacantes se usan funciones hash con semilla aleatoria para evitar que alguien envíe a propósito claves que colisionen (un ataque de denegación de servicio conocido como *hash flooding*).

### Implementación didáctica con encadenamiento

```ts
export class HashMap<V> {
  private buckets: Array<Array<[string, V]>>;
  private count = 0;

  constructor(capacity = 8) {
    this.buckets = Array.from({ length: capacity }, () => []);
  }

  private index(key: string, size = this.buckets.length): number {
    return hashString(key) % size;
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

  delete(key: string): boolean {
    const bucket = this.buckets[this.index(key)];
    const i = bucket.findIndex(([k]) => k === key);
    if (i === -1) return false;
    bucket.splice(i, 1);
    this.count--;
    return true;
  }

  private resize(): void {
    const old = this.buckets;
    this.buckets = Array.from({ length: old.length * 2 }, () => []);
    for (const bucket of old) for (const [k, v] of bucket) this.buckets[this.index(k)].push([k, v]);
  }

  get size(): number { return this.count; }
}
```

Observa que `get` y `delete` recorren una cubeta: mientras el factor de carga sea bajo y el hash reparta bien, cada cubeta tiene en promedio menos de un elemento y ese recorrido es O(1).

### `Map`, `Set` y objetos en TypeScript

En la práctica usas las estructuras del lenguaje:

```ts
const prices = new Map<string, number>();
prices.set("manzana", 0.67);
prices.get("manzana");      // 0.67
prices.has("pera");         // false
prices.delete("manzana");

const seen = new Set<string>();
seen.add("ana");
seen.has("ana");            // true
```

¿`Map` u objeto literal (`{}`)? Prefiere `Map` cuando las claves son dinámicas:

| | `Map` | objeto `{}` |
| --- | --- | --- |
| Tipos de clave | cualquiera (también objetos) | strings y símbolos |
| Orden de iteración | orden de inserción | reglas especiales (enteros primero) |
| Tamaño | `map.size` O(1) | `Object.keys(o).length` O(n) |
| Claves heredadas | ninguna | riesgo con `__proto__`, `constructor` |
| Rendimiento con altas/bajas frecuentes | optimizado | peor |

Cuidado con claves que son objetos: `Map` las compara **por referencia**. Dos objetos `{x: 1}` distintos son claves distintas. Si necesitas una clave compuesta por valor (por ejemplo, una coordenada), conviértela a string: `` `${x},${y}` ``.

### Casos de uso

**1. Búsquedas (lookups).** Agenda telefónica, precios, configuración por nombre. También el sistema DNS en internet: traducir un nombre de dominio a una dirección IP es, conceptualmente, una enorme tabla de búsqueda.

**2. Evitar duplicados.** Una votación donde cada persona vota una vez: antes de registrar un voto, `if (voted.has(name))`. Con una lista, cada comprobación sería O(n) y todo el proceso O(n²); con un `Set`, O(n).

**3. Cache (memoización).** Si una página o un cálculo es caro, guardas el resultado indexado por su entrada. La próxima vez que te pidan lo mismo, respondes desde la cache. Los sitios web hacen esto constantemente: la página de inicio, que es igual para todos los visitantes, no se regenera en cada visita.

```ts
const cache = new Map<string, string>();
async function getPage(url: string): Promise<string> {
  const hit = cache.get(url);
  if (hit !== undefined) return hit;     // acierto de cache
  const page = await renderExpensive(url);
  cache.set(url, page);
  return page;
}
```

Volverás a esta idea en programación dinámica (memoización de funciones) y en diseño de sistemas (Redis, CDN).

**4. Contar y agrupar.** El histograma generalizado:

```ts
function wordFrequencies(text: string): Map<string, number> {
  const freq = new Map<string, number>();
  for (const word of text.toLowerCase().split(/\W+/).filter(Boolean)) {
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }
  return freq;
}

function groupAnagrams(words: string[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const w of words) {
    const signature = [...w].sort().join("");
    const group = groups.get(signature) ?? [];
    group.push(w);
    groups.set(signature, group);
  }
  return [...groups.values()];
}
```

**5. Índices auxiliares.** Cuando un algoritmo hace búsquedas repetidas en una lista, construir primero un `Map` de valor → índice convierte O(n²) en O(n). Es la optimización más común en problemas de entrevista.

### El patrón "complemento"

Problema clásico: dado un array y un objetivo, devuelve los índices de dos números que sumen el objetivo (array **sin** ordenar).

- Fuerza bruta: todos los pares, O(n²).
- Ordenar + dos punteros: O(n log n), pero pierdes los índices originales (habría que guardarlos).
- Hash: recorres una vez; para cada número `x`, preguntas si ya viste `target - x`.

```ts
function twoSum(nums: number[], target: number): [number, number] | null {
  const indexOf = new Map<number, number>(); // valor → índice
  for (let i = 0; i < nums.length; i++) {
    const j = indexOf.get(target - nums[i]);
    if (j !== undefined) return [j, i];
    indexOf.set(nums[i], i);
  }
  return null;
}
```

O(n) tiempo, O(n) espacio. Fíjate en el orden: primero buscas el complemento y **después** guardas el número actual, para no emparejar un número consigo mismo. Este patrón ("¿ya vi lo que me falta?") resuelve muchísimos problemas: subarrays con suma dada, pares con diferencia k, etc.

### Sumas prefijo con hash: contar subarrays que suman k

Un uso más avanzado del mismo patrón. **Problema:** ¿cuántos subarrays **contiguos** de `nums` suman exactamente `k`? Los números pueden ser negativos, así que la ventana deslizante de la sesión de arrays no sirve (agregar un elemento puede bajar la suma).

**Fuerza bruta:** probar todos los pares (inicio, fin), O(n²) con sumas acumuladas, O(n³) sin ellas.

**Replanteo con sumas prefijo.** Sea `prefix[i]` la suma de los primeros `i` elementos. La suma del subarray entre las posiciones `a` y `b − 1` es `prefix[b] − prefix[a]`. Queremos contar pares `a < b` con `prefix[b] − prefix[a] = k`, es decir, `prefix[a] = prefix[b] − k`. Otra vez el patrón del complemento: al llegar a cada `b`, pregunto **cuántas veces** vi antes la suma prefijo `prefix[b] − k`.

```ts
function countSubarraysWithSum(nums: number[], k: number): number {
  const seen = new Map<number, number>([[0, 1]]); // prefijo vacío: suma 0, visto una vez
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

Recorrido con `nums = [1, 2, -1, 2]`, `k = 3`:

```
x=1:  prefix=1, busco -2 → 0       seen {0:1, 1:1}
x=2:  prefix=3, busco  0 → 1 ✓     seen {0:1, 1:1, 3:1}       ([1,2])
x=-1: prefix=2, busco -1 → 0       seen {..., 2:1}
x=2:  prefix=4, busco  1 → 1 ✓     seen {..., 4:1}            ([2,-1,2])
total = 2
```

El `[0, 1]` inicial representa el prefijo vacío y permite contar subarrays que empiezan en la posición 0. Es un detalle fácil de olvidar y es el que suele romper la solución.

O(n) tiempo y O(n) espacio, frente a O(n²). La lección: **una tabla hash convierte la pregunta "¿existe un elemento anterior con tal propiedad?" en una consulta O(1)**. Cuando veas un doble bucle donde el interno busca algo en lo ya recorrido, pregúntate si puedes guardar lo recorrido en un `Map`.

### Errores comunes

- **Asumir O(1) siempre**: el peor caso es O(n) con malas funciones hash o ataques; y el `O(1)` incluye calcular el hash, que es O(longitud de la clave) para strings.
- **Usar objetos mutables como claves** y modificarlos después: en lenguajes que hashean por valor, la clave queda en la cubeta equivocada. En JavaScript, `Map` usa la referencia, así que modificar el objeto no lo pierde, pero buscar con otro objeto "igual" falla.
- **Usar `{}` como diccionario de datos externos**: claves como `"__proto__"` causan comportamientos extraños. Usa `Map` u `Object.create(null)`.
- **Esperar orden por clave**: una tabla hash no ordena. `Map` recuerda el orden de **inserción**, no el orden alfabético.
- **Comprobar con `if (map.get(k))`**: falla cuando el valor guardado es `0`, `""` o `false`. Usa `map.has(k)` o compara con `undefined`.

### Para llevarte

Si tuvieras que quedarte con una sola estructura de datos para el trabajo diario, sería la tabla hash. Convierte "buscar" en "calcular dónde está", y eso transforma una enorme cantidad de soluciones O(n²) en O(n): pares con suma dada, duplicados, frecuencias, agrupaciones, sumas prefijo, caches. Su precio es que no guarda orden y que su O(1) es un promedio que depende de una buena función hash y de un factor de carga controlado. Cuando necesites orden, mínimos o rangos, la siguiente sesión te da la alternativa: los árboles. Un hábito que vale la pena entrenar: cada vez que escribas un bucle dentro de otro, pregúntate si el bucle interno solo está buscando algo. Si la respuesta es sí, casi siempre hay un `Map` o un `Set` esperando para reemplazarlo.

## Conceptos clave

- **Tabla hash**: estructura que asocia claves a valores usando una función hash para calcular la posición de cada clave en un array.
- **Función hash**: función determinista que convierte una clave en un número bien repartido.
- **Cubeta (bucket)**: posición del array interno, que puede contener uno o varios pares.
- **Colisión**: dos claves distintas que caen en la misma cubeta.
- **Encadenamiento**: resolución de colisiones guardando una lista de pares por cubeta.
- **Direccionamiento abierto**: resolución de colisiones buscando otra posición libre dentro del mismo array.
- **Factor de carga**: elementos divididos entre cubetas; si supera un umbral, se redimensiona.
- **Memoización / cache**: guardar resultados ya calculados indexados por su entrada para no recalcularlos.

## Preguntas de repaso

1. ¿Qué propiedades debe tener una función hash para una tabla hash?
   R: Debe ser determinista (la misma clave siempre da el mismo valor), repartir bien las claves distintas entre las cubetas, ser rápida de calcular y producir un índice válido del array (normalmente usando módulo).
2. ¿Por qué la búsqueda en una tabla hash es O(1) en promedio pero O(n) en el peor caso?
   R: En promedio, con buena función hash y factor de carga bajo, cada cubeta tiene muy pocos elementos y basta calcular el hash e ir directo a ella. En el peor caso, si todas las claves colisionan en la misma cubeta, buscar exige recorrer una lista con todos los elementos.
3. ¿Qué es el factor de carga y qué hace la tabla cuando es demasiado alto?
   R: Es el número de elementos dividido por el número de cubetas. Cuando supera un umbral (por ejemplo 0,75), la tabla crea un array con el doble de cubetas y reinserta todos los elementos. Aunque redimensionar cuesta O(n), al duplicar ocurre cada vez menos y la inserción queda en O(1) amortizado.
4. ¿Por qué multiplicar por un número (como 31) en cada paso da una mejor función hash para strings que sumar los códigos de los caracteres?
   R: Porque la suma ignora la posición de cada carácter, así que todos los anagramas producen el mismo hash. Multiplicar en cada paso hace que la contribución de cada carácter dependa de su posición, y strings con las mismas letras en otro orden dan valores distintos.
5. ¿Cuándo NO conviene una tabla hash?
   R: Cuando necesitas los datos ordenados por clave, consultas por rangos ("todos entre A y B"), el mínimo o el siguiente mayor. Para eso sirven un array ordenado o un árbol de búsqueda balanceado. También si la memoria es muy limitada, porque la tabla reserva cubetas extra.
6. En `twoSum` con un `Map`, ¿por qué se busca el complemento antes de guardar el número actual?
   R: Para no emparejar un número consigo mismo: si el objetivo es 10 y el número actual es 5, guardarlo antes haría que se encontrara a sí mismo como complemento aunque no haya otro 5 en el array.

## Ejercicio

Implementa en TypeScript tu propio `HashMap<V>` con direccionamiento abierto y sondeo lineal (claves string), con `get`, `set`, `delete` (usando lápidas) y redimensionamiento al superar factor de carga 0,6. Luego resuelve con `Map`/`Set`: `firstDuplicateWord(text)`, `groupAnagrams(words)` y `longestSubarrayWithSum(nums, k)` (longitud del subarray contiguo más largo que suma `k`, usando sumas prefijo guardadas en un `Map`).

Criterio de terminado: tests de tu `HashMap` que insertan 10.000 claves, borran la mitad y verifican que las restantes siguen encontrándose; los tres problemas son O(n) (comentario que lo justifica) y tienen tests con casos vacíos y sin solución.

## Explícalo con tus palabras

Explica a alguien que no programa cómo una tabla hash encuentra el precio de un producto "sin buscarlo", usando la analogía de una empleada que se sabe todos los precios y qué pasa cuando dos productos "caen en el mismo cajón".
