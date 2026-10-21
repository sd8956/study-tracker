---
title: Proyecto — diseña un acortador de URLs en 3 horas
kind: project
hours: 3
sources: System Design Interview (Alex Xu), cap. 8 "Design a URL shortener" (pp. 119–131) | karanpratapsingh/system-design, cap. V "URL Shortener" | System Design Primer, solución "Design Pastebin.com (or Bit.ly)"
links: Karan — URL Shortener | https://github.com/karanpratapsingh/system-design#url-shortener ; Primer — Pastebin/Bit.ly solution | https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/pastebin/README.md ; Primer — Design Pastebin.com (or Bit.ly) | https://github.com/donnemartin/system-design-primer#design-pastebincom-or-bitly
---

## Objetivo

Diseñar de punta a punta un servicio tipo TinyURL o Bit.ly: requisitos, estimaciones, API, modelo de datos, generación de códigos cortos (hash con resolución de colisiones frente a base62 de un ID único o un servicio de claves), redirección 301/302, cache, analítica y escalado, y entregar un design doc más un prototipo funcional en TypeScript.

## Estudio

### El problema

Un acortador convierte `https://www.ejemplo.com/q?chapter=4&topic=diseño&utm_source=...` en `https://sho.rt/aZ3k9Q`. Al visitar la URL corta, el servicio redirige a la larga. Parece sencillo, y precisamente por eso es un problema clásico: obliga a resolver bien la generación de claves, una ruta de lectura muy caliente y el crecimiento a largo plazo.

Requisitos típicos (combinando las tres fuentes):

- **Funcionales**: acortar una URL; redirigir al visitar la corta; expiración opcional; alias personalizados (opcional).
- **No funcionales**: alta disponibilidad (si cae, millones de enlaces publicados en todas partes dejan de funcionar), redirección con latencia mínima, códigos no adivinables en secuencia (deseable), escala.
- **Extendidos**: analítica de clics, prevención de abuso (spam, phishing), cuentas y gestión de enlaces.

### Estimaciones de referencia

El libro parte de **100 M de URLs nuevas por día** y un ratio lectura/escritura de 10:1, conservadas 10 años:

```
 escrituras  = 100 M / 86.400 ≈ 1.160/s
 lecturas    = 11.600/s
 registros   = 100 M × 365 × 10 = 365.000 M
 almacenam.  = 365.000 M × 100 B ≈ 365 TB
```

Karan parte de **100 M por mes** con ratio 100:1: ~40 escrituras/s, ~4.000 redirecciones/s, 12.000 M de registros en 10 años a 500 B = 6 TB, y unos 35 GB de cache diaria para el 20 % caliente. Ambas son válidas: lo que importa es que los supuestos estén escritos y que las conclusiones se deriven de ellos.

### Longitud del código

El código usa caracteres `[0-9a-zA-Z]`: 62 posibilidades por posición. Necesitas el menor n tal que 62ⁿ supere el total de URLs:

| n | 62ⁿ |
| --- | --- |
| 5 | ≈ 916 M |
| 6 | ≈ 56.800 M |
| 7 | ≈ 3,5 billones (3,5 × 10¹²) |
| 8 | ≈ 218 billones |

Con 365.000 M de URLs, **n = 7** basta y sobra (3,5 billones).

### API

```
 POST /api/v1/data/shorten   { longUrl, customAlias?, expiresAt? }  → 201 { shortUrl }
 GET  /{shortCode}            → 301 o 302 con Location: longUrl
```

### 301 frente a 302

- **301 (permanente)**: el navegador cachea la redirección; las siguientes visitas del mismo usuario no pasan por tu servicio. Menos carga.
- **302 (temporal)**: cada visita pasa por tu servicio. Más carga, pero puedes **contar cada clic** y cambiar o expirar el destino.

Si la analítica importa, 302; si lo prioritario es la carga, 301. Muchos servicios usan 302 (o 307) precisamente por la analítica.

### Generar el código: dos familias

**A) Hash + resolución de colisiones.** Aplica una función de hash (CRC32, MD5, SHA-1) a la URL larga. Incluso CRC32 produce más de 7 caracteres, así que tomas los primeros 7. Eso aumenta las colisiones: si el código ya existe para **otra** URL, concatenas un valor predefinido a la URL y vuelves a hashear, hasta encontrar uno libre.

```
 longUrl → hash → primeros 7 chars → ¿existe en BD? ─no→ guardar
                                          └─sí (otra URL)→ longUrl + "salt" → hash → ...
```

Verificar en la base en cada creación es caro; un **Bloom filter** (estructura probabilística que dice "seguro que no existe" o "quizás existe") evita la mayoría de las consultas. Ventajas: longitud fija; la misma URL produce el mismo código (deduplicación natural). Desventajas: colisiones, consultas extra y lógica de reintento.

**B) Base62 de un ID único.** Generas un ID único (sesión 18: Snowflake, rangos o un contador) y lo conviertes a base62:

```
 ID 11157 en base62:
 11157 = 2 × 62² + 55 × 62 + 59  →  dígitos [2, 55, 59]  →  "2TX"
 (con el alfabeto 0-9 = 0..9, a-z = 10..35, A-Z = 36..61)
```

Ventajas: **sin colisiones**, sin consultas de verificación. Desventajas: la longitud no es fija (crece con el ID); si el ID es un contador secuencial, el siguiente código es **adivinable** (riesgo de enumeración: alguien puede recorrer todos los enlaces), y depende de un generador de IDs distribuido.

| Aspecto | Hash + colisiones | Base62 de ID |
| --- | --- | --- |
| Longitud | Fija | Variable (crece con el ID) |
| Colisiones | Posibles, se resuelven | Imposibles |
| Dependencia | Ninguna | Generador de IDs único |
| Adivinable | No | Sí si el ID es secuencial |
| Misma URL → mismo código | Sí | No (salvo que verifiques antes) |

**C) Key Generation Service (KGS)**, la propuesta de Karan: un servicio que **pregenera** códigos aleatorios únicos y los guarda en una tabla de "disponibles". Al acortar, el servidor toma uno y lo mueve a "usados". Para evitar que dos servidores tomen el mismo, el KGS entrega **lotes** a cada servidor (que los mantiene en memoria) y los marca como usados al entregarlos; si un servidor muere, se pierden unos pocos códigos, lo cual es aceptable. Tamaño: 56.800 M de claves de 6 caracteres ocupan unos 6 bytes cada una, ~340 GB. El KGS necesita una réplica en standby para no ser un punto único de fallo. Variante equivalente: ZooKeeper reparte **rangos** de contador a cada servidor (1–1 M, 1 M–2 M…), y cada servidor codifica en base62 su contador local.

### Flujos de lectura y escritura

**Acortar**:

```
 1. ¿longUrl ya existe en la BD? → devolver su código (si se quiere deduplicar)
 2. Si no: obtener ID único / clave del KGS → base62 → shortCode
 3. Guardar (id, shortCode, longUrl, createdAt, expiresAt, userId)
 4. Devolver shortUrl
```

**Redirigir** (la ruta caliente):

```
 Cliente → [LB] → [Web servers] → [Cache: shortCode → longUrl] ─hit→ 302
                                        └─miss→ [BD] → llenar cache → 302
                                                     └─no existe→ 404 / expirado→ 410
```

Como la lectura domina, la cache es fundamental: con el 20 % de URLs concentrando el 80 % de los clics, una cache LRU de decenas de GB absorbe la gran mayoría.

### Modelo de datos y almacenamiento

Tabla principal: `urls(short_code PK, long_url, user_id, created_at, expires_at)`. El acceso es casi siempre por `short_code`, sin joins y con miles de millones de filas: un key-value o wide-column store (DynamoDB, Cassandra) encaja de forma natural; una base relacional particionada también funciona. Índice secundario sobre `long_url` (o su hash) solo si se deduplica.

### Analítica, expiración y abuso

- **Analítica**: no escribas en la base en la ruta de redirección. Publica un evento de clic (código, timestamp, país, user-agent, referer) en un log de eventos (sesión 09) y agrega en un sistema analítico aparte. La redirección no espera a nada.
- **Expiración**: verificar `expires_at` al leer (devolver 410) y un job de limpieza periódico que borra expirados y devuelve sus códigos al KGS si se reutilizan.
- **Abuso**: rate limiting por usuario e IP (sesión 16), verificación de URLs contra listas de phishing/malware, y la posibilidad de desactivar un código.

### Escalado y fallos

- Web stateless detrás de balanceadores; cache distribuida con réplicas; base particionada por `short_code` (hash) con réplicas.
- Multi-región: la ruta de lectura se sirve en cada región con réplicas locales; las escrituras pueden ir a una región o generar IDs con prefijo por región.
- Si la cache cae, la base debe aguantar la carga de lectura durante el calentamiento (o activar load shedding).
- Si el KGS cae, los servidores siguen con los lotes que tienen en memoria; dimensiona lotes para cubrir varios minutos.

## Qué hacer

Usa la plantilla de design doc de la sesión 15. Tiempo sugerido entre paréntesis.

**Escenario**: tu empresa lanza un acortador público. Se esperan 200 M de enlaces nuevos por mes en el primer año, creciendo 50 % anual; ratio de lectura 100:1; los enlaces de cuentas gratuitas expiran en 2 años y los de pago nunca; el equipo de marketing exige analítica por clic con país y dispositivo.

