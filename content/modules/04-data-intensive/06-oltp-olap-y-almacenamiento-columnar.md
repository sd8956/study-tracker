---
title: OLTP, OLAP y almacenamiento columnar
kind: lesson
hours: 2
sources: Designing Data-Intensive Applications (Kleppmann), cap. 3 (pp. 112–125)
links: Apache Parquet, formato de archivo | https://parquet.apache.org/docs/file-format/ ; ClickHouse, por qué columnar | https://clickhouse.com/docs/en/faq/general/columnar-database
---

## Objetivo

Distinguir las cargas transaccionales (OLTP) de las analíticas (OLAP), entender por qué existen los data warehouses y los esquemas en estrella, y cómo el almacenamiento orientado a columnas, la compresión y las vistas materializadas hacen rápidas las consultas analíticas.

## Estudio

### Dos formas muy distintas de usar una base de datos

En los primeros días del procesamiento de datos, una escritura en la base de datos solía corresponder a una **transacción comercial**: una venta, un pedido a un proveedor, el pago de un salario. Con el tiempo las bases se usaron para cosas que no implican dinero, pero el término **transacción** se quedó para referirse a un grupo de lecturas y escrituras que forman una unidad lógica.

El patrón típico de una aplicación es: buscar un pequeño número de registros por alguna clave usando un índice, e insertar o actualizar registros según lo que hace el usuario. Como estas aplicaciones son **interactivas**, a este patrón se le llama **OLTP** (*online transaction processing*).

Pero las bases de datos empezaron a usarse también para **analítica**, con un patrón completamente distinto: una consulta analítica recorre **un número enorme de registros**, lee **solo unas pocas columnas** de cada uno y calcula **agregados** (sumas, conteos, promedios) en lugar de devolver los datos crudos. Ejemplos:

- ¿Cuántos ingresos generó cada tienda en enero?
- ¿Cuántas más bananas que de costumbre vendimos durante la última promoción?
- ¿Qué marca de comida para bebés se compra más junto con la marca X de pañales?

Estas consultas las escriben analistas y alimentan informes para la toma de decisiones (*business intelligence*). A este patrón se le llama **OLAP** (*online analytic processing*).

| Propiedad | OLTP (transaccional) | OLAP (analítica) |
| --- | --- | --- |
| Patrón de lectura | Pocos registros por consulta, buscados por clave | Agregados sobre muchísimos registros |
| Patrón de escritura | Escrituras aleatorias de baja latencia desde la entrada del usuario | Carga masiva (ETL) o flujo de eventos |
| Usado principalmente por | Usuarios finales, a través de una aplicación web | Analistas internos, para decidir |
| Qué representan los datos | El estado actual (en un momento dado) | El historial de eventos ocurridos a lo largo del tiempo |
| Tamaño del dataset | Gigabytes a terabytes | Terabytes a petabytes |
| Cuello de botella típico | Tiempo de búsqueda en disco (seek) | Ancho de banda de disco |

Al principio se usaban las mismas bases para ambas cosas (SQL sirve bien para las dos). A finales de los 80 y en los 90 surgió una tendencia: dejar de ejecutar analítica sobre los sistemas OLTP y hacerlo en una base separada, el **data warehouse**.

### El data warehouse

Una empresa grande tiene decenas de sistemas transaccionales distintos: el sitio web de clientes, el punto de venta de las tiendas, el seguimiento de inventario, la logística de vehículos, la gestión de proveedores, recursos humanos. Cada uno es complejo, lo mantiene un equipo distinto y opera de forma casi autónoma.

Esos sistemas OLTP necesitan alta disponibilidad y baja latencia, porque suelen ser críticos para el negocio. Los administradores de bases de datos no quieren que un analista lance una consulta enorme sobre ellos: esas consultas recorren gran parte del dataset y dañan el rendimiento de las transacciones concurrentes.

