---
title: "DDD I: conocimiento del dominio, lenguaje ubicuo y aislar el dominio en capas"
kind: lesson
hours: 3
sources: Domain-Driven Design (Evans), prefacio y parte I, caps. 1–3 (pp. 7–48) | Domain-Driven Design (Evans), parte II, introducción y cap. 4 "Isolating the Domain" (pp. 49–59) | Domain-Driven Design (Evans), cap. 5, "Associations" (pp. 60–64)
links: Martin Fowler, "Ubiquitous Language" | https://martinfowler.com/bliki/UbiquitousLanguage.html
---

## Objetivo

Entender el punto de partida de Domain-Driven Design: el corazón del software es el **dominio** del negocio; el modelo se construye con los expertos "triturando conocimiento", se expresa en un **lenguaje ubicuo** y está **ligado al código** (model-driven design). Y, para que ese modelo pueda vivir en el código, aprender a **aislar el dominio** con una arquitectura en capas, a reconocer cuándo el antipatrón **Smart UI** es razonable y a simplificar las **asociaciones**.

## Estudio

### El problema que ataca DDD

Eric Evans señala dos caminos que terminan en el mismo lugar. Por un lado, equipos que producen modelos de análisis detallados que **luego no sirven para escribir el código**; por otro, equipos que escriben código sin ningún modelo. En ambos casos el software funciona, pero es difícil de entender, inflado y caro de mantener, porque el código no refleja el conocimiento del negocio.

El subtítulo del libro lo resume: *abordar la complejidad en el corazón del software*. En muchos sistemas la complejidad más difícil no es técnica, sino del **dominio**: las reglas de un seguro, de la logística marítima, de una clínica. Si el equipo no entiende el dominio y no lo plasma en el diseño, ninguna tecnología lo salva.

### Qué es un modelo

Un **modelo** es una simplificación: una interpretación de la realidad que abstrae lo relevante para un problema e ignora el resto. Un mapa del metro no muestra calles ni distancias reales, y justamente por eso sirve para moverse en metro. El modelo del dominio no es un diagrama concreto: es **el conjunto de conceptos que comparten las personas del proyecto**, con sus términos y relaciones. Diagramas, documentos y código son formas de expresarlo.

En DDD el modelo cumple tres funciones a la vez: **da forma al diseño** (entender el modelo permite entender el código), es la **columna vertebral del lenguaje** del equipo y es **conocimiento destilado**, la forma acordada de distinguir lo importante.

### Triturar conocimiento (knowledge crunching)

Evans cuenta cómo diseñó una herramienta para circuitos impresos sin saber nada de electrónica. Pedirles a los ingenieros "díganme qué debe hacer el software" fracasó. Lo que funcionó fue esto:

- Notó que todos los reportes que pedían hablaban de **"nets"** (conductores que conectan pines). Ese fue el primer concepto del modelo.
- **Dibujó escenarios informales** mientras conversaban ("una señal llega a una net y se propaga a los pines conectados"), y los expertos lo corregían ("no son chips, son *instancias de componente*"). En ese ida y vuelta ambos aprendían.
- Se enfocaron en **una sola funcionalidad** y dejaron fuera los conceptos que no hacían falta para ella.
- Muy pronto escribió un **prototipo mínimo** guiado por tests, sin base de datos ni interfaz, con objetos del modelo. Ver el modelo funcionando cambió la conversación.

Ese proceso de procesar información con los expertos, probar modelos, descartar los que no funcionan y quedarse con las abstracciones útiles es el **knowledge crunching**. Sus ingredientes:

| Ingrediente | Qué significa |
| --- | --- |
| **Ligar modelo e implementación** pronto | Un prototipo crudo que conecte modelo y código, mantenido en cada iteración. |
| **Cultivar un lenguaje basado en el modelo** | Las frases mal formadas revelan errores del modelo. |
| **Modelo rico en conocimiento** | Los objetos tienen comportamiento y hacen cumplir reglas; no son un esquema de datos. |
| **Destilar** | Se agregan conceptos y, con igual importancia, **se eliminan** los que dejaron de servir. |

El aprendizaje no termina: la gente rota y la documentación envejece, pero un modelo que vive en el código y en el lenguaje del equipo conserva el conocimiento. Los mejores avances del modelo suelen llegar tarde, cuando el equipo entiende el dominio lo bastante como para ver una forma más profunda de expresarlo.

