---
title: Modelo relacional frente a modelo de documentos
kind: lesson
hours: 2
sources: Designing Data-Intensive Applications (Kleppmann), cap. 2 (pp. 49–64)
links: PostgreSQL, tipos JSON | https://www.postgresql.org/docs/current/datatype-json.html ; MongoDB, modelado de datos | https://www.mongodb.com/docs/manual/data-modeling/
---

## Objetivo

Comparar el modelo relacional y el modelo de documentos: qué tipo de relaciones representa bien cada uno, qué historia repiten, y cómo decidir entre ellos según la forma de tus datos y tus consultas.

## Estudio

### El modelo de datos condiciona cómo piensas

Un modelo de datos no es solo un formato de almacenamiento. Es la forma en que **piensas el problema**. Las aplicaciones se construyen por capas, y cada capa representa sus datos en términos del modelo de la capa inferior:

```
mundo real (personas, pedidos, sensores)
      │  modelas con objetos, clases, APIs
      ▼
estructuras de tu aplicación (objetos TypeScript)
      │  las expresas en un modelo general
      ▼
JSON, tablas relacionales, grafos
      │  el motor los representa como
      ▼
bytes en memoria, en disco, en la red
      │  el hardware los representa como
      ▼
corrientes eléctricas, pulsos de luz, campos magnéticos
```

Cada capa oculta la complejidad de la de abajo con un modelo limpio. Elegir el modelo de la tercera capa (relacional, documento, grafo) tiene consecuencias enormes: decide qué es fácil, qué es difícil y qué es imposible de expresar con eficiencia.

### El modelo relacional y su dominio

El modelo relacional, propuesto por Edgar Codd en 1970, organiza los datos en **relaciones** (tablas), cada una con un conjunto desordenado de **tuplas** (filas). Al principio se dudaba de que pudiera implementarse con eficiencia; a mediados de los 80, sistemas relacionales con SQL eran la opción por defecto para almacenar y consultar datos de negocio. Ese dominio duró unos 30 años.

Sus raíces estaban en el procesamiento de negocio de los 60 y 70: **transacciones** (ventas, reservas, nóminas) y **batch** (facturas, informes). Lo notable es que generalizó extraordinariamente bien: hoy lo usas para publicar en blogs, redes sociales, ecommerce, juegos y SaaS. Competidores como el modelo de red, el jerárquico, las bases de datos de objetos de los 80–90 o XML en los 2000 generaron entusiasmo, pero ninguno desplazó al relacional.

### El nacimiento de NoSQL

En la década de 2010 apareció *NoSQL*, un hashtag de una quedada de 2009 que luego se reinterpretó como "Not Only SQL". Las motivaciones fueron varias:

- Necesidad de **mayor escalabilidad** que la que daban las bases relacionales de entonces: datasets enormes o tasas de escritura muy altas.
- Preferencia por **software libre** frente a productos comerciales caros.
- Consultas especializadas que el modelo relacional no resolvía bien.
- Frustración con lo **restrictivo de los esquemas** relacionales y deseo de un modelo más dinámico.

La conclusión práctica es la **persistencia políglota**: en el futuro inmediato convivirán almacenes relacionales y no relacionales, y elegirás según el caso.

### El object-relational mismatch

La mayor parte del código se escribe en lenguajes orientados a objetos. Si guardas datos en tablas, necesitas una capa de traducción entre objetos y filas. A esa desconexión se le llama **impedance mismatch**. Los ORMs (ActiveRecord, Hibernate, Prisma, TypeORM) reducen el código repetitivo, pero no eliminan las diferencias.

Toma como ejemplo un perfil profesional tipo LinkedIn. Un usuario tiene **un** nombre, pero **varios** puestos de trabajo, **varios** estudios y **varios** datos de contacto. Es una relación *one-to-many*. En SQL tradicional la representas así:

```
users                 positions                    education
┌────┬──────────┐     ┌────┬─────────┬─────────┐   ┌────┬─────────┬──────────┐
│ id │ name     │     │ id │ user_id │ title   │   │ id │ user_id │ school   │
├────┼──────────┤     ├────┼─────────┼─────────┤   ├────┼─────────┼──────────┤
│251 │ Ana Ruiz │     │ 1  │ 251     │ CTO     │   │ 1  │ 251     │ UNAM     │
└────┴──────────┘     │ 2  │ 251     │ Backend │   └────┴─────────┴──────────┘
                      └────┴─────────┴─────────┘
```

El mismo perfil como documento JSON:

