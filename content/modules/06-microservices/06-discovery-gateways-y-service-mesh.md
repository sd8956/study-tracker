---
title: Service discovery, API gateways y service mesh
kind: lesson
hours: 2
sources: Building Microservices 2nd ed., cap. 5 "Service Discovery", "Service Meshes and API Gateways", "Documenting Services" (pp. 201–221) | Hands-On Microservices with Kubernetes, cap. 7 "Getting familiar with Kubernetes services" e "ingress" (pp. 198–213) y cap. 13 "Service Mesh - Working with Istio" (pp. 430–449, 459–461)
links: Kubernetes — Service | https://kubernetes.io/docs/concepts/services-networking/service/ ; Kubernetes — Ingress | https://kubernetes.io/docs/concepts/services-networking/ingress/ ; Backstage | https://backstage.io/docs/overview/what-is-backstage
---

## Objetivo

Explicar cómo un servicio encuentra a otro (DNS, registries, Kubernetes Services), distinguir tráfico norte-sur y este-oeste, saber qué debe y qué no debe hacer un API gateway, entender qué aporta un service mesh y cuándo evitarlo, y documentar servicios para humanos.

## Estudio

### 1. El problema del descubrimiento

En un monolito, una función llama a otra por su nombre. Con microservicios, el servicio `Pedidos` necesita llamar a `Pagos`, pero `Pagos` puede tener tres instancias hoy, cinco mañana, cada una en una IP distinta que cambia cada vez que se redespliega. ¿Cómo sabe `Pedidos` adónde llamar?

**Service discovery** resuelve dos cosas:

1. **Registro**: cuando una instancia arranca, de alguna forma queda anotado "Pagos está en 10.0.3.7:8080".
2. **Búsqueda**: cuando alguien necesita `Pagos`, obtiene una dirección válida (y, a ser posible, de una instancia sana).

Y hay un tercer usuario que se suele olvidar: **los humanos**. Las personas también necesitan saber qué servicios existen, dónde corren, quién es su dueño y qué API exponen.

### 2. DNS

La solución más simple: un nombre DNS (`payments.internal.example.com`) que apunta a las instancias o, mejor, a un load balancer que está delante de ellas.

```
 Pedidos ──► DNS: payments.internal ──► Load balancer ──┬─► Pagos #1
                                                        ├─► Pagos #2
                                                        └─► Pagos #3
```

**Ventajas:** todo el mundo entiende DNS; cualquier lenguaje y herramienta lo soporta.

**Desventajas:** el **TTL** (tiempo que los clientes cachean una respuesta) hace que los cambios tarden en propagarse. Si apuntas el nombre directamente a las IPs de instancias y una muere, los clientes pueden seguir llamándola hasta que expire su cache. Por eso es común que el DNS apunte a un load balancer, que sí sabe qué instancias están sanas.

Una convención útil es incluir el entorno en el nombre (`payments.staging.internal`, `payments.prod.internal`) o, mejor, tener servidores DNS distintos por entorno, de forma que el mismo nombre (`payments`) resuelva a cosas distintas según dónde estés. Así la configuración de la aplicación es idéntica en todos los entornos.

### 3. Registries dinámicos

En entornos donde las instancias aparecen y desaparecen constantemente, se usan registries especializados:

- **ZooKeeper**: el pionero, muy usado para coordinación; potente pero complejo de operar para solo hacer discovery.
- **Consul**: registro de servicios con health checks integrados, interfaz DNS y HTTP, y almacén de configuración clave-valor. Su ecosistema incluye herramientas que regeneran archivos de configuración cuando cambian los servicios.
- **etcd + Kubernetes**: Kubernetes guarda el estado del cluster en etcd y ofrece discovery integrado a través de sus objetos `Service`. Si usas Kubernetes, normalmente **no** necesitas otro registry.

La regla general: no construyas tu propio registry. Las herramientas existentes son maduras; uno casero será una rueda peor.

### 4. Service discovery en Kubernetes

En Kubernetes, un **Pod** es efímero: muere, se recrea y cambia de IP. Un **Service** le da a un conjunto de Pods una identidad estable (un nombre DNS y una IP virtual) y reparte el tráfico entre ellos.

El Service encuentra a sus Pods por **labels**: selecciona todos los Pods que tengan ciertas etiquetas. Kubernetes mantiene automáticamente la lista de IPs de los Pods que coinciden (el objeto `Endpoints`/`EndpointSlice`), así que cuando un Pod muere o nace, el Service se actualiza sin que nadie toque nada.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: payments
spec:
  selector:
    app: payments          # todos los Pods con esta label
  ports:
    - port: 80             # puerto del Service
      targetPort: 8080     # puerto del container
