---
title: Personas, interfaces de usuario y la ley de Conway
kind: lesson
hours: 2
sources: Building Microservices 2nd ed., cap. 14 "User Interfaces" (pp. 561–602), cap. 15 "Organizational Structures" (pp. 603–642) y cap. 16 "The Evolutionary Architect" (pp. 643–672) | Hands-On Microservices with Kubernetes, cap. 2 "Understanding Conway's law" (pp. 57–59)
links: Martin Fowler — Micro Frontends | https://martinfowler.com/articles/micro-frontends.html ; Sam Newman — Backends For Frontends | https://samnewman.io/patterns/architectural/bff/ ; Team Topologies — Key concepts | https://teamtopologies.com/key-concepts
---

## Objetivo

Relacionar la estructura de los equipos con la arquitectura (ley de Conway y su maniobra inversa), elegir modelos de propiedad de servicios, decidir cómo descomponer y componer la interfaz de usuario (monolithic frontend, micro frontends, BFF, GraphQL) y entender el papel de un arquitecto evolutivo y del "paved road".

## Estudio

### 1. La ley de Conway

En 1968, Melvin Conway observó que **las organizaciones diseñan sistemas que copian su estructura de comunicación**. Una formulación popular: "si cuatro grupos trabajan en un compilador, obtendrás un compilador de cuatro pasadas".

Hay evidencia empírica que la respalda. Estudios que compararon productos similares hechos por organizaciones muy acopladas (empresas con equipos co-ubicados) y poco acopladas (comunidades open source distribuidas) encontraron que las segundas producían software más modular. Un estudio interno de un gran fabricante de software encontró que las métricas **organizacionales** (por ejemplo, cuántos ingenieros y de cuántos equipos tocan un componente) predecían mejor los defectos que las métricas de complejidad del código.

La consecuencia para microservicios es directa: **si quieres una arquitectura poco acoplada, necesitas una organización poco acoplada**. Si tres equipos tienen que coordinarse para cualquier cambio, terminarás con servicios que hay que cambiar juntos, sin importar lo bonito que sea el diagrama.

Sayfan muestra tres formas habituales de organizar equipos y su reflejo en el sistema:

| Organización | Descripción | Efecto en la arquitectura |
| --- | --- | --- |
| Horizontal (por capa) | Equipo de frontend, de backend, de bases de datos | Servicios por capa técnica; cada cambio de negocio cruza equipos |
| Vertical (por capacidad) | Cada equipo dueño de una capacidad de punta a punta | Servicios alineados al dominio; cambios locales |
| Matricial | Equipos verticales con especialistas compartidos | Flexible, pero exige cuidar la propiedad |

### 2. Tamaño de equipo y autonomía

Los equipos pequeños (la idea de los "equipos de dos pizzas": que se puedan alimentar con dos pizzas, unas 5–8 personas) se comunican mejor y deciden más rápido. Para que un equipo pequeño sea efectivo necesita **autonomía**: poder cambiar, desplegar y operar lo suyo sin pedir permiso a otros equipos para cada cosa.

Autonomía no significa ausencia de reglas. Significa empujar las decisiones hacia donde está el contexto, dentro de unos límites claros (estándares de observabilidad, seguridad, interfaces). Los microservicios bien trazados son lo que hace posible esa autonomía: un servicio con frontera clara puede ser **propiedad** de un equipo.

Un concepto útil (popularizado por el libro *Team Topologies*) es el de **stream-aligned team**: un equipo alineado con un flujo de valor del negocio (por ejemplo, "experiencia de compra" o "gestión de envíos"), dueño de punta a punta de lo que entrega, incluida la interfaz de usuario cuando corresponde.

### 3. Modelos de propiedad

**Propiedad fuerte (strong ownership).** Cada servicio tiene un equipo dueño. Otros equipos pueden proponer cambios (por ejemplo, con una pull request), pero el dueño decide y revisa. Escala bien con muchos equipos.

**Propiedad colectiva (collective ownership).** Cualquier equipo puede cambiar cualquier servicio. Funciona en organizaciones pequeñas con mucha comunicación; con muchos equipos lleva a cambios inconsistentes y a que nadie se sienta responsable.

Lo habitual es **propiedad colectiva dentro del equipo** (cualquier miembro toca cualquier servicio del equipo) y **propiedad fuerte entre equipos**.

