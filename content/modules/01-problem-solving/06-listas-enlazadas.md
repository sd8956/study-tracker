---
title: Listas enlazadas y la técnica del corredor
kind: lesson
hours: 2
sources: Grokking Algorithms, cap. 2 "Arrays and linked lists" (pp. 43–55) | Think Like a Programmer, cap. 4 "Linked Lists" (pp. 131–142, solo como referencia conceptual) | Cracking the Coding Interview, cap. 2 "Linked Lists" (pp. 104–107)
links: VisuAlgo, listas enlazadas | https://visualgo.net/en/list
---

## Objetivo

Implementar una lista enlazada simple en TypeScript, comparar sus costos con los de un array y resolver problemas típicos con punteros, incluida la técnica del corredor (dos punteros a distinta velocidad).

## Estudio

### La idea: elementos dispersos que se señalan

En la sesión anterior viste que un array guarda los elementos en cajones contiguos. Una **lista enlazada** hace lo contrario: cada elemento puede estar en cualquier cajón de la memoria, y cada uno guarda, además de su valor, la **dirección del siguiente**. Es como una búsqueda del tesoro: cada pista te dice dónde está la siguiente.

```
head
 │
 ▼
┌────┬───┐    ┌────┬───┐    ┌────┬───┐    ┌────┬──────┐
│ 12 │ ●─┼──► │  7 │ ●─┼──► │ 33 │ ●─┼──► │  5 │ null │
└────┴───┘    └────┴───┘    └────┴───┘    └────┴──────┘
  nodo          nodo          nodo          nodo
```

Cada caja es un **nodo**. La lista solo necesita recordar dónde está el primero (`head`). El último apunta a `null`, que marca el final.

### Por qué existe: el costo de mover butacas

Recuerda la analogía del cine: en un array, insertar en el medio obliga a correr a todos. En una lista enlazada, insertar es **cambiar dos flechas**:

```
antes:   [7] ──────────► [33]
después: [7] ──► [20] ──► [33]
```

1. El nodo nuevo (`20`) apunta a donde apuntaba `7` (o sea, a `33`).
2. `7` pasa a apuntar al nodo nuevo.

Nadie se mueve. Si ya tienes una referencia al nodo `7`, la inserción es O(1). Lo mismo con el borrado: para quitar `33`, haces que `7` apunte a lo que venía después de `33`.

Otra ventaja: no necesitas un bloque contiguo grande. Si la memoria está fragmentada (muchos huecos pequeños), una lista puede crecer igual; un array necesita encontrar un hueco del tamaño total.

### El precio: no hay acceso aleatorio

Para llegar al elemento número 500 de una lista tienes que seguir 500 flechas desde `head`. No hay fórmula de dirección porque los nodos están dispersos. Leer por posición es **O(n)**.

| Operación | Array | Lista enlazada simple |
| --- | --- | --- |
| Leer posición `i` | O(1) | O(n) |
| Insertar al inicio | O(n) | O(1) |
| Insertar al final | O(1) amortizado | O(1) si guardas `tail`, si no O(n) |
| Insertar en el medio (ya teniendo el nodo previo) | O(n) | O(1) |
| Borrar en el medio (ya teniendo el nodo previo) | O(n) | O(1) |
| Buscar un valor | O(n) | O(n) |
| Memoria extra por elemento | ninguna | una referencia |
| Localidad de caché | excelente | mala |

Ojo con la trampa de la tabla: "insertar en el medio O(1)" solo vale **si ya tienes el nodo**. Si primero tienes que encontrarlo, recorrer cuesta O(n). En la práctica, los arrays ganan muchas veces incluso donde la teoría favorece a la lista, porque recorrer memoria contigua es muchísimo más rápido para el procesador. Las listas brillan cuando haces muchas inserciones y borrados en puntos que ya tienes localizados (por ejemplo, en una cache LRU, que combina un mapa con una lista doblemente enlazada).

### Una nota sobre punteros y memoria

