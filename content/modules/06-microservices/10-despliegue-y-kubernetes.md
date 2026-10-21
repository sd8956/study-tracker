---
title: Principios de despliegue y Kubernetes para desarrolladores
kind: lesson
hours: 2
sources: Building Microservices 2nd ed., cap. 8 "Deployment" (pp. 276–340) | Hands-On Microservices with Kubernetes, cap. 1 "Introduction to Kubernetes for Developers" (pp. 24–47) y cap. 9 "Running Serverless Tasks on Kubernetes" (pp. 268–271, 287–290)
links: Kubernetes — Concepts | https://kubernetes.io/docs/concepts/ ; kind — Quick Start | https://kind.sigs.k8s.io/docs/user/quick-start/ ; minikube — Get Started | https://minikube.sigs.k8s.io/docs/start/
---

## Objetivo

Aplicar los cinco principios de despliegue de microservicios, comparar las opciones de ejecución (máquinas, VMs, containers, PaaS, FaaS), y entender la arquitectura de Kubernetes y sus objetos básicos (Pod, Deployment, ReplicaSet, Service, Namespace) para operar servicios en un cluster local.

## Estudio

### 1. De lo lógico a lo físico

En un diagrama, `Pedidos` es una caja. En producción, esa caja es varias cosas a la vez:

- **Varias instancias** del servicio (para tolerar fallos y repartir carga), detrás de un load balancer, posiblemente en distintas zonas de disponibilidad.
- **Una base de datos** propia, que también puede tener réplicas de lectura.
- **Varios entornos** (desarrollo, staging, producción), cada uno con un número distinto de instancias y su configuración.

```
 Lógico                      Físico (producción)
 ┌─────────┐                 zona A               zona B
 │ Pedidos │      ──►   ┌──────────┐ ┌──────────┐ ┌──────────┐
 └─────────┘            │ Pedidos#1│ │ Pedidos#2│ │ Pedidos#3│
                        └────┬─────┘ └────┬─────┘ └────┬─────┘
                             └──────── LB ┴────────────┘
                                         │
                                 [ BD primaria ]──►[ réplica de lectura ]
```

Un servicio que comparte su servidor de base de datos con otros no rompe por sí mismo la regla de "cada uno su base", siempre que los **esquemas** estén separados y nadie lea el de otro. Compartir infraestructura de base de datos ahorra costo, pero también comparte fallos: si el servidor cae, caen todos. Es un trade-off, no una regla absoluta.

### 2. Cinco principios de despliegue

Las herramientas cambian rápido; estos principios no.

**1. Ejecución aislada.** Cada instancia tiene sus propios recursos y no puede afectar a las demás. Meter muchos servicios en la misma máquina parece barato, pero trae problemas: un servicio con un pico de carga deja sin CPU a los demás, el monitoreo se complica (¿de quién es este consumo?), dependencias de sistema en conflicto, y equipos que no pueden configurar "su" máquina sin coordinar. Las opciones de aislamiento van de máquinas físicas dedicadas (máximo aislamiento, máximo costo) a containers (aislamiento más débil, barato y rápido).

**2. Foco en la automatización.** Con decenas de servicios, cualquier paso manual se multiplica. Elige tecnología que se pueda automatizar y haz de la automatización parte de la cultura. Organizaciones que pasaron de pocos a cientos de servicios lo lograron porque crear un servicio nuevo, con su pipeline y su infraestructura, era cuestión de minutos.

**3. Infraestructura como código (IaC).** La configuración de la infraestructura se describe en archivos versionados (Terraform, manifiestos de Kubernetes, Pulumi). Se revisan como código, se reproducen entornos y se sabe quién cambió qué.

**4. Despliegue sin downtime.** Desplegar una nueva versión no debe interrumpir a los usuarios (ni a otros servicios). Esto lleva el despliegue independiente un paso más allá: si cada despliegue requiere una ventana de mantenimiento, dejarás de desplegar seguido. Técnicas: rolling updates, blue-green, consumidores que toleran que el servicio no responda unos segundos, y comunicación asíncrona que absorbe interrupciones.

**5. Gestión del estado deseado (desired state).** Declaras **qué** quieres ("3 instancias de `orders:3f9c2ab`") y la plataforma se encarga de mantenerlo: si una instancia muere, lanza otra. No escribes scripts que dicen **cómo** llegar ahí.

