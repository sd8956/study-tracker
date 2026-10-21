---
title: "Clean Architecture II: nivel de las políticas, reglas de negocio, Screaming Architecture y la regla de dependencia"
kind: lesson
hours: 2
sources: Clean Architecture, cap. 19 "Policy and Level" (pp. 149–152) | Clean Architecture, cap. 20 "Business Rules" (pp. 153–157) | Clean Architecture, cap. 21 "Screaming Architecture" (pp. 158–160) | Clean Architecture, cap. 22 "The Clean Architecture" (pp. 161–166)
links: Robert C. Martin, "The Clean Architecture" (blog) | https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html ; Alistair Cockburn, "Hexagonal Architecture" | https://alistair.cockburn.us/hexagonal-architecture/
---

## Objetivo

Entender el **nivel** de una política (su distancia a la entrada y salida), distinguir **entidades** (reglas críticas del negocio) de **casos de uso** (reglas específicas de la aplicación), diseñar una arquitectura que "grite" su propósito y dominar la **regla de dependencia** de Clean Architecture con sus cuatro círculos y el flujo típico de una petición, relacionándola con la arquitectura hexagonal.

## Estudio

### Política y nivel

Un programa es, en el fondo, una **declaración de políticas**: una descripción detallada de cómo se transforman entradas en salidas. En un sistema real esa política se divide en muchas políticas más pequeñas: unas describen cálculos de negocio, otras cómo se formatea un reporte, otras cómo se validan los datos de entrada.

Parte del arte de la arquitectura es separar esas políticas y **reagruparlas según cómo cambian**: las que cambian por las mismas razones y al mismo tiempo están al mismo **nivel** y van juntas (SRP, CCP); las que cambian por razones o en momentos distintos están a niveles distintos y se separan. Los componentes resultantes forman un grafo dirigido acíclico, y **las dependencias deben ir de los componentes de bajo nivel hacia los de alto nivel**.

#### ¿Qué es el nivel?

> El nivel es la **distancia a las entradas y salidas**. Cuanto más lejos está una política de la entrada y la salida, más alto es su nivel.

Ejemplo de Martin: un programa de cifrado lee caracteres de un dispositivo, los traduce con una tabla y los escribe en otro dispositivo. La traducción es la política de **más alto nivel** (la más lejana de la E/S); leer y escribir son de bajo nivel.

Un diseño incorrecto sería `writeChar(translate(readChar()))` dentro de la función de cifrado: la política de alto nivel dependería de las funciones de bajo nivel. Fíjate en algo sutil: **el flujo de datos y las dependencias de código no tienen por qué ir en la misma dirección**. Los datos fluyen de la entrada a la traducción y a la salida; las dependencias deben apuntar hacia la traducción.

```ts
// Política de alto nivel: no conoce dispositivos
export interface CharReader { read(): string | null }
export interface CharWriter { write(c: string): void }

export function encrypt(table: Record<string, string>, reader: CharReader, writer: CharWriter) {
  let c: string | null;
  while ((c = reader.read()) !== null) writer.write(table[c] ?? c);
}

// Detalles de bajo nivel: plugins
export class StringReader implements CharReader {
  private i = 0;
  constructor(private readonly s: string) {}
  read() { return this.i < this.s.length ? this.s[this.i++] : null; }
}
export class BufferWriter implements CharWriter {
  out = "";
  write(c: string) { this.out += c; }
}
```

¿Por qué importa? Las políticas de alto nivel **cambian con menos frecuencia y por razones más importantes**; las de bajo nivel cambian a menudo, con urgencia, pero por razones menos importantes. Es mucho más probable que cambie el dispositivo de entrada que el algoritmo de cifrado. Con las dependencias hacia el alto nivel, los cambios triviales y urgentes de abajo no afectan a lo importante. Dicho de otra forma: **los componentes de bajo nivel deben ser plugins de los de alto nivel**. En esta idea confluyen SRP, OCP, CCP, DIP, SDP y SAP.

### Reglas de negocio

Si vas a dividir la aplicación en reglas de negocio y plugins, necesitas entender qué son las reglas de negocio. Hay dos tipos.

#### Entidades: reglas críticas del negocio

