---
title: Post-training, sampling y la naturaleza probabilística de la IA
kind: lesson
hours: 2
sources: AI Engineering (Chip Huyen), cap. 2, Post-Training y Sampling (pp. 169–231)
---

## Objetivo

Entender cómo un completador de texto se convierte en asistente (SFT y preference finetuning), cómo elige el modelo cada token (temperature, top-k, top-p), cómo obtener salidas estructuradas confiables y por qué existen la inconsistencia y las alucinaciones.

## Estudio

### 1. Del completador al asistente: post-training

Un modelo recién salido del pre-training tiene dos problemas. Primero, está optimizado para **completar** texto, no para conversar: si le escribes "Cómo hacer pizza", continuaciones igual de válidas para él son "para seis personas?", "¿Qué ingredientes necesito?" o, con suerte, la receta. Segundo, aprendió de internet sin filtro, así que puede ser grosero, sesgado o simplemente estar equivocado.

El **post-training** ataca ambos problemas en dos pasos:

1. **Supervised finetuning (SFT)**: se entrena con ejemplos de alta calidad de instrucciones y respuestas para que aprenda a responder en vez de completar.
2. **Preference finetuning**: se ajusta para que sus respuestas coincidan con lo que las personas prefieren. Técnicas típicas: RLHF (*reinforcement learning from human feedback*), DPO (*direct preference optimization*) y RLAIF (feedback de otra IA).

Una forma de verlo: el pre-training optimiza la calidad **a nivel de token** (predecir bien el siguiente); a los usuarios les importa la calidad **de la respuesta completa**, y eso es lo que optimiza el post-training. El pre-training es leer para adquirir conocimiento; el post-training es aprender a usarlo. Y es barato en comparación: en un caso público, el post-training consumió alrededor del 2 % del cómputo total frente al 98 % del pre-training. Por eso se dice que el post-training **desbloquea** capacidades que el modelo ya tenía pero que eran difíciles de sacar solo con prompts.

Hay una imagen popular: el modelo pre-entrenado es un monstruo indomable (aprendió de todo internet), el SFT lo vuelve socialmente aceptable y el preference finetuning le pone una cara sonriente para presentarlo a clientes. La cara sonriente no elimina al monstruo; por eso los jailbreaks (sesión 10) a veces lo sacan a relucir.

#### SFT: clonar comportamiento con demostraciones

El modelo imita sus datos. Para que responda bien, le muestras pares `(prompt, respuesta)` llamados **demonstration data**; a esto también se le dice *behavior cloning*. Las demostraciones deben cubrir el rango de tareas que quieres (preguntas, resúmenes, traducción, clasificación, brainstorming…).

Escribir buenas demostraciones es caro: requiere pensamiento crítico, buscar información y juicio sobre qué peticiones son apropiadas. Los anotadores suelen tener formación universitaria y un par puede tardar hasta media hora. Con unos 10 dólares por par, 13 000 pares cuestan más de cien mil dólares, sin contar diseño y control de calidad. Alternativas más baratas: voluntarios (con riesgo de sesgo demográfico), heurísticas para extraer diálogos de internet o **datos sintéticos** generados por IA (sesión 16).

#### Preference finetuning: qué conversaciones debe tener

Saber conversar no dice *qué* conversaciones tener. ¿Debe ayudar a alguien a hacer daño? Fácil: no. ¿Y en temas políticos o culturales polémicos? Personas razonables no se ponen de acuerdo; si el modelo opina, molesta a alguien; si censura demasiado, aburre. El preference finetuning busca alinear el modelo con "la preferencia humana", que es un objetivo ambicioso (asume que existe una preferencia universal y que se puede codificar).

**RLHF** tiene dos partes:

1. **Entrenar un reward model** que puntúa respuestas.
2. **Optimizar el modelo** para que genere respuestas con puntuación alta (tradicionalmente con un algoritmo de refuerzo llamado PPO).

¿Cómo se consiguen datos para el reward model? Pedir a personas una nota del 1 al 10 (**pointwise**) es poco fiable: dos anotadores dan notas distintas a la misma respuesta, e incluso la misma persona varía. Es mucho más fácil **comparar** dos respuestas y elegir la mejor. Así se obtienen **comparison data** con forma `(prompt, respuesta_ganadora, respuesta_perdedora)`. Aun así cuesta: comparar dos respuestas toma minutos porque hay que verificar hechos, y el acuerdo entre anotadores ronda el 70 %. Ranking de tres respuestas A > B > C produce tres pares.

