---
title: "Proyecto: dos servicios TypeScript en un cluster local de Kubernetes"
kind: project
hours: 3
sources: Hands-On Microservices with Kubernetes, caps. 1, 5, 6, 11 y 12 (pp. 24–47, 128–196, 328–360, 381–396) | Building Microservices 2nd ed., cap. 8 "Deployment" y cap. 12 "Resiliency" (pp. 276–347, 481–519)
links: kind — Quick Start | https://kind.sigs.k8s.io/docs/user/quick-start/ ; kind — Loading an image into your cluster | https://kind.sigs.k8s.io/docs/user/quick-start/#loading-an-image-into-your-cluster ; minikube — Get Started | https://minikube.sigs.k8s.io/docs/start/ ; Kubernetes — kubectl Quick Reference | https://kubernetes.io/docs/reference/kubectl/quick-reference/
---

## Objetivo

Construir y operar dos microservicios TypeScript que se comunican entre sí en un cluster local (kind o minikube), con Deployment, Service, ConfigMap y Secret, liveness y readiness probes, apagado ordenado, un cliente resiliente y un rolling update sin errores verificado. Todo en tu máquina, sin gasto en la nube.

## Estudio

### Qué vas a construir

Dos servicios pequeños para un "tablero de citas célebres":

- **`quotes`**: guarda una lista de citas en memoria (cargadas al arrancar) y expone `GET /quotes/random` y `GET /quotes/:id`. Lee de un ConfigMap el idioma por defecto y de un Secret un token que exige en la cabecera `x-internal-token` (autenticación mínima entre servicios).
- **`gateway`**: expone `GET /api/quote` hacia fuera. Llama a `quotes` con timeout, un reintento y un fallback ("Hoy no hay citas, vuelve luego"), y añade el campo `servedBy` con el nombre del Pod y la versión.

```
                       kubectl port-forward / NodePort
                                   │
                            ┌──────▼──────┐   Service gateway (NodePort 30080)
                            │  gateway ×2 │   ConfigMap gateway-config
                            └──────┬──────┘
                 http://quotes:80  │  x-internal-token (Secret compartido)
                            ┌──────▼──────┐   Service quotes (ClusterIP)
                            │  quotes ×3  │   ConfigMap quotes-config, Secret internal-token
                            └─────────────┘
 namespace: quotes-lab
```

### Estructura sugerida del repositorio

```
quotes-lab/
├── services/
│   ├── quotes/   src/server.ts, src/config.ts, Dockerfile, package.json, tests/
│   └── gateway/  src/server.ts, src/config.ts, src/quotesClient.ts, Dockerfile, tests/
├── k8s/
│   ├── namespace.yaml
│   ├── quotes/   configmap.yaml, deployment.yaml, service.yaml
│   ├── gateway/  configmap.yaml, deployment.yaml, service.yaml
│   └── secret.example.yaml      (el real no se versiona)
├── scripts/  build-and-load.sh, smoke.sh, rollout-check.sh
└── README.md
```

### Piezas que ya conoces (y dónde repasarlas)

| Pieza | Sesión |
| --- | --- |
| Dockerfile multi-stage, tag por commit, usuario no root | 09 |
| Deployment, Service, labels, comandos y depuración de Pods | 06, 10 |
| ConfigMap, Secret como archivo, validación de config con zod, probes, SIGTERM | 11 |
| Rolling update, `rollout status/undo`, `maxSurge`/`maxUnavailable` | 12 |
| Logs JSON y correlation ID | 14 |
| Timeout, retry con backoff, fallback | 16 |

### Fragmentos de partida

Cliente resiliente del gateway (complétalo con lo de la sesión 16):

```ts
// services/gateway/src/quotesClient.ts
export async function fetchRandomQuote(cfg: { quotesUrl: string; token: string }, correlationId: string) {
  const res = await fetch(`${cfg.quotesUrl}/quotes/random`, {
    headers: { "x-internal-token": cfg.token, "x-correlation-id": correlationId },
    signal: AbortSignal.timeout(400),
  });
  if (!res.ok) throw Object.assign(new Error(`quotes ${res.status}`), { status: res.status });
  return (await res.json()) as { id: string; text: string; author: string };
}
```

