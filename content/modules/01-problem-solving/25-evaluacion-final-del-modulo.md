---
title: Evaluación final, resolución de problemas y algoritmos
kind: evaluation
hours: 3
sources: Think Like a Programmer, caps. 1–3 y 5–8 (pp. 10–105, 145–284) | Grokking Algorithms, caps. 1–11 (pp. 20–239) | Cracking the Coding Interview, caps. VI, VII, 1–4, 8 y 10 (pp. 50–93, 100–123, 142–148, 158–163)
---

## Objetivo

Comprobar que dominas el módulo completo: método de resolución de problemas, análisis Big O, estructuras de datos (arrays, listas, pilas, colas, tablas hash, árboles, heaps, tries, grafos), recursión, ordenamiento, algoritmos de grafos, greedy, programación dinámica y técnicas de optimización.

## Estudio

### Cómo hacer esta evaluación

- Reserva 3 horas sin interrupciones. Divide el tiempo así: unos 100 minutos para las preguntas conceptuales y de análisis (1–12) y unos 70 minutos para las de diseño de solución (13–16). Deja 10 minutos para revisar.
- Responde **sin mirar** las sesiones ni tus apuntes. Escribe cada respuesta completa antes de pasar a la siguiente.
- En las preguntas de diseño, explica: idea, estructura de datos, Big O de tiempo y espacio, y casos borde. Si quieres, impleméntalas después en TypeScript para verificarte, pero la evaluación es sobre el razonamiento.
- Al terminar, el tutor compara tus respuestas con las respuestas modelo. Una respuesta es correcta si contiene las ideas clave, aunque use otras palabras.
- Cualquier pregunta que falles indica qué sesión repasar: el número entre paréntesis al final de cada enunciado señala la sesión principal.

### Rúbrica orientativa

| Nivel | Criterio |
| --- | --- |
| Dominio | 14 o más preguntas correctas, incluidas al menos 3 de diseño |
| Suficiente | 11–13 correctas |
| Repasar | 10 o menos: repasa las sesiones de las preguntas falladas antes de pasar al módulo 02 |

## Preguntas de evaluación

1. Describe un plan para atacar un problema que no sabes resolver e indica qué técnica general aplicas en cada paso. (Sesiones 01 y 21)
   R: Un buen plan es: replantear el problema con mis palabras y anotar todas las restricciones (replantear); resolver a mano un ejemplo grande y no especial (empezar por lo que sé, DIY); proponer una fuerza bruta correcta y calcular su Big O; calcular el mejor tiempo concebible; buscar cuellos de botella, trabajo innecesario y duplicado (BUD) o probar estructuras de datos; si me atasco, reducir el problema quitando una restricción o buscar analogías con problemas conocidos; recorrer la solución con el ejemplo antes de codificar; implementar en piezas pequeñas (dividir); y probar con casos borde. Si la frustración aparece, hacer una pausa y volver al siguiente paso del plan.
2. Analiza el costo en tiempo y espacio de una función que, para cada elemento de un array `A` de tamaño `a`, comprueba con `B.includes(x)` si está en un array `B` de tamaño `b`. ¿Cómo lo mejorarías? (Sesiones 04 y 13)
   R: `includes` es una búsqueda lineal O(b) y se ejecuta una vez por cada elemento de A, así que el tiempo es O(a · b) y el espacio extra O(1). Se mejora construyendo un `Set` con los elementos de B (O(b) tiempo y espacio) y consultando `has` en O(1) promedio para cada elemento de A: tiempo total O(a + b), espacio O(b).
3. Explica por qué `push` en un array dinámico es O(1) amortizado y qué pasaría si el array creciera sumando 10 posiciones en lugar de duplicarse. (Sesión 04)
   R: Al llenarse, el array se duplica y copia sus elementos; para n inserciones las copias suman 1 + 2 + 4 + … + n/2, que es menos que n, así que el trabajo total es O(n) y el promedio por inserción O(1). Si creciera en 10 posiciones fijas, habría unas n/10 copias de tamaños crecientes (10, 20, 30, …), cuya suma es del orden de n²/20, es decir O(n²) total y O(n) amortizado por inserción.
4. Una función recursiva hace tres llamadas a sí misma con `n − 1` hasta llegar a 0. ¿Cuál es su costo en tiempo y espacio? ¿Cuándo podrías reducirlo drásticamente? (Sesiones 04, 09 y 19)
   R: El árbol de llamadas tiene 3 ramas por nivel y profundidad n, así que el tiempo es O(3ⁿ). El espacio es O(n), la profundidad máxima de la pila, porque solo una rama está activa a la vez. Se puede reducir drásticamente si las llamadas repiten subproblemas (mismos argumentos): con memoización o tabulación se calcula cada valor de n una vez, bajando a O(n) tiempo.
