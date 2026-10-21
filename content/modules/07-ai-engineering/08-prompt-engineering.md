---
title: Prompt engineering — fundamentos y buenas prácticas
kind: lesson
hours: 2
sources: AI Engineering (Chip Huyen), cap. 5, Introduction to Prompting y Prompt Engineering Best Practices (pp. 416–461)
links: OpenAI prompt engineering guide | https://platform.openai.com/docs/guides/prompt-engineering ; Anthropic prompt engineering overview | https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview
---

## Objetivo

Escribir prompts efectivos y mantenibles: conocer las partes de un prompt, in-context learning (zero-shot y few-shot), system vs user prompt y chat templates, los límites del contexto largo, y las prácticas que funcionan entre modelos (instrucciones claras, persona, ejemplos, formato, contexto, descomposición, chain-of-thought, iteración, versionado).

## Estudio

### 1. Qué es (y qué no es) prompt engineering

**Prompt engineering** es diseñar la instrucción que hace que un modelo produzca el resultado deseado **sin cambiar sus pesos**. Es la técnica de adaptación más fácil y común, y la regla es clara: **exprime el prompting antes de pasar a técnicas más caras** como el finetuning.

Que sea fácil de empezar engaña: parece "tocar palabras hasta que funcione". En realidad es comunicación humano–IA, y comunicar bien es difícil. Para que sea ingeniería y no superstición, necesita lo mismo que cualquier experimento de ML: **cambios sistemáticos y evaluación** (sesiones 4–7). Una frase que resume la postura sana: el problema no es saber prompt engineering, sino que sea **lo único** que sabes. Para producción también necesitas estadística, evaluación, tracking de experimentos y curación de datos.

### 2. Anatomía de un prompt

Un prompt suele tener tres partes:

1. **Descripción de la tarea**: qué hacer, el rol que adopta el modelo y el formato de salida.
2. **Ejemplos** de cómo hacerla (qué es tóxico y qué no, por ejemplo).
3. **La tarea concreta**: la pregunta, el texto a resumir, el mensaje a clasificar.

Dos condiciones previas:

- El modelo debe **seguir instrucciones** (sesión 6). Si no, ningún prompt lo salva.
- Cuánto "trasteo" necesitas depende de la **robustez** del modelo a perturbaciones: ¿cambia mucho la respuesta si escribes "5" en vez de "cinco", añades un salto de línea o cambias mayúsculas? Puedes medirlo perturbando prompts aleatoriamente. La robustez correlaciona con la capacidad general: trabajar con un modelo más fuerte a menudo ahorra horas de ajustes.

Otro detalle empírico: muchos modelos rinden mejor con la descripción de la tarea **al principio**; algunos, al final. Pruébalo con tu modelo.

### 3. In-context learning: zero-shot y few-shot

Antes, un modelo solo hacía aquello para lo que se entrenó. Un hallazgo clave fue que un modelo entrenado solo para predecir el siguiente token puede **aprender una tarea a partir de ejemplos en el prompt**, sin actualizar pesos: traducir, comprensión lectora, aritmética simple. A eso se le llama **in-context learning**.

Además es una forma de **aprendizaje continuo**: si el modelo se entrenó con documentación vieja de una librería, puedes pegar los cambios nuevos en el contexto y responder sobre la versión actual sin reentrenar.

Cada ejemplo es un **shot**: con cinco ejemplos es *5-shot*; sin ejemplos, *zero-shot*. Más ejemplos suelen ayudar, pero alargan el prompt (costo y latencia) y están limitados por la ventana de contexto. Con modelos más capaces, la ganancia de few-shot frente a zero-shot se ha reducido en tareas generales, porque entienden mejor las instrucciones. Sin embargo, sigue ayudando mucho en **dominios poco vistos** (por ejemplo, una API de dataframes poco popular).

Una metáfora útil: un foundation model es como una biblioteca de muchos "programas" (uno escribe haikus, otro clasifica, otro traduce); el prompt correcto **activa** el programa que quieres.

Vocabulario: en este módulo, **prompt** es toda la entrada al modelo y **contexto** es la información que le das para que pueda realizar la tarea (documentos, historial, datos).

### 4. System prompt, user prompt y chat templates

Las APIs de chat separan el **system prompt** (la descripción de la tarea, puesta por el desarrollador) del **user prompt** (la tarea, que suele venir del usuario). Ejemplo: un asistente que explica informes de inspección de viviendas.

