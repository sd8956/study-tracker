---
title: Caso de estudio — autocompletado de búsqueda (top-k)
kind: lesson
hours: 2
sources: System Design Interview (Alex Xu), cap. 13 "Design a search autocomplete system" (pp. 200–219) | karanpratapsingh/system-design, cap. I "Caching" y cap. II "Sharding" | System Design Primer, "Cache" y "Sharding"
links: Karan — Caching | https://github.com/karanpratapsingh/system-design#caching ; Karan — Sharding | https://github.com/karanpratapsingh/system-design#sharding ; Primer — Cache | https://github.com/donnemartin/system-design-primer#cache ; Primer — Sharding | https://github.com/donnemartin/system-design-primer#sharding
---

## Objetivo

Diseñar un servicio de autocompletado que devuelva en menos de 100 ms las 5 búsquedas más populares que empiezan con lo que el usuario está escribiendo: estructura trie con top-k precalculado, separación entre el pipeline de recolección (offline) y el servicio de consulta (online), almacenamiento y sharding del trie, cache en navegador y extensiones a tiempo real y multi-idioma.

## Estudio

### El problema

Mientras escribes en la caja de búsqueda de Google o de una tienda, aparecen sugerencias: con "dis" ves "diseño de sistemas", "disney plus", "discord". Es el problema **top-k**: dado un prefijo, devolver las k consultas más frecuentes que empiezan con él.

La misma idea aparece en muchos productos además de los buscadores: sugerir destinos en una app de viajes, productos en una tienda, contactos al escribir un email o comandos en un editor. Cambian el volumen y la fuente de popularidad, pero la estructura es la misma.

Es un caso de estudio excelente porque separa con claridad dos mundos: un **pipeline de datos** que procesa miles de millones de búsquedas pasadas para calcular popularidad, y un **servicio de baja latencia** que responde cada pulsación de tecla.

### Requisitos

Diálogo del libro:

```
 ¿Solo prefijos o también en medio de la palabra?  → Solo al inicio.
 ¿Cuántas sugerencias?                            → 5.
 ¿Cómo se eligen?                                 → Por popularidad (frecuencia histórica).
 ¿Corrección ortográfica?                         → No.
 ¿Idioma?                                         → Inglés (multi-idioma como extensión).
 ¿Mayúsculas o caracteres especiales?             → Todo en minúsculas, sin especiales.
 ¿Usuarios?                                       → 10 M DAU.
```

No funcionales: **respuesta rápida** (las sugerencias deben aparecer mientras se escribe; un estudio citado en el libro indica que el sistema debe responder en unos 100 ms o el usuario percibe tartamudeo), **relevancia**, **orden por popularidad**, **escalabilidad** y **alta disponibilidad**.

### Estimaciones

```
 DAU 10 M; 10 búsquedas por usuario al día; cada búsqueda ~20 caracteres
 Cada carácter tecleado envía una petición → 20 peticiones por búsqueda
 QPS = 10 M × 10 × 20 / 86.400 ≈ 24.000      pico ≈ 48.000
 Tamaño por consulta: ~4 palabras × 5 caracteres = 20 bytes
 Datos nuevos/día: 20 % de búsquedas son nuevas → 10 M × 10 × 20 B × 0,2 = 0,4 GB/día
```

Conclusiones: 48.000 QPS de lecturas muy simples exigen respuestas desde memoria; los datos crecen poco (0,4 GB/día), así que el trie cabe en memoria de un conjunto pequeño de servidores; y la frescura no necesita ser inmediata para la mayoría de los productos.

### Diseño de alto nivel: dos servicios

```
 Recolección (offline):   búsquedas → [Data gathering service] → frecuencias
 Consulta (online):        prefijo → [Query service] → top 5
```

Versión ingenua para entender la idea: una tabla `frequency(query, count)`. Recolectar es hacer `count + 1` por cada búsqueda. Consultar es:

```sql
SELECT query FROM frequency WHERE query LIKE 'dis%' ORDER BY count DESC LIMIT 5;
```

Funciona con pocos datos; con miles de millones de filas, el `LIKE` con ordenamiento es demasiado lento para 48.000 QPS. Además, actualizar la tabla en cada búsqueda en tiempo real es caro. Necesitamos una estructura especializada y un pipeline offline.

