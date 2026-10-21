---
title: "Arquitectura de sistemas: lista de verificación, cliente/servidor, capas y procesamiento"
kind: lesson
hours: 2
sources: Systems Analysis and Design 9.ª ed., cap. 10 "System Architecture" (pp. 474–510)
---

## Objetivo

Conocer las decisiones de arquitectura "física" de un sistema: la lista de verificación que guía la elección (organización, costo total, escalabilidad, integración web, sistemas legados, procesamiento, seguridad), los estilos cliente/servidor de dos y tres capas, clientes gruesos y delgados, middleware, arquitecturas basadas en Internet y en la nube, y el procesamiento en línea frente al procesamiento por lotes.

## Estudio

### Dos significados de "arquitectura"

Hasta ahora, "arquitectura" significaba la forma del **código**: componentes, dependencias, límites. El libro de Shelly y Rosenblatt usa la palabra en un sentido complementario: la **arquitectura del sistema** traduce el diseño lógico en una estructura física que incluye hardware, software, red, soporte, métodos de procesamiento y seguridad. Ambas visiones se necesitan: puedes tener un código impecable que falle porque eligiste procesar en línea algo que debía ir por lotes, o un servidor que no escala.

### La lista de verificación de arquitectura

Igual que un arquitecto empieza con la lista de requisitos del dueño, el analista empieza con una lista de verificación de temas que afectan la elección:

| Tema | Pregunta clave | Ejemplo |
| --- | --- | --- |
| **Organización y cultura** | ¿Cómo está organizada la empresa y cómo trabaja? | Una empresa muy descentralizada puede preferir sistemas por sede; una centralizada, uno único. |
| **ERP y plataforma corporativa** | ¿Existe una estrategia de plataforma común (estándares de datos, red, interfaz)? | Si la empresa ya usa un ERP, el sistema nuevo debe integrarse con él, no competir. |
| **Costo inicial y costo total de propiedad** | ¿Cuánto cuesta construirlo y cuánto cuesta vivir con él? | Licencias y servidores son "costos duros"; soporte, capacitación y caídas son "costos blandos" que suelen superar a los primeros. |
| **Escalabilidad** | ¿Puede crecer en usuarios, datos y transacciones? | Pasar de una sede a cincuenta sin rediseñar. |
| **Integración web** | ¿Se integra con aplicaciones y servicios en Internet? | Exponer una API, integrarse con pagos, mapas o mensajería. |
| **Interfaz con sistemas legados** | ¿Debe convivir con sistemas antiguos que siguen funcionando? | Un sistema contable de hace 20 años que no se puede reemplazar todavía. |
| **Opciones de procesamiento** | ¿En línea, por lotes o mixto? ¿Qué disponibilidad se necesita? | Un punto de venta exige respuesta inmediata; la nómina puede ir por lotes. |
| **Seguridad** | ¿Qué amenazas hay y cómo se protegen datos y transacciones? | Datos de pago, accesos remotos, comercio electrónico. |

#### Costo total de propiedad, otra vez

El libro insiste en que el TCO incluye costos **duros** (compras, licencias, contratos) y **blandos** (gestión, soporte, capacitación, tiempo perdido por caídas), y que los costos de usuarios y operación suelen superar los de adquirir hardware y software. Antes de decidir, conviene revisar si las suposiciones iniciales siguen siendo válidas: si construir sigue siendo mejor que comprar, si hay productos nuevos, si cambió la regulación o si una fusión cambia el panorama.

Esta idea es la misma que la meta de Clean Architecture de la sesión 1: **lo caro no es construir, es mantener**. Un sistema barato de construir y caro de operar es una mala inversión.

#### Sistemas legados

Un **sistema legado** es un sistema antiguo, con tecnología obsoleta, que todavía funciona y del que el negocio depende. Integrar un sistema nuevo con uno legado exige analizar formatos de datos y compatibilidad, y a veces construir interfaces o migrar datos, lo que puede ser caro y lento. En DDD verás un patrón específico para esto: la **capa anticorrupción** (sesión 27), que traduce entre el modelo del legado y el del sistema nuevo para que el primero no "contamine" al segundo. Es un Adapter a escala de sistema.

### Planificar la arquitectura: dónde se procesa

