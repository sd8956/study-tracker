---
title: Algoritmos greedy, aproximación y problemas NP-completos
kind: lesson
hours: 2
sources: Grokking Algorithms, cap. 8 "Greedy Algorithms" (pp. 160–179) | Cracking the Coding Interview, cap. VII "Best Conceivable Runtime" (p. 84)
links: Lista de problemas NP-completos (Wikipedia, inglés) | https://en.wikipedia.org/wiki/List_of_NP-complete_problems
---

## Objetivo

Diseñar algoritmos greedy, saber cuándo dan la respuesta óptima y cuándo solo una aproximación, y reconocer problemas NP-completos para no perder tiempo buscando una solución exacta y rápida que nadie conoce.

## Estudio

### La estrategia greedy

Un algoritmo **greedy** (voraz, codicioso) construye la solución paso a paso eligiendo en cada paso **lo que parece mejor en ese momento**, sin volver atrás ni pensar en el futuro. "Toma el mejor bocado disponible ahora."

Es la estrategia más simple que existe. Lo sorprendente es que, para algunos problemas, **da la respuesta óptima**; para otros, da una respuesta **cercana** a la óptima de forma muy rápida; y para otros, da respuestas malas. Esta sesión trata de distinguir esos tres casos.

### Caso 1: greedy óptimo, la agenda de un aula

Tienes un aula y una lista de clases con hora de inicio y fin. Quieres programar **la mayor cantidad posible de clases** sin que se solapen.

| Clase | Inicio | Fin |
| --- | --- | --- |
| Arte | 9:00 | 10:00 |
| Inglés | 9:30 | 10:30 |
| Matemáticas | 10:00 | 11:00 |
| Informática | 10:30 | 11:30 |
| Música | 11:00 | 12:00 |

Estrategia greedy: **elige la clase que termina primero**; luego, entre las que empiezan después de que esa termine, elige otra vez la que termina primero; repite.

- Termina primero: Arte (10:00). Elegida.
- Empiezan a las 10:00 o después: Matemáticas, Informática, Música. Termina primero Matemáticas (11:00). Elegida.
- Empiezan a las 11:00 o después: Música. Elegida.

Resultado: Arte, Matemáticas, Música. Tres clases, que es el máximo posible.

```ts
interface Interval { name: string; start: number; end: number }

export function maxNonOverlapping(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a.end - b.end);
  const chosen: Interval[] = [];
  let lastEnd = -Infinity;
  for (const it of sorted) {
    if (it.start >= lastEnd) { chosen.push(it); lastEnd = it.end; }
  }
  return chosen;
}
```

O(n log n) por el ordenamiento, y luego un recorrido lineal.

¿Por qué es óptimo? Intuición: elegir la clase que termina primero **deja el aula libre lo antes posible**, y eso nunca puede ser peor que elegir otra. Si una solución óptima empezara con otra clase X, podrías cambiar X por la que termina primero sin solaparte con nada más (porque termina igual o antes que X), y seguirías teniendo la misma cantidad de clases. Este tipo de argumento ("puedo cambiar la elección óptima por la greedy sin empeorar") se llama **argumento de intercambio**, y es la forma estándar de demostrar que un greedy es correcto.

Ojo: **otras estrategias greedy fallan** en este mismo problema. "Elegir la clase más corta" o "elegir la que empieza primero" producen contraejemplos. El criterio greedy importa tanto como la idea de ser greedy.

### Caso 2: greedy que falla, la mochila

Eres un ladrón con una mochila que aguanta 35 kg. Puedes llevar:

| Objeto | Valor | Peso |
| --- | --- | --- |
| Equipo de sonido | 3.000 | 30 kg |
| Portátil | 2.000 | 20 kg |
| Guitarra | 1.500 | 15 kg |

Greedy "toma el más valioso que quepa": equipo de sonido (30 kg, 3.000). Quedan 5 kg; no cabe nada más. Total: 3.000.

Pero portátil + guitarra pesan 35 kg y valen 3.500. El greedy falló.

¿Y si el greedy fuera "mejor valor por kilo"? Equipo: 100/kg; portátil: 100/kg; guitarra: 100/kg. Empatan; según cómo desempates, puedes volver a elegir el equipo. En general, ningún criterio greedy resuelve exactamente la **mochila 0/1** (cada objeto se lleva entero o no se lleva). La solución exacta usa programación dinámica, que verás en la sesión 20.

