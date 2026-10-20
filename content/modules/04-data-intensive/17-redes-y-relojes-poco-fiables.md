---
title: Fallos parciales, redes y relojes poco fiables
kind: lesson
hours: 2
sources: Designing Data-Intensive Applications (Kleppmann), cap. 8 (pp. 295–317)
links: The Network is Reliable (ACM Queue) | https://queue.acm.org/detail.cfm?id=2655736 ; Google Spanner y TrueTime | https://cloud.google.com/spanner/docs/true-time-external-consistency
---

## Objetivo

Entender por qué un sistema distribuido es fundamentalmente distinto de un programa en una sola máquina: fallos parciales, redes asíncronas sin garantías de entrega ni de tiempo, timeouts imposibles de afinar perfectamente, y relojes que no se pueden sincronizar con exactitud.

## Estudio

### El pesimismo como herramienta

Las sesiones anteriores asumieron a veces que las cosas fallan de forma "limpia". Ahora toca ser pesimista: **todo lo que pueda salir mal, saldrá mal**. Trabajar con sistemas distribuidos es fundamentalmente distinto de escribir software para un solo ordenador, y la diferencia principal es que hay muchas formas nuevas y emocionantes de que las cosas fallen.

### Fallos parciales

Un programa en un solo ordenador suele comportarse de forma **predecible**: funciona o no funciona. Software con bugs puede dar la impresión de que el ordenador "tiene un mal día" (se arregla reiniciando), pero normalmente es por software mal escrito. No hay motivo fundamental por el que software en un solo ordenador sea inestable: si el hardware funciona, la misma operación produce el mismo resultado (es **determinista**). Si hay un problema de hardware (memoria corrupta, un conector suelto), lo normal es que todo el sistema falle: un *kernel panic*, una pantalla azul. Un ordenador individual con buen software está diseñado para estar **completamente operativo o completamente roto**, no en medio. Es una decisión de diseño deliberada: preferir que el ordenador se caiga a que devuelva un resultado incorrecto.

En un sistema distribuido, ya no estamos en ese mundo idealizado. Partes del sistema pueden estar rotas de forma impredecible mientras otras funcionan bien. Eso es un **fallo parcial** (*partial failure*), y lo difícil es que es **no determinista**: si intentas algo que involucra varios nodos y la red, a veces funciona y a veces falla de forma impredecible. Puede que ni siquiera **sepas** si algo tuvo éxito, porque el tiempo que tarda un mensaje en viajar también es no determinista.

### Cloud computing frente a supercomputación

Hay un espectro de filosofías para construir sistemas grandes:

- **High-performance computing (HPC)**: supercomputadoras con miles de CPUs para cálculo científico intensivo (predicción meteorológica, dinámica molecular). Si un nodo falla, lo habitual es **parar todo el cálculo**, reparar y reanudar desde un *checkpoint*. Se parece más a un solo ordenador: convierte un fallo parcial en uno total.
- **Cloud computing**: datacenters multi-tenant, hardware común, redes IP (a menudo Ethernet), asignación elástica de recursos y facturación por uso.

Los sistemas de internet son muy distintos de un supercomputador:

- Son **online**: deben servir a usuarios con baja latencia en todo momento; parar el clúster para reparar no es aceptable.
- Usan **hardware común** (más barato pero con tasas de fallo más altas), mientras que los supercomputadores usan hardware especializado.
- Las redes de datacenters se basan en IP y Ethernet en **topologías Clos** con mucho ancho de banda de bisección; los supercomputadores usan topologías especializadas (mallas multidimensionales, toros).
- Cuanto más grande el sistema, más probable es que **algo esté roto siempre**. Si el sistema se rindiera ante cada fallo, pasaría más tiempo recuperándose que trabajando.
- Si el sistema tolera nodos fallidos, puedes hacer **rolling upgrades** y reemplazar máquinas sin parar el servicio.
- En sistemas geográficamente distribuidos, la comunicación pasa por **internet**, que es lenta e impredecible comparada con redes locales.