1. **Requisitos (15 min).** Funcionales, no funcionales con números (latencia p99 de la redirección, disponibilidad, durabilidad) y fuera de alcance.
2. **Estimación (20 min).** Escrituras y lecturas por segundo (promedio y pico) para el año 1 y el año 5; registros y almacenamiento a 5 años con replicación; memoria de cache para el 20 % caliente; eventos de analítica por segundo y su volumen diario. Longitud de código necesaria a 10 años. Tres conclusiones.
3. **API (10 min).** Endpoints de creación, redirección, estadísticas y desactivación, con errores y `Idempotency-Key` donde aplique.
4. **Modelo de datos (15 min).** Tablas o colecciones, patrones de acceso, almacenamiento elegido y clave de partición; cómo se guardan los eventos de clic.
5. **Alto nivel (25 min).** Diagrama ASCII con DNS, CDN o edge (¿sirve para redirecciones?), LB, servicio de creación, servicio de redirección, cache, base, generador de claves, pipeline de analítica. Numera el recorrido de "crear" y de "redirigir".
6. **Profundización 1: códigos (25 min).** Compara hash + colisiones, base62 de ID y KGS en una tabla con tus números; elige uno y justifica, incluyendo cómo evitas la enumeración de enlaces si eliges IDs.
7. **Profundización 2: ruta de redirección (20 min).** 301 vs 302 para este negocio; diseño de la cache (tamaño, política, TTL, hot keys de enlaces virales); cómo registras clics sin agregar latencia.
8. **Fallos, escala y seguridad (15 min).** Tabla "qué pasa si cae" (cache, base, generador, pipeline de analítica, una región); qué cambia en el año 5; abuso y phishing.
9. **Prototipo (30 min).** En TypeScript con un servidor HTTP mínimo: `POST /shorten` (base62 sobre un contador en memoria o tu `Snowflake` de la sesión 18), `GET /:code` con 302, cache LRU de la sesión 05 delante de un `Map` que simula la base, expiración con 410 y un contador de clics asíncrono. Pruebas: acortar y redirigir, código inexistente → 404, expirado → 410, y que 1.000 creaciones produzcan 1.000 códigos distintos.
10. **Alternativas descartadas (5 min).**

**Entregable**: `url-shortener-design.md` con las 11 secciones y el prototipo con pruebas.

**Rúbrica** (1 a 3 por criterio):

| Criterio | 1 | 2 | 3 |
| --- | --- | --- | --- |
| Requisitos y estimación | Sin números | Tráfico y almacenamiento | Año 1 y 5, cache, analítica, longitud de código y conclusiones |
| Generación de códigos | Una opción sin comparar | Dos opciones comparadas | Tres opciones con tabla, decisión y mitigación de enumeración |
| Ruta de lectura | Sin cache | Cache dimensionada | 301/302 justificado, hot keys, clics asíncronos |
| Datos | Esquema vago | Esquema y almacenamiento | Partición, expiración, eventos de clic y retención |
| Fallos y escala | Ausente | Algunos casos | Tabla completa, multi-región y abuso |
| Prototipo | No funciona | Funciona sin pruebas | Las cuatro pruebas pasan |

Proyecto terminado cuando todos los criterios estén al menos en 2 y el prototipo pase sus pruebas.

## Conceptos clave

- **Base62**: codificación con 62 símbolos que acorta números grandes.
- **Hash + resolución de colisiones**: truncar un hash y re-hashear con un valor extra si el código ya existe.
- **Bloom filter**: estructura probabilística que descarta rápido elementos que no existen.
- **Key Generation Service**: servicio que pregenera claves únicas y las entrega por lotes.
- **301 / 302**: redirección permanente (cacheable) / temporal (cada visita pasa por el servicio).
- **Ruta caliente**: el camino de la operación más frecuente, que debe optimizarse primero.

## Preguntas de repaso

1. ¿Por qué 7 caracteres en base62 alcanzan para 365.000 millones de URLs?
   R: Porque 62⁷ ≈ 3,5 × 10¹², unos 3,5 billones de combinaciones, casi diez veces más que las 3,65 × 10¹¹ URLs estimadas para 10 años. Con 6 caracteres (≈ 56.800 millones) no alcanzaría.
2. ¿Qué ventaja y qué riesgo tiene generar el código como base62 de un contador?
   R: Ventaja: no hay colisiones ni consultas de verificación, porque cada ID es único. Riesgo: si el contador es secuencial, los códigos son adivinables y alguien puede enumerar todos los enlaces; se mitiga con IDs no secuenciales (Snowflake con bits mezclados, rangos permutados o una permutación biyectiva del ID antes de codificar).
3. ¿Cuándo usarías 302 en vez de 301?
   R: Cuando necesitas registrar cada clic para analítica o poder cambiar o expirar el destino, porque con 302 el navegador no cachea la redirección y cada visita pasa por el servicio. Con 301 se reduce la carga, pero se pierde visibilidad de las visitas repetidas.
4. ¿Cómo registras los clics sin aumentar la latencia de la redirección?
   R: Publicando un evento de clic de forma asíncrona en un log o cola (sin esperar confirmación de una base de datos) y respondiendo la redirección de inmediato; un pipeline separado consume los eventos y agrega las estadísticas.

## Explícalo con tus palabras

Explica cómo funciona un acortador de URLs con la imagen de un guardarropa: entregas tu abrigo, te dan una ficha con un número corto y con ella recuperas el abrigo.
