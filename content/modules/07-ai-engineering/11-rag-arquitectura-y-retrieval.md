---
title: RAG — por qué, retrieval por términos y embeddings, chunking, reranking y evaluación
kind: lesson
hours: 2
sources: AI Engineering (Chip Huyen), cap. 6, RAG, RAG Architecture, Retrieval Algorithms y Retrieval Optimization (pp. 494–530)
links: BEIR benchmark | https://github.com/beir-cellar/beir ; ANN-Benchmarks | https://ann-benchmarks.com ; Anthropic, Introducing Contextual Retrieval | https://www.anthropic.com/news/contextual-retrieval
---

## Objetivo

Entender qué problema resuelve RAG y por qué sigue siendo útil con contextos largos, conocer su arquitectura (retriever + generator, indexing + querying), comparar el retrieval por términos (TF-IDF, BM25) con el retrieval por embeddings y combinarlos (hybrid search, RRF), elegir una estrategia de chunking, saber cuándo rerankear, y evaluar un RAG separando los fallos de retrieval de los de generación. La implementación práctica (embeddings, bases vectoriales, una app RAG completa, RAG con LangChain y text-to-SQL) la harás en los módulos 14 y 15; aquí construyes el criterio para diseñarla y diagnosticarla.

## Estudio

### 1. Instrucciones más contexto

Para resolver una tarea, un modelo necesita dos cosas: **instrucciones** (cómo hacerla) y **información** (con qué hacerla). Las instrucciones suelen ser las mismas para todas las consultas; la información es **específica de cada consulta**. Igual que una persona, un modelo sin la información necesaria se equivoca más y alucina más. La sesión 10 trató las instrucciones; esta sesión trata cómo **construir el contexto** de cada consulta.

Hay dos patrones dominantes. **RAG** (*retrieval-augmented generation*) recupera información relevante de fuentes externas y la añade al prompt. Los **agentes** dan herramientas al modelo (búsqueda web, APIs, bases de datos) para que consiga información y además actúe; los estudiarás en los tracks de DataCamp de los módulos 14 y 15. Los dos comparten una idea de fondo: **la construcción de contexto es a los foundation models lo que el feature engineering era al ML clásico**. Darle al modelo la información correcta pesa más que casi cualquier ajuste del prompt.

### 2. Qué es RAG y por qué no muere con los contextos largos

RAG mejora la generación **recuperando información relevante de una memoria externa**: documentación interna, una base de datos, conversaciones anteriores, internet. El patrón "primero recupera, luego genera" nació para responder preguntas abiertas: el sistema busca las páginas más relevantes de una enciclopedia y el modelo las "lee" antes de responder. Si preguntas "¿La impresora A300 de Acme imprime 100 páginas por minuto?", el modelo responde mucho mejor con la ficha técnica de la A300 delante que tirando de memoria.

Piensa en RAG como **un contexto hecho a medida para cada consulta**. Eso trae beneficios laterales: puedes usar datos privados o actualizados sin reentrenar, y puedes incluir los datos de un usuario solo en sus propias consultas.

¿Y si la ventana de contexto del modelo es enorme? RAG sigue siendo útil por dos razones:

1. **Los datos crecen más rápido que el contexto.** Siempre habrá aplicaciones con más datos de los que caben en cualquier ventana.
2. **Que quepa no significa que se use bien.** Con contextos largos el modelo se enfoca peor (*lost in the middle*, sesión 10) y cada token extra cuesta dinero y latencia. RAG pasa solo lo relevante: menos tokens y, a menudo, mejores respuestas.

Hay un punto de partida legítimo sin RAG: si tu base de conocimiento es pequeña y estable (unas decenas de miles de tokens), meterla entera en el prompt, con prompt caching si se repite, puede bastar. Mide costo, latencia y calidad antes de construir nada más complejo.

### 3. Arquitectura

```
                  INDEXING (offline)                          QUERYING (por consulta)
documentos ─► chunking ─► [embeddings] ─► índice       consulta ─► retriever ─► top-k chunks
                                            ▲                                        │
                                            └───────────── búsqueda ◄────────────────┘
                                                                                     ▼
                                          prompt = instrucciones + chunks + consulta ─► generator ─► respuesta
```

Dos componentes:

- **Retriever**: trae información de la memoria externa. Tiene dos funciones: **indexing** (procesar los datos una vez para encontrarlos rápido después) y **querying** (dada una consulta, traer lo relevante). Cómo indexas depende de cómo vas a recuperar.
- **Generator**: el modelo que escribe la respuesta usando lo recuperado.