### El trie

Un **trie** (árbol de prefijos) es un árbol donde cada nodo representa un prefijo y cada hijo agrega un carácter. Los nodos que terminan una consulta completa guardan su frecuencia.

```
                (raíz)
                  │ t
                 [t]
           ┌──────┼────────┐
          o│     r│       w│
         [to]   [tr]      [tw]
          │y     │e  └─u    │i
        [toy:14][tre]  [tru:35] [twi]
                 │e           │t
              [tree:10]     [twit]
                              │c ...
                            [twitch:29]  [twitter:35]
```

Para obtener el top-k de un prefijo, el algoritmo ingenuo hace:

1. Encontrar el nodo del prefijo: O(p), con p la longitud del prefijo.
2. Recorrer todo el subárbol para recolectar las consultas válidas: O(c), con c el número de nodos del subárbol.
3. Ordenarlas y tomar las k primeras: O(c log c).

Total O(p) + O(c) + O(c log c): demasiado lento cuando un prefijo como "a" tiene millones de descendientes.

### Dos optimizaciones que lo hacen O(1)

**1. Limitar la longitud del prefijo.** Casi nadie escribe 50 caracteres en una búsqueda. Si se limita a, digamos, 50, encontrar el nodo pasa de O(p) a O(constante).

**2. Guardar el top-k en cada nodo.** En lugar de recorrer el subárbol en cada consulta, cada nodo almacena de antemano sus 5 consultas más populares (con su frecuencia):

```
 [be] → top5: [best:35, bet:29, bee:20, belt:10, beer:10]
 [b]  → top5: [best:35, bet:29, buy:14, bee:20, ...]
```

Consultar se vuelve: ir al nodo (O(1) con prefijo acotado) y devolver su lista (O(1)). El costo es **espacio**: cada nodo duplica referencias a consultas populares. Es un trade-off clásico de diseño (sesión 05): gastar memoria y trabajo al escribir para que la lectura sea constante. Como la latencia es el requisito crítico, vale la pena.

### El pipeline de recolección

Actualizar el trie en tiempo real con cada búsqueda (miles de millones por día) sería carísimo y casi inútil: el top-k de un prefijo cambia poco de un minuto a otro. El pipeline real es por lotes:

```
 [Analytics logs] → [Aggregators] → [Aggregated data] → [Workers] → [Trie DB] → [Trie cache]
  (append-only,      (agregan por     (query, semana,    (construyen   (persistente)  (en memoria,
   sin índices)       intervalo)        frecuencia)        el trie)                    snapshots)
```

- **Analytics logs**: registro crudo de cada búsqueda (consulta, timestamp), solo de inserción, sin índices.
- **Aggregators**: los logs son enormes y crudos; se agregan según el caso de uso. Para algo como trending en tiempo real, intervalos cortos; para la mayoría, una vez por semana basta. El libro asume reconstrucción **semanal**.
- **Aggregated data**: filas `(query, time, frequency)`, por ejemplo la frecuencia de "tree" en la semana del 1 de octubre.
- **Workers**: servidores que, de forma asíncrona y periódica, construyen el trie y lo guardan en el Trie DB.
- **Trie cache**: cache distribuida que mantiene el trie en memoria para lecturas rápidas; toma un snapshot semanal de la base.
- **Trie DB**: almacenamiento persistente. Dos opciones: un **document store** donde se guarda el trie serializado como snapshot semanal, o un **key-value store** donde cada prefijo es una clave y el valor es su top-k (el trie "aplanado" en una tabla hash):

```
 "b"   → [best, bet, bee, buy, belt]
 "be"  → [best, bet, bee, belt, beer]
 "bee" → [bee, beer]
```

### El servicio de consulta

```
 1. La petición llega al LB
 2. El LB la envía a un API server
 3. El API server obtiene el top-k del prefijo desde la Trie cache
 4. Si es un miss, lo obtiene del Trie DB y repuebla la cache
```

Optimizaciones para cumplir los 100 ms:

- **Peticiones AJAX**: el navegador consulta sin recargar la página.
- **Cache en el navegador**: las sugerencias de un prefijo cambian poco en una hora. La respuesta lleva `Cache-Control: private, max-age=3600`: si el usuario borra y vuelve a escribir "dis", ni siquiera sale una petición. Así lo hace Google.
- **Muestreo de logs**: registrar cada pulsación de cada usuario consume mucho procesamiento y almacenamiento; registrar 1 de cada N peticiones da frecuencias estadísticamente equivalentes con una fracción del costo.

### El cliente también es parte del diseño

Buena parte del rendimiento de un autocompletado se gana en el navegador o la app:

- **Debounce**: no enviar una petición por cada tecla si el usuario escribe rápido; esperar, por ejemplo, 50–100 ms sin pulsaciones. Si un usuario teclea "diseño" de corrido, quizá solo salgan 2 o 3 peticiones en vez de 6. Esto puede reducir el QPS real a la mitad o menos.
- **Cancelar peticiones obsoletas**: si llega la respuesta de "dis" después de la de "dise", hay que descartarla para no mostrar sugerencias viejas. Cada petición lleva un número de secuencia y el cliente solo pinta la última.
- **Reutilizar resultados**: si ya tienes el top-5 de "dis" y el usuario escribe "dise", a veces puedes filtrar localmente mientras llega la respuesta, dando sensación de inmediatez.
- **Precargar**: al enfocar la caja de búsqueda, pedir el top-k del prefijo vacío o de las búsquedas recientes del usuario.

Estas técnicas no aparecen en el diagrama del backend, pero cambian los números de la estimación: recalcula el QPS con un factor de reducción por debounce y cache del navegador.

### Un recorrido completo

1. Ana enfoca la caja de búsqueda y escribe "d". El cliente espera 80 ms (debounce) y, como sigue escribiendo, no envía nada.
2. Escribe "dis" y se detiene: el cliente busca en su cache local; no hay entrada, envía `GET /autocomplete?q=dis`.
3. El LB la envía a un API server, que consulta el shard map manager (cacheado localmente) y sabe que el prefijo "d" vive en el shard 4.
4. El API server lee `"dis"` en la trie cache del shard 4: obtiene `[discord, disney plus, diseño de sistemas, disco duro, distancia]`.
5. La capa de filtro elimina cualquier consulta bloqueada y devuelve la lista con `Cache-Control: private, max-age=3600`.
6. El cliente muestra las sugerencias (~40 ms en total) y guarda la respuesta. Si Ana borra y vuelve a escribir "dis", no sale ninguna petición.
7. Cuando Ana elige "diseño de sistemas", la búsqueda real se registra en los analytics logs (quizás muestreada); entrará en la agregación semanal.

### Alternativas al trie propio

No siempre hay que construir un trie desde cero:

| Alternativa | Cómo funciona | Cuándo conviene |
| --- | --- | --- |
| Trie propio con top-k | Lo descrito en esta sesión | Escala muy grande, latencia mínima, control total |
| Key-value de prefijos (Redis) | Cada prefijo es una clave con su lista top-k precalculada | La versión aplanada; simple de operar |
| Sorted sets en Redis | Un sorted set por prefijo con la frecuencia como puntaje; `ZREVRANGE` da el top-k | Actualizaciones incrementales frecuentes y volumen moderado |
| Motor de búsqueda (Elasticsearch/OpenSearch) | Índices con n-gramas o "completion suggesters" | Catálogos de productos, búsqueda con tolerancia a errores y filtros |

Para un catálogo de una tienda con 1 M de productos, un motor de búsqueda con un suggester suele ser la elección pragmática: agrega corrección de errores, sinónimos y filtros. Para un buscador web con miles de millones de consultas, el trie precalculado y particionado es lo que escala.

### Modos de fallo

| Fallo | Efecto | Mitigación |
| --- | --- | --- |
| Cae un shard de la trie cache | Sin sugerencias para un rango de prefijos | Réplicas por shard; fallback al Trie DB |
| Falla la reconstrucción semanal | Sugerencias de la semana anterior | Mantener el snapshot anterior; alertar; las sugerencias viejas son aceptables |
| Pico de tráfico (evento) | Latencia por encima de 100 ms | Cache del navegador, debounce, más réplicas de lectura |
| Sugerencia ofensiva o peligrosa | Daño a usuarios y a la marca | Filter layer inmediata, revisión de nuevas tendencias antes de publicarlas |
| Manipulación (bots que inflan una búsqueda) | Sugerencias falsas | Filtrar por usuarios únicos y patrones de bots en la agregación |

