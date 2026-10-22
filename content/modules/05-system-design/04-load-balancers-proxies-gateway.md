---
title: Load balancers, reverse proxies y API gateways
kind: lesson
hours: 2
sources: System Design Primer, "Load balancer" (L4, L7, horizontal scaling) y "Reverse proxy (web server)" | karanpratapsingh/system-design, cap. I "Load Balancing", "Clustering" y "Proxy"; cap. III "API Gateway" | System Design Interview (Alex Xu), cap. 1, "Load balancer" (pp. 8–10)
links: Primer — Load balancer | https://github.com/donnemartin/system-design-primer#load-balancer ; Primer — Reverse proxy | https://github.com/donnemartin/system-design-primer#reverse-proxy-web-server ; Karan — Load Balancing | https://github.com/karanpratapsingh/system-design#load-balancing ; Karan — Clustering | https://github.com/karanpratapsingh/system-design#clustering ; Karan — Proxy | https://github.com/karanpratapsingh/system-design#proxy ; Karan — API Gateway | https://github.com/karanpratapsingh/system-design#api-gateway
---

## Objetivo

Saber qué componente poner en la entrada de un sistema y por qué: load balancer L4 o L7, reverse proxy, forward proxy, API gateway o BFF; cómo elegir el algoritmo de balanceo, cómo funcionan los health checks y cómo evitar que la propia entrada sea un punto único de fallo.

## Estudio

### El problema que resuelven

Cuando tienes más de un servidor capaz de atender una petición, alguien tiene que decidir a cuál enviarla. Ese "alguien" debe hacer tres cosas: **repartir** la carga para que ningún servidor se sature, **evitar** los servidores que no están sanos y **ocultar** a los clientes cuántos servidores hay y dónde están. Esto es un load balancer.

Un **reverse proxy** es una idea emparentada: un servidor que se pone delante de tus servicios y recibe las peticiones en su nombre. Un **API gateway** es un reverse proxy especializado en APIs con funciones transversales (autenticación, rate limiting, versionado). En la práctica, la misma herramienta (NGINX, HAProxy, Envoy, Traefik) puede cumplir los tres papeles; lo importante es entender las responsabilidades.

### Dónde se balancea

Puedes balancear en cada capa del sistema, no solo en la entrada:

```
 Clientes
    │
 [LB externo] ─────────────────────── entre clientes y servidores web
    │
 [Web 1] [Web 2] [Web 3]
    │
 [LB interno] ─────────────────────── entre web y servicios internos
    │
 [Servicio A x3]
    │
 [Proxy de BD / pool] ─────────────── entre servicios y réplicas de lectura
    │
 [Réplica 1] [Réplica 2]
```

Cada balanceador interno agrega un salto de red (fracciones de milisegundo dentro de un datacenter) pero permite escalar y reemplazar cada capa de forma independiente.

### L4 frente a L7

**Balanceo de capa 4 (transporte).** El balanceador mira solo IPs y puertos. Reenvía paquetes o conexiones TCP/UDP sin leer el contenido. Muchas implementaciones hacen NAT: cambian la dirección de destino y envían la conexión al backend elegido.

- Ventajas: muy rápido, poco consumo de CPU, sirve para cualquier protocolo sobre TCP/UDP (bases de datos, MQTT, protocolos propios).
- Limitaciones: no puede enrutar por URL ni por cabeceras; una conexión de larga duración (por ejemplo, HTTP/2 o WebSocket) queda pegada a un backend y el reparto puede quedar desigual.

**Balanceo de capa 7 (aplicación).** El balanceador **termina** la conexión del cliente, lee la petición HTTP completa, decide y abre (o reutiliza) otra conexión hacia el backend.

- Ventajas: enrutamiento por host (`api.` vs `www.`), por ruta (`/videos/*` a un pool, `/api/*` a otro), por cabeceras o por cookies; puede reintentar en otro backend, comprimir, cachear, reescribir URLs y balancear petición por petición dentro de una misma conexión.
- Costos: más CPU (parsea HTTP y normalmente descifra TLS) y algo más de latencia.

```
 L4:  cliente ══TCP══> [LB] ══misma conexión══> backend
 L7:  cliente ══TLS/HTTP══> [LB termina] ──nueva petición──> backend
```

