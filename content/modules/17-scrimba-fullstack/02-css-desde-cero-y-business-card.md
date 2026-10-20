---
title: CSS desde cero y la tarjeta de presentación
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 2 HTML and CSS Fundamentals — Intro to CSS; Build a Business Card (primera mitad)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — El modelo de caja | https://developer.mozilla.org/es/docs/Learn/CSS/Building_blocks/The_box_model
---

## Objetivo

Dar estilo a una página con CSS entendiendo selectores, la cascada y el modelo de caja, y empezar el proyecto guiado de la tarjeta de presentación.

## Qué hacer

1. (≈ 60 min) **Módulo 2 HTML and CSS Fundamentals → Intro to CSS** completa: formas de añadir CSS, selectores, colores, tipografía, modelo de caja, `display`.
2. (≈ 30 min) **Build a Business Card**, primera mitad (hasta tener la estructura y los estilos base de la tarjeta).
3. (≈ 30 min) Recuerdo activo: preguntas de repaso sin mirar y consigna Feynman.

## Conceptos clave

- **Regla CSS**: `selector { propiedad: valor; }`. El selector elige elementos y las declaraciones les dan estilo.
- **Selectores básicos**: de tipo (`p`), de clase (`.card`) y de id (`#main`). Prefiere clases: se reutilizan y tienen especificidad baja y predecible.
- **Cascada y especificidad**: si dos reglas chocan, gana la más específica; a igual especificidad, gana la que aparece después.
- **Modelo de caja**: cada elemento es una caja con contenido, `padding`, `border` y `margin`. Con `box-sizing: border-box` el ancho incluye padding y borde, lo que hace los cálculos más intuitivos.
- **`display`**: `block` ocupa todo el ancho y empieza en una línea nueva; `inline` fluye con el texto y no acepta ancho ni alto; `inline-block` fluye pero sí acepta tamaño.
- **CSS externo**: un archivo `.css` enlazado con `<link rel="stylesheet">` separa estilo y estructura y se cachea en el navegador.

## Preguntas de repaso

1. ¿Qué pasa si una regla con selector de clase y otra con selector de tipo le dan distinto color al mismo párrafo?
   R: Gana la regla de clase, porque tiene mayor especificidad que la de tipo, sin importar el orden en que aparezcan.
2. Explica la diferencia entre `margin` y `padding`.
   R: `padding` es el espacio interior entre el contenido y el borde, y toma el fondo del elemento. `margin` es el espacio exterior que separa la caja de otras cajas y es transparente.
3. ¿Por qué se recomienda `box-sizing: border-box`?
   R: Porque así el `width` declarado incluye padding y borde. Con el valor por defecto (`content-box`), añadir padding agranda la caja y rompe los cálculos de layout.
4. ¿Por qué es mejor un archivo CSS externo que estilos en línea con el atributo `style`?
   R: Separa responsabilidades, permite reutilizar estilos en varias páginas, el navegador lo cachea y evita la especificidad altísima de los estilos en línea, que luego cuesta sobrescribir.

## Explícalo con tus palabras

Explica con un dibujo de cajas anidadas cómo se calcula el tamaño final de un botón con `width: 200px`, `padding: 10px` y `border: 2px`, con y sin `border-box`.
