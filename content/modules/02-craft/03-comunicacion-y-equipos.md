---
title: Comunicación y trabajo en equipo
kind: lesson
hours: 2
sources: The Pragmatic Programmer, tema 7 Communicate! (pp. 63–72) | Software Engineering at Google, cap. 2 How to Work Well on Teams (pp. 42–60) | Gentleman Programming Book, cap. 2 Comunicación en primer lugar y cap. 17 Soft Skills y Liderazgo
links: Gentleman · Comunicación en primer lugar | https://the-amazing-gentleman-programming-book.vercel.app/es/book/Chapter02_Communication-First-and-Foremost ; Gentleman · Soft Skills y Liderazgo | https://the-amazing-gentleman-programming-book.vercel.app/es/book/Chapter17_Soft-Skills
---

## Objetivo

Entender por qué el software es un deporte de equipo y aprender a comunicar con intención: saber qué decir, a quién y cuándo. Al terminar vas a conocer los tres pilares del trabajo en equipo de Google (humildad, respeto y confianza), cómo dar y recibir críticas y cómo organizar la comunicación en un equipo remoto.

## Estudio

### El mito del genio

El capítulo 2 de *Software Engineering at Google* empieza desmontando una fantasía muy común: la del genio solitario. Pensamos en Linus Torvalds escribiendo Linux, en Guido van Rossum creando Python, en un hacker en un garaje que cambia el mundo. La realidad es que Linux empezó como un pequeño núcleo y se convirtió en lo que es gracias a miles de colaboradores; Python lo mantiene una comunidad enorme.

¿Por qué nos atrae tanto el mito? Porque alimenta una inseguridad: queremos que nadie vea nuestro trabajo hasta que esté perfecto, para parecer brillantes. El libro lo llama **esconderse** y lo considera dañino por varias razones:

- **Riesgo de ir en la dirección equivocada.** Si trabajas seis meses en secreto, puedes descubrir al final que el diseño tenía un error fundamental, o que alguien ya resolvió el problema.
- **El factor bus.** ¿Cuántas personas tendrían que ser atropelladas por un autobús para que el proyecto muriera? Si eres la única persona que entiende un componente, el factor bus es 1. Eso es un riesgo para el equipo y también para ti: nunca podrás tomarte vacaciones tranquilo.
- **Ritmo de progreso.** Trabajar solo te priva del feedback rápido. Un compañero que mira tu diseño diez minutos puede ahorrarte una semana.

La alternativa es **fallar pronto, rápido y a menudo**: mostrar el trabajo temprano, pedir opiniones y aceptar que las primeras versiones serán imperfectas. Es la misma lógica que el *shifting left* de la sesión 1, aplicada a las personas.

### Los tres pilares: humildad, respeto y confianza

Google resume la base de la colaboración sana en tres pilares (en inglés, HRT: *humility, respect, trust*):

| Pilar | Qué significa | Cómo se ve en el día a día |
| --- | --- | --- |
| **Humildad** | No eres el centro del universo; no lo sabes todo y puedes equivocarte | Pides ayuda, aceptas correcciones, dices "no sé" |
| **Respeto** | Te importan de verdad las personas con las que trabajas y valoras sus capacidades | Criticas el código, no a la persona; escuchas antes de responder |
| **Confianza** | Crees que los demás son competentes y harán lo correcto | Delegas, no microgestionas, asumes buena intención |

El libro sostiene que casi cualquier conflicto social en un equipo se puede rastrear hasta la falta de alguno de estos tres pilares.

Algunas prácticas concretas que se derivan:

**Suelta el ego.** No se trata de ser un felpudo, sino de no necesitar tener razón siempre. Un equipo con un ego colectivo ("estamos orgullosos de nuestro trabajo") funciona mejor que un grupo de egos individuales.

**Aprende a dar y recibir críticas.** Hay una diferencia enorme entre una crítica constructiva y un ataque personal. Compara estos dos comentarios en un code review:

```
Mal:  "Esto está mal. ¿No sabes que hay que cachear estas consultas?"
Bien: "Creo que esta consulta se ejecuta en cada render; ¿qué te parece
       cachearla con useMemo? Si hay una razón para no hacerlo, cuéntame."
```

