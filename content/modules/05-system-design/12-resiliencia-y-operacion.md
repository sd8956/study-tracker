---
title: Resiliencia y operación — timeouts, circuit breakers, idempotencia y recuperación ante desastres
kind: lesson
hours: 2
sources: karanpratapsingh/system-design, cap. IV "Circuit breaker", "Idempotency", "Disaster recovery" y "Virtual Machines (VMs) and Containers" | System Design Primer, "Availability patterns" (fail-over) | System Design Interview (Alex Xu), cap. 1, "Logging, metrics, automation" (pp. 25–27)
links: Karan — Circuit breaker | https://github.com/karanpratapsingh/system-design#circuit-breaker ; Karan — Idempotency | https://github.com/karanpratapsingh/system-design#idempotency ; Karan — Disaster recovery | https://github.com/karanpratapsingh/system-design#disaster-recovery ; Karan — VMs and Containers | https://github.com/karanpratapsingh/system-design#virtual-machines-vms-and-containers ; Primer — Fail-over | https://github.com/donnemartin/system-design-primer#fail-over
---

## Objetivo

Diseñar sistemas que fallan bien: aplicar timeouts, reintentos con backoff y jitter, circuit breakers, bulkheads e idempotencia; degradar con elegancia bajo sobrecarga; planificar la recuperación ante desastres con RTO y RPO; y conocer la plataforma de ejecución (VMs y contenedores) y la observabilidad mínima.

## Estudio

### Los fallos son normales

En un sistema con miles de máquinas, algo siempre está fallando: un disco, un proceso, un enlace de red, una dependencia externa. La pregunta no es "¿cómo evito los fallos?" sino "¿cómo evito que un fallo **pequeño** se convierta en uno **grande**?". Esta sesión reúne los patrones que contienen los fallos. Todos responden a una idea: **una llamada remota no es una llamada local**. Puede fallar, tardar indefinidamente o tener éxito sin que te enteres.

### Timeouts: el patrón más importante y más olvidado

Toda llamada de red necesita un **timeout**. Sin él, un servicio lento retiene tus threads o conexiones para siempre, y por la ley de Little (sesión 02) tu concurrencia explota hasta que dejas de responder también tú.

Cómo elegir el valor:

- Mide la latencia de la dependencia y pon el timeout un poco por encima de su p99 (por ejemplo, p99 = 120 ms → timeout de 200–300 ms).
- Respeta el **presupuesto total** de la petición: si el usuario espera como mucho 1 s y tu servicio llama a tres dependencias en serie, no puedes darle 1 s a cada una. Propaga un **deadline** (gRPC lo hace de forma nativa): cada salto sabe cuánto tiempo queda y no empieza trabajo que no podrá terminar.
- Distingue el timeout de conexión (corto: ~100 ms dentro de un datacenter) del de lectura (según la operación).

### Reintentos con backoff exponencial y jitter

Muchos fallos son transitorios: un paquete perdido, un nodo que reinicia, un pico momentáneo. Reintentar los resuelve. Pero reintentar mal convierte una molestia en una catástrofe.

Reglas:

1. **Reintenta solo lo que es seguro**: operaciones idempotentes o protegidas con claves de idempotencia (más abajo).
2. **Reintenta solo errores transitorios**: timeouts, `503`, `429`, conexión rechazada. No reintentes un `400` o un `404`: fallarán igual.
3. **Backoff exponencial**: espera 100 ms, 200 ms, 400 ms, 800 ms… para dar tiempo a la dependencia a recuperarse.
4. **Jitter**: agrega aleatoriedad a la espera. Sin jitter, mil clientes que fallaron al mismo tiempo reintentan al mismo tiempo, una y otra vez, en oleadas sincronizadas.
5. **Límite de intentos** (3–5) y **presupuesto de reintentos**: no más de, digamos, un 10 % de peticiones extra por reintentos. Si el servicio está caído, reintentar solo agrega carga.
6. **Reintenta en una sola capa**: si el cliente, el gateway y cada servicio reintentan 3 veces, una petición en una cadena de tres niveles puede convertirse en 3³ = 27 intentos contra la base de datos.

