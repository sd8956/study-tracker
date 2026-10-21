---
title: "Clean Architecture I: qué es la arquitectura, independencia y cómo trazar límites"
kind: lesson
hours: 2
sources: Clean Architecture, parte V, cap. 15 "What Is Architecture?" (pp. 117–124) | Clean Architecture, cap. 16 "Independence" (pp. 125–132) | Clean Architecture, cap. 17 "Boundaries: Drawing Lines" (pp. 133–143) | Clean Architecture, cap. 18 "Boundary Anatomy" (pp. 144–148)
---

## Objetivo

Entender la arquitectura como la forma que facilita el desarrollo, el despliegue, la operación y el mantenimiento manteniendo abiertas las opciones; cómo desacoplar por capas y por casos de uso; dónde y cuándo trazar **límites** arquitectónicos (arquitectura de plugins) y cómo se cruzan esos límites según el modo de despliegue.

## Estudio

### El arquitecto es un programador

Martin empieza derribando un mito: el arquitecto de software **es un programador y sigue programando**. No se aleja del código para pensar "cosas de alto nivel"; si no sufre los problemas que crea para el resto, no puede hacer bien su trabajo. Puede escribir menos código que otros, pero sigue en la trinchera. (Evans dice lo mismo con los "hands-on modelers" de la sesión 22.)

### Definición: la forma del sistema

> La arquitectura de un sistema es la **forma** que le dan quienes lo construyen: su división en componentes, la disposición de esos componentes y la manera en que se comunican.

Su **propósito** es facilitar el desarrollo, el despliegue, la operación y el mantenimiento. Su **estrategia** es **dejar abiertas tantas opciones como sea posible, durante el mayor tiempo posible**.

Una afirmación sorprendente: la arquitectura tiene **poco que ver con que el sistema funcione**. Hay muchos sistemas con arquitecturas terribles que funcionan perfectamente; sus problemas aparecen al desplegarlos, mantenerlos y seguir desarrollándolos. El papel de la arquitectura en el comportamiento es pasivo; su papel principal es **soportar el ciclo de vida** y minimizar el costo durante toda la vida del sistema.

| Aspecto | Qué debe facilitar la arquitectura | Ejemplo |
| --- | --- | --- |
| **Desarrollo** | Que los equipos trabajen sin estorbarse. | Un equipo pequeño puede trabajar bien en un monolito sin componentes formales; cinco equipos necesitan componentes con interfaces estables. |
| **Despliegue** | Desplegar con una sola acción, sin configuraciones manuales frágiles. | Evitar "microservicios" prematuros que convierten cada despliegue en coordinar decenas de piezas. |
| **Operación** | Que los casos de uso y los requisitos de rendimiento sean visibles y soportables. | Poder escalar el componente de búsqueda sin escalar todo. |
| **Mantenimiento** | Reducir el costo de encontrar dónde cambiar ("espeleología") y el riesgo de romper otra cosa. | Casos de uso visibles en la estructura; componentes aislados. |

#### Mantener las opciones abiertas: política y detalles

Todo sistema se descompone en dos elementos principales:

- **Política**: las reglas y procedimientos de negocio. Es donde está el valor.
- **Detalles**: lo necesario para que humanos, otros sistemas y programadores se comuniquen con la política, sin afectar su comportamiento: dispositivos de entrada/salida, bases de datos, servidores web, frameworks, protocolos.

El objetivo del arquitecto es crear una forma que reconozca la política como el elemento esencial y haga que los detalles sean **irrelevantes** para ella. Así las decisiones sobre los detalles se pueden **retrasar**:

- No hace falta elegir la base de datos al principio: a la política no le importa si es relacional, documental o archivos planos.
- No hace falta elegir el servidor web pronto: la política no debería saber que se entrega por la web.
- No hace falta adoptar REST desde el principio: la política no conoce la interfaz con el mundo exterior.
- No hace falta un framework de inyección de dependencias: la política no sabe cómo se resuelven sus dependencias.

Cuanto más tiempo dejas abiertas las opciones, **más experimentos** puedes hacer y más información tienes cuando decides. Y si alguien ya tomó la decisión por ti, un buen arquitecto **actúa como si no** estuviera tomada: mantiene la capacidad de retrasarla o cambiarla.

