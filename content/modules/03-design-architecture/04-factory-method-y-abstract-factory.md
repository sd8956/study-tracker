---
title: "Patrones creacionales I: Factory Method y Abstract Factory"
kind: lesson
hours: 2
sources: Design Patterns (GoF), cap. 3, introducción (pp. 101–106) | Design Patterns (GoF), Abstract Factory (pp. 107–116) | Design Patterns (GoF), Factory Method (pp. 127–136)
links: Refactoring.Guru, Factory Method | https://refactoring.guru/es/design-patterns/factory-method ; Refactoring.Guru, Abstract Factory | https://refactoring.guru/es/design-patterns/abstract-factory
---

## Objetivo

Aprender a desacoplar el código que **usa** objetos del código que **decide qué clase concreta crear**, con Factory Method (un producto, decisión delegada a una subclase o función) y Abstract Factory (familias de productos que deben ir juntos).

## Estudio

### Por qué crear objetos es un problema de diseño

Cada `new ClaseConcreta()` es un compromiso: el código que lo escribe queda atado a esa clase. En una función aislada no importa, pero cuando el `new` está esparcido por todo el sistema, cambiar de implementación (otro proveedor de pagos, otro motor de base de datos, otra plataforma de UI) obliga a buscar y modificar decenas de sitios.

Los patrones creacionales abstraen el proceso de creación. Comparten dos ideas:

1. **Encapsulan el conocimiento** de qué clases concretas usa el sistema.
2. **Ocultan cómo** se crean y se ensamblan esas instancias. El resto del sistema solo conoce interfaces.

A medida que los sistemas dependen más de la composición que de la herencia, crear objetos se vuelve más complejo: ya no basta con instanciar una clase, hay que **ensamblar** una red de objetos pequeños. Por eso estos patrones ganan importancia.

El libro usa un ejemplo común para todos los creacionales: construir el laberinto de un videojuego (habitaciones, paredes, puertas). Si `createMaze()` hace `new Room()` y `new Door()` directamente, es imposible reutilizarla para un "laberinto encantado" con habitaciones mágicas sin reescribirla. Cada patrón creacional resuelve ese problema de una forma distinta.

### Factory Method

**Intención:** definir una interfaz para crear un objeto, pero dejar que las subclases decidan qué clase instanciar. Factory Method permite que una clase delegue la instanciación a sus subclases.

#### El problema

Piensa en un framework de aplicaciones de documentos. El framework sabe **cuándo** crear un documento (el usuario pulsa "Nuevo"), pero no sabe **qué tipo** de documento crear: eso depende de cada aplicación (una de dibujo crea `DrawingDocument`, una de hojas de cálculo crea `SpreadsheetDocument`). El framework solo conoce la clase abstracta `Document`, que no puede instanciar.

La solución: el framework declara un método abstracto `createDocument()` (el *factory method*), y cada aplicación concreta lo implementa devolviendo su tipo de documento.

```
        ┌────────────────────────┐                ┌──────────────┐
        │ Creator (Application)  │                │ «interface»  │
        │ + newDocument()        │───crea────────▶│ Product      │
        │ # createDocument()* ◀──┼── factory      │ (Document)   │
        └──────────▲─────────────┘   method       └──────▲───────┘
                   │ hereda                              │ implementa
        ┌──────────┴─────────────┐                ┌──────┴───────┐
        │ ConcreteCreator        │───new─────────▶│ConcreteProduct│
        │ (DrawingApplication)   │                │(DrawingDoc)   │
        └────────────────────────┘                └──────────────┘
```

#### Participantes

- **Product**: interfaz de los objetos que crea el factory method.
- **ConcreteProduct**: implementa `Product`.
- **Creator**: declara el factory method; puede dar una implementación por defecto y lo usa en otras operaciones.
- **ConcreteCreator**: sobrescribe el factory method para devolver un `ConcreteProduct`.

#### Versión clásica en TypeScript

```ts
interface Document {
  open(): void;
  save(): string;
}

class DrawingDocument implements Document {
  open() { console.log("Abriendo lienzo"); }
  save() { return "<svg/>"; }
}

class TextDocument implements Document {
  open() { console.log("Abriendo texto"); }
  save() { return "texto plano"; }
}

abstract class Application {
  private docs: Document[] = [];

  // Operación del framework: sabe CUÁNDO crear
  newDocument(): Document {
    const doc = this.createDocument(); // pero no QUÉ crear
    this.docs.push(doc);
    doc.open();
    return doc;
  }

  protected abstract createDocument(): Document; // factory method
}

class DrawingApp extends Application {
  protected createDocument() { return new DrawingDocument(); }
}

class TextEditorApp extends Application {
  protected createDocument() { return new TextDocument(); }
}
```

