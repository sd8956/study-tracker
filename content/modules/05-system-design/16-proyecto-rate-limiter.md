---
title: Proyecto — diseña un rate limiter distribuido en 3 horas
kind: project
hours: 3
sources: System Design Interview (Alex Xu), cap. 4 "Design a rate limiter" (pp. 51–70) | karanpratapsingh/system-design, cap. IV "Rate Limiting" | System Design Primer, "Back pressure"
links: Karan — Rate Limiting | https://github.com/karanpratapsingh/system-design#rate-limiting ; Karan — API Gateway | https://github.com/karanpratapsingh/system-design#api-gateway ; Primer — Back pressure | https://github.com/donnemartin/system-design-primer#back-pressure
---

## Objetivo

Diseñar de punta a punta un rate limiter para las APIs de una empresa con decenas de servidores, comparando los cinco algoritmos clásicos, resolviendo los contadores distribuidos sin condiciones de carrera y entregando un design doc con la plantilla de la sesión 15, más un prototipo en TypeScript del algoritmo elegido.

## Estudio

### Qué es y para qué sirve

Un **rate limiter** controla cuántas peticiones puede hacer un cliente (un usuario, una IP, una clave de API) en un periodo. Si se supera el límite, las peticiones excedentes se rechazan, normalmente con `429 Too Many Requests`. Ejemplos: no más de 2 publicaciones por segundo por usuario, no más de 10 cuentas por día desde la misma IP, no más de 5 intentos de login por minuto.

Beneficios:

- **Prevenir el agotamiento de recursos** por ataques de denegación de servicio (intencionales o no: un cliente con un bug que hace un bucle infinito de peticiones).
- **Controlar costos**: limitar llamadas a APIs de terceros que cobran por uso y poner un techo al autoscaling.
- **Prevenir abusos**: fuerza bruta de contraseñas, scraping, spam.
- **Proteger la equidad**: que un cliente grande no consuma la capacidad de todos.

### Dónde ponerlo

- **En el cliente**: poco fiable; un cliente malicioso lo ignora. Solo sirve como cortesía.
- **En el servidor** (middleware en cada servicio): control total sobre el algoritmo, pero cada servicio lo reimplementa.
- **En un middleware dedicado o el API gateway** (sesión 04): centralizado y reutilizable; la opción habitual con microservicios.

Criterios para decidir: el stack actual (¿se puede implementar eficientemente en el lenguaje del servidor?), el algoritmo que necesitas (los gateways comerciales imponen el suyo), si ya tienes un gateway, y si tienes equipo para construirlo o conviene comprarlo.

### Los cinco algoritmos

**1. Token bucket.** Un balde con capacidad máxima de N tokens se rellena a un ritmo fijo (por ejemplo, 2 tokens por segundo); los tokens que no caben se descartan. Cada petición consume un token; si no hay, se rechaza.

```
 rellenador: +2 tokens/s ──> [ ●●●○ ] capacidad 4
 petición: toma 1 token → pasa;  balde vacío → 429
```

Parámetros: tamaño del balde (cuánta ráfaga se tolera) y ritmo de relleno (el ritmo sostenido). Pros: simple, poca memoria (dos números por clave), permite **ráfagas** cortas. Contras: elegir bien los dos parámetros no es trivial. Es el más usado (muchos proveedores de nube lo usan en sus APIs).

**2. Leaking bucket.** Las peticiones entran en una cola FIFO de tamaño fijo y se procesan a un ritmo constante; si la cola está llena, se descartan. Pros: salida perfectamente estable, poca memoria. Contras: una ráfaga llena la cola con peticiones viejas y las nuevas se rechazan aunque sean más importantes; también tiene dos parámetros que afinar.

**3. Fixed window counter.** El tiempo se divide en ventanas fijas (por ejemplo, cada minuto) con un contador; cada petición lo incrementa y, si supera el umbral, se rechaza. Pros: simplísimo y eficiente en memoria. Contra principal: **ráfagas en el borde**. Con un límite de 5 por minuto, un cliente puede enviar 5 a las 10:00:59 y 5 a las 10:01:00: 10 peticiones en un segundo.

