---
title: Proyecto 1 — refactorizar una base de código TypeScript sucia
kind: project
hours: 3
sources: Clean Code, caps. 1–8 (pp. 32–151) | The Pragmatic Programmer, temas 3, 23–26 (pp. 42–45, 191–221)
---

## Objetivo

Aplicar en un solo proyecto todo lo de las sesiones 1–9: nombres, funciones, comentarios, formato, objetos frente a estructuras de datos, manejo de errores, contratos, fronteras y recursos. Partes de un pequeño servicio de reservas de salas escrito a propósito de la peor manera posible y lo dejas limpio, sin cambiar su comportamiento y con tests que lo demuestran.

## Estudio

### El método: caracterizar, luego limpiar

Refactorizar es cambiar la estructura del código **sin cambiar su comportamiento**. Para saber que no cambiaste el comportamiento necesitas tests. Pero el código sucio casi nunca tiene tests, y a veces ni siquiera sabes con exactitud qué hace. La técnica para salir de ese círculo es escribir **tests de caracterización**: tests que no comprueban lo que el código *debería* hacer, sino lo que *hace hoy*, aunque sea raro. Si un test de caracterización revela un comportamiento que parece un bug, no lo arregles durante el refactor: anótalo y arréglalo después, en un commit separado y con su propio test.

El orden de trabajo de este proyecto es:

1. **Leer y entender** el código, sin tocarlo.
2. **Caracterizar** su comportamiento con tests.
3. **Refactorizar en pasos pequeños**, ejecutando los tests después de cada paso, con un commit por paso.
4. **Arreglar los bugs encontrados**, cada uno con su test y su commit.
5. **Revisar** contra la checklist final.

### El código de partida

Crea un proyecto nuevo (`npm init -y`, TypeScript, Vitest) y copia este archivo en `src/booking.ts`. Está escrito a propósito con todos los problemas que viste en el módulo: nombres crípticos, una función gigante, flags, números mágicos, comentarios inútiles, `any`, `null`, errores tragados, estado global, choques de trenes y recursos sin liberar.

```ts
// booking.ts - sistema de reservas
// autor: dev1, modificado por dev2 2021, dev3 2022
import * as fs from "node:fs";

export let DB: any = { rooms: [], bookings: [], users: [] }; // la base de datos
let lf: any; // log file

// inicializar
export function init(d: any) {
  DB = d;
  lf = fs.openSync("/tmp/booking.log", "a");
}

// hace la reserva
export function doIt(u: any, r: any, d: string, h: number, n: number, f: boolean) {
  // buscar user
  let usr = null;
  for (let i = 0; i < DB.users.length; i++) {
    if (DB.users[i].id == u) usr = DB.users[i];
  }
  if (usr == null) return null;
  // buscar sala
  let rm = null;
  for (let i = 0; i < DB.rooms.length; i++) {
    if (DB.rooms[i].id == r) rm = DB.rooms[i];
  }
  if (rm == null) return -1;
  if (n > rm.cap) return -2; // muy grande
  if (h < 8 || h > 20) return -3;
  // comprobar si esta libre
  for (const b of DB.bookings) {
    if (b.r == r && b.d == d && b.h == h && b.st != "X") return -4;
  }
  // precio
  let p = rm.pr * 1;
  if (usr.t == 1) p = p * 0.8; // estudiante
  if (usr.t == 2) p = p * 0.5; // profesor
  if (f) p = p + 15000; // con proyector
  if (h >= 18) p = p * 1.1;
  // guardar
  const bk = { id: DB.bookings.length + 1, u: u, r: r, d: d, h: h, n: n, p: p, st: "A", proj: f };
  DB.bookings.push(bk);
  try {
    fs.writeSync(lf, "reserva " + bk.id + " " + usr.mail + "\n");
  } catch (e) {}
  // mandar mail
  // sendMail(usr.mail, "Reserva confirmada")
  return bk;
}

// cancelar
export function cancel(id: any, u: any) {
  for (const b of DB.bookings) {
    if (b.id == id) {
      if (b.u != u && DB.users.find((x: any) => x.id == u).t != 9) return false; // 9 = admin
      b.st = "X";
      return true;
    }
  }
  return false;
}

// total facturado del dia
export function tot(d: string) {
  let t = 0;
  for (const b of DB.bookings) if (b.d == d && b.st == "A") t += b.p;
  return Math.round(t);
}
```

### Qué está mal (pistas, no la lista completa)

| Síntoma | Sesión donde se trató |
| --- | --- |
| `doIt`, `tot`, `u`, `r`, `h`, `n`, `p`, `st` | 4, nombres |
| `doIt` valida, busca, calcula precio, guarda, registra y "notifica" | 5, funciones |
| Flag `f` para el proyector | 5, funciones |
| Códigos mágicos `null`, `-1`, `-2`, `-3`, `-4` como resultado | 5 y 8, excepciones y `Result` |
| Comentarios de autoría, redundantes y código comentado | 6, comentarios |
| `DB` global mutable y exportado | 7, desacoplamiento |
| `DB.users.find(...).t` puede reventar con `undefined` | 7 y 8, Demeter y no pasar/devolver `null` |
| `catch (e) {}` tragándose errores | 8, crash early |
| `/tmp/booking.log` abierto en `init` y nunca cerrado | 9, recursos |
| Tipos de usuario `1`, `2`, `9` y estado `"A"`/`"X"` mágicos | 4, nombres y constantes |

## Qué hacer

