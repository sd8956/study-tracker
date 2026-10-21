---
title: Lenguajes de consulta y modelos de grafos
kind: lesson
hours: 2
sources: Designing Data-Intensive Applications (Kleppmann), cap. 2 (pp. 64–87)
links: Neo4j, introducción a Cypher | https://neo4j.com/docs/cypher-manual/current/introduction/ ; PostgreSQL, consultas recursivas WITH | https://www.postgresql.org/docs/current/queries-with.html
---

## Objetivo

Entender por qué los lenguajes declarativos ganaron a los imperativos, qué papel jugó MapReduce como modelo de consulta, y cómo los modelos de grafos (property graphs con Cypher, triple-stores con SPARQL y Datalog) resuelven datos muy interconectados.

## Estudio

### Imperativo frente a declarativo

Cuando apareció el modelo relacional, trajo una nueva forma de consultar: **SQL, un lenguaje declarativo**. IMS y CODASYL se consultaban con código **imperativo**. Comparemos con un ejemplo: obtener los animales que son tiburones.

Imperativo (dices *cómo*):

```ts
function getSharks(animals: Animal[]): Animal[] {
  const sharks: Animal[] = [];
  for (const a of animals) {
    if (a.family === "Sharks") sharks.push(a);
  }
  return sharks;
}
```

Declarativo (dices *qué*):

```sql
SELECT * FROM animals WHERE family = 'Sharks';
```

En el estilo imperativo le das al ordenador una secuencia de pasos en un orden concreto. En el declarativo especificas **el patrón de los datos que quieres** (condiciones, ordenamiento, agrupación, transformaciones), pero no cómo obtenerlos. Decidir qué índices usar, en qué orden unir tablas o cómo ejecutar las partes de la consulta es trabajo del **optimizador**.

Ventajas del enfoque declarativo:

1. **Es más conciso y fácil de leer.**
2. **Oculta los detalles de implementación**, así que el motor puede mejorar su rendimiento sin cambiar tus consultas. Por ejemplo, la base puede reorganizar el espacio en disco y mover filas: el código imperativo que dependiera del orden de las filas se rompería, pero SQL no garantiza ningún orden salvo que pidas `ORDER BY`.
3. **Se presta a la ejecución en paralelo.** El código imperativo fija un orden de instrucciones, que es muy difícil de paralelizar entre núcleos o máquinas. Un lenguaje declarativo solo describe el resultado, así que el motor puede repartir el trabajo.

#### La analogía del navegador: CSS frente a manipular el DOM

Esta idea no es exclusiva de las bases de datos. Imagina una web con un menú donde el elemento seleccionado tiene la clase `selected`, y quieres que el título de esa sección tenga fondo azul.

Con CSS es una línea:

```css
li.selected > p { background-color: blue; }
```

Hacerlo imperativamente con la API del DOM requiere recorrer todos los `li`, comprobar la clase, recorrer los hijos, comprobar que sean `P` y asignar el estilo a mano. Además tiene dos problemas serios:

- Si el usuario cambia de sección y se quita la clase `selected`, el fondo azul **no se quita** aunque vuelvas a ejecutar el código. Con CSS el navegador detecta que la regla ya no aplica y lo quita solo.
- Si aparece una API más rápida (`getElementsByClassName`), tienes que reescribir el código. Los fabricantes de navegadores, en cambio, pueden acelerar CSS sin romper nada.

Lo mismo pasa en las bases de datos: declarar el resultado deja libertad al motor para optimizar.

### MapReduce como modelo de consulta

**MapReduce** es un modelo de programación popularizado por Google para procesar grandes volúmenes de datos en muchas máquinas (lo verás a fondo en la sesión de batch processing). Algunas bases NoSQL, como MongoDB y CouchDB, ofrecieron una versión limitada para consultas de solo lectura sobre muchos documentos.

No es ni totalmente declarativo ni totalmente imperativo: la lógica se expresa con fragmentos de código (las funciones `map` y `reduce`) que el framework invoca repetidamente. Ejemplo: un biólogo marino registra avistamientos y quiere saber cuántos tiburones vio por mes.

