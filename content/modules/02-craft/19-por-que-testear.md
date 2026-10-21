---
title: Por qué testear — tamaño, alcance y cultura de pruebas
kind: lesson
hours: 2
sources: Software Engineering at Google, cap. 11 Testing Overview (pp. 240–266) | The Pragmatic Programmer, tema 41 Test to Code (pp. 361–374)
---

## Objetivo

Entender para qué sirven realmente los tests (velocidad sostenible y mejor diseño, no solo encontrar bugs), clasificar los tests por **tamaño** y por **alcance** como hace Google, reconocer la pirámide y sus antipatrones, y saber por qué los tests inestables (*flaky*) son tan caros. Al terminar vas a poder diseñar la estrategia de pruebas de un proyecto TypeScript pequeño.

## Estudio

### Una historia: el servidor web de Google

El capítulo 11 de *Software Engineering at Google* empieza con una historia real. A mediados de los 2000, el Google Web Server (GWS), el servidor que atiende las búsquedas, tenía un problema serio: los despliegues eran lentos y peligrosos. Las funcionalidades se rompían en producción; en algún momento, más del 80 % de los despliegues a producción contenían bugs que afectaban a los usuarios y obligaban a revertir. Los ingenieros tenían miedo de hacer cambios.

El líder técnico del equipo instauró una política: **todo cambio debe venir con tests automatizados**. Montaron integración continua y midieron la cobertura. En un año, los despliegues de emergencia se redujeron a la mitad, a pesar de que cada trimestre había más cambios que nunca. Hoy GWS tiene decenas de miles de tests y se despliega casi a diario.

La lección que extrajo Google: **no puedes confiar en que los programadores eviten los bugs por pura habilidad**. Aunque cada persona solo introduzca un bug ocasional, con suficientes personas y cambios, los bugs se acumulan más rápido de lo que se descubren. Los tests automáticos son la única forma de escalar la calidad.

### Para qué sirven los tests

Los tests se suelen asociar a "encontrar bugs", pero el beneficio principal es otro: **permiten cambiar el código con confianza y rapidez**. El libro enumera varios beneficios:

| Beneficio | Explicación |
| --- | --- |
| **Menos depuración** | Los bugs se detectan cuando el código está fresco, no meses después |
| **Más confianza al cambiar** | Puedes refactorizar o añadir funcionalidad sabiendo si rompiste algo |
| **Mejor documentación** | Los tests muestran ejemplos de uso que no se desactualizan (porque fallarían) |
| **Revisiones más simples** | Quien revisa ve en los tests qué comportamiento se espera |
| **Diseño más pensado** | Si algo es difícil de probar, suele estar mal diseñado (acoplado, con demasiadas responsabilidades) |
| **Entregas rápidas y de calidad** | Con una suite de tests de confianza, se puede desplegar a menudo |

*The Pragmatic Programmer* lleva esta idea más lejos en su tema "Test to Code": **testear no trata de encontrar bugs**. Según los autores, el mayor beneficio de los tests aparece cuando **piensas** en ellos, no cuando los ejecutas. Pensar en cómo probarías una función te obliga a pensar en su interfaz, en sus entradas y salidas, en sus dependencias. El test es el primer cliente de tu código.

### Pensar en los tests mejora el diseño

El libro pragmático pone un ejemplo: quieres escribir una función que lea datos de una base de datos y calcule algo. Piensas: "¿cómo la pruebo?". Para probarla tendrías que montar una base de datos. Te das cuenta de que la función hace dos cosas: obtener datos y calcular. Así que la divides: una función que recibe los datos y calcula (fácil de probar) y otra que los obtiene. Pensar en el test mejoró el diseño **antes** de escribir una línea del test.

```ts
// Difícil de probar: mezcla I/O y cálculo
async function averageStudyHours(userId: string): Promise<number> {
  const rows = await db.query("SELECT hours FROM sessions WHERE user_id = ?", [userId]);
  const total = rows.reduce((sum, row) => sum + row.hours, 0);
  return rows.length === 0 ? 0 : total / rows.length;
}

// Fácil de probar: el cálculo es una función pura
export function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export async function averageStudyHours(sessions: SessionRepository, userId: string): Promise<number> {
  return average(await sessions.hoursFor(userId));
}
```

