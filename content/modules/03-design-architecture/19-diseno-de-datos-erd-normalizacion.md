---
title: "Diseño de datos: diagramas entidad-relación, claves y normalización"
kind: lesson
hours: 2
sources: Systems Analysis and Design 9.ª ed., cap. 9 "Data Design" (pp. 412–459)
---

## Objetivo

Saber diseñar la estructura de datos de un sistema: identificar entidades y relaciones con un diagrama entidad-relación (ERD) y su cardinalidad en notación pata de gallo, elegir claves (primaria, candidata, foránea, secundaria) y normalizar tablas hasta la tercera forma normal, entendiendo cuándo y por qué desnormalizar.

## Estudio

### Por qué el diseño de datos es una decisión de arquitectura

Los datos suelen vivir más que el código: una aplicación se reescribe, pero la base de datos de clientes de hace 15 años sigue ahí. Además, en la sesión 14 viste que un esquema de base de datos del que dependen muchos módulos cae en la **zona de dolor**. Diseñar bien los datos desde el principio reduce ese dolor, y saber cuándo un dato es "del dominio" y cuándo es "de persistencia" es una de las habilidades centrales que vas a necesitar en DDD y Clean Architecture.

### Conceptos básicos

El libro contrasta los **sistemas de archivos** tradicionales (cada aplicación con sus propios archivos, datos duplicados e inconsistentes) con el enfoque de **base de datos**, donde un sistema gestor de bases de datos (DBMS) ofrece un almacén integrado y compartido. Ventajas del enfoque de base de datos: escalabilidad, mejor soporte para usuarios y aplicaciones, estándares, flexibilidad, menos redundancia, mejor seguridad e integridad. El costo: mayor complejidad, dependencia de un componente central y riesgos si falla.

Un DBMS incluye una **interfaz** para usuarios y aplicaciones (lenguajes de consulta como SQL), un **lenguaje de manipulación de datos** (DML), un **lenguaje de definición de datos** (DDL) para el esquema, y un **diccionario de datos** del propio sistema.

#### Terminología

| Término | Significado |
| --- | --- |
| **Entidad** | Persona, lugar, cosa o evento sobre el que se recogen y mantienen datos: CLIENTE, PEDIDO, PRODUCTO. |
| **Tabla (archivo)** | Conjunto de registros de una entidad. |
| **Campo (atributo)** | Una característica de la entidad: nombre, email, fecha. |
| **Registro (tupla)** | Una instancia concreta de la entidad: un cliente concreto. |

### Las claves

| Clave | Qué es | Ejemplo |
| --- | --- | --- |
| **Primaria** | Campo o combinación de campos que identifica de forma única cada registro. | `cliente_id`; o `(pedido_id, producto_id)` en una línea de pedido (clave **compuesta**). |
| **Candidata** | Cualquier campo que podría servir como clave primaria. | `email` o `numero_documento` en CLIENTE. |
| **Foránea** | Campo de una tabla que coincide con la clave primaria de otra y crea el vínculo. | `cliente_id` en PEDIDO. |
| **Secundaria** | Campo que se usa para buscar u ordenar registros pero que no es único. | `apellido`, `ciudad`. |

Un **campo común** aparece en varias tablas y forma la relación entre ellas. La **integridad referencial** es el conjunto de reglas que evita registros huérfanos o inconsistentes: no puedes crear un pedido para un cliente que no existe, ni borrar un cliente que tiene pedidos (o debes decidir explícitamente qué pasa con ellos).

Una decisión moderna importante es **clave natural vs. clave sustituta**. El número de documento parece una buena clave primaria, pero puede cambiar (errores de digitación, cambio de tipo de documento) o repetirse entre países. Por eso suele preferirse una clave sustituta sin significado (un UUID o un entero autoincremental) y mantener la natural como clave candidata con una restricción de unicidad.

### Diagramas entidad-relación (ERD)

Un **ERD** muestra las relaciones lógicas entre las entidades del sistema. Las entidades son rectángulos nombrados con **sustantivos singulares** y las relaciones se describen con **verbos** ("un cliente *hace* pedidos").

#### Tipos de relaciones

| Tipo | Significado | Ejemplo |
| --- | --- | --- |
| **1:1** | Cada instancia de A se relaciona con exactamente una de B. | Un vehículo de la empresa tiene una póliza de seguro. |
| **1:M** | Una instancia de A se relaciona con muchas de B, pero cada B con una sola A. | Un cliente hace muchos pedidos; cada pedido es de un cliente. |
| **M:N** | Muchas de A con muchas de B. | Un estudiante se inscribe en muchos cursos; un curso tiene muchos estudiantes. |

