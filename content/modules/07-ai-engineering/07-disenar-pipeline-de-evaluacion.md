---
title: Evaluación IV — diseñar tu pipeline de evaluación
kind: lesson
hours: 2
sources: AI Engineering (Chip Huyen), cap. 4, Design Your Evaluation Pipeline (pp. 393–415)
---

## Objetivo

Construir paso a paso un pipeline de evaluación confiable para una aplicación abierta: evaluar cada componente, escribir una guía de evaluación con rúbricas, conectar métricas con negocio, elegir métodos y datos, segmentar (slicing), dimensionar el conjunto de evaluación con bootstrap y evaluar al propio pipeline.

## Estudio

### 1. La idea central

El éxito de una aplicación de IA depende de poder **distinguir resultados buenos de malos** de forma fiable y repetible. Esa capacidad es el **pipeline de evaluación**: datos + métodos + criterios + registro de resultados, que puedes volver a ejecutar cada vez que cambias un prompt, un modelo o un componente. En las sesiones 4–6 viste las piezas; aquí las montas. A lo largo de la sesión usaremos un ejemplo continuo: **un tutor que corrige respuestas de estudio** (el estudiante responde una pregunta de repaso y el sistema devuelve nota y retroalimentación).

El proceso tiene tres pasos y un ciclo:

```
Paso 1. Evaluar todos los componentes (por componente, por turno, por tarea)
Paso 2. Crear la guía de evaluación (criterios, rúbricas, vínculo con negocio)
Paso 3. Definir métodos y datos (métodos, anotación, slices, tamaño)
   ↺   Evaluar el pipeline e iterar con experiment tracking
```

### 2. Paso 1: evalúa todos los componentes

Las aplicaciones reales tienen varios componentes y las tareas pueden requerir varios turnos. Evalúa la **salida final** y **cada salida intermedia** por separado. Ejemplo: extraer el empleador actual de un CV en PDF en dos pasos: (1) PDF a texto y (2) extraer el empleador del texto. Si el resultado está mal, ¿falló el paso 1 o el 2? Si solo mides el final, no lo sabes. El paso 1 se mide con similitud entre el texto extraído y el texto real; el paso 2, con exactitud **dado un texto correcto**.

En el tutor:

| Componente | Qué puede fallar | Cómo medirlo |
| --- | --- | --- |
| Transcripción de voz (si responde hablando) | Palabras mal reconocidas | Similitud con transcripción manual |
| Recuperación de la respuesta modelo | Se trae la pregunta equivocada | Exact match del ID |
| Calificación | Nota injusta | Coincidencia con la nota de un humano (±1) |
| Retroalimentación | Inventa errores o es vaga | Juez con rúbrica |

#### Por turno y por tarea

Un **turno** es una salida del sistema (aunque internamente haga varios pasos). Una **tarea** es el objetivo del usuario, que puede requerir varios turnos. Si le pides a un asistente que depure tu código, quizá primero pregunte tu versión de Node y luego te ayude. La evaluación **por turno** mide la calidad de cada salida; la **por tarea** mide si se completó el objetivo y **en cuántos turnos** (no es lo mismo resolverlo en dos que en veinte). A los usuarios les importa la tarea, así que es la más importante, aunque delimitar dónde empieza y termina una tarea en una conversación es difícil.

Un ejemplo elegante de evaluación por tarea es el juego de las veinte preguntas entre dos instancias de un modelo: una piensa un concepto y responde sí/no; la otra pregunta. La puntuación depende de si adivina y de cuántas preguntas usa.

### 3. Paso 2: la guía de evaluación

Es **el paso más importante**. Una guía ambigua produce notas ambiguas que engañan. Si no sabes cómo es una mala respuesta, no la vas a detectar.

#### Qué debe y qué no debe hacer

Define también el **alcance negativo**: ¿tu bot de soporte debe opinar sobre elecciones? Si no, define qué entradas están fuera de alcance, cómo detectarlas y cómo responder. En el tutor: ¿debe resolver la pregunta por el estudiante si este pide "dime la respuesta"? Decide y evalúalo.

#### Qué significa "bueno"

A menudo lo difícil no es decidir si una salida es buena, sino **qué significa bueno**. Una respuesta correcta no siempre es buena: un asistente de evaluación de candidatos que responde "no encajas en este puesto" puede ser correcto pero inútil; una buena respuesta explicaría la brecha entre requisitos y perfil y cómo cerrarla. Los equipos suelen usar entre dos y tres criterios por aplicación. Para soporte: relevancia, consistencia factual con el contexto y seguridad. Para el tutor:

1. **Justicia de la nota**: coincide con la de un evaluador experto (±1).
2. **Fidelidad de la retroalimentación**: no señala errores inexistentes ni contradice la respuesta modelo.
3. **Utilidad**: indica qué idea faltó y cómo mejorar, en máximo tres frases.

Para encontrar criterios, juega con consultas reales: genera varias respuestas para cada una y decide cuáles son buenas o malas y **por qué**; los "por qué" se convierten en criterios.

#### Rúbricas con ejemplos

Para cada criterio elige escala: binaria (0/1), tres valores (−1 contradicción, 0 neutral, 1 entailment), 1–5, 0–1. Escribe qué aspecto tiene cada nivel con ejemplos y por qué merecen esa nota. **Valida la rúbrica con personas** (tú, compañeros): si les cuesta aplicarla, es ambigua; refínala. Este ir y venir es necesario. Bonus: la misma guía servirá después para anotar datos de finetuning (sesión 16).

#### Conecta con el negocio

Una métrica sin traducción a negocio no ayuda a decidir. Lo ideal es un mapa como:

| Consistencia factual | Impacto estimado |
| --- | --- |
| 80 % | Automatizar 30 % de tickets (solo recomendaciones y feedback general) |
| 90 % | Automatizar 50 % |
| 98 % | Automatizar 90 % (incluida facturación) |

Ese mapa te dice cuánto vale invertir en subir un punto. Define también el **umbral de utilidad** (por debajo de X, no sirve ni para lo básico). Y piensa qué métricas de negocio persigues: las de "pegajosidad" (usuarios activos diarios/semanales/mensuales) y engagement (sesiones, duración) aumentan ingresos, pero optimizarlas a ciegas puede empujar funciones adictivas o contenido extremo. En el tutor, la métrica de negocio sana es aprendizaje: porcentaje de preguntas que el estudiante acierta en el siguiente repaso espaciado.

### 4. Paso 3: métodos y datos

#### Elegir métodos por criterio

Cada criterio puede requerir un método distinto: clasificador pequeño para toxicidad, similitud semántica para relevancia pregunta–respuesta, juez para consistencia factual con el contexto. Puedes **combinar** para el mismo criterio: un clasificador barato sobre el 100 % del tráfico y un juez caro sobre el 1 %. Así tienes cobertura y calidad con costo controlado.

**Usa logprobs cuando existan**: si pides una clase entre tres y las probabilidades están todas entre 30 y 40 %, el modelo no está seguro; si una tiene 95 %, sí. Sirven como señal de confianza para mandar los casos dudosos a revisión humana.

**Automatiza todo lo posible, pero no tengas miedo a la evaluación humana**, incluso en producción. Muchos equipos usan expertos humanos como "estrella polar": cada día revisan una muestra de conversaciones (hay equipos que revisan cientos al día) para detectar cambios o patrones raros.

Piensa en dos momentos: **experimentación** (tienes referencias) y **producción** (no tienes referencias, pero tienes usuarios y su feedback; sesión 18).

#### Anotar datos de evaluación

Necesitas ejemplos anotados para cada componente y cada criterio, por turno y por tarea. Usa datos reales de producción si puedes; si hay **etiquetas naturales** (el usuario aceptó la sugerencia, el código compiló), aprovéchalas. Si no, etiqueta con humanos o con IA revisada.

Un formato simple y versionable es JSONL, un caso por línea:

```json
{"id":"q-017","slice":"respuesta-corta","question":"¿Qué mide la perplexity?","reference":"La incertidumbre del modelo al predecir el siguiente token; es la exponencial de la cross entropy.","answer":"Lo confundido que está el modelo","expected_score":3}
{"id":"q-018","slice":"con-typos","question":"¿Qué es top-p?","reference":"Muestrear del conjunto mínimo de tokens cuya probabilidad acumulada supera p.","answer":"elegir tokens asta sumar p de probabilidad","expected_score":4}
```

#### Slicing: no te quedes con el promedio

**Segmentar** es separar los datos en subconjuntos y medir cada uno. Sirve para:

- Evitar sesgos contra grupos minoritarios de usuarios.
- Depurar: si va mal en un subconjunto, ¿es por la longitud, el tema, el formato?
- Encontrar mejoras: si falla con entradas largas, prueba otro procesamiento u otro modelo.
- Evitar la **paradoja de Simpson**: A puede ganarle a B en cada subgrupo y perder en el total, porque los subgrupos tienen tamaños distintos.

| | Grupo 1 | Grupo 2 | Total |
| --- | --- | --- | --- |
| Modelo A | 93 % (81/87) | 73 % (192/263) | 78 % (273/350) |
| Modelo B | 87 % (234/270) | 69 % (55/80) | 83 % (289/350) |

A es mejor en ambos grupos y peor en total: B tuvo más casos del grupo fácil.

Ten **varios conjuntos de evaluación**:

- Uno que **represente la distribución real** de producción (para estimar el rendimiento global).
- Por **segmentos** de negocio (usuarios gratis vs de pago, móvil vs web).
- Uno de **errores conocidos** del sistema (regresiones).
- Uno de **errores de los usuarios** (si hay muchas faltas de ortografía en producción, incluye faltas).
- Uno **fuera de alcance**, para comprobar que el sistema se niega o redirige bien.

Lema: **si algo te importa, ponle un conjunto de prueba**.

```ts
type Result = { id: string; slice: string; pass: boolean };

export function bySlice(results: Result[]) {
  const groups = new Map<string, { pass: number; total: number }>();
  for (const r of results) {
    const g = groups.get(r.slice) ?? { pass: 0, total: 0 };
    g.total++;
    if (r.pass) g.pass++;
    groups.set(r.slice, g);
  }
  return [...groups.entries()].map(([slice, g]) => ({
    slice,
    n: g.total,
    accuracy: +(g.pass / g.total).toFixed(3),
  }));
}
```

#### ¿Cuántos ejemplos?

Suficientes para que el resultado sea fiable y pocos para que no sea carísimo ejecutarlo. Dos herramientas:

**Bootstrap** para saber si tu conjunto es estable: toma muestras con reemplazo del mismo tamaño, evalúa cada una y mira cuánto varía la métrica. Si un bootstrap da 90 % y otro 70 %, tu conjunto es demasiado pequeño.

```ts
export function bootstrap(passes: boolean[], rounds = 1000) {
  const n = passes.length;
  const scores: number[] = [];
  for (let r = 0; r < rounds; r++) {
    let ok = 0;
    for (let i = 0; i < n; i++) if (passes[Math.floor(Math.random() * n)]) ok++;
    scores.push(ok / n);
  }
  scores.sort((a, b) => a - b);
  return {
    mean: scores.reduce((a, b) => a + b, 0) / rounds,
    p2_5: scores[Math.floor(rounds * 0.025)],   // intervalo aproximado del 95 %
    p97_5: scores[Math.floor(rounds * 0.975)],
  };
}
```

Si los intervalos de dos variantes de prompt se solapan mucho, no puedes afirmar que una es mejor.

**Regla de tamaño para comparar sistemas** (estimación aproximada para 95 % de confianza):

| Diferencia a detectar | Ejemplos necesarios |
| --- | --- |
| 30 % | ~10 |
| 10 % | ~100 |
| 3 % | ~1 000 |
| 1 % | ~10 000 |

Regla mnemotécnica: cada vez que la diferencia se divide por 3, necesitas 10 veces más ejemplos. Como referencia, los benchmarks de los harness públicos tienen una mediana de unos 1 000 ejemplos, y hay organizadores de concursos que consideran 300 el mínimo absoluto. Para un proyecto personal, empezar con 30–100 casos bien elegidos es razonable, sabiendo que solo detectarás diferencias grandes.

### 5. Evalúa tu pipeline de evaluación

Preguntas que debes poder responder:

1. **¿Da las señales correctas?** ¿Las respuestas mejores sacan más nota? ¿Mejores métricas se traducen en mejores resultados de negocio?
2. **¿Es fiable?** Si lo ejecutas dos veces, ¿da lo mismo? ¿Cuánto varía con distintos conjuntos? Reduce la varianza: juez con temperature 0, configuración fija.
3. **¿Qué tan correlacionadas están tus métricas?** Si dos están perfectamente correlacionadas, sobra una. Si no correlacionan nada, o descubriste algo interesante o alguna métrica no es confiable.
4. **¿Cuánto costo y latencia añade?** Saltarse la evaluación para ganar velocidad es una apuesta arriesgada; mejor muestrear.