En la propuesta original ambos se entrenaban juntos; hoy lo normal es combinar un retriever y un modelo ya hechos. La lección más importante de toda la sesión es esta: **la calidad de un RAG depende sobre todo del retriever**. Si no trae el fragmento correcto, el mejor modelo del mundo no puede responder bien; a lo sumo, inventará con elegancia.

Los documentos pueden ser enormes, así que se dividen en **chunks** (sección 7). Mientras hablamos de retrieval, "documento" y "chunk" son intercambiables: un trozo de documento también es un documento.

### 4. Retrieval por términos

Recuperar es, en el fondo, **ordenar documentos por relevancia** respecto a una consulta. La forma más directa de medir relevancia son las palabras clave, y aparecen dos problemas enseguida:

1. Muchos documentos contienen el término y no caben todos. Heurística: preferir los que lo contienen **más veces**. Eso es la **term frequency (TF)**.
2. No todos los términos de la consulta pesan igual. En "recetas fáciles de comida vietnamita para cocinar en casa", importan "vietnamita" y "recetas", no "de" ni "para". Intuición: cuantos más documentos contienen un término, menos informa. Eso es la **inverse document frequency (IDF)**, en su forma habitual `IDF(t) = log(N / C(t))`, con N documentos en total y C(t) documentos que contienen t.

**TF-IDF** combina ambos: la puntuación de un documento es la suma, sobre los términos de la consulta, de `IDF(término) × TF(término, documento)`.

Un ejemplo con números. Corpus de 1 000 documentos; consulta "error EADDRINUSE worker". "worker" aparece en 400 documentos (IDF = log(1000/400) ≈ 0,92); "EADDRINUSE", en 3 (IDF = log(1000/3) ≈ 5,8); "error", en 600 (IDF ≈ 0,51). Un documento que dice "worker" diez veces y nunca "EADDRINUSE" suma unos 9,2 por ese término; uno que menciona "EADDRINUSE" dos veces suma 11,6 solo con él. El término raro manda, que es justo lo que quieres.

Para buscar rápido se usa un **índice invertido**: un diccionario término → documentos que lo contienen, con su frecuencia. Así no recorres el corpus entero en cada consulta: solo las listas de los términos de la consulta.

**BM25** es la evolución práctica de TF-IDF. Hace dos cosas más: **normaliza por la longitud del documento** (un documento largo contiene más veces cualquier término sin ser más relevante) y **satura la frecuencia** (la décima aparición de un término aporta mucho menos que la primera). BM25 y sus variantes siguen siendo **una línea base durísima de superar** y el corazón de buscadores de texto muy usados.

```ts
// BM25 mínimo en memoria: suficiente para entender el algoritmo y para corpus pequeños
type Doc = { id: string; text: string };

const tokenize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 1);

export function buildBM25(docs: Doc[], k1 = 1.5, b = 0.75) {
  const toks = docs.map((d) => tokenize(d.text));
  const avgLen = toks.reduce((s, t) => s + t.length, 0) / docs.length;
  const df = new Map<string, number>();
  for (const t of toks) for (const term of new Set(t)) df.set(term, (df.get(term) ?? 0) + 1);
  const N = docs.length;

  return function search(query: string, k = 5) {
    return docs
      .map((doc, i) => {
        let score = 0;
        for (const term of tokenize(query)) {
          const n = df.get(term);
          if (!n) continue;
          const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
          const tf = toks[i].filter((t) => t === term).length;
          score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * toks[i].length) / avgLen))); // b: longitud; k1: saturación
        }
        return { id: doc.id, score };
      })
      .filter((r) => r.score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, k);
  };
}
```

La **tokenización** importa más de lo que parece. Partir por palabras rompe términos compuestos ("hot dog" → "hot" + "dog", y ninguno conserva el significado); una solución es tratar los n-gramas frecuentes como un solo término. También se suele pasar a minúsculas, quitar tildes y puntuación y eliminar *stop words* ("el", "de", "y").

### 5. Retrieval por embeddings

El retrieval por términos mide relevancia **léxica**, no de significado. "Arquitectura transformer" puede traer documentos sobre transformadores eléctricos; "¿cuántos días tengo si me caso?" no encuentra un artículo titulado "licencia por matrimonio". El **retrieval semántico** ordena por cercanía de significado usando embeddings (sesión 4):