En sentido estricto, una regla de negocio es una regla o procedimiento que **hace ganar o ahorrar dinero al negocio**, se implemente en una computadora o no. Que un banco cobre un N % de interés por un préstamo es una regla de negocio aunque el cálculo lo haga un empleado con un ábaco. Martin las llama **reglas críticas del negocio**, y a los datos que necesitan (saldo, tasa, calendario de pagos), **datos críticos del negocio**.

Como reglas y datos críticos están inseparablemente unidos, son buenos candidatos para un objeto: la **entidad**. Una entidad, en Clean Architecture, es un objeto que encarna un pequeño conjunto de reglas críticas que operan sobre datos críticos. Es **puro negocio y nada más**: no sabe de bases de datos, interfaces ni frameworks. Puede ser una clase, o un conjunto de funciones y estructuras de datos; lo importante es que no esté contaminada por otras preocupaciones.

```ts
// Entidad: existiría aunque no hubiera software
export class Loan {
  constructor(private principal: number, readonly annualRate: number, readonly termMonths: number) {
    if (principal <= 0 || annualRate < 0 || termMonths <= 0) throw new Error("Préstamo inválido");
  }
  monthlyPayment(): number {
    const r = this.annualRate / 12;
    if (r === 0) return this.principal / this.termMonths;
    return (this.principal * r) / (1 - Math.pow(1 + r, -this.termMonths));
  }
  applyPayment(amount: number) {
    const interest = this.principal * (this.annualRate / 12);
    this.principal = Math.max(0, this.principal - (amount - interest));
  }
  get balance() { return this.principal; }
}
```

> Ojo con la terminología: la "entidad" de Clean Architecture no es exactamente la "entidad" de DDD (sesión 24). En Clean Architecture, "Entities" es la capa de reglas críticas del negocio, que en DDD incluiría entidades, value objects, agregados y servicios de dominio.

#### Casos de uso: reglas específicas de la aplicación

No todas las reglas son tan puras. Algunas hacen ganar o ahorrar dinero **porque definen y restringen cómo funciona un sistema automatizado**. Por ejemplo, un banco decide que un empleado no puede ver las condiciones de un préstamo hasta haber verificado la información de contacto y el historial crediticio del cliente. Esa regla no existiría en un proceso manual del mismo modo: es específica de la aplicación.

Un **caso de uso** describe esa forma específica de usar el sistema automatizado: las entradas del usuario, las salidas, y los pasos de procesamiento. Martin lo ilustra con algo parecido a esto:

```
Caso de uso: Recopilar datos de contacto para un préstamo nuevo
Entrada: nombre, dirección, fecha de nacimiento, número de licencia, documento
Salida: la misma información para confirmación, y el puntaje crediticio
Curso principal:
  1. Aceptar y validar el nombre.
  2. Validar dirección, fecha de nacimiento, licencia y documento.
  3. Obtener el puntaje crediticio.
  4. Si el puntaje < 500, activar "Denegación".
  5. Si no, crear el cliente y activar "Estimación del préstamo".
```

Características de los casos de uso:

- Contienen las reglas que dicen **cuándo y cómo** se invocan las reglas críticas de las entidades: **controlan** la danza de las entidades.
- **No describen la interfaz de usuario** (salvo informalmente los datos que entran y salen). Con solo mirar un caso de uso no puedes saber si la aplicación es web, de consola o un bot.
- Son objetos: tienen funciones que implementan las reglas de la aplicación y datos de entrada, salida y referencias a entidades.
- **Las entidades no saben nada de los casos de uso**; los casos de uso dependen de las entidades. Es la regla de nivel: las entidades son de más alto nivel (más generales), los casos de uso más específicos y más cercanos a la E/S.

#### Modelos de petición y respuesta

Los casos de uso reciben **datos de entrada simples** y devuelven **datos de salida simples**: estructuras de datos independientes, que **no** dependen de nada (ni de `HttpRequest`, ni de la entidad). Si el modelo de petición o respuesta no es independiente, el caso de uso queda atado a lo que sea que importe.

Martin advierte contra una tentación: usar las **entidades** como modelos de petición y respuesta porque comparten muchos datos. Es duplicación accidental: cambian por razones distintas y con el tiempo divergen. Mantenerlos separados viola un poco el DRY superficial, pero respeta el SRP.