```json
{
  "user_id": 251,
  "name": "Ana Ruiz",
  "region_id": "mx:cdmx",
  "industry_id": 131,
  "positions": [
    { "title": "CTO", "organization": "Acme" },
    { "title": "Backend", "organization": "Globex" }
  ],
  "education": [{ "school": "UNAM", "start": 2009, "end": 2014 }],
  "contact_info": { "github": "https://github.com/anaruiz" }
}
```

El documento tiene ventajas claras para este caso:

- **Localidad**: todo el perfil está en un solo lugar. Para leerlo haces una consulta, no varias o un JOIN múltiple.
- **Estructura de árbol explícita**: la relación one-to-many se ve en el anidamiento.
- **Menos impedance mismatch**: el JSON se parece mucho al objeto de tu código.

Muchos relacionales modernos permiten algo intermedio: PostgreSQL tiene `jsonb` con índices GIN, MySQL tiene columnas `JSON`, SQL Server y Oracle soportan XML/JSON. También puedes guardar el JSON como texto opaco, pero entonces la base no puede consultarlo por dentro.

### Many-to-one y many-to-many: donde el documento sufre

Fíjate en `region_id` e `industry_id`. ¿Por qué guardar un identificador y no el texto "Ciudad de México"? Porque guardar un ID frente a texto libre tiene beneficios:

- **Estilo y ortografía consistentes**.
- **Evita ambigüedad** (varias ciudades con el mismo nombre).
- **Facilita actualizar**: el nombre vive en un solo sitio.
- **Localización**: traduces el nombre según el idioma del usuario.
- **Mejor búsqueda**: puedes saber que CDMX está en México.

El ID no significa nada para los humanos, así que nunca necesita cambiar. Lo que significa algo (el nombre) se guarda una sola vez. Eliminar esa duplicación es la esencia de la **normalización**. Si duplicas el texto, cuando cambie tendrás que actualizar todas las copias, con riesgo de inconsistencias y más carga de escritura.

Pero normalizar crea relaciones **many-to-one**: muchas personas viven en una región, muchas trabajan en una industria. Y aquí está el problema: el modelo de documentos encaja mal con many-to-one porque su soporte de JOINs suele ser débil. En una base relacional es normal referirse por ID y unir; en muchas bases de documentos la unión se hace **en el código de la aplicación**, con varias consultas.

Además, los datos tienden a volverse **más interconectados con el tiempo**. Imagina que el perfil evoluciona:

- Las organizaciones y escuelas se convierten en entidades con su propia página, logo y feed. Ya no son strings, son referencias.
- Aparecen **recomendaciones**: un usuario recomienda a otro, y la recomendación debe mostrar el nombre y la foto actualizados del autor. Eso es many-to-many.

```
          ┌──────────────┐      ┌──────────────┐
          │ Ana (perfil) │      │ Beto (perfil)│
          └──────┬───────┘      └──────┬───────┘
     trabajó en  │   recomienda a      │ estudió en
                 ▼   ◄────────────────┘ ▼
          ┌──────────────┐      ┌──────────────┐
          │ Organización │      │   Escuela    │
          │    Acme      │      │    UNAM      │
          └──────────────┘      └──────────────┘
   (las flechas cruzan documentos: ya no es un árbol)
```

Lo que empezó como un árbol se convierte en un grafo, y el documento ya no te sirve tan bien.

### La historia se repite: IMS, CODASYL y el modelo relacional

Este debate es viejísimo. En los 70 la base de datos dominante para negocio era **IMS** de IBM (nacido para el programa Apollo, 1968). Usaba el **modelo jerárquico**: un árbol de registros anidados, sorprendentemente parecido al JSON. Funcionaba bien para one-to-many, mal para many-to-many y no tenía JOINs. Los desarrolladores debían decidir entre duplicar datos o resolver referencias a mano. ¿Te suena?

Surgieron dos alternativas:

| | Modelo de red (CODASYL) | Modelo relacional |
| --- | --- | --- |
| Estructura | Registros con varios padres, enlazados por punteros en disco | Tablas: conjuntos de filas, sin anidamiento |
| Cómo accedes | Siguiendo un **access path** desde un registro raíz, como recorrer listas enlazadas con un cursor | Seleccionando filas por cualquier condición; un **query optimizer** elige el camino |
| Cambiar consultas | Reescribir código de navegación si cambian los caminos | Creas un índice nuevo y las consultas lo aprovechan sin tocarlas |
| Resultado histórico | Eficiente en hardware de cintas, pero rígido; desapareció | Dominó 30 años |