**4. Sliding window log.** Se guarda el timestamp de cada petición (por ejemplo, en un sorted set). Ante una petición nueva, se borran los timestamps más viejos que la ventana y se cuenta lo que queda; si no supera el límite, se acepta y se registra. Pros: exacto en cualquier ventana deslizante. Contra: mucha memoria (un timestamp por petición, incluso de las rechazadas en algunas implementaciones).

**5. Sliding window counter.** Híbrido: guarda contadores de ventanas fijas y estima la ventana deslizante ponderando la anterior:

```
 peticiones en la ventana deslizante ≈ actual + anterior × (fracción de la ventana anterior que se solapa)

 Límite 7/min. Ventana anterior: 5. Actual: 3. Estamos al 30 % del minuto actual.
 estimado = 3 + 5 × 0,7 = 6,5 → se acepta (6,5 < 7)
```

Pros: suaviza las ráfagas del borde con muy poca memoria. Contra: es una aproximación que supone peticiones uniformes en la ventana anterior; en la práctica el error es muy pequeño.

| Algoritmo | Memoria por clave | Ráfagas | Precisión | Uso típico |
| --- | --- | --- | --- | --- |
| Token bucket | 2 valores | Permite (controladas) | Buena | APIs públicas |
| Leaking bucket | Cola | Las suaviza | Buena | Salida estable hacia un backend |
| Fixed window | 1 contador | Problema en el borde | Baja en el borde | Límites gruesos (por día) |
| Sliding log | 1 timestamp por petición | No | Exacta | Límites bajos y estrictos |
| Sliding counter | 2 contadores | Suavizadas | Aproximada | Límites altos con poca memoria |

### Arquitectura de alto nivel

Los contadores no pueden vivir en una base de datos en disco (demasiado lenta por petición); se guardan en una cache en memoria como **Redis**, que ofrece `INCR` (incremento atómico) y `EXPIRE` (expiración automática).

```
 Cliente ──> [Rate limiter middleware] ──pasa──> [API servers]
                  │        │
                  │        └──429──> Cliente
                  ▼
             [Redis: contadores]      [Reglas (archivos de config) → cache local de reglas]
```

**Reglas**: se escriben en configuración, por ejemplo "dominio `messaging`, mensajes de marketing: 5 por día" o "dominio `auth`, login: 5 por minuto". Workers las cargan del almacenamiento a una cache en cada middleware.

**Respuesta al cliente**: `429` y cabeceras para que se comporte bien: `X-Ratelimit-Limit` (cuántas peticiones permite la ventana), `X-Ratelimit-Remaining` (cuántas le quedan) y `X-Ratelimit-Retry-After` (cuántos segundos esperar). Las peticiones limitadas pueden descartarse o encolarse para procesarse después (por ejemplo, pedidos que no deben perderse).

### Problemas del entorno distribuido

**Condiciones de carrera.** El enfoque ingenuo "leer contador → comparar → escribir contador + 1" falla con concurrencia: dos peticiones leen 3 a la vez, ambas escriben 4, y el contador queda una unidad por debajo. Con mucha concurrencia, un cliente puede exceder ampliamente el límite. Soluciones: un lock (correcto pero lento: no escala), o mejor, **operaciones atómicas**: `INCR` devuelve el valor ya incrementado ("incrementar y luego comparar"), o un **script Lua** en Redis que ejecuta lectura, cálculo y escritura de forma atómica (necesario para token bucket o sliding window).

**Sincronización entre limitadores.** Con varios middlewares, si cada uno guarda sus propios contadores, un cliente cuyas peticiones se reparten entre ellos multiplica su límite por el número de nodos. Sticky sessions lo evitan pero no escalan ni toleran fallos. La solución estándar es un **almacén centralizado** (Redis) compartido por todos.

