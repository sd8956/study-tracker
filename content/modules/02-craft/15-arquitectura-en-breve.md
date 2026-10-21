---
title: Arquitectura en breve — hexagonal, Clean Architecture y la Scope Rule
kind: lesson
hours: 2
sources: Gentleman Programming Book, cap. 3 Arquitectura Hexagonal | Gentleman Programming Book, cap. 7 Dominando la Clean Architecture | Gentleman Programming Book, cap. 8 Clean Architecture en el Front End | Gentleman Programming Book, cap. 13 Barrels | Gentleman Programming Book, cap. 18 Arquitectura de Software | The Pragmatic Programmer, tema 28 Decoupling (pp. 228–238)
links: Gentleman · Arquitectura Hexagonal | https://the-amazing-gentleman-programming-book.vercel.app/es/book/Chapter03_Hexagonal_Architecture ; Gentleman · Clean Architecture | https://the-amazing-gentleman-programming-book.vercel.app/es/book/Chapter07_Clean_Architecture ; Gentleman · Clean Architecture en el Front End | https://the-amazing-gentleman-programming-book.vercel.app/es/book/Chapter08_Clean_Architecture_Front_End ; Gentleman · Barrels | https://the-amazing-gentleman-programming-book.vercel.app/es/book/Chapter13_Barrels ; Gentleman · Arquitectura de Software | https://the-amazing-gentleman-programming-book.vercel.app/es/book/Chapter18_Software-Architecture
---

## Objetivo

Tener un mapa mental de la arquitectura de una aplicación antes de profundizar en el módulo 03: qué problema resuelve la arquitectura hexagonal (puertos y adaptadores), qué añade la Clean Architecture (capas y regla de dependencia), cómo se organiza un frontend con la Scope Rule y el patrón container, y cuándo los barrels ayudan o estorban. Al terminar vas a poder dibujar la estructura de un caso de uso pequeño en TypeScript con dominio, puerto y adaptadores.

## Estudio

### De las clases a la arquitectura

En las sesiones anteriores fuiste subiendo de nivel: nombres, funciones, objetos, clases, fronteras con terceros, ortogonalidad, reversibilidad. Todas esas ideas, aplicadas a la escala de una aplicación completa, se llaman **arquitectura**. El capítulo "Arquitectura de Software" del Gentleman Programming Book lo dice así: la arquitectura no se trata de memorizar definiciones sino de entender **las razones** detrás de las decisiones. Y su consejo general es: empieza simple, entiende los trade-offs y diseña de modo que puedas crecer después sin reescribir todo.

Esta sesión es una introducción. En el módulo 03 vas a estudiar Clean Architecture y Domain-Driven Design en profundidad, con los libros originales. Aquí te quedas con el mapa.

### Complejidad esencial y accidental

Antes de elegir una arquitectura, conviene distinguir dos tipos de complejidad que el capítulo de arquitectura menciona:

- **Complejidad esencial**: la que viene del problema. Calcular impuestos de varios países es complejo por naturaleza.
- **Complejidad accidental**: la que añadimos nosotros. Montar microservicios para una aplicación pequeña es complejidad accidental.

Una buena arquitectura reduce la complejidad accidental y aísla la esencial para que se pueda entender y probar. Una mala arquitectura (o una demasiado ambiciosa) añade complejidad accidental. El mismo capítulo habla del **principio de la menor sorpresa**: las funciones y los endpoints deben hacer lo que su nombre sugiere; un `GET` solo debería leer.

### Monolito, monolito modular y microservicios

El capítulo de arquitectura también compara las formas de desplegar una aplicación:

| Forma | Qué es | Cuándo tiene sentido |
| --- | --- | --- |
| **Monolito** | Una sola unidad desplegable | Al empezar; equipos pequeños |
| **Monolito modular** | Una unidad desplegable con módulos de límites claros (bounded contexts) | Cuando el dominio crece pero no necesitas desplegar por separado |
| **Microservicios** | Varios servicios desplegados de forma independiente | Cuando el dolor de no tenerlos supera su costo operativo |