**Servicios compartidos por varios equipos** aparecen por tres razones típicas, cada una con su remedio:

| Razón | Remedio |
| --- | --- |
| "Es muy difícil de partir" | Invertir en partirlo o asignar un dueño único con un proceso claro para pedir cambios |
| Cambios transversales: muchas funcionalidades tocan el mismo servicio | Revisar fronteras; quizá el servicio es demasiado grande o mal cortado |
| Cuellos de botella de entrega: el equipo dueño no da abasto | Modelo de **open source interno**: otros equipos contribuyen con PRs y el dueño actúa como *core committer* |

**Open source interno.** Los dueños (core committers) definen guías de contribución, revisan y mantienen la calidad; los demás equipos aportan cambios. Funciona mejor con servicios maduros y estables, y con buenas herramientas (CI, revisiones). Para un servicio en plena evolución, la revisión de cambios ajenos puede volverse un cuello de botella.

**El servicio huérfano.** Un servicio que funciona, nadie toca desde hace un año y no tiene dueño claro. El día que haya que cambiarlo, nadie sabrá cómo. Todo servicio debe tener un equipo dueño registrado (el humane registry de la sesión 06 ayuda), aunque el servicio esté "terminado".

### 4. Equipos habilitadores y plataforma

Si cada equipo es autónomo, ¿cómo evitas que cada uno reinvente el pipeline, el logging y el despliegue? Con dos tipos de apoyo:

- **Enabling teams**: equipos que ayudan temporalmente a otros a adquirir una capacidad (por ejemplo, adoptar contract testing o mejorar su seguridad) y luego se retiran. También las **comunidades de práctica**: grupos transversales (frontend, seguridad, testing) que comparten conocimiento y acuerdan buenas prácticas.
- **Platform team**: construye y opera una **plataforma interna** que ofrece capacidades como autoservicio (crear un servicio, un pipeline, una base de datos, ver logs). Su objetivo es reducir la carga cognitiva de los equipos de producto.

Una advertencia: la plataforma debe tratarse como un **producto** cuyos clientes son los equipos internos. Si es obligatoria pero mala, los equipos la esquivan o se frustran. Una buena plataforma se adopta porque hace el camino fácil.

### 5. La ley de Conway al revés

Si la arquitectura copia a la organización, también puedes **diseñar la organización para obtener la arquitectura que quieres** (a veces llamada *inverse Conway maneuver*). Por ejemplo, si quieres separar pagos en un servicio independiente, crear un equipo de pagos con propiedad clara empuja en esa dirección.

Dos cautelas: cambiar la estructura de equipos es costoso y afecta a personas, y la organización no siempre se puede rediseñar a voluntad. A veces lo práctico es al revés: aceptar la organización existente y trazar las fronteras de servicio para que coincidan con ella.

**Distribución geográfica.** Equipos en zonas horarias muy distintas se comunican peor. Conway predice que las fronteras del sistema tenderán a seguir esas distancias, así que conviene asignar servicios completos a ubicaciones y no repartir un mismo servicio entre continentes.

### 5.1 Señales de que organización y arquitectura no coinciden

Puedes diagnosticar un desajuste con datos que ya tienes:

- **Cambios que cruzan repositorios de varios equipos.** Si en el historial de git ves que la mayoría de las funcionalidades necesitan commits en servicios de dos o tres equipos, las fronteras de servicio no siguen las fronteras de equipo (o al revés).
- **Reuniones de coordinación para desplegar.** Si existe una reunión semanal para decidir qué se despliega y en qué orden, hay acoplamiento que la arquitectura no está absorbiendo.
- **Servicios con muchos autores de muchos equipos.** Cuenta cuántos equipos distintos hacen commits en cada servicio en un trimestre. Un servicio tocado por cinco equipos es candidato a partirse, a tener un dueño más claro o a funcionar como open source interno.
- **Colas de tickets entre equipos.** Si un equipo pasa más tiempo esperando a otro que trabajando, la dependencia está mal ubicada.
- **Incidentes "de nadie".** Si ante un fallo nadie sabe quién debe responder, hay servicios sin dueño.

Ninguna de estas señales se arregla solo con tecnología. Las soluciones combinan mover fronteras de servicio, reasignar propiedad y, a veces, reorganizar equipos.

### 6. Interfaces de usuario: ¿quién es dueño del frontend?