```

Dentro del cluster, otro servicio puede llamar a `http://payments` (mismo namespace) o `http://payments.billing.svc.cluster.local` (nombre completo con namespace). Kubernetes también inyecta variables de entorno (`PAYMENTS_SERVICE_HOST`), aunque DNS es lo más usado. Una ventaja de usar variables de entorno o configuración para las URLs es que puedes ejecutar el mismo servicio fuera de Kubernetes en tus pruebas, apuntando a otra dirección.

**Tipos de Service:**

| Tipo | Qué hace | Uso |
| --- | --- | --- |
| `ClusterIP` (por defecto) | IP virtual accesible solo dentro del cluster | Tráfico interno entre servicios |
| `NodePort` | Abre un puerto (30000–32767) en cada nodo que redirige al Service | Pruebas locales, entornos simples |
| `LoadBalancer` | Pide al proveedor de nube un load balancer externo | Exponer un servicio al exterior en la nube |
| `ExternalName` | Alias DNS hacia un nombre externo | Referenciar una base de datos fuera del cluster |
| Headless (`clusterIP: None`) | No hay IP virtual; el DNS devuelve las IPs de los Pods | Bases de datos con StatefulSets, clientes que balancean solos |

En un cluster local (kind o minikube), `LoadBalancer` normalmente se queda en `<pending>` porque no hay nube que cree el balanceador; por eso usarás `NodePort`, `kubectl port-forward` o un Ingress local.

### 5. Norte-sur y este-oeste

Dos direcciones de tráfico con necesidades distintas:

```
                 Internet / clientes externos
                            │   NORTE-SUR
                            ▼
                ┌──────────────────────┐
                │    API gateway /     │  ← autenticación externa, rate limit,
                │    Ingress           │    API keys, TLS público
                └──────────┬───────────┘
        perímetro          │
     ┌─────────────────────┼─────────────────────────┐
     │                     ▼                         │
     │   ┌────────┐  ESTE-OESTE  ┌────────┐          │
     │   │Pedidos │◄────────────►│ Pagos  │          │ ← mTLS, retries, discovery,
     │   └────────┘              └────────┘          │   métricas entre servicios
     │        ▲                       ▲              │   (service mesh)
     │        └──────► Inventario ◄───┘              │
     └───────────────────────────────────────────────┘
```

- **Norte-sur**: tráfico que entra o sale del perímetro (cluster, red, data center). Aquí está el **API gateway**.
- **Este-oeste**: tráfico entre servicios dentro del perímetro. Aquí está el **service mesh**.

Una petición norte-sur (un cliente hace un pedido) suele generar varias llamadas este-oeste. Por eso el tráfico interno es mucho mayor que el externo, y cualquier cosa que pongas en medio del tráfico interno tiene que ser muy eficiente.

### 6. API gateways

Un API gateway es, en esencia, un **reverse proxy** en el perímetro, con funciones añadidas:

- Enrutar peticiones externas a servicios internos (`/orders/*` → `orders`).
- Terminar TLS público.
- Gestionar API keys de terceros, rate limiting, cuotas.
- Autenticación de usuarios externos (validar un token y pasar la identidad hacia dentro).
- Logging y métricas de acceso.
- A veces, un portal de desarrolladores.

En Kubernetes, la versión más básica de esto es un **Ingress**: un objeto que declara reglas HTTP (host, path → Service) y un **Ingress controller** (por ejemplo nginx) que las implementa.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop
spec:
  rules:
    - host: shop.local
      http:
        paths:
          - path: /orders
            pathType: Prefix
            backend:
              service: { name: orders, port: { number: 80 } }
          - path: /catalog
            pathType: Prefix
            backend:
              service: { name: catalog, port: { number: 80 } }