Si quieres que los sistemas distribuidos funcionen, **debes aceptar la posibilidad de fallos parciales y construir mecanismos de tolerancia en el software**: construir un sistema fiable a partir de componentes poco fiables. Incluso en sistemas pequeños es importante: tu software debe comportarse de forma razonable ante cualquier fallo que pueda ocurrir, incluidos los improbables.

### Redes poco fiables

Los sistemas de los que hablamos son **shared-nothing**: un montón de máquinas conectadas por red. La red es la única forma de comunicarse. Internet y la mayoría de redes internas de datacenters (normalmente Ethernet) son **redes asíncronas de paquetes**: un nodo puede enviar un mensaje (un paquete) a otro, pero la red **no garantiza cuándo llegará, ni si llegará**. Si envías una petición y esperas una respuesta, muchas cosas pueden ir mal:

```
cliente ─── petición ───► red ───► nodo remoto
  1. la petición se perdió (cable desenchufado)
  2. la petición espera en una cola (red o receptor sobrecargados)
  3. el nodo remoto falló (crash, apagado)
  4. el nodo remoto está pausado temporalmente (garbage collection larga)
  5. el nodo procesó la petición, pero la RESPUESTA se perdió
  6. el nodo procesó y respondió, pero la respuesta se retrasa
cliente: solo sabe que NO ha recibido respuesta. No puede distinguir cuál ocurrió.
```

El emisor ni siquiera sabe si el paquete se entregó. La única opción es que el receptor responda, y esa respuesta también puede perderse o retrasarse. **Estos casos son indistinguibles** en una red asíncrona: lo único que sabes es que aún no recibiste respuesta.

La forma habitual de manejarlo es un **timeout**: después de un tiempo dejas de esperar y asumes que la respuesta no llegará. Pero cuando expira el timeout **sigues sin saber** si el nodo remoto recibió tu petición (y si la petición sigue en alguna cola, puede llegar aunque ya te hayas rendido).

#### Fallos de red en la práctica

Llevamos décadas construyendo redes y no hemos logrado hacerlas fiables. Hay estudios sistemáticos y muchísimas anécdotas:

- Un estudio en un datacenter mediano encontró **unos 12 fallos de red al mes**: la mitad desconectaban una máquina; la otra mitad, un rack entero.
- Añadir equipo de red redundante no reduce los fallos tanto como esperarías, porque no protege contra **errores humanos** (switches mal configurados), una causa principal de caídas.
- Las nubes públicas como EC2 son conocidas por sus **fallos de red transitorios** frecuentes.
- Un problema durante la actualización del software de un switch puede reconfigurar la topología y **retrasar paquetes más de un minuto**.
- Los **tiburones** pueden morder cables submarinos y dañarlos.
- Una interfaz de red que **descarta todos los paquetes entrantes pero envía los salientes**: que un enlace funcione en una dirección no garantiza que funcione en la otra.

Cuando una parte de la red queda aislada del resto, se habla de una **network partition** o *netsplit*. (El libro prefiere "network fault" para no confundir con las particiones de datos.)

Aunque los fallos de red sean raros en tu entorno, **pueden ocurrir**, y tu software debe manejarlos. Si el manejo de fallos de red no está definido ni probado, pueden pasar cosas arbitrariamente malas: el clúster puede quedar en **deadlock** permanente incluso cuando la red se recupera, o incluso **borrar todos tus datos**. Manejar fallos de red no significa necesariamente tolerarlos: si tu red es bastante fiable, puede bastar con mostrar un mensaje de error mientras haya problemas. Pero debes saber cómo reacciona tu software y asegurarte de que se recupera. Provocar problemas de red a propósito es la idea de Chaos Monkey (y de herramientas como Toxiproxy o `tc netem`).

#### Detectar fallos

Muchos sistemas necesitan detectar nodos caídos: un load balancer debe dejar de enviar peticiones a un nodo muerto; en replicación con líder, si el líder falla hay que promover un seguidor. La incertidumbre de la red lo hace difícil. A veces recibes señales explícitas:

- Si alcanzas la máquina pero ningún proceso escucha en el puerto (el proceso se cayó), el sistema operativo **rechaza la conexión** TCP con un paquete RST. Pero si el nodo se cayó mientras procesaba tu petición, no sabes cuánto procesó.
- Si el proceso se cayó pero el sistema operativo sigue vivo, un script puede **avisar a otros nodos** para que tomen el relevo sin esperar un timeout (HBase lo hace).
- Si tienes acceso a la interfaz de gestión de los switches, puedes consultarlos para detectar fallos de enlace a nivel hardware.
- Si un router está seguro de que una IP es inalcanzable, puede responder con un **ICMP Destination Unreachable**, aunque tampoco tiene poderes mágicos.

Estas señales son útiles pero **no fiables**. Si quieres estar seguro de que una petición tuvo éxito, necesitas una **respuesta positiva de la propia aplicación**. Y si algo va mal, puede que no recibas ninguna respuesta: debes asumir que no habrá respuesta. Puedes reintentar unas cuantas veces (TCP lo hace transparentemente, y tú a nivel de aplicación), esperar a que expire un timeout y, finalmente, declarar el nodo muerto si no hay respuesta en ese tiempo.

### Timeouts y retrasos no acotados

Si el timeout es la única forma segura de detectar un fallo, ¿cuánto debe durar? No hay una respuesta simple:

- **Un timeout largo** implica esperar mucho hasta declarar un nodo muerto; mientras, los usuarios esperan o ven errores.
- **Un timeout corto** detecta fallos antes, pero aumenta el riesgo de **declarar muerto a un nodo que solo estaba lento** (por un pico de carga). Declararlo muerto prematuramente es problemático: si el nodo estaba vivo y en medio de una acción (enviar un email), otro nodo la repite y la acción ocurre **dos veces**. Además, transferir sus responsabilidades añade carga a otros nodos y a la red. Si el sistema ya estaba sobrecargado, puede provocar un **fallo en cascada**: en el extremo, todos los nodos se declaran muertos entre sí y todo deja de funcionar.

Imagina una red ficticia que garantiza un retraso máximo `d` por paquete (se entrega en `d` o se pierde, nunca más tarde) y nodos que procesan cada petición en un tiempo `r`. Entonces cada respuesta llegaría en `2d + r`, y un timeout de ese valor sería perfecto. **Desafortunadamente, la mayoría de sistemas no tiene ninguna de esas garantías**: las redes asíncronas tienen **retrasos no acotados** (intentan entregar lo antes posible, pero sin límite superior) y la mayoría de servidores no garantizan un tiempo máximo de respuesta.

#### Congestión de red y colas

Como en el tráfico de una ciudad, la variabilidad de los retrasos de red se debe sobre todo a las **colas**:

- Si varios nodos envían paquetes al mismo destino a la vez, el **switch** debe ponerlos en cola y alimentarlos uno a uno por el enlace. En una red muy cargada, un paquete puede esperar un rato para conseguir un hueco (**network congestion**). Si la cola se llena, el paquete se descarta y hay que reenviarlo.
- Cuando el paquete llega a la máquina destino, si todos los núcleos están ocupados, el **sistema operativo** pone la petición en cola hasta que la aplicación la atiende.
- En entornos **virtualizados**, un sistema operativo en ejecución a menudo se pausa decenas de milisegundos mientras otra máquina virtual usa la CPU. Durante ese tiempo, la VM no consume datos de la red, así que el **monitor de máquinas virtuales** encola los datos entrantes.
- **TCP control de flujo** (*backpressure*): un nodo limita su propio ritmo de envío para no sobrecargar el enlace o el receptor; los datos se encolan en el emisor antes de entrar en la red.
- TCP considera **perdido** un paquete si no recibe ack en un timeout (calculado a partir de los tiempos de ida y vuelta observados) y lo **retransmite**. La aplicación no ve la pérdida, pero sí el retraso: esperar el timeout y luego la retransmisión.

