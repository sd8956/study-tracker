---
title: "Proyecto: descomponer un monolito en un documento de diseño"
kind: project
hours: 3
sources: Building Microservices 2nd ed., caps. 2–6 (pp. 57–249) | Hands-On Microservices with Kubernetes, cap. 2 "Creating a data strategy" (pp. 62–69)
links: Martin Fowler — StranglerFigApplication | https://martinfowler.com/bliki/StranglerFigApplication.html ; Architecture Decision Records | https://adr.github.io/
---

## Objetivo

Escribir un documento de diseño que proponga cómo dividir un monolito concreto en servicios: fronteras justificadas, contratos (APIs y eventos), propiedad de los datos, flujos con sagas y un plan de migración incremental con strangler fig. Integra todo lo visto en las sesiones 01–07.

## Estudio

### El sistema: "AulaViva", un monolito de cursos en línea

AulaViva es una plataforma de cursos en línea con 60 desarrolladores repartidos en 7 equipos. Hoy es un monolito en Node.js (Express) con una base PostgreSQL de 140 tablas. Se despliega cada dos semanas en un release coordinado que suele tomar una noche entera.

**Funcionalidades actuales:**

1. **Catálogo**: cursos, lecciones, instructores, categorías, búsqueda por texto.
2. **Cuentas**: registro, login, perfiles, preferencias de notificación.
3. **Compras**: carrito, cupones de descuento, cobro con tarjeta a través de una pasarela externa, facturas.
4. **Suscripciones**: plan mensual o anual que da acceso a todo el catálogo; renovaciones automáticas.
5. **Aprendizaje**: inscripción a cursos, progreso por lección, entrega de tareas, certificados al completar.
6. **Video**: subida de videos por instructores, transcodificación (proceso lento: 10–40 minutos por video), entrega por CDN.
7. **Notificaciones**: emails y push (bienvenida, recibos, recordatorios de estudio, certificados).
8. **Reseñas**: calificación y comentarios por curso, moderación.
9. **Pagos a instructores**: cálculo mensual de regalías según minutos vistos y ventas.
10. **Reportes**: panel interno para negocio y finanzas, consultas SQL directas a la base de producción.

**Dolores reportados:**

- La transcodificación de videos consume CPU del mismo servidor que atiende el checkout; los lunes, cuando los instructores suben contenido, las compras se vuelven lentas.
- El equipo de Compras quiere desplegar varias veces por semana para experimentar con precios, pero el release es quincenal.
- Un cambio en la tabla `enrollments` hecho por el equipo de Aprendizaje rompió el cálculo de regalías, porque Pagos a instructores lee esa tabla directamente.
- El panel de reportes ejecuta consultas pesadas contra la base de producción y en fin de mes degrada el sitio.
- La tabla `users` tiene 70 columnas y la usan todos los módulos.

**Datos clave (tablas más relevantes):** `users`, `profiles`, `courses`, `lessons`, `instructors`, `carts`, `orders`, `order_items`, `coupons`, `payments`, `invoices`, `subscriptions`, `enrollments`, `lesson_progress`, `submissions`, `certificates`, `videos`, `video_renditions`, `notifications_log`, `reviews`, `royalty_statements`.

**Flujos críticos:**

- **Comprar un curso**: carrito → cupón → cobro → crear orden → inscripción → factura → email.
- **Completar un curso**: progreso de la última lección → certificado → email → actualizar estadísticas del instructor.
- **Cierre mensual de regalías**: minutos vistos por curso + ventas → monto por instructor → pago.

### Estructura del documento de diseño

Tu entregable es un archivo `design-aulaviva.md` (entre 2.500 y 4.000 palabras, con diagramas ASCII) con estas secciones:

1. **Contexto y objetivos.** Qué problemas resuelves, con metas medibles (por ejemplo, "Compras despliega a demanda, al menos 3 veces por semana"; "la transcodificación no afecta la latencia p95 del checkout").
2. **Alternativas descartadas.** Al menos dos (por ejemplo, escalar verticalmente; monolito modular sin servicios) y por qué no bastan o por qué sí resuelven una parte.
3. **Mapa de bounded contexts.** Diagrama con los contextos y sus relaciones.
4. **Servicios propuestos.** Una tabla: servicio, responsabilidad, equipo dueño, datos que posee, aggregates.
5. **Contratos.** Para cada servicio, sus APIs (endpoints principales o RPC) y los eventos que publica y consume, con un ejemplo de payload completo para al menos tres eventos.
6. **Propiedad de datos.** Qué tabla va a qué servicio; cómo se rompe la tabla `users`; qué pasa con los joins actuales (al menos dos ejemplos) y con las foreign keys.
7. **Flujos.** Los tres flujos críticos con el estilo de comunicación de cada paso (síncrono, asíncrono, evento) y una saga diseñada para "comprar un curso", con compensaciones y elección de orquestación o coreografía.
8. **Reporting y regalías.** Cómo se alimentan sin leer las bases de los servicios.
9. **Plan de migración.** Fases con strangler fig: orden de extracción justificado, qué se intercepta y dónde, parallel run donde aplique, feature toggles, criterio de éxito y plan de rollback por fase.
10. **Riesgos y preguntas abiertas.** Al menos cinco riesgos con mitigación.
11. **ADRs.** Al menos tres decisiones registradas en formato corto (contexto, decisión, consecuencias).

### Pistas (sin dar la solución)

