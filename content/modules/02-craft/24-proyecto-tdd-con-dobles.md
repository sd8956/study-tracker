---
title: Proyecto 2 — kata TDD de un mazo de repetición espaciada
kind: project
hours: 3
sources: Clean Code, cap. 9 Unit Tests (pp. 152–164) | Software Engineering at Google, caps. 11–13 (pp. 240–320) | The Pragmatic Programmer, temas 41–42 (pp. 361–384)
---

## Objetivo

Construir con TDD estricto, desde cero, el núcleo de un mazo de repetición espaciada (el mismo tipo de mecanismo que usa este plan de estudio para tus preguntas de repaso), aplicando todo lo de las sesiones 19–23: tests pequeños y claros, F.I.R.S.T., DAMP, fakes con tests de contrato, temporizadores falsos, un único mock justificado y propiedades con `fast-check`.

## Estudio

### El dominio: un sistema Leitner simplificado

La repetición espaciada se basa en una idea: repasas una pregunta justo cuando estás a punto de olvidarla. Si la respondes bien, el siguiente repaso se aleja; si la respondes mal, vuelve pronto. El sistema Leitner lo implementa con cajas:

| Caja | Siguiente repaso tras responder bien |
| --- | --- |
| 1 | 1 día |
| 2 | 3 días |
| 3 | 7 días |
| 4 | 14 días |
| 5 | 30 días |

Reglas del proyecto:

1. Una tarjeta nueva entra en la caja 1 y vence **hoy**.
2. Si respondes **bien**, sube una caja (máximo 5) y su próximo vencimiento es hoy más los días de su **nueva** caja.
3. Si respondes **mal**, vuelve a la caja 1 y vence **mañana**.
4. La sesión de repaso de hoy contiene las tarjetas que vencen hoy o antes, ordenadas por fecha de vencimiento (las más atrasadas primero) y, a igual fecha, por caja ascendente.
5. Como máximo, una sesión tiene 20 tarjetas.
6. Las fechas son fechas de calendario (`"2026-10-20"`), sin hora ni zona horaria (recuerda el bug de la sesión 18).
7. Cuando una tarjeta llega a la caja 5 por primera vez, se notifica al estudiante ("¡dominaste esta pregunta!").

### Arquitectura mínima

```
domain/
  card.ts             Card, Box, reglas de promoción y degradación (puro)
  calendar-date.ts    CalendarDate: suma de días, comparación (puro)
application/
  review-deck.ts      ReviewDeck: addCard, todaySession, answer
  ports.ts            CardStore, Clock, MasteryNotifier
adapters/
  in-memory-card-store.ts   fake con tests de contrato
  sqlite-card-store.ts      opcional, adaptador real (node:sqlite)
```

El dominio no conoce ni el reloj real ni la base de datos (sesión 15). `ReviewDeck` recibe sus tres puertos por el constructor (seams, sesión 21).

## Qué hacer