El consejo es empezar simple y adoptar microservicios solo cuando el dolor de no tenerlos sea mayor que la complejidad operativa que añaden (red, despliegues, observabilidad, consistencia). Lo verás a fondo en el módulo 06. Lo importante aquí: **la arquitectura interna (cómo separas dominio e infraestructura) es independiente de cómo despliegas**. Un monolito bien estructurado se puede partir después; uno enredado, no.

### Arquitectura hexagonal: puertos y adaptadores

El capítulo "Arquitectura Hexagonal" del Gentleman Programming Book presenta este estilo (propuesto originalmente por Alistair Cockburn) como una forma de separar responsabilidades. La idea central: **la lógica de negocio vive en el centro (el hexágono) y se comunica con el exterior a través de puertos; los adaptadores traducen entre el exterior y esos puertos**.

```
          ACTORES PRIMARIOS                         ACTORES SECUNDARIOS
          (inician la acción)                       (proveen recursos)

   Usuario ─► [Adaptador driver] ─► (puerto)        (puerto) ─► [Adaptador driven] ─► Base de datos
   CLI     ─► [Adaptador driver] ─►    ┌──────────────┐    ─► [Adaptador driven] ─► API de correo
   Tests   ─► [Adaptador driver] ─►    │   DOMINIO /  │
                                       │   SERVICIO   │
                                       └──────────────┘
```

Vocabulario clave:

- **Actores primarios**: los que inician una acción (una persona usando la web, un script, un test). Se conectan mediante **adaptadores driver**.
- **Actores secundarios**: los que proveen recursos al servicio (base de datos, proveedor de correo, otro servicio). Se conectan mediante **adaptadores driven**.
- **Puertos**: interfaces que definen qué funcionalidades ofrece el servicio y qué necesita del exterior. Marcan el límite de la comunicación.
- **Adaptadores**: traducen entre entidades que usan nombres o formatos distintos (por ejemplo, `username` en la API y `userIdentifier` en el dominio).

El capítulo usa una analogía muy clara, una pizzería: el comprador es el actor primario, el menú es el puerto, el cajero es el adaptador que traduce el pedido, la cocina es el servicio, y el proveedor de ingredientes es un actor secundario que llega a través de un encargado. Cada uno usa su propio vocabulario; el adaptador traduce.

También distingue tres tipos de lógica:

- **Lógica de negocio**: viene del producto ("el usuario debe ser mayor de 18 años").
- **Lógica de organización**: reutilizable en varios proyectos de la empresa ("validar una tarjeta de crédito").
- **Casos de uso**: limitaciones técnicas o de uso que pueden cambiar ("dónde se muestran los mensajes de error").

Y propone una convención de nombres: puertos con el prefijo **"For"** según la acción que permiten (`ForRegistering`, `ForAuthenticating`) y adaptadores nombrados por quien realiza la acción (`Registerer`, `Authenticator`). El proceso recomendado: analizar requisitos, identificar lógica y recursos, definir puertos, crear adaptadores stub o mock con datos controlados para "cerrar el hexágono", escribir con TDD los tests de los casos de uso y, por último, implementar la lógica.

### Un ejemplo hexagonal en TypeScript

El capítulo implementa la apertura de una cuenta bancaria con la regla de los 18 años. Esta es una versión propia con la misma estructura:

```ts
// ── Dominio ─────────────────────────────────────────────
export class AgeNotAllowedError extends Error {
  constructor(readonly age: number) {
    super(`Edad no permitida: ${age}. Se requieren 18 años.`);
  }
}

export class BankAccount {
  private constructor(readonly holderName: string, readonly holderAge: number) {}

  static open(holderName: string, holderAge: number): BankAccount {
    if (holderAge < 18) throw new AgeNotAllowedError(holderAge);
    return new BankAccount(holderName, holderAge);
  }
}

// ── Puerto driven (lo que el servicio necesita) ─────────
export interface ForStoringAccounts {
  save(account: BankAccount): Promise<void>;
}

// ── Puerto driver (lo que el servicio ofrece) ───────────
export interface ForOpeningAccounts {
  open(holderName: string, holderAge: number): Promise<BankAccount>;
}

// ── Servicio (el hexágono) ──────────────────────────────
export class AccountService implements ForOpeningAccounts {
  constructor(private readonly storage: ForStoringAccounts) {}

  async open(holderName: string, holderAge: number): Promise<BankAccount> {
    const account = BankAccount.open(holderName, holderAge);
    await this.storage.save(account);
    return account;
  }
}

// ── Adaptador driven: memoria (tests) ───────────────────
export class InMemoryAccountStorage implements ForStoringAccounts {
  readonly accounts: BankAccount[] = [];
  async save(account: BankAccount): Promise<void> {
    this.accounts.push(account);
  }
}

// ── Adaptador driver: HTTP ──────────────────────────────
export function openAccountHandler(service: ForOpeningAccounts) {
  return async (request: { body: { name: string; age: number } }) => {
    try {
      const account = await service.open(request.body.name, request.body.age);
      return { status: 201, body: { holder: account.holderName } };
    } catch (error) {
      if (error instanceof AgeNotAllowedError) return { status: 422, body: { error: error.message } };
      throw error;
    }
  };
}
```

Un test del caso de uso no necesita HTTP ni base de datos:

```ts
it("no abre cuentas a menores de 18", async () => {
  const storage = new InMemoryAccountStorage();
  const service = new AccountService(storage);

  await expect(service.open("Ana", 16)).rejects.toThrow(AgeNotAllowedError);
  expect(storage.accounts).toHaveLength(0);
});
```

Fíjate en cuánto de esto ya conocías: los puertos son las interfaces de la sesión 9 ("programa contra la interfaz que quieres"), los adaptadores son las fronteras limpias, la regla de los 18 años vive en el objeto que tiene la información (sesión 7) y todo es reversible (sesión 13).

### Clean Architecture: capas y regla de dependencia

El capítulo "Dominando la Clean Architecture" del Gentleman Programming Book (basado en las ideas de Robert C. Martin) describe una variante con capas concéntricas:

```
┌─────────────────────────────────────────────┐
│ Frameworks y drivers (DB, UI, web, librerías)│
│  ┌───────────────────────────────────────┐   │
│  │ Adaptadores de interfaz (controllers,  │   │
│  │ presenters, repositorios concretos)    │   │
│  │  ┌─────────────────────────────────┐   │   │
│  │  │ Casos de uso (reglas de la app)  │   │   │
│  │  │  ┌───────────────────────────┐   │   │   │
│  │  │  │ Entidades (reglas de       │   │   │   │
│  │  │  │ negocio)                   │   │   │   │
│  │  │  └───────────────────────────┘   │   │   │
│  │  └─────────────────────────────────┘   │   │
│  └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
        Las dependencias solo apuntan hacia dentro ──►
```

La **regla de dependencia** es la idea más importante: el código de una capa interior no puede saber nada de las capas exteriores. Las entidades no importan casos de uso; los casos de uso no importan Express, React ni el driver de la base de datos. Cuando un caso de uso necesita algo del exterior (guardar, enviar un correo), declara una interfaz que el exterior implementa. El capítulo lo llama la "regla del dominio": el dominio es el núcleo protegido; los casos de uso dependen de él, nunca al revés.

El mismo capítulo distingue tres tipos de lógica que encajan con las capas:

- **Lógica de dominio**: el qué y el porqué (la regla de los 18 años).
- **Lógica de aplicación**: el cómo se orquesta (crear la cuenta, guardarla, notificar).
- **Lógica de empresa**: políticas transversales de la organización (por ejemplo, auditorías anuales).