#### Conocimiento implícito que se vuelve explícito

En reservas de carga marítima se acepta un 10 % de **sobreventa** de la capacidad, porque siempre hay cancelaciones. La primera versión esconde la regla en una línea:

```ts
// Regla escondida: nadie que lea esto sabe que existe una "política de sobreventa"
function makeBooking(cargo: Cargo, voyage: Voyage): number {
  if (voyage.bookedCargoSize() + cargo.size > voyage.capacity * 1.1) return -1;
  return voyage.addCargo(cargo);
}
```

El modelo mejora cuando el concepto recibe un nombre que los expertos reconocen:

```ts
export interface OverbookingPolicy {
  isAllowed(cargo: Cargo, voyage: Voyage): boolean;
}

export const tenPercentOverbooking: OverbookingPolicy = {
  isAllowed: (cargo, voyage) => voyage.bookedCargoSize() + cargo.size <= voyage.capacity * 1.1,
};

export function makeBookingExplicit(cargo: Cargo, voyage: Voyage, policy: OverbookingPolicy) {
  if (!policy.isAllowed(cargo, voyage)) return { ok: false as const, reason: "excede la política de sobreventa" };
  return { ok: true as const, confirmation: voyage.addCargo(cargo) };
}

interface Cargo { size: number }
interface Voyage { capacity: number; bookedCargoSize(): number; addCargo(c: Cargo): number }
```

Técnicamente es un **Strategy** (sesión 8). DDD no inventa técnicas de programación nuevas: te dice **cuándo y por qué** usarlas, y que el nombre debe salir del dominio.

### El lenguaje ubicuo

Sin un lenguaje común, el proyecto se llena de traducciones: los expertos hablan su jerga, los desarrolladores la suya, y unos pocos "bilingües" traducen de forma imprecisa. La traducción oculta malentendidos y produce código que no encaja. Peor aún, distintas personas usan el mismo término de forma diferente **sin darse cuenta**.

La solución es un **lenguaje ubicuo** (ubiquitous language): un lenguaje basado en el modelo que el equipo usa **en todas partes**: en las conversaciones, en los diagramas y documentos, en el código (clases, métodos, módulos, eventos) y en los tests. La regla clave: **un cambio en el lenguaje es un cambio en el modelo**. Si el equipo descubre que lo que llamaba "envío" son en realidad dos cosas ("carga" y "viaje"), el código se refactoriza para reflejarlo.

#### Hablar el modelo en voz alta

Evans propone **decir en voz alta** frases que describan escenarios con los términos del modelo. Las frases torpes revelan problemas. Compara tres descripciones del mismo cambio:

1. "Si cambiamos el puerto de destino, hay que borrar el objeto de ruta y crear uno nuevo con los IDs de los segmentos." *(Habla de la implementación.)*
2. "Si cambiamos el destino, hay que recalcular las ubicaciones intermedias." *(Mejor, pero vago.)*
3. "Si cambia algún atributo de la **especificación de ruta**, se descarta el **itinerario** y el **servicio de rutas** genera uno nuevo." *(Lenguaje del modelo: preciso y comprensible para el experto.)*

En la tercera frase cada sustantivo es un concepto del dominio y cada verbo, una operación del modelo.

El lenguaje ubicuo supone **un solo modelo** en juego. En sistemas grandes eso no es posible ("cliente" no significa lo mismo para ventas que para soporte), y Evans lo resuelve con los **bounded contexts** (sesión 27): el lenguaje es ubicuo **dentro** de un contexto. En cuanto a los documentos, Evans prefiere **diagramas simples e informales** con un propósito concreto, acompañados de texto: el modelo completo está en el código, y los documentos lo complementan sin repetirlo.

### Model-Driven Design y modeladores que programan

Evans narra un proyecto donde unos analistas pasaron meses construyendo un modelo de clases enorme y correcto que los desarrolladores no pudieron implementar. Hicieron entonces un diseño propio, con algunos nombres prestados. Resultado: un modelo que no servía y un código sin modelo. El problema era separar el **modelo de análisis** (para entender) del **diseño** (para construir): el conocimiento del análisis se pierde al diseñar, y lo que se aprende al programar nunca vuelve al modelo.

**Model-Driven Design** propone **un único modelo** para ambos propósitos:

- Una parte del sistema refleja el modelo de forma muy literal, para que la correspondencia sea obvia.
- Si el modelo no se puede implementar de forma natural, el modelo cambia.
- El código usa el mismo lenguaje, así que **un cambio en el código puede ser un cambio en el modelo**, y viceversa.

