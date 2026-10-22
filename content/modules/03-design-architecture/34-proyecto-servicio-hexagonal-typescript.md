---
title: "Proyecto: servicio hexagonal en TypeScript con puertos, adaptadores y tests"
kind: project
hours: 3
sources: Clean Architecture, caps. 17, 20–23, 26 y 34 (pp. 133–184, 225–240) | Domain-Driven Design (Evans), caps. 4–6 (pp. 51–114) | Design Patterns (GoF), Adapter y Facade (pp. 159–170, 205–214)
links: Node.js, módulo node:sqlite | https://nodejs.org/api/sqlite.html ; Node.js, módulo node:http | https://nodejs.org/api/http.html ; Vitest | https://vitest.dev/guide/
---

## Objetivo

Construir de punta a punta un servicio pequeño con arquitectura hexagonal (Clean Architecture) en TypeScript: un núcleo de dominio y casos de uso sin dependencias técnicas, puertos definidos por la aplicación, adaptadores intercambiables de entrada (HTTP y CLI) y de salida (memoria y SQLite), un `main` por entorno, tests en todos los niveles y una regla automática que impida violar la dirección de las dependencias.

## Estudio

### El servicio: agenda de citas de Huellitas

Retomas la clínica veterinaria del proyecto de la sesión 21, ahora como un servicio completo con puertos y adaptadores. El servicio gestiona **citas**:

- **Agendar una cita** para una mascota con un veterinario en una sede, en un horario de 20 minutos (las cirugías no se agendan por este servicio).
- **Reglas**: un veterinario no puede tener dos citas que se solapen, **aunque sean en sedes distintas**; solo se agenda dentro del horario de atención del veterinario en esa sede ese día; no se agenda en el pasado; una mascota no puede tener dos citas activas el mismo día.
- **Cancelar una cita**: solo si está pendiente o confirmada y faltan más de 2 horas; si faltan menos, se marca como "cancelación tardía" (sigue cancelada, pero queda registrado).
- **Confirmar** y **marcar como atendida** o **no asistió**, siguiendo el diagrama de estados de la sesión 21.
- **Consultar la agenda** de un veterinario para un día.
- Al agendar o cancelar, se **notifica** al tutor (por ahora, un adaptador de consola; en el futuro, WhatsApp).

### Estructura objetivo

```
huellitas-agenda/
  src/
    appointments/                       ← grita el dominio (Screaming Architecture)
      domain/
        appointment.ts                  agregado con máquina de estados e invariantes
        time-slot.ts                    value object (inicio, duración, solapamiento)
        ids.ts                          tipos con marca: VetId, PetId, ClinicId, AppointmentId
        events.ts                       AppointmentScheduled, AppointmentCancelled...
      application/
        ports.ts                        puertos de salida: AppointmentRepository, VetSchedule,
                                        Clock, Notifier, IdGenerator
        schedule-appointment.ts         casos de uso (puertos de entrada = sus firmas)
        cancel-appointment.ts
        vet-agenda.ts
      infrastructure/
        in-memory-appointment-repository.ts
        sqlite-appointment-repository.ts   humble object: SQL + mapeo
        static-vet-schedule.ts
        console-notifier.ts
      index.ts                          API pública del componente
    delivery/
      http/server.ts                    adaptador primario (node:http, sin framework)
      cli/agenda-cli.ts                 adaptador primario
    main.dev.ts                         ensambla con memoria
    main.prod.ts                        ensambla con SQLite y config validada
  test/
    domain/…                            tests unitarios del dominio
    application/…                       tests de casos de uso con dobles
    contract/appointment-repository.contract.ts   misma suite para ambos repositorios
    http/server.test.ts                 un test de integración del adaptador HTTP
    architecture.test.ts                regla de dependencias automática
```

### Pistas de diseño

