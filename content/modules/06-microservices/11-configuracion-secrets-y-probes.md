---
title: Configuración, secrets y health probes en Kubernetes
kind: lesson
hours: 2
sources: Hands-On Microservices with Kubernetes, cap. 5 "Configuring Microservices with Kubernetes" (pp. 128–159), cap. 6 "Managing secrets with Kubernetes" (pp. 168–174) y cap. 12 "Self-healing with Kubernetes" (pp. 381–385) | Building Microservices 2nd ed., cap. 8 "Environments" y "Zero-Downtime Deployment" (pp. 285–297)
links: The Twelve-Factor App — Config | https://12factor.net/config ; Kubernetes — ConfigMaps | https://kubernetes.io/docs/concepts/configuration/configmap/ ; Kubernetes — Liveness, Readiness and Startup Probes | https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
---

## Objetivo

Separar la configuración del artefacto, elegir entre configuración estática y dinámica, inyectarla con ConfigMaps y Secrets (como variables o archivos), entender las limitaciones de seguridad de los Secrets, y escribir liveness, readiness y startup probes junto con un apagado ordenado en un servicio TypeScript.

## Estudio

### 1. Qué es configuración y por qué va fuera del artefacto

**Configuración** es todo lo que cambia entre despliegues del **mismo código**: la URL de la base de datos, el nivel de log, el número de conexiones, un feature flag, el endpoint de otro servicio. Dentro de la configuración hay un subconjunto delicado, los **secrets**: contraseñas, tokens, claves privadas, certificados.

En la sesión 09 viste la regla "construye una vez, despliega en todas partes". Esa regla obliga a que el artefacto **no contenga** configuración de entorno. La misma imagen `orders:3f9c2ab` corre en staging y en producción; lo que cambia es la configuración inyectada al arrancar.

Una prueba rápida: ¿podrías publicar tu repositorio como open source ahora mismo sin exponer ninguna credencial? Si la respuesta es no, hay configuración (o secrets) mezclada con el código.

### 2. Formas clásicas de configurar un servicio

| Mecanismo | Ejemplo | Ventajas | Limitaciones |
| --- | --- | --- | --- |
| Convención | Puerto 3000 si nadie dice otra cosa | Cero configuración para el caso común | Solo sirve para valores por defecto |
| Flags de línea de comandos | `node server.js --port 8080` | Explícito, visible en `ps` | Incómodo con muchos valores; visible para otros procesos |
| Variables de entorno | `PORT=8080` | Universal, fácil en containers | Planas (sin estructura), solo texto, requieren reinicio para cambiar |
| Archivos de configuración | `config.yaml`, JSON, TOML | Estructura, comentarios, valores complejos | Hay que montarlos y parsearlos; formatos variados |
| Híbrido con defaults | Defaults en código + archivo + entorno que sobrescribe | Flexible | Hay que documentar el orden de precedencia |

En la práctica, la mayoría de servicios usa un **híbrido**: valores por defecto razonables en el código, un archivo opcional y variables de entorno que sobrescriben. Lo importante es fijar y documentar la **precedencia** (por ejemplo: flag > variable de entorno > archivo > default).

La metodología **Twelve-Factor App** recomienda guardar la configuración en **variables de entorno**. Es un buen punto de partida: separa la configuración del código y funciona igual en todas partes. Sus límites: las variables son planas, todo es texto, y cambiarlas exige reiniciar el proceso.

### 3. Valida la configuración al arrancar

Un error clásico es leer `process.env.DB_URL` en mitad de una petición y descubrir que está vacío cuando el primer usuario llega. Mejor: **lee y valida toda la configuración al arrancar** y falla rápido si algo falta. Un servicio que no arranca por configuración inválida es mucho más fácil de diagnosticar (CrashLoopBackOff con un mensaje claro en los logs) que uno que arranca y falla de forma intermitente.

```ts
// config.ts
import { z } from "zod";

const Config = z.object({
  PORT: z.coerce.number().int().default(3000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  CATALOG_URL: z.string().url(),
  DB_PASSWORD: z.string().min(1),
  FEATURE_NEW_PRICING: z.coerce.boolean().default(false),
});

export type Config = z.infer<typeof Config>;

export function loadConfig(env = process.env): Config {
  const parsed = Config.safeParse(env);
  if (!parsed.success) {
    // nunca imprimas los valores: podrían ser secrets
    console.error("Configuración inválida:", parsed.error.issues.map((i) => i.path.join(".")));
    process.exit(1);
  }
  return parsed.data;
}
```

