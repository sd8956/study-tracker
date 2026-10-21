---
title: Qué es un patrón de diseño y los principios OO que lo sostienen
kind: lesson
hours: 2
sources: Design Patterns (GoF), cap. 1, secs. 1.1–1.8 (pp. 21–52)
links: Refactoring.Guru, catálogo de patrones | https://refactoring.guru/es/design-patterns
---

## Objetivo

Saber qué es un patrón de diseño, cómo se describe y organiza el catálogo GoF, y dominar los dos principios que explican casi todos los patrones: **programa contra una interfaz, no contra una implementación** y **prefiere la composición de objetos a la herencia de clases**.

## Estudio

### Un patrón es una solución con nombre a un problema que se repite

El arquitecto Christopher Alexander describió los patrones en la construcción de ciudades y edificios: un patrón describe un problema que aparece una y otra vez en un entorno, y el núcleo de una solución que puedes usar un millón de veces sin repetirla exactamente igual. Por ejemplo, "luz en dos lados de cada habitación": no es un plano concreto, es una idea que cada arquitecto adapta a su casa.

Los autores del libro (conocidos como Gang of Four, GoF) llevaron esa idea al diseño orientado a objetos. Un patrón de diseño no es una librería ni un fragmento de código para copiar: es una **descripción de objetos y clases que se comunican, adaptada para resolver un problema general de diseño en un contexto particular**.

Cada patrón tiene cuatro elementos esenciales:

| Elemento | Qué aporta | Ejemplo con Strategy |
| --- | --- | --- |
| **Nombre** | Vocabulario compartido: decir "usa un Strategy" ahorra un párrafo. | Strategy |
| **Problema** | Cuándo aplicarlo, qué contexto y qué síntomas. | Hay varias variantes de un algoritmo y elegir con `if` se vuelve inmanejable. |
| **Solución** | Los elementos, sus responsabilidades y colaboraciones, como plantilla abstracta. | Una interfaz para el algoritmo y una clase por variante; el cliente recibe una. |
| **Consecuencias** | Ventajas, costos y compromisos. | Más clases pequeñas; el cliente debe conocer las variantes para elegir. |

El nombre es más importante de lo que parece: un equipo que comparte vocabulario de patrones discute diseño a un nivel más alto, igual que dos arquitectos que dicen "planta libre" o "doble altura" sin dibujar.

### Un ejemplo histórico: MVC

El libro abre con Model-View-Controller de Smalltalk, porque contiene varios patrones a la vez:

- **Observer**: el modelo notifica a las vistas cuando cambia, sin conocer sus clases concretas. Puedes agregar vistas nuevas sin tocar el modelo.
- **Composite**: las vistas pueden anidarse (una vista compuesta contiene botones, que también son vistas) y se tratan de forma uniforme.
- **Strategy**: el controlador encapsula cómo responde la vista a la entrada del usuario; puedes cambiar el controlador (por ejemplo, desactivar la edición) sin cambiar la vista.

La enseñanza es que los patrones rara vez viven solos: un diseño real es una combinación de varios.

### Cómo se organiza el catálogo

El catálogo tiene 23 patrones clasificados por dos criterios:

```
                         PROPÓSITO
              Creacional      Estructural        Comportamiento
         ┌───────────────┬──────────────────┬─────────────────────────┐
  Clase  │ Factory Method│ Adapter (clase)  │ Interpreter             │
ÁMBITO   │               │                  │ Template Method         │
         ├───────────────┼──────────────────┼─────────────────────────┤
  Objeto │ Abstract Fact.│ Adapter (objeto) │ Chain of Resp., Command │
         │ Builder       │ Bridge, Composite│ Iterator, Mediator      │
         │ Prototype     │ Decorator, Facade│ Memento, Observer, State│
         │ Singleton     │ Flyweight, Proxy │ Strategy, Visitor       │
         └───────────────┴──────────────────┴─────────────────────────┘
```

