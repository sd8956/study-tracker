---
title: RAG I — arquitectura y algoritmos de retrieval
kind: lesson
hours: 2
sources: AI Engineering (Chip Huyen), cap. 6, RAG, RAG Architecture y Retrieval Algorithms (pp. 494–520)
links: BEIR benchmark | https://github.com/beir-cellar/beir ; ANN-Benchmarks | https://ann-benchmarks.com
---

## Objetivo

Entender qué problema resuelve RAG y cuándo sigue siendo útil aunque existan contextos largos, conocer su arquitectura (retriever + generator, indexing + querying), dominar los dos grandes tipos de retrieval (por términos con TF-IDF/BM25 y por embeddings con búsqueda vectorial), saber evaluarlos (context precision/recall, ranking) y combinarlos (hybrid search, reciprocal rank fusion).

## Estudio

### 1. Instrucciones + contexto

Para resolver una tarea, un modelo necesita dos cosas: **instrucciones** (cómo hacerla) y **información** (con qué hacerla). Las instrucciones suelen ser comunes a todas las consultas; el contexto es **específico de cada consulta**. Igual que una persona, un modelo sin la información necesaria se equivoca más y alucina más. La sesión 8 trató las instrucciones; aquí tratamos cómo **construir el contexto** de cada consulta. Los dos patrones dominantes son:

- **RAG** (*retrieval-augmented generation*): recuperar información relevante de fuentes externas.
- **Agentes**: dar herramientas al modelo (búsqueda web, APIs) para que consiga información y además actúe en el mundo (sesión 14).

### 2. Qué es RAG y por qué no muere con los contextos largos

RAG mejora la generación del modelo **recuperando información relevante de una memoria externa**: una base de datos interna, conversaciones anteriores del usuario, internet. El patrón "primero recupera, luego genera" nació para responder preguntas abiertas: el sistema busca las páginas más relevantes de una enciclopedia y el modelo "lee" esas páginas para responder. El término RAG se popularizó al proponerlo para **tareas intensivas en conocimiento** donde no cabe todo en el modelo: solo se le pasa lo más relevante, y eso da respuestas más detalladas y con menos alucinaciones. Si preguntas "¿La impresora A300 de Acme imprime 100 páginas por minuto?", el modelo responde mucho mejor con la ficha técnica de la A300 delante.

Piensa en RAG como **construir un contexto a medida por consulta**. Bonus: facilita manejar datos de usuarios, porque solo incluyes los datos de un usuario en sus propias consultas. Una analogía útil: **la construcción de contexto es a los foundation models lo que el feature engineering era al ML clásico**: darle al modelo la información que necesita para procesar una entrada.

¿Y si el contexto del modelo es enorme? RAG sigue siendo útil por dos razones:

1. **Los datos crecen más rápido que el contexto**: siempre habrá aplicaciones con más datos de los que caben.
2. **Que quepa no significa que se use bien**: con contextos largos el modelo se enfoca peor (lost in the middle, sesión 8), y cada token extra cuesta dinero y latencia. RAG pasa solo lo relevante: menos tokens y, a menudo, mejores respuestas.

Hay proveedores que sugieren que, si tu base de conocimiento es pequeña (del orden de unos cientos de páginas), puedes meterla entera en el prompt. Es una opción válida para empezar; mide costo, latencia y calidad antes de decidir.

### 3. Arquitectura

```
                  INDEXING (offline)                         QUERYING (por consulta)
documentos ─► chunking ─► [embeddings] ─► índice      consulta ─► retriever ─► top-k chunks
                                            ▲                                       │
                                            └──────────── búsqueda ◄────────────────┘
                                                                                    ▼
                                         prompt = instrucciones + chunks + consulta ─► generator ─► respuesta
```

Dos componentes:

- **Retriever**: trae información de la memoria externa. Tiene dos funciones: **indexing** (procesar los datos para recuperarlos rápido después) y **querying** (dada una consulta, traer lo relevante). Cómo indexas depende de cómo vas a recuperar.
- **Generator**: el modelo que genera la respuesta usando lo recuperado.

