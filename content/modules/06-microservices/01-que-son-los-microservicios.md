---
title: Qué son los microservicios y cuándo no usarlos
kind: lesson
hours: 2
sources: Building Microservices 2nd ed., cap. 1 "What Are Microservices?" (pp. 18–56) | Hands-On Microservices with Kubernetes, cap. 2 "Getting Started with Microservices" (pp. 49–60)
links: Martin Fowler — Microservices | https://martinfowler.com/articles/microservices.html ; Martin Fowler — MonolithFirst | https://martinfowler.com/bliki/MonolithFirst.html
---

## Objetivo

Definir un microservicio por sus propiedades (despliegue independiente, dominio, estado propio) y no por su tamaño, distinguir los tres tipos de monolito y decidir con argumentos cuándo una arquitectura de microservicios compensa su costo.

## Estudio

### 1. Una definición que no habla de tamaño

La palabra "micro" engaña. Lleva a pensar que un microservicio se define por tener pocas líneas de código, y esa es justamente la propiedad menos útil para razonar sobre él. Una definición más operativa es esta:

> Un microservicio es un proceso que se despliega de forma independiente, que está modelado alrededor de una capacidad de negocio, que es dueño de su propio estado y que expone esa capacidad a través de una interfaz de red explícita.

Fíjate en cada pieza:

- **Proceso que se despliega de forma independiente.** No es un módulo ni una librería: es algo que corre por su cuenta y que puedes subir a producción sin subir nada más.
- **Modelado alrededor del negocio.** La frontera sigue al dominio ("pagos", "catálogo", "envíos"), no a una capa técnica ("la capa de datos", "la capa de UI").
- **Dueño de su estado.** Sus datos viven detrás de su interfaz. Nadie más lee sus tablas.
- **Interfaz de red explícita.** HTTP, gRPC, mensajes en un broker: un contrato que otros consumen sin conocer el interior.

Desde fuera, un microservicio es una caja negra. Puede usar el lenguaje, la base de datos y el framework que quiera; eso es asunto interno. Lo único público es su contrato. Es la misma idea de *information hiding* que conoces de la programación modular, llevada a la escala de procesos en red.

Los microservicios son, históricamente, una forma concreta de hacer SOA (*service-oriented architecture*). Mucho de lo que salió mal con SOA no fue la idea de servicios, sino middleware pesado, protocolos complejos, servicios que compartían base de datos y que había que desplegar juntos. Puedes pensar la relación así: microservicios es a SOA lo que Scrum es a Agile, una variante con opiniones fuertes sobre cómo hacerlo bien.

### 2. El concepto central: independent deployability

Si te quedas con una sola idea de todo el módulo, que sea esta: **poder cambiar un servicio, desplegarlo y liberarlo a los usuarios sin desplegar ningún otro**. Y no solo "poder": que sea la forma habitual de trabajar.

Esta propiedad funciona como una *forcing function*. Para lograrla tienes que conseguir varias cosas que tienen valor por sí mismas:

```
            independent deployability
                      │ exige
     ┌────────────────┼──────────────────────┐
     ▼                ▼                      ▼
 contratos         estado propio        fronteras que
 estables y        (sin base de         siguen al dominio
 explícitos        datos compartida)    (cambios locales)
     │                │                      │
     └────────► bajo acoplamiento ◄──────────┘
```

Si para desplegar el servicio de pedidos tienes que desplegar a la vez el de inventario, porque ambos leen la misma tabla o porque cambiaste un campo del contrato sin compatibilidad, entonces no tienes microservicios: tienes un **monolito distribuido**.

### 3. Modelar alrededor del negocio, no de capas

Muchas organizaciones dividen su sistema en capas técnicas y asignan un equipo a cada capa: frontend, backend, base de datos. El problema aparece cuando llega un cambio de negocio típico, por ejemplo "permitir que el cliente guarde su género musical favorito":

```
Arquitectura por capas (3 equipos)

  Equipo UI        [ formulario nuevo ]      ── despliegue 3
        │
  Equipo backend   [ endpoint + lógica ]     ── despliegue 2
        │
  Equipo DBA       [ columna nueva ]         ── despliegue 1

  Un cambio de negocio = 3 equipos + 3 despliegues ordenados
```

La mayoría de los cambios funcionales atraviesan todas las capas. Si cada capa es un servicio (o un equipo), cada cambio requiere coordinación. Los microservicios invierten la prioridad: prefieren **alta cohesión de funcionalidad de negocio** sobre alta cohesión de funcionalidad técnica. Un servicio "perfil de cliente" contiene su lógica, sus datos y, a veces, incluso fragmentos de UI. El cambio del género favorito toca un solo servicio y un solo equipo.

