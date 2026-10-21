---
title: Agentes — herramientas, planning, modos de fallo y memoria
kind: lesson
hours: 2
sources: AI Engineering (Chip Huyen), cap. 6, Agents y Memory (pp. 535–593)
links: Berkeley Function Calling Leaderboard | https://gorilla.cs.berkeley.edu/leaderboard.html ; ReAct paper | https://arxiv.org/abs/2210.03629
---

## Objetivo

Entender qué es un agente (entorno + acciones), qué tipos de herramientas amplían a un modelo, cómo se genera, valida y ejecuta un plan (function calling, granularidad, flujos de control, reflexión al estilo ReAct), cómo se eligen herramientas, cómo fallan y se evalúan los agentes, y cómo diseñar la memoria (interna, corto plazo, largo plazo).

## Estudio

### 1. Qué es un agente

Un **agente** es cualquier cosa que puede **percibir su entorno y actuar sobre él**. Se caracteriza por dos cosas: el **entorno** en que opera y el **conjunto de acciones** que puede realizar.

- El entorno lo define el caso de uso: un juego, internet, una cocina, el sistema de archivos y la terminal de un repositorio.
- Las acciones las amplían las **herramientas**. Un asistente de chat que busca en la web, ejecuta código y genera imágenes es un agente. Un sistema RAG también lo es: el retriever de texto, el de imágenes y el ejecutor SQL son sus herramientas.

Entorno y herramientas se condicionan: en ajedrez solo hay movimientos legales; un robot que solo sabe nadar queda confinado al agua. En un agente basado en foundation models, **la IA es el cerebro**: recibe la tarea y el feedback del entorno, planea una secuencia de acciones y decide si la tarea está cumplida.

Ejemplo con la tienda de la sesión 12 y tres acciones (generar SQL, ejecutar SQL, generar respuesta). Pregunta: "Proyecta las ventas del sombrero X para los próximos tres meses". El agente podría: razonar que necesita ventas de los últimos años → generar SQL → ejecutarlo → razonar que faltan datos de campañas de marketing → generar otra consulta → ejecutarla → razonar que ya tiene suficiente → generar la proyección → decidir que terminó.

#### Por qué los agentes exigen modelos más fuertes

1. **Errores compuestos**: si cada paso acierta el 95 %, diez pasos aciertan juntos alrededor del 60 % (0.95¹⁰) y cien pasos, menos del 1 %.
2. **Más en juego**: con herramientas, los errores tienen consecuencias reales.

```ts
const successAfter = (pStep: number, steps: number) => pStep ** steps;
console.log(successAfter(0.95, 10).toFixed(2));  // 0.60
console.log(successAfter(0.99, 10).toFixed(2));  // 0.90
console.log(successAfter(0.95, 100).toFixed(4)); // 0.0059
```

Moraleja de diseño: **menos pasos y pasos más fiables** valen más que un agente "inteligente" que da cincuenta vueltas.

El éxito de un agente en un entorno depende de dos cosas: su **inventario de herramientas** y la fuerza de su **planner**.

### 2. Herramientas

Sin herramientas, un modelo hace básicamente una cosa (generar texto o imágenes). Las herramientas sirven para **percibir** el entorno (acciones de **lectura**) y para **actuar** sobre él (acciones de **escritura**). Tres categorías:

| Categoría | Ejemplos | Para qué |
| --- | --- | --- |
| **Aumento de conocimiento** | Retrievers, SQL, búsqueda de personas internas, API de inventario, lector de correo, búsqueda web, APIs de noticias | Dar contexto privado o actualizado; evita que el modelo quede "rancio" (sin datos posteriores a su entrenamiento) |
| **Extensión de capacidades** | Calculadora, calendario, conversor de zonas horarias y unidades, traductor, intérprete de código, OCR, generador de imágenes, transcripción | Cubrir debilidades del modelo (los LLM son malos en aritmética: dividir 199 999 entre 292 es trivial para una calculadora) o volverlo multimodal |
| **Acciones de escritura** | Ejecutar SQL de escritura, enviar correos, iniciar transferencias, crear tickets | Automatizar flujos completos |

