---
title: Codificación de datos y evolución de esquemas
kind: lesson
hours: 2
sources: Designing Data-Intensive Applications (Kleppmann), cap. 4 (pp. 133–150)
links: Protocol Buffers, guía del lenguaje | https://protobuf.dev/programming-guides/proto3/ ; Apache Avro, especificación | https://avro.apache.org/docs/current/specification/
---

## Objetivo

Entender cómo se codifican los datos para guardarlos o enviarlos (JSON, formatos binarios, Thrift, Protocol Buffers, Avro) y cómo cada formato permite que el esquema cambie sin romper la compatibilidad hacia atrás y hacia delante.

## Estudio

### El cambio es inevitable

Las aplicaciones cambian: añades funciones, entiendes mejor a los usuarios, cambia el negocio. Casi siempre esos cambios tocan los datos: un campo nuevo, un formato distinto para uno existente. En la sesión 02 viste que las bases relacionales tienen un esquema explícito que cambia con migraciones, y que las de documentos son schema-on-read y pueden tener datos viejos y nuevos mezclados.

Cuando cambia el formato de los datos, el código que los usa también debe cambiar. Pero en una aplicación grande **el código no cambia en todas partes a la vez**:

- En el servidor haces un **rolling upgrade**: despliegas la versión nueva en unos pocos nodos, compruebas que va bien y avanzas poco a poco. Así no hay downtime y despliegas más a menudo.
- En el cliente dependes del usuario, que puede no actualizar la app durante meses.

Por tanto, **versiones viejas y nuevas del código, y formatos de datos viejos y nuevos, conviven a la vez**. Para que el sistema siga funcionando necesitas compatibilidad en ambas direcciones:

| Tipo | Definición | Dificultad |
| --- | --- | --- |
| **Backward compatibility** | El código **nuevo** puede leer datos escritos por código **viejo** | Normalmente fácil: el autor del código nuevo conoce el formato viejo |
| **Forward compatibility** | El código **viejo** puede leer datos escritos por código **nuevo** | Más difícil: el código viejo debe ignorar lo que no entiende |

### Codificar: de memoria a bytes

Un programa trabaja con datos en al menos dos representaciones:

1. **En memoria**: objetos, structs, listas, arrays, hash tables, árboles. Optimizados para que la CPU acceda y manipule (normalmente con punteros).
2. **Para escribir en un archivo o enviar por red**: una secuencia autocontenida de bytes. Los punteros no tienen sentido fuera de tu proceso.

La traducción de memoria a bytes se llama **encoding** (también *serialization* o *marshalling*); la inversa, **decoding** (*parsing*, *deserialization*, *unmarshalling*). Ojo: "serialización" también se usa en transacciones con otro significado (sesión 16), por eso el libro prefiere "encoding".

### Formatos específicos de un lenguaje

Muchos lenguajes traen soporte nativo: `java.io.Serializable`, `pickle` en Python, `Marshal` en Ruby. Son cómodos (guardas y restauras objetos con muy poco código), pero tienen problemas graves:

- **Atan al lenguaje**: leer datos de Java desde Python es muy difícil, y quedas encerrado en una tecnología.
- **Seguridad**: para restaurar objetos, el decodificador debe poder instanciar clases arbitrarias. Si un atacante consigue que tu aplicación decodifique bytes manipulados, puede instanciar clases que ejecuten código. Las vulnerabilidades de deserialización de Java son famosas por esto.
- **Versionado descuidado**: suelen ignorar la compatibilidad hacia atrás y hacia delante.
- **Eficiencia**: la serialización nativa de Java es conocida por su mal rendimiento y su tamaño inflado.

Regla práctica: **no uses la codificación nativa de tu lenguaje más allá de usos muy temporales**.

### JSON, XML y CSV

Son formatos textuales, legibles por humanos y estándar. Muy populares, pero con problemas sutiles:

- **Ambigüedad con los números**. XML y CSV no distinguen un número de una cadena de dígitos (salvo con un esquema externo). JSON distingue números de strings, pero **no enteros de decimales** y no especifica precisión. Los números mayores que 2^53 no se representan exactamente en un `double` de IEEE 754, que es lo que usa JavaScript. Twitter tenía este problema: los IDs de tweets son de 64 bits, así que su API devuelve el ID **dos veces**: como número JSON y como string decimal, porque las apps JavaScript leían mal los números.
- **No soportan cadenas binarias** (bytes sin codificación de caracteres). Se suele usar Base64, que funciona pero es un hack y aumenta el tamaño un 33 %.
- **Esquemas opcionales y complejos**. XML Schema y JSON Schema existen, pero son difíciles de aprender; muchas herramientas JSON no los usan, así que la interpretación correcta acaba codificada en la aplicación.
- **CSV no tiene esquema**: el significado de cada columna lo define la aplicación. Además, no todos los parsers implementan bien el escapado de comas y saltos de línea dentro de valores.

Pese a todo, para **intercambiar datos entre organizaciones** son muy buenos: lo difícil es que se pongan de acuerdo en algo, y el formato importa menos.

```ts
// Prueba en Node: el problema de los números grandes
JSON.parse('{"id": 1234567890123456789}').id;
// → 1234567890123456800  (¡se perdió precisión!)
```

### Variantes binarias de JSON

Para datos internos de una organización, puedes elegir formatos más compactos o rápidos. Existen variantes binarias de JSON (MessagePack, BSON, BJSON, UBJSON, BISON, Smile) y de XML (WBXML, Fast Infoset). Algunas añaden tipos (enteros vs decimales, binarios), pero **mantienen el modelo de JSON sin esquema**, así que deben incluir los **nombres de los campos** dentro de los datos codificados.

Ejemplo del libro, este registro:

```json
{ "userName": "Martin", "favoriteNumber": 1337, "interests": ["daydreaming", "hacking"] }
```

En JSON textual sin espacios ocupa 81 bytes. En **MessagePack**, 66 bytes. Una reducción pequeña, y pierdes legibilidad. Veremos que se puede hacer mucho mejor.

### Thrift y Protocol Buffers

**Apache Thrift** (creado en Facebook) y **Protocol Buffers** (creado en Google) son bibliotecas de codificación binaria basadas en el mismo principio, publicadas como open source en 2007–08. Ambas **requieren un esquema**:

```thrift
// Thrift IDL
struct Person {
  1: required string       userName,
  2: optional i64          favoriteNumber,
  3: optional list<string> interests
}
```

```protobuf
// Protocol Buffers
message Person {
  required string user_name       = 1;
  optional int64  favorite_number = 2;
  repeated string interests       = 3;
}
```

Ambas traen una herramienta de **generación de código** que produce clases en distintos lenguajes para codificar y decodificar.

La gran diferencia con MessagePack: **los datos codificados no contienen los nombres de los campos**. En su lugar contienen **field tags**, los números `1`, `2`, `3` del esquema. Son como alias compactos.

| Formato | Bytes para el registro de ejemplo | Cómo lo logra |
| --- | --- | --- |
| JSON textual | 81 | Nombres de campo y números como texto |
| MessagePack | 66 | Binario, pero sigue incluyendo nombres |
| Thrift BinaryProtocol | 59 | Tags en vez de nombres |
| Thrift CompactProtocol | 34 | Tipo y tag en un byte + enteros de longitud variable |
| Protocol Buffers | 33 | Similar a CompactProtocol |
| Avro | 32 | Ni tags ni tipos: solo valores concatenados |

Los **enteros de longitud variable** (varints) usan el bit superior de cada byte para indicar si quedan más bytes. El número 1337 ocupa 2 bytes en lugar de 8. Los números entre −64 y 63 caben en 1 byte; entre −8192 y 8191, en 2.

```
Protocol Buffers, campo 2 (favorite_number = 1337):
  byte de clave: (tag 2 << 3) | tipo 0 (varint)  = 0x10
  1337 en varint: 10111001 00001010  → 0xB9 0x0A
                  ▲ bit "hay más"     ▲ último byte
  total: 3 bytes en lugar de "favoriteNumber":1337 (21 bytes en JSON)
```

Un detalle: `required` y `optional` **no cambian la codificación**. `required` solo habilita una comprobación en tiempo de ejecución que falla si el campo no está.

#### Evolución con field tags

Un registro codificado es la concatenación de sus campos, cada uno identificado por su **tag** y anotado con su **tipo**. Si un campo no tiene valor, se omite. Por tanto, los tags son lo que da significado a los datos:

- **Puedes renombrar un campo**: los datos codificados nunca usan el nombre.
- **No puedes cambiar el tag de un campo**: invalidarías todos los datos existentes.
- **Puedes añadir campos nuevos con tags nuevos**. Si el código viejo lee datos nuevos y encuentra un tag desconocido, **lo ignora**; el tipo le dice cuántos bytes saltar. Eso da **forward compatibility**.
- **Backward compatibility**: mientras cada tag sea único, el código nuevo siempre lee datos viejos. Pero un campo **añadido después del despliegue inicial no puede ser `required`**: el código nuevo fallaría al leer datos viejos que no lo tienen. Todo campo nuevo debe ser opcional o tener valor por defecto.
- **Eliminar un campo** es como añadir pero al revés: solo puedes eliminar campos opcionales, y **nunca reutilizar ese tag** (en protobuf se marca con `reserved`).

Por estos problemas, **proto3 eliminó `required`**: todos los campos son opcionales de facto.

#### Cambiar tipos

Es posible pero arriesgado. Si cambias un entero de 32 bits a uno de 64 bits, el código nuevo lee bien los datos viejos (rellena con ceros), pero el código viejo que lea un valor de 64 bits lo meterá en una variable de 32 y lo **truncará**.

Protocol Buffers no tiene tipo lista; usa `repeated`, que significa que el mismo tag aparece varias veces. Ventaja: puedes cambiar un campo `optional` (un valor) a `repeated` (varios). El código nuevo que lee datos viejos ve una lista de cero o un elementos; el código viejo que lee datos nuevos ve solo el último elemento. Thrift tiene un tipo lista dedicado, que no permite esa evolución pero sí listas anidadas.

### Avro

**Apache Avro** nació en 2009 como subproyecto de Hadoop porque Thrift no encajaba bien. También usa un esquema, con dos sintaxis: **Avro IDL** para humanos y una basada en **JSON** para máquinas:

```
record Person {
  string               userName;
  union { null, long } favoriteNumber = null;
  array<string>        interests;
}
```

Su codificación es la más compacta (32 bytes en el ejemplo) porque **no contiene tags ni tipos**: solo los valores concatenados. Una cadena es un prefijo de longitud seguido de los bytes UTF-8; un entero es un varint (zigzag). Nada en los bytes dice si algo es un string o un entero.

¿Cómo se decodifica entonces? **Recorriendo los campos en el orden en que aparecen en el esquema** y usando el esquema para saber el tipo de cada uno. Esto implica que **el lector debe usar exactamente el mismo esquema que el escritor**… o uno compatible.

#### Esquema del escritor y esquema del lector

Aquí está la idea clave de Avro:

- El **writer's schema** es la versión del esquema que usó la aplicación al codificar.
- El **reader's schema** es la versión que espera la aplicación que decodifica (con la que se compiló o generó su código).

No tienen por qué ser iguales, solo **compatibles**. Al decodificar, la biblioteca Avro **resuelve las diferencias** comparando ambos esquemas lado a lado:

```
writer's schema            reader's schema           resultado
───────────────            ───────────────           ─────────
userName: string     ───►  userName: string          se copia
favoriteNumber: long ───►  (no existe)               se ignora
interests: array     ───►  interests: array          se copia
(no existe)                photoUrl: string = null   se usa el default
```

- Campos en orden distinto: no importa, se emparejan **por nombre**.
- Campo que el escritor tiene y el lector no: se ignora.
- Campo que el lector espera y el escritor no escribió: se rellena con el **valor por defecto** del esquema del lector.

#### Reglas de evolución en Avro

- Para mantener compatibilidad, **solo puedes añadir o eliminar campos que tengan valor por defecto**.
  - Si añades un campo con default: el lector nuevo que lee datos viejos usa el default (backward compatible).
  - Si eliminas un campo con default: el lector viejo que lee datos nuevos usa el default (forward compatible).
- `null` no es un valor válido por defecto para cualquier campo: para permitir null debes usar un **union type** (`union { null, long } field = null`). Es más verboso, pero evita bugs por nulls inesperados. Avro no tiene marcadores `optional`/`required`: usa unions y defaults.
- Cambiar el tipo es posible si Avro sabe convertirlo (por ejemplo, int a long).
- Cambiar el nombre de un campo es posible con **aliases** en el esquema del lector: es backward compatible pero no forward compatible.
- Añadir una rama a un union es backward compatible pero no forward compatible.