El **data warehouse** es una base de datos separada que los analistas pueden consultar a gusto sin afectar a las operaciones. Contiene una **copia de solo lectura** de los datos de todos los sistemas OLTP de la empresa. Los datos se extraen (como volcados periódicos o como flujo continuo de cambios), se transforman a un esquema amigable para análisis, se limpian y se cargan. A este proceso se le llama **ETL** (*Extract–Transform–Load*).

```
 ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
 │ ventas (web) │  │ inventario   │  │ logística    │   sistemas OLTP
 │  PostgreSQL  │  │   MySQL      │  │  MongoDB     │
 └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
        │ extract         │                 │
        ▼                 ▼                 ▼
   ┌─────────────────────────────────────────────┐
   │  transform: limpiar, unificar, desnormalizar │
   └──────────────────────┬──────────────────────┘
                          │ load
                          ▼
               ┌─────────────────────┐
               │   data warehouse    │ ◄─── analistas, dashboards, BI
               │ (esquema en estrella)│
               └─────────────────────┘
```

Una gran ventaja de separar: el warehouse puede **optimizarse para sus patrones de acceso**. Los índices de los que hablamos en las dos sesiones anteriores son buenos para OLTP, pero no responden bien a consultas analíticas.

#### Divergencia entre bases OLTP y warehouses

El modelo de datos de un warehouse suele ser relacional, porque SQL encaja bien con consultas analíticas, y hay muchas herramientas gráficas que generan SQL y visualizan resultados (drill-down, slicing and dicing). Pero por dentro, ambos tipos de sistema están optimizados para cosas muy distintas. Algunos proveedores se especializan en uno u otro.

Ejemplos de warehouses: **Teradata, Vertica, SAP HANA, ParAccel** (comerciales); **Amazon Redshift** (basado originalmente en ParAccel); y proyectos SQL-on-Hadoop open source como **Apache Hive, Spark SQL, Cloudera Impala, Facebook Presto y Apache Drill**, muchos inspirados en **Dremel** de Google. Hoy también son muy comunes **Snowflake, Google BigQuery** (heredero de Dremel) y **ClickHouse**.

### Esquemas en estrella y copo de nieve

En OLTP hay una gran variedad de modelos de datos. En analítica, hay mucha menos: la mayoría de los warehouses usan un estilo bastante formulaico, el **star schema** (también llamado *dimensional modeling*).

En el centro hay una **tabla de hechos** (*fact table*). Cada fila representa un **evento** ocurrido en un momento concreto. En un supermercado, cada fila es la compra de un producto por un cliente. Si analizaras tráfico web, cada fila sería una vista de página o un clic.

Algunas columnas del hecho son atributos (precio de venta, coste al proveedor, que permiten calcular margen). Otras son **foreign keys** hacia **tablas de dimensiones**, que representan el *quién, qué, dónde, cuándo, cómo y por qué* del evento.

```
                     ┌────────────────┐
                     │   dim_date     │
                     │ date_key, year,│
                     │ weekday,holiday│
                     └───────▲────────┘
  ┌──────────────┐           │            ┌──────────────┐
  │ dim_product  │   ┌───────┴────────┐   │  dim_store   │
  │ product_sk,  ◄───┤   fact_sales   ├───► store_sk,    │
  │ sku, brand,  │   │ date_key       │   │ city, region │
  │ category     │   │ product_sk     │   └──────────────┘
  └──────────────┘   │ store_sk       │
                     │ customer_sk    │   ┌──────────────┐
                     │ quantity, price├───► dim_customer │
                     └────────────────┘   └──────────────┘
```

El nombre "estrella" viene de esa imagen: la tabla de hechos en el centro y las dimensiones como rayos. Incluso la fecha suele ser una dimensión, porque así puedes codificar información extra (si fue festivo, por ejemplo) y comparar ventas en festivos y no festivos.

Una variante es el **snowflake schema** (copo de nieve), donde las dimensiones se descomponen en subdimensiones: tablas separadas para marcas y categorías, referenciadas desde `dim_product`. Es más normalizado, pero los analistas suelen preferir la estrella porque es más sencilla.

