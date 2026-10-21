---
title: Caso de estudio — generador de IDs únicos distribuido
kind: lesson
hours: 2
sources: System Design Interview (Alex Xu), cap. 7 "Design a unique ID generator in distributed systems" (pp. 110–118) | karanpratapsingh/system-design, cap. V "URL Shortener" (sección de generación de claves) y cap. II "Sharding" | System Design Primer, solución "Design Pastebin.com (or Bit.ly)"
links: Primer — Pastebin solution (key generation) | https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/pastebin/README.md ; Karan — URL Shortener | https://github.com/karanpratapsingh/system-design#url-shortener ; Karan — Sharding | https://github.com/karanpratapsingh/system-design#sharding
---

## Objetivo

Diseñar un generador de identificadores únicos, numéricos, de 64 bits y ordenables por tiempo para un sistema distribuido; comparar auto-increment multi-maestro, UUID, ticket server, asignación por rangos y Snowflake; y razonar sobre relojes, capacidad y disponibilidad.

## Estudio

### Por qué no basta con `AUTO_INCREMENT`

En una base de datos única, la clave primaria autoincremental resuelve los IDs gratis. En un sistema distribuido deja de funcionar: los datos están repartidos en muchos shards (sesión 06), cada uno con su propio contador, y una sola base no tiene capacidad para generar todos los IDs del sistema con baja latencia. Además, muchos componentes necesitan crear IDs **antes** de tocar la base (por ejemplo, para usarlos como clave de idempotencia o de partición).

Los IDs aparecen en todas partes: pedidos, mensajes de chat (sesión 23), posts (sesión 22), URLs cortas (sesión 19), eventos. Elegir mal el esquema tiene consecuencias duraderas: índices fragmentados, hotspots, IDs que se agotan o que filtran información de negocio.

### Requisitos

Siguiendo el framework, aclara antes de diseñar:

```
 Tú: ¿Qué características deben tener los IDs?          → Únicos y ordenables.
 Tú: ¿Crecen de uno en uno?                             → Crecen con el tiempo, no necesariamente de a uno.
 Tú: ¿Solo numéricos?                                   → Sí.
 Tú: ¿Longitud?                                         → Deben caber en 64 bits.
 Tú: ¿Escala?                                           → Más de 10.000 IDs por segundo.
```

Fíjate en cuánto cambia el diseño una sola respuesta: si el entrevistador hubiera dicho "pueden ser alfanuméricos de 128 bits", la solución sería un UUIDv7 y el problema terminaría en dos minutos.

Requisitos: únicos, numéricos, 64 bits, ordenados por fecha (un ID creado por la tarde es mayor que uno de la mañana del mismo día) y más de 10.000 por segundo. Agrega uno implícito: **alta disponibilidad**, porque si el generador cae, nadie puede crear nada.

### Opción 1: auto-increment multi-maestro

Cada uno de los k servidores de base de datos usa su auto-increment, pero en vez de sumar 1 suma **k**, con un desplazamiento distinto por servidor:

```
 k = 2   Servidor A: 1, 3, 5, 7, ...     Servidor B: 2, 4, 6, 8, ...
```

Escala con el número de servidores, pero: es difícil de extender a varios data centers, los IDs **no crecen con el tiempo** entre servidores (A puede ir por el 1.001 mientras B va por el 500) y agregar o quitar un servidor exige recalcular k y los desplazamientos. No cumple "ordenados por fecha".

### Opción 2: UUID

Un **UUID** es un número de 128 bits generado localmente, sin coordinación, con una probabilidad de colisión despreciable (habría que generar mil millones por segundo durante unos cien años para tener un 50 % de probabilidad de una sola colisión). Ejemplo: `09c93e62-50b4-468d-bf8a-c07e1040bfb2`.

```
 [Web 1 + generador UUID]   [Web 2 + generador UUID]   [Web N + generador UUID]
        (sin coordinación entre ellos)
```

Ventajas: trivial de generar, sin coordinación ni puntos de fallo, escala con los servidores. Desventajas para estos requisitos: **128 bits** (no caben en 64), **no ordenables por tiempo** (la versión 4 es aleatoria) y no son numéricos en su representación habitual. Además, como clave primaria de un B-tree, los UUID aleatorios insertan en posiciones dispersas del índice, lo que fragmenta páginas y empeora el rendimiento de escritura y de cache.

