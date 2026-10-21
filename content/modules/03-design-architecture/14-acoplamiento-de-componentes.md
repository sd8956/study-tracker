---
title: "Componentes II: acoplamiento (ADP, SDP, SAP) y métricas de estabilidad"
kind: lesson
hours: 2
sources: Clean Architecture, cap. 14 "Component Coupling" (pp. 98–115)
---

## Objetivo

Aprender a organizar las **relaciones** entre componentes: sin ciclos (ADP), dependiendo en la dirección de la estabilidad (SDP) y haciendo abstractos los componentes estables (SAP), y saber medirlo con las métricas de inestabilidad (I), abstracción (A) y distancia a la secuencia principal (D).

## Estudio

### Las fuerzas que moldean la estructura de componentes

Los principios de cohesión de la sesión anterior deciden **qué va dentro** de cada componente. Los de acoplamiento deciden **cómo se conectan** entre sí. Aquí aparece de nuevo la tensión entre la facilidad de desarrollo y el diseño lógico: las fuerzas que actúan sobre la estructura de componentes son técnicas, políticas (equipos, organización) y volátiles (cambian con el tiempo).

### ADP: el principio de dependencias acíclicas

> No permitas ciclos en el grafo de dependencias de componentes.

#### El síndrome de la mañana siguiente

¿Alguna vez dejaste algo funcionando al final del día y a la mañana siguiente ya no funcionaba? Alguien se quedó más tarde y cambió algo de lo que dependías. En equipos grandes que modifican los mismos archivos fuente, esto puede impedir durante semanas tener una versión estable.

Históricamente hubo dos soluciones:

1. **El build semanal.** Todos trabajan aislados cuatro días y el viernes integran. Funciona hasta que la integración se come el sábado, luego empieza el jueves, luego se pasa a builds quincenales... y el equipo pierde la retroalimentación rápida. Es una espiral sin salida.
2. **Dividir el entorno en componentes liberables.** Cada componente es responsabilidad de un desarrollador o equipo. Cuando un componente funciona, se libera con un número de versión, y los demás equipos deciden **cuándo** adoptar la nueva versión. Nadie está a merced de los demás y la integración ocurre en pasos pequeños.

La segunda solución solo funciona si **no hay ciclos** en la estructura de dependencias.

#### Un grafo acíclico

```
                Main
              ╱  │   ╲
            ▼    ▼     ▼
          View  Controllers  Database
           │     │    ╲        │
           ▼     ▼     ▼       │
     Presenters  Authorizer    │
           ╲     │            ╱
            ▼    ▼           ╱
           Interactors ◀────╯
                │
                ▼
             Entities
```

Es un **grafo dirigido acíclico** (DAG): empieces donde empieces, siguiendo las flechas nunca vuelves al punto de partida. Consecuencias muy prácticas:

- **Saber a quién afecta un release** es seguir las flechas hacia atrás. Si se libera `Presenters`, se ven afectados `View` y `Main`.
- **Liberar `Main` no afecta a nadie**: nadie depende de él.
- **Testear un componente** solo exige las versiones de los componentes de los que depende, no todo el sistema.
- **El orden de build está claro**: de abajo hacia arriba, `Entities`, `Interactors`, etc.

#### El efecto de un ciclo

Ahora una nueva necesidad hace que la clase `User` de `Entities` use la clase `Permissions` de `Authorizer`. Como `Authorizer` ya dependía (indirectamente) de `Entities`, se forma un ciclo: `Entities → Authorizer → Interactors → Entities`.

Problemas inmediatos:

- `Entities`, `Authorizer` e `Interactors` se convierten, en la práctica, **en un solo componente grande**: deben usar exactamente la misma versión de los otros. Vuelve el síndrome de la mañana siguiente.
- Para testear `Entities` hay que compilar e integrar `Authorizer` e `Interactors`. ¿Te has preguntado alguna vez por qué un test unitario necesita levantar media aplicación? Casi siempre hay ciclos.
- Ya no hay un orden de build correcto.

#### Cómo romper un ciclo

Siempre es posible romper un ciclo. Hay dos mecanismos:

1. **Aplicar DIP**: crear en `Entities` una interfaz con lo que `User` necesita (por ejemplo, `PermissionsChecker`) e implementarla en `Authorizer`. La dependencia se invierte y el ciclo desaparece.
2. **Crear un componente nuevo** del que dependan ambos, y mover a él las clases que ambos necesitan.

