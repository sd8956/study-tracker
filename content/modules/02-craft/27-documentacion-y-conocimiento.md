---
title: Documentación y conocimiento compartido
kind: lesson
hours: 2
sources: Software Engineering at Google, cap. 10 Documentation (pp. 216–239) | Software Engineering at Google, cap. 3 Knowledge Sharing (pp. 61–87) | The Pragmatic Programmer, tema 7 Communicate! (pp. 63–72)
---

## Objetivo

Tratar la documentación como código (versionada, revisada, con dueño), elegir el tipo de documento según su audiencia (referencia, diseño, tutorial, conceptual, página de inicio) y entender cómo una organización comparte conocimiento: seguridad psicológica, preguntas, fuentes canónicas y mentoría a través del code review. Al terminar vas a poder escribir un README y un documento de diseño breve con la estructura adecuada.

## Estudio

### Por qué la documentación cuesta tanto

Todos nos quejamos de la falta de documentación, y casi nadie la escribe. El capítulo 10 de *Software Engineering at Google* analiza por qué: los ingenieros ven la escritura como una habilidad separada de programar, el beneficio de documentar no es inmediato para quien escribe (lo disfruta otra persona más tarde), las herramientas de documentación suelen estar desconectadas del flujo de trabajo y la documentación se percibe como una carga extra que hay que mantener.

Sin embargo, la documentación tiene beneficios claros, también para quien la escribe:

- **Ayuda a formular una API.** Si te cuesta explicar cómo se usa tu API, probablemente está mal diseñada. Escribir la documentación es una forma de probar el diseño.
- **Es una hoja de ruta para el mantenimiento** y un registro histórico de por qué el código es como es.
- **Hace que el código parezca más profesional** y genera confianza en quien lo usa.
- **Reduce las preguntas**: cada pregunta respondida en un documento es una interrupción menos.

### La documentación es como el código

La idea central del capítulo: **trata la documentación como código**. En Google, la documentación técnica vive en el mismo repositorio que el código (en Markdown, con un sistema interno que la publica), y eso implica:

| Práctica del código | Aplicada a la documentación |
| --- | --- |
| Control de versiones | Los documentos tienen historial y se cambian con commits |
| Propiedad clara | Cada documento tiene un dueño responsable de mantenerlo |
| Revisión | Los cambios de documentación pasan por code review |
| Seguimiento de problemas | Los errores en documentos se reportan como bugs |
| Evaluación periódica | Se revisan cada cierto tiempo para detectar contenido obsoleto |
| Reglas y estilo | Hay una guía de estilo para la documentación |

Una ventaja enorme: si la documentación vive junto al código, **un cambio de comportamiento y su actualización de documentación pueden ir en el mismo pull request**. El revisor puede comprobar que ambos coinciden (es el punto 9 de la checklist de la sesión 26). Y un documento con dueño y fecha de última revisión inspira mucha más confianza que una página wiki huérfana.

Esta idea también aparece en *The Pragmatic Programmer*, en su tema sobre comunicación: **construye la documentación dentro del proceso, no la añadas al final**. Y la regla DRY de la sesión 11 se aplica: si algo se puede generar a partir del código (la referencia de una API a partir de los tipos y los comentarios TSDoc, por ejemplo), generarlo es mejor que mantener una copia a mano.

### Conoce a tu audiencia

El error más común en la documentación es escribirla para la audiencia equivocada, o para todas a la vez. El libro clasifica a los lectores de varias formas:

- **Nivel de experiencia**: expertos que solo necesitan la referencia, o recién llegados que necesitan contexto.
- **Conocimiento del dominio**: quienes conocen el problema de negocio y quienes no.
- **Propósito**: quienes **usan** tu API (clientes) y quienes la **mantienen** (proveedores). Necesitan documentos distintos: el usuario quiere saber cómo usarla; el mantenedor, cómo funciona por dentro.
- **Forma de llegar**: los **buscadores** (*seekers*) saben lo que quieren y necesitan encontrarlo rápido y consistente; los **exploradores** (*stumblers*) llegan sin saber bien qué buscan y necesitan una introducción y orientación.

