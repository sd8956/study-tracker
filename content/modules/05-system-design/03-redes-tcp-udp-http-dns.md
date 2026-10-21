---
title: Redes para diseñar sistemas — IP, TCP/UDP, HTTP y DNS
kind: lesson
hours: 2
sources: karanpratapsingh/system-design, cap. I "IP", "OSI Model", "TCP and UDP" y "Domain Name System (DNS)" | System Design Primer, "Domain name system" y "Communication" (HTTP, TCP, UDP) | System Design Interview (Alex Xu), cap. 1, flujo de una petición (pp. 5–7)
links: Karan — IP | https://github.com/karanpratapsingh/system-design#ip ; Karan — OSI Model | https://github.com/karanpratapsingh/system-design#osi-model ; Karan — TCP and UDP | https://github.com/karanpratapsingh/system-design#tcp-and-udp ; Karan — DNS | https://github.com/karanpratapsingh/system-design#domain-name-system-dns ; Primer — Domain name system | https://github.com/donnemartin/system-design-primer#domain-name-system ; Primer — Communication | https://github.com/donnemartin/system-design-primer#communication
---

## Objetivo

Conocer lo necesario de redes para tomar decisiones de diseño: qué ocurre entre que escribes una URL y recibes la respuesta, cuándo elegir TCP o UDP, cómo funciona HTTP y cómo DNS resuelve nombres, se cachea y se usa para enrutar tráfico.

## Estudio

### Por qué un diseñador de sistemas necesita redes

Casi todas las decisiones de arquitectura tienen un componente de red: dónde pones un servidor, cuántos saltos hace una petición, si una conexión se reutiliza o se abre de nuevo, cuánto tarda en propagarse un cambio de DNS. No necesitas ser ingeniero de redes, pero sí entender lo suficiente para estimar latencias y prever fallos. Esta sesión cubre ese mínimo.

### Direcciones IP

Una **dirección IP** identifica a un dispositivo en una red. Hay dos versiones en uso:

- **IPv4**: 32 bits, escrita como cuatro números de 0 a 255 (`192.0.2.10`). Permite unos 4.300 millones de direcciones, que ya se agotaron a nivel global.
- **IPv6**: 128 bits, escrita en hexadecimal (`2001:db8::1`). El espacio es tan grande que no se agota en la práctica.

Además, las IPs se clasifican por alcance y por cómo se asignan:

| Tipo | Descripción | Uso típico |
| --- | --- | --- |
| Pública | Alcanzable desde internet | Load balancer, gateway de salida |
| Privada | Solo dentro de una red (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) | Servidores web, bases de datos |
| Estática | No cambia | Servicios que otros deben encontrar siempre |
| Dinámica | Asignada por DHCP, puede cambiar | Dispositivos de usuario, instancias efímeras |

En el diseño de la sesión 01, solo el load balancer tenía IP pública; los servidores web y la base de datos usaban IPs privadas. Eso reduce la superficie de ataque: nadie desde internet puede conectarse directamente a tu base.

### El modelo OSI como mapa mental

El **modelo OSI** divide la comunicación en siete capas. Internet real usa la pila TCP/IP, que no implementa OSI capa por capa, pero el modelo sigue siendo el vocabulario común:

```
 7 Aplicación    HTTP, DNS, SMTP          ← lo que usa tu código
 6 Presentación  Codificación, cifrado, compresión (TLS suele ubicarse aquí)
 5 Sesión        Abrir/cerrar y mantener la conversación
 4 Transporte    TCP, UDP — segmentos, puertos      ← "L4"
 3 Red           IP — paquetes, enrutamiento        
 2 Enlace        Ethernet, Wi-Fi — tramas en la misma red
 1 Física        Cables, señales, bits
```

Para diseño de sistemas importan sobre todo dos capas, porque los balanceadores se clasifican por ellas:

- Un balanceador **L4** ve IPs y puertos (capa de transporte) y reenvía conexiones sin entender su contenido. Es rápido y barato.
- Un balanceador **L7** entiende HTTP (capa de aplicación): puede enrutar por ruta (`/api` vs `/static`), por cabeceras o por cookies. Es más flexible y más caro en CPU.

Lo verás en detalle en la sesión 04.

### TCP: confiable y ordenado

**TCP** (Transmission Control Protocol) es un protocolo **orientado a conexión**. Antes de enviar datos, cliente y servidor hacen el *three-way handshake*:

```
 Cliente                 Servidor
    │ ──── SYN ──────────> │
    │ <─── SYN-ACK ─────── │
    │ ──── ACK ──────────> │   (1 RTT antes del primer byte útil)
    │ ──── datos ────────> │
```

Una vez abierta la conexión, TCP garantiza:

- **Entrega**: cada segmento se confirma con un ACK; si no llega la confirmación, se retransmite.
- **Orden**: los segmentos llevan números de secuencia y se reordenan en el receptor.
- **Integridad**: checksums detectan corrupción.
- **Control de flujo y de congestión**: el emisor ajusta su ritmo a lo que el receptor y la red soportan.

El precio es **overhead y latencia**: el handshake cuesta un viaje de ida y vuelta (RTT), y si se pierde un segmento, los siguientes esperan a que se retransmita (*head-of-line blocking*). Para un servidor web con miles de clientes, cada conexión abierta consume memoria. Por eso los servidores reutilizan conexiones (keep-alive) y usan pools de conexiones hacia las bases de datos.

Usa TCP cuando necesitas que **todos los datos lleguen intactos y en orden**: páginas web, APIs, transferencias de archivos, SSH, bases de datos.

### UDP: rápido y sin garantías

**UDP** (User Datagram Protocol) no establece conexión. Envía datagramas y se olvida: pueden llegar desordenados, duplicados o no llegar. No hay retransmisión ni control de congestión.

¿Para qué sirve algo así? Para casos donde **un dato tardío vale menos que un dato perdido**:

- Voz y videollamadas: si un paquete de audio llega 300 ms tarde, ya no sirve; mejor saltarlo.
- Juegos en tiempo real: importa la posición actual, no la de hace medio segundo.
- DNS: una consulta cabe en un datagrama; si no hay respuesta, el cliente reintenta.
- Métricas de alto volumen: perder un punto de una serie no importa.

```
 TCP vs UDP
 ─────────────────────────────────────────────────────────
 Conexión           sí (handshake)        no
 Garantía entrega   sí                    no
 Orden              sí                    no
 Overhead           mayor                 mínimo
 Latencia           mayor                 menor
 Usos               web, APIs, archivos   VoIP, juegos, DNS, streaming en vivo
```

Un detalle moderno: **HTTP/3** corre sobre **QUIC**, que va sobre UDP pero implementa en espacio de usuario confiabilidad por stream, cifrado y control de congestión. Así evita el head-of-line blocking entre streams y combina el handshake de transporte con el de TLS. Es un buen ejemplo de que "UDP" no significa necesariamente "sin confiabilidad", sino "la confiabilidad la implementa otra capa".

### HTTP: el idioma de la web

**HTTP** es un protocolo de petición-respuesta en la capa de aplicación. El cliente envía un **método**, una **ruta**, **cabeceras** y opcionalmente un **cuerpo**; el servidor responde con un **código de estado**, cabeceras y cuerpo.

| Método | Semántica | Idempotente | Seguro (sin efectos) |
| --- | --- | --- | --- |
| GET | Leer un recurso | Sí | Sí |
| POST | Crear o ejecutar una acción | No | No |
| PUT | Reemplazar un recurso completo | Sí | No |
| PATCH | Modificar parcialmente | No necesariamente | No |
| DELETE | Borrar | Sí | No |

**Idempotente** significa que repetir la operación produce el mismo estado final. Esto es crucial para los reintentos: si un `PUT` falla por timeout, puedes reintentarlo sin miedo; si un `POST /pagos` falla por timeout, reintentarlo podría cobrar dos veces (lo resolverás con claves de idempotencia en la sesión 12).

Códigos de estado que debes reconocer:

- `2xx` éxito (`200 OK`, `201 Created`, `204 No Content`).
- `3xx` redirección (`301` permanente, `302` temporal; clave en el URL shortener de la sesión 19).
- `4xx` error del cliente (`400`, `401` sin autenticar, `403` prohibido, `404`, `429 Too Many Requests` del rate limiter).
- `5xx` error del servidor (`500`, `502 Bad Gateway`, `503 Service Unavailable`, `504 Gateway Timeout`).

Evolución del protocolo, en lo que importa para diseñar:

- **HTTP/1.1**: conexiones persistentes, pero una petición a la vez por conexión; los navegadores abren varias conexiones en paralelo.
- **HTTP/2**: multiplexa muchas peticiones en una sola conexión TCP, comprime cabeceras. Aún sufre head-of-line blocking a nivel TCP.
- **HTTP/3**: sobre QUIC/UDP, elimina ese bloqueo y reduce el tiempo de establecimiento.

### DNS: la guía telefónica de internet

**DNS** traduce nombres (`www.ejemplo.com`) en direcciones IP. Es jerárquico y distribuido:

```
 Navegador → caché del SO → Resolver recursivo (ISP o 8.8.8.8)
                                │ 1. ¿.com?
                                ├──> Root server ── "pregunta al TLD .com"
                                │ 2. ¿ejemplo.com?
                                ├──> TLD server (.com) ── "pregunta a ns1.ejemplo.com"
                                │ 3. ¿www.ejemplo.com?
                                └──> Servidor autoritativo ── "203.0.113.7, TTL 300"
```

Tipos de servidores:

- **Resolver recursivo**: hace todo el trabajo por el cliente y cachea respuestas.
- **Root servers**: conocen a los servidores de cada TLD. Hay 13 direcciones raíz lógicas, replicadas en cientos de ubicaciones con anycast.
- **TLD servers**: gestionan `.com`, `.org`, `.co`, etc.
- **Autoritativo**: tiene la respuesta final para un dominio.

Tipos de consulta: **recursiva** (el cliente pide la respuesta final al resolver), **iterativa** (cada servidor devuelve una referencia al siguiente) y **no recursiva** (el servidor ya tiene la respuesta en caché o es autoritativo).

Registros que vas a usar:

| Registro | Para qué |
| --- | --- |
| A / AAAA | Nombre → IPv4 / IPv6 |
| CNAME | Alias de otro nombre (`www` → `app.proveedor.net`) |
| MX | Servidores de correo |
| NS | Servidores autoritativos de la zona |
| TXT | Texto arbitrario (verificación de dominio, SPF) |
| SRV | Ubicación de servicios (host y puerto) |

### Caché de DNS y TTL: el trade-off central

Cada respuesta de DNS trae un **TTL**: cuántos segundos puede cachearse. Navegador, sistema operativo y resolvers cachean. Esto hace que DNS sea rápido (la mayoría de las resoluciones no salen de tu ISP) pero introduce un problema: **los cambios tardan en propagarse**. Si cambias la IP de tu servicio con un TTL de 24 horas, algunos usuarios seguirán yendo a la IP vieja durante un día.

| TTL | Ventaja | Desventaja |
| --- | --- | --- |
| Corto (30–60 s) | Failover y migraciones rápidas | Más consultas, más latencia y costo |
| Largo (horas) | Menos consultas, más rápido | Cambios lentos; un failover por DNS tarda horas |

Práctica común: antes de una migración, bajar el TTL a 60 s con un día de anticipación, hacer el cambio y luego volver a subirlo. Ten en cuenta que algunos clientes y resolvers ignoran el TTL y cachean más tiempo.

### DNS como herramienta de enrutamiento

Además de traducir nombres, DNS puede **dirigir tráfico**:

- **Round robin**: varios registros A; cada consulta devuelve el orden rotado. Es un balanceo grueso: no sabe si un servidor está caído y la caché lo vuelve desigual.
- **Weighted**: porcentajes de tráfico por destino (útil para migraciones graduales o canary).
- **Latency-based**: responde con la región de menor latencia para el cliente.
- **Geolocation / GeoDNS**: responde según la ubicación del usuario (sesión 01, multi-región).
- **Failover**: con health checks, deja de devolver un destino caído.

Desventajas a recordar: una consulta DNS agrega latencia si no está en caché (decenas de ms); gestionar DNS es complejo y suele delegarse a un proveedor; y los servicios DNS han sido blanco de ataques DDoS que dejaron inaccesibles a sitios enormes aunque sus servidores funcionaran.

### Todo junto: qué pasa al abrir `https://www.ejemplo.com/perfil`

1. **DNS**: el navegador busca en su caché, luego en la del SO, luego pregunta al resolver. Con suerte, 0 ms; si no, 20–100 ms.
2. **TCP**: handshake de 3 pasos: 1 RTT. Con el servidor a 50 ms de RTT, 50 ms.
3. **TLS**: negociación de cifrado: 1 RTT más con TLS 1.3 (sesión 13).
4. **HTTP**: envío de la petición y espera de la respuesta: 1 RTT + tiempo del servidor.
5. **Contenido**: el HTML pide CSS, JS e imágenes, idealmente servidos por una CDN cercana.

