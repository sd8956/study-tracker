---
title: Foundation models por dentro — datos, transformer y escala
kind: lesson
hours: 2
sources: AI Engineering (Chip Huyen), cap. 2, Training Data, Modeling y Model Size (pp. 119–168)
links: The Illustrated Transformer | https://jalammar.github.io/illustrated-transformer/
---

## Objetivo

Entender qué determina lo que un foundation model sabe hacer: los datos con que se entrenó, la arquitectura transformer (attention, prefill y decode) y las tres cifras que describen su escala (parámetros, tokens y FLOPs), para poder razonar sobre fortalezas, debilidades, costos y límites de cualquier modelo que uses.

## Estudio

### 1. Un modelo es tan bueno como sus datos

La regla más simple y más olvidada: **un modelo no puede hacer bien lo que no vio durante el entrenamiento**. Si casi no había textos en cierto idioma, traducirá mal a ese idioma; si un clasificador de imágenes solo vio animales, fallará con plantas. Cuando eliges un modelo para tu aplicación, la primera pregunta útil es: ¿con qué datos se entrenó y se parecen a los míos?

En la práctica, quienes entrenan modelos usan **lo que hay**, no lo que quisieran. Una fuente muy común es Common Crawl, un rastreo masivo y periódico de páginas web (miles de millones de páginas por mes), y versiones filtradas como C4. Ese material incluye de todo: clickbait, desinformación, propaganda y contenido tóxico. Los equipos aplican heurísticas para filtrar (por ejemplo, quedarse solo con enlaces que una comunidad votó positivamente), pero el resultado sigue reflejando internet, con sus sesgos. Además, cada vez menos empresas publican con qué datos entrenan, así que muchas veces solo puedes inferirlo por el comportamiento del modelo.

Consecuencia de ingeniería: un modelo entrenado con "lo disponible" puede rendir muy bien en tareas frecuentes en internet y mal en la tuya. Por eso existen modelos especializados por **idioma** y por **dominio**, entrenados desde cero o, más a menudo, ajustados sobre un modelo general.

¿Y por qué no entrenar con todo? Porque más datos implican más cómputo y **no siempre mejoran el resultado**. Hay casos documentados en que un modelo pequeño (alrededor de mil millones de parámetros) entrenado con pocos miles de millones de tokens de código de alta calidad supera a modelos mucho más grandes en benchmarks de programación. **Calidad le gana a cantidad** con frecuencia; lo verás de nuevo en dataset engineering (sesión 16).

### 2. Idiomas: por qué el español no es "igual de barato" que el inglés

El inglés domina la web: cerca de la mitad de Common Crawl está en inglés, unas ocho veces más que el segundo idioma. El español aparece con unos pocos puntos porcentuales; está bien representado comparado con idiomas como el punjabi, el suajili o el urdu, que tienen cientos de millones de hablantes pero una fracción mínima de los datos (se les llama **low-resource languages**).

Esto tiene tres efectos prácticos:

1. **Calidad**: los modelos generales rinden mejor en inglés en benchmarks de conocimiento y matemáticas. Para idiomas poco representados la caída es fuerte. La subrepresentación no es la única causa: la estructura del idioma y la cultura que codifica también influyen.
2. **Comportamiento inesperado**: se ha observado que un mismo modelo rechaza generar desinformación en inglés pero la genera en otro idioma. Las protecciones no siempre se transfieren entre idiomas; tenlo en cuenta en la sesión 10 (seguridad).
3. **Costo y latencia**: la tokenización es más eficiente para unos idiomas que para otros. En un estudio con frases equivalentes en decenas de idiomas, la mediana en inglés eran unos 7 tokens y en algunos idiomas asiáticos más de 30 o incluso 70. Si pagas por token y cada token tarda lo mismo en generarse, el mismo contenido puede costar y tardar varias veces más. El español queda cerca del inglés, pero no igual.

¿Traducir todo a inglés, responder y volver a traducir? Funciona a veces, pero necesitas un modelo que entienda bien el idioma original para traducirlo y **la traducción pierde información** (por ejemplo, pronombres que expresan la relación entre hablantes y que en inglés colapsan en "I/you").

Un experimento rápido para ver la diferencia de tokens: la API devuelve el uso en `usage`.