En nubes públicas, los recursos se comparten entre clientes (*noisy neighbors*): un vecino que use mucho ancho de banda o disco puede disparar tus latencias.

En estos entornos, solo puedes elegir los timeouts **experimentalmente**: mide la distribución de tiempos de ida y vuelta durante un periodo largo y en muchas máquinas para saber cuánta variabilidad esperar, y elige el compromiso entre detección rápida y riesgo de timeouts prematuros. Mejor aún, los sistemas pueden **medir continuamente** los tiempos de respuesta y su variabilidad (*jitter*) y ajustar el timeout automáticamente. Es lo que hacen el **Phi Accrual failure detector** (usado en Akka y Cassandra) y los timeouts de retransmisión de TCP.

```
latencia de ida y vuelta (ms) observada durante una semana:
 p50 = 0,4    p99 = 3    p999 = 40    máx = 1.800 (switch reiniciando)

timeout = 50 ms   → detecta rápido, pero ~0,1 % de falsos positivos
timeout = 2 s     → casi sin falsos positivos, pero 2 s de indisponibilidad por fallo real
```

### Redes síncronas frente a asíncronas

¿Por qué no hacemos la red fiable a nivel de hardware, con un retraso máximo garantizado? Comparemos con la **red telefónica** tradicional (fija, no VoIP): es extremadamente fiable; las llamadas con retraso o que se cortan son raras. Una llamada telefónica requiere latencia constante y suficiente ancho de banda para el audio.

Cuando haces una llamada, se establece un **circuito**: se reserva un ancho de banda fijo y garantizado a lo largo de toda la ruta entre los dos interlocutores, que se mantiene hasta colgar. Por ejemplo, una red ISDN funciona a 4.000 tramas por segundo, y al establecer la llamada se asignan 16 bits de espacio en cada trama, en cada dirección. Durante la llamada, cada lado puede enviar exactamente 16 bits de audio cada 250 microsegundos. Esta red es **síncrona**: aunque los datos atraviesan varios routers, no sufren colas porque el espacio ya está reservado. Como no hay colas, la latencia máxima es fija: **retraso acotado** (*bounded delay*).

¿Por qué no hacemos lo mismo en datacenters e internet? Porque **TCP y los circuitos están optimizados para cosas distintas**:

| | Circuito (teléfono) | Red de paquetes (TCP/IP) |
| --- | --- | --- |
| Ancho de banda | Reservado y fijo mientras dura el circuito | Usa lo que haya disponible; el que no usas queda para otros |
| Si no envías datos | El hueco reservado se desperdicia | No consumes nada |
| Diseño para | Flujo constante (audio, video) | **Tráfico a ráfagas** (*bursty*): pedir una web, enviar un email, transferir un archivo |
| Latencia | Acotada, sin colas | Variable, con colas |
| Utilización | Estática | Dinámica, alta |

Para transferir un archivo no existe un ancho de banda "adecuado": quieres que termine lo antes posible. Con circuitos tendrías que adivinar cuánto reservar: si eliges poco, la transferencia es lenta y deja capacidad sin usar; si eliges mucho, el circuito no se puede establecer. TCP **adapta dinámicamente** el ritmo de transferencia a la capacidad disponible.

Hubo intentos híbridos (ATM en los 80; InfiniBand implementa control de flujo de extremo a extremo; *quality of service* y *admission control* pueden emular circuitos), pero estas técnicas no están disponibles en datacenters multi-tenant ni en internet pública.

En resumen: los retrasos variables no son una ley de la naturaleza, sino el resultado de un **trade-off coste/beneficio**. Las redes de recursos compartidos dinámicamente (*statistical multiplexing*) aprovechan mejor la capacidad y son más baratas, pero sufren colas y retrasos variables. Con la tecnología actual, **debes asumir que habrá congestión, colas y retrasos no acotados**, y no hay un valor "correcto" de timeout: hay que determinarlo experimentalmente.

### Relojes poco fiables