En la propuesta original ambos se entrenaban juntos; hoy lo normal es usar retrievers y modelos ya hechos por separado (aunque ajustar el sistema completo puede mejorar mucho). **El éxito de un RAG depende sobre todo de la calidad del retriever**: si no trae lo correcto, el mejor modelo del mundo no puede responder bien.

Los documentos pueden ser enormes, así que se dividen en **chunks** manejables (estrategias en la sesión 12). En esta sesión, "documento" y "chunk" son intercambiables: un trozo de documento también es un documento.

### 4. Retrieval por términos (lexical)

En el fondo, recuperar es **ordenar documentos por relevancia** respecto a una consulta. Los algoritmos difieren en cómo calculan esa relevancia. La forma más directa: palabras clave. Dos problemas:

1. Muchos documentos contienen el término y no caben todos. Heurística: preferir los que lo contienen **más veces** → **term frequency (TF)**.
2. No todos los términos de la consulta pesan igual. En "recetas fáciles de comida vietnamita para cocinar en casa", importan "vietnamita" y "recetas", no "de" o "para". Intuición: cuantos más documentos contienen un término, menos informativo es → **inverse document frequency (IDF)**. Con 10 documentos y un término presente en 5, su IDF (en su forma más simple) es 10/5 = 2; en la práctica se usa el logaritmo: `IDF(t) = log(N / C(t))`.

**TF-IDF** combina ambos: la puntuación de un documento para una consulta es la suma, sobre los términos de la consulta, de `IDF(término) × TF(término, documento)`.

Para buscar rápido se usa un **índice invertido**: un diccionario de término → documentos que lo contienen (con su frecuencia).

| Término | Nº de documentos | (documento, frecuencia) |
| --- | --- | --- |
| banana | 2 | (10, 3), (5, 2) |
| machine | 4 | (1, 5), (10, 1), (38, 9), (42, 5) |
| learning | 3 | (1, 5), (38, 7), (42, 5) |

**BM25** es una evolución de TF-IDF de los años 80 que, entre otras cosas, **normaliza por la longitud del documento** (un documento largo contiene más veces cualquier término sin ser más relevante) y satura la frecuencia (la décima aparición aporta menos que la primera). BM25 y sus variantes siguen siendo **una línea base durísima de superar** y la base de buscadores de texto muy usados.

```ts
// BM25 mínimo en memoria
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
    const q = tokenize(query);
    return docs
      .map((doc, i) => {
        let score = 0;
        for (const term of q) {
          const n = df.get(term);
          if (!n) continue;
          const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
          const tf = toks[i].filter((t) => t === term).length;
          score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * toks[i].length) / avgLen)));
        }
        return { id: doc.id, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  };
}
```

Detalles de **tokenización** que importan: partir por palabras rompe términos de varias palabras ("hot dog" → "hot" + "dog", y ninguna conserva el significado); una solución es tratar los n-gramas frecuentes como un término. También suele normalizarse a minúsculas, quitar puntuación y eliminar *stop words* ("el", "de", "y"). ¿Y recuperar por solapamiento de n-gramas con la consulta? Funciona si consulta y documentos tienen longitudes parecidas; con documentos mucho más largos, casi todos solapan algo y no se distinguen.

### 5. Retrieval por embeddings (semántico)

El retrieval por términos mide relevancia **léxica**, no de significado. "Arquitectura transformer" puede traer documentos sobre transformadores eléctricos o sobre una película. El **retrieval semántico** ordena por cercanía de significado usando embeddings (sesión 4).

Cambios respecto al anterior:

- **Indexing**: además de partir en chunks, convierte cada chunk en un embedding y lo guarda en una **vector database**.
- **Querying**: (1) convierte la consulta en embedding **con el mismo modelo** usado al indexar; (2) trae los k chunks cuyos embeddings están más cerca. El valor de k depende del caso, del modelo y de la consulta.

