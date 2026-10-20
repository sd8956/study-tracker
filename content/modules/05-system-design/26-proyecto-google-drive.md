---
title: Proyecto — diseña un servicio de archivos sincronizados (tipo Google Drive) en 3 horas
kind: project
hours: 3
sources: System Design Interview (Alex Xu), cap. 15 "Design Google Drive" (pp. 244–263) | karanpratapsingh/system-design, cap. I "Storage" y cap. II "Database Replication" | System Design Primer, "Consistency patterns"
links: Karan — Storage | https://github.com/karanpratapsingh/system-design#storage ; Karan — Database Replication | https://github.com/karanpratapsingh/system-design#database-replication ; Primer — Consistency patterns | https://github.com/donnemartin/system-design-primer#consistency-patterns ; Karan — Long polling, WebSockets, SSE | https://github.com/karanpratapsingh/system-design#long-polling-websockets-server-sent-events-sse
---

## Objetivo

Diseñar de punta a punta un servicio de almacenamiento y sincronización de archivos: subida reanudable, división en bloques con sincronización por diferencias, compresión y cifrado, metadatos con consistencia fuerte, notificaciones de cambios, resolución de conflictos, ahorro de almacenamiento y manejo de fallos; entregar un design doc y un prototipo de sincronización por bloques en TypeScript.

## Estudio

### Requisitos de referencia

Del libro: subir y descargar archivos, sincronizarlos entre dispositivos, ver el historial de versiones, compartir con amigos y familia, y recibir notificaciones cuando un archivo se edita, borra o comparte. Cualquier tipo de archivo, hasta 10 GB; cifrado en reposo. No funcionales: **confiabilidad** (perder datos es inaceptable), **sincronización rápida**, **uso eficiente del ancho de banda** (especialmente en móviles con datos limitados), **escalabilidad** y **alta disponibilidad** (el sistema sigue funcionando aunque algunos servidores caigan o se vuelvan lentos).

### Estimaciones de referencia

```
 Usuarios registrados 50 M; DAU 10 M; 10 GB gratis por usuario
 Cada usuario sube 2 archivos por día de 500 KB en promedio
 Espacio asignado total = 50 M × 10 GB = 500 PB
 QPS de subida = 10 M × 2 / 86.400 ≈ 240     pico ≈ 480
 Datos nuevos = 10 M × 2 × 500 KB = 10 TB/día
```

Conclusión: el QPS es bajo; el desafío está en el **volumen** de almacenamiento, la **eficiencia** de la sincronización y la **consistencia** de los metadatos.

### Empezar simple: un servidor

El libro arranca con un solo servidor (web server + base de metadatos + un directorio `drive/` con un "namespace" por usuario, donde la ruta identifica el archivo) y tres APIs:

- **Subir**: subida simple para archivos pequeños; **subida reanudable** para archivos grandes con riesgo de cortes: (1) pedir una URL de subida reanudable, (2) subir los datos y monitorear el progreso, (3) si se interrumpe, reanudar desde donde quedó.
- **Descargar**: `GET /files/download?path=/recetas/sopa.txt`.
- **Historial de revisiones**: `GET /files/list_revisions?path=...&limit=20`.

Todas sobre HTTPS con autenticación. Cuando el disco se llena, el libro escala: sharding por `user_id`, luego mover archivos a **object storage** (como S3) con replicación entre regiones para durabilidad, y sacar del servidor la base de metadatos (con replicación y sharding) y la capa web (con balanceador).

### Conflictos de sincronización

Si dos usuarios modifican el mismo archivo a la vez, hay conflicto. Estrategia del libro: **gana la primera versión procesada**; la que llega después recibe un conflicto. Al usuario 2 se le presentan ambas copias (su versión local y la última del servidor) y decide si fusiona o sobrescribe. Es lo que verás en Dropbox como "copia en conflicto".

### Arquitectura de alto nivel

```
 [Usuario] ──> [Block servers] ──> [Cloud storage (bloques)] ──> [Cold storage]
     │                │
     │                └──> metadatos de bloques
     ├──> [LB] ──> [API servers] ──> [Metadata cache] ──> [Metadata DB]
     │
     └<── long polling ── [Notification service] ──> [Offline backup queue]
```

