---
title: Observabilidad: logs, métricas, tracing, SLOs y alertas
kind: lesson
hours: 2
sources: Building Microservices 2nd ed., cap. 10 "From Monitoring to Observability" (pp. 384–430) | Hands-On Microservices with Kubernetes, cap. 12 "Monitoring, Logging, and Metrics" (pp. 398–427)
links: OpenTelemetry — Documentation | https://opentelemetry.io/docs/ ; Prometheus — Overview | https://prometheus.io/docs/introduction/overview/ ; Google SRE Book — Service Level Objectives | https://sre.google/sre-book/service-level-objectives/
---

## Objetivo

Hacer observable un sistema de microservicios: logs estructurados y agregados con correlation IDs, métricas con baja y alta cardinalidad, distributed tracing, definir SLIs/SLOs y error budgets, diseñar alertas que no generen fatiga y usar semantic monitoring.

## Estudio

### 1. El problema: más piezas, más confusión

Con un monolito en un servidor, cuando algo falla miras los logs de ese servidor y la CPU de esa máquina. Con un servicio en varias instancias, ya tienes que mirar varias máquinas y agregar. Con decenas de servicios en decenas de instancias, una petición lenta puede deberse a cualquiera de los servicios por los que pasó, a la red entre ellos o a una dependencia compartida. Entrar por SSH a cada máquina deja de ser una opción.

```
 Un servicio, un servidor     → mirar un log, una métrica
 Un servicio, N servidores    → agregar logs y métricas, saber qué instancia
 M servicios, N servidores    → seguir una petición a través de varios servicios,
                                correlacionar, distinguir síntoma de causa
```

### 2. Monitoreo vs. observabilidad

- **Monitoreo** es una **actividad**: observar el sistema, normalmente buscando problemas que imaginaste de antemano ("alerta si la CPU pasa del 90 %").
- **Observabilidad** es una **propiedad** del sistema: cuánto puedes entender su estado interno a partir de lo que emite hacia fuera.

En un sistema distribuido aparecen problemas que nunca imaginaste. Un sistema observable te permite **hacer preguntas nuevas** a los datos de producción ("¿las peticiones lentas de ayer vienen todas de clientes de un mismo país que usan la app móvil vieja?") sin tener que desplegar código nuevo para responderlas.

A veces se habla de "tres pilares" (logs, métricas, trazas). Es una simplificación útil para empezar, pero no la confundas con el objetivo: lo que buscas es poder responder preguntas, y para eso a menudo necesitas **eventos ricos en contexto** que puedan verse como logs, agregarse como métricas o encadenarse como trazas.

### 3. Agregación de logs: el primer paso, antes que todo

Si vas a construir microservicios, la **agregación de logs** es un prerrequisito. Es relativamente fácil de montar y, si tu organización no consigue hacerlo, difícilmente podrá con el resto. El esquema general:

```
 [servicio] → stdout ─┐
 [servicio] → stdout ─┼─► agente en cada nodo (Fluent Bit, Vector) ─► almacén consultable
 [servicio] → stdout ─┘                                               (Loki, Elasticsearch,
                                                                       servicio gestionado)
```

En containers, la convención es escribir los logs a **stdout/stderr**; el runtime los guarda y el agente del nodo los recoge. La aplicación no necesita conocer el sistema de logs.

**Formato común y estructurado.** Para consultar logs de muchos servicios necesitas un formato uniforme. Lo más útil es **JSON estructurado**, con campos consistentes:

```json
{"ts":"2026-10-20T14:02:11.482Z","level":"error","service":"orders","version":"3f9c2ab",
 "correlationId":"c7a1-44f2","route":"POST /orders","customerTier":"gold",
 "msg":"payment authorization failed","durationMs":812,"error":"timeout calling payments"}
```

En Node, librerías como **pino** producen JSON rápido:

```ts
import pino from "pino";
export const log = pino({ base: { service: "orders", version: process.env.GIT_SHA } });

log.info({ orderId, totalCents }, "order created");
```

**Correlation IDs.** Cuando una petición entra al sistema, genera un ID único (o reutiliza el que trae) y **propágalo** en cada llamada a otros servicios (cabecera HTTP, metadatos del mensaje) y en **cada línea de log**. Así puedes buscar todas las líneas de todos los servicios relacionadas con una petición.

```ts
import { randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";

const als = new AsyncLocalStorage<{ correlationId: string }>();

app.use((req, res, next) => {
  const correlationId = req.header("x-correlation-id") ?? randomUUID();
  res.setHeader("x-correlation-id", correlationId);
  als.run({ correlationId }, next);
});

export const logger = () => log.child({ correlationId: als.getStore()?.correlationId });
// al llamar a otro servicio: headers: { "x-correlation-id": als.getStore()?.correlationId }
```

