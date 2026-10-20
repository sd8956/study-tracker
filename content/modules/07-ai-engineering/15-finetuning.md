---
title: Finetuning — cuándo sí, cuándo no, memoria, cuantización y LoRA
kind: lesson
hours: 2
sources: AI Engineering (Chip Huyen), cap. 7, Finetuning Overview, When to Finetune, Memory Bottlenecks, Finetuning Techniques y Finetuning Tactics (pp. 594–693)
links: LoRA paper | https://arxiv.org/abs/2106.09685 ; QLoRA paper | https://arxiv.org/abs/2305.14314
---

## Objetivo

Decidir con criterio entre prompting, RAG y finetuning, entender por qué el finetuning consume tanta memoria (backpropagation, gradientes, estados del optimizador, precisión numérica), conocer la cuantización y el parameter-efficient finetuning (LoRA, QLoRA), y saber las tácticas prácticas: elección de modelo base, método, framework e hiperparámetros.

## Estudio

### 1. Qué es finetuning

**Finetuning** es seguir entrenando un modelo ya entrenado para que rinda bien en tu tarea. Es una forma de **transfer learning**: transferir lo aprendido en una tarea con muchos datos (completar texto) a otra con menos datos (responder preguntas legales, texto a SQL). Igual que saber piano facilita aprender otro instrumento. Un ejemplo temprano: un sistema de traducción que, entrenado en portugués–inglés e inglés–español, aprendió a traducir portugués–español sin ejemplos directos.

La gran ventaja es la **sample efficiency**: entrenar desde cero un modelo legal podría requerir millones de ejemplos; ajustar un buen modelo base, quizá unos cientos. Idealmente el modelo ya sabe casi todo y el finetuning solo **refina** su comportamiento (de nuevo: desbloquear lo que el prompting no consigue sacar).

Formas de finetuning que conviene distinguir:

| Tipo | Datos | Para qué |
| --- | --- | --- |
| **Continued pre-training** (self-supervised) | Texto crudo del dominio (documentos legales, textos en un idioma) | Familiarizar al modelo con un dominio antes del ajuste caro |
| **Supervised finetuning (SFT)** | Pares (instrucción, respuesta) | Enseñar una tarea, formato o estilo |
| **Infilling** | Rellenar huecos | Edición de texto, depuración de código |
| **Preference finetuning** | (instrucción, ganadora, perdedora) | Alinear con preferencias |
| **Long-context finetuning** | Secuencias largas + cambios en embeddings posicionales | Ampliar la ventana de contexto (difícil; puede empeorar en textos cortos) |

Como desarrollador de aplicaciones, lo normal es ajustar un modelo **ya post-entrenado**: cuanto más cerca esté de lo que necesitas, menos trabajo.

Otra forma de transfer learning es **feature-based**: usar el modelo para extraer representaciones (embeddings) y entrenar encima otro modelo pequeño, por ejemplo un clasificador.

### 2. ¿Cuándo hacer finetuning?

Finetuning requiere bastantes más recursos que el prompting: datos, hardware y talento de ML. Por eso se intenta **después de experimentar a fondo con prompts**. No son excluyentes: muchos sistemas reales usan ambos.

#### Razones para hacerlo

- **Calidad en tu tarea**, sobre todo si el modelo no vio suficiente de ella: un dialecto SQL poco común, consultas específicas de tus clientes.
- **Formatos estructurados** (JSON, YAML, DSL internos) que el prompting no logra de forma fiable.
- **Mitigar sesgos** exponiendo al modelo a datos curados (por ejemplo, muchas directoras ejecutivas si siempre asocia "CEO" a nombres masculinos).
- **Modelos pequeños que rinden como grandes**: un modelo pequeño ajustado puede superar a uno mucho más grande en una tarea concreta. Hay casos documentados de modelos unas 60 veces más pequeños, ajustados con unas decenas de miles de ejemplos, superando a modelos generales en edición de texto. Más barato y rápido en producción. La variante en que el pequeño imita al grande con datos generados por este es la **destilación** (sesión 16).
- **Ahorro de tokens**: en vez de incluir 30 ejemplos en cada prompt, entrenas con ellos y usas prompts cortos. El prompt caching (sesión 17) reduce esta ventaja, pero el número de ejemplos en un prompt sigue limitado por el contexto.