- **Indexing**: además de partir en chunks, conviertes cada chunk en un embedding y lo guardas en una **vector database**.
- **Querying**: conviertes la consulta en embedding **con el mismo modelo** que usaste al indexar, y traes los k chunks cuyos vectores están más cerca (por similitud coseno, por ejemplo).

Una advertencia obvia pero crucial: **si el modelo de embeddings es malo para tu dominio, el retriever es malo**, y ningún truco posterior lo compensa del todo.

Guardar vectores es fácil; lo difícil es **encontrar rápido** los más cercanos. Con unos miles de chunks basta el **k-NN exacto**: calcular la similitud con todos y ordenar. Con millones, se usa **ANN** (*approximate nearest neighbor*), que sacrifica un poco de exactitud por mucha velocidad organizando los vectores de antemano:

| Algoritmo | Idea |
| --- | --- |
| **HNSW** | Grafo multinivel; se navega saltando entre vecinos parecidos |
| **IVF** | Agrupa vectores con k-means y busca solo en los clústeres cercanos a la consulta |
| **Product Quantization** | Comprime cada vector en subvectores cuantizados; las distancias salen más baratas |
| **LSH** | Un hash que tiende a poner vectores parecidos en la misma cubeta |

Hay compromisos entre construir el índice y consultarlo: HNSW consulta rápido y con precisión, pero tarda y ocupa más al construirse; LSH se construye enseguida y consulta peor. Los benchmarks de ANN comparan **recall** (fracción de vecinos reales encontrados), consultas por segundo, tiempo de construcción y tamaño del índice. Cómo se usan Chroma o Pinecone en la práctica lo verás en el módulo 14.

### 6. Términos frente a embeddings, y cómo combinarlos

| | Por términos (BM25) | Por embeddings |
| --- | --- | --- |
| Velocidad | Muy rápida | Embedding de la consulta + búsqueda vectorial |
| Rendimiento | Fuerte de entrada, difícil de mejorar | Puede superarlo, sobre todo con un modelo de embeddings adecuado o ajustado |
| Consultas naturales | Falla con sinónimos y paráfrasis | Entiende paráfrasis y lenguaje natural |
| Palabras exactas | Excelente con códigos de error, SKUs, nombres, IDs | Puede "difuminarlos" entre conceptos parecidos |
| Costo | Barato | Generar, almacenar y buscar embeddings cuesta; regenerarlos si los datos cambian mucho, más |

Verás también el vocabulario **sparse** (por términos: vectores casi todo ceros, una dimensión por término) frente a **dense** (embeddings). Sobre latencia, en un RAG la mayor parte del tiempo suele ser la **generación**; el retrieval añade poco en proporción.

Como cada enfoque falla en sitios distintos, los sistemas en producción los combinan con **hybrid search**:

- **En secuencia**: un recuperador barato y amplio trae candidatos y otro más preciso los reordena. Ese segundo paso es un **reranking** (sección 8).
- **En paralelo**: varios recuperadores producen rankings y se **fusionan**. El método clásico es **reciprocal rank fusion (RRF)**: cada recuperador aporta a cada documento `1 / (k + posición)`, con k típico de 60, y se suman las aportaciones.

Ejemplo: el documento A sale 1.º en BM25 y 3.º en embeddings; B sale 2.º en embeddings y no aparece en BM25. A suma 1/61 + 1/63 ≈ 0,0323; B suma 1/62 ≈ 0,0161. A gana porque **los dos** recuperadores lo consideran relevante. La gran ventaja de RRF es que solo usa **posiciones**: no hace falta poner en la misma escala una puntuación BM25 (sin techo) y un coseno (entre −1 y 1).

### 7. Chunking: cómo partir los documentos

La estrategia de chunking afecta mucho la calidad, y se decide al indexar: cambiarla obliga a reindexar.

**Estrategias:**

- **Longitud fija** por una unidad: caracteres, palabras, oraciones o párrafos.
- **Recursiva**: partes por secciones; si una sección es demasiado larga, por párrafos; si un párrafo sigue siendo largo, por oraciones. Reduce la probabilidad de cortar ideas relacionadas.
- **Según el formato**: en markdown, por encabezados; en código, por funciones o clases; en preguntas frecuentes, por par pregunta–respuesta. Las tablas y los bloques de código no se parten.
- **Por tokens** del tokenizer del generador: encaja bien en el contexto, pero si cambias de modelo tendrás que reindexar.

**Solapamiento.** Sin overlap puedes cortar justo donde está la información clave: "le dejé una nota a mi esposa" partido en "le dejé una nota" y "a mi esposa" pierde el sentido en ambos trozos. Un pequeño solapamiento entre chunks consecutivos asegura que la información de la frontera quede completa en al menos uno.

