---
title: "Proyecto: modelar la clínica Huellitas con patrones y SOLID (antesala de DDD)"
kind: project
hours: 3
sources: Design Patterns (GoF), Adapter (pp. 159–170) y Proxy (pp. 227–238) | Design Patterns (GoF), Observer, State y Strategy (pp. 313–344) | Clean Architecture, partes III y IV, caps. 7–14 (pp. 62–115)
links: Vitest, test.each | https://vitest.dev/api/#test-each
---

## Objetivo

Aplicar a un caso realista lo que viste en las sesiones 3–14: escuchar a una persona del negocio, extraer de su relato los conceptos y las reglas, y modelarlos en TypeScript con patrones y SOLID, sin base de datos ni HTTP. Es un calentamiento para DDD: lo que aquí haces de forma intuitiva (encontrar las palabras del negocio, nombrar las reglas, separar el núcleo de los sistemas externos) es lo que las sesiones 22–29 van a convertir en método.

## Estudio

### El caso: "Huellitas", una clínica veterinaria con dos sedes

Huellitas atiende perros y gatos en dos sedes. Hoy trabajan con una agenda de papel por veterinario, una hoja de cálculo de vacunas por mascota y un programa de facturación de escritorio de hace 12 años que solo funciona en la recepción de la sede principal. La dueña quiere un sistema nuevo. Esta es la transcripción resumida de la primera conversación con ella:

> **Dueña (Marta):** "El mayor problema son las citas. La gente llama, la recepcionista mira la agenda de papel del veterinario y a veces dos personas reservan la misma hora porque la otra sede también agenda para el doctor Ruiz, que trabaja martes y jueves allá. Queremos que los clientes puedan pedir cita por internet, pero solo para consultas generales y vacunas; las cirugías las agenda el veterinario."
>
> "Cada mascota tiene un historial: consultas, diagnósticos, vacunas, peso. Las vacunas tienen refuerzos: la de la rabia es anual; la séxtuple de cachorro tiene tres dosis separadas por tres o cuatro semanas. Queremos avisar al dueño por WhatsApp o correo una semana antes del refuerzo. Hoy eso no lo hace nadie y perdemos clientes."
>
> "Un cliente puede tener varias mascotas, y a veces una mascota tiene dos dueños registrados, por ejemplo una pareja separada que la comparte. Cualquiera de los dos puede traerla."
>
> "Facturamos consultas, vacunas, medicamentos y cirugías. El programa de facturación viejo no lo vamos a cambiar todavía porque el contador lo conoce y está conectado con la DIAN (facturación electrónica). Ese programa acepta un archivo CSV con las ventas del día."
>
> "Los veterinarios necesitan ver el historial completo antes de entrar a la consulta. Las recepcionistas no deberían ver los diagnósticos, solo las citas y la facturación."

### De la conversación al modelo

Antes de escribir una clase, lee el relato buscando tres cosas:

- **Sustantivos que se repiten**: cita, mascota, tutor, veterinario, sede, vacuna, refuerzo, venta. Son candidatos a conceptos del modelo. Fíjate en que Marta dice "dueño" y "cliente" para lo mismo: elige **una** palabra (por ejemplo, *tutor*) y úsala en todo el código.
- **Reglas con forma de frase**: "un veterinario no puede tener dos citas a la misma hora, aunque sean en sedes distintas", "por internet solo se agendan consultas generales y vacunas". Cada regla importante merece un nombre en el código, no un `if` perdido.
- **Cosas que cambian por separado**: el canal de aviso (WhatsApp hoy, quizá SMS mañana), el programa de facturación (se reemplazará algún día), quién puede ver qué. Cada una es un punto de variación que pide una interfaz.

Y donde el relato no responde algo, **no inventes en silencio**: anota la pregunta para la próxima conversación y la suposición que tomas mientras tanto ("Suposición S3: una cita dura 20 minutos").

### Qué patrón para qué parte