### Test-Driven Development en pocas palabras

El mismo tema presenta el ciclo de **TDD**:

1. Decide qué pequeña funcionalidad quieres añadir.
2. Escribe un test que pasará cuando esa funcionalidad esté implementada.
3. Ejecuta todos los tests. Comprueba que solo falla el nuevo.
4. Escribe la mínima cantidad de código necesaria para que pase, y comprueba que todos los tests pasan.
5. Refactoriza el código: mejora lo que acabas de escribir (y el test) sin cambiar el comportamiento.

Es el ciclo **rojo → verde → refactor**. Los autores son entusiastas pero también honestos: advierten contra convertirse en "esclavo" de TDD. Algunos síntomas: dedicar demasiado tiempo a conseguir el 100 % de cobertura, escribir muchos tests redundantes o diseñar siempre de abajo hacia arriba sin una idea de hacia dónde vas. Su consejo: **construye de extremo a extremo, no de arriba abajo ni de abajo arriba**. Avanza en rebanadas pequeñas que atraviesan todas las capas (la idea de las *tracer bullets* que verás en la sesión 23), y deja que los tests te den feedback en cada paso. Profundizarás en TDD en las sesiones 23 y 24.

### Tamaño de los tests: recursos, no líneas

Google clasifica cada test en dos dimensiones independientes: **tamaño** y **alcance**.

El **tamaño** se refiere a los **recursos** que el test necesita para ejecutarse: memoria, procesos, tiempo, red, disco. Google usa tres tamaños:

| Tamaño | Restricciones | Ejemplo en TypeScript |
| --- | --- | --- |
| **Pequeño** (*small*) | Un solo proceso (idealmente un solo hilo); sin red, sin disco, sin `sleep`, sin I/O bloqueante | Test de una función pura o de una clase con dobles en memoria |
| **Mediano** (*medium*) | Una sola máquina; puede usar varios procesos, `localhost`, una base de datos local | Test de un repositorio contra SQLite en un archivo temporal, o de un endpoint con un servidor local |
| **Grande** (*large*) | Varias máquinas; sin restricciones | Test de extremo a extremo contra un entorno desplegado |

¿Por qué medir así y no por "unitario o de integración"? Porque las restricciones de recursos son las que determinan las dos propiedades más importantes de una suite: **velocidad** y **determinismo**. Un test pequeño no puede ser lento por culpa de la red ni fallar porque otro proceso ocupó un puerto. Por eso Google anima a escribir tests pequeños siempre que sea posible, sea cual sea el alcance.

### Alcance de los tests: cuánto código se valida

El **alcance** (*scope*) se refiere a cuánto código se está **validando** (no cuánto se ejecuta):

- **Alcance estrecho** (los llamados tests unitarios): validan una porción pequeña y enfocada, como una clase o una función.
- **Alcance medio** (tests de integración): validan la interacción entre un pequeño número de componentes, por ejemplo un servicio y su base de datos.
- **Alcance amplio** (tests de extremo a extremo, de sistema, funcionales): validan la interacción de varias partes del sistema o comportamientos completos.

Tamaño y alcance están relacionados pero son distintos. Puedes escribir un test de alcance amplio que sea pequeño (todo el flujo de un endpoint con todas las dependencias reemplazadas por fakes en memoria), y un test de alcance estrecho que sea mediano (una sola clase que, por diseño, accede al disco).

### La pirámide y sus antipatrones

Como guía orientativa, Google apunta a una mezcla de aproximadamente **80 % de tests de alcance estrecho, 15 % de alcance medio y 5 % de extremo a extremo**. Eso forma la conocida **pirámide de tests**:

```
            /\
           /E2E\          ~5 %   lentos, caros, frágiles, mucha confianza
          /------\
         /  Integ. \     ~15 %
        /------------\
       /   Unitarios   \  ~80 %  rápidos, baratos, precisos
      /__________________\
```