#### Variantes de implementación

1. **Creator abstracto o con implementación por defecto.** Si el creator da un producto por defecto, las subclases solo sobrescriben cuando necesitan otro: el factory method se convierte en un **gancho** (hook) de extensión.
2. **Factory method parametrizado.** Recibe un identificador y decide qué producto crear. Muy común en la práctica:

```ts
type ExportFormat = "pdf" | "csv" | "xlsx";

interface Exporter { export(rows: unknown[]): Uint8Array }

class PdfExporter implements Exporter { export() { return new Uint8Array(); } }
class CsvExporter implements Exporter { export() { return new Uint8Array(); } }
class XlsxExporter implements Exporter { export() { return new Uint8Array(); } }

// Factory parametrizado con un registro: agregar un formato no toca el switch
const registry: Record<ExportFormat, () => Exporter> = {
  pdf: () => new PdfExporter(),
  csv: () => new CsvExporter(),
  xlsx: () => new XlsxExporter(),
};

export function createExporter(format: ExportFormat): Exporter {
  return registry[format]();
}
```

3. **Sin herencia: funciones fábrica.** En TypeScript (y en JavaScript en general) es muy idiomático pasar la fábrica como función. Es Factory Method sin subclases: el cliente recibe "algo que sabe crear el producto".

```ts
class ReportJob {
  constructor(private readonly makeExporter: () => Exporter) {}
  run(rows: unknown[]) {
    const exporter = this.makeExporter(); // crea cuando lo necesita
    return exporter.export(rows);
  }
}
new ReportJob(() => new CsvExporter());
```

#### Consecuencias

- **Elimina la necesidad de atar clases específicas de la aplicación al código.** El código del framework solo habla con `Product`.
- **Proporciona ganchos a las subclases.** Crear objetos con un factory method es más flexible que crearlos directamente.
- **Conecta jerarquías paralelas.** Por ejemplo, cada tipo de figura sabe crear su propio "manipulador" de arrastre: `LineFigure.createManipulator()` devuelve un `LineManipulator`.
- **Desventaja:** en su forma clásica obliga a crear una subclase del creator solo para cambiar el producto. Si el cliente no necesitaba esa subclase por otras razones, es un punto de evolución extra. La variante con funciones o con registro lo evita.

### Abstract Factory

**Intención:** proporcionar una interfaz para crear **familias** de objetos relacionados o dependientes sin especificar sus clases concretas.

#### El problema

Un toolkit de interfaz gráfica soporta varios estilos visuales (en el libro, Motif y Presentation Manager; hoy piensa en "tema claro/oscuro" o "web/móvil"). Cada estilo tiene su propio botón, barra de desplazamiento y ventana. La aplicación no debe instanciar widgets de un estilo concreto, y además **no puedes mezclar** un botón de un estilo con una ventana de otro.

La solución: una interfaz `WidgetFactory` con una operación por producto (`createButton`, `createScrollBar`, `createWindow`), y una fábrica concreta por familia. La aplicación recibe una fábrica y crea todo a través de ella. Como todos los productos salen de la misma fábrica, la consistencia de la familia está garantizada.

```
             ┌──────────────────────────────┐
 Client ────▶│ «interface» UiFactory         │
   │         │ createButton(): Button       │
   │         │ createDialog(): Dialog       │
   │         └───────▲──────────────▲───────┘
   │                 │              │
   │       ┌─────────┴──────┐ ┌─────┴──────────┐
   │       │ WebUiFactory   │ │ TerminalUiFact.│
   │       └───┬───────┬────┘ └───┬───────┬────┘
   │           │crea   │crea      │crea   │crea
   ▼           ▼       ▼          ▼       ▼
 «Button» ◀── WebButton        TermButton
 «Dialog» ◀── WebDialog        TermDialog
```

#### En TypeScript: infraestructura de nube

Un ejemplo más cercano a tu día a día: un sistema que puede desplegarse en AWS o en un entorno local, y cuyo almacenamiento de archivos y cola de mensajes deben ser **del mismo proveedor**.

