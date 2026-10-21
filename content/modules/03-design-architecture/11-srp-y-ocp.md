---
title: "SOLID I: Principio de responsabilidad única y principio abierto/cerrado"
kind: lesson
hours: 2
sources: Clean Architecture, parte III, introducción (pp. 62–63) | Clean Architecture, cap. 7 "SRP" (pp. 64–69) | Clean Architecture, cap. 8 "OCP" (pp. 70–74)
---

## Objetivo

Entender SRP como "un módulo responde a un solo actor" (no "una clase hace una sola cosa") y OCP como la meta de extender el comportamiento sin modificar lo que ya funciona, organizando las dependencias para proteger las reglas de negocio de los cambios en los detalles.

## Estudio

### Qué son los principios SOLID

Si los paradigmas son los ladrillos, los principios SOLID dicen **cómo ordenar los ladrillos en paredes y habitaciones**: cómo agrupar funciones y datos en clases (o módulos) y cómo conectar esas clases entre sí. No son exclusivos de la orientación a objetos: aplican a cualquier agrupación de funciones y datos, se llame clase o no.

El objetivo de los principios a este nivel (que Martin llama "nivel medio", por encima del código y por debajo de los componentes) es crear estructuras de software que:

- **toleren el cambio**,
- **sean fáciles de entender**, y
- **sean la base de componentes reutilizables** en muchos sistemas.

| Letra | Principio | Idea en una frase |
| --- | --- | --- |
| S | Single Responsibility | Un módulo responde a un solo actor. |
| O | Open-Closed | Extender el comportamiento sin modificar el código existente. |
| L | Liskov Substitution | Las partes intercambiables deben respetar el mismo contrato. |
| I | Interface Segregation | No depender de cosas que no usas. |
| D | Dependency Inversion | Las políticas no dependen de los detalles; ambos dependen de abstracciones. |

Hoy verás S y O; la próxima sesión, L, I y D.

### SRP: el principio peor entendido

El nombre engaña. Al oír "responsabilidad única", casi todos piensan "cada clase o función debe hacer una sola cosa". Ese principio existe y es útil (una **función** debe hacer una sola cosa; lo aplicas al refactorizar funciones grandes en pequeñas), pero **no es el SRP**.

La formulación histórica era "un módulo debe tener una, y solo una, razón para cambiar". ¿Y qué es una razón para cambiar? Los sistemas cambian porque **personas** lo piden. Pero no una persona concreta: un **grupo** de personas que quieren el mismo tipo de cambio. Martin llama a ese grupo un **actor**. De ahí la versión final:

> Un módulo debe ser responsable ante uno, y solo un, actor.

"Módulo" aquí significa, en la mayoría de los casos, un archivo fuente; en general, un conjunto cohesivo de funciones y datos. Y la palabra **cohesivo** es justamente la fuerza que une el código que responde a un mismo actor.

#### Síntoma 1: duplicación accidental

El ejemplo clásico es una clase `Employee` con tres métodos:

- `calculatePay()`: lo define el departamento de contabilidad, que responde al director financiero (CFO).
- `reportHours()`: lo define recursos humanos, que responde al director de operaciones (COO).
- `save()`: lo definen los administradores de base de datos, que responden al director de tecnología (CTO).

Tres actores en una sola clase. Ahora imagina que `calculatePay()` y `reportHours()` comparten una función `regularHours()` para calcular las horas normales (sin horas extra). Un desarrollador cuidadoso la extrajo para no duplicar código. Un día, contabilidad pide cambiar la forma de calcular las horas normales. El desarrollador ve `regularHours()`, la cambia, los tests de nómina pasan, contabilidad valida y se despliega. Nadie se dio cuenta de que `reportHours()` también la usaba: los reportes de recursos humanos empiezan a mostrar números incorrectos y pasan meses hasta que alguien lo descubre.

```
          Employee
   ┌───────────────────────┐
   │ calculatePay()  ◀─── CFO (contabilidad)
   │ reportHours()   ◀─── COO (RR.HH.)
   │ save()          ◀─── CTO (DBA)
   │  └ regularHours() ← compartida por las dos primeras
   └───────────────────────┘
```