En lenguajes como C o C++, las flechas son **punteros** (direcciones de memoria) y tú decides cuándo reservar y liberar cada nodo. Ahí aparecen conceptos como el **stack** (memoria de las variables locales, que se libera sola al terminar la función) y el **heap** (memoria pedida explícitamente, que vive hasta que la liberas), y errores como fugas de memoria o punteros colgantes. En TypeScript no manejas direcciones: las variables que contienen objetos guardan **referencias**, que cumplen el mismo papel que un puntero, y el recolector de basura libera los nodos a los que nadie apunta. La lógica de "cambiar flechas" es idéntica; lo que desaparece es la gestión manual de memoria. Por eso esta sesión no profundiza en punteros de C++.

### Implementación en TypeScript

```ts
export class ListNode<T> {
  constructor(public value: T, public next: ListNode<T> | null = null) {}
}

export class LinkedList<T> {
  head: ListNode<T> | null = null;
  private tail: ListNode<T> | null = null;
  private _size = 0;

  get size(): number { return this._size; }

  prepend(value: T): void {
    const node = new ListNode(value, this.head);
    this.head = node;
    if (this.tail === null) this.tail = node; // lista estaba vacía
    this._size++;
  }

  append(value: T): void {
    const node = new ListNode(value);
    if (this.tail === null) { this.head = this.tail = node; }
    else { this.tail.next = node; this.tail = node; }
    this._size++;
  }

  removeFirst(value: T): boolean {
    if (this.head === null) return false;
    if (this.head.value === value) {               // caso especial: borrar la cabeza
      this.head = this.head.next;
      if (this.head === null) this.tail = null;
      this._size--;
      return true;
    }
    let prev = this.head;
    while (prev.next !== null && prev.next.value !== value) prev = prev.next;
    if (prev.next === null) return false;           // no estaba
    if (prev.next === this.tail) this.tail = prev;  // caso especial: borrar la cola
    prev.next = prev.next.next;
    this._size--;
    return true;
  }

  *[Symbol.iterator](): Iterator<T> {
    for (let n = this.head; n !== null; n = n.next) yield n.value;
  }
}
```

Fíjate en los **casos especiales**: lista vacía, borrar la cabeza, borrar la cola. Son el lugar donde se esconden casi todos los bugs de listas. Una técnica para reducirlos es el **nodo centinela** (un nodo falso al inicio que nunca se borra): así "borrar la cabeza" se convierte en "borrar el siguiente del centinela" y desaparece el caso especial.

```ts
function removeAll<T>(head: ListNode<T> | null, value: T): ListNode<T> | null {
  const dummy = new ListNode<T>(undefined as T, head);
  let prev = dummy;
  while (prev.next !== null) {
    if (prev.next.value === value) prev.next = prev.next.next;
    else prev = prev.next;
  }
  return dummy.next;
}
```

### Recorrer: el patrón base

Casi todo algoritmo sobre listas empieza así:

```ts
let current = head;
while (current !== null) {
  // hacer algo con current.value
  current = current.next;
}
```

Y la mitad de los bugs vienen de olvidar `current = current.next` (bucle infinito) o de acceder a `current.next.value` sin comprobar que `current.next` no es `null`.

Un truco mental: **dibuja**. Con listas, dibujar cajas y flechas en papel antes y después de cada operación es casi obligatorio. Si no puedes dibujarlo, no lo programes todavía.

### Variantes

- **Lista doblemente enlazada:** cada nodo tiene `next` y `prev`. Permite recorrer en ambos sentidos y borrar un nodo en O(1) teniendo solo ese nodo. Cuesta una referencia más por nodo y más flechas que mantener coherentes.
- **Lista circular:** el último apunta al primero. Útil para turnos rotativos (round-robin).

### La técnica del corredor (runner)

Muchos problemas de listas se resuelven con **dos punteros que avanzan a distinta velocidad o con distinta ventaja**. Se llama técnica del corredor.

**Problema 1: el elemento del medio en una sola pasada.** Un puntero `slow` avanza de a 1, un puntero `fast` de a 2. Cuando `fast` llega al final, `slow` está en el medio.

```ts
function middle<T>(head: ListNode<T> | null): ListNode<T> | null {
  let slow = head, fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow!.next;
    fast = fast.next.next;
  }
  return slow;
}
```

