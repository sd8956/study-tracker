---
title: Latencia, throughput y disponibilidad en números
kind: lesson
hours: 2
sources: System Design Interview (Alex Xu), cap. 2, sección "Availability numbers" (pp. 37–38) | System Design Primer, "Latency vs throughput", "Availability patterns" y "Availability in numbers" | karanpratapsingh/system-design, cap. I "Availability" y cap. IV "SLA, SLO, SLI"
links: Primer — Latency vs throughput | https://github.com/donnemartin/system-design-primer#latency-vs-throughput ; Primer — Availability patterns | https://github.com/donnemartin/system-design-primer#availability-patterns ; Primer — Availability in numbers | https://github.com/donnemartin/system-design-primer#availability-in-numbers ; Karan — Availability | https://github.com/karanpratapsingh/system-design#availability ; Karan — SLA, SLO, SLI | https://github.com/karanpratapsingh/system-design#sla-slo-sli
---

## Objetivo

Medir un sistema con las métricas correctas: distinguir latencia de throughput, leer percentiles, calcular la disponibilidad de componentes en serie y en paralelo, y traducir objetivos de negocio a SLA, SLO, SLI y presupuesto de errores.

## Estudio

### Dos preguntas distintas: ¿cuánto tarda? y ¿cuánto aguanta?

**Latencia** es el tiempo que tarda una operación en completarse: desde que el cliente envía la petición hasta que recibe la respuesta. **Throughput** es cuántas operaciones completa el sistema por unidad de tiempo: peticiones por segundo, mensajes por segundo, MB por segundo.

Una analogía útil es una autopista. La latencia es cuánto tarda un auto en ir de A a B. El throughput es cuántos autos llegan a B por minuto. Puedes aumentar el throughput agregando carriles sin que ningún auto vaya más rápido; y puedes tener un auto deportivo muy rápido (baja latencia) en una carretera de un solo carril (bajo throughput).

El objetivo habitual de diseño es **maximizar el throughput manteniendo una latencia aceptable**. Las dos métricas están relacionadas: cuando un sistema se acerca a su capacidad máxima, las peticiones empiezan a hacer cola y la latencia se dispara. Por eso un sistema "al 95 % de CPU" suele ser un sistema lento aunque todavía responda.

### La ley de Little: el puente entre ambas

Hay una relación sencilla y muy útil para estimar concurrencia:

```
 L = λ × W
 L = peticiones en curso (concurrencia)
 λ = tasa de llegada (peticiones por segundo)
 W = tiempo medio dentro del sistema (latencia, en segundos)
```

Ejemplo: tu API recibe 2.000 peticiones/s y cada una tarda en promedio 50 ms. Entonces hay en vuelo 2.000 × 0,05 = **100 peticiones** a la vez. Si cada servidor maneja 25 peticiones concurrentes con su pool de threads, necesitas al menos 4 servidores, más margen.

Ahora imagina que la base de datos se degrada y la latencia sube a 500 ms. Con la misma tasa de llegada, la concurrencia sube a 1.000 peticiones en vuelo. Tus pools de threads se agotan, las peticiones nuevas esperan y el sistema colapsa aunque la tasa de llegada no cambió. Este es el mecanismo detrás de muchos fallos en cascada: **un componente lento consume capacidad en todos los que lo llaman**. Por eso los timeouts y los circuit breakers (sesión 12) son esenciales.

### Promedios engañan: percentiles

La latencia promedio esconde a los usuarios que sufren. Imagina 100 peticiones: 99 tardan 20 ms y una tarda 2 s. El promedio es unos 40 ms y parece excelente, pero un usuario de cada cien espera dos segundos.

Por eso se usan **percentiles**:

| Métrica | Significado |
| --- | --- |
| p50 (mediana) | La mitad de las peticiones tarda menos que esto |
| p95 | El 95 % tarda menos; 1 de cada 20 tarda más |
| p99 | 1 de cada 100 tarda más |
| p99.9 | 1 de cada 1.000 tarda más |

Los percentiles altos (tail latency) importan más de lo que parece por dos razones:

1. **Los usuarios más activos ven más peticiones**, así que es más probable que encuentren la cola lenta. Con frecuencia son los clientes más valiosos.
2. **Fan-out**: si una página llama a 10 servicios en paralelo y espera a todos, la página es tan lenta como el más lento. Si cada servicio tiene un p99 de 1 s, la probabilidad de que al menos uno de los 10 supere 1 s es `1 − 0,99^10 ≈ 9,6 %`. ¡Casi una de cada diez páginas será lenta!

DDIA ya trató la medición de percentiles; aquí te importa aplicarlos al dimensionar y al escribir SLO.

### La curva de saturación

Si graficas latencia contra carga de cualquier servidor, verás casi siempre la misma forma:

```
 latencia
   │                                   *
   │                                  *
   │                                *
   │                            *
   │                     *
   │ *   *   *   *   *
   └──────────────────────────────────────── carga (% de capacidad)
     10  20  30  40  50  60  70  80  90 100
```

Hasta cierto punto la latencia es casi plana; a partir de un 70–80 % de utilización crece de forma explosiva, porque cada petición nueva encuentra a otras esperando. Consecuencias prácticas:

- **Dimensiona para el pico, no para el promedio**, y deja margen: planificar para operar al 50–70 % en el pico es habitual.
- **El throughput máximo real** de un componente es menor que su capacidad teórica, porque cerca del límite la latencia deja de ser aceptable.
- **Identifica el recurso que satura primero**: CPU, memoria, conexiones a la base de datos, ancho de banda de red, IOPS de disco. El throughput del sistema lo fija el recurso más escaso, igual que el ancho del cuello de una botella fija cuánto líquido sale.

### Técnicas para reducir la latencia de cola

Cuando el p99 es el problema, estas técnicas son las más usadas:

| Técnica | Idea | Costo |
| --- | --- | --- |
| Timeouts ajustados | No esperar indefinidamente a una dependencia lenta | Hay que decidir qué responder cuando vence |
| Hedged requests | Si una petición no responde en el p95, enviar una copia a otra réplica y quedarse con la primera respuesta | Carga extra de alrededor del 5 % |
| Cache local | Evitar la llamada remota en el caso común | Datos potencialmente viejos |
| Reducir el fan-out | Agrupar datos para llamar a menos servicios | Acoplamiento, desnormalización |
| Aislar trabajos pesados | Mover reportes o batch fuera de los nodos que atienden usuarios | Más infraestructura |

### Dónde medir los SLI

Lo que mides depende de dónde lo mides. Medir en el servidor ignora fallos de red y del balanceador; medir en el cliente incluye la red del usuario, que no controlas. Una práctica común es tomar el SLI principal en el **load balancer** (ve todas las peticiones, incluidas las que ningún servidor atendió) y complementarlo con **sondas sintéticas** externas que simulan usuarios desde varias regiones. Define también qué cuenta como "éxito": un 500 es fallo; un 404 de un recurso inexistente normalmente no; una respuesta correcta que tardó 5 s probablemente sí, si el SLI incluye latencia.

### Disponibilidad: qué es y cómo se mide

**Disponibilidad** es la fracción del tiempo en la que el sistema está operativo y responde correctamente. Se expresa como porcentaje y se habla de "nueves":

| Disponibilidad | Caída por año | Caída por mes | Caída por día |
| --- | --- | --- | --- |
| 99 % (dos nueves) | ≈ 3,65 días | ≈ 7,3 h | ≈ 14,4 min |
| 99,9 % (tres nueves) | ≈ 8,8 h | ≈ 43,8 min | ≈ 1,4 min |
| 99,99 % (cuatro nueves) | ≈ 52,6 min | ≈ 4,4 min | ≈ 8,6 s |
| 99,999 % (cinco nueves) | ≈ 5,3 min | ≈ 26 s | ≈ 0,86 s |

Cómo calcularlo tú mismo: un año tiene unos 525.600 minutos. Con 99,9 % aceptas caer el 0,1 %: 525.600 × 0,001 ≈ 526 minutos ≈ 8,8 horas. Cada nueve adicional divide la caída aceptable entre diez.

Detalle importante: cada nueve cuesta mucho más que el anterior. Con cinco nueves no tienes tiempo ni para que una persona despierte y lea la alerta: el sistema debe recuperarse solo. Los grandes proveedores de nube suelen comprometer 99,9 % o más para sus servicios de cómputo.