Esto exige un paradigma que permita expresar el modelo en código; la orientación a objetos, con reglas dentro de los objetos, lo hace de forma natural.

La consecuencia organizativa son los **hands-on modelers**: si quienes modelan no programan, las intenciones del modelo se pierden al transmitirlas, el modelador no se entera de lo que es impracticable y los programadores, que no se sienten dueños del modelo, lo erosionan con cada cambio. Por eso **toda persona técnica que contribuye al modelo debe tocar el código**, y todo desarrollador debe participar en las conversaciones con los expertos.

### Event storming: knowledge crunching en taller

Desde el libro (2003) la comunidad DDD creó técnicas de taller. La más conocida es el **event storming**: expertos y desarrolladores escriben en notas los **eventos del dominio** en pasado ("Cita agendada", "Vacuna aplicada") y los ordenan en una línea de tiempo; luego agregan los **comandos** que los provocan, los **actores**, las **políticas** que reaccionan ("cuando se aplica una vacuna con refuerzo, programar recordatorio") y los puntos calientes donde nadie está de acuerdo.

```
 [Agendar cita] ──▶ (Cita agendada) ──▶ ⟨política: confirmar por WhatsApp⟩ ──▶ (Confirmación enviada)
   actor: recepcionista                       │
                                              ▼
                              ⚠ ¿Quién confirma si el cliente no responde?
```

Funciona porque cualquier experto sabe contestar "¿qué cosas importantes pasan en tu negocio?", la línea de tiempo saca a la luz huecos y contradicciones, las palabras de las notas son el primer borrador del lenguaje ubicuo, y las zonas donde cambia el vocabulario ("cita" para recepción, "consulta" para el veterinario) señalan **bounded contexts** distintos.

### Aislar el dominio

Ahora la pregunta práctica: si el modelo debe vivir en el código, ¿dónde vive? Para que un usuario elija el destino de una carga, el programa dibuja un control, consulta la base de datos, valida la entrada, asocia la ciudad a la carga y guarda. **Solo una pequeña parte** de ese código tiene que ver con el transporte, pero es la que más importa.

Cuando el código del dominio se mezcla con el de interfaz y base de datos, las reglas se vuelven difíciles de ver, un cambio superficial en la pantalla puede alterar la lógica, cambiar una regla obliga a rastrear código técnico y los tests se vuelven incómodos.

#### Arquitectura en capas

La solución habitual son las **capas**, con un principio: **un elemento de una capa solo depende de su misma capa o de capas inferiores**. Evans propone cuatro:

| Capa | Responsabilidad | Qué **no** contiene |
| --- | --- | --- |
| **Interfaz de usuario** | Mostrar información e interpretar comandos (el usuario puede ser otro sistema). | Reglas de negocio. |
| **Aplicación** | Define las tareas del software y **coordina** a los objetos del dominio. Es **delgada**; puede guardar el progreso de una tarea. | Reglas ni estado del negocio. |
| **Dominio** | Conceptos, estado y reglas del negocio. **El corazón del software.** | Persistencia, interfaz, red. |
| **Infraestructura** | Capacidades técnicas: persistencia, mensajería, envío de correo. | Conocimiento del dominio. |

```
┌────────────────────────────────────────────┐
│ Interfaz de usuario  (HTTP, CLI, UI)        │
├────────────────────────────────────────────┤
│ Aplicación  (casos de uso: coordina)        │
├────────────────────────────────────────────┤
│ Dominio  (entidades, value objects, reglas) │  ← el corazón
├────────────────────────────────────────────┤
│ Infraestructura  (BD, mensajería, email)    │
└────────────────────────────────────────────┘
```

Algunos proyectos funden interfaz y aplicación; otros tienen varias capas de infraestructura. Lo que hace posible el Model-Driven Design es **separar la capa de dominio**: libres de mostrarse, guardarse o gestionar tareas, los objetos del dominio pueden dedicarse a expresar el modelo.

#### Ejemplo: transferencia bancaria por capas

