---
title: "DDD III: entidades, value objects, servicios de dominio y módulos"
kind: lesson
hours: 2
sources: Domain-Driven Design (Evans), cap. 5 "A Model Expressed in Software" (pp. 60–87)
links: Martin Fowler, "Anemic Domain Model" | https://martinfowler.com/bliki/AnemicDomainModel.html
---

## Objetivo

Dominar los bloques básicos con los que se expresa un modelo en código: **entidades** (definidas por su identidad), **value objects** (definidos por sus atributos, inmutables), **servicios de dominio** (operaciones que no pertenecen a ningún objeto) y **módulos** (agrupaciones con significado de dominio), sabiendo distinguirlos y evitar el modelo anémico.

## Estudio

### Por qué importa la categoría de cada objeto

Cuando modelas, la pregunta "¿qué tipo de objeto es este?" tiene consecuencias enormes: cómo se compara, si puede cambiar, cómo se guarda, si se puede compartir y cuánto cuesta mantenerlo consistente. Evans distingue tres categorías para los elementos del modelo (entidades, value objects y servicios) y una forma de organizarlos (módulos).

### Entidades

Evans cuenta una anécdota: una casera lo demandó por daños en un departamento que nunca había visitado. El verdadero responsable era el inquilino anterior, otro Eric Evans. Lo que lo salvó fue la guía telefónica del año anterior, que mostraba que él llevaba dos años en la misma dirección: dos personas con el **mismo nombre** pero **distinta identidad**. Las computadoras no tienen ese ingenio: una confusión de identidad en software produce datos corruptos y errores.

Muchos objetos **no se definen por sus atributos**, sino por un **hilo de continuidad e identidad** a lo largo del tiempo. Una persona cambia de nombre, de dirección, de peso, de relaciones financieras; no hay un solo atributo que no pueda cambiar, y sin embargo sigue siendo la misma persona. Un objeto definido principalmente por su identidad es una **ENTIDAD**.

Características:

- Tienen un **ciclo de vida** que puede cambiar radicalmente su forma y su contenido, manteniendo la continuidad.
- Su identidad debe definirse para poder **rastrearla**, incluso a través de distintas representaciones (en la base de datos, en otro sistema, en un archivo exportado).
- Su definición de clase, sus responsabilidades y sus asociaciones deben girar alrededor de **quién son**, no de los atributos que llevan.

Ojo con un malentendido: todos los lenguajes orientados a objetos dan "identidad" a cada instancia (dos referencias al mismo objeto en memoria). Eso es identidad **técnica**, no de dominio. En un banco, dos depósitos del mismo monto a la misma cuenta el mismo día son **transacciones distintas**: tienen identidad aunque todos sus atributos coincidan. En cambio, dos billetes de 10 000 pueden ser intercambiables para casi cualquier aplicación (salvo para la que rastrea billetes falsos).

#### Modelar entidades

Evans aconseja mantener la definición de la entidad **simple y centrada en el ciclo de vida y la identidad**: los atributos y el comportamiento esenciales para identificarla y los que se usan para encontrarla o compararla. El resto del comportamiento conviene moverlo a otros objetos asociados (a menudo value objects).

#### Diseñar la identidad

Cada entidad necesita una forma de saber si dos objetos representan lo mismo. Opciones:

| Estrategia | Ejemplo | Cuidado con… |
| --- | --- | --- |
| Atributos únicos del dominio | Número de documento, código de un vuelo + fecha | Que cambien o se repitan entre contextos. |
| Identificador generado por el sistema | UUID, secuencia numérica | Que sea único en todo el sistema (distribuido) y estable. |
| Identificador de un sistema externo | Número de una factura electrónica asignado por la autoridad fiscal | Depender de otro sistema para crear el objeto. |

Cuando el identificador lo generas tú, conviene hacerlo **en el dominio o la aplicación** (por ejemplo, un UUID al crear el objeto), y no depender de que la base de datos lo asigne al guardar: así el objeto tiene identidad desde que nace y puedes referenciarlo antes de persistirlo.