Un truco del libro: escribe pensando en quien lee y **recuerda lo que sentías cuando no sabías nada del tema**. La experiencia hace que demos por obvias cosas que no lo son. Y como dice el libro pragmático (sesión 3), conocer a tu audiencia es la mitad de comunicar bien.

### Tipos de documentación

El capítulo describe los tipos principales. Un documento debería tener **un solo propósito**; mezclar tipos produce documentos confusos.

**1. Documentación de referencia.** Describe cómo funciona y cómo se usa el código: comentarios de archivo, de clase y de función. Los de API pública son los más importantes.

- **Comentario de archivo**: qué contiene el archivo y por qué existe.
- **Comentario de clase**: qué representa la clase y cómo se usa; los métodos principales.
- **Comentario de función**: qué hace, empezando por un verbo ("Devuelve...", "Calcula..."), sus parámetros no obvios, lo que devuelve y los errores que lanza.

```ts
/**
 * Calcula la fecha planificada de cada sesión pendiente a partir de hoy,
 * respetando el horario semanal (lunes a viernes 2 h, sábado 3 h, domingo descanso).
 *
 * Las sesiones son secuenciales: si una no se completa, las siguientes se desplazan.
 *
 * @param sessions Sesiones pendientes en orden de estudio.
 * @param from Fecha de calendario desde la que se planifica (incluida).
 * @returns Una entrada por sesión con su fecha planificada; vacío si no hay sesiones.
 */
export function projectSchedule(sessions: readonly Session[], from: CalendarDate): PlannedSession[] {
  /* ... */
}
```

**2. Documentos de diseño.** Antes de construir algo grande, en Google se escribe un documento de diseño que se revisa con otros ingenieros. Explica el problema, los objetivos y no objetivos, la solución propuesta, las **alternativas consideradas** y por qué se descartaron, y los aspectos de seguridad, privacidad y pruebas. Tiene un valor doble: mejora el diseño antes de escribir código (es el *shifting left* de la sesión 1 aplicado al diseño) y queda como registro de las decisiones.

**3. Tutoriales.** Guían a alguien desde cero hasta un resultado funcional ("Hola, mundo" del proyecto). El libro recomienda escribirlos **mientras tú mismo sigues los pasos** desde una máquina limpia, numerando cada paso y anotando cada suposición. Un tutorial con un paso implícito ("obviamente, antes configuras las credenciales") deja a la gente atascada.

**4. Documentación conceptual.** Explica ideas y arquitectura: cómo encajan las piezas, por qué se diseñó así. No sustituye a la referencia; la complementa con el panorama general. Suele ser la más difícil de escribir y la que más falta.

**5. Páginas de inicio** (*landing pages*). La puerta de entrada de un equipo o proyecto: qué es, para quién, enlaces a lo importante. El error típico es convertirlas en un cajón de sastre con todo; deberían ser breves y servir de **mapa**, separando lo que necesita un usuario de lo que necesita el equipo.

### Revisión de documentos

Google propone que un documento técnico importante pase por tres tipos de revisión:

- **Técnica**: un experto comprueba que es correcto.
- **De audiencia**: alguien de la audiencia objetivo (por ejemplo, un recién llegado para un tutorial) comprueba que se entiende.
- **De escritura**: alguien con buena redacción (a veces un escritor técnico) mejora la claridad.

### Filosofía: quién, qué, cuándo, dónde y por qué

El libro sugiere responder en cada documento las preguntas clásicas del periodismo:

- **Quién**: ¿para quién es el documento? Decláralo al principio.
- **Qué**: ¿cuál es su propósito? Una frase.
- **Cuándo**: ¿cuándo se escribió, cuándo se revisó por última vez? Ayuda a juzgar si sigue vigente.
- **Dónde**: ¿dónde vive y dónde está lo relacionado?
- **Por qué**: ¿qué debería poder hacer el lector después de leerlo?

Y una estructura simple: **principio, medio y fin**. El principio dice de qué trata el documento y responde lo esencial; el medio desarrolla; el fin resume o indica los siguientes pasos. Los parámetros de un buen documento son **completitud, precisión y claridad**, y rara vez se consiguen los tres en un solo documento si intenta servir a todas las audiencias.