En el tutor, la validación más importante es la del juez: etiqueta tú 30 respuestas y mide coincidencia exacta y ±1 con el juez (lo harás en el proyecto de la sesión 9).

### 6. Itera, pero con experiment tracking

Tus criterios evolucionarán con los usuarios: cambiarás rúbricas, añadirás y quitarás ejemplos. Pero si el proceso cambia constantemente, no podrás comparar resultados en el tiempo. Solución: **registra todas las variables** de cada ejecución.

```ts
type EvalRun = {
  runId: string;            // p. ej. fecha + hash corto
  datasetVersion: string;   // "tutor-eval-v3 (120 casos)"
  systemPrompt: string;     // o su hash + ruta en git
  model: string;            // "deepseek-v4-flash"
  temperature: number;
  judge: { model: string; promptVersion: string; temperature: number };
  metrics: Record<string, number>;          // global
  slices: { slice: string; n: number; accuracy: number }[];
  costUSD: number;
  p90LatencyMs: number;
};
```

Guárdalo como JSON junto al código (o en una tabla) y compara ejecuciones: así una subida de 2 puntos se puede atribuir a un cambio concreto y no a que cambió el juez.

### 7. El pipeline completo, de punta a punta

```
evalset.jsonl ──► sistema bajo prueba (prompt vX + modelo)
                       │ salidas
                       ▼
        ┌──────────── evaluadores ─────────────┐
        │ exact match / checks de instrucciones │
        │ similitud semántica                   │
        │ juez con rúbrica (temperature 0)      │
        └───────────────────┬──────────────────┘
                            ▼
          métricas globales + por slice + bootstrap
                            ▼
                  runs/2026-10-20-abc.json  ──► comparar con el run anterior
```

Fases de madurez razonables para un proyecto como el tuyo:

| Fase | Qué tienes | Qué te permite |
| --- | --- | --- |
| 0 | Mirar respuestas a ojo | Arrancar |
| 1 | 30–50 casos JSONL + exact match/checks + script | Detectar regresiones grandes |
| 2 | + juez validado contra tus etiquetas + slices | Comparar prompts y modelos |
| 3 | + bootstrap, tracking de runs, costo y latencia | Decidir con confianza |
| 4 | + muestreo de producción, feedback de usuarios | Mejorar continuamente |

### 8. Ejemplo trabajado: ¿el prompt B del tutor es mejor que el A?

Tienes 60 casos en `evalset.jsonl`. El prompt A obtiene 41/60 notas dentro de ±1 de la nota experta (68 %); el B obtiene 46/60 (77 %). ¿Cambias a B?

1. **Mira el tamaño**: 9 puntos de diferencia con 60 casos está en el límite de lo detectable (la tabla pide unos 100 ejemplos para 10 %). Ejecutas el bootstrap: A da un intervalo de 56–80 % y B de 66–87 %. Se solapan bastante, así que la evidencia es débil.
2. **Mira los slices**: B mejora mucho en "respuesta incompleta" (de 50 % a 80 %) y empeora en "fuera de alcance" (de 90 % a 70 %): ahora a veces califica preguntas que no son del temario en vez de redirigir. El promedio escondía una regresión.
3. **Mira la variabilidad del juez**: repites ambas ejecuciones; el juez cambia la nota en 4 casos. Parte de la diferencia es ruido.
4. **Decide con negocio**: el slice "incompleta" es el 40 % del tráfico real y "fuera de alcance" el 5 %. Mejorar el primero vale más, pero la regresión es fácil de arreglar con una instrucción explícita.
5. **Acción**: creas el prompt C (B + regla de fuera de alcance), amplías el dataset a 120 casos priorizando los slices con más tráfico, registras los tres runs y vuelves a comparar.

Fíjate en que ninguna decisión salió de un solo número. El pipeline te dio cuatro señales (tamaño, slices, ruido, negocio) y la combinación decidió.

### 9. Errores comunes

- Medir solo el resultado final y no saber qué componente falla.
- No definir qué está fuera de alcance.
- Rúbricas sin ejemplos, que cada persona (o juez) interpreta distinto.
- Reportar solo el promedio global (Simpson, sesgos ocultos).
- Declarar ganador un prompt por 2 puntos con 50 ejemplos.
- Cambiar el juez o el dataset entre ejecuciones sin registrarlo.
- Optimizar métricas de engagement que no reflejan valor para el usuario.