```ts
// Modelos de petición y respuesta: datos simples, sin dependencias
export interface RequestLoanQuote { customerId: string; amount: number; termMonths: number }
export type LoanQuoteResponse =
  | { status: "approved"; monthlyPayment: number; annualRate: number }
  | { status: "denied"; reason: "low_credit_score" | "amount_too_high" };

export interface CreditScores { scoreFor(customerId: string): Promise<number> }

export class QuoteLoan {
  constructor(private readonly scores: CreditScores) {}
  async execute(req: RequestLoanQuote): Promise<LoanQuoteResponse> {
    const score = await this.scores.scoreFor(req.customerId);
    if (score < 500) return { status: "denied", reason: "low_credit_score" };   // regla de aplicación
    if (req.amount > score * 1000) return { status: "denied", reason: "amount_too_high" };
    const rate = score >= 750 ? 0.12 : 0.18;
    const loan = new Loan(req.amount, rate, req.termMonths);                    // regla crítica
    return { status: "approved", monthlyPayment: Math.round(loan.monthlyPayment()), annualRate: rate };
  }
}
```

### Screaming Architecture: la arquitectura debe gritar su propósito

Si miras los planos de un edificio, sin rótulos, ¿puedes saber qué es? Si ves un vestíbulo, una sala de oración, un púlpito y un baptisterio, es una iglesia; si ves una cocina enorme junto a un comedor con muchas mesas, es un restaurante. **Los planos gritan su propósito**.

¿Qué grita la estructura de carpetas de tu aplicación? Si al abrirla ves `controllers/`, `models/`, `views/`, `routes/`, está gritando "**soy una aplicación de un framework web**". Debería gritar "**soy un sistema de salud**", "**soy un sistema de reservas**", "**soy un sistema contable**".

```
❌ Grita el framework                 ✅ Grita el dominio y los casos de uso
src/                                  src/
  controllers/                          appointments/
  models/                                 schedule-appointment.ts
  routes/                                 cancel-appointment.ts
  services/                               appointment.ts
  middlewares/                          vaccinations/
                                          record-vaccination.ts
                                          booster-schedule.ts
                                        billing/
                                          ...
                                        infrastructure/   (web, db: detalles)
```

#### El propósito de la arquitectura

Las buenas arquitecturas se centran en los **casos de uso**, para que los arquitectos puedan describir las estructuras que los soportan **sin comprometerse** con frameworks, herramientas ni entornos. Un buen arquitecto busca poder posponer la decisión sobre el framework, la base de datos o el servidor web.

#### ¿Y la web?

La web es un **mecanismo de entrega**, un dispositivo de E/S. La arquitectura de tu aplicación no debería depender de que se entregue por la web; idealmente podrías entregarla como app de consola, servicio web, app de escritorio o servicio de mensajería sin cambiar la arquitectura central.

#### Los frameworks son herramientas, no formas de vida

Los frameworks pueden ser muy útiles, pero sus autores (y sus fans) tienden a convertirlos en el centro de todo. Mira cada framework con escepticismo: ¿cómo lo uso y cómo me protejo de él? ¿Cómo preservo el énfasis en los casos de uso? No dejes que el framework se apodere de la arquitectura.

#### Arquitecturas testeables

Si la arquitectura gira alrededor de los casos de uso y mantiene los frameworks a distancia, puedes **testear todos los casos de uso unitariamente sin ningún framework**: sin servidor web corriendo, sin base de datos conectada. Las entidades son objetos simples; los casos de uso los coordinan; todo se puede probar in situ.

### The Clean Architecture

En las décadas anteriores surgieron varias propuestas de arquitectura: **hexagonal** (puertos y adaptadores, de Alistair Cockburn), **DCI**, **BCE** (boundary-control-entity) y otras. Aunque difieren en detalles, comparten un objetivo: **la separación de preocupaciones** mediante capas, con al menos una para las reglas de negocio y otra para las interfaces. Todas producen sistemas:

- **Independientes de frameworks**: los frameworks son herramientas, no restricciones.
- **Testeables**: las reglas se prueban sin interfaz, base de datos ni servidor.
- **Independientes de la interfaz de usuario**: la UI cambia sin cambiar el resto.
- **Independientes de la base de datos**: puedes cambiar Oracle por Mongo o archivos.
- **Independientes de cualquier agente externo**: las reglas no saben nada del mundo exterior.

