---
title: Evaluación — bloque React (fundamentos, testing y React avanzado)
kind: evaluation
hours: 3
sources: Scrimba Fullstack Developer Path — Módulos 14 React.js Fundamentals, 15 Testing y 16 Advanced React.js
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; React — Documentación | https://es.react.dev/learn
---

## Objetivo

Comprobar que entiendes cómo funciona React por dentro y que sabes diseñar, testear y estructurar una app React con rutas, contexto y autenticación. Responde sin mirar tus proyectos ni las lecciones; el tutor corrige tus respuestas.

## Estudio

Cómo hacer esta evaluación (3 h):

1. (≈ 2 h) Responde todas las preguntas por escrito. En las de lectura de código, predice el comportamiento antes de comprobarlo.
2. (≈ 30 min) Comprueba en un proyecto de Vite las preguntas de código que te generen dudas.
3. (≈ 30 min) Revisa con el tutor y anota qué repasar antes de TypeScript y Next.js.

## Preguntas de evaluación

1. Explica qué provoca un nuevo render de un componente y qué ocurre en las fases de render y commit.
   R: Un componente se vuelve a renderizar cuando cambia su estado, cuando se re-renderiza su padre o cuando cambia un contexto que consume. En la fase de render React llama a las funciones de componente y obtiene el nuevo árbol de elementos; lo compara con el anterior (reconciliación). En la fase de commit aplica al DOM real solo las diferencias y luego ejecuta los efectos.
2. ¿Qué muestra este componente tras un clic y por qué? `const [n, setN] = useState(0); const click = () => { setN(n + 1); setN(n + 1); setN(n + 1) }`
   R: Muestra 1. Las tres llamadas usan el mismo valor de `n` capturado en ese render (0), así que las tres programan `setN(1)`. Para sumar 3 hay que usar la forma funcional: `setN(prev => prev + 1)` tres veces.
3. Este efecto produce un bucle infinito: `useEffect(() => { setItems(data.filter(d => d.active)) })`. Explica por qué y propón dos soluciones.
   R: Al no tener array de dependencias se ejecuta después de cada render; llama a `setItems` con un array nuevo (otra referencia), lo que provoca un render, que vuelve a ejecutar el efecto. Soluciones: no usar estado ni efecto y derivar en el render (`const items = data.filter(d => d.active)`, con `useMemo` si es caro), o, si de verdad hace falta un efecto, ponerle dependencias (`[data]`).
4. ¿Qué es un componente controlado y cuándo preferirías leer el formulario al enviarlo con `FormData`?
   R: Un input cuyo `value` viene del estado y que lo actualiza en `onChange`; React es la fuente de verdad en cada tecla. Leer con `FormData` al enviar (no controlado) es más simple y hace menos renders cuando solo necesitas los valores al final; los controlados convienen cuando necesitas validar o transformar mientras se escribe, o que otros elementos reaccionen a cada cambio.
5. ¿Por qué no se debe usar el índice como `key` en una lista de tareas en la que se pueden insertar y borrar elementos? Describe el bug concreto.
   R: Porque la `key` identifica a cada elemento entre renders. Si borras la primera tarea, la que era índice 1 pasa a ser índice 0 y React cree que es el mismo elemento que antes tenía la key 0: reutiliza su estado interno y su DOM. Resultado típico: un checkbox o un input con texto queda asociado a la tarea equivocada. Hay que usar un id estable.
6. Un `ProductCard` envuelto en `React.memo` recibe `onAdd={() => addToCart(p.id)}` y `style={{ margin: 8 }}`, y se re-renderiza en cada render del padre. ¿Por qué y cómo lo arreglas?
   R: Porque en cada render del padre se crean una función y un objeto nuevos; `memo` compara las props superficialmente, ve referencias distintas y re-renderiza. Arreglo: estabilizar la función con `useCallback` (y pasar el id como prop en lugar de cerrar sobre él), sacar el objeto de estilos fuera del componente o memoizarlo con `useMemo`, o usar una clase CSS. Y antes, medir si de verdad es un problema.
7. Explica el patrón compound components y cómo comparten estado sus piezas.
   R: Es un conjunto de componentes que funcionan juntos con una API declarativa, como `<Tabs>`, `<Tabs.List>`, `<Tabs.Tab>` y `<Tabs.Panel>`. El componente raíz guarda el estado (la pestaña activa) y lo expone mediante un Context; cada pieza lo lee con `useContext`. El consumidor decide estructura y contenido sin pasar props entre las piezas.
8. ¿Qué diferencia hay entre compartir lógica con un custom hook y compartir estado con Context?
   R: Un custom hook reutiliza lógica: cada componente que lo llama tiene su propia copia independiente del estado. Context comparte un mismo valor entre todos los componentes de un subárbol. Si dos componentes deben ver y modificar el mismo dato, necesitas levantar el estado o Context; si solo necesitan el mismo comportamiento, un hook.
9. Diseña las rutas de una app de recetas con: inicio, listado con filtro por categoría, detalle de receta con pestañas (ingredientes y pasos), y una sección "mis recetas" solo para usuarios autenticados. Indica layouts, rutas anidadas, parámetros y qué estado va en la URL.
   R: Un layout raíz con navbar y `<Outlet />`. Dentro: index route para inicio; `recetas` con el filtro en search params (`/recetas?categoria=postres`) para poder compartirlo; `recetas/:id` como layout del detalle con su propio `Outlet` y rutas hijas index (ingredientes) y `pasos`. Una ruta de protección `AuthRequired` que envuelve `mis-recetas` (y sus hijas) y redirige a `/login` con `state.from` si no hay sesión. Una ruta `*` para 404.
10. ¿Por qué una ruta protegida en React no es una medida de seguridad suficiente? ¿Dónde debe estar la seguridad en una app con API propia y en una con Supabase?
    R: Porque el código del cliente lo controla el usuario: puede modificarlo o llamar a la API directamente. En una API propia, el servidor debe verificar la sesión o el token en cada petición y comprobar que el recurso pertenece al usuario. Con Supabase, el cliente consulta la base de datos directamente, así que la seguridad son las políticas de Row Level Security, y la service role key nunca debe llegar al navegador.
11. Escribe en palabras un test con Testing Library para un botón "Mostrar más" que, al pulsarlo, muestra un párrafo oculto. ¿Qué consultas y qué aserciones usarías?
    R: Arrange: renderizar el componente y comprobar con `screen.queryByText(/texto oculto/)` que el párrafo no está (`toBeNull` o `not.toBeInTheDocument`). Act: obtener el botón con `screen.getByRole("button", { name: /mostrar más/i })` y hacer `await user.click(boton)`. Assert: `expect(screen.getByText(/texto oculto/)).toBeInTheDocument()`. Sin consultar clases ni estado interno.
12. ¿Cuándo usarías `findBy...` en un test y cómo testearías un componente que pide datos a una API?
    R: `findBy...` cuando el elemento aparece de forma asíncrona (tras una petición o un temporizador), porque espera hasta que aparece o vence el tiempo. Para la API, sustituyes la red con un doble (`vi.spyOn(global, "fetch")` con una respuesta controlada o Mock Service Worker), compruebas el estado de carga, luego con `findBy` el resultado, y escribes otro test donde la petición falla para verificar el mensaje de error.