Aquí es donde DDD (módulo 03) se vuelve práctico: los *bounded contexts* son el mejor punto de partida para trazar esas fronteras. En la sesión 02 verás cómo se traduce un bounded context en uno o varios servicios.

### 4. Ser dueño del estado

La regla más difícil de aceptar para quien viene de monolitos es **no compartir bases de datos**. Si el servicio A necesita datos del servicio B, se los pide a B a través de su API o escucha sus eventos. Nunca lee directamente sus tablas.

¿Por qué es tan importante? Porque el esquema de una base de datos es un contrato implícito. Si otros servicios leen tus tablas, cualquier cambio de columna rompe a consumidores que no conoces. Pierdes la capacidad de distinguir entre lo que puedes cambiar libremente (implementación interna) y lo que debe cambiar con cuidado (contrato externo).

| Opción | Qué ganas | Qué pierdes |
| --- | --- | --- |
| Base de datos compartida | Joins fáciles, una sola fuente, consistencia transaccional | No puedes cambiar el esquema sin coordinar; el despliegue independiente desaparece |
| Base de datos por servicio | Encapsulación, libertad de esquema y tecnología, despliegue independiente | Joins entre servicios, consistencia eventual, más infraestructura |

Una base por servicio no significa necesariamente un servidor de base de datos por servicio. Puedes tener un mismo motor con esquemas separados y permisos que impidan cruzar. Lo que importa es la **propiedad lógica**: cada esquema tiene un único servicio dueño.

### 5. ¿Y el tamaño?

La pregunta "¿qué tan grande debe ser un microservicio?" tiene respuestas poco satisfactorias porque el tamaño es contextual. Contar líneas no sirve (el mismo comportamiento ocupa 10 líneas en un lenguaje y 40 en otro). Dos heurísticas útiles:

1. **Que quepa en tu cabeza.** Un servicio debería poder entenderlo completo una persona del equipo que lo mantiene.
2. **La interfaz lo más pequeña posible.** Lo que importa es cuánto expones, no cuánto código tienes adentro. Una interfaz pequeña significa menos acoplamiento.

En vez de preocuparte por el tamaño al empezar, pregúntate dos cosas: **¿cuántos servicios puedes operar hoy?** (cada uno trae pipelines, monitoreo, despliegues, guardias) y **¿dónde trazas las fronteras para que no queden acopladas?**

### 6. Microservicios compran opciones (y las opciones cuestan)

Una buena forma de pensar en esta arquitectura es como una compra de opciones: flexibilidad para escalar partes por separado, para usar distintas tecnologías, para que equipos trabajen sin pisarse, para aislar fallos. Pero cada opción tiene un precio.

Tampoco es un interruptor de encendido/apagado. Es un **dial**: a medida que extraes más servicios, aumenta la flexibilidad y también el dolor. Por eso conviene migrar de forma incremental: subes el dial un poco, mides el efecto en producción y decides si sigues.

### 7. Los tres monolitos

En este módulo, "monolito" significa **unidad de despliegue**: si toda la funcionalidad debe desplegarse junta, es un monolito. Hay tres variantes:

```
1) Single-process monolith        2) Modular monolith             3) Distributed monolith
┌─────────────────────────┐       ┌─────────────────────────┐     ┌─────┐  ┌─────┐  ┌─────┐
│ todo el código en un    │       │ ┌─────┐┌─────┐┌─────┐   │     │ svc │──│ svc │──│ svc │
│ proceso                 │       │ │ mod ││ mod ││ mod │   │     └──┬──┘  └──┬──┘  └──┬──┘
└───────────┬─────────────┘       │ └─────┘└─────┘└─────┘   │        └───┬────┴────────┘
            ▼                     └───────────┬─────────────┘            ▼
        [ una BD ]                            ▼                      [ una BD ]
                                   [ una BD, o esquemas por módulo ] se despliegan todos juntos
```

