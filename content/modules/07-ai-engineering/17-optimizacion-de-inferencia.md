---
title: Optimización de inferencia — métricas, cuellos de botella y técnicas
kind: lesson
hours: 2
sources: AI Engineering (Chip Huyen), cap. 9, Understanding Inference Optimization, Inference Optimization (pp. 773–851)
links: vLLM documentation | https://docs.vllm.ai
---

## Objetivo

Entender qué hace lento y caro servir un LLM (compute-bound vs memory bandwidth-bound, prefill vs decode), medir bien (TTFT, TPOT, percentiles, throughput, goodput, utilización), y conocer las técnicas de optimización a nivel de modelo (compresión, speculative decoding, inference with reference, parallel decoding, KV cache y attention) y de servicio (batching, separar prefill y decode, prompt caching, paralelismo), sabiendo cuáles puedes aplicar tú usando una API.

## Estudio

### 1. Dónde ocurre la inferencia

En producción, el **inference server** aloja los modelos y el hardware, recibe peticiones, asigna recursos y devuelve respuestas; forma parte de un **inference service** que además enruta y preprocesa. Si usas una API (como NaN Builders), el proveedor implementa casi todo lo de esta sesión. Aun así te sirve para: elegir proveedor y modelo, entender precios y latencias, diseñar prompts que salgan más baratos y rápidos, y decidir cuándo alojar tú un modelo.

### 2. Los dos cuellos de botella

Optimizar es encontrar el cuello de botella y atacarlo:

- **Compute-bound**: el tiempo lo determina la cantidad de cálculo (como descifrar contraseñas). Se acelera con más chips o chips con más FLOP/s.
- **Memory bandwidth-bound**: el tiempo lo determina la velocidad de mover datos entre memoria y procesador. Se acelera con más **ancho de banda** de memoria. (Ojo: "memory-bound" a veces se usa para falta de **capacidad** de memoria, el famoso OOM.)

Una operación se clasifica por su **intensidad aritmética** (operaciones por byte leído); las herramientas de profiling la muestran en un gráfico "roofline".

En un LLM:

| Fase | Qué hace | Cuello de botella |
| --- | --- | --- |
| **Prefill** | Procesa todos los tokens de entrada en paralelo | **Compute-bound** |
| **Decode** | Genera un token cada vez; en cada paso relee pesos enormes y el KV cache | **Memory bandwidth-bound** |

Por eso los generadores de imágenes suelen ser compute-bound y los LLM, sobre todo en decode, bandwidth-bound. Y por eso, como verás, en producción se separan prefill y decode en máquinas distintas.

#### APIs online vs batch

- **Online**: optimizan latencia; procesan en cuanto llega la petición.
- **Batch**: optimizan costo; agrupan, usan hardware más barato y devuelven en horas, a menudo con descuentos importantes (del orden del 50 %).

Casos ideales para batch: generar datos sintéticos (sesión 16), informes periódicos, procesar documentos de un cliente nuevo, migrar a otro modelo reprocesando todo, reindexar una base de conocimiento, ejecutar tu **evaluación** nocturna.

El **streaming** devuelve tokens a medida que se generan: reduce la espera percibida, pero no puedes evaluar la respuesta completa antes de mostrarla (puedes retirarla después si un guardrail la detecta).

### 3. Métricas de inferencia

#### Latencia

`latencia total = TTFT + TPOT × (tokens de salida)`

- **TTFT** (*time to first token*): duración del prefill; crece con la longitud de la entrada. En un chat debe ser casi instantánea; para resumir un documento largo se tolera más.
- **TPOT** (*time per output token*): con streaming, basta con ser algo más rápido que la lectura humana (unos 6–8 tokens por segundo). Con 100 ms por token, 1 000 tokens tardan 100 s.
- **TBT / ITL**: tiempo entre tokens.

Dos sistemas con la misma latencia total pueden sentirse muy distintos (primer token inmediato pero lento después, o al revés). Con CoT o agentes, el modelo genera tokens internos que el usuario no ve: mide **time to publish**, el primer token que **ve** el usuario.

**Usa percentiles, no promedios.** Con TTFTs de 100, 102, 100, 100, 99, 104, 110, 90, 3 000 y 95 ms, el promedio es 390 ms y engaña: la mediana (p50) es unos 100 ms y hay un outlier que investigar (red, prompt gigante). Mira p50, p90, p95 y p99, y grafica TTFT contra longitud de entrada.