#### Razones para no hacerlo (todavía)

- **Mucho de lo que logra, se logra sin él**: buenos prompts, buen contexto y técnicas de salida estructurada.
- **Puede empeorar otras tareas**: ajustas para "cambiar pedidos" y empeora en "recomendaciones" y "feedback general". Solución: ajustar con todas las tareas que importan, usar modelos separados o fusionarlos (*model merging*).
- **Inversión inicial alta**: datos anotados (lentos y caros), saber entrenar (optimizador, learning rate, overfitting, evaluación durante el entrenamiento) y saber servir el modelo resultante.
- **Mantenimiento**: salen modelos base nuevos más rápido de lo que mejoras el tuyo. ¿Cuánto mejor tiene que ser uno nuevo para migrar? ¿Lo reajustas?
- **Los modelos generales mejoran también en dominios**: hubo un modelo financiero entrenado con un costo millonario que, en el mismo mes, fue superado en benchmarks financieros por un modelo general sin ajustar.

Historia frecuente: alguien insiste en que "el prompting no funciona" y pide finetuning; al revisar, los experimentos de prompting eran mínimos, las instrucciones confusas, los ejemplos no representaban los datos reales y no había métricas. Tras hacerlo bien, el prompting bastó. Y aunque termines ajustando, el trabajo de prompting no se pierde: el pipeline de evaluación, las guías de anotación y el tracking son la base del finetuning.

### 3. Finetuning vs RAG: forma vs hechos

Tras agotar el prompting, ¿RAG o finetuning? Depende de **por qué** falla el modelo:

| Tipo de fallo | Ejemplo | Solución |
| --- | --- | --- |
| **De información** | No conoce datos privados; información desactualizada (dice 10 álbumes cuando ya son 11) | **RAG** |
| **De comportamiento** | Respuestas correctas pero irrelevantes o sin el detalle necesario; formato incorrecto; HTML que no compila; DSL poco común | **Finetuning** |

Lema: **el finetuning es para la forma; RAG es para los hechos**. En estudios comparativos, para preguntas sobre hechos recientes, RAG con el modelo base superó a los modelos ajustados, y RAG sobre un modelo ajustado no siempre mejoró. El finetuning con datos de baja calidad incluso puede **aumentar** las alucinaciones.

Si hay fallos de ambos tipos, **empieza por RAG** (no hay que curar datos de entrenamiento ni servir un modelo nuevo), y empieza con retrieval simple (BM25) antes de una base vectorial.

Flujo recomendado (con el pipeline de evaluación definido **antes** de cualquier paso):

```
1. Prompting con buenas prácticas y prompts versionados
2. Más ejemplos en el prompt (1–50 según el caso)
3. ¿Falta información? → RAG simple (BM25)
4a. ¿Sigue faltando información? → RAG avanzado (embeddings, híbrido, reranking)
4b. ¿Fallos de comportamiento (formato, relevancia, seguridad)? → finetuning
5. Combinar RAG + finetuning
```

Matiz de costo: el RAG avanzado añade complejidad **en inferencia** (más componentes por petición); el finetuning añade complejidad **en desarrollo** pero deja la inferencia igual.

| Criterio | Prompting | RAG | Finetuning |
| --- | --- | --- | --- |
| Datos necesarios | Casi ninguno | Corpus de documentos | Cientos a miles de ejemplos etiquetados |
| Tiempo para probar | Minutos | Horas–días | Días–semanas |
| Resuelve falta de información | Parcial (si cabe en el prompt) | Sí | Mal (y se desactualiza) |
| Resuelve formato/estilo | Parcial | No | Sí |
| Costo por petición | Crece con prompts largos | Embeddings + búsqueda + contexto | Prompts cortos; modelo propio que servir |
| Actualizar conocimiento | Editar prompt | Reindexar | Reentrenar |