Suma para un usuario a 50 ms de RTT del servidor, sin caché DNS y con 30 ms de procesamiento: `50 (DNS) + 50 (TCP) + 50 (TLS) + 50 + 30 (HTTP) ≈ 230 ms` antes de recibir el primer byte del HTML. Si el usuario está en otro continente (RTT 200 ms), sube a más de 800 ms. Por eso importan las CDNs, la terminación de TLS cerca del usuario, la reutilización de conexiones y HTTP/3: cada RTT ahorrado se nota.

### Puertos, sockets y cuántas conexiones aguanta un servidor

Una conexión TCP se identifica por cuatro valores: IP de origen, puerto de origen, IP de destino y puerto de destino. Tu servidor escucha en un puerto fijo (443 para HTTPS) y cada cliente llega desde un puerto efímero distinto. Por eso un servidor puede tener cientos de miles de conexiones abiertas en el mismo puerto: cada una difiere en la IP o el puerto del cliente.

El límite práctico no lo pone el protocolo sino los recursos:

- **Memoria por conexión**: buffers de envío y recepción del kernel más el estado de tu aplicación. Con 10–50 KB por conexión, 100.000 conexiones ocupan entre 1 y 5 GB.
- **File descriptors**: cada socket es un descriptor; el límite del proceso debe ajustarse.
- **Modelo de concurrencia**: un thread por conexión no escala a cientos de miles; los servidores modernos usan I/O no bloqueante con event loops (Node.js, Nginx, Netty).

Esta cuenta va a reaparecer en el diseño del chat (sesión 23), donde cada usuario conectado mantiene un WebSocket abierto. Con 10 M de usuarios conectados y unas 100.000 conexiones por servidor, necesitas del orden de 100 servidores de chat solo para sostener conexiones.

En la dirección contraria, cuando **tu** servidor llama a otro servicio, consume puertos efímeros locales (en Linux, por defecto unos 28.000). Si abres una conexión nueva por petición y las cierras, quedan en estado `TIME_WAIT` durante un tiempo y puedes agotar los puertos bajo carga. La solución es la misma de antes: pools de conexiones reutilizables.

### Anycast: la misma IP en muchos lugares

Con **anycast**, varios servidores en distintas ubicaciones anuncian la **misma IP**, y el enrutamiento de internet (BGP) lleva cada paquete al punto más cercano en términos de red. Así funcionan los root servers de DNS y muchas CDNs y servicios de protección DDoS: el usuario siempre habla con "la misma IP", pero llega al nodo más próximo, y un ataque se reparte entre todos los puntos de presencia en lugar de concentrarse en uno. Anycast encaja muy bien con UDP (consultas cortas, sin estado) y, con cuidado, con conexiones TCP cortas.

### Firewalls y grupos de seguridad

En la nube, cada instancia tiene reglas de red (security groups, network ACLs) que dicen qué puertos y orígenes aceptan tráfico. Un diseño típico de tres capas queda así:

```
 Internet ──443──> [LB]            (abierto a 0.0.0.0/0 en 443)
           [LB] ──8080──> [Web]    (Web solo acepta 8080 desde el LB)
          [Web] ──5432──> [BD]     (BD solo acepta 5432 desde Web)
```

Esta segmentación limita el daño de una intrusión: si alguien compromete un servidor web, no puede alcanzar directamente otros servicios internos que no estén permitidos. En tus diseños, menciona en qué subred (pública o privada) vive cada componente.

### Modos de fallo de red que debes anticipar

- **Particiones**: dos partes del sistema dejan de verse; cada una puede creer que la otra cayó (base de CAP, sesión 07).
- **Pérdida y latencia variable**: un enlace congestionado no falla, solo se vuelve lento; sin timeouts, tus threads quedan esperando.
- **DNS caído o envenenado**: sin resolución, nadie te encuentra aunque todo funcione.
- **Agotamiento de puertos o conexiones**: abrir una conexión nueva por cada petición agota puertos efímeros y file descriptors bajo carga.
- **MTU y fragmentación**: paquetes grandes que se fragmentan o descartan en algún salto, difíciles de diagnosticar.

### Reglas prácticas para tus diseños