5. Compara array, lista enlazada y tabla hash para estas operaciones: acceso por posición, inserción al inicio, búsqueda por valor y recorrido en orden de inserción. (Sesiones 05, 06 y 13)
   R: Acceso por posición: array O(1), lista O(n), tabla hash no aplica (no hay posiciones). Inserción al inicio: array O(n) porque desplaza todo, lista O(1), tabla hash O(1) promedio para insertar (sin noción de inicio). Búsqueda por valor: array y lista O(n), tabla hash O(1) promedio. Recorrido en orden de inserción: array y lista O(n) de forma natural; un `Map` de JavaScript también recuerda el orden de inserción, aunque una tabla hash en general no garantiza orden. Además, el array tiene la mejor localidad de memoria, por lo que recorrerlo es más rápido en la práctica.
6. ¿Qué es un invariante y cómo te ayuda a escribir correctamente una búsqueda binaria? (Sesiones 03 y 07)
   R: Un invariante es una afirmación que se mantiene verdadera en cada iteración de un bucle o durante toda la vida de un objeto. En la búsqueda binaria clásica el invariante es "si el objetivo está en el array, está entre `low` y `high` inclusive". Cada actualización debe preservarlo (`low = mid + 1` si el medio es menor, `high = mid - 1` si es mayor), y el bucle continúa mientras `low <= high`; cuando la zona queda vacía, se puede afirmar que no está. Pensar en el invariante evita bucles infinitos y errores de borde.
7. Explica cómo implementar una cola en JavaScript con todas sus operaciones en O(1) (o amortizado) y por qué `shift` no sirve. (Sesión 08)
   R: `shift` es O(n) porque desplaza todos los elementos, así que n desencolados cuestan O(n²). Alternativas: una lista enlazada con `head` y `tail` (encolar al final, desencolar de la cabeza, ambas O(1)); un array con un índice de inicio que avanza al desencolar y se compacta de vez en cuando (O(1) amortizado); un buffer circular con índices módulo la capacidad; o dos pilas, volcando la de entrada en la de salida solo cuando esta está vacía (O(1) amortizado).
8. Compara merge sort y quicksort: costo en el mejor, promedio y peor caso, memoria, estabilidad y cuándo elegirías cada uno. (Sesión 11)
   R: Merge sort es O(n log n) en todos los casos, usa O(n) de memoria extra y es estable; conviene cuando se necesita estabilidad, garantía de peor caso, datos en listas enlazadas o datos que no caben en memoria. Quicksort es O(n log n) en promedio y mejor caso pero O(n²) en el peor (pivotes malos, por ejemplo pivote fijo con datos ordenados), usa O(log n) de pila en su versión en el lugar y no es estable; suele ser más rápido en la práctica por sus constantes y su localidad de memoria, sobre todo con pivote aleatorio.
9. ¿Qué es un BST, cuánto cuestan sus operaciones y qué problema resuelven los árboles autobalanceados? ¿En qué se diferencia de un heap? (Sesión 14)
   R: Un BST es un árbol binario donde todo el subárbol izquierdo de cada nodo es menor y todo el derecho es mayor. Buscar, insertar y borrar cuestan O(h), con h la altura: O(log n) si está balanceado y O(n) si degenera (por ejemplo, al insertar datos ordenados). Los árboles autobalanceados (AVL, rojo-negro) hacen rotaciones para mantener la altura en O(log n). Un heap, en cambio, solo garantiza que cada padre es menor (o mayor) que sus hijos: da el mínimo en O(1) y lo extrae en O(log n), pero no sirve para buscar un valor arbitrario (O(n)) ni para recorrer en orden.
10. ¿Por qué BFS encuentra el camino más corto en un grafo sin pesos, por qué falla con pesos y qué usarías en su lugar según el tipo de pesos? (Sesiones 15 y 16)
    R: BFS usa una cola y procesa los nodos por capas de distancia creciente, así que la primera vez que llega a un nodo lo hace por un camino con el mínimo número de aristas. Con pesos, el camino con menos aristas puede no ser el de menor costo. Con pesos no negativos se usa Dijkstra con un min-heap, O((V + E) log V); con pesos negativos sin ciclos negativos, Bellman-Ford, O(V · E); en un DAG, relajar en orden topológico, O(V + E).
11. Da un ejemplo donde un algoritmo greedy es óptimo y otro donde falla, y explica cómo se demuestra que un greedy es correcto. (Sesión 18)
    R: Óptimo: elegir la mayor cantidad de clases sin solaparse tomando siempre la que termina primero. Falla: la mochila 0/1 (tomar el objeto más valioso puede dejar fuera una combinación mejor) o dar cambio con monedas 1, 3 y 4 para el monto 6 (greedy usa 4 + 1 + 1, lo óptimo es 3 + 3). Se demuestra con un argumento de intercambio: se toma cualquier solución óptima y se muestra que su primera elección puede reemplazarse por la elección greedy sin empeorarla, y se repite.