#### Independencia de dispositivos: una lección histórica

En los años 60, los programas se escribían para dispositivos concretos (tarjetas perforadas, cintas). Cambiar de dispositivo significaba reescribir. La invención de los sistemas operativos con **independencia de dispositivos** (funciones abstractas de lectura y escritura) permitió que el mismo programa leyera de tarjetas o de cinta. Martin cuenta cómo un programa que imprimía cartas de correo masivo pudo pasar de imprimir en papel a escribir en cinta sin cambios, y cómo un sistema que dependía del direccionamiento físico del disco se volvió un infierno al cambiar el formato del disco, hasta que se introdujo el direccionamiento relativo. La lección es la misma que viste con los plugins de UNIX en la sesión 2: **lo que no conoce el detalle, no se rompe cuando el detalle cambia**.

### Independencia

Una buena arquitectura debe soportar: los **casos de uso** y la operación del sistema, su **mantenimiento**, su **desarrollo** y su **despliegue**.

#### Casos de uso visibles

La arquitectura tiene poca influencia sobre el comportamiento, pero puede hacer algo muy valioso: **clarificar y exponer** ese comportamiento para que la intención del sistema sea visible a nivel arquitectónico. Una aplicación de carrito de compras con buena arquitectura **parece** una aplicación de carrito de compras: los casos de uso son elementos de primera clase, visibles en la estructura, con nombres que describen su función. (Lo verás como "Screaming Architecture" en la próxima sesión.)

#### Operación

Si el sistema debe atender 100 000 clientes por segundo, la arquitectura debe permitirlo. Para algunos sistemas eso significa servicios en paralelo en muchos servidores; para otros, hilos ligeros en un solo proceso; para otros, un monolito simple basta. Lo notable es que **esta decisión también es una opción que conviene dejar abierta**: un sistema que depende de ser un monolito no puede pasar fácilmente a varios procesos o servicios; uno que aísla bien sus componentes y no asume cómo se comunican puede transitar por todo el espectro.

#### Desarrollo y la ley de Conway

> Cualquier organización que diseña un sistema producirá un diseño cuya estructura es una copia de la estructura de comunicación de la organización.

Un sistema desarrollado por muchos equipos necesita una arquitectura que permita a cada equipo actuar de forma independiente, dividiéndolo en componentes desarrollables por separado.

#### Desacoplar por capas

Usando SRP y CCP, separas lo que cambia por razones distintas. Las razones típicas forman **capas horizontales**:

- **Interfaz de usuario**: cambia por razones que nada tienen que ver con las reglas de negocio.
- **Reglas de negocio específicas de la aplicación**: validaciones y flujos propios de esta aplicación.
- **Reglas de negocio independientes de la aplicación**: reglas del dominio que valdrían en cualquier aplicación del negocio (por ejemplo, el cálculo de intereses).
- **Base de datos**: cambia por razones técnicas propias.

#### Desacoplar por casos de uso

Los casos de uso también cambian por razones distintas entre sí: "agregar un pedido" cambia por motivos diferentes que "eliminar un pedido". Así que, además de las capas horizontales, el sistema se divide en **cortes verticales** delgados, uno por caso de uso, que atraviesan las capas:

```
                Caso de uso:    Agregar pedido   Cancelar pedido   Reporte de ventas
               ┌──────────────┬────────────────┬─────────────────┬──────────────────┐
 Interfaz      │              │  form pedido   │  botón cancelar │  vista reporte   │
               ├──────────────┼────────────────┼─────────────────┼──────────────────┤
 Reglas app    │              │  AddOrder      │  CancelOrder    │  SalesReport     │
               ├──────────────┼────────────────┼─────────────────┼──────────────────┤
 Reglas dominio│   Order, Money, Customer (compartidas, estables)                      │
               ├──────────────┼────────────────┼─────────────────┼──────────────────┤
 Base de datos │              │  orders write  │  orders update  │  sales view      │
               └──────────────┴────────────────┴─────────────────┴──────────────────┘
```

Agregar un caso de uso nuevo es agregar un corte vertical sin tocar los demás.