Durante años, el modelo dominante fue un **equipo de frontend** dedicado, separado de los equipos de backend. Razones: escasez de especialistas, deseo de consistencia visual, retos técnicos propios de las apps web y móviles. Pero eso reproduce la división por capas: cada funcionalidad nueva exige que el equipo de frontend y uno o varios de backend se coordinen.

La alternativa es que los **stream-aligned teams** incluyan capacidades de frontend y sean dueños de su parte de la interfaz. Para que funcione:

- **Especialistas compartidos**: diseñadores o expertos de UI que trabajan con varios equipos o forman comunidades de práctica.
- **Consistencia**: un **design system** (componentes, estilos, guías) compartido que todos usan, mantenido por un equipo o una comunidad.
- **Retos técnicos**: componer en una sola experiencia piezas hechas por distintos equipos. Ahí entran los patrones siguientes.

### 7. Patrones para el frontend

**Monolithic frontend.** Una sola aplicación (por ejemplo, una SPA) que llama a los microservicios para obtener datos. Es el modelo más común. Funciona bien si un solo equipo lo mantiene. Problemas: con varios equipos aparece contención (todos tocan el mismo código y el mismo despliegue), y es difícil adaptar las respuestas a distintos dispositivos (el móvil recibe cien campos cuando muestra diez).

**Micro frontends.** La interfaz se divide en partes que se desarrollan y **despliegan de forma independiente**, cada una de un equipo, y se componen en el navegador. Dos variantes:

- **Descomposición por páginas**: cada página (o sección del sitio) es de un equipo; la navegación entre páginas es el punto de integración. Simple y robusta; muy adecuada para sitios web.
- **Descomposición por widgets**: una misma página compone fragmentos de varios equipos (el carrito en la esquina es de un equipo; la lista de productos de otro). Más flexible, pero exige resolver comunicación entre widgets, estilos, dependencias duplicadas (cada widget con su copia de un framework) y tamaño de descarga.

```
 Página de producto (descomposición por widgets)
 ┌──────────────────────────────────────────────────────┐
 │ [cabecera: equipo Plataforma]   [mini carrito: Compras]│
 │ ┌───────────────────────────┐ ┌──────────────────────┐│
 │ │ detalle: equipo Catálogo  │ │ precio: equipo Precios││
 │ └───────────────────────────┘ └──────────────────────┘│
 │ [reseñas: equipo Comunidad]                            │
 └──────────────────────────────────────────────────────┘
```

Restricciones de cada tipo de interfaz: en móviles nativos, desplegar de forma independiente es más difícil (las tiendas de apps revisan cada versión y los usuarios no siempre actualizan), así que los micro frontends encajan sobre todo en la web.

**Central aggregating gateway.** Un gateway que agrega y filtra llamadas para **todas** las interfaces. Reduce viajes del cliente, pero si un equipo central es dueño y debe atender a web, móvil y socios, se convierte en cuello de botella y acumula lógica de todos (lo viste en la sesión 06).

**Backend for Frontend (BFF).** Un backend **por tipo de interfaz** (uno para la web, otro para la app móvil, otro para socios), propiedad del **mismo equipo** que la interfaz. El BFF agrega llamadas, filtra campos y adapta formatos a esa interfaz concreta.

```
 App móvil ──► BFF móvil  ──┐
                            ├──► Catálogo, Pedidos, Precios, Reseñas
 Web       ──► BFF web    ──┘
 (cada BFF es del equipo de su interfaz; sin lógica de negocio de dominio)
```

Reglas para BFF sanos:

- **Uno por experiencia de usuario**, no por cada pantalla ni uno para todo. Si dos interfaces son muy parecidas (app iOS y Android), pueden compartir BFF.
- **Lógica de presentación, no de negocio**: agregar, filtrar, adaptar. Las reglas del dominio viven en los microservicios.
- **Reutilización con cuidado**: si dos BFF duplican mucha agregación, quizá esa agregación merece un servicio propio; pero algo de duplicación es aceptable.

**GraphQL.** El cliente pide exactamente los campos que necesita y un servidor GraphQL resuelve llamando a los microservicios. Puede actuar como un BFF más flexible o complementarlo. Cuidados ya vistos: consultas costosas y caching más difícil.

**Enfoque híbrido.** En la práctica se combinan: micro frontends por página para la web, un BFF para la app móvil, y un design system compartido.

### 7.1 Ejemplo trabajado: tres interfaces, tres decisiones

