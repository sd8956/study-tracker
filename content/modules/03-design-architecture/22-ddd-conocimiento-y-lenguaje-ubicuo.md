---
title: "DDD I: destilar conocimiento, lenguaje ubicuo y diseño guiado por el modelo"
kind: lesson
hours: 2
sources: Domain-Driven Design (Evans), prefacio y parte I, caps. 1–3 (pp. 7–48)
links: Martin Fowler, "Ubiquitous Language" | https://martinfowler.com/bliki/UbiquitousLanguage.html
---

## Objetivo

Entender el punto de partida de Domain-Driven Design: el corazón del software es el **dominio** del negocio, el modelo se construye en colaboración con los expertos mediante un proceso continuo de "triturar conocimiento", se expresa en un **lenguaje ubicuo** compartido y debe estar **ligado directamente al código** (model-driven design), escrito por personas que modelan y programan a la vez.

## Estudio

### El problema que ataca DDD

En el bloque anterior aprendiste a levantar requisitos y a modelar con DFD, UML y ERD. Eric Evans señala una trampa frecuente: equipos que producen modelos de análisis detallados que **luego no sirven para escribir el código**, y equipos que escriben código sin ningún modelo. Lo curioso es que ambos caminos terminan en lo mismo: software que funciona pero que es difícil de entender, inflado e imposible de mantener, porque el código no refleja el conocimiento del negocio.

El subtítulo del libro lo resume: *abordar la complejidad en el corazón del software*. La complejidad más difícil de muchos sistemas no es técnica, sino del **dominio**: las reglas de un seguro, de la logística de transporte marítimo, de un banco. Si el equipo no entiende el dominio y no lo plasma en el diseño, ninguna tecnología lo salva.

### Qué es un modelo

Un **modelo** es una simplificación: una interpretación de la realidad que abstrae los aspectos relevantes para resolver un problema e ignora el resto. Un mapa del metro no muestra las calles ni las distancias reales, y justamente por eso es útil para moverse en metro. El modelo del dominio no es un diagrama concreto: es **el conjunto de conceptos que comparten las personas del proyecto**, con sus términos y relaciones. Los diagramas, documentos y código son formas de expresarlo.

En DDD el modelo cumple tres funciones a la vez:

1. **Da forma al diseño**: el modelo y la implementación están ligados, así que el modelo es relevante y entender el modelo permite entender el código.
2. **Es la columna vertebral del lenguaje** del equipo: desarrolladores y expertos pueden hablar sin traducir.
3. **Es conocimiento destilado**: la forma acordada de estructurar el conocimiento del dominio y de distinguir lo importante.

### Destilar (triturar) el conocimiento

Evans cuenta su experiencia diseñando una herramienta para el diseño de circuitos impresos (PCB) sin saber nada de electrónica. Pedirles a los ingenieros "díganme exactamente qué debe hacer el software" fracasó: sus ideas se limitaban a leer archivos, ordenarlos y producir reportes. Lo que funcionó fue otra cosa:

- Notó que todos los reportes que pedían hablaban de **"nets"** (conductores que conectan pines de componentes). Ese fue el primer elemento del modelo.
- Empezó a **dibujar diagramas informales** mientras conversaban, recorriendo escenarios concretos ("una señal llega a una net y se propaga a los pines conectados").
- Los expertos lo corregían constantemente ("no son chips, son *instancias de componente*"; "no basta con decir que la señal llega a un componente, hay que saber a qué *pin*"), y en ese ida y vuelta **ambos aprendían**: él el dominio, ellos a expresarse con más precisión.
- Para enfocarse, eligieron **una sola funcionalidad** (la simulación de una sonda que detecta caminos de señal demasiado largos) y dejaron fuera conceptos que no hacían falta para ella, como la topología de las nets.
- Muy pronto escribió un **prototipo mínimo** guiado por tests, sin base de datos ni interfaz, que hacía el cálculo real con objetos del modelo. Ver el modelo funcionando cambió la conversación: los expertos daban retroalimentación concreta.

Este proceso es lo que Evans llama **knowledge crunching** (triturar conocimiento): un equipo de desarrolladores y expertos procesa un torrente de información, prueba modelos, descarta los que no funcionan y conserva un conjunto de abstracciones que explica el dominio de forma útil.