En hardware moderno la diferencia de rendimiento es pequeña para la mayoría de los casos; por eso el default en aplicaciones web es L7 y se reserva L4 para tráfico no HTTP o volúmenes extremos. Un patrón muy común en la nube combina ambos: un L4 gestionado y muy escalable al frente, que reparte entre una flota de proxies L7 (por ejemplo Envoy) que hacen el enrutamiento fino.

### Algoritmos de balanceo

| Algoritmo | Cómo decide | Bueno para | Cuidado con |
| --- | --- | --- | --- |
| Round robin | En rotación | Backends iguales, peticiones similares | Peticiones de costo muy desigual |
| Weighted round robin | Rotación con pesos | Máquinas de distinta capacidad, canary (5 % a la versión nueva) | Pesos desactualizados |
| Least connections | Al que tiene menos conexiones activas | Conexiones de duración variable (WebSockets, streaming) | Conexiones ociosas que cuentan igual |
| Least response time | Combina latencia y conexiones | Backends heterogéneos | Medición ruidosa |
| Random con dos opciones | Elige dos al azar y envía al menos cargado | Flotas grandes, muchos balanceadores | — (es sorprendentemente bueno) |
| Hash (IP, usuario, URL) | `hash(clave) mod N` o consistent hashing | Afinidad: caches locales, sesiones | Redistribución al cambiar N; hotspots |

Sobre el hash: si usas `hash(user_id) mod N` y N cambia de 4 a 5, casi todas las claves cambian de servidor y pierdes la afinidad (y la cache local) de golpe. La solución es consistent hashing: servidores y claves en un anillo, de modo que agregar un servidor solo mueve las claves de su tramo (lo ves aplicado en el key-value store de la sesión 17; el rebalanceo de particiones, en el módulo 04, sesión 14).

### Health checks

El balanceador necesita saber quién está sano:

- **Pasivos**: observa las respuestas reales; si un backend devuelve muchos errores o timeouts, lo saca temporalmente (*outlier detection*).
- **Activos**: cada pocos segundos llama a un endpoint como `/healthz`. Tras N fallos seguidos lo marca como caído; tras M éxitos lo reincorpora.

Diseñar el endpoint de salud tiene trampas:

1. **Muy superficial**: `/healthz` responde 200 aunque la aplicación no pueda hablar con su base de datos. El balanceador sigue enviando tráfico a un servidor inútil.
2. **Muy profundo**: `/healthz` verifica la base de datos; la base tiene un problema breve y **todos** los servidores fallan su health check a la vez. El balanceador los saca a todos y el sistema entero cae, aunque podría haber servido páginas cacheadas.

Una práctica sensata es separar **liveness** (¿el proceso está vivo?, sin dependencias) de **readiness** (¿puedo recibir tráfico?, incluye dependencias críticas con umbrales tolerantes), y configurar el balanceador para que, si todos los backends fallan, siga enviando tráfico a todos (*fail open*) en lugar de a ninguno.

### Sesiones pegajosas (sticky sessions)

Si la aplicación guarda estado en memoria, el balanceador puede emitir una cookie para enviar al mismo usuario siempre al mismo servidor. Funciona, pero tiene costos: reparto desigual, pérdida de sesión si el servidor cae y dificultad para drenar servidores durante un despliegue. Como viste en la sesión 01, la solución preferida es una capa web stateless con estado externo. Usa sticky sessions como solución temporal o para afinidad de cache, no como base de la arquitectura.

### Terminación TLS

El balanceador o el proxy puede **terminar TLS**: descifra la petición, la envía al backend por la red interna (en claro o recifrada) y cifra la respuesta. Beneficios: los certificados viven en un solo lugar, los backends no gastan CPU en criptografía y el L7 puede leer la petición para enrutar. Costo: dentro de la red interna el tráfico va en claro, salvo que recifres o uses mTLS (sesión 13), cosa que exigen muchas políticas de seguridad modernas.

### El balanceador como punto único de fallo

Un solo balanceador elimina el SPOF de los servidores web pero crea otro. Opciones:

- **Par activo-pasivo** con una IP virtual compartida (VRRP/keepalived): si el activo deja de enviar heartbeats, el pasivo toma la IP.
- **Activo-activo** con DNS que devuelve varias IPs o con anycast.
- **Servicio gestionado** de la nube, que ya es una flota distribuida en varias zonas.

