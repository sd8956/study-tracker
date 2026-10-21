---
title: Proyecto, implementar y medir estructuras de datos
kind: project
hours: 3
sources: Grokking Algorithms, caps. 2–4 (pp. 40–91) | Cracking the Coding Interview, caps. VI, 1–3 y 10 (pp. 50–71, 100–111, 158–163) | Think Like a Programmer, caps. 3 y 5 (pp. 77–105, 145–182)
links: Vitest, benchmarking | https://vitest.dev/guide/features.html#benchmarking ; Node.js perf_hooks | https://nodejs.org/api/perf_hooks.html
---

## Objetivo

Construir en TypeScript una pequeña librería de estructuras de datos y algoritmos de ordenamiento, con tests, y comprobar con mediciones reales que los costos Big O que estudiaste en las sesiones 03–11 se cumplen (y dónde las constantes cambian el resultado).

## Estudio

### Por qué medir lo que ya sabes en teoría

Big O predice cómo **crece** el costo, pero no dice cuántos milisegundos tarda nada. Medir te enseña dos cosas que la teoría sola no enseña:

1. **Verificar el orden de crecimiento.** Si duplicas `n` y el tiempo se multiplica por 4, tienes algo cuadrático, digas lo que digas en el comentario del código.
2. **Ver el efecto de las constantes y del hardware.** Una lista enlazada tiene inserción al inicio O(1), pero recorrerla puede ser varias veces más lento que recorrer un array del mismo tamaño por la localidad de memoria. Eso no aparece en la tabla de Big O.

### Cómo medir sin engañarte

Medir rendimiento en JavaScript tiene trampas. Reglas mínimas:

- **Usa `performance.now()`** (de `node:perf_hooks` o global en Node moderno), no `Date.now()`: tiene resolución de microsegundos.
- **Calienta el motor.** V8 compila y optimiza el código caliente con el tiempo (JIT). Ejecuta cada función algunas veces antes de medir.
- **Repite y toma la mediana.** Una sola medición es ruido. Ejecuta 5–10 repeticiones y reporta la mediana, que es menos sensible a picos (por ejemplo, una recolección de basura).
- **Evita que el optimizador elimine el trabajo.** Si el resultado no se usa, V8 podría descartar el cálculo. Acumula el resultado en una variable que imprimes al final.
- **Mide tamaños crecientes, no uno solo.** Usa una progresión (1.000, 2.000, 4.000, 8.000…) y mira la **razón** entre tiempos consecutivos:

| Razón al duplicar `n` | Orden probable |
| --- | --- |
| ~1 | O(1) o O(log n) |
| ~2 | O(n) |
| algo más de 2 | O(n log n) |
| ~4 | O(n²) |

- **Datos reproducibles.** Usa un generador pseudoaleatorio con semilla para que dos corridas usen los mismos datos.

```ts
// Generador pseudoaleatorio con semilla (mulberry32): mismos datos en cada corrida.
export function rng(seed: number): () => number {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

export function bench(fn: () => unknown, repeats = 7): number {
  for (let i = 0; i < 3; i++) fn(); // calentamiento
  const times: number[] = [];
  for (let i = 0; i < repeats; i++) {
    const t0 = performance.now();
    fn();
    times.push(performance.now() - t0);
  }
  return median(times);
}
```

## Qué hacer

Crea un proyecto `ds-lab/` (fuera de este repositorio o en tu carpeta de prácticas) con TypeScript y Vitest. Trabaja en este orden; cada bloque tiene su criterio de terminado.

### Bloque 1 (40 min): estructuras lineales

Implementa, cada una en su archivo y con tests:

1. `DynamicArray<T>`: array dinámico propio sobre un array de capacidad fija que **duplica** su capacidad al llenarse. Métodos: `push`, `pop`, `get(i)`, `set(i, v)`, `insertAt(i, v)`, `removeAt(i)`, `size`, `capacity`. Cuenta las copias de elementos en un contador público.
2. `LinkedList<T>`: simple, con `head`, `tail` y `size`. Métodos: `prepend`, `append`, `removeFirst`, `get(i)`, `reverse`, iterador.
3. `Stack<T>` y `Queue<T>`: definidos como `interface` (ADT). Implementa `ArrayStack`, `LinkedStack`, `ArrayQueue` (con índice de inicio, sin `shift`) y `LinkedQueue`.

Terminado cuando: todos los tests pasan, incluidos casos de estructura vacía, un elemento e índices fuera de rango (deben lanzar `RangeError`).

### Bloque 2 (30 min): algoritmos de ordenamiento

