---
title: Servicios geoespaciales — geohashing, quadtrees y búsqueda por proximidad
kind: lesson
hours: 2
sources: karanpratapsingh/system-design, cap. IV "Geohashing and Quadtrees" y cap. V "Uber" (sección de ubicación) | System Design Primer, "Index of system design topics" (índices y sharding aplicados) | System Design Interview (Alex Xu), cap. 1 "Database scaling" (sharding) como base del particionado por región
links: Karan — Geohashing and Quadtrees | https://github.com/karanpratapsingh/system-design#geohashing-and-quadtrees ; Karan — Uber | https://github.com/karanpratapsingh/system-design#uber ; Primer — Sharding | https://github.com/donnemartin/system-design-primer#sharding ; Primer — Index of system design topics | https://github.com/donnemartin/system-design-primer#index-of-system-design-topics
---

## Objetivo

Resolver de forma eficiente la pregunta "¿qué hay cerca de mí?": entender por qué los índices normales fallan con coordenadas, codificar ubicaciones con geohash, indexar con quadtrees, comparar ambos (y conocer S2 y H3), y diseñar un servicio de proximidad para negocios estáticos que prepare el caso de Uber de la siguiente sesión.

## Estudio

### El problema

Muchos productos necesitan buscar por cercanía: restaurantes a menos de 2 km (Yelp, Google Maps), conductores disponibles cerca de un pasajero (Uber), amigos cercanos, tiendas con stock en tu zona. La consulta es simple de enunciar:

```
 Dado (lat, lon) y un radio r, devolver los objetos dentro del círculo, ordenados por distancia.
```

El problema es hacerlo **rápido** con cientos de millones de puntos y decenas de miles de consultas por segundo, sin recorrer la tabla entera en cada búsqueda.

### Por qué un índice normal no alcanza

La solución ingenua en SQL:

```sql
SELECT id, name FROM places
WHERE lat BETWEEN :lat - :d AND :lat + :d
  AND lon BETWEEN :lon - :d AND :lon + :d;
```

Con un índice en `lat` y otro en `lon`, la base puede usar uno de los dos, no ambos a la vez de forma eficiente: el índice de latitud devuelve una franja horizontal que cruza todo el planeta (millones de filas), el de longitud una franja vertical, y la intersección se calcula a mano. Un índice compuesto `(lat, lon)` tampoco ayuda mucho: solo filtra bien por el primer campo. El problema de fondo es que los índices B-tree son **unidimensionales** y la ubicación es **bidimensional**. Necesitamos transformar el espacio 2D en algo que un índice 1D (o un árbol especial) pueda buscar.

### Idea 1: una grilla fija

Dividir el mapa en celdas iguales (por ejemplo, de 1 km × 1 km) y guardar el ID de la celda de cada lugar. Para buscar, se consulta la celda del usuario y sus 8 vecinas. Es simple, pero la densidad del mundo es muy desigual: una celda en el centro de Bogotá puede tener miles de restaurantes y una en el océano, ninguno. Celdas grandes saturan las zonas densas; celdas pequeñas desperdician espacio en las vacías. Las dos técnicas siguientes resuelven esto de formas distintas.

### Geohash

**Geohash** codifica una coordenada como una cadena corta de caracteres (alfabeto base32), dividiendo el mundo de forma recursiva.

Cómo se construye (idea): se alterna entre longitud y latitud, y en cada paso se divide el rango por la mitad, escribiendo `1` si el punto está en la mitad superior y `0` si está en la inferior.

```
 Longitud de −180 a 180, punto en −74,08 (Bogotá):
   ¿≥ 0?        no  → 0   rango [−180, 0]
 Latitud de −90 a 90, punto en 4,61:
   ¿≥ 0?        sí  → 1   rango [0, 90]
 Longitud: ¿≥ −90?  sí → 1  rango [−90, 0]
 Latitud:  ¿≥ 45?   no → 0  rango [0, 45]
 Longitud: ¿≥ −45?  no → 0  rango [−90, −45]
 ...
 Los bits se agrupan de a 5 y cada grupo se convierte en un carácter base32 → "d2g64r0x" (los cinco primeros bits, 01100, dan la "d")
```

Propiedades clave:

- **Jerárquico**: cada carácter más precisa la celda. El primer carácter divide el mundo en 32 celdas; cada una se divide en 32, y así sucesivamente.
- **Prefijos compartidos = cercanía**: dos puntos cuyo geohash comparte un prefijo largo están en la misma celda pequeña. `9q8yy9mf` y `9q8yy9vx` comparten `9q8yy9`, así que están cerca.
- **Precisión por longitud**:

| Longitud | Tamaño aproximado de celda |
| --- | --- |
| 4 | 39 km × 19,5 km |
| 5 | 4,9 km × 4,9 km |
| 6 | 1,2 km × 0,6 km |
| 7 | 153 m × 153 m |
| 8 | 38 m × 19 m |

Para buscar en un radio de ~1 km, se usa longitud 6: se calcula el geohash del usuario con 6 caracteres y se buscan los lugares con ese prefijo con un simple índice de texto: `WHERE geohash LIKE 'd2g64r%'`. Un índice B-tree normal resuelve consultas de prefijo de forma eficiente. Por eso muchas bases (MySQL, Redis, DynamoDB, Firestore) soportan geohash.

**El problema de los bordes**: dos puntos muy cercanos pueden estar a lados opuestos del borde de una celda y no compartir **ningún** prefijo (el caso extremo es el ecuador o el meridiano de Greenwich). Por eso la consulta no mira solo la celda del usuario, sino también sus **8 vecinas**, que se calculan con funciones estándar. Después se filtran los resultados por la distancia real.

```
 ┌──────┬──────┬──────┐
 │  NO  │  N   │  NE  │
 ├──────┼──────┼──────┤
 │  O   │ yo • │  E   │   consulta = 9 celdas → candidatos → filtrar por distancia → ordenar
 ├──────┼──────┼──────┤
 │  SO  │  S   │  SE  │
 └──────┴──────┴──────┘
```

Si no hay suficientes resultados, se acorta el geohash un carácter (celdas más grandes) y se repite.

Ventajas: simple, cabe en cualquier base con índices de texto, fácil de particionar (por prefijo), fácil de cachear (clave = geohash). Desventajas: celdas de tamaño fijo por nivel (no se adapta a la densidad), problema de bordes, y las celdas son rectángulos que se deforman cerca de los polos.

Un uso adicional: un geohash corto da **anonimato aproximado**: con 5 caracteres sabes que alguien está en una zona de ~5 km sin conocer su ubicación exacta.

### Quadtree

Un **quadtree** es un árbol donde cada nodo interno tiene exactamente **cuatro hijos**, que dividen su región en cuadrantes (NO, NE, SO, SE). Es el análogo en 2D de un árbol binario de búsqueda.

La variante útil aquí se adapta a la densidad: se empieza con un nodo que cubre todo el mapa, y **cada nodo que contiene más de K puntos** (por ejemplo, 100) se divide en cuatro. Las zonas densas terminan con celdas pequeñas y profundas; las vacías, con celdas grandes y superficiales.

```
 Mundo (raíz)
 ├─ NO (pocos puntos: hoja)
 ├─ NE ── se divide ─┬─ NO (hoja, 80 puntos)
 │                   ├─ NE ── se divide ── ... (centro de una ciudad)
 │                   ├─ SO (hoja)
 │                   └─ SE (hoja)
 ├─ SO (hoja, océano, 0 puntos)
 └─ SE (hoja)
```

Buscar cercanos: bajar desde la raíz hasta la hoja que contiene al usuario (O(log n) en un árbol balanceado razonable), tomar sus puntos y, si no alcanzan o el radio cruza bordes, revisar hojas vecinas. Luego filtrar por distancia real.

Memoria (estimación tipo Yelp): 200 M de negocios, K = 100 → ~2 M de hojas. Cada hoja guarda IDs de negocios (8 bytes + coordenadas ~16 bytes = 24 bytes por negocio): 200 M × 24 B ≈ 4,8 GB; más los nodos internos (unos 2/3 de 2 M ≈ 0,7 M × ~64 B ≈ 45 MB). En total, **unos 5 GB: cabe en memoria de un solo servidor**. Se replica en varios servidores para el throughput de lectura.