Recuerda también que un balanceador puede ser **cuello de botella** si no se dimensiona: con TLS en L7, una instancia maneja un número finito de handshakes por segundo.

### Escalado horizontal y sus efectos secundarios

Agregar servidores detrás del balanceador es la forma más común de escalar, pero tiene consecuencias aguas abajo: si pasas de 10 a 50 servidores web y cada uno abre 20 conexiones a la base de datos, la base pasa de 200 a 1.000 conexiones. Muchas bases relacionales sufren con miles de conexiones; por eso se usan **poolers** (PgBouncer, RDS Proxy) entre la aplicación y la base. Escalar una capa siempre traslada presión a la siguiente.

### Despliegues detrás del balanceador

El balanceador es también la herramienta que hace posibles los despliegues sin caída:

- **Drenaje de conexiones** (connection draining): antes de apagar un servidor, el balanceador deja de enviarle peticiones nuevas y espera (por ejemplo, 30 s) a que terminen las que están en curso. Sin drenaje, cada despliegue corta peticiones a la mitad.
- **Rolling update**: reemplazas los servidores de a poco (por ejemplo, de a 10 %), cada uno drenado y luego reincorporado con la versión nueva. Durante el proceso conviven dos versiones, así que la API y el esquema de datos deben ser compatibles hacia atrás.
- **Blue-green**: mantienes dos flotas completas; "blue" atiende tráfico mientras "green" recibe la versión nueva. Cuando green pasa sus pruebas, el balanceador cambia todo el tráfico de golpe. El rollback es inmediato (volver a blue), a costa de duplicar infraestructura durante el cambio.
- **Canary**: con pesos, envías el 1–5 % del tráfico a la versión nueva, comparas errores y latencias con el resto, y si todo va bien subes el porcentaje. Limita el radio de impacto de un bug al pequeño porcentaje expuesto.

```
            ┌── 95 % ──> [v41 x 19]
 [LB L7] ───┤
            └──  5 % ──> [v42 x 1]   ← se compara el error rate antes de seguir
```

### Balanceo global (GSLB)

Cuando tienes varias regiones, aparece un nivel más de balanceo: decidir **a qué región** va el usuario. Se hace con DNS (GeoDNS, latency-based routing, sesión 03) o con anycast. El balanceador global combina health checks por región con la ubicación del usuario: si una región falla, deja de anunciarla y los usuarios se reparten entre las restantes. Ten en cuenta dos cosas: el failover vía DNS está limitado por el TTL, y la región que recibe el tráfico extra debe tener capacidad de sobra; si cada región funciona al 80 %, perder una puede tumbar a la siguiente en cadena.

### Clustering frente a load balancing

Un **cluster** es un grupo de nodos que **se conocen entre sí** y cooperan como un solo sistema: comparten estado, eligen líder, se replican (Cassandra, Redis Cluster, Kubernetes). En un **pool balanceado**, los servidores no se conocen; el balanceador los reparte y ellos ignoran la existencia de los demás. Se pueden combinar: un balanceador delante de un cluster. Los clusters ganan disponibilidad y capacidad, pero son más complejos: todos los nodos deben tener la misma versión, el almacenamiento compartido debe evitar escrituras pisadas y la membresía (quién está vivo) es un problema distribuido en sí mismo.

### Balanceo del lado del cliente y service mesh

No todo el balanceo pasa por una caja central. En arquitecturas de microservicios es común el **balanceo del lado del cliente**: cada servicio consulta un registro (sesión 11) con la lista de instancias sanas de su dependencia y elige él mismo a cuál llamar. Esto elimina un salto de red y un posible cuello de botella, pero obliga a que cada cliente implemente reintentos, timeouts y algoritmos de balanceo de forma consistente.

Un **service mesh** resuelve esa inconsistencia poniendo un proxy pequeño (sidecar, típicamente Envoy) junto a cada instancia. Toda llamada saliente pasa por el sidecar local, que balancea, reintenta, aplica timeouts, cifra con mTLS y emite métricas, sin que el código de la aplicación lo sepa. Un plano de control distribuye la configuración a todos los sidecars.

```
 [Servicio A]─[sidecar] ══mTLS══> [sidecar]─[Servicio B]
                    ▲                  ▲
                    └──── plano de control (config, certificados) ────┘
```

