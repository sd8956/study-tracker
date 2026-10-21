---
title: Dataset engineering — calidad, cobertura, cantidad, datos sintéticos y procesamiento
kind: lesson
hours: 2
sources: AI Engineering (Chip Huyen), cap. 8, Data Curation, Data Augmentation and Synthesis, Model Distillation y Data Processing (pp. 694–772)
links: Hugging Face Datasets | https://huggingface.co/datasets
---

## Objetivo

Saber curar datos para adaptar modelos: los formatos según el tipo de entrenamiento, los criterios de calidad, cobertura y cantidad, cómo adquirir y anotar datos, cuándo y cómo sintetizarlos con IA (y sus límites: imitación superficial, model collapse, linaje oscuro), qué es la destilación y los pasos de procesamiento (inspección, deduplicación, limpieza y formato).

## Estudio

### 1. Por qué los datos importan tanto

No todos los problemas de un modelo se arreglan con datos, pero los datos suelen ser parte clave de la solución: los datos correctos hacen al modelo más capaz, más seguro y mejor con contextos largos; los malos aumentan sesgos y alucinaciones y desperdician cómputo. Hay toda una corriente "centrada en datos" con competencias donde el modelo y el script de entrenamiento son fijos y gana **el mejor dataset**. En la práctica, el progreso real viene de mejorar modelo y datos a la vez. Y aunque tú no entrenes modelos grandes, lo que aprendes aquí sirve para tus **datasets de evaluación**, de **few-shot** y de **finetuning ligero**.

### 2. Qué datos necesitas según lo que quieras enseñar

| Objetivo | Formato |
| --- | --- |
| Finetuning auto-supervisado (continued pre-training) | Secuencias de texto del dominio |
| SFT (instrucciones) | (instrucción, respuesta) |
| Preference finetuning | (instrucción, respuesta ganadora, respuesta perdedora) |
| Reward model | Lo anterior, o ((instrucción, respuesta), puntuación) |

Los datos deben **mostrar el comportamiento que quieres** que aprenda. Dos comportamientos especialmente caros de anotar:

- **Chain-of-thought**: si quieres que razone paso a paso, los ejemplos deben tener respuestas paso a paso. Incluirlas mejora mucho el rendimiento en tareas de razonamiento, pero escribir una solución explicada cuesta mucho más que escribir solo el resultado ("la cafetería tenía 23 manzanas, usó 20, quedan 3, compró 6, tiene 9" vs "9").
- **Uso de herramientas**: se suelen usar expertos para crear tareas y las acciones necesarias, pero hay que **observar** cómo trabajan (al explicarlo omiten pasos). Además, lo eficiente para un humano (abrir el navegador, hacer clic) no lo es para un modelo (llamar a una API y procesar todos los resultados a la vez); por eso se recurre a simulaciones y datos sintéticos. Y requiere formatos especiales: un turno del modelo puede contener varios mensajes con destinos distintos (al intérprete de código y al usuario).

Otras decisiones: **un turno vs multiturno** (multiturno enseña a aclarar intención y a incorporar correcciones; es más difícil de conseguir) y **quitar datos**, no solo añadir: si el bot se volvió pedante (corrige el estilo cuando solo le pediste verificar un hecho) y descubres ejemplos así en los datos, los eliminas y añades ejemplos de verificar sin reescribir.

### 3. Los tres criterios: calidad, cobertura y cantidad

Metáfora de cocina: la **calidad** son ingredientes frescos; la **cobertura**, la mezcla correcta de ingredientes; la **cantidad**, cuánto de cada uno.

#### Calidad

Poca data de alta calidad le gana a mucha data ruidosa. Equipos de modelos conocidos reportan que unas 10 000 instrucciones cuidadas superaron a cientos de miles ruidosas, y un experimento mostró que un modelo grande ajustado con solo 1 000 ejemplos muy curados producía respuestas comparables o preferidas a las de un modelo líder en una buena parte de los casos (aunque menos robusto que un producto real). También se observó que los datos humanos tienen errores e inconsistencias, especialmente en políticas de seguridad matizadas, y se desarrollaron herramientas de anotación asistida por IA.