#### Modos de desacoplamiento

Las piezas separadas pueden desacoplarse a tres niveles:

| Nivel | Qué significa | Costo |
| --- | --- | --- |
| **Código fuente** | Módulos que no se importan entre sí; todo se ejecuta en el mismo proceso y se despliega junto (monolito). | Bajo. |
| **Despliegue** | Componentes que se despliegan por separado (librerías dinámicas, paquetes), aunque corran en el mismo proceso o en la misma máquina. | Medio. |
| **Servicio** | Componentes en procesos separados que se comunican por red. | Alto: red, latencia, fallos parciales, operación. |

La recomendación de Martin: **empieza desacoplando a nivel de código fuente** y, cuando haga falta, empuja el desacoplamiento hacia el despliegue o el servicio. Una buena arquitectura permite que un sistema nazca como monolito, crezca hacia unidades desplegables independientes y llegue a servicios, **y vuelva atrás** si conviene, protegiendo la mayor parte del código de esos cambios. Usar servicios desde el principio por defecto es caro y, a menudo, prematuro.

#### Duplicación verdadera y accidental

Al separar casos de uso, aparece la tentación de unificar código que se parece (dos pantallas casi iguales, dos registros de base de datos similares). Recuerda la sesión 11: si dos piezas cambian por razones distintas y a ritmos distintos, son duplicación **accidental**; unificarlas acopla casos de uso que deberían ser independientes. Ejemplo típico: reutilizar la estructura de la tabla de la base de datos como modelo de la vista. Parecen iguales hoy, pero cambian por razones distintas.

### Límites: trazar líneas

La arquitectura es el arte de **trazar líneas** (límites) que separan elementos de software y restringen a los de un lado conocer a los del otro. Algunas líneas se trazan al principio; otras, mucho después. Las líneas tempranas sirven para **retrasar decisiones** y evitar que contaminen la lógica de negocio.

#### Dos historias tristes

- Una empresa decidió desde el principio que su sistema sería **distribuido en tres capas con servidores separados**, aunque su sistema funcionaba en un solo servidor. El resultado: cada operación atravesaba capas de objetos de transporte, serialización y mensajería innecesarias, multiplicando el trabajo de cada cambio.
- Otra empresa construyó una **arquitectura orientada a servicios** con un bus de mensajería desde el día uno, con un costo enorme para un producto que no lo necesitaba.

En ambos casos se tomaron decisiones prematuras sobre **detalles** (mecanismos de distribución) que aumentaron el costo del desarrollo sin beneficio.

#### Una historia feliz: FitNesse

En FitNesse (una herramienta de testing), Martin y su equipo trazaron pronto una línea entre las reglas de negocio y la base de datos: las reglas solo conocían unas funciones simples de acceso a datos. Esa decisión permitió **posponer la elección de la base de datos más de un año**. Construyeron un almacenamiento en memoria, luego en archivos planos... y descubrieron que los archivos planos bastaban. Cuando un cliente quiso MySQL, se agregó en un día. Durante 18 meses no tuvieron problemas de esquemas, consultas, servidores, contraseñas ni conexiones, y los tests eran rapidísimos porque no había base de datos que los frenara.

#### ¿Qué líneas trazar y cuándo?

> Traza líneas entre las cosas que importan y las que no.

- La interfaz gráfica no importa a las reglas de negocio: línea entre ellas.
- La base de datos no importa a la interfaz: línea entre ellas.
- La base de datos no importa a las reglas de negocio: línea entre ellas.

La última suele generar resistencia ("¡la base de datos **es** el negocio!"). Martin insiste: la base de datos es una **herramienta** que las reglas de negocio usan de forma indirecta. Las reglas solo necesitan saber que existe un conjunto de funciones para leer y guardar datos.

```
 ┌─────────────── Componente: BusinessRules ───────────────┐
 │  BusinessRules ─────usa─────▶ «interface» DatabaseInterface│
 └───────────────────────────────────────▲──────────────────┘
 ═══════════════════ LÍMITE ═════════════│═══════════════════
 ┌─────────────── Componente: Database ──┼──────────────────┐
 │                         DatabaseAccess (implementa)       │
 │                                  │                        │
 │                                  ▼                        │
 │                            motor de base de datos         │
 └──────────────────────────────────────────────────────────┘
   La flecha cruza el límite hacia BusinessRules: la base de datos
   conoce las reglas de negocio; las reglas no conocen la base de datos.
```