```ts
const messages = [
  {
    role: "system",
    content:
      "Eres un agente inmobiliario con experiencia. Lee cada informe con cuidado, evalúa con justicia el estado de la vivienda y ayuda al comprador a entender riesgos y oportunidades. Responde de forma breve y profesional.",
  },
  {
    role: "user",
    content: `Contexto:\n<informe>\n${reportText}\n</informe>\n\nPregunta: Resume las quejas por ruido, si las hay.`,
  },
];
```

Por dentro, el modelo no ve mensajes: ve **un único texto** construido con su **chat template**, con tokens especiales que marcan dónde empieza el sistema, el usuario y el asistente. Cada familia de modelos tiene su plantilla y puede cambiarla entre versiones. Usar la plantilla equivocada, o incluso un salto de línea de más, produce **fallos silenciosos**: el modelo responde algo razonable pero peor. Si usas una API de chat, el proveedor aplica la plantilla por ti; si sirves un modelo abierto o usas una herramienta de terceros, **imprime el prompt final** y compruébalo.

No confundas el chat template (lo define quien desarrolla el modelo) con tu **prompt template** (tu plantilla con huecos que rellenas con datos).

¿Por qué el system prompt "funciona mejor"? Al final se concatena con el resto, así que el beneficio probablemente viene de que (a) va primero y (b) muchos modelos se post-entrenan para darle **prioridad** sobre las instrucciones del usuario (*instruction hierarchy*), lo que además ayuda contra ataques de prompt (sesión 10).

### 5. Longitud de contexto y eficiencia

Las ventanas de contexto crecieron desde unos pocos miles de tokens a cientos de miles o millones. Con 100 000 tokens cabe un libro mediano. Pero **no todas las posiciones valen lo mismo**: los modelos entienden mejor lo que está **al principio y al final** que lo que queda en medio ("lost in the middle").

Cómo medirlo con tu modelo: la prueba **needle in a haystack** (aguja en el pajar). Insertas un dato (la aguja) en distintas posiciones de un texto largo (el pajar) y preguntas por él. Usa datos privados o inventados, para que el modelo no pueda responder de memoria.

```ts
// needle.ts — ¿encuentra el dato según su posición?
const filler = "El informe trimestral describe procesos internos sin novedades relevantes. ".repeat(400);
const needle = "La contraseña del armario 7B es 'nopal-azul-42'.";

for (const pos of [0, 0.25, 0.5, 0.75, 1]) {
  const cut = Math.floor(filler.length * pos);
  const haystack = filler.slice(0, cut) + "\n" + needle + "\n" + filler.slice(cut);
  const answer = await chat(
    [{ role: "user", content: `${haystack}\n\n¿Cuál es la contraseña del armario 7B? Responde solo la contraseña.` }],
    0,
  );
  console.log(pos, answer.includes("nopal-azul-42") ? "OK" : `FALLO: ${answer}`);
}
```

Consecuencias prácticas: pon las instrucciones importantes al principio (y repítelas brevemente al final si el contexto es largo), no rellenes el contexto "por si acaso" y, si el rendimiento cae con contextos largos, busca acortarlos (RAG, sesiones 11–12).

### 6. Buenas prácticas que funcionan en casi todos los modelos

Los trucos tempranos ("escribe Q: en vez de Pregunta:", "te daré una propina") dependen del modelo y caducan. Lo que sigue son principios que recomiendan los proveedores y equipos con apps en producción. Aun así, cada modelo tiene manías: lee su guía específica.

#### 6.1 Instrucciones claras y explícitas

- **Elimina ambigüedad**: si pides calificar un ensayo, ¿escala 1–5 o 1–10? Si el modelo no está seguro, ¿elige igual o responde "no sé"?
- **Corrige comportamientos observados**: si devuelve notas como 4.5 y no las quieres, dilo: "solo enteros".
- **Persona**: indicar la perspectiva cambia el criterio. El mismo ensayo infantil ("Me gustan las gallinas. Son suaves y dan huevos ricos.") puede sacar 2/5 en abstracto y 4/5 si el modelo actúa como maestra de primer grado.
- **Ejemplos**: reducen ambigüedad sobre el estilo de respuesta. Un bot para niños que, ante "¿Me traerá regalos Papá Noel?", explica que es un personaje ficticio, arruina la experiencia; con un ejemplo de cómo responder sobre el Ratón Pérez, ajusta el tono. Si te preocupa el costo, usa formatos de ejemplo compactos: `garbanzo --> comestible` gasta menos tokens que `Input: garbanzo\nOutput: comestible`.
- **Formato de salida**: pide concisión si la quieres (las salidas largas cuestan y tardan) y prohíbe preámbulos ("Basándome en el ensayo, le daría…"). Para JSON, especifica las claves y da un ejemplo. Usa **marcadores de fin de entrada** para tareas estructuradas: si tu lista termina en `pollo` sin `-->`, el modelo puede seguir la lista en vez de etiquetar; con `pollo -->` sabe que toca la etiqueta. Elige marcadores que no aparezcan en los datos.

