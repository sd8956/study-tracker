---
title: "Proyecto: del levantamiento de requisitos a los modelos (clínica veterinaria)"
kind: project
hours: 3
sources: Systems Analysis and Design 9.ª ed., caps. 4, 5, 6, 9 y 10 (pp. 162–510) | Design Patterns (GoF), cap. 1 (pp. 21–52)
links: Mermaid Live Editor | https://mermaid.live ; dbdiagram.io para ERD | https://dbdiagram.io
---

## Objetivo

Aplicar de punta a punta el bloque de análisis y modelado (sesiones 16–20) a un caso realista: levantar requisitos, modelar procesos y datos, modelar objetos con UML, diseñar la base de datos normalizada y documentar las decisiones de arquitectura del sistema, dejando un paquete de modelos que otro desarrollador podría usar para empezar a construir.

## Estudio

### El caso: "Huellitas", una clínica veterinaria con dos sedes

Huellitas atiende perros y gatos en dos sedes. Hoy trabajan con una agenda de papel por veterinario, una hoja de cálculo de vacunas por mascota y un programa de facturación de escritorio de hace 12 años que solo funciona en la recepción de la sede principal. La dueña quiere un sistema nuevo. Esta es la transcripción resumida de la primera entrevista (tómala como tu material de fact-finding):

> **Dueña (Marta):** "El mayor problema son las citas. La gente llama, la recepcionista mira la agenda de papel del veterinario y a veces dos personas reservan la misma hora porque la otra sede también agenda para el doctor Ruiz, que trabaja martes y jueves allá. Queremos que los clientes puedan pedir cita por internet, pero solo para consultas generales y vacunas; las cirugías las agenda el veterinario."
>
> "Cada mascota tiene un historial: consultas, diagnósticos, vacunas, peso. Las vacunas tienen refuerzos: la de la rabia es anual; la séxtuple de cachorro tiene tres dosis separadas por tres o cuatro semanas. Queremos avisar al dueño por WhatsApp o correo una semana antes del refuerzo. Hoy eso no lo hace nadie y perdemos clientes."
>
> "Un cliente puede tener varias mascotas, y a veces una mascota tiene dos dueños registrados, por ejemplo una pareja separada que la comparte. Cualquiera de los dos puede traerla."
>
> "Facturamos consultas, vacunas, medicamentos y cirugías. El programa de facturación viejo no lo vamos a cambiar todavía porque el contador lo conoce y está conectado con la DIAN (facturación electrónica). Ese programa acepta un archivo CSV con las ventas del día."
>
> "Los veterinarios necesitan ver el historial completo antes de entrar a la consulta, desde el computador del consultorio o la tablet. Las recepcionistas no deberían ver los diagnósticos, solo las citas y la facturación. Yo quiero un reporte mensual de ingresos por sede y por veterinario."
>
> "En temporada de vacunación (marzo y octubre) tenemos el triple de citas. El año que viene abrimos una tercera sede."

### Reglas del proyecto

- Trabaja en una carpeta `huellitas-modelos/` con archivos Markdown y diagramas como texto (Mermaid o ASCII). Si escribes código, usa TypeScript y Vitest.
- Cuando el caso no responda algo, **no inventes en silencio**: escribe la pregunta que harías en la siguiente entrevista y la suposición que tomas mientras tanto (por ejemplo, "Suposición S3: una cita dura 20 minutos salvo cirugías").
- Cada artefacto debe ser coherente con los demás: los mismos nombres en requisitos, DFD, diccionario, clases y tablas.

### Cómo repartir las 3 horas

| Bloque | Tiempo | Entregables |
| --- | --- | --- |
| 1. Requisitos | 35 min | Lista de requisitos, preguntas abiertas, suposiciones |
| 2. Procesos y datos | 35 min | Diagrama de contexto, diagrama 0, diccionario |
| 3. Objetos | 40 min | Casos de uso, clases, secuencia, estados |
| 4. Datos físicos | 35 min | ERD, normalización, DDL |
| 5. Arquitectura y cierre | 35 min | ADR, matriz de trazabilidad, autoevaluación |

## Qué hacer

