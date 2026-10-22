---
title: Arquitectura de una aplicación de IA y feedback de usuarios
kind: lesson
hours: 2
sources: AI Engineering (Chip Huyen), cap. 10, AI Engineering Architecture y User Feedback (pp. 852–929)
links: OpenTelemetry | https://opentelemetry.io
---

## Objetivo

Conocer la arquitectura progresiva de una aplicación de IA en producción (contexto, guardrails, router y gateway, caché, patrones de agente), cómo observarla (métricas, logs, trazas, detección de drift) y orquestarla, y cómo diseñar, extraer e interpretar el feedback de usuarios evitando sus sesgos y los bucles de feedback degenerados.

## Estudio

### 1. Empieza simple y añade piezas cuando duelan

La arquitectura mínima es: la aplicación recibe la consulta, la manda al modelo (API o modelo propio) y devuelve la respuesta. Sin contexto, sin guardrails, sin optimizaciones. A partir de ahí se añaden componentes **según necesidad**, típicamente en este orden:

```
1. Mejorar el contexto (RAG, herramientas)
2. Guardrails de entrada y salida
3. Router y gateway de modelos
4. Caché (latencia y costo)
5. Patrones de agente y acciones de escritura
+ Observabilidad y orquestación, diseñadas desde el principio
```

```
usuario ─► [guardrail entrada] ─► [router] ─► [retrieval / herramientas] ─► [gateway ─► modelo(s)]
   ▲                                                                              │
   │            [caché] ◄──────────────────────────────────────────────────────────┤
   └──────────── [guardrail salida / scorer] ◄──────────────────────────────────────┘
                         todo emite métricas, logs y trazas ─► observabilidad
```

Cada pieza resuelve un problema y añade otro (latencia, costo, puntos de fallo). No las pongas porque "se usan"; ponlas cuando tu evaluación o tu monitoreo muestren que hacen falta.

### 2. Paso 1: mejorar el contexto

Es la primera ampliación casi siempre: dar al modelo la información para cada consulta (RAG de texto, imágenes o tablas; herramientas como búsqueda web, noticias o calendario). Es el feature engineering de los foundation models (sesión 11; los agentes, en los módulos 14 y 15). Los proveedores ofrecen subida de archivos y herramientas, pero con límites (cuántos documentos, qué tipos, qué algoritmo de retrieval, tamaño de chunk, si las herramientas se ejecutan en paralelo). Una solución propia te da control a cambio de trabajo.

### 3. Paso 2: guardrails

Los guardrails mitigan riesgos para ti y tus usuarios. Van donde haya exposición.

#### De entrada

Protegen de dos riesgos: **filtrar información privada** a APIs externas y **ejecutar prompts maliciosos** (sesión 10). La fuga puede venir de un empleado que pega un secreto en un prompt, de un desarrollador que mete políticas internas en el system prompt o de una herramienta que recupera datos privados y los añade al contexto. Hay herramientas que detectan datos sensibles (identificadores, teléfonos, cuentas bancarias, caras, términos internos). Ante un hallazgo: bloquear la consulta o **enmascarar** el dato con un marcador y restaurarlo después con un diccionario inverso.

```ts
// enmascarado reversible de datos sensibles antes de llamar a una API externa
export function maskPII(text: string) {
  const map = new Map<string, string>();
  let i = 0;
  const masked = text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, (m) => { const k = `[EMAIL_${i++}]`; map.set(k, m); return k; })
    .replace(/\+?\d[\d\s-]{7,}\d/g, (m) => { const k = `[PHONE_${i++}]`; map.set(k, m); return k; });
  const unmask = (s: string) => [...map].reduce((acc, [k, v]) => acc.replaceAll(k, v), s);
  return { masked, unmask };
}

// const { masked, unmask } = maskPII(userMessage);
// const reply = unmask(await chat([...system, { role: "user", content: masked }]));
```

#### De salida

Dos funciones: **detectar fallos** y **definir la política** para cada tipo de fallo.

| Tipo | Fallos |
| --- | --- |
| Calidad | Formato inválido, alucinación, respuesta simplemente mala, respuesta vacía |
| Seguridad | Toxicidad, datos privados, ejecución de herramientas no autorizada, riesgo de marca (hablar mal de tu empresa o de la competencia) |