```ts
// mide TTFT y TPOT reales con streaming (SSE) en una API compatible con OpenAI
export async function measureStream(prompt: string) {
  const t0 = performance.now();
  const res = await fetch("https://api.nan.builders/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NAN_API_KEY}` },
    body: JSON.stringify({ model: "deepseek-v4-flash", stream: true, messages: [{ role: "user", content: prompt }] }),
  });
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let ttft = 0, chunks = 0, buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
      const delta = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content;
      if (!delta) continue;
      if (!ttft) ttft = performance.now() - t0;
      chunks++; // aproximación: un chunk ≈ un token
    }
  }
  const total = performance.now() - t0;
  return { ttftMs: Math.round(ttft), tpotMs: Math.round((total - ttft) / Math.max(chunks - 1, 1)), totalMs: Math.round(total) };
}

export const percentile = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
```

#### Throughput, goodput y costo

- **Throughput**: tokens de salida por segundo para todos los usuarios (cuenta entrada y salida por separado: tienen cuellos de botella distintos). También peticiones completadas por minuto.
- El throughput se traduce directamente en **costo**: si una máquina cuesta 2 USD/h y genera 100 tokens/s, el millón de tokens de salida cuesta unos 5.56 USD. Comparar throughput entre modelos con tokenizers distintos es engañoso; mejor **costo por petición**.
- Hay un compromiso **latencia–throughput**: agrupar más peticiones puede duplicar o triplicar el throughput empeorando TTFT y TPOT.
- **Goodput**: peticiones por segundo que **cumplen el SLO** (por ejemplo, TTFT ≤ 200 ms y TPOT ≤ 100 ms). Si completas 100 por minuto pero solo 30 cumplen, tu goodput es 30.

```ts
export function costPerMillionOutput(usdPerHour: number, tokensPerSecond: number) {
  return (usdPerHour / (tokensPerSecond * 3600)) * 1_000_000;
}
console.log(costPerMillionOutput(2, 100).toFixed(2)); // ≈ 5.56 USD
```

Con APIs, el cálculo es directo: `costo = tokens_entrada × precio_entrada + tokens_salida × precio_salida`. Los tokens de salida suelen costar varias veces más que los de entrada, y en latencia un token de salida puede pesar como decenas o cien tokens de entrada. **Pedir respuestas más cortas es la optimización más barata que existe.**

#### Utilización

La "GPU utilization" de las herramientas típicas mide el porcentaje de **tiempo** que la GPU estuvo ocupada, no cuánto de su capacidad usó: puede marcar 100 % haciendo muy poco trabajo. Métricas más útiles:

- **MFU** (*model FLOP/s utilization*): FLOP/s logrados / FLOP/s pico del chip.
- **MBU** (*model bandwidth utilization*): ancho de banda usado / ancho de banda pico. Relevante en decode.

Valores de MFU alrededor del 50 % ya se consideran buenos en entrenamiento; en inferencia suelen ser más bajos.

### 4. Aceleradores, en una página

Las GPUs dominan, pero hay chips específicos (TPUs y otros), algunos diseñados solo para inferencia (que necesita menos precisión y más ancho de banda). Al comparar hardware mira: **FLOP/s** por formato numérico (FP32, FP16, FP8, INT8), **capacidad y ancho de banda de memoria** (memoria de alto ancho de banda, más pequeña y rápida en chip), **consumo eléctrico** (parte grande del costo) y **precio**. Recuerda la sesión 15: muchos modelos tienen tamaños pensados para llenar memorias típicas de GPU.

### 5. Optimización a nivel de modelo

Un transformer autoregresivo es caro por tres razones: **tamaño**, **decodificación secuencial** y **attention**. Estas técnicas pueden cambiar el comportamiento del modelo, así que **reevalúa** tras aplicarlas.

#### Compresión

- **Cuantización** (sesión 15): la más popular, sobre todo solo de pesos; fácil y muy efectiva.
- **Destilación** (sesión 16): un modelo pequeño que imita a uno grande para tu tarea.
- **Pruning**: quitar nodos o poner a cero parámetros poco útiles (modelo disperso). Prometedor en papers, menos usado en la práctica: más difícil y no todo hardware aprovecha la dispersión.

#### Superar el cuello de botella autoregresivo

- **Speculative decoding**: un modelo pequeño y rápido (*draft*) propone K tokens; el modelo objetivo los **verifica en paralelo** (verificar es como un prefill, mucho más barato que generar) y acepta el prefijo más largo con el que está de acuerdo, añadiendo un token propio. Si acepta todo, obtienes K + 1 tokens por paso. Funciona porque muchos tokens son fáciles de predecir y porque en decode sobran FLOPs ociosos. **No cambia la calidad** del modelo objetivo. Con un draft ocho veces más rápido se ha reducido la latencia a menos de la mitad. Funciona mejor en texto muy estructurado como código.
- **Inference with reference**: en vez de un draft, copia tramos de la **entrada** (útil cuando la salida repite mucho del contexto: RAG, edición de código, conversaciones). Hasta unas dos veces más rápido en esos casos.
- **Parallel decoding**: generar varios tokens futuros a la vez (con el mismo decoder o con "cabezas" extra entrenadas para predecir posiciones futuras) y luego verificarlos e integrarlos. Prometedor pero menos intuitivo y más difícil de implementar.

#### Attention y KV cache

Para generar cada token se necesitan las keys y values de todos los anteriores. El **KV cache** las guarda para no recalcularlas: solo se calculan las del token nuevo. Pero ocupa mucha memoria y crece con la longitud del contexto y el tamaño del lote:

`KV cache ≈ 2 (K y V) × capas × dimensión del modelo × tokens × lote × bytes`

```ts
export function kvCacheGB(layers: number, dModel: number, tokens: number, batch: number, bytes = 2) {
  return (2 * layers * dModel * tokens * batch * bytes) / 1e9;
}
// modelo de 32 capas y dimensión 4096, contexto de 8 000 tokens, 16 peticiones simultáneas, FP16:
console.log(kvCacheGB(32, 4096, 8000, 16).toFixed(1)); // ≈ 67 GB: más que los propios pesos
```

Técnicas para reducirlo: atención local o por ventanas (solo los tokens cercanos), **compartir** keys y values entre cabezas (multi-query y grouped-query attention), compartir el cache entre capas, cuantizar el KV cache, y gestionar su memoria en páginas para no desperdiciarla. También existen **kernels** optimizados (por ejemplo, implementaciones de attention que minimizan movimientos de memoria) y **compiladores** que adaptan el modelo a cada hardware fusionando operaciones.

### 6. Optimización a nivel de servicio

Estas técnicas gestionan recursos y **no cambian la calidad** de las salidas.

#### Batching

Agrupar peticiones es como pasar de que cada persona vaya en su coche a ir en autobús: más gente transportada, quizá viajes algo más largos.

| Tipo | Funcionamiento | Problema |
| --- | --- | --- |
| **Estático** | Espera a llenar el lote | La primera petición espera a la última |
| **Dinámico** | Sale cuando se llena o al pasar una ventana de tiempo (por ejemplo, 100 ms) | Lotes a medio llenar desperdician cómputo |
| **Continuo** (*in-flight*) | Cada respuesta se devuelve al terminar y su hueco lo ocupa otra petición | Más complejo, pero estándar en servidores modernos |

Sin batching continuo, una respuesta de 10 tokens esperaría a otra de 1 000 del mismo lote.

#### Separar prefill y decode

Como prefill (compute) y decode (ancho de banda) compiten por recursos distintos, meter un prefill nuevo en una GPU que está decodificando ralentiza a todos. Asignarlos a instancias distintas mejora el volumen atendido dentro del SLO, con un costo de transferencia pequeño en clústeres con conexiones rápidas. La proporción depende de la carga: entradas largas y prioridad en TTFT → más instancias de prefill (2:1 a 4:1); entradas cortas y prioridad en TPOT → más de decode.

#### Prompt caching

Muchos prompts comparten segmentos: el system prompt, un documento largo sobre el que se hacen muchas preguntas, el historial de una conversación. Un **prompt cache** (o *prefix cache*) procesa ese prefijo una vez y lo reutiliza. Con un system prompt de 1 000 tokens y un millón de llamadas al día, te ahorras procesar mil millones de tokens diarios. Proveedores lo ofrecen con descuentos fuertes en tokens cacheados y reducciones grandes de TTFT (por ejemplo, conversar con un libro de 100 000 tokens pasó de más de 11 s a unos 2 s de TTFT en cifras publicadas).

Implicación de diseño para ti: **pon lo estable al principio y lo variable al final**. El caching suele funcionar por **prefijo**: si insertas la fecha o el nombre del usuario al inicio del system prompt, rompes la caché en cada petición.

```ts
// bien: prefijo estable (instrucciones + ejemplos + documento) y al final lo variable
const messages = [
  { role: "system", content: STABLE_INSTRUCTIONS + FEW_SHOT_EXAMPLES },  // idéntico en todas las llamadas
  { role: "user", content: `<documento>${LONG_DOC}</documento>` },       // idéntico para preguntas sobre el mismo doc
  { role: "user", content: `Hoy es ${today}. Pregunta: ${question}` },   // variable, al final
];
```

#### Paralelismo

- **Réplicas**: varias copias del modelo para atender más peticiones a la vez (encajar modelos de distintos tamaños en GPUs de distintas memorias es un problema de *bin packing*).
- **Paralelismo de modelo** cuando no cabe en una máquina: **tensor parallelism** (partir cada matriz entre chips; reduce latencia pero exige comunicación rápida) y **pipeline parallelism** (repartir capas entre chips; útil para throughput, añade latencia).
- **Paralelismo de contexto y secuencia**: repartir secuencias muy largas entre dispositivos.

### 7. Ejemplo trabajado: el tutor tarda demasiado

Tu tutor de estudio corrige una respuesta en tres pasos: reescribe la pregunta (1 llamada), recupera fragmentos de apuntes (embedding + búsqueda) y califica con un juez que razona antes de dar la nota (1 llamada larga). Mides 50 ejecuciones: p50 de 6.5 s y p90 de 14 s hasta que el usuario ve la nota. Desglosas con trazas:

| Paso | p50 | Observación |
| --- | --- | --- |
| Reescritura | 0.9 s | Respuesta corta; casi todo es TTFT |
| Embedding + búsqueda | 0.3 s | Despreciable |
| Juez | 5.3 s | 350 tokens de razonamiento + 20 de nota; TTFT 1.2 s con un prompt de 4 000 tokens |

Decisiones:

1. El juez escribe 350 tokens que el usuario nunca lee. Limitas el razonamiento a "máximo 2 frases" y `max_tokens`: el paso baja a unos 2.5 s sin perder coincidencia con tus notas en el evalset (lo compruebas, no lo asumes).
2. Reordenas el prompt del juez: rúbrica y ejemplos (estables) primero, pregunta y respuesta del estudiante al final, para aprovechar el prompt caching del proveedor. El TTFT del juez baja a la mitad en llamadas consecutivas.
3. La reescritura solo hace falta en preguntas de seguimiento: la omites cuando el mensaje es la primera respuesta a una pregunta del temario.
4. Muestras la nota en streaming y la retroalimentación después.

Resultado: p50 de 2.8 s y p90 de 5 s. Ninguna de estas mejoras requirió tocar hardware: todas son decisiones de producto y de prompt guiadas por medición.

### 8. Qué puedes hacer tú hoy (usando una API)

| Palanca | Efecto |
| --- | --- |
| Respuestas más cortas (instrucción + `max_tokens`) | Menos TPOT total y costo de salida |
| Prompts estables al principio | Aprovechas prompt caching |
| Streaming en la interfaz | Menor espera percibida |
| API batch para evaluación, síntesis e informes | Menor costo |
| Modelo más pequeño para pasos simples (clasificación, reescritura) | Menor latencia y costo |
| Paralelizar llamadas independientes (`Promise.all` con límite) | Menor latencia total |
| Cachear respuestas a preguntas idénticas (sesión 18) | Latencia casi cero en repetidas |
| Medir p50/p90/p99 por endpoint y por longitud de entrada | Detectar regresiones y outliers |

Errores comunes: optimizar el promedio y no los percentiles; medir TTFT del modelo y no el que ve el usuario; poner datos variables al inicio del prompt; comparar throughput entre modelos con tokenizers distintos; cuantizar o cambiar de modelo sin reevaluar calidad.

## Conceptos clave

- **Compute-bound vs memory bandwidth-bound**: limitado por cálculo frente a limitado por la velocidad de mover datos.
- **TTFT / TPOT**: tiempo hasta el primer token y tiempo por token de salida.
- **Percentiles (p50, p90, p99)**: describen la distribución de la latencia mejor que el promedio.
- **Throughput / goodput**: tokens o peticiones por segundo totales frente a las que cumplen el SLO.
- **MFU / MBU**: fracción de FLOP/s o de ancho de banda pico realmente usada.
- **Speculative decoding**: un modelo borrador propone tokens que el modelo objetivo verifica en paralelo.
- **KV cache**: almacenamiento de keys y values de tokens previos para no recalcularlos.
- **Continuous batching**: lote en el que cada petición sale al terminar y otra ocupa su lugar.
- **Prefill/decode disaggregation**: ejecutar prefill y decode en instancias separadas.
- **Prompt caching**: reutilizar el procesamiento de prefijos repetidos entre peticiones.

## Preguntas de repaso

1. ¿Por qué el prefill es compute-bound y el decode memory bandwidth-bound?
   R: En el prefill se procesan muchos tokens de entrada en paralelo, así que el límite es cuántas operaciones puede hacer el hardware; en el decode se genera un token por paso y en cada paso hay que leer los pesos y el KV cache desde memoria, así que el límite es la velocidad de transferencia.
2. ¿Por qué hay que mirar percentiles de latencia en vez del promedio?
   R: Porque la latencia es una distribución con outliers; unos pocos casos muy lentos inflan el promedio y ocultan cómo es la experiencia típica, mientras que p50 muestra el caso típico y p90 o p99 revelan la cola y los problemas a investigar.
3. ¿Qué es el goodput y por qué puede ser más útil que el throughput?
   R: Es el número de peticiones por segundo que cumplen los objetivos de latencia (SLO). Es más útil porque se puede aumentar el throughput agrupando peticiones a costa de empeorar la latencia, y lo que importa es cuántas peticiones se atienden con una experiencia aceptable.
4. Explica speculative decoding y por qué no cambia la calidad.
   R: Un modelo pequeño propone varios tokens y el modelo objetivo los verifica en paralelo, aceptando el prefijo más largo con el que coincide y añadiendo un token propio. La calidad no cambia porque el texto final es el que el modelo objetivo habría aceptado; solo se ahorra tiempo cuando el borrador acierta.
5. ¿Por qué el KV cache puede superar en memoria a los pesos del modelo?
   R: Porque crece con el número de capas, la dimensión del modelo, la longitud del contexto y el número de peticiones simultáneas; con contextos largos y lotes grandes su tamaño puede superar al de los pesos.
6. ¿Cómo diseñarías un prompt para aprovechar el prompt caching?
   R: Colocando al principio todo lo que se repite entre peticiones (instrucciones, ejemplos, documentos compartidos) exactamente igual en cada llamada, y al final lo variable (fecha, datos del usuario, la pregunta), ya que la caché reutiliza prefijos idénticos.
7. ¿Qué ventaja tiene el batching continuo sobre el estático?
   R: Cada respuesta se devuelve en cuanto termina y su lugar en el lote lo ocupa una nueva petición, de modo que las respuestas cortas no esperan a las largas y el hardware se mantiene ocupado.

## Ejercicio

Con `measureStream`, ejecuta 30 peticiones a `deepseek-v4-flash`: 10 con prompt corto y respuesta corta ("responde en una frase"), 10 con prompt corto y respuesta larga ("explica en 400 palabras") y 10 con un prompt largo (unos 3 000 tokens de contexto) y respuesta corta. Calcula p50 y p90 de TTFT, TPOT y latencia total para cada grupo y estima el costo por petición con los precios de tu proveedor. Después repite el grupo de prompt largo poniendo el contexto como prefijo idéntico en las 10 llamadas y la pregunta al final, y compara el TTFT. Terminado cuando tienes una tabla de los tres grupos (más la variante de prefijo estable) con p50/p90 y costo, y dos conclusiones sobre qué afecta a TTFT y qué a TPOT.

## Explícalo con tus palabras

Explica a alguien por qué su chatbot tarda en empezar a responder cuando le pega un documento largo, pero escribe rápido una vez que empieza, y qué haría para mejorar ambas cosas.
