---
title: Despliegue progresivo, rollback y resiliencia operativa
kind: lesson
hours: 3
sources: Building Microservices 2nd ed., cap. 8 "Progressive Delivery" (pp. 341–347) y cap. 12 "Resiliency" (pp. 481–519) | Hands-On Microservices with Kubernetes, cap. 11 "Deploying Microservices" (pp. 328–379) y cap. 12 "Self-healing with Kubernetes" y "Autoscaling a Kubernetes cluster" (pp. 381–396)
links: Kubernetes — Deployments (rolling update) | https://kubernetes.io/docs/concepts/workloads/controllers/deployment/ ; Martin Fowler — BlueGreenDeployment | https://martinfowler.com/bliki/BlueGreenDeployment.html ; Martin Fowler — CanaryRelease | https://martinfowler.com/bliki/CanaryRelease.html ; Kubernetes — Horizontal Pod Autoscaling | https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/ ; Principles of Chaos Engineering | https://principlesofchaos.org/
---

## Objetivo

Separar despliegue de release; comparar recreate, rolling update, blue-green y canary en Kubernetes; usar feature toggles; planificar el rollback de cada estrategia, incluido el caso difícil de los cambios de esquema; y completar la operación con resiliencia: decidir cómo se degrada cada funcionalidad, verificar la resiliencia con chaos engineering y escalar con el Horizontal Pod Autoscaler.

## Estudio

### 1. Desplegar más seguido falla menos

Una intuición común dice que desplegar seguido es arriesgado. La investigación sobre equipos de alto rendimiento (popularizada en el libro *Accelerate*) muestra lo contrario: las organizaciones que despliegan con más frecuencia tienen **tasas de fallo de cambio más bajas** y se recuperan más rápido. ¿Por qué? Porque los cambios pequeños son más fáciles de entender, probar y revertir, y porque desplegar seguido obliga a automatizar y a tener mecanismos seguros.

La pieza conceptual que lo hace posible es separar dos ideas:

- **Deployment (despliegue)**: instalar una versión del software en un entorno.
- **Release (liberación)**: hacer que una funcionalidad esté disponible para los usuarios.

Si siempre ocurren a la vez, cada despliegue expone el código nuevo a todos los usuarios de golpe. Si las separas, puedes desplegar código en producción, verificar que funciona, y **luego** decidir a quién y cuándo se lo muestras. Ese conjunto de técnicas se llama **progressive delivery**: liberar funcionalidad de forma controlada y gradual.

### 2. Recreate: la estrategia más simple (y con downtime)

Detienes todas las instancias viejas y arrancas las nuevas.

```
 v1 v1 v1  ──►  (nada)  ──►  v2 v2 v2
              downtime
```

Útil solo cuando dos versiones **no pueden convivir** (por ejemplo, un cambio de esquema incompatible) y puedes permitirte una ventana de corte. En Kubernetes: `strategy: { type: Recreate }`.

### 3. Rolling update: la estrategia por defecto de Kubernetes

Reemplazas instancias poco a poco: arrancas algunas nuevas, esperas a que estén listas, retiras algunas viejas, y repites.

```
 t0: v1 v1 v1
 t1: v1 v1 v1 v2        (maxSurge: 1 → una extra)
 t2: v1 v1 v2           (retira una v1 cuando v2 está ready)
 t3: v1 v1 v2 v2
 t4: v1 v2 v2
 ...
 tn: v2 v2 v2
```

```yaml
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1          # cuántos Pods extra puede haber durante la actualización
      maxUnavailable: 0    # cuántos pueden faltar respecto a replicas
  minReadySeconds: 10      # un Pod nuevo debe estar listo 10 s antes de contar como disponible
```

**Ventajas:** sin downtime (si las readiness probes y el apagado ordenado funcionan), sin infraestructura extra, integrado.

**Cuidados:**

- Durante la actualización **conviven v1 y v2**. Ambas reciben tráfico y comparten base de datos. Si no son compatibles entre sí, tendrás errores intermitentes.
- La **readiness probe** es la que decide el ritmo. Una probe que siempre devuelve 200 hace que Kubernetes retire instancias viejas antes de que las nuevas funcionen de verdad.
- Si los Pods nuevos nunca quedan listos, el rollout se **detiene** (no destruye las viejas con `maxUnavailable: 0`). Puedes configurar `progressDeadlineSeconds` para que se marque como fallido.