Seis características de datos de calidad:

| Característica | Significado | Ejemplo de fallo |
| --- | --- | --- |
| **Relevantes** | Sirven para la tarea | Leyes del siglo XIX para preguntas legales actuales |
| **Alineados con la tarea** | Las anotaciones cumplen lo que la tarea exige (fácticas si debe ser fáctico, concisas si debe ser conciso, con justificación si se pide) | Respuestas largas cuando el producto pide brevedad |
| **Consistentes** | Mismo criterio entre ejemplos y anotadores | Dos ensayos de calidad muy distinta con la misma nota |
| **Bien formateados** | Siguen el formato esperado, sin tokens basura | Restos de HTML, espacios finales, formatos numéricos mezclados |
| **Suficientemente únicos** | Sin duplicados que sesguen o contaminen | El mismo ejemplo repetido 50 veces |
| **Conformes** | Cumplen políticas y leyes | Datos personales que no puedes usar |

La herramienta clave para alineación y consistencia es, otra vez, una **guía de anotación** clara (la misma de evaluación de la sesión 7).

#### Cobertura (diversidad)

Los datos deben cubrir el rango de problemas y de formas de expresarlos: instrucciones largas y cortas, con y sin faltas de ortografía, los lenguajes de programación de tus usuarios. Cada aplicación tiene sus ejes de diversidad: un traductor francés–inglés no necesita diversidad de idiomas pero sí de temas, longitudes y estilos; un bot de compras global necesita diversidad lingüística y cultural.

Se ha observado que modelos con arquitecturas casi iguales a sus versiones anteriores mejoraron "principalmente por calidad y diversidad de datos". La mezcla óptima cambia por fase: en el pre-training y SFT de una familia de modelos, matemáticas, razonamiento y código sumaban casi la mitad de los datos (mucho más que su peso en internet), porque ese tipo de datos mejora el razonamiento; en preference finetuning su peso bajó, para reflejar lo que los usuarios realmente piden. ¿Cómo decidir la mezcla? Reflejar el uso real o experimentar con modelos pequeños y extrapolar. Un experimento con 2 000 ejemplos en tres variantes (alta calidad sin diversidad, diversa de baja calidad, diversa y de alta calidad) mostró que gana la tercera. Ojo: añadir datos heterogéneos no siempre ayuda.

#### Cantidad

"¿Cuántos datos necesito?" es como "¿cuánto dinero necesito?". Desde experimentos donde un LLM aprende de un solo ejemplo hasta ajustes con millones. Factores:

- **Técnica**: full finetuning necesita órdenes de magnitud más que PEFT. Con cientos o pocos miles de ejemplos, PEFT; con decenas de miles o millones, quizá full finetuning.
- **Complejidad de la tarea**: clasificar sentimiento necesita mucho menos que responder sobre informes financieros.
- **Modelo base**: cuanto más cerca esté de lo que quieres, menos datos. Con pocos ejemplos (≈100), los modelos más avanzados rinden mucho mejor tras el ajuste; con muchísimos (cientos de miles), todos convergen. Regla: **pocos datos → PEFT sobre un modelo fuerte; muchos datos → full finetuning sobre uno más pequeño**.

Consejo práctico: empieza con **~50 ejemplos muy bien hechos**. Si mejora, más datos probablemente mejorarán más; si no mejora nada, rara vez lo arreglará un dataset mayor (aunque revisa antes hiperparámetros, calidad y prompts: en la gran mayoría de casos, 50–100 ejemplos ya muestran mejora). Para estimar cuánto más necesitas, ajusta con el 25 %, 50 % y 100 % y grafica: pendiente fuerte = vale la pena duplicar; meseta = no. Los rendimientos suelen ser decrecientes (los primeros 1 000 ejemplos aportan diez puntos; los siguientes 1 000, cinco). La diversidad también escala: aumentar el número de **tareas distintas** mejoró mucho hasta cientos de tareas y luego se estabilizó.