En un warehouse típico las tablas son **muy anchas**: las de hechos suelen superar las 100 columnas, a veces varios cientos. Las dimensiones también: `dim_store` puede incluir los servicios de la tienda, si tiene panadería, los metros cuadrados, la fecha de apertura, la distancia a la autopista…

### Almacenamiento orientado a columnas

Si tienes billones de filas y petabytes en tus tablas de hechos, almacenarlas y consultarlas es un reto. Las dimensiones suelen ser mucho más pequeñas (millones de filas), así que nos centramos en los hechos.

Aunque las tablas de hechos tengan más de 100 columnas, **una consulta típica solo accede a 4 o 5**. Por ejemplo: "¿la gente compra más fruta fresca o dulces según el día de la semana en 2013?":

```sql
SELECT dim_date.weekday, dim_product.category,
       SUM(fact_sales.quantity) AS quantity_sold
FROM fact_sales
  JOIN dim_date    ON fact_sales.date_key   = dim_date.date_key
  JOIN dim_product ON fact_sales.product_sk = dim_product.product_sk
WHERE dim_date.year = 2013
  AND dim_product.category IN ('Fresh fruit', 'Candy')
GROUP BY dim_date.weekday, dim_product.category;
```

Recorre muchísimas filas, pero de `fact_sales` solo necesita **tres columnas**: `date_key`, `product_sk` y `quantity`.

En la mayoría de bases OLTP el almacenamiento es **orientado a filas**: todos los valores de una fila se guardan juntos. Aunque tengas índices sobre `date_key` y `product_sk`, el motor debe cargar desde disco las filas completas (con sus 100+ atributos), parsearlas y filtrar. Lentísimo.

La idea del almacenamiento **orientado a columnas** es simple: **no guardes juntos los valores de una fila; guarda juntos los valores de cada columna**. Si cada columna está en su propio archivo, la consulta solo lee y parsea las columnas que usa.

```
orientado a filas (OLTP)                orientado a columnas (OLAP)
──────────────────────────              ─────────────────────────────
fila 1: 140102,69,4,1,2,13.99           date_key:   140102 140102 140102 140103 ...
fila 2: 140102,69,5,3,1,14.99           product_sk: 69     69     69     74     ...
fila 3: 140102,69,5,3,3,14.99           store_sk:   4      5      5      3      ...
fila 4: 140103,74,3,1,1,0.99            quantity:   1      3      1      5      ...
...                                     price:      13.99  14.99  14.99  0.99   ...
leer 3 columnas = leer TODO             leer 3 columnas = leer 3 archivos
```

Un requisito clave: **todos los archivos de columna tienen las filas en el mismo orden**. Para reconstruir la fila 23 tomas la entrada 23 de cada archivo.

El almacenamiento columnar es más fácil de entender con el modelo relacional, pero sirve también para datos no relacionales: **Parquet** es un formato columnar que soporta un modelo de documentos, basado en Dremel.

### Compresión de columnas

Además de leer solo las columnas necesarias, puedes **comprimirlas**. Las columnas suelen ser muy repetitivas, lo cual es ideal para comprimir. Una técnica muy eficaz en warehouses es el **bitmap encoding**.

Una columna `product_sk` puede tener miles de millones de filas pero solo unos 100.000 valores distintos. Para cada valor distinto creas un **bitmap** con un bit por fila: 1 si la fila tiene ese valor, 0 si no.

```
product_sk:  69 69 69 69 74 31 31 31 31 29 30 30 31 31 31 68 69 69

bitmap 29:   0  0  0  0  0  0  0  0  0  1  0  0  0  0  0  0  0  0
bitmap 31:   0  0  0  0  0  1  1  1  1  0  0  0  1  1  1  0  0  0
bitmap 69:   1  1  1  1  0  0  0  0  0  0  0  0  0  0  0  0  1  1

run-length de bitmap 31:  5 ceros, 4 unos, 3 ceros, 3 unos, 3 ceros (resto ceros)
```