La idea clave del modelo relacional: **el optimizador de consultas se construye una vez y lo aprovechan todas las aplicaciones**. Escribir a mano un access path es más fácil para una consulta concreta, pero la solución general gana a largo plazo.

Los documentos volvieron al modelo jerárquico en un aspecto: anidan registros one-to-many dentro del padre. Pero para many-to-one y many-to-many, documento y relacional **no son tan distintos**: ambos usan un identificador único (foreign key en un caso, *document reference* en el otro) que se resuelve en lectura, con un JOIN o con consultas adicionales. Los documentos no siguieron el camino de CODASYL.

### Relacional vs documento hoy

Dejemos de lado la tolerancia a fallos y la concurrencia (se verán más adelante) y centrémonos en el modelo.

| Criterio | Documento | Relacional |
| --- | --- | --- |
| Flexibilidad de esquema | Alta (schema-on-read) | Esquema explícito (schema-on-write) |
| Localidad de datos | Excelente si lees el documento entero | Datos repartidos en tablas |
| Parecido al código | Muy alto para estructuras de árbol | Necesita mapeo (ORM) |
| JOINs | Débiles o inexistentes | Ricos y optimizados |
| Many-to-many | Incómodo | Natural |
| Acceso a un elemento anidado | Se nombra por ruta ("el 2º puesto"), no directamente | Directo por clave |

#### ¿Qué modelo simplifica el código de tu aplicación?

Si tus datos tienen forma de documento (un árbol de relaciones one-to-many que normalmente se carga entero), el modelo de documentos es buena idea. "Despedazar" ese árbol en varias tablas (*shredding*, como hace el relacional) produce esquemas engorrosos y código complicado.

Si tu aplicación usa many-to-many, el documento se vuelve menos atractivo. Puedes desnormalizar, pero entonces tu código debe mantener las copias consistentes. Puedes emular JOINs en la aplicación, pero eso traslada complejidad a tu código y suele ser más lento que un JOIN optimizado dentro de la base de datos. Para datos muy interconectados, el modelo de documentos resulta incómodo, el relacional aceptable y el de **grafos** el más natural (sesión siguiente).

#### Schema-on-read vs schema-on-write

Decir que las bases de documentos son "schemaless" es engañoso. El código que lee los datos **siempre asume una estructura**: hay un esquema implícito. La diferencia es cuándo se aplica:

- **Schema-on-write** (relacional): el esquema es explícito y la base garantiza que todo lo escrito lo cumple. Se parece al **tipado estático**.
- **Schema-on-read** (documentos): la estructura es implícita y solo se interpreta al leer. Se parece al **tipado dinámico**.

La diferencia se nota al cambiar el formato. Supón que guardabas el nombre completo en un campo y ahora quieres nombre y apellido por separado.

En una base de documentos, empiezas a escribir los documentos nuevos con el campo nuevo y el código de lectura maneja ambos casos:

```ts
if (user.name && !user.first_name) {
  // documentos escritos antes del cambio
  user.first_name = user.name.split(" ")[0];
}
```

En una base relacional, haces una migración:

```sql
ALTER TABLE users ADD COLUMN first_name text;
UPDATE users SET first_name = split_part(name, ' ', 1);
```

Las migraciones tienen mala fama de lentas y con downtime, pero no lo merecen del todo: la mayoría de motores ejecuta `ALTER TABLE ... ADD COLUMN` en milisegundos (MySQL históricamente copiaba la tabla entera, aunque existen herramientas para evitarlo). Lo que sí es lento en tablas grandes es el `UPDATE` que reescribe cada fila. Una alternativa es dejar la columna en `NULL` por defecto y rellenarla al leer, como en el caso del documento.

Schema-on-read conviene cuando los elementos de una colección **no tienen la misma estructura** por naturaleza:

- Hay muchos tipos de objetos y no es práctico una tabla por tipo.
- La estructura la determinan sistemas externos que no controlas y que cambian.

Cuando todos los registros tienen la misma forma, un esquema explícito documenta y hace cumplir esa forma, y eso tiene mucho valor.

#### Localidad de datos para consultas

Un documento se guarda normalmente como una cadena continua (JSON, o binarios como BSON en MongoDB). Si la aplicación necesita el documento entero a menudo (por ejemplo, para renderizar una página), la localidad es una ventaja frente a varias búsquedas en índices de distintas tablas.

Pero la localidad solo ayuda si necesitas **grandes partes del documento a la vez**: la base suele cargar el documento completo aunque solo quieras un campo. Y al actualizar, normalmente reescribe el documento entero; solo las modificaciones que no cambian el tamaño codificado pueden hacerse en el sitio. Recomendación: **mantén los documentos pequeños** y evita escrituras que los hagan crecer.