Observa que casi todo falla "suave": unas sugerencias viejas o ausentes no rompen la búsqueda. Por eso el autocompletado puede ser AP y priorizar latencia sobre frescura.

### Operaciones sobre el trie

- **Crear**: lo hacen los workers con los datos agregados.
- **Actualizar**: opción 1, reconstruir semanalmente y reemplazar el trie entero (lo habitual). Opción 2, actualizar nodos individuales; es lento, porque al cambiar la frecuencia de una consulta hay que actualizar el top-k de todos sus ancestros.
- **Borrar**: hay sugerencias que no deben aparecer (odio, violencia, contenido sexual explícito, peligros). Un **filtro** delante de la Trie cache las elimina de las respuestas de inmediato, sin esperar la reconstrucción; luego se eliminan físicamente del trie en el siguiente ciclo.

```
 API servers → [Filter layer] → Trie cache
```

### Escalar el almacenamiento

Si el trie no cabe en un servidor, hay que particionarlo. Idea ingenua: por primera letra (`a-m` en un servidor, `n-z` en otro; o 26 servidores, uno por letra; y a partir de ahí, por segunda letra). Problema: la distribución es **muy desigual**: en inglés hay muchas más palabras que empiezan con "c" que con "x". Solución del libro: analizar la distribución histórica y particionar por **volumen** con un **shard map manager** que guarda el mapa de prefijos a shards. Por ejemplo, si las consultas que empiezan con "s" son tantas como las de "u" a "z" juntas, "s" va sola a un shard y "u–z" comparten otro.

```
 [Shard map manager]: a → shard 1 · b–c → shard 2 · ... · s → shard 9 · u–z → shard 10
```

### Cómo se calcula la popularidad

"Más frecuente" parece obvio, pero hay decisiones escondidas que conviene explicitar en el design doc:

- **Ventana de tiempo**: contar las búsquedas de siempre favorece consultas viejas; contar solo la última semana responde mejor a cambios. Una solución intermedia es un **decaimiento exponencial**: cada semana, las frecuencias anteriores se multiplican por un factor (por ejemplo, 0,8) antes de sumar las nuevas. Así una consulta muy popular hace un año pesa menos que una moderadamente popular esta semana.
- **Usuarios únicos frente a búsquedas totales**: si una persona busca lo mismo 500 veces (o un bot lo hace), no debería dominar el top. Contar usuarios únicos por consulta (con estructuras como HyperLogLog, que estiman cardinalidades con muy poca memoria) es más robusto.
- **Normalización**: "Diseño de Sistemas", "diseño de sistemas " y "diseno de sistemas" deberían contarse juntas: minúsculas, espacios recortados y, según el producto, sin tildes.
- **Umbral mínimo**: consultas con muy pocas búsquedas no se incluyen; reduce el tamaño del trie y evita exponer búsquedas privadas o raras (un nombre propio buscado una sola vez no debería sugerirse a otros).

### Memoria del trie

¿Cabe el trie en memoria? Supón 100 M de consultas distintas tras filtrar las de muy baja frecuencia (que no aparecerían nunca en un top-5). Con unos 20 caracteres por consulta y prefijos compartidos, el número de nodos es del orden de unos cientos de millones. En la versión aplanada (key-value por prefijo), cada prefijo guarda 5 referencias y frecuencias (~5 × (8 B + 8 B) = 80 B) más la clave: unos 100–150 B por prefijo. Con 500 M de prefijos son ~50–75 GB: cabe en unos pocos servidores con mucha memoria, o en un cluster de cache, y se replica para disponibilidad y throughput. Si se acota la longitud y se descartan prefijos con muy pocas consultas, el tamaño baja mucho.

### Extensiones