Es mucho más fácil añadir correlation IDs al principio que retroactivamente en veinte servicios. Hazlo desde el primer servicio.

**Cuidados con los logs:**

- **Sincronización de tiempo**: los relojes de las máquinas no son perfectos; no confíes en los timestamps para ordenar eventos de servicios distintos al milisegundo.
- **Volumen y costo**: los logs crecen rápido. Define niveles, muestrea lo muy repetitivo y fija retención.
- **Datos sensibles**: nunca loguees contraseñas, tokens ni datos personales innecesarios.
- **Logging vs. error reporting**: Sayfan distingue entre logs (registro de lo que pasa) y reporte de errores (agrupar excepciones con stack trace y contexto en una herramienta dedicada). Son complementarios.

### 4. Métricas

Las métricas son **valores numéricos agregados en el tiempo**: peticiones por segundo, latencia, uso de memoria, pedidos completados. Son baratas de almacenar y perfectas para dashboards y alertas.

Tipos habituales (en el modelo de Prometheus):

- **Counter**: solo crece (peticiones totales, errores totales). Se consulta su tasa de cambio.
- **Gauge**: sube y baja (conexiones abiertas, tamaño de una cola).
- **Histogram**: distribución de valores en buckets (latencias), de la que se calculan percentiles.

**Percentiles, no promedios.** El promedio de latencia esconde los casos lentos. Si el p50 es 40 ms y el p99 es 3 s, uno de cada cien usuarios espera tres segundos; con varios servicios en cadena, la probabilidad de que alguna llamada caiga en la cola lenta crece.

**Cardinalidad.** Cada combinación de etiquetas (`route`, `status`, `customerId`...) crea una serie temporal distinta. Etiquetar por `customerId` con un millón de clientes crea un millón de series y puede tumbar un sistema de métricas tradicional. Las herramientas modernas de observabilidad que guardan **eventos de alta cardinalidad** permiten hacer esas preguntas, pero con un modelo distinto. Regla práctica: en métricas, etiquetas con pocos valores posibles; el detalle fino va a logs o trazas.

**Métodos para elegir qué medir:**

| Método | Para qué | Métricas |
| --- | --- | --- |
| RED | Servicios que atienden peticiones | **R**ate (tasa), **E**rrors (errores), **D**uration (latencia) |
| USE | Recursos (CPU, disco, colas) | **U**tilization, **S**aturation, **E**rrors |

Y añade **métricas de negocio**: pedidos por minuto, registros completados, pagos rechazados. A menudo detectan problemas que las técnicas no ven.

Exponer métricas desde Node con `prom-client`:

```ts
import client from "prom-client";

const httpDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duración de peticiones HTTP",
  labelNames: ["route", "method", "status"],   // baja cardinalidad
  buckets: [0.01, 0.05, 0.1, 0.3, 1, 3],
});

app.use((req, res, next) => {
  const end = httpDuration.startTimer({ route: req.route?.path ?? "unknown", method: req.method });
  res.on("finish", () => end({ status: String(res.statusCode) }));
  next();
});

app.get("/metrics", async (_req, res) => {
  res.type(client.register.contentType).send(await client.register.metrics());
});
```

En Kubernetes, **Prometheus** descubre los Pods (por anotaciones o por objetos de configuración), **raspa** periódicamente su endpoint `/metrics` y guarda las series. Grafana las visualiza. El **metrics server** de Kubernetes, en cambio, solo recoge CPU y memoria de Pods y nodos para cosas como `kubectl top` y el autoescalado (sesión 16).

### 5. Distributed tracing

Los logs con correlation ID te dicen **qué** pasó; las trazas te dicen **dónde se fue el tiempo**. Una **traza** representa el recorrido de una petición por el sistema; cada operación dentro de ella es un **span**, con inicio, duración y relación padre-hijo.

```
 Traza c7a1-44f2  (total 1.240 ms)
 ├─ api-gateway   POST /checkout            1.240 ms
 │  ├─ orders     createOrder                 980 ms
 │  │  ├─ catalog  GET /products?ids=...        45 ms
 │  │  ├─ payments POST /authorize             812 ms  ← aquí está el tiempo
 │  │  │  └─ pasarela externa                  790 ms
 │  │  └─ postgres INSERT orders                12 ms
 │  └─ (publicación OrderPlaced)                 3 ms
```

Cómo funciona:

1. El primer servicio crea un **trace ID** y un span.
2. Al llamar a otro servicio, propaga el contexto (en el estándar W3C, la cabecera `traceparent`).
3. Cada servicio crea spans hijos y los envía a un **collector**.
4. Una herramienta (Jaeger, la que usa Sayfan; Tempo; Zipkin; o un servicio comercial) reconstruye y muestra la traza.

El estándar actual para instrumentar es **OpenTelemetry**: APIs y SDKs neutrales para emitir trazas, métricas y logs, y un collector que los envía a cualquier backend. Con auto-instrumentación, librerías como HTTP, Express o clientes de Postgres generan spans sin que escribas código.

```ts
// tracing.ts, cargado antes que el resto de la aplicación
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

new NodeSDK({
  serviceName: "orders",
  traceExporter: new OTLPTraceExporter({ url: "http://otel-collector:4318/v1/traces" }),
  instrumentations: [getNodeAutoInstrumentations()],
}).start();
```

**Muestreo (sampling).** Guardar todas las trazas puede ser caro. Se muestrea: un porcentaje fijo, o mejor, decisiones al final ("guarda todas las trazas con error y el 5 % de las exitosas"). Sin un muestreo pensado, la traza que necesitas puede no estar.

Un service mesh (sesión 06) genera spans de cada salto de red automáticamente, pero la aplicación igual debe **propagar las cabeceras** de una petición entrante a las salientes; si no, cada salto aparece como una traza aislada.

### 6. ¿Lo estamos haciendo bien? SLA, SLO, SLI y error budgets

En un sistema distribuido, "arriba" o "abajo" deja de tener sentido. Si una instancia de cinco no responde pero el resto atiende bien, ¿el servicio está sano? Piensa en una colmena: una abeja enferma no significa que la colmena lo esté. Hay que definir qué es un comportamiento **aceptable**, desde el punto de vista de quien usa el sistema.

- **SLA (Service Level Agreement)**: acuerdo con los usuarios o clientes, con consecuencias si no se cumple (por ejemplo, créditos). Suele ser un mínimo bajo.
- **SLO (Service Level Objective)**: objetivo que un equipo se compromete a cumplir para su servicio. "El 99,5 % de las peticiones a `POST /orders` en 30 días responden con éxito en menos de 400 ms".
- **SLI (Service Level Indicator)**: la medición real que usas para comprobar el SLO. "Proporción de peticiones `POST /orders` con status < 500 y duración < 400 ms".
- **Error budget**: lo que el SLO permite fallar. Con 99,5 % en 30 días, el 0,5 % de peticiones puede fallar. Si te sobra presupuesto, puedes arriesgar más (desplegar más rápido, experimentar). Si lo agotaste, priorizas estabilidad sobre funcionalidades nuevas.

```
 SLO 99,5 % mensual, 2.000.000 de peticiones
 → error budget = 10.000 peticiones fallidas o lentas

 Día 12: consumidas 3.000 (30 %)  → seguir desplegando con normalidad
 Día 20: consumidas 9.500 (95 %)  → congelar cambios arriesgados, invertir en fiabilidad
```

El error budget convierte una discusión subjetiva ("¿desplegamos o no?") en una decisión basada en datos compartidos entre producto e ingeniería.

### 7. Alertas: qué debe despertarte a las 3 de la mañana

Con muchas fuentes de señales, el riesgo no es que falten alertas sino que **sobren**. La **fatiga de alertas** hace que las personas ignoren o silencien alertas, incluida la que importa. Investigaciones de accidentes industriales y aéreos han señalado justamente paneles saturados de alarmas como un factor.

Principios para buenas alertas:

- **Alerta sobre síntomas que afectan al usuario**, no sobre cada causa posible. "El SLO de checkout se está quemando rápido" es mejor que "la CPU de un nodo está al 85 %".
- **Cada alerta debe ser accionable**: si quien la recibe no puede hacer nada, no es una alerta, es información para un dashboard o un informe diario.
- **Distingue severidades**: lo que exige respuesta inmediata (página a la persona de guardia) de lo que puede esperar al horario laboral (ticket). Un disco que falla en un sistema redundante es rutinario: se cambia mañana.
- **Relevante, única, oportuna, priorizada, comprensible, diagnosticable**: una buena alerta dice qué pasa, desde cuándo, a qué afecta y enlaza a un runbook o dashboard.
- **Afina el ruido**: revisa con regularidad qué alertas saltaron sin requerir acción y elimínalas o ajústalas.

Las **alertas basadas en burn rate** del error budget son una buena práctica: alerta urgente si al ritmo actual agotarías el presupuesto mensual en horas, y aviso no urgente si lo agotarías en días.

