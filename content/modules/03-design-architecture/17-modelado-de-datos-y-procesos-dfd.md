---
title: "Modelado de datos y procesos: diagramas de flujo de datos, diccionario y reglas"
kind: lesson
hours: 2
sources: Systems Analysis and Design 9.ª ed., cap. 5 "Data and Process Modeling" (pp. 220–254)
---

## Objetivo

Saber representar **qué hace** un sistema con sus datos mediante diagramas de flujo de datos (DFD) por niveles, documentar los datos en un diccionario y describir la lógica de los procesos con inglés estructurado (pseudocódigo), tablas de decisión y árboles de decisión, distinguiendo el modelo lógico del físico.

## Estudio

### El DFD: un modelo lógico de cómo fluyen los datos

Un **diagrama de flujo de datos (DFD)** muestra cómo un sistema transforma datos de entrada en información útil. Muestra **cómo se mueven los datos**, pero no la lógica del programa ni el orden de los pasos. Por eso un conjunto de DFD es un **modelo lógico**: describe **qué** hace el sistema, no **cómo** lo hace. Esa distinción es intencional: si empiezas pensando en la implementación (qué base de datos, qué framework), limitas la búsqueda del mejor diseño.

Esto debería sonarte: es exactamente la separación entre **política** y **detalle** de Clean Architecture, aplicada a la fase de análisis.

### Los cuatro símbolos

Hay dos notaciones populares, Gane & Sarson (la del libro) y Yourdon. Ambas tienen los mismos cuatro elementos:

| Símbolo | Gane & Sarson | Qué representa | Cómo se nombra |
| --- | --- | --- | --- |
| **Proceso** | Rectángulo de esquinas redondeadas | Transforma entradas en salidas con otro contenido o forma; contiene las reglas de negocio. | Verbo + sustantivo singular: VALIDAR PEDIDO, CALCULAR COMISIÓN |
| **Flujo de datos** | Línea con flecha | Camino por el que se mueven uno o varios datos. | Sustantivo singular: PEDIDO, FACTURA, PAGO |
| **Almacén de datos** | Rectángulo abierto por un lado | Datos guardados para usarse después (una tabla, un archivo, un cajón de papeles). | Sustantivo plural: CLIENTES, PEDIDOS |
| **Entidad externa** | Cuadrado | Persona, organización o sistema fuera del alcance que envía o recibe datos. | Sustantivo singular: CLIENTE, BANCO, ALMACÉN |

```
  ┌─────────┐   PEDIDO    ╭──────────────╮  PEDIDO VALIDADO  ╭──────────────╮
  │ CLIENTE │───────────▶│ 1             │──────────────────▶│ 2             │
  └─────────┘            │ VALIDAR       │                   │ PREPARAR      │
       ▲                 │ PEDIDO        │                   │ PEDIDO        │
       │                 ╰──────┬───────╯                   ╰──────┬───────╯
       │  RECHAZO               │ consulta                         │
       └────────────────────────┤                                  ▼
                          ═════╪═════════                    ┌─────────┐
                          D1 │ PRODUCTOS                      │ ALMACÉN │
                          ═══════════════                    └─────────┘
```

Un proceso es una **caja negra**: se conocen sus entradas, sus salidas y su función general, pero no su lógica interna. Cuando quieres más detalle, haces **zoom** sobre el proceso y lo descompones en un DFD más detallado. Así el sistema se modela como una serie de imágenes cada vez más detalladas.

### Reglas de conexión

Un proceso cambia el contenido o la forma de los datos, así que **todo proceso debe tener al menos un flujo de entrada y uno de salida**. Y todo flujo de datos debe tener un proceso en al menos uno de sus extremos: los datos no viajan solos de una entidad a un almacén ni de un almacén a otro.

Tres errores clásicos que hay que evitar:

| Error | Qué es | Ejemplo |
| --- | --- | --- |
| **Generación espontánea** | Un proceso con salida pero sin entrada. | CALCULAR PRIMA produce un monto de la nada. |
| **Agujero negro** | Un proceso con entrada pero sin salida. | CALCULAR SALARIO recibe horas y tarifa y no produce nada. |
| **Agujero gris** | Un proceso cuyas entradas son claramente insuficientes para producir sus salidas. | CALCULAR SALARIO recibe solo el número de empleado y devuelve el salario neto. |