```ts
// Antes (ciclo): entities/user.ts
// import { Permissions } from "../authorizer/permissions"; ← entities depende de authorizer

// Después (DIP): la interfaz vive con quien la usa
// entities/user.ts
export interface PermissionsChecker { can(userId: string, action: string): boolean }
export class User {
  constructor(readonly id: string, private readonly perms: PermissionsChecker) {}
  canApprove() { return this.perms.can(this.id, "approve"); }
}

// authorizer/permissions.ts — ahora es authorizer quien depende de entities
// import { PermissionsChecker } from "../entities/user";
export class RolePermissions /* implements PermissionsChecker */ {
  constructor(private readonly roles: Map<string, string[]>) {}
  can(userId: string, action: string) { return this.roles.get(userId)?.includes(action) ?? false; }
}
```

En el ecosistema TypeScript, los ciclos entre módulos además pueden causar errores sutiles en tiempo de ejecución: con importaciones circulares, un módulo puede recibir un valor `undefined` porque el otro todavía no terminó de evaluarse. Herramientas como `madge` o reglas de lint (`import/no-cycle`) detectan ciclos automáticamente.

#### La estructura de componentes no se diseña de arriba hacia abajo

Una conclusión que sorprende: **la estructura de componentes no puede diseñarse al principio**. Uno esperaría que las grandes divisiones del sistema reflejaran sus funciones, pero los diagramas de dependencias de componentes tienen poco que ver con la función de la aplicación: son un **mapa de la construibilidad y mantenibilidad** del sistema. Al inicio no hay software que construir ni mantener, así que no hace falta el mapa.

A medida que se acumulan módulos, aparecen las necesidades: gestionar dependencias para evitar el síndrome de la mañana siguiente, mantener los cambios localizados (SRP, CCP), aislar la volatilidad (que los cambios cosméticos en la interfaz no afecten a las reglas de negocio), y más tarde reutilizar (CRP). Cuando aparecen ciclos, se aplica el ADP y el grafo "tiembla y crece". Si intentaras diseñar los componentes antes que las clases, no sabrías qué cambia junto ni qué se reutiliza, y probablemente crearías ciclos.

### SDP: el principio de dependencias estables

> Depende en la dirección de la estabilidad.

Un diseño no puede ser totalmente estático: algunos componentes **deben** ser volátiles (fáciles de cambiar). El problema es que un componente diseñado para ser fácil de cambiar puede volverse difícil de cambiar si otro componente difícil de cambiar depende de él. No hace falta modificar ni una línea del componente volátil: basta con que alguien le cuelgue una dependencia.

#### ¿Qué es la estabilidad?

En inglés, *stable* significa "difícil de mover". Una moneda de pie es inestable (se cae con un soplido); una mesa es estable (cuesta mucho moverla). En software, la estabilidad no tiene que ver con la frecuencia de cambio, sino con **cuánto trabajo cuesta cambiar algo**. Y una forma segura de hacer que un componente sea difícil de cambiar es que **muchos otros dependan de él**.

```
     A   B   C                         X ── depende de ──▶ P  Q  R
      ╲  │  ╱
       ▼ ▼ ▼
         X           X es ESTABLE:     Y es INESTABLE: nadie depende de Y
                     3 razones para    (irresponsable) y depende de 3
                     no cambiar        (dependiente): puede cambiar
                     (responsable) y   por muchas causas externas.
                     no depende de
                     nada (independiente).
```

#### La métrica de inestabilidad

- **Fan-in**: dependencias entrantes (clases de fuera que dependen de clases de dentro).
- **Fan-out**: dependencias salientes (clases de dentro que dependen de clases de fuera).
- **I (inestabilidad)** = Fan-out / (Fan-in + Fan-out), en el rango [0, 1].

`I = 0`: máximamente estable (muchos dependen de él y él no depende de nadie). `I = 1`: máximamente inestable (nadie depende de él y él depende de otros).

Ejemplo: tres clases de fuera dependen de clases del componente `Cc`, y una clase de `Cc` depende de algo externo: Fan-in = 3, Fan-out = 1, `I = 1/4`.