1. Reutiliza conexiones (keep-alive, pools, HTTP/2).
2. Usa TCP salvo que tengas una razón concreta de tiempo real para UDP.
3. Pon timeouts en cada llamada de red y decide qué hacer cuando vencen.
4. Elige TTL de DNS pensando en cuánto tardarías en hacer failover.
5. Asume que la red falla: diseña reintentos con operaciones idempotentes.
6. Coloca cada componente en la subred correcta: solo los puntos de entrada (load balancer, CDN, gateway) en la pública; todo lo demás en subredes privadas con reglas de acceso mínimas.
7. Cuando estimes latencias, cuenta RTTs: cada handshake, cada redirección y cada llamada en serie suma uno.

## Conceptos clave

- **IP privada**: dirección alcanzable solo dentro de una red; protege servidores internos.
- **Capa 4 / capa 7**: transporte (IPs, puertos) frente a aplicación (HTTP, rutas, cabeceras).
- **Three-way handshake**: SYN, SYN-ACK, ACK; cuesta un RTT antes de enviar datos.
- **TCP**: transporte orientado a conexión, confiable y ordenado.
- **UDP**: transporte sin conexión ni garantías, de baja latencia.
- **Head-of-line blocking**: un paquete perdido bloquea a los que vienen detrás.
- **Idempotencia**: repetir una operación deja el mismo estado final.
- **Resolver recursivo**: servidor DNS que resuelve el nombre completo por el cliente y cachea.
- **TTL de DNS**: tiempo que una respuesta puede cachearse; equilibra velocidad y agilidad de cambios.
- **GeoDNS**: respuesta DNS que depende de la ubicación del cliente.

## Preguntas de repaso

1. ¿Cuándo elegirías UDP en lugar de TCP? Da dos ejemplos y explica por qué.
   R: Cuando un dato que llega tarde no sirve y es preferible perderlo a esperarlo. Ejemplos: videollamadas (un fragmento de audio atrasado ya no se reproduce) y juegos en tiempo real (importa la posición actual, no la anterior). También DNS, porque una consulta cabe en un datagrama y el cliente puede reintentar.
2. ¿Por qué un TTL de DNS largo dificulta un failover?
   R: Porque resolvers, sistemas operativos y navegadores cachean la respuesta durante el TTL. Si la IP cambia, los clientes siguen usando la vieja hasta que el TTL expire, así que el tráfico tarda horas en moverse al destino sano. Por eso se usan TTL cortos en registros que participan en failover, aceptando más consultas.
3. ¿Qué significa que un método HTTP sea idempotente y por qué importa para los reintentos?
   R: Que repetirlo deja el sistema en el mismo estado que ejecutarlo una vez (GET, PUT, DELETE). Importa porque ante un timeout no sabes si el servidor procesó la petición; con una operación idempotente puedes reintentar sin efectos dobles, mientras que un POST no idempotente podría duplicar un pedido o un cobro.
4. Estima la latencia hasta el primer byte para un usuario con RTT de 100 ms, sin caché DNS, con TCP y TLS 1.3, y 20 ms de procesamiento.
   R: Aproximadamente 100 (DNS) + 100 (handshake TCP) + 100 (TLS) + 100 (petición y respuesta HTTP) + 20 = 420 ms. Una CDN o un edge cercano que termine TCP/TLS reduciría el RTT efectivo y casi todo ese tiempo.
5. ¿Por qué el round robin por DNS es un balanceo pobre?
   R: Porque DNS no sabe si un servidor está caído (salvo con health checks del proveedor), y la caché hace que muchos clientes reciban el mismo orden durante el TTL, con lo que la carga queda desigual. Además, no puede considerar la carga real de cada servidor ni enrutar por contenido.

## Ejercicio

Con `dig` (o `nslookup`) y `curl -w`, investiga tres dominios reales: registra para cada uno los registros A/AAAA/CNAME, el TTL, y los tiempos `time_namelookup`, `time_connect`, `time_appconnect` y `time_starttransfer` de `curl -w`. Luego escribe un script TypeScript que lea esos números de un JSON y estime cuántos RTT consume cada fase. Terminado cuando tengas una tabla con los tres dominios y una conclusión de una línea sobre qué fase domina en cada uno.

## Explícalo con tus palabras

Explica cómo tu navegador encuentra la dirección de un sitio web usando la analogía de preguntar por una dirección en una ciudad que no conoces.
