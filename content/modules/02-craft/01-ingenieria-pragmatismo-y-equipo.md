---
title: Ingeniería en el tiempo, actitud pragmática y trabajo en equipo
kind: lesson
hours: 3
sources: Software Engineering at Google, cap. 1 What Is Software Engineering? (pp. 16–41) y cap. 2 How to Work Well on Teams (pp. 42–60) | The Pragmatic Programmer, prefacio y cap. 1 A Pragmatic Philosophy, temas 1–7 (pp. 17–72) | Clean Code, cap. 1 Clean Code (pp. 32–46) | Gentleman Programming Book, cap. 2 Comunicación en primer lugar y cap. 17 Soft Skills y Liderazgo
links: Gentleman · Comunicación en primer lugar | https://the-amazing-gentleman-programming-book.vercel.app/es/book/Chapter02_Communication-First-and-Foremost ; Gentleman · Soft Skills y Liderazgo | https://the-amazing-gentleman-programming-book.vercel.app/es/book/Chapter17_Soft-Skills
---

## Objetivo

Construir la mentalidad que sostiene todo el módulo en tres capas: qué distingue la ingeniería de software de programar (tiempo, escala, trade-offs y la ley de Hyrum), la actitud profesional pragmática (responsabilidad, ventanas rotas, software suficientemente bueno, código limpio como forma de ir rápido) y el trabajo en equipo (humildad, respeto y confianza, críticas, post-mortems sin culpables y comunicación con intención). Al terminar vas a poder analizar un cambio con esos tres lentes y comunicarlo bien a quien corresponda.

## Estudio

### Programar no es lo mismo que hacer ingeniería de software

Piensa en dos trabajos. En el primero escribes un script que renombra 300 fotos, lo ejecutas una vez y lo borras. En el segundo escribes el módulo de cobros de una tienda que estará cinco años en producción, que tocarán diez personas y que sobrevivirá a tres versiones de Node.js. Los dos son "programar", pero solo el segundo es un problema de **ingeniería de software**.

*Software Engineering at Google* lo resume en una frase que vale la pena memorizar: la ingeniería de software es **programación integrada en el tiempo**. Programar produce código que funciona hoy; la ingeniería produce código que sigue funcionando, se puede cambiar y se puede mantener mientras pasan los años, cambian las personas y cambia el entorno. De ahí salen tres ejes:

| Eje | Pregunta clave | Ejemplo |
| --- | --- | --- |
| **Tiempo** | ¿Cuánto va a vivir este código y cuánto va a cambiar? | Script de una vez frente a servicio de diez años |
| **Escala** | ¿Cuántas personas, líneas y máquinas intervienen? | Repositorio personal frente a monorepo con miles de ingenieros |
| **Trade-offs** | ¿Qué gano y qué pierdo con esta decisión? | Tests ahora (costo) frente a depurar en producción (riesgo) |

### El tiempo: sostenibilidad

La vida esperada del código cambia todo. Si vive minutos, da igual que dependa de una versión exacta de una librería o que nadie más lo entienda. Si vive años, cada dependencia es una deuda: el lenguaje evoluciona, aparece una vulnerabilidad, cambia el negocio. Tu proyecto es **sostenible** si, durante toda su vida esperada, puedes reaccionar a cualquier cambio valioso. No se trata de cambiar por cambiar, sino de **poder** hacerlo: decidir no actualizar una dependencia está bien si es una decisión, no una imposibilidad.

El libro cuenta algo que casi todo equipo vive: la primera actualización tras años sin tocar nada es un infierno, porque nadie recuerda cómo se hizo y las dependencias ocultas aparecen todas a la vez. La lección es que **lo que haces a menudo se vuelve barato**. Actualizar cada semana es aburrido; actualizar cada tres años es un proyecto. Resumido: "si duele, hazlo más seguido".

### La ley de Hyrum

La idea más citada del libro: con un número suficiente de usuarios de una API, no importa lo que prometa el contrato; **todo comportamiento observable será usado por alguien**.

```ts
// Librería v1. El contrato solo dice "devuelve los usuarios activos".
export function activeUsers(users: User[]): User[] {
  return users.filter((u) => u.active); // conserva el orden de entrada
}

// Un cliente, un año después:
const [owner] = activeUsers(team.members); // ¡asume que el primero es el dueño!
```