La **interfaz** vive en el componente de reglas de negocio; la **implementación**, en el componente de base de datos. La base de datos no importa a las reglas, pero la base de datos **no puede existir sin** las reglas: su código traduce las llamadas de las reglas al lenguaje de la base de datos. Gracias a la dirección de la flecha, la base de datos puede ser Oracle, MySQL, MongoDB o archivos planos.

#### ¿Y la entrada/salida?

Desarrolladores y clientes suelen confundirse sobre qué es el sistema: miran la interfaz gráfica y piensan que **es** el sistema. Pero la interfaz es un detalle. Martin usa el ejemplo de un videojuego: lo que se ve en pantalla es la interfaz; el modelo del juego (reglas, datos, lógica) no necesita la pantalla y debería poder ejecutarse con una interfaz de consola, de tests o de red sin cambios.

#### Arquitectura de plugins

Juntando todo, aparece una **arquitectura de plugins**: las reglas de negocio en el centro, y la interfaz y la base de datos como **plugins** que se enchufan a ellas. La historia del software (los drivers de dispositivos, los editores con extensiones) muestra que los sistemas que se diseñan así son más fáciles de cambiar.

```
           Interfaz web ─┐                ┌─ Base de datos SQL
           Interfaz CLI ─┼─▶  REGLAS  ◀──┼─ Archivos planos
           Tests ────────┘  DE NEGOCIO    └─ Memoria
     (los plugins dependen de las reglas; las reglas no conocen a los plugins)
```

El argumento de los plugins es, en el fondo, el **SRP** a nivel arquitectónico: la interfaz y la base de datos cambian por razones distintas y a ritmos distintos que las reglas de negocio, así que se separan, y la dirección de las dependencias (DIP) protege a lo más importante.

### Anatomía de los límites

La arquitectura de un sistema está definida por sus componentes y los **límites** que los separan. Esos límites tienen distintas formas físicas, y cruzarlos tiene distintos costos.

#### Cruzar un límite

En tiempo de ejecución, cruzar un límite es simplemente que una función de un lado llame a una función del otro y le pase datos. El truco para un cruce apropiado está en **gestionar las dependencias del código fuente**: cuando un módulo cambia, los que dependen de él pueden tener que cambiar o recompilarse. Los límites son **cortafuegos** contra la propagación de cambios.

#### El temido monolito

El límite más simple es el que no tiene representación física: una separación disciplinada de funciones y datos dentro de **un solo ejecutable**. Aunque se despliegue como un único archivo, el monolito puede tener una arquitectura excelente si sus componentes están separados a nivel de código fuente y las dependencias cruzan los límites hacia las reglas de negocio (usando polimorfismo dinámico para invertirlas). Las comunicaciones son llamadas a función: **rápidas y baratas**, así que se puede ser "conversador" a través del límite.

#### Componentes de despliegue

Componentes empaquetados por separado (librerías dinámicas, paquetes) pero que corren en el mismo proceso. Las llamadas siguen siendo baratas; lo que se gana es poder desplegarlos y versionarlos por separado.

#### Hilos

Los hilos no son límites arquitectónicos ni unidades de despliegue: son una forma de organizar la ejecución. Cualquier componente puede ejecutarse en varios hilos.

#### Procesos locales

Procesos separados en la misma máquina, que se comunican por sockets, colas del sistema operativo o memoria compartida. Cada uno puede estar compilado y desplegado por separado. La comunicación es moderadamente cara (cambio de contexto, serialización), así que hay que limitar el número de llamadas. La regla de dependencias sigue igual: el proceso de bajo nivel es un plugin del de alto nivel, y el código fuente del alto nivel no debe contener nombres ni direcciones físicas del de bajo nivel.

#### Servicios