**Problema 2: el k-ésimo desde el final.** Adelanta `fast` k posiciones. Luego mueve ambos a la misma velocidad. Cuando `fast` llega al final, `slow` está a k posiciones del final. O(n) tiempo, O(1) espacio, sin conocer la longitud.

```
k = 2      fast adelantado 2
[a] [b] [c] [d] [e] null
 s       f
... avanzan juntos ...
[a] [b] [c] [d] [e] null
             s        f   → s = "d", 2.º desde el final
```

**Problema 3: detectar un ciclo.** Si la lista tiene un ciclo (algún nodo apunta a uno anterior), un recorrido normal nunca termina. Con `slow` (de a 1) y `fast` (de a 2): si hay ciclo, `fast` termina alcanzando a `slow` dentro del ciclo, como un corredor rápido que da una vuelta de ventaja en una pista circular. Si no hay ciclo, `fast` llega a `null`.

```ts
function hasCycle<T>(head: ListNode<T> | null): boolean {
  let slow = head, fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}
```

Hay una extensión famosa: cuando se encuentran, si devuelves uno de los punteros a `head` y avanzas ambos de a 1, el punto donde vuelven a coincidir es **el inicio del ciclo**. La razón es aritmética: la distancia desde `head` al inicio del ciclo es igual (módulo la longitud del ciclo) a la distancia desde el punto de encuentro al inicio del ciclo. No hace falta memorizar la prueba, pero sí saber que existe.

### Problemas recursivos con listas

Una lista es una estructura **recursiva**: una lista es o bien `null`, o bien un nodo seguido de otra lista. Esa definición sugiere soluciones recursivas naturales:

```ts
function length<T>(node: ListNode<T> | null): number {
  return node === null ? 0 : 1 + length(node.next);
}
```

Invertir una lista también tiene una versión iterativa clásica que conviene saber de memoria, porque aparece en muchas variantes:

```ts
function reverse<T>(head: ListNode<T> | null): ListNode<T> | null {
  let prev: ListNode<T> | null = null;
  let current = head;
  while (current !== null) {
    const next = current.next; // 1. guardar el resto
    current.next = prev;       // 2. invertir la flecha
    prev = current;            // 3. avanzar prev
    current = next;            // 4. avanzar current
  }
  return prev;
}
```

Recorrido con `1 → 2 → 3`:

```
prev=null cur=1 : 1→null          prev=1 cur=2
prev=1    cur=2 : 2→1→null        prev=2 cur=3
prev=2    cur=3 : 3→2→1→null      prev=3 cur=null  → devuelve 3
```

Recuerda que la recursión usa O(n) de pila: para listas muy largas, la versión iterativa es más segura.

### La lista doblemente enlazada en detalle

La lista simple tiene una limitación molesta: para borrar un nodo necesitas el **anterior**, y para encontrar el anterior tienes que recorrer desde `head`. La lista doblemente enlazada resuelve eso guardando también `prev` en cada nodo.

```ts
class DNode<T> {
  prev: DNode<T> | null = null;
  next: DNode<T> | null = null;
  constructor(public value: T) {}
}

class DoublyLinkedList<T> {
  // Dos centinelas: head y tail falsos que nunca se borran.
  private readonly head = new DNode<T>(undefined as T);
  private readonly tail = new DNode<T>(undefined as T);
  constructor() { this.head.next = this.tail; this.tail.prev = this.head; }

  pushFront(value: T): DNode<T> {
    const node = new DNode(value);
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next!.prev = node;
    this.head.next = node;
    return node; // devolvemos el nodo para poder borrarlo luego en O(1)
  }

  remove(node: DNode<T>): void {
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
    node.prev = node.next = null;
  }

  popBack(): T | undefined {
    const last = this.tail.prev!;
    if (last === this.head) return undefined; // vacía
    this.remove(last);
    return last.value;
  }
}
```

Con **dos centinelas**, `remove` no tiene ni un solo `if`: todo nodo real siempre tiene un `prev` y un `next` (aunque sean los centinelas). Es un buen ejemplo de cómo una decisión de diseño elimina casos especiales en lugar de manejarlos.

