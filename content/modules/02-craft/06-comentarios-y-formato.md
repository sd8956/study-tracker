---
title: Comentarios y formato
kind: lesson
hours: 2
sources: Clean Code, cap. 4 Comments (pp. 84–105) | Clean Code, cap. 5 Formatting (pp. 106–123)
---

## Objetivo

Distinguir los comentarios que aportan de los que estorban, aprender a expresar la intención en el propio código y aplicar reglas de formato vertical y horizontal que hagan que un archivo se lea como un periódico. Al terminar vas a poder limpiar los comentarios y el formato de un archivo TypeScript con criterio.

## Estudio

### Los comentarios no compensan el mal código

Martin abre el capítulo con una postura fuerte: **en el mejor de los casos, los comentarios son un mal necesario**. Si los lenguajes de programación fueran lo bastante expresivos, o si nosotros fuéramos lo bastante hábiles para usarlos, casi no necesitaríamos comentarios. Cada comentario es, en cierto modo, una admisión de que no conseguimos expresar algo con código.

La razón práctica es que **los comentarios mienten**. No a propósito, sino por envejecimiento. El código cambia, se mueve y se refactoriza; los comentarios rara vez se actualizan con el mismo cuidado. Con el tiempo, un comentario queda separado del código que describía o describe un comportamiento que ya no existe. Y un comentario incorrecto es peor que ninguno, porque genera confianza en algo falso.

Por eso, cuando sientas la necesidad de escribir un comentario, la primera pregunta es: **¿puedo expresar esto con el código?** Cuando el código es confuso, la solución suele ser limpiarlo, no explicarlo.

### Explícate en el código

Compara:

```ts
// Comprueba si el empleado tiene derecho a todos los beneficios
if ((employee.flags & HOURLY_FLAG) && employee.age > 65) { /* ... */ }
```

```ts
if (employee.isEligibleForFullBenefits()) { /* ... */ }
```

La segunda versión no necesita comentario: el nombre del método dice exactamente lo que el comentario intentaba explicar. Y si la regla cambia, el nombre sigue siendo verdad, porque la lógica vive dentro del método.

Dos técnicas muy útiles para reemplazar comentarios:

- **Extraer una función** cuyo nombre sea el comentario.
- **Introducir una variable explicativa** que nombre un resultado intermedio.

```ts
// Antes
// Si el pedido es internacional y pesa más de 20 kg, se cobra recargo
if (order.country !== "CO" && order.items.reduce((w, i) => w + i.weight, 0) > 20) {
  charge(order, SURCHARGE);
}

// Después
const isInternational = order.country !== HOME_COUNTRY;
const isHeavy = totalWeight(order.items) > HEAVY_ORDER_KG;
if (isInternational && isHeavy) {
  charge(order, SURCHARGE);
}
```

### Comentarios buenos

Algunos comentarios sí son necesarios o útiles. Martin enumera varios tipos:

| Tipo | Para qué sirve | Ejemplo |
| --- | --- | --- |
| **Legales** | Licencias y copyright exigidos | `// Copyright (c) 2026 Acme. MIT License.` |
| **Informativos** | Información que el código no puede expresar fácilmente | Explicar el formato que espera una expresión regular |
| **Explicación de la intención** | Por qué se tomó una decisión no obvia | "Ordenamos así para que los pendientes aparezcan primero en el informe" |
| **Clarificación** | Traducir un valor oscuro que no puedes cambiar (librería externa) | `// 0x7FFFFFFF = máximo int32 que acepta la API de pagos` |
| **Advertencia de consecuencias** | Avisar de un riesgo | "No ejecutar en producción: borra la tabla de pruebas" |
| **TODO** | Trabajo pendiente que no se puede hacer ahora | `// TODO(#142): mover cupones a la base de datos` |
| **Amplificación** | Resaltar algo que parece trivial pero es importante | "El trim es crucial: los espacios rompen la comparación con el banco" |
| **Documentación de API pública** | Contrato para quien usa la librería (JSDoc/TSDoc) | `/** Devuelve el precio con IVA. @throws si el precio es negativo */` |

