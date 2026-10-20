---
title: Reutilizar componentes y construir tu plan maestro
kind: lesson
hours: 2
sources: Think Like a Programmer, cap. 7 "Solving Problems with Code Reuse" (pp. 217–245) | Think Like a Programmer, cap. 8 "Thinking Like a Programmer" (pp. 246–284)
---

## Objetivo

Reutilizar código de forma que aumente tu capacidad en lugar de reemplazarla, elegir el tipo de componente adecuado para cada problema, y construir tu propio plan maestro de resolución de problemas a partir de tus fortalezas y debilidades, incluido un método para aprender nuevos lenguajes y librerías.

## Estudio

### Buena y mala reutilización

Reutilizar código es indispensable: nadie escribe su propio sistema operativo, su propio motor de base de datos o su propio `sort` para cada proyecto. Pero hay dos formas muy distintas de reutilizar.

**Mala reutilización:** copiar un fragmento que no entiendes (de un compañero, de un foro, de un asistente de IA) y ajustarlo hasta que "parece funcionar". El programa avanza, pero tú no: la próxima vez que enfrentes un problema parecido, sabrás exactamente lo mismo que antes. Y cuando el código falle en un caso que el autor original no previó, no sabrás por qué.

**Buena reutilización:** usar un componente **que entiendes** (sabes qué hace, qué garantiza, cuánto cuesta y cuándo falla) para resolver tu problema más rápido. Puedes no haber escrito el código, pero podrías explicar cómo funciona y por qué es la elección correcta.

El criterio es simple: **¿después de reutilizar, eres mejor programador o solo tienes un programa más largo?** La buena reutilización amplía tus capacidades; la mala solo las disfraza.

Esto es especialmente importante hoy, cuando un asistente puede generar código al instante. El código generado es un componente más: vale la pena si lo entiendes y lo verificas; es un riesgo si lo aceptas sin leerlo.

### Tipos de componentes

"Componente" es cualquier conocimiento de programación reutilizable. Hay cinco tipos, de lo más concreto a lo más abstracto:

| Tipo | Qué es | Ejemplo |
| --- | --- | --- |
| Bloque de código | fragmento concreto que copias y adaptas | el bucle de búsqueda binaria; el patrón de recorrer una lista enlazada |
| Algoritmo | receta para resolver un problema | Dijkstra, quicksort, el algoritmo de Kahn |
| Patrón | solución general a un problema recurrente de diseño | estrategia, iterador, observador, el patrón "ventana deslizante" |
| Tipo abstracto de datos | operaciones y garantías sin implementación fija | pila, cola, mapa, conjunto, cola de prioridad |
| Librería | código empaquetado y probado | `lodash`, `date-fns`, la librería estándar de JavaScript |

Cada tipo pide un nivel distinto de comprensión. Un bloque de código lo entiendes leyéndolo; un algoritmo, sabiendo por qué funciona y cuánto cuesta; un patrón, reconociendo cuándo aplica; un ADT, sabiendo sus operaciones y garantías; una librería, conociendo su API, sus supuestos y sus límites.

### Construir conocimiento de componentes

Hay dos formas complementarias de llenar tu caja de herramientas.

**1. Aprendizaje exploratorio.** Estudias un componente **antes** de necesitarlo, por curiosidad o como inversión. Es lo que hiciste en este módulo con heaps, tries o filtros de Bloom. La clave para que funcione es **ponerlo en práctica de inmediato**: lee sobre el componente y luego resuelve un problema pequeño con él. Un componente que solo leíste se olvida pronto; uno que usaste queda disponible.

Una práctica útil: después de estudiar un componente, piensa en **un problema real** donde lo usarías. "Un heap me serviría para el planificador de recordatorios de mi app: siempre necesito el próximo en vencer." Esa conexión es lo que hace que el componente aparezca en tu mente cuando lo necesites.

**2. Aprendizaje según necesidad.** Enfrentas un problema y buscas un componente que lo resuelva. Tiene tres momentos:

- **Cuándo buscar.** Busca un componente cuando el problema parezca **general** (seguramente alguien ya lo resolvió: ordenar, parsear fechas, calcular distancias entre coordenadas) o cuando tu solución sea **ineficiente** y sospeches que hay algo mejor. Una señal típica: escribiste un doble bucle para encontrar algo y presientes que hay una estructura que lo evita.
- **Cómo encontrarlo.** Describe el problema en términos generales, sin los detalles de tu dominio. No "necesito saber qué pedidos de clientes VIP llegaron tarde en marzo", sino "necesito filtrar y agrupar registros por dos claves". El replanteo de la sesión 01 vuelve a aparecer: reformular en términos generales es lo que te deja encontrar la analogía con problemas conocidos.
- **Cómo aplicarlo.** Antes de integrarlo, pruébalo aislado con un ejemplo pequeño (un experimento, como en la sesión 01). Verifica que hace lo que crees, con tus tipos de datos y tus casos borde.

### Elegir el tipo de componente

Para un mismo problema puede haber componentes de varios tipos. Supón que necesitas ordenar un array de pedidos por fecha y, dentro de cada fecha, por importe:

- **Librería:** `orders.toSorted((a, b) => a.date - b.date || b.amount - a.amount)`. Rápido, probado, estable.
- **Algoritmo propio:** implementar merge sort. Solo tiene sentido si la librería no sirve (datos que no caben en memoria, una estructura que la librería no soporta) o para aprender.
- **Patrón:** si el criterio de orden cambia según el usuario, el patrón **estrategia** (pasar la función de comparación como parámetro) separa el "cómo ordenar" del "qué ordenar".

Criterios para decidir:

1. **¿Existe un componente probado en tu plataforma?** Úsalo, salvo razones concretas.
2. **¿Tu caso tiene requisitos especiales** (memoria, tiempo, estabilidad, datos enormes) que el componente estándar no cumple? Entonces evalúa otro.
3. **¿Cuánto cuesta entenderlo y mantenerlo?** Una dependencia nueva es código que no controlas: actualizaciones, vulnerabilidades, licencia. Para una función de cinco líneas, a veces es mejor escribirla.
4. **¿Qué aprendes?** En formación, implementar es valioso; en producción, lo es la fiabilidad.

### Tu caja de herramientas después de este módulo

Un ejercicio de aprendizaje exploratorio muy útil es **inventariar** lo que ya sabes como componentes, con la señal que te dice cuándo usar cada uno. Este catálogo resume el módulo; úsalo como punto de partida y amplíalo con tus propias notas.

| Señal en el problema | Componente | Sesión |
| --- | --- | --- |
| "Datos ordenados", "encuentra el mínimo valor que cumple X" | búsqueda binaria (sobre el array o sobre la respuesta) | 03 |
| "¿Existe un par / complemento?", "¿ya vi esto?" | `Set` / `Map` con el patrón complemento | 05, 13 |
| "Subarray contiguo", "ventana de tamaño k" | dos punteros, ventana deslizante, sumas prefijo | 05, 13 |
| "Contar frecuencias", "anagramas", "agrupar" | histograma, `Map` de firma → grupo | 05, 13 |
| "Lo más reciente primero", "anidado", "deshacer" | pila; pila monótona para "el siguiente mayor" | 08 |
| "Por orden de llegada", "por niveles" | cola, BFS | 08, 15 |
| "Todas las combinaciones / permutaciones" | backtracking con poda | 10 |
| "Ordenar es la mitad del problema" | `toSorted`, merge sort, counting sort | 11 |
| "Jerarquía", "árbol", "datos anidados" | recursión con caso base en la hoja | 10, 14 |
| "Siempre el menor / mayor", "los k mejores" | heap | 14 |
| "Prefijos", "autocompletar" | trie | 14 |
| "Conexiones", "red", "dependencias" | grafo: BFS, DFS, orden topológico | 15 |
| "Menor costo" con pesos | Dijkstra (con estado ampliado si hay restricciones) | 16 |
| "Elige el mejor en cada paso" y se puede probar intercambio | greedy | 18 |
| "De cuántas formas", "mínimo/máximo con decisiones", subproblemas repetidos | programación dinámica | 19, 20 |
| "Parecido a", "recomendar" | KNN, distancias | 22 |