#### Ingredientes de un modelado eficaz

| Ingrediente | Qué significa |
| --- | --- |
| **Ligar modelo e implementación** pronto | Un prototipo crudo que conecte el modelo con el código, mantenido en cada iteración. |
| **Cultivar un lenguaje basado en el modelo** | Expertos y desarrolladores hablan con los términos del modelo; las frases mal formadas revelan errores del modelo. |
| **Modelo rico en conocimiento** | Los objetos tienen comportamiento y hacen cumplir reglas; el modelo no es un esquema de datos. |
| **Destilar el modelo** | Se agregan conceptos importantes y, con igual importancia, **se eliminan** los que dejaron de ser útiles. |
| **Lluvia de ideas y experimentación** | El lenguaje y los bocetos convierten las conversaciones en laboratorios de modelos. |

#### El aprendizaje continuo

Los equipos pierden conocimiento constantemente: la gente rota, la documentación se queda vieja. Un modelo que vive en el código y en el lenguaje del equipo es la forma más duradera de conservar el conocimiento del negocio. Y el aprendizaje no termina: los mejores avances de un modelo suelen llegar tarde, cuando el equipo entiende el dominio lo bastante como para ver una forma más profunda de expresarlo.

#### Conocimiento implícito que se vuelve explícito

Evans da un ejemplo de reservas de carga en barcos. La regla del negocio es que se acepta un 10 % de **sobreventa** de la capacidad, porque siempre hay cancelaciones. La primera versión del código esconde la regla en una línea de un método:

```ts
// Regla escondida: nadie que lea esto sabe que existe una "política de sobreventa"
function makeBooking(cargo: Cargo, voyage: Voyage): number {
  const max = voyage.capacity * 1.1;
  if (voyage.bookedCargoSize() + cargo.size > max) return -1;
  return voyage.addCargo(cargo);
}
```

El modelo mejora cuando el concepto se hace **explícito** con un nombre que los expertos reconocen:

```ts
export interface OverbookingPolicy {
  isAllowed(cargo: Cargo, voyage: Voyage): boolean;
}

export const tenPercentOverbooking: OverbookingPolicy = {
  isAllowed: (cargo, voyage) =>
    voyage.bookedCargoSize() + cargo.size <= voyage.capacity * 1.1,
};

export function makeBookingExplicit(cargo: Cargo, voyage: Voyage, policy: OverbookingPolicy) {
  if (!policy.isAllowed(cargo, voyage)) return { ok: false as const, reason: "excede la política de sobreventa" };
  return { ok: true as const, confirmation: voyage.addCargo(cargo) };
}

interface Cargo { size: number }
interface Voyage { capacity: number; bookedCargoSize(): number; addCargo(c: Cargo): number }
```

Ahora un experto en transporte puede leer `OverbookingPolicy` y decir "sí, así lo llamamos". Fíjate en que técnicamente es un **Strategy** (sesión 8). DDD no inventa nuevas técnicas de programación: te dice **cuándo y por qué** usarlas, y que el nombre debe salir del dominio.

### El lenguaje ubicuo

Sin un lenguaje común, el proyecto se llena de traducciones: los expertos hablan su jerga, los desarrolladores la suya, y unos pocos "bilingües" se convierten en cuellos de botella que traducen de forma imprecisa. La traducción oculta malentendidos, enturbia los conceptos del modelo y produce código que no encaja entre sí. Peor aún, los distintos miembros del equipo usan términos de forma diferente **sin darse cuenta**.

La solución es un **LENGUAJE UBICUO** (ubiquitous language): un lenguaje basado en el modelo que el equipo usa **en todas partes**:

- En las conversaciones entre desarrolladores y con los expertos.
- En los diagramas y documentos.
- En el código: nombres de clases, métodos, módulos, eventos.
- En los tests.

Y con una regla importante: **un cambio en el lenguaje es un cambio en el modelo**. Si el equipo decide que lo que llamaban "envío" en realidad son dos cosas distintas ("carga" y "viaje"), el código se refactoriza para reflejarlo.

#### Hablar en voz alta el modelo