La lección incómoda: **no toda duplicación es mala**. Dos fragmentos de código que hoy son idénticos pero que cambian por razones distintas (para actores distintos) no son realmente el mismo código. Unificarlos crea un acoplamiento accidental. Esto se llama **duplicación accidental** o falsa duplicación.

#### Síntoma 2: merges

Si los DBA cambian el esquema de la tabla de empleados y RR.HH. pide un nuevo formato del reporte de horas, dos desarrolladores de dos equipos modifican el mismo archivo a la vez. El resultado es un merge, y los merges siempre tienen riesgo. Cuando un archivo sufre conflictos constantes entre equipos distintos, es una señal fuerte de que mezcla responsabilidades de varios actores.

#### Soluciones

Todas consisten en **mover las funciones a clases distintas**, una por actor.

**Opción A: separar datos y funciones.** Una estructura de datos sin métodos (`EmployeeData`) y tres clases que la usan: `PayCalculator`, `HourReporter`, `EmployeeSaver`. Ninguna conoce a las demás, así que no hay duplicación accidental posible.

```ts
// Datos sin comportamiento
export interface EmployeeData {
  id: string;
  hourlyRate: number;
  hoursWorked: number[]; // por día
}

// Actor: contabilidad (CFO)
export class PayCalculator {
  private regularHours(d: EmployeeData) {           // su propia versión
    return d.hoursWorked.reduce((s, h) => s + Math.min(h, 8), 0);
  }
  calculatePay(d: EmployeeData) {
    const overtime = d.hoursWorked.reduce((s, h) => s + Math.max(h - 8, 0), 0);
    return this.regularHours(d) * d.hourlyRate + overtime * d.hourlyRate * 1.5;
  }
}

// Actor: recursos humanos (COO)
export class HourReporter {
  private regularHours(d: EmployeeData) {           // puede divergir sin afectar a nómina
    return d.hoursWorked.filter((h) => h > 0).length * 8;
  }
  reportHours(d: EmployeeData) {
    return `Empleado ${d.id}: ${this.regularHours(d)} h normales`;
  }
}

// Actor: DBA (CTO)
export interface EmployeeRepository { save(d: EmployeeData): Promise<void> }
```

**Opción B: una fachada.** El inconveniente de la opción A es que hay que instanciar y seguir la pista a tres clases. Puedes agregar una `EmployeeFacade` con muy poco código que delega en las tres. La fachada es responsable de crear las clases y repartir el trabajo.

**Opción C: dejar lo más importante en la clase de datos.** Algunos prefieren mantener la regla de negocio más importante (el cálculo de pago) en la clase `Employee` junto a los datos, y usarla como fachada para las funciones menores.

```
           EmployeeFacade
          ┌──────┼──────┐
          ▼      ▼      ▼
  PayCalculator HourReporter EmployeeSaver
          └──────┼──────┘
                 ▼
            EmployeeData
```

Puede parecer que esta solución produce clases con un solo método. No es así: cada clase tendrá muchos métodos privados que solo le interesan a ella. Cada una es un **ámbito** (scope) propio, y lo que pasa dentro es invisible para las demás.

#### SRP a distintos niveles

El SRP trata de funciones y clases, pero reaparece en dos niveles más:

- En **componentes** se convierte en el *Common Closure Principle* (sesión 14): agrupa lo que cambia por las mismas razones y al mismo tiempo.
- En **arquitectura** se convierte en el *Axis of Change* que define los límites arquitectónicos (sesiones 30–31).

#### Cómo detectar violaciones del SRP en tu código

| Señal | Pregunta que debes hacerte |
| --- | --- |
| La clase tiene métodos que piden distintas áreas del negocio. | ¿Quién pidió cada método? ¿Responden al mismo jefe? |
| El archivo tiene conflictos de merge frecuentes entre equipos distintos. | ¿Dos equipos cambian este archivo por razones distintas? |
| Un cambio en una regla rompe un reporte que "no tenía nada que ver". | ¿Hay una función compartida entre actores distintos? |
| El nombre de la clase es genérico (`Manager`, `Helper`, `Utils`, `Service` a secas). | ¿Qué actor es el dueño de esta clase? |

### OCP: abierto a extensión, cerrado a modificación

