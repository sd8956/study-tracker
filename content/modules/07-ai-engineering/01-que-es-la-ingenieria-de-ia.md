---
title: Qué es la ingeniería de IA y cómo planear una aplicación
kind: lesson
hours: 2
sources: AI Engineering (Chip Huyen), cap. 1 (pp. 32–118)
links: OpenAI Tokenizer | https://platform.openai.com/tokenizer
---

## Objetivo

Entender de dónde vienen los foundation models, qué hace distinto a un AI engineer frente a un ML engineer y cómo decidir si una aplicación de IA vale la pena, qué la hace exitosa y cómo se mantiene en el tiempo.

## Estudio

### 1. De modelos de lenguaje a foundation models

Un **modelo de lenguaje** guarda información estadística sobre un idioma: dado un contexto, qué tan probable es que aparezca cada pieza de texto a continuación. Si el contexto es "Mi color favorito es ___", un modelo entrenado con español debería asignar más probabilidad a "azul" que a "puerta". Esta idea es vieja: los criptógrafos ya usaban frecuencias de letras para romper cifrados, y Claude Shannon formalizó en los años cincuenta conceptos como la **entropía** del inglés escrito, que hoy siguen siendo la base para medir modelos (lo verás en la sesión 4).

La unidad básica no es la palabra sino el **token**. Un token puede ser un carácter, una palabra completa o un fragmento ("-ción", "pre-"). El proceso de partir un texto en tokens se llama **tokenization**, y el conjunto de todos los tokens que el modelo conoce es su **vocabulary**. Como regla práctica para modelos de la familia GPT en inglés, un token equivale a unas tres cuartas partes de una palabra: 100 tokens son unas 75 palabras. En español la proporción suele ser peor (más tokens por palabra), y eso importa porque **pagas y esperas por token**.

¿Por qué tokens y no palabras o caracteres?

| Unidad | Ventaja | Problema |
| --- | --- | --- |
| Carácter | Vocabulario minúsculo | Secuencias larguísimas, poco significado por unidad |
| Palabra | Mucho significado por unidad | Vocabulario gigante, palabras nuevas desconocidas |
| Token (subpalabra) | Equilibrio: pocas decenas de miles de unidades, puede componer palabras nuevas | Cuenta de tokens poco intuitiva, varía por idioma |

Hay dos grandes familias de modelos de lenguaje:

- **Masked language model**: predice tokens que faltan en medio de un texto usando contexto a ambos lados (por ejemplo BERT). Útil para clasificación, análisis de sentimiento o para entender código.
- **Autoregressive language model**: predice el siguiente token usando solo lo que vino antes. Es el tipo que genera texto, y es al que nos referimos en todo el módulo cuando decimos "modelo de lenguaje".

Un modelo autoregresivo es, en el fondo, una **máquina de completar**. Le das un texto (el prompt) y lo continúa. Esa idea, que parece pobre, cubre una cantidad enorme de tareas. Traducir es completar "'¿Cómo estás?' en francés es…". Clasificar spam es completar "Correo: <texto>. ¿Es spam? Respuesta:". Lo importante es que la continuación es una **predicción probabilística**, no una verdad garantizada. También explica algo raro de los modelos "crudos": si le haces una pregunta a un modelo que solo completa, puede que responda con otra pregunta, porque eso también es una continuación plausible. Convertir un completador en un asistente que responde es trabajo del post-training (sesión 3).

### 2. La pieza que permitió escalar: self-supervision

La mayoría de los modelos clásicos de machine learning necesitan **supervisión**: alguien etiqueta ejemplos ("fraude"/"no fraude", "gato"/"perro"). Etiquetar es lento y caro. Si etiquetar una imagen cuesta unos centavos, un millón de imágenes cuesta decenas de miles de dólares; etiquetar tomografías requiere médicos y el costo explota.

Los modelos de lenguaje evitan ese cuello de botella con **self-supervision**: las etiquetas salen del propio texto. La frase "Me gusta la comida callejera." genera automáticamente varios ejemplos de entrenamiento:

```
contexto                              -> siguiente token
<BOS>                                 -> Me
<BOS> Me                              -> gusta
<BOS> Me gusta                        -> la
<BOS> Me gusta la                     -> comida
<BOS> Me gusta la comida              -> callejera
<BOS> Me gusta la comida callejera    -> .
<BOS> Me gusta la comida callejera .  -> <EOS>
```

`<BOS>` y `<EOS>` marcan inicio y fin de secuencia. El marcador de fin es clave: es lo que le enseña al modelo a **dejar de generar**. No confundas self-supervision con unsupervised learning: en la primera las etiquetas existen, solo que se infieren de los datos; en la segunda no hay etiquetas.

Como hay texto por todas partes (libros, foros, código, artículos), se pueden construir datasets gigantes sin pagar etiquetado. Así los modelos pudieron crecer en **parámetros** (las variables que se ajustan durante el entrenamiento). "Grande" es relativo: el primer GPT de 2018 tenía 117 millones de parámetros y se consideraba enorme; poco después eso era "pequeño". Un modelo más grande tiene más capacidad de aprender, pero también **necesita más datos** para aprovechar esa capacidad; entrenar un modelo enorme con pocos datos desperdicia cómputo.

### 3. De LLM a foundation model

Los humanos no percibimos el mundo solo con texto. Por eso los modelos se extendieron a otras **modalidades**: imagen, audio, video. Un modelo que trabaja con más de una modalidad es **multimodal**, y si además genera, se le llama large multimodal model (LMM). El término **foundation model** agrupa LLMs y LMMs y transmite dos ideas: son la base sobre la que se construyen aplicaciones y se pueden adaptar a muchas necesidades.

El salto conceptual es pasar de **modelos por tarea** a **modelos de propósito general**. Antes entrenabas un modelo para sentimiento y otro para traducción. Hoy un mismo modelo hace ambas cosas razonablemente bien "de fábrica", y tú lo ajustas para tu caso.

Ejemplo: una tienda quiere descripciones de producto generadas automáticamente. El modelo de fábrica escribe descripciones correctas pero genéricas, sin la voz de la marca. Tienes tres palancas que recorren todo este módulo:

| Técnica | Qué cambias | Costo de entrada | Cuándo brilla |
| --- | --- | --- | --- |
| **Prompt engineering** | Las instrucciones y ejemplos que le das | Muy bajo (minutos) | Tareas que el modelo ya sabe hacer, falta decirle cómo |
| **RAG** (retrieval-augmented generation) | El contexto: le pasas información relevante recuperada de tus datos | Medio (indexar datos) | Falta información (catálogo, reseñas, documentación interna) |
| **Finetuning** | Los pesos del modelo | Alto (datos, cómputo, evaluación) | Falta comportamiento: formato, estilo, tareas nuevas, latencia/costo |

Adaptar un modelo existente es muchísimo más barato que entrenar uno desde cero: algo así como "diez ejemplos y un fin de semana" frente a "un millón de ejemplos y seis meses". Aun así, los modelos específicos de una tarea siguen teniendo ventajas: pueden ser mucho más pequeños, rápidos y baratos.

### 4. Por qué ahora existe la "ingeniería de IA"

Se ha construido IA en producción por más de una década (ML engineering, MLOps). Lo nuevo es que la mayoría de equipos ya **no entrena modelos**: usa modelos que entrenó otro. Tres factores empujan la disciplina:

1. **Capacidades de propósito general**: aplicaciones que eran imposibles ahora existen, y cualquier tarea que involucre comunicación es candidata a automatizarse total o parcialmente.
2. **Inversión**: el costo de construir cayó drásticamente y las empresas compiten por incorporar IA.
3. **Barrera de entrada baja**: el modelo como servicio (*model as a service*) expone modelos vía API. Con un `POST` HTTP tienes acceso a un modelo enorme sin GPUs propias.

Ese tercer factor es el tuyo. Así se ve una llamada a un endpoint compatible con OpenAI desde TypeScript, sin librerías:

```ts
// chat.ts — ejecuta con: NAN_API_KEY=... npx tsx chat.ts
const BASE_URL = "https://api.nan.builders/v1";
const MODEL = "deepseek-v4-flash";

type Message = { role: "system" | "user" | "assistant"; content: string };

export async function chat(messages: Message[], temperature = 0.7): Promise<string> {
  const apiKey = process.env.NAN_API_KEY;
  if (!apiKey) throw new Error("Falta NAN_API_KEY en el entorno");

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, messages, temperature }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content as string;
}

const answer = await chat([
  { role: "system", content: "Eres un asistente conciso. Responde en español." },
  { role: "user", content: "Explica qué es un token en una frase." },
]);
console.log(answer);
```

Nota tres cosas que se repiten en todo el módulo: la clave vive en el entorno, la respuesta viene en `choices[0].message.content`, y `temperature` controla cuánta aleatoriedad hay (sesión 3).

### 5. Casos de uso y cómo pensarlos

Los casos de uso son prácticamente infinitos y cada encuesta los clasifica distinto. Para orientarte, agrúpalos por patrón:

- **Código**: autocompletado, generación de tests, migraciones, explicación de código legado.
- **Generación de imagen y video**: marketing, prototipos visuales.
- **Escritura**: correos, textos de producto, resúmenes.
- **Educación**: tutores personalizados, generación de ejercicios (este módulo es un ejemplo).
- **Bots conversacionales**: soporte al cliente, asistentes internos.
- **Agregación de información**: resumir reuniones, documentos, noticias.
- **Organización de datos**: extraer campos estructurados de facturas, contratos, correos.
- **Automatización de flujos**: agentes que ejecutan pasos con herramientas.

Un patrón útil: los casos con **bajo riesgo por error y alto volumen** (borradores internos, clasificación con revisión humana) son más fáciles de lanzar que los de **alto riesgo** (respuestas médicas, decisiones financieras automáticas).

### 6. Planear una aplicación de IA

#### ¿Por qué construirla?

Ordena la motivación por nivel de riesgo para tu negocio:

1. **Riesgo existencial**: si no lo haces, un competidor con IA te vuelve obsoleto. Prioridad máxima, y probablemente conviene construir in-house.
2. **Oportunidad**: si no lo haces, pierdes productividad o ingresos. Aquí comprar soluciones existentes puede ser más barato y mejor.
3. **Exploración**: no sabes dónde encaja la IA, pero no quieres quedarte atrás. Inversión acotada, tipo I+D.

#### El rol de la IA y de los humanos

Tres ejes ayudan a definir requisitos:

| Eje | Opción A | Opción B | Consecuencia |
| --- | --- | --- | --- |
| Importancia | **Crítica** (la app no funciona sin IA, ej. desbloqueo facial) | **Complementaria** (la app funciona sin ella, ej. autocompletar correo) | Cuanto más crítica, más exigencia de precisión |
| Disparo | **Reactiva** (responde a una petición, ej. chatbot) | **Proactiva** (aparece cuando hay oportunidad, ej. alerta de tráfico) | Reactiva exige baja latencia; proactiva exige alta calidad porque nadie la pidió |
| Actualización | **Dinámica** (se adapta continuamente al usuario) | **Estática** (se actualiza con versiones) | Dinámica implica personalización y memoria |

Sobre los humanos: ¿la IA sugiere, decide en casos simples o decide todo? Involucrar personas en el proceso se llama **human-in-the-loop**. Un esquema gradual muy razonable es **Crawl–Walk–Run**: primero la IA solo sugiere y un humano decide siempre; luego interactúa directamente con empleados internos; al final interactúa con usuarios externos. Avanzas de etapa con evidencia. Ejemplo: si los agentes de soporte aceptan sin cambios el 95 % de las respuestas sugeridas para preguntas simples, puedes dejar que la IA responda esas preguntas directamente.

#### Defensibilidad