```ts
import { randomUUID } from "node:crypto";

export type PatientId = string & { readonly __brand: "PatientId" };
export const newPatientId = () => randomUUID() as PatientId;

export class Patient {
  private constructor(
    readonly id: PatientId,
    private name: string,
    private weightKg: number,
  ) {}

  static register(name: string, weightKg: number) {
    if (!name.trim()) throw new Error("El nombre es obligatorio");
    return new Patient(newPatientId(), name.trim(), weightKg);
  }

  rename(newName: string) { this.name = newName; }          // los atributos cambian...
  recordWeight(kg: number) {
    if (kg <= 0) throw new Error("Peso inválido");
    this.weightKg = kg;
  }
  equals(other: Patient) { return this.id === other.id; }   // ...la identidad no
}
```

### Value objects

Hay objetos que solo nos importan por **lo que son**, no por **quiénes son**: un color, un monto de dinero, una dirección, un rango de fechas, una coordenada. Un objeto que representa un aspecto descriptivo del dominio **sin identidad conceptual** es un **VALUE OBJECT**.

Ejemplo de Evans: un niño que dibuja le importa el color del marcador y quizás el grosor de la punta; si hay dos marcadores iguales, le da lo mismo cuál usa. Los marcadores son, para él, valores intercambiables.

Si no le das identidad a lo que no la necesita, ganas libertad de diseño: no hay que rastrear, comparar por ID ni guardar historiales. Los value objects:

- Se comparan **por sus atributos** (dos montos de 100 COP son iguales).
- Deben ser **inmutables**: no se modifican, se **reemplazan** por uno nuevo. Esto los hace seguros de compartir.
- Forman un **todo conceptual**: no tengas `calle`, `ciudad` y `codigoPostal` sueltos en un cliente; agrúpalos en una `Address`.
- Pueden ser complejos, contener otros value objects e incluso referenciar entidades.
- Son ideales como **parámetros** y **atributos** de entidades.
- Pueden tener **comportamiento** rico, sin efectos secundarios: `money.add(other)` devuelve un nuevo `Money`.

```ts
export class Money {
  private constructor(readonly cents: number, readonly currency: "COP" | "USD") {}

  static of(amount: number, currency: "COP" | "USD") {
    if (!Number.isFinite(amount)) throw new Error("Monto inválido");
    return new Money(Math.round(amount * 100), currency);
  }
  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.cents + other.cents, this.currency); // nuevo objeto
  }
  multiply(factor: number): Money {
    return new Money(Math.round(this.cents * factor), this.currency);
  }
  isGreaterThan(other: Money) { this.assertSameCurrency(other); return this.cents > other.cents; }
  equals(other: Money) { return this.cents === other.cents && this.currency === other.currency; }
  toString() { return `${(this.cents / 100).toFixed(2)} ${this.currency}`; }
  private assertSameCurrency(o: Money) {
    if (o.currency !== this.currency) throw new Error("No se pueden mezclar monedas");
  }
}

export class DateRange {
  private constructor(readonly start: Date, readonly end: Date) {}
  static of(start: Date, end: Date) {
    if (end <= start) throw new Error("El fin debe ser posterior al inicio");
    return new DateRange(new Date(start), new Date(end)); // copia defensiva
  }
  overlaps(o: DateRange) { return this.start < o.end && o.start < this.end; }
  days() { return Math.ceil((this.end.getTime() - this.start.getTime()) / 86_400_000); }
}
```

Fíjate en cuánto conocimiento del dominio vive ahora en estos objetos: no se mezclan monedas, los rangos no pueden estar invertidos, el solapamiento se calcula en un solo lugar. Ese es el antídoto contra la **obsesión por los primitivos** (usar `number` y `string` para todo). Cada vez que veas el mismo par de parámetros viajando junto por varias funciones (monto y moneda, inicio y fin), sospecha que falta un value object.

#### ¿Entidad o value object? Depende del contexto

La pregunta no tiene una respuesta universal. Evans usa la **dirección**:

- Para una tienda por catálogo, la dirección es un value object: sirve para verificar la tarjeta y enviar el paquete; si dos clientes comparten dirección, da igual.
- Para una compañía eléctrica, la dirección (el punto de servicio) es una **entidad**: las líneas y el servicio se instalan en un lugar concreto que tiene identidad propia, independientemente de quién viva ahí.

#### Copiar o compartir