- **Single-process monolith.** Todo en un proceso. Puede tener varias instancias detrás de un load balancer, pero es un único artefacto. Es la opción por defecto razonable para muchos productos.
- **Modular monolith.** Un solo proceso, pero dividido en módulos con fronteras claras. Permite que varios equipos trabajen en paralelo sin la complejidad de la red. Es una alternativa muy seria a los microservicios; empresas grandes lo usan con éxito. Su punto débil suele ser la base de datos: el código está modularizado pero las tablas no. Si además separas el esquema por módulo, te dejas la puerta abierta para extraer servicios después.
- **Distributed monolith.** Varios servicios que, por acoplamiento, deben desplegarse juntos. Tiene las desventajas de un sistema distribuido (latencia, fallos parciales, depuración difícil) y las del monolito (despliegue coordinado), sin las ventajas de ninguno. Aparece cuando se ignoran el information hiding y la cohesión de negocio.

### 8. Delivery contention: el dolor real que resuelven

Cuando muchas personas trabajan en el mismo código y el mismo artefacto, se estorban: dos equipos tocan el mismo archivo, uno quiere desplegar el martes y otro necesita esperar, nadie sabe quién decide sobre cierto módulo. A esto se le llama **delivery contention**.

Un monolito no garantiza este problema ni los microservicios lo eliminan. Pero los microservicios dan **líneas de propiedad concretas**: este servicio es de este equipo, que lo despliega cuando quiere. Esa es, en la práctica, la razón número uno por la que las organizaciones adoptan microservicios: **permitir que más personas trabajen en el mismo sistema sin bloquearse**.

### 9. Tecnología habilitadora (sin adoptarla toda el primer día)

Ciertas herramientas hicieron viable esta arquitectura:

- **Log aggregation y distributed tracing**: sin ellos, depurar una petición que pasa por diez procesos es casi imposible. Es de lo primero que deberías tener.
- **Containers y Kubernetes**: aislamiento barato y una forma estándar de ejecutar y escalar procesos.
- **Streaming** (Kafka y similares): mover grandes volúmenes de eventos entre servicios.
- **Public cloud y serverless**: infraestructura bajo demanda, servicios gestionados.

El consejo práctico es no adoptar todo de golpe. Empieza con pocos servicios y, cuando aparezca un problema concreto (no sé qué servicio falló, desplegar es lento), busca la herramienta que lo resuelve.

### 10. Ventajas

| Ventaja | Qué significa en la práctica |
| --- | --- |
| Heterogeneidad tecnológica | El servicio de recomendaciones puede usar Python y una base de grafos; el de pagos, TypeScript y Postgres |
| Robustez | Si falla el servicio de reseñas, la tienda sigue vendiendo (siempre que diseñes para ello) |
| Escalado selectivo | Escalas solo el servicio de búsqueda en Black Friday, no todo el sistema |
| Despliegue más fácil | Cambios pequeños, riesgo pequeño, rollback rápido |
| Alineación organizacional | Equipos pequeños dueños de servicios concretos |
| Composabilidad | Las mismas capacidades se recombinan para web, móvil, socios, etc. |

Ojo con la robustez: no viene gratis. Un sistema distribuido tiene más puntos de fallo. Solo es más robusto si diseñas cada servicio para tolerar que otros fallen (módulo 05, sesión 12, y sesión 12 de este módulo).

### 11. Puntos de dolor

| Dolor | Por qué aparece |
| --- | --- |
| Experiencia de desarrollo | Ya no puedes levantar todo el sistema en tu laptop cuando hay decenas de servicios |
| Sobrecarga tecnológica | La tentación de adoptar Kubernetes, service mesh, Kafka y diez lenguajes a la vez |
| Costo | Más procesos, más infraestructura, más herramientas, más tiempo de equipo dedicado a la plataforma |
| Reporting | Los datos están repartidos; no hay una base sobre la que correr un `JOIN` global |
| Monitoreo y troubleshooting | Un error puede originarse tres saltos antes de donde se ve |
| Seguridad | Más tráfico en red, más superficies de ataque |
| Testing | Las pruebas end-to-end se vuelven lentas, frágiles y caras |
| Latencia | Lo que antes era una llamada en memoria ahora cruza la red, a veces varias veces |
| Consistencia de datos | Sin transacciones que crucen servicios; aparecen sagas y consistencia eventual |

Cada uno de estos dolores tiene una sesión en el módulo que te enseña a mitigarlo. Ninguno desaparece del todo.

### 12. ¿Debería usar microservicios?

La postura sana es: **el monolito es la opción por defecto; necesitas una razón para cambiar**. Un monolito no es sinónimo de legado, es una elección válida.

Cuándo tienden a **no** funcionar:

- **Productos nuevos y startups.** El dominio cambia mucho mientras buscas *product-market fit*. Si las fronteras cambian cada mes, mover lógica entre servicios es carísimo. Mejor esperar a que el dominio se estabilice.
- **Equipos pequeños.** Hay un "impuesto" fijo por operar microservicios (pipelines, despliegue, observabilidad). Si una de cinco personas se dedica solo a eso, es un 20 % menos de producto.
- **Software que instala y opera el cliente.** Pedirle a un cliente que despliegue veinte pods en su cluster no es razonable.

Cuándo tienden a funcionar:

- **Organizaciones que crecen** y necesitan que muchos desarrolladores trabajen en paralelo.
- **SaaS 24/7** donde liberar cambios pequeños sin ventanas de mantenimiento es muy valioso.
- **Necesidades de escalado o de tecnología muy distintas** entre partes del sistema.

### 12.1 Una lista de verificación antes de decidir

Antes de proponer microservicios, responde por escrito estas preguntas. Si la mayoría de respuestas apunta a "no", tu sistema probablemente está mejor como monolito modular:

| Pregunta | Señal a favor | Señal en contra |
| --- | --- | --- |
| ¿Qué problema concreto quieres resolver? | "Tres equipos se bloquean al desplegar" | "Queremos usar tecnología moderna" |
| ¿El dominio es estable? | Las entidades principales no cambian desde hace meses | Cada trimestre se redefine el producto |
| ¿Cuántas personas trabajan en el sistema? | Varios equipos de 5–8 personas | Un equipo de 3–6 personas |
| ¿Hay partes con cargas muy distintas? | La búsqueda recibe 100 veces más tráfico que la facturación | La carga es uniforme y modesta |
| ¿Puedes operar lo que construyes? | Hay pipelines, logs centralizados y alguien de guardia | Despliegues manuales, logs en cada servidor |
| ¿Quién opera el software? | Tu propio equipo, en tu infraestructura | El cliente, en su propio entorno |

La primera pregunta es la más importante. "Microservicios" nunca es un objetivo; es un medio. Si no puedes nombrar el resultado que esperas (despliegues más frecuentes, menos coordinación entre equipos, escalar una parte concreta), no tienes cómo saber si la migración funcionó.

### 12.2 Ejemplo trabajado

Imagina una tienda en línea de libros con un monolito en Node.js y una base Postgres. La empresa pasó de 8 a 40 desarrolladores en un año. Hoy hay un release cada dos semanas, coordinado por una persona que junta los cambios de cinco equipos, y un fallo en el módulo de recomendaciones ya tumbó el checkout dos veces.

Análisis rápido: el dominio de "catálogo", "carrito/checkout" y "recomendaciones" está estable; hay delivery contention clara; y hay una necesidad de aislamiento de fallos (recomendaciones no debería poder tumbar el checkout). Es un caso donde extraer **uno** o **dos** servicios tiene sentido, empezando por recomendaciones (poco acoplado al resto, distinto perfil de carga, fallo aislable). No es un caso para partir todo en veinte servicios a la vez: primero se extrae uno, se aprende a desplegarlo y monitorearlo, y luego se decide el siguiente.

### 13. Historia de fallo típica

Una startup de seis personas arranca con doce microservicios "porque vamos a escalar". A los cuatro meses descubre que el producto debe cambiar de enfoque: los conceptos de "suscripción" y "pedido" se fusionan. El cambio toca siete servicios, cada uno con su repositorio, pipeline y base de datos. Lo que en un monolito sería un refactor de una semana se convierte en dos meses de migraciones coordinadas. El equipo termina juntando los servicios en un monolito modular, que es donde debió empezar.

La lección no es "los microservicios son malos", sino que **las fronteras solo son baratas de mantener cuando el dominio ya es estable**.

### 14. Errores comunes

- Definir microservicios por tamaño ("cada servicio debe tener menos de 500 líneas").
- Partir por capas técnicas (un servicio de "datos", otro de "lógica").
- Compartir la base de datos "solo por ahora".
- Desplegar todos los servicios juntos en cada release (monolito distribuido).
- Adoptar toda la tecnología de golpe antes de tener el problema que resuelve.
- Ignorar el costo operativo y el tamaño del equipo.

### 15. Visión desde Kubernetes (avance)

El libro de Sayfan insiste en una idea que complementa a Newman: un microservicio "pequeño" debe ser **autónomo** (su propio ciclo de vida, datos y despliegue) y comunicarse por **interfaces y contratos** explícitos. Kubernetes encaja porque le da a cada servicio una unidad de empaquetado (la imagen de container), un mecanismo de exposición (Service) y un ciclo de vida gestionado (Deployment). Lo verás a partir de la sesión 10. Por ahora basta con saber que la plataforma facilita la operación, pero **no decide tus fronteras**: un mal corte sigue siendo malo aunque corra en Kubernetes.