```ts
// ── Dominio ─────────────────────────────────────────────
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

export interface AccountRepository {          // la implementa la infraestructura
  byId(id: string): Promise<Account>;
  saveAll(accounts: Account[]): Promise<void>; // dentro de una transacción
}

// ── Aplicación ──────────────────────────────────────────
export class TransferFunds {
  constructor(private readonly accounts: AccountRepository) {}
  async execute(cmd: { from: string; to: string; amount: number }) {
    const [from, to] = await Promise.all([this.accounts.byId(cmd.from), this.accounts.byId(cmd.to)]);
    from.debit(cmd.amount);                    // las reglas viven en el dominio
    to.credit(cmd.amount);
    await this.accounts.saveAll([from, to]);   // coordina, no decide
    return { fromBalance: from.currentBalance };
  }
}

// ── Interfaz (HTTP) ─────────────────────────────────────
// app.post("/transfers", async (req, res) => {
//   try { res.json(await transferFunds.execute(req.body)); }
//   catch (e) { res.status(e instanceof InsufficientFunds ? 422 : 400).json({ error: String(e) }); }
// });
```

Fíjate en lo que **no** hace cada capa: el controlador no calcula saldos, el caso de uso no decide si hay fondos y la cuenta no sabe nada de SQL ni de HTTP.

#### Cómo se relacionan las capas

- **Hacia abajo**: las capas superiores llaman directamente a las interfaces públicas de las inferiores.
- **Hacia arriba**: cuando una capa inferior necesita avisar a una superior, usa mecanismos indirectos como **callbacks u Observer** (sesión 9).
- **Infraestructura como servicios**: la aplicación sabe **cuándo** enviar un mensaje; la infraestructura sabe **cómo**.

Con DIP (sesión 12) se da un paso más: el dominio define las **interfaces** que necesita (`AccountRepository`) y la infraestructura las implementa. El dominio deja de depender de nada técnico. Así se llega a la arquitectura hexagonal y a Clean Architecture (sesiones 30–33), que son, en buena medida, las capas de Evans con las dependencias invertidas hacia el dominio.

```
Clásica                 Con DIP
Aplicación              Aplicación
   │                       │
   ▼                       ▼
Dominio                 Dominio  ◀── implementa ── Infraestructura
   │                    (define AccountRepository)
   ▼
Infraestructura
```

#### Frameworks con criterio

Los mejores frameworks resuelven lo técnico y te dejan expresar el modelo; los peores te obligan a heredar de sus clases y a llenar el dominio de anotaciones. En las primeras aplicaciones J2EE, implementar cada objeto del dominio como "entity bean" hundió el rendimiento y la velocidad del equipo. La lección vigente: **no uses todas las funciones de un framework porque existan**. En TypeScript, que tus entidades no hereden de la clase base del ORM ni lleven decoradores del framework web; deja el mapeo a la infraestructura.

### El antipatrón Smart UI

La alternativa opuesta es **Smart UI**: toda la lógica en la interfaz, pantalla por pantalla, con una base de datos relacional compartida. Evans la llama antipatrón en el contexto de DDD, pero reconoce sus ventajas:

| Ventajas | Desventajas |
| --- | --- |
| Productividad inmediata en aplicaciones simples. | Sin abstracción del negocio: las reglas se duplican en cada pantalla. |
| Desarrolladores con poca experiencia pueden trabajar así. | Integrar con otras aplicaciones solo es posible a través de la base de datos. |
| Cada pantalla es independiente. | La complejidad te sobrepasa rápido y **no hay forma elegante de enriquecer el comportamiento**. |

Si el proyecto es simple, va a seguir siéndolo y el equipo no sabe modelar, Smart UI puede ser la mejor decisión. Pero **es casi irreversible**: no se migra gradualmente de Smart UI a un dominio rico, hay que reescribir. Para un panel interno sencillo puede estar bien; para el núcleo de un negocio complejo, es una trampa.

### Asociaciones: simplificar el modelo

En el mundo real abundan las relaciones muchos-a-muchos y bidireccionales; copiarlas tal cual al código produce una telaraña. Evans propone tres formas de simplificarlas:

1. **Imponer una dirección de navegación** cuando el negocio solo necesita recorrerla en un sentido.
2. **Agregar un calificador** que reduzca la multiplicidad: un país tuvo muchos presidentes, pero en un **período** concreto tiene uno.
3. **Eliminar las asociaciones no esenciales** para el comportamiento que modelas.