Si es fácil de construir para ti, es fácil para tu competencia. Y si tu producto es una capa fina sobre un modelo, la siguiente versión del modelo puede absorber tu funcionalidad (piensa en un "parser de PDF sobre un LLM" el día que el LLM lee PDFs bien). Las ventajas competitivas clásicas son tres: **tecnología** (cada vez más parecida entre empresas), **distribución** (suele favorecer a las grandes) y **datos**. Los datos de uso, incluso si no se usan para entrenar, revelan qué falla y qué quieren los usuarios: llegar primero y aprender rápido puede ser tu foso.

#### Expectativas y métricas

Define el éxito antes de construir. La métrica principal es de **negocio**: en un chatbot de soporte, qué porcentaje de mensajes se automatiza, cuántos mensajes más se procesan, cuánto baja el tiempo de respuesta, cuánto trabajo humano se ahorra. Pero responder más no significa usuarios más contentos: mide también satisfacción.

Fija un **umbral de utilidad** (*usefulness threshold*): qué tan bueno tiene que ser para que valga la pena ponerlo frente a usuarios. Suele combinar:

- **Calidad** de las respuestas.
- **Latencia**: TTFT (*time to first token*), TPOT (*time per output token*) y latencia total. Lo aceptable depende del contexto: si hoy un humano responde en una hora, un bot que tarda 20 segundos ya es un salto.
- **Costo** por petición.
- Otros: interpretabilidad, equidad (*fairness*).

#### Hitos y la "última milla"

Evalúa modelos existentes antes de planear: si quieres automatizar el 60 % de los tickets y el modelo de fábrica ya automatiza el 30 %, el esfuerzo es menor que partiendo de cero. Después de evaluar, a veces descubres que el esfuerzo no compensa, y eso también es un resultado valioso.

El error más común de planeación es confiar en la demo. Con foundation models, pasar de 0 a 60 es fácil; de 60 a 100 es extremadamente difícil. Equipos reales reportan llegar al 80 % de la experiencia deseada en un mes y tardar cuatro meses más en superar el 95 %, peleando con alucinaciones y casos raros. Una demo de fin de semana no predice un producto.

```
calidad
100% |                         ........----
 95% |                 ....''''
 80% |        .--''''
     |     .-'
     |   .'          <- la demo vive aquí
     |  /
   0 +-----------------------------------> tiempo
       1 mes        5 meses
```

#### Mantenimiento

Construir sobre foundation models es subirse a un tren muy rápido. Muchos cambios son buenos (contextos más largos, modelos mejores, inferencia más barata), pero todos generan fricción: la opción más barata hoy puede ser la más cara mañana, un proveedor puede desaparecer y cada modelo nuevo tiene manías distintas que obligan a reajustar prompts. Lo que te protege es tener **versionado y evaluación automatizada**: si puedes medir tu sistema en minutos, cambiar de modelo es un experimento, no una apuesta. Otros cambios son más duros: regulación sobre datos (como GDPR), restricciones de cómputo y propiedad intelectual de lo que el modelo genera.

### 7. El stack de ingeniería de IA

Toda aplicación de IA tiene tres capas. Normalmente empiezas arriba y bajas solo cuando lo necesitas:

```
┌──────────────────────────────────────────────┐
│ Application development                      │
│  prompts, contexto (RAG), evaluación, UI     │
├──────────────────────────────────────────────┤
│ Model development                            │
│  modelado y entrenamiento, finetuning,       │
│  dataset engineering, inference optimization │
├──────────────────────────────────────────────┤
│ Infrastructure                               │
│  serving, datos, cómputo (GPUs), monitoreo   │
└──────────────────────────────────────────────┘
```

Muchos principios de ML siguen vigentes: conectar métricas de negocio con métricas del modelo, experimentar sistemáticamente (antes con hiperparámetros, ahora con modelos, prompts, algoritmos de retrieval y parámetros de sampling), hacer los modelos más rápidos y baratos, y cerrar el ciclo con datos de producción.

#### AI engineering vs ML engineering

Las diferencias principales son tres:

1. **Adaptas en vez de entrenar.** El foco se mueve de modelar a adaptar modelos ajenos.
2. **Modelos más grandes**: más cómputo, más latencia, más presión por optimizar inferencia.
3. **Salidas abiertas** (*open-ended*): el modelo puede responder cualquier cosa, lo que lo hace versátil pero **mucho más difícil de evaluar**. Por eso la evaluación es la mitad de este módulo.

Las técnicas de adaptación se dividen según si cambian los pesos:

- **Prompt-based** (prompt engineering, RAG): no tocan los pesos. Rápidas de probar, necesitan pocos datos, permiten probar muchos modelos.
- **Finetuning**: cambia los pesos. Más complejo y con más datos, pero puede mejorar calidad, latencia y costo, y es la única vía para ciertas capacidades nuevas.

Vocabulario que conviene tener claro:

| Término | Qué significa |
| --- | --- |
| Pre-training | Entrenar desde pesos aleatorios, normalmente para completar texto. Es, con diferencia, la fase más cara. |
| Post-training | Seguir entrenando después del pre-training; suele hacerlo quien desarrolla el modelo (ej. para que siga instrucciones). |
| Finetuning | Lo mismo conceptualmente, pero lo hace quien construye la aplicación para su caso. |
| Prompt engineering | Cambiar el comportamiento con el contexto de entrada, sin tocar pesos. Si "le enseñaste" algo pegando ejemplos en el chat, eso es prompting, no entrenamiento. |
| Quantization | Reducir la precisión numérica de los pesos; cambia valores pero no es entrenamiento. |

En la capa de **model development** cambia la importancia relativa: el conocimiento profundo de ML pasa de imprescindible a muy deseable; el dataset engineering pasa de feature engineering sobre tablas a deduplicación, tokenización, recuperación de contexto y control de calidad sobre datos no estructurados; y la optimización de inferencia se vuelve todavía más importante, porque la generación es secuencial (si un token tarda 10 ms, 100 tokens tardan un segundo).

En la capa de **application development**, tres responsabilidades ganan peso:

- **Evaluación**: mitiga riesgos y revela oportunidades; se necesita para elegir modelo, medir progreso, decidir si algo está listo y detectar problemas en producción. Un detalle que ilustra lo delicado: el mismo modelo puede sacar resultados muy distintos en un benchmark según la técnica de prompting usada (cuántos ejemplos se muestran, si se pide razonar paso a paso). Comparar modelos con prompts distintos es comparar peras con manzanas.
- **Prompt engineering y construcción de contexto**: lograr el comportamiento deseado solo desde la entrada, incluyendo darle al modelo información, herramientas y memoria.
- **Interfaz de IA**: apps web y móviles, extensiones de navegador, bots en Slack o WhatsApp, plugins en otros productos, voz. Cada interfaz habilita formas distintas de recoger feedback.

#### AI engineering vs full-stack

Como la interfaz importa tanto, la ingeniería de IA se acerca al desarrollo full-stack. El ecosistema ya no es solo Python: hay SDKs y librerías en JavaScript/TypeScript. El flujo también cambia: en ML clásico primero juntabas datos, entrenabas y al final construías el producto; con foundation models puedes **construir el producto primero** con un modelo existente y solo invertir en datos y modelos si el producto demuestra valor. Esto favorece iterar rápido con usuarios reales.

### 8. Errores comunes al empezar

- **Confiar en la demo**: un par de ejemplos bonitos no son evaluación. Necesitas un conjunto de casos y una métrica.
- **No definir el umbral de utilidad**: sin él nunca sabes si "ya está listo".
- **Elegir finetuning primero**: casi siempre conviene agotar prompting y RAG antes.
- **Ignorar el costo por token y el idioma**: un prompt largo en español puede costar bastante más tokens que su equivalente en inglés.
- **Acoplarse a un proveedor sin evaluación automatizada**: cambiar de modelo se vuelve imposible de validar.
- **Llamar "entrenar" a lo que es prompting**: genera expectativas falsas (el modelo no recuerda nada entre llamadas salvo lo que tú le envías).

## Conceptos clave

