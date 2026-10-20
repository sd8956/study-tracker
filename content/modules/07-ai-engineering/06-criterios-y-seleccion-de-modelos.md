---
title: Evaluación III — criterios de evaluación y selección de modelos
kind: lesson
hours: 2
sources: AI Engineering (Chip Huyen), cap. 4, Evaluation Criteria, Model Selection, Build Versus Buy, Navigate Public Benchmarks (pp. 315–392)
links: Open LLM Leaderboard | https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard
---

## Objetivo

Definir los criterios con los que se evalúa una aplicación concreta (capacidad de dominio, generación, seguimiento de instrucciones, costo y latencia), aplicar un flujo de selección de modelos con atributos duros y blandos, decidir entre API y modelo self-hosted y leer benchmarks y leaderboards públicos con escepticismo informado.

## Estudio

### 1. Evaluation-driven development

¿Qué es peor: una aplicación que nunca se desplegó o una desplegada de la que nadie sabe si funciona? La segunda: cuesta mantenerla y apagarla también cuesta. Es más común de lo que parece: equipos con chatbots de soporte en producción que no saben si ayudan o perjudican a los clientes, o modelos que "a los usuarios les gustan" sin saber si aciertan.

La propuesta es **evaluation-driven development**: igual que en TDD escribes los tests antes del código, aquí **defines los criterios de evaluación antes de construir**. No por casualidad, las aplicaciones de IA más comunes en empresas son las que se miden fácil: recomendadores (engagement, compras), detección de fraude (dinero ahorrado), generación de código (tests) y tareas cerradas como clasificación de intención. El riesgo de este enfoque es buscar las llaves solo bajo la farola: lo fácil de medir no siempre es lo más valioso. Precisamente por eso, quien sabe construir buenas evaluaciones desbloquea aplicaciones que otros no se atreven a lanzar.

Los criterios se agrupan en cuatro cubetas. Ejemplo: resumir contratos legales.

| Cubeta | Pregunta | En el ejemplo |
| --- | --- | --- |
| **Capacidad de dominio** | ¿Sabe hacer la tarea? | ¿Entiende contratos? |
| **Capacidad de generación** | ¿La salida es buena como texto? | ¿El resumen es fiel y coherente? |
| **Seguimiento de instrucciones** | ¿Respeta lo que pedí? | ¿Cumple el formato y la longitud? |
| **Costo y latencia** | ¿Es viable? | ¿Cuánto cuesta y cuánto tarda cada resumen? |

### 2. Capacidad de dominio

Está limitada por la arquitectura, el tamaño y, sobre todo, los datos de entrenamiento: si nunca vio latín, no traducirá latín. Se mide con benchmarks de dominio, públicos o privados, normalmente con **evaluación exacta**:

- **Código**: functional correctness, pero también eficiencia (una consulta SQL correcta que tarda minutos no sirve; hay benchmarks que comparan el tiempo de ejecución con el de la consulta de referencia) y legibilidad (difícil de medir exactamente; suele requerir un juez).
- **Conocimiento y razonamiento**: preguntas de **opción múltiple** (MCQ). La mayoría de las tareas de los harness de evaluación populares son de este tipo.

Por qué gustan las MCQ: son fáciles de crear, verificar y comparar contra el azar (con cuatro opciones, el azar saca 25 %). La clasificación es un caso particular (siempre las mismas opciones) y se mide con accuracy, precision, recall y F1.

Problemas de las MCQ:

- **Sensibles al formato**: un espacio extra o añadir "Opciones:" puede cambiar la respuesta.
- **Miden discriminar, no generar**: elegir la buena entre cuatro no es lo mismo que escribir una buena respuesta. Sirven para conocimiento ("¿cuál es la capital?") y razonamiento, no para resumir, traducir o redactar.

### 3. Capacidad de generación

El área de natural language generation (NLG) lleva décadas midiendo texto generado con criterios como **fluency** (¿suena natural y gramatical?), **coherence** (¿tiene estructura lógica?), **faithfulness** en traducción y **relevance** en resúmenes. Con modelos modernos, fluidez y coherencia casi nunca fallan (siguen siendo útiles para modelos pequeños, escritura creativa o idiomas con pocos recursos). Los problemas nuevos son otros:

#### Factual consistency

La alucinación es deseable en ficción y fatal en tareas factuales. Se verifica en dos escenarios:

- **Local**: contra un contexto dado. ¿El resumen es consistente con el documento? ¿La respuesta del bot es consistente con la política de la empresa? ¿El insight es consistente con los datos? Es el caso de RAG.
- **Global**: contra el conocimiento general. Mucho más difícil, porque primero hay que decidir **qué es un hecho** y en qué fuentes confiar, con internet lleno de desinformación. Cuidado con la falacia de ausencia de evidencia ("no encontré relación, luego no existe").

Consejo práctico: analiza en qué tipo de preguntas alucina **tu** modelo y concentra ahí tu benchmark. Patrones frecuentes: conocimiento de nicho (algo poco citado en internet) y preguntas sobre cosas que no existen ("¿qué dijo X sobre Y?" cuando X nunca habló de Y).

Técnicas para medirla:

| Técnica | Idea | Costo |
| --- | --- | --- |
| **AI as a judge** | "¿El resumen contiene hechos no respaldados por el texto fuente?" | Una llamada extra |
| **Self-verification** | Generas N respuestas más; si discrepan con la original, probablemente alucinó | N llamadas extra; caro |
| **Knowledge-augmented** | Descompones la respuesta en afirmaciones atómicas, las haces autocontenidas, buscas evidencia (por ejemplo, en un buscador) y verificas cada una | Varias llamadas + búsqueda |
| **Textual entailment** | Clasificas (premisa, hipótesis) en entailment / contradicción / neutral con un modelo pequeño especializado | Barato, rápido |

Ejemplo de entailment con la premisa "A María le gustan todas las frutas": "A María le gustan las manzanas" (entailment), "María odia las naranjas" (contradicción), "A María le gusta el pollo" (neutral).

#### Safety

Categorías típicas de contenido dañino: lenguaje inapropiado, recomendaciones o tutoriales dañinos, discurso de odio, violencia, estereotipos (enfermeras siempre mujeres, directores siempre hombres) y sesgo político o religioso (se ha medido que distintos modelos tienen inclinaciones distintas). Puedes detectarlo con jueces generales bien instruidos, con herramientas de moderación de los proveedores o con **clasificadores especializados** de toxicidad, mucho más pequeños, rápidos y baratos. Existen datasets de prompts diseñados para provocar respuestas tóxicas, útiles para probar tu sistema.

### 4. Seguimiento de instrucciones

Si el modelo no sigue instrucciones, da igual lo buenas que sean. Ejemplo: pides clasificar sentimiento en `NEGATIVE | POSITIVE | NEUTRAL` y responde `HAPPY`. Entiende el sentimiento (capacidad de dominio) pero no obedece (instrucción). Esto rompe cualquier sistema que consuma la salida.

Va más allá del formato: "usa solo palabras de máximo cuatro letras" (para cuentos infantiles con vocabulario controlado) no es estructurado, pero es verificable. Y es difícil separar causas: si falla al escribir un poema con una métrica tradicional, ¿no sabe hacerlo o no entendió? Un fallo puede deberse al modelo **o a la instrucción**.

Dos enfoques de benchmarks públicos que conviene copiar:

- **Instrucciones verificables automáticamente**: incluir palabras clave, prohibir palabras, número de viñetas, longitud, formato JSON, terminar con cierta frase. Un programa comprueba cada una y la nota es la fracción cumplida.
- **Descomposición en preguntas sí/no**: para instrucciones complejas ("escribe una reseña de hotel con tono amable que mencione el desayuno"), se convierte en una lista de criterios binarios que un humano o un juez comprueba.

```ts
// checks verificables para tus propias instrucciones
type Check = { name: string; pass: (out: string) => boolean };

const checks: Check[] = [
  { name: "max 3 viñetas", pass: (o) => (o.match(/^\s*[-*] /gm) ?? []).length <= 3 },
  { name: "menciona 'latencia'", pass: (o) => /latencia/i.test(o) },
  { name: "sin 'como modelo de lenguaje'", pass: (o) => !/como (un )?modelo de lenguaje/i.test(o) },
  { name: "≤ 120 palabras", pass: (o) => o.split(/\s+/).filter(Boolean).length <= 120 },
];

export function instructionScore(output: string) {
  const results = checks.map((c) => ({ name: c.name, ok: c.pass(output) }));
  return { score: results.filter((r) => r.ok).length / results.length, results };
}
```

Consejo clave: **crea tu propio benchmark de instrucciones** con las que tu app realmente usa. Si necesitas YAML, incluye YAML. Si no quieres que diga "Como modelo de lenguaje…", evalúalo.