Políticas típicas:

- **Reintentar** (el modelo es probabilístico): si la respuesta está vacía o mal formateada, otra vez. Duplica latencia si reintentas tras fallar; alternativa: lanzar dos en paralelo y quedarte con la mejor (más costo, misma latencia).
- **Derivar a un humano**: por frases concretas, por un clasificador de sentimiento que detecta enfado, o tras demasiados turnos para que el usuario no quede atrapado en un bucle.
- Recuerda medir también la **tasa de falsos rechazos**: un sistema demasiado restrictivo frustra.

Compromisos: los guardrails añaden **latencia** (algunos equipos los sacrifican por velocidad) y encajan mal con **streaming** (cuesta evaluar respuestas parciales). Con APIs, el proveedor trae muchos guardrails de serie; si alojas tú el modelo, necesitas menos guardrails de entrada (no envías datos fuera) pero más de los demás. Existen soluciones listas para usar (filtros de contenido, moderación, frameworks de guardrails).

### 4. Paso 3: router y gateway

#### Router

En vez de un modelo para todo, rutas distintas para consultas distintas: modelos especializados (soporte técnico vs facturación) y **ahorro** (consultas simples a modelos baratos). Suele ser un **clasificador de intención**:

- Restablecer contraseña → enlace a la página de ayuda (sin llamar a un LLM).
- Error de facturación → humano.
- Problema técnico → bot especializado.
- Fuera de alcance ("¿por quién votarías?") → respuesta fija y amable, sin gastar una llamada.
- Ambiguo ("Congelado") → pedir aclaración ("¿Quieres congelar tu cuenta o hablas del clima?").

Otros routers deciden la **siguiente acción** de un agente o de qué memoria tirar (el documento adjunto o una búsqueda web). Deben ser **rápidos y baratos**: modelos pequeños o clasificadores. Si usas varios modelos con ventanas de contexto distintas, el router también debe ajustar el contexto al modelo elegido. El patrón **router → retrieval → generación → scoring** es muy común.

#### Gateway

Capa intermedia que unifica el acceso a todos los modelos (propios y de terceros):

- **Interfaz única**: si cambia la API de un proveedor, actualizas el gateway y no todas las apps.
- **Control de acceso y costos**: nadie necesita la clave del proveedor; se da acceso al gateway con permisos por usuario o app, límites de uso y presupuesto.
- **Fallbacks**: si el proveedor principal falla o te limita, reintentar o pasar a otro modelo.
- Lugar natural para **balanceo de carga, logging, analítica, caché y guardrails**.

```ts
// gateway mínimo con fallback y registro de uso
type Provider = { name: string; baseUrl: string; model: string; keyEnv: string };
const PROVIDERS: Provider[] = [
  { name: "nan", baseUrl: "https://api.nan.builders/v1", model: "deepseek-v4-flash", keyEnv: "NAN_API_KEY" },
  // { name: "backup", baseUrl: "...", model: "...", keyEnv: "BACKUP_API_KEY" },
];

export async function gatewayChat(messages: Msg[], app: string) {
  for (const p of PROVIDERS) {
    const t0 = performance.now();
    try {
      const res = await fetch(`${p.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env[p.keyEnv]}` },
        body: JSON.stringify({ model: p.model, messages, temperature: 0.3 }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log(JSON.stringify({ app, provider: p.name, ms: Math.round(performance.now() - t0), usage: data.usage }));
      return data.choices[0].message.content as string;
    } catch (err) {
      console.warn(JSON.stringify({ app, provider: p.name, error: String(err) })); // y prueba el siguiente
    }
  }
  throw new Error("Todos los proveedores fallaron");
}
```

### 5. Paso 4: caché

Además de las cachés que gestiona el proveedor (KV cache y prompt cache, sesión 17), en la aplicación puedes añadir:

- **Caché exacta**: si la misma consulta (o el mismo paso intermedio: un embedding, un resultado de búsqueda) ya se procesó, devuelves lo guardado. En memoria para velocidad o en una base de datos para capacidad, con política de expulsión (LRU, LFU, FIFO). No cachees consultas **específicas del usuario** ("¿dónde está mi pedido?") ni **dependientes del tiempo** ("¿qué tiempo hace?"); hay equipos que entrenan un clasificador para decidir qué cachear.
- **Caché semántica**: reutiliza la respuesta si la consulta es **parecida** (embedding + búsqueda + umbral). Sube la tasa de aciertos pero es más frágil: depende de embeddings, búsqueda y un umbral difícil de fijar, y si confunde dos consultas devuelve una respuesta incorrecta. Además la búsqueda cuesta. Solo compensa con una tasa de aciertos alta; evalúala antes.

**Advertencia de privacidad**: una pregunta que parece genérica ("¿cuál es la política de devoluciones de electrónica?") puede responderse con datos de un usuario concreto (su tipo de membresía). Si la cacheas como genérica, el siguiente usuario verá datos ajenos. La clave de caché debe incluir todo lo que hace la respuesta específica (usuario, permisos, versión del prompt y del modelo).

```ts
import { createHash } from "node:crypto";
const cache = new Map<string, { value: string; expires: number }>();

export async function cachedChat(messages: Msg[], opts: { userScope?: string; ttlMs?: number; promptVersion: string }) {
  const key = createHash("sha256")
    .update(JSON.stringify({ messages, scope: opts.userScope ?? "public", v: opts.promptVersion }))
    .digest("hex");
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await gatewayChat(messages, "tutor");
  cache.set(key, { value, expires: Date.now() + (opts.ttlMs ?? 3_600_000) });
  return value;
}
```

### 6. Paso 5: patrones de agente

Flujos con bucles, paralelismo y condiciones (workflows agénticos, módulo 15): tras generar, el sistema decide que le falta información, recupera más y vuelve a generar. Y **acciones de escritura** (redactar y enviar correos, hacer pedidos, transferencias), que aumentan mucho la capacidad y el riesgo: añádelas con el máximo cuidado (aprobación humana, mínimo privilegio).

Cuanto más compleja la arquitectura, más modos de fallo y más difícil depurar. De ahí lo siguiente.

### 7. Monitoreo y observabilidad

La observabilidad debe ser parte del diseño, no un añadido. Su objetivo coincide con el de la evaluación: **mitigar riesgos** (fallos, ataques, drift) y **descubrir oportunidades** (mejoras, ahorros). Tres métricas para saber si tu observabilidad es buena:

- **MTTD**: tiempo medio hasta detectar un problema.
- **MTTR**: tiempo medio hasta resolverlo.
- **CFR**: porcentaje de cambios o despliegues que causan fallos. Si no conoces tu CFR, tu plataforma no es lo bastante observable.

#### Métricas

Específicas de cada aplicación, pero hay básicos:

- **Formato**: tasa de JSON inválido y cuántos son fácilmente reparables.
- **Calidad**: consistencia factual y otros criterios con jueces (muestreados).
- **Seguridad**: toxicidad, datos sensibles en entrada y salida, cuántas veces saltan los guardrails, tasa de rechazos, consultas anómalas.
- **Señales conversacionales**: cuántas generaciones se interrumpen a medias, turnos por conversación, tokens por entrada y por salida, distribución de tokens de salida en el tiempo.
- **Por componente**: calidad de retrieval, tamaño y latencia de la base vectorial.
- **Latencia**: TTFT, TPOT, total, por usuario y en percentiles.
- **Costo**: consultas, tokens de entrada y salida, peticiones por segundo frente a rate limits.

Calcula todo **desglosable** por usuario, versión de la app, versión del prompt o cadena y tiempo. Y mide qué métricas **correlacionan con tu métrica estrella** de negocio (usuarios activos, duración de sesión, suscripciones): las que correlacionan sugieren qué mejorar; las que no, qué no optimizar. Combina chequeos exhaustivos (formato en el 100 %) y muestreos (juez en el 5 %).

#### Logs y trazas