| Necesidad del caso | Herramienta del módulo |
| --- | --- |
| La cita pasa por pendiente, confirmada, atendida, cancelada o no asistió, con transiciones permitidas y prohibidas | **State** (sesión 8) |
| La regla "¿se puede agendar esta cita en línea?" combina varias condiciones y puede cambiar | **Strategy / política con nombre** (sesión 8) |
| Cuando se registra una vacuna, hay que programar el recordatorio del refuerzo, y mañana habrá más reacciones | **Observer** (sesión 9) |
| El aviso puede ir por WhatsApp o por correo | **Strategy** detrás de una interfaz (DIP, sesión 12) |
| El programa de facturación viejo recibe un CSV | **Adapter** (sesión 6) detrás de una interfaz que define tu código |
| Las recepcionistas no ven diagnósticos | **Proxy de protección** (sesión 6) |
| Organizar carpetas sin ciclos y con lo estable en el centro | **Principios de componentes** (sesiones 13–14) |

### Reglas del proyecto

- Carpeta `huellitas-modelo/` con un paquete TypeScript y Vitest, más dos documentos Markdown. **Sin base de datos, sin HTTP y sin frameworks.**
- Todos los nombres de clases, métodos y tests salen del glosario del punto 1.
- Ninguna clase del núcleo importa nada del adaptador de facturación ni de los canales de aviso: dependen de interfaces.

### Cómo repartir las 3 horas

| Bloque | Tiempo | Resultado |
| --- | --- | --- |
| 1. Conceptos y reglas | 30 min | Glosario, reglas, preguntas y suposiciones |
| 2. Citas | 50 min | Máquina de estados y política de citas en línea con tests |
| 3. Vacunas y avisos | 40 min | Evento, observador, cálculo del refuerzo y canales |
| 4. Bordes | 35 min | Adapter de facturación y proxy de historial |
| 5. Revisión | 25 min | Revisión SOLID, componentes y notas para DDD |

## Qué hacer

1. **Conceptos y reglas (`docs/01-conceptos.md`).** Un glosario de 12 a 15 términos (definición en una frase y sinónimos que **no** se usan); al menos 8 reglas de negocio escritas como frases del dominio, cada una con identificador (`R1`…); al menos 5 preguntas para la próxima conversación con Marta y las suposiciones numeradas que tomas mientras tanto.
2. **Ciclo de vida de la cita.** Dibuja en ASCII la máquina de estados de una cita (pendiente, confirmada, atendida, cancelada, no asistió) con sus transiciones. Implementa `Appointment` con el patrón **State** (o una unión discriminada con transiciones explícitas): `confirm()`, `attend()`, `cancel(now)`, `markNoShow()`. Una transición no permitida lanza un error con un mensaje del dominio ("una cita atendida no se puede cancelar").
3. **Política de citas en línea.** Implementa `OnlineBookingPolicy` con `canBook(request, schedule)` que devuelve `{ ok: true }` o `{ ok: false, reason }`. Condiciones: el tipo de servicio (solo consulta general y vacunas), que la mascota esté registrada, que el veterinario atienda esa sede ese día y que el horario esté libre **en cualquier sede**. Escribe una tabla de casos en el documento y conviértela en tests parametrizados con `test.each`, uno por fila.
4. **Vacunas y recordatorios.** Una función pura `nextBoosterDate(vaccine, appliedOn, doseNumber)` que cubra la rabia (anual) y la séxtuple de cachorro (tres dosis separadas por 21 a 28 días; elige y documenta la suposición). Al registrar una vacuna se emite un evento `VaccinationRegistered`; un observador `BoosterReminderScheduler` lo recibe y programa un aviso 7 días antes del refuerzo. El aviso sale por una interfaz `ReminderChannel` con dos implementaciones de prueba (WhatsApp y correo) que solo registran el mensaje en memoria.
5. **Facturación legada.** Define una interfaz `DailySalesExport` desde el punto de vista de tu código (`export(day, sales): string`) e implementa `LegacyCsvSalesExport` como **Adapter** que produce el CSV que espera el programa viejo (elige y documenta las columnas). Debe ser **idempotente**: exportar dos veces el mismo día con las mismas ventas produce exactamente el mismo archivo, sin duplicados.
6. **Acceso al historial.** Una interfaz `MedicalRecordReader` con una implementación real en memoria y un **proxy de protección** que, para el rol recepcionista, devuelve el historial sin diagnósticos. El proxy no duplica la lógica de lectura: delega.
7. **Revisión de diseño (`docs/02-revision.md`).** Para cada clase, el actor al que responde (SRP); dónde aplicaste DIP y quién define cada interfaz; un diagrama ASCII de las carpetas (`citas/`, `vacunas/`, `avisos/`, `facturacion/`, `historial/`) con la dirección de las dependencias, sin ciclos (ADP); y cuál de ellas es la más estable y por qué (SDP).
8. **Notas para DDD.** Al final del mismo documento: tres palabras que significan cosas distintas según quién hable (pista: lo que para recepción es una *cita* para el veterinario es una *consulta*), la regla que te parece más valiosa para el negocio y la parte del sistema que comprarías hecha en lugar de construirla. Vas a retomar estas notas en las sesiones 22 y 27.
9. **Tests.** Al menos 15 tests con Vitest cuyos nombres sean frases del glosario (`"no agenda en línea una cirugía"`, `"una cita atendida no se puede cancelar"`).

