---
title: Evaluación I — por qué es difícil, perplexity y evaluación exacta
kind: lesson
hours: 2
sources: AI Engineering (Chip Huyen), cap. 3, Challenges, Language Modeling Metrics, Exact Evaluation, Introduction to Embedding (pp. 232–270)
links: MTEB leaderboard | https://huggingface.co/spaces/mteb/leaderboard
---

## Objetivo

Entender por qué evaluar foundation models es más difícil que evaluar modelos clásicos, interpretar las métricas de modelado de lenguaje (entropy, cross entropy, perplexity) y dominar la evaluación exacta: functional correctness, exact match, similitud léxica y similitud semántica con embeddings.

## Estudio

### 1. Por qué la evaluación es el cuello de botella

Cuanto más se usa la IA, más oportunidades hay de fallos graves: chatbots que dan información falsa a clientes y la empresa tiene que pagar daños, abogados que presentan casos inventados, asistentes que dan consejos peligrosos. Sin control de calidad sobre las salidas, el riesgo puede superar al beneficio. Muchos equipos descubren que **evaluar es el mayor obstáculo** para llevar una aplicación de IA a producción, y a veces se lleva la mayor parte del esfuerzo de desarrollo.

Una idea que conviene grabarse desde ya: la evaluación no es un paso aislado al final. Su propósito es **mitigar riesgos y descubrir oportunidades**, y para mitigar riesgos primero tienes que saber **dónde puede fallar tu sistema**. A veces hay que rediseñar el sistema para que sus fallos sean visibles (por ejemplo, registrar qué documentos recuperó el RAG para poder evaluar el retrieval por separado).

¿Por qué es más difícil que en ML clásico? Cinco razones:

1. **Más inteligencia, más difícil juzgar.** Cualquiera detecta un error en la suma de un niño; pocos detectan uno en una demostración de doctorado. Un resumen incoherente es obviamente malo; uno coherente puede estar mal y para saberlo tienes que leer el original. Ya no basta con "cómo suena": hay que verificar hechos y razonar.
2. **Salidas abiertas.** En clasificación comparas contra la etiqueta correcta. En generación hay infinitas respuestas válidas y no puedes listarlas todas.
3. **Cajas negras.** Muchas veces no sabes la arquitectura ni los datos de entrenamiento; solo puedes observar salidas.
4. **Benchmarks que se saturan.** Un benchmark se satura cuando los modelos sacan la nota máxima. Con foundation models pasa rápido: benchmarks populares quedaron obsoletos en uno o dos años y hubo que crear versiones más difíciles.
5. **Alcance más amplio.** Con un modelo de propósito general no solo mides lo que sabes que hace; también exploras qué más puede hacer y dónde falla.

Además, la inversión en evaluación va por detrás de la inversión en modelos y orquestación: hay menos herramientas, y mucha gente evalúa "a ojo" con un puñado de prompts favoritos. Eso alcanza para arrancar un proyecto, pero no para iterar. Este bloque del módulo (sesiones 4–7) busca que evalúes **sistemáticamente**.

Mapa de métodos que verás:

```
Evaluación
├── Métricas de modelado de lenguaje (perplexity…)      -> calidad del modelo base
├── Evaluación exacta (sin ambigüedad)
│   ├── Functional correctness (¿funciona?)
│   └── Similitud contra referencia
│       ├── Exact match
│       ├── Similitud léxica (edit distance, n-gramas)
│       └── Similitud semántica (embeddings)
└── Evaluación subjetiva
    ├── AI as a judge                                   -> sesión 5
    ├── Evaluación comparativa                          -> sesión 5
    └── Evaluación humana
```

### 2. Métricas de modelado de lenguaje

Aunque no entrenes modelos, estas métricas aparecen en papers y fichas de modelos, y sirven para tareas concretas como detectar contaminación de datos.

#### Entropy

La **entropía** mide cuánta información lleva, en promedio, un token: cuanto más alta, más difícil predecir qué viene. Ejemplo: un "idioma" para describir posiciones en un cuadrado. Si tiene solo dos tokens (arriba, abajo), basta 1 bit por token: entropía 1. Si tiene cuatro (arriba-izquierda, arriba-derecha, abajo-izquierda, abajo-derecha), cada token dice más pero necesita 2 bits: entropía 2. Si puedes predecir perfectamente lo que voy a decir, lo que digo no aporta información (entropía cero).

#### Cross entropy

