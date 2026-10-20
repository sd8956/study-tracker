---
title: Evaluación parcial — código limpio y diseño
kind: evaluation
hours: 3
sources: Sesiones 1–16 de este módulo | Clean Code, caps. 1–10, 12 y 17 | The Pragmatic Programmer, temas 1–11, 23–28, 30–32, 38, 40 | Software Engineering at Google, caps. 1–2
---

## Objetivo

Comprobar que puedes explicar y aplicar lo esencial de las sesiones 1 a 16: ingeniería en el tiempo, actitud pragmática, comunicación, nombres, funciones, comentarios, objetos y Demeter, errores y contratos, fronteras y recursos, ETC/DRY/ortogonalidad, clases y herencia, reversibilidad y transformaciones, diseño simple y refactoring, arquitectura y code smells.

## Estudio

### Cómo hacer esta evaluación

1. **Primera hora: sin apuntes.** Responde por escrito (o en voz alta con el tutor) todas las preguntas sin mirar las sesiones. Las preguntas con código piden que escribas TypeScript en tu editor; no hace falta que compile perfecto, pero sí que sea correcto en lo esencial.
2. **Segunda hora: corrige.** Compara con las respuestas modelo o envía tus respuestas al tutor. Marca cada pregunta como "bien", "parcial" o "mal".
3. **Tercera hora: repara.** Para cada pregunta "parcial" o "mal", vuelve a la sesión correspondiente, relee solo la sección necesaria y reescribe tu respuesta. Anota los temas débiles: entrarán con más frecuencia en tu repaso espaciado.

Criterio de aprobado: al menos 9 de 12 preguntas "bien" en la primera hora. Si no llegas, repasa los temas marcados y repite la evaluación dentro de una semana.

## Preguntas de evaluación

1. Explica la frase "la ingeniería de software es programación integrada en el tiempo" y relaciónala con la ley de Hyrum mediante un ejemplo concreto.
   R: Significa que la ingeniería considera toda la vida útil del código, durante la cual cambiarán requisitos, dependencias y personas, y no solo que funcione hoy. La ley de Hyrum dice que con suficientes usuarios todo comportamiento observable será usado por alguien; por eso, a lo largo del tiempo, cualquier detalle (el orden de una lista, el texto de un error) se convierte en un contrato implícito que dificulta cambiar. Ejemplo: una función que devuelve usuarios en orden de inserción sin prometerlo; un cliente toma el primero como dueño, y si la función empieza a ordenar por fecha, ese cliente se rompe.
2. Un compañero dice: "Primero lo hacemos rápido y sucio, y cuando tengamos tiempo lo limpiamos". Responde usando al menos tres ideas del módulo.
   R: Según Clean Code, la única forma de ir rápido es mantener el código limpio: el desorden frena cada cambio de inmediato y la productividad cae hasta casi cero. Según The Pragmatic Programmer, cada atajo es una ventana rota que invita a más deterioro, y el "tiempo para limpiar" nunca llega; el refactoring se hace pronto y a menudo, como cuidar un jardín, antes de que el problema crezca. La regla del boy scout propone mejorar un poco en cada cambio en lugar de esperar a una gran limpieza o a un rediseño total.
3. ¿Qué problemas tiene la llamada `sendReport(user, true, false)` y cómo la rediseñarías en TypeScript?
   R: Tiene argumentos flag (F3) que indican que la función hace varias cosas, y en la llamada es imposible saber qué significan los booleanos (intención oscura). Rediseño: separar en funciones con nombre según el comportamiento, por ejemplo `sendReportByEmail(user)` y `sendReportToSlack(user)`, o, si son parámetros reales y no modos, usar un objeto de opciones con nombre como `sendReport(user, { includeCharts: true, compress: false })`.
4. Escribe en TypeScript una función `isEligibleForLoan` sin comentarios que exprese esta regla: "si el cliente tiene más de 21 años y sus ingresos mensuales superan tres veces la cuota, es elegible".
   R: Una solución válida:
      `const MINIMUM_AGE = 21; const INCOME_TO_PAYMENT_RATIO = 3;`
      `function isEligibleForLoan(customer: Customer, monthlyPayment: number): boolean { const isOldEnough = customer.age > MINIMUM_AGE; const earnsEnough = customer.monthlyIncome > monthlyPayment * INCOME_TO_PAYMENT_RATIO; return isOldEnough && earnsEnough; }`
      Lo importante: constantes con nombre en lugar de números mágicos, variables explicativas en lugar de comentarios y un nombre que es un predicado claro.