Fíjate que el mejor tipo de comentario suele responder **por qué**, no **qué**. El qué lo dice el código; el porqué muchas veces no se puede deducir.

```ts
// Usamos un pool de una sola conexión porque SQLite bloquea la base
// completa en cada escritura; más conexiones solo producen errores SQLITE_BUSY.
const db = createPool({ max: 1 });
```

Ese comentario es valioso: explica una decisión que, sin él, alguien "arreglaría" subiendo el número de conexiones.

Sobre los TODO: son aceptables como notas, pero no son excusa para dejar código malo. Revísalos con regularidad y enlázalos a un ticket, para que no se conviertan en ventanas rotas.

### Comentarios malos

La mayoría de los comentarios que se ven en el código real caen en esta categoría. Los más frecuentes:

- **Murmullos.** Comentarios escritos porque "hay que comentar", que solo entiende su autor: `// si no hay archivo, se cargan los valores por defecto` (¿cargados por quién?, ¿dónde?).
- **Redundantes.** Repiten lo que el código ya dice y tardan más en leerse que el código:

```ts
// Devuelve el nombre
getName(): string { return this.name; }

/** El día del mes */
private dayOfMonth: number;
```

- **Engañosos.** Dicen algo ligeramente distinto de lo que hace el código, por ejemplo "devuelve cuando el sistema se cierra" cuando en realidad devuelve tras un tiempo de espera.
- **Obligatorios.** Reglas del tipo "toda función debe tener JSDoc" producen comentarios vacíos como `@param title el título`.
- **De diario o bitácora.** Un registro de cambios al principio del archivo (`// 2019-03-02: arreglado bug de fechas`). Para eso existe el control de versiones.
- **Ruido.** `/** Constructor por defecto */`. Después de un tiempo aprendemos a ignorarlos, y con ellos ignoramos también los importantes.
- **Marcadores de posición.** `// ////////// Acciones //////////`. Ocasionalmente útiles, normalmente desorden.
- **Comentarios de cierre de llaves.** `} // fin del while`. Si los necesitas, tus funciones son demasiado largas.
- **Atribuciones.** `// Añadido por Juan`. El control de versiones lo sabe.
- **Código comentado.** Uno de los peores. Nadie se atreve a borrarlo ("¿será importante?") y se queda años. Bórralo: el control de versiones lo recuerda.
- **Información no local.** Un comentario que describe algo que está en otra parte del sistema (por ejemplo, el puerto por defecto que se define en otro archivo). Si ese valor cambia, el comentario miente.
- **Demasiada información.** Discusiones históricas o especificaciones completas pegadas en un comentario.
- **Conexión no obvia.** El comentario debería describir claramente el código que tiene al lado; si necesita su propia explicación, falla.
- **Cabeceras de función** en funciones pequeñas con buen nombre: son innecesarias.

Un ejemplo de antes y después:

```ts
// Antes
/**
 * Clase usuario
 * @author pepe
 * 03/02/2020 - añadido email
 * 05/06/2021 - añadido isAdmin
 */
export class User {
  // el nombre
  name: string;
  // el email
  email: string;
  /** constructor */
  constructor(name: string, email: string) {
    this.name = name; // asigna nombre
    this.email = email; // asigna email
  }
  // validar
  // check() { return this.email.includes("@") }
}
```

```ts
// Después
export class User {
  constructor(
    readonly name: string,
    readonly email: string,
  ) {}
}
```

Todo lo que se eliminó o lo decía el código, o lo sabe el control de versiones, o era código muerto.

### Cuando el comentario es la mejor herramienta

No todo se puede expresar con nombres. Las expresiones regulares, los algoritmos con una base matemática y los rodeos a bugs de librerías externas son tres casos donde un comentario suele ser la mejor opción disponible:

```ts
// Formato esperado: "AAAA-MM-DD HH:mm", por ejemplo "2026-10-20 14:30".
const SCHEDULE_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

// Rodeo para un bug de la librería de PDFs (issue #1234 del repositorio
// oficial): las páginas vacías hacen fallar extractText. Quitar cuando
// actualicemos a la versión 4.
const pages = allPages.filter((page) => page.objects.length > 0);
```

El primero es informativo y además es verificable: un test que use `"2026-10-20 14:30"` como ejemplo lo mantiene honesto. El segundo es una advertencia con fecha de caducidad explícita: dice por qué existe el código y cuándo se puede borrar. En ambos casos, intenta primero que el código hable (por ejemplo, construyendo la regex con partes nombradas) y deja el comentario para lo que no se puede decir de otra manera.

Una buena prueba para cualquier comentario: **si borro el comentario, ¿se pierde información que no está en ningún otro lugar?** Si la respuesta es no, bórralo.

### JSDoc y TSDoc en TypeScript

En una API pública (una librería, un paquete compartido entre equipos) la documentación del contrato sí es valiosa: el editor la muestra al pasar el ratón y quien la usa no tiene por qué leer la implementación. Pero escribe solo lo que el tipo no dice:

```ts
/**
 * Calcula la cuota mensual de un préstamo con interés compuesto.
 *
 * @param annualRate Tasa anual en formato decimal (0.12 = 12 %).
 * @returns Cuota redondeada a dos decimales.
 * @throws RangeError si `months` no es un entero positivo.
 */
export function monthlyPayment(principal: number, annualRate: number, months: number): number {
  /* ... */
}
```

Fíjate en que no repite "@param principal el principal". Documenta el formato de la tasa (que el tipo `number` no expresa), el redondeo y la excepción. En código no público, JSDoc suele ser ruido.

### El propósito del formato

El formato es **comunicación**, y la comunicación es la primera tarea del desarrollador profesional. Quizá pienses que lo importante es que el código funcione, pero la funcionalidad de hoy cambiará en la próxima versión; la legibilidad del código tendrá efecto durante toda su vida. Martin dice que el estilo y la disciplina sobreviven aunque el código original haya cambiado por completo.

### Formato vertical

**Tamaño de los archivos.** Martin analizó varios proyectos Java grandes y exitosos (como JUnit o FitNesse) y encontró que la mayoría de sus archivos tenían menos de 200 líneas, con un máximo de unas 500. Se pueden construir sistemas importantes con archivos pequeños, y los archivos pequeños son más fáciles de entender.

**La metáfora del periódico.** Un buen artículo se lee de arriba abajo: el titular te dice de qué va, el primer párrafo resume, y los detalles aumentan a medida que bajas. Un archivo de código debería ser igual: el nombre del archivo dice si estás en el sitio correcto, arriba están los conceptos de alto nivel y abajo los detalles.

**Apertura vertical entre conceptos.** Separa con una línea en blanco cada grupo de líneas que expresa un pensamiento completo: las importaciones, cada función, los bloques lógicos dentro de una función. Las líneas en blanco son pistas visuales de que empieza un concepto nuevo.

**Densidad vertical.** Al revés: las líneas que están muy relacionadas deben aparecer juntas. Un comentario inútil entre dos campos rompe esa cercanía.

**Distancia vertical.** Los conceptos relacionados deben estar cerca, para que no tengas que saltar por el archivo:

- **Declaraciones de variables** lo más cerca posible de su uso.
- **Variables de instancia** al principio de la clase (en la convención de Java y TypeScript), en un lugar conocido.
- **Funciones dependientes**: si una función llama a otra, deben estar cerca y, si es posible, la que llama arriba de la llamada (la stepdown rule de la sesión anterior).
- **Afinidad conceptual**: funciones que hacen cosas parecidas (por ejemplo, varias sobrecargas de `assert`) van juntas aunque no se llamen entre sí.

**Orden vertical.** Las dependencias de llamada fluyen hacia abajo: lo importante arriba, los detalles de bajo nivel al final.