La pregunta central es **dónde vive cada parte del trabajo**. Toda aplicación tiene tres partes lógicas:

1. **Presentación (interfaz de usuario)**: mostrar información y capturar entradas.
2. **Lógica de aplicación (reglas de negocio)**: procesar los datos según las reglas.
3. **Gestión de datos**: almacenar y recuperar.

Históricamente, todo vivía en un **mainframe** central y los usuarios usaban terminales sin capacidad de proceso. Luego llegaron las computadoras personales y las redes, y con ellas el **cliente/servidor**.

### Cliente/servidor

En una arquitectura **cliente/servidor**, el procesamiento se divide entre uno o varios **clientes** en red y un **servidor** central. El cliente envía una petición; el servidor realiza la operación y responde.

#### Servidor de archivos vs. cliente/servidor

Un detalle que el libro explica bien: en un diseño de **servidor de archivos**, el cliente pide un archivo completo y lo procesa él mismo (por ejemplo, descarga toda la tabla de clientes para buscar uno). En un diseño **cliente/servidor**, el cliente envía una consulta y el servidor devuelve **solo el resultado**. Esto reduce la carga de red y mejora los tiempos de respuesta. La regla de rendimiento que se deriva sigue vigente en las APIs modernas: **el cliente debe contactar al servidor solo cuando sea necesario y hacer el menor número posible de viajes**. Es la razón por la que una pantalla que hace 40 peticiones HTTP para mostrar una lista es lenta.

#### Clientes gruesos y delgados

| | Cliente grueso (fat/thick) | Cliente delgado (thin) |
| --- | --- | --- |
| Dónde está la lógica | Toda o casi toda en el cliente. | Casi toda en el servidor. |
| Ventajas | Menos carga en el servidor, interfaz rica, puede trabajar algo sin conexión. | Fácil de actualizar (cambias el servidor), menor costo de soporte, clientes baratos. |
| Desventajas | Más difícil de actualizar y dar soporte; TCO más alto. | Más carga en el servidor; depende de la red. |
| Ejemplo moderno | Una SPA o app móvil con mucha lógica local. | Una aplicación renderizada en el servidor. |

La industria oscila entre ambos extremos (Martin habla del "péndulo sin fin" en el capítulo "La web es un detalle", sesión 33). La lección arquitectónica: si las **reglas de negocio** están aisladas de la presentación, mover lógica entre cliente y servidor deja de ser una reescritura.

#### Dos capas, tres capas y n capas

- **Dos capas (two-tier)**: la interfaz y la lógica viven en el cliente; los datos, en el servidor. Simple, pero cada cliente habla directamente con la base de datos: difícil de escalar y de asegurar, y cada cambio de lógica exige actualizar a todos los clientes.
- **Tres capas (three-tier)**: aparece una **capa intermedia** (servidor de aplicaciones) entre la interfaz y los datos, que contiene la lógica de negocio. El cliente se vuelve más delgado, la lógica se centraliza y la base de datos queda protegida.
- **N capas**: se agregan más capas intermedias (servidores web, de aplicaciones, de caché, de integración).

```
Dos capas                         Tres capas
┌───────────────────┐             ┌──────────────┐
│ Cliente           │             │ Cliente      │  presentación
│ UI + lógica       │             └──────┬───────┘
└────────┬──────────┘                    │ HTTP
         │ SQL                     ┌──────▼───────┐
┌────────▼──────────┐             │ Servidor de   │  lógica de negocio
│ Servidor de datos │             │ aplicaciones  │
└───────────────────┘             └──────┬───────┘
                                         │ SQL
                                  ┌──────▼───────┐
                                  │ Base de datos │  datos
                                  └──────────────┘
```

#### Middleware

El **middleware** es software que conecta las capas y las aplicaciones entre sí, permitiendo que sistemas distintos se comuniquen y compartan datos aunque usen tecnologías diferentes: colas de mensajes, servidores de aplicaciones, buses de integración, gateways de API. Es el "pegamento" de las arquitecturas multicapa, y es la razón por la que aparecen tantos adaptadores en los sistemas reales.

#### Ventajas y riesgos del cliente/servidor