- **Multi-idioma**: guardar caracteres Unicode en los nodos del trie.
- **Por país**: el top-k de "foot" es distinto en EE. UU. que en el Reino Unido; se construyen tries distintos por país y se sirven desde CDNs o regiones cercanas.
- **Tendencias en tiempo real**: si una noticia hace explotar una búsqueda, el trie semanal no la refleja. Ideas: reducir el conjunto de datos de trabajo particionando; cambiar el modelo de ranking para dar más peso a las búsquedas recientes; procesar datos como **stream** (con herramientas de stream processing) y mantener un pequeño trie de tendencias que se mezcla con el semanal.
- **Personalización**: mezclar el top-k global con el historial reciente del usuario (calculado en el cliente o en una cache por usuario).
- **Tolerancia a errores de escritura**: con distancia de edición o n-gramas, sugerir "diseño" aunque se escriba "dsieño"; aumenta mucho el costo de cada consulta y suele resolverse con un motor de búsqueda especializado.

## Conceptos clave

- **Top-k**: las k consultas más frecuentes que coinciden con un prefijo.
- **Trie**: árbol de prefijos donde cada nodo representa una cadena parcial.
- **Top-k precalculado por nodo**: lista de las k mejores consultas guardada en cada nodo para responder en O(1).
- **Pipeline de recolección**: logs → agregadores → datos agregados → workers → trie.
- **Trie aplanado**: representación del trie como key-value de prefijo a lista top-k.
- **Filter layer**: capa que elimina sugerencias indeseadas antes de responder.
- **Shard map manager**: componente que mapea rangos de prefijos a shards según el volumen histórico.
- **Muestreo de logs**: registrar solo una fracción de las peticiones para reducir costos.

## Preguntas de repaso

1. ¿Por qué el algoritmo ingenuo sobre el trie es O(p) + O(c) + O(c log c) y cómo se reduce a O(1)?
   R: Porque hay que bajar p niveles hasta el nodo del prefijo, recorrer sus c descendientes y ordenarlos para tomar los k primeros. Se reduce a O(1) limitando la longitud máxima del prefijo (encontrar el nodo es constante) y guardando en cada nodo su top-k precalculado (devolverlo es constante), a costa de más memoria.
2. ¿Por qué se reconstruye el trie periódicamente en lugar de actualizarlo con cada búsqueda?
   R: Porque hay miles de millones de búsquedas y cada actualización exigiría recalcular el top-k de todos los ancestros del nodo, algo muy caro; además, el top-k cambia poco en el corto plazo. Reconstruir por lotes desde logs agregados es mucho más barato y suficiente, y la cache se renueva con snapshots.
3. Calcula el QPS pico con 10 M DAU, 10 búsquedas diarias por usuario, 20 caracteres por búsqueda y una petición por carácter.
   R: 10 M × 10 × 20 = 2.000 M de peticiones por día; entre 86.400 s ≈ 24.000 QPS promedio, y con un factor 2 ≈ 48.000 QPS en el pico.
4. ¿Cómo eliminas de inmediato una sugerencia ofensiva si el trie se reconstruye semanalmente?
   R: Con una capa de filtro entre los API servers y la cache del trie que descarta esas consultas de las respuestas al instante; luego se eliminan físicamente del trie en la siguiente reconstrucción.
5. ¿Por qué particionar el trie por primera letra produce desbalance y cómo se corrige?
   R: Porque la cantidad de consultas varía mucho según la letra inicial (muchas más con "c" o "s" que con "x"), así que algunos shards reciben mucho más tráfico y datos. Se corrige particionando según la distribución histórica, con un shard map manager que agrupa prefijos poco frecuentes y aísla los muy frecuentes.

## Ejercicio

Implementa en TypeScript un `AutocompleteTrie` con `build(entries: { query: string; count: number }[])` que precalcule el top-5 en cada nodo, `suggest(prefix)` en O(longitud del prefijo) sin recorrer subárboles, un límite de 50 caracteres y un `blocklist` aplicado al responder. Agrega una versión aplanada `Map<prefix, string[]>` y compara memoria y tiempo con 1 M de consultas sintéticas. Pruebas: el top-5 es correcto contra una solución de fuerza bruta en 1.000 prefijos aleatorios; una consulta bloqueada nunca aparece; prefijos de más de 50 caracteres devuelven vacío. Terminado cuando las tres pruebas pasen y tengas la tabla de comparación.

## Explícalo con tus palabras

Explica cómo funciona el autocompletado con la imagen de un diccionario donde, en el borde de cada página, alguien anotó las cinco palabras más buscadas que empiezan con esas letras.