12. ¿Qué significa que un problema sea NP-completo y cómo lo abordarías en un proyecto real con miles de elementos? (Sesión 18)
    R: Que no se conoce ningún algoritmo exacto de tiempo polinómico para resolverlo y que es equivalente en dificultad a todos los demás NP-completos (resolver uno rápido resolvería todos). Con miles de elementos no intentaría la solución exacta: usaría un algoritmo de aproximación o una heurística (por ejemplo greedy, vecino más cercano más mejoras locales como 2-opt para rutas), mediría su calidad contra el óptimo en instancias pequeñas, y buscaría restricciones del dominio que simplifiquen el problema.
13. Diseña una solución para: dado un array de enteros (con negativos) y un número `k`, cuenta cuántos subarrays contiguos suman exactamente `k`. (Sesiones 05, 13 y 21)
    R: La ventana deslizante no sirve porque con negativos la suma no crece de forma monótona. Uso sumas prefijo con un `Map` que cuenta cuántas veces apareció cada suma prefijo, inicializado con la suma 0 vista una vez (el prefijo vacío). Recorro el array acumulando `prefix`; para cada posición sumo al resultado las veces que vi `prefix - k`, y luego registro `prefix` en el mapa. Tiempo O(n), espacio O(n), frente a O(n²) de probar todos los pares de inicio y fin. Casos borde: array vacío (0), `k = 0`, subarrays que empiezan en la posición 0 (cubiertos por el prefijo vacío).
14. Diseña una estructura `Leaderboard` con `addScore(player, points)` (acumula puntos) y `top(k)` (los k jugadores con más puntos), suponiendo muchas más llamadas a `addScore` que a `top`. (Sesiones 13 y 14)
    R: Guardo un `Map<player, total>` para que `addScore` sea O(1) promedio. Para `top(k)`, recorro el mapa manteniendo un min-heap de tamaño k con los mejores hasta ahora: si el heap tiene menos de k elementos inserto; si no, comparo con la raíz y reemplazo si el nuevo es mayor. Costo de `top(k)`: O(n log k) tiempo y O(k) espacio, mejor que ordenar todo (O(n log n)) cuando k es pequeño. Si `top` fuera muy frecuente, mantendría además una estructura ordenada (por ejemplo, un árbol balanceado por puntaje) a cambio de que `addScore` cueste O(log n).
15. Diseña una solución para: dada una grilla con celdas libres y muros, y una posición inicial y final, encuentra el menor número de pasos si puedes atravesar como máximo un muro. (Sesiones 15 y 16)
    R: Es un BFS sobre un grafo de estados ampliado: cada estado es (fila, columna, murosRotos) con murosRotos en {0, 1}. Desde un estado, me muevo a las cuatro celdas vecinas dentro de la grilla; si la vecina es libre conservo murosRotos; si es muro, solo puedo entrar si murosRotos es 0 y paso a 1. Marco visitados por estado completo, no solo por celda, porque llegar a una celda habiendo roto un muro no es lo mismo que llegar sin romperlo. Como todos los pasos cuestan 1, BFS da el mínimo. Tiempo y espacio O(filas × columnas × 2). Si no se alcanza el destino, devuelvo -1.
16. Diseña una solución para: dada una lista de tareas con duración y beneficio, y un total de horas disponibles, elige las tareas (cada una se hace completa o no se hace) que maximizan el beneficio, y explica qué técnica usas y su costo. (Sesiones 18 y 20)
    R: Es una mochila 0/1: capacidad = horas disponibles, peso = duración, valor = beneficio. El greedy por beneficio o por beneficio por hora no garantiza el óptimo. Uso programación dinámica: `best[i][h]` es el mayor beneficio con las primeras i tareas y h horas, con recurrencia `best[i][h] = máx(best[i−1][h], beneficio_i + best[i−1][h − duración_i])` si cabe. Costo O(n × H) tiempo, con H las horas (en la unidad mínima de duración), y O(H) espacio usando una sola fila recorrida de mayor a menor. Para saber qué tareas elegir, guardo la tabla completa y la recorro hacia atrás: si la celda difiere de la de la fila anterior, la tarea se eligió. Si H es enorme, el método es pseudo-polinómico y habría que considerar aproximaciones.

## Explícalo con tus palabras

Elige el tema del módulo que te pareció más difícil y explícalo en cinco minutos, en voz alta o por escrito, como si se lo enseñaras a alguien que empieza, con un ejemplo propio.