Al entrenar, quieres que el modelo aprenda la distribución de los datos. La **cross entropy** del modelo sobre un dataset mide qué tan difícil le resulta predecir lo que viene en ese dataset. Depende de dos cosas: lo predecible que es el dataset en sí (su entropía) y cuánto se aleja la distribución aprendida de la real (la divergencia KL):

`H(P, Q) = H(P) + D_KL(P ‖ Q)`

Si el modelo aprendiera perfectamente, la divergencia sería 0 y su cross entropy igualaría la entropía de los datos. Los modelos de lenguaje se entrenan **minimizando la cross entropy**.

#### Bits-per-character y bits-per-byte

Si la cross entropy es 6 bits por token, no puedes compararla con otro modelo que tokeniza distinto. Por eso existen **BPC** (bits por carácter) y **BPB** (bits por byte), que normalizan. BPB también se lee como capacidad de compresión: un modelo con BPB 3.4 representaría cada byte (8 bits) con 3.4 bits, comprimiendo el texto a menos de la mitad.

#### Perplexity

La **perplexity** (PPL) es la exponencial de la cross entropy: `PPL = 2^H` (en bits) o `e^H` (en nats, la unidad que usan los frameworks). Mide la **incertidumbre** del modelo al predecir: una perplexity de 4 equivale a dudar entre cuatro opciones igual de probables. Como bits y nats confunden, mucha gente reporta perplexity directamente.

Dada una secuencia de tokens, la perplexity del modelo es la media geométrica inversa de las probabilidades que asignó a cada token real. Si tienes logprobs, es fácil:

```ts
// perplexity a partir de logprobs (logaritmo natural) de cada token de un texto
function perplexity(tokenLogprobs: number[]): number {
  const avgNegLogprob = -tokenLogprobs.reduce((s, x) => s + x, 0) / tokenLogprobs.length;
  return Math.exp(avgNegLogprob);
}

console.log(perplexity([Math.log(0.5), Math.log(0.5), Math.log(0.5)])); // 2: duda entre 2 opciones
console.log(perplexity([Math.log(0.9), Math.log(0.8), Math.log(0.95)])); // ≈1.13: muy seguro
```

Reglas para interpretarla:

| Factor | Efecto en la perplexity esperada | Ejemplo |
| --- | --- | --- |
| Datos más estructurados | Más baja | HTML (tras `<head>` viene `</head>`) vs prosa |
| Vocabulario más grande | Más alta | Predecir palabras vs predecir caracteres |
| Más contexto | Más baja | Condicionar en 10 000 tokens vs en 10 |

Valores de 3 o menos no son raros; dado que el vocabulario tiene decenas de miles de tokens, es impresionante.

Usos prácticos de la perplexity:

- **Proxy de capacidad**: modelos más potentes suelen tener menor perplexity. Pero **ojo**: tras el post-training (SFT, RLHF) la perplexity suele **subir**, porque el modelo se especializa en completar tareas y no en predecir texto genérico. También la cuantización puede alterarla. No compares un modelo base con uno ajustado por perplexity.
- **Detectar contaminación**: un modelo tiene perplexity muy baja en textos que vio y memorizó. Si la perplexity sobre un benchmark es sospechosamente baja, probablemente estaba en su entrenamiento y su nota no es fiable.
- **Deduplicar y filtrar**: añadir datos nuevos solo si el modelo los encuentra "sorprendentes" (perplexity alta).
- **Detectar anomalías**: textos incoherentes o muy inusuales tienen perplexity alta.

Requisito: necesitas logprobs, y no todos los proveedores los exponen.

### 3. Evaluación exacta vs subjetiva

**Exacta**: el juicio no tiene ambigüedad (si la respuesta correcta es A y elegiste B, está mal). **Subjetiva**: depende de quién evalúa, como corregir un ensayo; con una buena rúbrica se vuelve más consistente. AI as a judge es subjetiva porque cambia según el modelo juez y su prompt.

### 4. Functional correctness

¿El sistema hace lo que debe? Es **la métrica definitiva**: si pides una web, ¿la web cumple los requisitos?; si pides una reserva, ¿se hizo la reserva? No siempre es automatizable, pero en algunos dominios sí:

- **Código**: ejecutar el código generado contra tests (como hacen las plataformas de ejercicios). Benchmarks de código y de texto a SQL funcionan así.
- **Juegos y optimización**: la puntuación obtenida o la energía ahorrada.