Fíjate en que el "agujero gris" es un síntoma muy útil en diseño de software: si una función promete algo que sus parámetros no le permiten calcular, está leyendo datos de algún lugar oculto (una variable global, un singleton, una consulta escondida). Es la misma "dependencia oculta" que viste con Singleton.

### Los niveles del DFD

#### Diagrama de contexto

Es la vista de más alto nivel: muestra **todo el sistema como un único proceso** (el proceso 0), con las entidades externas y los flujos que entran y salen. Define los **límites y el alcance** del sistema. No muestra almacenes de datos, porque están dentro del sistema y permanecen ocultos.

Para construirlo, revisas los requisitos e identificas todas las fuentes y destinos externos de datos.

```
                       PEDIDO, PAGO
        ┌─────────┐ ─────────────────▶ ╭──────────────────╮   LISTA DE PICKING  ┌─────────┐
        │ CLIENTE │                    │        0          │──────────────────▶│ ALMACÉN │
        └─────────┘ ◀───────────────── │ SISTEMA DE        │◀──────────────────└─────────┘
                    FACTURA, RECHAZO   │ PEDIDOS           │  PEDIDO COMPLETADO
                                       ╰──────────────────╯
                                         ▲              │
                         CONDICIONES     │              │ RESUMEN DE VENTAS
                         DE CRÉDITO      │              ▼
                                   ┌─────────┐    ┌──────────┐
                                   │  BANCO  │    │ GERENCIA │
                                   └─────────┘    └──────────┘
```

#### Diagrama 0

Hace zoom en el sistema y muestra los **procesos principales**, los flujos y los almacenes de datos, repitiendo las mismas entidades y flujos del diagrama de contexto. Cada proceso se numera (1, 2, 3...). Si un proceso necesita más detalle, se descompone en un **diagrama hijo** (el proceso 2 se convierte en el diagrama 2, con procesos 2.1, 2.2...). Un proceso que no se descompone más es un **proceso funcional primitivo**, y su lógica se documenta con una descripción de proceso.

#### Nivelación y balanceo

- **Nivelación (leveling)**: dibujar una serie de diagramas cada vez más detallados hasta llegar a los procesos primitivos. Permite ver el sistema a la profundidad que necesites.
- **Balanceo (balancing)**: un diagrama hijo debe tener **las mismas entradas y salidas** que el proceso padre. Si el proceso 2 recibe PEDIDO VALIDADO y produce LISTA DE PICKING, su diagrama hijo debe recibir y producir exactamente eso. El balanceo garantiza que el modelo sea consistente entre niveles.

¿Te suena? Es el mismo principio de una buena **interfaz**: el detalle interno puede crecer, pero el contrato hacia fuera no cambia.

#### Pautas prácticas

- El diagrama de contexto cabe en una página.
- El nombre del proceso 0 es el nombre del sistema.
- Usa nombres únicos y consistentes en todos los niveles.
- No cruces líneas si puedes evitarlo (repite una entidad o un almacén si hace falta).
- Usa identificadores únicos para los procesos.
- Evita dibujar más de unos 9 procesos por diagrama; si tienes más, agrupa y nivela.

### Diccionario de datos

El DFD no muestra el contenido detallado de los flujos ni de los almacenes. Eso va en el **diccionario de datos** (o repositorio de datos): un catálogo central que documenta cada elemento de datos, flujo, almacén, entidad y proceso. Es el lugar donde el equipo se pone de acuerdo sobre **qué significa cada dato**.

Para cada **elemento de datos** (el dato más pequeño con significado, como un campo), el libro sugiere documentar: nombre, alias o sinónimos, tipo y longitud, formato de salida, valores por defecto, valores o rangos aceptables, fuente, seguridad (quién puede leerlo o modificarlo), responsable y descripción.

| Atributo | Ejemplo: `codigo_reserva` |
| --- | --- |
| Alias | "localizador", "número de confirmación" |
| Tipo y longitud | Texto, 8 caracteres |
| Formato | `AAA-9999` (tres letras mayúsculas, guion, cuatro dígitos) |
| Valores aceptables | Letras sin vocales (evita palabras ofensivas) |
| Fuente | Generado por el proceso 1 CREAR RESERVA |
| Seguridad | Visible para el cliente y el restaurante; nadie lo modifica |
| Responsable | Equipo de reservas |