Ventajas que destaca: separación de responsabilidades, independencia del dominio respecto a la tecnología, adaptadores como "membranas" que traducen datos hacia dentro y hacia fuera, y la posibilidad de cambiar de base de datos tocando solo un adaptador (por ejemplo, pasar de un repositorio MySQL a uno PostgreSQL que implementan la misma interfaz). Y también sus **desventajas**, que el capítulo no esconde: costo de planificación inicial, verbosidad, código de andamiaje y esfuerzo de migración. Por eso conviene en proyectos grandes y de larga vida, no en prototipos rápidos. Es exactamente el trade-off de la sesión 1: la vida esperada del código decide cuánto invertir.

¿Hexagonal o Clean Architecture? Comparten la idea esencial (dominio en el centro, dependencias hacia dentro, adaptadores en el borde). Clean Architecture la detalla en capas con nombres; hexagonal la expresa con puertos y adaptadores. En la práctica, muchos equipos usan una mezcla.

### Arquitectura en el frontend: Scope Rule y container pattern

El capítulo "Clean Architecture en el Front End" aplica estas ideas a aplicaciones de interfaz, con un enfoque **orgánico**: la estructura de carpetas emerge de las necesidades del proyecto en lugar de imponerse desde el día uno. Dos herramientas centrales:

**La Scope Rule** ("el scope determina la estructura"): el código que usa una sola funcionalidad vive dentro de esa funcionalidad; el código que usan dos o más funcionalidades sube a una carpeta compartida. Así la estructura "grita" de qué trata la aplicación (**Screaming Architecture**: al abrir las carpetas ves `products`, `cart`, `checkout`, no `controllers`, `services`, `utils`).

```
src/
  products/
    ProductsContainer.tsx      ← container: estado, datos, layout
    components/                ← presentación, solo de products
    services/                  ← llamadas al API de productos
    adapters/                  ← API ⇄ modelo de dominio
  cart/
    CartContainer.tsx
    components/
    services/
    adapters/
  shared/                      ← usado por 2+ features (Scope Rule)
    components/Button.tsx
    hooks/useDebounce.ts
```

**El patrón container**: cada funcionalidad tiene un componente container con su nombre, que gestiona el layout, el estado y la obtención de datos. Los componentes de presentación solo reciben datos por props y emiten eventos. Los containers son encapsulados, independientes y se pueden cargar de forma diferida (lazy loading).

Los **adaptadores** del frontend hacen lo mismo que en el backend: traducen en ambas direcciones entre la forma del API y la forma del dominio. Si el backend cambia `first_name` por `firstName`, solo cambia el adaptador.

```ts
// products/adapters/productAdapter.ts
type ProductApiResponse = { id: number; product_name: string; price_cents: number };
export type Product = { id: string; name: string; price: number };

export const toProduct = (raw: ProductApiResponse): Product => ({
  id: String(raw.id),
  name: raw.product_name,
  price: raw.price_cents / 100,
});
```

### Barrels: comodidad con letra pequeña

El capítulo "Barrels" trata un patrón muy común en TypeScript: un archivo `index.ts` que reexporta los módulos de una carpeta para que se importen desde un solo punto.

```ts
// products/index.ts
export { ProductsContainer } from "./ProductsContainer";
export type { Product } from "./adapters/productAdapter";
```

| Ventajas | Desventajas |
| --- | --- |
| Rutas de importación más cortas | Los bundlers pueden no eliminar código no usado (tree-shaking), aumentando el tamaño |
| Refactorizar es más fácil: mover un archivo actualiza un solo barrel | Barrels grandes ralentizan la carga y las herramientas |
| Agrupa por dominio y define la API pública de una carpeta | Facilitan las dependencias circulares |
| | Pueden seguir exportando módulos muertos |