```ts
// tokens.ts — compara cuántos tokens consume el mismo mensaje en dos idiomas
const BASE_URL = "https://api.nan.builders/v1";

async function promptTokens(text: string): Promise<number> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NAN_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: text }],
      max_tokens: 1, // solo nos interesa el conteo de entrada
    }),
  });
  const data = await res.json();
  return data.usage.prompt_tokens as number;
}

const en = await promptTokens("Please summarize the following meeting notes in three bullet points.");
const es = await promptTokens("Por favor, resume las siguientes notas de la reunión en tres viñetas.");
console.log({ en, es, ratio: (es / en).toFixed(2) });
```

(El conteo incluye algunos tokens de formato del chat, así que compara diferencias, no valores absolutos.)

### 3. Dominios: lo que no está en internet, el modelo no lo sabe

Los modelos generales responden preguntas cotidianas de derecho, ciencia o deportes porque esos temas abundan en la web. Pero las tareas de dominio que dependen de **datos no públicos** (secuencias de proteínas para descubrir fármacos, radiografías para detectar cáncer, planos de fábricas, el código interno de tu empresa) quedan fuera. Para ellas se construyen modelos de dominio con datasets curados: un ejemplo famoso es el modelo que predice estructuras 3D de proteínas entrenado con unas cien mil proteínas conocidas.

Para ti, como AI engineer, la lectura es: si tu caso depende de conocimiento privado o muy específico, el modelo general **no lo tiene**; tendrás que dárselo vía contexto (RAG) o, si es comportamiento y no información, vía finetuning.

### 4. La arquitectura transformer, sin matemáticas pesadas

#### El problema que resolvió

Antes del transformer dominaba **seq2seq**: un *encoder* procesaba la entrada token por token con una red recurrente (RNN) y la comprimía en un único estado final; un *decoder* generaba la salida a partir de ese estado. Tenía dos problemas:

1. El decoder solo veía **un resumen** de la entrada (el último estado). Es como contestar preguntas sobre un libro leyendo solo su contraportada.
2. Todo era **secuencial**: para procesar 200 tokens de entrada había que esperar uno tras otro. Lento.

El transformer resolvió ambos con **attention**: al generar cada token, el modelo puede mirar *cualquier* token anterior y decidir cuánto peso darle. Es como poder abrir el libro en cualquier página. Además elimina las RNN, así que los tokens de entrada se procesan **en paralelo**.

Ojo: la salida sigue siendo secuencial, porque cada token nuevo depende de los anteriores. Por eso la inferencia tiene dos fases:

| Fase | Qué hace | Naturaleza | Afecta a |
| --- | --- | --- | --- |
| **Prefill** | Procesa todo el prompt y prepara el estado (vectores key/value de cada token de entrada) | Paralela, limitada por cómputo | TTFT (time to first token) |
| **Decode** | Genera un token a la vez | Secuencial, limitada por memoria | TPOT (time per output token) |

Esto explica algo práctico: un prompt largo encarece sobre todo el arranque; una respuesta larga encarece el tiempo total. Volverás a esto en optimización de inferencia (sesión 17).

#### Cómo funciona attention

Cada token se transforma en tres vectores multiplicándolo por tres matrices aprendidas:

- **Query (Q)**: "qué estoy buscando ahora" (el estado del paso actual).
- **Key (K)**: "de qué trata este token anterior" (como el número de página).
- **Value (V)**: "qué información aporta" (el contenido de la página).

Para el token actual, el modelo compara su query con la key de cada token anterior mediante un producto punto. Puntuación alta significa "esta página es relevante". Esas puntuaciones pasan por un **softmax** (que las convierte en pesos positivos que suman 1) y con esos pesos se mezclan los values. La fórmula compacta es `Attention(Q, K, V) = softmax(Q·Kᵀ / √d) · V`, donde dividir por la raíz de la dimensión evita que los números crezcan demasiado.

Una versión de juguete en TypeScript para que veas la mecánica:

```ts
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

function softmax(xs: number[]): number[] {
  const max = Math.max(...xs); // restar el máximo evita overflow numérico
  const exps = xs.map((x) => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

function attention(q: number[], keys: number[][], values: number[][]): number[] {
  const d = q.length;
  const scores = keys.map((k) => dot(q, k) / Math.sqrt(d));
  const weights = softmax(scores);
  // mezcla ponderada de los values
  return values[0].map((_, j) => values.reduce((s, v, i) => s + weights[i] * v[j], 0));
}

// tres tokens previos; la query se parece mucho a la segunda key
const keys = [[1, 0], [0, 1], [0.5, 0.5]];
const values = [[10, 0], [0, 10], [5, 5]];
console.log(attention([0, 3], keys, values)); // ≈ el value del segundo token domina
```