### 4. El cuello de botella: memoria

#### Por qué entrenar gasta tanta memoria

Las redes se entrenan con **backpropagation**. Cada paso tiene:

1. **Forward pass**: calcular la salida a partir de la entrada (lo único que ocurre en inferencia).
2. **Backward pass**: comparar la salida con la esperada (**loss**), calcular cuánto contribuye cada parámetro entrenable al error (**gradiente**) y ajustar los parámetros según un **optimizador** (Adam es el más usado en transformers).

Cada **parámetro entrenable** necesita, además de su valor, su gradiente y los **estados del optimizador** (Adam guarda dos valores por parámetro; SGD simple, ninguno). Los parámetros que no se actualizan están **congelados**. Conclusión: **cuantos más parámetros entrenables, más memoria**.

#### Cuentas de servilleta

- **Inferencia**: `N parámetros × bytes por parámetro × ~1.2` (el 20 % extra para activaciones y KV cache; más con contextos o lotes grandes). Un modelo de 13B en 2 bytes: 26 GB de pesos, ~31 GB en total.
- **Entrenamiento**: pesos + activaciones + gradientes + estados del optimizador. Con Adam, cada parámetro entrenable añade ~3 valores.

```ts
type Precision = 4 | 2 | 1 | 0.5; // bytes por valor: FP32, FP16/BF16, INT8, INT4

export function inferenceGB(paramsB: number, bytes: Precision, overhead = 1.2) {
  return paramsB * bytes * overhead;
}

export function finetuneGB(paramsB: number, trainableB: number, bytes: Precision, optimizerStates = 2) {
  const weights = paramsB * bytes;
  const gradsAndStates = trainableB * (1 + optimizerStates) * bytes;
  return { weights, gradsAndStates, total: weights + gradsAndStates }; // sin contar activaciones
}

console.log(inferenceGB(13, 2).toFixed(1));     // ≈ 31.2 GB
console.log(finetuneGB(7, 7, 2));                // full finetuning 7B: 14 + 42 = 56 GB
console.log(finetuneGB(7, 0.02, 2));             // LoRA con ~20M entrenables: ≈ 14.1 GB
```

Ojo: las **activaciones** guardadas para calcular gradientes pueden superar con creces a los pesos. Una técnica para reducirlas es **gradient checkpointing** (recalcular activaciones en vez de guardarlas): menos memoria, más tiempo.

#### Representaciones numéricas

| Formato | Bytes | Comentario |
| --- | --- | --- |
| FP32 | 4 | Precisión simple; estándar clásico de entrenamiento |
| FP16 | 2 | Media precisión; rango pequeño (valores grandes se vuelven infinito) |
| BF16 | 2 | Mismo tamaño que FP16 pero más **rango** y menos **precisión**; muy usado en LLMs |
| INT8 / INT4 | 1 / 0.5 | Enteros; comunes en inferencia cuantizada |

Los bits de un número flotante se reparten entre **signo**, **rango** (qué tan grandes pueden ser los valores) y **precisión** (cuántos decimales fiables). Advertencia práctica: **carga cada modelo en el formato para el que se publicó**; hubo equipos que cargaron en FP16 un modelo publicado en BF16 y obtuvieron una calidad mucho peor.

### 5. Cuantización

**Cuantizar** es reducir los bits por valor (estrictamente, convertir a enteros, pero se usa para cualquier reducción). Es barata, muy efectiva y general: un modelo de 10B pasa de 40 GB en FP32 a 20 GB en 16 bits, y a ~5 GB en 4 bits. Además suele **acelerar** el cómputo (lotes más grandes, operaciones con menos bits), aunque las conversiones de formato a veces se comen la ganancia.