La localidad no es exclusiva del modelo de documentos. Google Spanner permite **intercalar** filas de una tabla hija dentro de su padre; Oracle tiene *multi-table index cluster tables*; el modelo de *column families* de Bigtable (Cassandra, HBase) busca algo parecido.

#### Convergencia

Los dos mundos se están acercando. PostgreSQL (desde 9.3), MySQL (desde 5.7) y SQL Server soportan JSON; RethinkDB permitía JOINs en su lenguaje; los drivers de MongoDB resuelven referencias automáticamente (una especie de JOIN en el cliente) y su `$lookup` hace uniones en el servidor. Un **modelo híbrido** es razonable: tablas relacionales con algunas columnas JSON para las partes con estructura variable.

### El modelo híbrido en la práctica: PostgreSQL con `jsonb`

Veamos cómo se ve el enfoque híbrido en un motor real. Supón que los perfiles tienen datos estables (id, nombre, región) y una parte variable (preferencias, enlaces sociales que cambian con frecuencia). En PostgreSQL puedes combinar columnas normales con una columna `jsonb`:

```sql
CREATE TABLE profiles (
  id          bigint PRIMARY KEY,
  name        text NOT NULL,
  region_id   text REFERENCES regions(id),   -- many-to-one normalizado
  extra       jsonb NOT NULL DEFAULT '{}'    -- parte flexible, schema-on-read
);

-- Índice GIN para consultar dentro del JSON
CREATE INDEX profiles_extra_idx ON profiles USING gin (extra);

-- ¿Quién tiene GitHub en su perfil?
SELECT name, extra->'contact'->>'github' AS github
FROM profiles
WHERE extra @> '{"contact": {"has_github": true}}';

-- JOIN normal con la parte relacional
SELECT p.name, r.display_name
FROM profiles p JOIN regions r ON r.id = p.region_id;
```

Con esta forma obtienes lo mejor de los dos mundos: integridad referencial y JOINs para las relaciones many-to-one, y flexibilidad para la parte cuya forma cambia a menudo. El precio: la parte JSON no tiene validación de estructura (salvo que añadas un `CHECK` o validación en la aplicación) y el optimizador tiene menos estadísticas sobre ella, así que algunas consultas dentro del JSON pueden ser menos eficientes que sobre columnas tipadas.

En el lado opuesto, MongoDB ofrece `$lookup` para hacer uniones en el servidor y *schema validation* con JSON Schema para imponer estructura al escribir. Es decir: el relacional añade flexibilidad y el documental añade estructura y JOINs. La pregunta deja de ser "¿cuál es mejor?" y pasa a ser "¿qué forma tienen mis datos y mis accesos más frecuentes?".

Una heurística útil para decidir:

1. Escribe las cinco consultas más frecuentes de tu aplicación.
2. Si casi todas leen "una entidad con sus hijos" completa, el documento encaja.
3. Si muchas cruzan entidades (filtrar, agregar, unir por referencias), el relacional encaja.
4. Si la pregunta habitual es "¿cómo están conectadas estas cosas a través de N saltos?", piensa en grafos.

### Ejemplo práctico: decidir con criterio

Imagina tres sistemas:

1. **Un CMS de artículos con bloques de contenido heterogéneos** (párrafos, imágenes, embeds de distintos tipos). Cada artículo se lee entero. → Documento, o relacional con columna `jsonb` para los bloques.
2. **Un sistema de reservas de hotel**: habitaciones, clientes, reservas, pagos, todo referenciado entre sí, con reglas de integridad. → Relacional.
3. **Una red de fraude** donde importa quién pagó a quién a través de cuántos intermediarios. → Grafo (próxima sesión), o relacional con consultas recursivas.

### Ideas erróneas frecuentes

- **"NoSQL no tiene esquema."** Tiene esquema implícito; solo cambia cuándo se aplica.
- **"Las migraciones SQL siempre implican downtime."** Añadir una columna nullable suele ser instantáneo; lo caro es reescribir filas.
- **"Los documentos son siempre más rápidos."** Solo si lees documentos completos; si lees un campo de un documento grande, pagas el resto.
- **"Desnormalizar no tiene coste."** El coste lo paga tu código manteniendo copias consistentes.
- **"El modelo de documentos es algo nuevo."** Repite muchos aspectos del modelo jerárquico de IMS de los 60.

### Resumen