- **Dominio puro**: `Appointment` protege sus invariantes de estado; la regla "no solapar citas del veterinario" involucra a varias citas, así que la comprueba el caso de uso consultando el repositorio (`overlapping(vetId, slot)`), con respaldo de una restricción en SQLite. Documenta esa decisión.
- **Reloj y IDs como puertos**: `Clock` e `IdGenerator` hacen que el dominio y los casos de uso sean deterministas en los tests.
- **Modelos de petición y respuesta**: los casos de uso reciben y devuelven objetos simples (`ScheduleAppointmentRequest`, `ScheduleAppointmentResult` como unión discriminada con motivos de rechazo), nunca `IncomingMessage` ni filas de SQLite.
- **Resultados en vez de excepciones** para los rechazos de negocio esperados (`{ ok: false, reason: "vet_busy" }`), y excepciones solo para errores inesperados. El adaptador HTTP traduce los motivos a códigos (409, 422).
- **Contrato de repositorio**: escribe la suite una vez como función `runAppointmentRepositoryContract(makeRepo)` y ejecútala para la implementación en memoria y la de SQLite (`:memory:`). Si ambas la pasan, son sustituibles (LSP).
- **Regla de arquitectura sin dependencias extra**: un test que lee los archivos de `src/appointments/domain` y `src/appointments/application` y falla si alguno importa de `infrastructure`, `delivery`, `node:sqlite`, `node:http` o `node:fs`.

```ts
// test/architecture.test.ts (punto de partida)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".ts") ? [p] : [];
  });

const FORBIDDEN = [/from ["'].*\/infrastructure\//, /from ["'].*\/delivery\//, /from ["']node:(sqlite|http|fs)/];

test.each(["src/appointments/domain", "src/appointments/application"])(
  "%s no depende de detalles", (dir) => {
    const offenders = files(dir).filter((f) => FORBIDDEN.some((r) => r.test(readFileSync(f, "utf8"))));
    expect(offenders).toEqual([]);
  },
);
```

### Cómo repartir las 3 horas

| Bloque | Tiempo | Resultado |
| --- | --- | --- |
| 1. Dominio | 40 min | `TimeSlot`, IDs, `Appointment` con estados y eventos, tests unitarios |
| 2. Casos de uso y puertos | 45 min | Tres casos de uso con dobles en memoria y tests |
| 3. Adaptadores de salida | 35 min | Repositorio en memoria y SQLite con la suite de contrato |
| 4. Adaptadores de entrada y main | 40 min | HTTP, CLI, `main.dev`/`main.prod`, test HTTP |
| 5. Reglas y cierre | 20 min | Test de arquitectura, README breve con el diagrama, autoevaluación |

## Qué hacer

1. **Prepara el proyecto**: TypeScript en modo estricto y Vitest. Usa solo la librería estándar de Node (`node:sqlite`, `node:http`, `node:crypto`); no agregues frameworks web ni ORM.
2. **Dominio** (`src/appointments/domain`): value object `TimeSlot` (inicio, duración en minutos, `overlaps`, `endsAt`, validación de duración positiva); IDs con marca de tipo; agregado `Appointment` con estados `pending → confirmed → attended | no_show`, y `cancelled` / `late_cancelled` desde `pending` o `confirmed`; métodos `confirm`, `cancel(now)`, `markAttended`, `markNoShow` que lanzan error ante transiciones inválidas y acumulan eventos (`pullEvents()`).
3. **Puertos** (`application/ports.ts`): `AppointmentRepository` (`save`, `byId`, `overlapping(vetId, slot)`, `activeForPetOn(petId, day)`, `forVetOn(vetId, day)`), `VetSchedule` (`isWorking(vetId, clinicId, slot)`), `Clock`, `Notifier`, `IdGenerator`.
4. **Casos de uso**: `ScheduleAppointment`, `CancelAppointment` y `VetAgenda`. Deben ser delgados: validan con el dominio y los puertos, guardan, publican/notifican y devuelven modelos de respuesta simples. Los rechazos de negocio son resultados tipados con motivo (`vet_busy`, `outside_schedule`, `in_the_past`, `pet_already_booked`, `not_found`, `invalid_transition`).
5. **Adaptadores de salida**: repositorio en memoria y repositorio SQLite (crea la tabla al construirse, guarda el estado como texto, convierte fechas a ISO, y mapea filas a `Appointment` con una función de reconstitución que no genera IDs nuevos); `StaticVetSchedule` con horarios en un objeto de configuración; `ConsoleNotifier`.
6. **Suite de contrato**: una función que reciba una fábrica de repositorios y ejecute al menos 6 tests (guardar y recuperar, solapamiento, citas activas de una mascota en un día, agenda ordenada por hora, persistencia del estado tras una transición, `byId` inexistente devuelve `null`). Ejecútala para ambos repositorios.
7. **Adaptadores de entrada**: un servidor `node:http` con `POST /appointments`, `POST /appointments/:id/cancel` y `GET /vets/:id/agenda?day=YYYY-MM-DD` que solo traduce JSON ↔ modelos de petición/respuesta y motivos ↔ códigos HTTP (201, 404, 409, 422); y una CLI mínima (`agenda <vetId> <día>`) que use el mismo caso de uso `VetAgenda`.
8. **Main por entorno**: `main.dev.ts` (memoria, reloj real, notificador de consola, datos de ejemplo) y `main.prod.ts` (SQLite en la ruta de `DB_PATH`, puerto de `PORT`, configuración validada al arrancar). `process.env` solo puede aparecer en estos archivos.
9. **Tests**: unitarios del dominio (cada transición válida e inválida, `TimeSlot.overlaps` con bordes), de casos de uso con dobles (cada regla de agenda y de cancelación, incluida la cancelación tardía con un reloj falso), contrato de repositorios, un test HTTP que arranca el servidor en un puerto libre con el `main` de desarrollo y prueba un agendamiento y un conflicto 409, y el test de arquitectura.
10. **README breve** con el diagrama hexagonal en ASCII (puertos primarios y secundarios, adaptadores), la decisión sobre dónde se valida el solapamiento y cómo agregar un adaptador de WhatsApp sin tocar el núcleo.

