---
title: Testing de microservicios y contratos guiados por el consumidor
kind: lesson
hours: 2
sources: Building Microservices 2nd ed., cap. 9 "Testing" (pp. 349–383) | Hands-On Microservices with Kubernetes, cap. 10 "Testing Microservices" (pp. 292–327)
links: Martin Fowler — The Practical Test Pyramid | https://martinfowler.com/articles/practical-test-pyramid.html ; Pact — Introduction | https://docs.pact.io/ ; Testcontainers for Node.js | https://node.testcontainers.org/
---

## Objetivo

Diseñar una estrategia de pruebas para un sistema de microservicios: elegir el alcance correcto (unit, service, end-to-end), sustituir buena parte de los tests end-to-end por contract tests guiados por el consumidor, aislar entornos de prueba y complementar con pruebas seguras en producción y pruebas no funcionales.

## Estudio

### 1. Para qué sirven los tests

Un test es un **mecanismo de feedback**: te dice, lo antes posible, si el software tiene la calidad suficiente para seguir adelante. En microservicios esa pregunta tiene un matiz: no basta con que cada servicio funcione; necesitas saber que **un cambio en tu servicio no rompe a sus consumidores**, y quieres saberlo sin coordinar con diez equipos.

Una clasificación útil distingue tests por dos ejes: si están orientados al negocio o a la tecnología, y si apoyan el desarrollo o critican el producto. En la práctica:

- **Tests automatizados de aceptación** ("¿hace lo que el negocio pidió?").
- **Tests unitarios** (apoyan al desarrollador mientras escribe código).
- **Tests exploratorios y de usabilidad** (manuales, críticos con el producto).
- **Tests de propiedades** (rendimiento, seguridad, carga: los requisitos "no funcionales").

La tendencia es automatizar todo lo repetible y dejar a las personas lo exploratorio.

### 2. La pirámide y el alcance de los tests

La **pirámide de tests** describe proporciones: muchos tests pequeños abajo, pocos grandes arriba.

```
                ▲   más confianza en el sistema completo
               ╱ ╲  más lentos, más frágiles, más difíciles de diagnosticar
              ╱E2E╲
             ╱─────╲
            ╱Service╲
           ╱─────────╲
          ╱   Unit    ╲  más rápidos, más aislados, fallo fácil de localizar
         ╱─────────────╲
```

| Alcance | Qué prueba | Velocidad | Diagnóstico del fallo |
| --- | --- | --- | --- |
| Unit | Una función o clase, sin red ni base de datos | Milisegundos | Exacto, hasta la línea |
| Service | Un microservicio completo a través de su API, con dependencias externas reemplazadas por stubs | Segundos | Bueno: sabes qué servicio falla |
| End-to-end | Varios servicios desplegados juntos, a través de la UI o la API pública | Minutos | Difícil: puede fallar cualquier pieza |

La idea clave: **a medida que subes, ganas confianza en el sistema pero pierdes velocidad y precisión**. Por eso quieres la mayor parte de la confianza de los niveles bajos, y pocos tests arriba que verifiquen los recorridos críticos.

Un indicio de problema: el **cono de helado** (pocos unit tests, muchos tests end-to-end lentos y frágiles). Los ciclos de feedback se vuelven de horas y los desarrolladores dejan de correr los tests.

### 3. Tests unitarios

Prueban lógica de negocio pura y rápida: cálculos, reglas de validación, transiciones de estado. En TypeScript, con vitest:

```ts
import { describe, it, expect } from "vitest";
import { applyCoupon } from "./pricing";

describe("applyCoupon", () => {
  it("no deja el total por debajo de cero", () => {
    expect(applyCoupon({ totalCents: 500 }, { amountOffCents: 800 }).totalCents).toBe(0);
  });
});
```

Para que el código sea fácil de probar unitariamente, separa la lógica de negocio del transporte (HTTP, colas) y del acceso a datos, inyectando dependencias por interfaces. Sayfan lo hace con la estructura "servicio / transporte / endpoints" de Go kit; en TypeScript, es la misma idea de arquitectura hexagonal que viste en el módulo 03: el núcleo no sabe si lo llamaron por HTTP o desde un test.

¿Hay que probarlo todo? No. Prioriza la lógica con reglas, los casos borde y el código que ya falló. El código trivial (getters, mapeos sin lógica) aporta poco.