- **Qué cuantizar**: sobre todo los pesos (impacto más estable); también activaciones.
- **Cuándo**: **post-training quantization (PTQ)**, la más común y la relevante para ti; o durante el entrenamiento: **quantization-aware training (QAT)**, que simula baja precisión para que el modelo aprenda a rendir así, o entrenar directamente en baja precisión (más difícil porque backpropagation es sensible a la precisión).
- **Mixed precision**: mantener en alta precisión lo sensible (por ejemplo, una copia de los pesos o los embeddings) y en baja lo demás.

La inferencia en 16, 8 e incluso 4 bits es hoy estándar; existen esquemas mixtos de 2 y 4 bits para dispositivos y hasta modelos de ~1.58 bits por parámetro con resultados comparables a modelos de 16 bits en tamaños pequeños. Riesgo: muchas pequeñas pérdidas de precisión pueden sumar un cambio grande de calidad. **Evalúa el modelo cuantizado con tu pipeline** antes de desplegarlo.

### 6. Parameter-efficient finetuning (PEFT) y LoRA

**Full finetuning** actualiza todos los parámetros: con un modelo de 7B en 16 bits y Adam, ~56 GB solo en pesos, gradientes y estados, más de lo que tiene una GPU de consumo (12–24 GB). **PEFT** reduce drásticamente los parámetros entrenables y, con ellos, la memoria; además suele ser más eficiente en datos.

#### LoRA (low-rank adaptation)

Idea: en lugar de modificar una matriz grande de pesos `W` (d × d), se congela `W` y se aprende una corrección como producto de dos matrices pequeñas `A` (d × r) y `B` (r × d), con un **rank** r pequeño. La matriz efectiva es `W' = W + (α/r)·A·B`.

```
        W (d×d, congelada)            A (d×r)   B (r×d)    entrenables
  d=4096 → 16.7M parámetros     +     4096×8  +  8×4096  = 65 536 parámetros (r = 8)
```

Intuición matemática: una matriz de 9 × 9 (81 valores) se puede aproximar con 9 × 1 por 1 × 9 (18 valores). Es una aproximación con pérdida; más rank, más fidelidad.

¿Por qué funciona con tan pocos parámetros y datos? Se ha argumentado que los LLM, pese a su tamaño, tienen una **dimensión intrínseca baja** tras el pre-training, y que modelos más grandes y mejor entrenados la tienen aún más baja: el pre-training actúa como compresión, y ajustar requiere moverse en pocas direcciones. En el trabajo original, LoRA igualó o superó al full finetuning en varias tareas entrenando una fracción minúscula de los parámetros.

Configuración práctica:

- **Dónde aplicarlo**: habitualmente a las matrices de attention (query, key, value, output). Con presupuesto fijo, repartir un rank pequeño entre las cuatro rindió mejor que concentrarlo en una; si solo puedes dos, query y value. Aplicarlo también a las capas feedforward suele mejorar.
- **Rank**: valores entre 4 y 64 suelen bastar; subirlo no siempre mejora y puede sobreajustar (aunque hay tareas donde ranks altos rinden más).
- **α**: escala la contribución de la corrección; la relación α:r suele moverse entre 1:8 y 8:1. Experimenta.

Ventaja al servir: puedes **fusionar** A·B en W (sin latencia extra) o mantener los **adapters** separados y servir **muchos adapters sobre un mismo modelo base** (uno por cliente o tarea), cargando solo unos pocos MB por adapter.

**QLoRA** combina LoRA con el modelo base cuantizado a 4 bits: permite ajustar modelos grandes en una sola GPU.

#### Model merging (mención)

Combinar varios modelos (normalmente ajustados desde el mismo base) en uno: sumando o promediando sus cambios de pesos, apilando capas o concatenando. Útil para reunir capacidades de varias tareas sin servir varios modelos o para evitar que el ajuste en una tarea destruya otras. Es más experimental.

