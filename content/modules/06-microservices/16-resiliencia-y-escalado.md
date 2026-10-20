---
title: Resiliencia y escalado de microservicios
kind: lesson
hours: 2
sources: Building Microservices 2nd ed., cap. 12 "Resiliency" (pp. 481–519) y cap. 13 "Scaling" (pp. 520–559) | Hands-On Microservices with Kubernetes, cap. 12 "Self-healing with Kubernetes" y "Autoscaling a Kubernetes cluster" (pp. 381–396)
links: Kubernetes — Horizontal Pod Autoscaling | https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/ ; Martin Fowler — CircuitBreaker | https://martinfowler.com/bliki/CircuitBreaker.html ; Principles of Chaos Engineering | https://principlesofchaos.org/
---

## Objetivo

Diseñar servicios que fallen de forma controlada: degradación de funcionalidad, timeouts, retries con backoff, bulkheads, circuit breakers e idempotencia; entender el papel de la redundancia, de CAP y del chaos engineering; y escalar con los cuatro ejes (vertical, duplicación horizontal, particionado, descomposición funcional) y el autoescalado de Kubernetes.

## Estudio

### 1. Qué es resiliencia

"Resiliencia" se usa como sinónimo de "no se cae", pero el concepto es más rico. Se pueden distinguir cuatro facetas:

- **Robustez**: absorber perturbaciones **previstas** (una instancia que muere, una dependencia lenta) gracias a mecanismos diseñados de antemano.
- **Rebound (recuperación)**: volver a la normalidad tras un incidente: backups, runbooks, rollback, comunicación.
- **Graceful extensibility**: manejar situaciones **imprevistas** sin colapsar; depende mucho de las personas y de que tengan autonomía y contexto para improvisar.
- **Sustained adaptability**: aprender continuamente de los incidentes y adaptar sistema y organización (postmortems sin culpa, cultura de aprendizaje).

Los patrones técnicos de esta sesión cubren sobre todo la robustez. Las otras facetas son de proceso y de personas, igual de importantes.

### 2. El fallo está en todas partes

A escala, los fallos son estadísticamente seguros: discos que mueren, redes que pierden paquetes, despliegues con bugs, dependencias externas que se caen. Si asumes que **todo puede fallar**, cambias el diseño: en lugar de intentar que nada falle, construyes para que el fallo de una pieza no tumbe el resto, y para que reemplazar piezas rotas sea rutinario.

¿Cuánta resiliencia necesitas? Depende de los **requisitos no funcionales** de cada capacidad: latencia aceptable, disponibilidad esperada, cuánto dato puedes perder. No todo necesita el mismo nivel. El checkout de una tienda quizá exija 99,95 %; el servicio de recomendaciones puede tolerar caídas.

### 3. Degradar funcionalidad

Si una página depende de cinco servicios y **cualquiera** que falle tumba la página, has construido un sistema **menos** disponible que si dependiera de uno solo. Pregúntate para cada interfaz y cada dependencia: **"¿qué pasa si esto está caído?"**. La respuesta correcta suele ser una decisión de **negocio**, no técnica:

| Servicio caído | Opción de degradación |
| --- | --- |
| Inventario | Permitir la compra y resolver el stock después (o mostrar "consultar disponibilidad") |
| Reseñas | Ocultar la sección de reseñas |
| Recomendaciones | Mostrar los más vendidos (lista estática en cache) |
| Carrito | Mostrar el catálogo con un aviso "carrito temporalmente no disponible" o un teléfono para pedidos |

```ts
async function productPage(id: string) {
  const product = await catalog.get(id);                     // crítico: si falla, error
  const [reviews, recs] = await Promise.allSettled([
    withTimeout(reviewsClient.list(id), 300),
    withTimeout(recsClient.forProduct(id), 300),
  ]);
  return {
    product,
    reviews: reviews.status === "fulfilled" ? reviews.value : null,      // degradar: ocultar
    recommendations: recs.status === "fulfilled" ? recs.value : bestSellersCache,
  };
}
```

### 4. Una historia de fallo en cascada

