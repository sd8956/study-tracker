---
title: Un framework para cualquier problema de diseño
kind: lesson
hours: 2
sources: System Design Interview (Alex Xu), cap. 3 "A framework for system design interviews" (pp. 42–50) | System Design Primer, "How to approach a system design interview question" | karanpratapsingh/system-design, cap. V "System Design Interviews"
links: Primer — How to approach a system design interview question | https://github.com/donnemartin/system-design-primer#how-to-approach-a-system-design-interview-question ; Karan — System Design Interviews | https://github.com/karanpratapsingh/system-design#system-design-interviews ; Primer — System design interview questions with solutions | https://github.com/donnemartin/system-design-primer#system-design-interview-questions-with-solutions
---

## Objetivo

Aplicar un proceso repetible para abordar cualquier problema de diseño, en una entrevista de 45 minutos o en un design doc real: aclarar requisitos, estimar, proponer un diseño de alto nivel con API y datos, profundizar en los componentes críticos y cerrar con cuellos de botella, fallos y trade-offs. Este framework es la plantilla de todos los proyectos del módulo.

## Estudio

### Por qué necesitas un proceso

Un problema de diseño es abierto: "diseña un servicio como YouTube" no tiene una respuesta correcta, y el espacio de soluciones es enorme. Sin un proceso, lo habitual es una de dos trampas: saltar de inmediato a dibujar cajas (y diseñar el sistema equivocado) o perderse en un detalle (el algoritmo de ranking) y no llegar nunca a una arquitectura completa.

El libro de Alex Xu cuenta la historia de un alumno que siempre levanta la mano primero para responder, antes de entender la pregunta. En diseño de sistemas, responder rápido sin entender no suma puntos: es una señal de alarma. Un entrevistador (o un colega que revisa tu design doc) evalúa sobre todo **cómo piensas**: si haces las preguntas correctas, si justificas con números, si reconoces trade-offs, si colaboras y si reaccionas bien al feedback. Señales negativas: sobreingeniería por gusto técnico, rigidez, no escuchar, pensar en silencio.

Las tres fuentes de este módulo proponen procesos muy parecidos. Esta sesión los combina en uno solo.

### Paso 1: entender el problema y acotar el alcance

Objetivo: saber **qué** construir antes de pensar **cómo**. En una entrevista de 45 minutos, de 3 a 10 minutos.

**Requisitos funcionales**: qué hace el sistema desde el punto de vista del usuario. Lista 3–5, priorizados, y deja explícito qué queda fuera.

**Requisitos no funcionales**: cómo debe comportarse. Disponibilidad (¿cuántos nueves?), latencia (¿p99 objetivo en la operación principal?), consistencia (¿qué datos son CP y cuáles AP?, sesión 07), durabilidad, escala, seguridad, costo.

**Requisitos extendidos** (Karan los llama así): lo que sería bueno tener si sobra tiempo (métricas, analítica, administración).

Preguntas útiles:

- ¿Quiénes usan el sistema y cómo (web, móvil, otros servicios)?
- ¿Qué funciones son las más importantes?
- ¿Cuántos usuarios hay y cuánto se espera crecer en 3, 6 y 12 meses?
- ¿Qué volumen de datos y qué ratio lectura/escritura?
- ¿Qué entradas y salidas tiene el sistema?
- ¿Hay tecnología o servicios existentes que se puedan reutilizar?

Un ejemplo de diálogo para "diseña un news feed":

```
 Tú:          ¿Web, móvil o ambos?                       → Ambos.
 Tú:          ¿Funciones principales?                    → Publicar y ver el feed de amigos.
 Tú:          ¿Orden cronológico o por relevancia?       → Cronológico inverso, para simplificar.
 Tú:          ¿Cuántos amigos puede tener un usuario?    → Hasta 5.000.
 Tú:          ¿Volumen?                                  → 10 M DAU.
 Tú:          ¿El feed incluye imágenes y video?         → Sí.
```

Si el interlocutor te pide que supongas, **escribe tus supuestos** en la pizarra o el documento: los vas a usar en todos los pasos siguientes.

Un buen cierre del paso 1 es una lista corta y explícita, por ejemplo:

```
 Funcionales:   (1) publicar post con texto e imagen  (2) ver feed de amigos  (3) seguir/dejar de seguir
 No funcionales: feed en < 300 ms p99 · disponibilidad 99,95 % · un post puede tardar hasta 5 s en
                 aparecer en feeds ajenos (eventual) · el autor ve su post de inmediato
 Escala:        10 M DAU, hasta 5.000 amigos por usuario
 Fuera:         ranking por relevancia, anuncios, mensajes privados
```

Observa cómo los requisitos no funcionales ya contienen decisiones de consistencia ("eventual hasta 5 s", "read-your-writes para el autor") que simplificarán todo el diseño. Negociar un requisito más laxo es a menudo la optimización más barata que existe.

### Paso 2: estimar

Con los supuestos, calcula lo que cambie decisiones (sesión 14): QPS de lectura y escritura con pico, almacenamiento con retención y replicación, ancho de banda, memoria de cache. Dos o tres minutos bastan, y termina **siempre** con conclusiones: "es 100:1 lectura, así que el diseño de lectura manda", "la media domina el almacenamiento, va a object storage". Pregunta antes si el entrevistador quiere el cálculo: a veces prefiere que pases directo al diseño.

### Paso 3: API y modelo de datos

Define el contrato y los datos principales:

- **API**: los 3–6 endpoints que implementan los requisitos funcionales, con parámetros, respuesta y errores relevantes (sesión 10). Para problemas muy grandes ("diseña Google") puede ser demasiado detalle; para problemas acotados ("el backend de un juego de póker") es central.
- **Modelo de datos**: entidades, sus campos clave, cómo se relacionan y, sobre todo, **los patrones de acceso**. De ahí sale la elección de almacenamiento (sesión 06) y la clave de partición.

```
 Entidad   Campos clave                         Acceso principal              Almacén
 users     id, name, created_at                 por id                        SQL
 posts     id, author_id, text, media_url, ts   por author_id ordenado por ts wide-column
 follows   follower_id, followee_id             ambas direcciones             SQL o grafo
```

### Paso 4: diseño de alto nivel y acuerdo

Dibuja las cajas principales y cómo fluye una petición por ellas: clientes, DNS, CDN, load balancer, servicios, caches, colas, bases de datos, object storage. Recorre en voz alta uno o dos casos de uso concretos ("cuando Ana publica…", "cuando Beto abre el feed…"); recorrerlos descubre casos borde que no habías considerado.

```
 [Clientes] → [CDN] → [LB] → [API servers] → [Cache] → [BD]
                                  │
                                  └→ [Cola] → [Workers] → [Object storage]
```

Lo más importante de este paso es **pedir feedback**: trata al entrevistador como un compañero de equipo. "Este es el esqueleto; ¿te parece bien que profundice en la distribución del feed o prefieres otra parte?". En un design doc real, este es el punto donde conviene que el equipo revise antes de seguir. En tiempo: de 10 a 15 minutos.

### Paso 5: profundizar en los componentes críticos

Ahora eliges, junto con tu interlocutor, 2 o 3 componentes para diseñar en detalle. Los mejores candidatos son los que hacen **difícil** este problema en particular:

| Problema | Componente interesante para profundizar |
| --- | --- |
| URL shortener | Función de hash / generación de códigos, redirección |
| Chat | Conexiones persistentes, entrega a usuarios offline, presencia |
| News feed | Fan-out al publicar vs al leer, celebridades |
| Rate limiter | Algoritmo y contadores distribuidos sin condiciones de carrera |
| YouTube | Pipeline de transcodificación, CDN y costos |
| Google Drive | Sincronización por bloques, conflictos |

Para cada componente: alternativas, trade-offs y una decisión justificada con números. Evita los detalles que no demuestran capacidad de diseño (por ejemplo, el algoritmo exacto de ranking de una red social): consumen tiempo y no muestran nada sobre escalabilidad. En tiempo: de 10 a 25 minutos.

### Paso 6: cuellos de botella, fallos y cierre

En los últimos minutos:

- **Cuellos de botella**: ¿qué se rompe primero si la carga crece 10×? ¿Qué cambiarías para el siguiente orden de magnitud?
- **Fallos**: ¿qué pasa si cae un servidor, una zona, la cache, la cola, un tercero? (sesión 12)
- **Operación**: métricas, alertas, despliegues, cómo se lanza la funcionalidad.
- **Resumen**: repasa la arquitectura en un minuto, sobre todo si discutiste varias alternativas.
- **Mejoras**: qué harías con más tiempo.

Nunca digas que tu diseño es perfecto: identificar sus debilidades es una muestra de criterio. En tiempo: de 3 a 5 minutos.

### Cómo dibujar diagramas que se entienden

Un diagrama confuso anula un buen diseño. Algunas reglas simples:

- **Flujo de izquierda a derecha o de arriba hacia abajo**: el cliente en un extremo, el almacenamiento en el otro.
- **Una caja, una responsabilidad**, con un nombre de función ("Servicio de fan-out"), no solo de tecnología ("Kafka"). La tecnología va entre paréntesis cuando importa.
- **Flechas con verbo y dato**: "publica PostCreated", "lee timeline (lista de IDs)". Una flecha sin etiqueta obliga a adivinar.
- **Numera los pasos** del caso de uso que recorres (1, 2, 3…) para poder narrarlo.
- **Separa la ruta de escritura de la de lectura** si son muy distintas; a menudo conviene dibujar dos diagramas, como hace el libro con la publicación y la lectura del feed.
- **Marca lo síncrono y lo asíncrono** (línea continua frente a punteada, o una etiqueta "async").

En texto plano, como en tus design docs, el ASCII funciona perfectamente si respetas estas reglas.

### Reaccionar a preguntas y objeciones

Durante la discusión van a cuestionar tus decisiones: "¿y si un usuario tiene diez millones de seguidores?", "¿qué pasa si esta cola se llena?". No son ataques; son invitaciones a mostrar criterio. Un buen patrón de respuesta:

1. **Reconoce el problema** con precisión: "sí, con fan-out al escribir, un usuario con 10 M de seguidores genera 10 M de escrituras por post".
2. **Cuantifica** si puedes: "a 5 posts por día son 50 M de escrituras solo de esa cuenta".
3. **Propón una o dos alternativas** con su costo: "para cuentas por encima de un umbral, cambio a fan-out al leer; el costo es más lectura y algo de latencia para sus seguidores".
4. **Decide** y sigue adelante.

Si no sabes algo, dilo y razona en voz alta a partir de principios ("no conozco los límites exactos de ese producto, pero si cada nodo maneja del orden de X…"). Inventar con seguridad es peor que reconocer un límite. Y si el interlocutor propone una idea mejor que la tuya, adóptala explicando por qué es mejor: la colaboración es parte de lo que se evalúa.

### Entrevista frente a trabajo real

El proceso es el mismo, pero cambian los énfasis:

| Aspecto | Entrevista | Trabajo real |
| --- | --- | --- |
| Tiempo | 45–60 minutos | Días o semanas, con revisiones |
| Requisitos | Se negocian en minutos | Se investigan con usuarios, producto y datos reales |
| Números | Supuestos redondos | Métricas reales del sistema actual y proyecciones |
| Tecnología | Genérica ("una cola") | Concreta, condicionada por lo que el equipo ya opera y conoce |
| Costo | Se menciona | Se calcula y suele decidir |
| Migración | Rara vez | Casi siempre: hay un sistema existente que no puede detenerse |
| Resultado | Una conversación | Un documento revisado, un plan de entregas y métricas de éxito |

Lo que la entrevista entrena (preguntar, estimar, estructurar, justificar) es exactamente lo que hace útil un design doc real. La diferencia principal es que en el trabajo real casi nunca diseñas desde cero: diseñas el **siguiente paso** de un sistema que ya existe, y la estrategia de migración (sesión 11, strangler fig) suele ser la parte más difícil.

### Distribución del tiempo (entrevista de 45 minutos)

```
 Paso                                   Minutos
 1. Requisitos y alcance                  3–10
 2. Estimación                            2–5   (puede integrarse en 1 o 4)
 3-4. API, datos y alto nivel + acuerdo  10–15
 5. Profundización                       10–25
 6. Cierre                                3–5
```