1. **Preparación (10 min).** Proyecto TypeScript estricto con Vitest y `fast-check`. Crea el archivo `KATA.md` con la lista de reglas de arriba numeradas: cada regla es un comportamiento que necesita al menos un test.
2. **`CalendarDate` con TDD (25 min).** Ciclos rojo-verde-refactor con commit por ciclo. Tests mínimos: parsear `"2026-10-20"`, sumar días cruzando fin de mes y fin de año, comparar fechas, rechazar formatos inválidos con un `Result`. Añade dos propiedades: `d.addDays(n).addDays(-n)` es igual a `d` y `d.addDays(a).addDays(b)` es igual a `d.addDays(a + b)`.
3. **`Card` con TDD (30 min).** Reglas 1–3 como funciones puras: `newCard(id, today)`, `answeredCorrectly(card, today)`, `answeredWrong(card, today)`. Usa `it.each` para la tabla de cajas. Añade una propiedad: para cualquier secuencia de respuestas (`fc.array(fc.boolean())`), la caja siempre está entre 1 y 5 y la fecha de vencimiento siempre es posterior a la fecha de la respuesta.
4. **Puerto `CardStore` y su fake (25 min).** Define `CardStore` (`save`, `findById`, `dueOn(date)`), escribe la función `cardStoreContract(name, factory)` con al menos cuatro tests de contrato y ejecútala contra `InMemoryCardStore`. Si te sobra tiempo al final, impleméntalo con `node:sqlite` y ejecuta el mismo contrato.
5. **`ReviewDeck` con TDD (50 min).** Reglas 4, 5 y 7 a través de la API pública. Usa el fake del paso 4 (estado real, no stubs), un `Clock` inyectado (o `vi.useFakeTimers()` si tu `Clock` lee `Date`) y un mock **solo** para `MasteryNotifier`, verificando que se llama una única vez cuando una tarjeta llega a la caja 5 y nunca en los demás casos. Nombra cada test por el comportamiento y escribe given/when/then visibles. Usa ayudantes DAMP como `deckWith({ today: "2026-10-20", cards: [card({ box: 3, due: "2026-10-18" })] })`.
6. **Prueba de fragilidad (15 min).** Sin tocar los tests, refactoriza `ReviewDeck` (por ejemplo, cambia cómo ordena o cómo consulta el store). Si algún test falla sin que haya cambiado el comportamiento, es frágil: corrígelo para que pruebe estado a través de la API pública.
7. **Cierre (15 min).** Ejecuta la suite diez veces seguidas, ejecuta la cobertura (`vitest run --coverage`) y escribe en `KATA.md`: qué reglas cubre cada test, qué contraejemplos encontró `fast-check` (conviértelos en tests de ejemplo), qué tests fueron frágiles en el paso 6 y por qué.

### Checklist de terminado

- [ ] Cada una de las 7 reglas tiene al menos un test con un nombre que la describe.
- [ ] Hay al menos tres propiedades de `fast-check` y cada contraejemplo encontrado tiene su test de ejemplo.
- [ ] El contrato de `CardStore` corre contra el fake (y contra SQLite si lo hiciste).
- [ ] La única verificación de interacciones es sobre `MasteryNotifier`.
- [ ] Ningún test usa `as any`, accede a campos privados, tiene bucles fuera de las propiedades o depende del reloj real.
- [ ] La suite pasa diez veces seguidas y tarda menos de 5 segundos.
- [ ] El historial muestra un commit por ciclo de TDD (al menos 15).

## Conceptos clave

- **Kata**: ejercicio de práctica deliberada que se repite para interiorizar una técnica.
- **Repetición espaciada (Leitner)**: repasar más a menudo lo que se falla y espaciar lo que se domina.
- **Prueba de fragilidad**: refactorizar sin cambiar el comportamiento para comprobar que los tests no dependen de la implementación.

## Preguntas de repaso

1. ¿Por qué el `ReviewDeck` usa un fake para `CardStore` pero un mock para `MasteryNotifier`?
   R: Porque el store tiene estado que se puede observar después de la acción (probar estado es más robusto), mientras que la notificación es un efecto externo cuyo único rastro observable es la llamada; además, importa que se haga exactamente una vez.
2. ¿Qué aporta la propiedad "para cualquier secuencia de respuestas la caja está entre 1 y 5" frente a los tests de ejemplo?
   R: Explora automáticamente muchísimas secuencias que no escribirías a mano y verifica una invariante del dominio en todas ellas; si existe una combinación que rompe la regla (por ejemplo, subir de la caja 5), la encuentra y la reduce al caso mínimo.
3. ¿Qué indica que un test falle en el paso 6 (prueba de fragilidad)?
   R: Que el test depende de detalles de implementación (orden de llamadas, consultas internas, estado privado) en lugar de del comportamiento observable; hay que reescribirlo para que pruebe el resultado a través de la API pública.

## Explícalo con tus palabras

Explica a alguien por qué escribir el test antes que el código te ayudó (o no) a diseñar el `ReviewDeck`, con un ejemplo concreto de este proyecto.