```yaml
# Regla de Prometheus (simplificada)
- alert: CheckoutErrorBudgetBurnFast
  expr: |
    (sum(rate(http_requests_total{route="/checkout",status=~"5.."}[5m]))
     / sum(rate(http_requests_total{route="/checkout"}[5m]))) > (14.4 * 0.005)
  for: 5m
  labels: { severity: page }
  annotations:
    summary: "Checkout quemando el error budget 14x más rápido de lo sostenible"
    runbook: "https://example.com/runbooks/checkout-errors"
```

Sayfan añade matices útiles: **acepta que los componentes fallan** (un Pod que se reinicia no merece una alerta si el servicio sigue sano), **acepta a regañadientes que el sistema falla** (y define qué hacer), y piensa en el factor humano: canales adecuados para cada severidad y alertas que no despierten a nadie sin motivo. Prometheus con **Alertmanager** agrupa, silencia y enruta alertas según su severidad.

### 8. Semantic monitoring

En lugar de deducir la salud del sistema a partir de cientos de métricas técnicas, **pregúntale directamente si funciona**: ¿pueden los usuarios hacer lo que deben poder hacer?

- **Transacciones sintéticas**: un proceso que cada pocos minutos ejecuta un recorrido real ("registrarse, buscar, añadir al carrito, pagar con una tarjeta de prueba") y mide si funciona y cuánto tarda.
- **Métricas de negocio como señal**: si los pedidos por minuto caen un 60 % respecto a la misma hora de la semana pasada, algo va mal aunque todas las métricas técnicas estén verdes.

Es una forma de **testing en producción** (sesión 13). Tiene que ser segura: datos marcados como sintéticos, sin efectos reales.

### 9. Estandarizar y elegir herramientas

Algunas cosas deben ser iguales en todos los servicios para que la observabilidad funcione: formato de logs, nombres de campos, cabeceras de correlación y de tracing, nombres de métricas básicas. Un **paved road** (plantilla de servicio o librería de plataforma) que lo traiga hecho es la forma más fácil de lograrlo.

Al elegir herramientas, busca que sean: accesibles a todos los equipos (no solo a operaciones), fáciles de integrar (estándares abiertos como OpenTelemetry), capaces de dar **contexto** (enlazar de una métrica a las trazas y logs correspondientes), cercanas al **tiempo real**, y adecuadas a tu escala (no necesitas la herramienta de una empresa con 10.000 servicios).

Por dónde empezar, en orden: logs agregados con correlation ID → métricas RED por servicio → un par de SLOs para los recorridos críticos → tracing → semantic monitoring.

### 9.1 Ejemplo trabajado: investigar un incidente con las tres señales

Son las 10:40 y salta la alerta "checkout quemando el error budget". Así se usan las señales en orden:

1. **Métricas (¿qué y desde cuándo?).** El dashboard RED de `checkout` muestra que la tasa de errores pasó del 0,2 % al 6 % a las 10:31, y el p99 de latencia subió de 300 ms a 2,5 s. Las métricas de `payments` muestran el mismo patrón; las de `catalog`, no. Hipótesis: el problema está en `payments` o más abajo.
2. **Trazas (¿dónde se va el tiempo?).** Filtras trazas de `POST /checkout` con error desde las 10:31. Todas tienen el span `payments → pasarela externa` con 2 s de duración y un timeout. Las trazas exitosas tienen ese span en 200 ms.
3. **Logs (¿por qué?).** Con el trace ID o el correlation ID de una petición fallida, buscas en los logs de `payments`: "connection pool exhausted, waiting for connection". Ves que a las 10:30 se desplegó `payments:9e1f0aa`, que bajó por error el tamaño del pool de conexiones a la pasarela de 50 a 5.
4. **Acción.** Rollback de `payments` a la versión anterior (sesión 12). A las 10:47 la tasa de errores vuelve al 0,2 %.

Fíjate en que ninguna señal sola bastaba: las métricas dijeron **qué** y **cuándo**, las trazas **dónde**, y los logs **por qué**. Y fíjate en el dato que lo resolvió todo: la **versión** en las etiquetas de métricas y en los logs, que permitió correlacionar el inicio del problema con un despliegue. Etiquetar todo con la versión desplegada es uno de los hábitos más rentables que puedes tener.

### 10. Historia de fallo