También puedes medir disponibilidad por peticiones en vez de por tiempo: `peticiones exitosas / peticiones totales`. Esta versión es más justa para sistemas con tráfico desigual: una caída de 10 minutos a las 3 a.m. afecta a menos usuarios que una a las 8 p.m.

### Componentes en serie y en paralelo

Un sistema real es una cadena de componentes. Si una petición atraviesa varios componentes **en serie** (todos deben funcionar), las disponibilidades se multiplican:

```
 A_total = A1 × A2 × ... × An

 LB (99,99 %) → Web (99,9 %) → BD (99,9 %)
 A_total = 0,9999 × 0,999 × 0,999 ≈ 0,9979 → 99,79 %
```

Observa que el total es **peor que el peor componente**. Cada dependencia en serie resta disponibilidad. Un sistema con 20 microservicios en serie, cada uno con 99,9 %, tiene 0,999^20 ≈ 98 %: más de siete días de caída al año.

Si pones componentes **en paralelo** (redundantes, basta con que uno funcione), la indisponibilidad se multiplica:

```
 A_total = 1 − (1 − A1) × (1 − A2)

 Dos servidores web de 99,9 % en paralelo:
 A_total = 1 − 0,001 × 0,001 = 1 − 0,000001 = 99,9999 %
```

Este cálculo asume fallos **independientes**. En la vida real no lo son del todo: si ambos servidores están en el mismo rack, comparten fuente de alimentación; si comparten el mismo bug de software, caen juntos con el mismo input. Por eso la redundancia útil reparte réplicas en zonas de disponibilidad distintas y despliega cambios de forma escalonada.

### Patrones de disponibilidad: failover y replicación

Hay dos patrones complementarios para alcanzar alta disponibilidad.

**Failover activo-pasivo**. El servidor activo atiende todo el tráfico y envía *heartbeats* al pasivo. Si los heartbeats se interrumpen, el pasivo toma la IP del activo y continúa el servicio.

```
 Tráfico ──> [Activo] ──heartbeat──> [Pasivo (standby)]
                 X  (falla)
 Tráfico ──────────────────────────> [Pasivo → Activo]
```

El tiempo de caída depende de si el pasivo está en **hot standby** (ya arrancado y sincronizado; segundos) o **cold standby** (hay que arrancarlo y cargar datos; minutos u horas). Desventaja: pagas un servidor que no atiende tráfico.

**Failover activo-activo**. Ambos servidores atienden tráfico y reparten la carga. Si uno cae, el otro absorbe todo. Si son públicos, el DNS debe conocer ambas IPs; si son internos, la aplicación o un balanceador debe conocer ambos. Ventaja: aprovechas toda la capacidad. Riesgo: si cada uno trabaja al 70 %, cuando uno cae el otro recibe el 140 % y también cae. Regla práctica: en activo-activo con N nodos, mantén la carga por debajo de `(N−1)/N` de la capacidad total.

Desventajas comunes a cualquier failover: más hardware, más complejidad, y posible **pérdida de datos** si el activo falla antes de replicar escrituras recientes al pasivo.

**Replicación** es el otro patrón: copias de los datos en varios nodos. Ya la estudiaste a fondo en DDIA (líder único, multi-líder, sin líder); en diseño de sistemas basta con nombrar cuál usas y por qué.

### Disponibilidad, confiabilidad y tolerancia a fallos

Estos términos se usan como sinónimos pero no lo son:

- **Disponibilidad**: ¿el sistema responde cuando lo necesito?
- **Confiabilidad** (reliability): ¿el sistema hace lo correcto de forma consistente durante un periodo? Un sistema puede estar disponible y devolver datos incorrectos: está disponible pero no es confiable. Un sistema confiable suele ser disponible, pero no al revés.
- **Alta disponibilidad** (HA): minimizar la caída aceptando una pequeña interrupción durante el failover.
- **Tolerancia a fallos** (fault tolerance): seguir funcionando **sin interrupción** visible cuando falla un componente. Es más cara: requiere redundancia completa y, a menudo, hardware o protocolos especiales.

### SLA, SLO y SLI

Estas tres siglas convierten la disponibilidad en un compromiso medible:

- **SLI** (Service Level Indicator): la **medición**. Ejemplo: "porcentaje de peticiones HTTP a `/checkout` con respuesta 2xx en menos de 300 ms, medido en el balanceador".
- **SLO** (Service Level Objective): el **objetivo interno** sobre ese indicador. Ejemplo: "SLI ≥ 99,9 % en una ventana móvil de 30 días".
- **SLA** (Service Level Agreement): el **contrato** con el cliente, con consecuencias si no se cumple (créditos, reembolsos). Suele redactarlo el área legal o de negocio, y debe ser **más laxo que el SLO**: si tu SLO es 99,9 %, tu SLA podría ser 99,5 %. Así el SLO te avisa antes de violar el contrato.

```
 SLI (lo que mides) ──comparas con──> SLO (lo que te propones)
                                         │ más laxo
                                         ▼
                                       SLA (lo que prometes con multa)
```

### Presupuesto de errores

Un SLO de 99,9 % en 30 días significa que **puedes fallar** el 0,1 % de las peticiones. Si recibes 100 M de peticiones al mes, tu **error budget** es de 100.000 peticiones fallidas. Esto convierte la confiabilidad en una decisión de producto:

- Si te queda mucho presupuesto, puedes desplegar más rápido y experimentar.
- Si lo consumiste, congelas lanzamientos riesgosos y priorizas estabilidad.

La idea importante: 100 % de disponibilidad no es un objetivo razonable. Los usuarios ya tienen redes móviles y routers que fallan más que tu servicio; perseguir el último nueve cuesta mucho y nadie lo nota.

### Cómo elegir el objetivo correcto

Para decidir cuántos nueves necesitas, pregunta:

1. ¿Qué pasa si el servicio cae 10 minutos? ¿Se pierde dinero, se pierde confianza o simplemente alguien reintenta?
2. ¿Hay un humano esperando la respuesta (síncrono) o es un proceso en segundo plano (asíncrono)?
3. ¿El servicio es una dependencia de muchos otros? Entonces su disponibilidad se multiplica en todos ellos.

| Tipo de sistema | Objetivo típico | Por qué |
| --- | --- | --- |
| Herramienta interna de reportes | 99 % | Los usuarios pueden esperar o reintentar |
| Tienda online (checkout) | 99,9–99,95 % | Cada minuto caído pierde ventas |
| Servicio de autenticación central | 99,99 % | Si cae, cae todo lo que depende de él |
| Procesamiento de pagos | 99,99 %+ | Dinero y regulación |

Una regla útil: un servicio no puede ser más disponible que sus dependencias síncronas. Si tu servicio necesita 99,99 % pero llama de forma síncrona a otro de 99,9 %, o lo sacas de la ruta crítica (cache, cola, valor por defecto) o aceptas que tu objetivo real es 99,9 %. Escribir esto explícitamente en el design doc evita prometer nueves que la arquitectura no puede entregar.

### Modos de fallo que rompen los cálculos

- **Fallos correlacionados**: dos réplicas en la misma zona, el mismo bug desplegado a la vez, un certificado que expira en todos los nodos el mismo día.
- **Dependencias ocultas**: un servicio "redundante" que depende de un único DNS interno o de una única base de configuración.
- **Failover que nunca se probó**: el standby existe en el diagrama pero nadie verificó que arranca. Practica failovers de forma periódica.
- **Retry storms**: tras un fallo breve, todos los clientes reintentan a la vez y generan más carga de la que el sistema sana puede soportar. Mitigación: backoff exponencial con jitter.

### Un ejercicio resuelto de punta a punta

Una API de pedidos tiene esta ruta crítica: DNS gestionado (99,99 %), load balancer gestionado (99,99 %), 3 servidores web en paralelo (cada uno 99,5 %), un líder de base de datos con failover automático (99,95 %) y un proveedor de pagos externo (99,9 %).

1. Web en paralelo: `1 − 0,005³ = 1 − 1,25 × 10⁻⁷ ≈ 99,99999 %`. La capa web deja de importar.
2. Serie total: `0,9999 × 0,9999 × 0,9999999 × 0,9995 × 0,999 ≈ 0,9983` → **≈ 99,83 %**.
3. Caída esperada: 0,17 % de 525.600 min ≈ **894 min/año ≈ 15 h**.
4. Los eslabones débiles son la base de datos y el proveedor de pagos. Agregar más servidores web no mejora nada. Opciones: un segundo proveedor de pagos con failover, o hacer el pago asíncrono (aceptar el pedido y cobrar con reintentos), lo que saca al proveedor de la ruta síncrona.