Si la versión 2 ordena por último acceso, el cliente se rompe aunque nadie le prometió el orden. Consecuencias prácticas:

- **Expón lo mínimo.** Orden, formato de un mensaje de error, tiempos o campos extra de un JSON son contratos implícitos potenciales.
- **Decide qué es observable.** Si algo debe poder cambiar, no lo expongas; si lo expones, elígelo y documéntalo.
- **Los tests de los consumidores son tu red.** Si sabes quién usa tu código y tienes sus tests, sabes a quién rompe un cambio.

```ts
// Antes: estado público, orden accidental y un error "parseable"
class TagStore {
  tags: string[] = [];
  add(tag: string): string {
    if (this.tags.includes(tag)) return `ERROR:DUPLICATE:${tag}`;
    this.tags.push(tag);
    return "OK";
  }
}

// Después: superficie mínima y contrato explícito
export type AddResult = { ok: true } | { ok: false; reason: "duplicate" };

export class TagStore {
  readonly #tags = new Set<string>();

  add(tag: string): AddResult {
    if (this.#tags.has(tag)) return { ok: false, reason: "duplicate" };
    this.#tags.add(tag);
    return { ok: true };
  }

  /** Devuelve una copia en orden alfabético (orden elegido a propósito). */
  list(): readonly string[] {
    return [...this.#tags].sort();
  }
}
```

Hyrum no desaparece (siempre hay algo observable), pero ahora lo observable es lo que **tú** decidiste prometer. Una frase del libro lo resume: es programación si "ingenioso" es un cumplido, y es ingeniería si "ingenioso" es una acusación.

### La escala: procesos que crecen bien

La pregunta clave es si tu proceso escala de forma lineal o peor que lineal con el tamaño de la organización:

| Política | ¿Escala bien? | Por qué |
| --- | --- | --- |
| "Cada equipo migra su código cuando cambia una librería compartida" | No | El costo crece con el número de equipos y cada uno aprende desde cero |
| "Quien cambia la infraestructura migra a sus usuarios" (*churn rule*) | Mejor | Los expertos lo hacen, lo automatizan y aprenden con cada repetición |
| "Ramas de desarrollo de larga vida" | No | El merge final crece con el tiempo y con el número de ramas |
| "Todos cerca de trunk con cambios pequeños" | Sí | Los conflictos son pequeños y se resuelven pronto |

Dos reglas más que verás todo el módulo. La **regla de Beyoncé**: "si te gustaba, deberías haberle puesto un test"; si un cambio ajeno pasa la CI y rompe tu producto, la responsabilidad es tuya por no proteger ese comportamiento. Y **desplazar a la izquierda** (*shifting left*): cuanto antes detectas un problema, más barato es.

```
Costo de arreglar un defecto según dónde se detecta
editor  →  tests locales  →  code review  →  CI  →  staging  →  producción
  $            $$              $$$          $$$$     $$$$$      $$$$$$$$
```

### Los trade-offs: decisiones explicables

Ingeniería es decidir con información incompleta, pesando costos de varios tipos: financieros, de recursos (CPU, memoria), de personas, transaccionales (cuánto cuesta actuar), de oportunidad y sociales. Lo importante no es acertar siempre, sino que la decisión sea **explicable y revisable**: se toma con lo que se sabe, se escribe con sus razones y se revisa cuando aparecen datos nuevos. Cambiar de opinión ante datos nuevos no es un fracaso; "siempre se hizo así" sin razones sí lo es.

Un caso que junta todo: tu librería interna `@acme/dates` la usan 40 servicios y quieres que `formatDate` pase de `DD/MM/YYYY` a ISO 8601. **Tiempo**: vivirá años, y mañana el cambio será más caro. **Hyrum**: alguien parsea ese string. **Escala**: 40 migraciones independientes son 40 aprendizajes desde cero; mejor creas `formatDateIso`, deprecas la vieja y migras tú (churn rule). **Beyoncé**: el consumidor sin test asume el riesgo. **Trade-off**: si ISO evita bugs de zona horaria, vale la pena; escríbelo.