En sistemas reales hay más piezas (rerankers, caches). Y una advertencia obvia pero crucial: **si el modelo de embeddings es malo, el retriever es malo**.

#### Búsqueda vectorial

Guardar vectores es fácil; lo difícil es **buscar rápido** los más cercanos a uno dado. Es un problema de *nearest neighbor search*:

- **k-NN exacto**: calcula la similitud con **todos** los vectores, ordena y devuelve los k mejores. Preciso pero lento: solo para conjuntos pequeños (como tu proyecto de la sesión 13).
- **ANN** (*approximate nearest neighbor*): sacrifica un poco de exactitud por mucha velocidad. Organiza los vectores en cubetas, árboles o grafos y a veces los cuantiza:

| Algoritmo | Idea |
| --- | --- |
| **LSH** | Hash que pone vectores parecidos en la misma cubeta |
| **HNSW** | Grafo multinivel; se navega por aristas entre vecinos parecidos |
| **Product Quantization** | Representa cada vector con subvectores comprimidos; distancias más baratas |
| **IVF** | Agrupa vectores con k-means; busca solo en los clústeres más cercanos a la consulta |
| **Annoy** | Varios árboles que parten el espacio con cortes aleatorios |

Hay compromisos entre indexación y consulta: un índice detallado como HNSW da consultas rápidas y precisas pero tarda y ocupa más al construirse; uno simple como LSH se construye rápido pero consulta peor. Los benchmarks de ANN comparan **recall** (fracción de vecinos reales encontrados), **consultas por segundo**, **tiempo de construcción** e **tamaño del índice**. Y cualquier base de datos que guarde vectores puede ser una "vector database": muchas bases tradicionales ya lo soportan.

```ts
// k-NN exacto: suficiente para unos miles de chunks
type Chunk = { id: string; text: string; embedding: number[] };

export function knn(query: number[], chunks: Chunk[], k = 4) {
  return chunks
    .map((c) => ({ chunk: c, score: cosine(query, c.embedding) })) // cosine de la sesión 4
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
```

#### Términos vs embeddings

| | Por términos (BM25) | Por embeddings |
| --- | --- | --- |
| Velocidad de consulta | Mucho más rápida | Embedding de la consulta + búsqueda vectorial: más lenta |
| Rendimiento | Fuerte de entrada, difícil de mejorar | Puede superarlo, sobre todo ajustando el modelo de embeddings |
| Consultas | Falla con sinónimos y ambigüedad de términos | Entiende consultas naturales y paráfrasis |
| Palabras exactas | Excelente con códigos de error, nombres de producto, IDs | Puede "difuminarlos" |
| Costo | Barato | Generar embeddings, almacenarlos y buscar cuesta; hay empresas cuyo gasto en vector DB es una fracción grande de su gasto en modelos |

Sobre latencia: en un RAG la mayor parte del tiempo suele ser la **generación**, así que el embedding de la consulta y la búsqueda añaden poco en proporción, aunque se nota. Sobre costo: si tus datos cambian mucho, regenerar embeddings con frecuencia se encarece.

Vocabulario que verás: **sparse** vs **dense** retrieval. Por términos suele llamarse sparse (vectores casi todo ceros, uno por término del vocabulario); por embeddings, dense. Hay embeddings dispersos que se comportan como los densos, por eso aquí preferimos "por términos" vs "por embeddings".

### 6. Evaluar el retriever

Métricas que usan los frameworks de evaluación de RAG:

- **Context precision**: de los documentos recuperados, ¿qué porcentaje es relevante? (también llamada *context relevance*).
- **Context recall**: de todos los documentos relevantes, ¿qué porcentaje se recuperó?

Para calcularlas necesitas un conjunto de consultas de prueba y, por cada una, saber qué documentos son relevantes (anotados por humanos o por un juez). La precision es más fácil en producción (basta juzgar lo recuperado); la recall exige conocer la relevancia de **todos** los documentos para esa consulta.

