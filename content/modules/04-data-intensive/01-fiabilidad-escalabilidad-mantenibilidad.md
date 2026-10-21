---
title: Fiabilidad, escalabilidad y mantenibilidad
kind: lesson
hours: 2
sources: Designing Data-Intensive Applications (Kleppmann), cap. 1 (pp. 25–45)
links: Google SRE Book, capítulo de SLOs | https://sre.google/sre-book/service-level-objectives/ ; HdrHistogram | https://hdrhistogram.github.io/HdrHistogram/
---

## Objetivo

Entender qué significa que un sistema de datos sea fiable, escalable y mantenible, y aprender a describir la carga y el rendimiento con números (load parameters y percentiles) en lugar de adjetivos.

## Estudio

### Por qué "intensivo en datos" y no "intensivo en CPU"

La mayoría de las aplicaciones que vas a construir no están limitadas por la potencia de cálculo. Un servidor moderno multiplica matrices sin despeinarse. Lo difícil suele ser otra cosa: **la cantidad de datos, su complejidad y la velocidad a la que cambian**. A una aplicación así la llamamos *data-intensive*.

Piensa en una aplicación web típica. Casi nunca usa una sola herramienta. Tiene:

- Una base de datos para guardar el estado de forma duradera (PostgreSQL, MySQL).
- Un cache para no repetir lecturas caras (Redis, Memcached).
- Un índice de búsqueda para consultar por palabras clave (Elasticsearch, OpenSearch).
- Un sistema de mensajería para enviar trabajo a otros procesos de forma asíncrona (Kafka, RabbitMQ, SQS).
- Procesos batch que periódicamente recorren montones de datos acumulados.

```
              petición del usuario
                     │
                     ▼
            ┌─────────────────┐
            │  código de la   │──── lee/escribe ────► cache (Redis)
            │   aplicación    │──── lee/escribe ────► base de datos primaria
            └────────┬────────┘──── consulta ───────► índice de búsqueda
                     │
                     │ publica eventos
                     ▼
               cola de mensajes ──► workers asíncronos (emails, reindexado)
```

Cuando combinas estas piezas, **tú te conviertes en diseñador de un sistema de datos**, aunque no lo hayas planeado. Tu código es el pegamento que mantiene el cache sincronizado con la base de datos y el índice de búsqueda actualizado. Ese pegamento ofrece garantías (o no) a quien llama a tu API: ¿qué pasa si el cache tiene un valor viejo? ¿Qué pasa si el índice se actualiza pero la base de datos no? Las fronteras entre categorías también se difuminan: Redis se usa como cola de mensajes y Kafka ofrece durabilidad parecida a la de una base de datos.

Para razonar sobre estas decisiones, el libro propone tres preocupaciones que atraviesan todo el módulo: **fiabilidad, escalabilidad y mantenibilidad**.

### Fiabilidad: seguir funcionando cuando algo falla

De forma intuitiva, algo es fiable si "funciona bien": hace lo que el usuario espera, tolera errores del usuario, rinde lo suficiente para el caso de uso y evita accesos no autorizados. Resumido: **el sistema sigue funcionando correctamente aunque las cosas salgan mal**.

Aquí hay que distinguir dos palabras que se confunden mucho:

| Término | Qué es | Ejemplo |
| --- | --- | --- |
| **Fault** (fallo de un componente) | Un componente se desvía de su especificación | Un disco muere, un proceso se queda sin memoria |
| **Failure** (falla del sistema) | El sistema entero deja de dar el servicio requerido al usuario | La tienda online no permite pagar |

No puedes reducir la probabilidad de un fault a cero. Lo que diseñas es **tolerancia a fallos**: mecanismos para que los faults no se conviertan en failures. Por eso tiene sentido provocar fallos a propósito. Netflix popularizó la idea con su *Chaos Monkey*, que mata instancias en producción para que el equipo compruebe que el sistema realmente se recupera. Muchos bugs críticos aparecen en el código de manejo de errores, que casi nunca se ejecuta; si lo ejercitas de forma deliberada, ganas confianza.

#### Fallos de hardware

Discos que se rompen, RAM defectuosa, cortes de luz, alguien que desenchufa el cable de red equivocado. Un dato orientativo: los discos duros tienen un tiempo medio hasta el fallo (MTTF) de unos 10 a 50 años. Suena mucho, pero en un clúster de 10.000 discos eso significa que **en promedio se rompe un disco al día**.