En código se usa **pass@k**: por cada problema el modelo genera k soluciones; el problema cuenta como resuelto si **alguna** pasa todos los tests. Si de 10 problemas resuelve 5 con k = 3, su pass@3 es 50 %. Por construcción, pass@1 ≤ pass@3 ≤ pass@10. Cuando compares números, verifica que usen el mismo k.

```ts
// functional correctness para una función generada: evaluar contra casos de prueba
type Case = { args: [number, number]; expected: number };

function runCases(fnSource: string, cases: Case[]): number {
  // Solo en un entorno aislado: ejecutar código generado es peligroso (ver sesión 10)
  const fn = new Function(`return (${fnSource})`)() as (a: number, b: number) => number;
  const passed = cases.filter((c) => {
    try { return fn(...c.args) === c.expected; } catch { return false; }
  }).length;
  return passed / cases.length;
}

const generated = "function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }";
console.log(runCases(generated, [
  { args: [15, 20], expected: 5 },
  { args: [7, 3], expected: 1 },
  { args: [0, 9], expected: 9 },
]));
```

### 5. Similitud contra datos de referencia

Si no puedes medir funcionamiento, comparas con **respuestas de referencia** (*ground truth*, *canonical responses*). Cada ejemplo tiene forma `(entrada, referencias)` y puede tener varias referencias válidas. Las métricas que las necesitan son **reference-based**; las que no, **reference-free**.

El cuello de botella es producir referencias. Tradicionalmente las escriben humanos (y el rendimiento humano se toma como estándar); cada vez más las genera IA y las revisan humanos, lo que reduce mucho el trabajo.

Hay cuatro formas de comparar un texto generado con una referencia: preguntarle a un evaluador (humano o IA), exact match, similitud léxica y similitud semántica. Las tres últimas son métricas "hechas a mano" y siguen muy usadas porque son exactas y baratas.

#### Exact match

Coincidencia exacta con alguna referencia. Funciona para respuestas cortas y exactas: "¿Cuánto es 2 + 3?", "¿Quién fue la primera mujer en ganar un Nobel?", "¿Cuál es mi saldo?". En la práctica conviene **normalizar** (minúsculas, sin tildes ni puntuación) para no penalizar formato.

Una variante acepta cualquier salida que **contenga** la referencia ("La respuesta es 5" contiene "5"). Cuidado: si la pregunta es el año de nacimiento de alguien y el modelo responde una fecha completa con el mes equivocado, contiene el año correcto pero la respuesta es falsa.

Fuera de tareas simples, exact match falla: "¿Cómo estás?" se traduce de muchas maneras correctas y nunca las tendrás todas.

```ts
const normalize = (s: string) =>
  s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // quita tildes
    .replace(/[^\p{L}\p{N}\s]/gu, "")                 // quita puntuación
    .replace(/\s+/g, " ")
    .trim();

export function exactMatch(output: string, references: string[]): boolean {
  return references.some((r) => normalize(output) === normalize(r));
}

export function containsMatch(output: string, references: string[]): boolean {
  return references.some((r) => normalize(output).includes(normalize(r)));
}

console.log(exactMatch("  París. ", ["paris"]));        // true
console.log(containsMatch("Creo que es París", ["paris"])); // true (y es correcto)
```

#### Similitud léxica

Mide cuánto se **solapan** dos textos en su forma. Referencia: "Mis gatos asustan a los ratones". "Mis gatos comen a los ratones" comparte más palabras que "Gatos y ratones pelean todo el tiempo", así que sale más similar.

Dos familias:

- **Edit distance** (*fuzzy matching*): cuántas ediciones (borrar, insertar, sustituir; a veces transponer) convierten un texto en otro. "bad" está a una edición de "bard" y a tres de "cash".
- **Solapamiento de n-gramas**: compara secuencias de n tokens. "mis gatos asustan" tiene los bigramas "mis gatos" y "gatos asustan". Métricas clásicas: BLEU, ROUGE, METEOR, TER, CIDEr; fueron estándar en traducción y resumen antes de los foundation models.

```ts
function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,                                   // borrar
        dp[i][j - 1] + 1,                                   // insertar
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1), // sustituir
      );
  return dp[a.length][b.length];
}

function ngramOverlap(output: string, reference: string, n = 2): number {
  const grams = (s: string) => {
    const w = normalize(s).split(" ");
    return w.slice(0, w.length - n + 1).map((_, i) => w.slice(i, i + n).join(" "));
  };
  const out = new Set(grams(output));
  const ref = grams(reference);
  return ref.filter((g) => out.has(g)).length / Math.max(ref.length, 1);
}

console.log(levenshtein("bad", "bard"), levenshtein("bad", "cash")); // 1 3
```