Las herramientas pueden mejorar más que el prompting o incluso el finetuning: un agente con trece herramientas superó claramente al mismo modelo sin ellas en benchmarks de ciencia y de matemáticas sobre tablas.

Sobre la escritura: igual que no le darías a un becario permiso para borrar la base de datos de producción, no le des a una IA poco fiable la capacidad de iniciar transferencias. Confianza en el sistema y medidas de seguridad primero (sesión 10). Y cuidado con la web: abre la puerta a todo lo que hay en internet, incluidas inyecciones.

#### Function calling

La mayoría de los proveedores soportan **function calling**: describes tus herramientas con un esquema JSON, el modelo decide si llama a alguna y con qué argumentos, **tu código la ejecuta** y le devuelves el resultado. El modelo nunca ejecuta nada por sí mismo.

```ts
// agente mínimo con function calling (formato compatible con OpenAI)
const tools = [
  {
    type: "function",
    function: {
      name: "divide",
      description: "Divide dos números con precisión.",
      parameters: {
        type: "object",
        properties: { a: { type: "number" }, b: { type: "number" } },
        required: ["a", "b"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_today",
      description: "Devuelve la fecha de hoy en formato YYYY-MM-DD.",
      parameters: { type: "object", properties: {} },
    },
  },
];

const impl: Record<string, (args: any) => unknown> = {
  divide: ({ a, b }) => (b === 0 ? { error: "división por cero" } : { result: a / b }),
  get_today: () => ({ today: new Date().toISOString().slice(0, 10) }),
};

export async function runAgent(task: string, maxSteps = 5) {
  const messages: any[] = [
    { role: "system", content: "Usa las herramientas cuando las necesites. Responde en español." },
    { role: "user", content: task },
  ];
  for (let step = 0; step < maxSteps; step++) {          // límite de pasos: evita bucles infinitos
    const res = await fetch("https://api.nan.builders/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NAN_API_KEY}` },
      body: JSON.stringify({ model: "deepseek-v4-flash", messages, tools, temperature: 0 }),
    });
    const msg = (await res.json()).choices[0].message;
    messages.push(msg);
    if (!msg.tool_calls?.length) return msg.content;     // sin llamadas: respuesta final
    for (const call of msg.tool_calls) {
      const fn = impl[call.function.name];
      let output: unknown;
      try {
        output = fn ? fn(JSON.parse(call.function.arguments || "{}")) : { error: "herramienta inexistente" };
      } catch (e) {
        output = { error: String(e) };                  // errores se devuelven al modelo, no se lanzan
      }
      console.log("tool", call.function.name, call.function.arguments, "->", output); // registra todo
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(output) });
    }
  }
  return "No terminé dentro del límite de pasos.";
}
```

(Comprueba en la documentación de tu proveedor que el modelo soporta el parámetro `tools`; si no, puedes pedir al modelo que devuelva un JSON `{"tool": ..., "args": ...}` y hacer el mismo bucle.)

### 3. Planning

Una **tarea** se define por su **objetivo** y sus **restricciones** ("viaje de dos semanas a la India con 5 000 dólares": el viaje es el objetivo, el presupuesto la restricción). Las tareas complejas requieren un **plan**: la hoja de ruta con los pasos. Planear bien implica entender la tarea, considerar alternativas y elegir la más prometedora. Ejemplo: "¿Cuántas empresas sin ingresos han levantado al menos mil millones?" Se puede (1) buscar empresas sin ingresos y filtrar por inversión, o (2) buscar las que levantaron mil millones y filtrar por ingresos. La segunda es mucho más eficiente porque hay muchas menos empresas en ese grupo.

#### Separar planificar de ejecutar

Puedes pedir el plan y ejecutarlo en el mismo prompt, pero si el modelo inventa un plan de mil pasos inútil, lo descubrirás después de horas y mucho dinero. Mejor **desacoplar**:

```
tarea ─► generar plan ─► validar plan ──(malo)──► regenerar
                             │(bueno)
                             ▼
                        ejecutar pasos (function calling)
                             ▼
                  evaluar resultados ──(no cumplido)──► nuevo plan
                             │(cumplido)
                             ▼
                          respuesta