Si hay muchos valores distintos, la mayoría de bits de cada bitmap son ceros (bitmaps **dispersos**), y se comprimen todavía más con **run-length encoding**: en lugar de los bits, guardas cuántos ceros, cuántos unos, cuántos ceros… Una columna entera puede quedar en una fracción minúscula de su tamaño.

Y los bitmaps sirven directamente para filtrar:

- `WHERE product_sk IN (30, 68, 69)`: haces un **OR bit a bit** de los tres bitmaps.
- `WHERE product_sk = 31 AND store_sk = 3`: haces un **AND bit a bit** del bitmap de `product_sk = 31` y del de `store_sk = 3`. Funciona porque ambas columnas tienen las filas en el mismo orden.

#### Procesamiento vectorizado

En warehouses el cuello de botella es el ancho de banda **de disco a memoria**, pero también el de **memoria a cache de CPU**, los errores de predicción de saltos y las burbujas del pipeline. El almacenamiento columnar ayuda: el motor carga un trozo de columna comprimida que cabe en la cache L1 de la CPU y lo recorre en un bucle ajustado, sin llamadas a funciones. Los operadores bit a bit (AND, OR) se aplican directamente sobre esos trozos comprimidos. A esto se le llama **vectorized processing**, y es parte de por qué ClickHouse, DuckDB o Snowflake son tan rápidos.

#### Distinción importante: column families no es columnar

Cassandra y HBase tienen el concepto de **column families** (heredado de Bigtable). Llamarlos "orientados a columnas" es engañoso: dentro de cada column family guardan **todas las columnas de una fila juntas**, con la clave de fila, y no usan compresión de columnas. El modelo de Bigtable sigue siendo esencialmente **orientado a filas**.

### Orden de clasificación en el almacenamiento columnar

En un almacén columnar no importa mucho el orden en que se guardan las filas; lo más simple es guardarlas en orden de inserción, porque insertar es solo añadir al final de cada archivo. Pero puedes imponer un orden, como en las SSTables, y usarlo como mecanismo de índice.

No puedes ordenar cada columna por separado (perderías la correspondencia entre filas). Ordenas **filas completas**, aunque se guarden por columnas. El administrador elige las columnas de ordenación según las consultas más comunes: si la mayoría filtran por rango de fechas (el último mes), conviene que `date_key` sea la primera clave de ordenación. Así el motor escanea solo las filas de ese mes. Una segunda clave (`product_sk`) agrupa las ventas del mismo producto dentro de cada día.

Además, el orden **ayuda a la compresión**: si la primera columna de ordenación tiene pocos valores distintos, tras ordenar habrá largas secuencias del mismo valor repetido. Con run-length encoding, una columna de miles de millones de filas puede comprimirse a unos pocos kilobytes. El efecto es más fuerte en la primera clave y se debilita en las siguientes.

#### Varios órdenes distintos

Una idea de **C-Store**, adoptada en **Vertica**: distintas consultas se benefician de órdenes distintos, y como de todas formas replicas los datos a varias máquinas, ¿por qué no guardar cada réplica **ordenada de forma diferente**? Usas la versión que mejor encaje con cada consulta. Es parecido a tener varios índices secundarios en un almacén por filas, con la diferencia de que aquí cada "índice" contiene los valores de las columnas, no punteros.

### Escribir en un almacén columnar

Las optimizaciones anteriores aceleran las lecturas, pero complican las escrituras. Actualizar en su sitio, como hace un B-tree, no es posible con columnas comprimidas: insertar una fila en mitad de una tabla ordenada obligaría a reescribir todos los archivos de columna, porque las filas se identifican por su posición.

La solución ya la conoces: **LSM-trees**. Todas las escrituras van primero a un almacén en memoria, donde se añaden a una estructura ordenada (orientada a filas o columnas, da igual). Cuando se acumulan suficientes, se fusionan con los archivos columnares en disco y se escriben como archivos nuevos en bloque. Es lo que hace Vertica. Las consultas deben examinar tanto los datos en disco como las escrituras recientes en memoria y combinarlos, pero el optimizador lo oculta al usuario. ClickHouse sigue la misma filosofía con su familia de motores **MergeTree**.