Un sitio de anuncios clasificados recibe miles de peticiones por segundo. Parte del tráfico se redirige (strangler fig) a sistemas antiguos para tipos de anuncios minoritarios. Uno de esos sistemas antiguos, poco usado, empieza a responder **muy lento** (no a fallar: a tardar). El pool de conexiones HTTP del sistema principal se llena de peticiones esperando a ese sistema lento; los timeouts estaban mal configurados (demasiado largos) y el pool era compartido para todos los sistemas downstream. Pronto no quedan conexiones ni hilos para nada más, y **todo el sitio** se cae por un servicio que generaba una fracción mínima de los ingresos.

La lección: **la lentitud es uno de los peores modos de fallo**. Un servicio caído se detecta rápido; uno lento retiene recursos de todos los que lo llaman y propaga el problema hacia arriba. Tres correcciones: timeouts adecuados, pools separados por dependencia (bulkheads) y circuit breakers. Veámoslos.

### 5. Patrones de estabilidad

#### 5.1 Timeouts

Toda llamada remota necesita un timeout. Sin él, esperas indefinidamente. Muy largo: retienes recursos y propagas lentitud. Muy corto: fallas operaciones que habrían terminado.

- Empieza con un valor por defecto razonable para todas las llamadas y ajústalo con datos (por ejemplo, un poco por encima del p99 normal de esa dependencia).
- Piensa en un **presupuesto de tiempo total** de la operación: si el usuario no esperará más de 2 s, no tiene sentido que una llamada interna espere 5 s. Propaga el tiempo restante (deadline) a las llamadas siguientes.
- Registra los timeouts: son una señal de salud de la dependencia.

#### 5.2 Retries

Algunos fallos son transitorios (un paquete perdido, un Pod que se reinició): reintentar funciona. Reglas:

- Reintenta solo errores **transitorios** (timeouts, 503, conexión rechazada), nunca errores de cliente (400, 404).
- Usa **backoff exponencial con jitter** (espera creciente y aleatoria) para no sincronizar a miles de clientes reintentando a la vez y rematar a un servicio que intenta recuperarse.
- **Limita** el número de reintentos y respeta el presupuesto de tiempo total.
- **Cuidado con la amplificación**: si cada capa de una cadena de 4 servicios reintenta 3 veces, un fallo al final genera hasta 3⁴ = 81 llamadas. Reintenta en una sola capa, idealmente la más cercana al fallo.
- Solo reintenta operaciones **idempotentes** (sección 5.6).

```ts
async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseMs = 100): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts - 1 || !isTransient(err)) throw err;
      const delay = baseMs * 2 ** i * (0.5 + Math.random()); // backoff exponencial + jitter
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
```

#### 5.3 Bulkheads

Los mamparos de un barco dividen el casco en compartimentos estancos: si uno se inunda, el barco no se hunde. En software: **aislar recursos** para que el fallo de una parte no consuma los recursos de las demás.

- **Pools de conexiones separados por dependencia**: si el sistema de anuncios antiguo se pone lento, solo agota su pool, no el de búsqueda.
- **Límites de concurrencia** por dependencia o por tipo de petición.
- **Separar servicios** en sí mismos es una forma de bulkhead: un microservicio es un compartimento.
- **Load shedding**: rechazar rápido peticiones cuando estás saturado (503 inmediato) en lugar de aceptarlas y responder todas tarde.

#### 5.4 Circuit breakers

Como el interruptor diferencial de una casa: si una dependencia falla repetidamente, el **circuito se abre** y las llamadas siguientes fallan **inmediatamente** sin intentar la red, dando tiempo a la dependencia para recuperarse y liberando tus recursos. Pasado un tiempo, deja pasar unas pocas llamadas de prueba (**half-open**); si funcionan, se cierra.

```
          fallos ≥ umbral
 CLOSED ───────────────────► OPEN ──── tras N segundos ───► HALF-OPEN
 (llamadas                  (falla                          (deja pasar
  normales)                  rápido)                         pruebas)
    ▲                                                          │
    └─────────── pruebas OK ───────────────────────────────────┘
                 pruebas fallan ──► vuelve a OPEN
```

```ts
class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(private threshold = 5, private resetMs = 10_000) {}

  async call<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.openedAt < this.resetMs) return fallback(); // falla rápido
      this.state = "half-open";
    }
    try {
      const result = await fn();
      this.failures = 0;
      this.state = "closed";
      return result;
    } catch {
      this.failures++;
      if (this.state === "half-open" || this.failures >= this.threshold) {
        this.state = "open";
        this.openedAt = Date.now();
      }
      return fallback();
    }
  }
}
```