```ts
async function withRetry<T>(fn: () => Promise<T>, max = 4, baseMs = 100): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt + 1 >= max || !isTransient(err)) throw err;
      const cap = baseMs * 2 ** attempt;
      const wait = Math.random() * cap;          // "full jitter": entre 0 y el tope exponencial
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}
```

### Circuit breaker

Si una dependencia está caída, seguir llamándola desperdicia recursos (cada llamada espera hasta el timeout) y le impide recuperarse. Un **circuit breaker** envuelve las llamadas y las corta cuando los fallos superan un umbral, igual que un interruptor eléctrico:

```
            fallos > umbral
  [CERRADO] ─────────────────> [ABIERTO]
     ▲   ▲                        │ pasa el tiempo de espera
     │   │ pruebas exitosas       ▼
     │   └──────────────────── [SEMIABIERTO]
     │                            │ prueba falla
     └────────────────────────────┘ (vuelve a ABIERTO)
```

- **Cerrado**: todo normal; las llamadas pasan y se cuentan los fallos (por ejemplo, en una ventana de 10 s).
- **Abierto**: si la tasa de fallos supera el umbral (por ejemplo, 50 % con al menos 20 llamadas), el breaker **falla de inmediato** sin llamar a la dependencia, durante un tiempo (por ejemplo, 30 s).
- **Semiabierto**: pasado ese tiempo, deja pasar unas pocas llamadas de prueba. Si tienen éxito, se cierra; si fallan, vuelve a abrirse.

Beneficios: el llamador responde rápido (con un error o un fallback) en vez de esperar timeouts, libera sus recursos, y la dependencia recibe un respiro. Combínalo con un **fallback**: datos cacheados, un valor por defecto, una versión reducida de la funcionalidad.

### Bulkheads: aislar recursos

En un barco, los mamparos (*bulkheads*) dividen el casco en compartimentos estancos: una vía de agua inunda uno, no todo el barco. En software, el patrón aísla recursos por dependencia o por tipo de trabajo:

- Un pool de conexiones o de threads **separado** para cada dependencia. Si el servicio de recomendaciones se vuelve lento, agota solo su pool; las llamadas a pagos siguen teniendo el suyo.
- Flotas separadas para tráfico distinto: los clientes gratuitos y los de pago, o las peticiones interactivas y los batch.

### Idempotencia: que reintentar sea seguro

Una operación es **idempotente** si ejecutarla varias veces tiene el mismo efecto que ejecutarla una vez. "Fijar el email en `a@x.com`" lo es; "sumar 10 al saldo" no.

¿Por qué importa tanto? Porque ante un timeout el cliente **no sabe** si el servidor nunca recibió la petición, la procesó y se perdió la respuesta, o la está procesando todavía. La única forma segura de recuperarse es reintentar, y eso solo es seguro con idempotencia. Además, las colas entregan at-least-once (sesión 09), los usuarios hacen doble clic y los balanceadores reintentan.

**Claves de idempotencia** para operaciones como pagos:

```
 POST /payments   Idempotency-Key: 4f1e-...   { amount: 100, ... }

 Servidor:
 1. Busca la clave en la tabla idempotency_keys.
    - Si existe con resultado: devuelve el mismo resultado (sin cobrar de nuevo).
    - Si existe "en proceso": responde 409 (o espera).
    - Si no existe: la inserta como "en proceso" (con clave única: dos inserts concurrentes no pueden ganar ambos).
 2. Ejecuta el cobro.
 3. Guarda el resultado asociado a la clave (con expiración, por ejemplo 24 h).
```

Puntos finos: la clave la genera el **cliente** (un UUID por intento lógico, reutilizado en cada reintento); conviene guardar también un hash del cuerpo para rechazar la misma clave con un cuerpo distinto; y el paso 1 y el efecto deberían ser atómicos (misma transacción) o el efecto debe poder deduplicarse.

**Consumidores idempotentes** en colas: registrar los IDs de eventos procesados o usar escrituras condicionales (sesión 09).

Trade-offs: almacenar claves cuesta espacio y una escritura extra por petición; hay que decidir cuánto tiempo recordarlas. Pero sin idempotencia, un sistema distribuido confiable es imposible.

### Degradación elegante y load shedding

Cuando la demanda supera la capacidad, es mejor atender bien a una parte que mal a todos:

- **Load shedding**: rechazar rápido (con `503` y `Retry-After`) las peticiones que exceden la capacidad, empezando por las de menor prioridad (tareas batch, clientes gratuitos, funciones secundarias). Las peticiones aceptadas mantienen buena latencia.
- **Degradación**: apagar funciones no esenciales para proteger las críticas. Una tienda bajo un pico puede ocultar las recomendaciones personalizadas y mostrar productos populares cacheados, pero nunca degradar el checkout. Los *feature flags* permiten hacer esto en segundos.
- **Rate limiting** por cliente para que un solo cliente no consuma la capacidad de todos (lo diseñarás en la sesión 16).

### Los despliegues son la causa número uno de incidentes

Buena parte de las caídas en sistemas maduros no vienen del hardware sino de **cambios**: una versión con un bug, una configuración errónea, una migración de esquema. Por eso la resiliencia empieza en el proceso de despliegue:

- **Despliegues graduales** (canary, rolling) con comparación automática de métricas: si la tasa de errores de la versión nueva supera la de la vieja, el sistema revierte solo.
- **Rollback rápido y probado**: volver a la versión anterior debe tardar minutos y no requerir heroísmo. Esto exige que los cambios de esquema sean compatibles hacia atrás (primero agregar la columna, luego usarla, mucho después borrar la vieja: el patrón *expand and contract*).
- **Feature flags**: separar desplegar código de activar funcionalidad, para apagar una función problemática sin redeploy.
- **La configuración es código**: revisada, versionada y desplegada de forma escalonada. Un cambio de configuración global aplicado de golpe a toda la flota es una de las formas más rápidas de tumbar un sistema entero.

### Dependencias de terceros

Proveedores de pagos, envío de emails o SMS, mapas, autenticación social: tu disponibilidad depende de la suya (sesión 02). Estrategias:

- **Sacarlas de la ruta síncrona** cuando sea posible: encolar el envío del SMS en lugar de esperar al proveedor.
- **Proveedor secundario** para lo crítico (dos pasarelas de pago, dos proveedores de SMS) con un circuit breaker que conmute.
- **Timeouts y breakers propios**: nunca confíes en que el SDK del proveedor tenga valores razonables.
- **Respetar sus límites**: los proveedores imponen rate limits; tu sistema debe frenar antes de llegar a ellos (sesión 21, notificaciones).

### Chaos engineering y game days

La única forma de saber si los patrones funcionan es probarlos. **Chaos engineering** consiste en inyectar fallos de forma controlada en producción (o en un entorno muy parecido): apagar instancias al azar, agregar latencia a una dependencia, cortar la red hacia una zona. Se formula una hipótesis ("si cae una zona, el p99 no sube más de 20 % y no hay errores visibles"), se ejecuta el experimento con un radio de impacto acotado y se corrigen las sorpresas. Los **game days** son ensayos planificados de incidentes grandes (perder una región, restaurar desde backup) con el equipo completo, para practicar tanto la técnica como la coordinación humana.

### Recuperación ante desastres (DR)

Los patrones anteriores manejan fallos de componentes. Un **desastre** es la pérdida de un sitio entero: una región de la nube caída, un incendio, un ransomware que cifra los datos, un error humano que borra una base de producción. La recuperación ante desastres se apoya en replicar datos y capacidad de cómputo en un lugar no afectado.

Dos métricas definen el plan:

- **RTO** (Recovery Time Objective): cuánto tiempo puede estar caído el servicio. "Debemos volver a operar en menos de 1 hora."
- **RPO** (Recovery Point Objective): cuántos datos (medidos en tiempo) puedes perder. "Podemos perder como mucho los últimos 5 minutos."

```
   último respaldo            desastre                  servicio restaurado
 ────────●───────────────────────X────────────────────────────●──────────> tiempo
         └──── RPO (datos perdidos) ──┘└──────── RTO (caída) ───┘
```

Estrategias, de la más barata a la más cara:

| Estrategia | Qué hay en el sitio secundario | RTO típico | RPO típico | Costo |
| --- | --- | --- | --- | --- |
| Backup y restauración | Solo copias de datos (object storage en otra región) | Horas a días | Horas (frecuencia del backup) | Bajo |
| Cold site | Infraestructura básica sin datos actualizados | Horas | Horas | Bajo-medio |
| Warm standby / pilot light | Datos replicados y una versión mínima del sistema corriendo | Minutos a 1 h | Minutos | Medio |
| Hot site (activo-pasivo) | Copia completa y actualizada lista para recibir tráfico | Minutos | Segundos | Alto |
| Multi-sitio activo-activo | Ambos sitios atienden tráfico | Casi cero | Casi cero | Muy alto |

