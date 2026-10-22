---
title: K vecinos más cercanos, mapa de algoritmos y tu plan maestro
kind: lesson
hours: 3
sources: Grokking Algorithms, cap. 10 "K-nearest neighbors" (pp. 206–221) y cap. 11 "Where to Go Next" (pp. 222–239) | Think Like a Programmer, cap. 7 "Solving Problems with Code Reuse" (pp. 217–245) y cap. 8 "Thinking Like a Programmer" (pp. 246–284)
links: scikit-learn, vecinos más cercanos | https://scikit-learn.org/stable/modules/neighbors.html ; Bloom filters explicados (inglés) | https://llimllib.github.io/bloomfilter-tutorial/
---

## Objetivo

Aplicar K vecinos más cercanos (clasificación, regresión y recomendaciones) eligiendo bien características y distancias, reconocer qué problema resuelven las estructuras que vas a encontrar en sistemas reales (índices invertidos, filtros de Bloom, HyperLogLog, hashes criptográficos), y cerrar el módulo con tu caja de herramientas y un plan maestro propio basado en tus errores reales.

## Estudio

### Clasificar por parecido

Ves una fruta y dudas si es una naranja o un pomelo. Piensas: "es grande y rojiza, y las frutas así que conozco suelen ser pomelos". Eso es **K vecinos más cercanos** (*k-nearest neighbors*, KNN): miras los `k` ejemplos conocidos más parecidos y decides según lo que son ellos.

1. Representa cada elemento como un vector de números: sus **características** (*features*).
2. Para un elemento nuevo, calcula la **distancia** a todos los conocidos.
3. Toma los `k` más cercanos.
4. **Clasificación:** decide por mayoría. **Regresión:** predice el promedio de sus valores.