```
 Imperativo                         Declarativo (desired state)
 "arranca 1 instancia"              "quiero 3 instancias de orders:3f9c2ab"
 "arranca otra"                       │
 "si una muere, avísame             ┌─▼──────────────┐   compara   ┌──────────────┐
  y arranca otra"                   │ estado deseado │◄──────────►│ estado real  │
                                    └────────────────┘   corrige   └──────────────┘
```

GitOps (sesión 09) es la combinación de IaC y desired state: el estado deseado vive en Git.

### 3. Opciones de ejecución

| Opción | Aislamiento | Costo / esfuerzo | Notas |
| --- | --- | --- | --- |
| Máquinas físicas | Máximo | Alto, poco flexible | Raro para servicios nuevos |
| Máquinas virtuales | Alto | Medio; arranque en minutos | Cada VM con su sistema operativo |
| Containers | Medio (comparten kernel) | Bajo; arranque en segundos | Imagen portable, ideal para desarrollo local |
| Application containers (servidores de aplicaciones que alojan varias apps) | Bajo | Bajo | Patrón antiguo; aislamiento pobre entre apps |
| PaaS (Heroku y similares) | Delegado | Muy bajo esfuerzo | Restricciones de la plataforma |
| FaaS / serverless (funciones) | Delegado | Muy bajo; pagas por invocación | Límites de duración, cold starts, estado externo |

Algunas reglas prácticas:

1. **Si lo que tienes funciona, no lo cambies** por moda.
2. **Cede tanto control como te resulte cómodo, y luego un poco más.** Si una PaaS o FaaS cubre tu caso, úsala y dedica el tiempo al producto.
3. **Los containers son un buen compromiso** entre costo de aislamiento y control, y mejoran mucho el desarrollo local. Si eliges containers, probablemente terminarás con Kubernetes.

**Serverless / FaaS.** Funciones que se ejecutan en respuesta a eventos (una petición HTTP, un mensaje, un archivo nuevo) y que la plataforma escala de cero a miles automáticamente. Encajan para tareas acotadas y esporádicas: procesar una imagen subida, un webhook, un job nocturno. Limitaciones: tiempo máximo de ejecución, latencia del primer arranque (cold start), el estado debe vivir fuera (base de datos, cache), y es fácil terminar con cientos de funciones difíciles de seguir. Una buena heurística es mapear **un servicio a varias funciones** (una por operación o por aggregate), no "una función por línea de código".

Sayfan muestra que en Kubernetes también puedes tener un modelo parecido: **Jobs** (tareas que se ejecutan hasta terminar), **CronJobs** (tareas programadas) y frameworks serverless sobre el cluster (Knative, OpenFaaS, Nuclio). Su ejemplo de "verificar que un link sigue vivo" es un caso clásico: tarea corta, disparada por evento, sin estado propio.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-expired-carts
spec:
  schedule: "0 3 * * *"          # todos los días a las 03:00
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: cleanup
              image: registry.local/carts-cleanup:1a2b3c4
```

### 4. Por qué un orquestador de containers

Con containers, alguien tiene que decidir en qué máquina corre cada uno, reiniciarlos si fallan, repartir tráfico, actualizar versiones sin cortar el servicio y escalar. Hacer eso a mano con decenas de servicios no escala. Ese "alguien" es un **orquestador**, y Kubernetes es el estándar de facto.

Kubernetes no es una plataforma completa para desarrolladores lista para usar: es una base sobre la que se construyen plataformas. Por eso muchas organizaciones añaden capas encima (catálogos, plantillas, pipelines) o usan servicios gestionados.

### 5. Arquitectura de Kubernetes

Un cluster tiene un **control plane** (el cerebro) y un **data plane** (los nodos que ejecutan tu código).

```
 ┌──────────────────────── Control plane ─────────────────────────┐
 │  kube-apiserver ◄──► etcd (estado del cluster, clave-valor)    │
 │       ▲   ▲                                                    │
 │       │   └── kube-scheduler (decide en qué nodo va cada Pod)  │
 │       └────── kube-controller-manager (bucles de control:      │
 │               réplicas, nodos, endpoints, cuentas de servicio) │
 └───────┬────────────────────────────────────────────────────────┘
         │ (API)
 ┌───────▼──────── Nodo 1 ─────────┐   ┌──────── Nodo 2 ───────────┐
 │ kubelet (arranca y vigila Pods) │   │ kubelet                   │
 │ kube-proxy (reglas de red de    │   │ kube-proxy                │
 │   los Services)                 │   │ container runtime         │
 │ container runtime (containerd)  │   │  [Pod] [Pod] [Pod]        │
 │  [Pod] [Pod]                    │   └───────────────────────────┘
 └─────────────────────────────────┘
        ▲
   kubectl (tú) ── habla con el apiserver