**Roleplaying** es un caso común (personajes de juegos, compañeros, asistentes con persona) y también una técnica de prompting. Se evalúa en **estilo** (¿habla como el personaje?) y **conocimiento** (¿sabe lo que el personaje sabría?). Puedes usar heurísticas (un personaje callado → longitud media baja) y jueces con criterios específicos del rol.

### 5. Costo y latencia

Un modelo excelente pero lento y caro no sirve. Muchas empresas eligen modelos de menor calidad con mejor costo y latencia. Optimizar varios objetivos a la vez es **Pareto optimization**: decide qué no es negociable. Si la latencia es innegociable, filtras primero los modelos que no la cumplen y luego eliges el mejor entre el resto.

- **Latencia**: TTFT, tiempo por token, tiempo entre tokens, tiempo total por consulta. Depende del modelo, del prompt y del sampling: más tokens de salida = más latencia; puedes acortarla pidiendo concisión o con condiciones de parada. Distingue lo imprescindible de lo deseable: nadie dice que no a menos latencia, pero a menudo es una molestia, no un bloqueante.
- **Costo**: con APIs pagas por token de entrada y salida, y el costo por token casi no cambia con la escala. Con modelos propios pagas cómputo: el costo por token baja mucho al crecer, porque el clúster cuesta lo mismo sirviendo poco o mucho. Por eso la decisión API vs self-hosting **se revisa al cambiar de escala**. Curiosidad útil: muchos modelos tienen tamaños que llenan exactamente memorias de GPU comunes (16, 24, 48, 80 GB).

Una tabla de criterios para una app ficticia ayuda a hacer explícitas las decisiones:

| Criterio | Métrica | Benchmark | Requisito duro | Ideal |
| --- | --- | --- | --- | --- |
| Costo | USD por 1M tokens de salida | — | < 30 | < 15 |
| Escala | Tokens por minuto | — | > 1M | > 1M |
| Latencia | TTFT P90 | Prompts internos | < 200 ms | < 100 ms |
| Latencia | Tiempo total P90 | Prompts internos | < 1 min | < 30 s |
| Calidad general | Rating en arena pública | Leaderboard | umbral | umbral mayor |
| Código | pass@1 | Benchmark de código | > 90 % | > 95 % |
| Factualidad | Métrica de juez interno | Dataset interno de alucinaciones | > 0.8 | > 0.9 |

### 6. Flujo de selección de modelos

No buscas el mejor modelo: buscas **el mejor modelo para tu aplicación**. Y la selección se repite: en prompting quizá empiezas con el más fuerte para ver si es viable y luego bajas a modelos más pequeños; en finetuning, empiezas pequeño para probar el código y subes hasta lo que cabe en tu hardware. En cada técnica: (1) averigua el mejor rendimiento alcanzable y (2) ubica los modelos en ejes costo–rendimiento para elegir el que más rinde por tu dinero.

Distingue:

- **Atributos duros**: lo que no puedes o no quieres cambiar (licencia, datos de entrenamiento, tamaño, tu política de privacidad). Recortan la lista rápido.
- **Atributos blandos**: lo que puedes mejorar (exactitud, toxicidad, consistencia factual). Estimar cuánto puedes mejorarlos es difícil: a veces descomponer la tarea en dos pasos sube la exactitud del 20 % al 70 %; otras, semanas de ajustes no alcanzan. La latencia es blanda si controlas el modelo y dura si usas uno ajeno.

```
1. Filtrar por atributos duros (licencia, privacidad, despliegue)
        ↓
2. Usar info pública (benchmarks, leaderboards) para quedarte con pocos candidatos
        ↓
3. Experimentar con TU pipeline de evaluación (calidad, costo, latencia)
        ↓
4. Monitorizar en producción y recoger feedback  ──► vuelve a 1–3 si algo cambia
```

### 7. ¿API o modelo propio?

Primero, vocabulario: casi todos los modelos "open source" son en realidad **open weight** (publican pesos, no datos). Un **open model** publicaría también los datos, lo que permite auditar y reentrenar. Y revisa la **licencia**: ¿permite uso comercial?, ¿tiene límites (por ejemplo, a partir de cierto número de usuarios)?, ¿permite usar sus salidas para entrenar otros modelos (destilación, sesión 16)?

Un modelo se sirve a través de un **inference service** cuya interfaz es la **model API**. El mismo modelo puede estar en varias APIs (del creador, de una nube, de terceros) con precios, funciones y hasta rendimientos ligeramente distintos; prueba antes de cambiar. Muchas APIs imitan la de OpenAI, y eso te permite cambiar de proveedor modificando la URL base y el nombre del modelo (exactamente lo que haces con NaN Builders).