**Tamaño: el gran compromiso.**

| Chunks pequeños | Chunks grandes |
| --- | --- |
| Caben más en el contexto: información más diversa | Menos chunks por respuesta |
| Más precisos para preguntas concretas | Mejores para preguntas que necesitan contexto amplio |
| Riesgo de perder contexto: un tema que solo se nombra al principio no se recupera en los trozos siguientes | Más ruido dentro de cada chunk |
| Más chunks: más embeddings que calcular y guardar, búsqueda más lenta | Indexación más barata |

Hay límites duros: un chunk no puede superar el límite de entrada del modelo de embeddings ni, junto con los demás, la ventana del generador. Por lo demás, **no hay tamaño universal**: se decide midiendo con tu conjunto de consultas (sección 9).

Un detalle que ahorra muchos problemas: **cada chunk guarda su origen** (archivo, sección, posición). Lo necesitas para citar, para depurar qué entró en cada respuesta y para aplicar permisos.

### 8. Reranking y otras palancas del retriever

El ranking inicial del retriever puede reordenarse con un mecanismo más preciso. Es especialmente útil cuando necesitas **reducir** muchos candidatos ruidosos a unos pocos buenos.

El patrón típico es **barato primero, caro después**: un retriever rápido trae, por ejemplo, 50 candidatos y un mecanismo preciso se queda con 5. Ese mecanismo puede ser:

- Un **cross-encoder**: un modelo que lee consulta y documento **juntos** y puntúa su relevancia. Es más preciso que comparar dos embeddings calculados por separado (*bi-encoder*), pero demasiado lento para aplicarlo a todo el corpus; por eso solo se usa sobre los candidatos.
- Un **LLM** que puntúa la relevancia de cada candidato. Funciona, pero puntuar 20 candidatos son 20 llamadas extra por consulta; en producción suelen preferirse rerankers especializados, pequeños y rápidos.
- Un criterio de **tiempo**: dar más peso a lo reciente, clave en noticias, correo o datos de mercado.

Diferencia con un buscador web: allí la posición exacta (1.º frente a 5.º) es crucial porque el usuario lee una lista. En el contexto de un RAG importa sobre todo **qué entra**; el orden pesa algo (el modelo atiende mejor el principio y el final), pero menos.

Dos palancas más completan la caja de herramientas:

- **Query rewriting.** En una conversación, "¿Y Ana Pérez?" no sirve como consulta para el retriever. Un modelo la reescribe para que se entienda sola: "¿Cuándo fue la última compra de Ana Pérez?". Si no puede resolver a quién se refiere, debe decirlo, no inventar un referente.
- **Contextual retrieval.** Enriquecer cada chunk antes de indexarlo: metadatos (título, fecha, códigos extraídos), preguntas que el chunk responde ("olvidé mi contraseña" para el artículo de restablecerla) o un breve contexto del documento original ("este fragmento pertenece a la política de devoluciones de 2026"). Cuesta una llamada por chunk al indexar, no por consulta.

### 9. Evaluar un RAG

Métricas del retriever, sobre un conjunto de consultas de prueba en el que sabes qué chunks son relevantes para cada una (anotados por ti o por un juez):

- **Context precision**: de lo recuperado, ¿qué fracción es relevante?
- **Context recall**: de todo lo relevante, ¿qué fracción se recuperó? Es más difícil de medir en producción, porque exige conocer la relevancia de **todo** el corpus para cada consulta.
- Si te importa el **orden**: **MRR** (*mean reciprocal rank*: 1/posición del primer relevante, promediado sobre las consultas) y NDCG.

```ts
export function retrievalMetrics(retrieved: string[], relevant: Set<string>) {
  const hits = retrieved.filter((id) => relevant.has(id)).length;
  const firstHit = retrieved.findIndex((id) => relevant.has(id));
  return {
    precision: hits / Math.max(retrieved.length, 1),
    recall: hits / Math.max(relevant.size, 1),
    reciprocalRank: firstHit === -1 ? 0 : 1 / (firstHit + 1),
  };
}
```

Evalúa en tres niveles: (1) la calidad del **retrieval**; (2) la calidad de la **respuesta final**, sobre todo su fidelidad al contexto (factual consistency, con los jueces de las sesiones 5–6); y (3) la de los **embeddings**, si los usas. Al final, un retriever es bueno si ayuda a generar buenas respuestas.