El diccionario también documenta **flujos** (qué elementos contienen), **almacenes** (qué registros guardan, volumen esperado, crecimiento) y **registros** (grupos de elementos relacionados). El concepto de **alias** es especialmente importante: cuando ventas dice "localizador" y soporte dice "número de confirmación" para lo mismo, el diccionario lo deja explícito. Esto anticipa el **lenguaje ubicuo** de DDD (sesión 22).

En TypeScript, una parte del diccionario puede vivir en el propio código como tipos y validaciones:

```ts
/** Código de reserva: "localizador" para ventas, "número de confirmación" para soporte. */
export type ReservationCode = string & { readonly __brand: "ReservationCode" };

const RESERVATION_CODE = /^[B-DF-HJ-NP-TV-Z]{3}-\d{4}$/; // sin vocales

export function parseReservationCode(raw: string): ReservationCode {
  const value = raw.trim().toUpperCase();
  if (!RESERVATION_CODE.test(value)) throw new Error(`Código de reserva inválido: ${raw}`);
  return value as ReservationCode;
}
```

### Herramientas para describir procesos

Un proceso funcional primitivo necesita una **descripción de proceso** que documente su lógica de negocio. El libro presenta tres herramientas, cada una adecuada para un tipo de lógica.

#### 1. Inglés estructurado (pseudocódigo)

Un subconjunto del idioma con reglas: solo verbos en imperativo, estructuras de secuencia, decisión (IF-THEN-ELSE) y repetición (para cada / mientras), nombres de datos tal como están en el diccionario y sangría para mostrar la estructura. Es la programación estructurada de la sesión 2, escrita para que la entienda un usuario.

```
PARA CADA línea del PEDIDO
    SI la cantidad solicitada es mayor que el STOCK DISPONIBLE
        AGREGAR la línea a PENDIENTES
    SI NO
        RESTAR la cantidad del STOCK DISPONIBLE
        AGREGAR la línea a LISTA DE PICKING
FIN PARA
SI PENDIENTES no está vacío
    ENVIAR AVISO DE PEDIDO PARCIAL al CLIENTE
```

#### 2. Tablas de decisión

Muestran la lógica de un proceso con **varias condiciones combinadas**. Arriba van las condiciones, abajo las acciones, y cada columna es una regla. Con N condiciones de sí/no hay 2^N reglas posibles, lo que garantiza que no olvides ninguna combinación. Luego se simplifica combinando reglas cuyo resultado no depende de una condición (se marca con un guion).

Ejemplo: política de envío gratuito.

| | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cliente VIP | S | S | S | S | N | N | N | N |
| Total ≥ 100 000 | S | S | N | N | S | S | N | N |
| Destino urbano | S | N | S | N | S | N | S | N |
| **Envío gratis** | X | X | X | | X | | | |
| **Envío con costo** | | | | X | | X | X | X |

Simplificada: VIP y (total alto o urbano) → gratis; no VIP, total alto y urbano → gratis; el resto paga. Una tabla así se traduce casi literalmente a tests parametrizados:

```ts
import { describe, expect, it } from "vitest";
import { freeShipping } from "./shipping";

describe.each([
  [true, true, true, true], [true, true, false, true], [true, false, true, true],
  [true, false, false, false], [false, true, true, true], [false, true, false, false],
  [false, false, true, false], [false, false, false, false],
])("vip=%s alto=%s urbano=%s", (vip, high, urban, expected) => {
  it(`envío gratis = ${expected}`, () => {
    expect(freeShipping({ vip, totalHigh: high, urban })).toBe(expected);
  });
});
```

#### 3. Árboles de decisión

Representan la misma lógica de forma gráfica, de izquierda a derecha, con las condiciones como ramas. Son más fáciles de leer cuando la **secuencia** de condiciones importa y no todas las combinaciones aplican.

```
                       ┌─ Total alto ───────── GRATIS
          ┌─ VIP ──────┤
          │            └─ Total bajo ─┬─ Urbano ─ GRATIS
Pedido ───┤                           └─ Rural ── CON COSTO
          │            ┌─ Total alto ─┬─ Urbano ─ GRATIS
          └─ No VIP ───┤              └─ Rural ── CON COSTO
                       └─ Total bajo ─────────── CON COSTO
```