**Criterio de terminado:** `npx vitest run` pasa con al menos 30 tests; el test de arquitectura falla si agregas a propósito un `import` de `node:sqlite` en el dominio y pasa al quitarlo; ambos repositorios pasan la misma suite de contrato; el servidor responde 201 al agendar y 409 al intentar solapar al mismo veterinario en otra sede; `process.env` solo aparece en `main.prod.ts`; cambiar de memoria a SQLite no modifica ningún archivo fuera de los `main`.

## Conceptos clave

- **Puerto primario (de entrada)**: la interfaz por la que el mundo exterior usa la aplicación, aquí las firmas de los casos de uso.
- **Puerto secundario (de salida)**: la interfaz que la aplicación necesita del exterior (repositorio, reloj, notificador), definida en la aplicación.
- **Adaptador primario / secundario**: implementación que traduce el exterior hacia un puerto de entrada (HTTP, CLI) / que implementa un puerto de salida con una tecnología (SQLite, consola).
- **Suite de contrato**: conjunto de tests escrito una vez y ejecutado contra varias implementaciones del mismo puerto para garantizar que son sustituibles.
- **Test de arquitectura**: test automatizado que verifica que las dependencias del código respetan la regla de dependencia.

## Preguntas de repaso

1. ¿Por qué la regla de que un veterinario no solape citas en sedes distintas no puede protegerla el agregado `Appointment` por sí solo?
   R: Porque involucra a varias citas, y cada `Appointment` es su propio agregado que solo conoce su estado. La comprueba el caso de uso consultando el repositorio por citas solapadas del mismo veterinario, y conviene respaldarla con una restricción en la base de datos para cubrir la concurrencia.
2. ¿Qué garantiza ejecutar la misma suite de contrato contra el repositorio en memoria y el de SQLite?
   R: Que ambas implementaciones cumplen el mismo comportamiento esperado por el puerto y son sustituibles (LSP), de modo que los tests de casos de uso hechos con la versión en memoria siguen siendo válidos con SQLite.
3. ¿Por qué los rechazos de negocio se devuelven como resultados tipados y no como excepciones?
   R: Porque son resultados esperados del caso de uso (veterinario ocupado, fuera de horario), y como unión discriminada obligan al adaptador a manejar cada motivo y a traducirlo explícitamente, por ejemplo a 409 o 422; las excepciones quedan para errores inesperados.
4. ¿Qué cambia en el código para agregar notificaciones por WhatsApp?
   R: Solo se agrega un adaptador nuevo que implementa el puerto `Notifier` y se elige en el `main` correspondiente; el dominio, los casos de uso y los demás adaptadores no cambian.

## Explícalo con tus palabras

Muestra tu diagrama hexagonal a alguien y explica, señalando cada flecha, por qué el servidor HTTP y SQLite dependen del núcleo y el núcleo no depende de ninguno de los dos.