En los modelos reales la attention es **multi-head**: los vectores se parten en varios trozos (por ejemplo, 32 cabezas de 128 dimensiones en un modelo de dimensión 4096) y cada cabeza puede fijarse en relaciones distintas (sintaxis, referencias, temas). Luego se concatenan los resultados.

Detalle crucial: **cada token anterior necesita su key y su value guardados**. Cuanto más largo el contexto, más memoria. Esa es una de las razones por las que alargar la ventana de contexto es difícil y caro (lo conocerás como **KV cache**).

#### El bloque transformer y el modelo completo

Un modelo transformer apila muchos **bloques** iguales. Cada bloque tiene:

- Un **módulo de attention** (matrices de query, key, value y proyección de salida).
- Un **módulo MLP** (capas lineales, también llamadas *feedforward*, separadas por funciones no lineales como ReLU o GELU; ReLU simplemente convierte los negativos en cero).

Antes de los bloques hay un **embedding module**, que convierte cada token y su posición en vectores; después, una **capa de salida** (*unembedding* o *model head*) que convierte el vector final en probabilidades para cada token del vocabulario. De ahí sale el siguiente token (cómo se elige, en la sesión 3).

```
tokens ─► [embedding + posición] ─► [bloque 1] ─► … ─► [bloque N] ─► [output layer] ─► probabilidades
                                     attention + MLP
```

El tamaño del modelo lo fijan: la dimensión del modelo, el número de bloques (capas), la dimensión del feedforward y el tamaño del vocabulario. Como referencia, modelos de la familia Llama van de 32 bloques con dimensión 4096 (unos 7–8 mil millones de parámetros) a más de 120 bloques con dimensión 16 384 (cientos de miles de millones). Ampliar la ventana de contexto aumenta la memoria usada, pero **no** el número de parámetros.

#### Alternativas

El transformer lleva desde 2017 dominando, algo inusual en un campo donde las arquitecturas pasan de moda en pocos años. Hay alternativas prometedoras, sobre todo para secuencias largas: RNN paralelizables (RWKV) y **state space models** (SSM) como Mamba, cuyo costo crece linealmente con la longitud en lugar de cuadráticamente, e híbridos que intercalan capas transformer y Mamba. Para ti la lección es tranquilizadora: si la arquitectura cambia, los principios de adaptación y evaluación de este módulo siguen valiendo.

### 5. Escala: tres números para leer cualquier modelo

| Número | Es un proxy de | Ejemplo de uso |
| --- | --- | --- |
| **Parámetros** | Capacidad de aprender | Estimar memoria para servirlo |
| **Tokens de entrenamiento** | Cuánto aprendió realmente | Comparar modelos del mismo tamaño |
| **FLOPs** de entrenamiento | Costo de entrenarlo | Entender por qué solo pocos actores entrenan desde cero |

#### Parámetros y memoria

Regla de bolsillo: memoria mínima para inferencia ≈ parámetros × bytes por parámetro. Un modelo de 7 mil millones de parámetros en 16 bits (2 bytes) necesita al menos 14 GB solo para los pesos, sin contar el KV cache.

```ts
function weightsMemoryGB(paramsBillions: number, bytesPerParam: number): number {
  return (paramsBillions * 1e9 * bytesPerParam) / 1e9;
}
console.log(weightsMemoryGB(7, 2));   // 14 GB en FP16/BF16
console.log(weightsMemoryGB(7, 0.5)); // 3.5 GB cuantizado a 4 bits (sesión 15)
console.log(weightsMemoryGB(70, 2));  // 140 GB: ya no cabe en una sola GPU típica
```

Dos matices:

- **Generaciones**: un modelo nuevo y pequeño puede superar a uno viejo y grande, porque se aprendió a entrenar mejor.
- **Sparsity y Mixture-of-Experts (MoE)**: en un modelo MoE los parámetros se dividen en "expertos" y para cada token solo se activan algunos. Un modelo con unos 47 mil millones de parámetros totales puede activar solo unos 13 mil millones por token: **cuesta y tarda como uno de 13**, aunque necesita memoria para todos. Por eso verás modelos descritos con "parámetros totales" y "parámetros activos".

#### Tokens de entrenamiento

