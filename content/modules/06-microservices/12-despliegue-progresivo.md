---
title: Despliegue progresivo, estrategias de actualización y rollback
kind: lesson
hours: 2
sources: Building Microservices 2nd ed., cap. 8 "Progressive Delivery" (pp. 341–347) | Hands-On Microservices with Kubernetes, cap. 11 "Deploying Microservices" (pp. 328–379)
links: Kubernetes — Deployments (rolling update) | https://kubernetes.io/docs/concepts/workloads/controllers/deployment/ ; Martin Fowler — BlueGreenDeployment | https://martinfowler.com/bliki/BlueGreenDeployment.html ; Martin Fowler — CanaryRelease | https://martinfowler.com/bliki/CanaryRelease.html
---

## Objetivo

Separar despliegue de release; comparar recreate, rolling update, blue-green y canary en Kubernetes; usar feature toggles; planificar el rollback de cada estrategia, incluido el caso difícil de los cambios de esquema; y conocer herramientas de despliegue local.

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

### 10. Gestionar versiones y dependencias

Sayfan enumera varios frentes que hay que mantener ordenados para que despliegues y rollbacks sean predecibles:

- **APIs públicas**: versionadas, con deprecaciones anunciadas (sesión 05).
- **Dependencias entre servicios**: si v2 de `orders` necesita una capacidad nueva de `catalog`, despliega primero `catalog` (compatible hacia atrás) y después `orders`. Nunca al revés.
- **Dependencias de terceros**: librerías y imágenes base fijadas a versiones concretas, actualizadas de forma deliberada.
- **Infraestructura y herramientas**: versiones de Kubernetes, del Ingress controller, de la herramienta de CI; actualízalas como cualquier otro cambio, con plan de rollback.

### 11. Desarrollo local con despliegue rápido

Reconstruir la imagen y aplicar manifiestos a mano en cada cambio es lento. Existen herramientas que automatizan el ciclo "editar → construir → desplegar en el cluster local":

- **Skaffold**: observa tu código, reconstruye imágenes y redespliega en el cluster local; también sirve en CI.
- **Tilt**: similar, con una interfaz que muestra el estado de todos los servicios y logs, y sincronización de archivos sin reconstruir la imagen.
- **ko** (para Go) y otras herramientas específicas de lenguaje.

Para el proyecto de la sesión 17 basta con un script, pero si trabajas con varios servicios a la vez, estas herramientas cambian mucho la experiencia.

### 12. Historia de fallo

Un equipo despliega v2 de `accounts` con un rolling update. v2 renombra la columna `phone` a `phone_number` en una migración que corre al arrancar el primer Pod nuevo. Durante el rollout, las instancias v1 que aún reciben tráfico empiezan a fallar: la columna `phone` ya no existe. Deciden hacer rollback, pero v1 sigue fallando porque la migración no se revierte con el código. Resultado: 50 minutos de errores en el registro de usuarios hasta que alguien renombra la columna a mano. Con expand-contract (añadir `phone_number`, escribir en ambas, migrar, y borrar `phone` dos despliegues después) no habría habido ningún momento incompatible.

### 13. Errores comunes

- Readiness probes triviales que hacen que el rolling update avance aunque la versión nueva no funcione.
- Canary sin métricas ni criterio de rollback definidos de antemano.
- Migraciones de base destructivas en el mismo despliegue que el código que las necesita.
- Borrar el entorno blue inmediatamente después del cambio.
- Toggles de release que nunca se borran.
- Desplegar el consumidor antes que el productor de una capacidad nueva.
- Hacer canary con tan poco tráfico que la comparación no significa nada: si el 1 % son tres peticiones por hora, sube el porcentaje inicial o alarga el paso.
- Olvidar anotar la causa de cada cambio: cuando llega el incidente, `rollout history` muestra revisiones numeradas sin ninguna pista de qué cambió en cada una.

## Conceptos clave

- **Deployment vs. release**: instalar una versión vs. exponer funcionalidad a usuarios.
- **Progressive delivery**: liberar funcionalidad de forma controlada y gradual.
- **Rolling update**: reemplazo gradual de instancias controlado por `maxSurge` y `maxUnavailable`.
- **Blue-green**: dos entornos completos y cambio instantáneo de tráfico entre ellos.
- **Canary**: enviar una fracción pequeña de tráfico a la versión nueva y aumentar según métricas.
- **Feature toggle**: condicional controlado por configuración que separa despliegue de release.
- **Expand-contract**: cambiar esquemas o contratos en pasos compatibles para que todo rollback sea seguro.

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

## Ejercicio

En tu cluster local, despliega dos versiones del servicio de saludo (v1 responde `"hola v1"`, v2 `"hola v2"`). Practica tres estrategias: (1) rolling update con `maxSurge: 1` y `maxUnavailable: 0`, lanzando `curl` en bucle y contando respuestas de cada versión; (2) blue-green con dos Deployments y cambio del selector del Service con `kubectl patch`; (3) canary con 4 réplicas estables y 1 canary, contando la proporción en 200 peticiones. Criterio de terminado: un archivo `resultados.md` con, para cada estrategia, la secuencia de comandos, el conteo de respuestas, si hubo errores, y el comando exacto de rollback que verificaste que funciona.

## Explícalo con tus palabras

Explica por qué desplegar más seguido puede reducir los fallos, usando el ejemplo de mudarse de casa en un solo día frente a llevar cajas poco a poco.