Nota: los formatos más recientes como **UUIDv7** y **ULID** ponen un timestamp en los bits más significativos, lo que los hace ordenables por tiempo y amigables para índices, aunque siguen ocupando 128 bits.

### Opción 3: ticket server

Un único servidor de base de datos con un auto-increment central entrega IDs a todos (la técnica que popularizó Flickr).

```
 [Web 1] ──┐
 [Web 2] ──┼──> [Ticket server: AUTO_INCREMENT] ──> 1, 2, 3, 4, ...
 [Web N] ──┘
```

Ventajas: IDs numéricos, compactos y estrictamente crecientes; simple; suficiente para escalas pequeñas y medianas. Desventajas: es un **punto único de fallo** y un posible cuello de botella (un viaje de red por cada ID). Con dos ticket servers (uno pares, otro impares) mejoras la disponibilidad, pero vuelves a los problemas de sincronización y orden de la opción 1.

### Opción 4: asignación por rangos (segmentos)

Una variante muy usada en la práctica: un servicio central entrega **bloques** de IDs en lugar de IDs sueltos. Cada servidor de aplicación pide un rango (por ejemplo, 1.000.001–1.010.000) y lo consume localmente desde memoria; cuando se le está acabando, pide el siguiente.

- Ventajas: un viaje de red cada 10.000 IDs en vez de uno por ID; IDs compactos y casi ordenados; el servicio central puede caer unos minutos sin impacto si los servidores piden el siguiente bloque con anticipación (*double buffering*).
- Desventajas: si un servidor muere, los IDs no usados de su rango se pierden (huecos, normalmente aceptables); el orden es por bloque, no estrictamente temporal entre servidores.

Esta es la técnica que usa el URL shortener de Karan con un servicio de generación de claves, y la volverás a ver en la sesión 19.

### Opción 5: Snowflake

El enfoque de **Snowflake** (el generador de IDs de Twitter) aplica "divide y vencerás": un ID de 64 bits se divide en secciones con significado.

```
 | 1 bit | 41 bits                         | 5 bits      | 5 bits     | 12 bits         |
 | signo | timestamp (ms desde una época)  | datacenter  | máquina    | secuencia       |
 |   0   | 00010110...                     | 00011       | 01010      | 000000000101    |
```

- **Signo** (1 bit): siempre 0, para que el número sea positivo en lenguajes con enteros con signo.
- **Timestamp** (41 bits): milisegundos desde una **época personalizada** (Twitter usa una de noviembre de 2010). Es la parte más significativa, así que los IDs se ordenan por tiempo.
- **Datacenter** (5 bits): 2⁵ = 32 data centers.
- **Máquina** (5 bits): 32 máquinas por data center, es decir, 1.024 generadores en total.
- **Secuencia** (12 bits): contador que se incrementa con cada ID generado en el mismo milisegundo en esa máquina, y vuelve a 0 cada milisegundo. 2¹² = 4.096 IDs por milisegundo por máquina.

Cálculos que debes saber hacer:

```
 Vida útil:   2^41 − 1 ms ≈ 2,2 × 10^12 ms ≈ 2,2 × 10^9 s ≈ 69,7 años desde la época
 Capacidad:   4.096 IDs/ms por máquina = ~4 M IDs/s por máquina
 Total:       1.024 máquinas × 4 M = ~4.000 M IDs/s
```

Con una época cercana a la fecha de lanzamiento, los 69 años empiezan a contar ese día. Pasado ese plazo, hay que cambiar de época o migrar el formato.

Ventajas: generación **local** (sin red ni coordinación por ID), numérico, 64 bits, ordenado por tiempo, enorme capacidad. Cumple todos los requisitos.

Compara con el requisito: 10.000 IDs por segundo son 10 por milisegundo en todo el sistema. Una sola máquina Snowflake soporta 4.096 por milisegundo; el requisito se cumple con un margen de más de 400 veces por máquina, y la flota de 1.024 máquinas existe por disponibilidad y por distribución geográfica, no por capacidad. Darse cuenta de esto permite, si hiciera falta, reasignar bits de secuencia a timestamp o a máquinas sin riesgo.