```ts
interface FileStorage { put(key: string, data: Uint8Array): Promise<void> }
interface MessageQueue { publish(topic: string, msg: string): Promise<void> }

interface InfraFactory {
  createStorage(): FileStorage;
  createQueue(): MessageQueue;
}

class AwsInfra implements InfraFactory {
  createStorage(): FileStorage {
    return { put: async (k) => console.log(`S3 put ${k}`) };
  }
  createQueue(): MessageQueue {
    return { publish: async (t) => console.log(`SQS publish ${t}`) };
  }
}

class LocalInfra implements InfraFactory {
  createStorage(): FileStorage {
    const files = new Map<string, Uint8Array>();
    return { put: async (k, d) => void files.set(k, d) };
  }
  createQueue(): MessageQueue {
    return { publish: async (t, m) => console.log(`[local] ${t}: ${m}`) };
  }
}

// El cliente solo conoce la fábrica abstracta
export class InvoiceArchiver {
  private storage: FileStorage;
  private queue: MessageQueue;
  constructor(infra: InfraFactory) {
    this.storage = infra.createStorage();
    this.queue = infra.createQueue();
  }
  async archive(id: string, pdf: Uint8Array) {
    await this.storage.put(`invoices/${id}.pdf`, pdf);
    await this.queue.publish("invoice.archived", id);
  }
}

// Composition root: el único lugar que decide la familia
const infra = process.env.NODE_ENV === "production" ? new AwsInfra() : new LocalInfra();
new InvoiceArchiver(infra);
```

#### Consecuencias

| Beneficio / costo | Explicación |
| --- | --- |
| ✅ Aísla las clases concretas | Los clientes manipulan productos solo por sus interfaces; los nombres de las clases concretas viven en la fábrica. |
| ✅ Cambiar de familia es trivial | Se cambia una sola línea: qué fábrica concreta se instancia. |
| ✅ Promueve la consistencia | Los productos de una familia siempre se usan juntos. |
| ❌ Agregar un **nuevo tipo de producto** es caro | Si mañana necesitas `createCache()`, cambias la interfaz y todas las fábricas concretas. |

Ese último punto es el compromiso clave: Abstract Factory facilita agregar **familias** (un nuevo proveedor) pero dificulta agregar **productos** (un nuevo tipo de objeto en todas las familias).

#### Notas de implementación

- **Una fábrica concreta suele ser única** en la aplicación (por eso a veces se combina con Singleton, aunque en TypeScript basta con crearla una vez en el punto de arranque).
- **Las fábricas concretas suelen implementarse con factory methods**: cada operación `createX` es un factory method.
- **Fábricas extensibles**: en lugar de una operación por producto, una sola `create(kind)` parametrizada. Es más flexible pero pierde seguridad de tipos; en TypeScript puedes recuperarla con tipos mapeados.

### Factory Method vs. Abstract Factory

| | Factory Method | Abstract Factory |
| --- | --- | --- |
| Crea | Un producto | Una familia de productos relacionados |
| Mecanismo clásico | Herencia: la subclase decide | Composición: el cliente recibe un objeto fábrica |
| Pregunta que responde | "¿Qué clase concreta de X uso aquí?" | "¿Qué conjunto coherente de X, Y, Z uso?" |
| Extensión fácil | Agregar un producto nuevo (otra subclase o entrada del registro) | Agregar una familia nueva |
| Extensión difícil | Nada grave, salvo la proliferación de subclases en la forma clásica | Agregar un tipo de producto nuevo |

Muchos diseños empiezan con Factory Method (más simple) y evolucionan hacia Abstract Factory, Prototype o Builder cuando descubren que necesitan más flexibilidad.

### Relación con Clean Architecture: la fábrica cruza el límite

Más adelante verás el principio de inversión de dependencias (DIP). Un problema que resuelve Abstract Factory es que crear un objeto concreto exige **importar** su clase concreta. Si el caso de uso hace `new PostgresInvoiceRepository()`, depende del detalle. Con una fábrica abstracta definida en el lado del negocio e implementada en el lado de la infraestructura, el import vuelve a apuntar hacia el negocio. En la práctica moderna, ese trabajo lo hace el **composition root** (el `main`) o un contenedor de inyección de dependencias, que son primos cercanos de este patrón.

### Paso a paso: refactorizar hacia una fábrica