Trucos para necesitar menos datos de alta calidad: primero auto-supervisado con documentos del dominio y luego supervisado; primero datos parecidos (sentimiento de tweets) y luego los tuyos (reseñas de producto); primero sintéticos y luego reales.

Y no olvides el presupuesto: con 10 000 dólares y 2 dólares por ejemplo anotado, el máximo son 5 000 ejemplos, y lo que gastas en datos no lo gastas en cómputo.

### 4. Adquisición y anotación

La fuente más valiosa suele ser **tu propia aplicación**: datos perfectamente relevantes y con la distribución real. Si logras un **data flywheel** (los usuarios generan datos y feedback que mejoran el producto, que atrae más usuarios), tienes una ventaja enorme (sesión 18).

Antes de crear datos, busca datasets existentes (repositorios de datasets, buscadores de datasets, datos abiertos de gobiernos, harness de evaluación con miles de ejemplos). Pero **nunca confíes del todo**: inspecciona, valida y revisa la **licencia** y el origen (un dataset con licencia comercial puede contener partes de fuentes que no la tienen).

Un proceso realista mezcla fuentes: partes de un dataset público de 10 000 ejemplos, eliminas instrucciones malas (quedan 9 000), separas respuestas malas (3 000), reescribes esas respuestas a mano, detectas un tema poco cubierto, creas plantillas, generas instrucciones sintéticas para ese tema y las anotas. Y por el camino actualizas la guía, re-anotas y verificas hechos varias veces.

La parte más difícil suele ser la **guía de anotación**: qué es una buena respuesta, si puede ser correcta pero poco útil, qué diferencia un 3 de un 4. Muchos abandonan la anotación cuidadosa a mitad de camino esperando que el modelo "lo descubra solo"; es arriesgado.

### 5. Aumento y síntesis de datos

- **Aumento**: crear datos nuevos a partir de reales (voltear la imagen de un gato).
- **Síntesis**: generar datos que imitan propiedades de los reales (simular cómo se mueve un ratón en una web para generar datos de bots).

#### Por qué sintetizar

Para aumentar cantidad, cobertura (casos raros, adversariales, idiomas con pocos recursos) y calidad (a veces la IA es más consistente que los humanos en ciertas tareas), para proteger la privacidad (datos sintéticos en lugar de historiales médicos reales) y para **destilar** modelos.

#### Técnicas tradicionales (breve)

Basadas en reglas y plantillas (generar transacciones o facturas con campos aleatorios), perturbaciones (sinónimos, ruido) y **simulación** (vehículos autónomos, robótica, agentes).

#### Síntesis con IA

- **Simular** APIs (sin llamarlas), humanos (un modelo hace de cliente con un problema y otro de agente de soporte) o partidas contra sí mismo (*self-play*).
- **Parafrasear**: "¿Cómo restablezco mi contraseña?" → "Olvidé mi contraseña", "¿Cómo cambio la contraseña?", "Pasos para recuperar el acceso". Reescribir problemas de matemáticas de varias formas multiplicó un dataset y dio modelos mejores que otros más grandes.
- **Traducir** a idiomas con pocos recursos, verificando con **back-translation** (traducir de vuelta y comparar con el original).
- **Datos de instrucciones**: generar instrucciones a partir de una lista de temas o plantillas (y la lista también puede generarla la IA), y respuestas para cada una. Un ejemplo famoso partió de 175 ejemplos semilla y generó 52 000 pares parecidos. Variante ingeniosa: **reverse instruction**, tomar contenido largo de alta calidad escrito por humanos (artículos, historias) y pedirle a la IA la instrucción que lo habría producido; así se evita que la IA alucine en respuestas largas.