Bertrand Meyer lo formuló en 1988: un artefacto de software debe estar **abierto a la extensión pero cerrado a la modificación**. Es decir, deberías poder ampliar su comportamiento sin tener que modificarlo.

Martin argumenta que esta es **la razón más fundamental por la que estudiamos arquitectura**: si extensiones simples de los requisitos fuerzan cambios masivos en el software, los arquitectos han fracasado. Y aunque se suele explicar a nivel de clases, el OCP cobra todavía más sentido a nivel de componentes.

#### Un experimento mental

Tienes un sistema que muestra un resumen financiero en una página web: los datos se pueden desplazar y los números negativos aparecen en rojo. Te piden lo mismo como reporte impreso en una impresora en blanco y negro: paginado, con encabezados y pies de página, y con los negativos entre paréntesis.

Hay que escribir código nuevo, claro. La pregunta es **cuánto código viejo hay que cambiar**. Una buena arquitectura lo reduce al mínimo posible. ¿Cómo?

1. **Separar lo que cambia por razones distintas (SRP).** Generar el reporte implica dos responsabilidades: **calcular** los datos reportables y **presentarlos** en un formato concreto (web o impresión).
2. **Organizar las dependencias (DIP)** para que los cambios en una responsabilidad no provoquen cambios en la otra.

```
   ┌──────────────┐     ┌─────────────────────────┐     ┌──────────────┐
   │ Controller   │────▶│ Interactor               │◀────│ Database     │
   │ (web/print)  │     │ (reglas: calcula datos)  │     │ (mapper)     │
   └──────┬───────┘     └─────────────────────────┘     └──────────────┘
          │                         ▲
          ▼                         │
   ┌──────────────┐                 │
   │ Presenters   │─────────────────┘
   │ (web, print) │
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │ Views        │
   └──────────────┘
   Las flechas apuntan hacia lo que queremos proteger.
```

Cada límite entre componentes se cruza **en una sola dirección**. La regla es:

> Si el componente A debe protegerse de los cambios en el componente B, entonces B debe depender de A.

Queremos proteger al controlador de los cambios en los presentadores, a los presentadores de los cambios en las vistas, y al **interactor** (donde viven las reglas de negocio) de los cambios en **todo lo demás**. El interactor es el que mejor cumple el OCP porque contiene las políticas de más alto nivel; las vistas son lo menos protegido porque son el concepto de más bajo nivel. Se crea así una **jerarquía de protección** basada en el nivel.

#### Interfaces para dirigir las dependencias

En el diseño de Martin aparecen varias interfaces que a primera vista parecen exceso de complejidad. Cada una tiene un propósito concreto:

- Una interfaz de **gateway** entre el interactor y el mapper de la base de datos existe para **invertir** la dependencia que, de otro modo, iría del interactor hacia la base de datos.
- Las interfaces de **presentador y vista** hacen lo mismo hacia la presentación.
- Una interfaz de **requester** sirve para otra cosa: **ocultar** los detalles internos del interactor al controlador, evitando dependencias transitivas (depender de cosas que no usas directamente).

#### En TypeScript

```ts
// ── Reglas de negocio (protegidas) ─────────────────────────────
export interface FinancialEntry { account: string; amount: number }
export interface ReportLine { account: string; amount: number; isNegative: boolean }

export interface FinancialDataGateway { entriesFor(month: string): Promise<FinancialEntry[]> }
export interface ReportPresenter<T> { present(lines: ReportLine[]): T }

export class FinancialReportGenerator {
  constructor(private readonly data: FinancialDataGateway) {}
  async generate<T>(month: string, presenter: ReportPresenter<T>): Promise<T> {
    const entries = await this.data.entriesFor(month);
    const lines = entries.map((e) => ({ ...e, isNegative: e.amount < 0 }));
    return presenter.present(lines);
  }
}

// ── Presentación (extensiones: se AGREGAN sin modificar lo anterior) ──
export class WebPresenter implements ReportPresenter<string> {
  present(lines: ReportLine[]) {
    return lines.map((l) =>
      `<tr><td>${l.account}</td><td class="${l.isNegative ? "red" : ""}">${l.amount}</td></tr>`,
    ).join("");
  }
}

export class PrintPresenter implements ReportPresenter<string[]> {
  constructor(private readonly linesPerPage = 40) {}
  present(lines: ReportLine[]) {
    const fmt = (l: ReportLine) =>
      `${l.account.padEnd(20)}${l.isNegative ? `(${Math.abs(l.amount)})` : l.amount}`;
    const pages: string[] = [];
    for (let i = 0; i < lines.length; i += this.linesPerPage) {
      pages.push(["CUENTA              MONTO", ...lines.slice(i, i + this.linesPerPage).map(fmt),
                  `— página ${pages.length + 1} —`].join("\n"));
    }
    return pages;
  }
}
```