Si te importa el **orden** (lo más relevante primero): **MRR** (*mean reciprocal rank*: 1/posición del primer relevante, promediado), **MAP** y **NDCG**.

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

Evalúa un RAG en tres niveles: (1) calidad del retrieval, (2) calidad de la respuesta final (factual consistency respecto al contexto, relevancia; sesiones 5–6) y (3) calidad de los embeddings si usas retrieval semántico. Al final, **un retriever es bueno si ayuda a generar buenas respuestas**.

### 7. Combinar: hybrid search y RRF

Como cada enfoque tiene ventajas, los sistemas en producción los combinan (**hybrid search**):

- **En secuencia**: un recuperador barato y amplio trae candidatos (por ejemplo, todos los documentos que contienen "transformer") y uno más preciso y caro los reordena (búsqueda vectorial entre esos candidatos). Ese segundo paso es un **reranking**.
- **En paralelo**: varios recuperadores producen rankings y se **fusionan**. El método clásico es **reciprocal rank fusion (RRF)**: cada recuperador aporta a cada documento `1 / (k + posición)`, con k típico de 60, y se suman las aportaciones.

```ts
export function rrf(rankings: string[][], k = 60): { id: string; score: number }[] {
  const scores = new Map<string, number>();
  for (const ranking of rankings) {
    ranking.forEach((id, i) => scores.set(id, (scores.get(id) ?? 0) + 1 / (k + i + 1)));
  }
  return [...scores.entries()].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score);
}

// const fused = rrf([bm25Ids, vectorIds]).slice(0, 5);
```

RRF tiene la ventaja de no necesitar que las puntuaciones de BM25 y del coseno estén en la misma escala: solo usa posiciones.

### 8. Ejemplo trabajado: una consulta de punta a punta

Corpus: la documentación interna de un servicio, partida en 400 chunks. Consulta del usuario: "¿Qué significa el error EADDRINUSE al arrancar el worker?"

1. **BM25** trae primero el chunk de la guía de errores que contiene literalmente "EADDRINUSE" y explica que el puerto ya está ocupado. Segundo, un chunk del changelog que menciona el error de pasada. Tercero, un chunk sin relación que repite mucho "worker".
2. **Búsqueda por embeddings** trae primero un chunk sobre "conflictos de puertos al iniciar procesos" (relevante y redactado distinto), segundo uno sobre "el worker no arranca por falta de memoria" (parecido en significado general, pero incorrecto), tercero la guía de errores.
3. **RRF** combina ambos rankings: la guía de errores aparece en los dos (primera y tercera posición) y sube al primer lugar; el chunk de conflictos de puertos queda segundo; el chunk de memoria y el de "worker" repetido bajan.
4. **Prompt final**: instrucciones ("responde solo con el contexto; cita el id del fragmento; si no está, dilo") + los 3 primeros chunks delimitados + la consulta.
5. **Respuesta**: explica que el puerto está en uso, sugiere liberar el puerto o cambiar la configuración y cita `[errores.md#12]` y `[deploy.md#4]`.

Ahora imagina que solo usas embeddings y el chunk de memoria sale primero: el modelo podría responder con confianza "el worker se queda sin memoria". Desde fuera parecería una alucinación, pero el modelo fue **fiel al contexto equivocado**. Por eso registras qué chunks entraron en cada respuesta: así puedes distinguir un fallo de retrieval (el contexto no tenía la respuesta) de un fallo de generación (la tenía y el modelo no la usó o inventó).

### 9. Errores comunes

- Culpar al modelo cuando el problema es el retriever (mide context precision/recall antes de cambiar de LLM).
- Usar un modelo de embeddings distinto al indexar y al consultar.
- Usar solo búsqueda semántica en dominios con códigos, SKUs o nombres exactos.
- Llenar el contexto con k = 20 "por si acaso": más ruido, más costo, peor enfoque.
- No guardar qué chunks se recuperaron para cada respuesta (imposible depurar o citar).
- Olvidar que el texto recuperado es **entrada no confiable** (inyección indirecta, sesión 10).