- **Usuario**: navegador o app.
- **Block servers**: dividen los archivos en **bloques** (cada uno con un hash único guardado en la metadata DB), y los suben a cloud storage. Para reconstruir un archivo, se unen los bloques en orden. Tamaño de bloque de referencia: hasta 4 MB (como Dropbox).
- **Cloud storage**: guarda los bloques.
- **Cold storage**: datos inactivos (archivos sin acceso por mucho tiempo), más barato.
- **LB y API servers**: todo lo que no es subir bloques: autenticación, perfiles, metadatos.
- **Metadata DB**: usuarios, archivos, bloques, versiones. Los archivos están en la nube; la base solo guarda metadatos.
- **Metadata cache**: metadatos frecuentes.
- **Notification service**: sistema pub/sub que avisa a los clientes cuando un archivo cambia en otro lugar, para que descarguen la última versión.
- **Offline backup queue**: si un cliente está desconectado, los cambios se encolan para que los sincronice al volver.

### Block servers: delta sync, compresión y cifrado

Subir el archivo entero en cada cambio desperdicia ancho de banda. Dos optimizaciones:

1. **Delta sync**: cuando un archivo cambia, solo se sincronizan los **bloques modificados**. Si en un archivo de 10 bloques cambian el 2 y el 5, solo esos dos viajan.
2. **Compresión** por bloque, con algoritmos según el tipo de archivo (gzip o bzip2 para texto; otros para imágenes y video).

Pipeline de un archivo nuevo: dividir en bloques → comprimir cada bloque → **cifrar** cada bloque → subir a cloud storage.

```
 archivo v1: [b1][b2][b3][b4][b5]   hashes: h1 h2 h3 h4 h5
 archivo v2: [b1][b2'][b3][b4][b5'] hashes: h1 h2' h3 h4 h5'  → se suben solo b2' y b5'
```

### Consistencia fuerte en los metadatos

El sistema necesita **consistencia fuerte** por defecto: es inaceptable que un archivo se vea distinto en dos clientes al mismo tiempo. Esto aplica a la cache y a la base:

- Datos en réplicas de cache y en el líder deben coincidir.
- Al escribir en la base, se **invalida** la cache para que no sirva datos viejos.

Por eso el libro elige una **base relacional**: obtener consistencia fuerte con ACID es natural; en NoSQL habría que programarlo a mano.

Esquema simplificado:

```
 user(user_id, user_name, created_at)
 device(device_id, user_id, last_logged_in_at)
 namespace(id, owner_id, ...)                      -- raíz de archivos de un usuario
 file(id, file_name, relative_path, is_directory, latest_version, checksum, workspace_id, created_at, last_modified)
 file_version(id, file_id, device_id, version_number, last_modified)   -- solo lectura: preserva el historial
 block(block_id, file_version_id, block_order)
```

### Flujo de subida

Dos peticiones en paralelo:

```
 A) Metadatos:
   1. Cliente 1 envía metadatos del archivo nuevo
   2. Se guardan en la metadata DB con estado "pending"
   3. Se avisa al notification service: hay un archivo subiéndose
   4. El notification service avisa a los clientes relevantes (cliente 2)
 B) Contenido:
   2.1 Cliente 1 sube el contenido a los block servers
   2.2 Los block servers dividen, comprimen, cifran y suben a cloud storage
   2.3 Cloud storage dispara un callback a los API servers
   2.4 El estado del archivo pasa a "uploaded"
   2.5 Se avisa al notification service, que avisa a los clientes relevantes
```

Editar un archivo sigue el mismo flujo.

### Flujo de descarga

Cuando un archivo cambia en otro lugar: si el cliente está **en línea**, el notification service le avisa; si está **desconectado**, los cambios esperan en la cola de respaldo y se sincronizan al volver. Al enterarse, el cliente: (1) pide los metadatos nuevos a los API servers, (2) que los leen de la metadata DB; (3) descarga los bloques que le faltan desde los block servers (que los leen de cloud storage) y (4) reconstruye el archivo.

### Notification service

Para que los clientes sepan cuándo sincronizar, hay dos opciones (sesión 10): **long polling** (como Dropbox) o **WebSocket**. El libro elige **long polling** porque la comunicación es casi solo del servidor al cliente y poco frecuente (no hay ráfagas como en un chat). Cada cliente abre una petición de long polling; si detecta cambios, cierra la conexión, descarga los metadatos y vuelve a abrir otra.