```

En el libro de Sayfan, el gateway es un pequeño servicio propio que implementa login social (OAuth con un proveedor externo), obtiene un token y enruta las peticiones a los servicios internos, expuesto al exterior con un Ingress. Es un buen ejemplo de que un "gateway" puede ser un producto comercial o un servicio sencillo hecho por ti.

**Dónde se tuerce el API gateway.** Tres malos usos frecuentes:

1. **Meter lógica de negocio.** Agregar llamadas, transformar respuestas con reglas de dominio, decidir flujos. Viola "pipes tontos, endpoints inteligentes". Además, el gateway suele ser gestionado por un equipo central: cada cambio de negocio se convierte en un **ticket** a ese equipo, con colas y coordinación. Has recreado el cuello de botella que querías eliminar.
2. **Usarlo para todo el tráfico interno.** Si A llama a B pasando por el gateway, añades al menos un salto de red extra y un punto central de fallo para cada llamada interna.
3. **Comprar un producto enorme "por si acaso".** Muchos gateways traen funciones pensadas para monetizar APIs públicas (facturación por uso, portales) que no necesitas para tráfico propio.

Si necesitas agregar datos de varios servicios para una UI, eso es trabajo de un **BFF** (Backend for Frontend) que pertenece al equipo de esa UI (sesión 18), no del gateway compartido.

### 7. Service mesh

Hay funciones que **todos** los servicios necesitan en sus llamadas internas: mTLS, reintentos, timeouts, load balancing, correlation IDs, métricas de cada llamada. Hay dos formas de dárselas:

**Opción A: librería compartida.** Cada servicio incluye una librería que hace todo eso. Problemas: hay que implementarla en cada lenguaje; cambiar el comportamiento exige que todos actualicen la librería y redespliegen; distintas versiones conviven y se comportan distinto.

**Opción B: service mesh.** Cada instancia de servicio tiene a su lado un **proxy** (el *sidecar*, normalmente Envoy) que intercepta todo su tráfico de entrada y salida. Los servicios hacen llamadas HTTP normales a `http://payments`; el proxy local se encarga del resto.

```
  Nodo / Pod                                   Nodo / Pod
 ┌───────────────────────────┐               ┌───────────────────────────┐
 │ ┌─────────┐  ┌──────────┐ │    mTLS,      │ ┌──────────┐  ┌─────────┐ │
 │ │ Pedidos │─►│  proxy   │─┼──retries,────►┼─│  proxy   │─►│  Pagos  │ │
 │ └─────────┘  │ (sidecar)│ │   métricas    │ │ (sidecar)│  └─────────┘ │
 │              └────▲─────┘ │               │ └────▲─────┘              │
 └───────────────────┼───────┘               └──────┼────────────────────┘
                     │        control plane         │
                     └──────── (configura los ──────┘
                               proxies: rutas, políticas, certificados)
```

Partes:

- **Data plane**: los proxies que mueven el tráfico.
- **Control plane**: el componente central que configura los proxies (rutas, políticas, certificados). Si el control plane cae, los proxies siguen funcionando con la última configuración; no está en el camino de cada petición.

Como los proxies corren **en la misma máquina** que el servicio, la llamada al proxy es local y barata; solo hay un salto de red real entre proxies.

**Qué aporta un mesh (Istio, Linkerd, Consul):**

| Área | Capacidades |
| --- | --- |
| Tráfico | Routing por porcentaje o por cabecera (canary), retries, timeouts, circuit breaking, load balancing |
| Seguridad | mTLS automático entre servicios, identidad por servicio, políticas de autorización ("solo Pedidos puede llamar a Pagos") |
| Observabilidad | Métricas por llamada (latencia, errores), propagación de trazas, logs de acceso |
| Pruebas | Inyección de fallos (latencia o errores artificiales) para probar resiliencia |

Por ejemplo, en Istio un reparto canary se declara así:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payments
spec:
  hosts: ["payments"]
  http:
    - route:
        - destination: { host: payments, subset: v1 }
          weight: 90
        - destination: { host: payments, subset: v2 }
          weight: 10
      retries: { attempts: 2, perTryTimeout: 300ms }