### Qué hacer y qué no

Haz:

- Pide aclaraciones; no asumas que tus supuestos son correctos.
- Piensa en voz alta.
- Propón varias alternativas cuando las haya, y elige una con razones.
- Diseña primero lo más crítico.
- Si te trabas, pide una pista: es mucho mejor que quedarte en silencio.
- Pide feedback temprano y seguido.

No hagas:

- No saltes a la solución sin requisitos.
- No te hundas en un componente al principio: primero el alto nivel, después el detalle.
- No uses tecnología de moda sin justificarla con un requisito.
- No consideres terminado el diseño cuando dibujaste las cajas: termina cuando se discutieron fallos y trade-offs.
- No llegues sin preparación: practica los problemas clásicos (los de este módulo) hasta que el proceso te salga solo y puedas dedicar la atención a lo particular de cada caso.

### Del framework al design doc

En el trabajo real, el mismo proceso produce un **design doc**. Esta es la plantilla que usarás en todos los proyectos de 3 horas del módulo:

```
 1. Contexto y objetivo (2–3 frases)
 2. Requisitos
    2.1 Funcionales (priorizados)  2.2 No funcionales (con números)  2.3 Fuera de alcance
 3. Estimaciones (supuestos → tráfico, datos, red, memoria, cómputo → conclusiones)
 4. API (endpoints, parámetros, respuestas, errores, idempotencia)
 5. Modelo de datos (entidades, patrones de acceso, almacenamiento elegido, clave de partición)
 6. Diseño de alto nivel (diagrama ASCII + recorrido de 2 casos de uso)
 7. Profundizaciones (2–3 componentes: alternativas, trade-offs, decisión)
 8. Consistencia y fallos (por dato: garantías; por componente: qué pasa si cae)
 9. Escalado y cuellos de botella (qué cambia a 10× y 100×)
 10. Seguridad y operación (authn/authz, rate limiting, métricas, alertas, despliegue)
 11. Alternativas descartadas y por qué
```

La sección 11 es la que más se omite y una de las más valiosas: deja registro de por qué no se eligió otra opción, lo que ahorra discusiones futuras. Un design doc bueno no es largo: es uno que permite a otra persona entender qué se va a construir, por qué así y qué riesgos se aceptaron, en menos de media hora de lectura.

### Rúbrica de autoevaluación

Usa esta rúbrica para evaluar tus propios diseños (y la verás en los proyectos):

| Criterio | Insuficiente | Bien | Excelente |
| --- | --- | --- | --- |
| Requisitos | Implícitos o ausentes | Funcionales y no funcionales listados | Priorizados, con números y fuera de alcance explícito |
| Estimación | Ausente o sin conclusiones | Números correctos en orden de magnitud | Números que justifican decisiones concretas |
| API y datos | Vagos | Endpoints y entidades claros | Patrones de acceso guían almacenamiento y particionado |
| Alto nivel | Cajas sin flujo | Flujo de casos de uso recorrido | Cada caja justificada por un requisito o un número |
| Profundización | Superficial | Una alternativa analizada | Varias alternativas con trade-offs y decisión razonada |
| Fallos y escala | No se mencionan | Algunos fallos tratados | Fallos por componente, siguiente orden de magnitud, operación |

### Ejemplo comprimido: un servicio de "pegar texto" (tipo Pastebin)

1. **Requisitos**: crear un texto y obtener una URL; leerlo por URL; expiración opcional. No funcionales: lectura con p99 < 100 ms, alta disponibilidad, durabilidad. Fuera de alcance: edición, cuentas.
2. **Estimación**: 1 M de textos nuevos por día de 10 KB → ~12 escrituras/s; 10 lecturas por texto → ~120 lecturas/s, pico 3×. Almacenamiento: 10 GB/día, ~3,6 TB/año. Conclusión: carga modesta; el almacenamiento crece, así que el contenido va a object storage y los metadatos a una base relacional.
3. **API**: `POST /pastes {content, expiresIn}` → `{url}`; `GET /{code}` → contenido.
4. **Datos**: `pastes(code PK, object_key, created_at, expires_at)`; contenido en object storage.
5. **Alto nivel**: LB → API stateless → base de metadatos + object storage; CDN/cache para textos populares; un job que borra expirados.
6. **Profundización**: generación del código (base62 de un contador vs hash; sesión 19), lectura con cache.
7. **Fallos**: réplica de lectura y failover para la base; el object storage ya es durable; si la cache cae, la carga (360 lecturas/s en el pico) la aguanta la base.