El SDP, expresado con la métrica: **la I de un componente debe ser mayor que la I de los componentes de los que depende**. Es decir, la inestabilidad debe **disminuir** en la dirección de las dependencias.

#### No todos los componentes deben ser estables

Si todo fuera máximamente estable, el sistema no podría cambiar. Queremos componentes inestables (arriba, fáciles de cambiar) que dependen de componentes estables (abajo). Por convención se dibujan los inestables arriba: **cualquier flecha que apunte hacia arriba viola el SDP** (y probablemente el ADP).

Cuando un componente estable depende de uno diseñado para ser flexible, la solución es otra vez el DIP: se crea una interfaz en un componente nuevo (por ejemplo, `UServer` con la interfaz que necesita el componente estable), de la que dependen ambos. Curiosamente, ese componente de solo interfaces es muy estable (I = 0) y eso es perfecto: las interfaces son lo que más conviene que sea estable.

### SAP: el principio de abstracciones estables

> Un componente debe ser tan abstracto como estable.

Hay software que no debería cambiar a menudo: las **decisiones de política de alto nivel** y las reglas de negocio. Debe ir en componentes estables (I = 0). Pero si ponemos las políticas en componentes estables, el código que las implementa será difícil de cambiar, y la arquitectura se vuelve rígida. ¿Cómo hacer que un componente sea estable y a la vez flexible? Con el **OCP**: siendo **abstracto**. Las clases abstractas e interfaces se pueden extender sin modificarlas.

El SAP establece la relación entre estabilidad y abstracción:

- Un componente **estable** debe ser **abstracto**, para que su estabilidad no impida extenderlo.
- Un componente **inestable** debe ser **concreto**, porque su inestabilidad permite cambiar su código fácilmente.

SDP + SAP equivalen al **DIP para componentes**: el SDP dice que las dependencias van hacia la estabilidad, y el SAP dice que la estabilidad implica abstracción; por tanto, **las dependencias van hacia la abstracción**.

#### La métrica de abstracción

- **Nc**: número de clases del componente.
- **Na**: número de clases abstractas e interfaces del componente.
- **A (abstracción)** = Na / Nc, en el rango [0, 1]. `A = 0`: ninguna abstracción. `A = 1`: solo abstracciones.

En TypeScript, cuenta como abstractos los `interface`, `type` de forma de objeto que actúan como contrato y las `abstract class`.

### La secuencia principal y las zonas de exclusión

Si graficas cada componente con A en el eje vertical e I en el horizontal, aparecen dos zonas que deberías evitar:

```
   A (abstracción)
  1 ┤ ●(0,1)                    ╲  ZONA DE
    │   máximamente estable y    ╲ INUTILIDAD
    │   abstracto: ideal          ╲ (abstracto y nadie lo usa)
    │                ╲ secuencia     ●
    │                  ╲ principal
    │ ZONA DE DOLOR      ╲
    │ (concreto y muy      ╲
    │  usado: rígido)        ╲      ●(1,0)
  0 ┼──────────────────────────╲── máximamente inestable y concreto: ideal
    0                            1   I (inestabilidad)
```

- **Zona de dolor** (cerca de 0,0): componentes muy estables y concretos. Son difíciles de cambiar (muchos dependen de ellos) y no se pueden extender (no son abstractos). Ejemplo típico: un esquema de base de datos del que dependen muchos módulos. Excepción: componentes concretos pero **no volátiles**, como la librería estándar (`String`, `Date`), que viven ahí sin dolor porque casi nunca cambian.
- **Zona de inutilidad** (cerca de 1,1): componentes muy abstractos de los que nadie depende. Abstracciones huérfanas, interfaces que nadie implementa ni usa: código muerto.
- **Secuencia principal**: la diagonal de (0,1) a (1,0). Los componentes deberían estar en ella o cerca de ella: ni demasiado abstractos para su estabilidad, ni demasiado inestables para su abstracción.

#### Distancia a la secuencia principal

- **D** = |A + I − 1|, en el rango [0, 1]. `D = 0`: el componente está sobre la secuencia principal. `D = 1`: está lo más lejos posible.

Usos prácticos: analizar el diseño para encontrar componentes con D alta que merecen revisión, establecer un umbral en CI, o graficar la D de cada componente a lo largo de las versiones para detectar si alguno se está alejando (por ejemplo, si un componente concreto empieza a ganar dependientes).