Los circuit breakers también sirven para mantenimiento: puedes abrir manualmente el circuito hacia un servicio mientras lo reparas. Configúralos con métricas (estado del circuito por dependencia) para que sean observables. En producción, usa una librería probada (en Node, por ejemplo, `opossum`) o el soporte del service mesh.

#### 5.5 Aislamiento y redundancia

- **Aislamiento**: cuanto menos dependa un servicio de otro para funcionar, menos le afectan sus fallos. La comunicación asíncrona reduce el temporal coupling; caches locales de datos de otros servicios permiten seguir funcionando un tiempo.
- **Redundancia**: varias instancias en distintas máquinas y zonas. Elimina puntos únicos de fallo, pero cuesta: decide dónde merece la pena.
- **Middleware**: un broker de mensajes puede absorber caídas del consumidor (los mensajes esperan en la cola), pero el broker se vuelve una pieza crítica que también debe ser resiliente.

#### 5.6 Idempotencia

Una operación es **idempotente** si ejecutarla varias veces produce el mismo resultado que una sola vez. Es imprescindible si reintentas o si un broker entrega mensajes "al menos una vez".

- `PUT /customers/c-1 {email}` es idempotente; `POST /payments {amount}` no lo es por naturaleza.
- Para hacerla idempotente: el cliente envía una **clave de idempotencia** única por operación lógica; el servidor guarda las claves procesadas y, si recibe una repetida, devuelve el resultado anterior sin volver a cobrar.

```ts
app.post("/payments", async (req, res) => {
  const key = req.header("idempotency-key");
  if (!key) return res.status(400).send("idempotency-key requerido");
  const previous = await db.findPaymentByKey(key);
  if (previous) return res.status(200).json(previous);          // repetición: mismo resultado
  const payment = await db.createPayment({ key, ...req.body });  // restricción UNIQUE en key
  res.status(201).json(payment);
});
```

- En eventos: guarda los `eventId` procesados o diseña el efecto como "establecer estado" en lugar de "sumar" ("el saldo de puntos del pedido o-77 es 120" en lugar de "suma 120 puntos").

### 6. Repartir el riesgo

Que tengas tres instancias no ayuda si las tres están en la misma máquina física, el mismo rack o la misma zona de disponibilidad. Reparte instancias entre zonas (en Kubernetes, con reglas de antiafinidad o `topologySpreadConstraints`) y entiende qué garantiza realmente tu proveedor. Una regla útil: los acuerdos de nivel de servicio de una instancia individual suelen ser bajos; la disponibilidad alta viene de la redundancia que tú diseñas.

### 7. CAP en la práctica (repaso breve)

Ya viste CAP en los módulos 04 y 05. Aplicado a microservicios: cuando hay una partición de red entre réplicas, tienes que elegir entre seguir respondiendo con datos posiblemente desactualizados (**AP**) o negarte a responder para no dar datos inconsistentes (**CP**). No es una decisión global: puede variar **por capacidad**. El catálogo puede ser AP (mostrar un precio de hace un minuto es aceptable); el saldo de una cuenta bancaria al retirar dinero quizá deba ser CP. Y el mundo real ya es eventualmente consistente: el inventario del sistema no es el del estante. Diseña con eso en mente, como hiciste con las sagas.

### 8. Chaos engineering y game days

Si tus mecanismos de resiliencia nunca se ejercitan, no sabes si funcionan. **Chaos engineering** es experimentar deliberadamente con fallos para ganar confianza en la capacidad del sistema de soportarlos:

1. Define el estado estable (por ejemplo, pedidos por minuto y SLOs).
2. Formula una hipótesis ("si mato el 30 % de los Pods de `catalog`, los SLOs se mantienen").
3. Introduce el fallo (matar Pods, añadir latencia, cortar una dependencia), empezando en entornos de prueba y con alcance limitado.
4. Observa y aprende; corrige lo que falló.

Los **game days** son ejercicios planificados en los que el equipo simula un incidente (a veces sin avisar a quienes responden) para practicar la respuesta humana, no solo la técnica. Un service mesh permite inyectar latencia o errores en rutas concretas para estos experimentos.