Reglas que no se negocian:

- **Los backups deben estar aislados**: otra cuenta, otra región, inmutables (protección contra ransomware y contra el borrado accidental del propio equipo).
- **Un backup no probado no existe**: practica restauraciones y mide el RTO real.
- **La replicación no es backup**: si alguien ejecuta `DELETE FROM users`, la réplica lo replica fielmente. Necesitas copias puntuales en el tiempo (point-in-time recovery).
- **Ensaya el failover** de forma periódica (*game days*); un plan que nunca se ejecutó falla cuando más se necesita.

### La plataforma: VMs y contenedores

Tus servicios corren sobre alguna forma de virtualización:

- Una **máquina virtual** (VM) emula hardware completo: un **hipervisor** reparte CPU, memoria y disco del servidor físico entre varias VMs, cada una con su propio sistema operativo. Aislamiento fuerte, arranque en decenas de segundos o minutos, más overhead. Se usan para consolidar servidores y aislar cargas.
- Un **contenedor** virtualiza el sistema operativo: empaqueta la aplicación con sus dependencias y comparte el kernel del host. Es liviano (MB en vez de GB), arranca en segundos o menos, y corre igual en tu laptop y en producción. El aislamiento es más débil que el de una VM, porque comparten kernel.

| Aspecto | VM | Contenedor |
| --- | --- | --- |
| Virtualiza | Hardware | Sistema operativo |
| Tamaño | GB | MB |
| Arranque | Decenas de segundos a minutos | Milisegundos a segundos |
| Aislamiento | Fuerte | Más débil (kernel compartido) |
| Densidad | Decenas por host | Cientos por host |

En la práctica se combinan: contenedores orquestados (Kubernetes) que corren sobre VMs de la nube. Para el diseño de sistemas importa una consecuencia: los contenedores hacen barato y rápido el autoscaling y los despliegues inmutables (nunca modificas un servidor; lo reemplazas por uno nuevo con la versión nueva).

### Observabilidad mínima

No puedes operar lo que no ves. Tres señales:

- **Métricas**: series numéricas agregadas (peticiones/s, tasa de errores, latencia p50/p99, saturación de CPU, profundidad de colas). Sirven para dashboards y alertas. Un buen punto de partida por servicio son las "señales doradas": latencia, tráfico, errores y saturación.
- **Logs**: eventos detallados y estructurados (JSON) con un ID de correlación; centralizados para buscar entre todos los servidores.
- **Trazas distribuidas**: el recorrido de una petición a través de todos los servicios, con el tiempo de cada salto. Indispensables para encontrar qué servicio hace lenta una petición en una arquitectura de microservicios.

Después de cada incidente, escribe un **postmortem sin culpables**: qué pasó, cómo se detectó, cuánto duró, qué lo agravó y qué acciones concretas evitarán que se repita. El objetivo es mejorar el sistema, no encontrar a quién señalar; si las personas temen ser culpadas, ocultan información y el sistema no aprende.

Alerta sobre **síntomas** que afectan a usuarios (el SLO se está quemando, sesión 02), no sobre cada causa posible (CPU al 80 %), para no ahogar al equipo en alertas.

### Un escenario completo

El servicio de catálogo llama a recomendaciones (p99 = 80 ms, a veces se degrada) y a precios (crítico).

1. Timeout de 150 ms a recomendaciones con un reintento con jitter; circuit breaker que se abre con 50 % de errores en 10 s; fallback: productos populares cacheados.
2. Pools de conexiones separados (bulkhead) para recomendaciones y precios.
3. Precios: timeout de 300 ms, dos reintentos (es una lectura idempotente), sin fallback: si no hay precio, no se muestra el botón de compra.
4. Bajo sobrecarga: load shedding de peticiones de bots y apagado del bloque de recomendaciones por feature flag.
5. DR: catálogo con warm standby en otra región (RTO 30 min, RPO 5 min); precios con replicación síncrona entre zonas y backups horarios aislados.