Clean Architecture integra esas ideas en un diagrama de círculos concéntricos:

```
 ┌───────────────────────────────────────────────────────────────┐
 │  Frameworks y drivers: Web, UI, BD, dispositivos, externos     │
 │   ┌───────────────────────────────────────────────────────┐   │
 │   │  Adaptadores de interfaz: Controllers, Presenters,      │   │
 │   │  Gateways                                              │   │
 │   │   ┌───────────────────────────────────────────────┐   │   │
 │   │   │  Casos de uso (reglas de la aplicación)        │   │   │
 │   │   │   ┌───────────────────────────────────────┐   │   │   │
 │   │   │   │  Entidades (reglas críticas)           │   │   │   │
 │   │   │   └───────────────────────────────────────┘   │   │   │
 │   │   └───────────────────────────────────────────────┘   │   │
 │   └───────────────────────────────────────────────────────┘   │
 └───────────────────────────────────────────────────────────────┘
          Todas las dependencias de código apuntan HACIA ADENTRO
```

#### La regla de dependencia

> Las dependencias del código fuente deben apuntar **solo hacia adentro**, hacia políticas de más alto nivel.

Nada de un círculo interior puede saber **nada** de un círculo exterior: ni el nombre de una función, ni una clase, ni una variable declarada afuera. Tampoco los **formatos de datos** de los círculos exteriores (especialmente los generados por frameworks) deben usarse en los interiores.

| Círculo | Contiene | Cambia cuando… |
| --- | --- | --- |
| **Entidades** | Reglas críticas del negocio de toda la empresa (o de la aplicación, si no hay empresa). Objetos con métodos o estructuras y funciones. | Cambia el negocio en sí. Nada operativo de una aplicación concreta debería afectarlas. |
| **Casos de uso** | Reglas específicas de la aplicación; orquestan el flujo de datos hacia y desde las entidades. | Cambia el funcionamiento de la aplicación. No cambian por la UI ni por la BD. |
| **Adaptadores de interfaz** | Convierten datos del formato conveniente para casos de uso y entidades al formato conveniente para agentes externos (web, BD). Aquí viven controladores, presentadores, vistas (MVC completo) y el código que conoce SQL. | Cambia la forma de presentar o de persistir. |
| **Frameworks y drivers** | Base de datos, framework web, herramientas. Poco código propio: sobre todo "pegamento". | Cambia la tecnología. |

¿Solo cuatro círculos? No es obligatorio: puede haber más. Lo que no cambia es la regla de dependencia: hacia adentro, de lo concreto a lo abstracto, de los detalles a las políticas.

#### Cruzar los límites

El flujo de control a menudo va **hacia afuera**: el controlador llama al caso de uso, y el caso de uso necesita llamar al presentador para entregar la salida. Pero el caso de uso **no puede mencionar** al presentador (está en un círculo exterior). ¿Cómo? Con **DIP**: el caso de uso llama a una interfaz (un **puerto de salida**) definida en su propio círculo, y el presentador la implementa.

```
 Controller ──▶ «interface» InputBoundary ◁── UseCaseInteractor ──▶ «interface» OutputBoundary ◁── Presenter
 (exterior)        (círculo de casos de uso)                         (círculo de casos de uso)       (exterior)
   flujo de control: Controller → Interactor → Presenter
   dependencias de código: todas apuntan hacia el círculo de casos de uso
```

#### Qué datos cruzan los límites

Normalmente cruzan **estructuras de datos simples**: DTO, argumentos de funciones, mapas. Lo importante es que sean estructuras **aisladas y simples**. No pases entidades ni filas de base de datos a través de los límites: muchos frameworks devuelven objetos de fila convenientes, pero si los pasas hacia adentro, la regla de dependencia se rompe, porque el círculo interior conocería algo del exterior. Los datos que cruzan deben estar en la forma **más conveniente para el círculo interior**.

#### Un escenario típico

Martin describe una aplicación web con base de datos:

1. El **servidor web** recibe la petición y la entrega al **Controller**.
2. El Controller empaqueta los datos en un objeto simple (**InputData**) y lo pasa por la interfaz **InputBoundary** al **UseCaseInteractor**.
3. El Interactor interpreta los datos y controla la danza de las **Entities**. Usa la interfaz **DataAccessInterface** para traer los datos que necesitan las entidades; esa interfaz la implementa **DataAccess**, en el círculo de adaptadores, que habla con la base de datos.
4. Al terminar, el Interactor reúne el resultado en un objeto simple (**OutputData**) y lo pasa por la interfaz **OutputBoundary** al **Presenter**.
5. El Presenter convierte el OutputData en un **ViewModel**: otro objeto simple con todo lo que la vista necesita en forma de strings y flags (fechas formateadas, montos con símbolo, si un botón está activo).
6. La **View** solo traslada los datos del ViewModel a la pantalla HTML.

Todas las dependencias cruzan los límites **hacia adentro**, cumpliendo la regla.

### Clean Architecture y arquitectura hexagonal

La arquitectura hexagonal (ports and adapters) dice lo mismo con otra imagen: la aplicación en el centro, rodeada de **puertos** (interfaces que define la aplicación) y **adaptadores** que conectan el mundo exterior con esos puertos.

| Hexagonal | Clean Architecture |
| --- | --- |
| Núcleo de la aplicación (dominio + aplicación) | Entidades + casos de uso |
| Puerto primario (de entrada, *driving*) | InputBoundary |
| Adaptador primario (HTTP, CLI, tests) | Controller |
| Puerto secundario (de salida, *driven*) | DataAccessInterface, OutputBoundary, gateways |
| Adaptador secundario (BD, email, APIs externas) | DataAccess, Presenter, gateways concretos |

Y conecta con todo el módulo: los puertos son **interfaces del lado del cliente** (ISP), las dependencias hacia adentro son **DIP** a nivel de sistema, los adaptadores son el patrón **Adapter** de GoF, el núcleo es el **dominio aislado** de DDD y los límites son los **límites arquitectónicos** de la sesión anterior.

### Analogía de construcción

En urbanismo, una ciudad bien planificada tiene un **centro histórico** protegido (las entidades: lo más valioso y estable), rodeado de **barrios de servicios** (los casos de uso), luego **vías de acceso** (los adaptadores) y finalmente las **autopistas y conexiones con otras ciudades** (frameworks y drivers). Las normas urbanísticas impiden que una autopista atraviese el centro histórico; son las vías de acceso las que se adaptan al centro, nunca al revés. Y un plano de la ciudad "grita" su propósito: una ciudad universitaria, un puerto, una ciudad industrial.

### Errores comunes

- **Carpetas que gritan el framework** (`controllers/`, `models/`) y esconden los casos de uso.
- **Pasar `req`/`res` del framework o filas del ORM** hacia los casos de uso.
- **Usar entidades como DTO** de entrada y salida "para no duplicar".
- **Casos de uso que formatean** fechas o montos para la vista (eso es del presentador).
- **Entidades que dependen de casos de uso** o de anotaciones de persistencia.
- **Convertir los cuatro círculos en dogma** con decenas de capas vacías: la regla importante es la de dependencia, no el número de círculos.

### Resumen

El nivel de una política es su distancia a la entrada y salida; las dependencias de código deben apuntar a las políticas de más alto nivel, que cambian menos y por razones más importantes, de modo que lo de bajo nivel sea un plugin. Las entidades encarnan reglas críticas del negocio con sus datos; los casos de uso contienen reglas específicas de la aplicación, controlan a las entidades y usan modelos de petición y respuesta simples e independientes. La arquitectura debe gritar su propósito (casos de uso y dominio), no el framework, y ser testeable sin infraestructura. Clean Architecture organiza todo en círculos con una sola regla: las dependencias apuntan hacia adentro; el flujo de control hacia afuera se resuelve con interfaces (DIP), y por los límites cruzan estructuras de datos simples. La arquitectura hexagonal expresa la misma idea con puertos y adaptadores.

## Conceptos clave

