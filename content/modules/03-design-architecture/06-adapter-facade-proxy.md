---
title: "Patrones estructurales I: Adapter, Facade y Proxy"
kind: lesson
hours: 2
sources: Design Patterns (GoF), cap. 4, introducción (pp. 157–158) | Design Patterns (GoF), Adapter (pp. 159–170) | Design Patterns (GoF), Facade (pp. 205–214) | Design Patterns (GoF), Proxy (pp. 227–238) | Design Patterns (GoF), Discussion of Structural Patterns (pp. 239–240)
links: Refactoring.Guru, Adapter | https://refactoring.guru/es/design-patterns/adapter ; Refactoring.Guru, Proxy | https://refactoring.guru/es/design-patterns/proxy
---

## Objetivo

Dominar tres patrones que "envuelven" objetos y que vas a usar constantemente al integrar librerías y servicios externos: Adapter (traducir una interfaz), Facade (simplificar un subsistema) y Proxy (controlar el acceso a un objeto con la misma interfaz).

## Estudio

### Qué tienen en común los patrones estructurales

Los patrones estructurales tratan de **cómo se componen clases y objetos para formar estructuras más grandes**. Los de ámbito de clase usan herencia para combinar interfaces o implementaciones; los de ámbito de objeto describen formas de componer objetos para obtener nueva funcionalidad, con la ventaja de que la composición puede cambiar en tiempo de ejecución.

Tres de ellos, Adapter, Facade y Proxy, parecen casi iguales en el código: una clase que tiene una referencia a otra y le reenvía llamadas. La diferencia está en la **intención**, y conocer la intención es lo que te permite elegir bien y nombrar bien:

| Patrón | Interfaz que ofrece | Para qué |
| --- | --- | --- |
| Adapter | **Distinta** a la del objeto envuelto (la que el cliente espera) | Hacer compatibles dos interfaces que no encajan |
| Facade | **Nueva y más simple** sobre **varios** objetos | Ocultar la complejidad de un subsistema |
| Proxy | **La misma** que la del objeto envuelto | Controlar el acceso: carga perezosa, permisos, remoto, caché |
| Decorator (sesión 7) | **La misma**, con comportamiento añadido | Agregar responsabilidades dinámicamente |

### Adapter

**Intención:** convertir la interfaz de una clase en otra interfaz que el cliente espera. Adapter permite que clases con interfaces incompatibles trabajen juntas. También se le llama **Wrapper**.

#### El problema

Un editor de dibujo trabaja con una interfaz `Shape` (cada figura sabe dibujarse y decir su área de selección). Hacer una figura de línea es fácil, pero una figura de texto editable es complicadísima. Por suerte, un toolkit ya tiene un `TextView` excelente... con una interfaz que no tiene nada que ver con `Shape`. No puedes modificar `TextView` (no tienes el código, y además no tendría sentido que una librería genérica adoptara la interfaz de tu aplicación). La solución es una clase `TextShape` que implementa `Shape` y, por dentro, traduce cada llamada a `TextView`.

Hoy el caso más frecuente es exactamente ese: **SDKs de terceros**. Tu dominio quiere hablar de "cobrar 50 000 pesos a un cliente", y el SDK habla de `paymentIntents.create({ amount, currency, customer, confirm })` en centavos, con sus propios errores.

```
 Cliente ──▶ «interface» PaymentGateway        (lo que tu app espera)
                    ▲  charge(customerId, money)
                    │ implementa
            ┌───────┴────────────┐   usa    ┌──────────────────┐
            │ StripeGatewayAdapter│────────▶│ Stripe SDK        │ (lo que existe)
            └────────────────────┘          │ paymentIntents.*  │
                                            └──────────────────┘
```