### La actitud pragmática: responsabilidad

*The Pragmatic Programmer* abre con una idea simple: eres dueño de tu carrera y de tu trabajo. Nadie te va a entregar el aprendizaje (este plan de estudio es justo eso: una inversión deliberada), y nadie más responde por tus compromisos. Antes de aceptar una tarea, analiza los riesgos fuera de tu control; si aceptas, respondes por el resultado.

Cuando algo sale mal, la reacción profesional no es la excusa sino **ofrecer opciones**:

| Excusa | Opción profesional |
| --- | --- |
| "No terminé porque el API de pagos no está documentado." | "El API no está documentado. Puedo (a) leer su código y documentarlo en dos días o (b) prototipar con el sandbox y validarlo mañana con su equipo." |
| "El servidor se cayó y perdimos datos, no fue mi culpa." | "Perdimos los datos de ayer. Propongo restaurar el backup de anteayer, programar backups cada hora y revisar por qué no saltó ninguna alerta." |

Un truco del libro: antes de dar una explicación, díselo primero a un patito de goma. Si suena a excusa en voz alta, sonará igual para quien te escuche. Responsabilidad también es decir "no lo sé, lo averiguo".

### Ventanas rotas, sopa de piedras y ranas hervidas

El software tiende al desorden. La **teoría de las ventanas rotas** dice que un descuido visible que nadie arregla transmite abandono y acelera el deterioro: una función de 300 líneas sin tests invita a añadir la 301 "porque ya está así". La regla: **no vivas con ventanas rotas**. Arregla lo que veas mal en cuanto lo descubras y, si no puedes hacerlo bien ahora, "tapa la ventana": un ticket visible, un mensaje de "no implementado", un comentario enlazado. Lo importante es dejar claro que alguien lo vio y que no es aceptable.

Dos historias más. La **sopa de piedras**: cuando pedir permiso para el proyecto completo genera resistencia, sé catalizador; construye algo pequeño que funcione (un script de CI, un test que ya atrapó un bug), muéstralo y deja que la gente se sume. La **rana hervida**: los proyectos rara vez se hunden de golpe; se degradan con un parche más y una semana más de retraso. Revisa el panorama general de vez en cuando, no solo tu tarea.

### Software suficientemente bueno y tu portafolio

Perseguir la perfección garantiza no entregar nunca, pero "suficientemente bueno" no es "descuidado": significa que **el nivel de calidad es una decisión explícita**, tomada con los usuarios. Un marcapasos y una herramienta interna de reportes no tienen el mismo listón. Involucra a los usuarios en el trade-off, trata la calidad como un requisito y sabe cuándo parar: el software que se entrega pronto y recibe feedback suele terminar siendo mejor que el que se pule en aislamiento.

Tu conocimiento también caduca, así que gestiónalo como un **portafolio**: invierte con regularidad (aunque sea poco), diversifica (otros lenguajes, paradigmas y habilidades no técnicas), combina apuestas estables y de riesgo, y revisa y rebalancea cada cierto tiempo. Acompáñalo de pensamiento crítico ante lo que lees: pregunta "¿por qué?" varias veces, quién se beneficia, cuál es el contexto (lo que sirve a 50,000 ingenieros puede no servir a cinco) y bajo qué condiciones funcionaría.

### El costo del desorden según Clean Code

Robert C. Martin describe una historia que casi cualquiera ha vivido. Un equipo arranca rapidísimo, toma atajos para cumplir plazos, y cada atajo hace el siguiente cambio un poco más difícil. Al año o dos, cada cambio rompe dos cosas y la productividad tiende a cero. La gerencia añade gente, la gente nueva no conoce el diseño y el desorden crece. Al final se pide **el gran rediseño**: un equipo nuevo reescribe todo mientras el viejo mantiene un sistema que sigue cambiando. A veces la carrera dura años y la versión nueva acaba igual de sucia.

```
Productividad
 100% |*
      |   *
      |       *
      |            *   *
      |                    *  *  *  *  .
      +----------------------------------> Tiempo
      Proyecto nuevo         "Ya no podemos tocar nada"
```