**Blameless culture.** Cuando algo falla, la pregunta útil es "¿qué condiciones permitieron que esto pasara?" y no "¿quién tiene la culpa?". Si la gente teme ser culpada, esconde información, y el sistema no aprende.

### 9. Kubernetes y el self-healing

Sayfan resume los pilares de un sistema que se cura solo: **redundancia**, **observabilidad** y **recuperación automática**. Kubernetes aporta:

- Reinicio de containers que mueren o fallan su liveness probe (`restartPolicy`).
- Reprogramación de Pods en otros nodos si un nodo falla.
- Retirada de tráfico de Pods no listos (readiness).
- Mantenimiento del número de réplicas (desired state).

Pero no protege contra **fallos sistémicos**: un bug en todas las réplicas, una dependencia caída, una configuración errónea desplegada en todas partes. Para eso necesitas los patrones anteriores y despliegue progresivo.

### 10. Escalado: los cuatro ejes

Escalas por dos motivos: **rendimiento** (más carga, menos latencia) y **robustez**. Hay cuatro formas, que se pueden combinar:

| Eje | Qué es | Ventajas | Límites |
| --- | --- | --- | --- |
| Vertical | Máquina más grande | Rápido, sin cambios de código | Tiene techo; no mejora la robustez |
| Duplicación horizontal | Más copias haciendo el mismo trabajo, detrás de un load balancer o leyendo de una cola | Simple para servicios sin estado; mejora robustez | El estado compartido (la base de datos) se vuelve el cuello de botella |
| Particionado de datos | Repartir el trabajo según un atributo de los datos (cliente, región) | Escala escrituras; aísla fallos por partición | Elegir la clave es difícil; consultas que cruzan particiones; rebalanceo |
| Descomposición funcional | Separar funcionalidades en servicios que escalan por separado | Escalas solo lo que lo necesita; tecnología adecuada por función | Es la más costosa; es lo que hacen los microservicios |

Un ejemplo: una empresa de reparto de comida con contención de escrituras en su base primaria ya escaló verticalmente varias veces; la duplicación horizontal de la aplicación no ayuda porque el cuello está en la base; el particionado por país es la palanca natural a medio plazo, y la descomposición funcional (sacar la gestión de repartidores a su propio servicio y base) quita carga a la base central.

**Empieza pequeño.** No optimices para una escala que no tienes. Mide dónde está el cuello de botella real y aplica la técnica más simple que lo resuelva; muchas veces es la vertical o la duplicación horizontal. Y recuerda la regla de que un sistema diseñado para 10x de tu carga actual probablemente necesitará rediseñarse antes de llegar a 100x; eso es normal.

**Caching** (repaso del módulo 05): reduce latencia y carga y puede dar robustez (servir datos viejos si el origen cae). Recuerda la regla de oro: **cachea en el menor número de lugares posible**; cada capa de cache añade preguntas sobre frescura e invalidación.

### 11. Autoescalado en Kubernetes