Comandos útiles:

```bash
kubectl set image deploy/orders orders=registry.local/orders:4b1d9e0
kubectl rollout status deploy/orders
kubectl rollout history deploy/orders
kubectl rollout undo deploy/orders                 # a la revisión anterior
kubectl rollout undo deploy/orders --to-revision=3
kubectl rollout pause deploy/orders                # congelar a mitad para observar
```

Anota la causa de cada cambio con la anotación `kubernetes.io/change-cause` para que `rollout history` sea legible.

### 4. Blue-green

Mantienes dos entornos completos: **blue** (la versión actual, con tráfico) y **green** (la nueva, sin tráfico). Despliegas green, la verificas, y cambias el tráfico de golpe. Si algo falla, vuelves a blue.

```
              ┌──────────┐
 tráfico ───► │ Service  │ selector: version=blue
              └────┬─────┘
          ┌────────┴─────────┐
   ┌──────▼─────┐     ┌──────▼─────┐
   │ blue (v1)  │     │ green (v2) │  ← desplegado y probado, sin tráfico
   └────────────┘     └────────────┘

 Cambio: selector: version=green  →  todo el tráfico pasa a v2 en un instante
 Rollback: volver a version=blue
```

En Kubernetes básico, se implementa con **dos Deployments** con labels distintas (`version: blue`, `version: green`) y un Service cuyo `selector` apunta a una u otra. Cambiar el selector cambia el tráfico. Es el ejemplo que construye Sayfan con su servicio de links.

```bash
kubectl patch service orders -p '{"spec":{"selector":{"app":"orders","version":"green"}}}'
```

**Ventajas:** cambio instantáneo; rollback instantáneo; puedes probar green en producción (con tráfico interno o de prueba) antes de liberar.

**Desventajas:** doble capacidad durante el cambio (en un cluster local da igual; en la nube cuesta); las conexiones largas o sesiones en memoria pueden romperse en el cambio; la base de datos es compartida, así que v1 y v2 deben ser compatibles con el mismo esquema.

### 5. Canary

Envías una **pequeña fracción** del tráfico a la versión nueva, observas métricas (errores, latencia, métricas de negocio), y si todo va bien aumentas gradualmente: 1 % → 10 % → 50 % → 100%. Si algo empeora, vuelves a 0 %.

```
            ┌─── 90 % ───► v1 v1 v1 v1 v1 v1 v1 v1 v1
 tráfico ───┤
            └─── 10 % ───► v2
```

**Canary básico en Kubernetes**: dos Deployments que comparten la label que usa el Service (`app: orders`) pero difieren en otra (`track: stable` / `track: canary`). Como el Service reparte por Pods, la proporción de réplicas aproxima la proporción de tráfico: 9 Pods estables y 1 canary ≈ 10 % (de forma aproximada; en un cluster local la distribución puede variar bastante, como observa Sayfan en sus pruebas).

```yaml
# orders-canary: misma label app, distinta track, 1 réplica
metadata:
  name: orders-canary
spec:
  replicas: 1
  template:
    metadata:
      labels: { app: orders, track: canary }
```

**Canary preciso**: con un service mesh o un Ingress que soporte pesos, defines el porcentaje exacto independientemente del número de réplicas, o enrutas por cabecera (solo usuarios internos ven la versión nueva). Herramientas como Argo Rollouts o Flagger automatizan el proceso: suben el porcentaje por pasos y **revierten solas** si las métricas empeoran.

Un canary solo es útil si **mides**. Define antes de empezar qué métricas comparas entre canary y estable (tasa de errores 5xx, latencia p99, y alguna de negocio como "pedidos completados por minuto") y qué umbral dispara el rollback.

### 5.1 Ejemplo trabajado: un plan de canary paso a paso

Supón que vas a liberar una versión nueva de `pricing` que cambia el algoritmo de descuentos. Antes de tocar nada, escribes el plan:

| Paso | Tráfico al canary | Duración mínima | Condición para avanzar | Condición para revertir |
| --- | --- | --- | --- | --- |
| 0 | 0 % (desplegado, solo tráfico sintético) | 10 min | Smoke tests en verde | Cualquier error |
| 1 | 1 % | 30 min | Errores 5xx ≤ estable + 0,1 pp; p99 ≤ estable × 1,2 | Superar cualquiera de los umbrales |
| 2 | 10 % | 1 h | Igual que el paso 1 y "pedidos con descuento por minuto" dentro de ±5 % | Desviación de la métrica de negocio |
| 3 | 50 % | 2 h | Igual | Igual |
| 4 | 100 % | — | — | Rollback con blue-green si aparece algo tarde |

Observa varias decisiones:

- **El paso 0 sin usuarios** verifica que la versión arranca, se conecta a sus dependencias y responde, sin arriesgar a nadie.
- **Se compara contra la versión estable al mismo tiempo**, no contra "ayer". Así el ruido (horas pico, campañas) afecta a ambos por igual.
- **Hay una métrica de negocio.** Un bug en descuentos puede no producir ningún error 500: el servicio responde 200 con un precio equivocado. Solo una métrica de negocio lo delata.
- **Los umbrales se fijan antes** de empezar; decidirlos mientras miras las gráficas invita a racionalizar ("seguro es ruido").
- **La duración de cada paso** debe cubrir suficiente tráfico para que la comparación tenga sentido. Con poco tráfico, el 1 % puede ser una petición cada diez minutos: no aprenderías nada.

Las herramientas de canary automatizado (Argo Rollouts, Flagger) codifican exactamente esta tabla: pasos, pesos, consultas de métricas y umbrales. Si una consulta falla, revierten sin intervención humana. Aun sin herramientas, escribir la tabla te obliga a pensar qué significa "funciona".

### 6. Feature toggles

Un feature toggle (flag) es un condicional en el código cuyo valor viene de configuración:

```ts
if (flags.isEnabled("new-checkout", { userId: user.id })) {
  return newCheckout(cart);
}
return legacyCheckout(cart);
```

Permiten:

- **Desplegar código sin liberarlo** (toggle apagado): trunk-based development sin exponer funcionalidad a medias.
- **Liberar a un subconjunto**: empleados, un país, el 5 % de usuarios.
- **Apagar rápido** una funcionalidad que da problemas, sin desplegar.

Tipos según su vida: toggles de release (temporales, se borran cuando la funcionalidad está al 100 %), toggles operativos (interruptores de emergencia de larga vida, "apagar recomendaciones si hay sobrecarga"), toggles de experimento (A/B) y toggles de permiso (funcionalidad premium).

Un toggle con porcentaje no necesita una plataforma comercial para empezar. Lo importante es que la decisión sea **estable por usuario** (el mismo usuario ve siempre la misma variante) y que el valor venga de configuración:

```ts
import { createHash } from "node:crypto";

type FlagConfig = { enabled: boolean; percentage: number; allowList: string[] };

export function isEnabled(flag: FlagConfig, userId: string, flagName: string): boolean {
  if (!flag.enabled) return false;
  if (flag.allowList.includes(userId)) return true;           // empleados, testers
  const hash = createHash("sha256").update(`${flagName}:${userId}`).digest();
  const bucket = hash.readUInt32BE(0) % 100;                   // 0..99, estable por usuario
  return bucket < flag.percentage;
}
```

Si guardas `FlagConfig` en un ConfigMap montado como archivo (sesión 11), puedes cambiar el porcentaje sin redesplegar.

El costo: cada toggle duplica caminos en el código. **Borra los toggles de release** cuando terminan, o se acumulan como deuda técnica y combinaciones nunca probadas.

### 7. Canary, A/B testing y parallel run

- **Canary**: pregunta "¿la versión nueva funciona técnicamente igual o mejor?". Se mide con métricas operativas.
- **A/B testing**: pregunta "¿qué variante prefieren los usuarios?". Se mide con métricas de producto y necesita análisis estadístico. Se puede montar sobre la mecánica del canary, pero hacerlo bien exige herramientas especializadas; no vale la pena reinventarlas.
- **Parallel run** (sesión 03): ejecuta ambas versiones con las mismas entradas y compara resultados, sirviendo solo la vieja. Ideal cuando el resultado debe ser idéntico (cálculos).

### 8. Comparación de estrategias