```ts
// generar instrucciones sintéticas diversas a partir de temas y tipos, con deduplicación simple
const topics = ["facturación", "contraseñas", "envíos", "devoluciones"];
const styles = ["muy corta y con faltas de ortografía", "detallada y educada", "enfadada", "ambigua"];

export async function synthInstructions(perCombo = 3) {
  const out = new Set<string>();
  for (const topic of topics) for (const style of styles) {
    const raw = await chat([
      { role: "system", content: "Generas mensajes realistas de clientes. Devuelve un mensaje por línea, sin numerar." },
      { role: "user", content: `Escribe ${perCombo} mensajes distintos sobre ${topic}, redactados de forma ${style}.` },
    ], 1.0); // temperature alta para diversidad
    for (const line of raw.split("\n").map((l) => l.trim()).filter((l) => l.length > 5)) {
      out.add(line.toLowerCase().replace(/\s+/g, " ")); // dedup exacta tras normalizar
    }
  }
  return [...out];
}
```

#### Verificar los datos sintéticos

Se evalúan como cualquier salida de IA: **functional correctness** cuando se puede (por eso tanto dato sintético es de código: se puede ejecutar y verificar), **jueces de IA** (puntuar 1–5, buenos/malos, cumplir requisitos, consistencia factual), detectores (si un clasificador distingue fácilmente lo sintético de lo real, lo sintético no es bueno), filtros por tema, detección de anomalías y **heurísticas**: eliminar ejemplos vacíos, demasiado cortos o largos, repetitivos, con la misma instrucción y respuestas distintas, o donde la salida repite la entrada. La prueba final: **¿mejora el modelo entrenado con ellos?**

#### Límites de los datos generados por IA

1. **Control de calidad**: basura entra, basura sale.
2. **Imitación superficial**: el alumno copia el **estilo** del maestro pero no necesariamente su exactitud ni su capacidad de generalizar. Peor: entrenar con soluciones a problemas que el alumno no sabe resolver le enseña a producir cosas que **parecen** soluciones, es decir, a alucinar.
3. **Model collapse**: entrenar recursivamente con datos generados puede degradar los modelos, porque lo probable se sobrerrepresenta y lo raro (casos poco frecuentes pero importantes) se olvida. Mezclar con datos reales parece evitarlo, sin una proporción definitiva conocida. También puede **amplificar sesgos**. Hay casos de éxito con muchísimos datos sintéticos, pero en una sola iteración.
4. **Linaje oscuro**: si el modelo generador se entrenó con datos con copyright o con tu benchmark, heredas el riesgo legal y la contaminación sin saberlo.

### 6. Destilación

La **destilación** entrena un modelo pequeño (**alumno**) para imitar a uno grande (**maestro**). Objetivo clásico: desplegar algo más pequeño y rápido con rendimiento parecido (un caso conocido redujo el tamaño un 40 %, conservó el 97 % de la capacidad y fue un 60 % más rápido). El alumno puede entrenarse desde cero o ajustarse desde un modelo pre-entrenado con datos generados por el maestro. **Revisa la licencia**: muchos modelos prohíben usar sus salidas para entrenar otros modelos (sesión 6).

### 7. Procesamiento de datos

Consejos generales: ordena los pasos para ahorrar tiempo (si deduplicar es más barato que limpiar, deduplica primero), haz **pruebas en una muestra** antes de procesar todo y **no modifiques los datos originales**: guarda una copia (otros pueden necesitarlos distinto y un bug puede corromperlos).

#### Inspeccionar

Origen, procesamiento previo, usos anteriores. Distribuciones de longitudes de entrada y respuesta, tokens frecuentes, temas, idiomas, por fuente, por fecha y por anotador. ¿Algún anotador da respuestas mucho más cortas o notas más altas? Si hay varias anotaciones por ejemplo, mide el desacuerdo y resuelve conflictos. Anota tú unos ejemplos y compara. Y sobre todo: **mira los datos a mano**. Quince minutos mirando ejemplos suelen ahorrar horas; se ha dicho que la inspección manual de datos tiene la mejor relación valor/prestigio de todo el ML.