- **Horizontal Pod Autoscaler (HPA)**: ajusta el número de réplicas de un Deployment según una métrica (CPU, memoria o métricas personalizadas como peticiones por segundo o tamaño de cola). Necesita el metrics server para CPU y memoria, y que definas `requests`.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: orders }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: orders }
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 70 }
```

- **Vertical Pod Autoscaler (VPA)**: ajusta `requests` y `limits` de los Pods según su uso histórico. Útil para dimensionar bien; no suele combinarse con el HPA sobre la misma métrica.
- **Cluster autoscaler**: añade o quita **nodos** cuando hay Pods que no caben o nodos infrautilizados. En la nube; en un cluster local no aplica.

Consejos: escala con métricas que reflejen la carga real (para un consumidor de colas, el tamaño de la cola es mejor que la CPU); fija un mínimo de réplicas para absorber picos mientras se escala; y recuerda que escalar instancias no sirve si el cuello está en la base de datos. El autoescalado **reactivo** responde a la carga actual; el **predictivo** se adelanta a patrones conocidos (picos de mediodía, campañas).

Sayfan también recuerda que **aprovisionar bien** es un equilibrio entre rendimiento, alta disponibilidad, costo y seguridad: más recursos de los necesarios cuestan dinero; menos degradan la experiencia. Medir y ajustar es un trabajo continuo.

### 12. Errores comunes

- Llamadas remotas sin timeout o con timeouts muy largos.
- Reintentos en todas las capas, sin backoff ni jitter.
- Un único pool de conexiones compartido para todas las dependencias.
- Reintentar operaciones no idempotentes (cobros duplicados).
- Diseñar la degradación sin preguntar al negocio qué es aceptable.
- Tres réplicas en la misma zona "para alta disponibilidad".
- Escalar horizontalmente cuando el cuello de botella es la base de datos.
- Postmortems que buscan culpables.

## Conceptos clave

- **Robustez / rebound / graceful extensibility / sustained adaptability**: las cuatro facetas de la resiliencia.
- **Degradación de funcionalidad**: seguir ofreciendo lo esencial cuando una parte falla.
- **Timeout**: límite de espera para una llamada remota.
- **Backoff exponencial con jitter**: esperas crecientes y aleatorias entre reintentos.
- **Bulkhead**: aislamiento de recursos para contener fallos.
- **Circuit breaker**: corta las llamadas a una dependencia que falla y prueba periódicamente su recuperación.
- **Idempotencia**: repetir una operación produce el mismo resultado que hacerla una vez.
- **Chaos engineering**: experimentos controlados con fallos para verificar la resiliencia.
- **HPA**: autoescalado horizontal de Pods según métricas.

## Preguntas de repaso

1. ¿Por qué un servicio lento puede ser más peligroso que uno caído?
   R: Porque un servicio caído falla rápido y se detecta enseguida, mientras que uno lento retiene conexiones, hilos y memoria de todos sus clientes mientras esperan. Esa contención se propaga hacia arriba y puede provocar un fallo en cascada de todo el sistema.
2. Explica los tres estados de un circuit breaker.
   R: Cerrado: las llamadas pasan normalmente y se cuentan los fallos. Abierto: tras superar el umbral de fallos, las llamadas fallan inmediatamente sin ir a la red, dando respiro a la dependencia. Medio abierto: tras un tiempo, deja pasar llamadas de prueba; si funcionan se cierra y si fallan vuelve a abrirse.
3. ¿Qué reglas deben cumplir los reintentos para no empeorar un incidente?
   R: Reintentar solo errores transitorios y operaciones idempotentes, con backoff exponencial y jitter, con un número limitado de intentos dentro del presupuesto de tiempo total, y en una sola capa de la cadena para evitar la amplificación.
4. ¿Cómo haces idempotente un endpoint de cobro?
   R: Exigiendo una clave de idempotencia única por operación lógica, guardándola con una restricción de unicidad junto al resultado, y devolviendo el resultado guardado si llega una petición repetida con la misma clave, sin volver a cobrar.
5. Describe los cuatro ejes de escalado y cuándo usarías cada uno.
   R: Vertical, una máquina más grande, como solución rápida hasta su techo. Duplicación horizontal, más copias del mismo servicio, para servicios sin estado con carga creciente. Particionado de datos, repartir por un atributo como región o cliente, cuando el cuello son las escrituras sobre un mismo almacén. Descomposición funcional, separar funcionalidades en servicios, cuando partes distintas tienen necesidades de escala diferentes.
6. ¿Qué no puede resolver el self-healing de Kubernetes?
   R: Los fallos sistémicos: un bug presente en todas las réplicas, una configuración errónea desplegada en todas partes o una dependencia externa caída. Reiniciar Pods no lo arregla; hacen falta patrones de estabilidad, despliegue progresivo y rollback.

## Ejercicio

Construye en TypeScript un cliente resiliente para un servicio `recommendations` simulado (un servidor Express que, según una variable, responde normal, lento de 3 s, o con 503). El cliente debe combinar timeout de 300 ms, un reintento con backoff y jitter solo para 503, un circuit breaker (umbral 5 fallos, reset 10 s) y un fallback a una lista estática. Escribe tests con vitest y temporizadores falsos. Criterio de terminado: (1) en modo lento, ninguna llamada del cliente tarda más de 700 ms; (2) tras 5 fallos, las llamadas siguientes devuelven el fallback sin tocar la red (verificado contando peticiones recibidas por el servidor); (3) tras 10 s y con el servidor sano, el circuito se cierra; (4) un 400 no se reintenta.

## Explícalo con tus palabras

Explica qué hace un circuit breaker usando el ejemplo de dejar de llamar a un amigo que nunca contesta el teléfono y probar de nuevo más tarde.