Recomendaciones del capítulo: preferir reexportaciones **explícitas** (`export { Button } from "./Button"`) en lugar de comodines (`export *`), usar barrels por dominio, cargar de forma diferida lo pesado y, cuando importan la precisión del análisis de dependencias y la eliminación de código muerto, importar directamente desde el archivo fuente. Un uso sano es el de "API pública de un módulo": el barrel decide qué es público y el resto es interno, lo que conecta con la ley de Hyrum (expón lo mínimo).

### Una pincelada de sistemas distribuidos

El capítulo de arquitectura del Gentleman Book recorre también temas que verás en los módulos 04–06: comunicación síncrona frente a asíncrona (la síncrona crea acoplamiento temporal), **idempotencia** (repetir una operación produce el mismo resultado; por ejemplo, "fijar el saldo en X" en lugar de "sumar X", o usar claves de idempotencia), condiciones de carrera, sagas, timeouts, circuit breakers, caché L1 y L2, escalado horizontal y vertical, y evolución de esquemas sin caída con el patrón expand-contract. No hace falta dominarlos ahora; solo saber que existen y que todos se apoyan en lo mismo que esta sesión: límites claros entre piezas.

### ¿Cuánta arquitectura necesito?

No todos los proyectos necesitan el mismo nivel de estructura. Una guía práctica, coherente con la idea de vida esperada de la sesión 1 y con el enfoque orgánico del Gentleman Book:

| Situación | Estructura razonable |
| --- | --- |
| Script o prototipo de días | Un par de archivos; funciones puras para la lógica |
| Herramienta interna pequeña | Carpetas por funcionalidad; la lógica separada de la UI y del acceso a datos |
| Producto con varios desarrolladores y años de vida | Dominio, aplicación y adaptadores por funcionalidad; puertos para cada recurso externo |
| Dominio complejo con varios equipos | Lo anterior más límites explícitos entre módulos (bounded contexts, módulo 03) |

Una señal de que te falta arquitectura: cambiar la base de datos, el framework web o el proveedor de correo obliga a tocar reglas de negocio. Una señal de que te sobra: para añadir un campo a un formulario tienes que tocar ocho archivos de andamiaje que no aportan nada. La arquitectura correcta es la que hace baratos los cambios que realmente ocurren en tu proyecto (ETC otra vez).

Un truco para empezar de forma orgánica: arranca con todo dentro de la carpeta de la funcionalidad y, cuando una pieza la use una segunda funcionalidad, súbela a `shared` (Scope Rule). Cuando un recurso externo empiece a complicar los tests, introduce un puerto y un adaptador para él. Así la estructura crece con el proyecto en lugar de imponerse por adelantado.

### Resumen

La arquitectura es la aplicación, a escala de sistema, de las ideas del módulo: separar lo que cambia por razones distintas, depender de abstracciones y aislar las fronteras. La arquitectura hexagonal pone el dominio en el centro y se comunica con el mundo mediante puertos y adaptadores; la Clean Architecture añade capas con una regla de dependencia que solo apunta hacia dentro. En el frontend, la Scope Rule y el patrón container organizan el código por funcionalidad. Los barrels ayudan a definir la API pública de un módulo si se usan con moderación. Y todo se dosifica según la vida esperada y la complejidad esencial del proyecto.

### Errores comunes

- **Aplicar Clean Architecture completa a un prototipo de una semana**: complejidad accidental.
- **Dejar que el dominio importe el framework** (decoradores del ORM en las entidades, `Request` de Express en los casos de uso).
- **Organizar por tipo técnico** (`controllers/`, `services/`) en lugar de por funcionalidad, ocultando de qué trata la app.
- **Adaptadores que contienen reglas de negocio**: el adaptador traduce, no decide.
- **Barrels con `export *` en todas partes**, que generan ciclos e impiden el tree-shaking.
- **Elegir microservicios para "estar preparados"**: es adelantar a tus faros.

## Conceptos clave