```ts
// Puerto: el idioma de tu aplicación
export interface Money { amount: number; currency: "COP" | "USD" }
export type ChargeResult =
  | { ok: true; transactionId: string }
  | { ok: false; reason: "declined" | "provider_error" };

export interface PaymentGateway {
  charge(customerId: string, money: Money): Promise<ChargeResult>;
}

// Lo que existe (simplificado): un SDK con su propio idioma
interface StripeLike {
  paymentIntents: {
    create(p: { amount: number; currency: string; customer: string; confirm: boolean }):
      Promise<{ id: string; status: "succeeded" | "requires_payment_method" }>;
  };
}

// Adapter: traduce en ambas direcciones
export class StripeGatewayAdapter implements PaymentGateway {
  constructor(private readonly stripe: StripeLike) {}

  async charge(customerId: string, money: Money): Promise<ChargeResult> {
    try {
      const intent = await this.stripe.paymentIntents.create({
        amount: Math.round(money.amount * 100),     // unidades → centavos
        currency: money.currency.toLowerCase(),     // "COP" → "cop"
        customer: customerId,
        confirm: true,
      });
      return intent.status === "succeeded"
        ? { ok: true, transactionId: intent.id }
        : { ok: false, reason: "declined" };
    } catch {
      return { ok: false, reason: "provider_error" }; // errores del SDK → tu idioma
    }
  }
}
```

Fíjate en que el adaptador traduce **tres cosas**: los nombres de las operaciones, el formato de los datos (centavos, minúsculas) y los errores. Esa última suele olvidarse, y es la razón por la que excepciones de librerías externas terminan atravesando toda la aplicación.

#### Adapter de clase vs. de objeto

- **De clase**: el adaptador hereda de la clase adaptada e implementa la interfaz objetivo. Permite sobrescribir comportamiento del adaptado, pero solo sirve para una clase concreta y requiere herencia múltiple o similar.
- **De objeto**: el adaptador **contiene** una instancia del adaptado (como arriba). Funciona con el adaptado y todas sus subclases y es la forma natural en TypeScript.

#### Cuánto adapta un adaptador

El trabajo de un adaptador va desde un simple cambio de nombres hasta soportar un conjunto de operaciones completamente distinto. El libro introduce también los **adaptadores enchufables** (pluggable adapters): clases que se diseñan desde el principio para adaptarse a interfaces que todavía no conocen, por ejemplo recibiendo funciones para obtener los datos que necesitan. En TypeScript eso suele ser simplemente recibir funciones en el constructor.

#### Consecuencias

- ✅ Reutilizas código existente sin modificarlo.
- ✅ Aísla tu aplicación de cambios en la librería: si el proveedor cambia su API, solo cambia el adaptador.
- ✅ Hace posible cambiar de proveedor (escribes otro adaptador para la misma interfaz).
- ❌ Una capa más de código y de traducción que mantener.

Este patrón es **la mitad de la arquitectura hexagonal** que verás al final del módulo: los "adaptadores" de ports & adapters son exactamente esto.

### Facade

**Intención:** proporcionar una interfaz unificada a un conjunto de interfaces de un subsistema. Facade define una interfaz de más alto nivel que hace que el subsistema sea más fácil de usar.

#### El problema

Un compilador tiene un `Scanner`, un `Parser`, nodos del árbol, un generador de bytecode y más. Algunas herramientas especializadas necesitan esas piezas, pero la mayoría de los clientes solo quieren "compilar este código". Para ellos, la API de bajo nivel complica la tarea. Una clase `Compiler` con una operación `compile()` sirve como fachada: une las piezas en el orden correcto **sin esconderlas** para quien sí las necesita.

Hay una tensión interesante que el libro señala: al aplicar patrones, los subsistemas suelen acabar con **más clases pequeñas**, lo que los hace más reutilizables pero más difíciles de usar. Facade es el contrapeso: una vista simple por defecto para la mayoría.

```ts
// Subsistema: piezas útiles pero de bajo nivel
class InventoryService { reserve(sku: string, qty: number) { return `res-${sku}`; } release(id: string) {} }
class PaymentService { async charge(customer: string, total: number) { return `tx-${customer}`; } }
class ShippingService { schedule(orderId: string, address: string) { return "2026-11-02"; } }
class EmailService { async send(to: string, subject: string) {} }

// Fachada: el caso común en una llamada
export class CheckoutFacade {
  constructor(
    private inventory: InventoryService,
    private payments: PaymentService,
    private shipping: ShippingService,
    private email: EmailService,
  ) {}

  async checkout(order: { id: string; customer: string; email: string; address: string;
                          items: { sku: string; qty: number; price: number }[] }) {
    const reservations = order.items.map((i) => this.inventory.reserve(i.sku, i.qty));
    try {
      const total = order.items.reduce((s, i) => s + i.qty * i.price, 0);
      const tx = await this.payments.charge(order.customer, total);
      const eta = this.shipping.schedule(order.id, order.address);
      await this.email.send(order.email, `Pedido ${order.id} confirmado, llega ${eta}`);
      return { tx, eta };
    } catch (e) {
      reservations.forEach((r) => this.inventory.release(r)); // compensación
      throw e;
    }
  }
}
```