La respuesta clásica es la redundancia por componente: RAID para discos, fuentes de alimentación dobles, generadores diésel. Durante años eso bastaba, porque restaurar un backup en una máquina nueva era raro y aceptable. Hoy cambió por dos motivos:

1. Las aplicaciones usan muchas más máquinas, así que los fallos de hardware son más frecuentes en términos absolutos.
2. En la nube (AWS, GCP, Azure) es normal que una instancia desaparezca sin aviso. Las plataformas priorizan flexibilidad y elasticidad por encima de la fiabilidad de una sola máquina.

Por eso se pasa a **tolerancia a fallos por software**: sistemas que aguantan la pérdida de máquinas enteras. Un beneficio operativo enorme: puedes aplicar parches del sistema operativo reiniciando un nodo cada vez (*rolling upgrade*) sin tirar el servicio.

#### Errores de software

Los fallos de hardware suelen ser aleatorios e independientes: que un disco falle no hace que falle el de al lado (con matices: misma partida de fabricación, misma temperatura). Los errores de software son distintos: son **sistemáticos y correlacionados**. Un mismo bug afecta a todos los nodos a la vez. Ejemplos típicos:

- Un input concreto hace que todas las instancias del servidor de aplicación se caigan (el famoso segundo intercalar del 30 de junio de 2012 colgó muchas aplicaciones por un bug del kernel de Linux).
- Un proceso descontrolado consume CPU, memoria o disco compartidos.
- Un servicio del que dependes se ralentiza o empieza a devolver respuestas corruptas.
- **Fallos en cascada**: un pequeño fallo en un componente dispara fallos en otro, y así sucesivamente.

No hay una solución mágica. Ayudan muchas cosas pequeñas: pensar bien las suposiciones del sistema, tests exhaustivos, aislamiento de procesos, permitir que los procesos se caigan y reinicien, medir y monitorizar en producción. Si un sistema promete una garantía (por ejemplo, en una cola, que los mensajes que entran son los que salen), puede **comprobarse a sí mismo** continuamente y alertar si detecta una discrepancia.

#### Errores humanos

Los humanos diseñan, construyen y operan los sistemas, y se equivocan. Un estudio sobre grandes servicios de internet citado en el libro encontró que los errores de configuración de operadores eran la causa principal de las caídas, por encima de los fallos de hardware (que estaban detrás de solo un 10–25 % de los incidentes). Estrategias para convivir con ello:

- **Diseñar para minimizar oportunidades de error**: APIs y paneles de administración que hagan fácil lo correcto y difícil lo incorrecto, sin volverse tan restrictivos que la gente los evite.
- **Separar los lugares donde se cometen más errores** de los que causan caídas: entornos *sandbox* con datos reales donde experimentar sin afectar a usuarios.
- **Testear a todos los niveles**: unit tests, tests de integración, tests manuales. Los tests automatizados cubren casos raros que casi nunca aparecen en la operación normal.
- **Recuperación rápida y fácil**: rollback rápido de configuraciones, despliegues graduales (canary) y herramientas para recalcular datos si el cálculo anterior estaba mal.
- **Monitorización detallada** (telemetría): métricas y tasas de error que muestran señales tempranas.
- **Buenas prácticas de gestión y formación**.

#### ¿Cuánto importa?

La fiabilidad no es solo para centrales nucleares. Un bug en una aplicación de negocio cuesta productividad y, a veces, problemas legales; una caída en un ecommerce cuesta dinero y reputación. Piensa en una app de fotos familiares: si la base de datos se corrompe, esos padres pierden algo irremplazable. A veces sacrificarás fiabilidad para reducir costes (un prototipo, un mercado muy pequeño), pero debes hacerlo **de forma consciente**.

### Escalabilidad: describir la carga con números

Que un sistema funcione hoy con 10.000 usuarios no garantiza que funcione con 100.000. **Escalabilidad** describe la capacidad de un sistema para afrontar un aumento de carga. No es una etiqueta binaria ("X escala", "Y no escala"). Es una conversación: *si el sistema crece de esta forma concreta, ¿qué opciones tenemos?*

#### Load parameters