Casi nunca diseñarás una fábrica desde cero; lo normal es descubrir que la necesitas cuando el código ya existe. Este es un camino seguro, en pasos pequeños, para pasar de `new` esparcidos a una creación centralizada:

1. **Localiza los `new` de la misma familia.** Busca en el código todos los sitios donde se instancia la clase concreta que quieres poder sustituir (por ejemplo, `new StripeClient(...)`). Anota cuántos son y en qué capas viven.
2. **Extrae una interfaz con lo que realmente se usa.** Mira qué métodos llaman los clientes y define una interfaz solo con esos (`PaymentGateway { charge(...) }`). No copies toda la API del proveedor: así la interfaz habla tu idioma, no el del proveedor.
3. **Haz que la clase concreta implemente la interfaz**, directamente o con un pequeño adaptador si su API no coincide (verás Adapter en la sesión 6).
4. **Cambia los tipos de los clientes** de la clase concreta a la interfaz. El compilador de TypeScript te avisará de cualquier uso de métodos que no estén en la interfaz.
5. **Mueve los `new` a un único lugar**: una función fábrica, una fábrica abstracta o el composition root. Los clientes reciben el objeto por constructor o reciben la fábrica si necesitan crear varias instancias a lo largo del tiempo.
6. **Agrega la segunda implementación** (la falsa para tests, o la del nuevo proveedor) y comprueba que ningún cliente cambia.

Cada paso deja el sistema funcionando, así que puedes hacer un commit entre paso y paso. Si en el paso 6 tienes que tocar algún cliente, es una señal de que la interfaz todavía filtra detalles del proveedor.

### Fábricas y tests

Uno de los beneficios más inmediatos de estos patrones es la testabilidad. Cuando el código bajo prueba crea sus propias dependencias con `new`, la única forma de aislarlo es con trucos de mocking de módulos, que son frágiles y acoplan el test a la ruta de los archivos. Cuando el código recibe una fábrica (o el objeto ya creado), el test simplemente le pasa una versión falsa:

```ts
import { expect, test } from "vitest";

class RecordingInfra implements InfraFactory {
  stored: string[] = [];
  published: string[] = [];
  createStorage(): FileStorage {
    return { put: async (k) => void this.stored.push(k) };
  }
  createQueue(): MessageQueue {
    return { publish: async (t, m) => void this.published.push(`${t}:${m}`) };
  }
}

test("archivar guarda el PDF y publica el evento", async () => {
  const infra = new RecordingInfra();
  await new InvoiceArchiver(infra).archive("F-1", new Uint8Array());
  expect(infra.stored).toEqual(["invoices/F-1.pdf"]);
  expect(infra.published).toEqual(["invoice.archived:F-1"]);
});
```

El test no necesita red, ni credenciales, ni librerías de mocking: la familia "de grabación" es otra familia más. Es la misma idea del dispositivo `InMemory` de la sesión anterior.

### Analogía de construcción

Factory Method es el contratista general que sabe *cuándo* hay que colocar ventanas, pero deja que cada subcontratista (aluminio, madera, PVC) decida qué ventana concreta fabricar. Abstract Factory es el catálogo de un fabricante de cocinas: si eliges la línea "Nórdica", la encimera, los gabinetes y las manijas vienen todos de esa línea y combinan entre sí; no puedes mezclar una manija "Industrial" sin romper la coherencia.

### Cuándo usarlos y cuándo no

| Úsalo cuando… | Evítalo cuando… |
| --- | --- |
| Una clase no puede anticipar qué clase de objetos debe crear (frameworks, plugins). | Solo existe una implementación y no hay razón real para variar. |
| Quieres que la decisión de qué crear viva en un único lugar. | El `new` está en un solo sitio y es fácil de cambiar. |
| Hay familias de objetos que deben usarse juntas (Abstract Factory). | Los "productos" no tienen relación entre sí: usa fábricas separadas. |
| Necesitas sustituir implementaciones en tests sin tocar el cliente. | Una simple inyección por constructor ya resuelve la sustitución. |

### Errores comunes