| Estrategia | Downtime | Capacidad extra | Velocidad de rollback | Conviven versiones | Complejidad |
| --- | --- | --- | --- | --- | --- |
| Recreate | Sí | No | Lenta (redesplegar) | No | Muy baja |
| Rolling update | No | Poca (`maxSurge`) | Media (`rollout undo`) | Sí, durante el rollout | Baja |
| Blue-green | No | Doble | Instantánea (cambiar selector) | No (salvo en la base) | Media |
| Canary | No | Poca | Rápida (bajar a 0 %) | Sí, deliberadamente | Media/alta |

### 9. Rollback: la parte que se planifica antes

Cada estrategia tiene su rollback:

- **Rolling update**: `kubectl rollout undo`. Kubernetes conserva un historial de ReplicaSets (`revisionHistoryLimit`).
- **Blue-green**: volver a apuntar el Service a blue. Por eso no borres blue hasta estar seguro.
- **Canary**: escalar el canary a 0 o quitar su peso.
- **GitOps**: revertir el commit en el repositorio de configuración.

**El caso difícil: cambios de esquema, API o payload.** Revertir el código es fácil; revertir datos no. Si v2 migró la base de datos de una forma que v1 no entiende, el rollback de código no basta. La técnica para evitarlo es **expand-contract** (también llamada parallel change):

```
 Fase 1 (expand):   añadir columna nueva "email_normalized" (nullable).
                    v1 la ignora; v2 escribe en ambas columnas.        ← rollback seguro
 Fase 2 (migrate):  rellenar la columna nueva para filas viejas.
 Fase 3:            v3 lee de la nueva columna, sigue escribiendo ambas. ← rollback seguro
 Fase 4 (contract): cuando nadie lee la vieja, dejar de escribirla y borrarla.
```

Cada despliegue es compatible con la versión anterior y con la siguiente. La misma lógica aplica a APIs (expansion changes, sesión 05) y a eventos. Regla: **ningún despliegue debe dejar el sistema en un estado que la versión anterior no pueda manejar**.

El mismo patrón se aplica a un **evento**. Si `CustomerRegistered` debe pasar de `name` a `givenName` + `familyName`:

1. El productor empieza a publicar los tres campos (expand). Ningún consumidor se rompe.
2. Cada consumidor migra a los campos nuevos, a su ritmo.
3. Con el seguimiento de uso (sesión 05) confirmas que nadie lee `name`.
4. El productor deja de publicar `name` (contract).

Y a un **endpoint**: primero aceptas los dos formatos de entrada, después los clientes migran, y solo al final rechazas el viejo. En los tres casos, el rollback de cualquier paso individual es seguro porque cada paso es compatible con su vecino.

### 10. Orden de despliegue y ciclo local

Para que despliegues y rollbacks sean predecibles, mantén ordenados tres frentes. Las **APIs públicas** van versionadas y con deprecaciones anunciadas (sesión 05). Entre **servicios**, si v2 de `orders` necesita una capacidad nueva de `catalog`, despliega primero `catalog` (compatible hacia atrás) y después `orders`, nunca al revés. Y las **dependencias de terceros** y la infraestructura (librerías, imágenes base, versión de Kubernetes, Ingress controller) se fijan a versiones concretas y se actualizan como cualquier otro cambio, con plan de rollback.

En local, reconstruir la imagen y aplicar manifiestos a mano en cada cambio es lento. Herramientas como **Skaffold** o **Tilt** observan tu código, reconstruyen y redespliegan en el cluster local. Para el proyecto de la sesión 17 basta con un script, pero con varios servicios a la vez cambian mucho la experiencia.

### 11. Resiliencia operativa: lo que el despliegue no cubre

Un despliegue impecable no impide que, una hora después, una dependencia se ponga lenta o el tráfico se triplique. Los patrones de estabilidad que protegen cada llamada remota ya los estudiaste en el módulo 05 (sesión 12): **timeouts** con presupuesto total, **reintentos con backoff exponencial y jitter**, **bulkheads**, **circuit breakers** e **idempotencia** con clave. Repásalos allí; aquí no se repiten. Esta parte añade lo que cambia cuando operas muchos servicios en Kubernetes: un marco para hablar de resiliencia, decisiones de degradación por funcionalidad, experimentos para comprobar que todo eso funciona y el autoescalado.