#### ¿Cómo sabe el lector cuál era el esquema del escritor?

No puedes meter el esquema completo en cada registro: sería más grande que los datos. Depende del contexto:

| Contexto | Solución |
| --- | --- |
| **Archivo grande con muchos registros** (típico en Hadoop) | El esquema del escritor va **una sola vez al principio del archivo** (*object container files*) |
| **Base de datos con registros escritos en distintos momentos** | Cada registro lleva un **número de versión** y una tabla mapea versión → esquema (Espresso, de LinkedIn) |
| **Comunicación por red** | Las dos partes negocian la versión del esquema al establecer la conexión (Avro RPC) |

Hoy, con **Kafka**, lo habitual es un **schema registry** (Confluent Schema Registry, AWS Glue Schema Registry): cada mensaje lleva un ID de esquema de pocos bytes y el registro valida que cada nueva versión sea compatible según la política configurada (`BACKWARD`, `FORWARD`, `FULL`).

#### Esquemas generados dinámicamente

Una ventaja fuerte de Avro frente a protobuf: como no usa tags, es amigable con **esquemas generados automáticamente**. Si quieres volcar una base relacional a un archivo, generas un esquema Avro a partir del esquema relacional (cada tabla un record, cada columna un campo). Si el esquema de la base cambia (se añade o quita una columna), generas un esquema Avro nuevo y los campos se emparejan por nombre. Con Thrift o protobuf tendrías que asignar tags a mano y cuidar no reutilizarlos.

#### Generación de código y lenguajes dinámicos

Thrift y protobuf dependen de la generación de código, útil en lenguajes de tipado estático (Java, C++, Go, TypeScript) porque obtienes tipos y autocompletado. En lenguajes dinámicos (JavaScript, Ruby, Python) generar código aporta menos. Avro ofrece generación opcional, pero también funciona sin ella: un *object container file* es **autodescriptivo**, así que puedes abrirlo con la biblioteca de Avro y leerlo como si fuera JSON. Por eso encaja con herramientas de análisis como Apache Pig.

### El valor de los esquemas

Los esquemas binarios (protobuf, Thrift, Avro) son mucho más simples que XML Schema o JSON Schema, y se han extendido a muchos lenguajes. La idea no es nueva: **ASN.1** (estandarizado en 1984) usa tags numéricos parecidos y aún se usa para certificados SSL (X.509). Muchas bases de datos también tienen su protocolo binario propio con drivers que lo decodifican.

Ventajas de los formatos binarios con esquema:

1. **Mucho más compactos** que las variantes binarias de JSON, porque omiten los nombres de los campos.
2. **El esquema es documentación** que siempre está actualizada, porque es necesaria para decodificar.
3. **Una base de esquemas** permite comprobar compatibilidad hacia atrás y hacia delante **antes de desplegar**.
4. En lenguajes tipados, la **generación de código** permite comprobar tipos en compilación.

En resumen: la evolución de esquemas da la misma flexibilidad que las bases schema-on-read, con mejores garantías y mejores herramientas.

### Ideas erróneas frecuentes

- **"JSON es suficiente para todo."** Pierde precisión en enteros de 64 bits, no tiene binarios y desperdicia espacio en nombres de campos.
- **"Puedo renumerar tags en protobuf si renombro campos."** Renombrar es seguro; cambiar o reutilizar tags corrompe la interpretación de datos existentes.
- **"Puedo añadir un campo obligatorio sin problemas."** Rompe la backward compatibility: los datos viejos no lo tienen.
- **"Avro necesita el mismo esquema para escribir y leer."** Necesita esquemas compatibles; la biblioteca resuelve las diferencias.
- **"Backward y forward compatibility son lo mismo."** Backward: lo nuevo lee lo viejo. Forward: lo viejo lee lo nuevo.

### Resumen

En un sistema real conviven versiones viejas y nuevas de código y datos, así que necesitas backward y forward compatibility. Los formatos nativos de lenguaje son peligrosos; JSON/XML/CSV son universales pero ambiguos y verbosos. Thrift y Protocol Buffers usan tags numéricos que permiten renombrar y añadir campos opcionales. Avro omite tags y tipos, y resuelve las diferencias entre el esquema del escritor y el del lector por nombre y con defaults, lo que lo hace ideal para esquemas generados dinámicamente.