Una cadena de cines tiene cuatro equipos stream-aligned (Cartelera, Compra de entradas, Fidelización, Snacks) y tres interfaces: sitio web, app móvil y quioscos de autoservicio en los cines.

**Sitio web → micro frontends por página.** La cartelera, el flujo de compra y la página de puntos son áreas claramente separadas. Cada equipo es dueño de sus páginas y las despliega cuando quiere. Un equipo de plataforma pequeño mantiene la "carcasa" (cabecera, navegación, login) y el design system. Se descarta la composición por widgets salvo en un caso: el resumen de puntos que aparece en la página de compra, servido como un fragmento del equipo de Fidelización con un contrato de props muy simple.

**App móvil → BFF móvil + app con módulos.** La app pasa por revisión de tiendas y los usuarios tardan en actualizar, así que los micro frontends desplegables no encajan. Se crea un BFF móvil, propiedad del equipo móvil, que agrega cartelera, disponibilidad de asientos y puntos en una sola respuesta optimizada para pantallas pequeñas y redes lentas. Para no depender siempre del equipo móvil, la app se organiza en módulos por área, con dueños de los equipos de dominio que contribuyen como open source interno.

**Quioscos → BFF propio.** Los quioscos tienen necesidades muy distintas: sesiones anónimas, impresión de entradas, funcionamiento con conectividad intermitente. Comparten poco con la web o el móvil, así que tienen su propio BFF, propiedad del equipo de Compra de entradas, que es quien más cambia ese flujo.

Lo que **no** se hace: un único gateway central que agregue para las tres interfaces. Cada interfaz evoluciona a su ritmo y con su equipo. La duplicación entre BFF (por ejemplo, la llamada para obtener la cartelera) se acepta; si con el tiempo una agregación se repite en todos, se considera moverla a un servicio de dominio.

### 8. El arquitecto evolutivo

En un sistema de microservicios, la arquitectura no es un plano que se dibuja una vez. Se parece más al trabajo de un **urbanista** que al de un arquitecto de edificios: define zonas y reglas (dónde va cada cosa, cómo se conecta), pero no decide el diseño de cada casa. Los equipos deciden dentro de su zona; el arquitecto cuida **entre** zonas (interfaces, comunicación, observabilidad, seguridad).

Herramientas del rol:

- **Objetivos estratégicos** del negocio, **principios** que se derivan de ellos ("los servicios son dueños de sus datos", "toda comunicación entre servicios usa contratos explícitos") y **prácticas** concretas que los implementan ("las APIs se describen con OpenAPI y se verifican en CI").
- **Un estándar mínimo obligatorio** para todo servicio: monitoreo (métricas y logs en el formato común, health checks), interfaces (pocas tecnologías de integración), seguridad arquitectónica (timeouts, circuit breakers, autenticación).
- **Paved road (camino pavimentado)**: hacer que lo correcto sea lo fácil. **Ejemplares** (servicios de referencia reales que muestran cómo hacerlo bien) y **plantillas de servicio** que traen ya configurados logging, métricas, tracing, health checks, Dockerfile y pipeline. No prohíbes salirte del camino, pero quien se sale asume el costo.
- **Gestión de deuda técnica y excepciones**: registrar las desviaciones de los principios y revisarlas; si muchas excepciones apuntan a lo mismo, quizá el principio debe cambiar.
- **Habitabilidad**: el sistema debe ser un lugar donde los desarrolladores puedan trabajar a gusto; la arquitectura es también una construcción social.

### 9. Historia de fallo

Una empresa reorganiza su ingeniería en ocho equipos verticales, pero mantiene un único equipo de frontend de seis personas que mantiene la SPA monolítica. Los equipos verticales despliegan sus servicios varias veces al día, pero cada funcionalidad visible necesita que el equipo de frontend la implemente, y su backlog acumula tres meses. Los servicios se desacoplaron; la entrega de valor no. La solución fue migrar a micro frontends por página, mover a los desarrolladores de frontend a los equipos verticales y convertir al antiguo equipo de frontend en dueño del design system y de la "carcasa" de la aplicación.

### 10. Errores comunes