### 4. Service tests: el servicio completo, aislado

Un service test levanta **un** servicio de verdad (su proceso, su API, idealmente su base de datos real en un container) y **reemplaza las llamadas a otros servicios** por dobles controlados.

```
  test ──HTTP──► [ servicio Customers real ] ──► [ Postgres en container ]
                         │
                         └──HTTP──► [ stub de Loyalty ]  (respuestas predefinidas)
```

**Stub vs. mock:**

- Un **stub** devuelve respuestas predefinidas ("si piden el saldo de c-1, responde 120 puntos"). No le importa cuántas veces lo llames.
- Un **mock** además **verifica** que se hicieron ciertas llamadas ("Customers debe haber llamado una vez a Loyalty para crear la cuenta"). Útil para efectos secundarios, pero si abusas de los mocks los tests se vuelven frágiles: cualquier refactor que cambie *cómo* se llama rompe el test aunque el comportamiento siga bien.

Herramientas: servidores de stubs HTTP (WireMock, Mountebank, o `msw` y `nock` en Node), y **Testcontainers** para levantar bases de datos y brokers reales en containers efímeros durante el test. Un stub "más inteligente" puede incluso grabar respuestas de un servicio real y reproducirlas.

Sayfan muestra un enfoque similar con Go: tests de integración que crean una base de datos de prueba, arrancan el servicio localmente, ejecutan las llamadas por su cliente y limpian al final. En Kubernetes, añade **smoke tests** contra el servicio desplegado en un cluster de pruebas, y herramientas como Telepresence que te permiten ejecutar un servicio en tu máquina conectado a un cluster como si estuviera dentro, para depurar.

### 5. End-to-end tests: por qué duelen tanto en microservicios

Un test end-to-end despliega varios servicios juntos y recorre un flujo real. Da mucha confianza... y trae muchos problemas en un sistema de microservicios:

**¿Qué versiones despliegas?** Si cambias `Customers`, ¿pruebas contra la versión de `WebShop` que está en producción o contra la que está a punto de salir? Un esquema habitual es que el pipeline de **cada** servicio dispare una etapa común de tests end-to-end (fan-in), pero eso crea una cola compartida.

**Tests frágiles (flaky).** Cuantas más piezas, más razones para fallar que no tienen que ver con tu cambio: un timeout de red, un servicio que tardó en arrancar, datos de prueba sucios. Un test que falla a veces enseña al equipo a relanzarlo sin mirar. Cuando un test es flaky, **sácalo de la suite y arréglalo**, o elimínalo; normalizarlo destruye la confianza en todo el conjunto.

**¿Quién es dueño de los tests?** Si son de todos, nadie los mantiene. Si los escribe un equipo dedicado de QA, los desarrolladores se desconectan de ellos y tardan en enterarse de los fallos. Lo más sano es que cada test end-to-end tenga un equipo dueño claro, normalmente el dueño del recorrido de usuario que prueba.

**¿Cuánto tardan?** Suites de horas son comunes. Mientras tanto, se acumulan cambios (el "gran amontonamiento"), y cuando la suite falla es difícil saber cuál de los veinte cambios la rompió.

**El metaversion.** Una tentación peligrosa: "probamos estas versiones juntas, así que despleguémoslas juntas" (versión 2.3 del sistema completo). Así se pierde el despliegue independiente y vuelves al monolito distribuido.

**Falta de testeo independiente.** Si para desplegar tu servicio necesitas que pase una suite compartida por cinco equipos en un entorno compartido, tu autonomía depende de los cinco. Los equipos de alto rendimiento suelen hacer la mayor parte de su testing **bajo demanda y sin un entorno integrado** compartido.

Conclusión: los tests end-to-end son razonables con **pocos servicios y un solo equipo**. A medida que crece el sistema, conviene **reducirlos a unos pocos recorridos críticos** y obtener el resto de la confianza de otra forma.

### 6. Contract tests y consumer-driven contracts (CDC)

El problema que intentan resolver los end-to-end es: "¿mi cambio rompe a mis consumidores?". Los schemas (sesión 05) detectan rupturas estructurales; las rupturas **semánticas** necesitan tests. Los **contract tests** las detectan con el alcance de un service test.

**Contract test:** el equipo **consumidor** escribe tests que describen cómo espera que se comporte el servicio del que depende: "si pido `GET /customers/c-1`, espero un 200 con un `email` string".

