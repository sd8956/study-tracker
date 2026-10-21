---
title: Dividir el monolito de forma incremental
kind: lesson
hours: 2
sources: Building Microservices 2nd ed., cap. 3 "Splitting the Monolith" (pp. 101–120) | Hands-On Microservices with Kubernetes, cap. 2 "Creating a data strategy" (pp. 62–66)
links: Martin Fowler — StranglerFigApplication | https://martinfowler.com/bliki/StranglerFigApplication.html ; Microsoft — Strangler Fig pattern | https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig
---

## Objetivo

Planificar la extracción de servicios desde un monolito existente: fijar un objetivo medible, elegir qué extraer primero, aplicar strangler fig, parallel run y feature toggles, y anticipar los problemas de separar la base de datos (joins, integridad, transacciones, reporting).

## Estudio

### 1. Primero un objetivo, después los servicios

Los microservicios no son la meta. No "ganas" por tenerlos. Una migración debe empezar con una pregunta: **¿qué resultado quiero que mejore?** Por ejemplo:

- "Reducir el tiempo entre que un cambio está listo y llega a producción de 3 semanas a 2 días".
- "Que el pico de tráfico de búsqueda no degrade el checkout".
- "Que el equipo de pagos pueda desplegar sin esperar al release general".

Sin un objetivo claro caes en confundir **actividad con resultado**: el equipo reporta "ya tenemos 14 servicios" y nadie sabe si eso ayudó. Además, el objetivo te obliga a mirar alternativas más baratas. Si el problema es escalar, quizá basta con poner más copias del monolito detrás de un load balancer, o con optimizar dos consultas. Si el problema es la coordinación entre equipos, un monolito modular puede resolverlo.

Una regla práctica: **prueba primero lo simple**. Solo si las alternativas fáciles no alcanzan, empiezas a extraer servicios, y mides el progreso contra el objetivo.

### 2. Migración incremental: cincelar el mármol

Una reescritura completa ("big bang") tiene una sola garantía: un gran estallido. La alternativa es tratar el monolito como un bloque de mármol que vas cincelando:

```
 Mes 0             Mes 3                 Mes 6                  Mes 12
 ┌─────────┐       ┌───────┐ ┌──┐        ┌─────┐ ┌──┐ ┌──┐      ┌───┐ ┌──┐ ┌──┐ ┌──┐
 │         │       │       │ │A │        │     │ │A │ │B │      │   │ │A │ │B │ │C │
 │monolito │  ──►  │ mono  │ └──┘   ──►  │mono │ └──┘ └──┘ ──►  │m. │ └──┘ └──┘ └──┘
 │         │       │       │             │     │                └───┘
 └─────────┘       └───────┘             └─────┘                (puede quedarse)
```

Ventajas del enfoque incremental:

1. **Aprendes en cada paso.** El primer servicio te enseña a desplegar, monitorear y depurar en red. Ese aprendizaje abarata el segundo.
2. **Limitas el daño de equivocarte.** Y te vas a equivocar. Un paso pequeño en la dirección incorrecta se revierte fácil.
3. **Entregas valor antes.** Cada servicio extraído ya aporta su beneficio, sin esperar al final.
4. **Sabes cuándo parar.** Quizá extraer el 10 % del sistema que era el cuello de botella resuelve el objetivo, y el 90 % restante se queda en el monolito.

El consejo concreto: **empieza por algo pequeño**. Extrae una o dos funcionalidades, llévalas a producción y evalúa si te acercaron al objetivo. Los verdaderos dolores de los microservicios solo aparecen en producción.

### 3. El monolito rara vez es el enemigo

Es normal que el monolito siga existiendo durante años, más pequeño, conviviendo con los servicios nuevos. A muchas personas eso les parece "desordenado", pero ninguna arquitectura real es limpia: evoluciona con el negocio. Concéntrate en los beneficios, no en "eliminar el monolito".

Hay pocos casos en que matar el monolito es obligatorio: tecnología muerta, infraestructura que se retira, licencia de un proveedor caro. Incluso ahí conviene la migración incremental.

### 4. El peligro de descomponer demasiado pronto