Evans propone una técnica sencilla: **decir en voz alta** frases que describan escenarios usando los términos del modelo. Las frases torpes o imposibles revelan problemas del modelo. Compara estas tres formas de describir el mismo cambio en un sistema de rutas de carga:

1. "Si cambiamos el puerto de destino, hay que borrar el objeto de ruta y crear uno nuevo con los IDs de los segmentos de la tabla de rutas." *(Habla de la implementación.)*
2. "Si cambiamos el destino, hay que recalcular las ubicaciones intermedias y elegir los segmentos de transporte." *(Mejor, pero aún vago.)*
3. "Si cambia algún atributo de la **especificación de ruta**, se descarta el **itinerario** actual y el **servicio de rutas** genera uno nuevo a partir de la nueva especificación." *(Usa el lenguaje del modelo: preciso y comprensible para el experto.)*

La tercera frase muestra un modelo maduro: cada sustantivo es un concepto del dominio y cada verbo, una operación del modelo.

#### Un modelo, un lenguaje (dentro de un contexto)

El lenguaje ubicuo supone que hay **un solo modelo** en juego. En sistemas grandes eso no es posible: "cliente" no significa lo mismo para ventas que para soporte. Evans resolverá esto con los **bounded contexts** (sesión 27): el lenguaje es ubicuo **dentro** de un contexto delimitado.

#### Documentos y diagramas

Evans no rechaza los diagramas, pero advierte contra los que intentan mostrarlo todo. Recomienda **diagramas simples e informales** que muestren los conceptos clave y sus relaciones para un propósito concreto, acompañados de texto. El modelo completo está en el código; los documentos deben **complementar** el código y la conversación, no repetirlos. Un documento que ya no se usa y no se actualiza debe archivarse como histórico para que no confunda.

### Diseño guiado por el modelo (Model-Driven Design)

Evans narra un proyecto donde unos analistas pasaron meses construyendo un modelo de clases enorme y correcto, pegado en una pared, que los desarrolladores no pudieron implementar: la red de asociaciones no se traducía en unidades que se pudieran guardar y modificar con integridad. Así que hicieron un diseño propio, con algunos nombres prestados del modelo pero sin basarse en él. Resultado: un modelo que no servía y un código sin modelo.

El problema era la separación entre **modelo de análisis** (para entender) y **diseño** (para construir). Cuando están separados, el conocimiento ganado en el análisis se pierde al diseñar, y lo que se aprende al programar nunca vuelve al modelo.

**MODEL-DRIVEN DESIGN** propone **un único modelo** que sirva a ambos propósitos:

- Diseña una parte del sistema que refleje el modelo del dominio de forma muy literal, para que la correspondencia sea obvia.
- Revisa el modelo para que se pueda implementar de forma natural; si no se puede, el modelo cambia.
- Usa el mismo lenguaje en el código.
- El código se convierte en una expresión del modelo, así que **un cambio en el código puede ser un cambio en el modelo**, y viceversa.

Esto exige un paradigma que permita expresar el modelo en el código. La orientación a objetos (con comportamiento y reglas dentro de los objetos) lo hace de forma natural; un enfoque puramente procedural o un modelo que sea solo tablas lo hace muy difícil.

#### Dejar ver el esqueleto: por qué los modelos importan a los usuarios

Evans muestra un ejemplo de un navegador web que ocultaba cómo funcionaban realmente los marcadores (eran archivos en carpetas) detrás de una interfaz que fingía otra cosa. Cuando el modelo que ve el usuario contradice el modelo real, el usuario se confunde. Si el modelo interno es bueno, conviene **dejar que se vea** en la interfaz.

### Modeladores que programan (Hands-On Modelers)

Si los que modelan no programan y los que programan no modelan, el modelo se separa del código. Las razones:

- Algunas intenciones del modelo se pierden al transmitirlas.
- El modelador no recibe la retroalimentación de la implementación: no sabe qué partes son impracticables.
- Los programadores no sienten responsabilidad por el modelo y lo erosionan con cada cambio.

La conclusión de Evans: **cualquier persona técnica que contribuya al modelo debe pasar tiempo tocando el código**, y cualquier persona responsable de cambiar el código debe aprender a expresar el modelo a través de él. Todo desarrollador debe participar, en algún nivel, en las conversaciones sobre el modelo con los expertos del dominio.