Antes de hablar de crecimiento, describe la carga actual con unos pocos números, los **load parameters**. Cuáles importan depende de tu arquitectura: peticiones por segundo a un servidor web, proporción de lecturas y escrituras, usuarios activos simultáneos en un chat, tasa de aciertos de un cache. A veces lo que importa es el promedio; otras, un puñado de casos extremos.

#### El caso de Twitter

El ejemplo clásico del libro usa datos públicos de Twitter de 2012. Dos operaciones:

- **Publicar un tweet**: unos 4.600 por segundo de media, más de 12.000 por segundo en picos.
- **Leer el home timeline** (los tweets de la gente a la que sigues): unas 300.000 peticiones por segundo.

Manejar 12.000 escrituras por segundo es fácil. El problema real es el **fan-out**: cada usuario sigue a muchos y es seguido por muchos. Hay dos enfoques:

```
Enfoque 1: calcular al leer                 Enfoque 2: calcular al escribir
──────────────────────────                  ───────────────────────────────
publicar → INSERT en tabla global tweets    publicar → buscar seguidores →
                                                       insertar el tweet en el
leer timeline → JOIN follows + tweets               "buzón" (cache) de cada uno
               + ordenar por fecha
                                            leer timeline → leer tu buzón
escritura barata, lectura cara              escritura cara, lectura barata
```

Twitter empezó con el enfoque 1 y no daba abasto con las lecturas del timeline. Pasó al enfoque 2: como se leen timelines casi dos órdenes de magnitud más que se publican tweets, conviene hacer más trabajo al escribir y menos al leer. Pero el enfoque 2 tiene un coste: un tweet llega en promedio a unos 75 seguidores, así que 4.600 tweets por segundo se convierten en unas 345.000 escrituras por segundo en los caches. Y el promedio engaña: hay cuentas con más de 30 millones de seguidores. **Un solo tweet de una celebridad puede generar 30 millones de escrituras.**

La solución final fue **híbrida**: la mayoría de los usuarios sigue con fan-out al escribir, pero las cuentas con muchísimos seguidores se excluyen; sus tweets se consultan al leer y se mezclan con el timeline precalculado. La lección: aquí el load parameter clave no es "tweets por segundo", sino **la distribución de seguidores por usuario** (ponderada por cuánto publica cada uno).

#### Describir el rendimiento: throughput y response time

Con la carga descrita, puedes preguntar dos cosas:

1. Si aumento la carga y dejo los recursos igual, ¿cómo cambia el rendimiento?
2. Si aumento la carga, ¿cuántos recursos necesito añadir para mantener el mismo rendimiento?

En sistemas batch (Hadoop, Spark) nos importa el **throughput**: registros procesados por segundo. En sistemas online importa el **response time**: el tiempo entre que el cliente envía una petición y recibe la respuesta.

Ojo con un matiz: *latency* y *response time* no son sinónimos. El response time es lo que ve el cliente: tiempo de servicio más retrasos de red y de colas. La latencia es el tiempo que una petición pasa esperando a ser atendida, "latente".

#### Percentiles, no promedios

Si repites la misma petición mil veces, obtendrás mil tiempos distintos: un cambio de contexto, un paquete TCP perdido y retransmitido, una pausa del garbage collector, un page fault. Por eso el response time es una **distribución**, no un número.

El promedio (media aritmética) es una mala métrica para describir la experiencia "típica", porque no te dice cuántos usuarios sufrieron un retraso. Mejor usa **percentiles**:

```
100 peticiones ordenadas de rápida a lenta (ms)

p50 (mediana) ─────────────► la petición nº 50 tarda 200 ms
                             la mitad tarda menos, la mitad más
p95 ───────────────────────► la nº 95 tarda 1.500 ms
                             5 de cada 100 tardan 1,5 s o más
p99 / p999 ────────────────► la "cola" (tail latency)

  ms
1500│                                                  █
    │                                                  █ █
 200│ ▂▂▃▃▃▄▄▄▄▄▅▅▅▅▅▅▅▅▅▅▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▇▇▇█ █ █
    └──────────────────────────────────────────────────────►
                         peticiones (ordenadas)
```

Los percentiles altos (p95, p99, p999) se llaman **tail latencies** y afectan directamente a la experiencia. Amazon define requisitos internos con el p999, aunque solo afecte a 1 de cada 1.000 peticiones, porque los clientes más lentos suelen ser los que tienen más datos en su cuenta: los que más compran. Optimizar el p9999 se consideró demasiado caro para el beneficio.