**Criterio de terminado:** existen los dos documentos y el paquete; `npx vitest run` pasa con al menos 15 tests, incluidos uno por fila de la tabla de casos y uno por transición válida e inválida de la cita; ninguna clase del núcleo importa los adaptadores de facturación ni de avisos; el proxy del historial nunca devuelve diagnósticos a una recepcionista; exportar dos veces el mismo día produce el mismo CSV; y todos los nombres del código están en el glosario.

## Conceptos clave

- **Concepto candidato**: sustantivo que se repite en el relato del negocio y puede convertirse en una clase o un valor del modelo.
- **Regla con nombre**: regla de negocio que vive en un objeto o función con un nombre del dominio, en lugar de un condicional anónimo.
- **Suposición documentada**: decisión provisional ante información faltante, registrada junto con la pregunta que la resolvería.
- **Exportación idempotente**: proceso que puede repetirse sin producir resultados duplicados ni distintos.

## Preguntas de repaso

1. ¿Por qué conviene modelar el ciclo de vida de la cita con State en lugar de un campo `status` y condicionales repartidos?
   R: Porque las transiciones permitidas quedan en un solo lugar y cada estado decide qué operaciones acepta; agregar un estado nuevo no obliga a revisar condicionales dispersos (OCP) y cada transición inválida se puede probar de forma directa.
2. ¿Qué ganas al expresar la regla de citas en línea como una política con nombre y una tabla de casos?
   R: La regla se lee con el lenguaje del negocio, se puede cambiar o reemplazar sin tocar quien la usa, y la tabla obliga a pensar todas las combinaciones de condiciones; además revela casos que el relato no responde y se traduce directamente en tests parametrizados.
3. ¿Por qué la interfaz de exportación la define tu código y no el programa de facturación?
   R: Por DIP: el núcleo depende de una abstracción que expresa lo que él necesita, y el adaptador se encarga del formato del programa viejo. Cuando la clínica cambie de facturación, solo se reemplaza el adaptador y el núcleo no se entera.
4. ¿Cómo harías idempotente la exportación del CSV de un día?
   R: Generando el archivo de forma determinista a partir de las ventas de ese día (mismo orden, mismo formato) e identificando cada venta con una clave única, de modo que reexportar sobrescriba el archivo con el mismo contenido en lugar de agregar filas duplicadas.

## Explícalo con tus palabras

Explícale a Marta, sin palabras técnicas, qué partes de su relato se volvieron reglas del sistema, qué preguntas le vas a hacer en la próxima conversación y por qué el programa de facturación viejo quedó "detrás de un enchufe" que se puede cambiar.