El costo es operativo: cientos de proxies que mantener, algo de latencia por salto y una curva de aprendizaje considerable. Tiene sentido con muchos servicios y equipos; con cinco servicios suele ser excesivo.

### Forward proxy frente a reverse proxy

La diferencia está en **a quién representa** el proxy:

```
 Forward proxy (representa a los clientes)
 [Cliente A]─┐
 [Cliente B]─┼──> [Proxy] ──> Internet (los sitios ven al proxy, no a los clientes)
 [Cliente C]─┘

 Reverse proxy (representa a los servidores)
 Internet ──> [Proxy] ──┬──> [Servidor 1]
                        └──> [Servidor 2]  (los clientes ven al proxy, no a los servidores)
```

- **Forward proxy**: filtra contenido en una empresa, cachea descargas, da anonimato o acceso a contenido geobloqueado, controla la salida a internet de servidores internos (egress).
- **Reverse proxy**: oculta y protege los backends, termina TLS, comprime, cachea respuestas, sirve estáticos, limita conexiones por cliente y bloquea IPs.

¿Load balancer o reverse proxy? Un load balancer tiene sentido cuando hay **varios** servidores equivalentes. Un reverse proxy es útil **incluso con un solo servidor**, por sus beneficios de seguridad, cache y TLS. Herramientas como NGINX y HAProxy hacen ambas cosas.

### API gateway

Con microservicios, un cliente móvil que muestra la pantalla de un pedido podría necesitar llamar a usuarios, pedidos, pagos y envíos. Un **API gateway** es el punto de entrada único que encapsula esa estructura interna:

```
 App móvil ──> [API Gateway] ──┬──> Usuarios
                │ auth, rate   ├──> Pedidos
                │ limit, logs  ├──> Pagos
                │ composición  └──> Envíos
```

Funciones típicas: autenticación y autorización, rate limiting (sesión 16), enrutamiento y versionado, composición de respuestas, caching, reintentos y circuit breaking, logging y tracing, listas de IPs permitidas o bloqueadas, transformación de protocolos (REST externo a gRPC interno).

Desventajas: es otro posible SPOF y cuello de botella, agrega latencia, su configuración crece y, si metes lógica de negocio en él, se convierte en un monolito distribuido difícil de cambiar. Regla: **el gateway hace cosas transversales, no reglas de negocio**.

### Backend for Frontend (BFF)

Un solo gateway para web, móvil y TV tiende a llenarse de casos especiales. El patrón **BFF** crea un backend por tipo de cliente: el BFF móvil devuelve respuestas compactas y agregadas; el BFF web puede devolver más datos. Cada equipo de frontend es dueño de su BFF. GraphQL se usa a menudo como BFF porque deja que el cliente pida exactamente los campos que necesita. Úsalo cuando los clientes tienen necesidades realmente distintas; si no, es duplicación innecesaria.

### Cómo elegir en un diseño

| Situación | Componente |
| --- | --- |
| Varios servidores web idénticos, tráfico HTTP | LB L7 (gestionado) |
| Tráfico TCP no HTTP o volumen extremo | LB L4 |
| Un solo servidor que necesita TLS, cache y protección | Reverse proxy |
| Microservicios expuestos a clientes externos | API gateway (+ BFF si los clientes difieren mucho) |
| Controlar la salida a internet de servidores internos | Forward proxy de egress |
| Distribuir réplicas de una base de datos | Proxy o pooler de base de datos |

### Un cálculo de dimensionamiento

Supón un pico de 30.000 peticiones HTTPS/s. Cada servidor de aplicación atiende 1.000 peticiones/s con latencia aceptable (recuerda la curva de saturación: dimensiona al 60–70 %), así que planificas 30.000 / (1.000 × 0,7) ≈ 43 servidores, redondeado a 45 repartidos en 3 zonas (15 por zona). Si una zona entera cae, quedan 30 servidores, que al 100 % dan exactamente 30.000/s: justo, sin margen. Para sobrevivir a la pérdida de una zona con margen, necesitas unos 30.000 / (0,7 × 1.000) / (2/3) ≈ 64 servidores. Este tipo de razonamiento (N+1 o "sobrevivir a una zona") es el que justifica cuántas instancias pones detrás del balanceador.

### Modos de fallo