Como los value objects son inmutables, se pueden **compartir** sin riesgo (como el patrón Flyweight de GoF) o **copiar** libremente. Compartir ahorra memoria cuando hay muchos; copiar es mejor en sistemas distribuidos (se envía el valor y vive de forma independiente en el receptor). Lo que nunca debes hacer es compartir un value object **mutable**: un cambio en un lugar aparecería misteriosamente en otro.

#### Asociaciones entre value objects

Evans recomienda evitar asociaciones bidireccionales entre value objects: si parece necesitar una, probablemente uno de ellos debería ser una entidad.

### Servicios de dominio

A veces hay operaciones importantes del dominio que **no pertenecen naturalmente a ninguna entidad ni value object**. Forzarlas dentro de un objeto lo distorsiona: ¿la transferencia de fondos es responsabilidad de la cuenta de origen o de la de destino? Ninguna. En esos casos, la operación se modela como un **SERVICE**: una operación ofrecida como una interfaz independiente, sin estado, nombrada con un **verbo** o actividad del lenguaje ubicuo.

Un buen servicio de dominio tiene tres características:

1. La operación se refiere a un **concepto del dominio** que no es parte natural de una entidad o value object.
2. La **interfaz** se define en términos de otros elementos del modelo.
3. La operación **no tiene estado** (cualquier instancia puede usarse sin importar su historia).

#### Servicios en las distintas capas

Evans distingue tres tipos de servicios, y confundirlos es uno de los errores más frecuentes:

| Tipo | Qué hace | Ejemplo en transferencias |
| --- | --- | --- |
| **De aplicación** | Coordina: recibe la petición, carga objetos, invoca al dominio, guarda, notifica. | `TransferFundsUseCase`: digiere la entrada, llama al servicio de dominio, confirma la transacción, envía la notificación. |
| **De dominio** | Contiene una regla de negocio que involucra a varios objetos. | `FundsTransferService`: aplica las reglas (débito, crédito, límites, comisiones) entre dos cuentas. |
| **De infraestructura** | Ofrece una capacidad técnica. | `EmailNotificationService`: envía correos; no sabe nada de transferencias. |

```ts
// Servicio de dominio: sin estado, con nombre del lenguaje ubicuo
export class FundsTransferService {
  constructor(private readonly dailyLimit: Money) {}
  transfer(from: BankAccount, to: BankAccount, amount: Money, transferredToday: Money) {
    if (transferredToday.add(amount).isGreaterThan(this.dailyLimit)) {
      throw new Error("Supera el límite diario de transferencias");
    }
    from.withdraw(amount);
    to.deposit(amount);
  }
}

export class BankAccount {
  constructor(readonly id: string, private balance: Money) {}
  withdraw(m: Money) {
    if (m.isGreaterThan(this.balance)) throw new Error("Fondos insuficientes");
    this.balance = this.balance.add(m.multiply(-1));
  }
  deposit(m: Money) { this.balance = this.balance.add(m); }
  get currentBalance() { return this.balance; }
}
```

#### El peligro: el modelo anémico

Los servicios deben usarse **con criterio**. Si cada regla termina en un `XxxService` y las entidades se quedan como bolsas de datos con getters y setters, has construido un **modelo de dominio anémico**: parece orientado a objetos pero es un programa procedural con estructuras de datos. Pierdes el encapsulamiento (cualquiera puede poner el saldo en negativo), las reglas se duplican entre servicios y el modelo deja de expresar el dominio.

| Modelo anémico | Modelo rico |
| --- | --- |
| `account.balance = account.balance - amount` desde un servicio | `account.withdraw(amount)` que valida y protege su estado |
| Entidades sin métodos de negocio | Entidades y value objects con comportamiento |
| Servicios gordos que deciden todo | Servicios de dominio solo para lo que no pertenece a ningún objeto |

Regla práctica: antes de crear un servicio, pregúntate si la operación podría ser un método de una entidad o de un value object. Solo si la respuesta es claramente no, crea el servicio.

#### Granularidad

Los servicios de grano medio, sin estado, también ayudan a evitar que el conocimiento del dominio se filtre a la capa de aplicación: si las reglas de una operación compleja quedaran repartidas en el caso de uso, este dejaría de ser delgado.

### Módulos

Los **MÓDULOS** (paquetes) son un elemento de diseño antiguo, pero en DDD tienen un matiz importante: no son solo una forma de organizar el código, sino **parte del modelo**. Cuando ubicas clases en un módulo, le dices al siguiente desarrollador que esas clases van juntas conceptualmente.