Un equipo tiene 140 alertas configuradas: CPU, memoria, disco, reinicios de Pods, colas, latencias por endpoint. La persona de guardia recibe unas 30 notificaciones por noche, casi todas sin consecuencias, y las silencia. Una noche, entre ellas aparece "aumento de 5xx en payments". Pasa desapercibida durante dos horas, en las que el 30 % de los pagos falla. El postmortem lleva a reemplazar las 140 alertas por 6 alertas de síntoma basadas en SLOs (checkout, login, búsqueda, pagos, registro, entrega de emails) y un informe diario no urgente con el resto. Las notificaciones nocturnas bajan a una por semana, y cada una importa.

### 11. Errores comunes

- Empezar microservicios sin logs agregados ni correlation IDs.
- Logs en texto libre imposibles de consultar.
- Promedios en lugar de percentiles para la latencia.
- Métricas con etiquetas de alta cardinalidad (IDs de usuario).
- Alertas sobre causas técnicas no accionables en lugar de síntomas.
- No propagar el contexto de tracing entre servicios.
- SLOs que nadie mira ni usa para decidir.

## Conceptos clave

- **Observabilidad**: propiedad de un sistema que permite entender su estado interno a partir de sus salidas.
- **Agregación de logs**: recolección centralizada de logs de todas las instancias en un almacén consultable.
- **Correlation ID**: identificador propagado entre servicios y logs para seguir una petición.
- **Cardinalidad**: número de combinaciones distintas de etiquetas de una métrica.
- **Distributed tracing**: reconstrucción del recorrido de una petición mediante spans relacionados.
- **SLI / SLO / SLA**: medición / objetivo del equipo / acuerdo con consecuencias para el cliente.
- **Error budget**: margen de fallo que permite el SLO y que guía cuánto riesgo asumir.
- **Semantic monitoring**: verificar continuamente que los recorridos de negocio funcionan.

## Preguntas de repaso

1. ¿Qué diferencia hay entre monitoreo y observabilidad?
   R: El monitoreo es una actividad, normalmente vigilar problemas previstos de antemano. La observabilidad es una propiedad del sistema: cuánto puedes entender su estado a partir de sus salidas, lo que te permite responder preguntas nuevas sobre fallos que no anticipaste.
2. ¿Por qué los correlation IDs deben añadirse desde el primer servicio?
   R: Porque sin ellos no puedes relacionar las líneas de log de distintos servicios que pertenecen a una misma petición, y añadirlos después exige modificar todos los servicios y sus llamadas. Desde el principio es barato y se convierte en convención.
3. ¿Por qué usar percentiles y no promedios para la latencia, y qué problema tiene etiquetar métricas por ID de usuario?
   R: El promedio esconde la cola lenta que sufren algunos usuarios, y en cadenas de servicios esa cola se acumula; los percentiles como p99 la muestran. Etiquetar por ID de usuario dispara la cardinalidad, creando una serie por usuario que puede saturar el sistema de métricas.
4. Explica la relación entre SLI, SLO y error budget con un ejemplo.
   R: El SLI es la medición, por ejemplo la proporción de peticiones a checkout exitosas en menos de 400 ms. El SLO es el objetivo, por ejemplo 99,5 % en 30 días. El error budget es el 0,5 % restante: si se consume rápido se prioriza la estabilidad; si sobra, se puede asumir más riesgo.
5. ¿Qué características tiene una buena alerta?
   R: Se basa en síntomas que afectan a usuarios, es accionable, tiene la severidad y el canal adecuados, llega a tiempo, es comprensible y enlaza a información para diagnosticar, como un runbook o un dashboard.
6. ¿Qué es un span y qué hace falta para que una traza cruce varios servicios?
   R: Un span es una operación con inicio, duración y relación padre-hijo dentro de una traza. Para que la traza cruce servicios, cada servicio debe propagar el contexto (por ejemplo la cabecera traceparent) de la petición entrante a sus llamadas salientes y enviar sus spans a un collector.

## Ejercicio

Instrumenta dos servicios Express en TypeScript (`gateway` llama a `orders`): logs JSON con pino incluyendo `service`, `version` y `correlationId` propagado por cabecera; un histograma de latencia y un contador de errores con `prom-client` expuestos en `/metrics`; y tracing con OpenTelemetry enviando a un Jaeger local en Docker (`jaegertracing/all-in-one`). Añade a `orders` un retraso aleatorio y un 5 % de errores. Criterio de terminado: (1) con un solo correlation ID encuentras con `grep` las líneas de ambos servicios de una petición; (2) en Jaeger ves una traza con spans de ambos servicios; (3) escribes un SLO para `gateway` y la consulta PromQL de su SLI, y calculas a mano el error budget para 100.000 peticiones.

## Explícalo con tus palabras

Explica a alguien de producto qué es un error budget y por qué puede ayudar a decidir cuándo frenar los lanzamientos.
