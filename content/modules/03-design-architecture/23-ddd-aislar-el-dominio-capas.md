---
title: "DDD II: aislar el dominio con una arquitectura en capas y el antipatrón Smart UI"
kind: lesson
hours: 2
sources: Domain-Driven Design (Evans), parte II, introducción y cap. 4 "Isolating the Domain" (pp. 49–59) | Domain-Driven Design (Evans), cap. 5, "Associations" (pp. 60–64)
---

## Objetivo

Comprender por qué el código del dominio debe aislarse del resto (interfaz, aplicación, infraestructura), conocer las cuatro capas conceptuales de DDD y cómo se comunican, saber cuándo el antipatrón **Smart UI** es una elección razonable y aprender a simplificar las **asociaciones** del modelo.

## Estudio

### El dominio es una parte pequeña pero valiosa

Para que el usuario de un sistema de transporte elija el destino de una carga de una lista de ciudades, el programa necesita dibujar el control en pantalla, consultar la base de datos con todas las ciudades, interpretar y validar la entrada, asociar la ciudad a la carga y guardar el cambio. De todo ese código, **solo una pequeña parte** tiene que ver con el dominio del transporte. Pero esa pequeña parte es la que tiene una importancia desproporcionada.

Cuando el código del dominio se mezcla con el de interfaz y base de datos, pasan cosas malas:

- Es muy difícil ver y razonar sobre las reglas de negocio.
- Cambios superficiales en la interfaz pueden alterar la lógica de negocio.
- Cambiar una regla obliga a rastrear código de interfaz, de base de datos y de otros elementos.
- Implementar objetos de dominio coherentes se vuelve impracticable.
- Los tests automáticos se vuelven incómodos.

Evans lo compara con identificar constelaciones en el cielo: necesitas ver los elementos del modelo **como un sistema**, sin perderlos en una masa de objetos técnicos.

### Arquitectura en capas

La industria convergió en las **arquitecturas en capas**. El principio esencial: **un elemento de una capa solo depende de elementos de su misma capa o de capas inferiores**. La comunicación hacia arriba debe hacerse mediante algún mecanismo indirecto. Cada capa se especializa en un aspecto del programa, lo que hace cada diseño más cohesivo y fácil de interpretar.

Evans propone cuatro capas conceptuales:

| Capa | Responsabilidad | Qué **no** contiene |
| --- | --- | --- |
| **Interfaz de usuario (presentación)** | Mostrar información e interpretar los comandos del usuario (que puede ser otro sistema). | Reglas de negocio. |
| **Aplicación** | Define las tareas que el software debe hacer y **coordina** a los objetos del dominio para resolverlas. Es **delgada**: no tiene reglas ni conocimiento del negocio, solo coordina y delega. Puede tener estado sobre el **progreso de una tarea**, no sobre la situación del negocio. | Reglas de negocio ni estado del negocio. |
| **Dominio (modelo)** | Representa los conceptos del negocio, la información sobre la situación del negocio y las reglas. Aquí se controla el estado que refleja el negocio, aunque los detalles técnicos de guardarlo se deleguen a la infraestructura. **Es el corazón del software de negocio.** | Detalles de persistencia, de interfaz o de red. |
| **Infraestructura** | Capacidades técnicas genéricas que soportan a las demás: persistencia, envío de mensajes, dibujo de widgets, etc. | Conocimiento específico del dominio. |

```
┌───────────────────────────────────────────┐
│ Interfaz de usuario  (HTTP, CLI, UI)       │
├───────────────────────────────────────────┤
│ Aplicación  (casos de uso: coordina)       │
├───────────────────────────────────────────┤
│ Dominio  (entidades, value objects, reglas)│  ← el corazón
├───────────────────────────────────────────┤
│ Infraestructura  (BD, mensajería, email)   │
└───────────────────────────────────────────┘
   Dependencias: solo hacia abajo (en la versión clásica)
```

Algunos proyectos no distinguen entre interfaz y aplicación; otros tienen varias capas de infraestructura. Pero lo crucial, lo que hace posible el Model-Driven Design, es **la separación de la capa de dominio**.