| Herramienta | Mejor para |
| --- | --- |
| Inglés estructurado | Lógica secuencial con bucles y pocos casos. |
| Tabla de decisión | Muchas condiciones combinadas; asegurar que no falte ninguna combinación. |
| Árbol de decisión | Pocas condiciones con un orden natural; comunicar a usuarios no técnicos. |

### Modelo lógico vs. modelo físico

- El **modelo lógico** muestra **qué** debe hacer el sistema, independientemente de cómo se implemente.
- El **modelo físico** describe **cómo** se construirá: tecnologías, archivos, tablas, programas, procesos manuales y automáticos.

El libro recomienda modelar primero el sistema actual en forma lógica, luego el nuevo en forma lógica y solo después pasar al físico. Razones: el modelo lógico es más fácil de entender para los usuarios, permite cambiar la tecnología sin rehacer el análisis y reduce el riesgo de copiar las ineficiencias del sistema actual.

### DFD y diseño de software moderno

Aunque los DFD vienen del análisis estructurado de los años 70–80, siguen siendo útiles hoy en tres situaciones:

1. **Modelado de amenazas de seguridad**: los DFD con "límites de confianza" (por dónde entran datos desde fuera) son la base de técnicas como STRIDE.
2. **Pipelines de datos e integraciones**: ver qué sistema produce qué dato y quién lo consume.
3. **Detectar límites de contexto**: los grupos de procesos que comparten almacenes de datos suelen ser candidatos a módulos o bounded contexts.

#### Del DFD al código: una correspondencia aproximada

Cuando pases del análisis al diseño, un DFD bien nivelado te da un primer borrador de la estructura del software. No es una traducción mecánica, pero la correspondencia suele ser esta:

| Elemento del DFD | Candidato en el diseño |
| --- | --- |
| Proceso primitivo (CREAR RESERVA) | Un caso de uso de aplicación (`CreateReservation`) con su lógica de negocio. |
| Flujo de entrada desde una entidad externa | Un DTO o comando de entrada (`CreateReservationCommand`) validado en el borde. |
| Almacén de datos (RESERVAS) | Un puerto de repositorio (`ReservationRepository`) y, en el modelo físico, una tabla. |
| Entidad externa que es otro sistema (BANCO) | Un puerto de salida con su adaptador (`PaymentGateway`). |
| Entidad externa humana (CLIENTE) | Un adaptador de entrada: una pantalla, una API HTTP, un bot. |
| Grupo de procesos que comparten almacenes | Un módulo o componente cohesivo (CCP). |

Fíjate en que esta tabla adelanta la arquitectura hexagonal de las últimas sesiones: las entidades externas quedan **fuera**, los procesos son el **centro** y los almacenes se acceden a través de **puertos**. El análisis estructurado y la arquitectura limpia llegan a la misma conclusión desde caminos distintos: el sistema es un conjunto de reglas que transforman datos, rodeado de mecanismos intercambiables para recibirlos, guardarlos y entregarlos.

### Analogía de construcción

Un DFD es como el **plano de instalaciones sanitarias** de un edificio: muestra de dónde entra el agua (entidad externa: la red pública), por dónde circula (flujos), dónde se transforma (el calentador: un proceso que cambia la forma), dónde se almacena (el tanque) y por dónde sale. No dice de qué marca es el calentador (eso es el modelo físico). Un agujero negro sería una tubería que entra a un cuarto y no sale; un agujero gris, un calentador que entrega agua caliente sin conexión eléctrica ni de gas. El diccionario de datos es la **ficha técnica** de cada tubería: diámetro, material, presión admisible.

### Errores comunes

- **Dibujar lógica de control en un DFD** (decisiones, bucles, orden). El DFD muestra flujos de datos, no flujo de control.
- **Flujos entre almacenes o entre entidades** sin un proceso en medio.
- **Diagramas hijos desbalanceados** que agregan o pierden flujos respecto del padre.
- **Diagramas con 20 procesos.** Nivela.
- **Nombres inconsistentes** entre niveles y respecto al diccionario.
- **Empezar por el modelo físico** ("la tabla `orders` de Postgres") y perder de vista el problema.

### Resumen