Partir en servicios un dominio que aún no entiendes bien sale caro. Un caso conocido: un equipo con experiencia en herramientas de integración continua construyó un producto nuevo del mismo tipo directamente como microservicios, confiado en su conocimiento previo. Los casos de uso resultaron distintos, las fronteras no encajaban y cada cambio tocaba varios servicios. Terminaron fusionando todo en un monolito y, un año después, cuando entendían el dominio, volvieron a partirlo con fronteras que sí resultaron estables.

Moraleja: **es más fácil descomponer un sistema existente que diseñar microservicios desde cero**, porque el código existente te muestra cómo cambia el dominio realmente.

### 5. ¿Qué extraer primero?

Combina dos ejes: **beneficio** (según tu objetivo) y **facilidad** (qué tan enredada está esa parte).

- Si el objetivo es **escalar**, prioriza la funcionalidad que hoy limita la carga.
- Si el objetivo es **velocidad de cambio**, prioriza lo más volátil. Herramientas que analizan el historial de git (hotspots: archivos que cambian mucho y son complejos) te ayudan a encontrarlo.
- Si el objetivo es **aislar fallos**, prioriza lo que más tumba al resto.

```
            facilidad de extraer
                 alta │  ★ empezar aquí     │  "victorias rápidas",
                      │  (alto beneficio,   │   poco impacto
                      │   fácil)            │
                      ├─────────────────────┼──────────────────
                 baja │  planificar con     │  dejar para el final
                      │  cuidado            │  (o nunca)
                      └─────────────────────┴──────────────────
                           alto beneficio       bajo beneficio
```

Para el **primer** servicio, la facilidad pesa más que el beneficio: quieres aprender con algo poco riesgoso. Un buen primer candidato suele ser algo con pocas dependencias entrantes, poco acoplado a las tablas centrales y que no esté en el camino crítico del dinero.

### 6. Descomponer por capas: código primero o datos primero

Un servicio extraído necesita su código **y** sus datos. Tienes que decidir el orden:

| Orden | Cómo es | Ventaja | Riesgo |
| --- | --- | --- | --- |
| Código primero | Sacas la lógica a un servicio nuevo que, temporalmente, sigue leyendo la base del monolito | Obtienes beneficio rápido; el código es lo más fácil de mover | Te quedas a mitad de camino: si nunca separas los datos, terminas con common coupling permanente |
| Datos primero | Separas el esquema dentro del monolito (o a otra base) y después mueves el código | Descubres pronto los problemas de joins e integridad | El beneficio tarda más; trabajo "invisible" al principio |
| Ambos a la vez | Extraes código y datos juntos | Frontera limpia desde el inicio | Paso más grande y arriesgado |

Lo más habitual es **código primero**, con la disciplina de planificar desde el inicio cuándo se separan los datos. Si ya sabes que separar los datos será muy difícil (por ejemplo, la tabla está en el centro de veinte joins), **datos primero** te avisa antes de invertir en el código.

### 7. Patrones de descomposición

#### 7.1 Strangler fig

Inspirado en la higuera estranguladora, que crece alrededor de un árbol hasta reemplazarlo. Interceptas las llamadas al monolito y rediriges algunas al servicio nuevo. El monolito no sabe que existe el servicio.

```
            ┌────────────────────┐
 cliente ──►│ proxy / API gateway│
            └───────┬───────┬────┘
     /invoices/*    │       │  todo lo demás
                    ▼       ▼
            ┌───────────┐ ┌───────────────┐
            │ Invoicing │ │   Monolito    │
            │ (nuevo)   │ │ (sin cambios) │
            └───────────┘ └───────────────┘
```

Pasos típicos:

1. Pon un proxy delante del monolito sin cambiar nada (solo reenvía). Verifica que nada se rompe.
2. Implementa la funcionalidad en el servicio nuevo y despliégalo **sin tráfico**.
3. Cambia la regla del proxy para que las rutas elegidas vayan al servicio nuevo.
4. Si algo falla, revierte la regla del proxy: el rollback es un cambio de configuración.
5. Cuando estés seguro, borra el código viejo del monolito.

Funciona mejor cuando la funcionalidad se puede interceptar en el perímetro (una ruta HTTP, un tipo de mensaje). Si la funcionalidad está enterrada en el medio del monolito (una función llamada desde muchos sitios), necesitas otros patrones (por ejemplo, *branch by abstraction*: introducir una interfaz dentro del monolito, tener dos implementaciones y cambiar de una a otra).