#### 6.2 Contexto suficiente

Igual que un estudiante con apuntes rinde mejor, un modelo con el texto relevante en el prompt responde mejor y **alucina menos**, porque no tiene que tirar de memoria. Puedes darle el contexto directamente o darle **herramientas** para buscarlo (RAG, búsqueda web): eso es **context construction**.

Restringir al modelo a **solo** el contexto es difícil: ayuda decir "responde únicamente con la información proporcionada; si no está, di que no lo sabes", dar ejemplos de preguntas que no debe responder y pedir que **cite** el fragmento en que se basa. No hay garantía total: el conocimiento del pre-training puede filtrarse.

#### 6.3 Divide tareas complejas en subtareas

En vez de un prompt gigante, una **cadena** de prompts simples. Soporte al cliente: (1) clasificar la intención y (2) responder con un prompt específico para esa intención (con diez intenciones, diez prompts). Beneficios:

| Beneficio | Por qué |
| --- | --- |
| Monitoreo | Ves cada salida intermedia |
| Depuración | Arreglas un paso sin tocar los demás |
| Paralelización | Pasos independientes se ejecutan a la vez (tres versiones de un cuento para tres niveles de lectura) |
| Esfuerzo | Es más fácil escribir prompts simples |
| Costo | Puedes usar un modelo barato para clasificar y uno fuerte para responder |

Costos: más llamadas y, si el usuario no ve los pasos intermedios, más latencia hasta el primer token visible. Pero dos prompts pequeños no cuestan necesariamente el doble que uno grande. Caso real: un prompt de soporte que creció a más de 1 500 tokens funcionó mejor y más barato al dividirse en subtareas.

```ts
// cadena de dos pasos: clasificar intención -> responder con prompt específico
const INTENT_PROMPT = `Clasifica la consulta en una de: billing, troubleshooting, account, other.
Responde solo la etiqueta.`;

const HANDLERS: Record<string, string> = {
  troubleshooting: `Ayudas a resolver problemas técnicos.
- Pide primero que revise cables y reinicie el router.
- Si persiste, pide el modelo del router.
- Si tras reiniciar y esperar 5 minutos sigue igual, responde exactamente: {"handoff":"it_support"}`,
  billing: "Respondes dudas de facturación con tono claro; nunca prometas reembolsos.",
  account: "Ayudas con la gestión de la cuenta; nunca pidas contraseñas.",
  other: "Responde amablemente y ofrece derivar a una persona.",
};

export async function support(query: string): Promise<string> {
  const intent = (await chat([
    { role: "system", content: INTENT_PROMPT },
    { role: "user", content: query },
  ], 0)).trim().toLowerCase();
  const system = HANDLERS[intent] ?? HANDLERS.other; // salida inesperada -> ruta segura
  return chat([{ role: "system", content: system }, { role: "user", content: query }], 0.3);
}
```

#### 6.4 Dale tiempo para pensar

- **Chain-of-thought (CoT)**: pedir explícitamente que razone paso a paso. Fue de las primeras técnicas que funcionaron en muchos modelos, mejora problemas de matemáticas y razonamiento y, en algunos casos, reduce alucinaciones. Variantes: "piensa paso a paso", "explica tu razonamiento antes de responder", darle los pasos concretos a seguir, o incluir un ejemplo resuelto paso a paso (one-shot CoT).
- **Self-critique**: pedirle que revise su propia respuesta antes de darla por buena.

Costo: más tokens y más latencia antes del primer token útil, sobre todo si dejas que el modelo invente sus propios pasos. Si necesitas JSON limpio, pide el razonamiento en un campo separado (`"reasoning"`) antes del resultado.

#### 6.5 Itera