- **Nivel de una política**: distancia de esa política a las entradas y salidas del sistema.
- **Regla crítica del negocio**: regla que hace ganar o ahorrar dinero aunque no existiera el software.
- **Entidad (Clean Architecture)**: objeto con reglas críticas que operan sobre datos críticos del negocio, sin dependencias externas.
- **Caso de uso**: regla específica de la aplicación que controla a las entidades, con entradas y salidas propias.
- **Modelos de petición y respuesta**: estructuras de datos simples e independientes que entran y salen de un caso de uso.
- **Screaming Architecture**: estructura que comunica el propósito del sistema y sus casos de uso, no el framework.
- **Regla de dependencia**: las dependencias de código fuente solo apuntan hacia adentro, hacia políticas de más alto nivel.
- **Input/Output Boundary**: interfaces del círculo de casos de uso para recibir peticiones y entregar resultados.
- **ViewModel**: estructura con los datos ya preparados para que la vista solo los muestre.
- **Puertos y adaptadores**: interfaces definidas por la aplicación e implementaciones que conectan el mundo exterior.

## Preguntas de repaso

1. ¿Cómo se define el nivel de una política y por qué las dependencias deben apuntar al nivel más alto?
   R: Por su distancia a las entradas y salidas: cuanto más lejos, más alto. Las políticas de alto nivel cambian menos y por razones más importantes, y las de bajo nivel cambian a menudo por razones triviales; si las dependencias apuntan hacia lo alto, esos cambios frecuentes no afectan a lo importante.
2. ¿Qué diferencia hay entre una entidad y un caso de uso en Clean Architecture?
   R: La entidad contiene reglas críticas del negocio con sus datos, que existirían aunque no hubiera software. El caso de uso contiene reglas específicas de la aplicación automatizada, define entradas y salidas y controla cuándo y cómo se usan las entidades. Los casos de uso dependen de las entidades, nunca al revés.
3. ¿Por qué no conviene usar las entidades como modelos de petición y respuesta?
   R: Porque cambian por razones distintas: la entidad por el negocio y los modelos de entrada y salida por la aplicación y sus interfaces. Unificarlos es duplicación accidental que acopla capas que deben evolucionar por separado.
4. ¿Qué significa que una arquitectura "grite" su propósito?
   R: Que al mirar su estructura se reconoce de qué trata el sistema y cuáles son sus casos de uso (citas, vacunación, facturación), en lugar de ver solo el framework (controllers, models, routes).
5. Enuncia la regla de dependencia y explica cómo el caso de uso entrega resultados al presentador sin violarla.
   R: Las dependencias de código solo pueden apuntar hacia adentro; nada interior conoce algo exterior. El caso de uso llama a una interfaz de salida (OutputBoundary) definida en su propio círculo, y el presentador, en un círculo exterior, la implementa: el control va hacia afuera, la dependencia hacia adentro.
6. ¿Qué datos deben cruzar los límites y cuáles no?
   R: Estructuras de datos simples y aisladas, en la forma más conveniente para el círculo interior (DTO, argumentos, mapas). No deben cruzar entidades ni objetos del framework, como filas del ORM o el objeto de la petición HTTP.
7. ¿Qué corresponde en arquitectura hexagonal a un controller y a un repositorio SQL?
   R: El controller es un adaptador primario (de entrada) que usa un puerto primario del núcleo; el repositorio SQL es un adaptador secundario (de salida) que implementa un puerto secundario definido por la aplicación.

## Ejercicio

Implementa en TypeScript el caso de uso "Solicitar cotización de préstamo" con la estructura completa del escenario típico: `Loan` (entidad), `QuoteLoan` (interactor) que implementa `QuoteLoanInput` y llama a `QuoteLoanOutput`, un `CreditScores` (puerto) con un adaptador falso, un `QuoteLoanController` que convierte un objeto tipo petición HTTP en el modelo de entrada, un `QuoteLoanPresenter` que produce un `QuoteViewModel` (monto con formato de moneda, mensaje de rechazo legible, flag `canAccept`) y una vista que renderiza el ViewModel a texto. Organiza las carpetas para que griten el caso de uso. **Terminado cuando:** el interactor tiene tests sin controlador ni vista, el presentador tiene tests propios de formato, ningún archivo de `entities/` o del caso de uso importa nada de los adaptadores (compruébalo con una búsqueda de imports o una regla de lint) y la estructura de carpetas comunica "préstamos" antes que "controllers".

## Explícalo con tus palabras

Explica con la analogía del centro histórico y las autopistas por qué en Clean Architecture las dependencias apuntan hacia adentro aunque las peticiones viajen hacia afuera.
