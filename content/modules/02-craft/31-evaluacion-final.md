---
title: Evaluación final — oficio, código limpio y prácticas de ingeniería
kind: evaluation
hours: 3
sources: Sesiones 1–30 de este módulo | The Pragmatic Programmer, 20.ª ed. | Clean Code, caps. 1–10, 12 y 17 | Software Engineering at Google, caps. 1–3, 8–16, 19–20, 23–24 | Gentleman Programming Book, caps. 1–3, 7, 8, 10, 13, 17 y 18
---

## Objetivo

Demostrar que dominas el módulo completo: la mentalidad de ingeniería en el tiempo, el código limpio a escala de función y clase, los principios de diseño y la arquitectura básica, el testing (unitario, dobles, tests grandes y propiedades) y las prácticas de equipo (estilo, code review, documentación, control de versiones, deprecación y CI/CD).

## Estudio

### Cómo hacer esta evaluación

1. **Primeros 90 minutos: sin apuntes.** Responde todas las preguntas por escrito o en voz alta con el tutor. Las que piden código, escríbelo en TypeScript en tu editor.
2. **Siguientes 45 minutos: corrección.** Compara con las respuestas modelo o envía tus respuestas al tutor. Marca cada pregunta como "bien", "parcial" o "mal".
3. **Últimos 45 minutos: reparación.** Para cada "parcial" o "mal", vuelve a la sesión correspondiente, repasa solo lo necesario y reescribe la respuesta. Los temas débiles quedarán con más frecuencia en tu repaso espaciado.

Criterio de aprobado: al menos 11 de 14 preguntas "bien" en la primera parte. Si no llegas, repasa y repite la evaluación en una semana.

## Preguntas de evaluación

1. Un equipo quiere cambiar el formato de los mensajes de error de su API pública de texto libre a un objeto JSON con código y mensaje. Analiza el cambio con tiempo, escala, trade-offs y la ley de Hyrum, y propone un plan.
   R: Tiempo: la API vivirá años, así que conviene hacer el cambio ahora si mejora la mantenibilidad. Hyrum: aunque el contrato no prometía el texto, algunos clientes lo parsean; cambiarlo romperá a alguien. Escala: si hay muchos consumidores, migrar uno a uno es caro. Plan: introducir el nuevo formato de forma opt-in (versión nueva o cabecera), marcar el viejo como deprecado con aviso accionable y guía de migración, descubrir consumidores con logs, migrar o ayudar a migrar (churn rule), bloquear usos nuevos del formato viejo y retirarlo con fecha (deprecación obligatoria), documentando el trade-off y la decisión.
2. Explica por qué la frase "lo limpiamos después" casi nunca se cumple, usando las ventanas rotas, el costo del desorden de Clean Code y la metáfora del jardín.
   R: Cada atajo es una ventana rota que normaliza el descuido e invita a más deterioro; el desorden frena cada cambio y la productividad cae hasta casi cero, de modo que nunca aparece "tiempo libre" para limpiar. Como un jardín, el código necesita cuidado continuo: refactorizar pronto y a menudo, en pasos pequeños, con la regla del boy scout en cada cambio, en lugar de esperar a una gran limpieza o a un rediseño total que rara vez alcanza al sistema vivo.
3. Reescribe mentalmente `function save(u: any, notify: boolean, t: number)` según las reglas de nombres y funciones, explicando cada cambio.
   R: Tipar el usuario (`user: User`) para eliminar `any`; dar un nombre que diga qué se guarda y dónde (`saveUser`); eliminar el flag `notify` separando en dos funciones (`saveUser` y `notifyUserSaved`, o un caso de uso que las orqueste) porque un booleano indica que la función hace dos cosas; sustituir el número `t` por un concepto con nombre (por ejemplo, `ttlSeconds` o un tipo `RetentionPolicy`), o sacarlo a configuración si es un valor que cambia; y asegurar CQS: si guarda, no devuelve información además de confirmarlo.
4. ¿Cuándo es aceptable un comentario en el código? Da dos ejemplos buenos y dos malos.
   R: Cuando aporta información que el código no puede expresar: el porqué de una decisión no obvia, una advertencia de consecuencias, una aclaración de un formato externo, un TODO con ticket o la documentación de una API pública. Buenos: "una sola conexión porque SQLite bloquea la base en cada escritura"; "rodeo al bug #1234 de la librería, quitar en la v4". Malos: "// incrementa el contador" (redundante) y código comentado "por si acaso" (lo conserva Git).
5. Explica con un ejemplo en TypeScript la diferencia entre "ask" y "tell" y su relación con la Ley de Demeter y la envidia de funcionalidad.
   R: Ask: `if (order.getCustomer().getWallet().getBalance() >= order.total()) order.markPaid()`, donde el cliente navega por la estructura interna (viola Demeter) y toma decisiones que pertenecen a otros objetos (envidia de funcionalidad). Tell: `order.pay()`, que internamente delega en `customer.pay(amount)` y este en `wallet.withdraw(amount)`; cada objeto protege sus reglas y su estructura, y los cambios en ella no se propagan.
6. Diseña el manejo de errores de una función `importSessions(files)` que lee archivos de contenido: qué errores se devuelven como `Result`, cuáles se lanzan, dónde hay aserciones y por qué no se devuelve `null`.
   R: Los errores esperados por archivo (frontmatter ausente, `hours` inválido, `kind` desconocido) se devuelven como `Result` por archivo, con el nombre del archivo, para no detener la importación de los demás. Los fallos de infraestructura (no se puede leer el directorio) se lanzan como excepción con contexto y `cause` y se capturan en la frontera. Las aserciones protegen lo que no puede pasar si el código es correcto (por ejemplo, que el parser nunca devuelve `ok` con `hours` distinto de 2 o 3). No se devuelve `null`: si no hay archivos, se devuelve una lista vacía.