Ventajas: se adapta a la densidad, buena para "los k más cercanos" (porque las hojas tienen cantidades parecidas de puntos). Desventajas: vive en memoria y hay que construirlo (al arrancar un servidor, minutos); las actualizaciones (agregar, borrar, mover puntos) requieren dividir o fusionar nodos y bloqueos si hay concurrencia. Para negocios que cambian poco, se reconstruye periódicamente (por ejemplo, cada noche) y se acepta que un negocio nuevo aparezca al día siguiente.

### Otras alternativas: S2 y H3

- **S2** (de Google) proyecta la esfera sobre un cubo y numera las celdas con una **curva de Hilbert**, que preserva mejor la cercanía que el geohash; maneja bien regiones de cualquier forma. La usan Google Maps y muchas bases.
- **H3** (de Uber) divide el mundo en **hexágonos** jerárquicos. Los hexágonos tienen una ventaja: todos sus vecinos están a la misma distancia del centro (en una grilla cuadrada, los vecinos diagonales están más lejos), lo que simplifica cálculos de áreas, precios por zona y movimiento.

| Técnica | Estructura | Se adapta a densidad | Dónde vive | Fortaleza |
| --- | --- | --- | --- | --- |
| Grilla fija | Celdas iguales | No | Base o memoria | Simplicidad |
| Geohash | Cadena con prefijos | No (nivel fijo por consulta) | Cualquier base con índice | Simple, particionable, cacheable |
| Quadtree | Árbol de 4 hijos | Sí | Memoria | k-vecinos con densidad variable |
| S2 | Celdas sobre curva de Hilbert | Sí (cubrimientos variables) | Librería + índice | Precisión y regiones arbitrarias |
| H3 | Hexágonos jerárquicos | Por resolución | Librería + índice | Vecindad uniforme, análisis por zona |

### Un recorrido de búsqueda con geohash

1. Ana, en el centro de Bogotá (4,61, −74,08), pide "restaurantes a 1 km". El cliente envía su posición y el radio.
2. El LBS elige la precisión según el radio: para ~1 km, longitud 6 (celdas de ~1,2 × 0,6 km).
3. Calcula el geohash de 6 caracteres de Ana (`d2g64r`) y sus 8 vecinos.
4. Para cada una de las 9 celdas, lee la lista de IDs en la cache (`geohash:6:<celda>`); las celdas populares son casi siempre hits.
5. Obtiene unos 600 candidatos; descarta los que están a más de 1 km con haversine; quedan 180.
6. Ordena por distancia (o por una mezcla de distancia y calificación), toma los primeros 20 e hidrata sus detalles desde la business cache.
7. Responde en ~30 ms. Si hubieran quedado menos de 20 resultados, el LBS habría repetido con longitud 5 (celdas de ~5 km).

Fíjate en el patrón de dos fases que aparece en casi todos los sistemas de búsqueda: una **fase gruesa** barata que obtiene candidatos con un índice (las 9 celdas) y una **fase fina** que calcula el criterio exacto solo sobre esos candidatos.

### Calcular distancias

Para filtrar los candidatos se calcula la distancia real. Sobre la superficie terrestre se usa la fórmula de **haversine** (distancia de círculo máximo). Para distancias cortas (pocos km), una aproximación plana corrigiendo la longitud por el coseno de la latitud es suficiente y más barata. Y recuerda que la distancia en línea recta no es el tiempo de viaje: para "el conductor que llega antes" se necesita un servicio de rutas que considere calles y tráfico (lo verás en la próxima sesión).

### Diseño de un servicio de proximidad (tipo Yelp)

Requisitos: buscar negocios cerca de una ubicación con radio configurable; ver el detalle de un negocio; los dueños agregan o editan negocios (los cambios pueden tardar hasta un día en aparecer). Escala: 100 M DAU, 5 búsquedas por día, 200 M de negocios.

```
 búsquedas/s = 100 M × 5 / 10^5 ≈ 5.000 QPS   pico ≈ 10.000–15.000
 escrituras de negocios: pocas por segundo
```

Es un sistema **muy de lectura** con datos que cambian poco, lo que permite precalcular el índice y replicarlo sin preocuparse por escrituras concurrentes. Diseño:

```
 [Cliente] → [LB] ─┬─ /search → [Location Based Service (LBS): stateless, solo lectura]
                   │                    │ geohash o quadtree en memoria/cache
                   │                    ▼
                   │            [Índice geoespacial] → IDs candidatos → filtrar por distancia
                   │                    ▼
                   │            [Business cache] → detalles
                   └─ /businesses → [Business service] → [BD líder + réplicas]
```

- El **LBS** es stateless y escala horizontalmente; cada instancia mantiene el índice (geohash en una cache o quadtree en memoria).
- La **base de negocios** es relacional con réplicas de lectura; el volumen (200 M × ~1 KB = 200 GB) cabe en un líder, y las pocas escrituras por segundo no justifican sharding.
- **Cache por geohash**: la clave `geohash:6:d2g64r` guarda la lista de IDs de esa celda; la mayoría de las búsquedas cae en pocas celdas populares (centros urbanos).
- Los cambios de negocios se aplican al índice con un job nocturno (o con eventos si se quiere más frescura).
- **Multi-región**: los usuarios buscan cerca de donde están, así que la región natural de los datos es geográfica; se despliega el LBS cerca de los usuarios y los datos de cada zona en su región, lo que además ayuda con la residencia de datos (sesión 13).

### Cuando los puntos se mueven

Todo lo anterior supone puntos casi estáticos (negocios). Con objetos en movimiento (conductores, repartidores, amigos que comparten ubicación), el problema cambia:

- **Tasa de escritura enorme**: 1 M de conductores activos que envían su posición cada 4 segundos generan 250.000 actualizaciones por segundo. Un índice que se reconstruye de noche no sirve, y un quadtree con bloqueos por cada actualización sufre.
- **Datos efímeros**: la posición de hace 30 segundos ya no importa. No hace falta durabilidad fuerte; sí baja latencia.
- **Consultas frecuentes y cercanas al presente**: "conductores libres a menos de 2 km, ahora".

El patrón habitual: guardar la **última posición** de cada objeto en un almacén en memoria indexado por celda (geohash o H3), por ejemplo un set de conductores por celda que se actualiza al cruzar de celda: si el conductor sigue en la misma celda, solo se actualiza su posición; si cambió, se lo quita de la vieja y se lo agrega a la nueva. Las búsquedas leen la celda del pasajero y sus vecinas. El historial completo de posiciones (para trazar el recorrido o para facturar) se envía en paralelo a un log de eventos y a almacenamiento frío, fuera de la ruta caliente. Lo vas a diseñar en detalle en el proyecto de la próxima sesión.

### Particionar datos geográficos

Cuando el índice o el tráfico superan una máquina, la partición natural es **geográfica**: por ciudad, región o prefijo de geohash. Ventajas: casi todas las consultas son locales (nadie busca restaurantes en otra ciudad), así que tocan una sola partición; y se alinea con despliegues regionales. Desventaja: el tráfico es muy desigual (una megaciudad frente a un pueblo), así que hay que dividir más finamente las zonas densas, con la misma idea del shard map manager del autocompletado (sesión 24). Las consultas en el borde entre dos particiones deben consultar ambas.

### Soporte en herramientas existentes

No siempre necesitas implementar el índice. Redis ofrece comandos geoespaciales (`GEOADD`, `GEOSEARCH`) que internamente usan geohash sobre sorted sets; PostgreSQL con la extensión PostGIS ofrece índices espaciales (R-trees vía GiST) y funciones de distancia; Elasticsearch y MongoDB tienen tipos y consultas geográficas. En un diseño, es razonable decir "uso PostGIS para los negocios y Redis GEO para las posiciones en vivo" siempre que expliques qué índice hay debajo y sus límites.

### Modos de fallo y casos difíciles

- **Bordes de celdas**: siempre consultar vecinas y filtrar por distancia real.
- **Zonas ultra densas**: una celda de geohash con 50.000 negocios en un centro comercial; se usa una precisión mayor o un quadtree que se adapta.
- **Zonas vacías**: el usuario en una zona rural no encuentra nada en 1 km; ampliar el radio de forma progresiva.
- **Índice desactualizado**: un negocio cerrado sigue apareciendo; se filtra por estado al hidratar los detalles.
- **Reconstrucción del quadtree**: si todos los servidores reconstruyen a la vez al desplegar, la capacidad cae; reconstruir de forma escalonada.
- **Coordenadas falsas o imprecisas**: el GPS de un teléfono en interiores puede errar cientos de metros, y un cliente malicioso puede enviar posiciones inventadas; valida rangos, descarta saltos imposibles (moverse 50 km en 2 segundos) y no confíes ciegamente en la posición del cliente para decisiones sensibles como precios o fraude.