```ts
// Archivo ordenado como un periódico
export async function publishArticle(draftId: string): Promise<Article> {
  const draft = await loadDraft(draftId);
  assertReadyToPublish(draft);
  return saveAsPublished(draft);
}

async function loadDraft(id: string): Promise<Draft> { /* ... */ }

function assertReadyToPublish(draft: Draft): void { /* ... */ }

async function saveAsPublished(draft: Draft): Promise<Article> { /* ... */ }
```

### Formato horizontal

**Ancho de línea.** Los proyectos que Martin analizó tenían líneas cortas: la mayoría por debajo de 80 caracteres. Su recomendación es no pasar de 120. En TypeScript, Prettier usa 80 por defecto, y muchos equipos lo suben a 100 o 120.

**Apertura y densidad horizontal.** Los espacios agrupan lo que está relacionado y separan lo que no. Por ejemplo, espacios alrededor de los operadores de asignación (`total = price * quantity`) y ninguno entre el nombre de una función y su paréntesis (`calculate(x)`). Algunos estilos usan los espacios para mostrar precedencia (`b*b - 4*a*c`), aunque los formateadores automáticos suelen deshacerlo.

**Alineación horizontal.** Alinear los nombres de variables o los valores en columnas parece ordenado, pero desvía la atención hacia la columna equivocada y se rompe con el primer formateador. Si una lista es tan larga que necesitas alinearla, el problema es el tamaño de la lista.

**Indentación.** La indentación hace visible la jerarquía de ámbitos: archivo, clase, método, bloque. Sin ella, el código sería ilegible. Martin desaconseja colapsar estructuras cortas en una línea (`if (x) return y;` dentro de bloques largos, o funciones de una línea con llaves), aunque esto es un punto donde los equipos difieren.

**Ámbitos falsos.** Un `while` o `for` con cuerpo vacío se esconde fácilmente si el punto y coma está al final de la línea. Si es inevitable, pon el cuerpo vacío visible en su propia línea.

### Reglas de equipo

El punto más importante del capítulo de formato: **un equipo debe acordar un único estilo**. Cada programador tiene sus preferencias, pero el código de un equipo debe parecer escrito por una sola persona. Si cada archivo tiene un estilo distinto, quien lee pierde tiempo adaptándose y las diferencias generan ruido en los diffs y en los code reviews.

En TypeScript, la forma moderna de cumplir esta regla es **automatizarla**:

| Herramienta | Qué resuelve |
| --- | --- |
| **Prettier** (o el formateador de Biome) | Formato horizontal y vertical: indentación, comillas, ancho de línea, comas finales |
| **ESLint** (o el linter de Biome) | Reglas de calidad: variables sin usar, `any` explícito, complejidad, nombres |
| **EditorConfig** | Fin de línea, codificación, indentación entre editores |
| **Hook de pre-commit / CI** | Que nadie suba código sin formatear |

Con un formateador automático, las discusiones sobre dónde va la llave desaparecen de los code reviews, y el equipo puede concentrarse en lo que importa. Verás esto en detalle en la sesión de guías de estilo (sesión 25).

### Ejemplo completo: limpiar comentarios y formato

```ts
// Antes
import {x} from './x'
//helpers
export function   calc(a:number,b:number){
// suma
let r=a+b
    // si es mayor que 100 aplicamos descuento del 10 por ciento porque lo pidió marketing en 2022
if(r>100){r=r*0.9}
  return r // devolvemos
}
// function old(a,b){return a-b}
```

```ts
// Después
import { x } from "./x";

const DISCOUNT_THRESHOLD = 100;
const DISCOUNT_RATE = 0.1;

// Descuento acordado con Marketing (ver docs/pricing.md).
export function priceWithDiscount(basePrice: number, extras: number): number {
  const subtotal = basePrice + extras;
  return subtotal > DISCOUNT_THRESHOLD ? subtotal * (1 - DISCOUNT_RATE) : subtotal;
}
```

Se eliminaron los comentarios redundantes y el código comentado, el porqué útil se conservó pero apuntando a una fuente de verdad en lugar de duplicarla, los números mágicos tienen nombre y el formato es consistente. (La importación de `x` se queda solo para mostrar el formato; en un caso real, si no se usa, también se borra.)

