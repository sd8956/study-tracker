---
title: "Proyecto: simulador de replicación líder-seguidor con lag"
kind: project
hours: 3
sources: Designing Data-Intensive Applications (Kleppmann), cap. 5 (pp. 173–190)
links: Jepsen, análisis de consistencia | https://jepsen.io/consistency ; Node.js, test runner | https://nodejs.org/api/test.html
---

## Objetivo

Construir en TypeScript un simulador determinista de replicación líder-seguidor con lag configurable, provocar y medir las anomalías de read-your-writes, monotonic reads y consistent prefix, implementar las técnicas que las corrigen y simular un failover con pérdida de escrituras.

## Estudio

### Por qué un simulador determinista

Las anomalías de replicación son difíciles de observar con hilos y relojes reales: aparecen de vez en cuando y no se repiten. Un **simulador de eventos discretos** con un reloj virtual y un generador aleatorio con semilla hace que cada ejecución sea **reproducible**: si un test falla con la semilla 42, vuelve a fallar con la semilla 42. Es la misma idea que usan FoundationDB y TigerBeetle para probar sus sistemas distribuidos (*deterministic simulation testing*).

### Modelo

```
reloj virtual (ms) ──► cola de eventos ordenada por tiempo

   ┌─────────┐   append(lsn, op)   ┌──────────────┐
   │ Leader  │ ──────────────────► │ log [1..N]   │
   └────┬────┘                     └──────────────┘
        │ para cada seguidor: programa "deliver(lsn)" en t + lag(seguidor)
        ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ F1 lag~  │ │ F2 lag~  │ │ F3 lag~  │   cada uno: appliedLsn, store: Map
   │ 20±10 ms │ │ 200±150  │ │ 2000±500 │
   └──────────┘ └──────────┘ └──────────┘

clientes: generan operaciones según un guion; cada lectura elige réplica
según una política: random | sticky(hash user) | lsn-aware | leader-only
```

- **Eventos**: `write(user, key, value)`, `deliver(follower, lsn)`, `read(user, key)`, `crash(node)`, `promote(node)`.
- **Aplicación en orden**: un seguidor solo aplica el LSN `k` cuando ya aplicó `k-1`; si un `deliver` llega antes de tiempo, queda en buffer.
- **Particiones** (para consistent prefix): dos logs independientes, `p0` y `p1`, cada uno con su líder y seguidores; una clave va a `hash(key) % 2`.

### Anomalías a detectar automáticamente

Un **checker** recorre la historia de operaciones al final de la simulación:

| Anomalía | Regla del checker |
| --- | --- |
| Read-your-writes | Un usuario lee una clave que él mismo escribió con LSN `x` y obtiene un valor con LSN `< x` |
| Monotonic reads | Un usuario lee la misma clave dos veces y la segunda devuelve un LSN menor que la primera |
| Consistent prefix | Un lector ve la respuesta (escrita después de leer la pregunta) sin ver la pregunta |
| Escritura perdida en failover | Una escritura confirmada al cliente no está en el nuevo líder tras la promoción |

## Qué hacer

1. **Núcleo del simulador** (40 min). Implementa `Simulator` con reloj virtual, cola de prioridad de eventos (un array ordenado basta) y un PRNG con semilla (por ejemplo mulberry32). Test: dos ejecuciones con la misma semilla producen exactamente la misma historia (compara un hash del JSON de la historia).
2. **Líder y seguidores** (40 min). Implementa `Leader.write()` que asigna LSN, aplica localmente, confirma al cliente y programa `deliver` a cada seguidor con su lag aleatorio. Implementa `Follower` con aplicación en orden y buffer. Test: tras drenar todos los eventos, los tres seguidores tienen el mismo `Map` que el líder (consistencia eventual).
3. **Checker y anomalías** (40 min). Escribe un escenario con 50 usuarios que escriben y leen sus propios comentarios y los de otros durante 60 s virtuales, con la política `random`. Implementa el checker de read-your-writes y monotonic reads y reporta cuántas violaciones hay.
4. **Correcciones** (30 min). Implementa las políticas `lsn-aware` (el cliente recuerda el LSN de su última escritura y solo lee de réplicas con `appliedLsn >= lsn`, si no del líder) y `sticky` (réplica fija por `hash(userId)`). Ejecuta el mismo escenario con cada política y muestra una tabla: violaciones de cada tipo y porcentaje de lecturas que acabaron en el líder.
5. **Consistent prefix** (25 min). Con dos particiones con lag distinto, simula el diálogo pregunta-respuesta y demuestra que un observador ve la respuesta sin la pregunta. Corrígelo enviando ambos mensajes a la misma partición (clave por `conversationId`).
6. **Failover** (25 min). Con replicación asíncrona, provoca `crash(leader)` en medio de un flujo de escrituras, promueve al seguidor con mayor `appliedLsn` y cuenta cuántas escrituras confirmadas se perdieron. Repite con el modo semisíncrono (el líder espera el ack de F1 antes de confirmar) y compara latencia media de escritura y escrituras perdidas.

Criterio de terminado:

- `node --test` pasa todos los tests (determinismo, convergencia y checker).
- Un script `report.ts` imprime una tabla con las cuatro políticas × tres anomalías, y en las políticas corregidas la anomalía correspondiente es 0.
- La comparación de failover muestra escrituras perdidas > 0 en asíncrono y 0 en semisíncrono (si promueves a F1), junto con la diferencia de latencia.
- Un `NOTES.md` de 10–15 líneas explica cada resultado con los términos de las sesiones 10–12.

Extensión opcional: añade un modo leaderless con n = 3 y quorums configurables reutilizando el checker, y verifica que con w + r > n desaparecen las lecturas viejas salvo con escrituras concurrentes.

## Conceptos clave

- **Deterministic simulation testing**: probar sistemas distribuidos con reloj virtual y aleatoriedad con semilla para reproducir fallos.
- **Checker de historia**: programa que verifica propiedades de consistencia sobre el registro de operaciones.
- **Política de lectura**: regla que decide de qué réplica lee cada cliente.

## Preguntas de repaso

1. ¿Por qué la política `lsn-aware` corrige read-your-writes pero no necesariamente monotonic reads entre claves de otros usuarios?
   R: Porque solo garantiza que la réplica elegida haya aplicado la última escritura del propio usuario; si el usuario lee datos de otros, dos lecturas consecutivas pueden ir a réplicas distintas que estén más allá de su LSN pero con distinto avance, y la segunda puede ver un estado más viejo de esos datos.
2. ¿Qué precio pagas por el modo semisíncrono en tu simulación?
   R: Mayor latencia de escritura (el líder espera el ack del seguidor síncrono) y la posibilidad de bloquear escrituras si ese seguidor se cae o se vuelve lento; a cambio, al promoverlo no se pierden escrituras confirmadas.

## Explícalo con tus palabras

Explica con los números de tu tabla por qué "leer de réplicas" es una optimización que cambia la semántica de tu aplicación.