```

- **kube-apiserver**: la API REST del cluster. Todo (kubectl, controladores, kubelets) pasa por ella.
- **etcd**: almacén clave-valor distribuido con el estado completo del cluster. Si se pierde etcd, se pierde el cluster; en producción hay 3 o 5 réplicas.
- **kube-scheduler**: asigna cada Pod nuevo a un nodo según recursos disponibles, restricciones y afinidades.
- **kube-controller-manager**: ejecuta los **controladores**, bucles que comparan estado deseado y real y corrigen (por ejemplo, "este ReplicaSet quiere 3 Pods y hay 2: crea uno").
- **kubelet**: agente en cada nodo; arranca los containers de los Pods asignados y reporta su estado.
- **kube-proxy**: programa las reglas de red que hacen funcionar los Services.
- **Container runtime**: ejecuta los containers (containerd, CRI-O).

En un cluster local con kind o minikube, el control plane y el data plane comparten una sola "máquina" (un container o una VM), pero los componentes son los mismos.

### 6. Los objetos que vas a usar como desarrollador

**Pod.** La unidad mínima: uno o más containers que comparten red (misma IP, se ven por `localhost`) y volúmenes. Normalmente un Pod = un container de tu servicio (más quizá un sidecar). Los Pods son efímeros: no los creas a mano en producción.

**ReplicaSet.** Mantiene N copias idénticas de un Pod. Tampoco lo creas a mano normalmente.

**Deployment.** Lo que sí escribes. Declara la plantilla del Pod y cuántas réplicas quieres, y gestiona los ReplicaSets para hacer actualizaciones graduales (rolling updates) y rollbacks.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders
  labels: { app: orders }
spec:
  replicas: 3
  selector:
    matchLabels: { app: orders }
  template:
    metadata:
      labels: { app: orders }        # el Service las usa para encontrar los Pods
    spec:
      containers:
        - name: orders
          image: registry.local/orders:3f9c2ab
          ports:
            - containerPort: 3000
          resources:
            requests: { cpu: 100m, memory: 128Mi }
            limits: { memory: 256Mi }
```

**Service.** Identidad estable y balanceo para los Pods (sesión 06).

**Namespace.** Agrupación lógica de recursos dentro del cluster (`team-billing`, `staging`). Sirve para separar equipos o entornos, aplicar cuotas y permisos. Los nombres de Service son únicos por namespace.

**ConfigMap y Secret.** Configuración y datos sensibles inyectados en los Pods (sesión 11).

**Labels y selectors.** Pares clave-valor que pegas a los objetos (`app: orders`, `version: v2`) y que otros objetos usan para seleccionarlos. Son el "pegamento" de Kubernetes: Services, Deployments y políticas encuentran Pods por labels.

### 7. Cómo encaja todo: de `kubectl apply` a un Pod corriendo

1. Ejecutas `kubectl apply -f orders.yaml`. kubectl envía el Deployment al apiserver.
2. El apiserver lo valida y lo guarda en etcd.
3. El controlador de Deployments ve un Deployment nuevo y crea un ReplicaSet.
4. El controlador de ReplicaSets ve que quiere 3 Pods y hay 0: crea 3 objetos Pod (todavía sin nodo).
5. El scheduler asigna cada Pod a un nodo.
6. El kubelet de cada nodo ve que tiene un Pod asignado, descarga la imagen y arranca el container.
7. El controlador de endpoints añade las IPs de los Pods listos al Service `orders`.

Si borras un Pod a mano, el paso 4 se repite solo: el ReplicaSet vuelve a tener 2 de 3 y crea otro. Eso es **desired state** en acción.

### 8. Un cluster local para practicar

Para este módulo usarás un cluster local, sin gasto en la nube:

- **kind** (Kubernetes in Docker): crea nodos como containers de Docker. Muy rápido, ideal para pruebas. Las imágenes locales se cargan con `kind load docker-image`.
- **minikube**: crea un cluster en una VM o container, con addons útiles (ingress, metrics-server, dashboard). Tiene `minikube image load` y `minikube service` para abrir servicios.

```bash
kind create cluster --name lab
kubectl cluster-info --context kind-lab
kubectl get nodes
kubectl create deployment hello --image=nginx:1.27
kubectl get pods -w        # mira cómo pasa a Running
kubectl delete pod -l app=hello   # y cómo se recrea solo
```