```ts
// Antes: bidireccional y uno-a-muchos sin calificar
class Country { presidents: Person[] = []; }
class Person { country?: Country; } // ¿de verdad necesitamos ir de la persona al país?

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

Cada asociación que eliminas reduce lo que hay que cargar, mantener consistente y entender. Esta idea reaparece con fuerza en los agregados (sesión 25).

### Guía rápida: ¿en qué capa va esto?

| Pregunta | Si la respuesta es sí… | Ejemplo |
| --- | --- | --- |
| ¿Un experto del negocio reconocería esta regla y podría discutirla? | **Dominio** | "No se prestan más de 3 libros a la vez." |
| ¿Describe los pasos de una tarea sin decidir nada de negocio? | **Aplicación** | "Cargar socio y libro, prestar, guardar, avisar." |
| ¿Traduce entre el mundo exterior y la aplicación? | **Interfaz** | Leer la petición, devolver 409 ante un conflicto. |
| ¿Habla con una tecnología concreta? | **Infraestructura** | `SqlBookRepository`, `SmtpMailer`. |

Casos frontera: validar **formato** (un email con arroba) puede ir en la interfaz o en un value object, pero validar **reglas de negocio** (el socio no tiene multas) siempre va en el dominio; las **transacciones** las abre la aplicación y las implementa la infraestructura; **formatear** fechas y moneda para mostrar es de la interfaz, aunque el cálculo del monto sea del dominio. Si una pieza parece pertenecer a dos capas, casi siempre son dos piezas.

### Analogía de construcción

Unos planos que el maestro de obra consulta a diario valen más que unos renders preciosos que nadie usa en la obra: es la diferencia entre un modelo ligado al código y uno que vive en un documento. El lenguaje ubicuo es el vocabulario común de la obra: cuando el arquitecto dice "viga de amarre", el maestro, el ingeniero y el proveedor entienden lo mismo. Y las capas son un edificio con **fachada** (interfaz), **recepción** (aplicación: organiza, no decide), **oficinas** (dominio: ahí se decide) y **cuarto de máquinas** (infraestructura). Smart UI es el kiosco donde el dueño atiende, decide y lleva la contabilidad en el mismo cuaderno: perfecto para un kiosco, inviable para un banco.

### Errores comunes

- **Traducir en el código**: el negocio dice "póliza" y el código dice `Contract`.
- **Esconder reglas importantes** en condicionales sin nombre.
- **Analistas que no programan y programadores que no hablan con el negocio.**
- **Modelar todo el dominio de una vez** en lugar de empezar por una funcionalidad.
- **Lógica de negocio en controladores** o componentes de interfaz "porque era más rápido".
- **Casos de uso gordos** que deciden en lugar de delegar al dominio.
- **Entidades que heredan del ORM**, acoplando el modelo a la infraestructura.
- **Elegir DDD para un CRUD simple** o Smart UI para un dominio complejo.
- **Asociaciones bidireccionales por defecto** que nadie necesita navegar.

### Resumen

DDD pone el dominio en el centro. El modelo es una simplificación útil que se construye triturando conocimiento con los expertos, mediante escenarios, bocetos, talleres como el event storming y prototipos tempranos. El lenguaje ubicuo se usa en conversaciones, documentos, código y tests, y un cambio en el lenguaje es un cambio en el modelo. Model-Driven Design exige un único modelo para entender y construir, y que quienes modelan programen. Para que ese modelo viva en el código hay que aislarlo: interfaz, aplicación (delgada), dominio (el corazón) e infraestructura, con dependencias hacia abajo o, con DIP, hacia el dominio. Smart UI solo conviene en aplicaciones simples y es casi irreversible, y las asociaciones se simplifican imponiendo dirección, calificándolas o eliminándolas.

## Conceptos clave

- **Dominio**: el área de conocimiento o actividad a la que se aplica el software.
- **Knowledge crunching**: proceso colaborativo de procesar información del dominio, probar modelos y destilar los conceptos útiles.
- **Lenguaje ubicuo**: lenguaje basado en el modelo que el equipo usa en conversaciones, documentos, código y tests.
- **Model-Driven Design**: diseño en el que una parte del software refleja directamente el modelo, con un único modelo para análisis e implementación.
- **Hands-on modeler**: persona que contribuye al modelo y también trabaja con el código.
- **Capa de dominio**: capa con los conceptos, el estado y las reglas del negocio.
- **Capa de aplicación**: capa delgada que coordina tareas y delega en el dominio, sin reglas de negocio.
- **Smart UI**: antipatrón que pone toda la lógica en la interfaz; productivo en lo simple, inviable en dominios complejos.
- **Asociación calificada**: asociación cuya multiplicidad se reduce con un criterio (como un período).

## Preguntas de repaso

1. ¿Por qué fracasan tanto los modelos de análisis separados del código como el código sin modelo?
   R: El modelo de análisis separado no se puede implementar tal cual, así que los desarrolladores hacen un diseño propio y el conocimiento se pierde; el código sin modelo acumula funcionalidad sin estructura. En ambos casos el código no refleja el conocimiento del negocio y se vuelve difícil de entender y mantener.
2. ¿Qué significa que "un cambio en el lenguaje es un cambio en el modelo"?
   R: Que si el equipo descubre que un término está mal, es ambiguo o esconde dos conceptos, no basta con hablar distinto: el modelo y el código deben refactorizarse, porque el lenguaje ubicuo y el código son expresiones del mismo modelo.
3. ¿Qué gana el ejemplo de la sobreventa al convertir la regla en `OverbookingPolicy`?
   R: La regla deja de estar escondida en un cálculo y se vuelve un concepto con nombre que los expertos reconocen; se puede discutir, testear y cambiar por separado, y el código expresa el lenguaje del dominio.
4. ¿Por qué Evans insiste en que los modeladores programen?
   R: Porque si modelo y código los hacen personas distintas, se pierden intenciones al transmitir el modelo, el modelador no recibe retroalimentación sobre lo impracticable y los programadores no se sienten responsables del modelo, que se erosiona con cada cambio.
5. ¿Qué hace y qué no hace la capa de aplicación?
   R: Define las tareas del software y coordina a los objetos del dominio para resolverlas; puede guardar el progreso de una tarea. No contiene reglas ni conocimiento del negocio ni estado que refleje la situación del negocio: eso es del dominio.
6. ¿Cuándo es Smart UI una buena elección y por qué la decisión es casi irreversible?
   R: Cuando la aplicación es simple, va a seguir siéndolo, se necesita productividad inmediata y el equipo no tiene experiencia en modelado. Es casi irreversible porque, sin abstracciones de dominio, no hay forma gradual de migrar a un modelo rico: habría que reescribir.
7. ¿Qué relación hay entre la arquitectura en capas de Evans y Clean Architecture?
   R: Clean Architecture y la hexagonal mantienen la separación de capas pero invierten las dependencias con DIP: el dominio define las interfaces que necesita y la infraestructura las implementa, de modo que el dominio no depende de nada técnico.
8. ¿Cuáles son las tres formas de simplificar asociaciones?
   R: Imponer una dirección de navegación cuando no se necesitan ambas, agregar un calificador que reduzca la multiplicidad (como un período) y eliminar las asociaciones que no son esenciales para el comportamiento modelado.

## Ejercicio

Toma este controlador "Smart UI" de una biblioteca: `app.post("/loans", async (req, res) => { const book = await db.query("SELECT * FROM books WHERE id=$1", [req.body.bookId]); if (book.rows[0].available === 0) return res.status(409).send("No disponible"); const loans = await db.query("SELECT count(*) FROM loans WHERE member_id=$1 AND returned=false", [req.body.memberId]); if (Number(loans.rows[0].count) >= 3) return res.status(409).send("Límite de préstamos"); await db.query("UPDATE books SET available=available-1 WHERE id=$1", [req.body.bookId]); await db.query("INSERT INTO loans(...) VALUES(...)"); res.status(201).send("ok"); })`. (a) Escribe un glosario de 8 a 10 términos del dominio de la biblioteca (definición y sinónimos prohibidos); (b) refactoriza en capas: dominio (`Book`, `Member` con la regla de máximo 3 préstamos, operación de préstamo), aplicación (`LendBook` que coordina), interfaces de repositorio con una implementación en memoria y un controlador que solo traduce HTTP; (c) escribe al menos 5 tests con Vitest cuyos nombres sean frases del lenguaje ubicuo (`"no presta un libro a un socio con 3 préstamos activos"`). **Terminado cuando:** las dos reglas de negocio viven en el dominio y se prueban sin base de datos ni HTTP, el caso de uso se testea con repositorios en memoria, el controlador no tiene ningún `if` de negocio y todos los nombres de clases, métodos y tests están en el glosario.

## Explícalo con tus palabras

Explica por qué un "traductor" entre negocio y desarrolladores es un síntoma de un problema y por qué la recepción de un edificio (la capa de aplicación) no debe tomar decisiones de negocio.