Empieza por el marco. "Resiliencia" se usa como sinónimo de "no se cae", pero conviene separar sus facetas:

| Faceta | Qué significa | Ejemplo |
| --- | --- | --- |
| **Robustez** | Absorber perturbaciones **previstas** con mecanismos diseñados de antemano | Una réplica muere y el Service deja de enviarle tráfico; una dependencia lenta corta por timeout |
| **Rebound** (recuperación) | Volver a la normalidad después de un incidente | Rollback probado, backups restaurables, runbooks, comunicación con usuarios |
| **Graceful extensibility** | Manejar lo **imprevisto** sin colapsar | Un equipo con autonomía y contexto apaga una funcionalidad con un toggle operativo ante un fallo que nadie había imaginado |
| **Sustained adaptability** | Aprender de cada incidente y adaptar sistema y organización | Postmortems que cambian diseños y prácticas, no solo cierran el ticket |

Los patrones técnicos (los del módulo 05, las probes de la sesión 11, el despliegue progresivo de esta sesión) cubren sobre todo la **robustez**. Las otras facetas dependen de procesos y de personas. Un equipo que solo invierte en robustez está preparado para los fallos que ya imaginó, y nada más.

¿Cuánta resiliencia necesitas? Depende de los requisitos no funcionales de **cada capacidad**, no del sistema entero. El checkout de una tienda quizá exija 99,95 % de disponibilidad; las recomendaciones pueden caerse una tarde sin que nadie pierda dinero. Invertir lo mismo en ambas es desperdiciar en una o quedarse corto en la otra.

### 12. Degradar funcionalidad

Si una página depende de cinco servicios y **cualquiera** que falle la tumba, construiste un sistema **menos** disponible que si dependiera de uno solo: las probabilidades de fallo se suman. La pregunta que debes hacer para cada interfaz y cada dependencia es **"¿qué pasa si esto está caído?"**. Y la respuesta correcta casi siempre es una decisión de **negocio**, no técnica: tienes que preguntarle a quien conoce el producto qué es aceptable.

| Servicio caído | Opción de degradación | Quién lo decide |
| --- | --- | --- |
| Inventario | Permitir la compra y resolver el stock después, o mostrar "consultar disponibilidad" | Negocio: ¿cuánto cuesta vender algo sin stock frente a no vender? |
| Reseñas | Ocultar la sección | Producto |
| Recomendaciones | Mostrar los más vendidos (lista estática en cache) | Producto |
| Carrito | Mostrar el catálogo con un aviso y un teléfono para pedidos | Negocio y atención al cliente |
| Precios | No hay degradación aceptable: error claro | Negocio (vender a un precio equivocado es peor que no vender) |

En el código, la degradación se ve como una distinción explícita entre dependencias **críticas** y **opcionales**:

```ts
async function productPage(id: string) {
  const product = await catalog.get(id);                     // crítica: si falla, error
  const [reviews, recs] = await Promise.allSettled([
    withTimeout(reviewsClient.list(id), 300),                // opcionales: tiempo acotado
    withTimeout(recsClient.forProduct(id), 300),
  ]);
  return {
    product,
    reviews: reviews.status === "fulfilled" ? reviews.value : null,          // degradar: ocultar
    recommendations: recs.status === "fulfilled" ? recs.value : bestSellersCache,
    degraded: reviews.status === "rejected" || recs.status === "rejected",   // medible
  };
}
```

Fíjate en el campo `degraded`: una degradación que nadie mide se vuelve permanente sin que nadie lo note. Cuenta cuántas respuestas salen degradadas y alerta si la proporción crece (sesión 14).

Los **toggles operativos** de la sección 6 son la otra cara de la degradación: interruptores de larga vida que apagan una funcionalidad costosa ("recomendaciones personalizadas") cuando el sistema está saturado, para proteger lo crítico. Son una herramienta de graceful extensibility: permiten reaccionar en segundos ante algo que no previste ningún patrón.

### 13. Chaos engineering y game days