El límite más fuerte: un proceso que se comunica por red, normalmente sin asumir que el otro está en la misma máquina. La comunicación es **muy lenta** comparada con una llamada a función (de milisegundos a segundos), así que hay que evitar ser conversador. Por lo demás, aplican las mismas reglas: los servicios de bajo nivel son plugins de los de alto nivel, y los de alto nivel no deben conocer nada físico de los de bajo nivel (como una URI concreta).

| Tipo de límite | Comunicación | Costo de cruzarlo | Despliegue independiente |
| --- | --- | --- | --- |
| Código fuente (monolito) | Llamada a función | Mínimo | No |
| Componente de despliegue | Llamada a función | Mínimo | Sí (versionado) |
| Proceso local | IPC, sockets | Medio | Sí |
| Servicio | Red | Alto (latencia, fallos) | Sí |

Martin concluye que la mayoría de los sistemas combinan varios tipos de límites: un servicio puede ser internamente un monolito con límites de código fuente, o un conjunto de componentes desplegables. Lo importante no es el tipo, sino que **las dependencias crucen cada límite en la dirección correcta**.

### En TypeScript: un límite de código fuente bien trazado

```ts
// src/billing/domain/ports.ts  ← vive del lado de la política
export interface InvoiceStore {
  save(inv: { id: string; total: number; customerId: string }): Promise<void>;
  byCustomer(customerId: string): Promise<{ id: string; total: number }[]>;
}

// src/billing/application/issue-invoice.ts
import type { InvoiceStore } from "../domain/ports";
export const issueInvoice = (store: InvoiceStore) => async (customerId: string, total: number) => {
  if (total <= 0) throw new Error("Total inválido");
  const inv = { id: crypto.randomUUID(), total, customerId };
  await store.save(inv);
  return inv;
};

// src/billing/infrastructure/file-invoice-store.ts  ← plugin (detalle)
import { appendFile, readFile } from "node:fs/promises";
import type { InvoiceStore } from "../domain/ports";
export class FileInvoiceStore implements InvoiceStore {
  constructor(private readonly path: string) {}
  async save(inv: { id: string; total: number; customerId: string }) {
    await appendFile(this.path, JSON.stringify(inv) + "\n");
  }
  async byCustomer(customerId: string) {
    const text = await readFile(this.path, "utf8").catch(() => "");
    return text.split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((i) => i.customerId === customerId);
  }
}
```

Como en FitNesse: hoy archivos planos; mañana, si hace falta, SQLite o Postgres. Ni el caso de uso ni el dominio cambian.

### Analogía de construcción

Un edificio bien diseñado traza límites entre la **estructura** (política) y las **instalaciones y acabados** (detalles): puedes cambiar el sistema de climatización, el cableado de datos o el tipo de piso sin tocar columnas ni losas. Un mal diseño embebe las tuberías dentro de las columnas: cada cambio de instalación exige demoler estructura. Los tipos de límite son como la distancia entre construcciones: dos habitaciones del mismo departamento (monolito: pasar de una a otra es trivial), dos departamentos del mismo edificio (procesos locales: hay que salir al pasillo) o dos edificios en distintos barrios (servicios: hay que tomar un vehículo, y puede haber tráfico).

### Errores comunes

- **Elegir microservicios o arquitecturas distribuidas desde el día uno** sin necesidad (las historias tristes).
- **Creer que la base de datos es el negocio** y dejar que el esquema dicte la forma de las reglas.
- **Monolito sin límites internos**: no es el monolito lo malo, es la falta de límites.
- **Llamadas conversadoras a través de límites caros** (decenas de peticiones de red por operación).
- **Límites con la flecha al revés**: la regla de negocio importa el cliente de la base de datos.
- **Unificar duplicación accidental** entre casos de uso o entre la vista y la base de datos.

### Resumen

La arquitectura es la forma del sistema (componentes, disposición y comunicación) y su propósito es facilitar el desarrollo, despliegue, operación y mantenimiento manteniendo abiertas las opciones; la política es lo esencial y los detalles deben ser irrelevantes para ella. El sistema se desacopla por capas horizontales y por casos de uso verticales, y el modo de desacoplamiento (código, despliegue, servicio) es también una opción a mantener abierta. Los límites se trazan entre lo que importa y lo que no, con las dependencias apuntando a las reglas de negocio, formando una arquitectura de plugins. Los límites pueden ser de código, de despliegue, de procesos o de servicios, con costos crecientes, pero todos siguen la misma regla de dependencias.