**Consumer-driven contracts:** el equipo consumidor **comparte** esos contratos con el equipo productor, que los ejecuta **en su propio pipeline**, contra su servicio aislado. Si un cambio del productor rompe la expectativa de algún consumidor, el build del productor falla **antes** de desplegar.

```
  Consumidor WebShop                       Productor Customers
  ┌──────────────────────┐   contrato     ┌────────────────────────────────┐
  │ test: "GET /customers│ ─────────────► │ pipeline: verifica todos los   │
  │ /c-1 → 200 {email}"  │   (broker de   │ contratos de sus consumidores  │
  │ genera pact.json     │    contratos)  │ contra su servicio real aislado│
  └──────────────────────┘                └────────────────────────────────┘
  Consumidor Helpdesk  ───── otro contrato ────────────►
```

Ventajas:

- **Alcance pequeño y rápido**: solo se levanta el productor, con sus dependencias en stubs.
- **Feedback para el productor**: sabe exactamente qué consumidor rompería y por qué.
- **Fomenta la conversación**: lo ideal es que alguien del equipo consumidor y alguien del productor escriban juntos los contratos.
- Solo se contrata **lo que el consumidor usa**. Si nadie usa un campo, el productor puede cambiarlo con tranquilidad.

**Pact** es la herramienta más conocida. Del lado del consumidor, defines interacciones; Pact levanta un servidor simulado durante el test y genera un archivo de contrato. Del lado del productor, Pact reproduce esas interacciones contra el servicio real y compara.

```ts
// Lado consumidor (esquema simplificado de un test con Pact)
await provider
  .given("existe el cliente c-1")
  .uponReceiving("una petición del cliente c-1")
  .withRequest({ method: "GET", path: "/customers/c-1" })
  .willRespondWith({
    status: 200,
    body: { id: "c-1", email: like("ana@example.com") }, // "like": cualquier string
  })
  .executeTest(async (mock) => {
    const c = await new CustomersClient(mock.url).get("c-1");
    expect(c.email).toContain("@");
  });
```

Los contratos se comparten mediante un **broker de contratos** (por ejemplo, Pact Broker), que además permite preguntar antes de desplegar: "¿esta versión del productor es compatible con las versiones de los consumidores que están en producción?".

Los contract tests no reemplazan toda conversación entre equipos, ni todos los tests end-to-end. Reemplazan **la mayoría** de los end-to-end que existían solo para detectar rupturas entre servicios.

### 6.1 Contratos para eventos y el flujo completo

Los contratos no son solo para HTTP. Si `Orders` publica `OrderConfirmed` y lo consumen `Notifications` y `Loyalty`, cada consumidor puede describir qué campos del mensaje usa y con qué significado ("`totalCents` es un entero en centavos"). El productor verifica en su pipeline que los mensajes que genera cumplen todas esas expectativas. Así detectas, antes de desplegar, rupturas semánticas como la de la sesión 05 (centavos que pasan a unidades).

El flujo completo con un broker de contratos queda así:

1. El equipo consumidor cambia su código y su contrato; su pipeline publica el contrato nuevo etiquetado con la versión del consumidor.
2. El broker avisa (por webhook) al pipeline del productor, que verifica el contrato nuevo contra la versión del productor que está en producción. Si falla, el consumidor sabe que **no puede desplegar todavía**: necesita que el productor añada primero la capacidad.
3. Cuando el productor cambia, su pipeline verifica todos los contratos de las versiones de consumidores **que están en producción**.
4. Antes de desplegar cualquiera de los dos, una consulta del tipo "¿puedo desplegar esta versión en producción?" al broker comprueba la matriz de compatibilidad.

Esto convierte la pregunta "¿mi cambio rompe a alguien?" en una respuesta automática y rápida, sin levantar el sistema completo.

**Cuándo no merecen la pena.** Si un solo equipo es dueño del productor y de su único consumidor, y ambos se despliegan con el mismo pipeline, un service test que cubra ambos puede ser suficiente. Los contratos brillan cuando hay **varios equipos** y **varios consumidores** que evolucionan por separado. Tampoco sustituyen a hablar: si un productor ve fallar el contrato de un consumidor, la siguiente acción es una conversación, no forzar el cambio.

### 7. Aislar los entornos de prueba