### Profundización: implementación

```ts
const EPOCH = 1_700_000_000_000n;      // época personalizada en ms
class Snowflake {
  private lastMs = -1n;
  private seq = 0n;
  constructor(private dc: bigint, private machine: bigint) {}  // 0..31 cada uno

  next(nowMs: bigint = BigInt(Date.now())): bigint {
    if (nowMs < this.lastMs) throw new Error("clock moved backwards");
    if (nowMs === this.lastMs) {
      this.seq = (this.seq + 1n) & 0xfffn;            // 12 bits
      if (this.seq === 0n) {                           // agotó la secuencia del ms
        while (nowMs <= this.lastMs) nowMs = BigInt(Date.now()); // espera al siguiente ms
      }
    } else {
      this.seq = 0n;
    }
    this.lastMs = nowMs;
    return ((nowMs - EPOCH) << 22n) | (this.dc << 17n) | (this.machine << 12n) | this.seq;
  }
}
```

Detalles finos:

- **Asignar los IDs de máquina**: deben ser únicos. Se asignan al arrancar desde un servicio de coordinación (ZooKeeper, etcd) o se derivan de la configuración del despliegue. Dos procesos con el mismo ID de máquina pueden generar IDs duplicados en el mismo milisegundo.
- **Relojes que retroceden**: NTP puede ajustar el reloj hacia atrás. Si el generador sigue, podría repetir timestamps y producir duplicados. Opciones: rechazar hasta que el reloj alcance el último timestamp usado (si es un salto pequeño, esperar), o alertar y sacar el nodo de servicio si el salto es grande.
- **Relojes desincronizados entre máquinas**: el orden por tiempo es aproximado entre máquinas distintas (milisegundos de diferencia). Para la mayoría de los usos (ordenar posts o mensajes) es suficiente; para orden estricto dentro de una conversación, se combina con un número de secuencia por conversación.
- **Ajustar las secciones**: con poca concurrencia y una vida larga, conviene más bits de timestamp y menos de secuencia. Con menos máquinas, menos bits de máquina. El diseño es configurable.
- **Disponibilidad**: el generador es crítico, pero como es una librería local o un servicio sin estado replicado, su disponibilidad es la del proceso que lo usa.

### Un ejemplo trabajado: armar y desarmar un ID

Supón la época personalizada `E` y un ID generado 5.000.000.000 ms después de ella (unos 58 días), en el data center 3, máquina 10, secuencia 5:

```
 timestamp relativo = 5.000.000.000
 ID = (5.000.000.000 << 22) | (3 << 17) | (10 << 12) | 5
    = 5.000.000.000 × 4.194.304 + 3 × 131.072 + 10 × 4.096 + 5
    = 20.971.520.000.000.000 + 393.216 + 40.960 + 5
    = 20.971.520.000.434.181
```

Para decodificarlo se hace el camino inverso: `secuencia = id & 0xFFF` (5), `máquina = (id >> 12) & 0x1F` (10), `datacenter = (id >> 17) & 0x1F` (3), `timestamp = (id >> 22) + E`. Esta capacidad de extraer el instante de creación es útil para depurar ("¿cuándo se creó este pedido?") y permite consultas por rango de tiempo usando solo el ID: todos los IDs de un día están entre dos valores calculables.

### IDs e índices de base de datos

El tipo de ID afecta directamente al rendimiento de la base:

- **IDs crecientes** (Snowflake, rangos, UUIDv7): cada inserción va al final del índice B-tree. Las páginas se llenan de forma secuencial, el final del índice está siempre en memoria y casi no hay fragmentación. Además, los registros recientes (los más consultados) quedan juntos.
- **IDs aleatorios** (UUID v4): cada inserción cae en una página al azar. Con tablas grandes, esas páginas no están en memoria: más lecturas de disco, divisiones de página frecuentes, índices más grandes y fragmentados.
- **Tamaño**: un ID de 8 bytes frente a uno de 16 bytes parece poca diferencia, pero cada índice secundario y cada clave foránea repite el ID. En una tabla con mil millones de filas y tres índices, son decenas de GB de diferencia, que compiten por la memoria de la base.