- **Health check que miente** (superficial) o que **amplifica** (demasiado profundo) un fallo de una dependencia.
- **Reintentos del gateway** que multiplican la carga sobre un servicio ya degradado; limita reintentos y usa presupuestos de reintento.
- **Conexiones largas desbalanceadas**: tras un despliegue, los WebSockets se quedan en los servidores viejos; hay que drenar y reconectar de forma gradual.
- **Certificado expirado** en el terminador TLS: todo el sitio cae aunque los backends estén perfectos.
- **Configuración errónea** propagada a toda la flota de proxies en segundos; despliega configuración de forma escalonada como si fuera código.
- **Autoscaling demasiado lento**: el pico llega en segundos y las instancias nuevas tardan minutos en arrancar y pasar el health check; mantén capacidad mínima suficiente y escala por métricas que anticipen la carga.

## Conceptos clave

- **Load balancer**: componente que reparte peticiones entre servidores equivalentes y evita los que no están sanos.
- **L4**: balanceo por IP y puerto sin leer el contenido.
- **L7**: balanceo que entiende HTTP y enruta por host, ruta, cabeceras o cookies.
- **Health check**: verificación periódica o pasiva del estado de un backend.
- **Liveness vs readiness**: proceso vivo frente a listo para recibir tráfico.
- **Sticky session**: afinidad de un cliente con un servidor, normalmente por cookie.
- **Terminación TLS**: descifrar en el borde para aliviar a los backends y poder enrutar.
- **Reverse proxy**: intermediario que representa a los servidores ante los clientes.
- **Forward proxy**: intermediario que representa a los clientes ante internet.
- **API gateway**: punto de entrada único que aplica funciones transversales a muchas APIs.
- **BFF**: backend dedicado a un tipo de cliente concreto.

## Preguntas de repaso

1. ¿Cuándo usarías un balanceador L4 en vez de uno L7?
   R: Para tráfico que no es HTTP (bases de datos, protocolos propios, MQTT), para volúmenes extremos donde importa el mínimo costo de CPU, o como primera capa delante de una flota de proxies L7. Si necesitas enrutar por URL, cabeceras o cookies, reintentar por petición o terminar TLS para inspeccionar, necesitas L7.
2. ¿Qué riesgo tiene un health check que verifica la base de datos y cómo lo mitigas?
   R: Si la base tiene un problema breve, todos los servidores fallan el health check a la vez y el balanceador los saca a todos, provocando una caída total en vez de una degradación. Se mitiga separando liveness de readiness, usando umbrales tolerantes y configurando el balanceador para fail open cuando todos los backends aparecen caídos.
3. ¿Por qué `hash(user_id) mod N` es problemático para afinidad cuando la flota cambia de tamaño?
   R: Porque al cambiar N casi todas las claves se reasignan a otro servidor, así que se pierden las caches locales y la afinidad de golpe, lo que dispara la carga sobre el almacenamiento. Consistent hashing reduce la redistribución a aproximadamente 1/N de las claves.
4. ¿Qué diferencia hay entre un reverse proxy y un forward proxy?
   R: El reverse proxy representa a los servidores: los clientes le hablan a él y no conocen los backends (seguridad, TLS, cache, balanceo). El forward proxy representa a los clientes: los sitios de internet ven al proxy y no a los clientes (filtrado, anonimato, control de salida, cache de descargas).
5. ¿Qué no debería hacer un API gateway y por qué?
   R: No debería contener lógica de negocio. Si lo hace, cada cambio de negocio exige tocar un componente compartido por todos los servicios, que se convierte en un cuello de botella organizativo y técnico. Debe limitarse a funciones transversales: autenticación, rate limiting, enrutamiento, observabilidad, composición simple.

## Ejercicio

Implementa en TypeScript una clase `LoadBalancer` con tres estrategias intercambiables (`roundRobin`, `leastConnections`, `powerOfTwoChoices`) y un mecanismo de health check pasivo que saque un backend tras 3 errores consecutivos y lo reincorpore tras 30 s. Simula 10.000 peticiones con duraciones aleatorias (algunas 10 veces más lentas) contra 5 backends y reporta la carga máxima por backend con cada estrategia. Terminado cuando tengas una tabla comparativa y una frase que explique cuál estrategia reparte mejor las peticiones lentas.

## Explícalo con tus palabras

Explica qué hace un load balancer usando la imagen de la persona que, a la entrada de un banco, te indica a qué ventanilla ir.