Los relojes y el tiempo son importantes. Las aplicaciones dependen de ellos para responder preguntas como:

1. ¿Expiró esta petición? (duración)
2. ¿Cuál es el p99 de respuesta de este servicio? (duración)
3. ¿Cuántas consultas por segundo hubo en los últimos 5 minutos? (duración)
4. ¿Cuánto tiempo pasó el usuario en el sitio? (duración)
5. ¿Cuándo se publicó este artículo? (punto en el tiempo)
6. ¿A qué fecha y hora enviar el email recordatorio? (punto en el tiempo)
7. ¿Cuándo expira esta entrada del cache? (punto en el tiempo)
8. ¿Cuál es el timestamp de este error en el log? (punto en el tiempo)

En un sistema distribuido, el tiempo es complicado porque la comunicación no es instantánea: un mensaje tarda en viajar, y como el retraso es variable, **no sabes cuánto tiempo pasó** entre el envío y la recepción. Además, cada máquina tiene su propio reloj, un dispositivo de hardware (normalmente un **oscilador de cristal de cuarzo**). Estos dispositivos no son perfectamente precisos: cada máquina tiene su propia noción del tiempo, un poco más rápida o más lenta que las demás. Se pueden sincronizar con **NTP** (*Network Time Protocol*), que ajusta el reloj según lo que reporta un grupo de servidores, que a su vez obtienen su hora de fuentes más precisas, como receptores GPS.

#### Relojes monotónicos frente a time-of-day

Los ordenadores modernos tienen al menos **dos tipos de reloj**, con propósitos distintos:

**Time-of-day clock** (reloj de pared): devuelve la fecha y hora actuales según algún calendario. `clock_gettime(CLOCK_REALTIME)` en Linux, `System.currentTimeMillis()` en Java, `Date.now()` en JavaScript. Devuelve los segundos (o milisegundos) desde la *epoch* (1 de enero de 1970 UTC), sin contar los segundos intercalares. Se sincroniza con NTP, así que una marca de una máquina significa (idealmente) lo mismo en otra. Pero tiene rarezas: si el reloj local va muy adelantado respecto al servidor NTP, **se le fuerza a saltar hacia atrás** a un momento anterior. Estos saltos, y el hecho de que a menudo ignoran los segundos intercalares, hacen que estos relojes **no sirvan para medir tiempo transcurrido**.

**Monotonic clock**: sirve para medir una **duración** (un timeout, un tiempo de respuesta). `clock_gettime(CLOCK_MONOTONIC)` en Linux, `System.nanoTime()` en Java, `performance.now()` o `process.hrtime.bigint()` en Node. Su nombre viene de que **siempre avanza** (nunca salta hacia atrás). Puedes leerlo en un momento, hacer algo y leerlo de nuevo: la diferencia es el tiempo transcurrido. Pero el **valor absoluto no tiene significado**: puede ser el número de nanosegundos desde que arrancó el ordenador. No tiene sentido comparar relojes monotónicos de dos máquinas distintas.

NTP puede ajustar la **frecuencia** del reloj monotónico (*slewing*: acelerarlo o frenarlo hasta un 0,05 %), pero **no hacerlo saltar**. En un sistema distribuido, usar un reloj monotónico para medir tiempo transcurrido (timeouts) suele estar bien, porque no asume sincronización entre relojes de distintos nodos.

```ts
// MAL: medir duraciones con el reloj de pared
const t0 = Date.now();
await doWork();
const ms = Date.now() - t0;   // puede ser negativo si NTP ajustó el reloj hacia atrás

// BIEN: reloj monotónico
const s0 = performance.now();
await doWork();
const elapsed = performance.now() - s0;   // siempre ≥ 0
```

#### Sincronización y precisión de relojes

Los relojes monotónicos no necesitan sincronización, pero los de pared sí, y NTP no es tan preciso como esperarías:

- El oscilador de cuarzo **deriva** (*drift*): corre más rápido o más lento según la temperatura. Google asume una deriva de **200 partes por millón** en sus servidores, equivalente a **6 ms** de deriva si se resincroniza cada 30 segundos, o **17 segundos** si se resincroniza una vez al día.
- Si el reloj difiere mucho del servidor NTP, puede **negarse a sincronizar** o ser **reseteado a la fuerza**: las aplicaciones verían el tiempo saltar hacia atrás o adelante.
- Si un nodo queda aislado de los servidores NTP por un firewall mal configurado, la desconfiguración puede pasar **inadvertida** un tiempo.
- La sincronización NTP es tan buena como el **retraso de red**: en una red congestionada con retrasos variables, la precisión es limitada. Un experimento mostró un error mínimo de 35 ms sincronizando por internet, con picos de hasta un segundo.
- Algunos servidores NTP están **mal** o mal configurados, reportando horas desviadas en horas. Los clientes NTP son robustos porque consultan varios servidores e ignoran los atípicos, pero es inquietante depender de extraños en internet.
- Los **segundos intercalares** producen minutos de 59 o 61 segundos, que rompen supuestos en sistemas no diseñados para ellos. Han tumbado muchos sistemas grandes. La mejor forma de manejarlos es que los servidores NTP "mientan", repartiendo el ajuste a lo largo del día (*smearing*), como hace Google.
- En **máquinas virtuales**, el reloj de hardware está virtualizado: cuando una CPU se comparte entre VMs, cada VM se pausa decenas de ms y, desde el punto de vista de la aplicación, el reloj **salta adelante** de repente.
- En dispositivos que no controlas (móviles, embebidos), no puedes confiar en el reloj: los usuarios lo cambian deliberadamente (por ejemplo, para hacer trampas en juegos).

Se puede lograr mucha precisión con esfuerzo: la regulación europea **MiFID II** exige a los fondos de trading de alta frecuencia sincronizar sus relojes con un margen de **100 microsegundos** respecto a UTC. Se consigue con receptores GPS, el **Precision Time Protocol (PTP)** y despliegue y monitorización cuidadosos. Hoy, AWS ofrece *Amazon Time Sync Service* con precisión de microsegundos en ciertas instancias.

### Ideas erróneas frecuentes

- **"Si no hay respuesta, el nodo está muerto."** Puede estar lento, pausado, o haber procesado la petición y perdido la respuesta.
- **"Existe un timeout correcto."** En redes con retrasos no acotados, solo hay compromisos medidos experimentalmente.
- **"Las redes de datacenter son fiables."** Los estudios muestran fallos frecuentes, muchos por error humano.
- **"`Date.now()` sirve para medir duraciones."** El reloj de pared puede saltar hacia atrás; usa un reloj monotónico.
- **"NTP sincroniza al milisegundo."** Por internet, decenas de ms o más, y puede fallar en silencio.
- **"Los retrasos variables son inevitables por física."** Son un trade-off: las redes de paquetes priorizan utilización sobre latencia acotada.

### Resumen

En un sistema distribuido hay fallos parciales y no deterministas. Las redes de paquetes son asíncronas: los mensajes pueden perderse, retrasarse o duplicarse, y la falta de respuesta no distingue entre causas. Los timeouts son la única detección práctica, pero no hay valor correcto porque los retrasos no están acotados (colas en switches, sistema operativo, VMs, TCP); se ajustan midiendo. Los relojes de pared pueden saltar y derivan; NTP es impreciso; para duraciones se usan relojes monotónicos.

## Conceptos clave

- **Fallo parcial**: parte del sistema falla de forma impredecible mientras otra funciona.
- **Red asíncrona de paquetes**: red sin garantías de entrega ni de tiempo máximo.
- **Timeout**: tiempo tras el cual se asume que una respuesta no llegará.
- **Network partition (netsplit)**: parte de la red aislada del resto.
- **Retraso no acotado**: ausencia de límite superior para la entrega de un paquete.
- **Network congestion**: colas en switches cuando muchos envían al mismo destino.
- **Phi Accrual failure detector**: detector que ajusta el umbral según la distribución observada de latencias.
- **Red síncrona / circuito**: ancho de banda reservado y latencia acotada.
- **Time-of-day clock**: reloj de pared sincronizado con NTP, que puede saltar.
- **Monotonic clock**: reloj que siempre avanza; sirve para medir duraciones locales.
- **Clock drift**: deriva del oscilador de cuarzo respecto al tiempo real.
- **Leap second smearing**: repartir un segundo intercalar a lo largo del día.