Un DFD es un modelo lógico que muestra cómo fluyen y se transforman los datos con cuatro símbolos: procesos, flujos, almacenes y entidades externas. Se construye por niveles, desde el diagrama de contexto (todo el sistema como un proceso) hasta los procesos primitivos, manteniendo el balanceo entre padre e hijo. El diccionario de datos documenta qué significa cada dato, con alias incluidos. La lógica de los procesos primitivos se describe con pseudocódigo, tablas de decisión o árboles de decisión, y el análisis va de lo lógico a lo físico.

## Conceptos clave

- **DFD**: diagrama que muestra cómo los datos entran, se transforman, se almacenan y salen de un sistema.
- **Proceso, flujo de datos, almacén, entidad externa**: los cuatro símbolos de un DFD.
- **Generación espontánea, agujero negro, agujero gris**: errores de procesos sin entrada, sin salida o con entradas insuficientes.
- **Diagrama de contexto**: vista de más alto nivel con el sistema como un único proceso, que define su alcance.
- **Diagrama 0**: primer nivel de descomposición con los procesos principales y los almacenes.
- **Nivelación y balanceo**: descomponer en diagramas más detallados manteniendo las mismas entradas y salidas que el proceso padre.
- **Diccionario de datos**: catálogo central que documenta elementos, flujos, almacenes, registros y alias.
- **Tabla de decisión / árbol de decisión**: herramientas para describir lógica con varias condiciones.
- **Modelo lógico vs. físico**: qué hace el sistema frente a cómo se implementa.

## Preguntas de repaso

1. ¿Por qué un DFD se considera un modelo lógico?
   R: Porque muestra qué hace el sistema con los datos (cómo fluyen y se transforman) sin mostrar cómo se implementa, la lógica del programa ni el orden de los pasos. Así no se limita la búsqueda del mejor diseño con decisiones tecnológicas prematuras.
2. Explica los errores de generación espontánea, agujero negro y agujero gris.
   R: Generación espontánea es un proceso con salida pero sin entrada; agujero negro, un proceso con entrada pero sin salida; agujero gris, un proceso cuyas entradas son claramente insuficientes para producir sus salidas, lo que indica datos ocultos o un modelo incompleto.
3. ¿Qué diferencia hay entre el diagrama de contexto y el diagrama 0?
   R: El de contexto muestra todo el sistema como un único proceso con sus entidades externas y flujos, definiendo el alcance, sin almacenes. El diagrama 0 hace zoom y muestra los procesos principales, los flujos internos y los almacenes, repitiendo las entidades y flujos del contexto.
4. ¿Qué es el balanceo y por qué se parece a una buena interfaz?
   R: Es la regla de que un diagrama hijo tenga exactamente las mismas entradas y salidas que el proceso padre. Se parece a una interfaz porque el detalle interno puede crecer sin cambiar el contrato hacia fuera.
5. ¿Cuándo usarías una tabla de decisión en lugar de un árbol de decisión?
   R: Cuando hay varias condiciones que se combinan y quieres asegurarte de cubrir todas las combinaciones (2^N reglas). El árbol es mejor cuando hay pocas condiciones con un orden natural y quieres comunicarlo de forma visual.
6. ¿Por qué el diccionario de datos documenta alias y qué concepto de DDD anticipa?
   R: Porque distintas áreas usan nombres diferentes para el mismo dato, y hacerlo explícito evita malentendidos. Anticipa el lenguaje ubicuo de DDD, que busca un vocabulario compartido y preciso entre negocio y desarrollo.

## Ejercicio

Modela el sistema de préstamos de una biblioteca pequeña: (a) diagrama de contexto con al menos 3 entidades externas (socio, bibliotecario, sistema de pagos para multas); (b) diagrama 0 con 4 a 6 procesos y al menos 3 almacenes; (c) diagrama hijo de un proceso, balanceado con su padre; (d) entradas del diccionario de datos para 5 elementos (uno con alias); (e) una tabla de decisión completa para la política de multas (condiciones: días de retraso > 7, socio estudiante, libro de alta demanda) y su implementación en TypeScript con un test parametrizado de Vitest que cubra las 8 reglas. **Terminado cuando:** ningún diagrama tiene agujeros negros, grises ni generación espontánea, el diagrama hijo tiene exactamente los mismos flujos de entrada y salida que su proceso padre y los 8 casos de la tabla pasan como tests.

## Explícalo con tus palabras

Explica con la analogía del plano de instalaciones sanitarias por qué un DFD no debería decir qué base de datos o qué framework se va a usar.