Las métricas agregan; los **logs** registran eventos para responder "¿qué pasó exactamente?". Registra todo: configuración (modelo, sampling, versión de prompt), consultas, prompts finales, salidas, salidas intermedias, llamadas a herramientas y sus resultados, con etiquetas e IDs que permitan seguir un caso. Una **traza** reconstruye el recorrido completo de una petición (qué se recuperó, qué prompt final se envió, cuánto tardó y costó cada paso) para señalar el paso exacto que falló. Y mira los datos de producción a mano con frecuencia (sesión 16).

```ts
// evento de traza por paso: suficiente para reconstruir una petición
type Span = {
  traceId: string; spanId: string; parentId?: string;
  step: "guardrail_in" | "router" | "retrieve" | "generate" | "judge" | "guardrail_out";
  startedAt: string; ms: number;
  model?: string; promptVersion?: string;
  input?: string; output?: string;           // con datos sensibles enmascarados
  retrievedIds?: string[];
  tokens?: { prompt: number; completion: number }; costUSD?: number;
  error?: string;
};
```

#### Detección de drift

Lo que puede cambiar sin que te enteres:

- **El system prompt**: alguien actualizó una plantilla o corrigió una errata. Basta un hash del prompt registrado en cada traza para detectarlo.
- **El comportamiento de los usuarios**: aprenden a usar tu app (escriben instrucciones para respuestas más cortas, y la longitud media de salida baja poco a poco). Las métricas muestran el cambio; entender la causa requiere investigar.
- **El modelo subyacente**: la API sigue igual pero el modelo cambió. Se han documentado diferencias grandes entre versiones del mismo modelo y caídas de rendimiento al migrar a una versión "nueva". Tu evalset ejecutado periódicamente contra producción lo detecta.

### 8. Orquestación

Un **orquestador** define los componentes (modelos, bases de datos, herramientas, evaluadores) y cómo se **encadenan**, pasando los datos de uno a otro (y validando formatos entre pasos). Recomendación: empieza **sin** orquestador (encadena funciones tú mismo) para entender el sistema; si adoptas uno, evalúa qué componentes soporta, si permite flujos paralelos, condicionales y bucles, si es fácil de depurar, y evita los que hacen **llamadas ocultas** o añaden latencia. Debe escalar con más apps, desarrolladores y tráfico. (Más adelante en tu ruta verás un framework de este tipo; ya sabrás qué hace por dentro.)

### 9. Feedback de usuarios

En aplicaciones de IA el feedback vale más que nunca: evalúa el rendimiento, guía el desarrollo, personaliza y, sobre todo, es **datos propietarios**, la base del **data flywheel** (sesión 16). Pero es **dato de usuario**: respeta la privacidad y explica para qué lo usas.

#### Explícito vs implícito

- **Explícito**: pulgar arriba/abajo, estrellas, "¿resolvimos tu problema?". Fácil de interpretar, pero escaso (requiere esfuerzo) y sesgado (los insatisfechos se quejan más).
- **Implícito**: inferido de acciones. Abundante y ruidoso.

La interfaz conversacional produce feedback implícito en lenguaje natural. Si el asistente propone tres hoteles y respondes "reserva el que está cerca de las galerías", revelas interés por el arte; si respondes "¿no hay nada por debajo de 200?", revelas sensibilidad al precio y que el asistente aún no te entiende.

Señales conversacionales útiles:

| Señal | Posible lectura |
| --- | --- |
| Interrumpir la generación | Respuesta mala o demasiado larga |
| Repetir o aclarar la petición | El sistema no entendió (en un estudio de diálogos, el tipo de feedback más frecuente) |
| Quejas: no responde, irrelevante, incorrecto, poco específico, repetitivo | Fallo concreto a corregir en prompt o retrieval |
| Corregir ("no, es X") o editar la respuesta | Dato muy valioso: la edición es una respuesta mejor (datos de preferencia) |
| Sentimiento negativo creciente | Algo va mal, aunque no diga qué |
| Rechazos del modelo ("no puedo…") | Usuario probablemente insatisfecho |
| Regenerar | Insatisfacción, o ganas de ver alternativas (en creativo es habitual) |
| Borrar la conversación | Señal negativa fuerte (salvo vergüenza) |
| Renombrarla | Conversación útil pero título automático malo |
| Conversación larga | Buena en un compañero conversacional; mala en soporte (ineficiencia) |
| Larga y repetitiva | Usuario atascado en un bucle |