La recomendación de Evans, en sus palabras resumidas: divide un programa complejo en capas; desarrolla dentro de cada capa un diseño cohesivo que solo dependa de las capas inferiores; concentra todo el código del modelo del dominio en una capa y aíslalo de la interfaz, la aplicación y la infraestructura. Los objetos de dominio, libres de la responsabilidad de mostrarse, guardarse o gestionar tareas de la aplicación, pueden enfocarse en expresar el modelo.

#### Ejemplo: transferencia bancaria por capas

Evans muestra una transferencia entre cuentas. Así se reparten las responsabilidades en TypeScript:

```ts
// ── Dominio ─────────────────────────────────────────────────
export class InsufficientFunds extends Error {}

export class Account {
  constructor(readonly id: string, private balance: number) {}
  get currentBalance() { return this.balance; }
  debit(amount: number) {
    if (amount <= 0) throw new Error("El monto debe ser positivo");
    if (amount > this.balance) throw new InsufficientFunds(`Saldo insuficiente en ${this.id}`);
    this.balance -= amount;
  }
  credit(amount: number) {
    if (amount <= 0) throw new Error("El monto debe ser positivo");
    this.balance += amount;
  }
}

export function transfer(from: Account, to: Account, amount: number) {
  from.debit(amount);   // la regla vive en el dominio
  to.credit(amount);
}

// Interfaz que el dominio/aplicación necesita (se implementa en infraestructura)
export interface AccountRepository {
  byId(id: string): Promise<Account>;
  saveAll(accounts: Account[]): Promise<void>; // dentro de una transacción
}

// ── Aplicación ─────────────────────────────────────────────
export class TransferFunds {
  constructor(private readonly accounts: AccountRepository) {}
  async execute(cmd: { from: string; to: string; amount: number }) {
    const [from, to] = await Promise.all([this.accounts.byId(cmd.from), this.accounts.byId(cmd.to)]);
    transfer(from, to, cmd.amount);           // coordina, no decide
    await this.accounts.saveAll([from, to]);
    return { fromBalance: from.currentBalance };
  }
}

// ── Interfaz de usuario (HTTP) ─────────────────────────────
// app.post("/transfers", async (req, res) => {
//   try { res.json(await transferFunds.execute(req.body)); }
//   catch (e) { res.status(e instanceof InsufficientFunds ? 422 : 400).json({ error: String(e) }); }
// });
```

Fíjate en lo que **no** hace cada capa: el controlador HTTP no calcula saldos; el caso de uso no decide si hay fondos suficientes; la cuenta no sabe nada de SQL ni de HTTP. Y la transacción de base de datos (que ambas cuentas se guarden juntas o ninguna) es responsabilidad de la infraestructura, invocada por la aplicación.

### Cómo se relacionan las capas

Las capas deben estar **débilmente acopladas**, con dependencias en una sola dirección.

- **Hacia abajo**: las capas superiores usan a las inferiores de forma directa, llamando a sus interfaces públicas.
- **Hacia arriba**: cuando un objeto de una capa inferior necesita comunicarse con una superior (más allá de responder una consulta), se usan mecanismos indirectos como **callbacks u Observer** (sesión 9). El abuelo de estos patrones es **MVC** (sesión 3).
- **Infraestructura como servicios**: la infraestructura normalmente no inicia acciones en el dominio. Ofrece **servicios** que las capas superiores invocan mediante interfaces. Por ejemplo, la aplicación sabe **cuándo** enviar un mensaje, y la infraestructura sabe **cómo** (correo, fax, lo que haya). Esto simplifica la capa de aplicación y la desacopla del mecanismo.

#### Del modelo en capas clásico a la inversión de dependencias

En el diagrama clásico, el dominio está **encima** de la infraestructura y depende de ella. Con lo que aprendiste de DIP (sesión 12), se suele dar un paso más: el dominio define las **interfaces** que necesita (como `AccountRepository`) y la infraestructura las implementa. La dependencia de código se invierte y el dominio ya no depende de nada técnico. Así se llega a la arquitectura hexagonal y a Clean Architecture (sesiones 31–33), que son, en buena medida, la arquitectura en capas de Evans con las dependencias invertidas hacia el dominio.

```
Clásica                          Con DIP
Aplicación                       Aplicación
   │                                │
   ▼                                ▼
Dominio                          Dominio  ◀──── implementa ──── Infraestructura
   │                             (define AccountRepository)
   ▼
Infraestructura
```