```

**Cuándo evitar un service mesh:**

- Tienes pocos servicios (digamos, menos de diez) y un solo lenguaje: una librería bien hecha es más simple.
- Tu equipo no tiene capacidad para operar una pieza de infraestructura compleja. Un mesh añade componentes, consumo de CPU y memoria por cada sidecar, latencia (pequeña pero real) y una curva de aprendizaje considerable.
- No usas Kubernetes; la mayoría de meshes están pensados para él.

Sayfan también lo resume en su comparación: Istio es muy completo y por eso pesado; Linkerd es más ligero y simple; y siempre existe la opción de **no usar mesh**. Igual que con el gateway, el mesh debe contener **solo comportamiento genérico**, nunca lógica específica de un servicio.

### 8. ¿Y otros protocolos?

Gateways y meshes brillan con HTTP y gRPC. Si usas un broker de mensajes (Kafka, NATS), el tráfico no pasa por los mismos proxies y pierdes parte de lo que el mesh aporta (por ejemplo, métricas automáticas por llamada). Tenlo en cuenta: el tracing y la seguridad del tráfico asíncrono se resuelven en el broker o en las librerías de los clientes.

### 9. Documentar servicios

Con decenas de servicios, nadie recuerda qué hace cada uno. Necesitas documentación que **no se quede vieja**.

**Schemas explícitos como documentación.** OpenAPI para REST, `.proto` para gRPC, AsyncAPI para eventos. Se pueden publicar automáticamente desde el pipeline y renderizar con herramientas como Swagger UI.

**Sistemas autodescriptivos.** La idea de un **humane registry**: un lugar donde cada servicio aparece con información útil para personas: qué hace, quién es el dueño, cómo contactar al equipo, enlaces a su API, dashboards, runbooks, estado de sus despliegues. Herramientas como **Backstage** (un catálogo de servicios) construyen esto combinando metadatos que cada repositorio declara en un archivo:

```yaml
# catalog-info.yaml (convención de Backstage)
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payments
  description: Autoriza y captura pagos con tarjeta
spec:
  type: service
  owner: team-billing
  lifecycle: production
  providesApis: [payments-api]
```

Lo importante es que la información se genere **desde el sistema real** (schemas publicados por el pipeline, metadatos en el repo, datos del cluster) y no se escriba a mano en una wiki que nadie actualiza.

### 9.1 Recorrido completo de una petición

Para fijar las piezas, sigue una petición desde el navegador hasta la base de datos en un cluster con Ingress y service mesh:

1. El usuario abre `https://shop.example.com/orders/o-77`. El DNS público resuelve el dominio a la IP del load balancer externo.
2. El load balancer envía la petición al **Ingress controller** (un nginx corriendo como Pod). El Ingress termina TLS, valida el token del usuario (o delega esa validación a un servicio de autenticación) y aplica rate limiting.
3. La regla `path: /orders` dice que el backend es el Service `orders`. El Ingress controller resuelve los Endpoints de ese Service y elige un Pod sano.
4. La petición llega al Pod de `orders`. Si hay mesh, la intercepta primero el **sidecar** de `orders`, que verifica el certificado mTLS del llamante, registra métricas y la pasa al container de la aplicación por `localhost`.
5. El código de `orders` necesita el estado del pago y llama a `http://payments/payments?order=o-77`. El DNS interno del cluster (CoreDNS) resuelve `payments` a la IP virtual del Service.
6. La llamada sale por el sidecar de `orders`, que aplica la política de reintentos y timeout, elige una instancia de `payments` y abre una conexión mTLS con el sidecar de `payments`.
7. El sidecar de `payments` comprueba la política de autorización ("¿puede `orders` llamar a `payments`?") y entrega la petición al container.
8. `payments` consulta **su propia** base de datos y responde. La respuesta recorre el camino inverso, y cada proxy registra latencia y código de estado.
9. `orders` combina los datos y responde al Ingress, que responde al usuario.

Observa la división de responsabilidades. El **código de negocio** solo hizo dos cosas: atender `/orders/o-77` y llamar a `http://payments`. Todo lo demás (TLS, discovery, balanceo, reintentos, autorización entre servicios, métricas) lo pusieron la plataforma y el mesh. Esa es la promesa de estas herramientas.

Ahora imagina el mismo recorrido **sin** mesh: el paso 6 lo hace una librería HTTP en `orders` (con su timeout y sus reintentos), y el paso 7 no existe salvo que lo implementes en `payments`. Funciona perfectamente para sistemas pequeños; solo necesitas disciplina para que todos los servicios configuren timeouts y propaguen el correlation ID de la misma forma.

### 10. Historia de fallo

Una empresa centraliza en su API gateway la "orquestación" de la página de producto: el gateway llama a catálogo, precios, reseñas y stock, combina las respuestas y aplica reglas ("si no hay stock, ocultar la promoción"). Al principio parece eficiente. Un año después, el 40 % de los cambios de producto requiere modificar el gateway, que gestiona un equipo de plataforma de tres personas con una cola de tickets de dos semanas. Los equipos de producto, que supuestamente eran autónomos, esperan semanas por cambios de una línea. La solución fue sacar la agregación a BFFs propiedad de cada equipo de frontend y dejar el gateway solo con enrutamiento, autenticación y rate limiting.