### 8.1 Los comandos de kubectl que usarás a diario

| Comando | Para qué |
| --- | --- |
| `kubectl get pods -o wide` | Ver Pods, su estado, reinicios y en qué nodo están |
| `kubectl describe pod <pod>` | Ver eventos: por qué no arranca, por qué lo reinician |
| `kubectl logs <pod> [-c container] [--previous]` | Leer logs; `--previous` muestra los del container anterior que murió |
| `kubectl apply -f <archivo o carpeta>` | Crear o actualizar recursos de forma declarativa |
| `kubectl diff -f <archivo>` | Ver qué cambiaría antes de aplicar |
| `kubectl rollout status deploy/<nombre>` | Esperar a que termine una actualización |
| `kubectl rollout undo deploy/<nombre>` | Volver a la versión anterior |
| `kubectl port-forward svc/<nombre> 8080:80` | Acceder desde tu máquina a un Service interno |
| `kubectl exec -it <pod> -- sh` | Abrir una shell dentro del container (si la imagen la tiene) |
| `kubectl get events --sort-by=.lastTimestamp` | Ver los eventos recientes del namespace |

Un hábito útil: trabaja siempre con `-n <namespace>` explícito o fija el namespace en tu contexto, para no aplicar cambios en el lugar equivocado.

### 8.2 Depurar un Pod que no arranca

Casi todos los problemas de un desarrollador nuevo con Kubernetes caen en cuatro estados. Aprende a reconocerlos:

**`Pending`.** El Pod existe pero el scheduler no le encontró nodo. Causas: pediste más CPU o memoria (`requests`) de la que hay libre, o hay restricciones que ningún nodo cumple. En `describe` verás un evento del tipo "insufficient memory". En un cluster local, baja los `requests`.

**`ImagePullBackOff` / `ErrImagePull`.** El kubelet no pudo descargar la imagen. Causas: nombre o tag mal escrito, registry privado sin credenciales, o (muy común con kind) la imagen solo existe en tu Docker local y no la cargaste en el cluster. Solución con kind: `kind load docker-image registry.local/orders:3f9c2ab --name lab`, y usa un tag concreto con `imagePullPolicy: IfNotPresent`.

**`CrashLoopBackOff`.** El container arranca y termina con error una y otra vez; Kubernetes espera cada vez más entre reintentos. Causas: falta una variable de entorno, no conecta a la base de datos, error en el código al arrancar. Mira `kubectl logs <pod> --previous`: ahí está el error del intento que murió.

**`Running` pero sin tráfico.** El Pod corre pero el Service no le envía peticiones. Causas: las labels del Pod no coinciden con el `selector` del Service, el `targetPort` no coincide con el puerto en que escucha la aplicación, o la readiness probe falla (sesión 11). Comprueba con `kubectl get endpoints <service>`: si la lista está vacía, el Service no encontró Pods listos.

```
 ¿El Pod existe?
   └─ no ─► revisa el Deployment/ReplicaSet: kubectl describe deploy
   └─ sí ─► ¿estado?
        ├─ Pending ───────────► recursos o restricciones (describe → Events)
        ├─ ImagePullBackOff ──► nombre/tag/credenciales/imagen no cargada
        ├─ CrashLoopBackOff ──► logs --previous
        └─ Running ───────────► ¿endpoints vacíos? labels, targetPort, readiness
```

Esta secuencia de diagnóstico te ahorrará horas en el proyecto de la sesión 17.

### 9. Más allá de lo básico (solo para reconocerlos)

- **Helm**: gestor de "paquetes" de manifiestos con plantillas y valores por entorno.
- **Operators y CRDs**: extender Kubernetes con tipos propios (por ejemplo, `PostgresCluster`) y controladores que saben operarlos.
- **Multitenancy y federación**: cómo varios equipos comparten un cluster o se coordinan varios clusters. Cuestiones serias de aislamiento y gobierno.
- **Knative**: capa para ejecutar cargas tipo serverless sobre Kubernetes (escalar a cero).

¿Deberías usar Kubernetes? Si tienes pocos servicios y puedes usar una PaaS o FaaS, probablemente no hace falta. Si eliges containers y tienes varios equipos y servicios, Kubernetes (idealmente gestionado) es la opción estándar, pero exige inversión en conocimiento y en una plataforma encima.

### 10. Historia de fallo