Esta es la forma de razonar que se espera en diseño de sistemas: calcular, encontrar el eslabón débil e invertir solo ahí.

## Conceptos clave

- **Latencia**: tiempo que tarda una operación en completarse.
- **Throughput**: operaciones completadas por unidad de tiempo.
- **Ley de Little**: concurrencia = tasa de llegada × latencia.
- **Percentil p99**: valor bajo el que queda el 99 % de las latencias medidas.
- **Disponibilidad en serie**: producto de las disponibilidades; empeora con cada dependencia.
- **Disponibilidad en paralelo**: uno menos el producto de las indisponibilidades; mejora con redundancia independiente.
- **Failover activo-pasivo**: un nodo en espera toma el control cuando el activo deja de enviar heartbeats.
- **Failover activo-activo**: todos los nodos atienden tráfico y absorben la carga del que cae.
- **SLI / SLO / SLA**: indicador medido / objetivo interno / contrato con consecuencias.
- **Error budget**: cantidad de fallo permitida por el SLO en una ventana.

## Preguntas de repaso

1. Una API recibe 500 peticiones/s con latencia media de 200 ms. ¿Cuántas peticiones hay en vuelo y qué pasa si la latencia sube a 2 s?
   R: Por la ley de Little, 500 × 0,2 = 100 peticiones en vuelo. Con 2 s serían 1.000: diez veces más threads o conexiones ocupadas con la misma tasa de llegada. Si los pools no alcanzan, las peticiones se encolan, la latencia sube más y el sistema puede colapsar; por eso se necesitan timeouts y circuit breakers.
2. ¿Por qué el p99 importa más que el promedio en una página que llama a 20 servicios en paralelo?
   R: Porque la página espera al servicio más lento. La probabilidad de que al menos uno de 20 supere su p99 es 1 − 0,99²⁰ ≈ 18 %. El promedio de cada servicio puede ser excelente y aun así casi una de cada cinco páginas será lenta.
3. Calcula la disponibilidad de un LB de 99,99 % seguido de dos bases de datos redundantes de 99,9 % cada una, asumiendo fallos independientes.
   R: Las bases en paralelo: 1 − 0,001 × 0,001 = 99,9999 %. En serie con el LB: 0,9999 × 0,999999 ≈ 99,9899 %, prácticamente 99,99 %. El LB pasa a ser el eslabón que limita.
4. ¿Qué diferencia hay entre SLO y SLA y por qué el SLA debe ser más laxo?
   R: El SLO es un objetivo interno sobre un indicador medido; el SLA es un contrato con el cliente que tiene consecuencias económicas. El SLA debe ser más laxo para que, al acercarte a incumplir el SLO, tengas margen para reaccionar antes de violar el contrato y pagar penalizaciones.
5. ¿Cuál es el riesgo de un esquema activo-activo con dos nodos al 70 % de carga cada uno?
   R: Si uno cae, el otro recibe 140 % de su capacidad y también cae: el fallo de uno provoca la caída total. En activo-activo con N nodos hay que mantener la carga por debajo de (N−1)/N de la capacidad total, en este caso 50 % por nodo.

## Ejercicio

Escribe en TypeScript una función `availability(component)` que reciba un árbol de componentes del tipo `{ kind: "leaf", a: number } | { kind: "serial" | "parallel", children: Component[] }` y devuelva la disponibilidad total; agrega `downtimeMinutesPerYear(a)`. Modela la API de pedidos del ejercicio resuelto y verifica que obtienes ≈ 99,83 % y ≈ 894 min/año. Terminado cuando tengas tres pruebas (serie, paralelo y el caso completo) pasando y una frase que diga cuál componente mejorarías primero.

## Explícalo con tus palabras

Explica por qué agregar más servicios en una cadena hace que el sistema completo esté caído más tiempo, usando la imagen de una fila de bombillas conectadas en serie.