## Conceptos clave

- **Evaluation pipeline**: conjunto reproducible de datos, métodos, criterios y registro con el que mides tu sistema.
- **Evaluación por componente**: medir cada salida intermedia para localizar fallos.
- **Turn-based vs task-based**: calidad de cada respuesta frente a si se completó el objetivo y en cuántos turnos.
- **Evaluation guideline**: documento con criterios, alcance y rúbricas con ejemplos.
- **Usefulness threshold**: puntuación mínima para que la aplicación sea útil.
- **Slicing**: medir el rendimiento por subconjuntos de datos.
- **Simpson's paradox**: un modelo gana en cada subgrupo pero pierde en el total por diferencias de tamaño entre grupos.
- **Bootstrap**: re-muestrear con reemplazo para estimar la variabilidad de una métrica.
- **Experiment tracking**: registrar todas las variables de cada ejecución para comparar resultados de forma válida.

## Preguntas de repaso

1. ¿Por qué hay que evaluar cada componente además del resultado final? Usa el ejemplo del CV.
   R: Porque si el resultado final falla no sabes qué paso causó el error. En el extractor de empleador, el fallo puede venir de la conversión PDF a texto o de la extracción; midiendo el texto extraído contra el real y la extracción a partir de texto correcto, localizas el problema.
2. ¿Qué diferencia hay entre evaluación por turno y por tarea y cuál importa más?
   R: Por turno mide la calidad de cada respuesta; por tarea mide si el usuario logró su objetivo y en cuántos turnos. Importa más la de tarea porque refleja el valor real, aunque es más difícil delimitar las tareas en una conversación.
3. ¿Qué elementos debe incluir una buena guía de evaluación?
   R: Lo que la aplicación debe y no debe hacer (incluido qué está fuera de alcance), los criterios de "bueno", una escala y rúbrica con ejemplos por nivel validada con personas, y la relación entre las métricas y las métricas de negocio, con un umbral de utilidad.
4. Explica la paradoja de Simpson con el ejemplo de la tabla.
   R: El modelo A acierta más que B tanto en el grupo 1 como en el grupo 2, pero B tiene mejor exactitud total porque la mayoría de sus casos están en el grupo 1, que es más fácil. Por eso hay que mirar métricas por segmento y no solo el promedio global.
5. ¿Para qué sirve el bootstrap en evaluación y qué señal indica que tu conjunto es demasiado pequeño?
   R: Para estimar cuánto variaría la métrica si evaluaras con otro conjunto del mismo tamaño, re-muestreando con reemplazo. Si los resultados de distintos bootstraps varían mucho (por ejemplo, de 70 % a 90 %), el conjunto es demasiado pequeño para confiar en él.
6. Quieres demostrar que un prompt nuevo mejora un 3 %. ¿Cuántos ejemplos necesitas aproximadamente y por qué?
   R: Alrededor de mil. Según la regla aproximada, detectar 10 % requiere unos 100 ejemplos y cada vez que la diferencia se divide por tres se necesitan unas diez veces más ejemplos.
7. ¿Qué debes registrar en cada ejecución de evaluación?
   R: La versión del dataset, el prompt y el modelo del sistema, los parámetros de sampling, el modelo, prompt y temperatura del juez, las métricas globales y por segmento, y el costo y la latencia, para atribuir los cambios de métricas a cambios concretos.

## Ejercicio

Escribe la guía de evaluación del tutor en `eval-guideline.md`: alcance (qué hace y qué no), tres criterios con rúbrica de 1–5 y un ejemplo por nivel, el mapa métrica → impacto y el umbral de utilidad. Después crea `evalset.jsonl` con 30 casos repartidos en al menos 4 slices (respuesta correcta, incompleta, incorrecta, con faltas de ortografía, fuera de alcance), cada uno con `expected_score`. Implementa `bootstrap` y aplícalo a un vector simulado de 30 resultados con 70 % de aciertos. Terminado cuando la guía tiene todas las partes, el JSONL tiene 30 líneas válidas y anotaste el intervalo del 95 % que da el bootstrap.

## Explícalo con tus palabras

Explica a un compañero por qué "mejoró del 78 % al 81 % con 40 ejemplos" no demuestra nada y qué harías para poder afirmarlo.