### Una herramienta moderna para triturar conocimiento: event storming

El libro de Evans es de 2003; desde entonces la comunidad DDD desarrolló técnicas de taller que llevan sus ideas a la práctica. La más conocida es el **event storming**: expertos y desarrolladores, frente a una pared larga, escriben en notas adhesivas naranjas los **eventos del dominio** en pasado ("Cita agendada", "Vacuna aplicada", "Recordatorio enviado") y los ordenan en una línea de tiempo. Luego agregan, con otros colores, los **comandos** que los provocan ("Agendar cita"), los **actores** que los ejecutan, las **reglas o políticas** que reaccionan a ellos ("Cuando se aplica una vacuna con refuerzo, programar recordatorio") y los puntos calientes donde nadie está de acuerdo.

```
 [Agendar cita] ──▶ (Cita agendada) ──▶ ⟨política: confirmar por WhatsApp⟩ ──▶ (Confirmación enviada)
    actor:                                       │
  recepcionista                                  ▼
                                    ⚠ ¿Quién confirma si el cliente no responde?
```

Por qué funciona tan bien como knowledge crunching:

- Los eventos en pasado son fáciles de nombrar para cualquier experto: "¿qué cosas importantes ocurren en tu negocio?" no requiere saber nada de software.
- La línea de tiempo saca a la luz los huecos y contradicciones del proceso, igual que los escenarios dibujados por Evans.
- Las palabras que aparecen en las notas son, literalmente, el primer borrador del **lenguaje ubicuo**.
- Las zonas donde cambia el vocabulario (lo que para recepción es "cita" para el veterinario es "consulta") son pistas de **bounded contexts** distintos, que verás en la sesión 27.

No reemplaza a la conversación ni al prototipo: los alimenta. Un buen ritmo es un taller de event storming de dos horas para explorar, seguido de prototipos pequeños en código para validar el modelo que salió del taller.

### Cómo empezar a aplicarlo en tu trabajo

1. Crea un **glosario vivo** en el repositorio (`docs/glossary.md`) con los términos del dominio, su definición y sus sinónimos prohibidos ("no decimos *usuario* para referirnos al *paciente*").
2. En las reuniones con negocio, **dibuja escenarios** concretos con objetos del modelo y deja que te corrijan.
3. Escribe los tests con el lenguaje del negocio: `it("rechaza una reserva que excede la política de sobreventa")`.
4. Cuando el negocio use un término nuevo o distinto, pregunta si es un concepto nuevo; si lo es, **refactoriza**.
5. Prototipa el núcleo del modelo **sin infraestructura** (sin base de datos ni HTTP), como hizo Evans: solo objetos y tests.

### Analogía de construcción

Piensa en el **astrolabio** que Evans usa como imagen: un instrumento mecánico que implementa un modelo del cielo para calcular posiciones de estrellas. El modelo y el mecanismo son una sola cosa: si el modelo estuviera solo en un libro y el instrumento se hubiera construido "a ojo", no serviría. En construcción, es la diferencia entre unos planos que el maestro de obra entiende y usa a diario (modelo ligado a la implementación) y unos renders preciosos que nadie en la obra consulta. Y el lenguaje ubicuo es el vocabulario común de la obra: cuando el arquitecto dice "viga de amarre", el maestro de obra, el ingeniero y el proveedor entienden lo mismo.

### Errores comunes

- **Modelos anémicos**: clases con solo datos y getters, y toda la lógica en "servicios". El modelo deja de contener conocimiento (volverás a esto en la sesión 24).
- **Traducir en el código**: el negocio dice "póliza" y el código dice `Contract`. Cada traducción es un malentendido esperando ocurrir.
- **Diagramas gigantes como fuente de verdad** que nadie mantiene.
- **Analistas que no programan y programadores que no hablan con el negocio.**
- **Modelar todo el dominio de una vez.** Empieza por una funcionalidad concreta y deja fuera lo que no necesita.
- **Esconder reglas importantes** en condicionales sin nombre.

### Resumen