Kubernetes se cura solo de muchos fallos: reinicia containers que mueren o fallan su liveness probe, reprograma Pods si cae un nodo, retira del Service los Pods no listos y mantiene el número de réplicas. Pero no protege contra **fallos sistémicos**: un bug presente en todas las réplicas, una configuración errónea desplegada en todas partes o una dependencia externa caída. Y tus mecanismos de degradación, timeouts y circuit breakers son código que casi nunca se ejecuta. Si nunca los ejercitas, no sabes si funcionan.

**Chaos engineering** es experimentar deliberadamente con fallos para ganar confianza en que el sistema los soporta. No es "romper cosas al azar": es un experimento con método.

1. **Define el estado estable** con métricas que importan al negocio: pedidos por minuto, tasa de éxito del checkout, los SLOs.
2. **Formula una hipótesis**: "si borro el 30 % de los Pods de `catalog`, los SLOs se mantienen y no hay errores visibles".
3. **Limita el radio de impacto**: empieza en un entorno de pruebas o con una fracción mínima del tráfico, y ten listo cómo detener el experimento.
4. **Introduce el fallo**: borrar Pods, añadir latencia a una dependencia, cortar el acceso a un servicio (una NetworkPolicy de la sesión 11 sirve para simularlo en local), escalar una dependencia a 0.
5. **Observa y aprende**: si la hipótesis falló, encontraste un problema antes que tus usuarios. Corrígelo y repite.

```
 Estado estable ──► Hipótesis ──► Fallo acotado ──► ¿Se mantuvo el estado estable?
       ▲                                                   │ sí: más confianza, amplía el alcance
       └──────────────── corrige y repite ◄────────────────┘ no: encontraste un fallo real
```

Un service mesh (sesión 06) permite inyectar latencia o errores en rutas concretas sin tocar el código, lo que hace estos experimentos más precisos.

Los **game days** son ejercicios planificados en los que el equipo simula un incidente grande (perder una zona, restaurar desde backup), a veces sin avisar a quienes responden. Ejercitan la parte humana: quién decide, cómo se comunica, si los runbooks sirven. Ahí se entrenan el rebound y la graceful extensibility, que ningún patrón técnico cubre.

Todo esto depende de una **cultura sin culpa** (*blameless*). Cuando algo falla, la pregunta útil es "¿qué condiciones permitieron que esto pasara?" y no "¿quién tiene la culpa?". Si la gente teme ser culpada, esconde información, y el sistema deja de aprender: se pierde la sustained adaptability.

### 14. Autoescalado con el Horizontal Pod Autoscaler

Escalar horizontalmente un servicio sin estado es lo más simple que hay en Kubernetes: cambias `replicas`. El **Horizontal Pod Autoscaler (HPA)** lo hace por ti: ajusta el número de réplicas de un Deployment para mantener una métrica cerca de un objetivo.

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

Cómo razonarlo:

- **Utilización relativa a `requests`.** El 70 % de CPU se calcula sobre lo que el container **pidió**, no sobre la máquina. Sin `requests` definidos, el HPA no puede calcular nada. Para CPU y memoria necesita además el **metrics server** instalado en el cluster (en minikube, `minikube addons enable metrics-server`).
- **La fórmula es proporcional.** Si 4 réplicas están al 140 % de su objetivo, el HPA apunta a unas 8. Escala hacia arriba rápido y hacia abajo con una ventana de estabilización, para no oscilar.
- **Elige la métrica que refleja la carga real.** La CPU sirve para servicios que calculan. Para un consumidor de colas, el **tamaño de la cola** es mucho mejor señal; para una API ligada a E/S, las peticiones por segundo. Estas métricas personalizadas o externas requieren un adaptador que las exponga al HPA.
- **Fija un mínimo sensato.** Arrancar un Pod nuevo tarda (imagen, startup probe, caches frías). `minReplicas` debe absorber los picos mientras llegan las réplicas nuevas.
- **No escala lo que no es el cuello de botella.** Si la base de datos está saturada, diez réplicas de `orders` solo añaden más conexiones a una base que ya no da más. Mide antes de escalar.

Dos piezas relacionadas: el **Vertical Pod Autoscaler (VPA)** ajusta `requests` y `limits` según el uso histórico (útil para dimensionar; no se combina con el HPA sobre la misma métrica), y el **cluster autoscaler** añade o quita **nodos** cuando hay Pods que no caben. Este último solo tiene sentido en la nube; en tu cluster local, el límite es tu máquina.