Una relación **M:N** no se puede implementar directamente en tablas relacionales: se resuelve con una **entidad asociativa** que tiene sus propios atributos. Entre PEDIDO y PRODUCTO aparece LÍNEA DE PEDIDO (con cantidad y precio unitario); entre ESTUDIANTE y CURSO aparece INSCRIPCIÓN (con fecha y nota). Fíjate en que la entidad asociativa casi siempre tiene **significado de negocio**: no es un artefacto técnico, es un concepto que el negocio usa.

#### Cardinalidad con notación pata de gallo

La **cardinalidad** precisa cuántas instancias de una entidad se relacionan con cuántas de otra, incluyendo si la relación es obligatoria u opcional. La notación más común es la **pata de gallo** (crow's foot):

```
  ──┼──   uno y solo uno (obligatorio)
  ──o┼─   cero o uno (opcional)
  ──┼<    uno o muchos
  ──o<    cero o muchos
```

```
 ┌──────────┐            ┌──────────┐            ┌──────────────┐            ┌──────────┐
 │ CLIENTE  │┼┼───────o< │ PEDIDO   │┼┼────────┼<│ LÍNEA PEDIDO │>o───────┼┼│ PRODUCTO │
 └──────────┘   hace     └──────────┘  contiene  └──────────────┘  aparece  └──────────┘
                                                                     en
 Un cliente hace cero o muchos pedidos; cada pedido es de exactamente un cliente.
 Un pedido contiene una o muchas líneas; cada línea pertenece a un pedido.
 Un producto aparece en cero o muchas líneas; cada línea es de un producto.
```

Igual que en UML, la cardinalidad codifica reglas: "un pedido contiene al menos una línea" es una regla de negocio que la base de datos no puede garantizar sola (no hay una restricción SQL sencilla para "al menos un hijo"), así que el **código del dominio** debe hacerla cumplir.

### Normalización

La **normalización** es el proceso de crear diseños de tablas asignando campos específicos a cada tabla para **minimizar la redundancia** y evitar anomalías al insertar, actualizar o borrar. Se avanza por formas normales.

#### Punto de partida: una tabla no normalizada

Una tabla está **no normalizada** si tiene **grupos repetidos**: varios valores para un mismo campo en un registro.

```
PEDIDO (no normalizado)
pedido_id │ fecha      │ cliente_id │ cliente_nombre │ productos
──────────┼────────────┼────────────┼────────────────┼─────────────────────────────────
1001      │ 2026-03-02 │ C7         │ Ana Ruiz       │ P1 Taladro x1 $200; P9 Broca x3 $15
1002      │ 2026-03-02 │ C7         │ Ana Ruiz       │ P9 Broca x10 $15
```

#### Primera forma normal (1NF)

Una tabla está en **1NF** si **no tiene grupos repetidos**: cada celda contiene un único valor. Se convierte el grupo repetido en filas y se elige una clave primaria adecuada (aquí, compuesta).

```
PEDIDO (1NF) — clave: (pedido_id, producto_id)
pedido_id │ producto_id │ fecha      │ cliente_id │ cliente_nombre │ prod_desc │ cantidad │ precio
1001      │ P1          │ 2026-03-02 │ C7         │ Ana Ruiz       │ Taladro   │ 1        │ 200
1001      │ P9          │ 2026-03-02 │ C7         │ Ana Ruiz       │ Broca     │ 3        │ 15
1002      │ P9          │ 2026-03-02 │ C7         │ Ana Ruiz       │ Broca     │ 10       │ 15
```

Ya no hay grupos repetidos, pero hay mucha redundancia: el nombre de Ana y la descripción "Broca" se repiten. Eso causa **anomalías**: si cambias la descripción del producto P9, debes actualizar muchas filas (y si olvidas una, hay datos inconsistentes); no puedes registrar un producto que todavía no se ha vendido; si borras el único pedido de un producto, pierdes su descripción.

#### Segunda forma normal (2NF)

Una tabla está en **2NF** si está en 1NF y **todos los campos que no son clave dependen de la clave primaria completa**, no solo de una parte. El problema se llama **dependencia parcial** y solo puede ocurrir cuando la clave es compuesta. Por eso, **una tabla en 1NF con clave de un solo campo está automáticamente en 2NF**.

En el ejemplo: `fecha`, `cliente_id` y `cliente_nombre` dependen solo de `pedido_id`; `prod_desc` depende solo de `producto_id`; `cantidad` y `precio` (el precio de esa venta) dependen de ambos. Se separa:

```
PEDIDO (pedido_id, fecha, cliente_id, cliente_nombre)
PRODUCTO (producto_id, prod_desc)
LINEA_PEDIDO (pedido_id, producto_id, cantidad, precio)
```

#### Tercera forma normal (3NF)

Una tabla está en **3NF** si está en 2NF y **ningún campo que no es clave depende de otro campo que no es clave** (no hay **dependencias transitivas**). En PEDIDO, `cliente_nombre` depende de `cliente_id`, que no es la clave: si Ana cambia su nombre, hay que actualizar todos sus pedidos. Se separa:

```
CLIENTE (cliente_id, cliente_nombre)
PEDIDO (pedido_id, fecha, cliente_id)            ← cliente_id es clave foránea
PRODUCTO (producto_id, prod_desc)
LINEA_PEDIDO (pedido_id, producto_id, cantidad, precio)
```

Una frase clásica resume las tres formas: cada campo que no es clave debe depender **de la clave, de toda la clave y de nada más que la clave**.

| Forma | Regla | Problema que elimina |
| --- | --- | --- |
| 1NF | Sin grupos repetidos; un valor por celda. | Campos multivaluados imposibles de consultar. |
| 2NF | Sin dependencias parciales de una clave compuesta. | Datos que dependen de una parte de la clave repetidos en muchas filas. |
| 3NF | Sin dependencias transitivas entre campos no clave. | Datos que dependen de otro campo no clave repetidos e inconsistentes. |

#### Un matiz de negocio: el precio histórico

Fíjate en que `precio` se quedó en LINEA_PEDIDO y no se movió a PRODUCTO. No es redundancia: el precio del producto hoy y el precio al que se vendió ese día son **conceptos distintos**. Si el taladro sube a 250, el pedido 1001 debe seguir valiendo 200. Normalizar bien exige entender el negocio, no solo aplicar reglas: dos campos con el mismo nombre pueden significar cosas distintas (¿recuerdas la duplicación accidental del SRP?).

### Desnormalizar a propósito

La normalización optimiza la **consistencia** y la facilidad de actualizar. A veces se sacrifica de forma consciente por **rendimiento de lectura**: guardar el total del pedido calculado, o el nombre del cliente en una tabla de reportes, para evitar uniones costosas. Las reglas para hacerlo bien:

- Decide desde dónde se mantiene la copia (un único proceso la actualiza).
- Documenta que es una copia y cuál es la fuente de verdad.
- Prefiere copias en modelos de lectura separados (proyecciones, vistas materializadas) antes que en las tablas transaccionales.

Lo verás con más detalle en el módulo de sistemas intensivos en datos.

### Códigos

El libro dedica una sección al uso de **códigos**: valores cortos que representan información más larga (`CO` para Colombia, `PEN` para pendiente). Tipos comunes: secuenciales, alfabéticos, de categoría, significativos (cada posición significa algo), de acción, de autoverificación (con dígito verificador, como en tarjetas o documentos de identidad).

Recomendaciones: mantenlos cortos y estables, permite la expansión, que sean fáciles de entender, evita códigos que puedan confundirse (como `O` y `0`) y documenta su significado en el diccionario de datos. En TypeScript, una unión de literales es una forma natural de modelarlos:

```ts
export const ORDER_STATUS = ["PEN", "PAG", "ENV", "CAN"] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PEN: "Pendiente", PAG: "Pagado", ENV: "Enviado", CAN: "Cancelado",
};
```

### Almacenamiento, acceso y control (en breve)

- **Índices**: estructuras que aceleran la búsqueda por un campo (una clave secundaria) a cambio de más espacio y escrituras algo más lentas. Indexa los campos por los que filtras u ordenas con frecuencia.
- **Modelos de bases de datos**: el libro se centra en el relacional, el dominante; hoy conviven con bases documentales, de clave-valor y de grafos, que relajan la normalización a cambio de otros beneficios.
- **Control de datos**: permisos por usuario y rol, contraseñas, cifrado, registros de auditoría (quién cambió qué y cuándo) y respaldos con procedimientos de recuperación probados.

### Del ERD al DDL: que la base de datos defienda lo que pueda

El diseño normalizado se traduce a sentencias de definición de datos (DDL). Aprovecha para que la base de datos haga cumplir todas las reglas que **puede** expresar: claves, unicidad, valores válidos e integridad referencial. Lo que no pueda expresar (como "al menos una línea por pedido"), lo hará el dominio.

```sql
CREATE TABLE cliente (
  cliente_id     TEXT PRIMARY KEY,                 -- clave sustituta
  documento      TEXT NOT NULL UNIQUE,             -- clave candidata
  nombre         TEXT NOT NULL
);

CREATE TABLE pedido (
  pedido_id      TEXT PRIMARY KEY,
  fecha          TEXT NOT NULL,
  cliente_id     TEXT NOT NULL REFERENCES cliente(cliente_id) ON DELETE RESTRICT,
  estado         TEXT NOT NULL CHECK (estado IN ('PEN','PAG','ENV','CAN'))
);

CREATE TABLE linea_pedido (
  pedido_id      TEXT NOT NULL REFERENCES pedido(pedido_id) ON DELETE CASCADE,
  producto_id    TEXT NOT NULL REFERENCES producto(producto_id),
  cantidad       INTEGER NOT NULL CHECK (cantidad > 0),
  precio         INTEGER NOT NULL CHECK (precio >= 0),   -- en centavos, precio de esa venta
  PRIMARY KEY (pedido_id, producto_id)
);

CREATE INDEX idx_pedido_cliente ON pedido(cliente_id);  -- clave secundaria frecuente
```

Fíjate en las decisiones: `ON DELETE RESTRICT` impide borrar un cliente con pedidos (integridad referencial), `ON DELETE CASCADE` borra las líneas con su pedido (composición: las partes no existen sin el todo), los `CHECK` repiten reglas simples del dominio como red de seguridad y el índice acelera la consulta más común. Guardar dinero como entero en centavos evita errores de redondeo con decimales de punto flotante. Que la regla esté también en la base de datos no sustituye a la validación del dominio: es una segunda línea de defensa ante scripts, migraciones o errores de código.

### Del ERD al código TypeScript

El modelo normalizado no tiene por qué ser idéntico al modelo de objetos del dominio. Un pedido del dominio puede contener sus líneas como una colección (composición), aunque en la base de datos estén en dos tablas:

```ts
// Dominio: un objeto con sus partes
export interface OrderLine { productId: string; quantity: number; unitPrice: number }
export interface Order { id: string; customerId: string; date: string; lines: OrderLine[] }

// Persistencia: filas normalizadas
interface OrderRow { pedido_id: string; fecha: string; cliente_id: string }
interface LineRow { pedido_id: string; producto_id: string; cantidad: number; precio: number }

export function toDomain(o: OrderRow, lines: LineRow[]): Order {
  return {
    id: o.pedido_id, customerId: o.cliente_id, date: o.fecha,
    lines: lines.filter((l) => l.pedido_id === o.pedido_id)
                .map((l) => ({ productId: l.producto_id, quantity: l.cantidad, unitPrice: l.precio })),
  };
}
```

Esa función de mapeo es un pequeño **adaptador** entre el modelo relacional y el de dominio. Mantenerlos separados es lo que permite que el esquema evolucione sin romper las reglas de negocio, y viceversa.

### Analogía de construcción

Normalizar es como organizar el **almacén de materiales** de una obra. Si cada cuadrilla guarda su propia lista de proveedores con teléfonos (grupos repetidos y redundancia), cuando un proveedor cambia de número, alguien seguirá llamando al viejo. La solución es un directorio único de proveedores (3NF) y que cada pedido de material referencie al proveedor por su código. Pero el **precio al que se compró** cada lote se anota en el pedido, no en el directorio: el precio de hoy no cambia lo que pagaste ayer.

### Errores comunes

- **Guardar listas en un campo** ("P1,P9,P12") rompe la 1NF y hace imposibles las consultas.
- **Usar claves naturales cambiantes** como primarias (email, documento).
- **Normalizar sin entender el negocio** y mover el precio de venta a la tabla de productos.
- **Desnormalizar por intuición** sin medir y sin una única fuente de verdad.
- **Olvidar la integridad referencial** y llenar la base de huérfanos.
- **Copiar el esquema de tablas como modelo de dominio** sin pensar en reglas e invariantes.

### Resumen

El diseño de datos identifica entidades, sus claves y sus relaciones (1:1, 1:M, M:N resueltas con entidades asociativas) en un ERD con cardinalidad en notación pata de gallo. La normalización elimina redundancia y anomalías: 1NF quita grupos repetidos, 2NF quita dependencias parciales de claves compuestas y 3NF quita dependencias transitivas. Normalizar bien exige entender el negocio, y desnormalizar debe ser una decisión consciente con una fuente de verdad clara. El modelo relacional y el de dominio pueden diferir y se conectan con un adaptador.

## Conceptos clave

- **Entidad**: persona, lugar, cosa o evento sobre el que se guardan datos.
- **Clave primaria, candidata, foránea y secundaria**: identificador único; alternativa posible; vínculo con otra tabla; campo de búsqueda no único.
- **Integridad referencial**: reglas que impiden registros huérfanos o vínculos inválidos.
- **ERD**: diagrama de entidades y sus relaciones.
- **Entidad asociativa**: entidad que resuelve una relación M:N y tiene sus propios atributos.
- **Notación pata de gallo**: símbolos que expresan cardinalidad mínima y máxima en un ERD.
- **Normalización**: proceso de asignar campos a tablas para minimizar redundancia y anomalías.
- **Dependencia parcial**: un campo depende solo de una parte de una clave compuesta (viola 2NF).
- **Dependencia transitiva**: un campo no clave depende de otro campo no clave (viola 3NF).
- **Desnormalización**: introducir redundancia de forma deliberada para mejorar el rendimiento de lectura.

## Preguntas de repaso

1. ¿Cómo se implementa una relación M:N en un modelo relacional?
   R: Con una entidad asociativa intermedia que tiene una clave compuesta por las claves de ambas entidades (o una propia) y sus propios atributos de negocio, como LÍNEA DE PEDIDO entre PEDIDO y PRODUCTO, con cantidad y precio.
2. ¿Qué exige cada una de las tres primeras formas normales?
   R: 1NF: no tener grupos repetidos (un solo valor por celda). 2NF: estar en 1NF y que ningún campo no clave dependa solo de una parte de una clave compuesta. 3NF: estar en 2NF y que ningún campo no clave dependa de otro campo no clave.
3. ¿Por qué una tabla en 1NF con clave primaria de un solo campo está automáticamente en 2NF?
   R: Porque la dependencia parcial solo puede existir cuando la clave es compuesta; si la clave es un solo campo, no hay "parte" de la clave de la que un atributo pueda depender.
4. ¿Qué anomalías evita la normalización?
   R: De actualización (cambiar un dato repetido en muchas filas y dejar inconsistencias), de inserción (no poder registrar algo sin otro dato, como un producto sin pedido) y de borrado (perder información al borrar un registro, como la descripción del único producto vendido).
5. ¿Por qué el precio de venta se queda en la línea de pedido y no en el producto?
   R: Porque son conceptos distintos: el precio actual del producto y el precio al que se vendió en una fecha. Moverlo al producto cambiaría el valor de los pedidos históricos al actualizar el precio. Normalizar exige entender el significado de negocio de cada campo.
6. ¿Cuándo es razonable desnormalizar y qué reglas seguir?
   R: Cuando se mide un problema de rendimiento de lectura que justifica guardar datos derivados o copiados. Hay que tener una única fuente de verdad, un único proceso que mantiene la copia, documentarlo y preferir modelos de lectura separados en lugar de duplicar en las tablas transaccionales.
7. ¿Por qué suele preferirse una clave sustituta a una clave natural como primaria?
   R: Porque las claves naturales (documento, email) pueden cambiar, tener errores o repetirse entre contextos, y cambiar una clave primaria obliga a actualizar todas las claves foráneas. Una clave sustituta sin significado es estable; la natural se mantiene como candidata con restricción de unicidad.

## Ejercicio

Parte de esta hoja de cálculo de una academia: `inscripcion(estudiante_doc, estudiante_nombre, estudiante_email, cursos: "MAT101 Álgebra Prof. Gómez; FIS100 Física Prof. Ruiz", fechas_inscripcion, notas)`. (a) Dibuja el ERD en notación pata de gallo con la cardinalidad de cada relación; (b) lleva el diseño paso a paso a 1NF, 2NF y 3NF, escribiendo en cada paso qué dependencia eliminaste; (c) escribe el DDL SQL final con claves primarias, foráneas y restricciones de unicidad; (d) implementa en TypeScript una función `toDomain` que construya un objeto `Estudiante` con sus inscripciones a partir de las filas normalizadas, con un test de Vitest. **Terminado cuando:** el diseño final no tiene grupos repetidos, dependencias parciales ni transitivas (justifícalo campo por campo), el DDL se ejecuta sin errores en SQLite y el test de mapeo pasa.

## Explícalo con tus palabras

Explica con el ejemplo del directorio de proveedores de una obra qué problema resuelve la normalización y por qué el precio pagado no debe moverse al directorio.