El cliente/servidor ofrece flexibilidad, escalabilidad y la posibilidad de usar hardware más barato que un mainframe. Pero el libro advierte que en sus inicios muchos proyectos **no lograron los ahorros esperados**: faltaban estándares, el desarrollo costó más de lo previsto y los costos de soporte de muchos clientes eran altos. Además, el rendimiento se comporta de forma no lineal: los tiempos de respuesta aumentan poco a poco con la carga y luego **se disparan** cuando el sistema se acerca a su capacidad. Por eso hay que planificar la capacidad con margen.

```
tiempo de
respuesta
   │                                  ╱
   │                                 ╱
   │                               ╱
   │                          __--
   │__________________-----‾‾
   └──────────────────────────────────── carga
                                  ▲ cerca de la capacidad
```

### Arquitectura basada en Internet

Con Internet, la arquitectura pasa a ser basada en la web: el navegador es un cliente universal, los servidores web entregan la interfaz y la lógica vive en servidores de aplicaciones. El libro menciona varias tendencias que hoy son la norma:

- **Comercio electrónico** (B2C y B2B), que exige alta disponibilidad, escalabilidad y seguridad.
- **Computación en la nube**: recursos de cómputo remotos ofrecidos como servicio, que la empresa paga según el uso en lugar de comprar y mantener servidores. Ventajas: escalar bajo demanda y menos infraestructura propia; riesgos: dependencia del proveedor, seguridad y privacidad de los datos, y costos que crecen con el uso.
- **Web 2.0**: aplicaciones colaborativas y orientadas a la participación de los usuarios.

Esta parte conecta con la ruta de Cloud que tienes al final del plan: allí verás en profundidad cómo se despliegan, escalan y protegen estas arquitecturas.

### Métodos de procesamiento

| | En línea (online) | Por lotes (batch) |
| --- | --- | --- |
| Cuándo se procesa | En el momento en que ocurre la transacción. | Las transacciones se acumulan y se procesan juntas en un momento programado. |
| Ejemplos | Punto de venta, reserva de asiento, pago con tarjeta en caja. | Nómina, liquidación de tarjetas, reportes nocturnos, facturación mensual. |
| Ventajas | Información actualizada al instante; respuesta inmediata al usuario. | Eficiente para grandes volúmenes, menos uso de red, menos vulnerable a interrupciones y menos intrusivo con la operación. |
| Desventajas | Más recursos, necesita alta disponibilidad, más complejo de recuperar ante fallos. | Información desactualizada hasta el siguiente lote. |

La mayoría de los sistemas actuales combinan ambos: una venta se registra en línea, y por la noche un proceso por lotes consolida el inventario y genera reportes. En TypeScript, el mismo caso de uso puede llamarse desde los dos mundos si está bien aislado:

```ts
// La regla no sabe si la llaman en línea o por lotes
export function settleTransaction(tx: { amount: number; fee: number }) {
  if (tx.amount <= 0) throw new Error("Monto inválido");
  return { net: tx.amount - tx.fee };
}

// En línea: un endpoint HTTP procesa una transacción
// app.post("/settle", (req, res) => res.json(settleTransaction(req.body)));

// Por lotes: un job nocturno procesa miles
export async function nightlyBatch(source: AsyncIterable<{ amount: number; fee: number }>) {
  let ok = 0, failed = 0;
  for await (const tx of source) {
    try { settleTransaction(tx); ok++; } catch { failed++; } // un error no detiene el lote
  }
  return { ok, failed };
}
```

Fíjate en dos detalles de diseño del lote: una transacción defectuosa no debe detener todo el proceso (se registra y se continúa), y la fuente de datos es un iterable asíncrono (sesión 10), que permite procesar millones de registros sin cargarlos todos en memoria.

### La seguridad como decisión de arquitectura

La seguridad aparece en la lista de verificación porque no se puede "agregar al final": depende de dónde están los datos, por dónde viajan y quién puede llegar a ellos, que son decisiones de arquitectura. Algunas consecuencias directas de lo visto en esta sesión:

- **En dos capas**, cada cliente necesita credenciales de la base de datos. Si un cliente se compromete, el atacante habla SQL directamente con tus datos. En tres capas, solo el servidor de aplicaciones tiene esas credenciales y el cliente solo puede pedir lo que la API permite.
- **Cada límite entre capas es un punto de control**: autenticación en la entrada de la API, autorización en los casos de uso, cifrado en tránsito entre capas y en reposo en la base de datos.
- **El comercio electrónico y la nube amplían la superficie de ataque**: más puntos de entrada, más integraciones, datos fuera de tus propios servidores. Por eso la ruta de Cloud de este plan dedica tanto espacio a la seguridad.
- **Los procesos por lotes también son una superficie**: archivos de intercambio con bancos o proveedores, credenciales de servicio y jobs que corren con permisos amplios.

Un principio útil que conecta con todo el módulo es el **mínimo privilegio**: cada componente recibe solo los permisos que necesita, igual que en el ISP cada cliente depende solo de las operaciones que usa. Un caso de uso de "consultar reservas" no debería ejecutarse con un usuario de base de datos que puede borrar tablas.

### Modelos de red (en breve)

El capítulo también repasa topologías de red (jerárquica, bus, anillo, estrella, malla) y redes inalámbricas. Como desarrollador, lo que más te importa es lo que estas decisiones implican para el software: latencia, puntos únicos de falla, ancho de banda disponible y seguridad de la comunicación. Un principio que conviene recordar: **la red no es confiable ni instantánea**, así que el diseño debe asumir fallos y latencia (timeouts, reintentos, idempotencia), como viste con los decoradores de la sesión 7.

### Completar el diseño del sistema

Al final de la fase de diseño, el libro recomienda preparar una **especificación de diseño del sistema** con el resumen ejecutivo, los componentes del sistema, el entorno, los requisitos de implementación, los costos y el calendario, y presentarla a usuarios y dirección para su aprobación. Hoy esa especificación suele vivir como documentos de arquitectura cortos y **registros de decisiones de arquitectura (ADR)**: una página por decisión importante con contexto, opciones consideradas, decisión y consecuencias.

```
ADR-007: Procesar la liquidación de comisiones por lotes nocturnos
Contexto: 40 000 ventas/día; los vendedores consultan comisiones una vez al mes.
Opciones: (a) en línea por venta; (b) lote nocturno; (c) lote mensual.
Decisión: (b). Consecuencias: las comisiones del día se ven al día siguiente;
menos carga en hora pico; el lote debe ser idempotente para poder reejecutarse.
```

### Analogía de construcción

La lista de verificación es la conversación previa con el dueño de un edificio: cuánta gente lo usará (escalabilidad), cuánto cuesta mantenerlo durante 30 años y no solo construirlo (TCO), si debe conectarse a la red de la ciudad (integración web) y a un edificio viejo contiguo que no se puede demoler (legado). La arquitectura de tres capas es la separación entre **recepción** (presentación), **oficinas** (lógica) y **archivo** (datos): el visitante no entra al archivo, pide en recepción y alguien en las oficinas busca lo necesario. El procesamiento por lotes es el camión de basura que pasa una vez por noche en lugar de que cada vecino lleve su bolsa al vertedero cuando quiere.

### Errores comunes

- **Elegir la arquitectura por moda** sin revisar la lista de verificación (microservicios para un equipo de dos personas).
- **Ignorar los costos blandos** del TCO: soporte, capacitación, operación.
- **Clientes que hacen decenas de viajes al servidor** por pantalla.
- **Clientes que hablan directo con la base de datos** (dos capas) en sistemas expuestos a Internet.
- **Procesar en línea lo que podría ir por lotes**, o viceversa, sin preguntar al negocio qué tan actual debe estar la información.
- **Lotes no idempotentes** que duplican resultados al reejecutarse tras un fallo.
- **Planificar capacidad sin margen**, olvidando que la respuesta se degrada de forma abrupta cerca del límite.

### Resumen

La arquitectura del sistema traduce el diseño lógico en una estructura física. Se elige con una lista de verificación que incluye organización, plataforma corporativa, costo total de propiedad, escalabilidad, integración web, sistemas legados, procesamiento y seguridad. El cliente/servidor divide el trabajo entre clientes y servidores, con variantes de clientes gruesos o delgados y de dos, tres o n capas unidas por middleware, y evolucionó hacia arquitecturas web y en la nube. El procesamiento en línea da inmediatez y el procesamiento por lotes da eficiencia; la mayoría de sistemas combina ambos, y aislar las reglas de negocio permite usarlas desde los dos.