- **Propósito**: qué hace el patrón. Los *creacionales* tratan sobre cómo crear objetos; los *estructurales*, sobre cómo componer clases y objetos en estructuras mayores; los de *comportamiento*, sobre cómo se reparten responsabilidades y cómo se comunican los objetos.
- **Ámbito**: si el patrón se aplica sobre todo a **clases** (relaciones fijas en tiempo de compilación, vía herencia) o a **objetos** (relaciones que pueden cambiar en tiempo de ejecución, vía composición). La mayoría son de objetos, lo que ya anticipa el segundo principio.

En este módulo verás los más usados: Factory Method, Abstract Factory, Builder y Singleton; Adapter, Decorator, Facade, Composite y Proxy; Strategy, Observer, Command, Template Method, State, Iterator, Chain of Responsibility y Mediator.

### Cómo resuelven los patrones problemas de diseño

#### Encontrar los objetos adecuados

Una técnica clásica es subrayar sustantivos y verbos en el enunciado del problema. Funciona para los objetos "del mundo real", pero los diseños flexibles necesitan objetos que **no existen en la naturaleza**: un objeto que representa un algoritmo (Strategy), un estado (State), una petición (Command) o una forma de recorrer una colección (Iterator). Los patrones te ayudan a descubrir esas abstracciones menos obvias, que suelen aparecer tarde, cuando intentas hacer el diseño más flexible. Modelar estrictamente el mundo real produce un sistema que refleja la realidad de hoy, pero no necesariamente la de mañana.

#### Decidir la granularidad

Un objeto puede representar desde un carácter hasta un subsistema entero. Facade representa un subsistema completo como un solo objeto; Flyweight permite tener millones de objetos diminutos; Builder y Abstract Factory crean objetos cuya única responsabilidad es crear otros.

#### Especificar interfaces

La **firma** de una operación es su nombre, parámetros y valor de retorno. La **interfaz** de un objeto es el conjunto de todas sus firmas. Un **tipo** es un nombre para una interfaz; un objeto puede tener varios tipos y objetos muy distintos pueden compartir un tipo.

Los objetos solo se conocen a través de sus interfaces. Cuando envías una petición, qué código se ejecuta depende del objeto receptor y se decide en tiempo de ejecución (**enlace dinámico**). Poder sustituir objetos con la misma interfaz en tiempo de ejecución es el **polimorfismo**: simplifica a los clientes, desacopla objetos y les permite cambiar sus relaciones mientras el programa corre.

### Principio 1: programa contra una interfaz, no contra una implementación

Distingue dos cosas que los lenguajes suelen mezclar:

- La **clase** de un objeto define cómo está implementado: su estado interno y el código de sus operaciones.
- El **tipo** de un objeto solo define su interfaz: qué peticiones acepta.

Y por tanto distingue dos herencias:

| Herencia de clase (implementación) | Herencia de interfaz (subtipado) |
| --- | --- |
| Reutiliza código del padre. | Describe cuándo un objeto puede usarse en lugar de otro. |
| `class Admin extends User` | `class Admin implements Authorizable` |
| Te ata a cómo está hecho el padre. | Solo te ata a un contrato. |

Programar contra interfaces tiene dos beneficios: los clientes no saben qué tipo concreto usan mientras cumpla la interfaz, y no saben qué clase lo implementa. Eso **reduce enormemente las dependencias de implementación entre subsistemas**. La consecuencia práctica es que no declares variables, parámetros ni campos con clases concretas cuando puedas usar una interfaz, y que dejes la creación de las clases concretas a un lugar concreto (de ahí nacen los patrones creacionales).

```ts
// ❌ Atado a la implementación
class ReportService {
  private mailer = new SmtpMailer("smtp.empresa.com"); // crea y conoce lo concreto
  async send(r: string) { await this.mailer.sendSmtp(r); }
}

// ✅ Atado a un contrato
interface Mailer { send(to: string, body: string): Promise<void> }

class ReportServiceOk {
  constructor(private readonly mailer: Mailer) {} // recibe cualquier Mailer
  async send(to: string, r: string) { await this.mailer.send(to, r); }
}

// En los tests:
class FakeMailer implements Mailer {
  sent: string[] = [];
  async send(_to: string, body: string) { this.sent.push(body); }
}
```

### Principio 2: prefiere la composición a la herencia

Hay dos formas de reutilizar funcionalidad:

- **Herencia de clase**: reutilización de **caja blanca**. La subclase ve las tripas del padre.
- **Composición de objetos**: reutilización de **caja negra**. Un objeto usa a otro solo a través de su interfaz.

| | Herencia | Composición |
| --- | --- | --- |
| Cuándo se define | Estáticamente, en compilación | Dinámicamente, en ejecución |
| Facilidad | Directa, el lenguaje la soporta | Requiere interfaces bien pensadas |
| Encapsulamiento | Se rompe: la subclase depende de detalles del padre | Se respeta: solo se usa la interfaz |
| Cambiar comportamiento en ejecución | No | Sí, cambiando el objeto compuesto |
| Efecto en el diseño | Jerarquías grandes y frágiles | Más objetos pequeños, cada clase enfocada en una tarea |

El problema de la herencia es que **un cambio en el padre obliga a revisar a todos los hijos**, y si la implementación heredada no sirve para un caso nuevo tienes que reescribir el padre. Es como construir cada casa de un barrio apoyada sobre los muros de la anterior: tocar una estructura obliga a revisar todas las demás.

```ts
// Herencia: explosión de subclases
class Notifier { send(m: string) { /* email */ } }
class SmsNotifier extends Notifier { /* ... */ }
class SmsAndSlackNotifier extends SmsNotifier { /* ... */ } // ¿y email+slack? ¿y los tres?

// Composición: combinas piezas en ejecución
interface Channel { send(m: string): Promise<void> }

class MultiChannelNotifier {
  constructor(private readonly channels: Channel[]) {}
  async notify(m: string) {
    await Promise.all(this.channels.map((c) => c.send(m)));
  }
}
// new MultiChannelNotifier([email, sms]) o [slack] o los tres, sin clases nuevas
```

Esto no prohíbe la herencia. Idealmente no deberías necesitar crear componentes nuevos para reutilizar: te basta con ensamblar los existentes. La herencia y la composición trabajan juntas, pero el libro observa que los diseñadores abusan de la herencia y que los diseños mejoran al apoyarse más en la composición.

#### Delegación

La **delegación** es la forma extrema de composición: un objeto recibe una petición y se la pasa a otro (su delegado), a veces pasándose a sí mismo para que el delegado pueda referirse a él. Un `Window` puede delegar el cálculo de su área a un objeto `Rectangle` en vez de heredar de `Rectangle`; así, en ejecución podría cambiarlo por un `Circle`. State, Strategy y Visitor dependen de la delegación. El costo: el software dinámico y parametrizado es más difícil de entender que el estático y puede ser algo menos eficiente.

#### Tipos parametrizados

Una tercera forma de reutilizar es la genericidad (`List<T>`, plantillas en C++). En TypeScript los genéricos son tu herramienta cotidiana: `Repository<T>` reutiliza lógica sin herencia ni delegación, pero no permite cambiar la implementación en tiempo de ejecución.

### Estructuras en ejecución vs. en compilación

El código de un programa orientado a objetos no se parece a su estructura en ejecución. El código es una jerarquía de clases fija; la ejecución es una red de objetos que se comunican y cambia constantemente. Distingue:

- **Agregación**: un objeto posee a otro o es responsable de él; comparten tiempo de vida.
- **Conocimiento (acquaintance)**: un objeto solo sabe de otro y le hace peticiones; es una relación más débil y más dinámica.

Muchos patrones capturan explícitamente esa distinción, y es una de las razones por las que los diagramas de clases no bastan para entender un diseño.

### Diseñar para el cambio

La clave para maximizar la reutilización es **anticipar cambios** y diseñar para que el sistema evolucione. El libro lista causas comunes de rediseño y los patrones que las previenen:

| Causa de rediseño | Patrones que ayudan |
| --- | --- |
| Crear un objeto especificando su clase concreta | Abstract Factory, Factory Method, Prototype |
| Depender de operaciones específicas (peticiones fijas en el código) | Chain of Responsibility, Command |
| Depender de la plataforma (SO, hardware, APIs) | Abstract Factory, Bridge |
| Depender de la representación o implementación de objetos | Abstract Factory, Bridge, Memento, Proxy |
| Depender de algoritmos que pueden cambiar | Builder, Iterator, Strategy, Template Method, Visitor |
| Acoplamiento fuerte | Abstract Factory, Bridge, Chain of Responsibility, Command, Facade, Mediator, Observer |
| Extender funcionalidad a base de subclases | Bridge, Chain of Responsibility, Composite, Decorator, Observer, Strategy |
| No poder modificar clases convenientemente (de terceros) | Adapter, Decorator, Visitor |

Esta tabla es un buen índice inverso: cuando tengas un dolor concreto, busca la causa y mira qué patrones la atacan.

#### Aplicaciones, toolkits y frameworks

- En una **aplicación**, la prioridad es la reutilización interna, la mantenibilidad y la extensión.
- Un **toolkit** (una librería) es código reutilizable de propósito general que tú llamas; no impone diseño.
- Un **framework** impone la arquitectura: define la estructura general y te llama a ti (inversión de control). Diseñar un framework es lo más difícil, porque cualquier cambio en sus interfaces afecta a todos sus usuarios; por eso los frameworks usan patrones de forma intensiva.

### Cómo elegir y usar un patrón

Para elegir: piensa en cómo resuelven los patrones problemas de diseño, revisa la intención de cada uno, estudia cómo se relacionan, compara patrones del mismo propósito, examina las causas de rediseño y **piensa en qué debería poder variar** en tu diseño (encapsula lo que varía).

Para usarlo: lee el patrón completo (sobre todo aplicabilidad y consecuencias), estudia su estructura y colaboraciones, mira código de ejemplo, **elige nombres que tengan sentido en tu dominio** (no `ConcreteStrategyA`), define las interfaces, luego las clases, y finalmente implementa.

Y una advertencia que el libro hace explícita: los patrones **no deben aplicarse indiscriminadamente**. Suelen lograr flexibilidad añadiendo niveles de indirección, que complican el diseño y pueden costar rendimiento. Un patrón solo se justifica cuando la flexibilidad que aporta se necesita de verdad.

### Un caso completo en miniatura: el editor de documentos

El capítulo 2 del libro diseña un editor de texto WYSIWYG (llamado Lexi) y muestra cómo cada problema de diseño lleva a un patrón. No necesitas leerlo entero; quédate con el mapa, porque es el mejor ejemplo de que los patrones se combinan:

| Problema del editor | Qué varía | Patrón |
| --- | --- | --- |
| Representar la estructura del documento (caracteres, líneas, columnas, imágenes) de forma uniforme | La composición de elementos | Composite |
| Cambiar el algoritmo de formateo (partir líneas) sin tocar la estructura | El algoritmo | Strategy |
| Añadir bordes y barras de desplazamiento a la interfaz sin subclases infinitas | Responsabilidades extra | Decorator |
| Soportar varios "look-and-feel" (estilos visuales) | La familia de widgets | Abstract Factory |
| Soportar varios sistemas de ventanas | La plataforma | Bridge |
| Deshacer y rehacer operaciones del usuario | La petición | Command |
| Revisar ortografía recorriendo la estructura | El recorrido y el análisis | Iterator y Visitor |

Lo interesante es el razonamiento, no el editor: en cada paso los autores preguntan "¿qué es lo que va a cambiar aquí?", aíslan esa parte detrás de una interfaz y luego le ponen nombre. Si un día tienes que diseñar algo con varias de estas tensiones (por ejemplo, un constructor visual de formularios), puedes repetir exactamente ese razonamiento.

Una forma de practicarlo con tu propio código es el ejercicio de las tres preguntas: para cada clase importante, escribe **qué hace**, **qué podría variar** y **quién se enteraría si varía**. Si la respuesta a la tercera pregunta es "medio sistema", has encontrado un candidato a encapsular detrás de una interfaz.

### Errores comunes

- **Patronitis.** Meter un Factory, un Strategy y un Observer en un CRUD de tres pantallas. Aplica un patrón cuando sientas el dolor que resuelve, no antes.
- **Copiar la estructura con nombres genéricos.** `AbstractProductFactoryImpl` no comunica nada; usa el lenguaje de tu dominio.
- **Herencia para reutilizar dos métodos.** Extrae una función o compón un objeto.
- **Interfaces "de una sola implementación" por reflejo.** Crea la interfaz cuando hay variación real o un límite (por ejemplo, infraestructura que quieres reemplazar en tests).