**Rendimiento.** El rate limiter está en la ruta de **cada** petición: debe agregar menos de un par de milisegundos. Con varios data centers, cada uno tiene su propio Redis y los contadores se sincronizan de forma eventual; se acepta una pequeña imprecisión global a cambio de latencia local (más consistencia exigiría coordinar los centros en cada petición y pagar su latencia; módulo 04, sesión 19). Los usuarios se enrutan al borde más cercano.

**Monitoreo.** Hay que medir si las reglas son efectivas: demasiadas peticiones legítimas rechazadas indica reglas muy estrictas; durante eventos como ventas flash, un token bucket con más capacidad de ráfaga puede ser mejor.

### Variantes y extensiones

- **Hard vs soft**: el límite estricto nunca se supera; el blando permite excederlo un poco durante un tiempo.
- **Por capa**: el rate limiting de esta sesión es de capa 7 (HTTP); también se puede limitar por IP en capa 3 con reglas de firewall, más barato pero menos expresivo.
- **Del lado del cliente**: cachear respuestas para no repetir llamadas, respetar `Retry-After` y reintentar con backoff exponencial y jitter (sesión 12).
- **Fail open vs fail closed**: si Redis cae, ¿dejas pasar todo (protegiendo la disponibilidad, arriesgando sobrecarga) o rechazas todo (protegiendo el backend, causando una caída)? Para la mayoría de las APIs, fail open con un límite local aproximado por nodo es el término medio razonable.

## Qué hacer

Trabaja con la plantilla de design doc de la sesión 15. Tiempo sugerido entre paréntesis.

**Escenario**: una plataforma de APIs con 300 servidores de aplicación en 2 regiones, 50 M de usuarios, picos de 1 M de peticiones/s. Hay tres tipos de clientes: usuarios autenticados, clientes B2B con clave de API y tráfico anónimo por IP.

1. **Requisitos (20 min).** Escribe funcionales (límites por usuario, por clave y por IP; reglas configurables sin redeploy; informar al cliente) y no funcionales con números: latencia agregada máxima, disponibilidad, precisión aceptable (¿se tolera un 1–2 % de exceso?), memoria. Define qué queda fuera.
2. **Estimación (20 min).** Calcula: número de claves activas a limitar (usuarios + claves B2B + IPs anónimas), memoria en Redis para token bucket (dos valores por clave más overhead) y para sliding window log con un límite de 100 peticiones/min (compara ambos), operaciones por segundo en Redis y cuántos nodos de Redis necesitas si cada uno sostiene ~100.000 operaciones/s. Saca tres conclusiones.
3. **API y reglas (15 min).** Diseña el formato de las reglas (YAML o JSON) con dominio, descriptor, unidad y límite; define las cabeceras de respuesta y el cuerpo del `429`.
4. **Alto nivel (25 min).** Diagrama ASCII con gateway o middleware, Redis particionado (¿por qué clave?, ¿consistent hashing?), servicio de reglas y su cache, y el flujo de una petición aceptada y una rechazada, numerando los pasos.
5. **Profundización 1: algoritmo (25 min).** Elige uno de los cinco para cada tipo de cliente y justifica con una tabla (ráfagas, memoria, precisión). Escribe el pseudocódigo atómico (script Lua o equivalente) del elegido.
6. **Profundización 2: distribuido y multi-región (25 min).** Explica cómo evitas condiciones de carrera, qué pasa entre regiones (contadores locales con sincronización eventual o límite global repartido por región) y la decisión fail open / fail closed si Redis cae, con su justificación.
7. **Fallos, escala y operación (15 min).** Tabla de componentes con "qué pasa si cae"; qué cambia a 10× tráfico; métricas y alertas (tasa de 429 por regla, latencia del limitador, errores de Redis).
8. **Prototipo (30 min).** Implementa en TypeScript el algoritmo elegido con una interfaz `allow(key: string, now: number): { allowed: boolean; remaining: number; retryAfterMs: number }`, en memoria, con pruebas que usen un reloj simulado: ráfaga permitida hasta el límite, rechazo al superarlo, recuperación tras el tiempo de relleno y (si eliges fixed window) una prueba que muestre el problema del borde.
9. **Alternativas descartadas (5 min).** Al menos dos, con la razón.