### Agregación: data cubes y vistas materializadas

Las consultas analíticas usan mucho `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`. Si muchas consultas usan los mismos agregados, recalcularlos cada vez es un desperdicio. ¿Por qué no **cachear** los resultados?

Una **vista materializada** es una forma de hacerlo. En el modelo relacional, una **vista virtual** es solo un atajo para escribir consultas: el motor la expande al ejecutarse. Una **vista materializada** es una copia real de los resultados de la consulta, escrita en disco.

Cuando cambian los datos subyacentes, la vista materializada debe actualizarse. Eso encarece las escrituras, por lo que se usa poco en OLTP. En warehouses, con muchas lecturas, tiene sentido (aunque no mejoran el rendimiento de lectura en todos los casos).

Un caso especial es el **data cube** o **OLAP cube**: una cuadrícula de agregados agrupados por distintas dimensiones.

```
                  producto →
              32    33    34    35    ...  TOTAL
 fecha  140101 149.6 31.0  84.6  28.5 ...  40710.5
   ↓    140102 132.2 19.2  87.2  3.0  ...  ...
        140103 196.8 0.0   92.0  0.0  ...  ...
        ...
        TOTAL  14967 5910  7328  6885 ...  ← SUM por producto (todas las fechas)

cada celda = SUM(net_price) para esa combinación (fecha, producto)
```

Con dos dimensiones, cada celda tiene el total de una combinación fecha-producto; sumando una fila o una columna obtienes el total por fecha o por producto sin recorrer los hechos. En la práctica hay más dimensiones (cinco: fecha, producto, tienda, promoción, cliente), lo que es difícil de dibujar pero sigue el mismo principio.

- **Ventaja**: ciertas consultas son instantáneas porque ya están precalculadas.
- **Desventaja**: pierdes flexibilidad. No puedes calcular "ventas de productos que cuestan más de 100 dólares" si el precio no es una dimensión del cubo.

Por eso los warehouses suelen guardar tanto los datos crudos como algunos agregados (cubos) para acelerar consultas concretas.

### Ideas erróneas frecuentes

- **"Cassandra es una base columnar."** Tiene column families, pero guarda las columnas de una fila juntas: es orientada a filas.
- **"Columnar es mejor para todo."** Leer o actualizar una fila completa es caro; para OLTP gana el almacenamiento por filas.
- **"Un índice B-tree resuelve la analítica."** Te dice dónde están las filas, pero sigues cargando filas completas de cientos de columnas.
- **"La vista materializada se actualiza gratis."** Cada escritura en los datos base cuesta trabajo extra para mantenerla.
- **"El data warehouse es solo una base más grande."** Está optimizado de otra forma: almacenamiento columnar, compresión, carga masiva y esquemas en estrella.

### Resumen

OLTP atiende muchas peticiones pequeñas por clave para usuarios finales; OLAP recorre millones de filas para calcular agregados para analistas. Por eso existen warehouses separados alimentados por ETL y modelados en estrella. El almacenamiento columnar lee solo las columnas necesarias, comprime con bitmaps y run-length encoding, aprovecha el orden de las filas y se procesa de forma vectorizada; las escrituras se gestionan al estilo LSM. Las vistas materializadas y los data cubes precalculan agregados a cambio de flexibilidad.

## Conceptos clave

- **OLTP**: procesamiento transaccional interactivo con pocas filas por consulta.
- **OLAP**: procesamiento analítico que agrega sobre muchas filas y pocas columnas.
- **Data warehouse**: base de datos separada, de solo lectura para analistas, con datos de muchos sistemas OLTP.
- **ETL**: extraer, transformar y cargar datos al warehouse.
- **Star schema**: tabla de hechos central rodeada de tablas de dimensiones.
- **Snowflake schema**: star schema con dimensiones normalizadas en subdimensiones.
- **Fact table**: tabla donde cada fila es un evento.
- **Column-oriented storage**: guardar juntos los valores de cada columna.
- **Bitmap encoding**: un bitmap por valor distinto de una columna, combinable con AND/OR.
- **Run-length encoding**: comprimir secuencias repetidas guardando la longitud de cada racha.
- **Vectorized processing**: procesar trozos de columna comprimidos en bucles ajustados que caben en la cache de CPU.
- **Materialized view**: copia física y precalculada del resultado de una consulta.
- **Data cube**: cuadrícula de agregados precalculados por varias dimensiones.