Sayfan describe varias formas de evitar que los tests de un equipo interfieran con los de otro:

- **Cluster por desarrollador**: un cluster local (kind, minikube) por persona. Total aislamiento, pero solo caben unos pocos servicios.
- **Clusters dedicados para pruebas de sistema**: creados bajo demanda y destruidos después.
- **Namespaces de prueba**: un namespace efímero por rama o por ejecución del pipeline, dentro de un cluster compartido. Barato y bastante aislado, si tus servicios no tienen estado global.
- **Datos de prueba**: sintéticos (generados para cada test, lo más reproducible), manuales (preparados a mano, frágiles) o copias de producción (realistas, pero con datos personales que deben anonimizarse).

Y para la experiencia de desarrollo: **solo deberías ejecutar localmente los servicios en los que trabajas**; el resto, como stubs. Si necesitas levantar 30 servicios para probar un cambio, el problema está en el acoplamiento o en la propiedad del código.

### 8. Pruebas en producción

Ningún entorno previo es idéntico a producción. A partir de cierto punto, añadir más tests previos tiene rendimientos decrecientes. Por eso también se prueba **en producción**, de forma segura:

- **Health checks y pings**: verificar que cada instancia responde. Ya lo haces con las probes.
- **Smoke tests** tras cada despliegue, antes de liberar tráfico.
- **Canary releases** (sesión 12): comparar la versión nueva con la estable con tráfico real limitado.
- **Usuarios sintéticos / semantic monitoring**: un proceso que, cada pocos minutos, ejecuta un recorrido real ("buscar un producto, añadirlo al carrito, pagar con una tarjeta de prueba") y alerta si falla. Ve la sesión 14.
- **Chaos engineering**: inyectar fallos controlados para verificar la resiliencia (sesión 16).

Para que sean seguras: marca las peticiones de prueba (cabecera o usuario especial) para que no cuenten en métricas de negocio, no generen cobros reales ni envíos, y puedan limpiarse.

Esto se conecta con una idea importante: en sistemas distribuidos, **optimizar el tiempo de recuperación (MTTR)** suele dar más valor que intentar evitar todo fallo (**MTBF**). Despliegues pequeños, monitoreo bueno y rollback rápido hacen que los fallos que se escapen duren poco.

### 9. Pruebas no funcionales

Las propiedades del sistema también se prueban:

- **Rendimiento y carga**: mide latencias con carga realista (k6, Gatling, autocannon para Node). En microservicios, una petición cruza varios servicios: la latencia de cola (p99) de cada uno se acumula. Empieza pronto con pruebas pequeñas y aumenta.
- **Robustez**: ¿qué pasa si una dependencia responde lento o devuelve errores? Prueba timeouts, reintentos y degradación con stubs que fallan a propósito.

Como estas pruebas son lentas, no van en cada commit: corren de forma programada o antes de liberar cambios importantes.

### 10. Una estrategia de ejemplo

Para un servicio `orders` con dos servicios de los que depende y tres consumidores:

| Capa | Qué incluye | Dónde corre |
| --- | --- | --- |
| Unit (cientos) | Cálculo de totales, máquina de estados del pedido, validaciones | En cada commit, < 1 min |
| Service (decenas) | API completa con Postgres en Testcontainers y stubs de `catalog` y `payments` | En cada commit, < 5 min |
| Contratos como consumidor | Expectativas sobre `catalog` y `payments`, publicadas al broker | En cada commit |
| Contratos como productor | Verificación de los contratos de sus 3 consumidores | En cada commit |
| End-to-end (2 o 3) | "Comprar un producto" y "cancelar un pedido" | Tras desplegar en staging |
| En producción | Smoke test, canary, usuario sintético cada 5 min | Continuo |
| Carga | Prueba semanal y antes de campañas | Programado |

### 11. Historia de fallo

Una empresa tenía 900 tests end-to-end que tardaban cuatro horas y fallaban "un 10 % de las veces" de forma aleatoria. Los equipos relanzaban hasta que pasaban; los despliegues se agrupaban en un tren semanal. Cuando un bug real rompió la búsqueda, el test que lo detectaba fue relanzado tres veces "porque siempre es flaky" y el bug llegó a producción. El plan de recuperación fue: borrar o convertir en service tests el 85 % de los end-to-end, introducir contratos entre los diez pares de servicios más acoplados y dejar 40 recorridos críticos con dueño claro. La suite bajó a 25 minutos y los despliegues pasaron a ser diarios por servicio.