Hay un matiz con particionado por rango: si la clave de partición es un ID creciente, todas las inserciones van al último rango (hotspot, sesión 06). Con particionado por hash del ID, el problema desaparece.

### Operar el generador en producción

Snowflake parece "sin estado", pero el ID de máquina sí es estado que hay que gestionar. En entornos donde las instancias aparecen y desaparecen (contenedores, autoscaling), una práctica común es que cada instancia, al arrancar, tome un **lease** de un ID de trabajador en un servicio de coordinación: "el ID 17 es mío durante 30 segundos", renovado periódicamente. Si la instancia muere, el lease expira y el ID queda libre para otra. Para evitar duplicados, una instancia que no pudo renovar su lease debe dejar de generar IDs de inmediato.

Con 10 bits para data center y máquina hay 1.024 IDs de trabajador; si tu flota puede superar ese número, reasigna bits (menos de secuencia, más de trabajador) o genera los IDs en un servicio dedicado más pequeño en vez de en cada instancia.

### Cómo elegir

1. ¿Necesitas IDs cortos y públicos (URLs)? → Rangos o Snowflake codificados en base62, o códigos aleatorios con verificación de colisión (sesión 19).
2. ¿Necesitas 64 bits, orden temporal y gran escala? → Snowflake.
3. ¿Te basta con 128 bits y quieres cero coordinación? → UUIDv7 o ULID (o UUID v4 si no te importa el orden).
4. ¿Escala modesta y una base central disponible? → Secuencia de la base o ticket server.
5. ¿IDs que nadie debe poder adivinar? → Aleatorios con suficiente entropía, aparte del ID interno.

### Comparación final

| Opción | 64 bits | Ordenable por tiempo | Sin coordinación por ID | Punto único de fallo | Complejidad |
| --- | --- | --- | --- | --- | --- |
| Multi-maestro (+k) | Sí | No | Sí | No | Media (reconfigurar k) |
| UUID v4 | No (128) | No | Sí | No | Baja |
| UUIDv7 / ULID | No (128) | Sí | Sí | No | Baja |
| Ticket server | Sí | Sí | No | Sí | Baja |
| Rangos/segmentos | Sí | Aproximado | Casi (un viaje por bloque) | Mitigado | Media |
| Snowflake | Sí | Sí (aproximado entre máquinas) | Sí | No | Media (IDs de máquina, relojes) |

### Por qué este problema importa más de lo que parece

Generar un número parece trivial, pero el problema concentra varias ideas centrales del módulo:

- **Coordinación frente a autonomía**: el ticket server coordina en cada ID (simple pero frágil); Snowflake elimina la coordinación por ID a cambio de coordinar una vez la asignación de IDs de máquina. Es el mismo trade-off que aparece en consenso, en rate limiting distribuido y en caches.
- **Relojes**: los sistemas distribuidos no tienen un reloj global (lo viste en DDIA). Snowflake acepta un orden aproximado entre máquinas en lugar de pagar por un orden total.
- **Presupuesto de bits**: 64 bits son un recurso escaso que se reparte entre requisitos que compiten (duración, escala de la flota, ritmo por máquina). Diseñar es repartir recursos limitados.
- **Datos derivados del identificador**: un ID puede codificar tiempo y ubicación, lo que ahorra búsquedas pero filtra información.

Cuando en otros casos de estudio necesites IDs (mensajes, posts, archivos, viajes), vuelve a esta lista para elegir con criterio en lugar de poner "un UUID" por costumbre.

### Consideraciones de seguridad y producto

- Los IDs secuenciales **filtran información**: si tu pedido es el 10.453 y el de mañana es el 10.980, un competidor sabe cuántos pedidos tienes por día. También facilitan enumerar recursos (IDOR, sesión 13). Para IDs expuestos públicamente, considera IDs no adivinables o codificar el ID interno.
- Los IDs de Snowflake revelan **cuándo** se creó algo (se puede extraer el timestamp). Normalmente es aceptable; en algunos dominios no.
- Para URLs, un ID numérico se codifica en **base62** (`0-9a-zA-Z`) para hacerlo corto: un ID de 64 bits ocupa como mucho 11 caracteres en base62 (62¹¹ ≈ 5,2 × 10¹⁹ > 2⁶⁴ ≈ 1,8 × 10¹⁹).