1. **Prepara el proyecto (15 min).** TypeScript con `strict: true`, Vitest, Prettier y ESLint con `@typescript-eslint`. Copia `booking.ts` tal cual. Haz el primer commit: "chore: código de partida".
2. **Tests de caracterización (40 min).** Sin cambiar `booking.ts`, escribe en `test/booking.characterization.test.ts` al menos 12 tests que fijen el comportamiento actual de `doIt`, `cancel` y `tot`. Cubre como mínimo: reserva válida; usuario inexistente (`null`); sala inexistente (`-1`); capacidad superada (`-2`); hora fuera de rango, incluidos los bordes 8 y 20 (`-3`); sala ocupada (`-4`); reserva sobre una cancelada (debe permitirse); los descuentos de estudiante y profesor; el recargo de proyector; el recargo de horario nocturno a partir de las 18; cancelación por el dueño, por un admin y por otra persona; total del día con reservas canceladas excluidas. Usa `init` con datos de prueba en cada test. Commit.
3. **Refactor en pasos pequeños (80 min).** Haz al menos 10 commits, cada uno con un solo tipo de cambio y con los tests en verde. Orden sugerido:
   - Introducir tipos (`User`, `Room`, `Booking`, uniones para `UserType` y `BookingStatus`) y eliminar `any`.
   - Renombrar funciones y variables (`doIt` → `createBooking`, `tot` → `dailyRevenue`, etc.).
   - Sustituir números y strings mágicos por constantes o uniones con nombre.
   - Extraer funciones: `findUser`, `findRoom`, `assertWithinOpeningHours`, `isSlotTaken`, `calculatePrice`.
   - Sustituir el flag `f` por un objeto de opciones `{ withProjector: boolean }` o por un tipo de extra; justifica tu decisión en el commit.
   - Sustituir los códigos mágicos por un `Result` con errores tipados (`user-not-found`, `room-not-found`, `over-capacity`, `outside-opening-hours`, `slot-taken`). Los tests de caracterización cambian aquí **solo en la forma de la aserción**, no en qué casos fallan.
   - Sustituir el `DB` global por un repositorio inyectado (`BookingStore` con `findUser`, `findRoom`, `bookingsFor`, `save`) y una implementación en memoria.
   - Mover la regla de cancelación a la entidad o a una función con nombre (`canCancel(booking, user)`), sin choque de trenes.
   - Sustituir el log de archivo por una interfaz `AuditLog` con un adaptador de archivo que abre y cierra el recurso en la misma función (o usa `await using`), y un fake para tests.
   - Borrar comentarios inútiles y código comentado; dejar solo comentarios de intención.
4. **Arreglar bugs (25 min).** Durante la caracterización probablemente encontraste comportamientos dudosos (por ejemplo, `cancel` revienta si el usuario no existe, el id de la reserva se repite si se borran reservas, la hora 20 está permitida aunque cierra a las 20, el redondeo solo se aplica en el total). Elige al menos dos, decide el comportamiento correcto, escribe primero un test que falle y luego el arreglo. Un commit por bug, con el prefijo `fix:`.
5. **Revisión final (20 min).** Recorre la checklist de abajo y escribe un `REFACTOR.md` de máximo una página con: los problemas encontrados, las decisiones tomadas y los bugs corregidos.

### Checklist de terminado

- [ ] `tsc --noEmit` pasa con `strict: true` y sin ningún `any` explícito.
- [ ] Ninguna función supera 15 líneas; ninguna tiene más de 3 parámetros.
- [ ] No hay flags booleanos que cambien lo que hace una función.
- [ ] No hay números ni strings mágicos; todos tienen nombre o son parte de una unión de tipos.
- [ ] Ninguna función devuelve `null` ni códigos numéricos de error.
- [ ] No hay estado global mutable ni `catch` vacíos.
- [ ] El archivo de log (o el recurso que uses) se libera en todos los caminos, con un test que lo comprueba.
- [ ] No quedan comentarios redundantes, de autoría ni código comentado.
- [ ] Todos los tests de caracterización siguen pasando (con aserciones adaptadas solo en forma) y hay al menos dos tests nuevos por bugs corregidos.
- [ ] El historial tiene al menos 12 commits pequeños y descriptivos.

## Conceptos clave

- **Test de caracterización**: test que fija el comportamiento actual del código, aunque sea extraño, para poder refactorizarlo con seguridad.
- **Refactor**: cambio de estructura sin cambio de comportamiento observable.
- **Paso pequeño**: cambio de un solo tipo, verificado por los tests y guardado en su propio commit.
- **Separar refactor de arreglo**: los cambios de comportamiento van en commits distintos, con su propio test.

## Preguntas de repaso

1. ¿Por qué no debes corregir un bug en el mismo commit en que refactorizas?
   R: Porque el refactor promete no cambiar el comportamiento y el arreglo lo cambia a propósito. Mezclarlos impide saber qué cambio causó qué efecto, complica la revisión y hace imposible revertir uno sin el otro.
2. ¿Qué diferencia hay entre un test de caracterización y un test normal?
   R: El test normal comprueba lo que el código debería hacer según los requisitos; el de caracterización registra lo que el código hace hoy, aunque sea incorrecto, para detectar cualquier cambio accidental durante el refactor.
3. Al sustituir los códigos `-1`, `-2`... por un `Result`, ¿por qué es aceptable cambiar los tests de caracterización?
   R: Porque cambia la forma en que se expresa el resultado, no qué casos tienen éxito o fallan. La aserción se adapta a la nueva representación, pero cada test sigue comprobando el mismo caso y el mismo desenlace.

## Explícalo con tus palabras

Explica a alguien que nunca ha refactorizado por qué los tests tienen que existir antes de empezar a limpiar el código y no después.