- **Token**: unidad mínima que procesa el modelo; puede ser carácter, palabra o fragmento de palabra.
- **Autoregressive language model**: modelo que predice el siguiente token usando solo los anteriores; es el que genera texto.
- **Self-supervision**: entrenamiento donde las etiquetas se derivan de los propios datos, como el siguiente token de un texto.
- **Foundation model**: modelo grande de propósito general (texto o multimodal) sobre el que se construyen aplicaciones.
- **Model adaptation**: ajustar un modelo existente a tu caso con prompting, RAG o finetuning.
- **Usefulness threshold**: nivel mínimo de calidad, latencia y costo para que la aplicación valga la pena frente a usuarios.
- **Human-in-the-loop**: diseño en el que una persona revisa o decide sobre las salidas de la IA.
- **Crawl–Walk–Run**: estrategia para aumentar la automatización gradualmente según evidencia.
- **TTFT / TPOT**: tiempo hasta el primer token y tiempo por token de salida; componen la latencia percibida.
- **AI engineering stack**: capas de aplicación, desarrollo de modelo e infraestructura.

## Preguntas de repaso

1. ¿Por qué la self-supervision fue decisiva para que los modelos de lenguaje escalaran?
   R: Porque elimina el costo de etiquetar: cada texto aporta a la vez el contexto y la etiqueta (el siguiente token). Como hay texto en enormes cantidades, se pueden armar datasets gigantes sin pago de anotadores, lo que permite entrenar modelos con muchos más parámetros.
2. Nombra las tres técnicas principales de adaptación y qué cambia cada una.
   R: Prompt engineering cambia las instrucciones y ejemplos de entrada; RAG cambia el contexto añadiendo información recuperada de tus datos; finetuning cambia los pesos del modelo entrenándolo con más ejemplos. Las dos primeras no tocan los pesos y son más baratas de iterar.
3. ¿En qué se diferencia la ingeniería de IA de la ingeniería de ML tradicional?
   R: Se centra en adaptar modelos ajenos en vez de entrenar los propios, trabaja con modelos mucho más grandes (más presión por latencia y costo) y con salidas abiertas, lo que vuelve la evaluación mucho más difícil e importante.
4. ¿Qué significa que una función de IA sea proactiva y qué implica para su calidad?
   R: Aparece sin que el usuario la pida, cuando el sistema detecta una oportunidad. Como el usuario no la solicitó, si es mala se percibe como intrusiva, así que necesita un listón de calidad más alto; a cambio, puede precalcularse y la latencia importa menos.
5. ¿Qué es el problema de la "última milla" en productos de IA?
   R: Que llegar a una demo convincente es rápido, pero cerrar la brecha hasta un producto confiable (de ~80 % a más de 95 %) cuesta muchísimo más tiempo por los casos raros y las alucinaciones. La demo no predice el esfuerzo total.
6. ¿Por qué tener evaluación automatizada ayuda en el mantenimiento de una app de IA?
   R: Porque los modelos, precios y proveedores cambian rápido; con evaluación automatizada puedes medir en minutos si un modelo o prompt nuevo es mejor o peor, convirtiendo cada cambio en un experimento controlado en vez de un riesgo.

## Ejercicio

Elige una idea de aplicación de IA que te interese (por ejemplo, un tutor que evalúa tus respuestas de estudio). Escribe una ficha de una página con: (1) motivación según los tres niveles de riesgo; (2) rol de la IA en los tres ejes (crítica/complementaria, reactiva/proactiva, dinámica/estática); (3) plan Crawl–Walk–Run con el criterio numérico para pasar de etapa; (4) umbral de utilidad con al menos una métrica de calidad, una de latencia y una de costo; (5) qué técnica de adaptación probarías primero y por qué. Luego ejecuta `chat.ts` con tu `NAN_API_KEY` para comprobar que tienes acceso a la API. Terminado cuando la ficha tiene los cinco puntos con números concretos y el script imprime una respuesta.

## Explícalo con tus palabras

Explícale a un amigo desarrollador web por qué hoy puede construir una app de IA sin saber entrenar modelos, y qué es lo que sí tiene que aprender.