### Frameworks arquitectónicos: úsalos con criterio

Algunos frameworks resuelven problemas técnicos complejos pero exigen que el resto del código se escriba de forma muy particular: heredar de sus clases, firmas de métodos obligatorias, anotaciones por todas partes. Los mejores frameworks resuelven lo técnico y dejan que el desarrollador se concentre en expresar el modelo; los peores imponen tantas suposiciones que **limitan el diseño del dominio** o vuelven el desarrollo lento.

Evans recuerda que en las primeras aplicaciones J2EE todos los objetos del dominio se implementaban como "entity beans", lo que hundió el rendimiento y la velocidad de desarrollo. La práctica que se impuso fue usar el framework para objetos de grano grueso e implementar la lógica de negocio con objetos simples del lenguaje.

La lección vigente: **no uses todas las funciones de un framework solo porque existen**. Aplícalo selectivamente a los problemas difíciles. En TypeScript: que tus entidades del dominio no hereden de la clase base del ORM ni lleven decoradores del framework web; mantenlas como clases o funciones simples y deja el mapeo a la infraestructura.

### El antipatrón Smart UI

Existe una alternativa opuesta: **Smart UI** (interfaz inteligente). Pon toda la lógica de negocio en la interfaz de usuario, divide la aplicación en pantallas pequeñas, cada una con sus reglas, y usa una base de datos relacional como repositorio compartido. Usa las herramientas de desarrollo más automatizadas disponibles.

Evans lo llama "antipatrón" en el contexto de DDD, pero es honesto: **tiene ventajas reales** en ciertos contextos.

| Ventajas de Smart UI | Desventajas |
| --- | --- |
| Productividad alta e inmediata para aplicaciones simples. | La integración entre aplicaciones es difícil, salvo a través de la base de datos. |
| Desarrolladores menos experimentados pueden trabajar así con poca formación. | No hay reutilización de comportamiento ni abstracción del problema de negocio; las reglas se duplican en cada pantalla. |
| Los fallos de análisis se superan entregando prototipos y cambiándolos rápido. | Prototipar e iterar tiene un techo: la falta de abstracción limita las opciones de refactorización. |
| Cada pantalla es independiente: cambiar una no afecta a las demás. | La complejidad te sobrepasa rápido; el camino de crecimiento lleva solo a más aplicaciones simples. **No hay forma elegante de enriquecer el comportamiento.** |
| Se aprovechan bien las herramientas visuales y de generación. | |

La conclusión: si el proyecto es simple, va a seguir siéndolo y el equipo no tiene experiencia en modelado, Smart UI puede ser la mejor decisión. Pero **la decisión es casi irreversible**: no puedes migrar gradualmente de Smart UI a un dominio rico; tendrías que reescribir. Y no se pueden mezclar: DDD solo compensa en proyectos con complejidad de negocio real.

Hoy verás variantes de Smart UI en aplicaciones donde los componentes de interfaz llaman directamente a la base de datos o a una API genérica y contienen las reglas. Para un panel interno sencillo, puede estar bien. Para el núcleo de un negocio complejo, es una trampa.

### Asociaciones: simplificar el modelo

El capítulo 5 abre con un tema que conviene ver aquí porque determina cuánto se enreda el dominio: las **asociaciones** entre objetos. En el mundo real hay muchas relaciones muchos-a-muchos y bidireccionales; reproducirlas tal cual en el código produce una telaraña difícil de mantener. Evans propone tres formas de hacer las asociaciones más manejables:

1. **Imponer una dirección de navegación.** Si el negocio solo necesita ir del país a su presidente (y no al revés), modela una asociación unidireccional. Una asociación bidireccional significa que ambos objetos solo pueden entenderse juntos; si no hay necesidad real de navegar en ambos sentidos, elimínala.
2. **Agregar un calificador** que reduzca la multiplicidad. Un país tuvo muchos presidentes, pero en un **período** concreto tiene uno: `presidentFor(period)` convierte una relación uno-a-muchos en una uno-a-uno calificada.
3. **Eliminar asociaciones no esenciales.** Si una relación no es necesaria para el comportamiento que modelas, quítala.

