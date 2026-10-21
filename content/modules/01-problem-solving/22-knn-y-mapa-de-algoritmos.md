---
title: K vecinos más cercanos y un mapa de algoritmos para seguir
kind: lesson
hours: 2
sources: Grokking Algorithms, cap. 10 "K-nearest neighbors" (pp. 206–221) | Grokking Algorithms, cap. 11 "Where to Go Next" (pp. 222–239)
links: scikit-learn, vecinos más cercanos | https://scikit-learn.org/stable/modules/neighbors.html ; Bloom filters explicados (inglés) | https://llimllib.github.io/bloomfilter-tutorial/
---

## Objetivo

Entender y aplicar el algoritmo de K vecinos más cercanos (clasificación, regresión y recomendaciones), elegir buenas características y medidas de distancia, y conocer de forma panorámica otros algoritmos y estructuras que vas a encontrar en sistemas reales: índices invertidos, MapReduce, filtros de Bloom, HyperLogLog, funciones hash criptográficas y hashing sensible a la localidad.

## Estudio

### Clasificar por parecido

Ves una fruta y dudas si es una naranja o un pomelo. ¿Cómo decides? Probablemente piensas: "es grande y rojiza; las frutas que conozco con esas características suelen ser pomelos". Sin saberlo, aplicaste **K vecinos más cercanos** (*k-nearest neighbors*, KNN): miras los `k` ejemplos conocidos más parecidos y decides según lo que son ellos.

Visualmente, pon cada fruta conocida en un plano con dos ejes, tamaño y color:

```
rojez ▲
      │        P   P
      │     P    P  ?        ← la fruta nueva
      │   P    N
      │      N   N
      │   N    N
      └──────────────────► tamaño
       (N = naranja, P = pomelo)
```

Si de los 3 vecinos más cercanos a `?`, dos son pomelos y uno es naranja, la clasificas como pomelo. Eso es todo el algoritmo:

1. Representa cada elemento como un punto (un vector de números, sus **características**).
2. Para un elemento nuevo, calcula la **distancia** a todos los conocidos.
3. Toma los `k` más cercanos.
4. **Clasificación:** decide por mayoría (votación). **Regresión:** predice el promedio de sus valores.

### Distancia entre puntos

Para dos puntos con características `(a₁, a₂, …, aₙ)` y `(b₁, b₂, …, bₙ)`, la **distancia euclidiana** es la longitud de la recta que los une:

```
d = √((a₁ − b₁)² + (a₂ − b₂)² + … + (aₙ − bₙ)²)
```

Con dos características es el teorema de Pitágoras; con más, la misma fórmula en más dimensiones.

```ts
type Vector = number[];

function euclidean(a: Vector, b: Vector): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

interface Example<L> { features: Vector; label: L }

export function knnClassify<L>(training: Example<L>[], query: Vector, k: number): L {
  const nearest = training
    .map((ex) => ({ ex, d: euclidean(ex.features, query) }))
    .sort((x, y) => x.d - y.d)
    .slice(0, k);
  const votes = new Map<L, number>();
  for (const { ex } of nearest) votes.set(ex.label, (votes.get(ex.label) ?? 0) + 1);
  let best = nearest[0].ex.label, bestVotes = 0;
  for (const [label, v] of votes) if (v > bestVotes) { best = label; bestVotes = v; }
  return best;
}
```

Costo de una consulta: O(n · d) para las distancias (n ejemplos, d características) más O(n log n) para ordenar. Se puede bajar a O(n log k) con un heap de tamaño k (sesión 14), y en sistemas grandes se usan índices especiales (k-d trees, índices de vecinos aproximados) para no comparar contra todos.

### Un sistema de recomendaciones

Supón una plataforma de películas. Cada usuario califica géneros del 1 al 5: comedia, acción, drama, terror, romance. Cada usuario es entonces un punto en 5 dimensiones.

| Usuario | Comedia | Acción | Drama | Terror | Romance |
| --- | --- | --- | --- | --- | --- |
| Ana | 3 | 4 | 4 | 1 | 4 |
| Luis | 4 | 3 | 5 | 1 | 5 |
| Marta | 2 | 5 | 1 | 3 | 1 |

