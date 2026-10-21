---
title: "Modelado de requisitos: descubrir qué debe hacer el sistema"
kind: lesson
hours: 2
sources: Systems Analysis and Design 9.ª ed., cap. 4 "Requirements Modeling" (pp. 162–200)
---

## Objetivo

Aprender a descubrir, organizar y documentar los requisitos de un sistema antes de diseñarlo: técnicas de equipo (JAD, RAD, ágil), herramientas de modelado, la lista de verificación de requisitos (salidas, entradas, procesos, rendimiento, controles) y las técnicas de levantamiento de información, empezando por la entrevista.

## Estudio

### Por qué un arquitecto necesita saber levantar requisitos

Todo lo que has visto en el módulo (patrones, SOLID, componentes) responde a una pregunta: **¿qué va a cambiar?** Y esa pregunta no se responde mirando código, sino entendiendo el negocio: quiénes son los actores, qué necesitan, qué reglas aplican y qué es probable que cambie. Un diseño elegante para el problema equivocado es el error más caro de todos.

El libro de Shelly y Rosenblatt describe la **fase de análisis de sistemas**, cuyo objetivo es entender el proyecto propuesto, asegurar que soporte los requisitos del negocio y construir una base sólida para el desarrollo. Tiene cuatro actividades que interactúan entre sí:

```
┌───────────────────────┐   ┌───────────────────────────┐   ┌────────────────────┐
│ Modelado de requisitos │◀─▶│ Modelado de datos y        │◀─▶│ Modelado de objetos │
│ (esta sesión)          │   │ procesos (sesión 17)       │   │ UML (sesión 18)     │
└───────────────────────┘   └───────────────────────────┘   └────────────────────┘
                     │                    │                          │
                     └──────────▶ Estrategias de desarrollo ◀────────┘
                                         │
                                         ▼
                         Documento de requisitos del sistema
```

Aunque el modelo en cascada las dibuja en secuencia, en la práctica se retroalimentan: cuando el modelado de datos revela un hecho nuevo, vuelves a los requisitos.

### Los cinco tipos de requisitos

El **modelado de requisitos** consiste en investigar el sistema actual (fact-finding) e identificar los requisitos del nuevo. El libro los agrupa en cinco categorías, que son una excelente lista de verificación:

| Categoría | Qué describe | Ejemplo para una app de reservas |
| --- | --- | --- |
| **Salidas** | Información que el sistema produce (pantallas, reportes, notificaciones, archivos). | "El sistema enviará un correo de confirmación con el código de reserva en menos de 1 minuto." |
| **Entradas** | Datos que entran al sistema, manualmente o de forma automática. | "El usuario ingresará fecha, hora y número de personas; el sistema validará que la fecha no sea pasada." |
| **Procesos** | Reglas lógicas que transforman datos en información útil. | "Una mesa no puede tener dos reservas que se solapen; las reservas no confirmadas expiran a los 15 minutos." |
| **Rendimiento** | Velocidad, volumen, capacidad, disponibilidad, confiabilidad. | "El sistema soportará 200 reservas por minuto en hora pico con 99,9 % de disponibilidad." |
| **Controles (seguridad)** | Controles de hardware, software y procedimientos que protegen el sistema y sus datos. | "Solo el gerente puede anular reservas de otros; todas las anulaciones quedan registradas con usuario y hora." |

En el vocabulario moderno, las tres primeras suelen llamarse **requisitos funcionales** y las dos últimas **requisitos no funcionales** (o atributos de calidad). Los no funcionales son los que más influyen en la arquitectura: un requisito de 10 reservas por minuto y uno de 10 000 llevan a diseños muy distintos.

#### Crecimiento futuro, costos y beneficios

Además de los requisitos actuales, el análisis debe considerar:

- **Escalabilidad**: la capacidad del sistema para manejar más volumen de negocio y transacciones en el futuro. Un sistema escalable ofrece un horizonte de vida más largo. Pregunta típica: "¿Cuántos restaurantes usarán esto en dos años?".
- **Costo total de propiedad (TCO)**: no solo el costo de construir, sino de operar, mantener, dar soporte y capacitar durante toda la vida del sistema. Los costos ocultos (soporte, tiempo de los usuarios, licencias) suelen superar al desarrollo. Aquí conecta directamente con la meta de Clean Architecture: minimizar el esfuerzo de mantener.

### Técnicas de equipo: JAD, RAD y métodos ágiles