Martin hace dos afirmaciones incómodas. La primera: el código malo es **culpa nuestra**. Los gerentes defienden el calendario y es su trabajo; el nuestro es defender el código con la misma pasión, como un cirujano que no deja de lavarse las manos aunque el paciente tenga prisa. La segunda es la paradoja central del libro: **la única forma de ir rápido es mantener el código limpio**. El desorden no te frena "algún día"; te frena hoy, en cada cambio.

¿Y qué es código limpio? Las definiciones que recoge comparten ideas: hace una cosa bien, se lee como prosa que expone la intención, lo puede mejorar otra persona (tiene tests y nombres claros), no tiene duplicación y parece escrito por alguien a quien le importaba. Y un dato clave: **leemos mucho más código del que escribimos** (más de 10 a 1), así que hacer el código fácil de leer es lo que lo hace fácil de escribir.

### La regla del boy scout en un cambio real

Deja el campamento más limpio de lo que lo encontraste: **cada vez que toques un archivo, déjalo un poco mejor**. Imagina que añades un cupón al carrito y te topas con esto:

```ts
// carrito.ts (lo que encontraste)
export function total(items: any[], c?: string) {
  let t = 0;
  for (const i of items) t += i.p * i.q;
  if (c == "PROMO10") t = t - t * 0.1; // TODO arreglar cupones
  if (c == "PROMO20") t = t - t * 0.2;
  return Math.round(t * 100) / 100;
}
```

Añadir otro `if` multiplica la ventana rota; rediseñar todo el sistema de precios se sale de tu tarea. Lo profesional es mejorar lo justo y dejar constancia del resto:

```ts
// carrito.ts (lo que dejas)
type CartItem = { unitPrice: number; quantity: number };

const COUPON_DISCOUNTS: Record<string, number> = {
  PROMO10: 0.1,
  PROMO20: 0.2,
  PROMO30: 0.3, // tu tarea
};

export function cartTotal(items: CartItem[], couponCode?: string): number {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discount = couponCode ? COUPON_DISCOUNTS[couponCode] ?? 0 : 0;
  return Math.round(subtotal * (1 - discount) * 100) / 100;
}
// Pendiente visible: los cupones deberían venir de la base de datos (ticket #142).
```

El comportamiento de los cupones existentes no cambia, tu cambio cabe en una línea y la deuda que queda tiene nombre y ticket. El límite de la regla: mejoras **pequeñas y seguras**, idealmente con un test que fije antes el comportamiento. Un cambio de comportamiento va en su propio commit, con su propio test.

### El mito del genio y el factor bus

El capítulo 2 de Google desmonta una fantasía: la del genio solitario. Linux y Python existen gracias a miles de colaboradores. El mito atrae porque alimenta una inseguridad: queremos que nadie vea nuestro trabajo hasta que esté perfecto. El libro llama a esto **esconderse** y lo considera dañino:

- **Riesgo de ir en la dirección equivocada**: seis meses en secreto pueden acabar en un diseño con un error de base, o en algo que otro ya resolvió.
- **Factor bus**: ¿cuántas personas tendrían que desaparecer para que el proyecto muera? Si solo tú entiendes un componente, es 1, y nunca te tomarás vacaciones tranquilo.
- **Ritmo**: diez minutos de un compañero mirando tu diseño pueden ahorrarte una semana.

La alternativa es **fallar pronto, rápido y a menudo**: mostrar el trabajo temprano, aceptando que las primeras versiones serán imperfectas. Es el *shifting left* aplicado a las personas.

### Humildad, respeto y confianza

Google apoya la colaboración en tres pilares (HRT: *humility, respect, trust*), y sostiene que casi cualquier conflicto de equipo se rastrea hasta la falta de alguno:

| Pilar | Qué significa | Cómo se ve |
| --- | --- | --- |
| **Humildad** | No lo sabes todo y puedes equivocarte | Pides ayuda, aceptas correcciones, dices "no sé" |
| **Respeto** | Te importan las personas y valoras sus capacidades | Criticas el código, no a la persona; escuchas antes de responder |
| **Confianza** | Asumes que los demás son competentes | Delegas, no microgestionas, asumes buena intención |

Se nota sobre todo en las críticas:

```
Mal:  "Esto está mal. ¿No sabes que hay que cachear estas consultas?"
Bien: "Creo que esta consulta se ejecuta en cada render; ¿qué te parece
       cachearla con useMemo? Si hay una razón para no hacerlo, cuéntame."
```

El segundo describe el problema, propone algo y deja espacio al autor. Al recibir críticas, recuerda que **tú no eres tu código**. Un protocolo útil cuando un comentario te molesta: pausa (no respondas en caliente), reformula lo que entendiste, separa la idea técnica de la forma y decide: si estás de acuerdo, cambia y agradece; si no, explica con datos y, si no hay acuerdo, busquen a un tercero o dejen la decisión escrita.

Cuando algo falla en producción, Google practica el **post-mortem sin culpables**: el objetivo es entender y prevenir, no castigar. Incluye resumen, línea de tiempo, causa raíz, impacto, acciones inmediatas, acciones de prevención y lecciones aprendidas. Si se busca culpables, la gente esconde errores y el sistema deja de aprender.

### Comunicar con intención

*The Pragmatic Programmer* lanza una afirmación provocadora: el idioma que más usas es tu lengua materna, no TypeScript. Correos, tickets, documentación, propuestas: una buena idea mal comunicada es una idea huérfana. Sus consejos, como lista de verificación: sabe qué quieres decir (haz un esquema), conoce a tu audiencia, elige el momento y el estilo, haz que se vea bien, involucra a tu audiencia con borradores, escucha y **responde siempre**, aunque sea "lo miro y te digo mañana".

| Audiencia | Le importa | Mensaje sobre una migración |
| --- | --- | --- |
| Equipo técnico | Cómo y riesgos técnicos | "Pasamos pedidos de REST a eventos; el riesgo principal es el orden de los mensajes" |
| Producto | Impacto en usuarios y fechas | "Dos semanas con reportes 5 min atrasados; después, en tiempo real" |
| Dirección | Costo, beneficio, riesgo | "Seis semanas de inversión; reduce incidentes de pedidos ~40 %" |

### Equipos distribuidos: fuentes de verdad

El Gentleman Programming Book, pensando en equipos remotos y en varias zonas horarias, pone la comunicación antes que todo. La clave son las **fuentes de verdad**: una del negocio (Notion, Confluence: qué se espera, por qué, casos borde) y otra del trabajo (los tickets: qué se acordó construir y cuándo). Ante una duda simple, chat; si es compleja o el chat se estanca, una llamada corta; y su resultado **se escribe en el ticket** y se actualiza la fuente de verdad. Dos reglas valiosas: las reuniones no deberían introducir información nueva (primero se actualiza la fuente de verdad) y el ticket guarda lo esencial de lo acordado, no solo un enlace.

Un ticket bien escrito ahorra conversaciones que nadie registra:

```
Título: El login falla con correos que tienen mayúsculas
Contexto: Desde el despliegue del 12/10, quien se registró con "Ana@Mail.com"
  no puede entrar escribiendo "ana@mail.com".
Pasos: 1) Registrar "Test@Example.com". 2) Entrar con "test@example.com".
  Resultado: "credenciales inválidas". Esperado: acceso correcto.
Criterios de aceptación: no distingue mayúsculas; hay un test; los usuarios
  existentes no hacen nada.
Decisión (llamada 14/10 con Producto): normalizamos a minúsculas al guardar.
```

En la comunicación asíncrona: un mensaje completo en lugar de cinco fragmentos, la pregunta al principio, la urgencia explícita y los hilos cerrados con "decidido: opción B, actualizo el ticket".

### Corazón de junior, conocimiento de senior

El capítulo de soft skills del Gentleman Book resume la madurez profesional así: combina la curiosidad, la humildad y la apertura del junior con el criterio y la visión de riesgos del senior, sin quedarte con lo peor de cada etapa (la impulsividad de uno, la rigidez del otro). Contrasta dos líderes: el **mentor** delega, da herramientas en lugar de respuestas y crea autonomía; el que **completa tareas** ("déjame que lo hago yo") lo resuelve todo, no forma a nadie y se convierte en un factor bus de 1.

Como aprendiz, el consejo es **intentar primero y explicar lo que intentaste** antes de pedir ayuda:

```
Contexto:  Agrego el filtro por fecha en /reportes (ticket #231).
Problema:  Los reportes del último día no aparecen.
Intenté:   1) Las fechas llegan bien. 2) En SQL directo tampoco aparecen.
Sospecha:  Comparo con medianoche en vez de con el final del día.
Pregunta:  ¿Hay una utilidad de fechas en el proyecto para esto?
```

Esta plantilla aplica a la vez "sabe qué quieres decir", la humildad de no esconderse y el respeto por el tiempo de los demás.

### Errores comunes

- **"Es temporal"** en código de larga vida: lo temporal suele quedarse años. Y al revés: sobre-ingeniería en un script de una vez.
- **Confundir "no está en el contrato" con "nadie depende de esto".**
- **Decidir sin registrar el porqué**: la decisión se vuelve intocable o se revierte a ciegas.
- **Ver la limpieza como algo "para cuando haya tiempo"** o pedir el gran rediseño en lugar de mejorar en cada cambio.
- **Confundir "suficientemente bueno" con "da igual".**
- **Esconder el trabajo hasta que esté perfecto** y confundir franqueza con dureza.
- **Decidir en chats o llamadas sin dejar rastro** y post-mortems que buscan culpables.

### Resumen

La ingeniería de software es programación integrada en el tiempo: exige sostenibilidad, procesos que escalen y trade-offs explícitos. La ley de Hyrum convierte todo lo observable en contrato, y la regla de Beyoncé te pide proteger con tests lo que te importa. La actitud pragmática es asumir responsabilidad, ofrecer opciones, no vivir con ventanas rotas y decidir la calidad con los usuarios; Clean Code añade que el desorden te frena hoy, y que la regla del boy scout es la forma sostenible de limpiar. Y el software lo hacen equipos: muestra el trabajo pronto, apóyate en humildad, respeto y confianza, analiza los fallos sin culpables y comunica con intención, dejando las decisiones escritas en una fuente de verdad.

## Conceptos clave

- **Ingeniería de software**: programación integrada en el tiempo; código que se mantiene y cambia durante toda su vida útil.
- **Sostenibilidad**: capacidad de reaccionar a cualquier cambio valioso durante la vida esperada del software.
- **Ley de Hyrum**: con suficientes usuarios, todo comportamiento observable de una API será usado por alguien.
- **Churn rule**: quien cambia la infraestructura es responsable de migrar a sus usuarios.
- **Regla de Beyoncé**: si un comportamiento te importaba, debías protegerlo con un test.
- **Shifting left**: detectar problemas lo antes posible, donde son más baratos.
- **Ventanas rotas**: descuidos visibles que, tolerados, aceleran la degradación del código.
- **Software suficientemente bueno**: nivel de calidad decidido explícitamente con los usuarios.
- **Regla del boy scout**: dejar cada archivo que tocas un poco más limpio, con mejoras pequeñas y seguras.
- **Factor bus**: número de personas que tendrían que desaparecer para que el proyecto se detenga.
- **HRT**: humildad, respeto y confianza, los pilares de la colaboración sana según Google.
- **Post-mortem sin culpables**: análisis de incidentes centrado en causas y prevención, no en castigar.
- **Fuente de verdad**: lugar único y acordado donde vive una información del negocio o del trabajo.

## Preguntas de repaso

1. ¿Qué significa que la ingeniería de software sea "programación integrada en el tiempo"?
   R: Que no basta con producir código que funcione hoy: hay que considerar toda su vida útil, durante la cual cambiarán requisitos, dependencias, plataformas y personas. La ingeniería añade la dimensión del mantenimiento y del cambio sostenible.
2. Enuncia la ley de Hyrum y da un ejemplo propio.
   R: Con suficientes usuarios de una API, todo comportamiento observable será usado por alguien, prometa lo que prometa el contrato. Ejemplo: una API devuelve los campos de un JSON en cierto orden y un cliente los lee por posición; si el servidor los reordena, el cliente se rompe aunque el orden nunca se prometió.