### 4. Configuración estática y dinámica

**Estática**: el servicio lee la configuración al arrancar; para cambiarla, reinicias o redespliegas. Ventaja: simple de razonar, cada proceso arranca limpio. Desventaja: pierdes caches calientes, conexiones y peticiones en curso (salvo que hagas apagado ordenado y rolling update).

**Dinámica**: el servicio detecta cambios de configuración en caliente y ajusta su comportamiento sin reiniciar.

Cuándo vale la pena la configuración dinámica:

- Feature flags que quieres encender y apagar rápido.
- Servicios con una sola instancia, donde reiniciar es una interrupción.
- Servicios con inicialización muy cara (caches enormes, modelos cargados en memoria).
- Cuando tu plataforma no soporta rolling updates o canaries.

Cuándo evitarla:

- Servicios regulados donde cada cambio debe pasar por aprobación y auditoría.
- Servicios críticos donde la simplicidad de "reiniciar con la configuración nueva" pesa más.
- Cuando ya tienes rolling updates: obtienes casi el mismo beneficio con configuración estática.
- Cuando no hay mecanismo y construirlo cuesta más que el beneficio.

Recuerda que la configuración dinámica cambia el comportamiento del sistema **fuera del control de versiones**. Si la usas, necesitas historial y auditoría: quién cambió qué y cuándo.

Opciones para configuración dinámica: un **almacén remoto** (etcd, Redis, una tabla) que los servicios consultan periódicamente, o un **servicio de configuración** dedicado que centraliza el acceso y los permisos. Un antipatrón: guardar la configuración dinámica en la misma base de datos de negocio de cada servicio, dispersándola por todas partes y haciendo imposible auditar cambios globales. Y cuidado con que el servicio de configuración no se vuelva un punto único de fallo: los servicios deben poder arrancar con la última configuración conocida si no responde.

### 5. ConfigMaps

En Kubernetes no ejecutas el proceso tú mismo, así que no puedes pasarle flags a mano. La plataforma te da objetos para inyectar configuración. El primero es el **ConfigMap**: un diccionario de claves y valores (o archivos completos) que los Pods pueden consumir.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: orders-config
data:
  LOG_LEVEL: "info"
  CATALOG_URL: "http://catalog"
  pricing.yaml: |
    currency: COP
    roundTo: 100
```

Tres formas de consumirlo:

```yaml
spec:
  containers:
    - name: orders
      image: registry.local/orders:3f9c2ab
      env:
        - name: LOG_LEVEL                 # 1) una clave como variable
          valueFrom:
            configMapKeyRef: { name: orders-config, key: LOG_LEVEL }
      envFrom:
        - configMapRef: { name: orders-config }   # 2) todas las claves como variables
      volumeMounts:
        - name: config
          mountPath: /etc/orders          # 3) como archivos: /etc/orders/pricing.yaml
          readOnly: true
  volumes:
    - name: config
      configMap: { name: orders-config }
```

Diferencia importante:

- Como **variables de entorno**, el valor se fija al arrancar el container. Si cambias el ConfigMap, el Pod no se entera hasta que se reinicia.
- Como **volumen**, Kubernetes actualiza los archivos montados tras un cambio (con cierto retraso, del orden de un minuto). Tu aplicación puede vigilar el archivo y recargar: así obtienes configuración dinámica sin infraestructura extra.

Un patrón común para forzar un rolling update cuando cambia un ConfigMap consumido como variables es poner un hash del contenido en una anotación de la plantilla del Pod; herramientas como Kustomize generan ConfigMaps con un sufijo de hash en el nombre, y cambiar el nombre fuerza la actualización.

Kubernetes también permite extender su API con **Custom Resources (CRDs)**: tipos propios con su propio schema, gestionados con `kubectl`. Algunos equipos los usan para configuración de alto nivel (por ejemplo, un recurso `FeatureFlag`), pero añaden complejidad: necesitas un controlador que los lea. Para este módulo, basta con saber que existen.

### 6. Secrets

Un **Secret** es parecido a un ConfigMap, pero pensado para datos sensibles. Se consume igual: como variables o como archivos.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: orders-db
type: Opaque
stringData:                 # stringData acepta texto plano; Kubernetes lo guarda en base64
  DB_PASSWORD: "cambia-esto-en-local"
```

```yaml
      env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef: { name: orders-db, key: DB_PASSWORD }
```