### Errores comunes

- **Comentar el qué en lugar del porqué.**
- **Dejar código comentado "por si acaso".** El historial de Git es tu "por si acaso".
- **Exigir JSDoc en todo.** Produce comentarios vacíos que nadie lee.
- **Discutir formato en code reviews.** Esa energía debería ir a un formateador automático.
- **No actualizar el comentario al cambiar el código.** Si cambias la lógica, revisa los comentarios cercanos o, mejor, elimina la necesidad de tenerlos.

## Conceptos clave

- **Comentario que miente**: comentario desactualizado que contradice al código; peor que no tener comentario.
- **Variable explicativa**: variable intermedia cuyo nombre sustituye a un comentario.
- **Comentario de intención**: explica por qué se tomó una decisión no obvia.
- **Código comentado**: código desactivado dentro de comentarios; debe borrarse porque el control de versiones lo conserva.
- **Metáfora del periódico**: organizar el archivo de lo general (arriba) a lo particular (abajo).
- **Apertura y densidad vertical**: líneas en blanco entre conceptos, cercanía entre líneas relacionadas.
- **Reglas de equipo**: un único estilo acordado y, preferentemente, aplicado por herramientas.

## Preguntas de repaso

1. ¿Por qué Martin considera los comentarios "un mal necesario"?
   R: Porque cada comentario suele indicar que no logramos expresar algo en el código y, sobre todo, porque envejecen: el código cambia y los comentarios no se actualizan, así que terminan mintiendo. Un comentario incorrecto es peor que ninguno.
2. Menciona cuatro tipos de comentarios buenos y da un ejemplo de uno de ellos.
   R: Legales, informativos, de intención, de clarificación, de advertencia de consecuencias, TODO, de amplificación y de documentación de API pública. Ejemplo de intención: "Usamos una sola conexión porque SQLite bloquea la base entera en cada escritura".
3. ¿Qué haces con el código comentado y por qué?
   R: Borrarlo. Nadie se atreve a eliminarlo porque parece importante y se acumula como ruido; el control de versiones ya conserva cualquier versión anterior si alguna vez se necesita.
4. Explica la metáfora del periódico aplicada a un archivo de código.
   R: Como un artículo, el archivo debe tener un nombre que diga de qué trata, arriba los conceptos y funciones de alto nivel, y a medida que bajas, los detalles de implementación. Así quien lee obtiene el panorama primero y profundiza solo si lo necesita.
5. ¿Qué es la distancia vertical y qué reglas da Clean Code para ella?
   R: Es cuán lejos están en el archivo los conceptos relacionados. Las variables se declaran cerca de su uso, las variables de instancia en un lugar conocido al principio, las funciones que se llaman entre sí cerca (la que llama arriba) y las funciones conceptualmente afines juntas.
6. ¿Cómo aplicas las "reglas de equipo" del formato en un proyecto TypeScript moderno?
   R: Acordando un estilo y automatizándolo con un formateador (Prettier o Biome), un linter (ESLint o Biome), EditorConfig y comprobaciones en hooks y CI, para que el formato sea uniforme sin depender de la disciplina individual ni ocupar el code review.

## Ejercicio

Toma un archivo TypeScript tuyo de al menos 100 líneas (o el ejemplo "Antes" de la lección ampliado por ti) y haz una pasada de limpieza: clasifica cada comentario como bueno o malo según las tablas de la lección, elimina o sustituye los malos (por funciones o variables explicativas), ordena el archivo según la metáfora del periódico y configura Prettier con un `.prettierrc` acordado. Terminado cuando no queda código comentado ni comentarios redundantes, cada comentario que queda explica un porqué o un contrato público, y `npx prettier --check` pasa sobre el archivo.

## Explícalo con tus palabras

Explica a alguien que acaba de aprender a programar por qué su profesor le pedía "comentar todo" y por qué en un equipo profesional eso suele ser un error.