- No todo debe ser un servicio. Pregúntate qué se queda en el monolito al final del primer año.
- El dolor del video sugiere un buen primer candidato: pocas dependencias, perfil de carga muy distinto, naturalmente asíncrono.
- La tabla `users` con 70 columnas suele esconder varios conceptos: identidad (login), perfil público, preferencias, datos de facturación. Cada uno puede tener un dueño distinto.
- Regalías y reportes leen datos de muchos contextos: piensa en eventos y en una base de reporting.
- Revisa cada propuesta con la checklist de la sesión 02 (simular cambios, estado compartido, pass-through, dependencias, aggregates, lenguaje).

### Ejemplo de ADR

```markdown
## ADR-003: Video como primer servicio extraído

Contexto: la transcodificación compite por CPU con el checkout; el módulo de video
tiene 2 dependencias entrantes y 3 tablas propias.
Decisión: extraer Video en la fase 1, con una cola para trabajos de transcodificación.
Consecuencias: + aislamiento de carga y fallos; + el equipo aprende a operar un servicio
con bajo riesgo de negocio. – Hay que introducir un broker y un pipeline nuevo.
```

## Qué hacer

1. **Lee el caso dos veces** y subraya los verbos de negocio y los dolores. Escribe en una línea el objetivo principal de la migración (15 min).
2. **Haz un Event Storming individual**: lista en orden temporal los eventos de dominio de los tres flujos críticos (`CourseAddedToCart`, `PaymentCaptured`...). Agrúpalos para descubrir contextos (25 min).
3. **Dibuja el mapa de contextos** y la tabla de servicios con equipos dueños. Aplica la checklist de la sesión 02 y ajusta (30 min).
4. **Asigna cada tabla a un único dueño.** Marca los joins y foreign keys que se rompen y decide una estrategia para cada uno (API en lote, copia por eventos, soft delete) (20 min).
5. **Define contratos**: endpoints principales y eventos con payload completo. Aplica expansion changes y versionado en el nombre del tópico o la ruta (20 min).
6. **Diseña la saga de compra**: pasos, estados, fallos de negocio vs. técnicos, compensaciones, orden de pasos, orquestación o coreografía y outbox (25 min).
7. **Escribe el plan de migración** por fases con strangler fig, criterio de éxito y rollback por fase (25 min).
8. **Cierra con riesgos y ADRs** y relee el documento como si fueras un revisor escéptico: ¿alguna frontera obliga a desplegar dos servicios juntos? (20 min).

### Rúbrica (100 puntos)

| Criterio | Puntos | Qué se espera para la nota máxima |
| --- | --- | --- |
| Objetivos y alternativas | 10 | Metas medibles ligadas a los dolores; dos alternativas evaluadas con honestidad |
| Fronteras | 20 | Servicios alineados a contextos; cada uno con dueño; ningún aggregate partido; justificación con cohesión y acoplamiento |
| Datos | 15 | Cada tabla con un dueño; `users` descompuesta; joins y foreign keys con estrategia concreta |
| Contratos | 15 | APIs y eventos explícitos; payloads completos; estrategia de evolución |
| Flujos y saga | 15 | Estilos justificados por paso; saga con estados, compensaciones y orden razonado; outbox o equivalente |
| Migración | 15 | Fases pequeñas y reversibles; primer servicio bien elegido; strangler fig y parallel run donde aplique; plan de datos con fecha |
| Riesgos y ADRs | 10 | Al menos cinco riesgos realistas con mitigación; tres ADRs claros |

Criterio de terminado: el documento cubre las 11 secciones, alcanza al menos 80 puntos en tu autoevaluación con la rúbrica, y ningún servicio propuesto necesita desplegarse en lockstep con otro para los tres flujos críticos. Si tienes el tutor configurado, pídele que evalúe el documento con esta rúbrica.

## Conceptos clave

- **Documento de diseño**: propuesta escrita que expone contexto, opciones, decisión y consecuencias para que otros la revisen.
- **ADR (Architecture Decision Record)**: registro breve de una decisión de arquitectura con su contexto y consecuencias.
- **Mapa de contextos**: diagrama de bounded contexts y sus relaciones.
- **Plan de migración por fases**: secuencia de pasos pequeños, reversibles y medibles hacia la arquitectura objetivo.

## Preguntas de repaso

1. ¿Por qué el documento debe incluir alternativas descartadas?
   R: Porque obliga a demostrar que los microservicios son necesarios para el objetivo y no un fin en sí mismos, y muestra a los revisores que se consideraron opciones más baratas como escalar o modularizar el monolito.
2. ¿Qué hace de Video un buen primer servicio en AulaViva?
   R: Tiene pocas dependencias entrantes, datos propios que no participan en joins centrales, un perfil de carga muy distinto que hoy perjudica al checkout y un flujo naturalmente asíncrono; además su fallo no bloquea el flujo de dinero, así que el riesgo de aprendizaje es bajo.
3. ¿Cómo eliminarías la lectura directa de `enrollments` por parte de Pagos a instructores?
   R: Haciendo que Aprendizaje sea el único dueño de esa tabla y publique eventos (por ejemplo, LessonWatched con minutos vistos o un resumen diario) que el servicio de regalías consuma para mantener su propia vista, o alimentando una base de reporting con un contrato versionado.
4. ¿Qué debe contener cada fase del plan de migración?
   R: Qué se extrae o intercepta, cómo se verifica el éxito con una métrica ligada al objetivo, cómo se revierte, y cuándo se separan los datos, de modo que cada fase sea pequeña y reversible.

## Explícalo con tus palabras

Explica en tres frases a un gerente no técnico por qué la migración de AulaViva empieza por el video y no por las compras.