Los percentiles aparecen en los **SLOs** (objetivos de nivel de servicio) y **SLAs** (acuerdos contractuales). Un SLA podría decir: "el servicio se considera disponible si la mediana es menor a 200 ms y el p99 menor a 1 s, y debe estar disponible el 99,9 % del tiempo".

#### Head-of-line blocking y amplificación de la cola

Las **colas** explican buena parte de la latencia en percentiles altos. Un servidor solo procesa unas pocas cosas en paralelo (limitado por sus núcleos). Basta con unas pocas peticiones lentas para que las siguientes esperen detrás, aunque sean rápidas: **head-of-line blocking**. Consecuencia práctica: **mide el response time en el cliente**, no solo en el servidor. Y en un test de carga, el generador debe enviar peticiones a ritmo constante, sin esperar a que termine la anterior; si espera, mantiene las colas artificialmente cortas y mide mal.

Otro efecto importante es la **tail latency amplification**. Si atender una petición de usuario requiere llamar a 10 servicios backend en paralelo, la respuesta tarda lo que tarde la llamada **más lenta**. Aunque cada backend sea lento solo el 1 % de las veces, la probabilidad de que al menos una de las 10 llamadas sea lenta es `1 - 0,99^10 ≈ 9,6 %`. Con 100 llamadas, sube a ~63 %.

```
petición del usuario ──┬──► backend A  ██ (10 ms)
                       ├──► backend B  ██ (12 ms)
                       ├──► backend C  ████████████████ (300 ms)  ◄── dicta el total
                       └──► backend D  ██ (9 ms)
respuesta al usuario: ~300 ms
```

Para calcular percentiles en dashboards, la versión ingenua guarda todos los tiempos de una ventana (por ejemplo, 10 minutos) y los ordena cada minuto. Existen algoritmos aproximados mucho más eficientes: **t-digest**, **HdrHistogram**, *forward decay*. Un error muy común: **promediar percentiles** (por ejemplo, el p99 de cada máquina) no tiene sentido matemático. La forma correcta es combinar los histogramas.

#### Cómo afrontar el crecimiento

Una arquitectura adecuada para un nivel de carga rara vez aguanta 10 veces más. Si tu servicio crece rápido, tendrás que repensarla en cada orden de magnitud. Dos estrategias:

| Estrategia | Qué es | Ventajas | Desventajas |
| --- | --- | --- | --- |
| **Scale up** (vertical) | Máquina más potente | Simple, sin distribución | Caro, tiene techo |
| **Scale out** (horizontal) | Repartir la carga entre muchas máquinas pequeñas (*shared-nothing*) | Sin techo teórico, más barato por unidad | Complejidad de sistemas distribuidos |

En la práctica se mezclan: unas pocas máquinas potentes suelen ser más simples y baratas que muchísimas máquinas pequeñas. Algunos sistemas son **elásticos** (añaden recursos automáticamente al detectar más carga); otros se escalan a mano, lo cual es más predecible.

Escalar servicios **stateless** horizontalmente es fácil. Llevar una base de datos **stateful** de un nodo a muchos es mucho más complejo; por eso durante años se mantuvo la base de datos en un solo nodo hasta que el coste o la disponibilidad obligaban a distribuirla. Con mejores herramientas esto cambia, y la Parte II del módulo trata justamente de eso.

**No existe una arquitectura escalable genérica** ("magic scaling sauce"). Un sistema que maneja 100.000 peticiones por segundo de 1 kB cada una es muy distinto de uno que maneja 3 peticiones por minuto de 2 GB, aunque ambos muevan el mismo volumen. La arquitectura se construye sobre **suposiciones** sobre qué operaciones serán comunes y cuáles raras; si las suposiciones fallan, el trabajo de escalado se desperdicia. En una startup, iterar rápido el producto suele importar más que escalar para una carga hipotética.

### Mantenibilidad: el coste está después del lanzamiento

La mayor parte del coste del software no está en el desarrollo inicial, sino en el **mantenimiento**: corregir bugs, mantenerlo operativo, investigar fallos, adaptarlo a nuevas plataformas y casos de uso, pagar deuda técnica, añadir funciones. A nadie le gusta mantener *legacy*, pero puedes diseñar para que el sistema no se convierta en uno. Tres principios:

#### Operabilidad: hacer fácil la vida de operaciones