**Entregable**: un archivo `rate-limiter-design.md` con las 11 secciones de la plantilla y el código del prototipo con sus pruebas.

**Rúbrica** (autoevalúa cada criterio de 1 a 3):

| Criterio | 1 | 2 | 3 |
| --- | --- | --- | --- |
| Requisitos | Genéricos | Con números | Con números, prioridad y fuera de alcance |
| Estimación | Ausente | Memoria y QPS calculados | Comparación de algoritmos por memoria y nodos derivados |
| Algoritmo | Elegido sin razones | Comparado con otro | Elegido por tipo de cliente con tabla y pseudocódigo atómico |
| Distribuido | Ignorado | Redis central mencionado | Carreras, multi-región y fail open/closed razonados |
| Fallos y operación | Ausente | Algunos casos | Tabla completa + métricas y alertas |
| Prototipo | No funciona | Funciona sin pruebas | Pruebas con reloj simulado que cubren los casos pedidos |

Proyecto terminado cuando todos los criterios tengan al menos 2 y el prototipo pase sus pruebas.

## Conceptos clave

- **Rate limiter**: componente que limita cuántas peticiones puede hacer un cliente en un periodo.
- **Token bucket**: balde de tokens que se rellena a ritmo fijo; cada petición consume uno.
- **Leaking bucket**: cola de tamaño fijo procesada a ritmo constante.
- **Fixed window counter**: contador por ventana fija; sufre ráfagas en el borde.
- **Sliding window log**: registro de timestamps por cliente; exacto pero costoso en memoria.
- **Sliding window counter**: estimación ponderada con contadores de la ventana actual y la anterior.
- **429 Too Many Requests**: código HTTP para peticiones limitadas, con cabeceras de límite y reintento.
- **Fail open / fail closed**: dejar pasar o rechazar todo cuando el almacén de contadores falla.

## Preguntas de repaso

1. ¿Por qué el fixed window counter permite el doble del límite en el borde de las ventanas?
   R: Porque cada ventana tiene su propio contador independiente: un cliente puede agotar el límite al final de una ventana y agotarlo otra vez al inicio de la siguiente, enviando el doble del límite en un intervalo corto que cruza el borde. El sliding window counter o el log lo evitan.
2. ¿Cómo se evita la condición de carrera al incrementar contadores en Redis?
   R: Evitando el patrón leer-comparar-escribir no atómico. Se usa una operación atómica como `INCR`, que devuelve el valor ya incrementado para compararlo después, o un script Lua que ejecuta toda la lógica del algoritmo de forma atómica en Redis. Un lock distribuido también funcionaría, pero sería un cuello de botella.
3. ¿Qué cabeceras debe devolver un rate limiter y para qué sirven?
   R: El límite de la ventana (`X-Ratelimit-Limit`), las peticiones restantes (`X-Ratelimit-Remaining`) y los segundos a esperar antes de reintentar (`X-Ratelimit-Retry-After`, o `Retry-After`). Permiten que el cliente ajuste su ritmo y reintente en el momento adecuado en lugar de insistir y generar más carga.
4. Si Redis cae, ¿fail open o fail closed? Justifica para una API de consulta de productos y para el login.
   R: Para la consulta de productos, fail open con un límite local aproximado por nodo: preserva la disponibilidad y el riesgo de sobrecarga breve es aceptable. Para el login, conviene un límite local estricto o fail closed parcial, porque el rate limit protege contra fuerza bruta y abrirlo por completo expone las cuentas.

## Explícalo con tus palabras

Explica el algoritmo token bucket con la imagen de una máquina que entrega fichas para un juego a un ritmo fijo y solo puede guardar unas pocas.