Un ejemplo de configuración del proxy con nginx:

```nginx
location /invoices/ {
    proxy_pass http://invoicing:8080;   # servicio nuevo
}
location / {
    proxy_pass http://monolith:3000;    # todo lo demás
}
```

#### 7.2 Parallel run

Ejecutas la implementación vieja y la nueva **a la vez** con las mismas entradas, comparas los resultados y solo usas la vieja como fuente de verdad. Es muy útil cuando el resultado es crítico (cálculo de precios, liquidaciones, impuestos) y quieres evidencia de que el servicio nuevo calcula igual antes de confiar en él.

```ts
async function calculatePrice(cart: Cart): Promise<Money> {
  const legacy = await legacyPricing(cart);           // fuente de verdad
  newPricingService(cart)                              // en sombra
    .then((candidate) => {
      if (!candidate.equals(legacy)) {
        metrics.increment("pricing.mismatch");
        log.warn({ cartId: cart.id, legacy, candidate }, "pricing mismatch");
      }
    })
    .catch((err) => metrics.increment("pricing.shadow_error"));
  return legacy;
}
```

Cuidado: si la operación tiene efectos secundarios (cobrar, enviar un email), la versión en sombra **no debe** ejecutarlos.

#### 7.3 Feature toggle

Un interruptor de configuración que decide qué implementación usar. Combinado con strangler fig, te permite cambiar de la vieja a la nueva (y volver) sin desplegar: `if (flags.useNewInvoicing) ... else ...`. Puedes activarlo para un porcentaje de usuarios o solo para usuarios internos.

### 8. Problemas al separar la base de datos

Separar el código es la parte fácil. Los problemas serios aparecen con los datos.

#### 8.1 Rendimiento: el join sube de capa

En el monolito, un reporte de "más vendidos" hace un `JOIN` entre `ledger` (ventas por SKU) y `albums` (nombre del álbum). Cuando `albums` pasa a ser propiedad del servicio `Catalog` y `ledger` del servicio `Finance`, el join ya no ocurre en la base:

```
 Antes:   SELECT ... FROM ledger JOIN albums ON ...      (1 consulta)

 Después: Finance ──SELECT ledger──► [BD Finance]          (lista de SKUs)
          Finance ──GET /albums?skus=..──► Catalog ──SELECT──► [BD Catalog]
          Finance combina en memoria
```

El join sigue existiendo, pero ahora vive en el código de `Finance`, con una llamada de red en el medio. Casi seguro será más lento. Mitigaciones:

- **Consultas en lote** (`GET /albums?skus=1,2,3`), nunca una llamada por fila (el problema N+1 en red).
- **Cache local** de los datos que cambian poco (nombres de álbumes).
- **Copia local** mantenida con eventos (`AlbumRenamed`).

Si la operación es un reporte mensual, la latencia extra quizá no importa. Si está en el camino de cada petición, sí.

#### 8.2 Integridad de datos

En una misma base, una foreign key impide borrar un álbum que aparece en una venta. Con bases separadas, nada lo impide. Hay que aceptar que la base ya no protege las relaciones entre servicios y usar patrones de "convivencia":

- **Soft delete**: marcar el álbum como eliminado en lugar de borrarlo, para que las referencias sigan resolviendo.
- **Copiar los datos necesarios** al momento de la venta (el nombre del álbum vendido se guarda en la línea de la venta).
- **Manejar referencias rotas** de forma explícita en el código ("álbum ya no disponible").

#### 8.3 Transacciones

En el monolito, crear un pedido y descontar stock puede ser una sola transacción ACID. Con dos servicios y dos bases, no. Las transacciones distribuidas (two-phase commit) existen pero suelen traer más problemas de los que resuelven. La herramienta habitual son las **sagas** (sesión 07). Por ahora, la lección práctica es: **antes de separar datos, identifica qué operaciones hoy dependen de una transacción que cruzaría la nueva frontera**. Si son muchas, quizá la frontera está mal.

#### 8.4 Herramientas para migrar el esquema

Cambiar esquemas de forma controlada requiere migraciones versionadas (Flyway, Liquibase, o las migraciones de tu ORM) aplicadas automáticamente en cada despliegue. Sin eso, separar bases se vuelve una cadena de scripts manuales.

#### 8.5 Reporting