La herramienta de diagnóstico más útil es **registrar qué chunks entraron en cada respuesta**. Con ese registro, cada respuesta mala cae en una de dos cajas: **fallo de retrieval** (el chunk correcto no estaba en el contexto) o **fallo de generación** (estaba, y el modelo lo ignoró o lo contradijo). Sin él, todo parece "el modelo alucina".

#### Ejemplo trabajado: diagnosticar un RAG que "inventa"

Un asistente responde preguntas sobre el reglamento interno de una empresa y los usuarios se quejan de que inventa. Revisas 30 respuestas malas con el registro de chunks:

| Causa | Casos | Evidencia |
| --- | --- | --- |
| El chunk correcto no se recuperó | 14 | "¿Cuántos días tengo si me caso?" no trae "licencia por matrimonio: 15 días hábiles": vocabulario distinto |
| Se recuperó, pero cortado | 6 | El chunk termina en "salvo en los siguientes casos:" y la lista quedó en el siguiente |
| Pregunta de seguimiento ambigua | 5 | "¿Y si es en otro país?" sin reescritura |
| Se recuperó entero y el modelo lo contradijo | 5 | El contexto dice 15 días y la respuesta dice 10 |

25 de 30 fallos no eran del generador: cambiar a un LLM más caro no habría arreglado casi nada. Las decisiones salen de la tabla: hybrid search y preguntas generadas por chunk para el vocabulario; chunking por secciones del reglamento, sin partir listas, para los cortes; query rewriting para los seguimientos; y, para los 5 de generación, instrucciones de responder solo con el contexto y citar el artículo, temperature baja y un juez de fidelidad en el evalset.

El orden general de mejora, de barato a caro:

1. **Diagnostica** con el registro de chunks: ¿retrieval o generación?
2. **Chunking**: tamaño, solapamiento y respeto de la estructura.
3. **Hybrid search** con RRF, sobre todo si hay términos exactos.
4. **Query rewriting** si la interfaz es conversacional.
5. **Reranking** si recuperas muchos candidatos ruidosos.
6. **Contextual retrieval** si los chunks sueltos son ambiguos.
7. Solo después: cambiar o ajustar el modelo de embeddings, o el generador.

Cada cambio, **por separado**, contra una línea base congelada: el mismo conjunto de consultas con sus chunks relevantes anotados. Así sabes cuánto aportó cada uno y descartas los que suben el costo sin subir la recall.

### 10. Permisos, seguridad y otros datos

- **Permisos en el retrieval.** Si indexas documentos de varios usuarios o áreas en un mismo índice, el filtro de permisos se aplica **al recuperar**. Confiar en que el modelo "no mencione" un documento que no debía estar en el contexto es confiar en la suerte.
- **Texto no confiable.** Todo lo recuperado es entrada que no escribiste: un documento indexado puede contener instrucciones (prompt injection indirecta, sesión 10). Delimítalo y declara que es dato.
- **Datos tabulares.** Si la respuesta está en una tabla ("¿cuántas unidades se vendieron esta semana?"), no se recuperan chunks: el modelo traduce la pregunta a SQL con el esquema, se ejecuta con una conexión de solo lectura y se responde con el resultado. Lo practicarás en el módulo 15 (RAG estructurado).
- **RAG frente a finetuning.** RAG resuelve **falta de información**; el finetuning resuelve **falta de comportamiento** (formato, estilo, tareas poco vistas). Lo verás en detalle en la sesión 15.

### 11. Errores comunes

- Culpar al modelo cuando el problema es el retriever: mide context precision y recall antes de cambiar de LLM.
- Usar un modelo de embeddings distinto al indexar y al consultar.
- Usar solo búsqueda semántica en dominios con códigos, SKUs o nombres exactos.
- Llenar el contexto con k = 20 "por si acaso": más ruido, más costo, peor enfoque.
- Chunks que cortan listas, tablas o bloques de código, o que pierden el título del documento.
- No guardar qué chunks entraron en cada respuesta: imposible depurar o citar.
- Rerankear con un LLM caro sin medir la ganancia.
- No aplicar permisos en el retrieval.

## Conceptos clave