#### Deduplicar

Los duplicados sesgan la distribución (si "lápiz rojo → 20 dólares" aparece tres veces, el modelo puede concluir que lo rojo es caro) y contaminan el test (un ejemplo en entrenamiento y su gemelo en evaluación). Se mostró que repetir el 0.1 % de los datos cien veces degradó un modelo hasta el rendimiento de uno de la mitad de tamaño. Tipos: documentos enteros, párrafos repetidos dentro de un documento, citas repetidas entre documentos. Decide el nivel (documento, párrafo, oración) y el umbral (¿exacto?, ¿80 % de solapamiento?). Métodos: comparación por pares (exacta, n-gramas, fuzzy, semántica; cara con datasets grandes), **hashing** (agrupar por hash, incluido MinHash para casi-duplicados) y reducción de dimensionalidad antes de comparar.

```ts
// deduplicación en dos niveles: exacta (hash) y casi-duplicados (Jaccard de shingles)
import { createHash } from "node:crypto";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const shingles = (s: string, n = 3) => {
  const w = norm(s).split(" ");
  return new Set(w.slice(0, Math.max(w.length - n + 1, 1)).map((_, i) => w.slice(i, i + n).join(" ")));
};
const jaccard = (a: Set<string>, b: Set<string>) => {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
};

export function dedup(texts: string[], threshold = 0.8) {
  const seen = new Set<string>();
  const kept: { text: string; sh: Set<string> }[] = [];
  for (const t of texts) {
    const h = createHash("sha256").update(norm(t)).digest("hex");
    if (seen.has(h)) continue;                                        // duplicado exacto
    seen.add(h);
    const sh = shingles(t);
    if (kept.some((k) => jaccard(k.sh, sh) >= threshold)) continue;   // casi-duplicado (O(n²): solo datasets pequeños)
    kept.push({ text: t, sh });
  }
  return kept.map((k) => k.text);
}
```

#### Limpiar y filtrar

Quitar tokens de formato innecesarios (HTML, markdown roto), datos que violan políticas (datos personales, contenido tóxico, material con copyright), ejemplos de baja calidad (con las técnicas de verificación anteriores) y, si el presupuesto obliga a quedarte con una parte, priorizar con **active learning** (los ejemplos de los que el modelo más aprendería) o **importance sampling**.

#### Formatear

Ajusta al formato y la **plantilla de chat** del modelo y del framework de finetuning. Para SFT, los ejemplos deben parecerse a como usarás el modelo: si ajustas con prompts largos con instrucciones y ejemplos, puedes pasar a prompts cortos solo con la entrada, porque el comportamiento quedó en los pesos; pero en inferencia debes usar **exactamente el formato del entrenamiento** (un separador o un salto de línea distinto puede degradar los resultados).

### 8. Errores comunes

- Creer que más datos siempre es mejor (calidad y diversidad pesan más).
- No tener guía de anotación o abandonarla a medias.
- Entrenar con datos sintéticos sin verificarlos.
- No deduplicar entre entrenamiento y evaluación.
- Ignorar licencias y linaje de datasets y de modelos generadores.
- No mirar los datos a mano.

## Conceptos clave

- **Data curation**: seleccionar, crear y eliminar datos para enseñar el comportamiento deseado.
- **Calidad de datos**: relevantes, alineados con la tarea, consistentes, bien formateados, únicos y conformes.
- **Cobertura (diversidad)**: los datos representan la variedad de problemas y formas de expresarlos.
- **Data flywheel**: ciclo en el que el uso del producto genera datos que lo mejoran.
- **Data augmentation vs synthesis**: derivar datos de reales frente a generar datos que imitan a los reales.
- **Reverse instruction**: generar la instrucción que produciría un contenido humano de calidad ya existente.
- **Back-translation**: traducir de vuelta para verificar la calidad de una traducción.
- **Model collapse**: degradación por entrenar recursivamente con datos generados, que olvida lo raro.
- **Distillation**: entrenar un modelo alumno pequeño para imitar a un maestro grande.
- **Deduplicación**: eliminar duplicados exactos y casi-duplicados para evitar sesgos y contaminación.