#### Un cálculo de ejemplo

| Componente | Fan-in | Fan-out | I | Nc | Na | A | D = \|A+I−1\| | Diagnóstico |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `billing-domain` | 6 | 0 | 0,00 | 10 | 6 | 0,60 | 0,40 | Estable y bastante abstracto; aceptable, podría abstraer un poco más. |
| `billing-api` | 0 | 4 | 1,00 | 8 | 0 | 0,00 | 0,00 | Inestable y concreto: perfecto. |
| `db-schema` | 9 | 1 | 0,10 | 12 | 0 | 0,00 | 0,90 | **Zona de dolor**: concreto y todos dependen de él. |
| `plugin-contracts` | 0 | 0 | — | 5 | 5 | 1,00 | — | Si nadie lo usa: **zona de inutilidad**. |

### Vigilar las reglas automáticamente

Los principios de acoplamiento se degradan en silencio: nadie decide crear un ciclo, simplemente alguien agrega un import un viernes por la tarde. Por eso conviene que una herramienta los vigile en cada pull request. En el ecosistema TypeScript, `dependency-cruiser` permite escribir reglas como estas:

```js
// .dependency-cruiser.cjs (extracto)
module.exports = {
  forbidden: [
    { name: "no-cycles", severity: "error", from: {}, to: { circular: true } },
    {
      name: "domain-no-infra",
      comment: "Las reglas de negocio no dependen de la infraestructura (SDP/DIP)",
      severity: "error",
      from: { path: "^src/domain" },
      to: { path: "^src/(infrastructure|api)" },
    },
  ],
};
```

Con dos reglas cubres lo esencial del ADP y del SDP: no hay ciclos, y lo estable (el dominio) no depende de lo volátil (infraestructura y API). Las métricas I, A y D son más útiles como informe periódico que como regla bloqueante: revisa cada cierto tiempo qué componentes se alejan de la secuencia principal y pregúntate por qué. Una D que sube release tras release suele ser el primer síntoma de un componente que se está convirtiendo en el "módulo que nadie quiere tocar".

### Analogía de construcción

Piensa en un edificio. Los **cimientos** son lo más estable (todo depende de ellos) y por eso deben diseñarse como especificaciones generales, no como detalles que cambian: son "abstractos" en el sentido de que soportan cualquier distribución de pisos. Los **acabados** (pintura, lámparas, muebles) son inestables y concretos: nada depende de ellos y puedes cambiarlos cuando quieras. La **zona de dolor** es una tubería concreta empotrada en la losa de la que dependen todos los baños: cambiarla obliga a romper medio edificio. La **zona de inutilidad** es un ducto de servicio enorme que se dejó "por si acaso" y que ninguna instalación usa. Y un **ciclo** sería una pared que sostiene la viga que la sostiene a ella: no hay orden en el que puedas construir (o demoler) una sin la otra.

### Resumen visual de los tres principios

Piensa en el grafo de componentes como un río: el ADP dice que el agua nunca vuelve a subir (sin ciclos), el SDP dice que corre desde lo inestable hacia lo estable, y el SAP dice que, a medida que baja y se vuelve más estable, también se vuelve más abstracta. En la desembocadura están las interfaces y las reglas de negocio; en las fuentes, los adaptadores, las vistas y los detalles concretos que cambian todo el tiempo.

### Errores comunes

- **Ignorar ciclos "porque compila".** Los ciclos aparecen como builds lentos, tests que necesitan media aplicación y valores `undefined` por imports circulares.
- **Componentes estables y concretos** de los que dependen todos (modelos ORM compartidos por todo el sistema).
- **Interfaces en el componente equivocado.** La interfaz debe vivir con quien la usa (el componente estable), no con quien la implementa.
- **Abstracciones sin uso.** Paquetes de "contratos" que nadie implementa son ruido.
- **Tomar las métricas como dogma.** Son señales para investigar, no notas para optimizar.

### Resumen

El ADP prohíbe ciclos entre componentes porque los ciclos fusionan componentes, impiden releases independientes y complican tests y builds; se rompen con DIP o con un componente nuevo. La estructura de componentes evoluciona con el sistema y no se diseña al inicio. El SDP pide depender hacia la estabilidad (I decreciente), y el SAP pide que lo estable sea abstracto; juntos son el DIP de los componentes. Las métricas I, A y D, y la secuencia principal con sus zonas de dolor e inutilidad, permiten medir y vigilar la salud de la estructura.