Nombre del Pod y versión inyectados con la Downward API:

```yaml
env:
  - name: POD_NAME
    valueFrom: { fieldRef: { fieldPath: metadata.name } }
  - name: APP_VERSION
    value: "v1"
```

Crear el cluster y cargar imágenes (kind):

```bash
kind create cluster --name quotes-lab
docker build -t quotes:v1 services/quotes
docker build -t gateway:v1 services/gateway
kind load docker-image quotes:v1 gateway:v1 --name quotes-lab
kubectl apply -f k8s/namespace.yaml
kubectl -n quotes-lab create secret generic internal-token --from-literal=TOKEN="$(openssl rand -hex 16)"
kubectl -n quotes-lab apply -f k8s/quotes -f k8s/gateway
kubectl -n quotes-lab rollout status deploy/quotes
```

Con minikube, el equivalente es `minikube start`, `minikube image load quotes:v1` y `minikube service gateway -n quotes-lab --url`.

Script de verificación de rolling update sin errores:

```bash
#!/usr/bin/env bash
# scripts/rollout-check.sh: lanza peticiones mientras se actualiza quotes y cuenta errores
URL=${1:-http://localhost:8080/api/quote}
errors=0; total=0
end=$((SECONDS + 60))
while [ $SECONDS -lt $end ]; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
  total=$((total + 1)); [ "$code" != "200" ] && errors=$((errors + 1))
  sleep 0.1
done
echo "total=$total errores=$errors"
```

## Qué hacer

1. **Servicios (45 min).** Implementa `quotes` y `gateway` en TypeScript con Express o `node:http`: `config.ts` validado con zod, endpoints `/healthz` (solo el proceso) y `/readyz` (listo tras cargar datos; falla durante el apagado), logs JSON con `service`, `version`, `pod` y `correlationId`, y manejo de SIGTERM con margen de 5 s. `quotes` lee el token desde un archivo montado; `gateway` usa timeout de 400 ms, un reintento con backoff solo para 503 y timeouts, y un fallback. Escribe al menos 4 tests con vitest (autenticación del token, fallback del gateway, no reintentar 4xx, readiness durante apagado).
2. **Imágenes (15 min).** Dockerfiles multi-stage, usuario no root, tag `v1`. Verifica tamaño y que arrancan con `docker run`.
3. **Cluster (10 min).** Crea el cluster con kind o minikube y el namespace `quotes-lab`. Carga las imágenes.
4. **Manifiestos (30 min).** Para cada servicio: ConfigMap, Deployment (réplicas 3 para `quotes`, 2 para `gateway`; `requests`/`limits`; startup, liveness y readiness probes; `securityContext` no root; `terminationGracePeriodSeconds`), Service (`quotes` ClusterIP, `gateway` NodePort o acceso con port-forward). Secret creado por comando, nunca versionado con valor real. `strategy` con `maxSurge: 1` y `maxUnavailable: 0`.
5. **Verificación funcional (15 min).** Ejecuta un `smoke.sh` que llame 20 veces a `/api/quote` y compruebe status 200 y campo `servedBy` con distintos nombres de Pod. Comprueba con `kubectl get endpoints` que ambos Services tienen Pods.
6. **Resiliencia (15 min).** Escala `quotes` a 0 réplicas: el gateway debe responder el fallback (200 con mensaje degradado) en menos de 1 s, sin colgarse. Vuelve a 3 réplicas. Borra un Pod de `quotes` y observa con `kubectl get pods -w` cómo se recrea.
7. **Rolling update (20 min).** Cambia `quotes` a `v2` (por ejemplo, añade un campo `lang` a la respuesta), construye `quotes:v2`, cárgala y actualiza con `kubectl set image`. Mientras tanto, ejecuta `rollout-check.sh`. Objetivo: 0 errores. Luego haz `kubectl rollout undo` y verifica que vuelve `v1`.
8. **Configuración (10 min).** Cambia el idioma por defecto en el ConfigMap de `quotes` y fuerza que se aplique con `kubectl rollout restart deploy/quotes`. Explica en el README por qué hizo falta el reinicio (variables de entorno) o cómo lo evitarías (volumen + recarga).
9. **Documentación (10 min).** README con: diagrama, cómo levantar todo desde cero en menos de 10 comandos, resultados de los pasos 5–8 (salidas relevantes), y una sección "qué haría distinto en producción" (al menos 5 puntos: GitOps, NetworkPolicy, mTLS o mesh, HPA, observabilidad con Prometheus y tracing, gestor de secretos).
10. **Limpieza.** `kind delete cluster --name quotes-lab` (o `minikube delete`) cuando termines.