El objetivo del departamento de tecnología es entregar el mejor sistema posible, al menor costo y en el menor tiempo. Para lograrlo, los usuarios dejan de ser fuente pasiva de información y se convierten en **socios**.

#### JAD (Joint Application Development)

Una técnica de levantamiento de requisitos en la que usuarios, gerentes y profesionales de TI trabajan juntos, durante días o semanas, en sesiones intensivas lejos de las distracciones del día a día. Roles típicos:

| Rol | Responsabilidad |
| --- | --- |
| Líder del proyecto JAD | Prepara la agenda, facilita y dirige las sesiones. |
| Patrocinador ejecutivo | Da autorización y apoyo a nivel de empresa. |
| Gerentes | Dan apoyo a nivel de departamento y explican cómo el proyecto soporta las funciones del negocio. |
| Usuarios | Aportan la visión operativa: cómo se trabaja hoy, qué debe cambiar, entradas, salidas, interfaz. |
| Analistas y personal de TI | Preguntan, toman notas, modelan, explican lo técnico. |
| Secretario (recorder) | Documenta resultados y decisiones. |

**Ventajas:** mayor participación de los usuarios, mejor definición del sistema, más compromiso. **Desventajas:** más caro y difícil de coordinar con grupos grandes.

#### RAD (Rapid Application Development)

Es como una versión condensada de todo el ciclo de vida, con los usuarios involucrados en cada paso. Tiene cuatro fases: **planificación de requisitos**, **diseño con el usuario** (un ciclo continuo e interactivo en el que los usuarios ven y modifican prototipos), **construcción** y **transición** (cutover). El objetivo es reducir tiempo y costo; el riesgo es priorizar la velocidad sobre la calidad y la escalabilidad, o descuidar los problemas de largo plazo.

#### Métodos ágiles

Enfatizan la interacción intensa entre desarrolladores y usuarios, entregando funcionalidad en iteraciones cortas y ajustando según la retroalimentación (Scrum es el ejemplo más conocido). **Ventajas:** flexibilidad, adaptación a requisitos cambiantes, entregas tempranas. **Riesgos:** sin cierta disciplina, el diseño puede degradarse con cada iteración ("lo limpiamos después") y es difícil estimar proyectos grandes. Aquí es donde todo lo que aprendiste de arquitectura se vuelve indispensable: el desarrollo iterativo **solo funciona si el costo del cambio se mantiene bajo**.

### Herramientas y técnicas de modelado

Un **modelo** es una representación simplificada que ayuda a entender y comunicar. El capítulo introduce varias herramientas que verás con detalle en las próximas sesiones:

| Herramienta | Qué muestra | Sesión |
| --- | --- | --- |
| Diagrama de descomposición funcional (FDD) | La organización de un sistema o proceso de arriba abajo, como un organigrama de funciones. | Aquí |
| Modelado de procesos de negocio (BPM) | Cómo fluyen el trabajo y las decisiones en el negocio, con notación como BPMN y "carriles" (swim lanes) por rol. | Aquí |
| Diagrama de flujo de datos (DFD) | Cómo se mueven y transforman los datos. | 17 |
| UML: casos de uso | Interacción entre actores y sistema. | 18 |
| UML: diagrama de secuencia | Mensajes entre objetos a lo largo del tiempo. | 18 |

Un FDD para el sistema de reservas podría verse así:

```
                     Sistema de reservas
          ┌──────────────┬──────┴───────┬───────────────┐
     Gestionar       Gestionar      Gestionar        Reportes
     reservas        mesas          clientes
     ├ Crear         ├ Alta/baja    ├ Registrar      ├ Ocupación diaria
     ├ Confirmar     ├ Capacidad    ├ Historial      └ No-shows por mes
     ├ Cancelar      └ Horarios     └ Preferencias
     └ Expirar
```

Útil para ver el alcance completo y detectar funciones olvidadas, aunque no dice nada del orden ni de los datos.

### Fact-finding: averiguar los hechos

El levantamiento de información responde a las preguntas clásicas: **quién, qué, dónde, cuándo, cómo y por qué**. Y aquí el libro hace una distinción muy valiosa entre el sistema **actual** y el **propuesto**:

| Sistema actual | Sistema propuesto |
| --- | --- |
| ¿Quién lo hace? | ¿Quién **debería** hacerlo? |
| ¿Qué se hace? | ¿Qué **debería** hacerse? |
| ¿Dónde se hace? | ¿Dónde **debería** hacerse? |
| ¿Cuándo se hace? | ¿Cuándo **debería** hacerse? |
| ¿Cómo se hace? | ¿Cómo **debería** hacerse? |
| **¿Por qué se hace?** | |

La pregunta "¿por qué?" es la más importante y la que más se olvida. Muchos procesos existen por razones que ya no aplican ("lo imprimimos porque antes el gerente no tenía computadora"). Automatizar un proceso inútil solo lo hace inútil más rápido.

#### Entrevistas: el proceso en siete pasos

La entrevista es la técnica más importante. El libro propone un proceso:

1. **Determinar a quién entrevistar.** Personas clave de todos los niveles afectados, incluidos los informales: quien realmente sabe cómo funciona algo no siempre es quien figura en el organigrama.
2. **Establecer los objetivos** de la entrevista: qué áreas cubrir y qué información necesitas de cada persona.
3. **Preparar la entrevista**: agenda, preguntas, documentos previos, reservar tiempo y avisar al entrevistado qué temas se tratarán.
4. **Diseñar las preguntas**, combinando tres tipos:
   - **Abiertas**: invitan a respuestas libres. "¿Qué es lo más difícil de gestionar reservas hoy?"
   - **Cerradas**: limitan las respuestas, útiles para verificar hechos. "¿Cuántas reservas reciben un sábado?"
   - **De rango de respuesta**: cerradas con una escala. "Del 1 al 5, ¿qué tan grave es el problema de los no-shows?"
5. **Realizar la entrevista**: puntualidad, presentarse, explicar el propósito, escuchar más que hablar, no influir en las respuestas y resumir al final. Hay que estar atento al lenguaje corporal y a la información que aparece "de pasada".
6. **Documentar la entrevista** lo antes posible, idealmente el mismo día, mientras los detalles están frescos. Enviar un resumen al entrevistado para que lo confirme.
7. **Evaluar la entrevista**: ¿qué aprendiste?, ¿hay contradicciones con otras fuentes?, ¿hay sesgos (alguien que exagera un problema por interés propio)?

#### Otras técnicas de levantamiento

| Técnica | Para qué sirve | Cuidado con… |
| --- | --- | --- |
| **Revisión de documentos** | Entender formularios, reportes, manuales y procedimientos actuales. | Los documentos suelen estar desactualizados respecto a la práctica real. |
| **Observación** | Ver cómo se trabaja realmente; verificar lo dicho en entrevistas. | El *efecto Hawthorne*: la gente trabaja distinto cuando se siente observada. |
| **Cuestionarios y encuestas** | Obtener información de muchas personas a bajo costo. | Diseñar preguntas claras y evitar las que sugieren la respuesta. |
| **Muestreo (sampling)** | Analizar una muestra representativa de registros o documentos (sistemática, estratificada, aleatoria). | Muestras sesgadas producen conclusiones falsas. |
| **Investigación** | Revistas, foros, proveedores, otras empresas, sitios especializados. | Que una solución funcione en otra empresa no garantiza que funcione en la tuya. |
| **Lluvia de ideas (brainstorming)** | Generar ideas en grupo sin juzgarlas al inicio. | Que unos pocos dominen la sesión. |

En equipos de software modernos, a esta lista se suman los **talleres de event storming** (que verás con DDD) y el análisis de datos de uso del sistema actual (logs, métricas, analítica de producto).

### Documentar: de los hechos a requisitos verificables

El libro insiste en documentar todo: notas de entrevistas, cuestionarios, muestras, decisiones, en un formato que el equipo pueda consultar. Un buen requisito es **específico, verificable y sin ambigüedad**. Compara:

| Mal requisito | Requisito verificable |
| --- | --- |
| "El sistema debe ser rápido." | "El 95 % de las búsquedas de disponibilidad responde en menos de 300 ms con 200 usuarios concurrentes." |
| "Debe ser seguro." | "Solo los usuarios con rol gerente pueden anular reservas ajenas; cada anulación registra usuario, hora y motivo." |
| "Fácil de usar." | "Un cliente nuevo completa una reserva en menos de 60 segundos sin ayuda en el 90 % de las pruebas con usuarios." |

En el mundo ágil, estos requisitos se escriben a menudo como **historias de usuario con criterios de aceptación**, que puedes convertir directamente en tests:

```
Historia: Como cliente quiero reservar una mesa para no hacer fila.
Criterios de aceptación:
  Dado que la mesa 4 tiene reserva de 20:00 a 22:00
  Cuando intento reservar la mesa 4 de 21:00 a 23:00
  Entonces el sistema rechaza la reserva con el motivo "horario ocupado"
```

```ts
// El criterio de aceptación convertido en un test ejecutable
import { expect, test } from "vitest";
import { reserve } from "./reservations";

test("rechaza reservas que se solapan", () => {
  const existing = [{ table: 4, from: "20:00", to: "22:00" }];
  expect(reserve(existing, { table: 4, from: "21:00", to: "23:00" }))
    .toEqual({ ok: false, reason: "horario ocupado" });
});
```

### De los requisitos a las decisiones de diseño

Los requisitos no son solo una lista para el equipo de pruebas: son la materia prima de las decisiones de arquitectura que estudiaste en las sesiones anteriores. Un ejercicio muy útil es leer cada requisito y preguntarte **qué decisión de diseño fuerza o qué punto de variación anticipa**:

| Requisito levantado | Pista de diseño |
| --- | --- |
| "Hoy cobramos con una pasarela, pero el año que viene queremos otra más barata." | Variación del proveedor: un puerto `PaymentGateway` con un adaptador por pasarela (Adapter, DIP). |
| "Las reglas de cancelación cambian por temporada y las define el gerente." | Variación de política: Strategy o reglas como datos configurables. |
| "Cuando se confirma una reserva, hay que avisar al cliente, al restaurante y a contabilidad." | Reacciones independientes: eventos y Observer. |
| "Una reserva pasa por pendiente, confirmada, sentada, completada o no-show." | Ciclo de vida con reglas por estado: State o máquina de estados. |
| "Contabilidad y operaciones piden reportes distintos con los mismos datos." | Dos actores: separar por SRP para evitar la duplicación accidental. |
| "Debe soportar 200 reservas por minuto en hora pico." | Requisito de rendimiento: concurrencia sobre la misma mesa, restricciones únicas, caché de disponibilidad. |

Fíjate en que las pistas aparecen en las palabras del usuario: "hoy... pero el año que viene", "cambian por temporada", "cuando pasa X hay que avisar a Y". Aprender a escuchar esas frases en una entrevista es lo que convierte a un buen analista en un buen arquitecto. Y también sirve en sentido contrario: si ningún usuario menciona que algo va a variar, probablemente no necesitas una abstracción para ello todavía.

Por último, mantén la **trazabilidad**: cada requisito con un identificador (R-12) que aparezca en el ticket, en el test que lo verifica y, si es una decisión importante, en un registro de decisiones de arquitectura. Cuando dentro de un año alguien pregunte "¿por qué esto es tan complicado?", la respuesta estará escrita.

### Analogía de construcción

Antes de diseñar una casa, un buen arquitecto entrevista a la familia: cuántos son, cómo cocinan, si trabajan desde casa, si piensan tener hijos o cuidar a un familiar mayor (escalabilidad), cuánto pueden gastar en mantenimiento (costo total). Visita la casa actual para ver cómo viven realmente (observación) y revisa las escrituras y la normativa (revisión de documentos). Y siempre pregunta "¿por qué?": quizás quieren un cuarto de huéspedes porque la abuela los visita dos veces al año, y un sofá cama resolvería lo mismo por mucho menos.

### Errores comunes

- **Ir directo a la solución.** "Quieren una app" no es un requisito; el requisito es el problema que la app resolvería.
- **Entrevistar solo a los jefes.** Los usuarios operativos conocen las excepciones que hacen fracasar los sistemas.
- **Requisitos no verificables** ("rápido", "intuitivo", "robusto").
- **Ignorar los no funcionales** hasta que es tarde: rendimiento, seguridad y disponibilidad definen la arquitectura.
- **No preguntar "¿por qué?"** y automatizar procesos que deberían eliminarse.
- **No documentar el mismo día.** Los detalles se pierden en horas.

### Resumen

El modelado de requisitos descubre qué debe hacer el sistema mediante fact-finding y lo organiza en salidas, entradas, procesos, rendimiento y controles, considerando escalabilidad y costo total de propiedad. Las técnicas de equipo (JAD, RAD, ágil) convierten a los usuarios en socios. La entrevista sigue un proceso de siete pasos con preguntas abiertas, cerradas y de rango, y se complementa con revisión de documentos, observación, encuestas, muestreo e investigación. El resultado deben ser requisitos específicos y verificables, idealmente convertibles en tests.