7. Explica DRY y ortogonalidad con un ejemplo donde fusionar dos funciones parecidas empeoraría el diseño.
   R: DRY exige que cada pieza de conocimiento tenga una única representación autorizada; la ortogonalidad exige que cambiar una cosa no afecte a otras. Ejemplo: `validateSessionHours` (2 o 3 horas) y `validateEnglishMinutes` (60 minutos) podrían compartir hoy la forma "número en un conjunto permitido", pero son reglas distintas; fusionarlas en una función con parámetros acoplaría dos ejes de cambio independientes, de modo que cambiar la regla del inglés podría romper la de las sesiones.
8. ¿Por qué "favorece la composición sobre la herencia"? Relaciónalo con el impuesto de la herencia, las clases pequeñas y SRP.
   R: La herencia acopla la subclase a la implementación de todos sus ancestros (clase base frágil) y expone toda su API; las jerarquías no encajan bien cuando un objeto pertenece a varias categorías. La composición con interfaces y delegación permite combinar responsabilidades pequeñas y cohesivas (SRP), reemplazar piezas por separado (ortogonalidad) y probar con dobles inyectados.
9. Dibuja en texto la estructura hexagonal del caso de uso "marcar una sesión como completada" en esta app, con sus puertos y adaptadores, y explica la regla de dependencia.
   R: Centro: dominio (`Session`, regla de secuencia: solo se completa la siguiente pendiente) y servicio `CompleteSession`. Puerto driver: `ForCompletingSessions.complete(sessionKey)`; adaptadores driver: una ruta HTTP de Next.js y los tests. Puertos driven: `ForStoringProgress` y `ForSchedulingReviews`, más un reloj; adaptadores driven: SQLite y fakes en memoria. Regla de dependencia: el dominio y el servicio no importan nada de Next.js ni de SQLite; los adaptadores dependen de los puertos, nunca al revés.
10. Clasifica estos tests por tamaño y alcance y di cuáles pondrías en presubmit: (a) función pura de proyección de fechas; (b) repositorio contra SQLite en un archivo temporal; (c) navegador recorriendo la vista de hoy contra la app arrancada.
   R: (a) tamaño pequeño, alcance estrecho; (b) tamaño mediano (una máquina, disco), alcance medio; (c) tamaño mediano o grande según dónde corra la app, alcance amplio. En presubmit irían (a) y (b) por ser rápidos y fiables; (c) iría en postsubmit o antes del release, salvo uno o dos flujos críticos si son rápidos y estables.
11. Un compañero escribe un test que verifica con mocks que `ReviewService` llama a `repository.findDue`, luego a `repository.markShown` y luego a `notifier.send`. ¿Qué problemas tiene y cómo lo reescribirías?
   R: Prueba interacciones en lugar de estado, verifica llamadas de lectura (`findDue`), sobreespecifica el orden y ata el test a la implementación: cualquier refactor lo rompe aunque el comportamiento no cambie, y puede pasar aunque el resultado sea incorrecto. Reescritura: usar un repositorio fake con datos sembrados, ejecutar el servicio y comprobar el estado resultante (las tarjetas quedan marcadas como mostradas) y dejar un mock solo para `notifier.send`, verificando que se llamó una vez con el destinatario correcto.
12. Escribe dos propiedades de `fast-check` para `projectSchedule(sessions, from)` y explica qué es el shrinking.
   R: Propiedad 1: para cualquier lista de sesiones y cualquier fecha de inicio, ninguna sesión planificada cae en domingo. Propiedad 2: las sesiones planificadas conservan el orden de entrada y sus fechas no decrecen (y hay tantas planificadas como sesiones recibidas). El shrinking es la reducción automática de un contraejemplo hasta el caso mínimo que sigue fallando, para que el bug sea evidente.
13. Diseña la política de un equipo de cinco personas para estilo, code review y control de versiones, citando al menos cinco prácticas del módulo.
   R: Estilo: guía breve con reglas justificadas por categoría, aplicada por Prettier, ESLint y `tsc` estricto en el editor, en pre-commit y en CI, para que no se discuta en reviews. Review: un revisor por PR, PR de unas 200 líneas como máximo, descripción con qué, por qué y cómo se probó, comentarios clasificados y amables, CODEOWNERS por carpeta. Control de versiones: trunk-based con ramas de horas, feature flags para lo incompleto, una sola versión de cada dependencia con lockfile, Conventional Commits y "si main se rompe, se revierte primero". Documentación en el repositorio con dueño, y ADR para las decisiones.
14. Explica la diferencia entre integración continua y entrega continua, y por qué el kit de inicio pragmático exige "ningún procedimiento manual".
   R: La integración continua verifica automáticamente cada cambio con el resto del ecosistema (presubmit, postsubmit, build continuo) para detectar incompatibilidades lo antes posible. La entrega continua automatiza la creación y promoción de versiones desplegables en cambios pequeños y frecuentes, aislados por feature flags y evaluados con datos. Se exige automatización total porque los procedimientos manuales son inconsistentes, dependen de personas concretas, no escalan y no dejan registro, lo que convierte cada release en un riesgo.

## Explícalo con tus palabras

Elige las tres ideas del módulo que más van a cambiar tu forma de programar y explica cada una en un minuto, con un ejemplo de tu propio código.