Agregar el reporte impreso fue **agregar** `PrintPresenter`; el generador no se modificó. Si mañana piden un CSV, se agrega otro presentador.

#### OCP no significa "nunca modificar nada"

Es imposible cerrar un módulo a **todo** tipo de cambio. Siempre habrá cambios para los que tu diseño no está preparado. El OCP es una **dirección**: protege del cambio aquello que más valor tiene y que menos debería cambiar (las reglas de negocio), frente a lo que más cambia (presentación, formatos, integraciones). Elegir contra qué cambios proteger es una decisión que debe basarse en lo que ha cambiado en el pasado y en lo que es probable que cambie.

#### OCP a pequeña escala: registros en lugar de condicionales

En el día a día, la forma más frecuente de aplicar OCP es reemplazar un condicional que crece por un **registro** al que se agregan entradas. Compara:

```ts
// Cerrado a la extensión: cada formato nuevo modifica la función
function exportReport(format: string, lines: ReportLine[]) {
  if (format === "web") return new WebPresenter().present(lines);
  if (format === "print") return new PrintPresenter().present(lines);
  throw new Error("Formato desconocido");
}

// Abierto a la extensión: los formatos se registran desde fuera
const presenters = new Map<string, ReportPresenter<unknown>>();
export const registerPresenter = (name: string, p: ReportPresenter<unknown>) =>
  presenters.set(name, p);
export function exportReportOpen(format: string, lines: ReportLine[]) {
  const p = presenters.get(format);
  if (!p) throw new Error(`Formato desconocido: ${format}`);
  return p.present(lines);
}
```

La segunda versión no necesita cambiar cuando aparece un formato nuevo: el módulo del formato se registra al arrancar. Es la misma idea de los plugins de UNIX que viste en la sesión 2 y del factory method con registro de la sesión 4. Pero recuerda el costo: el registro hace menos visible qué formatos existen. Si solo hay dos formatos y no cambian desde hace un año, el `if` es perfectamente aceptable.

### SRP y OCP trabajan juntos

Fíjate en que el OCP del ejemplo empieza aplicando el SRP: primero separas lo que cambia por razones distintas, y solo entonces puedes organizar las dependencias para que una parte se extienda sin modificar la otra. Sin SRP, no hay forma de cumplir el OCP, porque todo cambia junto.

### Analogía de construcción

**SRP**: en un edificio, la instalación eléctrica, la de agua y la de gas van por ductos separados aunque recorran las mismas paredes. Responden a "actores" distintos (el electricista, el plomero, el gasista, cada uno con su normativa). Si las metieras en un mismo ducto "para no duplicar", una reparación eléctrica podría dañar una tubería de gas. **OCP**: un edificio bien diseñado deja tomas y puntos de conexión para que puedas **agregar** un aire acondicionado sin romper la losa; la estructura queda cerrada a modificación, abierta a extensión.

### Cuándo aplicar y cuándo no

| Aplica SRP/OCP con fuerza cuando… | Relájalo cuando… |
| --- | --- |
| Varios equipos o áreas del negocio cambian el mismo código. | Es un script o prototipo de vida corta. |
| Hay una parte claramente más valiosa (reglas) y otra más volátil (formatos, integraciones). | No sabes todavía qué va a cambiar: no inventes puntos de extensión. |
| Ya sufriste dos o tres veces el mismo tipo de cambio. | La "extensión" nunca ha ocurrido y nadie la ha pedido. |

### Errores comunes