### Resumen

Un patrón es una solución con nombre a un problema recurrente, descrita por nombre, problema, solución y consecuencias. El catálogo se organiza por propósito (creacional, estructural, comportamiento) y ámbito (clase u objeto). Dos principios lo explican casi todo: programa contra interfaces y prefiere la composición a la herencia. Diseña para el cambio identificando qué varía, pero recuerda que cada patrón agrega indirección y solo vale cuando la flexibilidad se necesita.

## Conceptos clave

- **Patrón de diseño**: solución reutilizable y con nombre a un problema de diseño recurrente en un contexto, descrita por nombre, problema, solución y consecuencias.
- **Interfaz (de un objeto)**: el conjunto de firmas de las operaciones que acepta.
- **Tipo vs. clase**: el tipo es la interfaz; la clase es la implementación.
- **Enlace dinámico**: la operación que se ejecuta se decide en tiempo de ejecución según el objeto receptor.
- **Composición de objetos**: obtener funcionalidad ensamblando objetos que se usan a través de sus interfaces (reutilización de caja negra).
- **Delegación**: un objeto pasa una petición a otro objeto para que la resuelva.
- **Framework**: diseño reutilizable que impone la arquitectura y llama a tu código (inversión de control).
- **Encapsular lo que varía**: identificar el aspecto que cambia y aislarlo detrás de una interfaz.

## Preguntas de repaso

1. ¿Cuáles son los cuatro elementos de un patrón y por qué importa el nombre?
   R: Nombre, problema, solución y consecuencias. El nombre crea un vocabulario compartido que permite discutir diseño a un nivel más alto sin describir cada clase.
2. ¿Qué diferencia hay entre la clase y el tipo de un objeto?
   R: La clase define cómo está implementado (estado y código); el tipo solo define la interfaz, es decir, qué peticiones acepta. Varios objetos de clases distintas pueden compartir tipo.
3. ¿Qué significa "programa contra una interfaz" y qué gana tu código?
   R: Declarar dependencias con interfaces en lugar de clases concretas. Los clientes no conocen ni el tipo concreto ni la clase que lo implementa, lo que reduce las dependencias de implementación y permite sustituir piezas, por ejemplo en tests.
4. ¿Por qué la composición suele ser preferible a la herencia?
   R: Porque es reutilización de caja negra que respeta el encapsulamiento, se define en ejecución y permite cambiar el comportamiento cambiando el objeto compuesto. La herencia expone detalles del padre, se fija en compilación y hace que cambios en el padre obliguen a revisar a todos los hijos.
5. ¿Cuál es la diferencia entre propósito y ámbito en el catálogo GoF?
   R: El propósito dice qué hace el patrón (crear, estructurar o repartir comportamiento). El ámbito dice si se aplica sobre clases (relaciones estáticas por herencia) o sobre objetos (relaciones dinámicas por composición).
6. ¿Cuál es el principal costo de aplicar patrones?
   R: Añaden niveles de indirección, lo que complica el diseño, puede afectar el rendimiento y hace más difícil seguir el flujo. Solo se justifican si la flexibilidad que aportan se necesita.

## Ejercicio

Escribe en TypeScript un `PriceCalculator` que hoy calcula precios con herencia (`class BasePrice`, `class VipPrice extends BasePrice`, `class VipBlackFridayPrice extends VipPrice`). Refactorízalo con composición: una interfaz `PriceRule { apply(amount: number): number }`, varias reglas pequeñas y un calculador que recibe un arreglo de reglas. Añade tests con Vitest para tres combinaciones distintas. **Terminado cuando:** no queda ninguna clase que use `extends`, cualquier combinación de reglas se arma sin crear clases nuevas y los tres tests pasan.

## Explícalo con tus palabras

Explica a un compañero junior, con el ejemplo de un barrio de casas que comparten muros, por qué la herencia hace frágil un diseño y cómo la composición lo evita.