El segundo describe el problema, propone una solución, deja espacio para que el autor explique su decisión y trata a la persona como competente. Y al recibir críticas, recuerda que **tú no eres tu código**: una crítica a tu código no es un juicio sobre tu valor como persona.

**Falla rápido e itera, sin culpa.** Google promueve la **cultura post-mortem sin culpables** (*blameless post-mortem*). Cuando algo falla en producción, el objetivo del análisis no es encontrar a quién castigar sino entender qué pasó y cómo evitar que vuelva a pasar. Un buen post-mortem incluye: un resumen, la línea de tiempo del incidente, la causa raíz, el impacto, las acciones para arreglarlo de inmediato y las acciones para prevenir que se repita, y las lecciones aprendidas.

**Aprende a ser paciente y abierto a la influencia.** Cuanto más dispuesto estés a dejarte convencer, más influencia tendrás, porque la gente siente que la escuchas. Elegir tus batallas también importa: no todo merece una discusión.

### El Communicate! del programador pragmático

*The Pragmatic Programmer* dedica un tema entero a comunicar, con una afirmación provocadora: **el idioma que más usas es el español (o tu lengua materna), no TypeScript**. Escribes correos, tickets, documentación, mensajes en Slack, propuestas. Una buena idea comunicada mal es una idea huérfana.

Los consejos principales, organizados como una lista de verificación:

1. **Sabe qué quieres decir.** Antes de escribir o hablar, haz un esquema. Pregúntate: ¿esto comunica lo que quiero?, ¿cuál es la idea principal?
2. **Conoce a tu audiencia.** No es lo mismo explicar una migración a tu equipo técnico que a la directora de producto. El libro sugiere pensar qué quiere saber cada audiencia, qué nivel de detalle necesita y qué le motiva.
3. **Elige el momento.** Un viernes a las seis de la tarde no es el momento para pedir una decisión importante. Pregúntate si es un buen momento para hablar de esto.
4. **Elige el estilo.** Algunas personas quieren un resumen de tres líneas; otras, el documento completo. Si no sabes, pregunta.
5. **Haz que se vea bien.** La presentación importa: un documento con formato limpio, sin faltas y con estructura clara se toma más en serio.
6. **Involucra a tu audiencia.** Comparte borradores, pide feedback temprano.
7. **Escucha.** Si quieres que te escuchen, escucha tú también. Haz preguntas y deja que la otra persona termine.
8. **Responde siempre.** Si alguien te pregunta algo, responde aunque sea "lo miro y te digo mañana". El silencio genera desconfianza.

El libro también aplica esto a la documentación: **construye la documentación dentro del proceso, no la agregues al final**. Lo verás a fondo en la sesión dedicada a documentación.

Una tabla para adaptar el mensaje a la audiencia:

| Audiencia | Le importa | Formato útil | Ejemplo de mensaje sobre una migración |
| --- | --- | --- | --- |
| Equipo técnico | Cómo, riesgos técnicos | Documento de diseño, diagrama | "Vamos de REST a eventos para pedidos; el riesgo principal es el orden de mensajes" |
| Producto | Impacto en usuarios y fechas | Resumen corto con hitos | "Durante dos semanas los reportes tendrán 5 min de retraso; después serán en tiempo real" |
| Dirección | Costo, beneficio, riesgo | Una página, números | "Inversión de 6 semanas; reduce incidentes de pedidos ~40 %" |

### Comunicación en equipos distribuidos (Gentleman)

El capítulo "Comunicación en primer lugar" del Gentleman Programming Book se centra en equipos remotos y en varias zonas horarias, que hoy son la norma. Su tesis es simple: la comunicación tiene que ir antes que todo lo demás.

La clave es mantener **fuentes de verdad** claras. El capítulo distingue dos:

- **Fuente de verdad del negocio** (por ejemplo, Notion o Confluence): qué se espera, por qué, los requisitos y los casos borde.
- **Fuente de verdad del trabajo** (los tickets): qué acordó construir el equipo y cuándo.

Y propone un orden para resolver dudas sobre una tarea:

```
Duda sobre una tarea
   │
   ├─► ¿Es simple?  ──► chat
   │
   └─► ¿Es compleja o el chat se estancó? ──► llamada corta
                                                 │
                                                 ▼
                       Documentar el resultado en el ticket (historial trazable)
                                                 │
                                                 ▼
                       Actualizar la fuente de verdad y enlazarla desde el ticket
```

Dos reglas interesantes: **las reuniones no deberían introducir información nueva** (primero actualizas la fuente de verdad, luego la compartes) y **los tickets deben contener lo esencial de lo acordado**, no solo un enlace, para que el historial no dependa de que un documento externo siga existiendo.

Otras prácticas que sugiere el capítulo:

- Comunicar las decisiones y sus razones a todas las ubicaciones.
- Reducir la fricción de configurar el entorno con guías y documentación, para que una persona nueva sea productiva pronto.
- Definir claramente cuándo algo está "terminado", con criterios de aceptación.
- Usar pair programming y code reviews para repartir el conocimiento y reducir la coordinación necesaria.
- Evitar el correo para decisiones importantes (la información se pierde) y preferir un wiki o un sistema de gestión de contenido.

### Soft skills y liderazgo (Gentleman)

El capítulo "Soft Skills y Liderazgo" propone una idea que resume bien todo lo anterior: **corazón de junior, conocimiento de senior**. El problema no es ser junior o senior, sino quedarse con lo peor de cada etapa.

| Etapa | Fortalezas | Riesgos |
| --- | --- | --- |
| Junior | Curiosidad, humildad, adaptabilidad, sin prejuicios | Evalúa mal los riesgos, decisiones impulsivas |
| Senior | Experiencia, criterio, visión de riesgos | Rigidez, resistencia a aprender, visión estrecha |

El ideal combina la curiosidad y la apertura del junior con el criterio y la responsabilidad del senior.

El capítulo también contrasta dos tipos de líderes. El **mentor** delega, da herramientas en lugar de respuestas y construye confianza mutua, de modo que el equipo gana autonomía. El que **completa tareas** ("déjame que lo hago yo") resuelve todo personalmente, no forma a nadie y desalienta las preguntas: el equipo se estanca. Fíjate cómo esto conecta con el factor bus de Google: el líder que lo hace todo es un factor bus de 1.

Sobre comunicación efectiva, el capítulo insiste en: **sobrecomunicar** en lugar de quedarse corto (sobre todo en remoto), **asumir buena intención** (el texto no transmite tono, así que pregunta antes de reaccionar mal), ser **directo pero respetuoso** (enfocado en el código, no en la persona) y **documentar las decisiones** porque las conversaciones se pierden. En conflictos: ataca el problema, no a la persona; busca entender antes de defender tu postura; enfócate en soluciones, no en culpables; y escala a un tercero si hace falta.

Como aprendiz, el consejo es: pregunta, toma notas, **intenta primero y explica lo que intentaste** antes de pedir ayuda, y agradece. Como mentor: señala el camino en lugar de dar la respuesta, deja que la gente se equivoque, celebra los logros y ten paciencia.

### Pedir ayuda bien: una plantilla

Una forma concreta de aplicar todo esto es saber pedir ayuda. Esta estructura respeta el tiempo de los demás y muestra que hiciste tu parte:

```
Contexto:   Estoy agregando el filtro por fecha en /reportes (ticket #231).
Objetivo:   Que el endpoint devuelva solo los reportes entre dos fechas.
Problema:   Los reportes del último día no aparecen.
Intenté:    1) Revisé que las fechas lleguen bien (sí llegan).
            2) Probé la consulta en SQL directo: tampoco aparecen.
Sospecha:   Creo que comparo con medianoche en vez de con el final del día.
Pregunta:   ¿Hay una utilidad de fechas en el proyecto para esto?
```

Esta plantilla aplica a la vez "sabe qué quieres decir" (pragmático), "intenta primero y explica lo que intentaste" (Gentleman) y humildad sin esconderse (Google).

### Escribir para ser leído: un ticket antes y después