El reward model se entrena para que la puntuación de la ganadora supere a la de la perdedora (se maximiza la diferencia entre ambas puntuaciones). Un detalle que reaparece en la sesión 5: se cree que **juzgar es más fácil que generar**, así que un modelo no necesariamente debe ser más fuerte que el que evalúa.

**DPO** simplifica el proceso: aprende directamente de las preferencias sin entrenar un reward model separado ni usar refuerzo; algunas familias de modelos migraron a DPO para reducir complejidad.

Un atajo que usan empresas reales: **saltarse el refuerzo** y usar solo el reward model para elegir la mejor de varias respuestas generadas. Eso se llama **best of N** y conecta con la siguiente sección.

### 2. Sampling: cómo se elige cada token

Para generar el siguiente token, la red produce un vector de **logits**, un número por cada token del vocabulario. Los logits no son probabilidades (pueden ser negativos y no suman 1); un **softmax** los convierte en probabilidades:

`p_i = e^(x_i) / Σ_j e^(x_j)`

Ahora hay que elegir. Opciones:

- **Greedy sampling**: siempre el token más probable. Sirve para clasificación, pero en texto produce respuestas planas y repetitivas.
- **Muestrear según la distribución**: si "verde" tiene 50 % y "rojo" 30 %, sale "verde" la mitad de las veces y "rojo" un 30 %.

#### Temperature

La **temperature** divide los logits antes del softmax. Con temperatura baja, las diferencias se agrandan y el token favorito gana casi siempre; con temperatura alta, la distribución se aplana y aparecen tokens raros (más creatividad, menos coherencia).

```ts
function softmaxWithTemperature(logits: number[], t: number): number[] {
  const scaled = logits.map((x) => x / t);
  const max = Math.max(...scaled);
  const exps = scaled.map((x) => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => +(e / sum).toFixed(3));
}

const logits = [1, 2]; // tokens A y B
for (const t of [0.1, 0.5, 1, 2]) {
  console.log(t, softmaxWithTemperature(logits, t));
}
// 0.1 -> [0, 1]          casi determinista
// 0.5 -> [0.119, 0.881]
// 1   -> [0.269, 0.731]  distribución original
// 2   -> [0.378, 0.622]  más plana
```

Notas prácticas:

- "Temperature 0" no es una división por cero: los proveedores simplemente eligen el token de mayor logit (greedy).
- Los proveedores suelen limitarla entre 0 y 2. Un valor cerca de 0.7 es un punto de partida típico para tareas creativas; para extracción o evaluación, cerca de 0.
- Muchas APIs exponen **logprobs** (logaritmos de probabilidades). Se usan en escala logarítmica porque con vocabularios de cien mil tokens las probabilidades pueden ser tan pequeñas que se redondean a cero (*underflow*). Son útiles para clasificación, evaluación y depuración; no todos los proveedores las ofrecen, en parte porque facilitan copiar el modelo.

#### Top-k, top-p y min-p

- **Top-k**: considera solo los k tokens con mayor logit (k entre 50 y 500) y muestrea entre ellos. Reduce cómputo; k pequeño = texto más predecible.
- **Top-p** (*nucleus sampling*): ordena los tokens por probabilidad y se queda con el conjunto mínimo cuya probabilidad acumulada supera p (típico 0.9–0.95). Es dinámico: ante "Responde solo sí o no" quedarán dos candidatos; ante "¿Cuál es el sentido de la vida?", muchos.
- **Min-p**: descarta tokens cuya probabilidad no alcanza un mínimo.

```ts
function topP(probs: Record<string, number>, p: number): string[] {
  const sorted = Object.entries(probs).sort((a, b) => b[1] - a[1]);
  const kept: string[] = [];
  let acc = 0;
  for (const [token, prob] of sorted) {
    kept.push(token);
    acc += prob;
    if (acc >= p) break;
  }
  return kept;
}
console.log(topP({ sí: 0.6, quizás: 0.32, no: 0.07, "🍕": 0.01 }, 0.9)); // ["sí", "quizás"]
```

#### Condiciones de parada

Salidas largas cuestan más, tardan más y a veces molestan. Puedes cortar por **número máximo de tokens** (riesgo: frase a medias) o con **stop tokens/stop words** (por ejemplo, el token de fin de secuencia). Cuidado: si pides JSON y cortas antes de tiempo, el JSON queda sin cerrar y no se puede parsear.