¿Para qué sirve en la práctica? El ejemplo clásico es una **cache LRU** (Least Recently Used): guarda como máximo `N` elementos y, cuando se llena, expulsa el que se usó hace más tiempo. Se construye con:

- Un `Map` de clave → nodo, para encontrar cualquier elemento en O(1).
- Una lista doble ordenada por uso: al usar un elemento, lo quitas de donde esté (`remove`, O(1) porque tienes el nodo) y lo pones al frente (`pushFront`, O(1)). Al expulsar, quitas el del final (`popBack`, O(1)).

Ninguna de las dos estructuras sola logra todo en O(1): el mapa no sabe del orden y la lista no busca rápido. Combinarlas es una idea que se repite mucho en diseño de sistemas.

### Sumar dos números representados como listas, paso a paso

Este problema es un excelente entrenamiento de método. Los números se guardan con un dígito por nodo, en orden inverso: `7 → 1 → 6` representa 617, y `5 → 9 → 2` representa 295. La suma, 912, debe devolverse igual: `2 → 1 → 9`.

**Replanteo:** es la suma escolar en columnas, empezando por las unidades. El orden inverso es una ayuda, no un obstáculo: el primer nodo de cada lista son justamente las unidades.

**Recorrido a mano:**

```
   7 → 1 → 6
 + 5 → 9 → 2
 -----------
 7+5 = 12 → escribo 2, llevo 1
 1+9+1 = 11 → escribo 1, llevo 1
 6+2+1 = 9 → escribo 9, llevo 0
 resultado: 2 → 1 → 9
```

**Casos especiales que salen del ejemplo:** listas de distinta longitud (trata el nodo que falta como 0) y un acarreo final (`5 + 5` da `0 → 1`).

```ts
function addLists(a: ListNode<number> | null, b: ListNode<number> | null): ListNode<number> | null {
  const dummy = new ListNode(0);
  let tail = dummy;
  let carry = 0;
  while (a !== null || b !== null || carry > 0) {
    const sum = (a?.value ?? 0) + (b?.value ?? 0) + carry;
    tail.next = new ListNode(sum % 10);
    tail = tail.next;
    carry = Math.floor(sum / 10);
    a = a?.next ?? null;
    b = b?.next ?? null;
  }
  return dummy.next;
}
```

Fíjate en cómo la condición del `while` incluye `carry > 0`: así el acarreo final se maneja sin código extra. Y el nodo `dummy` vuelve a evitar el caso especial del primer nodo. Variante para practicar: si los dígitos vinieran en orden normal (`6 → 1 → 7`), tendrías que invertir las listas primero o usar recursión/pila para sumar desde el final.

### Problemas tipo entrevista (enunciados propios)

- **Eliminar duplicados** de una lista desordenada: con un `Set` de vistos, O(n) tiempo y O(n) espacio. Sin memoria extra: dos punteros (por cada nodo, recorrer el resto borrando iguales), O(n²) tiempo y O(1) espacio. Es un buen ejemplo de **intercambiar tiempo por espacio**.
- **Sumar dos números** representados como listas de dígitos en orden inverso (`3 → 1 → 5` es 513): recorrer ambas a la vez sumando dígito a dígito con acarreo, igual que la suma escolar.
- **Particionar** alrededor de un valor `x` (los menores primero): construir dos listas (menores y mayores o iguales) y unirlas al final.
- **¿Es palíndromo?**: encontrar el medio con el corredor, invertir la segunda mitad y comparar.

En todos, la combinación ganadora es: dibujar, identificar casos especiales (lista vacía, un nodo, dos nodos) y usar punteros auxiliares.

### Errores comunes

