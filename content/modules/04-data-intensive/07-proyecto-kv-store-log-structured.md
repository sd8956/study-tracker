---
title: "Proyecto: key-value store log-structured con hash index y compactación"
kind: project
hours: 3
sources: Designing Data-Intensive Applications (Kleppmann), cap. 3 (pp. 92–101)
links: Bitcask, paper original | https://riak.com/assets/bitcask-intro.pdf ; Node.js, API de file system | https://nodejs.org/api/fs.html
---

## Objetivo

Construir en TypeScript un key-value store persistente al estilo Bitcask: log de solo-añadido segmentado, hash index en memoria, tombstones, checksums, recuperación tras crash y compactación con merge de segmentos. Al terminar habrás sentido en tus manos los trade-offs de las sesiones 04 y 05.

## Estudio

### Arquitectura que vas a construir

```
                    ┌───────────────────────────────┐
  set/get/delete ──►│            KVStore            │
                    │  index: Map<key, {seg, off}>  │
                    └──────┬──────────────┬─────────┘
                           │ append        │ read(seg, off)
                           ▼               ▼
   data/
     segment-000001.log   (inmutable, cerrado)
     segment-000002.log   (inmutable, cerrado)
     segment-000003.log   (activo: solo aquí se escribe)
     segment-000003.hint  (opcional: snapshot del índice)
```

### Formato de registro (binario)

Cada registro tiene un encabezado fijo y luego los bytes de clave y valor:

```
┌──────────┬───────────┬──────────┬────────────┬──────────┬───────────┐
│ crc32 4B │ timestamp │ keyLen 4B│ valueLen 4B│ key bytes│ value bytes│
│          │    8B     │          │ (-1=tomb.) │          │            │
└──────────┴───────────┴──────────┴────────────┴──────────┴───────────┘
crc32 se calcula sobre todo lo que va después de él
```

- `valueLen = -1` (como entero con signo) significa **tombstone**.
- El CRC permite detectar un registro escrito a medias tras un crash: si no coincide, se trunca el segmento en ese punto.
- Node ≥ 22 trae `zlib.crc32` desde la versión 22.2; si tu versión no lo tiene, implementa CRC32 con una tabla de 256 entradas.

### Reglas del motor

1. **Escritura**: se añade el registro al segmento activo (`fs.writeSync` sobre un descriptor abierto en modo `a`) y se actualiza el índice con `{segmentId, offset}` del inicio del registro. Si el segmento activo supera `maxSegmentBytes` (por ejemplo 1 MB), se cierra y se abre uno nuevo.
2. **Lectura**: se busca la clave en el índice, se hace `fs.readSync` en el offset y se decodifica. Un solo acceso a disco por lectura.
3. **Borrado**: se escribe una tombstone y se elimina la clave del índice.
4. **Arranque**: se recorren los segmentos en orden ascendente y se reconstruye el índice; el último registro de cada clave gana; las tombstones eliminan la clave. Un registro con CRC inválido al final del último segmento se trata como escritura incompleta y se trunca.
5. **Compactación**: toma todos los segmentos cerrados, escribe en un segmento nuevo solo el valor vigente de cada clave que siga viva en el índice y apunte a esos segmentos, y luego cambia el índice y borra los segmentos viejos. El segmento activo nunca se compacta.
6. **Durabilidad**: ofrece una opción `sync: "always" | "never"`. Con `always` llamas a `fs.fsyncSync` tras cada escritura; con `never` confías en el sistema operativo. Mide la diferencia.

### Por qué la compactación es segura

Los segmentos cerrados son inmutables, así que mientras compactas puedes seguir sirviendo lecturas desde ellos. El paso peligroso es el **cambio** del índice: hazlo solo después de que el segmento compactado esté completamente escrito y sincronizado con `fsync`. Si el proceso se cae antes, al arrancar verás segmentos viejos y quizá uno compactado a medias: el CRC y el orden por id de segmento te dicen qué descartar. Una forma simple de hacerlo atómico es escribir a `segment-XXXX.log.tmp` y renombrarlo con `fs.renameSync` (el rename es atómico en sistemas POSIX dentro del mismo directorio).

