---
title: RAG II — chunking, reranking, query rewriting y RAG más allá del texto
kind: lesson
hours: 2
sources: AI Engineering (Chip Huyen), cap. 6, Retrieval Optimization y RAG Beyond Texts (pp. 520–535)
links: Anthropic, Introducing Contextual Retrieval | https://www.anthropic.com/news/contextual-retrieval
---

## Objetivo

Mejorar un sistema RAG con las cuatro tácticas principales de optimización (estrategia de chunking, reranking, reescritura de consultas y contextual retrieval), saber evaluar una solución de retrieval y entender cómo se extiende RAG a imágenes y a datos tabulares (texto a SQL).

## Estudio

### 1. Dónde se gana calidad en un RAG

En la sesión 11 viste que **la calidad del retriever manda**. Antes de cambiar de modelo generador o de agrandar el contexto, hay cuatro palancas que aumentan la probabilidad de recuperar lo correcto:

| Táctica | Actúa en | Pregunta que responde |
| --- | --- | --- |
| **Chunking** | Indexing | ¿Qué unidades de texto indexo? |
| **Reranking** | Querying (después de recuperar) | ¿Cuáles de los candidatos van realmente al prompt y en qué orden? |
| **Query rewriting** | Querying (antes de recuperar) | ¿La consulta tiene sentido por sí sola? |
| **Contextual retrieval** | Indexing | ¿Cada chunk lleva la información necesaria para encontrarlo? |

### 2. Chunking: cómo partir los documentos

Cómo indexas depende de cómo vas a recuperar, y la estrategia de chunking **afecta mucho** el rendimiento.

#### Estrategias

- **Longitud fija** por una unidad: caracteres (por ejemplo, 2 048), palabras (512), oraciones (20) o párrafos (uno por chunk).
- **Recursiva**: partes por secciones; si una sección es demasiado larga, por párrafos; si un párrafo sigue siendo largo, por oraciones. Reduce la probabilidad de cortar ideas relacionadas.
- **Específica del formato**: hay divisores para código según el lenguaje; los documentos de preguntas frecuentes se parten por par pregunta–respuesta; en markdown, por encabezados. Idiomas como el chino requieren reglas distintas.
- **Por tokens** del tokenizer del modelo generador: facilita encajar en el contexto, pero si cambias de modelo (y de tokenizer) tendrás que reindexar.

#### Solapamiento

Sin solapamiento puedes cortar justo donde está la información clave. "Le dejé una nota a mi esposa" partido en "Le dejé una nota" y "a mi esposa" pierde el sentido en ambos trozos. El **overlap** (por ejemplo, 2 048 caracteres por chunk con un pequeño solapamiento) asegura que la información de la frontera esté completa en al menos un chunk.

#### Tamaño: el gran compromiso

| Chunks pequeños | Chunks grandes |
| --- | --- |
| Caben más en el contexto: información más diversa | Menos chunks por respuesta |
| Riesgo de perder contexto: un documento habla de X en todo su texto pero solo nombra X en la primera mitad; la segunda mitad no se recupera | Más contexto por chunk |
| Más chunks: más embeddings que calcular y guardar, búsqueda más lenta | Menos costo de indexación |
| Más preciso para preguntas concretas | Mejor para preguntas que requieren contexto amplio |

Límites duros: el chunk no debe superar la ventana de contexto del generador ni el límite de entrada del modelo de embeddings. **No hay tamaño universal**: experimenta con tu evaluación (sesiones 11 y 13).