Una empresa corre doce servicios en tres VMs grandes, cuatro por VM, para ahorrar. Un lunes, el servicio de reportes ejecuta un proceso que consume toda la memoria de su VM. El sistema operativo mata procesos para recuperar memoria y elige, entre otros, el de pagos, que vivía en la misma VM. El checkout cae durante 40 minutos y nadie entiende por qué pagos murió si no tenía carga. Después de la migración a containers con `requests` y `limits` por servicio, un pico de reportes solo afecta a reportes.

### 11. Errores comunes

- Meter varios servicios en la misma máquina sin límites de recursos.
- Scripts imperativos de despliegue en vez de declarar el estado deseado.
- Crear Pods sueltos en lugar de Deployments.
- Adoptar Kubernetes autogestionado sin necesidad ni equipo para operarlo.
- Confundir "usar containers" con "tener una plataforma de despliegue".
- Ignorar `requests` y `limits`, dejando que el scheduler adivine.

## Conceptos clave

- **Ejecución aislada**: cada instancia con sus propios recursos, sin afectar a otras.
- **Desired state**: declarar el estado objetivo y que la plataforma lo mantenga.
- **Infraestructura como código**: infraestructura descrita en archivos versionados.
- **Control plane / data plane**: componentes que deciden y vigilan / nodos que ejecutan los Pods.
- **Pod**: uno o más containers que comparten red y volúmenes; unidad mínima de ejecución.
- **Deployment**: objeto que declara réplicas y plantilla de Pod, y gestiona actualizaciones.
- **Namespace**: agrupación lógica de recursos para separar equipos o entornos.
- **FaaS**: funciones gestionadas que se ejecutan por evento y escalan automáticamente.

## Preguntas de repaso

1. ¿Por qué ejecutar varios microservicios en la misma máquina debilita el despliegue independiente?
   R: Porque comparten recursos y dependencias: un pico de uno afecta a los demás, las dependencias de sistema pueden entrar en conflicto, el monitoreo se complica y configurar la máquina exige coordinación entre equipos o un equipo central.
2. Explica el principio de gestión del estado deseado con un ejemplo de Kubernetes.
   R: Declaras qué quieres y la plataforma lo mantiene. Un Deployment con 3 réplicas hace que el controlador cree un nuevo Pod cuando uno muere, sin que nadie ejecute un script.
3. Describe qué ocurre desde que haces kubectl apply de un Deployment hasta que el Pod está corriendo.
   R: kubectl envía el objeto al apiserver, que lo guarda en etcd; el controlador de Deployments crea un ReplicaSet; el de ReplicaSets crea los Pods; el scheduler les asigna nodo; el kubelet de cada nodo descarga la imagen y arranca el container; y el controlador de endpoints añade los Pods listos al Service.
4. ¿Cuándo preferirías FaaS o una PaaS en lugar de Kubernetes?
   R: Cuando tus cargas encajan en las restricciones de la plataforma (tareas cortas, por evento, sin estado local) y prefieres delegar la operación para dedicar tiempo al producto; especialmente con pocos servicios o equipos pequeños.
5. ¿Para qué sirven las labels en Kubernetes?
   R: Para etiquetar objetos con pares clave-valor que otros objetos usan para seleccionarlos; por ejemplo, un Service encuentra sus Pods por la label app y un Deployment gestiona los Pods que coinciden con su selector.
6. ¿Qué componentes forman el control plane y qué hace cada uno?
   R: El apiserver expone la API y es el punto de entrada; etcd guarda el estado del cluster; el scheduler asigna Pods a nodos; y el controller manager ejecuta los bucles que llevan el estado real hacia el deseado.

## Ejercicio

Crea un cluster local con kind (o minikube) y despliega la imagen del servicio que preparaste en la sesión 09 (cárgala con `kind load docker-image`). Escribe un `Deployment` con 2 réplicas y `requests`/`limits`, y un `Service` ClusterIP. Accede con `kubectl port-forward svc/hello 8080:80`. Luego borra un Pod con `kubectl delete pod <nombre>` y observa con `kubectl get pods -w`. Criterio de terminado: puedes mostrar con `kubectl get rs,pods` que el ReplicaSet recreó el Pod, `curl localhost:8080/health` sigue respondiendo durante el borrado, y escribiste en un archivo qué componente del cluster hizo cada paso.

## Explícalo con tus palabras

Explica la diferencia entre decir "arranca tres servidores" y "quiero que siempre haya tres servidores", y por qué la segunda forma escala mejor.