```

Validación del plan: heurísticas (descartar planes con herramientas inexistentes o con más de N pasos) o un juez de IA. Puedes generar varios planes en paralelo y elegir el mejor (más costo, menos latencia). Este sistema ya tiene tres componentes (generar, validar, ejecutar): si consideras cada uno un agente, es un **sistema multiagente**.

Ayuda mucho un **clasificador de intención** previo: si la consulta es de facturación, el agente necesita la herramienta de pagos; si es de contraseñas, la de documentación. Y debe poder clasificar como **IRRELEVANTE** lo que está fuera de alcance, para rechazarlo con amabilidad en lugar de gastar cómputo.

**Humanos en el bucle**: pueden dar el plan de alto nivel, validar planes o ejecutar las partes de riesgo (actualizar una base de datos, hacer merge de código). Define el **nivel de automatización por acción**.

#### ¿Saben planear los LLM?

Es un debate abierto. Algunos investigadores sostienen que los modelos autoregresivos no pueden planear de verdad: producen planes que parecen razonables pero fallan al ejecutarse. Planear es, en el fondo, un **problema de búsqueda**: explorar caminos, predecir el resultado de cada uno y a veces **retroceder** (*backtracking*). El modelo puede retroceder en la práctica revisando el camino o empezando de nuevo, y planea mejor si sabe **qué consecuencia tiene cada acción** (no basta listar acciones; hay que predecir el estado resultante). Aunque un LLM no planee perfecto, puede ser **parte** de un planner junto con herramientas de búsqueda y seguimiento de estado.

#### Granularidad y flujo de control

- **Granularidad**: un plan detallado es difícil de generar y fácil de ejecutar; uno de alto nivel, al revés. Solución: **planificación jerárquica** (alto nivel primero, detalle por cada paso después).
- **Nombres de funciones vs lenguaje natural**: planes con nombres exactos de funciones se rompen si renombras una herramienta; planes en lenguaje natural ("obtener la fecha de hoy") son más robustos, pero requieren un **traductor** a comandos ejecutables (tarea más simple que planear, apta para un modelo más pequeño).
- **Flujos de control**: secuencial (B después de A), paralelo (buscar el precio de 100 productos a la vez), condicional (si el informe es bueno, comprar; si no, vender) y bucles (repetir hasta cumplir una condición). En software tradicional las condiciones son exactas; aquí las decide el modelo. Si evalúas un framework de agentes, revisa qué flujos soporta: el paralelismo reduce mucho la latencia.

#### Reflexión y corrección de errores

La reflexión no es obligatoria para que un agente funcione, pero sí para que **tenga éxito**. Puede aplicarse: tras recibir la consulta (¿es factible?), tras generar el plan (¿tiene sentido?), tras cada paso (¿voy bien?) y al final (¿cumplí?).

El patrón **ReAct** intercala razonamiento y acción:

```
Thought 1: Necesito la fecha de hoy para calcular "la semana pasada".
Act 1: get_today()
Observation 1: 2026-10-20
Thought 2: La semana pasada va del 2026-10-13 al 2026-10-19. Busco el producto más vendido.
Act 2: fetch_top_products(start="2026-10-13", end="2026-10-19", n=1)
Observation 2: ["Sombrero X"]
...
Act N: Finish[El producto más vendido fue el Sombrero X, a 18 USD]
```

Una variante separa un **evaluador** (¿salió bien?) de un módulo de **autorreflexión** (¿por qué falló y cómo mejorar?): por ejemplo, el código falla un tercio de los tests; la reflexión detecta que no consideró arreglos con todos los números negativos; el siguiente intento lo corrige. La reflexión es relativamente fácil de implementar y mejora bastante, a cambio de **tokens y latencia** (pensamientos y observaciones ocupan contexto, y los ejemplos para enseñar el formato también).

#### Selección de herramientas

Más herramientas = más capacidad, pero más difícil usarlas bien y más espacio de contexto en descripciones. Hay trabajos con 5 herramientas, con 13 y con más de mil APIs. Cómo decidir:

- Compara el rendimiento con distintos conjuntos de herramientas.
- Haz **ablation**: quita una herramienta; si el rendimiento no baja, elimínala.
- Busca herramientas con las que el agente se equivoca mucho; si ni con buenos prompts aprende a usarla, cámbiala por una más simple.
- Mira la distribución de llamadas: tareas distintas usan herramientas distintas y **modelos distintos prefieren herramientas distintas**.

Idea avanzada: si dos herramientas se usan casi siempre juntas, combínalas en una; algunos agentes guardan "habilidades" (programas) que les funcionaron en una biblioteca para reutilizarlas.

### 4. Modos de fallo y evaluación de agentes

Evaluar es detectar fallos: identifica los modos de fallo de tu agente y **mide la frecuencia de cada uno**.

| Modo de fallo | Ejemplos | Cómo detectarlo |
| --- | --- | --- |
| **Planning: herramienta inválida** | Llama a `bing_search` y no existe | Validar nombres contra el inventario |
| **Planning: parámetros inválidos** | `lbs_to_kg` con dos parámetros cuando requiere uno | Validar contra el esquema JSON |
| **Planning: valores incorrectos** | `lbs = 100` cuando era 120 | Casos con valores esperados |
| **Fallo de objetivo** | No cumple la meta o viola restricciones (viaja a otra ciudad, se pasa del presupuesto, de una semana en lugar de dos) | Checks de restricciones y juez |
| **Fallo de herramienta** | La herramienta devuelve algo erróneo (mal SQL, mala descripción de imagen) o falla el traductor | Probar cada herramienta por separado; registrar cada llamada y su salida |
| **Herramienta ausente** | Necesita precios actuales y no tiene internet | Observar a expertos humanos: ¿qué herramientas usarían? |
| **Ineficiencia** | Cumple pero con demasiados pasos, tiempo o dinero | Pasos, costo y tiempo medio por tarea vs una línea base |

Un fallo de objetivo sutil: el agente "cree" que terminó cuando no es así. Por eso la evaluación final debe hacerla algo distinto del propio agente (checks o un juez).

Sobre eficiencia: compara con una línea base (otro agente o un operador humano), recordando que humanos y agentes operan distinto: visitar cien páginas es caro para una persona y trivial en paralelo para un agente.

```ts
// métricas de un lote de ejecuciones de agente
type Trace = { taskId: string; success: boolean; steps: number; costUSD: number; ms: number;
               errors: ("invalid_tool" | "invalid_args" | "wrong_values" | "goal" | "tool")[] };