"Un buen equipo de operaciones puede compensar software malo, pero software bueno no funciona de forma fiable con un mal equipo de operaciones." Operaciones se encarga de monitorizar la salud, restaurar servicios, rastrear problemas, mantener parches de seguridad al día, planificar capacidad, desplegar y documentar. Un sistema de datos ayuda si:

- Ofrece **visibilidad** del comportamiento interno (métricas, logs, trazas).
- Se integra bien con herramientas de automatización.
- **No depende de una sola máquina** (permite apagar nodos para mantenimiento).
- Tiene **buena documentación** y un modelo operativo fácil de entender ("si hago X, pasa Y").
- Tiene **defaults razonables**, pero permite sobreescribirlos.
- Se **autorrepara** cuando conviene, pero deja el control manual cuando hace falta.
- Es **predecible**: minimiza sorpresas.

#### Simplicidad: gestionar la complejidad

Los proyectos grandes acaban en una "gran bola de barro" (*big ball of mud*): acoplamiento entre módulos, dependencias enredadas, nombres inconsistentes, hacks de rendimiento, casos especiales para tapar otros problemas. La complejidad hace que todo cambio sea arriesgado y que se escondan suposiciones.

Distingue complejidad **esencial** (inherente al problema que resuelves) de complejidad **accidental** (la que surge solo por la implementación). La mejor herramienta contra la accidental es la **abstracción**: una buena abstracción oculta muchos detalles detrás de una fachada limpia y se reutiliza. SQL es un gran ejemplo: oculta estructuras en disco, concurrencia y recuperación tras un crash. Los lenguajes de alto nivel ocultan el código máquina y los registros de CPU. Parte de este módulo consiste en descubrir qué abstracciones permiten partir un sistema de datos en piezas reutilizables.

#### Evolvabilidad: facilitar el cambio

Los requisitos cambian siempre: aprendes cosas nuevas, aparecen casos de uso, cambian las prioridades del negocio, cambian las leyes, el crecimiento obliga a cambiar la arquitectura. Las prácticas ágiles (TDD, refactoring) ayudan a nivel de unos pocos archivos de código. El libro busca agilidad a nivel de **sistema de datos completo**: ¿cómo "refactorizarías" la arquitectura del timeline de Twitter del enfoque 1 al 2? A esa agilidad a escala de sistema la llama **evolvability**, y está muy ligada a la simplicidad: los sistemas simples y bien abstraídos son más fáciles de cambiar.

### Ideas erróneas frecuentes

- **"Este sistema escala."** La pregunta correcta es *escala con respecto a qué load parameter y hasta dónde*.
- **"El promedio de latencia es 50 ms, vamos bien."** Puede que el p99 sea 3 s y estés perdiendo a tus mejores clientes.
- **"El p99 global es el promedio de los p99 de cada servidor."** Falso; necesitas combinar las distribuciones.
- **"La fiabilidad es cosa de hardware redundante."** Los errores de software y humanos causan más caídas y son correlacionados.
- **"Fault y failure son lo mismo."** Un fault es local; una failure es el sistema entero dejando de servir. Diseñas para que lo primero no lleve a lo segundo.

### Resumen

Una aplicación tiene requisitos funcionales (qué hace) y no funcionales (seguridad, fiabilidad, cumplimiento, escalabilidad, compatibilidad, mantenibilidad). La **fiabilidad** consiste en seguir funcionando ante faults de hardware, software y humanos. La **escalabilidad** exige describir carga (load parameters) y rendimiento (percentiles) con números y tener estrategias para crecer. La **mantenibilidad** busca operabilidad, simplicidad y evolvabilidad. No hay recetas mágicas, pero sí patrones que se repiten y que vas a estudiar durante el resto del módulo.

## Conceptos clave

- **Data-intensive application**: aplicación cuyo reto principal es el volumen, la complejidad o la velocidad de cambio de los datos, no la CPU.
- **Fault**: un componente que se desvía de su especificación.
- **Failure**: el sistema completo deja de prestar el servicio al usuario.
- **Fault tolerance**: capacidad de evitar que los faults se conviertan en failures.
- **Load parameters**: números que describen la carga (peticiones/s, ratio lectura/escritura, fan-out).
- **Fan-out**: número de operaciones derivadas que genera una sola petición (por ejemplo, entregas a seguidores).
- **Response time**: tiempo total que percibe el cliente; incluye red y colas.
- **Percentil p99**: umbral de tiempo por debajo del cual está el 99 % de las peticiones.
- **Tail latency amplification**: cuantas más llamadas backend necesita una petición, más probable es que alguna sea lenta.
- **Head-of-line blocking**: peticiones rápidas que esperan detrás de lentas en una cola.
- **Scale up / scale out**: crecer con una máquina más grande o con más máquinas.
- **Operability, simplicity, evolvability**: los tres pilares de la mantenibilidad.