Curiosidad útil: si los objetos se pueden **fraccionar** (arroz, oro en polvo), el greedy por valor por kilo **sí** es óptimo: llenas con lo más valioso por kilo y, cuando no cabe entero, llevas una fracción. Un cambio pequeño en el enunciado cambia la estrategia correcta.

### Caso 3: greedy como aproximación, cobertura de conjuntos

Quieres lanzar un programa de radio que se escuche en un conjunto de regiones. Cada emisora cubre algunas regiones y cobrar por cada emisora es caro. ¿Cuál es el **menor conjunto de emisoras** que cubre todas las regiones?

```
regiones necesarias: {norte, sur, este, oeste, centro, costa}
E1 cubre {norte, centro, costa}
E2 cubre {sur, norte, este}
E3 cubre {oeste, centro, sur}
E4 cubre {centro, este}
E5 cubre {costa, oeste}
```

**Solución exacta:** probar todos los subconjuntos de emisoras. Con `n` emisoras hay `2ⁿ` subconjuntos. Con 10 emisoras son 1.024, pero con 100 emisoras son más subconjuntos que átomos en el universo observable. **O(2ⁿ)**: inviable.

**Solución greedy:** en cada paso, elige la emisora que cubre **más regiones todavía no cubiertas**. Repite hasta cubrir todo.

```ts
export function greedySetCover(needed: Set<string>, stations: Map<string, Set<string>>): string[] {
  const uncovered = new Set(needed);
  const chosen: string[] = [];
  while (uncovered.size > 0) {
    let best: string | null = null;
    let bestCovered = new Set<string>();
    for (const [name, regions] of stations) {
      const covered = new Set([...regions].filter((r) => uncovered.has(r)));
      if (covered.size > bestCovered.size) { best = name; bestCovered = covered; }
    }
    if (best === null) throw new Error("Hay regiones que ninguna emisora cubre");
    chosen.push(best);
    for (const r of bestCovered) uncovered.delete(r);
  }
  return chosen;
}
```

Con el ejemplo: E1, E2 y E3 cubren 3 regiones nuevas cada una; elige E1 (el primero en empatar) → faltan {sur, este, oeste}. E2 cubre 2 nuevas (sur, este), E3 cubre 2 (oeste, sur); elige E2 → falta {oeste}. Elige E3 o E5. Total: 3 emisoras.

Costo: O(n²) aproximadamente (n iteraciones, cada una revisando las n emisoras), en lugar de O(2ⁿ).

¿Es óptimo? **No siempre**. Pero se sabe que este greedy nunca usa más de aproximadamente `ln(m)` veces el óptimo (con `m` regiones). Un algoritmo así, que garantiza una solución "cercana" a la óptima en tiempo razonable, se llama **algoritmo de aproximación**. Se juzga por dos cosas: su velocidad y qué tan cerca queda del óptimo.

### Problemas NP-completos

Volvamos al **viajante de comercio**: visitar `n` ciudades recorriendo la menor distancia total. Ya viste que probar todas las rutas es O(n!). La pregunta inquietante es: ¿existe un algoritmo exacto **rápido** (polinómico, como O(n³)) para este problema?

Nadie lo sabe. Y no es por falta de intentos: miles de investigadores lo han buscado durante décadas. El viajante, la cobertura de conjuntos y la mochila 0/1 (en su versión de decisión) pertenecen a una familia llamada **NP-completos**, con dos propiedades notables:

1. Nadie conoce un algoritmo exacto polinómico para **ninguno** de ellos.
2. Están todos conectados: si alguien encontrara un algoritmo rápido para **uno**, se podría usar para resolver rápido **todos** los demás (se pueden traducir unos en otros).

La pregunta de si existe ese algoritmo es el famoso problema abierto **P vs NP**. La opinión mayoritaria es que no existe, pero no está demostrado.

Para ti, como ingeniero, la consecuencia práctica es directa: **si reconoces que tu problema es NP-completo, deja de buscar una solución exacta y rápida** y elige entre:

- **Aproximación** (greedy u otras heurísticas) cuando el tamaño es grande.
- **Solución exacta** solo si `n` es pequeño (fuerza bruta con poda, programación dinámica sobre subconjuntos para `n` hasta ~20, o solucionadores especializados).
- **Cambiar el problema**: a veces una restricción adicional del dominio lo vuelve fácil (por ejemplo, si las ciudades están en una línea, el viajante es trivial).

### El viajante, paso a paso, y una heurística greedy

Para sentir por qué el viajante explota, cuenta las rutas a mano. Con 2 ciudades (A, B) y punto de partida libre, hay 2 rutas: A→B y B→A (pueden diferir si las distancias no son simétricas, como calles de un solo sentido). Con 3 ciudades, para cada ciudad inicial hay 2 órdenes del resto: 3 × 2 = 6 rutas. Con 4 ciudades, 4 × 6 = 24. El patrón: agregar una ciudad multiplica las rutas por el nuevo número de ciudades.

| Ciudades | Rutas posibles |
| --- | --- |
| 5 | 120 |
| 10 | 3.628.800 |
| 15 | 1.307.674.368.000 |
| 20 | ~2,4 × 10¹⁸ |

A mil millones de rutas por segundo, 20 ciudades tardarían unos 77 años.

Una aproximación greedy muy usada es el **vecino más cercano**: empieza en una ciudad y, en cada paso, ve a la ciudad **no visitada más cercana**. Al final, vuelve al inicio.

```ts
export function nearestNeighborTour(dist: number[][], start = 0): number[] {
  const n = dist.length;
  const visited = new Array<boolean>(n).fill(false);
  const tour = [start];
  visited[start] = true;
  for (let step = 1; step < n; step++) {
    const current = tour[tour.length - 1];
    let next = -1;
    for (let c = 0; c < n; c++) {
      if (!visited[c] && (next === -1 || dist[current][c] < dist[current][next])) next = c;
    }
    visited[next] = true;
    tour.push(next);
  }
  return tour;
}
```

O(n²) en lugar de O(n!). En promedio produce rutas alrededor de un 25 % más largas que la óptima, aunque en casos diseñados para engañarla puede ser mucho peor. En la práctica se combina con mejoras locales: por ejemplo, **2-opt** toma dos aristas de la ruta que se cruzan y las "descruza" si eso acorta el total, repitiendo hasta que no haya mejora. Greedy para empezar + mejora local para pulir es una receta que funciona sorprendentemente bien en logística real.

### Otro greedy útil: cuántas salas necesito

**Problema:** tienes reuniones con inicio y fin y quieres saber el **mínimo de salas** para que todas se realicen. Ya no eliges cuáles hacer: todas deben hacerse.

Greedy: ordena por hora de inicio; mantén un **min-heap** con las horas de fin de las salas ocupadas. Para cada reunión, si la sala que se libera primero (raíz del heap) ya está libre a la hora de inicio, reutilízala (saca la raíz); en cualquier caso, mete la hora de fin de la reunión actual. El tamaño máximo que alcanza el heap es la respuesta.

```
reuniones: [9-10], [9:30-11], [10-11:30], [11-12]
9:00   heap {10}            → 1 sala
9:30   10 > 9:30, no libre → heap {10, 11}     → 2 salas
10:00  10 ≤ 10, reutiliza  → heap {11, 11:30}
11:00  11 ≤ 11, reutiliza  → heap {11:30, 12}
máximo tamaño = 2 salas
```

O(n log n). Este problema combina tres herramientas del módulo: ordenamiento, heap y una decisión greedy ("reutiliza la sala que se libera antes"). Es un buen ejemplo de cómo las estructuras de datos hacen viable una estrategia: sin el heap, buscar la sala que se libera primero costaría O(n) por reunión.

### Cómo reconocer un problema NP-completo

No hay una regla infalible, pero hay señales fuertes:

- El algoritmo es rápido con pocos elementos y se vuelve **dramáticamente** lento al agregar unos pocos más.
- El enunciado pide "**todas las combinaciones**" o "**la mejor combinación**" de algo.
- Tienes que calcular **todas las versiones posibles** de X porque no puedes dividir el problema en subproblemas más pequeños.
- Implica una **secuencia** (como un orden de ciudades) y es difícil de resolver.
- Implica un **conjunto** (como un conjunto de emisoras) y es difícil de resolver.
- Puedes **reformularlo** como cobertura de conjuntos o como el viajante.

Ejemplos disfrazados que vale la pena reconocer:

| Problema del trabajo | Problema NP-completo de fondo |
| --- | --- |
| Asignar turnos a enfermeras cumpliendo muchas restricciones | satisfacción de restricciones |
| Elegir el mínimo de servidores que cubren todos los servicios | cobertura de conjuntos |
| Ruta de reparto que visita todas las direcciones | viajante de comercio |
| Llenar un contenedor con paquetes maximizando valor | mochila |
| Asignar exámenes a franjas sin que un estudiante tenga dos a la vez | coloreo de grafos |

### Greedy en problemas que ya conoces

La idea greedy apareció antes sin decirlo:

- **Dijkstra** es greedy: en cada paso toma el nodo más barato pendiente y lo da por definitivo. Es óptimo gracias a la condición de pesos no negativos (argumento de intercambio implícito).
- **Dar el cambio** con monedas: greedy "la moneda más grande que quepa" es óptimo para sistemas de monedas como 1, 5, 10, 25, 50, pero **no** para sistemas arbitrarios. Con monedas de 1, 3 y 4, para dar 6 el greedy da 4 + 1 + 1 (3 monedas) y lo óptimo es 3 + 3 (2 monedas). Otra vez, la solución exacta general es programación dinámica.
- **Codificación de Huffman** (compresión) y el **árbol de expansión mínima** (Prim, Kruskal) son greedy óptimos famosos.

### Por qué los greedy son tan populares en ingeniería

Aunque no siempre sean óptimos, los algoritmos greedy están por todas partes en sistemas reales, por razones muy prácticas:

- **Son rápidos y predecibles.** Suelen costar O(n log n) o menos, y su tiempo no explota con entradas raras.
- **Son fáciles de explicar y depurar.** "El balanceador envía cada petición al servidor con menos conexiones activas" se entiende en una frase; eso vale mucho cuando algo falla a las tres de la mañana.
- **Funcionan en línea (online).** Muchas decisiones deben tomarse sin conocer el futuro: a qué servidor mandar la petición que acaba de llegar, qué elemento sacar de una cache llena. Un algoritmo que necesita ver todos los datos antes de decidir no sirve ahí; uno greedy sí.
- **Su error suele ser acotado o pequeño en la práctica.** Para muchos problemas se conoce cuánto puede alejarse del óptimo en el peor caso, y en datos reales suele estar mucho más cerca.

Ejemplos que vas a encontrar en los módulos de sistemas: políticas de expulsión de cache (LRU expulsa el elemento usado hace más tiempo, una decisión greedy), balanceo de carga por "menos conexiones", asignación de contenedores a máquinas (*bin packing*, NP-difícil, resuelto en la práctica con heurísticas como "el primero donde quepa") y planificadores de tareas por prioridad.

### Cómo trabajar con un greedy

1. **Propón el criterio greedy** ("el que termina primero", "el que cubre más", "el más barato").
2. **Busca un contraejemplo** activamente, con entradas pequeñas. Si lo encuentras en cinco minutos, el greedy no es óptimo (aunque puede servir como aproximación).
3. **Si no encuentras contraejemplo, intenta el argumento de intercambio**: ¿puedes transformar cualquier solución óptima en la greedy sin empeorarla?
4. **Si es una aproximación, mídela**: compara con la solución exacta en instancias pequeñas para saber cuánto se aleja.

### Errores comunes

- **Asumir que el greedy es óptimo porque funcionó con tu ejemplo.** Busca contraejemplos.
- **Elegir el criterio greedy equivocado** (la clase más corta en lugar de la que termina primero).
- **Intentar resolver exactamente un problema NP-completo grande** con fuerza bruta.
- **Rendirse ante un problema NP-completo**: en la práctica se resuelven con aproximaciones todos los días.
- **Confundir mochila fraccionaria con mochila 0/1**: la primera es greedy, la segunda no.

### Para llevarte

Greedy es la primera estrategia que deberías probar y la última en la que deberías confiar sin verificar. Busca contraejemplos pequeños; si no aparecen, intenta un argumento de intercambio. Y cuando el problema sea NP-completo, no lo veas como un callejón sin salida: es la señal para cambiar la pregunta de "¿cuál es la mejor solución?" a "¿qué solución suficientemente buena puedo obtener a tiempo?".

## Conceptos clave