Dos advertencias para usar la tabla bien. Primero, **las señales son pistas, no reglas**: "ordenado" sugiere búsqueda binaria, pero a veces la solución es con dos punteros. Usa la tabla para generar candidatos y luego verifica con un ejemplo. Segundo, **los problemas reales combinan componentes**: el planificador de salas usa ordenamiento + heap + greedy; el ahorcado tramposo usa agrupación + búsqueda del máximo + estado. Saber combinar es la habilidad que esta tabla no puede darte; solo la práctica la construye.

### Tu plan maestro

En la sesión 01 la primera regla era "ten siempre un plan". Una versión más precisa es: **ten un plan maestro propio y síguelo**. Propio, porque cada programador tiene fortalezas y debilidades distintas, y un plan que funciona para otro puede no funcionar para ti, igual que un entrenador diseña la estrategia según los jugadores que tiene disponibles ese día.

El paso clave es **conocerte**: registrar tus errores para descubrir patrones. No basta con corregir un error; hay que **anotarlo**. Después de unas semanas, el registro revela cosas que de otro modo no verías: "siempre me equivoco en el límite de los bucles", "me cuesta empezar", "mis funciones crecen demasiado".

Las debilidades se agrupan en dos tipos.

**Debilidades de codificación:** errores que repites al escribir código.

- **Errores de borde (*off-by-one*):** el clásico problema de la valla. Si una valla de 50 metros tiene tramos de 10 metros entre postes, ¿cuántos postes necesitas? La respuesta intuitiva es 5, pero son 6 (uno al inicio de cada tramo, más el del final). Los bucles que iteran una vez de más o de menos son el mismo error.
- Confundir asignación y comparación, olvidar casos `null`, mutar datos compartidos sin querer, olvidar el `flush` final.

Defensa: para cada error recurrente, una **contramedida concreta** y verificable.

| Debilidad | Contramedida |
| --- | --- |
| Errores de borde en bucles | probar siempre con 0, 1 y 2 elementos; escribir el invariante del bucle en un comentario |
| Olvidar `null` | activar `strictNullChecks` en TypeScript; tests con entradas vacías |
| Mutar datos compartidos | preferir `toSorted`, spreads e inmutabilidad; `readonly` en tipos |
| Comparar con `==` | regla de lint `eqeqeq` |
| Funciones enormes | límite de tamaño en el linter; extraer funciones con nombre |

Fíjate en cuántas contramedidas son **herramientas automáticas**: el compilador, el linter, los tests. Una buena defensa no depende de acordarte; depende de que el sistema te avise.

**Debilidades de diseño:** problemas en la fase de pensar la solución.

- **Te cuesta empezar.** Contramedida: el primer paso de tu plan siempre es mecánico (replantear el problema por escrito, hacer tres ejemplos a mano), así nunca enfrentas una hoja en blanco.
- **Te cuesta integrar las partes.** Contramedida: diseñar primero las interfaces entre las partes (tipos de entrada y salida) y escribir un test de integración temprano.
- **Diseñas de más** (abstracciones para casos que nunca llegan). Contramedida: resolver primero el caso concreto y generalizar solo cuando aparezca el segundo caso real.
- **Te lanzas a codificar sin pensar.** Contramedida: no abrir el editor hasta tener la solución de fuerza bruta escrita en un comentario.

**Aprovecha tus fortalezas.** El plan maestro no es solo defensivo. Si eres bueno visualizando, dibuja siempre (estados, árboles, tablas de DP). Si eres bueno escribiendo, describe el algoritmo en prosa antes de codificar. Si eres rápido con los tests, usa TDD como motor de diseño. Pero cuidado con una trampa: las fortalezas también pueden volverse debilidades. Quien codifica muy rápido suele saltarse el diseño.

### Un problema para practicar el plan: el ahorcado tramposo

Este problema ilustra bien cómo atacar algo que no sabes resolver de entrada, y obliga a usar varias técnicas a la vez. En el ahorcado normal, el programa elige una palabra secreta y el jugador adivina letras. En la versión **tramposa**, el programa **no elige una palabra**: mantiene la lista de todas las palabras compatibles con lo revelado hasta ahora, y en cada intento elige la respuesta que **deja más palabras posibles**, para que al jugador le cueste lo máximo.