#### Consecuencias

- ✅ **Aísla a los clientes** de los componentes del subsistema: menos objetos que conocer.
- ✅ **Promueve acoplamiento débil** entre el subsistema y sus clientes; puedes cambiar los componentes internos sin afectar a los clientes de la fachada.
- ✅ Ayuda a **estructurar en capas**: cada capa expone una fachada a la de arriba.
- ✅ No impide que las aplicaciones avanzadas usen las clases del subsistema si lo necesitan.
- ❌ Riesgo de convertirse en un **"objeto dios"** si acumula toda la lógica en lugar de coordinar.

Facade y Clean Architecture se tocan: un **caso de uso** de aplicación (por ejemplo, `PlaceOrder`) a menudo funciona como una fachada sobre el dominio y los puertos. Y en el capítulo de "fronteras parciales" verás que una fachada es una forma barata de dejar preparada una frontera arquitectónica.

### Proxy

**Intención:** proporcionar un sustituto o representante de otro objeto para controlar el acceso a él.

#### El problema

Un editor de documentos con imágenes grandes debe abrir rápido. Cargar todas las imágenes al abrir es lento e inútil, porque la mayoría no están visibles. La solución es colocar en el documento un `ImageProxy` con la misma interfaz que `Image`: guarda el nombre del archivo y el tamaño (para que el formateador pueda maquetar sin cargar nada), y solo crea la imagen real la primera vez que alguien le pide dibujarse. El resto del editor no se entera.

#### Tipos de proxy

| Tipo | Qué controla | Ejemplo moderno |
| --- | --- | --- |
| **Virtual** | Crea objetos costosos bajo demanda | Carga perezosa de un cliente pesado, imágenes, módulos |
| **Remoto** | Representa localmente un objeto que vive en otro espacio de direcciones | Cliente gRPC o cliente HTTP generado con la misma interfaz que el servicio |
| **De protección** | Verifica permisos antes de reenviar | Comprobar roles antes de llamar a un servicio de administración |
| **Referencia inteligente** | Hace trabajo extra al acceder: contar referencias, bloquear, registrar | Caché, logging, métricas, conteo de llamadas |

```ts
export interface ProductCatalog {
  find(sku: string): Promise<{ sku: string; name: string; price: number } | null>;
}

// Proxy de caché (referencia inteligente): misma interfaz, acceso controlado
export class CachedCatalog implements ProductCatalog {
  private cache = new Map<string, { value: Awaited<ReturnType<ProductCatalog["find"]>>; at: number }>();
  constructor(private readonly real: ProductCatalog, private readonly ttlMs = 60_000,
              private readonly now = () => Date.now()) {}

  async find(sku: string) {
    const hit = this.cache.get(sku);
    if (hit && this.now() - hit.at < this.ttlMs) return hit.value;
    const value = await this.real.find(sku);
    this.cache.set(sku, { value, at: this.now() });
    return value;
  }
}

// Proxy de protección
export class AuthorizedCatalogAdmin {
  constructor(private readonly real: { setPrice(sku: string, p: number): Promise<void> },
              private readonly currentRole: () => "admin" | "viewer") {}
  async setPrice(sku: string, p: number) {
    if (this.currentRole() !== "admin") throw new Error("No autorizado");
    return this.real.setPrice(sku, p);
  }
}
```

JavaScript tiene incluso un objeto `Proxy` nativo que intercepta accesos a propiedades; frameworks como Vue lo usan para su reactividad. Pero para diseño de aplicaciones, una clase explícita que implementa la misma interfaz es más legible y tipada.

#### Consecuencias

El proxy introduce un nivel de indirección al acceder a un objeto, y esa indirección tiene distintos usos según el tipo: ocultar que el objeto vive en otro lugar (remoto), optimizar creándolo bajo demanda (virtual), o agregar tareas de mantenimiento y control (protección, referencia inteligente). Otra optimización clásica es **copy-on-write**: el proxy comparte el objeto entre varios clientes y solo lo copia cuando alguno intenta modificarlo.