#### Diseño del feedback

**Cuándo pedirlo**: al principio (calibrar preferencias, opcional y sin fricción), cuando algo sale mal (permitir corregir, deshacer, escalar a humano), y cuando el modelo tiene **baja confianza** (por ejemplo, mostrar dos opciones y que elija). No interrumpas constantemente: pedir feedback tiene un costo para el usuario.

**Cómo pedirlo**: integrado en el flujo, fácil de dar y fácil de ignorar. Ejemplos de buen diseño: un generador de imágenes que ofrece cuatro opciones y acciones como "ampliar esta" (señal positiva fuerte), "variaciones de esta" (señal positiva más débil) o "regenerar" (ninguna sirve); un asistente de código que muestra la sugerencia en gris y registra si la aceptas o sigues escribiendo. Las apps de chat independientes lo tienen más difícil: no saben si el correo que redactaste se llegó a enviar.

Más reglas:

- El pulgar solo sirve para estadísticas; para análisis profundo necesitas **contexto** (la conversación), lo que puede requerir **consentimiento** explícito (por ejemplo, "compartir esta conversación con el feedback").
- Explica cómo usarás el feedback: motiva a darlo y a darlo bien.
- **No pidas lo imposible**: no hagas elegir entre dos respuestas a un problema matemático a alguien que preguntó porque no lo sabía; ofrece "no lo sé".
- Evita interfaces ambiguas (hubo formularios donde el emoji enfadado estaba en la posición de cinco estrellas y la gente puntuaba al revés).
- Decide si el feedback es **privado o público**: en privado la gente es más sincera; lo público ayuda a descubrir y explicar recomendaciones.

```ts
// esquema de evento de feedback, ligado a la traza para tener contexto
type FeedbackEvent = {
  traceId: string; userId: string; at: string;
  kind: "thumb" | "edit" | "regenerate" | "stop" | "copy" | "escalate" | "rating";
  value?: number;               // 1/-1 para thumb, 1–5 para rating
  editedText?: string;          // si editó la respuesta: oro para datos de preferencia
  consentToShareContext: boolean;
};
```

#### Limitaciones del feedback

- **Sesgos**: *leniency* (puntuar mejor de lo merecido para evitar fricción, sobre todo si puntuar mal exige explicar; en escalas de cinco estrellas, el cuatro a veces ya significa "algo fue mal"), aleatoriedad (clic sin leer), **sesgo de posición** (la primera opción se elige más; conviene alternar el orden), **preferencia por respuestas largas** y otros propios de cada app.
- **Bucles de feedback degenerados**: las predicciones influyen en el feedback, que entrena las siguientes predicciones y amplifica sesgos. Si un tipo de contenido recibe algo más de "me gusta", se muestra más, recibe más "me gusta" y termina dominando. Un modelo entrenado a complacer puede volverse **adulador** (decir lo que el usuario quiere oír en lugar de lo correcto). Mitiga con diversidad, exploración y evaluación independiente del feedback.

Conclusión: el feedback es una señal valiosa y sesgada. Combínalo con tu pipeline de evaluación (sesiones 4–7) antes de usarlo para entrenar.

### 10. Errores comunes

- Montar la arquitectura completa el primer día.
- Cachear respuestas con datos de usuario bajo una clave genérica.
- Guardrails sin medir falsos rechazos ni latencia añadida.
- No registrar la versión de prompt y modelo en cada traza (drift invisible).
- Usar el pulgar arriba como única métrica de calidad.
- Entrenar con feedback sin corregir sus sesgos.

## Conceptos clave