### El ID como herramienta de particionado

Un ID bien diseñado puede llevar información de enrutamiento. Si los bits de "máquina" se reemplazan por el **número de shard lógico** donde vive el objeto, cualquier servicio sabe a qué shard ir mirando el ID, sin consultar un directorio (sesión 06). Instagram usó una variante así: timestamp, ID de shard lógico y secuencia por shard, generados dentro de la propia base de datos. Esto hace que "buscar por ID" siempre sea una consulta a un solo shard.

## Conceptos clave

- **Auto-increment multi-maestro**: cada servidor incrementa de k en k con un desplazamiento propio.
- **UUID**: identificador de 128 bits generado sin coordinación, con colisiones despreciables.
- **UUIDv7 / ULID**: identificadores de 128 bits con timestamp al inicio, ordenables por tiempo.
- **Ticket server**: base central con auto-increment que entrega IDs a todos.
- **Asignación por rangos**: un servicio central entrega bloques de IDs que se consumen localmente.
- **Snowflake**: ID de 64 bits con timestamp, data center, máquina y secuencia.
- **Época personalizada**: instante de referencia desde el que se cuentan los milisegundos del timestamp.
- **Secuencia por milisegundo**: contador que diferencia IDs creados en el mismo milisegundo en una máquina.
- **Base62**: codificación con dígitos y letras para representar IDs de forma corta.

## Preguntas de repaso

1. ¿Por qué un UUID v4 no sirve para los requisitos de esta sesión?
   R: Porque ocupa 128 bits y el requisito es 64, no es ordenable por tiempo (es aleatorio) y su representación habitual no es numérica. Además, como clave primaria aleatoria fragmenta los índices B-tree y empeora el rendimiento de escritura.
2. Calcula cuántos años dura un timestamp de 41 bits en milisegundos y qué ventaja tiene una época personalizada.
   R: 2⁴¹ − 1 ms ≈ 2,2 × 10¹² ms ≈ 2,2 × 10⁹ s ≈ 69 años. Con una época personalizada cercana a la fecha de lanzamiento, esos 69 años empiezan a contar desde ese momento en vez de desde 1970, lo que retrasa el agotamiento del campo.
3. ¿Qué pasa si se generan más de 4.096 IDs en el mismo milisegundo en una máquina Snowflake?
   R: La secuencia de 12 bits se agota y vuelve a 0; para no repetir IDs, el generador debe esperar al siguiente milisegundo antes de seguir. La capacidad máxima es unos 4 millones de IDs por segundo por máquina; si se necesita más, se agregan máquinas o se reasignan bits.
4. ¿Qué riesgo introducen los relojes en Snowflake y cómo se mitiga?
   R: Si el reloj retrocede (por un ajuste de NTP), el generador podría repetir timestamps y producir IDs duplicados. Se mitiga recordando el último timestamp usado y rechazando o esperando hasta alcanzarlo, y alertando o sacando de servicio el nodo si el salto es grande. Entre máquinas, la desincronización hace que el orden sea solo aproximado.
5. ¿Qué ventajas tiene la asignación de IDs por rangos frente a un ticket server simple?
   R: Reduce los viajes de red a uno por bloque en vez de uno por ID, y si los servidores piden el siguiente bloque con anticipación, el servicio central puede caer temporalmente sin afectar la generación. El costo es que los IDs de rangos no usados se pierden (huecos) y el orden temporal entre servidores es solo aproximado.

## Ejercicio

Completa la clase `Snowflake` en TypeScript con un reloj inyectable y escribe pruebas que verifiquen: (a) 100.000 IDs generados en un bucle son únicos y estrictamente crecientes; (b) al agotar la secuencia en un milisegundo, el generador espera al siguiente; (c) un reloj que retrocede produce un error; (d) una función `decode(id)` recupera timestamp, data center, máquina y secuencia. Agrega `toBase62(id)` y verifica que ningún ID supere 11 caracteres. Terminado cuando las cinco pruebas pasen.

## Explícalo con tus palabras

Explica cómo Snowflake genera números únicos sin que las máquinas se pongan de acuerdo, usando la imagen de varias taquillas de un cine que imprimen tickets con la hora, el número de taquilla y un consecutivo.