Distancia Ana–Luis: √(1 + 1 + 1 + 0 + 1) = 2. Distancia Ana–Marta: √(1 + 1 + 9 + 4 + 9) = √24 ≈ 4,9. Luis se parece mucho más a Ana. **Recomendación:** muéstrale a Ana las películas que a Luis (y a sus otros vecinos cercanos) les gustaron y ella no vio.

**Regresión:** para predecir cuánto le gustará a Ana una película concreta, promedia las calificaciones que le dieron sus `k` vecinos más cercanos. Con `k = 3` y calificaciones 5, 4 y 4, la predicción es 4,33.

### Regresión paso a paso: cuántos panes hornear

Una panadería quiere estimar cuántos panes venderá mañana. Tiene registros de días pasados con tres características: clima (1 = malo a 5 = excelente), si es fin de semana (0 o 1) y si hay algún evento deportivo en la zona (0 o 1).

| Día | Clima | Fin de semana | Evento | Panes vendidos |
| --- | --- | --- | --- | --- |
| A | 5 | 1 | 0 | 300 |
| B | 3 | 1 | 1 | 225 |
| C | 1 | 1 | 0 | 75 |
| D | 4 | 0 | 1 | 200 |
| E | 4 | 0 | 0 | 150 |
| F | 2 | 0 | 0 | 50 |

Mañana: clima 4, fin de semana, sin evento → `(4, 1, 0)`. Distancias:

```
A (5,1,0): √(1 + 0 + 0) = 1
B (3,1,1): √(1 + 0 + 1) ≈ 1,41
C (1,1,0): √(9 + 0 + 0) = 3
D (4,0,1): √(0 + 1 + 1) ≈ 1,41
E (4,0,0): √(0 + 1 + 0) = 1
F (2,0,0): √(4 + 1 + 0) ≈ 2,24
```

Con `k = 4`, los vecinos son A (1), E (1), B y D (1,41). Predicción: (300 + 150 + 225 + 200) / 4 ≈ **219 panes**.

Observa dos cosas. Primero, el empate entre B y D a la misma distancia: con `k = 3` tendrías que decidir cómo desempatar (por orden, al azar o incluyendo ambos), y conviene que esa regla sea explícita y determinista. Segundo, aquí las tres características tienen escalas parecidas (0–5 y 0–1), pero "clima" pesa más porque su rango es mayor; si el clima no fuera tan importante para las ventas, convendría normalizarlo o darle un peso menor. Elegir y escalar las características **es** el diseño del modelo.

### Elegir buenas características

KNN es tan bueno como sus características. La pregunta clave es: **¿qué números capturan lo que hace parecidos a dos elementos para este propósito?**

Buenas características:

- **Se relacionan directamente** con lo que quieres predecir. Para predecir cuántas personas comprarán pan mañana: día de la semana, si es festivo, el clima. No el color del logo de la panadería.
- **No tienen sesgos** que distorsionen la comparación. Si solo usas calificaciones de comedia para recomendar películas, todos los fanáticos de la comedia parecerán iguales aunque tengan gustos opuestos en todo lo demás.
- **Están en escalas comparables.** Si una característica va de 0 a 1 y otra de 0 a 100.000 (ingresos), la segunda domina la distancia por completo. Hay que **normalizar**: por ejemplo, llevar cada característica a un rango 0–1 o restarle la media y dividir por la desviación estándar.

Un problema sutil: personas con los **mismos gustos relativos** pero distinto "rigor". Ana pone 5 a lo que le encanta; Luis, más exigente, pone 4 a lo que le encanta. En distancia euclidiana parecen distintos. Soluciones: normalizar por usuario (restar su promedio) o usar la **similitud del coseno**, que compara la **dirección** de los vectores (el patrón de gustos) en lugar de su magnitud.

### Elegir k

- `k` muy pequeño (1): sensible al ruido; un ejemplo mal etiquetado cercano arruina la predicción.
- `k` muy grande: la predicción se diluye hacia la clase mayoritaria general.
- Regla práctica de partida: alrededor de `√n` (n = cantidad de ejemplos), con `k` impar en clasificación binaria para evitar empates; después se ajusta probando con datos reservados.

### KNN y el aprendizaje automático