```ts
// chunking por encabezados markdown con fallback a ventanas con solapamiento
export type MdChunk = { id: string; source: string; heading: string; text: string };

export function chunkMarkdown(source: string, md: string, maxChars = 1200, overlap = 150): MdChunk[] {
  const sections = md.split(/\n(?=#{1,3} )/); // corta antes de cada encabezado #, ## o ###
  const chunks: MdChunk[] = [];
  for (const section of sections) {
    const heading = section.match(/^#{1,3} (.+)/)?.[1] ?? "(sin título)";
    if (section.length <= maxChars) {
      chunks.push({ id: `${source}#${chunks.length}`, source, heading, text: section.trim() });
      continue;
    }
    for (let start = 0; start < section.length; start += maxChars - overlap) {
      const text = section.slice(start, start + maxChars).trim();
      if (text) chunks.push({ id: `${source}#${chunks.length}`, source, heading, text });
    }
  }
  return chunks;
}
```

Observa que cada chunk guarda `source` y `heading`: los usarás para **citar** y para el contextual retrieval.

### 3. Reranking

El ranking inicial del retriever puede reordenarse para ser más preciso. Es especialmente útil cuando necesitas **reducir** el número de documentos (para que quepan o para gastar menos tokens).

Patrones:

- **Barato primero, caro después**: el patrón de la sesión 11. Un retriever rápido trae, por ejemplo, 50 candidatos y un mecanismo más preciso los reordena para quedarse con 5. El mecanismo preciso puede ser búsqueda vectorial sobre los candidatos, un modelo **cross-encoder** que lee consulta y documento juntos (más preciso que comparar embeddings por separado), o incluso un LLM que puntúa relevancia.
- **Por tiempo**: dar más peso a lo reciente. Clave en noticias, chat con tu correo o análisis de mercado.

Diferencia con el reranking de un buscador: en búsqueda web, la posición exacta (primero vs quinto) es crucial porque el usuario ve una lista. En reranking de **contexto**, importa sobre todo **qué entra**; el orden importa algo (los modelos atienden mejor el principio y el final del contexto), pero menos.

```ts
// rerank con LLM: puntúa relevancia 0–3 de cada candidato y se queda con los mejores
export async function llmRerank(query: string, candidates: MdChunk[], keep = 4) {
  const scored = await Promise.all(
    candidates.map(async (c) => {
      const out = await chat([
        { role: "system", content: "Puntúa de 0 a 3 cuánto ayuda el FRAGMENTO a responder la PREGUNTA. 3 = la responde directamente. Responde solo el número." },
        { role: "user", content: `PREGUNTA: ${query}\n\nFRAGMENTO:\n<<<\n${c.text}\n>>>` },
      ], 0);
      return { c, score: Number.parseInt(out.trim(), 10) || 0 };
    }),
  );
  return scored.sort((a, b) => b.score - a.score).slice(0, keep).map((s) => s.c);
}
```

Ojo con el costo: puntuar 20 candidatos son 20 llamadas extra por consulta. Para producción suelen preferirse rerankers especializados, pequeños y rápidos.

### 4. Query rewriting

También llamado reformulación, normalización o expansión de consultas. Considera esta conversación:

```
Usuario: ¿Cuándo fue la última compra de Juan Pérez?
IA:      Juan compró un sombrero hace dos semanas, el 3 de enero.
Usuario: ¿Y Ana Pérez?
```

"¿Y Ana Pérez?" no sirve como consulta para el retriever: traerá cualquier cosa sobre Ana. Hay que **reescribirla para que tenga sentido sola**: "¿Cuándo fue la última compra de Ana Pérez?". En buscadores tradicionales se hacía con heurísticas; con IA puedes usar un modelo con un prompt del tipo "dada la conversación, reescribe la última pregunta del usuario para que se entienda sin contexto".

Puede complicarse: "¿Y su esposa?" exige primero saber quién es la esposa (resolución de identidades). Si no tienes esa información, el reescritor **debe decir que no puede resolverla**, no inventar un nombre.

```ts
export async function rewriteQuery(history: Msg[], lastUserMsg: string): Promise<string> {
  const transcript = history.map((m) => `${m.role}: ${m.content}`).join("\n");
  const out = await chat([
    {
      role: "system",
      content:
        "Reescribe la última pregunta del usuario para que se entienda sin la conversación. " +
        "No respondas la pregunta. Si falta información para resolver a quién o qué se refiere, devuelve exactamente: NO_RESUELTA",
    },
    { role: "user", content: `Conversación:\n${transcript}\n\nÚltima pregunta: ${lastUserMsg}` },
  ], 0);
  return out.trim();
}
```

Variantes útiles: **expansión** (añadir sinónimos o términos relacionados para BM25), **descomposición** (una pregunta compuesta en varias consultas) y **HyDE**-like (generar una respuesta hipotética y buscar con su embedding; útil cuando las preguntas y los documentos se redactan muy distinto). Todas cuestan una llamada extra: mide si compensan.

### 5. Contextual retrieval

Idea: **enriquecer cada chunk** con contexto que facilite encontrarlo.

- **Metadatos**: etiquetas, palabras clave, título, fecha, autor. En e-commerce, un producto se enriquece con su descripción y reseñas; imágenes y videos se buscan por título o subtítulos.
- **Entidades extraídas**: si un documento contiene `EADDRNOTAVAIL (99)`, guardar ese código como metadato permite encontrarlo por palabra clave aunque el texto se haya convertido en embedding.
- **Preguntas que el chunk responde**: el artículo "cómo restablecer tu contraseña" se enriquece con "olvidé mi contraseña", "no puedo entrar", "ayuda, no encuentro mi cuenta". Así las consultas de usuarios, que se redactan distinto que los artículos, encuentran el chunk.
- **Contexto del documento original**: un chunk suelto ("el plazo se amplía a 30 días") puede no decir de qué trata. Se le antepone el título y un resumen, o un contexto de 50–100 tokens generado por un modelo que lee el documento completo y explica dónde encaja ese chunk. Ese texto enriquecido es lo que se indexa (en BM25 y en embeddings).

```ts
// contextual retrieval: prefijo generado por chunk (se ejecuta una vez al indexar)
export async function situateChunk(fullDoc: string, chunk: MdChunk): Promise<string> {
  const ctx = await chat([
    {
      role: "user",
      content:
        `<documento>\n${fullDoc}\n</documento>\n\nEste es el fragmento que queremos ubicar:\n<fragmento>\n${chunk.text}\n</fragmento>\n\n` +
        "Escribe un contexto breve (máx. 2 frases) que sitúe el fragmento dentro del documento para mejorar su búsqueda. Responde solo con el contexto.",
    },
  ], 0);
  return `${ctx.trim()}\nSección: ${chunk.heading}\n\n${chunk.text}`;
}
```

Costo: una llamada por chunk al indexar (no por consulta). Para documentos largos, el prompt incluye el documento entero muchas veces; el prompt caching de algunos proveedores lo abarata (sesión 17).

### 6. Evaluar una solución de retrieval

Si eliges una herramienta o servicio, pregúntate:

- ¿Qué mecanismos soporta? ¿Hybrid search?
- Si es vector DB: ¿qué modelos de embeddings y algoritmos de búsqueda soporta?
- ¿Escala en datos y en tráfico? ¿Encaja con tus patrones de uso?
- ¿Cuánto tarda en indexar? ¿Cuánto puedes añadir o borrar en bloque?
- ¿Qué latencia de consulta tiene con cada algoritmo?
- Si es gestionado: ¿cobra por volumen de vectores o por consultas?
- Y lo empresarial: control de acceso (¿un usuario puede recuperar documentos que no debería ver?), cumplimiento normativo.

El control de acceso merece énfasis: si indexas documentos de todos los usuarios en un mismo índice, el filtro por permisos debe aplicarse **en el retrieval**, no confiar en que el modelo "no lo mencione".

### 7. RAG más allá del texto

#### RAG multimodal

Si el generador es multimodal, el contexto puede incluir imágenes, audio o video. Para "¿De qué color es la casa de la película X?", el retriever puede traer una imagen de la casa. Dos formas de recuperar imágenes:

- Por **metadatos** (título, etiquetas, pie de foto): se recupera la imagen si su descripción es relevante.
- Por **contenido**: con un modelo de embeddings multimodal que pone texto e imágenes en el mismo espacio. Generas embeddings de todo (textos e imágenes), embebes la consulta y traes lo más cercano, sea texto o imagen.

#### RAG con datos tabulares

Muchas preguntas se responden con tablas, no con documentos. En una tienda online con una tabla `Sales`, "¿Cuántas unidades del sombrero X se vendieron en los últimos 7 días?" requiere una consulta SQL, no buscar chunks. El flujo es distinto:

```
pregunta + esquemas de tablas ─► text-to-SQL ─► ejecutar SQL ─► resultado ─► generar respuesta
```

1. **Text-to-SQL**: con la pregunta y los esquemas, el modelo genera la consulta (es *semantic parsing*, sesión 3). Si hay demasiadas tablas para el contexto, un paso previo predice cuáles usar.
2. **Ejecución** del SQL.
3. **Generación** de la respuesta con el resultado.

Seguridad (sesión 10): conexión de **solo lectura**, límites de tiempo y filas, validación del SQL generado y nunca concatenar texto del usuario como si fuera SQL.

```ts
const SCHEMA = `Tabla sales(order_id INT, ts TIMESTAMP, product_name TEXT, units INT, unit_price REAL)`;