- **RAG**: técnica que recupera información relevante de una memoria externa y la añade al contexto antes de generar.
- **Retriever / generator**: componente que busca la información y modelo que genera la respuesta con ella.
- **Indexing / querying**: preparar los datos para buscarlos después y buscar lo relevante para una consulta.
- **TF-IDF**: puntuación que combina la frecuencia de un término en un documento con lo raro que es en el corpus.
- **BM25**: variante de TF-IDF que normaliza por longitud y satura la frecuencia; línea base fuerte.
- **Índice invertido**: estructura término → documentos que lo contienen.
- **Vector database / ANN**: almacén de embeddings y búsqueda aproximada de vecinos cercanos, más rápida que el k-NN exacto.
- **Hybrid search / RRF**: combinar retrieval por términos y por embeddings; fusionar rankings sumando 1/(k + posición).
- **Chunking y overlap**: dividir documentos en unidades indexables, con solapamiento para no perder información en las fronteras.
- **Reranking / cross-encoder**: reordenar candidatos con un mecanismo más preciso, como un modelo que lee consulta y documento juntos.
- **Context precision / recall**: fracción de lo recuperado que es relevante y fracción de lo relevante que se recuperó.

## Preguntas de repaso

1. ¿Por qué RAG sigue siendo útil aunque los modelos acepten contextos muy largos?
   R: Porque los datos de muchas aplicaciones crecen más que cualquier ventana de contexto y porque, aunque quepan, los modelos aprovechan peor los contextos largos y cada token añade costo y latencia; RAG envía solo lo relevante, reduciendo tokens y a menudo mejorando la respuesta.
2. Explica qué miden TF e IDF, por qué se combinan y qué mejora BM25.
   R: TF mide cuántas veces aparece un término en un documento; IDF mide cuán raro es en el corpus, porque los términos presentes en casi todos los documentos informan poco. Combinarlos premia los documentos que contienen muchas veces términos informativos de la consulta. BM25 además normaliza por la longitud del documento y satura la contribución de las repeticiones.
3. ¿Cuándo prefieres retrieval por términos, cuándo por embeddings y por qué RRF es práctico para combinarlos?
   R: Por términos cuando importan palabras exactas (códigos de error, SKUs, nombres) y se busca velocidad y bajo costo; por embeddings cuando las consultas son naturales, con sinónimos o paráfrasis. RRF suma 1/(k + posición) de cada ranking, así que solo usa posiciones y no exige normalizar puntuaciones de escalas distintas como BM25 y coseno.
4. ¿Qué ganas y qué pierdes al reducir a la mitad el tamaño de los chunks, y para qué sirve el solapamiento?
   R: Ganas diversidad y precisión: caben más chunks en el contexto y las coincidencias son más concretas. Pierdes contexto dentro de cada chunk y duplicas el número de chunks, con más embeddings que generar y búsquedas más lentas. El solapamiento asegura que la información situada en la frontera entre dos chunks quede completa en al menos uno.
5. ¿Por qué un cross-encoder se usa para rerankear candidatos y no para buscar en todo el corpus?
   R: Porque lee la consulta y cada documento juntos, lo que le da más precisión que comparar embeddings calculados por separado, pero exige una pasada del modelo por cada par consulta–documento. Eso es asumible con decenas de candidatos y demasiado lento con todo el corpus.
6. ¿Por qué la context recall es más difícil de medir en producción que la precision?
   R: Porque para la recall hay que saber cuáles de todos los documentos del corpus son relevantes para cada consulta, lo que exige anotar el corpus entero; para la precision basta juzgar los pocos documentos recuperados.
7. ¿Cómo distingues un fallo de retrieval de uno de generación y por qué importa?
   R: Registrando qué chunks entraron en cada respuesta: si el chunk con la respuesta no estaba, es un fallo de retrieval; si estaba y la respuesta lo ignora o lo contradice, es de generación. Importa porque las soluciones son distintas: chunking, hybrid search, reescritura o reranking en el primer caso; prompt, temperature, citas o modelo en el segundo.

## Ejercicio

Toma 6–10 archivos markdown de este módulo y pártelos en chunks por encabezados `##` y `###`, guardando en cada chunk el archivo y la sección. Indéxalos con `buildBM25`. Escribe 8 consultas (4 con palabras exactas del texto y 4 parafraseadas) y anota a mano qué chunks son relevantes para cada una. Calcula precision@3, recall@3 y MRR con `retrievalMetrics`. Repite partiendo solo por `##` (chunks más grandes) y compara. Terminado cuando tienes una tabla con las tres métricas para las dos estrategias de chunking, separadas por tipo de consulta, y un párrafo que explique en qué consultas esperas que los embeddings del módulo 14 superen a BM25 y por qué.

## Explícalo con tus palabras

Explica a un compañero por qué en un RAG "el modelo inventó la respuesta" muchas veces es en realidad un problema del retriever, y cómo lo comprobarías.