### 12. Errores comunes

- Cono de helado: pocos unit tests y cientos de end-to-end.
- Relanzar tests flaky en lugar de arreglarlos o borrarlos.
- Mocks que verifican cada detalle de implementación y se rompen con cualquier refactor.
- Usar la suite end-to-end para decidir versiones que se despliegan juntas.
- Contratos escritos por el productor "imaginando" lo que usan los consumidores.
- Un entorno de staging compartido como única forma de probar integraciones.
- No probar nunca en producción y descubrir los problemas por los usuarios.

## Conceptos clave

- **Pirámide de tests**: muchos tests pequeños y rápidos, pocos grandes y lentos.
- **Service test**: prueba de un servicio completo a través de su API con dependencias reemplazadas por dobles.
- **Stub / mock**: doble que devuelve respuestas predefinidas / doble que además verifica interacciones.
- **Test flaky**: test que falla de forma intermitente sin que el comportamiento probado haya cambiado.
- **Contract test**: test del consumidor que describe cómo espera que se comporte el productor.
- **Consumer-driven contracts**: contratos de los consumidores ejecutados en el pipeline del productor.
- **Semantic monitoring**: transacciones sintéticas que verifican continuamente recorridos reales en producción.
- **MTTR vs. MTBF**: tiempo medio de recuperación vs. tiempo medio entre fallos.

## Preguntas de repaso

1. ¿Qué se gana y qué se pierde al subir en la pirámide de tests?
   R: Se gana confianza en que el sistema completo funciona; se pierde velocidad de feedback, aislamiento y facilidad para localizar la causa de un fallo, además de aumentar la fragilidad.
2. Nombra tres problemas de los tests end-to-end en un sistema de microservicios.
   R: Fragilidad por las muchas piezas en juego, dificultad para decidir qué versiones de otros servicios usar y quién es dueño de los tests, suites lentas que acumulan cambios, y la tentación de desplegar juntas las versiones probadas juntas, perdiendo el despliegue independiente.
3. ¿Cómo funcionan los consumer-driven contracts y por qué son más baratos que los end-to-end?
   R: Los consumidores escriben tests con sus expectativas sobre el productor y los comparten; el productor los ejecuta en su pipeline contra su servicio aislado. Solo hace falta levantar un servicio con stubs, así que son rápidos, fiables y dicen exactamente qué consumidor se rompería.
4. ¿Cuál es la diferencia entre un stub y un mock y qué riesgo tiene abusar de los mocks?
   R: El stub devuelve respuestas predefinidas sin importar cómo se le llama; el mock además verifica qué llamadas se hicieron. Abusar de los mocks acopla el test a la implementación y lo rompe con refactors que no cambian el comportamiento.
5. ¿Qué es el semantic monitoring y cómo se hace seguro?
   R: Ejecutar periódicamente en producción recorridos sintéticos de usuario y alertar si fallan. Se hace seguro marcando esas peticiones para excluirlas de métricas de negocio, evitando efectos reales (cobros, envíos) y limpiando los datos que generan.
6. ¿Por qué en sistemas distribuidos conviene priorizar el MTTR?
   R: Porque es imposible eliminar todos los fallos antes de producción; reducir el tiempo de detección y recuperación con despliegues pequeños, buen monitoreo y rollback rápido limita el impacto de los fallos que inevitablemente se escapan.

## Ejercicio

En TypeScript, implementa un mini consumer-driven contract sin herramientas externas. Crea un servicio productor `customers` (Express) con `GET /customers/:id`. En el consumidor `webshop`, escribe un archivo `contracts/webshop-customers.json` con dos interacciones (cliente existente → 200 con `id` y `email`; inexistente → 404). En el productor, escribe un test de vitest que lea ese JSON, levante el servicio con datos semilla y verifique cada interacción, comprobando solo los campos del contrato. Luego cambia el productor para renombrar `email` a `emailAddress`. Criterio de terminado: el test de contrato del productor falla con un mensaje que nombra al consumidor y el campo roto; al aplicar expansion change (publicar ambos campos), vuelve a pasar.

## Explícalo con tus palabras

Explica por qué un contrato escrito por el consumidor protege mejor que un test end-to-end gigante, usando el ejemplo de un restaurante y sus proveedores.