El autoescalado también es resiliencia: un pico de tráfico que satura todas las réplicas es un fallo como cualquier otro. Pero el HPA reacciona a la carga **actual** y tarda minutos. Para picos conocidos (una campaña, el mediodía), escalar por adelantado sigue siendo tu trabajo.

### 15. Historia de fallo

Un equipo despliega v2 de `accounts` con un rolling update. v2 renombra la columna `phone` a `phone_number` en una migración que corre al arrancar el primer Pod nuevo. Durante el rollout, las instancias v1 que aún reciben tráfico empiezan a fallar: la columna `phone` ya no existe. Deciden hacer rollback, pero v1 sigue fallando porque la migración no se revierte con el código. Resultado: 50 minutos de errores en el registro de usuarios hasta que alguien renombra la columna a mano. Con expand-contract (añadir `phone_number`, escribir en ambas, migrar, y borrar `phone` dos despliegues después) no habría habido ningún momento incompatible.

### 16. Errores comunes

- Readiness probes triviales que hacen que el rolling update avance aunque la versión nueva no funcione.
- Canary sin métricas ni criterio de rollback definidos de antemano.
- Migraciones de base destructivas en el mismo despliegue que el código que las necesita.
- Borrar el entorno blue inmediatamente después del cambio.
- Toggles de release que nunca se borran.
- Desplegar el consumidor antes que el productor de una capacidad nueva.
- Hacer canary con tan poco tráfico que la comparación no significa nada: si el 1 % son tres peticiones por hora, sube el porcentaje inicial o alarga el paso.
- Olvidar anotar la causa de cada cambio: cuando llega el incidente, `rollout history` muestra revisiones numeradas sin ninguna pista de qué cambió en cada una.
- Decidir la degradación sin preguntar al negocio qué es aceptable, o no medir cuántas respuestas salen degradadas.
- Hacer chaos engineering sin hipótesis, sin estado estable definido o sin límite de impacto.
- Configurar un HPA sin `requests`, con una métrica que no refleja la carga o para escalar un servicio cuyo cuello de botella es la base de datos.
- Postmortems que buscan culpables en lugar de condiciones.

## Conceptos clave

- **Deployment vs. release**: instalar una versión vs. exponer funcionalidad a usuarios.
- **Progressive delivery**: liberar funcionalidad de forma controlada y gradual.
- **Rolling update**: reemplazo gradual de instancias controlado por `maxSurge` y `maxUnavailable`.
- **Blue-green**: dos entornos completos y cambio instantáneo de tráfico entre ellos.
- **Canary**: enviar una fracción pequeña de tráfico a la versión nueva y aumentar según métricas.
- **Feature toggle**: condicional controlado por configuración que separa despliegue de release.
- **Expand-contract**: cambiar esquemas o contratos en pasos compatibles para que todo rollback sea seguro.
- **Robustez / rebound / graceful extensibility / sustained adaptability**: absorber lo previsto, recuperarse, manejar lo imprevisto y aprender de forma continua.
- **Degradación de funcionalidad**: seguir ofreciendo lo esencial cuando una dependencia opcional falla.
- **Chaos engineering**: experimentos controlados con fallos para verificar que el sistema mantiene su estado estable.
- **Game day**: ejercicio planificado de un incidente para practicar la respuesta técnica y humana.
- **HPA**: Horizontal Pod Autoscaler; ajusta las réplicas de un Deployment según una métrica y un objetivo.

## Preguntas de repaso

1. ¿Qué significa separar despliegue de release y qué técnicas lo permiten?
   R: Instalar una versión en producción sin exponerla automáticamente a todos los usuarios, y decidir después a quién y cuándo se libera. Lo permiten blue-green, canary, feature toggles y parallel run.
2. ¿Qué papel juega la readiness probe en un rolling update?
   R: Decide cuándo un Pod nuevo cuenta como disponible: Kubernetes solo retira Pods viejos cuando los nuevos están listos. Una probe que siempre dice que sí hace que se retiren instancias sanas antes de que las nuevas funcionen.