Gran parte de la comunicación de un equipo pasa por tickets. Un ticket mal escrito obliga a otra persona a adivinar, y cada adivinanza es una oportunidad de construir lo equivocado.

```
ANTES
Título: Arreglar login
Descripción: El login no funciona bien, revisar.
```

¿Qué no funciona? ¿Para quién? ¿Desde cuándo? ¿Cómo sé que está arreglado? Nadie puede trabajar con esto sin una conversación previa, y esa conversación no quedará registrada.

```
DESPUÉS
Título: El login falla con correos que tienen mayúsculas
Contexto: Desde el despliegue del 12/10, los usuarios que se registraron
  con "Ana@Mail.com" no pueden entrar escribiendo "ana@mail.com".
Pasos para reproducir:
  1. Registrar "Test@Example.com".
  2. Iniciar sesión con "test@example.com".
  3. Resultado: "credenciales inválidas". Esperado: acceso correcto.
Criterios de aceptación:
  - El login no distingue mayúsculas en el correo.
  - Existe un test que cubre el caso.
  - Los usuarios ya registrados no necesitan hacer nada.
Notas: La normalización probablemente falta en el registro (ver PR #88).
Decisión (llamada 14/10 con Producto): normalizamos a minúsculas al guardar.
```

Fíjate en que la última línea aplica la regla del Gentleman Book: lo que se habló en la llamada queda escrito en el ticket. Y los criterios de aceptación aplican la idea de "definir cuándo algo está terminado".

### Recibir feedback: un pequeño protocolo

Dar críticas bien es difícil; recibirlas sin ponerse a la defensiva lo es todavía más. Un protocolo de cuatro pasos te ayuda cuando recibes un comentario que te molesta:

1. **Pausa.** No respondas en caliente. Si es por escrito, espera unos minutos.
2. **Reformula.** Escribe con tus palabras lo que entendiste: "Entiendo que te preocupa que esta función haga dos consultas por cada usuario, ¿es así?". Muchas veces el desacuerdo desaparece aquí.
3. **Separa la idea de la forma.** Aunque el comentario haya sido brusco, ¿la observación técnica es correcta? Quédate con la parte útil.
4. **Decide y explica.** Si estás de acuerdo, cambia y agradece. Si no, explica tus razones con datos y propón una alternativa. Si no llegan a un acuerdo, busquen a una tercera persona o dejen la decisión documentada.

### Reglas prácticas para la comunicación asíncrona

En equipos remotos casi todo se comunica por escrito y sin respuesta inmediata. Algunas reglas que reducen idas y vueltas:

| Regla | Por qué | Ejemplo |
| --- | --- | --- |
| Un mensaje completo, no cinco fragmentos | Quien lee no tiene que reconstruir el contexto | Evita "hola" ... "¿tienes un minuto?" ... "es sobre el deploy" |
| La pregunta va al principio | Quien lee sabe en dos segundos qué necesitas | "¿Puedo desplegar hoy a las 15 h? Contexto: ..." |
| Indica urgencia y plazo | Ayuda a priorizar sin ansiedad | "Necesito respuesta antes del jueves" |
| Enlaza en lugar de copiar documentos largos | Mantiene una única fuente de verdad | "Detalles en el ticket #231" |
| Cierra los hilos | Deja claro qué se decidió | "Decidido: vamos con la opción B. Actualizo el ticket." |

Todas estas reglas son variaciones de los principios pragmáticos: sabe qué quieres decir, conoce a tu audiencia y responde siempre.

### Errores comunes

- **Esconder el trabajo hasta que esté perfecto.** Aumenta el riesgo de ir en la dirección equivocada y el factor bus.
- **Confundir franqueza con dureza.** Se puede ser directo y respetuoso a la vez; la crítica va al código.
- **Decidir en chats o llamadas sin dejar rastro.** Si no está en el ticket o en la fuente de verdad, para el equipo no existe.
- **Un único mensaje para todas las audiencias.** Lo que convence al equipo técnico aburre o confunde a dirección.
- **Post-mortems que buscan culpables.** La gente empieza a esconder errores y el sistema no aprende.

### Resumen