Siete ejes para decidir:

| Eje | Model API | Self-hosted |
| --- | --- | --- |
| **Privacidad** | Envías datos fuera; riesgo de fuga o de que se usen para entrenar si cambian los términos | Los datos no salen |
| **Linaje y copyright** | Contratos con el proveedor pueden protegerte | Menos respaldo legal; si hay infracción, te buscan a ti |
| **Rendimiento** | Los mejores modelos suelen ser cerrados | Los mejores abiertos suelen ir algo por detrás |
| **Funcionalidad** | Escalado, function calling, salidas estructuradas listos; logprobs limitados; finetuning solo si lo ofrecen | Acceso a logprobs y capas internas; puedes hacer finetuning y cuantizar; montarlo todo cuesta |
| **Costo** | Pago por uso; caro a gran escala | Talento, tiempo e infraestructura; barato por token a escala |
| **Control** | Rate limits, cambios de versión sin aviso que rompen prompts, censura excesiva, riesgo de perder acceso | Puedes congelar la versión, pero mantienes todo tú |
| **On-device** | Imposible sin conexión | Posible (con esfuerzo) |

Ejemplos que ilustran los ejes: empleados que pegaron código confidencial en un chatbot público y la empresa terminó prohibiéndolo; un proveedor que cambió sus términos para usar datos de clientes en entrenamiento; un equipo de personajes 3D cuyo modelo comercial insistía en "no tengo capacidades físicas" y tuvo que ajustar un modelo abierto.

Regla útil: elijas lo que elijas, usa un **API estándar** para poder cambiar de modelo, y prefiere modelos con comunidad grande (otros ya habrán resuelto sus rarezas).

### 8. Benchmarks y leaderboards públicos: úsalos, pero no les creas del todo

Hay miles de benchmarks y herramientas (*evaluation harness*) que ejecutan cientos de ellos. Un **leaderboard** agrega resultados de varios benchmarks en un ranking. Dos preguntas: ¿qué benchmarks incluye? y ¿cómo los agrega?

Problemas:

- **Cobertura limitada**: por costo, cada leaderboard usa pocos benchmarks (a veces seis o diez) y deja fuera otros importantes y caros (código, recuperación de información, resumen, uso de herramientas).
- **Selección poco explicada**: leaderboards distintos usan benchmarks distintos y comparten pocos.
- **Correlación**: si dos benchmarks miden casi lo mismo (varios de razonamiento correlacionan por encima de 0.85), incluir ambos exagera ese aspecto. Uno de veracidad correlacionaba solo moderadamente con los de razonamiento: mejorar el razonamiento no garantiza decir la verdad.
- **Agregación**: promediar trata igual un 80 % en un benchmark difícil y uno fácil, y da igual peso a todo. Alternativa usada: **mean win rate** (fracción de veces que un modelo supera a otro, promediada por escenario).
- **Saturación**: los benchmarks se renuevan cada año porque los modelos los agotan.
- **Contaminación**: el benchmark pudo estar en los datos de entrenamiento (a propósito o porque está en internet). Se detecta con solapamiento de n-gramas entre el benchmark y los datos, o con perplexity anormalmente baja (sesión 4). Por eso las fichas serias reportan resultados en subconjuntos "limpios", y por eso **tu benchmark privado vale más**: el modelo no lo ha visto.

Además, la percepción de que "el modelo X empeoró tras una actualización" es común; aun si el proveedor lo mejoró en promedio, pudo empeorar en tu tarea. Lección: **el mejor modelo en general no es necesariamente el mejor para ti**.

Para tu aplicación, construye un **leaderboard privado**: elige benchmarks públicos recientes relevantes a tu caso, verifica que sean fiables (cualquiera puede publicar uno), ejecuta los que falten (evaluar muchos modelos en muchos benchmarks puede costar decenas de miles de dólares; sé selectivo), y sobre todo añade tus propios casos.

### 9. Errores comunes

- Elegir modelo por el primer puesto de un leaderboard general.
- Comparar resultados de benchmarks obtenidos con prompts o números de ejemplos distintos.
- Ignorar costo y latencia hasta el final.
- No revisar la licencia (uso comercial, uso de salidas para entrenar).
- Acoplar el código a un proveedor sin una capa de abstracción mínima (URL base + modelo configurables).
- Medir "alucinación" en preguntas fáciles en vez de en las que tu modelo realmente falla.