Implementa `selectionSort`, `insertionSort`, `mergeSort`, `quickSort` (en el lugar, pivote aleatorio) y `countingSort` (para enteros de 0 a `k`). Escribe un único test de propiedades que, para 300 arrays generados con semilla (tamaños 0–500, con duplicados y negativos donde aplique), compare cada resultado con `toSorted((a, b) => a - b)`.

Terminado cuando: el test de propiedades pasa para los cinco algoritmos; hay un test que demuestra que `mergeSort` e `insertionSort` son estables (ordenando objetos por una clave con empates).

### Bloque 3 (60 min): benchmarks

Escribe un script `bench.ts` que imprima tablas en consola (`console.table`). Para cada experimento usa al menos cinco tamaños en progresión doble y reporta la mediana y la razón entre tamaños consecutivos.

1. **Amortizado:** inserta `n` elementos con `DynamicArray.push` y reporta copias totales / `n`. Repite con una variante que crece en +16 posiciones en lugar de duplicar.
2. **Inicio de la colección:** inserta `n` elementos al inicio con `DynamicArray.insertAt(0, x)` frente a `LinkedList.prepend`.
3. **Recorrido:** suma `n` números recorriendo `DynamicArray` frente a `LinkedList`.
4. **Colas:** `n` enqueue seguidos de `n` dequeue con `ArrayQueue`, `LinkedQueue` y una cola ingenua con `push`/`shift`.
5. **Ordenamiento:** los cinco algoritmos y `Array.prototype.sort` sobre arrays aleatorios; luego `quickSort` con pivote fijo (primer elemento) frente a pivote aleatorio sobre un array ya ordenado.

Terminado cuando: el script corre con un solo comando (`npx tsx bench.ts` o similar) en menos de 2 minutos y produce las cinco tablas.

### Bloque 4 (30 min): informe

Escribe `REPORT.md` en tu proyecto con, para cada experimento: la predicción en Big O **antes** de medir, la tabla obtenida, la razón observada al duplicar `n` y una explicación de cualquier diferencia entre teoría y práctica (por ejemplo, por qué el recorrido de la lista enlazada es más lento aunque ambos sean O(n)).

Terminado cuando: el informe tiene las cinco secciones, cada una con predicción, datos y explicación; y una conclusión de tres a cinco frases sobre cuándo elegirías array y cuándo lista enlazada.

### Extensión opcional

- Implementa una cola con buffer circular de capacidad fija y compárala con `ArrayQueue`.
- Agrega `MinStack` y mide que `min()` no crece con `n`.

## Conceptos clave

- **Benchmark**: medición controlada del tiempo de ejecución de un fragmento de código.
- **Calentamiento (warm-up)**: ejecuciones previas que permiten al compilador JIT optimizar antes de medir.
- **Mediana de repeticiones**: estadístico robusto frente a picos de ruido como la recolección de basura.
- **Razón de duplicación**: cociente entre tiempos al duplicar `n`, que revela el orden de crecimiento.
- **Test de propiedades**: test que verifica una propiedad (por ejemplo, "el resultado está ordenado y es una permutación") sobre muchas entradas generadas.
- **Semilla**: valor inicial que hace reproducible una secuencia pseudoaleatoria.

## Preguntas de repaso

1. Al duplicar `n`, el tiempo de un algoritmo se multiplica por ~4. ¿Qué orden de crecimiento sugiere y por qué?
   R: O(n²), porque si el costo es proporcional a n², al pasar de n a 2n el costo pasa a (2n)² = 4n², es decir, se cuadruplica.
2. ¿Por qué es necesario calentar el código antes de medir en JavaScript?
   R: Porque V8 usa compilación JIT: las primeras ejecuciones corren en modos menos optimizados y luego el motor compila versiones optimizadas del código caliente. Medir sin calentamiento mezcla el tiempo de compilación y de código sin optimizar con el del código real.
3. Si recorrer un array y una lista enlazada son ambos O(n), ¿por qué la lista suele ser más lenta?
   R: Por la localidad de memoria: los elementos del array están contiguos y el procesador los carga en bloques a su caché, mientras que los nodos de la lista están dispersos y cada salto puede provocar un fallo de caché. Big O no captura esas constantes.
4. ¿Qué ventaja tiene un test de propiedades frente a unos pocos tests con ejemplos fijos para algoritmos de ordenamiento?
   R: Que prueba cientos de entradas variadas (vacías, con duplicados, negativos, ordenadas, inversas) contra una referencia confiable, lo que encuentra casos borde que nadie pensó al escribir ejemplos a mano.

## Explícalo con tus palabras

Explica a un compañero qué predijo la teoría, qué mostraron tus mediciones y por qué "O(1) amortizado" no significa que cada `push` sea igual de rápido.