```ts
// Antes: bidireccional y uno-a-muchos sin calificar
class Country { presidents: Person[] = []; }
class Person { country?: Country; } // ¿realmente necesitamos ir de la persona al país?

// Después: unidireccional y calificada por período
interface Period { from: Date; to: Date }
class CountryModel {
  private terms: { period: Period; president: string }[] = [];
  addTerm(period: Period, president: string) { this.terms.push({ period, president }); }
  presidentOn(date: Date): string | undefined {
    return this.terms.find((t) => t.period.from <= date && date <= t.period.to)?.president;
  }
}
```

Cada asociación que eliminas o simplificas reduce lo que hay que cargar de la base de datos, lo que hay que mantener consistente y lo que hay que entender. Esta idea será clave en la próxima sesión (entidades y value objects) y en la de agregados.

### Guía rápida: ¿en qué capa va esto?

Cuando dudes dónde colocar un fragmento de código, hazte estas preguntas en orden. La primera respuesta afirmativa te dice la capa:

| Pregunta | Si la respuesta es sí… | Ejemplo |
| --- | --- | --- |
| ¿Un experto del negocio reconocería esta regla y podría discutirla? | **Dominio** | "No se puede prestar más de 3 libros a la vez." |
| ¿Describe los pasos de una tarea del usuario (buscar, invocar reglas, guardar, notificar) sin decidir nada de negocio? | **Aplicación** | "Cargar socio y libro, prestar, guardar ambos, avisar." |
| ¿Traduce entre el mundo exterior y la aplicación (HTTP, formularios, mensajes entrantes)? | **Interfaz** | Leer el cuerpo de la petición, devolver 409 si hay un conflicto. |
| ¿Habla con una tecnología concreta (SQL, una API de correo, el sistema de archivos)? | **Infraestructura** | `SqlBookRepository`, `SmtpMailer`. |

Algunos casos frontera frecuentes:

- **Validar formato** (que un email tenga arroba, que un campo no venga vacío) suele hacerse en la interfaz o en un value object del dominio; **validar reglas de negocio** (que el socio no tenga multas pendientes) siempre en el dominio.
- **Transacciones**: las abre y cierra la aplicación (sabe qué tarea es atómica), las implementa la infraestructura.
- **Autorización**: "¿puede este usuario hacer esto?" depende de reglas que a menudo son del negocio ("solo el veterinario ve diagnósticos"); la aplicación la invoca antes de ejecutar el caso de uso y la regla en sí puede vivir en el dominio.
- **Formatear para mostrar** (fechas, moneda local) es de la interfaz, aunque el cálculo del monto sea del dominio.

Si una pieza parece pertenecer a dos capas a la vez, casi siempre son dos piezas que conviene separar. Sepáralas, nómbralas con el lenguaje del dominio y escribe un test para cada una.

### Analogía de construcción

Las capas son como un edificio con **fachada, recepción, oficinas y cuarto de máquinas**. La fachada (interfaz) muestra y recibe; la recepción (aplicación) organiza a quién se atiende y en qué orden, pero no toma decisiones de negocio; las oficinas (dominio) son donde se decide; el cuarto de máquinas (infraestructura) provee luz, agua y ascensores sin saber qué hace cada oficina. Smart UI es un local pequeño donde el dueño atiende el mostrador, decide y lleva la contabilidad en el mismo cuaderno: perfecto para un kiosco, inviable para un banco, y muy difícil de convertir en banco sin derribarlo.

### Errores comunes

- **Lógica de negocio en los controladores** o en los componentes de interfaz "porque era más rápido".
- **Casos de uso gordos** que toman decisiones de negocio en lugar de delegarlas al dominio.
- **Entidades que heredan del ORM** o llevan decoradores del framework, acoplando el modelo a la infraestructura.
- **Elegir DDD para un CRUD simple** o Smart UI para un dominio complejo.
- **Asociaciones bidireccionales por defecto** que nadie necesita navegar.
- **Saltarse capas** (la interfaz consulta directamente la base de datos en un sistema con dominio rico).

### Resumen

El código del dominio es una parte pequeña pero crítica del sistema y debe aislarse. La arquitectura en capas de Evans separa interfaz, aplicación (delgada, coordina), dominio (el corazón, con reglas y estado del negocio) e infraestructura (servicios técnicos), con dependencias solo hacia abajo y mecanismos indirectos hacia arriba; aplicando DIP se llega a las arquitecturas hexagonal y limpia. Los frameworks deben usarse con criterio para no limitar el modelo. Smart UI es una alternativa válida solo para aplicaciones simples, y la decisión es casi irreversible. Las asociaciones se simplifican imponiendo dirección, calificándolas o eliminándolas.