Dos antipatrones que describe el libro:

- **Cono de helado** (*ice cream cone*): muchos tests manuales y de extremo a extremo, pocos de integración y casi ningún unitario. Suele aparecer en proyectos que empezaron como prototipos sin tests. La suite es lenta, inestable y difícil de diagnosticar.
- **Reloj de arena** (*hourglass*): muchos tests unitarios y muchos de extremo a extremo, pero pocos de integración. Aparece cuando los componentes están tan acoplados que es difícil probarlos en aislamiento parcial. Los fallos de extremo a extremo son difíciles de localizar.

### Los tests inestables son caros

Un test **flaky** es el que a veces pasa y a veces falla sin que cambie el código. El libro da números que hacen ver el problema: si cada test tiene apenas un 0.1 % de probabilidad de fallar cuando no debería, y ejecutas 10,000 tests al día, investigarás unos 10 falsos fallos al día. Google mantiene su tasa de inestabilidad alrededor del 0.15 %, lo que a su escala significa miles de fallos falsos diarios, y lucha constantemente para controlarla.

El peligro real no es el tiempo perdido sino la **pérdida de confianza**: según la experiencia de Google, cuando la inestabilidad se acerca al 1 %, los tests empiezan a perder su valor. Los equipos se acostumbran a reejecutar hasta que pasa, y dejan de prestar atención a los fallos reales.

Causas típicas de inestabilidad y su remedio en TypeScript:

| Causa | Remedio |
| --- | --- |
| Depender del reloj real (`Date.now()`, zonas horarias) | Inyectar un reloj; `vi.useFakeTimers()` y `vi.setSystemTime()` |
| Orden de ejecución entre tests (estado compartido) | Estado fresco en cada test (`beforeEach`), sin variables globales mutables |
| Esperas con `setTimeout` arbitrarios | Esperar a condiciones explícitas o usar temporizadores falsos |
| Red real o servicios externos | Dobles en memoria (sesión 21) |
| Aleatoriedad sin semilla | Generadores con semilla fija o inyectada |

Reejecutar automáticamente los tests que fallan reduce el ruido, pero solo aplaza el problema: hay que ir a la causa.

### Escribir tests mantenibles y la cobertura

Algunas recomendaciones más del capítulo:

- **Los tests deben ser claros cuando fallan.** Un test que falla con "expected true to be false" obliga a investigar; uno que dice "debería rechazar contraseñas de menos de 8 caracteres" explica el problema solo.
- **La cobertura de código es una métrica limitada.** Mide qué líneas se ejecutaron, no qué comportamientos se verificaron: un test sin aserciones puede dar 100 % de cobertura. Google advierte contra convertir la cobertura en un objetivo, porque los equipos terminan escribiendo tests para subir el número. Es más útil preguntarse: ¿qué comportamientos de este código son importantes?, ¿los cubrimos?
- **Los tests deben ser rápidos.** Los ingenieros no ejecutarán una suite lenta antes de cada cambio.

### La regla de Beyoncé y la cultura de pruebas

Volvamos a una idea de la sesión 1: **si te gustaba, deberías haberle puesto un test**. En Google, los equipos de infraestructura pueden hacer cambios en todo el código; si sus cambios pasan los tests de un producto pero rompen ese producto, la responsabilidad es del equipo del producto, por no haber protegido su comportamiento con tests.

Una cultura de pruebas no aparece por decreto. Google contó con iniciativas creativas para difundirla: grupos de voluntarios que ayudaban a otros equipos, un programa de certificación por niveles para equipos que mejoraban sus prácticas de testing y hasta pequeños folletos sobre testing pegados en los baños ("Testing on the Toilet"), que se hicieron famosos dentro de la empresa. La lección: la cultura se construye mostrando beneficios concretos y facilitando el camino, como la "sopa de piedras" de la sesión 2.

*The Pragmatic Programmer* lo resume en una frase: **prueba tu software, o lo harán tus usuarios**. Los bugs que no encuentres tú, los encontrarán ellos.