Prompt engineering es ida y vuelta. Si pides "el mejor videojuego" y responde que las opiniones varían, ajusta: "elige uno aunque las opiniones varíen". Cada modelo tiene manías: prueba el mismo prompt en varios modelos para conocerlos. Y hazlo **sistemáticamente**: versiona prompts, usa un conjunto de evaluación fijo y métricas estándar, y evalúa cada prompt **en el contexto del sistema completo** (mejorar un paso puede empeorar el total).

#### 6.6 Herramientas de optimización de prompts

Existen herramientas que buscan automáticamente el mejor prompt dado un formato de entrada/salida, una métrica y datos de evaluación (análogas a autoML), y técnicas que usan un modelo para generar, criticar o "mutar" prompts de forma evolutiva. También puedes pedirle directamente a un modelo que te escriba o mejore un prompt.

Precauciones: generan **llamadas ocultas** (10 variantes × 30 ejemplos = 300 llamadas, más las de validación y puntuación), pueden tener errores en sus plantillas (se han encontrado erratas en prompts por defecto de frameworks populares) y pueden cambiar sin aviso. Recomendación: empieza escribiendo tus prompts a mano para entender el modelo; si usas una herramienta, **inspecciona los prompts que genera** y cuenta las llamadas.

#### 6.7 Organiza y versiona los prompts

Separa prompts del código:

- **Reutilización** entre aplicaciones.
- **Testing** independiente de código y prompts.
- **Legibilidad**.
- **Colaboración** con expertos de dominio que no programan.

```ts
// prompts/grader.ts — el prompt como dato versionado, con metadatos
export const GRADER_PROMPT = {
  id: "grader",
  version: "2026-10-20.1",
  model: "deepseek-v4-flash",
  temperature: 0,
  outputSchema: '{"reasoning": string, "score": 1-5}',
  text: `Eres un corrector exigente pero justo...`,
} as const;
```

Si los prompts viven en el repositorio, git los versiona; el inconveniente es que, si varias apps comparten un prompt, todas se actualizan a la vez. Por eso muchos equipos usan un **catálogo de prompts** con versiones explícitas y metadatos (modelo, parámetros, esquemas, autor, aplicaciones que lo usan), de modo que cada app fije la versión que usa.

### 7. Ejemplo trabajado: de un prompt vago a uno de producción

Tarea: resumir tickets de soporte para el equipo de producto.

**Versión 1** — "Resume este ticket." Problemas observados al probarla con 20 tickets: longitudes muy distintas (de una línea a tres párrafos), a veces incluye datos personales del cliente, mezcla opinión con hechos y nunca dice qué producto afecta.

**Versión 2** — añade instrucciones explícitas: "Resume en máximo 3 viñetas. Incluye siempre el producto afectado y la gravedad (baja, media, alta). No incluyas nombres, correos ni teléfonos." Mejora la longitud, pero la gravedad es inconsistente: el modelo no sabe qué significa "alta" para este equipo.

**Versión 3** — añade la definición de cada nivel ("alta: el cliente no puede usar el producto o pierde dinero") y dos ejemplos compactos, uno de gravedad media y otro alta. Pide JSON `{"product","severity","bullets"}` con el marcador `Resumen JSON:` al final. La gravedad ahora coincide con la del equipo en 17 de 20 casos.

**Versión 4** — los tres fallos restantes son tickets con varios problemas. En vez de complicar el prompt, divides: primero "lista los problemas distintos del ticket" y luego un resumen por problema. Coincide en 19 de 20.

Qué aprender del recorrido: cada versión responde a fallos **observados** en un conjunto fijo de casos, cambia una cosa a la vez y se mide con la misma métrica. Ninguna mejora salió de una "frase mágica".

### 8. Checklist rápido

| Pregunta | Si la respuesta es "no" |
| --- | --- |
| ¿La tarea y el criterio de éxito están explícitos? | Añade escala, reglas y qué hacer ante la duda |
| ¿Hay ejemplos de los casos difíciles? | Añade 1–3 ejemplos compactos |
| ¿El formato de salida está especificado y validado? | Esquema + marcador + parser defensivo |
| ¿El contexto necesario está en el prompt? | Añádelo o recupéralo (RAG) |
| ¿La tarea tiene pasos independientes? | Divide en cadena |
| ¿Necesita razonamiento? | CoT, con el razonamiento separado del resultado |
| ¿Puedes medir el cambio? | Evalset + tracking antes de seguir tocando |

Errores comunes: cambiar varias cosas a la vez y no saber qué funcionó; evaluar con tres ejemplos; meter instrucciones críticas en medio de un contexto enorme; mezclar datos del usuario con instrucciones sin delimitarlos; usar trucos de un modelo en otro sin probar.