### Ahorrar espacio

Guardar todas las versiones con varias copias para confiabilidad llena el almacenamiento rápido. Técnicas:

- **Deduplicar bloques**: dos bloques con el mismo hash son idénticos; se guardan una sola vez a nivel de cuenta (o globalmente, con cuidado por privacidad).
- **Estrategia inteligente de backup**: límite de versiones guardadas (las más viejas se descartan), y conservar solo versiones **valiosas** (un archivo editado mil veces en poco tiempo no necesita mil versiones; se pueden fusionar las cercanas en el tiempo).
- **Mover datos poco usados a cold storage**: archivos sin actividad durante meses o años, a un almacenamiento mucho más barato.

### Manejo de fallos

- **Balanceador**: si cae, uno secundario toma su lugar (heartbeats entre ellos).
- **Block server**: si cae, otros toman los trabajos pendientes o incompletos.
- **Cloud storage**: los bloques están replicados en varias regiones; si una región no responde, se leen de otra.
- **API server**: es stateless; el balanceador redirige a otro.
- **Metadata cache**: replicada; si un nodo cae, se lee de otro y se reemplaza.
- **Metadata DB**: si cae el líder, se promueve un seguidor; si cae un seguidor, se lee de otro y se reemplaza.
- **Notification service**: cada servidor mantiene muchas conexiones de long polling (del orden de un millón por servidor en el ejemplo del libro). Si un servidor cae, todos sus clientes deben reconectarse a otro; reconectar un millón de clientes es lento, así que se hace de forma gradual.
- **Offline backup queue**: replicada; si una cola cae, los consumidores se resuscriben a la réplica.

### Variantes

El libro menciona una alternativa: subir directo a cloud storage desde el cliente, sin block servers. Es más rápido (un salto menos), pero la división en bloques, la compresión y el cifrado deben implementarse en cada plataforma cliente (iOS, Android, web), y el cifrado en el cliente es más difícil de controlar. Otra mejora: sacar la lógica de presencia (online/offline) a un servicio aparte que otros puedan reutilizar.

## Qué hacer

Usa la plantilla de design doc de la sesión 15. Tiempo sugerido entre paréntesis.

**Escenario**: una empresa de software para colegios quiere un "drive" para 20 M de estudiantes y docentes (5 M DAU): 15 GB por usuario, archivos de hasta 5 GB, edición frecuente de documentos pequeños (apuntes de 50–500 KB), carpetas compartidas por curso (hasta 60 personas), app móvil con datos limitados, historial de versiones de 30 días y la exigencia de que los datos de cada país se guarden en su región.

1. **Requisitos (15 min).** Funcionales priorizados, no funcionales con números (tiempo de propagación de un cambio a otros dispositivos, durabilidad en "nueves", disponibilidad), y fuera de alcance (¿edición colaborativa en tiempo real tipo Google Docs?).
2. **Estimación (20 min).** Espacio asignado vs. usado (supón 20 % de uso), subidas/s promedio y pico (inicio de clases), ancho de banda con y sin delta sync para ediciones pequeñas, ahorro esperado por deduplicación (supón que el 30 % de los bloques son duplicados), filas de la metadata DB a 3 años. Tres conclusiones.
3. **API (15 min).** Subida simple y reanudable, descarga, lista de revisiones, compartir con permisos, y el endpoint de long polling de cambios.
4. **Modelo de datos (20 min).** Esquema de metadatos con permisos de carpetas compartidas (sesión 13: ReBAC), versiones y bloques; cómo particionas la base (¿por namespace?, ¿por región por residencia de datos?) y cómo mantienes consistencia fuerte.
5. **Alto nivel (20 min).** Diagrama ASCII con block servers, cloud y cold storage, API servers, cache y base, notification service, offline queue. Numera el flujo de subida de una edición y el flujo de descarga en otro dispositivo.
6. **Profundización 1: bloques y sincronización (25 min).** Tamaño de bloque (compara 4 MB frente a bloques más pequeños o de tamaño variable con *content-defined chunking*, que resiste inserciones al principio del archivo), delta sync, compresión, cifrado y deduplicación; qué pasa con un archivo de 5 GB subido desde un móvil.
7. **Profundización 2: conflictos y notificaciones (20 min).** Estrategia de conflicto para una carpeta compartida por 60 personas, long polling vs WebSocket para este caso, y cómo evitas que un cambio en una carpeta compartida genere una tormenta de 60 notificaciones y 60 descargas inmediatas.
8. **Fallos, escala y costo (15 min).** Tabla "qué pasa si cae", política de cold storage y de versiones, costo mensual aproximado del almacenamiento usado.
9. **Prototipo (25 min).** En TypeScript: `chunk(buffer, size)`, hashing SHA-256 de bloques, `diff(oldHashes, newHashes)` que devuelva los bloques a subir, un "almacén de bloques" deduplicado en memoria y `reconstruct(blockIds)`. Pruebas: reconstruir da exactamente el archivo original; cambiar un byte en medio de un archivo de 10 bloques sube un solo bloque; subir dos archivos idénticos no duplica almacenamiento.
10. **Alternativas descartadas (5 min).**