Por último, los documentos también **se deprecan**. Un documento obsoleto es peor que ninguno (como los comentarios de la sesión 6). Si un documento ya no aplica, márcalo como obsoleto con un enlace a su reemplazo, o bórralo.

### Compartir conocimiento: los obstáculos

El capítulo 3 trata un tema más amplio: cómo fluye el conocimiento en una organización. Enumera los obstáculos más comunes:

- **Falta de seguridad psicológica**: la gente no pregunta por miedo a parecer ignorante.
- **Islas de información**: grupos que no se comunican, lo que produce **fragmentación** (cada isla tiene una parte del conocimiento), **duplicación** (cada isla reinventa su solución) y **desviación** (cada isla hace lo mismo de forma distinta).
- **Punto único de fallo**: una persona que lo sabe todo y por la que pasa todo (el factor bus de la sesión 3).
- **Conocimiento de todo o nada**: o eres experto o eres novato, sin término medio, porque los expertos acaparan las respuestas y nadie más aprende.
- **Repetir como un loro** (*parroting*): copiar patrones o código sin entenderlos (programar por coincidencia, sesión 14).
- **Cementerios encantados** (*haunted graveyards*): partes del código que nadie se atreve a tocar porque "algo malo puede pasar", aunque nadie sabe exactamente qué.

### Compartir conocimiento: qué hacer

**Crea seguridad psicológica.** La base de todo. La gente tiene que sentir que puede preguntar y equivocarse sin consecuencias. Google asigna **mentores** a los recién llegados, distintos de su jefe, para que tengan a quién preguntar "cosas tontas". En grupo, se evitan los comportamientos que castigan las preguntas: fingir sorpresa ("¿cómo que no sabes qué es un monorepo?"), las respuestas "bueno, en realidad..." innecesarias o responder sin que te pregunten para lucirte.

**Haz preguntas y entiende el contexto.** Preguntar es la forma más rápida de aprender. Y antes de cambiar algo que parece absurdo, entiende por qué existe. El libro cita la **valla de Chesterton**: si encuentras una valla en medio de un camino y no sabes por qué está ahí, no la quites; primero averigua para qué sirve. Muchas "rarezas" del código tienen una razón (un bug antiguo, un requisito legal). Otras no, y entonces sí se pueden quitar.

**Escala tus preguntas.** Preguntar a una persona ayuda a una persona. Preguntar en un canal del equipo o en un foro interno hace que la respuesta quede disponible para todos los que tengan la misma duda.

**Siempre hay algo que enseñar.** No hace falta ser experto para compartir: horas de consulta (*office hours*), charlas técnicas, documentación y código bien escrito son formas de enseñar. Una práctica muy concreta del libro: **si aprendiste algo que no estaba documentado, actualiza o crea la documentación**. Si seguiste un tutorial y un paso no funcionaba, arréglalo. Así cada persona que pasa deja el camino un poco mejor (la regla del boy scout aplicada a los documentos).

**Fuentes canónicas.** A escala organizativa, el conocimiento debe tener lugares de referencia claros: guías para desarrolladores, enlaces cortos memorables (Google usa los "go/links", como `go/style`), tutoriales interactivos (*codelabs*) y hasta el análisis estático, que difunde buenas prácticas en el momento exacto en que hacen falta.

**Legibilidad: mentoría estandarizada.** El programa de legibilidad que viste en la sesión 26 es, en el fondo, un mecanismo para compartir conocimiento: los revisores con legibilidad enseñan, a través de comentarios en reviews reales, a escribir código idiomático. Solo alrededor del 1 o 2 % de los ingenieros de Google son revisores de legibilidad, todos voluntarios y elegidos también por su capacidad de enseñar. El libro reconoce los costos (más fricción para equipos sin nadie certificado, rondas de revisión adicionales, un proceso humano que escala mal) y lo presenta como un trade-off deliberado: más latencia a corto plazo a cambio de código de más calidad, consistencia en todo el repositorio y más pericia de los ingenieros a largo plazo, algo que tiene sentido para código que vivirá años. Y añade que parte de esos comentarios se pueden automatizar con análisis estático, para que los revisores se concentren en lo que solo una persona puede enseñar.