El riesgo: un proxy remoto que **parece** una llamada local puede esconder latencia y fallos de red. Una llamada que tarda 200 ms y puede fallar no debería disfrazarse de un acceso a memoria; por eso las interfaces remotas suelen ser asíncronas y devolver resultados explícitos de error.

### Discusión: los estructurales se parecen, pero no son iguales

El libro dedica una sección a comparar patrones estructurales que tienen estructuras casi idénticas. La lección general es: **dos patrones pueden tener el mismo diagrama y resolver problemas distintos**. Adapter se aplica a sistemas **ya diseñados** para hacerlos convivir; Bridge (que no estudiamos en detalle) se aplica **por adelantado** para que una abstracción y su implementación varíen por separado. Facade define una interfaz **nueva**; Adapter **reutiliza** una interfaz existente. Proxy y Decorator tienen la misma estructura, pero Proxy no agrega funcionalidad de forma dinámica y recursiva: controla el acceso a un único objeto.

### Los tres juntos: una cadena de envoltorios

En un sistema real estos patrones se apilan con naturalidad. Piensa en cómo llega una petición de catálogo desde tu caso de uso hasta un proveedor externo:

```
CheckoutFacade                       (Facade: coordina el caso común)
   └── usa ProductCatalog
          └── AuthorizedCatalog      (Proxy de protección)
                 └── CachedCatalog   (Proxy de caché)
                        └── VendorCatalogAdapter   (Adapter: traduce el SDK)
                               └── VendorSdk       (código ajeno)
```

Cada capa tiene una sola razón para existir y una sola razón para cambiar. Si el proveedor cambia su SDK, solo tocas el adaptador. Si cambia la política de caché, solo el proxy de caché. Si cambia quién puede ver precios, solo el proxy de protección. Y como todas las capas internas implementan la misma interfaz `ProductCatalog`, puedes **quitar o reordenar** envoltorios en el composition root sin cambiar ninguna clase: por ejemplo, en los tests quitas la caché para que cada llamada llegue al falso.

El orden importa y es una decisión de diseño: si pones la caché **por fuera** de la protección, un usuario sin permisos podría recibir un valor cacheado que obtuvo otro usuario con permisos. Por eso conviene dejar explícito, en un único lugar, cómo se ensambla la cadena:

```ts
function buildCatalog(sdk: VendorSdk, role: () => "admin" | "viewer"): ProductCatalog {
  const adapted = new VendorCatalogAdapter(sdk);
  const cached = new CachedCatalog(adapted, 60_000);
  return new AuthorizedCatalog(cached, role); // la protección siempre por fuera
}
```

Esta forma de pensar ("envoltorios con la misma interfaz que se ensamblan en un solo sitio") es la base de los middlewares de Express, de los interceptores de clientes HTTP y del patrón Decorator que verás en la próxima sesión.

### Analogía de construcción

Un **adaptador** es el adaptador de enchufe que llevas de viaje: tu cargador no cambia, la toma de la pared tampoco, y una pieza en medio traduce entre ambos. Una **fachada** es la recepción de un edificio de oficinas: no necesitas saber qué empresa está en qué piso ni cómo funcionan los ascensores; dices a quién buscas y te dirigen. Un **proxy** es el portero: tiene la misma "puerta" que el edificio, pero decide quién pasa, registra las visitas o te dice que esperes mientras llama arriba.

### Cuándo usar y cuándo no

| Patrón | Úsalo cuando… | No lo uses cuando… |
| --- | --- | --- |
| Adapter | Integras un SDK o un sistema legado con interfaz ajena; quieres que tu dominio no conozca al proveedor. | Controlas ambas interfaces y puedes alinearlas directamente. |
| Facade | Un subsistema tiene muchas piezas y la mayoría de clientes hace siempre la misma secuencia. | La fachada empieza a contener reglas de negocio que deberían vivir en el dominio. |
| Proxy | Necesitas carga perezosa, caché, permisos, métricas o acceso remoto transparentes para el cliente. | La transparencia esconde costos importantes (latencia de red) que el cliente debería conocer. |

### Errores comunes