### 7. Tácticas prácticas

**Modelo base.** Al explorar viabilidad, empieza con el más potente que puedas pagar. Dos caminos típicos:

- **Progresión**: prueba el código con el modelo más barato; prueba tus datos con uno mediano (si el loss no baja al añadir datos, algo está mal); exprime el mejor; mapea la frontera precio/rendimiento con varios.
- **Destilación**: ajusta el modelo más fuerte con pocos datos, úsalo para generar más datos y entrena con ellos uno barato.

**Método.** Empieza con LoRA; full finetuning después si hace falta. Full finetuning suele necesitar miles de ejemplos; con unos cientos, LoRA puede rendir igual o mejor. Si necesitas muchos modelos especializados, los adapters se sirven más fácil.

**Framework.** Lo más fácil es una **API de finetuning** (subes datos, eliges base, recibes modelo), limitada a los modelos y parámetros que ofrezca. Con frameworks de código abierto tienes más control pero pones el hardware; para LoRA suele bastar una GPU de gama media. Para varias máquinas, frameworks de entrenamiento distribuido.

**Hiperparámetros clave:**

| Hiperparámetro | Qué controla | Señales |
| --- | --- | --- |
| **Learning rate** | Tamaño del paso de actualización (típico 1e-7 a 1e-3) | Loss que oscila mucho → demasiado alto; loss estable que baja muy lento → demasiado bajo. Se suele usar un *schedule* (más alto al principio, más bajo al final) |
| **Batch size** | Ejemplos por actualización | Menos de ~8 suele ser inestable; más grande = más estable y rápido pero más memoria (*gradient accumulation* simula lotes grandes) |
| **Epochs** | Pasadas por el dataset | Con datasets pequeños se necesitan más; si el loss de validación sube mientras el de entrenamiento baja, hay overfitting |
| **Prompt loss weight** | Cuánto aprende de los tokens del prompt vs de la respuesta | Normalmente se prioriza la respuesta |

Formato de datos típico para SFT con APIs compatibles con OpenAI (JSONL de conversaciones):

```json
{"messages":[{"role":"system","content":"Clasifica tickets en billing|bug|other."},{"role":"user","content":"Me cobraron dos veces"},{"role":"assistant","content":"billing"}]}
{"messages":[{"role":"system","content":"Clasifica tickets en billing|bug|other."},{"role":"user","content":"La app se cierra al abrir el perfil"},{"role":"assistant","content":"bug"}]}
```

Usa **el mismo system prompt y formato** en entrenamiento e inferencia, separa un conjunto de validación y evalúa el modelo ajustado con tu pipeline contra el modelo base con el mejor prompt: si no gana claramente, no merece el costo de mantenerlo.

Errores comunes: ajustar para meter conocimiento que cambia (mejor RAG); ajustar sin línea base de prompting; evaluar solo en la tarea ajustada y no detectar regresiones en otras; datos de entrenamiento con errores (el modelo los aprende); olvidar que habrá que reajustar cuando cambie el modelo base.

## Conceptos clave

- **Transfer learning**: aprovechar lo aprendido en una tarea para aprender otra con menos datos.
- **Continued pre-training**: ajuste auto-supervisado con texto crudo del dominio.
- **"Finetuning para la forma, RAG para los hechos"**: el ajuste corrige comportamiento; RAG aporta información.
- **Backpropagation**: forward pass, cálculo del loss y de gradientes, y actualización de parámetros por el optimizador.
- **Trainable vs frozen parameters**: parámetros que se actualizan frente a los que se mantienen fijos.
- **Optimizer states**: valores extra por parámetro que guarda el optimizador (dos en Adam).
- **BF16 vs FP16**: mismos bits; BF16 con más rango y menos precisión.
- **Quantization (PTQ, QAT)**: reducir bits por valor después o durante el entrenamiento.
- **PEFT / LoRA**: ajustar pocos parámetros; LoRA aprende una corrección de bajo rank A·B sobre pesos congelados.
- **QLoRA**: LoRA sobre un modelo base cuantizado a 4 bits.