## Conceptos clave

- **Prompt engineering**: diseñar instrucciones y contexto para obtener el comportamiento deseado sin cambiar pesos.
- **In-context learning**: aprender una tarea a partir de instrucciones y ejemplos dentro del prompt.
- **Zero-shot / few-shot**: sin ejemplos frente a con algunos ejemplos en el prompt.
- **System prompt**: instrucciones del desarrollador que definen rol, reglas y formato; suele tener prioridad.
- **Chat template**: formato con tokens especiales con que el modelo combina los mensajes en un único texto.
- **Needle in a haystack**: prueba que mide si el modelo encuentra un dato según su posición en un contexto largo.
- **Prompt decomposition**: dividir una tarea en una cadena de prompts más simples.
- **Chain-of-thought (CoT)**: pedir al modelo que razone paso a paso antes de responder.
- **Context construction**: reunir la información que el modelo necesita para responder.
- **Prompt catalog**: repositorio de prompts versionados con metadatos.

## Preguntas de repaso

1. ¿Qué es el in-context learning y por qué se considera una forma de aprendizaje continuo?
   R: Es la capacidad del modelo de realizar una tarea a partir de instrucciones y ejemplos incluidos en el prompt, sin actualizar pesos. Es aprendizaje continuo porque puedes darle información nueva (por ejemplo, documentación actualizada) en el contexto y responder sobre ella sin reentrenar.
2. ¿Por qué un chat template incorrecto es peligroso y cómo lo detectas?
   R: Porque produce fallos silenciosos: el modelo sigue respondiendo algo razonable pero con peor calidad, sin errores visibles. Se detecta imprimiendo el prompt final que recibe el modelo y comparándolo con la plantilla documentada, especialmente al servir modelos abiertos o usar herramientas de terceros.
3. ¿Qué indica el efecto "lost in the middle" y qué cambias en tus prompts por él?
   R: Que los modelos aprovechan mejor la información al principio y al final del contexto que en medio. Por eso se ponen las instrucciones importantes al inicio (y a veces se repiten al final), se evita rellenar el contexto innecesariamente y se mide con pruebas tipo needle in a haystack.
4. Da tres beneficios y dos costos de dividir una tarea en una cadena de prompts.
   R: Beneficios: se pueden monitorear y depurar los pasos por separado, ejecutar en paralelo los independientes y usar modelos más baratos en pasos simples. Costos: más llamadas al modelo y más latencia percibida antes de la respuesta final.
5. ¿Para qué sirven los marcadores al final de la entrada en tareas estructuradas?
   R: Indican al modelo que la entrada terminó y que debe producir la salida estructurada; sin ellos puede seguir extendiendo la lista de entrada en vez de etiquetarla. Deben ser cadenas que no aparezcan en los datos.
6. ¿Qué precauciones tomar con herramientas que optimizan prompts automáticamente?
   R: Vigilar las llamadas ocultas a la API que multiplican el costo, inspeccionar los prompts que generan porque pueden tener errores de plantilla o erratas, y tener en cuenta que pueden cambiar sin aviso; conviene empezar escribiendo prompts a mano.
7. ¿Por qué conviene separar los prompts del código y versionarlos?
   R: Para reutilizarlos, probarlos de forma independiente, mejorar la legibilidad, permitir que expertos no programadores colaboren y poder fijar o revertir versiones concretas por aplicación, registrando qué versión produjo cada resultado.

## Ejercicio

Toma el prompt del juez de la sesión 5 y crea tres variantes en `prompts/`: (A) zero-shot con instrucciones mínimas, (B) A + rúbrica explícita + formato JSON con marcador, (C) B + dos ejemplos compactos + campo `reasoning` antes de `score`. Ejecútalas sobre los 12 casos de la sesión 5 y además ejecuta `needle.ts` con tu modelo. Registra para cada variante: porcentaje de JSON válido, coincidencia ±1 con tus notas y tokens de entrada promedio (`usage.prompt_tokens`). Terminado cuando tienes una tabla de las tres variantes con esas tres columnas, el resultado del needle por posición y una frase sobre qué cambio aportó más.

## Explícalo con tus palabras

Explica a un desarrollador junior por qué "prompt engineering" es ingeniería y no magia, usando como ejemplo cómo mejorarías un prompt que a veces devuelve notas con decimales.