**Replantear:** "en cada turno, dado el conjunto de palabras candidatas y una letra, devuelvo el patrón de respuesta (dónde aparece la letra, si aparece) que conserve el mayor grupo de candidatas".

**Ejemplo:** candidatas de 4 letras `{"casa", "cosa", "masa", "mesa", "pera", "peso"}`. El jugador dice `a`.

| Patrón para `a` | Palabras |
| --- | --- |
| `_a_a` | casa, masa |
| `___a` | cosa, mesa, pera |
| ninguna `a` | peso |

El grupo más grande es `___a` (3 palabras): el programa responde "hay una `a`, en la última posición", y las candidatas pasan a ser `{cosa, mesa, pera}`.

**Dividir:** (1) cargar y filtrar palabras por longitud; (2) calcular el patrón de una palabra para una letra; (3) agrupar candidatas por patrón con un `Map`; (4) elegir el grupo más grande; (5) el bucle del juego.

```ts
function patternFor(word: string, letter: string, revealed: string): string {
  let out = "";
  for (let i = 0; i < word.length; i++) out += word[i] === letter ? letter : revealed[i];
  return out;
}

function chooseFamily(candidates: string[], letter: string, revealed: string) {
  const families = new Map<string, string[]>();
  for (const w of candidates) {
    const p = patternFor(w, letter, revealed);
    const family = families.get(p) ?? [];
    family.push(w);
    families.set(p, family);
  }
  let bestPattern = revealed;
  let bestWords: string[] = [];
  for (const [p, words] of families) {
    if (words.length > bestWords.length) { bestPattern = p; bestWords = words; }
  }
  return { revealed: bestPattern, candidates: bestWords };
}
```

Observa los componentes reutilizados: un `Map` para agrupar (histograma generalizado, sesión 13), la búsqueda del máximo por criterio (sesión 05), la descomposición en piezas (sesión 02) y un estado mínimo que se actualiza en cada turno (el patrón revelado y las candidatas). Ninguna pieza es nueva; lo nuevo es la combinación. Así se ven la mayoría de los problemas reales.

### Aprender nuevos lenguajes y librerías

A lo largo de esta ruta vas a pasar de TypeScript a Python (en DataCamp), a nuevas librerías y a nuevas plataformas en la nube. Un método para aprender rápido y bien:

1. **Tómate el tiempo.** Aprender bien un lenguaje requiere práctica deliberada, no solo leer la sintaxis. Reserva sesiones para ejercicios pequeños.
2. **Empieza por lo que sabes.** Toma problemas que ya resolviste en TypeScript (búsqueda binaria, BFS, la mochila) y resuélvelos en el lenguaje nuevo. Como ya conoces la solución, toda tu atención va al lenguaje.
3. **Investiga lo que es diferente.** Cada lenguaje tiene una "forma de hacer las cosas". En Python, las comprensiones de listas, los diccionarios por defecto, el manejo de iteradores y la indentación significativa. Busca específicamente las diferencias con lo que conoces, porque ahí están los errores.
4. **Estudia código bien escrito.** Lee código de proyectos respetados en ese lenguaje para absorber sus convenciones. No solo aprendes sintaxis: aprendes estilo.

Para **nuevas librerías**: lee la documentación de inicio, ejecuta los ejemplos oficiales, haz un experimento mínimo con tus propios datos y solo entonces intégrala. Y para habilidades muy distintas a las que ya tienes, considera un curso estructurado: tener una secuencia y ejercicios diseñados ahorra mucho tiempo, que es exactamente lo que esta ruta hace después con DataCamp y Scrimba.

### Errores comunes

- **Copiar sin entender**, incluido el código generado por IA.
- **Agregar dependencias para todo**, incluso para funciones triviales.
- **Reinventar componentes estándar** en producción sin una razón concreta.
- **Corregir errores sin registrarlos**: repetirás el mismo patrón.
- **Un plan maestro copiado de otro**: debe responder a tus debilidades reales.
- **Aprender un lenguaje nuevo con problemas nuevos**: cambia una sola variable a la vez.