### Ejemplo: el README de un proyecto

Aplicando todo lo anterior, un README útil para esta app de estudio podría tener esta estructura:

```markdown
# Study Tracker

Planificador de estudio local: muestra qué estudiar hoy, cronometra el inglés
y registra tu progreso. Para quien sigue el plan de estudio de este repositorio.

### Empezar (5 minutos)
1. Node 22.5 o superior (`node --version`).
2. `npm install`
3. `cp .env.example .env.local` (opcional: NAN_API_KEY para el tutor).
4. `npm run dev` y abre http://127.0.0.1:3000

### Cómo funciona
- El contenido vive en `content/` (formato en docs/CONTENT-FORMAT.md).
- El progreso se guarda en SQLite (`data/study.db`).

### Desarrollo
- `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
- Decisiones de diseño: docs/decisions.md.

### Dueño y última revisión
@duque · revisado 2026-10-20
```

Fíjate en el principio (qué es y para quién), el tutorial mínimo numerado, el mapa hacia los documentos conceptuales y de referencia, y el quién/cuándo al final.

### Plantilla de documento de diseño

Una estructura breve para documentos de diseño, adaptada de las prácticas que describe el capítulo:

```markdown
# Diseño: repaso espaciado de preguntas
Autor: @duque · Estado: en revisión · Última actualización: 2026-10-20

### Contexto y problema
Las preguntas de repaso de cada sesión se leen una vez y se olvidan.

### Objetivos
- Programar repasos con espaciado creciente (sistema Leitner de 5 cajas).
- Que la vista "hoy" muestre los repasos pendientes después del inglés.

### No objetivos
- Corrección automática con IA (será otro documento).

### Diseño propuesto
Dominio puro (`Card`, `CalendarDate`), puerto `CardStore`, adaptador SQLite...

### Alternativas consideradas
1. Algoritmo SM-2: más preciso, pero requiere calificaciones de 0 a 5. Descartado por ahora.
2. Repasos en fechas fijas (1, 7, 30 días): más simple, pero no se adapta a los fallos.

### Riesgos, privacidad y seguridad
Datos solo locales. Riesgo: migración del esquema si cambian las cajas.