## Conceptos clave

- **Microservicio**: proceso desplegable de forma independiente, modelado sobre una capacidad de negocio, dueño de su estado y con interfaz de red explícita.
- **Independent deployability**: poder cambiar, desplegar y liberar un servicio sin desplegar otros, como práctica habitual.
- **Information hiding**: ocultar detalles internos detrás de una interfaz estable para poder cambiarlos sin afectar a consumidores.
- **Single-process monolith**: todo el sistema en un único proceso desplegable.
- **Modular monolith**: un único proceso dividido en módulos con fronteras claras.
- **Distributed monolith**: varios servicios que deben desplegarse juntos por acoplamiento.
- **Delivery contention**: fricción cuando muchas personas cambian y despliegan el mismo artefacto.
- **Microservice tax**: costo fijo de operar servicios (pipelines, monitoreo, despliegue) que pagas antes de obtener beneficios.

## Preguntas de repaso

1. ¿Por qué el tamaño es un mal criterio para definir un microservicio y qué criterios lo sustituyen?
   R: Porque el tamaño en líneas depende del lenguaje y de la experiencia del equipo, y no dice nada del acoplamiento. Lo que importa es que el servicio sea desplegable de forma independiente, siga una capacidad de negocio, sea dueño de su estado y tenga una interfaz pequeña y explícita; como heurística, que una persona del equipo pueda entenderlo completo.
2. ¿Qué es un monolito distribuido y por qué se considera el peor de los mundos?
   R: Es un sistema con varios servicios que, por acoplamiento (base compartida, contratos que cambian sin compatibilidad, lógica repartida), deben desplegarse juntos. Sufre los problemas de un sistema distribuido (latencia, fallos parciales, depuración difícil) y los del monolito (despliegue coordinado) sin obtener la autonomía que justificaba la distribución.
3. ¿Por qué compartir la base de datos entre servicios rompe el despliegue independiente?
   R: Porque el esquema se convierte en un contrato implícito con consumidores que no controlas. Cualquier cambio de tabla o columna puede romperlos, así que tienes que coordinar despliegues. Además pierdes la frontera entre implementación interna y contrato público.
4. Da dos situaciones donde no recomendarías microservicios y una donde sí, con su razón.
   R: No: una startup buscando product-market fit (el dominio cambia y mover fronteras entre servicios es caro) y un equipo de pocas personas (el costo fijo de operación consume una parte grande de su capacidad); tampoco software que instala el cliente. Sí: una organización en crecimiento con muchos desarrolladores sobre el mismo sistema, porque los servicios dan líneas de propiedad que reducen la delivery contention.
5. ¿En qué se diferencia un modular monolith de un sistema de microservicios y por qué puede ser mejor opción?
   R: Ambos tienen fronteras claras, pero el modular monolith se despliega como un único proceso, sin llamadas de red entre módulos. Evita latencia, fallos parciales y consistencia eventual, y permite trabajo en paralelo. Si además separa los esquemas por módulo, deja abierta la extracción futura de servicios.
6. ¿Por qué se dice que los microservicios "compran opciones" y cómo afecta eso a la forma de migrar?
   R: Porque dan flexibilidad (escalado selectivo, tecnología distinta, equipos autónomos) a cambio de un costo. Como no sabes qué opciones vas a necesitar, conviene subir el "dial" poco a poco: extraer un servicio, medir el impacto real y decidir si seguir, en vez de reescribir todo de golpe.

## Ejercicio

Elige un sistema que conozcas (por ejemplo, este Study Tracker o una app de tu trabajo) y escribe en un archivo `analisis-microservicios.md` una evaluación de una página con tres partes: (1) qué tipo de monolito es hoy y por qué; (2) una tabla con al menos cinco de los puntos de dolor de esta sesión, puntuados de 1 a 5 según cuánto te afectarían si lo partieras; (3) una recomendación argumentada: quedarse como monolito, pasar a monolito modular o extraer uno o dos servicios concretos. Criterio de terminado: la recomendación cita al menos dos factores del contexto (tamaño del equipo, estabilidad del dominio, necesidad de escalado, tipo de despliegue) y nombra qué señal te haría cambiar de opinión.

## Explícalo con tus palabras

Explícale a alguien que solo conoce aplicaciones monolíticas por qué "poder desplegar un servicio sin tocar los demás" es la propiedad que da sentido a todo lo demás.