KNN es un primer contacto con el **aprendizaje automático** (*machine learning*): en lugar de escribir reglas a mano, el sistema generaliza a partir de ejemplos. Algunos usos clásicos:

- **Reconocimiento de caracteres (OCR):** extraes características de la imagen de un dígito (trazos, curvas, puntos) y buscas los dígitos conocidos más parecidos. Los sistemas modernos usan redes neuronales, pero la idea de "características + comparación" es la misma.
- **Filtros de spam:** se usan clasificadores como **Naive Bayes**, que estiman la probabilidad de que un mensaje sea spam según las palabras que contiene, entrenados con mensajes etiquetados. Es otro algoritmo de clasificación, basado en probabilidades en lugar de distancias.
- **Predecir el mercado de valores:** casi imposible con KNN o cualquier método simple; hay demasiadas variables y el futuro no se parece lo suficiente al pasado. Un buen recordatorio de que el algoritmo solo funciona si los ejemplos pasados realmente se parecen a los casos futuros.

En el módulo de ingeniería de IA vas a ver la versión moderna de esta idea: los **embeddings** convierten textos e imágenes en vectores de cientos de dimensiones, y "buscar documentos parecidos" es exactamente buscar vecinos cercanos (normalmente con similitud del coseno) en una base de datos vectorial.

### Mapa de algoritmos para seguir

El resto de la sesión es un recorrido panorámico. No necesitas implementar todo; sí reconocer **qué problema resuelve cada cosa**, porque aparecen constantemente en diseño de sistemas.

**Árboles más allá del BST.** Los árboles binarios de búsqueda se desbalancean; en la práctica se usan árboles **autobalanceados** (AVL, rojo-negro) en memoria y **B-trees** en bases de datos, que tienen muchos hijos por nodo para minimizar lecturas de disco. Otros: heaps, árboles de segmentos (consultas sobre rangos), splay trees.

**Índices invertidos.** Es la estructura detrás de los buscadores. En lugar de guardar "documento → palabras", guarda "palabra → documentos que la contienen":

```
"gato"   → {doc1, doc4}
"negro"  → {doc1, doc2}
"jardín" → {doc4}
consulta "gato negro" → intersección {doc1, doc4} ∩ {doc1, doc2} = {doc1}
```

Es una tabla hash cuyos valores son conjuntos. Elasticsearch, Lucene y la búsqueda de texto completo de las bases de datos se basan en esto.

**La transformada de Fourier.** Descompone una señal en las frecuencias que la forman, como si a partir de un batido pudieras averiguar sus ingredientes. Se usa en compresión de audio e imagen (MP3, JPEG), procesamiento de señales y hasta en multiplicar números enormes rápido.

**Algoritmos paralelos.** Con muchos núcleos, ¿cuánto más rápido va un algoritmo? Menos de lo que esperas: hay costo de **coordinar** el trabajo y de **balancear** la carga entre núcleos. Ordenar en paralelo, por ejemplo, no es N veces más rápido con N núcleos.

**MapReduce.** Un modelo para procesar datos distribuidos en muchas máquinas con dos operaciones: **map** aplica una función a cada elemento por separado (fácil de repartir entre máquinas) y **reduce** combina los resultados en uno. Contar palabras en mil millones de documentos: cada máquina hace `map` de sus documentos a pares (palabra, 1), y `reduce` suma por palabra. Las mismas ideas que `Array.prototype.map` y `reduce`, a escala de clúster.

**Filtros de Bloom.** Una estructura **probabilística** que responde "¿este elemento está en el conjunto?" con dos respuestas posibles: "**seguro que no**" o "**probablemente sí**". Usa un array de bits y varias funciones hash: al insertar, pone en 1 los bits que indican las funciones; al consultar, si alguno de esos bits es 0, el elemento seguro no está. Puede dar **falsos positivos** pero nunca falsos negativos, y ocupa muchísimo menos memoria que un `Set`. Se usa para evitar consultas costosas: un navegador comprobando si una URL está en una lista de sitios maliciosos, una base de datos evitando leer del disco una clave que no existe.

Un filtro de Bloom cabe en pocas líneas, y verlo en código desmitifica la idea:

```ts
class BloomFilter {
  private bits: Uint8Array;
  constructor(private size: number, private hashCount: number) {
    this.bits = new Uint8Array(size);
  }
  private positions(item: string): number[] {
    const out: number[] = [];
    for (let seed = 0; seed < this.hashCount; seed++) {
      let h = 2166136261 ^ seed;                 // FNV-1a con semilla distinta por función
      for (let i = 0; i < item.length; i++) h = Math.imul(h ^ item.charCodeAt(i), 16777619);
      out.push((h >>> 0) % this.size);
    }
    return out;
  }
  add(item: string): void { for (const p of this.positions(item)) this.bits[p] = 1; }
  mightContain(item: string): boolean { return this.positions(item).every((p) => this.bits[p] === 1); }
}
```

(Por simplicidad usa un byte por bit; una versión real empaqueta 8 bits por byte.) La probabilidad de falso positivo depende de tres números: el tamaño del array, la cantidad de funciones hash y la cantidad de elementos insertados. Con unos 10 bits por elemento y 7 funciones hash ronda el 1 %. Observa que **no se puede borrar**: poner un bit en 0 podría "borrar" también otros elementos que comparten ese bit.

**HyperLogLog.** Responde aproximadamente "¿cuántos elementos **distintos** hay?" (por ejemplo, visitantes únicos de un sitio) usando una fracción minúscula de la memoria que necesitaría un `Set` exacto, con un error de alrededor del 1–2 %. Redis lo ofrece como tipo de dato.

**Funciones hash criptográficas (SHA).** A diferencia de las funciones hash de las tablas, están diseñadas para que sea prácticamente imposible encontrar dos entradas con el mismo resultado o recuperar la entrada a partir del hash. Usos: verificar que un archivo descargado no fue alterado (comparar su SHA-256), identificar contenido (git identifica cada commit por un hash) y almacenar contraseñas. Para contraseñas, en la práctica se usan funciones **lentas a propósito y con sal** (bcrypt, scrypt, Argon2), para que probar millones de contraseñas sea costoso.

**Hashing sensible a la localidad (LSH).** Lo contrario de un hash criptográfico: entradas **parecidas** producen hashes **parecidos**. Sirve para detectar casi-duplicados (páginas web copiadas con pequeños cambios, plagio) y para buscar vecinos cercanos aproximados sin comparar contra todos.

**Intercambio de claves Diffie-Hellman.** Permite que dos partes acuerden una clave secreta comunicándose por un canal público, sin haberse visto antes. Es una pieza fundamental de HTTPS (en sus variantes modernas). La idea se apoya en operaciones fáciles de hacer y muy difíciles de deshacer.

**Programación lineal.** Maximizar o minimizar algo sujeto a restricciones lineales: "¿cuántas unidades de cada producto fabricar para maximizar la ganancia, si cada uno consume ciertos recursos limitados?". Muchos problemas de grafos (como flujos máximos) son casos particulares. El algoritmo Simplex es el clásico para resolverlos.

### Cómo seguir aprendiendo algoritmos

- **Practica por patrones**, no al azar: dos punteros, ventana deslizante, BFS/DFS, heaps, DP, backtracking.
- **Implementa una vez, usa la librería después.** Implementar un heap te enseña cómo funciona; en producción, usa una implementación probada.
- **Lee el código de librerías serias** (por ejemplo, cómo implementa V8 `Array.prototype.sort`).
- **Conecta con los módulos siguientes:** filtros de Bloom, B-trees y LSM-trees aparecen en el módulo de sistemas intensivos en datos; consistent hashing, caches y MapReduce en diseño de sistemas; embeddings y vecinos cercanos en ingeniería de IA.

### Errores comunes

- **No normalizar las características** en KNN: una dimensión con números grandes domina la distancia.
- **Elegir características irrelevantes** o sesgadas.
- **Usar k = 1** con datos ruidosos.
- **Confundir funciones hash de tablas con funciones hash criptográficas**: no son intercambiables.
- **Tratar un filtro de Bloom como un conjunto exacto**: "probablemente sí" no es "sí".
- **Guardar contraseñas con SHA-256 sin sal**: usa una función lenta específica para contraseñas.

### Para llevarte