### Rúbrica (100 puntos)

| Criterio | Puntos | Qué se espera para la nota máxima |
| --- | --- | --- |
| Servicios y tests | 20 | Config validada, health endpoints correctos, SIGTERM, logs con correlation ID, 4+ tests en verde |
| Imágenes | 10 | Multi-stage, no root, tag explícito, tamaño razonable |
| Manifiestos | 20 | Deployment, Service, ConfigMap y Secret correctos; labels coherentes; probes con roles distintos; recursos y securityContext |
| Comunicación y resiliencia | 15 | Discovery por nombre de Service; token interno; timeout, retry acotado y fallback verificados escalando a 0 |
| Rolling update y rollback | 20 | 0 errores durante la actualización medido con el script; rollback verificado |
| Documentación y reflexión | 15 | README reproducible; evidencias; mejoras de producción razonadas |

Criterio de terminado: con el cluster recién creado, siguiendo el README, en menos de 10 minutos tienes ambos servicios respondiendo; `rollout-check.sh` reporta `errores=0` durante el paso de `v1` a `v2`; con `quotes` escalado a 0 el gateway responde el fallback en menos de 1 s; y ningún archivo del repositorio contiene el valor real del token.

## Conceptos clave

- **kind / minikube**: herramientas para crear clusters de Kubernetes locales en containers o VMs.
- **Downward API**: mecanismo para inyectar en el container información del propio Pod (nombre, namespace, labels).
- **Rolling update sin errores**: actualización gradual que, con probes correctas y apagado ordenado, no corta peticiones.
- **Degradación verificada**: comprobar en la práctica que un servicio responde con un fallback cuando su dependencia no existe.

## Preguntas de repaso

1. ¿Qué tres cosas deben estar bien para que un rolling update no produzca errores?
   R: Una readiness probe que solo responda listo cuando el servicio realmente puede atender, un apagado ordenado que deje de recibir tráfico y termine las peticiones en curso tras SIGTERM, y una estrategia con maxUnavailable 0 para que siempre haya capacidad suficiente durante la actualización.
2. ¿Por qué al cambiar el ConfigMap consumido como variables de entorno hace falta reiniciar los Pods?
   R: Porque las variables de entorno se fijan al arrancar el container; Kubernetes no las actualiza en procesos que ya corren. Montando el ConfigMap como volumen, los archivos sí se actualizan y la aplicación podría recargarlos.
3. ¿Por qué el gateway encuentra a quotes llamando a http://quotes y no a una IP?
   R: Porque el Service quotes da un nombre DNS estable dentro del namespace que resuelve a una IP virtual, y Kubernetes mantiene la lista de Pods listos detrás de ella; las IPs de los Pods cambian, el nombre no.
4. ¿Qué evidencia demuestra que la degradación funciona y no solo que el código la contempla?
   R: Escalar quotes a 0 réplicas en el cluster y comprobar que el gateway responde el fallback rápidamente y con status 200, medido con curl y tiempos de respuesta, además de los tests unitarios del fallback.

## Explícalo con tus palabras

Explica a un compañero, paso a paso, qué ocurre dentro del cluster desde que ejecutas `kubectl set image` hasta que todos los Pods de `quotes` corren la versión nueva, sin que ninguna petición falle.