## Preguntas de repaso

1. ¿Por qué un ordenador individual está diseñado para fallar "todo o nada" y un sistema distribuido no puede hacerlo?
   R: Porque en un solo ordenador es preferible caerse a devolver un resultado incorrecto, y es determinista si el hardware funciona. En un sistema distribuido grande siempre hay algo roto; si se rindiera ante cada fallo, nunca funcionaría, así que debe tolerar fallos parciales.
2. Enumera cuatro razones por las que una petición por red puede quedar sin respuesta.
   R: La petición se perdió, está en cola en la red o en el receptor, el nodo remoto falló o está pausado (por ejemplo por garbage collection), o el nodo la procesó pero la respuesta se perdió o se retrasó. El emisor no puede distinguir entre ellas.
3. ¿Qué riesgos tiene un timeout demasiado corto?
   R: Declarar muerto a un nodo que solo estaba lento, con lo que una acción en curso puede ejecutarse dos veces, y transferir su carga a otros nodos ya cargados, lo que puede provocar un fallo en cascada.
4. ¿Por qué las redes telefónicas tienen latencia acotada y las de datacenter no?
   R: La red telefónica reserva un circuito con ancho de banda fijo durante toda la llamada, así que no hay colas. Las redes de paquetes comparten el ancho de banda dinámicamente para tráfico a ráfagas, lo que maximiza la utilización pero introduce colas y retrasos variables.
5. ¿Cuál es la diferencia entre un reloj time-of-day y uno monotónico, y cuál usarías para un timeout?
   R: El time-of-day da la fecha y hora y se sincroniza con NTP, por lo que puede saltar hacia atrás o adelante; el monotónico siempre avanza y su valor absoluto no significa nada. Para un timeout se usa el monotónico porque mide duraciones de forma fiable en una máquina.
6. Nombra tres fuentes de imprecisión en la sincronización con NTP.
   R: La deriva del cuarzo según la temperatura, los retrasos de red variables al consultar el servidor, servidores NTP mal configurados, firewalls que bloquean la sincronización sin que se note, segundos intercalares y la pausa de máquinas virtuales.

## Ejercicio

En TypeScript con Node:

1. Escribe un servidor TCP o HTTP mínimo y un cliente que haga 10.000 peticiones y registre la latencia con `performance.now()`. Calcula p50, p99 y máximo.
2. Introduce artificialmente en el servidor: un 1 % de respuestas con 500 ms de retraso, un 0,1 % de respuestas que nunca llegan y un 0,5 % de peticiones procesadas cuya respuesta se descarta.
3. Implementa en el cliente un timeout fijo y prueba 50 ms, 200 ms y 1 s. Para cada uno, cuenta falsos positivos (timeouts sobre peticiones que sí se procesaron) y el tiempo total perdido esperando.
4. Implementa un detector adaptativo: timeout = media móvil + 4 desviaciones estándar de las últimas 100 latencias. Compara.
5. Demuestra el problema del reloj de pared: mide una duración con `Date.now()` y con `performance.now()` mientras simulas un salto hacia atrás (resta 2.000 ms a una variable de "offset NTP" aplicada a `Date.now()`).

Criterio de terminado: una tabla con falsos positivos y tiempo de espera por estrategia de timeout, y la demostración del punto 5 muestra una duración negativa con el reloj de pared y una correcta con el monotónico.

## Explícalo con tus palabras

Explica por qué "no recibí respuesta" no te dice nada sobre si el pago se procesó, usando la lista de seis cosas que pueden fallar.