- **Leer SRP como "una clase, un método".** El criterio es el actor, no el número de métodos.
- **Eliminar toda duplicación.** Unificar código que responde a actores distintos crea acoplamiento accidental.
- **Clases `Utils` y `Manager`.** Suelen mezclar actores; dales un dueño.
- **Puntos de extensión especulativos.** Interfaces y plugins "por si algún día" son costos sin beneficio.
- **Creer que el OCP prohíbe modificar.** Prohíbe que extensiones previsibles obliguen a modificar lo protegido.

### Resumen

El SRP dice que un módulo responde a un solo actor; sus síntomas son la duplicación accidental y los merges conflictivos, y se resuelve separando el código por actor (con datos compartidos, fachadas o la regla principal junto a los datos). El OCP busca extender sin modificar: primero se separan responsabilidades (SRP) y luego se orientan las dependencias para que los componentes de más alto nivel (las reglas de negocio) queden protegidos de los cambios en los de bajo nivel (presentación, base de datos).

## Conceptos clave

- **Actor**: grupo de personas que piden el mismo tipo de cambio en el sistema.
- **SRP**: un módulo debe ser responsable ante uno, y solo un, actor.
- **Cohesión**: fuerza que mantiene unido el código que responde a un mismo actor y cambia por las mismas razones.
- **Duplicación accidental**: código idéntico hoy pero que cambia por razones distintas; unificarlo acopla a actores diferentes.
- **OCP**: un artefacto debe estar abierto a la extensión y cerrado a la modificación.
- **Jerarquía de protección**: organización de componentes en la que los de más alto nivel quedan protegidos de los cambios en los de más bajo nivel.
- **Dependencia transitiva**: depender indirectamente de cosas que no usas directamente.

## Preguntas de repaso

1. ¿Por qué "una clase debe hacer una sola cosa" no es el SRP?
   R: Porque ese es un principio para funciones (una función hace una sola cosa). El SRP habla de actores: un módulo debe ser responsable ante un solo grupo de personas que piden cambios, de modo que los cambios pedidos por un grupo no afecten a otro.
2. Explica el problema de `regularHours()` en el ejemplo de `Employee`.
   R: Contabilidad y RR.HH. compartían una función para calcular horas normales. Un cambio pedido por contabilidad modificó esa función y rompió silenciosamente los reportes de RR.HH., porque ambos actores estaban acoplados a través de un código que parecía duplicado pero respondía a necesidades distintas.
3. ¿Cuáles son las soluciones al problema de `Employee`?
   R: Separar datos y funciones en clases por actor que comparten una estructura de datos; agregar una fachada que delega en esas clases; o dejar la regla principal junto a los datos y usar esa clase como fachada para las funciones menores.
4. Según Clean Architecture, ¿cómo se logra el OCP a nivel arquitectónico?
   R: Separando lo que cambia por razones distintas (SRP) y organizando las dependencias entre componentes (DIP) para que los límites se crucen en una sola dirección, apuntando hacia los componentes que se quieren proteger, con las reglas de negocio en la posición más protegida.
5. Completa y explica: "Si A debe protegerse de los cambios en B, entonces…".
   R: …B debe depender de A. Así los cambios en B no obligan a recompilar ni modificar A, porque A no menciona nada de B en su código fuente.
6. ¿Por qué no se puede cerrar un módulo a todos los cambios?
   R: Porque siempre habrá cambios imprevistos. El OCP es una dirección estratégica: se elige proteger lo más valioso y estable frente a los cambios más probables, basándose en la experiencia y en lo que el negocio suele pedir.

## Ejercicio

Toma esta clase y refactorízala: `class Invoice { calculateTotal(); calculateTaxes(); renderPdf(); renderEmailHtml(); saveToDb(); sendToAccountingApi() }`. Identifica los actores de cada método (escríbelos en un comentario), sepáralos por actor y aplica OCP para que agregar un nuevo formato de salida (por ejemplo, XML para facturación electrónica) solo requiera **agregar** una clase. **Terminado cuando:** el cálculo de totales e impuestos no importa nada de PDF, HTML, base de datos ni APIs; agregaste `XmlInvoicePresenter` sin modificar ningún archivo existente salvo el composition root; y hay tests con Vitest para el cálculo y para al menos dos presentadores.

## Explícalo con tus palabras

Explica a un compañero, con el ejemplo de los ductos de electricidad, agua y gas, por qué dos funciones idénticas pueden no ser realmente duplicación.