Los reportes y el análisis suelen necesitar datos de todo el sistema. En vez de que el equipo de BI lea las bases de todos los servicios (content coupling), se usa una **reporting database**: una base dedicada a lectura que cada servicio alimenta con los datos que decide exponer. El servicio sigue siendo dueño de su esquema interno; el esquema de reporting es un contrato público más, que se versiona.

### 9. Consultas que cruzan servicios: API composition y CQRS

Sayfan resume dos estrategias para consultas distribuidas cuando cada servicio tiene su propio almacén:

**API composition.** Un componente (un gateway, un BFF o el propio servicio consumidor) llama a varios servicios y combina las respuestas. Es simple y siempre está actualizado, pero suma latencias y depende de que todos respondan.

**CQRS (Command Query Responsibility Segregation).** Separas el modelo de escritura del de lectura. Los servicios dueños publican eventos y un servicio de consulta mantiene una **vista materializada** optimizada para leer (por ejemplo, "pedidos con nombre del cliente y estado del envío"). Las lecturas son rápidas y no dependen de que todos estén arriba, a cambio de consistencia eventual y de más piezas que mantener.

| Estrategia | Consistencia | Latencia de lectura | Complejidad | Uso típico |
| --- | --- | --- | --- | --- |
| API composition | Fuerte (lee la fuente) | Suma de llamadas | Baja | Pantallas con pocos servicios y poco tráfico |
| CQRS con vista materializada | Eventual | Baja (una consulta local) | Alta | Búsquedas y listados de alto tráfico que combinan muchos servicios |

### 9.1 Ejemplo trabajado: plan de extracción de `Notifications`

Supón un monolito de e-commerce donde el envío de emails y SMS está mezclado con el resto: el checkout llama a `sendOrderConfirmation()`, el módulo de envíos llama a `sendShippingUpdate()`, y hay una tabla `notification_log` que solo usan esas funciones. El objetivo declarado es "que una caída del proveedor de SMS deje de bloquear el checkout" (aislamiento de fallos).

**Por qué es buen primer candidato.** Tiene pocas dependencias entrantes (tres o cuatro puntos de llamada), sus datos (`notification_log`) no participan en joins con tablas centrales, no está en el camino crítico del dinero y su fallo es tolerable si se encola y reintenta.

**Plan por fases:**

| Fase | Acción | Cómo verificas | Cómo reviertes |
| --- | --- | --- | --- |
| 1 | Introducir una interfaz `Notifier` dentro del monolito (branch by abstraction) con la implementación actual | Tests existentes pasan, nada cambia para el usuario | Revertir el commit |
| 2 | Crear el servicio `Notifications` con su propia tabla de log, desplegado sin tráfico | Health check y prueba manual con un endpoint interno | Apagar el servicio |
| 3 | Segunda implementación de `Notifier` que publica un mensaje en una cola; feature toggle para usuarios internos | Los empleados reciben emails desde el servicio nuevo; métricas de entrega | Apagar el toggle |
| 4 | Activar el toggle para el 10 %, luego el 50 % y el 100 % | Tasa de entrega igual o mejor que antes; el checkout ya no espera al proveedor | Bajar el porcentaje |
| 5 | Migrar el historial de `notification_log` y borrar el código y la tabla viejos del monolito | El monolito ya no escribe en esa tabla (verificado con permisos) | Restaurar desde backup (por eso es la última fase) |

Observa tres cosas. Primero, cada fase es reversible y pequeña. Segundo, la separación de datos tiene su propia fase con fecha. Tercero, el éxito se mide contra el objetivo (el checkout deja de depender del proveedor), no contra "tener un servicio más".

### 10. Historia de fallo

Una empresa decide extraer `Customers` del monolito. Mueve el código en dos semanas, pero deja que el nuevo servicio siga usando la tabla `customers` del monolito "temporalmente". Mientras tanto, el monolito sigue escribiendo en esa tabla desde cuatro lugares distintos. Un año después el servicio existe, se despliega solo, pero cualquier cambio de columna exige coordinar con el monolito. Tienen un servicio con todos los costos de la red y ninguno de los beneficios del despliegue independiente. El error no fue empezar por el código, sino **no tener un plan ni una fecha para mover los datos**.

### 11. Errores comunes