export function agentReport(traces: Trace[]) {
  const n = traces.length;
  const count = (e: Trace["errors"][number]) => traces.filter((t) => t.errors.includes(e)).length / n;
  return {
    successRate: traces.filter((t) => t.success).length / n,
    avgSteps: traces.reduce((s, t) => s + t.steps, 0) / n,
    avgCost: traces.reduce((s, t) => s + t.costUSD, 0) / n,
    invalidTool: count("invalid_tool"), invalidArgs: count("invalid_args"),
    wrongValues: count("wrong_values"), goalFailure: count("goal"), toolFailure: count("tool"),
  };
}
```

### 5. Memoria

La **memoria** son los mecanismos que permiten al modelo retener y usar información. Es clave en RAG (el contexto crece con cada recuperación) y en agentes (instrucciones, ejemplos, inventario de herramientas, planes, salidas, reflexiones). Tres tipos:

| Memoria | Qué es | Analogía humana | Características |
| --- | --- | --- | --- |
| **Interna** | Lo aprendido en el entrenamiento | Saber respirar | Disponible siempre; solo cambia reentrenando |
| **Corto plazo** | El contexto actual (mensajes previos) | El nombre de alguien que acabas de conocer | Rápida, limitada, no persiste entre tareas |
| **Largo plazo** | Fuentes externas accesibles por retrieval | Libros, notas, el ordenador | Persiste; se puede borrar sin tocar el modelo |

Regla de ubicación según frecuencia de uso: lo necesario para **todas** las tareas, a la memoria interna (finetuning); lo que se necesita **rara vez**, a largo plazo; lo **inmediato** de la tarea actual, a corto plazo.

Beneficios de un buen sistema de memoria:

- **Manejar el desbordamiento** dentro de una sesión (lo que no cabe en el contexto va a largo plazo).
- **Persistir entre sesiones**: un tutor que olvida todo lo que le contaste es inútil; uno que recuerda que te costó el tema de RAG puede reforzarlo.
- **Consistencia**: si recuerda cómo calificó antes, califica de forma más coherente.
- **Integridad de datos estructurados**: guardar tablas, colas de acciones o listas fuera del texto del contexto.

Un sistema de memoria tiene dos funciones: **gestión** (qué guardar y qué borrar) y **recuperación** (similar al retrieval de RAG). La gestión de la memoria a corto plazo importa porque el contexto es limitado; si reservas el 30 % del contexto para lo recuperado de largo plazo, te queda el 70 % para el corto plazo y lo que exceda se mueve a largo plazo.

Estrategias para el corto plazo:

- **FIFO**: se descartan los mensajes más antiguos (o se conservan los últimos N). Simple, pero peligroso: a veces los primeros mensajes contienen el propósito de la conversación.
- **Resumen**: comprimir la conversación con un modelo, más seguimiento de entidades clave. Hay variantes que fusionan el resumen con la información que el resumen omitió.
- **Reflexión sobre la memoria**: tras cada acción, el agente decide si la información nueva se inserta, se fusiona con algo existente o reemplaza algo desactualizado. Ante **contradicciones**, unos se quedan con lo más reciente y otros le piden a un modelo que decida; depende del caso.

```ts
// memoria de corto plazo: mantiene sistema + primer mensaje + resumen + últimos N turnos
export async function compactHistory(messages: Msg[], keepLast = 6): Promise<Msg[]> {
  if (messages.length <= keepLast + 2) return messages;
  const [system, first, ...rest] = messages;
  const old = rest.slice(0, rest.length - keepLast);
  const summary = await chat([
    { role: "system", content: "Resume la conversación en 5 viñetas: objetivo del usuario, decisiones, datos clave y pendientes." },
    { role: "user", content: old.map((m) => `${m.role}: ${m.content}`).join("\n") },
  ], 0);
  return [system, first, { role: "system", content: `Resumen de lo anterior:\n${summary}` }, ...rest.slice(-keepLast)];
}
```

### 6. Checklist para tu primer agente

- Empieza con **2–4 herramientas de lectura**; añade escritura solo con confirmación humana.
- Esquemas JSON estrictos y validación de argumentos antes de ejecutar.
- **Límite de pasos, de tiempo y de costo** por tarea.
- Registra cada pensamiento, llamada y salida (trazas) para depurar y evaluar.
- Devuelve los errores de herramientas al modelo como datos, no como excepciones que tumban el proceso.
- Evalúa con un conjunto de tareas con resultado verificable y mide cada modo de fallo por separado.

## Conceptos clave

- **Agente**: sistema que percibe su entorno y actúa sobre él; se define por su entorno y sus acciones.
- **Tool inventory**: conjunto de herramientas a las que el agente tiene acceso.
- **Function calling**: mecanismo por el que el modelo propone llamadas a funciones descritas con esquemas y tu código las ejecuta.
- **Errores compuestos**: la probabilidad de éxito total cae multiplicativamente con el número de pasos.
- **Plan**: secuencia de acciones para cumplir una tarea con objetivo y restricciones.
- **Planificación jerárquica**: generar primero un plan de alto nivel y luego detallar cada paso.
- **ReAct**: patrón que intercala pensamiento, acción y observación hasta terminar.
- **Reflexión**: evaluar planes y resultados para detectar y corregir errores.
- **Ablation**: quitar un componente (por ejemplo, una herramienta) para medir cuánto aporta.
- **Memoria interna, de corto y de largo plazo**: pesos del modelo, contexto actual y almacenamiento externo recuperable.

## Preguntas de repaso

1. ¿Por qué un agente con 95 % de acierto por paso puede ser poco fiable y qué implica para el diseño?
   R: Porque el éxito total es el producto de los aciertos de cada paso: con diez pasos baja a alrededor del 60 % y con cien a menos del 1 %. Implica diseñar tareas con pocos pasos, hacer cada paso más fiable (herramientas deterministas, validación) y añadir reflexión y límites.
2. Da un ejemplo de herramienta de cada categoría: aumento de conocimiento, extensión de capacidades y escritura.
   R: Aumento de conocimiento: un retriever sobre la documentación interna o una búsqueda web. Extensión de capacidades: una calculadora o un intérprete de código. Escritura: enviar un correo o ejecutar un UPDATE en la base de datos.
3. ¿Por qué conviene separar la generación del plan de su ejecución?
   R: Para validar el plan antes de gastar tiempo y dinero ejecutándolo; un plan inválido (herramientas inexistentes, demasiados pasos o sin sentido) se descarta o se regenera, en vez de descubrir el problema tras muchas llamadas.
4. ¿Qué ventajas y desventajas tiene expresar planes en lenguaje natural en vez de con nombres de funciones?
   R: Es más robusto a cambios en las APIs de herramientas y más natural para el modelo, con menos alucinación; a cambio requiere un traductor que convierta cada paso en un comando ejecutable, aunque esa traducción es más sencilla que planear.
5. Enumera tres modos de fallo de planning y uno de herramienta.
   R: De planning: llamar a una herramienta inexistente, usar una herramienta válida con parámetros inválidos y usarla con valores incorrectos (además de no cumplir el objetivo o sus restricciones). De herramienta: que la herramienta devuelva un resultado erróneo, por ejemplo un SQL mal generado.
6. ¿Qué información debe ir a cada tipo de memoria según su frecuencia de uso?
   R: Lo que se necesita en todas las tareas, a la memoria interna mediante entrenamiento o finetuning; lo que se necesita rara vez, a la memoria de largo plazo con retrieval; y lo inmediato de la tarea en curso, a la memoria de corto plazo en el contexto.
7. ¿Cuál es el riesgo de gestionar la memoria con FIFO?
   R: Que se descarten los mensajes más antiguos aunque contengan información crucial, como el objetivo de la conversación o restricciones del usuario, y el agente pierda el hilo; por eso se combinan resúmenes o se conservan mensajes clave.

## Ejercicio

Implementa `runAgent` con tres herramientas de solo lectura: `divide`, `get_today` y `search_notes(query)` (que usa tu retriever de la sesión 11 sobre tus apuntes). Crea 10 tareas con resultado verificable (por ejemplo, "¿cuántos días faltan para el 31 de diciembre?", "según mis apuntes, ¿qué valor de k usa RRF?", una tarea imposible sin internet). Ejecuta cada una, guarda la traza y calcula con `agentReport` la tasa de éxito, los pasos medios y la frecuencia de cada modo de fallo. Terminado cuando tienes las 10 trazas, el reporte y una modificación concreta (en descripciones de herramientas o en el prompt) que reduzca el modo de fallo más frecuente, medida con una segunda ejecución.

## Explícalo con tus palabras

Explica a alguien que quiere "un agente que haga todo" por qué es mejor empezar con pocas herramientas de lectura, pocos pasos y un humano aprobando las acciones de escritura.