## Conceptos clave

- **RAG**: técnica que recupera información relevante de una memoria externa y la añade al contexto antes de generar.
- **Retriever / generator**: componente que busca información y modelo que genera la respuesta con ella.
- **Indexing / querying**: preparar los datos para buscarlos después y buscar lo relevante para una consulta.
- **TF-IDF**: puntuación que combina la frecuencia de un término en un documento con lo raro que es en el corpus.
- **BM25**: variante de TF-IDF que normaliza por longitud y satura la frecuencia; línea base fuerte.
- **Índice invertido**: estructura término → documentos que lo contienen.
- **Vector database**: almacén de embeddings con búsqueda por similitud.
- **ANN**: búsqueda aproximada de vecinos más cercanos, más rápida que k-NN exacto.
- **Context precision / recall**: fracción de lo recuperado que es relevante y fracción de lo relevante que se recuperó.
- **Hybrid search / RRF**: combinar retrieval por términos y por embeddings; fusionar rankings sumando 1/(k + posición).

## Preguntas de repaso

1. ¿Por qué RAG sigue siendo útil aunque los modelos acepten contextos muy largos?
   R: Porque los datos de muchas aplicaciones crecen más que cualquier ventana de contexto y porque, aunque quepan, los modelos aprovechan peor los contextos largos y cada token añade costo y latencia; RAG envía solo lo relevante, reduciendo tokens y a menudo mejorando la respuesta.
2. Explica qué miden TF e IDF y por qué se combinan.
   R: TF mide cuántas veces aparece un término en un documento (más apariciones sugiere más relevancia); IDF mide cuán raro es el término en el corpus (los términos que aparecen en casi todos los documentos informan poco). Combinarlos premia documentos que contienen muchas veces términos informativos de la consulta.
3. ¿Qué mejora BM25 respecto a TF-IDF simple?
   R: Normaliza la frecuencia por la longitud del documento, para que los documentos largos no ganen solo por contener más palabras, y satura la contribución de repeticiones de un mismo término.
4. ¿Cuándo prefieres retrieval por términos y cuándo por embeddings?
   R: Por términos cuando importan palabras exactas (códigos de error, nombres de producto, IDs), se busca velocidad y bajo costo. Por embeddings cuando las consultas son naturales, con sinónimos o paráfrasis, y el significado importa más que las palabras exactas. A menudo se combinan.
5. ¿Por qué la context recall es más difícil de medir en producción que la precision?
   R: Porque para la recall hay que saber cuáles de todos los documentos del corpus son relevantes para cada consulta, lo que exige anotar el corpus entero; para la precision basta juzgar los pocos documentos recuperados.
6. ¿Cómo funciona RRF y por qué es práctico para hybrid search?
   R: Cada retriever produce un ranking y cada documento suma 1/(k + posición) por cada ranking en que aparece; se ordena por la suma. Es práctico porque solo usa posiciones, así que no hay que normalizar puntuaciones de escalas distintas como BM25 y coseno.

## Ejercicio

Toma 6–10 archivos markdown de este módulo (o tus apuntes). Pártelos en párrafos, indexa con `buildBM25` y con embeddings de `qwen3-embedding` (k-NN exacto). Escribe 10 consultas: 4 con palabras exactas del texto, 4 parafraseadas y 2 con un término técnico raro (por ejemplo, "RRF" o "IVF"). Anota a mano qué párrafos son relevantes para cada una. Calcula precision@3, recall@3 y MRR para BM25, embeddings y la fusión RRF. Terminado cuando tienes una tabla con las tres estrategias y las tres métricas, separada por tipo de consulta, y una conclusión de cuál usarías.

## Explícalo con tus palabras

Explica a un compañero por qué en un RAG "el modelo inventó la respuesta" muchas veces es en realidad un problema del retriever, y cómo lo comprobarías.