DDD pone el dominio en el centro. El modelo es una simplificación útil que se construye triturando conocimiento junto con los expertos, a través de escenarios, bocetos y prototipos tempranos. El lenguaje ubicuo, basado en el modelo, se usa en conversaciones, documentos, código y tests, y un cambio en el lenguaje es un cambio en el modelo. Model-Driven Design exige un único modelo que sirva para entender y para construir, y eso requiere que quienes modelan también programen.

## Conceptos clave

- **Dominio**: el área de conocimiento o actividad a la que se aplica el software.
- **Modelo del dominio**: abstracción selectiva y estructurada del conocimiento del dominio, compartida por el equipo.
- **Knowledge crunching**: proceso colaborativo de procesar información del dominio, probar modelos y destilar los conceptos útiles.
- **Lenguaje ubicuo**: lenguaje estructurado alrededor del modelo que todo el equipo usa en conversaciones, documentos, código y tests.
- **Model-Driven Design**: diseño en el que una parte del software refleja directamente el modelo del dominio, con un único modelo para análisis e implementación.
- **Hands-on modeler**: persona que contribuye al modelo y también trabaja con el código.
- **Concepto implícito / explícito**: regla o idea escondida en el código frente a una con nombre propio en el modelo.

## Preguntas de repaso

1. ¿Por qué fracasan tanto los modelos de análisis separados del código como el código sin modelo?
   R: El modelo de análisis separado no se puede implementar tal cual, así que los desarrolladores hacen un diseño propio y el conocimiento se pierde; el código sin modelo acumula funcionalidad sin estructura. En ambos casos el código no refleja el conocimiento del negocio y se vuelve difícil de entender y mantener.
2. ¿Qué hizo Evans para entender el dominio de los circuitos impresos?
   R: Buscó los conceptos recurrentes en lo que pedían los expertos (las nets), dibujó escenarios informales y dejó que lo corrigieran, se enfocó en una sola funcionalidad dejando fuera lo innecesario y construyó pronto un prototipo mínimo con tests y sin infraestructura que hacía el cálculo real.
3. ¿Qué significa que "un cambio en el lenguaje es un cambio en el modelo"?
   R: Que si el equipo descubre que un término está mal, es ambiguo o esconde dos conceptos, no basta con cambiar la forma de hablar: el modelo y el código deben refactorizarse para reflejar el nuevo entendimiento, porque el lenguaje ubicuo y el código son expresiones del mismo modelo.
4. ¿Qué gana el ejemplo de la sobreventa al convertir la regla en `OverbookingPolicy`?
   R: La regla deja de estar escondida en un cálculo y se convierte en un concepto con nombre que los expertos reconocen, se puede discutir, testear y cambiar por separado, y el código expresa el lenguaje del dominio.
5. ¿Por qué Evans insiste en que los modeladores programen?
   R: Porque si modelo y código los hacen personas distintas, se pierden intenciones al transmitir el modelo, el modelador no recibe retroalimentación sobre lo que es impracticable y los programadores no se sienten responsables del modelo, que se erosiona con cada cambio.
6. ¿Cuál es la técnica de "hablar en voz alta el modelo" y para qué sirve?
   R: Describir escenarios en voz alta con los términos del modelo. Las frases torpes, vagas o que hablan de la implementación revelan conceptos que faltan o están mal planteados, y ayudan a encontrar formas más claras de expresar el dominio.

## Ejercicio

Elige un dominio que conozcas bien por experiencia (un deporte, tu trabajo, un hobby). (a) Escribe un glosario de 12 a 15 términos con definición, ejemplo y sinónimos que el equipo **no** debería usar; (b) escribe 5 frases de escenarios "en voz alta" usando solo términos del glosario, y reescribe al menos una que al principio te salga torpe; (c) busca una regla de negocio implícita (como la sobreventa) y modélala como concepto explícito en TypeScript, sin base de datos ni HTTP; (d) escribe al menos 5 tests con Vitest cuyos nombres sean frases del lenguaje ubicuo. **Terminado cuando:** todos los nombres de clases, métodos y tests están en el glosario, ninguna regla importante está escondida en un condicional sin nombre y alguien que conozca el dominio pueda leer los nombres de los tests y entenderlos sin saber programar.

## Explícalo con tus palabras

Explica por qué un "traductor" entre negocio y desarrolladores es un síntoma de un problema, y qué propone DDD en su lugar.