## Conceptos clave

- **Consulta de proximidad**: buscar objetos dentro de un radio alrededor de un punto.
- **Geohash**: codificación jerárquica de coordenadas en una cadena base32 donde prefijos comunes indican cercanía.
- **Precisión del geohash**: la longitud de la cadena determina el tamaño de la celda.
- **Celdas vecinas**: las 8 celdas alrededor de la del usuario, necesarias por el problema de bordes.
- **Quadtree**: árbol que divide el espacio en cuatro cuadrantes de forma recursiva según la densidad.
- **Umbral de división (K)**: número máximo de puntos por hoja antes de dividirla.
- **S2 / H3**: sistemas de celdas jerárquicas sobre la esfera (curva de Hilbert / hexágonos).
- **Haversine**: fórmula de distancia sobre una esfera.
- **Location Based Service**: servicio stateless de solo lectura que responde búsquedas por cercanía.

## Preguntas de repaso

1. ¿Por qué índices normales sobre latitud y longitud no resuelven bien la búsqueda por cercanía?
   R: Porque los índices B-tree son unidimensionales: un índice en latitud devuelve una franja que cruza todo el planeta y uno en longitud otra; la base solo usa uno de forma eficiente y debe intersectar millones de filas. La ubicación es bidimensional y necesita transformarse (geohash) o indexarse con una estructura 2D (quadtree).
2. ¿Qué significa que dos geohashes compartan un prefijo largo y qué excepción hay?
   R: Que están dentro de la misma celda pequeña y, por lo tanto, cerca. La excepción es el problema de bordes: dos puntos muy cercanos a lados opuestos del límite de una celda pueden no compartir prefijo, por eso se consultan también las 8 celdas vecinas.
3. Estima la memoria de un quadtree con 200 M de negocios y un máximo de 100 por hoja.
   R: Hay unos 2 M de hojas. Guardar 200 M de entradas de ~24 bytes (ID y coordenadas) ocupa ~4,8 GB, y los nodos internos (unos 0,7 M) agregan decenas de MB. En total unos 5 GB, que caben en la memoria de un servidor; se replica para atender el tráfico de lectura.
4. ¿Cuándo preferirías geohash y cuándo quadtree?
   R: Geohash cuando quieres simplicidad y usar la base de datos o la cache existentes con índices de prefijo, particionar y cachear por celda, y la densidad es razonablemente uniforme o se tolera ajustar la precisión. Quadtree cuando la densidad es muy desigual y necesitas los k vecinos más cercanos con buen rendimiento en memoria, aceptando construirlo y mantenerlo en cada servidor.
5. ¿Qué ventaja tienen los hexágonos de H3 frente a celdas cuadradas?
   R: En una grilla hexagonal, los seis vecinos de una celda están a la misma distancia de su centro, mientras que en una cuadrada los vecinos diagonales están más lejos. Eso simplifica cálculos de vecindad, áreas, movimiento y precios por zona.

## Ejercicio

Implementa en TypeScript `encodeGeohash(lat, lon, precision)` y `neighbors(hash)` (puedes calcular los vecinos decodificando el centro de la celda y desplazándolo un ancho de celda en cada dirección), y un `PointQuadtree` con división al superar K puntos y `nearest(lat, lon, k)`. Genera 1 M de puntos con densidad desigual (90 % en 5 "ciudades") y compara el tiempo de buscar los 20 más cercanos con geohash + vecinos, con quadtree y con fuerza bruta. Pruebas: el geohash de una coordenada conocida coincide con un valor de referencia; ambos métodos devuelven los mismos 20 resultados que la fuerza bruta en 100 consultas aleatorias; un punto pegado al borde de una celda encuentra a su vecino del otro lado. Terminado cuando las pruebas pasen y tengas la tabla de tiempos.

## Explícalo con tus palabras

Explica cómo funciona un geohash usando la imagen de un mapa doblado por la mitad una y otra vez, anotando en cada doblez de qué lado quedó tu casa.