Un modelo enorme entrenado con muy pocos datos es inútil (imagina uno entrenado con una sola frase). El tamaño del dataset se mide en **tokens**, no en documentos, porque un libro vale mucho más que una frase. Los LLM actuales se entrenan con billones (*trillions*) de tokens. Distingue entre tokens del dataset y **tokens de entrenamiento**: si recorres el dataset dos veces (dos *epochs*), entrenaste con el doble.

#### FLOPs y costo

El cómputo se mide en **FLOPs** (operaciones de punto flotante necesarias). No lo confundas con **FLOP/s** (operaciones por segundo que una máquina puede hacer). Con cifras públicas, entrenar un modelo del tamaño de GPT-3 en 256 GPUs de gama alta llevaría del orden de ocho meses a capacidad máxima; como nunca se alcanza el 100 % (*utilization* del 50 % es aceptable, más del 70 % es excelente), el costo real se va a millones de dólares. Por eso casi nadie entrena desde cero: tú adaptarás.

#### Scaling law (Chinchilla)

Con un presupuesto fijo de cómputo, ¿qué conviene, un modelo más grande o más datos? El resultado conocido como **Chinchilla scaling law** dice que para entrenar de forma *compute-optimal* el número de tokens de entrenamiento debería ser unas **20 veces** el número de parámetros, y ambos deben crecer juntos: si duplicas el modelo, duplica los tokens. Un modelo de 3 mil millones de parámetros "pide" unos 60 mil millones de tokens.

Pero la calidad no lo es todo en producción. Algunas familias de modelos eligieron deliberadamente ser **más pequeñas de lo óptimo** y entrenarse con muchos más tokens, porque un modelo pequeño es más barato de servir millones de veces. El costo de inferencia, que pagas en cada petición, a menudo pesa más que el costo único de entrenamiento.

Otros dos fenómenos:

- **Rendimientos decrecientes**: bajar del 3 % al 2 % de error puede costar un orden de magnitud más de datos o cómputo. Es la "última milla" de la sesión 1, aplicada al entrenamiento.
- **Inverse scaling**: hay tareas puntuales (memorización, preguntas con prejuicios fuertes) donde modelos más grandes rinden peor. Son raras, pero recuerdan que "más grande" no garantiza "mejor para mi caso".

Un par de definiciones: un **parámetro** se aprende durante el entrenamiento; un **hiperparámetro** lo fija una persona (número de capas, tamaño del vocabulario, learning rate, batch size). En modelos gigantes no puedes probar muchas combinaciones; se estudian en modelos pequeños y se extrapolan, aunque las **emergent abilities** (capacidades que solo aparecen a cierta escala) complican esa extrapolación.

### 6. Los cuellos de botella del escalado

1. **Datos**: el tamaño de los datasets crece más rápido que el texto nuevo que produce la humanidad. Asume que lo que publicas en internet puede acabar en el entrenamiento de algún modelo. Esto abre la puerta a que alguien publique contenido a propósito para influir en modelos futuros (una forma de envenenamiento relacionada con prompt injection, sesión 10). Además, internet se llena de texto generado por IA, y entrenar con él tiene efectos todavía discutidos. Muchas plataformas restringieron el scraping, y los datos propietarios (libros con copyright, contratos, historiales médicos) se vuelven una ventaja competitiva.
2. **Electricidad**: los centros de datos ya consumen un porcentaje relevante de la electricidad mundial y la producción de energía no crece al ritmo que querría la industria.

Un problema abierto relacionado: hacer que un modelo **olvide** algo. Si un texto tuyo entró al entrenamiento y luego lo borraste de la web, el modelo podría seguir reproduciéndolo.

### 7. Qué hacer con todo esto como AI engineer

| Pregunta al elegir modelo | Por qué importa |
| --- | --- |
| ¿Qué idiomas y dominios vio? | Predice calidad en tu caso y riesgos de seguridad por idioma |
| ¿Cuántos parámetros totales y activos tiene? | Memoria, costo y latencia de servirlo |
| ¿Cuál es su ventana de contexto? | Cuánto texto puedes darle; el costo crece con el contexto |
| ¿Cuántos tokens consume tu idioma? | Costo real por petición |
| ¿Es de una generación reciente? | Un modelo pequeño nuevo puede ganarle a uno grande viejo |

Errores comunes:

- Asumir que el modelo "sabe" lo de tu empresa. No lo sabe: no estaba en sus datos.
- Comparar modelos solo por número de parámetros, ignorando generación, datos y si es MoE.
- Calcular costos con el ratio de tokens del inglés para una app en español.
- Pensar que una ventana de contexto enorme es gratis: cada token de entrada ocupa memoria (KV cache) y se paga.

## Conceptos clave

- **Common Crawl**: rastreo masivo de la web usado como base de datos de entrenamiento de muchos modelos, con calidad muy desigual.
- **Low-resource language**: idioma con poca presencia en los datos de entrenamiento, donde los modelos rinden peor.
- **Transformer**: arquitectura basada en attention que procesa la entrada en paralelo y genera la salida token a token.
- **Attention**: mecanismo que pondera la relevancia de cada token anterior (query vs keys) para mezclar sus values.
- **Prefill / decode**: fases de inferencia; procesar el prompt en paralelo y generar tokens uno a uno.
- **KV cache**: almacenamiento de keys y values de los tokens previos; crece con la longitud del contexto.
- **Mixture-of-Experts (MoE)**: modelo disperso que activa solo algunos expertos por token; muchos parámetros totales, pocos activos.
- **FLOPs vs FLOP/s**: cantidad de operaciones de una tarea frente a velocidad de una máquina.
- **Chinchilla scaling law**: para entrenamiento óptimo en cómputo, unos 20 tokens de entrenamiento por parámetro, escalando ambos a la par.
- **Emergent abilities**: capacidades que solo aparecen a partir de cierta escala.

## Preguntas de repaso

1. ¿Por qué un modelo general puede rendir peor en un idioma con muchos hablantes?
   R: Porque lo que importa es su presencia en los datos de entrenamiento, no el número de hablantes. Idiomas poco representados en la web (low-resource) aparecen poco en datasets como Common Crawl; además su estructura puede ser más difícil y su tokenización menos eficiente, lo que también encarece y ralentiza cada respuesta.
2. Explica la diferencia entre prefill y decode y qué métrica de latencia afecta cada una.
   R: Prefill procesa todos los tokens del prompt en paralelo y calcula sus keys y values; determina el time to first token. Decode genera la salida un token a la vez porque cada uno depende de los anteriores; determina el time per output token y, con la longitud de la respuesta, la latencia total.
3. ¿Qué papel cumplen query, key y value en attention?
   R: La query representa lo que busca el paso actual; cada key representa a un token previo para medir su relevancia mediante producto punto con la query; las puntuaciones se normalizan con softmax y se usan como pesos para mezclar los values, que son la información que aporta cada token.
4. Un modelo MoE tiene 47B parámetros totales y 13B activos. ¿Qué implica para costo y memoria?
   R: El cómputo por token (y por tanto costo y velocidad) se parece al de un modelo denso de 13B, porque solo se activan algunos expertos; pero la memoria debe alojar los 47B parámetros, ya que cualquier experto puede necesitarse.
5. ¿Qué dice la Chinchilla scaling law y por qué algunos equipos se desvían de ella a propósito?
   R: Que con un presupuesto de cómputo fijo conviene entrenar con unos 20 tokens por parámetro, escalando tamaño y datos juntos. Algunos equipos entrenan modelos más pequeños con más datos porque el costo de inferencia, que se paga en cada petición, importa más en producción que la optimalidad del entrenamiento.
6. ¿Por qué alargar la ventana de contexto es costoso en un transformer?
   R: Porque cada token del contexto requiere guardar su key y su value en cada capa (KV cache) y attention compara la query con todas las keys; la memoria y el cómputo crecen con la longitud, aunque el número de parámetros no cambie.

## Ejercicio

Escribe un script `model-card.ts` que, dado un objeto con datos de un modelo (`paramsTotalB`, `paramsActiveB`, `bytesPerParam`, `contextTokens`, `pricePerMillionInput`, `pricePerMillionOutput`), imprima: memoria mínima de pesos en GB, si es MoE, y el costo estimado de 1 000 peticiones de 800 tokens de entrada y 300 de salida. Después ejecuta `tokens.ts` con tres textos tuyos en español y en inglés, calcula el ratio medio de tokens y úsalo para ajustar la estimación de costo en español. Terminado cuando el script imprime los cuatro valores para dos modelos distintos y tienes anotado tu ratio español/inglés.

## Explícalo con tus palabras

Explica con la metáfora del libro (contraportada vs abrir cualquier página) por qué el transformer superó a seq2seq y por qué, aun así, generar una respuesta larga sigue siendo lento.