## Conceptos clave

- **Arquitectura**: forma de un sistema dada por su división en componentes, su disposición y su comunicación.
- **Política y detalles**: reglas de negocio frente a mecanismos de entrada/salida, almacenamiento y frameworks.
- **Mantener las opciones abiertas**: retrasar decisiones sobre detalles para decidir con más información.
- **Ley de Conway**: la estructura de un sistema copia la estructura de comunicación de la organización que lo diseña.
- **Desacoplamiento por capas y por casos de uso**: cortes horizontales por razón de cambio técnica y cortes verticales por caso de uso.
- **Modos de desacoplamiento**: a nivel de código fuente, de despliegue o de servicio.
- **Límite arquitectónico**: línea que separa componentes y restringe qué sabe cada lado del otro.
- **Arquitectura de plugins**: las reglas de negocio en el centro, con la interfaz y la base de datos como plugins que dependen de ellas.

## Preguntas de repaso

1. ¿Por qué Martin dice que la arquitectura tiene poco que ver con que el sistema funcione?
   R: Porque muchos sistemas con arquitecturas terribles funcionan bien; sus problemas aparecen al desarrollarlos, desplegarlos y mantenerlos. El papel principal de la arquitectura es soportar el ciclo de vida y minimizar su costo, no producir el comportamiento.
2. ¿Qué significa mantener las opciones abiertas y qué ganó FitNesse con ello?
   R: Separar la política de los detalles para poder retrasar las decisiones sobre los detalles. FitNesse trazó un límite entre las reglas y la base de datos, pospuso la elección más de un año, descubrió que los archivos planos bastaban, tuvo tests muy rápidos y agregó MySQL en un día cuando un cliente lo pidió.
3. ¿Por qué conviene desacoplar también por casos de uso y no solo por capas?
   R: Porque cada caso de uso cambia por razones propias; con cortes verticales, agregar o modificar un caso de uso no afecta a los demás, y se evita acoplarlos a través de código que parece compartido pero es duplicación accidental.
4. ¿Qué modo de desacoplamiento recomienda Martin al principio y por qué?
   R: El de código fuente, porque es el más barato. Una buena arquitectura permite luego empujar el desacoplamiento hacia componentes desplegables o servicios cuando haga falta, y volver atrás, protegiendo la mayor parte del código de esos cambios.
5. Explica por qué la interfaz de acceso a datos vive en el componente de reglas de negocio.
   R: Porque así la dependencia de código fuente cruza el límite desde la base de datos hacia las reglas: el componente de base de datos implementa la interfaz y conoce las reglas, mientras que las reglas no saben nada de la base de datos. Eso permite cambiar de motor sin tocar las reglas.
6. ¿Qué diferencia práctica hay entre cruzar un límite de código fuente y uno de servicio?
   R: Cruzar un límite de código es una llamada a función, barata, que permite interfaces conversadoras; cruzar un límite de servicio implica red, latencia y fallos parciales, así que la comunicación debe ser poco frecuente y de grano grueso. La regla de dependencias es la misma en ambos.

## Ejercicio

Construye en TypeScript un pequeño servicio de "lista de lectura" (agregar libro, marcar como leído, listar pendientes) siguiendo el ejemplo de FitNesse: (a) reglas de negocio y casos de uso sin ninguna dependencia de almacenamiento ni de transporte; (b) un puerto `ReadingListStore` definido junto a las reglas; (c) tres plugins de almacenamiento: en memoria, archivo JSON y SQLite (`node:sqlite`); (d) dos plugins de entrada: una CLI y tests. **Terminado cuando:** las mismas pruebas de casos de uso pasan con los tres almacenamientos (un `describe.each` sobre las implementaciones), ningún archivo de reglas importa `node:fs`, `node:sqlite` ni nada de la CLI, y cambiar de almacenamiento es una sola línea en el punto de arranque.

## Explícalo con tus palabras

Explica con la analogía de la estructura y las instalaciones de un edificio por qué la base de datos debería ser un plugin de las reglas de negocio y no al revés.