**Entregable**: `drive-design.md` con las 11 secciones y el prototipo con pruebas.

**Rúbrica** (1 a 3 por criterio):

| Criterio | 1 | 2 | 3 |
| --- | --- | --- | --- |
| Requisitos y estimación | Sin números | Espacio y QPS | Ancho de banda con delta sync, dedup, metadatos y conclusiones |
| Datos y consistencia | Esquema vago | Esquema con versiones y bloques | Permisos compartidos, particionado por región y consistencia fuerte justificada |
| Sincronización | Archivo completo | Bloques y delta sync | Tamaño de bloque comparado, compresión, cifrado, dedup y archivos grandes en móvil |
| Conflictos y notificaciones | Ignorados | Estrategia de conflicto | Conflictos en carpetas compartidas, canal elegido y control de tormentas |
| Fallos y costo | Ausente | Algunos casos | Tabla completa, cold storage, versiones y costo estimado |
| Prototipo | No funciona | Funciona sin pruebas | Las tres pruebas pasan |

Proyecto terminado cuando todos los criterios estén al menos en 2 y el prototipo pase sus pruebas.

## Conceptos clave

- **Subida reanudable**: subida que continúa desde el último punto confirmado tras una interrupción.
- **Block server**: servicio que divide, comprime, cifra y sube los bloques de un archivo.
- **Delta sync**: sincronizar solo los bloques que cambiaron.
- **Deduplicación por hash**: guardar una sola vez los bloques idénticos.
- **Conflicto de sincronización**: dos modificaciones concurrentes del mismo archivo.
- **Offline backup queue**: cola que retiene cambios para clientes desconectados.
- **Cold storage**: almacenamiento barato para datos inactivos.

## Preguntas de repaso

1. ¿Por qué dividir los archivos en bloques?
   R: Porque permite sincronizar solo los bloques modificados (delta sync), reanudar subidas fallidas por partes, comprimir y cifrar por bloque, subir en paralelo y deduplicar bloques idénticos entre versiones o archivos. Todo eso ahorra ancho de banda y almacenamiento.
2. ¿Por qué este diseño exige consistencia fuerte en los metadatos y qué almacenamiento elige?
   R: Porque es inaceptable que un archivo se vea distinto en dos clientes al mismo tiempo o que se pierda una versión. Se elige una base relacional, que ofrece consistencia fuerte con transacciones ACID de forma natural, y se invalida la cache al escribir para no servir datos viejos.
3. ¿Por qué el libro elige long polling en lugar de WebSocket para notificar cambios?
   R: Porque la comunicación es casi solo del servidor al cliente y los cambios son poco frecuentes; no hace falta un canal bidireccional permanente. Long polling es más simple sobre HTTP y suficiente: cuando hay cambios, el cliente cierra la conexión, sincroniza y abre otra.
4. Nombra tres técnicas para ahorrar almacenamiento.
   R: Deduplicar bloques idénticos por su hash; limitar y seleccionar las versiones guardadas (máximo de versiones y conservar solo las valiosas); y mover a cold storage los archivos inactivos por mucho tiempo.

## Explícalo con tus palabras

Explica cómo Google Drive sincroniza solo lo que cambió usando la imagen de un álbum de fotos donde solo reemplazas las páginas que modificaste en lugar de reimprimir el álbum entero.