Tipos habituales: `Opaque` (genérico), `kubernetes.io/tls` (certificado y clave), `kubernetes.io/dockerconfigjson` (credenciales de un registry), y los tokens de **service accounts** que identifican a los Pods ante la API.

**Lo que un Secret NO es.** Los valores van en **base64**, que es una codificación, no un cifrado: cualquiera que pueda leer el objeto puede decodificarlo con `base64 -d`. Por defecto, además, se guardan en etcd sin cifrar. Para que los Secrets sean razonablemente seguros necesitas:

- **RBAC**: solo quien lo necesita puede leer Secrets en el namespace (sesión 15).
- **Cifrado en reposo** de etcd activado.
- **No guardarlos en Git** en texto plano. Alternativas: Sealed Secrets (cifrados con una clave del cluster, se pueden versionar), External Secrets Operator o el CSI driver de un gestor de secretos (Vault, el gestor de la nube) que los traen desde fuera.
- **Montarlos como archivos** en lugar de variables cuando sea posible: las variables de entorno se filtran con más facilidad (dumps de errores, `/proc`, procesos hijo, logs que imprimen el entorno).

Y la regla de oro en la aplicación: **nunca loguees valores de configuración sensibles**, ni siquiera al validar.

### 7. Health probes: cómo sabe Kubernetes si tu servicio está bien

El kubelet reinicia un container si el proceso muere. Pero un proceso puede estar vivo y aun así no servir: bloqueado en un deadlock, sin conexión a la base, todavía cargando datos. Para eso existen las **probes**, comprobaciones periódicas que el kubelet ejecuta (HTTP, TCP, un comando o gRPC).

| Probe | Pregunta | Si falla | Uso típico |
| --- | --- | --- | --- |
| **Liveness** | ¿El proceso está sano o se quedó colgado? | Kubernetes **reinicia** el container | Detectar deadlocks y estados irrecuperables |
| **Readiness** | ¿Puede recibir tráfico **ahora**? | Kubernetes **saca al Pod** de los Endpoints del Service (no lo reinicia) | Arranque, dependencias críticas caídas, sobrecarga temporal |
| **Startup** | ¿Ya terminó de arrancar? | Mientras no pase, no se evalúan las otras; si nunca pasa, reinicia | Servicios que tardan en arrancar |

```yaml
      startupProbe:
        httpGet: { path: /healthz, port: 3000 }
        periodSeconds: 2
        failureThreshold: 30        # hasta 60 s para arrancar
      livenessProbe:
        httpGet: { path: /healthz, port: 3000 }
        periodSeconds: 10
        failureThreshold: 3
      readinessProbe:
        httpGet: { path: /readyz, port: 3000 }
        periodSeconds: 5
        failureThreshold: 2
```

Reglas para no dispararte en el pie:

- **La liveness probe debe comprobar solo el propio proceso**, no sus dependencias. Si la liveness de `orders` comprueba la base de datos y la base cae, Kubernetes reiniciará todos los Pods de `orders` en bucle, lo que no arregla la base y añade caos. Es un fallo en cascada provocado por la propia plataforma.
- **La readiness puede considerar dependencias críticas**, con cuidado: si todas las instancias dejan de estar listas porque una dependencia cayó, el Service no tiene a quién enviar tráfico. A veces es mejor seguir "listo" y responder errores controlados o degradar.
- Las probes deben ser **baratas y rápidas**; se ejecutan cada pocos segundos en cada instancia.
- Usa una **startup probe** en lugar de un `initialDelaySeconds` enorme en la liveness.

```ts
// health.ts
let ready = false;
let shuttingDown = false;

app.get("/healthz", (_req, res) => res.status(200).send("ok")); // solo el proceso
app.get("/readyz", (_req, res) =>
  ready && !shuttingDown ? res.status(200).send("ready") : res.status(503).send("not ready"),
);

await warmUpCaches();   // carga inicial
ready = true;
```

### 8. Apagado ordenado (graceful shutdown)

En un rolling update o al escalar hacia abajo, Kubernetes termina Pods. La secuencia es:

1. El Pod se marca como "terminating" y se retira de los Endpoints (en paralelo, no al instante en todos los nodos).
2. Kubernetes envía **SIGTERM** al proceso.
3. Espera hasta `terminationGracePeriodSeconds` (30 s por defecto).
4. Si el proceso sigue vivo, envía **SIGKILL**.

Si tu servicio muere al recibir SIGTERM, cortas peticiones en curso. Un apagado ordenado:

```ts
const server = app.listen(config.PORT);

process.on("SIGTERM", () => {
  shuttingDown = true;                 // readiness empieza a fallar
  setTimeout(() => {
    server.close(async () => {         // deja de aceptar conexiones nuevas,
      await db.end();                  // termina las que están en curso
      process.exit(0);
    });
  }, 5_000);                           // margen para que los endpoints se actualicen
});
```

El pequeño retraso antes de cerrar existe porque la retirada del Pod de los Endpoints tarda en propagarse; durante esos segundos todavía pueden llegar peticiones. Recuerda también que el proceso Node debe ser el PID 1 del container (o usar un init como `tini`) y que `CMD ["node", ...]` en forma de array, no un script de shell, para que reciba la señal.

### 9. Configuración por entorno

Con varios entornos (local, staging, producción), evita copiar y pegar manifiestos. Opciones:

- **Kustomize** (integrado en `kubectl apply -k`): una base común y "overlays" por entorno que solo cambian lo necesario (réplicas, ConfigMap, tag de imagen).
- **Helm**: plantillas con valores por entorno.

```
 k8s/
 ├── base/            deployment.yaml, service.yaml, kustomization.yaml
 └── overlays/
     ├── local/       replicas: 1, LOG_LEVEL=debug
     └── prod/        replicas: 3, LOG_LEVEL=info
```

Lo ideal es que los entornos difieran **lo menos posible**: misma imagen, mismos manifiestos base, solo valores distintos.

### 9.1 Ejemplo trabajado: un Deployment con todo junto

Así queda un Deployment que combina lo de esta sesión. Léelo despacio: lo usarás casi igual en el proyecto de la sesión 17.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders
spec:
  replicas: 2
  selector:
    matchLabels: { app: orders }
  template:
    metadata:
      labels: { app: orders }
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: orders
          image: registry.local/orders:3f9c2ab
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef: { name: orders-config }
          env:
            - name: SECRETS_DIR
              value: /var/run/secrets/app
          volumeMounts:
            - name: app-secrets
              mountPath: /var/run/secrets/app
              readOnly: true
          resources:
            requests: { cpu: 50m, memory: 64Mi }
            limits: { memory: 128Mi }
          startupProbe:
            httpGet: { path: /healthz, port: 3000 }
            periodSeconds: 2
            failureThreshold: 15
          livenessProbe:
            httpGet: { path: /healthz, port: 3000 }
            periodSeconds: 10
          readinessProbe:
            httpGet: { path: /readyz, port: 3000 }
            periodSeconds: 3
      volumes:
        - name: app-secrets
          secret:
            secretName: orders-db
            defaultMode: 0400     # solo lectura para el propietario
```

Qué aporta cada bloque:

- `envFrom` con el ConfigMap: toda la configuración no sensible como variables, validada por `config.ts` al arrancar.
- El Secret montado como archivos con permisos `0400`: la aplicación lee `/var/run/secrets/app/DB_PASSWORD`. No aparece en `env`, ni en `kubectl describe pod`, ni en el entorno de procesos hijo.
- `resources`: `requests` para que el scheduler sepa cuánto reservar; `limits` de memoria para que un fallo de memoria afecte solo a este container. (Limitar CPU es un tema con matices: un límite bajo produce *throttling*, así que muchos equipos solo limitan memoria.)
- Tres probes con roles distintos, y `/healthz` sin dependencias.
- `terminationGracePeriodSeconds` coherente con el tiempo que tarda el apagado ordenado del código (5 s de margen + peticiones en curso).

Para leer el secret desde TypeScript:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function readSecret(name: string, dir = process.env.SECRETS_DIR ?? "/var/run/secrets/app"): string {
  const value = readFileSync(join(dir, name), "utf8").trim();
  if (!value) throw new Error(`secret vacío: ${name}`); // el mensaje nombra la clave, nunca el valor
  return value;
}
```

En local, fuera de Kubernetes, puedes apuntar `SECRETS_DIR` a una carpeta ignorada por Git con archivos de prueba. Así el mismo código funciona en tu máquina y en el cluster.

### 10. Historia de fallo

Un equipo añadió a la liveness probe de su servicio de búsqueda una consulta al cluster de Elasticsearch, "para detectar si estamos realmente bien". Un día, Elasticsearch tuvo una pausa de 20 segundos por recolección de basura. Todas las liveness fallaron a la vez, Kubernetes reinició los 12 Pods de búsqueda, y al arrancar todos juntos recalentaron sus caches golpeando Elasticsearch, que volvió a ralentizarse. El ciclo duró 25 minutos. La corrección: liveness solo del proceso, readiness con un timeout generoso y un circuit breaker hacia Elasticsearch (sesión 16).