## Conceptos clave

- **Evaluation-driven development**: definir los criterios de evaluación antes de construir la aplicación.
- **Factual consistency local/global**: consistencia de la salida con un contexto dado frente a con el conocimiento general.
- **Textual entailment**: clasificar si una hipótesis se deduce de, contradice o es neutral respecto a una premisa.
- **Instruction-following**: capacidad del modelo de respetar formato, restricciones y pedidos explícitos.
- **Pareto optimization**: elegir entre opciones optimizando varios objetivos, fijando primero los innegociables.
- **Atributos duros vs blandos**: restricciones que no puedes cambiar frente a métricas que puedes mejorar.
- **Open weight vs open model**: modelo con pesos públicos frente a modelo con pesos y datos públicos.
- **Inference service / model API**: servicio que ejecuta el modelo y su interfaz de acceso.
- **Leaderboard**: ranking que agrega resultados de varios benchmarks.
- **Benchmark contamination**: presencia del benchmark en los datos de entrenamiento, que infla la puntuación.

## Preguntas de repaso

1. ¿En qué cuatro cubetas se agrupan los criterios de evaluación? Da un ejemplo de cada una para un bot de soporte.
   R: Capacidad de dominio (¿entiende los productos y políticas?), capacidad de generación (¿sus respuestas son fieles a la política y no tóxicas?), seguimiento de instrucciones (¿respeta el formato, el idioma y la longitud pedidos?) y costo y latencia (¿cuánto cuesta y cuánto tarda cada respuesta?).
2. ¿Por qué las preguntas de opción múltiple no bastan para evaluar un modelo que redacta resúmenes?
   R: Porque miden la capacidad de distinguir la respuesta correcta entre opciones, que es clasificación, no la capacidad de generar texto bueno; además son sensibles a cambios menores de formato. Para resúmenes hay que evaluar la generación directamente, por ejemplo su fidelidad al documento.
3. Explica la diferencia entre factual consistency local y global y cuál es más fácil de verificar.
   R: La local compara la salida con un contexto dado (documento, política, datos recuperados); la global la compara con el conocimiento general del mundo. La local es más fácil porque los hechos están explícitos; en la global primero hay que decidir qué fuentes son confiables y encontrar evidencia.
4. ¿Qué son los atributos duros y blandos en la selección de modelos? Da un ejemplo donde la latencia cambia de categoría.
   R: Los duros no se pueden o no se quieren cambiar (licencia, privacidad, tamaño); los blandos se pueden mejorar (exactitud, toxicidad). La latencia es blanda si alojas el modelo y puedes optimizarlo, y dura si consumes la API de un tercero.
5. Nombra tres ejes que inclinan la balanza hacia alojar tu propio modelo.
   R: Privacidad estricta de datos que no pueden salir de la organización; necesidad de control (congelar versión, evitar cambios silenciosos o censura excesiva, acceder a logprobs o hacer finetuning profundo); y despliegue on-device o sin internet. A gran escala, el costo por token también puede favorecerlo.
6. ¿Por qué promediar benchmarks para rankear modelos puede engañar?
   R: Porque trata igual puntuaciones de benchmarks con dificultad muy distinta, da el mismo peso a todas las capacidades aunque no te importen igual y, si incluye benchmarks muy correlacionados, sobrerrepresenta una misma capacidad.
7. ¿Por qué un benchmark privado es más confiable que uno público para elegir modelo?
   R: Porque refleja tus tareas y datos reales y porque no puede haber contaminado el entrenamiento del modelo; los públicos pueden estar en los datos de entrenamiento, se saturan y miden capacidades genéricas que quizá no son las tuyas.

## Ejercicio

Diseña la selección de modelo para un "tutor que corrige respuestas de estudio en español". Entrega un documento `model-selection.md` con: (1) tabla de criterios estilo sección 5 con al menos 6 filas, requisito duro e ideal; (2) lista de atributos duros y blandos; (3) decisión API vs self-hosted razonada en los siete ejes; (4) cinco instrucciones verificables propias implementadas como `checks` en TypeScript y ejecutadas contra 5 respuestas reales de `deepseek-v4-flash`. Terminado cuando el documento tiene las cuatro partes y el script imprime la puntuación de instrucciones de las 5 respuestas.

## Explícalo con tus palabras

Explica a un jefe de producto por qué "el modelo número uno del ranking" puede no ser la mejor opción para su aplicación y qué harías en su lugar.