### Pruebas contra contrato y pruebas ad hoc

El libro pragmático añade dos ideas más:

- **Prueba contra el contrato.** Si diseñaste una función con precondiciones y postcondiciones (sesión 8), los tests deben comprobar que la función cumple su contrato: que con entradas válidas produce las salidas prometidas, y que con entradas inválidas falla como se espera.
- **Las pruebas ad hoc tienen su lugar.** Explorar manualmente en una consola o un REPL es útil, pero si encuentras un bug así, conviértelo en un test automático para que no vuelva.

También sugiere construir una **"ventana de pruebas"** en el software: formas de observar el estado interno en producción (endpoints de salud, logs estructurados, páginas de diagnóstico), porque los tests no cubren todo.

### Una estrategia de pruebas para un proyecto pequeño

Para una app TypeScript como un planificador de estudio local, una estrategia razonable sería:

| Capa | Qué probar | Tamaño | Cantidad aproximada |
| --- | --- | --- | --- |
| Dominio (cálculo de fechas, reglas de secuencia, parsers de contenido) | Todos los comportamientos y bordes | Pequeño | La mayoría |
| Repositorios (SQLite) | Que guardan y leen correctamente | Mediano (archivo temporal) | Unos pocos por tabla |
| Rutas o handlers | Validación de entradas y respuestas | Pequeño con dobles, o mediano | Uno o dos por ruta |
| Flujo completo (abrir hoy, marcar sesión) | Que las piezas encajan | Grande o mediano | Muy pocos |

### Ejemplo: del cono de helado a la pirámide

Imagina un proyecto que hoy tiene 40 tests de extremo a extremo con un navegador automatizado, 5 tests de integración y ningún test unitario. La suite tarda 25 minutos y falla "a veces". ¿Cómo se sale de ahí sin reescribirlo todo?

1. **No borres los tests de extremo a extremo todavía.** Son la única red de seguridad que tienes.
2. **Cada bug nuevo se reproduce con el test más pequeño posible.** Si el bug está en el cálculo de un descuento, el test va contra la función de descuento, no contra el navegador.
3. **Cada vez que toques un módulo, extrae su lógica pura** (sesión 13) y escríbele tests pequeños. La regla del boy scout aplicada a los tests.
4. **Cuando un comportamiento esté cubierto por tests pequeños, retira el test de extremo a extremo redundante**, y deja solo los que verifican que las piezas encajan (por ejemplo, "un usuario puede completar una compra").
5. **Mide**: tiempo de la suite y tasa de fallos falsos, cada mes.

En unos meses, la forma de la suite cambia sola, porque cada cambio nuevo empuja en la dirección correcta. Es la misma estrategia incremental que el refactoring: muchos pasos pequeños en lugar de un gran proyecto.

### Resumen

Los tests existen para poder cambiar el código rápido y con confianza, y pensar en ellos mejora el diseño antes de escribirlos. Clasifícalos por tamaño (recursos: pequeño, mediano, grande) y por alcance (cuánto código validan), prefiere los pequeños y apunta a una pirámide con mayoría de tests estrechos. Vigila los antipatrones del cono de helado y el reloj de arena, y trata los tests inestables como bugs urgentes, porque destruyen la confianza en toda la suite. La cobertura es una pista, no un objetivo. Y recuerda: prueba tu software, o lo harán tus usuarios.

### Errores comunes

- **Ver los tests como una fase final** en lugar de parte del desarrollo de cada cambio.
- **Perseguir el 100 % de cobertura** en lugar de cubrir los comportamientos importantes.
- **Confiar en tests de extremo a extremo** para todo (cono de helado).
- **Tolerar tests inestables** y reejecutar "hasta que pase".
- **Tests que dependen del reloj, la red o el orden** de ejecución.
- **No convertir en test los bugs encontrados manualmente.**
- **Tests que nunca has visto fallar**: rompe el código a propósito una vez para comprobar que el test lo detecta.

## Conceptos clave