### 11. Errores comunes

- Apuntar DNS directamente a IPs de instancias con TTL alto.
- Construir un registry propio en vez de usar el de la plataforma.
- Poner lógica de negocio o agregación en el API gateway compartido.
- Hacer pasar el tráfico interno por el gateway.
- Adoptar un service mesh con cuatro servicios "porque es lo moderno".
- Documentar servicios a mano en una wiki que se desactualiza.

## Conceptos clave

- **Service discovery**: mecanismo para registrar instancias y encontrar sus direcciones.
- **Kubernetes Service**: identidad estable (nombre e IP virtual) para un conjunto de Pods seleccionados por labels.
- **ClusterIP / NodePort / LoadBalancer**: tipos de Service para tráfico interno, por puerto en cada nodo, o con balanceador externo.
- **Ingress**: reglas HTTP de entrada al cluster implementadas por un Ingress controller.
- **Norte-sur / este-oeste**: tráfico que cruza el perímetro / tráfico entre servicios internos.
- **API gateway**: reverse proxy en el perímetro con autenticación, rate limiting y enrutamiento.
- **Service mesh**: proxies sidecar más un control plane que aportan comportamiento genérico al tráfico interno.
- **Humane registry**: catálogo de servicios orientado a personas, generado desde el sistema real.

## Preguntas de repaso

1. ¿Por qué apuntar un nombre DNS directamente a las IPs de las instancias puede causar problemas y cuál es la alternativa habitual?
   R: Porque los clientes cachean la respuesta durante el TTL y pueden seguir llamando a instancias que ya no existen. La alternativa es que el DNS apunte a un load balancer que conoce qué instancias están sanas, o usar un registry dinámico como el de Kubernetes.
2. ¿Cómo encuentra un Service de Kubernetes a sus Pods y qué pasa cuando un Pod se recrea?
   R: Mediante un selector de labels. Kubernetes mantiene la lista de IPs de los Pods que coinciden (Endpoints) y la actualiza automáticamente cuando un Pod muere o nace, así que los clientes siguen usando el mismo nombre del Service.
3. ¿Qué diferencia hay entre tráfico norte-sur y este-oeste, y qué herramienta corresponde a cada uno?
   R: Norte-sur es el que entra o sale del perímetro; lo gestiona el API gateway o Ingress (autenticación externa, rate limiting, TLS público). Este-oeste es el tráfico entre servicios internos; lo gestiona un service mesh o librerías (mTLS, retries, métricas por llamada).
4. Nombra dos malos usos de un API gateway y sus consecuencias.
   R: Poner lógica de negocio o agregación en él, lo que convierte al equipo dueño del gateway en un cuello de botella de tickets y viola pipes tontos/endpoints inteligentes; y enrutar el tráfico interno por él, lo que añade saltos de red y un punto central de fallo.
5. ¿Qué ventaja tiene un service mesh frente a una librería compartida y cuándo no vale la pena?
   R: Funciona igual con cualquier lenguaje y permite cambiar el comportamiento (retries, mTLS, políticas) sin recompilar ni redesplegar los servicios. No vale la pena con pocos servicios, un solo lenguaje, o un equipo sin capacidad de operar su complejidad y su consumo de recursos.
6. ¿Por qué un cluster local suele dejar un Service LoadBalancer en estado pending y cómo accedes al servicio?
   R: Porque no hay un proveedor de nube que cree el balanceador externo. Puedes usar un Service NodePort, kubectl port-forward o un Ingress controller local.

## Ejercicio

Sin cluster todavía, escribe a mano tres manifiestos YAML para una tienda con `catalog` y `orders`: dos `Service` de tipo `ClusterIP` (puerto 80 → 3000) y un `Ingress` con host `shop.local` que enrute `/catalog` y `/orders`. Añade un archivo `catalog-info.yaml` por servicio con descripción, dueño y API. Valida la sintaxis con `kubectl apply --dry-run=client -f .` si tienes `kubectl`, o con un validador YAML. Criterio de terminado: los selectores de los Services coinciden con las labels que usarás en los Deployments de la sesión 17, y puedes explicar línea por línea qué hace cada manifiesto.

## Explícalo con tus palabras

Explica a alguien sin experiencia en infraestructura la diferencia entre la "recepción del edificio" (API gateway) y los "asistentes personales en cada oficina" (sidecars de un service mesh).