- **Arquitectura progresiva**: empezar con modelo directo y añadir contexto, guardrails, router/gateway, caché y agentes según necesidad.
- **Input/output guardrails**: controles que protegen de fugas y prompts maliciosos en la entrada y de fallos de calidad o seguridad en la salida.
- **Router**: componente (normalmente un clasificador de intención) que decide qué ruta o modelo atiende cada consulta.
- **Model gateway**: capa única de acceso a modelos con control de acceso, costos, fallbacks y logging.
- **Caché exacta vs semántica**: reutilizar respuestas de consultas idénticas frente a parecidas.
- **MTTD / MTTR / CFR**: tiempo de detección, tiempo de resolución y tasa de cambios que fallan.
- **Traza**: registro del recorrido completo de una petición por todos los pasos del sistema.
- **Drift**: cambios no anunciados en prompts, usuarios o modelo que alteran el comportamiento.
- **Feedback explícito vs implícito**: valoraciones pedidas frente a señales inferidas de acciones.
- **Degenerate feedback loop**: bucle en que las salidas influyen en el feedback que las refuerza, amplificando sesgos.

## Preguntas de repaso

1. ¿En qué orden suelen añadirse los componentes de una arquitectura de IA y por qué no conviene montarlos todos desde el principio?
   R: Primero contexto (RAG y herramientas), luego guardrails, router y gateway, caché y por último patrones de agente con acciones de escritura, con observabilidad desde el inicio. No conviene montarlos todos porque cada uno añade latencia, costo y modos de fallo; se añaden cuando la evaluación o el monitoreo muestran que hacen falta.
2. ¿Qué dos riesgos cubren los guardrails de entrada y cómo se maneja un dato sensible detectado?
   R: La fuga de información privada a APIs externas y la ejecución de prompts maliciosos. Ante un dato sensible se puede bloquear la consulta o enmascararlo con un marcador antes de enviarla y restaurarlo en la respuesta con un diccionario inverso.
3. ¿Qué aporta un model gateway además de unificar la interfaz?
   R: Control de acceso sin repartir las claves del proveedor, límites de uso y costos, fallbacks ante fallos o rate limits, y un punto central para logging, analítica, balanceo de carga, caché y guardrails.
4. ¿Por qué la caché puede provocar fugas de datos y cómo se evita?
   R: Porque una consulta que parece genérica puede responderse con datos de un usuario concreto; si se guarda con una clave genérica, otro usuario recibe esa respuesta. Se evita incluyendo en la clave todo lo que hace específica la respuesta (usuario o permisos, versiones) y no cacheando consultas personales o dependientes del tiempo.
5. Nombra tres fuentes de drift y cómo detectar cada una.
   R: Cambios en el system prompt, detectables registrando un hash del prompt en cada traza; cambios en el comportamiento de los usuarios, visibles en métricas como la longitud de entradas y salidas y que requieren investigación; y cambios en el modelo subyacente de la API, detectables ejecutando periódicamente el conjunto de evaluación contra producción.
6. Da dos ejemplos de feedback implícito y explica por qué puede ser ambiguo.
   R: Regenerar una respuesta y la longitud de la conversación. Regenerar puede indicar insatisfacción o simple deseo de ver alternativas; una conversación larga puede ser buena en un compañero conversacional y mala en un bot de soporte. Por eso hay que interpretarlo según la aplicación y combinarlo con otras señales.
7. ¿Qué es un bucle de feedback degenerado y qué consecuencia puede tener en un asistente?
   R: Es cuando las salidas del sistema influyen en el feedback que luego se usa para entrenarlo, reforzando y amplificando sus sesgos. En un asistente puede llevar a que se vuelva adulador, diciendo lo que el usuario quiere oír en lugar de lo correcto.

## Ejercicio

Diseña la arquitectura de tu tutor de estudio en `architecture.md`: diagrama ASCII con los componentes que realmente necesita hoy (justifica cada uno y cuáles dejas para después), política de guardrails de entrada y salida (incluido qué hacer ante JSON inválido y ante una respuesta del estudiante con datos personales), qué cachearías y con qué clave, las 8 métricas que monitorizarías con su desglose, y 4 señales de feedback (2 explícitas, 2 implícitas) con su interpretación y posible sesgo. Implementa `gatewayChat` con registro de uso y `cachedChat`, y verifica con dos llamadas idénticas que la segunda sale de la caché. Terminado cuando el documento tiene las cinco partes y el log muestra una llamada al proveedor y un acierto de caché.

## Explícalo con tus palabras

Explica a un compañero por qué una aplicación de IA "que funciona en la demo" necesita trazas, versionado de prompts y feedback de usuarios antes de poder mejorarla con confianza.