Resultado: una degradación de recomendaciones ya no puede tumbar el catálogo, y una caída regional tiene un plan con números. Fíjate en que cada patrón responde a una pregunta distinta: el timeout a "¿cuánto espero?", el reintento a "¿vuelvo a intentar?", el breaker a "¿sigo intentando?", el bulkhead a "¿a quién afecta?", el fallback a "¿qué muestro mientras tanto?" y el plan de DR a "¿cómo vuelvo si pierdo todo?".

## Conceptos clave

- **Timeout**: límite de espera de una llamada remota; base de toda resiliencia.
- **Deadline propagado**: tiempo restante de la petición que viaja entre servicios.
- **Backoff exponencial con jitter**: esperas crecientes y aleatorizadas entre reintentos.
- **Circuit breaker**: corta las llamadas a una dependencia que falla, con estados cerrado, abierto y semiabierto.
- **Bulkhead**: aislamiento de recursos para que el fallo de una dependencia no agote los de las demás.
- **Clave de idempotencia**: identificador del cliente que permite reintentar sin duplicar efectos.
- **Load shedding**: rechazar rápido el exceso de carga para proteger lo que se acepta.
- **RTO**: tiempo máximo aceptable de caída tras un desastre.
- **RPO**: cantidad máxima aceptable de datos perdidos, medida en tiempo.
- **Contenedor**: aplicación empaquetada con sus dependencias que comparte el kernel del host.

## Preguntas de repaso

1. ¿Por qué el jitter es necesario en los reintentos?
   R: Porque sin aleatoriedad, todos los clientes que fallaron al mismo tiempo reintentan exactamente al mismo tiempo, generando oleadas sincronizadas de carga que vuelven a tumbar a la dependencia justo cuando intenta recuperarse. El jitter dispersa los reintentos en el tiempo.
2. Explica los tres estados de un circuit breaker.
   R: Cerrado: las llamadas pasan y se cuentan los fallos. Abierto: al superar el umbral de fallos, el breaker falla de inmediato sin llamar a la dependencia durante un tiempo, liberando recursos y dándole respiro. Semiabierto: pasado ese tiempo, deja pasar unas pocas llamadas de prueba; si tienen éxito se cierra y si fallan vuelve a abrirse.
3. ¿Cómo implementarías una clave de idempotencia para un endpoint de pagos?
   R: El cliente genera un UUID por operación lógica y lo envía en una cabecera en cada reintento. El servidor intenta insertar la clave con estado "en proceso" en una tabla con restricción única; si ya existe con resultado, devuelve ese resultado; si está en proceso, responde conflicto. Si la inserción tiene éxito, ejecuta el cobro y guarda el resultado con la clave (y un hash del cuerpo), con una expiración.
4. ¿Qué diferencia hay entre RTO y RPO? Da un ejemplo de cada uno.
   R: El RTO es cuánto tiempo puede estar caído el servicio tras un desastre (por ejemplo, volver a operar en menos de una hora). El RPO es cuántos datos se pueden perder, medidos en tiempo desde el último punto recuperable (por ejemplo, perder como mucho los últimos 5 minutos de transacciones).
5. ¿Por qué la replicación no reemplaza a los backups?
   R: Porque la replicación copia fielmente cualquier cambio, incluidos los errores: un borrado accidental, una corrupción o un ransomware se propagan a las réplicas en segundos. Los backups puntuales en el tiempo, aislados e inmutables, permiten volver a un estado anterior al problema.

## Ejercicio

Implementa en TypeScript una clase `CircuitBreaker` con los tres estados, umbral por tasa de errores en una ventana deslizante, tiempo de apertura configurable y número de llamadas de prueba en semiabierto, más la función `withRetry` con full jitter. Escribe pruebas con un reloj simulado que verifiquen: que se abre al superar el umbral, que falla de inmediato mientras está abierto, que pasa a semiabierto tras el tiempo configurado y que se cierra tras pruebas exitosas. Terminado cuando las cuatro pruebas pasen y documentes en un comentario qué valores elegirías para una dependencia con p99 de 100 ms.

## Explícalo con tus palabras

Explica qué es un circuit breaker usando la imagen de un fusible en la instalación eléctrica de una casa.