### Para llevarte

Reutilizar bien y conocerte bien son dos caras del mismo oficio: saber qué sabes. Revisa tu plan maestro cada pocas semanas: tus debilidades cambian a medida que mejoras. Anota cada error nuevo el mismo día.

## Conceptos clave

- **Buena reutilización**: usar un componente que entiendes y que amplía tu capacidad.
- **Mala reutilización**: copiar código que no entiendes y que no te deja ninguna habilidad nueva.
- **Componente**: conocimiento reutilizable (bloque de código, algoritmo, patrón, ADT o librería).
- **Aprendizaje exploratorio**: estudiar un componente antes de necesitarlo y practicarlo de inmediato.
- **Aprendizaje según necesidad**: buscar y aplicar un componente cuando un problema lo requiere.
- **Plan maestro**: método personal de resolución que maximiza tus fortalezas y contrarresta tus debilidades.
- **Error de borde (off-by-one)**: iterar una vez de más o de menos; el problema de la valla y los postes.
- **Contramedida**: práctica o herramienta concreta que previene un error recurrente.

## Preguntas de repaso

1. ¿Qué distingue la buena reutilización de la mala?
   R: La buena usa un componente que entiendes (qué hace, qué garantiza, cuánto cuesta, cuándo falla) y te deja más capaz. La mala copia código que no entiendes y lo ajusta hasta que parece funcionar; el programa avanza pero tú no, y no sabrás qué hacer cuando falle.
2. Nombra los cinco tipos de componentes y un ejemplo de cada uno.
   R: Bloque de código (el bucle de una búsqueda binaria), algoritmo (Dijkstra), patrón (estrategia o ventana deslizante), tipo abstracto de datos (cola de prioridad) y librería (la librería estándar de JavaScript o date-fns).
3. ¿Por qué conviene describir un problema en términos generales al buscar un componente?
   R: Porque los detalles del dominio ocultan la analogía con problemas conocidos. Replanteado en términos generales (por ejemplo, "agrupar registros por dos claves"), es más fácil reconocer qué componente lo resuelve y encontrarlo.
4. ¿Qué es el error de la valla y qué contramedida usarías?
   R: Es un error de borde: para una valla de 50 metros con tramos de 10, la intuición dice 5 postes pero son 6. En bucles, equivale a iterar una vez de más o de menos. Contramedidas: probar siempre con 0, 1 y 2 elementos y escribir el invariante del bucle.
5. ¿Por qué las mejores contramedidas suelen ser herramientas automáticas?
   R: Porque no dependen de que te acuerdes en el momento. El compilador, el linter y los tests detectan el error cada vez, incluso cuando estás cansado o apurado.
6. ¿Cuál es el método recomendado para aprender un lenguaje nuevo?
   R: Dedicarle tiempo de práctica, empezar resolviendo en el lenguaje nuevo problemas que ya sabes resolver, investigar específicamente lo que es diferente respecto a lo que conoces y estudiar código bien escrito en ese lenguaje.

## Ejercicio

Dos partes. (1) Escribe tu plan maestro en un archivo `MASTER-PLAN.md` de tu carpeta de prácticas: revisa los ejercicios de las sesiones 01–22 y anota al menos 5 errores que cometiste, clasifícalos en codificación o diseño, y define una contramedida concreta para cada uno (preferiblemente automática), más dos fortalezas y cómo las vas a aprovechar. (2) Implementa el ahorcado tramposo en TypeScript para consola, con una lista de al menos 500 palabras en español.

Criterio de terminado: el plan tiene los 5 errores con su contramedida y está escrito en primera persona con ejemplos reales tuyos; el juego funciona de principio a fin, `chooseFamily` tiene tests (incluido el ejemplo de esta sesión, que debe devolver `___a` con `cosa, mesa, pera`) y el jugador nunca recibe una respuesta incoherente con las anteriores.

## Explícalo con tus palabras

Explica a un compañero cuál es tu plan maestro para atacar un problema nuevo, qué debilidad tuya combate cada paso y cómo decides cuándo reutilizar un componente.