Problemas de la similitud léxica:

1. **Necesita referencias exhaustivas**: una respuesta correcta pero redactada distinto saca nota baja. Hay casos documentados de modelos penalizados en benchmarks porque la respuesta correcta no estaba entre las referencias.
2. **Las referencias pueden estar mal**: se han encontrado muchas traducciones de referencia de baja calidad, y por eso métricas sin referencia llegan a correlacionar igual o mejor con el juicio humano.
3. **Parecido no es correcto**: en generación de código, soluciones correctas e incorrectas obtuvieron puntuaciones BLEU parecidas. Optimizar BLEU no es optimizar que funcione.

#### Similitud semántica

La similitud léxica mira la forma, no el significado. "¿Qué onda?" y "¿Cómo estás?" casi no comparten palabras pero significan lo mismo; "Vamos a comer, abuela" y "Vamos a comer abuela" se parecen muchísimo y significan cosas muy distintas. La **similitud semántica** compara significados: convierte cada texto en un **embedding** (un vector de números) y mide qué tan cerca están, normalmente con **cosine similarity**:

`cos(A, B) = (A · B) / (‖A‖ · ‖B‖)`, que va de −1 (opuestos) a 1 (idénticos).

Métricas conocidas: BERTScore, MoverScore. Ventaja: no requiere referencias tan exhaustivas. Desventajas: depende de la **calidad del modelo de embeddings** (embeddings malos dan puntuaciones engañosas) y calcularlos cuesta tiempo y dinero. Técnicamente el cálculo es exacto, pero el resultado depende del modelo elegido, así que tiene algo de subjetivo.

### 6. Introducción a embeddings

Un **embedding** es un vector que intenta capturar el significado de un dato. En la vida real tiene entre cien y varios miles de dimensiones (por ejemplo, 384, 768, 1024, 1536 o 3072 según el modelo). Hay modelos entrenados específicamente para producir embeddings, de código abierto y por API. Los LLM también calculan embeddings internamente (su capa de embedding), pero los de modelos especializados suelen ser mejores para comparar textos.

¿Cómo sabes si un modelo de embeddings es bueno? Si textos más parecidos quedan más cerca: "el gato está sobre la alfombra" debería quedar más cerca de "el perro juega en el pasto" que de "la investigación en IA es divertida". También se evalúa por su utilidad en tareas (clasificación, búsqueda, RAG); hay benchmarks públicos que comparan modelos de embeddings en muchas tareas.

Los embeddings no son solo de texto: productos, imágenes, usuarios. Y hay **embeddings conjuntos** de varias modalidades: un modelo aprendió a poner la imagen de un perro cerca del texto "un perro" entrenando con millones de pares (imagen, texto) de internet, empujando cada imagen hacia su texto en un espacio común.

Así obtienes embeddings con una API compatible con OpenAI:

```ts
// embeddings.ts
const BASE_URL = "https://api.nan.builders/v1";

export async function embed(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NAN_API_KEY}`,
    },
    body: JSON.stringify({ model: "qwen3-embedding", input: texts }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data.map((d: { embedding: number[] }) => d.embedding);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

const [ref, para, other] = await embed([
  "¿Cómo estás?",
  "¿Qué tal te va?",
  "El servidor devolvió un error 500",
]);
console.log(cosine(ref, para).toFixed(3), cosine(ref, other).toFixed(3));
```

Verás estos embeddings otra vez en la búsqueda vectorial del RAG (sesiones 11–13) y en la deduplicación de datos (sesión 16).

### 7. Qué métrica usar

| Tipo de tarea | Métrica principal | Complemento |
| --- | --- | --- |
| Código, SQL, transformaciones verificables | Functional correctness (tests, pass@k) | Revisión de estilo |
| Respuesta corta y exacta (números, nombres, clases) | Exact match normalizado | Contains match con cuidado |
| Traducción/resumen con referencias buenas | Similitud semántica | Léxica como señal secundaria |
| Respuesta abierta sin referencia única | AI as a judge con rúbrica (sesión 5) | Muestreo humano |
| Comparar modelos base | Perplexity (solo entre modelos comparables) | Benchmarks |

Errores comunes:

- Usar exact match sin normalizar y concluir que el modelo es malo cuando solo cambió una mayúscula.
- Usar "contiene" para preguntas donde una respuesta más larga puede contener la correcta y aun así ser falsa.
- Confiar en BLEU/ROUGE como medida de calidad en tareas abiertas.
- Comparar perplexity entre un modelo base y uno con post-training, o entre tokenizadores distintos.
- Ejecutar código generado sin aislamiento.
- Elegir un modelo de embeddings sin comprobar que funciona bien en tu idioma y dominio.

## Conceptos clave

- **Entropy**: información promedio que lleva un token; mide qué tan impredecible es un lenguaje.
- **Cross entropy**: dificultad del modelo para predecir un dataset; es la entropía de los datos más la divergencia KL.
- **Perplexity**: exponencial de la cross entropy; número efectivo de opciones entre las que duda el modelo.
- **Data contamination**: cuando datos de evaluación estaban en el entrenamiento; se sospecha por perplexity anormalmente baja.
- **Functional correctness**: evaluar si el sistema hace lo que debe, por ejemplo ejecutando tests.
- **pass@k**: fracción de problemas resueltos cuando se permiten k intentos por problema.
- **Exact match**: la salida coincide con alguna referencia, normalmente tras normalizar.
- **Lexical similarity**: solapamiento de forma entre textos (edit distance, n-gramas, BLEU, ROUGE).
- **Semantic similarity**: cercanía de significado medida con embeddings y cosine similarity.
- **Embedding**: vector numérico que representa el significado de un dato.

## Preguntas de repaso

1. Da tres razones por las que evaluar foundation models es más difícil que evaluar un clasificador.
   R: Sus salidas son abiertas y no hay una lista completa de respuestas correctas; cuanto más sofisticada es la tarea, más trabajo cuesta verificar (hechos, razonamiento, conocimiento experto); y suelen ser cajas negras cuyos benchmarks públicos se saturan rápido, además de que hay que explorar capacidades nuevas, no solo medir las conocidas.
2. ¿Qué significa una perplexity de 4 y por qué no sirve para comparar un modelo base con su versión post-entrenada?
   R: Que en promedio el modelo duda como si eligiera entre cuatro opciones igualmente probables. El post-training especializa al modelo en completar tareas y suele aumentar su perplexity sobre texto genérico, así que una perplexity mayor no significa que sea peor para tu aplicación.
3. ¿Cómo puede la perplexity ayudar a detectar contaminación de datos?
   R: Un modelo tiene perplexity muy baja en textos que vio y memorizó durante el entrenamiento. Si su perplexity sobre las preguntas de un benchmark es anormalmente baja, es probable que el benchmark estuviera en sus datos y su puntuación no sea fiable.
4. ¿Qué mide pass@k y por qué pass@10 suele ser mayor que pass@1?
   R: La fracción de problemas en los que al menos una de k soluciones generadas pasa todos los tests. Con más intentos hay más oportunidades de que alguno sea correcto, así que la nota esperada crece con k; por eso solo se comparan valores con el mismo k.
5. Da un ejemplo en que la similitud léxica falla y explica por qué la semántica lo resuelve.
   R: "¿Qué tal te va?" frente a la referencia "¿Cómo estás?" comparte pocas palabras y saca nota léxica baja aunque sea correcta. La similitud semántica compara embeddings que representan significado, así que dos paráfrasis quedan cerca aunque usen palabras distintas.
6. ¿Cuáles son las debilidades de la similitud semántica?
   R: Depende de la calidad del modelo de embeddings (si es malo, textos equivalentes pueden salir lejanos o al revés), calcular embeddings cuesta tiempo y dinero, y el resultado cambia según el modelo elegido, así que no es totalmente objetivo.

## Ejercicio

Crea `similarity-lab.ts` con 10 pares (respuesta generada, referencia) en español: 4 paráfrasis correctas, 3 respuestas incorrectas que se parecen mucho a la referencia en palabras y 3 diferencias solo de formato (mayúsculas, tildes, puntos). Calcula para cada par: exact match normalizado, Levenshtein normalizado por longitud, solapamiento de bigramas y cosine similarity con `qwen3-embedding`. Imprime una tabla y escribe tres conclusiones: qué métrica acertó en cada grupo y qué umbral de cosine usarías. Terminado cuando la tabla tiene los 10 pares con las 4 métricas y tus conclusiones mencionan al menos un caso donde la métrica léxica y la semántica discrepan.

## Explícalo con tus palabras

Explica a un compañero por qué "se ve bien en tres ejemplos" no es evaluar, y qué métrica usarías para un generador de SQL frente a un traductor.