En diez líneas ya hay un diseño defendible. Los proyectos del módulo piden lo mismo, con más profundidad.

Observa también lo que este ejemplo **no** hace: no shardea, no usa microservicios, no pone una cola. Con ~360 lecturas/s en el pico, nada de eso se justifica. Saber decir "esto no hace falta todavía, y este es el número a partir del cual sí" es tan importante como conocer las piezas avanzadas.

## Conceptos clave

- **Requisitos funcionales**: lo que el sistema hace para el usuario.
- **Requisitos no funcionales**: cómo debe comportarse (disponibilidad, latencia, consistencia, escala, costo).
- **Fuera de alcance**: lo que explícitamente no se diseña.
- **Supuestos escritos**: decisiones provisorias registradas para usarlas y revisarlas.
- **Diseño de alto nivel**: componentes principales y flujo de los casos de uso.
- **Profundización (deep dive)**: diseño detallado de los 2–3 componentes que hacen difícil el problema.
- **Buy-in**: acuerdo con el interlocutor sobre el esqueleto antes de detallar.
- **Design doc**: documento escrito que registra requisitos, diseño, trade-offs y alternativas descartadas.

## Preguntas de repaso

1. ¿Por qué es una mala señal empezar a dibujar la arquitectura en el primer minuto?
   R: Porque sin requisitos claros es probable diseñar el sistema equivocado o sobrediseñarlo. Además, muestra que no se hacen las preguntas correctas ni se negocian supuestos, que es una de las habilidades principales que se evalúan; lo esperado es aclarar alcance, funciones, escala y requisitos no funcionales primero.
2. ¿Qué criterio usas para elegir qué componentes profundizar?
   R: Los que hacen difícil este problema en particular y donde hay trade-offs reales: por ejemplo, la generación de códigos en un URL shortener, el fan-out en un news feed o las conexiones persistentes en un chat. Se acuerdan con el interlocutor y se evitan detalles que no muestran capacidad de diseño escalable, como algoritmos de ranking específicos.
3. ¿Qué debe incluir el cierre de un diseño?
   R: Cuellos de botella y cómo escalar al siguiente orden de magnitud, comportamiento ante fallos de cada componente, aspectos operativos (métricas, alertas, despliegue), un resumen de la arquitectura y mejoras posibles. Nunca afirmar que el diseño es perfecto.
4. ¿Por qué un design doc debe incluir alternativas descartadas?
   R: Porque registra el razonamiento detrás de la decisión: qué se consideró y por qué no se eligió. Evita repetir discusiones, ayuda a quien llegue después a entender el contexto y permite revisar la decisión si cambian los supuestos que la justificaban.
5. ¿Qué diferencia hay entre requisitos funcionales, no funcionales y extendidos? Da un ejemplo de cada uno para un chat.
   R: Funcional es lo que el sistema hace (enviar mensajes uno a uno y en grupo). No funcional es cómo debe hacerlo (entrega con latencia menor a 500 ms, mensajes durables, alta disponibilidad). Extendido es lo deseable si hay tiempo (indicador de escribiendo, confirmaciones de lectura o estadísticas de uso).

## Ejercicio

Practica el framework con un cronómetro de 45 minutos sobre el problema "diseña un servicio de encuestas en vivo para eventos (hasta 50.000 asistentes votando a la vez y viendo resultados en tiempo real)". Escribe el design doc con la plantilla de 11 secciones (puede ser breve en cada una) y anota cuántos minutos usaste por paso. Luego autoevalúate con la rúbrica. Terminado cuando el documento tenga todas las secciones, al menos una profundización con dos alternativas comparadas y tu autoevaluación por criterio.

## Explícalo con tus palabras

Explica por qué un arquitecto que diseña una casa pregunta primero cuántas personas vivirán en ella y cómo la usarán, y relaciónalo con los pasos de este framework.