- Deben tener **bajo acoplamiento** entre sí y **alta cohesión** interna (los principios de componentes de las sesiones 13 y 14 a escala de paquete).
- Sus **nombres forman parte del lenguaje ubicuo** y deben contar la historia del sistema.
- Deben **evolucionar** con el modelo: si el entendimiento del dominio cambia, los módulos se reorganizan. Evans advierte que los módulos se suelen dejar como están por pereza, aunque el modelo haya cambiado.
- Hay que evitar dividir por **patrones técnicos** dentro del dominio (todas las entidades en una carpeta, todos los value objects en otra, todos los servicios en otra), porque separa lo que está conceptualmente unido.

```
❌ Por tipo técnico                  ✅ Por concepto del dominio
domain/                              domain/
  entities/                            billing/
    Invoice.ts                           invoice.ts
    Customer.ts                          invoice-line.ts
  value-objects/                         tax-policy.ts
    Money.ts                             index.ts
    TaxRate.ts                         customers/
  services/                              customer.ts
    InvoiceService.ts                    credit-limit.ts
                                       shared/
                                         money.ts
```

### Paradigmas de modelado

Al final del capítulo, Evans reconoce que el modelo de objetos es el dominante porque es expresivo y tiene buen soporte de herramientas, pero que a veces partes del dominio se expresan mejor en otros paradigmas (reglas lógicas, flujos de trabajo). Su consejo: no mezcles paradigmas a la ligera; si lo haces, que el lenguaje ubicuo siga uniendo ambas partes. En TypeScript tienes la ventaja de poder combinar objetos con funciones puras: un value object como `Money` puede tener métodos o funciones puras sobre datos inmutables, y ambas formas expresan el modelo.

### Analogía de construcción

En una obra, cada **casa** de un conjunto residencial es una entidad: la casa 14 sigue siendo la casa 14 aunque cambie de dueño, la pinten o le agreguen un piso. Un **ladrillo** es un value object: te da igual cuál de los mil del palé usas, solo importan sus medidas y su resistencia; y si uno no sirve, lo reemplazas por otro igual. Evans usa justamente el ejemplo de los planos de una casa: un tipo de ventana estándar es un value object que puede aparecer cien veces en un mismo plano. El **servicio** es el topógrafo: mide la relación entre dos terrenos, una tarea que no pertenece a ninguno de los dos. Y los **módulos** son la organización de los planos por sistemas (estructura, eléctrico, sanitario), no por tipo de dibujo (todos los cortes juntos, todas las plantas juntas).

### Cuándo usar cada bloque

| Si el concepto… | Modélalo como |
| --- | --- |
| Debe rastrearse a lo largo del tiempo y distinguirse aunque sus atributos coincidan | Entidad |
| Describe algo y solo importa su valor; puede reemplazarse por otro igual | Value object |
| Es una operación importante que involucra a varios objetos y no pertenece a ninguno | Servicio de dominio |
| Coordina una tarea del usuario sin reglas de negocio | Servicio de aplicación (caso de uso) |
| Es una capacidad técnica | Servicio de infraestructura |

### Errores comunes

- **Darle identidad a todo**: tablas con ID para direcciones o montos que no la necesitan, con la complejidad que eso arrastra.
- **Value objects mutables** compartidos entre entidades.
- **Primitivos para conceptos del dominio** (`price: number`, `email: string`) sin validación ni comportamiento.
- **Modelo anémico**: entidades con getters y setters y todo en servicios.
- **Servicios con nombres de sustantivo** que esconden una entidad mal modelada (`CustomerManager`).
- **Módulos por tipo técnico** dentro del dominio.

### Resumen

Las entidades se definen por su identidad, que persiste mientras sus atributos cambian; su diseño gira alrededor de quiénes son. Los value objects se definen por sus atributos, son inmutables, se comparan por valor y concentran comportamiento descriptivo sin efectos secundarios. Los servicios de dominio modelan operaciones del negocio que no pertenecen a ningún objeto, sin estado y con nombres del lenguaje ubicuo, y deben distinguirse de los servicios de aplicación y de infraestructura; abusar de ellos produce un modelo anémico. Los módulos son parte del modelo: se organizan por conceptos del dominio y evolucionan con él.