```js
// map: se llama una vez por documento que cumple el filtro
function map() {
  const d = this.observationTimestamp;
  const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
  emit(key, this.numAnimals);         // (clave, valor)
}
// reduce: se llama una vez por clave con todos sus valores
function reduce(key, values) {
  return values.reduce((a, b) => a + b, 0);
}
```

```
documentos ──► map ──► ("1995-12", 3) ("1995-12", 4) ("1996-1", 2)
                         │ agrupa por clave
                         ▼
               reduce("1995-12", [3, 4]) = 7
               reduce("1996-1",  [2])    = 2
```

Restricciones importantes: `map` y `reduce` deben ser **funciones puras**: usan solo los datos que reciben, no hacen consultas adicionales y no tienen efectos secundarios. Eso permite al framework ejecutarlas en cualquier máquina, en cualquier orden y repetirlas si algo falla.

El problema de usabilidad: escribir dos funciones coordinadas es más difícil que una consulta. Por eso MongoDB añadió el **aggregation pipeline**, un lenguaje declarativo en JSON:

```js
db.observations.aggregate([
  { $match: { family: "Sharks" } },
  { $group: {
      _id: { year: { $year: "$observationTimestamp" },
             month: { $month: "$observationTimestamp" } },
      totalAnimals: { $sum: "$numAnimals" } } }
]);
```

Es casi SQL con otra sintaxis. Moraleja: un sistema NoSQL acaba reinventando SQL disfrazado. En SQL sería un `GROUP BY` con `date_trunc('month', ...)`.

### Modelos de grafos

Si tu aplicación tiene mayormente relaciones one-to-many (árboles) o ninguna relación entre registros, el modelo de documentos encaja. Si las relaciones **many-to-many son muy comunes**, lo natural es modelar los datos como un **grafo**.

Un grafo tiene **vértices** (nodos, entidades) y **aristas** (relaciones, arcos). Ejemplos:

- **Redes sociales**: vértices = personas; aristas = quién conoce a quién.
- **La web**: vértices = páginas; aristas = enlaces (PageRank se calcula sobre este grafo).
- **Redes de carreteras o tren**: vértices = cruces o estaciones; aristas = tramos.

Algoritmos conocidos operan sobre ellos: caminos más cortos (navegación GPS), PageRank (relevancia). Y lo poderoso: un grafo no tiene que ser homogéneo. Facebook mantiene un único grafo con vértices de personas, lugares, eventos, check-ins y comentarios, y aristas de amistad, asistencia, ubicación, etc.

#### Property graphs

En el modelo de **property graph** (Neo4j, Titan, InfiniteGraph, Amazon Neptune):

Cada **vértice** tiene: un ID único, aristas salientes, aristas entrantes y un conjunto de propiedades clave-valor.

Cada **arista** tiene: un ID único, el vértice de origen (*tail*), el vértice de destino (*head*), una **etiqueta** que describe la relación y propiedades clave-valor.

Puedes representarlo con dos tablas relacionales:

```sql
CREATE TABLE vertices (
  vertex_id  integer PRIMARY KEY,
  properties json
);
CREATE TABLE edges (
  edge_id     integer PRIMARY KEY,
  tail_vertex integer REFERENCES vertices (vertex_id),
  head_vertex integer REFERENCES vertices (vertex_id),
  label       text,
  properties  json
);
CREATE INDEX edges_tails ON edges (tail_vertex);
CREATE INDEX edges_heads ON edges (head_vertex);
```

Tres propiedades importantes del modelo:

1. **Cualquier vértice puede conectarse con cualquier otro**; no hay un esquema que limite qué cosas se relacionan.
2. Dado un vértice, puedes encontrar eficientemente sus aristas entrantes y salientes, así que puedes **recorrer el grafo** hacia delante y hacia atrás (por eso los dos índices).
3. Con **etiquetas distintas** puedes guardar muchos tipos de información en un solo grafo manteniendo un modelo limpio.

El ejemplo del libro: dos personas, Lucy (nacida en Idaho, EE. UU.) y Alain (nacido en Beaune, Francia), casados y viviendo en Londres. La jerarquía geográfica tiene granularidades distintas por país (estados en EE. UU.; regiones y departamentos en Francia), y el grafo lo representa sin problema:

```
 (Lucy) ──BORN_IN──► (Idaho:state) ──WITHIN──► (United States:country) ──WITHIN──► (North America)
   │
   ├──LIVES_IN──► (London:city) ──WITHIN──► (England) ──WITHIN──► (United Kingdom) ──WITHIN──► (Europe)
   │                                                                                             ▲
 MARRIED                                                                                         │
   │                                                                                           WITHIN
 (Alain) ──BORN_IN──► (Beaune:city) ──WITHIN──► (Bourgogne) ──WITHIN──► (France:country) ────────┘
```

Esto sería incómodo en un esquema relacional rígido con columnas `state`, `county`, `city`. En un grafo se añade un nivel nuevo sin cambiar nada.

#### Cypher

**Cypher** es el lenguaje declarativo de Neo4j. Su sintaxis dibuja el patrón con "flechas ASCII":

```cypher
CREATE
  (NAmerica:Location {name:'North America', type:'continent'}),
  (USA:Location      {name:'United States', type:'country'}),
  (Idaho:Location    {name:'Idaho',         type:'state'}),
  (Lucy:Person       {name:'Lucy'}),
  (Idaho) -[:WITHIN]->  (USA)  -[:WITHIN]-> (NAmerica),
  (Lucy)  -[:BORN_IN]-> (Idaho)
```

La consulta interesante: **personas que emigraron de Estados Unidos a Europa**.

```cypher
MATCH
  (person) -[:BORN_IN]->  () -[:WITHIN*0..]-> (us:Location {name:'United States'}),
  (person) -[:LIVES_IN]-> () -[:WITHIN*0..]-> (eu:Location {name:'Europe'})
RETURN person.name
```

`-[:WITHIN*0..]->` significa "sigue aristas `WITHIN` cero o más veces", como el `*` de una expresión regular. No te importa si la persona nació en una ciudad, un condado o un estado: la consulta recorre la jerarquía hasta llegar al país. Como es declarativo, el optimizador decide si empezar por las personas o por las ubicaciones (por ejemplo, desde `United States` y `Europe` hacia atrás usando índices).

#### Grafos en SQL: consultas recursivas

¿Puedes hacer lo mismo en SQL? Sí, pero con más esfuerzo. El reto es que **no sabes de antemano cuántos saltos** hay que recorrer. En un JOIN relacional normal el número de uniones es fijo. SQL:1999 introdujo las **recursive common table expressions** (`WITH RECURSIVE`), soportadas por PostgreSQL, SQL Server, Oracle, SQLite, MySQL 8 y otros:

```sql
WITH RECURSIVE
  in_usa(vertex_id) AS (
      SELECT vertex_id FROM vertices WHERE properties->>'name' = 'United States'
    UNION
      SELECT e.tail_vertex FROM edges e
      JOIN in_usa ON e.head_vertex = in_usa.vertex_id
      WHERE e.label = 'within'
  ),
  in_europe(vertex_id) AS (
      SELECT vertex_id FROM vertices WHERE properties->>'name' = 'Europe'
    UNION
      SELECT e.tail_vertex FROM edges e
      JOIN in_europe ON e.head_vertex = in_europe.vertex_id
      WHERE e.label = 'within'
  ),
  born_in_usa(vertex_id) AS (
    SELECT e.tail_vertex FROM edges e
    JOIN in_usa ON e.head_vertex = in_usa.vertex_id
    WHERE e.label = 'born_in'
  ),
  lives_in_europe(vertex_id) AS (
    SELECT e.tail_vertex FROM edges e
    JOIN in_europe ON e.head_vertex = in_europe.vertex_id
    WHERE e.label = 'lives_in'
  )
SELECT v.properties->>'name'
FROM vertices v
JOIN born_in_usa     ON v.vertex_id = born_in_usa.vertex_id
JOIN lives_in_europe ON v.vertex_id = lives_in_europe.vertex_id;
```