### 3. Test time compute: generar varias y elegir

En vez de una respuesta por petición, generas varias y eliges la mejor. A eso se le llama **test time compute** (más cómputo en inferencia). Formas de hacerlo:

- **Best of N**: generas N respuestas independientes y eliges.
- **Beam search**: en cada paso mantienes solo los candidatos más prometedores.
- Aumentar la **diversidad** variando temperatura o top-p entre muestras, porque opciones diversas tienen más probabilidad de incluir una buena.

¿Cómo eliges?

| Criterio | Cómo funciona | Cuándo usarlo |
| --- | --- | --- |
| Mayor probabilidad | La probabilidad de la secuencia es el producto de las de sus tokens; en logprobs, la suma. Se usa el **promedio** por token para no favorecer respuestas cortas | Cuando tienes logprobs |
| Reward model / verifier | Otro modelo puntúa cada candidata | Calidad general; en matemáticas, un verificador puede valer tanto como un modelo decenas de veces más grande |
| Heurística | La más corta, la primera que compila, la primera SQL válida | Criterio objetivo barato |
| Mayoría (*self-consistency*) | Resuelves varias veces y eliges la respuesta más frecuente | Respuestas exactas: matemáticas, opción múltiple |
| La primera válida | Lanzas varias en paralelo y muestras la primera que termina bien | Reducir latencia percibida |

El costo crece casi linealmente: dos salidas cuestan cerca del doble. Y la mejora no es infinita: en algunos experimentos rinde hasta cientos de muestras y luego empeora porque aparecen respuestas que engañan al verificador.

Concepto relacionado: un modelo es **robusto** si pequeños cambios en la entrada no cambian mucho la salida. Cuanto menos robusto, más ganas con múltiples intentos. Ejemplo real: un modelo que leía datos de una foto de producto acertaba solo la mitad de las veces; con tres intentos por imagen acertaba en la mayoría.

```ts
// self-consistency: votación por mayoría sobre N respuestas
async function majorityAnswer(question: string, n = 5): Promise<string> {
  const answers = await Promise.all(
    Array.from({ length: n }, () =>
      chat([
        { role: "system", content: "Responde solo con el número final, sin texto." },
        { role: "user", content: question },
      ], 0.8),
    ),
  );
  const counts = new Map<string, number>();
  for (const a of answers.map((s) => s.trim())) counts.set(a, (counts.get(a) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
```

(`chat` es la función de la sesión 1.)

### 4. Salidas estructuradas

En producción casi siempre necesitas un formato concreto, por dos razones:

1. **La tarea es estructurada**: *semantic parsing*, como texto a SQL, texto a regex o clasificación en clases válidas.
2. **Otra pieza de software consume la salida**: el correo puede ser libre, pero tu backend espera `{"title": ..., "body": ...}`. En agentes (sesión 14), la salida del modelo es la entrada de una herramienta.

Hay cinco niveles para conseguirlo, de "curita" a "tratamiento intensivo":

| Nivel | Qué haces | Fortaleza | Debilidad |
| --- | --- | --- | --- |
| **Prompting** | Pides el formato con instrucciones y ejemplos | Gratis | Sin garantía; un pequeño % de salidas inválidas puede ser inaceptable |
| **Post-processing** | Arreglas con código los errores recurrentes (cerrar llaves, quitar texto antes del JSON) | Barato y sorprendentemente eficaz: los modelos repiten los mismos errores | Solo arregla errores pequeños |
| **Test time compute** | Reintentas hasta obtener una salida válida | Simple | Costo y latencia extra |
| **Constrained sampling** | Filtras los logits para permitir solo tokens válidos según una gramática | Garantía fuerte de formato | Necesita gramática por formato; puede añadir latencia; requiere control del sampling |
| **Finetuning** | Entrenas con ejemplos en el formato (o añades una *classifier head*) | Lo más efectivo y general | Costo de datos y entrenamiento |

Observaciones útiles:

- El **JSON mode** de muchas APIs garantiza JSON válido, **no** que tenga las claves o valores correctos. Y si se alcanza `max_tokens`, igualmente queda truncado.
- Un parser defensivo de YAML subió un caso real de 90 % a más del 99.9 % de salidas válidas. YAML además gasta menos tokens que JSON.
- Usar una segunda llamada de IA para validar o corregir funciona, pero duplica costo y latencia.