- Dividir el sistema en servicios sin tocar la estructura de equipos.
- Servicios compartidos por muchos equipos sin dueño claro.
- Servicios huérfanos sin equipo registrado.
- Un equipo de frontend central como cuello de botella para todos los equipos de producto.
- Un único "BFF" para todas las interfaces que termina siendo un gateway central con lógica de todos.
- Lógica de negocio en el BFF.
- Plataformas internas obligatorias que nadie quiere usar.
- Arquitectos que dibujan cada servicio en lugar de cuidar las reglas entre ellos.

## Conceptos clave

- **Ley de Conway**: los sistemas reflejan la estructura de comunicación de la organización que los crea.
- **Inverse Conway maneuver**: diseñar los equipos para obtener la arquitectura deseada.
- **Stream-aligned team**: equipo alineado a un flujo de valor, dueño de punta a punta.
- **Propiedad fuerte / colectiva**: un equipo dueño decide sobre el servicio / cualquiera puede cambiarlo.
- **Open source interno**: otros equipos contribuyen con cambios y el dueño revisa como core committer.
- **Micro frontends**: partes de la interfaz desarrolladas y desplegadas de forma independiente por distintos equipos.
- **Backend for Frontend (BFF)**: backend dedicado a una interfaz concreta, propiedad del equipo de esa interfaz.
- **Paved road**: plantillas, ejemplares y herramientas que hacen fácil seguir los estándares.

## Preguntas de repaso

1. ¿Qué dice la ley de Conway y qué implica para una migración a microservicios?
   R: Que los sistemas copian la estructura de comunicación de la organización. Implica que para obtener servicios poco acoplados hace falta que los equipos también lo estén, con propiedad clara de cada servicio; si los equipos deben coordinarse para todo, los servicios terminarán acoplados.
2. Compara propiedad fuerte y colectiva y explica cuándo conviene cada una.
   R: En la propiedad fuerte un equipo dueño decide y revisa los cambios de su servicio; escala bien con muchos equipos. En la colectiva cualquiera cambia cualquier servicio; funciona en grupos pequeños con mucha comunicación. Lo habitual es colectiva dentro del equipo y fuerte entre equipos.
3. ¿Qué diferencia hay entre un central aggregating gateway y un BFF?
   R: El gateway central agrega llamadas para todas las interfaces y suele ser de un equipo central, lo que lo convierte en cuello de botella y acumula lógica de todos. El BFF es un backend por tipo de interfaz, propiedad del equipo de esa interfaz, que puede evolucionar al ritmo de su frontend.
4. Compara la descomposición de micro frontends por páginas y por widgets.
   R: Por páginas, cada página es de un equipo y la navegación es la integración: simple y robusta. Por widgets, una página compone fragmentos de varios equipos: más flexible pero con problemas de comunicación entre widgets, estilos, dependencias duplicadas y tamaño de descarga.
5. ¿Qué es el paved road y por qué es mejor que prohibir alternativas?
   R: Es el conjunto de plantillas, servicios ejemplares y herramientas que hacen fácil cumplir los estándares (observabilidad, seguridad, despliegue). Es mejor que prohibir porque los equipos lo adoptan por conveniencia, conservan la libertad de salirse cuando tienen una razón, y asumen el costo de hacerlo.
6. ¿Por qué un servicio huérfano es un riesgo aunque funcione bien?
   R: Porque cuando haga falta cambiarlo (un parche de seguridad, un cambio de contrato) nadie tendrá el conocimiento ni la responsabilidad de hacerlo, y los cambios urgentes se harán a ciegas. Todo servicio necesita un equipo dueño registrado.

## Ejercicio

Toma el documento de diseño de AulaViva (sesión 08) y añade una sección "Equipos e interfaces". Propón: (1) la estructura de equipos (stream-aligned, plataforma, habilitadores) con el número de personas de cada uno a partir de los 60 desarrolladores, y qué servicios es dueño cada equipo; (2) la estrategia de frontend para la web y la app móvil (micro frontends, BFF, GraphQL o híbrido) con justificación; (3) tres principios arquitectónicos y la práctica que implementa cada uno; (4) el contenido de una plantilla de servicio del paved road. Criterio de terminado: cada servicio tiene exactamente un equipo dueño, ningún equipo tiene más de 8 personas, y para cada interfaz queda claro qué equipo puede desplegarla sin coordinar con otros.

## Explícalo con tus palabras

Explica la ley de Conway con el ejemplo de un grupo de amigos que organiza un viaje dividiéndose las tareas, y qué pasaría si se dividieran de otra forma.