## Conceptos clave

- **Arquitectura del sistema**: estructura física que implementa el diseño lógico: hardware, software, red, procesamiento y seguridad.
- **Costos duros y blandos**: compras y licencias frente a soporte, capacitación, gestión y caídas.
- **Sistema legado**: sistema antiguo con tecnología obsoleta del que el negocio todavía depende.
- **Cliente/servidor**: arquitectura que divide el procesamiento entre clientes en red y un servidor central.
- **Cliente grueso / delgado**: cliente con la mayor parte de la lógica / con muy poca lógica.
- **Arquitectura de tres capas**: presentación, lógica de aplicación y datos en niveles separados.
- **Middleware**: software que conecta capas y aplicaciones heterogéneas.
- **Procesamiento en línea / por lotes**: procesar cada transacción al ocurrir / acumular y procesar en grupos programados.
- **Computación en la nube**: recursos de cómputo remotos ofrecidos como servicio y pagados según el uso.
- **ADR**: registro breve de una decisión de arquitectura con su contexto, opciones y consecuencias.

## Preguntas de repaso

1. Menciona cinco temas de la lista de verificación de arquitectura y por qué importan.
   R: Organización y cultura (el sistema debe encajar con cómo trabaja la empresa), costo total de propiedad (mantener cuesta más que construir), escalabilidad (crecer sin rediseñar), interfaz con sistemas legados (convivir con lo existente) y seguridad (proteger datos y transacciones). También procesamiento, integración web y plataforma corporativa o ERP.
2. ¿Qué diferencia hay entre un diseño de servidor de archivos y uno cliente/servidor?
   R: En el de servidor de archivos el cliente descarga archivos completos y los procesa él mismo; en el cliente/servidor el cliente envía una consulta y el servidor procesa y devuelve solo el resultado, lo que reduce la carga de red y mejora la respuesta.
3. ¿Qué ventajas aporta la arquitectura de tres capas sobre la de dos?
   R: Centraliza la lógica de negocio en una capa intermedia, de modo que los clientes son más delgados y fáciles de actualizar, la base de datos queda protegida detrás del servidor de aplicaciones y cada capa puede escalarse por separado.
4. ¿Cuándo elegirías procesamiento por lotes en lugar de en línea?
   R: Cuando hay grandes volúmenes de datos que se procesan con una rutina programada y el negocio tolera que la información no esté actualizada al instante, como nómina, liquidaciones o reportes; es más eficiente, usa menos red y es menos intrusivo.
5. ¿Por qué la respuesta de un sistema cliente/servidor se degrada de forma abrupta?
   R: Porque los tiempos de respuesta aumentan poco a poco con la carga hasta que el sistema se acerca a su capacidad, momento en que se disparan. Por eso la planificación de capacidad debe dejar margen.
6. ¿Qué relación hay entre aislar las reglas de negocio y las decisiones de este capítulo?
   R: Si las reglas no dependen de la presentación ni del método de procesamiento, puedes moverlas entre cliente y servidor, llamarlas en línea o por lotes y cambiar de infraestructura sin reescribirlas. Las decisiones físicas se vuelven detalles intercambiables.

## Ejercicio

Escribe tres ADR (en Markdown) para el sistema de reservas de restaurantes de la sesión 16: (1) tres capas con API HTTP frente a cliente que accede directo a la base de datos; (2) qué procesos van en línea y cuáles por lotes (al menos 2 de cada uno); (3) cómo integrarse con el sistema de facturación legado del restaurante. Luego implementa en TypeScript un job por lotes idempotente `expireUnconfirmedReservations(now, store)` que marque como expiradas las reservas no confirmadas con más de 15 minutos, sin fallar si una falla, y que pueda ejecutarse dos veces seguidas sin efectos duplicados. **Terminado cuando:** cada ADR tiene contexto, opciones, decisión y consecuencias; hay tests con Vitest que prueban la expiración con un reloj inyectado, que una reserva defectuosa no detiene el lote y que la segunda ejecución no cambia nada.

## Explícalo con tus palabras

Explica a alguien no técnico, con la analogía de la recepción, las oficinas y el archivo, por qué separar presentación, lógica y datos en capas hace más fácil y seguro un sistema.