## Conceptos clave

- **Encoding / decoding**: traducir entre la representación en memoria y una secuencia de bytes.
- **Backward compatibility**: el código nuevo lee datos escritos por código viejo.
- **Forward compatibility**: el código viejo lee datos escritos por código nuevo.
- **Rolling upgrade**: desplegar una versión nueva nodo a nodo, sin downtime.
- **Field tag**: número que identifica un campo en Thrift y protobuf.
- **Varint**: entero de longitud variable donde un bit por byte indica si hay más bytes.
- **Writer's schema / reader's schema**: esquemas de quien codificó y de quien decodifica en Avro.
- **Schema resolution**: emparejar campos de ambos esquemas por nombre y aplicar defaults.
- **Union type**: tipo de Avro que admite varias alternativas, por ejemplo null o long.
- **Schema registry**: servicio que versiona esquemas y valida compatibilidad.

## Preguntas de repaso

1. ¿Por qué un rolling upgrade obliga a pensar en forward compatibility?
   R: Porque durante el despliegue conviven nodos con código viejo y nuevo; los nodos nuevos escriben datos con el formato nuevo y los nodos viejos pueden leerlos, así que el código viejo debe tolerar campos que no conoce.
2. ¿Qué cambios de esquema son seguros en Protocol Buffers?
   R: Renombrar campos (la codificación usa tags, no nombres), añadir campos nuevos con tags nuevos que sean opcionales o con default, y eliminar campos opcionales sin reutilizar jamás su tag. Cambiar un tag o añadir un campo requerido rompe la compatibilidad.
3. ¿Cómo logra el código viejo ignorar un campo nuevo en protobuf?
   R: Cada campo codificado lleva su tag y su tipo; al encontrar un tag desconocido, el parser usa el tipo (y la longitud, si aplica) para saber cuántos bytes saltar y continúa.
4. ¿Por qué Avro es más compacto que protobuf y qué precio paga?
   R: Porque no codifica tags ni tipos, solo los valores concatenados en el orden del esquema. El precio es que el lector necesita conocer exactamente el esquema del escritor para decodificar, por lo que hay que transmitirlo o referenciarlo (cabecera de archivo, versión por registro, negociación o schema registry).
5. En Avro, ¿qué pasa si el lector espera un campo que el escritor no escribió?
   R: La biblioteca rellena ese campo con el valor por defecto definido en el esquema del lector; si no tiene default, la lectura es incompatible. Por eso solo se pueden añadir campos con default.
6. ¿Por qué Avro es más adecuado que protobuf para volcar una base de datos con esquema cambiante?
   R: Porque el esquema Avro puede generarse automáticamente desde el esquema relacional y los campos se emparejan por nombre; con protobuf habría que asignar y mantener tags manualmente, cuidando no reutilizarlos.
7. Nombra dos problemas de JSON como formato de intercambio.
   R: No distingue enteros de decimales ni garantiza precisión, por lo que enteros mayores que 2^53 se corrompen en JavaScript; y no soporta datos binarios, que deben codificarse en Base64 con un 33 % más de tamaño. Además, los esquemas son opcionales y complejos.

## Ejercicio

En TypeScript, implementa a mano una codificación tipo protobuf para el registro `Person`:

1. Escribe `encodeVarint(n)` y `decodeVarint(buf, offset)` para enteros no negativos.
2. Escribe `encodePerson(p)` que genere, por cada campo presente, una clave `(tag << 3) | wireType` (0 = varint, 2 = longitud + bytes) y el valor. `interests` se codifica como varios campos con tag 3.
3. Escribe `decodePerson(buf)` que ignore cualquier tag desconocido saltando sus bytes según el wire type.
4. Simula evolución: crea una "v2" que añade `photoUrl` con tag 4 y comprueba que el decodificador v1 lee datos v2 (forward) y el decodificador v2 lee datos v1 (backward, con `photoUrl` undefined).
5. Compara el tamaño en bytes con `JSON.stringify` del mismo objeto.

Criterio de terminado: el registro de ejemplo (`Martin`, `1337`, dos intereses) ocupa 33 bytes con tu codificación, y los dos tests de compatibilidad pasan.

## Explícalo con tus palabras

Explica la diferencia entre backward y forward compatibility usando el ejemplo de una app móvil que el usuario no actualiza durante seis meses.