## Conceptos clave

- **ADP**: no debe haber ciclos en el grafo de dependencias de componentes.
- **DAG**: grafo dirigido acíclico; en él, seguir las dependencias nunca te devuelve al inicio.
- **Síndrome de la mañana siguiente**: lo que funcionaba deja de hacerlo porque otro cambió algo de lo que dependías.
- **SDP**: depende en la dirección de la estabilidad.
- **Estabilidad**: dificultad para cambiar un componente, determinada por cuántos dependen de él.
- **Inestabilidad (I)**: Fan-out / (Fan-in + Fan-out).
- **SAP**: un componente debe ser tan abstracto como estable.
- **Abstracción (A)**: proporción de clases abstractas e interfaces en un componente.
- **Secuencia principal**: diagonal ideal entre (A=1, I=0) y (A=0, I=1).
- **Zona de dolor / de inutilidad**: componentes estables y concretos / abstractos y sin dependientes.
- **Distancia (D)**: |A + I − 1|, cuánto se aleja un componente de la secuencia principal.

## Preguntas de repaso

1. ¿Qué problemas causa un ciclo entre componentes?
   R: Los componentes del ciclo se comportan como uno solo y deben usar exactamente las mismas versiones entre sí; reaparece el síndrome de la mañana siguiente, los tests de un componente requieren compilar e integrar los demás y deja de existir un orden de build correcto.
2. ¿Cuáles son las dos formas de romper un ciclo?
   R: Aplicar DIP, creando una interfaz en el componente que necesita la funcionalidad e implementándola en el otro, o crear un componente nuevo del que dependan ambos y mover allí las clases compartidas.
3. ¿Por qué no se puede diseñar la estructura de componentes al principio del proyecto?
   R: Porque refleja la construibilidad y mantenibilidad, no la función. Al principio no se sabe qué cambia junto, qué se reutiliza ni dónde aparecerán ciclos; la estructura emerge y evoluciona con el diseño lógico.
4. Calcula I para un componente con Fan-in 2 y Fan-out 6 e interprétalo.
   R: I = 6 / (2 + 6) = 0,75. Es bastante inestable: depende de muchos otros y pocos dependen de él, así que es fácil de cambiar y debería ser mayormente concreto.
5. ¿Cómo se relacionan SDP, SAP y DIP?
   R: El SDP dice que las dependencias deben ir hacia lo estable y el SAP que lo estable debe ser abstracto; combinados, las dependencias deben ir hacia lo abstracto, que es el DIP aplicado a componentes.
6. ¿Qué es la zona de dolor y por qué la librería estándar puede estar en ella sin problema?
   R: Es la región de componentes muy estables y concretos: difíciles de cambiar y de extender. La librería estándar está ahí pero no duele porque no es volátil: casi nunca cambia, así que su rigidez no causa problemas.
7. ¿Para qué sirve la métrica D en la práctica?
   R: Para detectar componentes alejados de la secuencia principal que merecen revisión, fijar umbrales en la integración continua y seguir su evolución entre versiones para descubrir componentes que se están volviendo rígidos o inútiles.

## Ejercicio

Escribe un script en TypeScript (ejecutable con `tsx`) que reciba un directorio, trate cada subcarpeta de primer nivel como un componente y calcule, leyendo los `import` relativos de los archivos `.ts`: Fan-in, Fan-out, I, Nc, Na (cuenta `interface`, `abstract class` y `type X = {`), A y D. Debe además detectar ciclos entre componentes e imprimirlos. Pruébalo con una carpeta de ejemplo donde provoques a propósito un ciclo y un componente en la zona de dolor. **Terminado cuando:** el script imprime una tabla con las métricas por componente, lista los ciclos encontrados, hay tests con Vitest para el cálculo de métricas sobre un grafo pequeño en memoria y aplicaste DIP para romper el ciclo de la carpeta de ejemplo (la segunda ejecución no reporta ciclos).

## Explícalo con tus palabras

Explica con la analogía de los cimientos y los acabados por qué lo estable debe ser abstracto y lo inestable debe ser concreto.