- Empezar la migración sin un objetivo medible.
- Elegir como primer servicio la parte más crítica y enredada.
- Reescribir todo en paralelo durante un año y "cambiar el switch" (big bang).
- Mover el código y nunca separar los datos.
- Reemplazar joins por bucles de llamadas de red, una por fila.
- Dejar que el equipo de BI siga leyendo las tablas internas de los servicios.

## Conceptos clave

- **Migración incremental**: extraer servicios uno a uno, aprendiendo y midiendo en producción.
- **Strangler fig**: interceptar llamadas en el perímetro y redirigirlas gradualmente al servicio nuevo.
- **Parallel run**: ejecutar implementación vieja y nueva en paralelo, comparar resultados y confiar solo en la vieja hasta tener evidencia.
- **Feature toggle**: interruptor de configuración que elige qué implementación usar sin desplegar.
- **Branch by abstraction**: introducir una interfaz dentro del monolito para alternar entre implementación vieja y nueva.
- **Reporting database**: base de lectura alimentada por los servicios como contrato público para análisis.
- **API composition**: combinar respuestas de varios servicios en tiempo de consulta.
- **CQRS**: separar modelo de escritura y de lectura, con vistas materializadas alimentadas por eventos.

## Preguntas de repaso

1. ¿Por qué hay que fijar un objetivo antes de empezar una migración a microservicios?
   R: Porque los microservicios son un medio, no un fin. El objetivo permite elegir qué extraer primero, medir si la migración ayuda, saber cuándo parar y descubrir alternativas más simples (escalar el monolito, modularizarlo) que podrían bastar.
2. Explica los pasos del patrón strangler fig y por qué facilita el rollback.
   R: Se pone un proxy delante del monolito que solo reenvía; se implementa la funcionalidad en el servicio nuevo y se despliega sin tráfico; se cambia la regla del proxy para enviar ciertas rutas al servicio; finalmente se borra el código viejo. El rollback es revertir la regla del proxy, un cambio de configuración, porque el monolito sigue teniendo la implementación original.
3. ¿Qué problema resuelve el parallel run y qué precaución exige?
   R: Da evidencia de que la implementación nueva produce los mismos resultados que la vieja en tráfico real antes de confiar en ella, útil en cálculos críticos. Exige que la versión en sombra no ejecute efectos secundarios como cobrar o enviar mensajes, y que solo se use el resultado viejo.
4. Al separar la base de datos, ¿qué pasa con los joins y cómo se mitiga?
   R: El join pasa de la base al código del servicio, con llamadas de red en el medio, y suele ser más lento. Se mitiga con consultas en lote, caches de datos que cambian poco o copias locales mantenidas con eventos; si es un reporte poco frecuente, puede aceptarse la latencia.
5. Compara API composition y CQRS para una consulta que combina datos de varios servicios.
   R: API composition llama a cada servicio y combina en el momento: simple y consistente, pero suma latencias y falla si un servicio no responde. CQRS mantiene una vista materializada alimentada por eventos: lecturas rápidas y resistentes, pero con consistencia eventual y más componentes que operar.
6. ¿Qué riesgo tiene extraer primero el código y cómo lo evitas?
   R: Quedarte indefinidamente con el servicio leyendo la base del monolito, con common coupling permanente y sin despliegue independiente real. Se evita planificando desde el inicio la separación de datos, con fecha y responsable, y midiendo cuántas escrituras del monolito siguen tocando esas tablas.

## Ejercicio

Implementa un strangler fig mínimo en TypeScript. Crea un "monolito" con Node (`http.createServer` o Express) que responda `/users` y `/invoices`, y un servicio nuevo que responda `/invoices` con un campo extra `"source": "invoicing-service"`. Escribe un proxy en TypeScript (puedes usar `http-proxy` o `fetch` manual) que lea una variable `ROUTE_INVOICES_TO_NEW=true|false` y enrute `/invoices` según ella. Criterio de terminado: con la variable en `false`, `curl localhost:8000/invoices` devuelve la respuesta del monolito; con `true`, la del servicio nuevo; `/users` siempre responde el monolito; y apagar el servicio nuevo con la variable en `false` no afecta a nada.

## Explícalo con tus palabras

Explica por qué "migrar todo de una vez" suele salir peor que "extraer un servicio, medir y decidir", usando la imagen de cincelar un bloque de mármol.