Cuidado con un detalle: un segmento compactado contiene valores **más viejos** que el segmento activo. Si al arrancar ordenas por id de segmento, el compactado debe tener un id menor que el activo; asígnale un id que preceda al activo (por ejemplo, reserva ids o usa un número de generación) para que la regla "el último registro gana" siga siendo correcta.

## Qué hacer

1. **Estructura del proyecto** (30 min). Crea `kv/` con `src/record.ts` (encode/decode + CRC), `src/segment.ts` (abrir, append, read, scan), `src/store.ts` (`KVStore` con `set`, `get`, `delete`, `compact`, `close`) y `test/`. Usa el runner de tests que prefieras (`node:test` sirve sin dependencias).
2. **Registro y segmento** (40 min). Implementa `encodeRecord(key, value | null): Buffer` y `decodeRecord(buf, offset)`. Escribe tests: ida y vuelta de claves Unicode, valores vacíos, tombstones y detección de CRC corrupto (cambia un byte y comprueba que se rechaza).
3. **Índice y operaciones** (40 min). Implementa `set`, `get`, `delete` con rotación de segmentos por tamaño. Test: 10.000 escrituras sobre 100 claves con `maxSegmentBytes` pequeño generan varios segmentos y `get` devuelve siempre el último valor.
4. **Recuperación tras crash** (30 min). Test que escribe datos, cierra, añade al final del último segmento la mitad de un registro (simulando un crash) y reabre: el store arranca, trunca la cola corrupta y conserva todos los registros completos.
5. **Compactación** (40 min). Implementa `compact()`. Test: tras 10.000 actualizaciones sobre 100 claves y 10 borrados, `compact()` deja los datos en disco con un tamaño cercano a 90 registros vivos, `get` sigue devolviendo lo mismo antes y después, y las claves borradas siguen devolviendo `undefined` también tras reabrir.
6. **Medición** (20 min). Un script `bench.ts` que mida operaciones por segundo de `set` con `sync: "always"` y `sync: "never"`, y de `get` aleatorio sobre 100.000 claves. Anota los números en un `NOTES.md` dentro de tu proyecto.
7. **Reflexión** (20 min). En `NOTES.md` responde: ¿qué pasaría con 100 millones de claves? ¿Cómo añadirías consultas por rango? (Pista: SSTables y memtable de la sesión 04.)

Criterio de terminado: todos los tests pasan (`node --test` o tu runner), el benchmark imprime ops/s para los tres casos y `NOTES.md` explica con números el coste de `fsync` y el límite de RAM del hash index.

Extensión opcional: escribe un archivo *hint* por segmento cerrado (clave → offset) para arrancar sin escanear los datos, y compara el tiempo de arranque con y sin hints.

## Conceptos clave

- **Segmento activo**: el único archivo donde se escribe; los demás son inmutables.
- **Hint file**: snapshot del índice de un segmento para acelerar el arranque.
- **fsync**: llamada que obliga al sistema operativo a escribir los datos al dispositivo físico.
- **Rename atómico**: técnica para publicar un archivo nuevo de forma indivisible.

## Preguntas de repaso

1. ¿Por qué el segmento compactado debe ordenarse antes que el segmento activo al reconstruir el índice?
   R: Porque contiene valores escritos antes que los del segmento activo; si se procesara después, la regla "el último registro gana" sobrescribiría valores nuevos con viejos y resucitaría datos obsoletos.
2. ¿Qué protege el CRC y qué no protege?
   R: Detecta registros corruptos o escritos a medias (por un crash o un error de disco) para descartarlos. No protege contra pérdida de datos que nunca llegaron al disco por falta de fsync, ni contra errores lógicos de la aplicación.
3. ¿Por qué `sync: "always"` es mucho más lento y cuándo merece la pena?
   R: Porque cada escritura espera a que el dispositivo confirme la persistencia física, y eso cuesta milisegundos frente a microsecundos de escribir al cache del sistema operativo. Merece la pena cuando perder las últimas escrituras confirmadas es inaceptable (por ejemplo, pagos); se puede amortizar agrupando escrituras (group commit).

## Explícalo con tus palabras

Explica en cinco frases cómo tu store sobrevive a que alguien desenchufe la máquina en mitad de una escritura y en mitad de una compactación.