## Conceptos clave

- **Modelado de requisitos**: investigar el sistema actual e identificar los requisitos del nuevo.
- **Requisitos funcionales y no funcionales**: lo que el sistema hace (salidas, entradas, procesos) frente a cómo debe hacerlo (rendimiento, seguridad, disponibilidad).
- **Escalabilidad**: capacidad de manejar más volumen de negocio en el futuro.
- **Costo total de propiedad (TCO)**: costo de construir, operar, mantener y dar soporte durante toda la vida del sistema.
- **JAD**: sesiones conjuntas de usuarios, gerentes y TI para definir requisitos.
- **RAD**: ciclo de desarrollo acelerado con usuarios involucrados en todas las fases y prototipos iterativos.
- **Fact-finding**: levantamiento de información sobre quién, qué, dónde, cuándo, cómo y por qué.
- **Preguntas abiertas, cerradas y de rango de respuesta**: tipos de preguntas de entrevista según la libertad de la respuesta.
- **Efecto Hawthorne**: cambio de comportamiento de las personas al sentirse observadas.
- **Criterio de aceptación**: condición verificable que define cuándo un requisito está cumplido.

## Preguntas de repaso

1. ¿Cuáles son las cinco categorías de requisitos del libro y cuáles influyen más en la arquitectura?
   R: Salidas, entradas, procesos, rendimiento y controles (seguridad). Las de rendimiento y controles, que hoy se llaman requisitos no funcionales, influyen más en la arquitectura porque determinan escala, disponibilidad, aislamiento y protección de datos.
2. ¿Por qué la pregunta "¿por qué?" es especial en el fact-finding?
   R: Porque solo se pregunta sobre el sistema actual y revela si un proceso sigue teniendo sentido. Muchos procesos existen por razones obsoletas, y automatizarlos sin cuestionarlos solo los hace ineficientes más rápido.
3. ¿Qué diferencia hay entre JAD y RAD?
   R: JAD es una técnica de levantamiento y definición de requisitos mediante sesiones conjuntas de usuarios, gerentes y TI. RAD es un enfoque de desarrollo completo y acelerado (planificación, diseño con el usuario, construcción y transición) con usuarios involucrados en cada fase y prototipos iterativos.
4. ¿Cuándo usarías preguntas cerradas y cuándo abiertas en una entrevista?
   R: Abiertas para explorar, entender problemas y descubrir lo inesperado; cerradas para obtener datos concretos o verificar hechos; de rango de respuesta para que la persona evalúe algo en una escala comparable.
5. ¿Qué es el efecto Hawthorne y qué técnica afecta?
   R: Es el cambio de comportamiento de las personas cuando saben que las observan. Afecta a la observación como técnica de levantamiento: lo que ves puede no ser cómo trabajan normalmente.
6. Convierte "el sistema debe ser rápido" en un requisito verificable.
   R: Por ejemplo: "el 95 % de las consultas de disponibilidad responde en menos de 300 ms con 200 usuarios concurrentes, medido en el entorno de staging con datos de producción anonimizados". Tiene métrica, umbral, condición de carga y forma de medirlo.

## Ejercicio

Elige un proceso real que conozcas (la app de este curso, la gestión de turnos de un consultorio o el inventario de una tienda pequeña). Prepara una guía de entrevista con 5 preguntas abiertas, 5 cerradas y 3 de rango de respuesta; haz la entrevista (a alguien real o simulándola por escrito) y documenta: (a) un FDD en ASCII, (b) una tabla de requisitos con al menos 3 por cada una de las cinco categorías, todos verificables, y (c) 3 historias de usuario con criterios de aceptación en formato Dado/Cuando/Entonces, una de ellas convertida en un test con Vitest. **Terminado cuando:** ningún requisito usa palabras vagas ("rápido", "fácil", "seguro") sin métrica, cada categoría tiene al menos 3 requisitos y el test del criterio de aceptación corre (puede fallar si la función aún no existe, pero debe compilar contra una firma definida).

## Explícalo con tus palabras

Explica a alguien que quiere "una app para su negocio" por qué tus primeras preguntas son sobre su trabajo y no sobre pantallas, usando la analogía del arquitecto que entrevista a la familia.