## Preguntas de repaso

1. Da tres diferencias entre una carga OLTP y una OLAP.
   R: OLTP lee pocos registros por clave y OLAP agrega sobre muchísimos registros; OLTP escribe de forma aleatoria con baja latencia y OLAP carga datos en masa (ETL o flujos); OLTP sirve a usuarios finales con el estado actual y OLAP sirve a analistas con el historial de eventos. Además, el cuello de botella de OLTP es el seek y el de OLAP el ancho de banda.
2. ¿Por qué se separa el data warehouse de las bases OLTP?
   R: Porque las consultas analíticas recorren gran parte de los datos y degradarían la latencia de las transacciones críticas; además, un sistema separado puede integrar datos de muchos sistemas y optimizarse para lecturas analíticas (almacenamiento columnar, esquemas en estrella).
3. ¿Por qué el almacenamiento columnar acelera una consulta que usa 3 de 100 columnas?
   R: Porque cada columna está en su propio archivo y la consulta solo lee esos tres archivos; un almacén por filas tendría que cargar y parsear las filas completas con las 100 columnas aunque descarte casi todo.
4. Explica cómo un bitmap encoding responde a `WHERE product_sk = 31 AND store_sk = 3`.
   R: Se toma el bitmap del valor 31 en la columna product_sk y el bitmap del valor 3 en store_sk; como ambas columnas tienen las filas en el mismo orden, un AND bit a bit da un bitmap con 1 en exactamente las filas que cumplen ambas condiciones.
5. ¿Por qué ordenar las filas mejora la compresión de un almacén columnar?
   R: Porque la primera columna de ordenación queda con largas rachas del mismo valor, que el run-length encoding comprime muchísimo; el efecto es menor en las siguientes columnas de ordenación.
6. ¿Cómo se escriben datos en un almacén columnar si no se puede actualizar en el sitio?
   R: Al estilo LSM: las escrituras van a un almacén en memoria ordenado y, cuando se acumulan, se fusionan con los archivos columnares en disco escribiendo archivos nuevos en bloque; las consultas combinan los datos de disco con los recientes en memoria.
7. ¿Qué ventaja y qué desventaja tiene un data cube?
   R: Ventaja: ciertas consultas agregadas son inmediatas porque ya están precalculadas por dimensión. Desventaja: pierde flexibilidad; no puedes filtrar por atributos que no sean dimensiones del cubo, por eso se guardan también los datos crudos.

## Ejercicio

Escribe en TypeScript un mini motor columnar en memoria:

1. Genera 1.000.000 de ventas con columnas `dateKey` (365 valores), `productSk` (1.000 valores), `storeSk` (50 valores) y `quantity`.
2. Guárdalas de dos formas: un array de objetos (por filas) y un objeto con un `Int32Array` por columna.
3. Implementa `SUM(quantity) WHERE storeSk = 7 AND productSk = 31` en ambas versiones y mide el tiempo.
4. Construye bitmaps (por ejemplo con `Uint8Array` o `Uint32Array` de bits) para `storeSk` y `productSk` y resuelve la misma consulta con un AND bit a bit.
5. Ordena las filas por `dateKey` y aplica run-length encoding a esa columna; reporta cuántas rachas obtienes.

Criterio de terminado: las tres versiones devuelven el mismo resultado, imprimes los tiempos y el tamaño de la columna `dateKey` antes y después de RLE.

## Explícalo con tus palabras

Explica a un analista por qué su consulta de 3 columnas tarda minutos en la base de producción y segundos en el warehouse, sin usar la palabra "índice".