Cuatro líneas de Cypher contra casi treinta de SQL. Esto ilustra que **distintos modelos de datos están diseñados para distintos casos de uso**: elegir el adecuado simplifica muchísimo tu código.

#### Triple-stores y SPARQL

El **triple-store** es casi equivalente al property graph, con otra terminología. Toda la información se guarda como tripletas **(sujeto, predicado, objeto)**, por ejemplo `(Jim, likes, bananas)`.

- El sujeto es un vértice.
- El objeto es o bien un **valor primitivo** (entonces predicado + objeto equivalen a una propiedad del vértice: `(lucy, age, 33)`), o bien **otro vértice** (entonces el predicado es una arista: `(lucy, marriedTo, alain)`).

En formato Turtle:

```
@prefix : <urn:example:>.
_:lucy     a :Person;   :name "Lucy";          :bornIn _:idaho.
_:idaho    a :Location; :name "Idaho";         :type "state";   :within _:usa.
_:usa      a :Location; :name "United States"; :type "country"; :within _:namerica.
```

Los triple-stores están ligados a la **web semántica** y a **RDF** (Resource Description Framework), un formato para que distintas webs publiquen datos legibles por máquinas y se puedan combinar. La web semántica no cumplió sus promesas iniciales, pero los triple-stores siguen siendo útiles internamente (Datomic es un ejemplo). En RDF, los predicados suelen ser URIs (`<http://my-company.com/namespace#within>`) para evitar choques entre fuentes.

**SPARQL** es el lenguaje de consulta para RDF; Cypher tomó prestado su estilo de patrones:

```sparql
PREFIX : <urn:example:>
SELECT ?personName WHERE {
  ?person :name ?personName.
  ?person :bornIn  / :within* / :name "United States".
  ?person :livesIn / :within* / :name "Europe".
}
```

#### Grafos frente al modelo de red de CODASYL

¿Son las bases de grafos el regreso de CODASYL? No, por varias diferencias importantes:

| CODASYL | Base de grafos |
| --- | --- |
| Esquema fijo que dice qué tipo de registro puede anidarse en cuál | Cualquier vértice puede tener aristas a cualquier otro |
| Solo se llega a un registro recorriendo un access path | Acceso directo por ID o mediante índices por valor |
| Los hijos de un registro son un conjunto **ordenado** que la base debe mantener | Vértices y aristas sin orden; se ordena al consultar |
| Consultas siempre imperativas y frágiles | Lenguajes declarativos (Cypher, SPARQL); recorrido imperativo opcional |

#### Datalog: la base teórica

**Datalog** es mucho más antiguo (estudiado en los 80) y es la base de lenguajes posteriores. Se usa en Datomic y en Cascalog (Hadoop). Su modelo generaliza las tripletas escribiendo `predicado(sujeto, objeto)`:

```prolog
name(usa, 'United States').    type(usa, country).
name(idaho, 'Idaho').          type(idaho, state).   within(idaho, usa).
name(lucy, 'Lucy').            born_in(lucy, idaho).
```

Las consultas se construyen con **reglas** que definen predicados nuevos a partir de otros, incluso recursivamente:

```prolog
within_recursive(Location, Name) :- name(Location, Name).          /* regla 1 */
within_recursive(Location, Name) :- within(Location, Via),          /* regla 2 */
                                    within_recursive(Via, Name).

migrated(Name, BornIn, LivingIn) :- name(Person, Name),             /* regla 3 */
                                    born_in(Person, BornLoc),
                                    within_recursive(BornLoc, BornIn),
                                    lives_in(Person, LivingLoc),
                                    within_recursive(LivingLoc, LivingIn).

?- migrated(Who, 'United States', 'Europe').
/* Who = 'Lucy'. */
```

La idea: la regla 1 dice "una ubicación está dentro de sí misma"; la regla 2 dice "si A está dentro de B y B está (recursivamente) dentro de X, A está dentro de X". Combinando reglas pequeñas construyes consultas complejas paso a paso, igual que descompones un programa en funciones. Es menos cómodo para consultas simples de una sola vez, pero escala mejor en complejidad.

### Un caso real: detección de fraude y recomendaciones