### 11. Errores comunes

- Configuración de entorno horneada en la imagen.
- Leer variables de entorno tarde y sin validar.
- Creer que un Secret está cifrado porque está en base64.
- Guardar Secrets en Git en texto plano.
- Liveness probes que comprueban dependencias externas.
- No manejar SIGTERM y cortar peticiones en cada despliegue.
- Loguear la configuración completa al arrancar, secrets incluidos.

## Conceptos clave

- **Configuración**: lo que cambia entre despliegues del mismo código; se inyecta al desplegar.
- **Secret**: configuración sensible; en Kubernetes, base64 por defecto, no cifrado.
- **Configuración dinámica**: cambios aplicados en caliente sin reiniciar; requiere auditoría.
- **ConfigMap**: objeto de Kubernetes con claves y archivos de configuración consumibles como variables o volúmenes.
- **Liveness probe**: comprueba si el proceso está sano; si falla, se reinicia el container.
- **Readiness probe**: comprueba si el Pod puede recibir tráfico; si falla, se retira del Service.
- **Startup probe**: protege el arranque lento antes de evaluar las demás probes.
- **Graceful shutdown**: dejar de aceptar tráfico y terminar el trabajo en curso al recibir SIGTERM.

## Preguntas de repaso

1. ¿Por qué la configuración de entorno no debe ir dentro de la imagen?
   R: Porque la misma imagen debe desplegarse en todos los entornos (build once, deploy many). Si la configuración va dentro, necesitarías imágenes distintas por entorno y lo desplegado en producción no sería lo probado; además se filtrarían credenciales en el artefacto.
2. ¿Qué diferencia práctica hay entre consumir un ConfigMap como variables de entorno o como volumen?
   R: Como variables, el valor queda fijo al arrancar el container y un cambio requiere reiniciar el Pod. Como volumen, Kubernetes actualiza los archivos montados tras el cambio y la aplicación puede recargarlos sin reiniciar.
3. ¿Por qué un Secret de Kubernetes no es seguro por sí solo y qué medidas lo complementan?
   R: Porque base64 es solo codificación y, por defecto, etcd lo guarda sin cifrar; cualquiera con permiso de lectura lo decodifica. Se complementa con RBAC estricto, cifrado en reposo de etcd, gestores externos o Sealed Secrets en lugar de texto plano en Git, y montaje como archivos.
4. ¿Por qué la liveness probe no debe comprobar dependencias externas?
   R: Porque si la dependencia falla, todas las instancias fallan la probe a la vez y Kubernetes las reinicia en bucle, lo que no arregla la dependencia y puede agravar el problema con un fallo en cascada.
5. ¿Qué hace un Pod con la readiness probe fallando y en qué se diferencia de la liveness?
   R: Se retira de los Endpoints del Service y deja de recibir tráfico, pero no se reinicia. Con la liveness fallando, el container se reinicia.
6. Describe un apagado ordenado de un servicio Node en Kubernetes.
   R: Al recibir SIGTERM, el servicio marca la readiness como fallida, espera unos segundos a que se actualicen los endpoints, deja de aceptar conexiones nuevas, termina las peticiones en curso, cierra recursos como la conexión a la base y sale antes de que venza el periodo de gracia.

## Ejercicio

Amplía el servicio de las sesiones 09–10: añade `config.ts` con validación `zod`, endpoints `/healthz` y `/readyz`, y manejo de SIGTERM. Crea un `ConfigMap` con `GREETING` y `LOG_LEVEL` y un `Secret` con `API_TOKEN`, y consume el ConfigMap como variables y el Secret como archivo montado en `/var/run/secrets/app/API_TOKEN`. Añade startup, liveness y readiness probes al Deployment. Criterio de terminado: (1) borrar la variable `GREETING` del ConfigMap y reiniciar hace que el Pod entre en CrashLoopBackOff con un mensaje claro en `kubectl logs --previous`; (2) durante un `kubectl rollout restart` lanzando `curl` en bucle no aparece ningún error; (3) los logs nunca muestran el valor de `API_TOKEN`.

## Explícalo con tus palabras

Explica la diferencia entre "estar vivo" y "estar listo" usando el ejemplo de un restaurante que abre por la mañana.