Patrón recomendado en TypeScript: pedir JSON, extraerlo con tolerancia, validar y reintentar una vez.

```ts
type Ticket = { category: "billing" | "bug" | "other"; urgent: boolean };

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No hay JSON en la salida");
  return JSON.parse(text.slice(start, end + 1)); // tolera texto alrededor y bloques ```json
}

function isTicket(x: any): x is Ticket {
  return ["billing", "bug", "other"].includes(x?.category) && typeof x?.urgent === "boolean";
}

async function classify(message: string, retries = 1): Promise<Ticket> {
  const out = await chat([
    { role: "system", content: 'Clasifica el mensaje. Devuelve SOLO JSON: {"category":"billing|bug|other","urgent":true|false}' },
    { role: "user", content: message },
  ], 0);
  try {
    const parsed = extractJson(out);
    if (isTicket(parsed)) return parsed;
    throw new Error("JSON con forma inválida");
  } catch (err) {
    if (retries > 0) return classify(message, retries - 1);
    throw err;
  }
}
```

### 5. La naturaleza probabilística: inconsistencia y alucinación

Si le preguntas dos veces a un amigo cuál es la mejor cocina del mundo, responderá lo mismo. Un modelo que asigna 70 % a "vietnamita" y 30 % a "italiana" responderá "italiana" tres de cada diez veces. Eso es ser **probabilístico** (lo opuesto a determinista). Es genial para tareas creativas y un dolor para todo lo demás. Además: **cualquier cosa con probabilidad distinta de cero puede salir**, por absurda que sea.

#### Inconsistencia

Dos escenarios:

1. **Misma entrada, salidas distintas**. Mitigación: cachear respuestas, fijar temperature/top-p/top-k y la **seed**. Aun así no hay garantía total: el hardware puede introducir diferencias numéricas, y con un proveedor no controlas el hardware. Un ejemplo real: el mismo prompt para calificar un ensayo dio 3/5 una vez y 5/5 la siguiente. Imagina a un profesor que solo califica consistente si se sienta en cierta silla.
2. **Entrada ligeramente distinta, salida muy distinta** (una mayúscula cambia todo). Más difícil: ayudan prompts cuidadosos (sesión 8) y sistemas de memoria (sesión 14).

#### Alucinación

Una **alucinación** es una respuesta no fundamentada en hechos. Es fatal en tareas que dependen de la exactitud: un despacho de abogados fue multado por presentar jurisprudencia inventada por un chatbot. Hay dos hipótesis complementarias sobre su causa:

1. **Self-delusion (autoengaño)**: el modelo no distingue entre lo que le diste y lo que él mismo generó. Si su primera frase es un error ("X es arquitecta"), las siguientes se condicionan a ese error y lo amplifican: **snowballing hallucinations**. Se ha mostrado que una suposición inicial errónea lleva al modelo a fallar preguntas que sí sabría responder (como afirmar que un número es divisible por 13 cuando no lo es).
2. **Desajuste de conocimiento**: en SFT el modelo imita respuestas escritas por anotadores que saben cosas que el modelo no sabe. Así le enseñamos a "responder con seguridad aunque no sepa", es decir, a inventar. Una propuesta derivada: si los modelos "saben lo que saben", se puede (a) pedirles que citen las fuentes de su respuesta y (b) usar funciones de recompensa que castiguen más inventar.

Lo que puedes hacer como AI engineer hoy:

- Instrucciones del tipo "si no estás seguro, di que no lo sabes".
- Pedir respuestas **concisas**: menos tokens, menos oportunidades de inventar.
- **Dar el contexto** con los hechos (RAG, sesiones 11–13) y pedir que responda solo con él, citando.
- Detectar y medir alucinaciones en evaluación (sesiones 4–7).
- Temperatura baja para tareas factuales (reduce variación, no elimina alucinaciones).

### 6. Resumen de decisiones de sampling

| Caso | Temperature | Otras opciones |
| --- | --- | --- |
| Extracción, clasificación, evaluación (judge) | 0–0.2 | JSON + validación, seed fija |
| Respuestas factuales con RAG | 0–0.3 | Pedir citas, concisión |
| Redacción, marketing, brainstorming | 0.7–1.0 | top-p 0.9–0.95, varias muestras |
| Problemas con respuesta exacta | 0.5–0.8 por muestra | Self-consistency (mayoría) |

Errores comunes: creer que temperatura 0 garantiza determinismo; confiar en JSON mode para la validez semántica; poner `max_tokens` demasiado bajo con salidas estructuradas; usar best-of-N sin medir si compensa el costo.

## Conceptos clave

- **Supervised finetuning (SFT)**: entrenar con pares (prompt, respuesta) de alta calidad para que el modelo responda en vez de completar.
- **Preference finetuning**: ajustar el modelo para que prefiera respuestas que las personas prefieren (RLHF, DPO, RLAIF).
- **Reward model**: modelo que puntúa la calidad de una respuesta; se entrena con datos de comparación.
- **Logits**: puntuaciones crudas por token antes del softmax.
- **Temperature**: divisor de los logits que controla qué tan plana es la distribución de probabilidad.
- **Top-p (nucleus sampling)**: muestrear del conjunto mínimo de tokens cuya probabilidad acumulada supera p.
- **Test time compute**: generar varias salidas por petición y seleccionar la mejor.
- **Constrained sampling**: filtrar tokens inválidos según una gramática para garantizar el formato.
- **Inconsistencia**: salidas distintas ante la misma entrada o ante entradas casi iguales.
- **Alucinación**: respuesta no fundamentada en hechos; puede crecer como bola de nieve.

## Preguntas de repaso

1. ¿Qué problema resuelve el SFT y cuál el preference finetuning?
   R: El SFT convierte un modelo que completa texto en uno que responde peticiones, imitando demostraciones de alta calidad. El preference finetuning decide qué tipo de respuestas son preferibles (útiles, seguras, en el tono adecuado), alineando el modelo con preferencias humanas mediante comparaciones.
2. ¿Por qué el reward model se entrena con comparaciones y no con notas absolutas?
   R: Porque las notas absolutas (pointwise) varían mucho entre anotadores e incluso para la misma persona; decidir cuál de dos respuestas es mejor es una tarea más fácil y consistente, y se puede entrenar al modelo para que la ganadora reciba mayor puntuación que la perdedora.
3. ¿Qué efecto tiene subir la temperature y cuándo conviene bajarla?
   R: Subirla aplana la distribución de probabilidades, dando más opciones a tokens poco probables: más creatividad y menos coherencia. Conviene bajarla (cerca de 0) en tareas que necesitan consistencia, como extracción, clasificación o usar el modelo como juez.
4. ¿En qué se diferencian top-k y top-p?
   R: Top-k siempre considera un número fijo de tokens candidatos; top-p considera un número variable, el conjunto mínimo cuya probabilidad acumulada supera p, de modo que se adapta a si la respuesta es cerrada (pocos candidatos) o abierta (muchos).
5. ¿Qué garantiza el JSON mode de una API y qué no?
   R: Garantiza que la salida sea JSON sintácticamente válido, pero no que tenga las claves, tipos o valores correctos, y puede quedar truncado si se alcanza el límite de tokens. Sigue haciendo falta validar el contenido.
6. Explica la hipótesis de self-delusion sobre las alucinaciones.
   R: El modelo trata lo que él mismo generó igual que la información que recibió. Si produce una afirmación errónea al principio, las siguientes predicciones se condicionan a ella y el error se amplifica, generando una bola de nieve de hechos inventados.
7. ¿Cuándo es útil la votación por mayoría entre varias respuestas?
   R: En tareas con respuesta exacta y comparable, como problemas matemáticos o preguntas de opción múltiple: se genera varias veces y se elige la respuesta más frecuente, lo que reduce errores aleatorios a cambio de más costo.

## Ejercicio

Implementa `classify.ts` con la función `classify` de la lección para clasificar mensajes de soporte en `billing | bug | other` con un campo `urgent`. Prepara 15 mensajes de prueba en español con su etiqueta esperada. Ejecuta la clasificación tres veces con temperature 0 y tres veces con temperature 1, y reporta: (a) porcentaje de salidas JSON válidas antes del reintento, (b) exactitud frente a las etiquetas, (c) cuántos mensajes recibieron etiquetas distintas entre ejecuciones. Terminado cuando tienes una tabla con esas tres métricas para ambas temperaturas y una frase que explica la diferencia.

## Explícalo con tus palabras

Explica a alguien sin formación técnica por qué un chatbot puede darte dos respuestas distintas a la misma pregunta y por qué a veces inventa datos con total seguridad.