- **Arquitectura hexagonal**: el dominio en el centro se comunica con el exterior mediante puertos; los adaptadores traducen.
- **Puerto**: interfaz que define lo que el servicio ofrece (driver) o necesita (driven).
- **Adaptador driver / driven**: traduce desde un actor que inicia la acción / hacia un recurso que el servicio usa.
- **Regla de dependencia**: las dependencias del código solo apuntan hacia las capas interiores.
- **Scope Rule**: el código usado por una sola funcionalidad vive en ella; el usado por dos o más va a `shared`.
- **Patrón container**: un componente por funcionalidad gestiona estado y datos; los componentes de presentación solo reciben props.
- **Barrel**: archivo `index.ts` que reexporta los módulos de una carpeta como su API pública.

## Preguntas de repaso

1. Explica la arquitectura hexagonal con la analogía de la pizzería del Gentleman Book.
   R: El comprador (actor primario) pide a través del menú (puerto); el cajero (adaptador) traduce el pedido al lenguaje de la cocina (servicio con la lógica); la cocina obtiene ingredientes de un proveedor (actor secundario) a través de un encargado (adaptador driven). Cada parte usa su vocabulario y los adaptadores traducen.
2. ¿Qué dice la regla de dependencia de la Clean Architecture y cómo se cumple cuando un caso de uso necesita guardar datos?
   R: Que el código de las capas interiores no puede conocer a las exteriores; las dependencias solo apuntan hacia dentro. Para guardar datos, el caso de uso declara una interfaz (puerto o repositorio) y un adaptador de la capa exterior la implementa, de modo que el caso de uso no importa la base de datos.
3. ¿Qué desventajas tiene la Clean Architecture y cuándo no conviene?
   R: Costo de planificación inicial, verbosidad, código de andamiaje y esfuerzo de migración. No conviene en prototipos rápidos o código de vida corta; sí en proyectos grandes y de larga vida.
4. ¿Qué es la Scope Rule y cómo produce una "Screaming Architecture"?
   R: El código que usa una sola funcionalidad vive dentro de su carpeta y el que usan dos o más sube a `shared`. Como la estructura principal queda organizada por funcionalidades (products, cart, checkout), las carpetas "gritan" de qué trata la aplicación en lugar de mostrar capas técnicas.
5. ¿Qué responsabilidades tiene un container y cuáles un componente de presentación?
   R: El container gestiona estado, obtención de datos y layout de una funcionalidad, y conecta con servicios y adaptadores. El componente de presentación solo recibe datos por props y emite eventos, sin conocer de dónde vienen los datos.
6. Da dos ventajas y dos riesgos de los barrels, y una recomendación para usarlos bien.
   R: Ventajas: imports más cortos y un único punto que actualizar al mover archivos (además de definir la API pública de una carpeta). Riesgos: pueden impedir el tree-shaking y facilitar dependencias circulares (también módulos muertos y carga lenta). Recomendación: usar reexportaciones explícitas por dominio en lugar de `export *`.

## Ejercicio

Implementa en TypeScript el caso de uso "inscribirse en un curso" con arquitectura hexagonal: entidad `Enrollment` con la regla "no más de 30 inscritos por curso", puerto driver `ForEnrolling`, puertos driven `ForStoringEnrollments` y `ForNotifyingStudents`, el servicio, adaptadores en memoria para ambos puertos driven y un adaptador driver HTTP simple (una función que recibe `{ body }` y devuelve `{ status, body }`). Organiza las carpetas por funcionalidad (`enrollment/domain`, `enrollment/application`, `enrollment/adapters`) con un barrel explícito que exponga solo el puerto driver y el adaptador HTTP. Escribe tests del servicio con los adaptadores en memoria. Terminado cuando ningún archivo de `domain` o `application` importa nada de `adapters`, los tests no usan red ni disco y el barrel no usa `export *`.

## Explícalo con tus palabras

Explica a alguien que solo ha hecho proyectos pequeños por qué "la base de datos es un detalle" en una arquitectura limpia, aunque sea donde viven todos los datos.