### Plan de pruebas
Tests unitarios y de propiedades del dominio, contrato del store, test mediano de la vista.
```

La sección más valiosa a largo plazo suele ser **"Alternativas consideradas"**: dentro de un año, cuando alguien pregunte "¿por qué no usamos SM-2?", la respuesta estará escrita.

### Registros de decisiones (ADR)

Una forma ligera de documentar decisiones, muy usada en equipos de todos los tamaños, son los **ADR** (*Architecture Decision Records*): archivos cortos y numerados (`docs/adr/0003-sqlite-local.md`) con contexto, decisión y consecuencias. No se editan cuando la decisión cambia: se escribe un ADR nuevo que **reemplaza** al anterior y se enlazan entre sí. Así el historial de decisiones queda completo y versionado junto al código, que es exactamente lo que propone el capítulo: documentación tratada como código, con fecha, dueño y propósito claro. Combinado con la valla de Chesterton, un buen registro de decisiones evita tanto quitar vallas por ignorancia como conservar cementerios encantados por miedo.

### Resumen

La documentación es un producto más, y se trata como código: vive en el repositorio, tiene dueño, se revisa y se actualiza junto al comportamiento que describe. Cada documento tiene una audiencia y un propósito (referencia, diseño, tutorial, conceptual, página de inicio) y responde quién, qué, cuándo, dónde y por qué. A escala de organización, el conocimiento fluye cuando hay seguridad psicológica para preguntar, preguntas hechas en público, fuentes canónicas y mentoría a través del code review. Y cada persona que aprende algo no documentado tiene la oportunidad de dejar el camino mejor para la siguiente.

### Errores comunes

- **Documentar al final** del proyecto, cuando ya nadie recuerda las decisiones.
- **Documentación fuera del repositorio** sin dueño ni revisión, que se pudre en silencio.
- **Un documento para todas las audiencias**, que no sirve bien a ninguna.
- **Tutoriales con pasos implícitos** que nadie probó desde cero.
- **Quitar "vallas" sin entender por qué están** (o no quitarlas nunca por miedo: cementerios encantados).
- **Castigar las preguntas**, aunque sea con un gesto de sorpresa.

## Conceptos clave

- **Documentación como código**: versionada, revisada, con dueño, con seguimiento de errores y revisión periódica.
- **Buscadores y exploradores**: lectores que saben qué buscan frente a lectores que necesitan orientación.
- **Documento de diseño**: documento previo a construir que describe problema, solución, alternativas y riesgos.
- **Islas de información**: grupos aislados que provocan fragmentación, duplicación y desviación del conocimiento.
- **Seguridad psicológica**: confianza para preguntar y equivocarse sin consecuencias.
- **Valla de Chesterton**: no eliminar algo hasta entender por qué existe.
- **Fuente canónica**: lugar de referencia acordado para un tipo de conocimiento.

## Preguntas de repaso

1. ¿Qué significa tratar la documentación como código? Da tres prácticas concretas.
   R: Aplicarle las mismas prácticas que al código: guardarla en control de versiones junto al código, asignarle un dueño, revisarla en code review, reportar sus errores como bugs y evaluarla periódicamente para detectar contenido obsoleto. Así puede cambiar en el mismo pull request que el comportamiento que describe.
2. ¿Por qué un documento debería tener un solo propósito y una audiencia clara?
   R: Porque audiencias distintas necesitan cosas distintas (un usuario quiere saber cómo usar la API, un mantenedor cómo funciona por dentro; un buscador quiere encontrar rápido, un explorador necesita orientación). Un documento que intenta servir a todos no sirve bien a ninguno.
3. Describe tres tipos de documentación y para qué sirve cada uno.
   R: Referencia: describe cómo se usa el código (comentarios de función, clase y archivo). Documento de diseño: explica problema, solución, alternativas descartadas y riesgos antes de construir, y deja registro de las decisiones. Tutorial: guía paso a paso desde cero hasta un resultado funcional. También existen la documentación conceptual y las páginas de inicio.
4. ¿Qué son las islas de información y qué problemas causan?
   R: Grupos de la organización que no comparten conocimiento entre sí. Causan fragmentación (cada uno tiene una parte), duplicación (cada uno reinventa la solución) y desviación (cada uno hace lo mismo de forma diferente).
5. ¿Qué es la valla de Chesterton y cómo se aplica al código?
   R: El principio de no eliminar algo cuya razón de ser desconoces hasta averiguar para qué sirve. En el código, antes de quitar una comprobación o una rareza que parece absurda, hay que entender por qué existe (un bug antiguo, un requisito legal); si no tiene razón, entonces se puede quitar.
6. ¿Por qué el programa de legibilidad de Google es una forma de compartir conocimiento?
   R: Porque los revisores certificados enseñan, a través de comentarios en cambios reales, a escribir código idiomático según las guías; es mentoría estandarizada que difunde buenas prácticas por toda la organización. Es un trade-off deliberado: más latencia de revisión a corto plazo a cambio de calidad, consistencia y pericia a largo plazo.

## Ejercicio

Para un proyecto tuyo (o esta app), escribe tres documentos en una carpeta `docs/` versionada: (1) un README con principio, tutorial mínimo numerado probado desde una carpeta limpia (clona el repositorio en un directorio nuevo y sigue tus propios pasos), mapa de documentos y dueño con fecha; (2) un documento de diseño breve (máximo dos páginas) para una funcionalidad futura con problema, objetivos, no objetivos, solución, dos alternativas descartadas con su razón y plan de pruebas; (3) comentarios TSDoc para las tres funciones públicas más importantes, siguiendo la estructura de la lección. Terminado cuando alguien (o tú en una carpeta limpia) puede arrancar el proyecto siguiendo solo el README sin pasos implícitos, y el documento de diseño responde quién, qué, cuándo, dónde y por qué.

## Explícalo con tus palabras

Explica a alguien por qué la persona que más se beneficia de escribir documentación es, muchas veces, quien la escribe.