3. Compara blue-green y canary en rollback, capacidad y riesgo.
   R: Blue-green cambia todo el tráfico de golpe y hace rollback instantáneo volviendo a blue, pero necesita el doble de capacidad y expone a todos los usuarios a la vez. Canary expone solo una fracción y permite detectar problemas con impacto pequeño, con poca capacidad extra, pero requiere métricas y es más complejo de operar.
4. ¿Por qué un rollback de código puede no bastar y cómo lo previene expand-contract?
   R: Porque los cambios de datos o esquema no se revierten con el código: la versión vieja puede no entender el esquema nuevo. Expand-contract divide el cambio en pasos compatibles (añadir, escribir en ambos, migrar, leer lo nuevo y solo al final borrar lo viejo), de modo que cada versión funciona con el esquema del paso anterior y del siguiente.
5. ¿Cómo implementas un canary básico solo con objetos de Kubernetes y cuál es su limitación?
   R: Con dos Deployments que comparten la label del Service pero tienen distinta label de track, ajustando el número de réplicas para aproximar el porcentaje. La limitación es que la proporción depende de las réplicas y es aproximada; para porcentajes precisos o enrutamiento por cabecera se necesita un mesh o un Ingress con pesos.
6. ¿Qué riesgo tienen los feature toggles y cómo se gestiona?
   R: Cada toggle duplica caminos en el código y multiplica combinaciones no probadas; si no se borran, se convierten en deuda técnica. Se gestiona clasificándolos por tipo y borrando los toggles de release cuando la funcionalidad llega al 100 %.
7. ¿Por qué la degradación de cada dependencia es una decisión de negocio y cómo se refleja en el código?
   R: Porque decidir qué mostrar o permitir cuando un servicio está caído (vender sin confirmar stock, ocultar reseñas, mostrar más vendidos) tiene costos para el negocio que el equipo técnico no conoce por sí solo. En el código se separan las dependencias críticas, cuyo fallo produce un error, de las opcionales, que se llaman con tiempo acotado y tienen un fallback, y se mide cuántas respuestas salen degradadas.
8. Describe los pasos de un experimento de chaos engineering y qué no cubre el self-healing de Kubernetes.
   R: Definir el estado estable con métricas de negocio o SLOs, formular una hipótesis, limitar el radio de impacto, introducir el fallo (borrar Pods, añadir latencia, cortar una dependencia) y observar si el estado estable se mantuvo, corrigiendo lo que falle. El self-healing reinicia containers, reprograma Pods y mantiene réplicas, pero no arregla fallos sistémicos como un bug en todas las réplicas, una configuración errónea desplegada en todas partes o una dependencia externa caída.
9. ¿Qué necesita un HPA basado en CPU para funcionar y cuándo escalar más réplicas no ayuda?
   R: Necesita el metrics server en el cluster y `requests` de CPU definidos, porque la utilización se calcula sobre ellos, además de un mínimo de réplicas que absorba picos mientras arrancan las nuevas. No ayuda cuando el cuello de botella está fuera del servicio, por ejemplo en una base de datos saturada, ni cuando la métrica elegida no refleja la carga real, como la CPU en un consumidor de colas.

## Ejercicio

En tu cluster local, despliega dos versiones del servicio de saludo (v1 responde `"hola v1"`, v2 `"hola v2"`). Practica tres estrategias: (1) rolling update con `maxSurge: 1` y `maxUnavailable: 0`, lanzando `curl` en bucle y contando respuestas de cada versión; (2) blue-green con dos Deployments y cambio del selector del Service con `kubectl patch`; (3) canary con 4 réplicas estables y 1 canary, contando la proporción en 200 peticiones. Criterio de terminado: un archivo `resultados.md` con, para cada estrategia, la secuencia de comandos, el conteo de respuestas, si hubo errores, y el comando exacto de rollback que verificaste que funciona. Añade un cuarto apartado con un mini experimento de chaos: con la versión estable a 3 réplicas y `curl` en bucle, escribe la hipótesis "si borro 1 de los 3 Pods, no aparece ningún error", borra un Pod con `kubectl delete pod` y anota si se cumplió y por qué.

## Explícalo con tus palabras

Explica por qué desplegar más seguido puede reducir los fallos, usando el ejemplo de mudarse de casa en un solo día frente a llevar cajas poco a poco.