- **Adaptadores que filtran tipos del proveedor.** Si tu interfaz `PaymentGateway` devuelve `Stripe.PaymentIntent`, no adaptaste nada.
- **No traducir errores.** Las excepciones del SDK cruzan hacia tu dominio y te acoplan igual que antes.
- **Facade como cajón de sastre.** Si la fachada tiene 40 métodos y lógica de negocio, se volvió un objeto dios.
- **Proxy de caché sin invalidación.** Una caché sin TTL ni invalidación termina sirviendo datos falsos.
- **Confundir Proxy con Decorator por el código.** Elige por intención y nombra según ella (`CachedCatalog`, `LoggingCatalog`).

### Resumen

Adapter traduce una interfaz existente a la que tu cliente espera (nombres, datos y errores) y es la pieza clave para aislar SDKs. Facade ofrece una puerta simple a un subsistema complejo sin impedir el acceso detallado. Proxy mantiene la misma interfaz y controla el acceso: perezoso, remoto, protegido o con caché. Tienen estructuras parecidas pero intenciones distintas, y la intención es lo que debes nombrar.

## Conceptos clave

- **Adapter (Wrapper)**: objeto que convierte la interfaz de otro en la interfaz que el cliente espera.
- **Adaptado (adaptee)**: la clase existente cuya interfaz no encaja.
- **Interfaz objetivo (target)**: la interfaz que el cliente espera usar.
- **Facade**: objeto que ofrece una interfaz simple y unificada sobre un subsistema.
- **Proxy**: sustituto con la misma interfaz que el objeto real, que controla el acceso a él.
- **Proxy virtual / remoto / de protección**: variantes que crean bajo demanda, representan objetos en otro proceso o verifican permisos.
- **Copy-on-write**: optimización que comparte un objeto y solo lo copia cuando alguien lo modifica.

## Preguntas de repaso

1. ¿Qué diferencia de intención hay entre Adapter, Facade y Proxy si su código se parece?
   R: Adapter ofrece una interfaz distinta para hacer compatibles dos interfaces; Facade ofrece una interfaz nueva y más simple sobre varios objetos de un subsistema; Proxy ofrece la misma interfaz que el objeto real para controlar el acceso a él.
2. ¿Qué tres cosas debería traducir un buen adaptador de un SDK externo?
   R: Los nombres y forma de las operaciones, el formato de los datos (unidades, códigos, estructuras) y los errores, de modo que ningún tipo ni excepción del proveedor llegue al dominio.
3. ¿Por qué Facade no debe ocultar completamente el subsistema?
   R: Porque su objetivo es simplificar el caso común, no prohibir el acceso detallado. Los clientes avanzados pueden seguir usando los componentes directamente cuando necesitan personalizar.
4. Nombra los cuatro tipos de proxy y un ejemplo de cada uno.
   R: Virtual (cargar una imagen o un cliente pesado bajo demanda), remoto (cliente gRPC que representa un servicio en otro proceso), de protección (comprobar el rol antes de una operación de administración) y referencia inteligente (caché, logging o métricas al acceder).
5. ¿Qué riesgo tiene un proxy remoto demasiado transparente?
   R: Que esconda la latencia y los fallos de red detrás de lo que parece una llamada local, llevando al cliente a usarlo como si fuera barato e infalible.
6. ¿Cuál es la diferencia entre Adapter de clase y de objeto?
   R: El de clase hereda del adaptado y solo sirve para esa clase concreta; el de objeto contiene una instancia del adaptado, funciona con sus subclases y es la forma habitual en TypeScript.

## Ejercicio

Integra una API de clima ficticia cuyo SDK devuelve `{ temp_f: number; cond_code: number }` y lanza `SdkTimeoutError`. Define el puerto `WeatherProvider.current(city): Promise<{ celsius: number; condition: "sunny" | "rain" | "cloudy" } | null>`, escribe un `WeatherSdkAdapter`, envuélvelo en un `CachedWeatherProvider` (proxy con TTL inyectable) y crea una `TravelAdviceFacade` con un método `adviceFor(city)` que combine el clima con un `CalendarService` simple. **Terminado cuando:** hay tests con Vitest que demuestran la conversión de unidades y de errores (timeout → `null`), que la segunda llamada dentro del TTL no llega al SDK (cuenta las llamadas) y que expira tras el TTL usando un reloj falso.

## Explícalo con tus palabras

Usa la analogía del adaptador de viaje, la recepción del edificio y el portero para explicar a alguien por qué tres clases que "solo reenvían llamadas" son patrones distintos.