El modelo de documentos brilla con datos en forma de árbol (one-to-many), poca relación entre documentos y necesidad de flexibilidad. El relacional brilla con many-to-one y many-to-many gracias a los JOINs y al optimizador. Schema-on-read y schema-on-write son el equivalente a tipado dinámico y estático. Ambos modelos convergen y un diseño híbrido suele ser lo más pragmático.

## Conceptos clave

- **Modelo relacional**: datos en tablas de filas, consultadas de forma declarativa con un optimizador.
- **Modelo de documentos**: registros autocontenidos (JSON/BSON) con estructuras anidadas.
- **Impedance mismatch**: fricción al traducir entre objetos del código y filas de tablas.
- **Normalización**: guardar cada dato significativo una sola vez y referenciarlo por ID.
- **One-to-many / many-to-one / many-to-many**: tipos de relación que determinan qué modelo encaja.
- **Access path**: camino de navegación manual entre registros en el modelo de red (CODASYL).
- **Query optimizer**: componente que decide automáticamente cómo ejecutar una consulta declarativa.
- **Schema-on-read**: la estructura se interpreta al leer (como tipado dinámico).
- **Schema-on-write**: la base valida la estructura al escribir (como tipado estático).
- **Data locality**: guardar juntos los datos que se leen juntos.
- **Persistencia políglota**: usar varios tipos de almacén según el caso.

## Preguntas de repaso

1. ¿Por qué un perfil tipo currículum encaja bien en un documento JSON?
   R: Porque es un árbol de relaciones one-to-many (un usuario con varios puestos, estudios y contactos) que normalmente se carga entero. El documento ofrece localidad (una sola lectura), refleja la estructura de árbol de forma explícita y reduce el impedance mismatch con el código.
2. ¿Por qué guardar `region_id` en lugar del texto de la región, y qué problema introduce para el modelo de documentos?
   R: Un ID evita duplicación, ambigüedad y errores de ortografía, y permite cambiar o traducir el nombre en un solo lugar (normalización). Pero crea una relación many-to-one que exige un JOIN, y las bases de documentos suelen tener JOINs débiles, así que la unión acaba en el código de la aplicación.
3. ¿Cuál fue la gran ventaja del modelo relacional sobre CODASYL?
   R: En CODASYL el programador navegaba manualmente access paths con punteros, y cambiar los caminos obligaba a reescribir código. En el relacional el optimizador elige el camino automáticamente; basta con crear un índice nuevo y las consultas existentes lo aprovechan. El optimizador se escribe una vez y beneficia a todas las aplicaciones.
4. Explica la diferencia entre schema-on-read y schema-on-write con una analogía de lenguajes de programación.
   R: Schema-on-write es como el tipado estático: la base valida la estructura al escribir y garantiza que todos los datos la cumplen. Schema-on-read es como el tipado dinámico: los datos se guardan sin validar y el código que lee interpreta la estructura, manejando formatos viejos y nuevos.
5. ¿Cuándo la localidad de datos de los documentos deja de ser una ventaja?
   R: Cuando solo necesitas una pequeña parte de un documento grande (la base carga el documento entero) o cuando actualizas con frecuencia y el documento crece (normalmente se reescribe completo). Por eso conviene mantener los documentos pequeños.
6. Da un caso donde schema-on-read sea claramente preferible.
   R: Cuando los registros de una colección son heterogéneos por naturaleza, por ejemplo eventos de distintos tipos o datos cuyo formato decide un sistema externo que cambia sin aviso; una tabla por tipo sería impráctica.

## Ejercicio

Modela un mini-LinkedIn de dos formas y compara:

1. En SQL (PostgreSQL o SQLite): tablas `users`, `organizations`, `positions` (user_id, organization_id, title) y `recommendations` (author_id, target_id, text). Escribe la consulta que obtiene el perfil de un usuario con sus puestos (nombre de organización incluido) y las recomendaciones recibidas con el nombre actual del autor.
2. En TypeScript, representa los mismos datos como documentos JSON en memoria (un `Map<string, UserDoc>`), con los puestos anidados. Implementa `getProfile(userId)` que devuelva lo mismo que la consulta SQL resolviendo las referencias a organizaciones y autores en el código.
3. Cambia el nombre de una organización y comprueba que ambas versiones muestran el nombre nuevo. Anota cuántas "consultas" hace la versión de documentos.

Criterio de terminado: ambas versiones devuelven el mismo perfil, el renombrado se refleja en las dos y escribiste 3–5 líneas sobre qué partes encajaron mejor en cada modelo.

## Explícalo con tus palabras

Explica por qué los datos "empiezan como un árbol y acaban como un grafo", usando el ejemplo de las recomendaciones entre perfiles.