## Preguntas de repaso

1. ¿Cuál es la diferencia entre un fault y una failure, y por qué importa para el diseño?
   R: Un fault es un componente que se desvía de su especificación (un disco que muere); una failure es el sistema entero dejando de dar servicio al usuario. Como los faults no pueden eliminarse, el diseño busca tolerancia a fallos: mecanismos (redundancia, reintentos, réplicas) que impiden que un fault escale a failure.
2. ¿Por qué los errores de software suelen ser más peligrosos que los fallos de hardware?
   R: Porque son sistemáticos y correlacionados: el mismo bug está en todos los nodos y puede activarse en todos a la vez (por ejemplo, el segundo intercalar de 2012), mientras que los fallos de hardware suelen ser aleatorios e independientes entre máquinas. La redundancia no protege contra un bug idéntico en todas las réplicas.
3. Explica por qué Twitter pasó a calcular el timeline al escribir y por qué luego adoptó un enfoque híbrido.
   R: Las lecturas del timeline (~300k/s) superaban por casi dos órdenes de magnitud a las publicaciones (~4,6k/s), así que convenía precomputar el timeline en el momento de escribir (fan-out a los buzones de los seguidores). Pero las cuentas con decenas de millones de seguidores generan escrituras gigantes por cada tweet, así que esas cuentas se excluyen del fan-out y sus tweets se mezclan al leer.
4. ¿Por qué es mejor usar percentiles que la media para el response time?
   R: Porque la media no dice cuántos usuarios sufrieron cierto retraso y se distorsiona con outliers. La mediana (p50) describe la experiencia típica y los percentiles altos (p95, p99, p999) describen la cola, que suele afectar a los usuarios más valiosos y es la que suele fijarse en SLOs/SLAs.
5. Una página necesita 20 llamadas backend en paralelo y cada backend es lento el 1 % de las veces. ¿Qué fracción de páginas será lenta y cómo se llama el efecto?
   R: 1 − 0,99^20 ≈ 18 %. Es la tail latency amplification: la respuesta espera a la llamada más lenta, así que la probabilidad de que alguna sea lenta crece con el número de llamadas.
6. ¿Por qué un generador de carga no debe esperar la respuesta anterior antes de enviar la siguiente?
   R: Porque así reduce artificialmente las colas del servidor (nunca hay más de una petición en vuelo por cliente) y oculta el head-of-line blocking, con lo que los tiempos medidos son mejores que los reales. El generador debe enviar a un ritmo independiente de las respuestas.
7. Nombra los tres componentes de la mantenibilidad y da un ejemplo de cada uno.
   R: Operabilidad (métricas y defaults razonables que facilitan la operación), simplicidad (abstracciones como SQL que eliminan complejidad accidental) y evolvabilidad (poder cambiar la arquitectura del timeline sin reescribirlo todo).

## Ejercicio

Escribe en TypeScript (Node ≥ 22, sin dependencias) un script `latency.ts` que:

1. Genere 10.000 tiempos de respuesta simulados: el 97 % entre 20 y 120 ms (uniforme) y el 3 % entre 800 y 3.000 ms.
2. Calcule la media, p50, p95, p99 y p999 ordenando el array.
3. Simule una página que hace `n` llamadas en paralelo (n = 1, 5, 20, 100) tomando el máximo de `n` muestras, repita 10.000 veces y reporte el p50 y p99 de la página para cada `n`.
4. Demuestre con números que promediar el p99 de dos "servidores" con distribuciones distintas no da el p99 del conjunto combinado.

Criterio de terminado: el script imprime una tabla con las métricas por `n`, se ve que el p50 de la página crece con `n` (amplificación de la cola) y la comparación del punto 4 muestra dos números distintos.

## Explícalo con tus palabras

Explica a un compañero que solo mira la latencia media por qué su dashboard le está mintiendo, usando el ejemplo de una página que llama a 20 servicios.