3. ¿Por qué "cada equipo migra su propio código" escala mal y qué hacen Google y la regla de Beyoncé al respecto?
   R: Porque el costo total crece con el número de equipos y cada uno aprende la migración desde cero. Con la churn rule, el equipo que cambia la infraestructura migra a los usuarios, idealmente con herramientas automáticas. La regla de Beyoncé completa el acuerdo: si un cambio pasa la CI pero rompe un producto sin tests, la responsabilidad es de ese producto, así que cada equipo protege con tests lo que le importa.
4. ¿Qué significa "ofrecer opciones, no excusas"?
   R: Ante un problema, presentar alternativas concretas con su costo en lugar de justificar por qué no se pudo. Permite decidir y avanzar, y genera confianza; la excusa solo transfiere el problema.
5. Explica la teoría de las ventanas rotas aplicada al código y qué hacer si no tienes tiempo de arreglar una.
   R: Un descuido visible que se tolera (código feo, TODO eterno, test deshabilitado) normaliza el abandono y acelera la degradación. Si no puedes arreglarlo bien, "tápalo": un ticket visible, un comentario enlazado, un mensaje de no implementado, para dejar claro que alguien lo vio y que no es aceptable.
6. ¿Por qué, según Martin, la única forma de ir rápido es mantener el código limpio, y qué límite tiene la regla del boy scout?
   R: Porque el desorden frena cada cambio de inmediato: entender, modificar y verificar código sucio cuesta más y genera bugs, y la productividad cae hasta casi cero. La regla del boy scout limpia un poco en cada cambio, pero solo con mejoras pequeñas y seguras que no cambian el comportamiento; los cambios de comportamiento van en su propio commit con su test.
7. ¿Por qué esconder tu trabajo hasta que esté terminado es dañino para el proyecto y para ti?
   R: Porque aumenta el riesgo de construir algo equivocado sin feedback, retrasa el aprendizaje y deja el conocimiento en una sola persona (factor bus de 1), lo que es un riesgo para el equipo y te ata a ese componente.
8. Explica los tres pilares HRT con un ejemplo de cada uno en un code review.
   R: Humildad: aceptar un comentario que mejora tu solución aunque te gustara la tuya. Respeto: escribir "esta consulta se ejecuta en cada render, ¿y si la cacheamos?" en lugar de "esto está mal". Confianza: aprobar el cambio correcto de un compañero sin exigir que lo haga exactamente como tú.
9. ¿Qué elementos tiene un post-mortem sin culpables y cuál es su objetivo?
   R: Resumen, línea de tiempo, causa raíz, impacto, acciones inmediatas, acciones de prevención y lecciones aprendidas. Su objetivo es que la organización aprenda y no repita el fallo, no castigar a alguien, para que nadie esconda errores.
10. Según el Gentleman Book, ¿qué haces con lo que se decide en una llamada y por qué las reuniones no deberían introducir información nueva?
   R: Se escribe en el ticket y se actualiza la fuente de verdad enlazada, para que el historial sea trazable. Las reuniones no traen información nueva porque esta debe vivir primero en la fuente de verdad: así todos parten del mismo contexto y nada depende de quién estuvo en la llamada.

## Ejercicio

Escribe en TypeScript un módulo `priceList.ts` con `listPrices(products: Product[]): string[]` y, en un `ANALISIS.md` de máximo una página: (a) lista al menos cinco comportamientos observables de tu función más allá de lo documentado (orden, formato numérico, separador decimal, lista vacía...); (b) di cuáles harías explícitos en el contrato y cuáles documentarías como "no garantizado"; (c) escribe tres tests que escribirías como consumidor para cumplir la regla de Beyoncé. Después redacta dos mensajes de máximo 120 palabras sobre un mismo cambio ("cambiamos el formato de precios a ISO 4217 con dos decimales"): uno para el equipo técnico y otro para producto. Por último, reescribe este comentario de code review para que respete HRT: "Este código es un desastre, nadie usa `var` desde 2015 y las funciones son enormes". Terminado cuando tienes el código con sus tres tests, el análisis, los dos mensajes adaptados a su audiencia y el comentario reescrito.

## Explícalo con tus palabras

Explícale a alguien que solo ha hecho scripts por qué el mismo código puede ser "bueno" como script y "malo" como software de producción, usando la ley de Hyrum y la regla del boy scout en tu explicación.