- **Perder el resto de la lista** al cambiar una flecha antes de guardar `next`.
- **No actualizar `tail`** al borrar el último o al insertar en una lista vacía.
- **Acceder a `.next` de `null`**: comprueba siempre antes de avanzar dos pasos.
- **Olvidar el caso de la cabeza**: usa un nodo centinela.
- **Creer que la lista siempre es más rápida para insertar**: solo si ya tienes el nodo; buscarlo cuesta O(n).
- **Elegir lista enlazada "por si acaso"**: en la mayoría de situaciones un array es más rápido en la práctica.
- **Comparar nodos por valor cuando debías comparar por identidad**: en detección de ciclos o intersección de listas, dos nodos distintos pueden tener el mismo valor; compara referencias (`===` entre nodos), no `value`.
- **Romper la lista del usuario sin avisar**: funciones como `isPalindrome` que invierten la segunda mitad deberían restaurarla antes de devolver, o documentar que modifican la entrada.

## Conceptos clave

- **Nodo**: unidad de la lista enlazada que guarda un valor y una referencia al siguiente.
- **Head / tail**: referencias al primer y último nodo de la lista.
- **Lista doblemente enlazada**: cada nodo apunta al siguiente y al anterior.
- **Nodo centinela (dummy)**: nodo falso al inicio que elimina casos especiales al insertar o borrar la cabeza.
- **Técnica del corredor**: dos punteros que avanzan a distinta velocidad o con ventaja para encontrar el medio, el k-ésimo desde el final o un ciclo.
- **Referencia**: valor que identifica un objeto en memoria; en TypeScript cumple el papel del puntero.
- **Stack vs heap**: memoria automática de las llamadas frente a memoria de objetos de vida más larga.

## Preguntas de repaso

1. ¿En qué situaciones una lista enlazada es mejor que un array y en cuáles es peor?
   R: Es mejor cuando haces muchas inserciones o borrados al inicio o en puntos que ya tienes localizados, porque solo cambias referencias en O(1) y no hay que mover elementos ni buscar memoria contigua. Es peor para acceder por posición (O(n) frente a O(1)), usa memoria extra por nodo y tiene mala localidad de caché, así que recorrerla es más lento en la práctica.
2. ¿Cómo encuentras el k-ésimo elemento desde el final en una sola pasada y sin conocer la longitud?
   R: Con dos punteros: adelantas uno k posiciones y luego avanzas ambos de a uno. Cuando el adelantado llega al final (null), el otro está a k posiciones del final. Es O(n) tiempo y O(1) espacio.
3. ¿Por qué el algoritmo de los dos corredores detecta un ciclo?
   R: Porque si hay un ciclo, ambos punteros terminan dando vueltas dentro de él, y como el rápido avanza un nodo más por paso que el lento, la distancia entre ellos se reduce de a uno hasta que coinciden. Si no hay ciclo, el rápido llega a null y el algoritmo termina.
4. ¿Qué problema resuelve el nodo centinela?
   R: Elimina el caso especial de insertar o borrar la cabeza: como siempre hay un nodo antes del primero real, todas las operaciones se escriben como "modificar el siguiente de prev", sin un `if` aparte para la cabeza.
5. En la inversión iterativa de una lista, ¿por qué hay que guardar `next` antes de cambiar `current.next`?
   R: Porque al hacer `current.next = prev` se pierde la única referencia al resto de la lista. Si no guardaste antes `next`, no puedes seguir avanzando y el resto de los nodos queda inaccesible.
6. ¿Qué cambia entre manejar listas en C++ y en TypeScript?
   R: La lógica de enlazar y desenlazar nodos es la misma. En C++ usas punteros y gestionas memoria manualmente (reservar y liberar en el heap), con riesgo de fugas o punteros colgantes. En TypeScript usas referencias y el recolector de basura libera los nodos sin referencias.

## Ejercicio

Con tu clase `LinkedList<T>` de esta sesión, implementa: `reverse()` (iterativo, en el lugar), `kthFromEnd(k)` con dos punteros, `hasCycle()` y `isPalindrome()` (medio con corredor + invertir la segunda mitad + comparar). Escribe tests para lista vacía, un nodo, dos nodos y listas de longitud par e impar.

Criterio de terminado: todos los tests pasan; ninguna función usa arrays auxiliares (salvo los tests); cada método tiene un comentario con su Big O de tiempo y espacio.

## Explícalo con tus palabras

Explica con un dibujo de cajas y flechas cómo se invierte una lista enlazada de tres nodos y por qué el orden de las cuatro asignaciones importa.