export async function answerFromTable(question: string, runReadOnly: (sql: string) => Promise<unknown[]>) {
  const sql = (await chat([
    { role: "system", content: `Genera UNA consulta SQLite de solo lectura (SELECT) para responder. Esquema:\n${SCHEMA}\nDevuelve solo el SQL.` },
    { role: "user", content: question },
  ], 0)).replace(/```sql|```/g, "").trim();

  if (!/^select\b/i.test(sql) || /;\s*\S/.test(sql)) throw new Error(`SQL rechazado: ${sql}`);
  const rows = await runReadOnly(sql); // conexión de solo lectura, con timeout y límite de filas
  return chat([
    { role: "system", content: "Responde la pregunta usando solo el resultado de la consulta. Si está vacío, dilo." },
    { role: "user", content: `Pregunta: ${question}\nSQL: ${sql}\nResultado: ${JSON.stringify(rows).slice(0, 4000)}` },
  ], 0);
}
```

### 8. Un plan de mejora ordenado

Cuando tu RAG responde mal, sigue este orden (de barato a caro):

1. **Diagnostica**: ¿el chunk correcto estaba en el contexto? Si no, es retrieval; si sí, es generación (prompt o modelo).
2. **Chunking**: prueba tamaño y solapamiento; respeta la estructura del documento.
3. **Hybrid search** (BM25 + embeddings con RRF), sobre todo si hay términos exactos.
4. **Query rewriting** si es conversacional.
5. **Reranking** si recuperas muchos candidatos ruidosos.
6. **Contextual retrieval** si los chunks sueltos son ambiguos.
7. Solo después: cambiar el modelo de embeddings, ajustarlo, o cambiar el generador.

Cada paso, medido con tu conjunto de consultas y las métricas de la sesión 11.

### 9. Ejemplo trabajado: diagnosticar un RAG que responde mal

Un asistente responde preguntas sobre el reglamento de una empresa. Los usuarios se quejan de que "inventa". Revisas 30 respuestas malas con el registro de chunks recuperados y las clasificas:

| Causa | Casos | Evidencia |
| --- | --- | --- |
| El chunk correcto no se recuperó | 14 | Consultas como "¿cuántos días tengo si me caso?" no recuperan el chunk "licencia por matrimonio: 15 días hábiles" (vocabulario distinto) |
| Se recuperó, pero cortado | 6 | El chunk termina en "salvo en los siguientes casos:" y la lista quedó en el siguiente |
| Se recuperó entero y el modelo lo ignoró o lo contradijo | 5 | El contexto dice 15 días y la respuesta dice 10 |
| Pregunta de seguimiento ambigua | 5 | "¿Y si es en otro país?" sin reescritura |

Decisiones derivadas, de mayor a menor impacto:

1. Los 14 casos de vocabulario: añadir **preguntas generadas por chunk** (contextual retrieval) y **hybrid search**. Tras el cambio, la recall@5 en tu conjunto de 60 consultas sube de 0.62 a 0.84.
2. Los 6 casos de corte: chunking por **secciones del reglamento** en lugar de por longitud fija, sin partir listas.
3. Los 5 de seguimiento: **query rewriting** con salida `NO_RESUELTA` cuando falte información.
4. Los 5 de generación: reforzar el prompt ("responde usando solo el contexto y cita el artículo"), bajar la temperature y añadir al evalset un juez de factual consistency local.

Fíjate en que 25 de 30 fallos no eran del modelo generador. Cambiar a un LLM más caro no habría arreglado casi nada.

Un detalle de método: antes de aplicar los cambios, congelas el conjunto de 60 consultas con sus chunks relevantes anotados y guardas el resultado del sistema actual como línea base. Cada cambio se aplica por separado y se mide contra esa línea base; así sabes cuánto aportó cada uno y puedes descartar los que añaden costo sin mejorar la recall.

### 10. RAG frente a contexto largo y finetuning (vista previa)

| Situación | Mejor punto de partida |
| --- | --- |
| Base de conocimiento pequeña y estable (pocas decenas de miles de tokens) | Meterla entera en el prompt, con caching si se repite |
| Base grande, cambiante o con permisos por usuario | RAG |
| Respuestas que dependen de datos exactos en tablas | Text-to-SQL o herramientas (agentes) |
| El modelo tiene la información pero no el formato, tono o comportamiento | Prompting y, si no basta, finetuning (sesión 15) |
| Hay que reducir latencia y costo de un prompt enorme que se repite | Finetuning o destilación de ese comportamiento |

Regla resumida que verás en detalle en la sesión 15: **RAG resuelve falta de información; finetuning resuelve falta de comportamiento**.

Errores comunes: chunks que cortan tablas o bloques de código a la mitad; perder el título del documento al partirlo; reescribir consultas inventando referentes; rerankear con un LLM caro sin medir la ganancia; no aplicar permisos en el retrieval; generar SQL con permisos de escritura.

## Conceptos clave

- **Chunking**: dividir documentos en unidades indexables; tamaño y solapamiento afectan mucho la calidad.
- **Chunking recursivo**: partir por unidades cada vez más pequeñas (sección, párrafo, oración) hasta respetar el tamaño máximo.
- **Overlap**: solapamiento entre chunks consecutivos para no perder información en las fronteras.
- **Reranking**: reordenar y filtrar los candidatos recuperados con un mecanismo más preciso.
- **Cross-encoder**: modelo que puntúa la relevancia leyendo consulta y documento a la vez.
- **Query rewriting**: reformular la consulta para que sea autocontenida antes de recuperar.
- **Contextual retrieval**: enriquecer cada chunk con metadatos, preguntas o contexto del documento antes de indexarlo.
- **RAG multimodal**: recuperar imágenes u otras modalidades por metadatos o con embeddings multimodales.
- **Text-to-SQL**: traducir una pregunta en lenguaje natural a una consulta SQL para responder con datos tabulares.

## Preguntas de repaso

1. ¿Qué ganas y qué pierdes al reducir el tamaño de los chunks a la mitad?
   R: Ganas diversidad: caben el doble de chunks en el contexto y las coincidencias son más precisas. Pierdes contexto dentro de cada chunk (partes de un tema pueden no recuperarse) y duplicas el número de chunks, con más embeddings que generar y almacenar y búsquedas más lentas.
2. ¿Para qué sirve el solapamiento entre chunks?
   R: Para que la información situada en la frontera entre dos chunks aparezca completa en al menos uno de ellos y no se pierda el sentido de una frase o idea cortada a la mitad.
3. ¿En qué se diferencia el reranking de contexto del reranking de un buscador?
   R: En un buscador la posición exacta es crucial porque el usuario lee la lista en orden; en el contexto de un RAG lo importante es qué documentos entran, y el orden influye menos, aunque los modelos atienden mejor el principio y el final.
4. ¿Por qué hay que reescribir "¿Y Ana Pérez?" antes de recuperar y qué debe hacer el reescritor si no puede resolver una referencia?
   R: Porque fuera de la conversación la consulta es ambigua y el retriever traería información irrelevante; debe convertirse en una pregunta autocontenida. Si no puede resolver a quién o qué se refiere, debe indicarlo explícitamente en lugar de inventar un referente.
5. Describe dos formas de contextual retrieval y el problema que resuelve cada una.
   R: Añadir preguntas que el chunk responde resuelve que los usuarios redacten distinto que los documentos; anteponer un contexto del documento original (título, resumen o descripción generada) resuelve que un chunk aislado no diga de qué trata y no se recupere.
6. ¿Qué cambia en el flujo de RAG cuando la respuesta está en una tabla?
   R: En lugar de recuperar chunks, el modelo traduce la pregunta a SQL usando los esquemas, se ejecuta la consulta (idealmente con permisos de solo lectura y límites) y luego el modelo genera la respuesta a partir del resultado.

## Ejercicio

Sobre el corpus y las 10 consultas de la sesión 11, prueba tres configuraciones de chunking: (a) párrafos, (b) `chunkMarkdown` con 600 caracteres y 100 de overlap, (c) `chunkMarkdown` con 1 500 y 200. Para la mejor, añade contextual retrieval con `situateChunk` y vuelve a medir. Después añade 3 consultas conversacionales (con historial) y compara recall@3 con y sin `rewriteQuery`. Terminado cuando tienes una tabla con recall@3 y MRR para las tres configuraciones, para la versión con contextual retrieval y para las consultas conversacionales con y sin reescritura.

## Explícalo con tus palabras

Explica a alguien que acaba de montar su primer RAG por qué, antes de cambiar de LLM, debería revisar cómo partió sus documentos.