1. **Requisitos (`01-requisitos.md`).** Escribe al menos 20 requisitos verificables clasificados en salidas, entradas, procesos, rendimiento y controles (mínimo 3 por categoría), cada uno con identificador (`R-01`). Incluye al menos: la regla de no solapar citas de un veterinario entre sedes, la restricción de citas en línea (solo consulta general y vacunas), los recordatorios de refuerzo una semana antes, la separación de permisos entre veterinarios y recepcionistas y el requisito de capacidad en temporada alta. Agrega una sección de **preguntas para la próxima entrevista** (mínimo 5) y otra de **suposiciones** numeradas.
2. **FDD y procesos (`02-procesos.md`).** Dibuja un diagrama de descomposición funcional del sistema, el **diagrama de contexto** (con al menos 5 entidades externas: cliente, veterinario, recepcionista, sistema de facturación legado, servicio de mensajería) y el **diagrama 0** con 5 a 8 procesos y sus almacenes. Revisa que no haya agujeros negros, grises ni generación espontánea.
3. **Lógica de procesos.** Describe con una **tabla de decisión** la regla "¿puede este cliente reservar esta cita en línea?" (condiciones sugeridas: tipo de servicio, si la mascota está registrada, si el veterinario atiende esa sede ese día, si el horario está libre) y con **pseudocódigo** el cálculo de la fecha del próximo refuerzo de una vacuna.
4. **Diccionario de datos (`03-diccionario.md`).** Documenta al menos 10 elementos (con tipo, formato, valores válidos, fuente, seguridad y alias cuando existan), 3 flujos y 3 almacenes.
5. **Modelo de objetos (`04-uml.md`).** Diagrama de casos de uso con los actores del caso, al menos un «include» y un «extend». Descripción completa (actor, disparador, precondición, pasos, postcondición, flujos alternativos) de **"Agendar cita en línea"** y **"Registrar vacunación"**. Diagrama de clases con al menos 7 clases y su cardinalidad (incluida la relación mascota–dueño, que es M:N). Diagrama de secuencia de "Agendar cita en línea". Diagrama de estados de una cita (pendiente, confirmada, atendida, cancelada, no asistió).
6. **Diseño de datos (`05-datos.md`).** ERD en notación pata de gallo. Parte de una tabla "plana" como la hoja de cálculo actual de vacunas (`mascota, dueños, vacunas aplicadas con fecha y lote`) y llévala paso a paso a 3NF explicando qué dependencia eliminas en cada paso. Escribe el DDL final para SQLite con claves primarias, foráneas, `CHECK` y al menos un índice justificado.
7. **Arquitectura del sistema (`06-arquitectura.md`).** Escribe 3 ADR: (a) estilo de arquitectura (tres capas, quién es cliente y quién servidor, dónde viven las reglas); (b) integración con la facturación legada mediante un **lote diario** que genera el CSV (incluye cómo lo harás idempotente); (c) recordatorios de vacunas: en línea o por lotes, y por qué. Revisa la lista de verificación de la sesión 20 y anota cómo afecta cada punto (escalabilidad por la tercera sede y la temporada alta, seguridad por los diagnósticos, legado por la facturación).
8. **Prueba de concepto mínima en TypeScript (`poc/`).** Implementa solo el núcleo de dominio de las citas: `Appointment` con su máquina de estados y una función pura `canBookOnline(request, schedule)` que implemente tu tabla de decisión. Escribe tests con Vitest: uno por regla de la tabla de decisión y uno por transición del diagrama de estados (válidas e inválidas).
9. **Matriz de trazabilidad (`07-trazabilidad.md`).** Una tabla que, para al menos 10 requisitos, indique en qué proceso del DFD, caso de uso, clase, tabla y test aparece.
10. **Autoevaluación.** Responde por escrito las preguntas de repaso de esta sesión y anota qué parte del modelado te costó más.

**Criterio de terminado:** existen los 7 archivos Markdown y la carpeta `poc/`; todos los requisitos son verificables (sin "rápido", "fácil" o "seguro" sin métrica); el DFD no tiene errores de conexión y el diagrama hijo (si lo hiciste) está balanceado; la relación M:N mascota–dueño aparece resuelta con una entidad asociativa en el ERD; el DDL se ejecuta en SQLite sin errores; los tests de la prueba de concepto pasan; la matriz de trazabilidad conecta al menos 10 requisitos con sus artefactos.

## Conceptos clave

- **Trazabilidad**: capacidad de seguir un requisito hasta los modelos, el código y los tests que lo implementan y verifican.
- **Suposición documentada**: decisión provisional ante información faltante, registrada junto con la pregunta que la resolvería.
- **Coherencia de modelos**: uso de los mismos nombres y reglas en requisitos, DFD, diccionario, clases y tablas.
- **Lote idempotente**: proceso por lotes que puede reejecutarse sin producir resultados duplicados.

## Preguntas de repaso

1. ¿Por qué la relación entre mascota y dueño necesita una entidad asociativa y qué atributos podría tener?
   R: Porque es M:N: un dueño puede tener varias mascotas y una mascota puede tener varios dueños. La entidad asociativa (por ejemplo, TUTORÍA o RESPONSABLE) puede guardar la fecha desde la que es responsable, si es el contacto principal para recordatorios y si está autorizado a aprobar tratamientos.
2. ¿Qué requisito del caso influye más en la arquitectura y por qué?
   R: Varios compiten, pero la convivencia con la facturación legada y la separación de permisos sobre diagnósticos son decisivos: el primero obliga a un proceso por lotes y a una capa de traducción hacia el CSV; el segundo obliga a controlar el acceso en la capa de aplicación y no en las pantallas. La capacidad en temporada alta y la tercera sede fuerzan además a diseñar para escalar.
3. ¿Por qué conviene una tabla de decisión para la regla de citas en línea?
   R: Porque combina varias condiciones (tipo de servicio, mascota registrada, veterinario en esa sede ese día, horario libre); la tabla obliga a considerar todas las combinaciones, revela casos no especificados que hay que preguntar al negocio y se traduce directamente en tests parametrizados.
4. ¿Cómo harías idempotente el lote que genera el CSV de facturación?
   R: Identificando cada venta con una clave única, registrando qué ventas ya se exportaron (o generando el archivo de un día de forma determinista a partir de los datos de ese día) y sobrescribiendo en lugar de agregar, de modo que reejecutar el lote produzca exactamente el mismo archivo sin ventas duplicadas.

## Explícalo con tus palabras

Presenta en cinco minutos, como si fuera a Marta, el modelo que construiste: qué problemas de su entrevista resuelve, qué preguntas quedaron abiertas y qué decisiones tomaste con suposiciones.