El software lo construyen equipos, no genios aislados. Mostrar el trabajo pronto reduce el riesgo y el factor bus. La colaboración sana se apoya en humildad, respeto y confianza, y se nota sobre todo en cómo das y recibes críticas y en cómo analizas los fallos. Comunicar bien es una habilidad técnica más: sabe qué quieres decir, adapta el mensaje a la audiencia, deja las decisiones escritas en una fuente de verdad y responde siempre. En equipos remotos, la escritura clara y asíncrona es la herramienta principal de trabajo.

## Conceptos clave

- **Mito del genio**: la creencia falsa de que el gran software lo hacen individuos solitarios; el buen software es colectivo.
- **Factor bus**: número de personas que tendrían que desaparecer para que el proyecto se detenga.
- **HRT (humildad, respeto, confianza)**: los tres pilares de la colaboración sana según Google.
- **Post-mortem sin culpables**: análisis de incidentes centrado en causas y prevención, no en castigar.
- **Fuente de verdad**: lugar único y acordado donde vive una información (negocio o trabajo).
- **Corazón de junior, conocimiento de senior**: combinar la curiosidad y apertura del junior con el criterio del senior.
- **Conoce a tu audiencia**: adaptar contenido, nivel de detalle y formato a quien recibe el mensaje.

## Preguntas de repaso

1. ¿Por qué esconder tu trabajo hasta que esté terminado es dañino para el proyecto y para ti?
   R: Porque aumenta el riesgo de construir algo equivocado sin feedback, retrasa el aprendizaje y deja el conocimiento en una sola persona (factor bus de 1), lo que es un riesgo para el equipo y te ata a ese componente.
2. Explica los tres pilares HRT con un ejemplo de cada uno en un code review.
   R: Humildad: aceptar un comentario que mejora tu solución aunque te hubiera gustado la tuya. Respeto: escribir "esta consulta se ejecuta en cada render, ¿y si la cacheamos?" en lugar de "esto está mal". Confianza: aprobar un cambio de un compañero sin exigir que lo haga exactamente como tú lo harías, si es correcto.
3. ¿Qué elementos debe tener un post-mortem sin culpables y cuál es su objetivo?
   R: Resumen, línea de tiempo, causa raíz, impacto, acciones inmediatas, acciones de prevención y lecciones aprendidas. Su objetivo es que la organización aprenda y evite repetir el fallo, no castigar a alguien, para que la gente no esconda errores.
4. Según el capítulo de comunicación del Gentleman Book, ¿qué orden sigues para resolver una duda compleja y por qué las reuniones no deberían introducir información nueva?
   R: Llamada para alinear, documentar el resultado en el ticket y actualizar la fuente de verdad enlazada. Las reuniones no deben traer información nueva porque esta debe vivir primero en la fuente de verdad; así todos parten del mismo contexto y queda trazabilidad.
5. Menciona cuatro consejos del tema Communicate! de The Pragmatic Programmer.
   R: Saber qué quieres decir (esquema previo), conocer a tu audiencia, elegir el momento y el estilo, hacer que se vea bien, involucrar a la audiencia, escuchar y responder siempre.
6. ¿Qué diferencia a un líder mentor de uno que "completa tareas"?
   R: El mentor delega, da herramientas y deja que el equipo aprenda, lo que crea autonomía. El que completa tareas lo hace todo él mismo, no forma a nadie y desalienta preguntas, lo que estanca al equipo y concentra el conocimiento en una persona.

## Ejercicio

Redacta tres mensajes sobre el mismo cambio técnico ("vamos a migrar la autenticación de esta app de Supabase a una base local SQLite"): uno para el equipo técnico, uno para producto y uno para dirección, cada uno de máximo 120 palabras y adaptado a su audiencia según la tabla de la lección. Después reescribe este comentario de code review para que respete los tres pilares HRT: "Este código es un desastre, nadie usa `var` desde 2015 y las funciones son enormes". Terminado cuando tienes los cuatro textos y cada mensaje menciona solo lo que le importa a su audiencia.

## Explícalo con tus palabras

Explica a alguien que acaba de entrar a su primer equipo por qué mostrar un trabajo a medias pronto es una señal de profesionalismo y no de debilidad.