- **Fábricas de una sola línea para todo.** `UserFactory.create()` que solo hace `new User()` no aporta nada; añade indirección sin flexibilidad.
- **`switch` gigante que crece en cada feature.** Cuando el factory parametrizado tiene 30 casos, usa un registro o divide por familias.
- **Fábricas que además configuran, validan y guardan.** Una fábrica crea; persistir es trabajo de un repositorio y validar reglas de negocio, del dominio.
- **Abstract Factory con productos no relacionados.** Si no existe la restricción "deben usarse juntos", no necesitas el patrón.
- **Esconder dependencias en fábricas globales estáticas.** Si cualquier clase llama a `Factory.get()`, vuelves al acoplamiento oculto; inyecta la fábrica.

### Resumen

Los patrones creacionales separan el uso de un objeto de la decisión de qué clase crear. Factory Method delega esa decisión a una subclase, a un registro o a una función, y es ideal para frameworks y extensiones. Abstract Factory agrupa la creación de familias coherentes detrás de una interfaz: cambiar de familia es fácil, agregar un producto nuevo es caro. En TypeScript, las funciones fábrica y el composition root suelen ser la forma más ligera de aplicar estas ideas.

## Conceptos clave

- **Patrón creacional**: patrón que abstrae el proceso de instanciación para independizar al sistema de cómo se crean sus objetos.
- **Factory Method**: método que crea un producto y cuya implementación concreta decide una subclase (o una función inyectada).
- **Factory method parametrizado**: fábrica que recibe un identificador y decide qué producto crear.
- **Abstract Factory**: interfaz para crear familias de objetos relacionados sin nombrar sus clases concretas.
- **Familia de productos**: conjunto de objetos diseñados para usarse juntos (por ejemplo, almacenamiento y cola del mismo proveedor).
- **Composition root**: punto de arranque de la aplicación donde se eligen y conectan las implementaciones concretas.
- **Gancho (hook)**: operación con comportamiento por defecto que las subclases pueden sobrescribir para extender.

## Preguntas de repaso

1. ¿Qué problema resuelve Factory Method en un framework?
   R: El framework sabe cuándo debe crear un objeto pero no qué clase concreta crear, porque eso depende de la aplicación. Declara un método de creación abstracto y deja que la subclase (o una función inyectada) decida la clase concreta.
2. ¿Cuál es la principal desventaja del Factory Method clásico y cómo se evita en TypeScript?
   R: Obliga a crear una subclase del creator solo para cambiar el producto. Se evita pasando una función fábrica o usando un registro de constructores, de modo que la decisión se inyecta sin herencia.
3. ¿Qué garantiza Abstract Factory que no garantizan varias fábricas independientes?
   R: La consistencia de la familia: como todos los productos salen de la misma fábrica concreta, nunca se mezclan productos de familias distintas (por ejemplo, almacenamiento de un proveedor y cola de otro).
4. ¿Por qué es caro agregar un nuevo tipo de producto en Abstract Factory?
   R: Porque la interfaz de la fábrica tiene una operación por producto; agregar uno nuevo obliga a cambiar la interfaz y a implementar la operación en todas las fábricas concretas existentes.
5. ¿Qué relación hay entre las fábricas y la inversión de dependencias?
   R: Crear un objeto concreto exige importar su clase. Si la fábrica se define como interfaz del lado del negocio y se implementa en la infraestructura (o se decide en el composition root), el código de negocio deja de depender de clases concretas de infraestructura.
6. Da un ejemplo de fábrica innecesaria.
   R: Una clase `UserFactory` cuyo único método hace `new User(data)` sin elegir entre variantes ni ocultar dependencias. Añade indirección sin aportar flexibilidad.

## Ejercicio

Diseña un sistema de notificaciones multi-proveedor en TypeScript: interfaces `EmailSender` y `SmsSender`, una `NotificationProviderFactory` con dos familias (`TwilioSendgridFactory` y `ConsoleFactory` para desarrollo) y una clase `WelcomeFlow` que recibe la fábrica y envía un email y un SMS. Añade además un factory method parametrizado `createTemplate(kind: "welcome" | "reset")` basado en un registro. Escribe tests con Vitest usando `ConsoleFactory` (o una fábrica falsa que registre los envíos). **Terminado cuando:** `WelcomeFlow` no importa ninguna clase concreta, cambiar de familia es una sola línea en el composition root y agregar una plantilla nueva no modifica ninguna función existente salvo el registro.

## Explícalo con tus palabras

Explica con el ejemplo del catálogo de cocinas la diferencia entre Factory Method y Abstract Factory, y por qué agregar un producto nuevo a una familia es caro.