5. Explica la antisimetría entre objetos y estructuras de datos y di qué estilo elegirías para modelar los tipos de notificación (correo, SMS, push) de una app que añade canales nuevos con frecuencia.
   R: Los objetos esconden datos y exponen comportamiento, lo que facilita añadir tipos nuevos sin tocar las funciones existentes; las estructuras de datos exponen datos y se procesan con funciones, lo que facilita añadir funciones nuevas pero obliga a tocarlas todas al añadir un tipo. Si se añaden canales con frecuencia, conviene el estilo orientado a objetos: una interfaz `Notifier` con una implementación por canal, de modo que un canal nuevo es una clase nueva.
6. Refactoriza mentalmente `if (cart.getCustomer().getWallet().getBalance() >= cart.total()) { ... }` para cumplir la Ley de Demeter y explica qué ganas.
   R: Mover la decisión al objeto que tiene la información: `if (cart.canBePaid()) { ... }`, donde `Cart.canBePaid()` delega en `customer.canPay(this.total())` y este en `wallet.covers(amount)`. Se gana que el código cliente no conoce la estructura interna de clientes y billeteras, las reglas de pago viven en un solo lugar (por ejemplo, si se permite saldo negativo) y los cambios en esa estructura no se propagan.
7. ¿Cuándo usarías en TypeScript una excepción, un `Result`, un caso especial y una aserción? Da un ejemplo de cada uno.
   R: Excepción para fallos de infraestructura que no se pueden resolver en ese punto (la base de datos no responde), propagada hasta una frontera. `Result` para errores esperados del dominio que el llamador debe manejar (validación de un formulario, "producto no encontrado"). Caso especial cuando la ausencia tiene un comportamiento por defecto razonable (un cliente invitado con descuento cero en lugar de `null`). Aserción para condiciones que nunca deberían ocurrir si el programa es correcto (que un switch cubra todos los casos, que el saldo no sea negativo tras una operación), dejándola activa en producción.
8. ¿Qué son las precondiciones, postcondiciones e invariantes del diseño por contrato? Aplícalas a una función `transfer(from, to, amount)`.
   R: Precondiciones: lo que el llamador debe garantizar (importe positivo, cuentas existentes y distintas). Postcondiciones: lo que la función garantiza al terminar (el saldo de `from` bajó exactamente `amount` y el de `to` subió lo mismo; la suma total no cambió). Invariantes: lo que siempre es cierto para cada cuenta vista desde fuera (el saldo nunca es negativo). Si el llamador viola una precondición, la función falla de forma ruidosa en lugar de seguir con datos corruptos.
9. ¿Qué es un learning test y cómo te protege de la ley de Hyrum cuando eres consumidor de una librería?
   R: Es un test que ejercita una librería de terceros tal como la vas a usar, para aprenderla de forma controlada. Te protege porque fija los comportamientos de los que dependes (incluso los no documentados): al actualizar la librería, si alguno cambia, el learning test falla en CI antes de que el cambio llegue a producción.
10. Dos funciones, `validateUsername` y `validateProductCode`, tienen hoy exactamente el mismo cuerpo (alfanumérico, 3 a 20 caracteres). ¿Viola esto DRY? ¿Qué harías?
   R: No necesariamente: DRY trata de duplicación de conocimiento, y son dos reglas de negocio distintas que coinciden por casualidad y pueden evolucionar por separado. Mantendría las dos funciones con su nombre y su regla, y como mucho extraería un ayudante de bajo nivel (por ejemplo, `isAlphanumericBetween(value, 3, 20)`) que ambas usen, para que el conocimiento compartido ("qué es alfanumérico") esté en un solo sitio sin acoplar las reglas.
11. Explica el "impuesto de la herencia" y reescribe la idea `class AdminUser extends User extends DatabaseRecord` con composición e interfaces.
   R: La herencia acopla la subclase a la implementación de todos sus ancestros (clase base frágil) y expone toda su API pública; además, modelar tipos con jerarquías produce árboles que no encajan con la realidad. Alternativa: `User` es un objeto de dominio sin herencia; el rol es un dato o una interfaz (`interface CanManageUsers { suspend(userId: string): void }`) que implementan los usuarios con permisos; y la persistencia se delega en un `UserRepository` inyectado, en lugar de heredar de `DatabaseRecord`.
12. Enumera las cuatro reglas del diseño simple y explica cómo se relacionan con la arquitectura hexagonal.
   R: Ejecuta todos los tests, sin duplicación, expresa la intención y mínimo de clases y métodos. La primera empuja a desacoplar el dominio de la infraestructura para poder probarlo, que es justo lo que hace la arquitectura hexagonal con puertos y adaptadores: los casos de uso se prueban con adaptadores en memoria. La expresividad se refleja en puertos con nombres de intención (`ForOpeningAccounts`). Y la cuarta regla recuerda no inflar la arquitectura con capas e interfaces que no aportan en proyectos pequeños.

## Explícalo con tus palabras

Elige el tema de las sesiones 1–16 que te resultó más difícil en esta evaluación y explícalo en voz alta durante dos minutos como si se lo enseñaras a alguien que empieza.