## Conceptos clave

- **Capa de dominio**: capa que contiene los conceptos, el estado y las reglas del negocio; el corazón del software.
- **Capa de aplicación**: capa delgada que coordina tareas y delega en el dominio, sin reglas de negocio.
- **Capa de infraestructura**: capacidades técnicas genéricas (persistencia, mensajería, interfaz) que soportan a las demás.
- **Arquitectura en capas**: organización en la que cada capa solo depende de sí misma y de las inferiores.
- **Smart UI**: antipatrón que pone toda la lógica en la interfaz; productivo para aplicaciones simples, inviable para dominios complejos.
- **Framework arquitectónico**: infraestructura que impone cómo escribir el resto del código.
- **Asociación calificada**: asociación cuya multiplicidad se reduce mediante un criterio (como un período).

## Preguntas de repaso

1. ¿Qué problemas aparecen cuando el código del dominio se mezcla con el de interfaz y base de datos?
   R: Es difícil ver y razonar sobre las reglas, los cambios superficiales en la interfaz pueden alterar la lógica, cambiar una regla obliga a rastrear código técnico, no se pueden construir objetos de dominio coherentes y los tests automáticos se vuelven incómodos.
2. ¿Qué hace y qué no hace la capa de aplicación?
   R: Define las tareas del software y coordina a los objetos del dominio para resolverlas; puede guardar el progreso de una tarea. No contiene reglas ni conocimiento del negocio ni estado que refleje la situación del negocio: eso es del dominio.
3. ¿Cómo se comunica una capa inferior con una superior sin romper la regla de dependencias?
   R: Mediante mecanismos indirectos como callbacks, Observer o patrones del estilo MVC, de modo que la capa inferior no conozca directamente a la superior.
4. ¿Cuándo es Smart UI una buena elección y por qué la decisión es casi irreversible?
   R: Cuando la aplicación es simple, va a seguir siéndolo, se necesita productividad inmediata y el equipo no tiene experiencia en modelado. Es casi irreversible porque, sin abstracciones de dominio, no hay forma gradual de migrar a un modelo rico: habría que reescribir.
5. ¿Qué relación hay entre la arquitectura en capas de Evans y Clean Architecture?
   R: Clean Architecture y la hexagonal mantienen la separación de capas pero invierten las dependencias con DIP: el dominio define las interfaces que necesita y la infraestructura las implementa, de modo que el dominio no depende de nada técnico.
6. ¿Cuáles son las tres formas de simplificar asociaciones?
   R: Imponer una dirección de navegación cuando no se necesitan ambas, agregar un calificador que reduzca la multiplicidad (como un período) y eliminar las asociaciones que no son esenciales para el comportamiento modelado.

## Ejercicio

Toma este controlador "Smart UI" y refactorízalo en capas: `app.post("/loans", async (req, res) => { const book = await db.query("SELECT * FROM books WHERE id=$1", [req.body.bookId]); if (book.rows[0].available === 0) return res.status(409).send("No disponible"); const loans = await db.query("SELECT count(*) FROM loans WHERE member_id=$1 AND returned=false", [req.body.memberId]); if (Number(loans.rows[0].count) >= 3) return res.status(409).send("Límite de préstamos"); await db.query("UPDATE books SET available=available-1 WHERE id=$1", [req.body.bookId]); await db.query("INSERT INTO loans(...) VALUES(...)"); res.status(201).send("ok"); })`. Crea: dominio (`Book`, `Member` con la regla de máximo 3 préstamos, función o método de préstamo), aplicación (`LendBook` que coordina), interfaces de repositorio y una implementación en memoria; el controlador solo traduce HTTP. **Terminado cuando:** las dos reglas de negocio están en el dominio y tienen tests con Vitest sin base de datos ni HTTP, el caso de uso se testea con repositorios en memoria y el controlador no contiene ningún `if` de negocio.

## Explícalo con tus palabras

Explica con la analogía de la fachada, la recepción, las oficinas y el cuarto de máquinas qué hace cada capa, y por qué la recepción no debe tomar decisiones de negocio.