## Preguntas de repaso

1. Tu bot responde con información desactualizada y además no respeta el formato JSON. ¿Qué haces primero y por qué?
   R: Primero RAG para el problema de información, porque es más fácil de implementar y no requiere curar datos de entrenamiento ni servir un modelo nuevo; el formato se intenta primero con prompting y validación, y solo si sigue fallando se considera finetuning, que es la herramienta para problemas de comportamiento.
2. Da tres razones para no hacer finetuning al empezar un proyecto.
   R: Requiere una inversión inicial alta en datos anotados y conocimiento de entrenamiento; obliga a servir y mantener el modelo y a decidir qué hacer cuando salen modelos base mejores; y puede degradar el rendimiento en tareas para las que no se ajustó, mientras que mucho de lo que logra se consigue con buen prompting y contexto.
3. ¿Por qué el full finetuning de un modelo de 7B con Adam necesita mucha más memoria que la inferencia?
   R: Porque además de los pesos (14 GB en 16 bits) cada parámetro entrenable necesita su gradiente y dos estados del optimizador, unos 42 GB más, sin contar las activaciones guardadas para backpropagation; en inferencia solo se necesitan pesos, activaciones y KV cache.
4. ¿Qué diferencia hay entre FP16 y BF16 y qué error práctico conviene evitar?
   R: Ambos usan 16 bits, pero BF16 dedica más bits al rango y menos a la precisión, así que representa valores grandes que en FP16 se vuelven infinito, con menos decimales. Hay que cargar cada modelo en el formato en que se publicó; cargar en FP16 un modelo pensado para BF16 puede degradar mucho su calidad.
5. Explica la idea de LoRA y por qué reduce la memoria.
   R: Congela la matriz de pesos original y aprende una corrección como producto de dos matrices pequeñas de rank r; solo esas matrices son entrenables, así que los gradientes y estados del optimizador se calculan para una fracción mínima de parámetros, reduciendo mucho la memoria y los datos necesarios.
6. ¿Qué ventaja tiene LoRA al servir muchos modelos especializados?
   R: Que todos comparten el mismo modelo base cargado una vez y cada especialización es un adapter pequeño que se puede cargar o intercambiar, en lugar de servir varios modelos completos como exigiría el full finetuning.
7. ¿Cómo diagnosticas un learning rate mal elegido mirando la curva de loss?
   R: Si el loss oscila mucho o diverge, el learning rate es demasiado alto; si es estable pero baja muy lentamente, es demasiado bajo. Se busca el valor más alto que mantenga la curva estable, a menudo con un schedule que lo reduce al final.

## Ejercicio

Escribe `adaptation-decision.md` para tres casos: (a) un bot que responde sobre el reglamento interno que cambia cada mes, (b) un generador de consultas en un DSL interno que nadie fuera de la empresa usa, (c) un clasificador de tickets que funciona bien con un prompt de 2 000 tokens pero es caro y lento. Para cada uno: tipo de fallo (información o comportamiento), técnica elegida, datos necesarios y cómo lo evaluarías. Después implementa `inferenceGB` y `finetuneGB` y calcula la memoria para un modelo de 8B en: inferencia BF16, inferencia INT4, full finetuning BF16 con Adam y LoRA con 40M parámetros entrenables. Prepara además 20 líneas JSONL en formato de conversación para el caso (c). Terminado cuando el documento cubre los tres casos con las cuatro respuestas, tienes la tabla de memoria y el JSONL es válido.

## Explícalo con tus palabras

Explica a tu jefe por qué "hagamos finetuning con nuestros documentos para que el modelo sepa todo de la empresa" probablemente no es la mejor idea y qué propondrías en su lugar.