KNN muestra que un algoritmo muy simple puede ser útil si los datos están bien representados: casi todo el trabajo está en elegir y escalar características. El mapa de algoritmos del final no es para memorizar: es para que, cuando en un diseño de sistema aparezca "necesitamos contar visitantes únicos con poca memoria" o "evitar lecturas de disco innecesarias", sepas que ya existe una herramienta con nombre y dónde buscarla.

## Conceptos clave

- **K vecinos más cercanos (KNN)**: algoritmo que clasifica o predice a partir de los k ejemplos conocidos más parecidos.
- **Característica (feature)**: valor numérico que describe un aspecto relevante de un elemento.
- **Distancia euclidiana**: longitud de la recta entre dos puntos; raíz de la suma de diferencias al cuadrado.
- **Similitud del coseno**: medida que compara la dirección de dos vectores, no su magnitud.
- **Normalización**: llevar las características a escalas comparables antes de medir distancias.
- **Índice invertido**: mapa de cada término a los documentos que lo contienen.
- **Filtro de Bloom**: estructura probabilística de pertenencia con falsos positivos y sin falsos negativos.
- **Hash criptográfico**: función hash diseñada para que sea inviable encontrar colisiones o invertirla.

## Preguntas de repaso

1. ¿Cómo funciona KNN para clasificar y para predecir un número (regresión)?
   R: Se representan los elementos como vectores de características, se calcula la distancia del elemento nuevo a todos los ejemplos conocidos y se toman los k más cercanos. Para clasificar, se elige la etiqueta mayoritaria entre esos vecinos; para regresión, se predice el promedio de sus valores.
2. ¿Por qué hay que normalizar las características antes de usar KNN?
   R: Porque la distancia suma diferencias de todas las características, y una con valores grandes (por ejemplo, ingresos en miles) dominaría a las de valores pequeños (por ejemplo, una calificación del 1 al 5), haciendo que estas no influyan en el resultado.
3. ¿Qué ventaja tiene la similitud del coseno sobre la distancia euclidiana en un sistema de recomendaciones?
   R: Compara el patrón de gustos (la dirección del vector) y no la magnitud, así que dos usuarios con preferencias relativas iguales pero distinta forma de calificar (uno generoso y otro exigente) se consideran parecidos.
4. ¿Qué es un índice invertido y por qué es útil para un buscador?
   R: Es un mapa de cada palabra a los documentos que la contienen. Para responder una consulta basta mirar las listas de sus palabras e intersectarlas, en lugar de recorrer todos los documentos.
5. ¿Qué garantías da un filtro de Bloom y para qué se usa?
   R: Si responde que un elemento no está, seguro no está; si responde que está, probablemente está (puede haber falsos positivos). Ocupa muy poca memoria y se usa para evitar operaciones costosas, como leer del disco o consultar un servidor, para elementos que seguro no existen.
6. ¿Por qué no se deben guardar contraseñas con un hash rápido como SHA-256 sin sal?
   R: Porque un atacante que obtenga los hashes puede probar millones de contraseñas por segundo y usar tablas precalculadas. Se usan funciones lentas a propósito y con sal, como bcrypt o Argon2, que hacen cada intento costoso y evitan las tablas precalculadas.

## Ejercicio

Implementa en TypeScript un recomendador de películas con KNN: un conjunto de al menos 20 usuarios con calificaciones (1–5) de 8 películas, con algunos valores faltantes. Implementa `similarity` con distancia euclidiana sobre características normalizadas y con similitud del coseno, `nearestUsers(user, k)` con un heap de tamaño k y `predictRating(user, movie, k)`. Como extra, implementa un filtro de Bloom con 3 funciones hash sobre un array de bits y mide su tasa de falsos positivos.

Criterio de terminado: tests que verifican que un usuario idéntico a otro tiene distancia 0 y similitud 1; una tabla que compara las predicciones con euclidiana y con coseno para 5 usuarios; si haces el extra, la tasa de falsos positivos medida con 10.000 elementos insertados y 10.000 consultados queda cerca de la teórica.

## Explícalo con tus palabras

Explica a alguien sin formación técnica cómo una plataforma de streaming podría recomendarle películas usando "vecinos" con gustos parecidos, y por qué elegir bien las características importa más que el algoritmo.