Para que veas por qué los grafos se usan en producción, piensa en dos problemas típicos.

**Detección de fraude.** Un banco quiere saber si una cuenta nueva está conectada con cuentas ya marcadas como fraudulentas: comparten teléfono, dirección, dispositivo o tarjeta, quizá a través de dos o tres intermediarios. En un modelo relacional tendrías tablas `accounts`, `phones`, `devices`, `addresses` y tablas de unión entre ellas; la pregunta "¿hay un camino de longitud ≤ 3 entre esta cuenta y alguna cuenta fraudulenta?" exige JOINs encadenados de todas las combinaciones posibles. En un grafo es un patrón:

```cypher
MATCH path = (nueva:Account {id: $id}) -[:USES_PHONE|USES_DEVICE|LIVES_AT*1..3]-
             (sospechosa:Account {flagged: true})
RETURN sospechosa.id, length(path)
ORDER BY length(path) LIMIT 10
```

**Recomendaciones.** "Personas que compraron lo mismo que tú también compraron…" es un recorrido de dos saltos: de ti a tus productos, de tus productos a otros compradores, de ellos a sus productos. Las bases de grafos optimizan este tipo de recorrido con **index-free adjacency**: cada vértice guarda referencias directas a sus vecinos, así que seguir una arista cuesta lo mismo sin importar el tamaño total del grafo. En un relacional, cada salto es una búsqueda en un índice cuyo coste crece (logarítmicamente) con el tamaño de la tabla.

Esto no significa que siempre debas usar una base de grafos. Si los recorridos son de uno o dos saltos fijos, un relacional bien indexado suele bastar y te ahorra operar otra tecnología. La señal para considerar un grafo es que **la profundidad del recorrido sea variable o grande** y que las preguntas de negocio sean sobre conexiones más que sobre agregaciones.

Existe también **Gremlin** (de Apache TinkerPop), un lenguaje de recorrido más imperativo que Cypher, soportado por JanusGraph, Amazon Neptune y Azure Cosmos DB. Describe el recorrido como una cadena de pasos (`g.V().has('name','Lucy').out('BORN_IN').repeat(out('WITHIN')).emit()`), útil cuando quieres controlar exactamente el camino.

### Comparación final de modelos

| Modelo | Encaja con | Ejemplos reales | Lenguaje típico |
| --- | --- | --- | --- |
| Relacional | Datos estructurados, many-to-one y many-to-many moderados | PostgreSQL, MySQL, SQL Server | SQL |
| Documento | Árboles autocontenidos, pocas relaciones entre documentos | MongoDB, CouchDB, Firestore | API propia, aggregation pipeline |
| Property graph | Relaciones muy interconectadas y heterogéneas | Neo4j, Amazon Neptune, JanusGraph | Cypher, Gremlin |
| Triple-store | Integración de datos de distintas fuentes, ontologías | Datomic, AllegroGraph, Blazegraph | SPARQL, Datalog |

Fíjate en una simetría: las bases de documentos apuestan por datos autocontenidos y poca relación entre registros; las de grafos apuestan justo por lo contrario, que **todo puede estar relacionado con todo**. Ambas suelen ser flexibles en esquema (schema-on-read). El relacional queda en medio.

### Ideas erróneas frecuentes

- **"Declarativo es solo azúcar sintáctico."** No: es lo que permite al motor optimizar y paralelizar sin cambiar tus consultas.
- **"SQL no puede consultar grafos."** Puede con `WITH RECURSIVE`, pero con mucho más código y a veces peor rendimiento que un motor de grafos.
- **"Las bases de grafos son CODASYL otra vez."** Difieren en esquema, acceso directo, orden y lenguajes declarativos.
- **"MapReduce es la forma moderna de consultar."** En bases de datos fue sustituido rápidamente por lenguajes declarativos como el aggregation pipeline.

### Resumen

Los lenguajes declarativos (SQL, CSS, Cypher) permiten optimizar y paralelizar sin cambiar las consultas, y por eso desplazaron a los imperativos. MapReduce es un punto intermedio que terminó envuelto en lenguajes declarativos. Para datos muy interconectados, los property graphs con Cypher y los triple-stores con SPARQL expresan en pocas líneas recorridos de longitud variable que en SQL requieren consultas recursivas largas. Datalog aporta la base teórica: construir consultas con reglas pequeñas y recursivas.