- **Algoritmo greedy**: construye la solución eligiendo en cada paso la opción localmente mejor, sin retroceder.
- **Argumento de intercambio**: demostración de que una elección greedy puede reemplazar a la de una solución óptima sin empeorarla.
- **Algoritmo de aproximación**: algoritmo rápido que garantiza una solución cercana a la óptima.
- **Cobertura de conjuntos**: elegir el menor número de conjuntos cuya unión cubre un universo; NP-completo.
- **Problema NP-completo**: problema sin algoritmo exacto polinómico conocido, equivalente en dificultad a todos los demás de su clase.
- **P vs NP**: pregunta abierta sobre si todo problema cuya solución se verifica rápido también se puede resolver rápido.
- **Mochila 0/1 vs fraccionaria**: objetos indivisibles (no greedy) frente a divisibles (greedy óptimo).

## Preguntas de repaso

1. En la agenda de un aula, ¿por qué elegir la clase que termina primero es óptimo y elegir la más corta no?
   R: Elegir la que termina primero deja el aula libre lo antes posible, y cualquier solución óptima puede cambiar su primera clase por esa sin generar solapamientos ni perder clases (argumento de intercambio). Elegir la más corta puede bloquear dos clases largas que no se solapaban entre sí, porque una clase corta puede cruzar el límite entre ambas.
2. ¿Por qué el greedy falla en la mochila 0/1 pero funciona en la fraccionaria?
   R: En la 0/1 los objetos son indivisibles, y tomar el más valioso o el de mejor valor por kilo puede dejar espacio desaprovechado que otra combinación sí usaría. En la fraccionaria se puede tomar una parte del objeto, así que llenar por orden de valor por kilo siempre aprovecha toda la capacidad con lo más valioso.
3. ¿Qué es un algoritmo de aproximación y cómo se evalúa?
   R: Es un algoritmo que, en lugar de la solución exacta, encuentra una solución cercana a la óptima en tiempo razonable. Se evalúa por su velocidad y por qué tan lejos puede quedar del óptimo, por ejemplo, el greedy de cobertura de conjuntos nunca usa más de alrededor de ln(m) veces el número óptimo de conjuntos.
4. ¿Qué significa que un problema sea NP-completo y qué consecuencia práctica tiene?
   R: Que no se conoce ningún algoritmo exacto de tiempo polinómico para resolverlo y que es equivalente en dificultad a los demás problemas NP-completos (resolver uno rápido permitiría resolverlos todos). En la práctica, si el tamaño es grande, se usan aproximaciones o heurísticas en lugar de buscar una solución exacta rápida.
5. Da un sistema de monedas donde el greedy para dar cambio no es óptimo y muestra el contraejemplo.
   R: Con monedas de 1, 3 y 4, para dar 6 el greedy toma 4 y luego 1 y 1 (tres monedas), mientras que la solución óptima es 3 + 3 (dos monedas).
6. Nombra tres señales de que un problema podría ser NP-completo.
   R: Que se vuelva dramáticamente más lento al agregar unos pocos elementos; que pida la mejor combinación o secuencia entre todas las posibles sin poder dividirse en subproblemas; y que se pueda reformular como un problema conocido, como cobertura de conjuntos o el viajante de comercio.

## Ejercicio

Implementa en TypeScript `greedySetCover` y una versión exacta `exactSetCover` por fuerza bruta (probar subconjuntos de emisoras de tamaño creciente). Genera 50 instancias aleatorias con semilla (10 a 16 emisoras, 15 regiones) y mide para cada una cuántas emisoras usa cada algoritmo y cuánto tarda. Implementa también `minCoinsGreedy` y muestra una tabla de montos del 1 al 30 para las monedas `[1, 3, 4]` señalando dónde el greedy no es óptimo (calcula el óptimo por fuerza bruta o con la recursión que prefieras).

Criterio de terminado: una tabla con, por instancia, emisoras greedy, emisoras exactas y tiempos; el porcentaje de instancias donde el greedy fue óptimo; la razón máxima greedy/óptimo observada; la tabla de monedas marca al menos el monto 6.

## Explícalo con tus palabras

Explica a alguien sin formación técnica qué es un problema NP-completo usando el ejemplo de planificar la ruta de un repartidor, y por qué las empresas de reparto igual funcionan bien sin resolverlo exactamente.