- **Tamaño de un test**: recursos que necesita (pequeño: un proceso sin I/O; mediano: una máquina; grande: varias máquinas).
- **Alcance de un test**: cuánto código valida (estrecho/unitario, medio/integración, amplio/extremo a extremo).
- **Pirámide de tests**: mayoría de tests estrechos (~80 %), algunos de integración (~15 %) y pocos de extremo a extremo (~5 %).
- **Cono de helado / reloj de arena**: antipatrones con demasiados tests amplios o con un hueco en los de integración.
- **Test flaky**: test que pasa o falla de forma no determinista sin cambios en el código.
- **Ciclo TDD**: test que falla, código mínimo para que pase, refactor.
- **Prueba contra contrato**: verificar que el código cumple sus precondiciones y postcondiciones.

## Preguntas de repaso

1. ¿Qué enseñó la historia del Google Web Server sobre el testing?
   R: Que no se puede confiar en que los programadores eviten los bugs solo con habilidad: con muchos cambios y personas, los bugs se acumulan. Al exigir tests automatizados en cada cambio, los despliegues de emergencia se redujeron a la mitad aunque el número de cambios aumentó.
2. Explica la diferencia entre tamaño y alcance de un test, con un ejemplo de test de alcance amplio y tamaño pequeño.
   R: El tamaño mide los recursos que necesita el test (proceso, máquina, red); el alcance mide cuánto código valida. Ejemplo: probar el flujo completo de un endpoint (alcance amplio) reemplazando la base de datos y los servicios externos por fakes en memoria, de modo que todo corre en un proceso sin I/O (tamaño pequeño).
3. ¿Por qué Google prefiere tests pequeños independientemente de su alcance?
   R: Porque las restricciones de los tests pequeños (un proceso, sin red, sin disco, sin sleep) garantizan velocidad y determinismo, las dos propiedades más importantes de una suite: corren rápido y no fallan por causas externas.
4. Describe los antipatrones del cono de helado y del reloj de arena.
   R: Cono de helado: muchos tests manuales y de extremo a extremo y pocos unitarios; la suite es lenta, inestable y difícil de diagnosticar. Reloj de arena: muchos unitarios y muchos de extremo a extremo pero pocos de integración, normalmente por un acoplamiento que impide probar componentes parcialmente aislados.
5. ¿Por qué los tests flaky son tan dañinos y cómo se combaten en TypeScript?
   R: Porque hacen perder tiempo investigando falsos fallos y, sobre todo, destruyen la confianza en la suite: cuando la inestabilidad se acerca al 1 %, los equipos ignoran los fallos. Se combaten eliminando el no determinismo: relojes inyectados o temporizadores falsos, estado fresco por test, sin red real, sin esperas arbitrarias y aleatoriedad con semilla.
6. ¿Por qué The Pragmatic Programmer dice que "testear no trata de encontrar bugs"?
   R: Porque el mayor beneficio aparece al pensar en cómo probar el código: eso te obliga a definir su interfaz, separar responsabilidades y reducir el acoplamiento, mejorando el diseño antes de escribir el test. El test es el primer cliente del código.

## Ejercicio

Elige un proyecto TypeScript tuyo (o esta app) y escribe un documento `TESTING.md` de máximo una página con su estrategia de pruebas: qué capas tiene, qué se prueba en cada una, de qué tamaño y alcance son esos tests y una proporción objetivo. Después escribe tres tests reales: uno pequeño de alcance estrecho sobre una función pura, uno pequeño de alcance amplio que recorra un caso de uso completo con dobles en memoria, y uno mediano que use un recurso real local (un archivo temporal o SQLite en memoria). Uno de ellos debe usar `vi.useFakeTimers()` y `vi.setSystemTime()` para eliminar la dependencia del reloj. Terminado cuando los tres tests pasan diez veces seguidas sin fallar (`for i in $(seq 10); do npx vitest run || break; done`) y el documento clasifica cada uno por tamaño y alcance.

## Explícalo con tus palabras

Explica a alguien por qué un test que falla "solo a veces" es más peligroso que no tener ese test.