## Conceptos clave

- **Lenguaje declarativo**: describes el resultado deseado y el motor decide cómo calcularlo.
- **Lenguaje imperativo**: describes la secuencia de pasos a ejecutar.
- **MapReduce**: modelo con funciones puras `map` (emite clave-valor) y `reduce` (combina valores por clave).
- **Aggregation pipeline**: lenguaje declarativo de MongoDB para agregaciones.
- **Property graph**: grafo donde vértices y aristas tienen ID, etiqueta y propiedades clave-valor.
- **Cypher**: lenguaje de consultas por patrones para property graphs (Neo4j).
- **Recursive CTE**: `WITH RECURSIVE` en SQL para recorridos de longitud variable.
- **Triple-store**: almacena hechos como (sujeto, predicado, objeto).
- **RDF / SPARQL**: formato de la web semántica y su lenguaje de consulta.
- **Datalog**: lenguaje lógico basado en hechos y reglas recursivas.

## Preguntas de repaso

1. Nombra tres ventajas de un lenguaje de consulta declarativo frente a uno imperativo.
   R: Es más conciso y legible; oculta detalles de implementación, de modo que el motor puede cambiar índices, almacenamiento u orden interno sin romper consultas; y facilita la ejecución en paralelo porque no fija un orden de operaciones.
2. ¿Por qué las funciones `map` y `reduce` deben ser puras?
   R: Porque el framework puede ejecutarlas en cualquier máquina, en cualquier orden y repetirlas tras un fallo. Si hicieran consultas adicionales o tuvieran efectos secundarios, los reintentos y la distribución producirían resultados distintos o duplicados.
3. ¿Qué significa `-[:WITHIN*0..]->` en Cypher y qué problema resuelve?
   R: Seguir aristas WITHIN cero o más veces. Resuelve los recorridos de longitud variable: no sabes si la persona nació en una ciudad, una región o un estado, y la consulta sube por la jerarquía hasta encontrar el país o continente buscado.
4. ¿Por qué la misma consulta es mucho más larga en SQL?
   R: Porque un JOIN normal tiene un número fijo de uniones y aquí el número de saltos es variable. SQL necesita una recursive CTE por cada jerarquía a recorrer y JOINs adicionales para combinarlas, mientras que el modelo de grafos expresa el recorrido directamente.
5. Da dos diferencias entre una base de grafos y el modelo de red CODASYL.
   R: En una base de grafos cualquier vértice puede conectarse con cualquier otro (CODASYL tenía un esquema rígido de anidamiento) y puedes acceder directamente a un vértice por ID o índice (en CODASYL solo siguiendo access paths). Además, los grafos no imponen orden y tienen lenguajes declarativos.
6. ¿Cómo representa un triple-store una propiedad y una relación?
   R: Ambas como tripletas (sujeto, predicado, objeto). Si el objeto es un valor primitivo, la tripleta es una propiedad del sujeto (lucy, age, 33); si el objeto es otro vértice, el predicado es una arista (lucy, marriedTo, alain).

## Ejercicio

En SQLite o PostgreSQL, crea las tablas `vertices` y `edges` de la lección y carga el ejemplo de Lucy y Alain (ubicaciones, `within`, `born_in`, `lives_in`). Añade una tercera persona nacida en Texas que vive en Berlín y una cuarta nacida en Lyon que vive en Chicago.

1. Escribe la consulta recursiva que devuelve quién emigró de Estados Unidos a Europa.
2. Escribe en TypeScript una función `ancestors(vertexId, label)` que recorra el grafo en memoria (BFS) y úsala para responder la misma pregunta.

Criterio de terminado: ambas soluciones devuelven exactamente a Lucy y a la persona de Texas, y la de Lyon no aparece.

## Explícalo con tus palabras

Explica por qué CSS es a manipular el DOM lo que SQL es a recorrer registros con un cursor.