La distancia más común es la **euclidiana**, la longitud de la recta entre dos puntos: `√((a₁ − b₁)² + … + (aₙ − bₙ)²)`. Con dos características es Pitágoras; con más, la misma fórmula.

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
    .toSorted((x, y) => x.d - y.d)
    .slice(0, k);
  const votes = new Map<L, number>();
  for (const { ex } of nearest) votes.set(ex.label, (votes.get(ex.label) ?? 0) + 1);
  let best = nearest[0].ex.label, bestVotes = 0;
  for (const [label, v] of votes) if (v > bestVotes) { best = label; bestVotes = v; }
  return best;
}
```

Una consulta cuesta O(n · d) para las distancias (n ejemplos, d características) más O(n log n) para ordenar. Con un heap de tamaño k (sesión 13) baja a O(n · d + n log k), y en sistemas grandes se usan índices de vecinos aproximados para no comparar contra todos.

### Regresión: cuántos panes hornear

Una panadería tiene registros con tres características: clima (1 malo a 5 excelente), fin de semana (0 o 1) y evento deportivo cercano (0 o 1).

| Día | Clima | Fin de semana | Evento | Panes vendidos |
| --- | --- | --- | --- | --- |
| A | 5 | 1 | 0 | 300 |
| B | 3 | 1 | 1 | 225 |
| C | 1 | 1 | 0 | 75 |
| D | 4 | 0 | 1 | 200 |
| E | 4 | 0 | 0 | 150 |
| F | 2 | 0 | 0 | 50 |

Mañana: `(4, 1, 0)`. Distancias: A = 1, E = 1, B ≈ 1,41, D ≈ 1,41, F ≈ 2,24, C = 3. Con `k = 4`, los vecinos son A, E, B y D: predicción (300 + 150 + 225 + 200) / 4 ≈ **219 panes**.

Dos detalles. B y D empatan: con `k = 3` necesitarías una regla de desempate explícita y determinista. Y "clima" pesa más que las otras características solo porque su rango (1–5) es mayor; si no es más importante para las ventas, habría que escalarla. **Elegir y escalar las características es el diseño del modelo.**

### Características, escalas y k

KNN es tan bueno como sus características. Buenas características:

- **Se relacionan con lo que predices.** Para vender pan: día, festivos, clima; no el color del logo.
- **No están sesgadas.** Si solo usas calificaciones de comedia para recomendar películas, todos los fanáticos de la comedia parecen iguales.
- **Están en escalas comparables.** Si una va de 0 a 1 y otra de 0 a 100.000, la segunda domina la distancia. Hay que **normalizar**: llevar cada una a 0–1, o restar la media y dividir por la desviación estándar.

Un caso sutil en recomendaciones: Ana pone 5 a lo que le encanta y Luis, más exigente, pone 4. Tienen los mismos gustos relativos pero en distancia euclidiana parecen distintos. Soluciones: restar a cada usuario su promedio, o usar la **similitud del coseno**, que compara la **dirección** de los vectores (el patrón de gustos) y no su magnitud.

Sobre `k`: con 1, un solo ejemplo mal etiquetado arruina la predicción; muy grande, todo se diluye hacia la clase mayoritaria. Un punto de partida es alrededor de `√n`, impar en clasificación binaria para evitar empates, y después se ajusta con datos reservados.

KNN es tu primer contacto con el aprendizaje automático: generalizar a partir de ejemplos en lugar de escribir reglas. En el módulo de ingeniería de IA verás la versión moderna: los **embeddings** convierten textos en vectores de cientos de dimensiones, y "buscar documentos parecidos" es buscar vecinos cercanos, normalmente con similitud del coseno, en una base de datos vectorial.

### Mapa de algoritmos para seguir

No necesitas implementar todo lo que sigue; sí reconocer **qué problema resuelve cada cosa**, porque aparecen una y otra vez en diseño de sistemas.

**Índice invertido.** La estructura detrás de los buscadores: en lugar de "documento → palabras", guarda "palabra → documentos que la contienen". Una consulta intersecta conjuntos:

```
"gato"  → {doc1, doc4}
"negro" → {doc1, doc2}
"gato negro" → {doc1, doc4} ∩ {doc1, doc2} = {doc1}
```

Es una tabla hash cuyos valores son conjuntos; Lucene y Elasticsearch se basan en esto.

**Filtro de Bloom.** Responde "¿está este elemento?" con "**seguro que no**" o "**probablemente sí**", usando un array de bits y varias funciones hash: al insertar pone en 1 los bits que indican las funciones; al consultar, si alguno es 0, el elemento seguro no está. Puede dar falsos positivos, nunca falsos negativos, y ocupa una fracción de la memoria de un `Set`.

```ts
class BloomFilter {
  private bits: Uint8Array;
  constructor(private size: number, private hashCount: number) {
    this.bits = new Uint8Array(size);
  }
  private positions(item: string): number[] {
    const out: number[] = [];
    for (let seed = 0; seed < this.hashCount; seed++) {
      let h = 2166136261 ^ seed;                 // FNV-1a con una semilla por función
      for (let i = 0; i < item.length; i++) h = Math.imul(h ^ item.charCodeAt(i), 16777619);
      out.push((h >>> 0) % this.size);
    }
    return out;
  }
  add(item: string): void { for (const p of this.positions(item)) this.bits[p] = 1; }
  mightContain(item: string): boolean { return this.positions(item).every((p) => this.bits[p] === 1); }
}
```

(Usa un byte por bit para simplificar.) Con unos 10 bits por elemento y 7 funciones hash, los falsos positivos rondan el 1 %. No se puede borrar: poner un bit en 0 "borraría" también otros elementos que lo comparten. Se usa para evitar trabajo caro: no leer del disco una clave que seguro no existe, no consultar un servidor por una URL que seguro no está en una lista negra.

**HyperLogLog.** Estima cuántos elementos **distintos** hay (visitantes únicos, por ejemplo) con una memoria minúscula y un error del 1–2 %. Redis lo ofrece como tipo de dato.

**Hash criptográfico (SHA-256).** A diferencia del hash de una tabla, está diseñado para que sea inviable encontrar dos entradas con el mismo resultado o recuperar la entrada. Sirve para verificar que un archivo no fue alterado e identificar contenido (git identifica cada commit así). Para **contraseñas** no basta: se usan funciones lentas a propósito y con sal (bcrypt, scrypt, Argon2), para que probar millones de contraseñas sea caro.

**Hashing sensible a la localidad (LSH).** Lo contrario: entradas **parecidas** dan hashes **parecidos**. Detecta casi-duplicados y busca vecinos aproximados sin comparar contra todos.

**MapReduce.** Procesar datos repartidos en muchas máquinas con dos operaciones: `map` transforma cada elemento por separado (fácil de repartir) y `reduce` combina los resultados. Contar palabras en mil millones de documentos: cada máquina emite pares `(palabra, 1)` y `reduce` suma por palabra. Las mismas ideas que `map` y `reduce` de los arrays, a escala de clúster.

Muchos de estos vuelven más adelante: filtros de Bloom, B-trees y LSM-trees en el módulo de sistemas intensivos en datos; caches y MapReduce en diseño de sistemas; embeddings y vecinos en ingeniería de IA.

### Reutilizar sin dejar de aprender

Reutilizar código es indispensable, pero hay dos formas muy distintas de hacerlo. **Mala reutilización:** copiar algo que no entiendes (de un foro, de un compañero, de un asistente de IA) y ajustarlo hasta que "parece funcionar". El programa avanza y tú no; cuando falle en un caso que el autor no previó, no sabrás por qué. **Buena reutilización:** usar un componente que **entiendes** (qué hace, qué garantiza, cuánto cuesta, cuándo falla). Puedes no haberlo escrito, pero podrías explicarlo. La pregunta de control: **después de reutilizar, ¿eres mejor programador o solo tienes un programa más largo?**

Un componente es cualquier conocimiento reutilizable, y cada tipo pide una comprensión distinta:

| Tipo | Ejemplo | Lo que debes saber |
| --- | --- | --- |
| Bloque de código | el bucle de la búsqueda binaria | qué hace cada línea |
| Algoritmo | Dijkstra | por qué funciona y cuánto cuesta |
| Patrón | complemento con `Map`, búsqueda binaria sobre la respuesta | cuándo aplica |
| Tipo abstracto de datos | cola de prioridad | sus operaciones y garantías |
| Librería | la librería estándar de JavaScript | su API, supuestos y límites |

Hay dos formas de llenar la caja. El **aprendizaje exploratorio** estudia un componente antes de necesitarlo, como hiciste con heaps, tries o filtros de Bloom; funciona solo si lo usas enseguida en un problema pequeño y piensas en un caso real ("un heap me sirve para el próximo recordatorio que vence"). El **aprendizaje según necesidad** busca un componente cuando el problema parece general o tu solución es ineficiente. Para encontrarlo, describe el problema sin los detalles del dominio: no "pedidos VIP que llegaron tarde en marzo", sino "filtrar y agrupar registros por dos claves". Antes de integrarlo, pruébalo aislado con tus tipos y tus casos borde.

Para decidir entre componentes: si existe uno probado en tu plataforma, úsalo salvo razones concretas (memoria, datos enormes, un requisito que no cumple); una dependencia nueva es código que no controlas (actualizaciones, vulnerabilidades, licencia); y en formación implementar es valioso, en producción lo es la fiabilidad.

### Tu caja de herramientas después de este módulo

| Señal en el problema | Componente | Sesión |
| --- | --- | --- |
| "ordenado", "el menor valor que cumple X" | búsqueda binaria, sobre el array o sobre la respuesta | 03 |
| "una pasada", "memoria O(1)", datos que llegan de a uno | estado mínimo, hipótesis paralelas | 02 |
| "¿existe un par?", "¿ya vi esto?" | `Set` / `Map` con el patrón del complemento | 13 |
| "subarray contiguo que suma k" | sumas prefijo con `Map` | 13 |
| "contar", "agrupar", "anagramas" | `Map` de clave → conteo o grupo | 13 |
| "siempre el menor", "los k mejores" | heap | 13 |
| "prefijos", "autocompletar" | trie | 13 |
| "jerarquía", "árbol", "datos anidados" | recursión con caso base en la hoja | 09, 10 |
| "todas las combinaciones" | backtracking con poda | 10 |
| "conexiones", "dependencias", "menos pasos" | grafo: BFS, DFS, orden topológico | 15 |
| "menor costo" con pesos | Dijkstra, con estado ampliado si hay restricciones | 16 |
| "elige el mejor en cada paso" y vale el intercambio | greedy | 18 |
| "de cuántas formas", subproblemas repetidos | programación dinámica | 19, 20 |
| "parecido a", "recomendar" | KNN, distancias | 22 |

Las señales son pistas, no reglas: genera candidatos con la tabla y verifica con un ejemplo. Y los problemas reales **combinan** componentes: un planificador de salas usa ordenamiento, heap y una decisión greedy. Saber combinar es lo que solo la práctica construye.

### Tu plan maestro

La primera regla de la sesión 01 era "ten siempre un plan". La versión madura es: **ten un plan maestro propio**, construido sobre tus fortalezas y debilidades reales. El paso clave es **registrar tus errores**: no basta con corregirlos, hay que anotarlos, porque después de unas semanas el registro revela patrones ("siempre fallo en el límite de los bucles", "me cuesta empezar"). Tu diagnóstico de Luhn es un ejemplo: descomponer bien y no preguntar cuándo llega cada dato es un patrón que vale la pena registrar con su contramedida.

**Debilidades de codificación** y contramedidas verificables:

| Debilidad | Contramedida |
| --- | --- |
| Errores de borde (*off-by-one*) | probar siempre con 0, 1 y 2 elementos; escribir el invariante del bucle |
| Olvidar `null` | `strictNullChecks` en TypeScript; tests con entradas vacías |
| Mutar datos compartidos | `toSorted`, spreads, `readonly` |
| Comparar con `==` | regla de lint `eqeqeq` |
| Funciones enormes | límite de tamaño en el linter |

El error de borde tiene una imagen clásica: una valla de 50 metros con tramos de 10 necesita 6 postes, no 5. Fíjate en cuántas contramedidas son **automáticas**: compilador, linter, tests. Una buena defensa no depende de acordarte.

**Debilidades de diseño:**

- **Te cuesta empezar** → el primer paso del plan es mecánico: replantear por escrito y hacer tres ejemplos a mano.
- **Te cuesta integrar** → diseña primero las interfaces entre partes y escribe un test de integración temprano.
- **Diseñas de más** → resuelve el caso concreto y generaliza solo cuando aparezca el segundo caso real.
- **Pasas por alto restricciones** → lista las restricciones y pregunta, para cada decisión, cuándo llega el dato que necesita (sesión 02).

**Aprovecha tus fortalezas**: si visualizas bien, dibuja siempre (estados, árboles, tablas de DP); si escribes bien, describe el algoritmo en prosa antes de codificar. Pero cuidado: quien codifica muy rápido suele saltarse el diseño. Las fortalezas también se vuelven debilidades.

### Aprender nuevos lenguajes y librerías

En la ruta vas a pasar de TypeScript a Python, a nuevas librerías y a nuevas plataformas. El método: (1) dedica tiempo de práctica, no solo de lectura; (2) empieza resolviendo en el lenguaje nuevo problemas que ya resolviste (búsqueda binaria, BFS, la mochila), para que toda tu atención vaya al lenguaje; (3) busca específicamente lo que es **diferente** (en Python: comprensiones, diccionarios por defecto, iteradores, indentación significativa), porque ahí están los errores; (4) lee código bien escrito para absorber las convenciones. Para una librería: documentación de inicio, ejemplos oficiales, un experimento mínimo con tus datos y solo entonces integrarla. Cambia una sola variable a la vez: lenguaje nuevo con problemas conocidos, o problemas nuevos en un lenguaje conocido.

### Errores comunes

- **No normalizar las características** en KNN: una dimensión de números grandes domina la distancia.
- **Usar k = 1** con datos ruidosos.
- **Tratar un filtro de Bloom como un conjunto exacto**: "probablemente sí" no es "sí".
- **Confundir hashes de tabla con hashes criptográficos**, o guardar contraseñas con SHA-256 sin sal.
- **Copiar sin entender**, incluido el código generado por IA.
- **Agregar dependencias para funciones triviales.**
- **Corregir errores sin registrarlos**, o usar un plan maestro copiado de otra persona.

### Para llevarte

KNN muestra que un algoritmo simple funciona si los datos están bien representados: casi todo el trabajo está en elegir y escalar características. El mapa de algoritmos sirve para que, cuando un diseño diga "contar visitantes únicos con poca memoria", sepas que la herramienta existe y cómo se llama. Y el plan maestro cierra el módulo: reutilizar bien y conocerte bien son dos caras de saber qué sabes. Revísalo cada pocas semanas.

## Conceptos clave

- **K vecinos más cercanos (KNN)**: clasifica o predice a partir de los k ejemplos conocidos más parecidos.
- **Característica (feature)**: valor numérico que describe un aspecto relevante de un elemento.
- **Normalización**: llevar las características a escalas comparables antes de medir distancias.
- **Similitud del coseno**: compara la dirección de dos vectores, no su magnitud.
- **Índice invertido**: mapa de cada término a los documentos que lo contienen.
- **Filtro de Bloom**: estructura probabilística de pertenencia con falsos positivos y sin falsos negativos.
- **Hash criptográfico**: función hash diseñada para que sea inviable encontrar colisiones o invertirla.
- **Buena reutilización**: usar un componente que entiendes y que amplía tu capacidad.
- **Plan maestro**: método personal de resolución que aprovecha tus fortalezas y contrarresta tus debilidades registradas.
- **Contramedida**: práctica o herramienta concreta, idealmente automática, que previene un error recurrente.

## Preguntas de repaso

1. ¿Cómo funciona KNN para clasificar y para predecir un número?
   R: Se representan los elementos como vectores de características, se calcula la distancia del elemento nuevo a todos los ejemplos conocidos y se toman los k más cercanos. Para clasificar, se elige la etiqueta mayoritaria entre esos vecinos; para regresión, se predice el promedio de sus valores.
2. ¿Por qué hay que normalizar las características antes de usar KNN?
   R: Porque la distancia suma diferencias de todas las características, y una con valores grandes (por ejemplo, ingresos en miles) dominaría a las de valores pequeños (una calificación del 1 al 5), que dejarían de influir en el resultado.
3. ¿Qué ventaja tiene la similitud del coseno sobre la distancia euclidiana en un sistema de recomendaciones?
   R: Compara el patrón de gustos (la dirección del vector) y no la magnitud, así que dos usuarios con las mismas preferencias relativas pero distinta forma de calificar (uno generoso y otro exigente) se consideran parecidos.
4. ¿Qué garantías da un filtro de Bloom y para qué se usa?
   R: Si responde que un elemento no está, seguro no está; si responde que está, probablemente está (puede haber falsos positivos). Ocupa muy poca memoria y se usa para evitar operaciones costosas, como leer del disco o consultar un servidor, para elementos que seguro no existen.
5. ¿Por qué no se deben guardar contraseñas con un hash rápido como SHA-256 sin sal?
   R: Porque un atacante que obtenga los hashes puede probar millones de contraseñas por segundo y usar tablas precalculadas. Se usan funciones lentas a propósito y con sal, como bcrypt o Argon2, que encarecen cada intento e inutilizan las tablas precalculadas.
6. ¿Qué distingue la buena reutilización de la mala?
   R: La buena usa un componente que entiendes (qué hace, qué garantiza, cuánto cuesta, cuándo falla) y te deja más capaz. La mala copia código que no entiendes y lo ajusta hasta que parece funcionar; el programa avanza pero tú no, y no sabrás qué hacer cuando falle.
7. ¿Por qué las mejores contramedidas de un plan maestro suelen ser herramientas automáticas?
   R: Porque no dependen de que te acuerdes en el momento. El compilador, el linter y los tests detectan el error cada vez, incluso cuando estás cansado o apurado.
8. ¿Cuál es el método recomendado para aprender un lenguaje nuevo?
   R: Dedicarle tiempo de práctica, empezar resolviendo en el lenguaje nuevo problemas que ya sabes resolver, investigar específicamente lo que es diferente respecto a lo que conoces y estudiar código bien escrito en ese lenguaje.

## Ejercicio

Dos partes. (1) En TypeScript, un recomendador de películas con KNN: al menos 20 usuarios con calificaciones (1–5) de 8 películas, con algunos valores faltantes; implementa la distancia euclidiana sobre características normalizadas y la similitud del coseno, `nearestUsers(user, k)` con tu heap de tamaño k y `predictRating(user, movie, k)`. (2) Escribe tu `MASTER-PLAN.md` en tu carpeta de prácticas: revisa los ejercicios de las sesiones 01–21 y anota al menos 5 errores que cometiste (incluido el del diagnóstico de Luhn), clasifícalos en codificación o diseño, define una contramedida concreta para cada uno (preferiblemente automática) y anota dos fortalezas y cómo las vas a aprovechar.

Criterio de terminado: tests que verifican que un usuario idéntico a otro tiene distancia 0 y similitud 1; una tabla que compara las predicciones con euclidiana y con coseno para 5 usuarios; el plan tiene los 5 errores con su contramedida, escrito en primera persona con ejemplos reales tuyos.

## Explícalo con tus palabras

Explica a un compañero cómo una plataforma de streaming podría recomendarle películas con "vecinos" de gustos parecidos, por qué elegir bien las características importa más que el algoritmo, y qué paso de tu plan maestro combate tu debilidad más frecuente.
