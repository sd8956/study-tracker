---
title: Evaluación — bloque JavaScript (HTML, CSS, JS, APIs y async)
kind: evaluation
hours: 3
sources: Scrimba Fullstack Developer Path — Módulos 2 a 8
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — JavaScript | https://developer.mozilla.org/es/docs/Web/JavaScript
---

## Objetivo

Comprobar que dominas los fundamentos del frontend sin framework: HTML semántico, CSS de layout, DOM, eventos, manipulación de datos y JavaScript asíncrono. Responde sin mirar el código de Scrimba ni tus notas; el tutor corrige tus respuestas.

## Estudio

Cómo hacer esta evaluación (3 h):

1. (≈ 2 h) Responde todas las preguntas por escrito, con tus palabras y con código cuando ayude. En las preguntas de lectura de código, predice el resultado antes de ejecutarlo.
2. (≈ 30 min) Ejecuta en la consola del navegador los fragmentos de código y comprueba tus predicciones.
3. (≈ 30 min) Revisa con el tutor las respuestas flojas y anota qué temas repasar antes de seguir con el módulo de AI Engineering.

## Preguntas de evaluación

1. Explica la diferencia entre HTML semántico y no semántico y da dos razones concretas por las que importa.
   R: El semántico usa etiquetas que describen el significado del contenido (`header`, `nav`, `main`, `article`, `button`); el no semántico usa `div` y `span` para todo. Importa por accesibilidad (los lectores de pantalla navegan por regiones y reconocen controles; un `div` con `onclick` no es accesible por teclado) y por SEO y mantenimiento (buscadores y desarrolladores entienden la estructura).
2. Un `<div class="box">` tiene `width: 300px; padding: 20px; border: 5px solid`. ¿Qué ancho ocupa en pantalla con `box-sizing: content-box` y con `border-box`?
   R: Con `content-box` ocupa 300 + 2·20 + 2·5 = 350 px, porque el ancho se aplica solo al contenido. Con `border-box` ocupa 300 px, porque padding y borde se restan del contenido (que queda en 250 px).
3. ¿Qué imprime `const a = [1, 2, 3]; const b = a; b.push(4); console.log(a.length, a === [1, 2, 3, 4])`? Explica por qué.
   R: Imprime `4 false`. `b` apunta al mismo array que `a` (los arrays son referencias), así que `push` modifica el único array y `a.length` es 4. La comparación es `false` porque `===` entre objetos compara referencias y el literal crea un array nuevo distinto.
4. ¿Cuándo usarías CSS Grid y cuándo flexbox? Describe un layout que combine ambos.
   R: Grid para layouts bidimensionales (filas y columnas a la vez); flexbox para alinear elementos en una dirección. Ejemplo: la página usa grid con áreas `header`, `sidebar`, `main` y `footer`, y dentro del header un contenedor flex alinea el logo a la izquierda y los enlaces a la derecha.
5. Explica la delegación de eventos y por qué funciona con elementos añadidos después de registrar el listener.
   R: Consiste en registrar un único listener en un ancestro (o `document`) y decidir qué hacer según `event.target` (por ejemplo, su `dataset`). Funciona porque los eventos se propagan (bubbling) desde el elemento pulsado hacia sus ancestros; el ancestro existe desde el principio, así que recibe también los clics de elementos creados después.
6. ¿Qué imprime este código y en qué orden? `console.log(1); setTimeout(() => console.log(2), 0); Promise.resolve().then(() => console.log(3)); console.log(4)`
   R: `1, 4, 3, 2`. Primero todo el código síncrono (1 y 4). Luego se vacía la cola de microtareas, donde están los `.then` de las promesas (3). Por último se ejecuta la tarea del temporizador (2), aunque su retraso sea 0.
7. Este código no muestra un error cuando la API devuelve 404: `try { const res = await fetch(url); const data = await res.json(); render(data) } catch (e) { showError() }`. ¿Por qué y cómo lo corriges?
   R: Porque `fetch` solo rechaza por fallos de red; una respuesta 404 se resuelve con normalidad y `res.json()` puede incluso tener éxito con el cuerpo de error. Hay que añadir `if (!res.ok) throw new Error("HTTP " + res.status)` tras el `fetch`, para que el `catch` lo capture.
8. Explica la diferencia entre `map`, `filter`, `find` y `reduce` y da un ejemplo de uso de cada uno con un carrito de compras.
   R: `map` transforma cada elemento y devuelve un array del mismo largo (nombres de los productos). `filter` devuelve los elementos que cumplen una condición (productos en oferta). `find` devuelve el primer elemento que cumple (el producto con id 7) o `undefined`. `reduce` acumula el array en un solo valor (el total: `cart.reduce((s, p) => s + p.price * p.qty, 0)`).
9. ¿Por qué hay que usar `JSON.stringify` y `JSON.parse` con `localStorage`, y qué pasa si lees una clave que no existe?
   R: `localStorage` solo guarda strings: `stringify` convierte el array u objeto en texto y `parse` lo reconstruye. Si la clave no existe, `getItem` devuelve `null` (y `JSON.parse(null)` también da `null`), así que hay que comprobarlo y usar un valor por defecto.
10. ¿Qué hace `const { title, ...rest } = movie` y qué contiene `rest`?
    R: Desestructura `movie`: crea la variable `title` con `movie.title` y la variable `rest` con un objeto nuevo que contiene todas las demás propiedades de `movie` excepto `title` (copia superficial).
11. Tienes que pedir tres recursos independientes a una API. Compara hacerlo con tres `await` seguidos y con `Promise.all`. ¿Qué pasa si una falla en cada caso?
    R: Con tres `await` seguidos el tiempo total es la suma de las tres; con `Promise.all` las peticiones van en paralelo y el tiempo es el de la más lenta. Si una falla, en el caso secuencial se lanza el error en ese punto y las siguientes no se ejecutan; con `Promise.all` el conjunto rechaza con el primer error (las otras peticiones igual se hicieron). Si necesitas los resultados parciales, usa `Promise.allSettled`.
12. ¿Por qué no debes guardar una API key de pago en el JavaScript que se envía al navegador y cuál es la alternativa?
    R: Porque todo el código del cliente es público: cualquiera puede leer la key en el código fuente o en la pestaña de red y usarla a tu costa. La alternativa es un servidor propio (backend o función serverless) que guarda la key como variable de entorno y hace la petición en nombre del cliente.