## Preguntas de repaso

1. Nombra las seis características de datos de calidad y da un ejemplo de fallo de dos de ellas.
   R: Relevantes, alineados con la tarea, consistentes, bien formateados, suficientemente únicos y conformes. Ejemplos: inconsistencia cuando dos anotadores dan notas muy distintas a respuestas similares; mal formato cuando quedan etiquetas HTML de un scraping.
2. ¿Por qué conviene empezar con unos 50 ejemplos antes de invertir en un dataset grande?
   R: Porque permite comprobar barato si el finetuning mejora el modelo: si mejora, más datos probablemente mejorarán más; si no mejora nada, un dataset mayor rara vez lo arregla, aunque antes hay que descartar problemas de hiperparámetros, calidad o prompts.
3. ¿Qué regla relaciona cantidad de datos, técnica de finetuning y modelo base?
   R: Con pocos datos conviene PEFT sobre un modelo base fuerte, que ya está cerca del comportamiento deseado; con muchos datos se puede hacer full finetuning sobre un modelo más pequeño, ya que con suficientes ejemplos los modelos tienden a converger.
4. ¿En qué consiste la imitación superficial y por qué puede inducir alucinaciones?
   R: El alumno aprende el estilo de las respuestas del maestro sin adquirir su capacidad; si se entrena con soluciones a problemas que no sabe resolver, aprende a producir textos con apariencia de solución, es decir, respuestas seguras pero inventadas.
5. ¿Qué es el model collapse y cómo se mitiga?
   R: Es la degradación progresiva al entrenar repetidamente con datos generados por modelos: lo probable se sobrerrepresenta y los casos raros se olvidan. Se mitiga mezclando datos sintéticos con datos reales y verificando la calidad de lo generado.
6. ¿Por qué los duplicados son peligrosos en entrenamiento y evaluación?
   R: Sesgan la distribución, haciendo que el modelo sobrevalore patrones repetidos, desperdician cómputo y, si un ejemplo aparece en entrenamiento y su duplicado en evaluación, contaminan la medición e inflan las métricas.
7. ¿Qué es reverse instruction y qué problema evita?
   R: Tomar contenido largo y de calidad escrito por humanos y pedir a un modelo que genere la instrucción que lo habría producido. Evita que el modelo tenga que generar respuestas largas, donde es más propenso a alucinar.

## Ejercicio

Construye un mini dataset de SFT para el clasificador de tickets de la sesión 15. (1) Genera instrucciones sintéticas con `synthInstructions` (4 temas × 4 estilos × 3). (2) Deduplica con `dedup` y anota cuántos casos eliminó cada nivel. (3) Etiqueta tú 40 casos (categoría) siguiendo una guía de anotación de media página que escribas antes. (4) Pide a un juez que etiquete los mismos 40 y mide el acuerdo; revisa los desacuerdos y corrige la guía. (5) Inspecciona distribuciones: longitud, categoría y estilo. (6) Exporta 30 ejemplos de entrenamiento y 10 de validación en JSONL de conversación, sin solapamiento. Terminado cuando tienes la guía, el reporte de deduplicación, el porcentaje de acuerdo humano–juez, la tabla de distribuciones y los dos archivos JSONL válidos.

## Explícalo con tus palabras

Explica a un compañero por qué 1 000 ejemplos cuidados pueden valer más que 100 000 descargados de internet, y qué riesgos tiene llenar el hueco con datos generados por IA.