## Conceptos clave

- **Entidad**: objeto definido por su identidad y su continuidad a lo largo de un ciclo de vida.
- **Identidad de dominio vs. técnica**: lo que distingue al objeto para el negocio frente a la referencia en memoria.
- **Value object**: objeto sin identidad conceptual, definido por sus atributos e inmutable.
- **Obsesión por los primitivos**: usar tipos básicos para conceptos del dominio que merecen su propio tipo.
- **Servicio de dominio**: operación sin estado del lenguaje ubicuo que no pertenece a ninguna entidad o value object.
- **Servicio de aplicación / de infraestructura**: coordinación de una tarea / capacidad técnica genérica.
- **Modelo anémico**: modelo con objetos sin comportamiento y la lógica en servicios procedurales.
- **Módulo**: agrupación de elementos del modelo con significado de dominio, bajo acoplamiento y alta cohesión.

## Preguntas de repaso

1. ¿Qué define a una entidad y por qué la identidad del lenguaje (referencia en memoria) no basta?
   R: Una entidad se define por un hilo de identidad y continuidad que persiste aunque cambien todos sus atributos. La referencia en memoria es identidad técnica y no sobrevive entre representaciones (base de datos, otros sistemas); hace falta una identidad de dominio, como un identificador estable, para saber si dos objetos representan lo mismo.
2. ¿Por qué los value objects deben ser inmutables?
   R: Porque así se pueden compartir y copiar sin riesgo: un cambio no aparecerá inesperadamente en otro lugar que use el mismo valor. Para "modificarlos" se crea uno nuevo, lo que también simplifica razonar sobre ellos y testearlos.
3. ¿Por qué una dirección puede ser value object en un sistema y entidad en otro?
   R: Porque la categoría depende de lo que importa al dominio. En una tienda por catálogo la dirección solo sirve para enviar un paquete y su valor es lo único relevante; en una compañía eléctrica es un punto de servicio con identidad propia, independiente de quién viva ahí.
4. ¿Cuáles son las tres características de un buen servicio de dominio?
   R: La operación se refiere a un concepto del dominio que no pertenece naturalmente a una entidad o value object, su interfaz se define en términos de otros elementos del modelo y no tiene estado.
5. Distingue los servicios de aplicación, dominio e infraestructura con el ejemplo de una transferencia.
   R: El de aplicación coordina (recibe la petición, carga cuentas, llama al servicio de dominio, guarda y notifica); el de dominio aplica las reglas de negocio de la transferencia entre dos cuentas (débito, crédito, límites); el de infraestructura ofrece capacidades técnicas como enviar un correo, sin saber de transferencias.
6. ¿Qué es un modelo anémico y cómo se evita?
   R: Un modelo con entidades que solo tienen datos y getters/setters, y toda la lógica en servicios procedurales. Se evita poniendo las reglas y la protección del estado en las entidades y value objects, y creando servicios de dominio solo para operaciones que no pertenecen a ningún objeto.
7. ¿Por qué no conviene organizar el dominio en carpetas `entities/`, `value-objects/` y `services/`?
   R: Porque separa elementos que están conceptualmente unidos y no comunica nada sobre el dominio. Los módulos deben agruparse por conceptos del negocio, con nombres del lenguaje ubicuo, bajo acoplamiento y alta cohesión.

## Ejercicio

Modela el dominio de un hotel pequeño en TypeScript: value objects `Money`, `DateRange` (con `overlaps` y `nights`), `EmailAddress` (validado) y `GuestName`; entidades `Guest` y `Room` (con identidad propia); y un servicio de dominio `PricingService` que calcule el precio de una estancia según la tarifa de la habitación, las noches y una regla de temporada alta. Organiza los archivos en módulos por concepto (`guests/`, `rooms/`, `pricing/`, `shared/`). **Terminado cuando:** ningún value object tiene setters ni se puede crear en estado inválido (hay tests que lo prueban), dos `Money` iguales son `equals`, dos `Guest` con el mismo nombre pero distinto ID no lo son, el servicio no tiene estado y tiene al menos 4 tests con Vitest, y ninguna carpeta se llama `entities` o `services`.

## Explícalo con tus palabras

Explica con el ejemplo de las casas, los ladrillos y el topógrafo la diferencia entre entidad, value object y servicio de dominio.
