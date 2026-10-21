---
title: Herramientas básicas y debugging
kind: lesson
hours: 2
sources: The Pragmatic Programmer, cap. 3 The Basic Tools, temas 16–22 (pp. 143–187)
---

## Objetivo

Dominar las herramientas que multiplican tu productividad (texto plano, shell, editor, control de versiones, manipulación de texto, cuaderno de ingeniería) y aprender un método sistemático de debugging: reproducir, aislar, bisecar y probar en lugar de suponer. Al terminar vas a poder depurar un bug con `git bisect`, un test que falla primero y la técnica del patito de goma.

## Estudio

### Las herramientas amplifican tu talento

*The Pragmatic Programmer* abre el capítulo 3 con una analogía: cada artesano empieza con un conjunto básico de herramientas de buena calidad y lo va ampliando a medida que su oficio lo exige. Las herramientas se convierten en extensiones de sus manos. Con el software pasa igual: las herramientas **amplifican tu talento**. Cuanto mejores sean y mejor las domines, más productivo serás.

El consejo general es empezar con un conjunto básico versátil, aprender a usarlo de verdad y añadir herramientas cuando sientas una necesidad concreta, no por moda.

### El poder del texto plano

El primer tema defiende el **texto plano** como formato para guardar conocimiento: configuración, documentación, datos, notas. Texto plano no significa desestructurado: JSON, YAML, CSV, Markdown o SQL son texto plano.

Razones que da el libro:

- **Seguro contra la obsolescencia.** Los formatos legibles por humanos y autodescriptivos sobreviven a las aplicaciones que los crearon. Un archivo binario de un programa que ya no existe es casi irrecuperable; un CSV de hace 30 años se lee igual hoy.
- **Aprovechamiento.** Casi cualquier herramienta (control de versiones, editores, `grep`, `diff`, scripts) funciona con texto plano.
- **Pruebas más fáciles.** Si los datos de prueba y la configuración son texto, es trivial añadirlos, modificarlos y compararlos.

El inconveniente: el texto plano puede ocupar más espacio y ser más lento de procesar. Hoy rara vez es un problema real. Esta misma app es un ejemplo: el plan de estudio vive en archivos Markdown con frontmatter, versionados en Git, legibles sin la app y fáciles de validar con un script.

### Juegos de shell

El segundo tema: **usa el poder de la shell**. Las interfaces gráficas son cómodas para tareas puntuales, pero están limitadas a lo que sus diseñadores imaginaron. La shell te permite **combinar** herramientas (la tubería de Unix de la sesión 13) y **automatizar** tareas repetitivas.

Algunos ejemplos de cosas que en la shell son una línea:

```bash
# ¿Qué archivos TypeScript cambiaron en la última semana?
git log --since="1 week ago" --name-only --pretty=format: -- '*.ts' | sort -u

# ¿Cuántos TODO hay por carpeta?
grep -rn "TODO" src | cut -d/ -f2 | sort | uniq -c | sort -rn

# Los 5 archivos más largos del proyecto
find src -name '*.ts' | xargs wc -l | sort -n | tail -6
```

El libro recomienda también **personalizar tu shell**: alias para comandos frecuentes, un prompt informativo (rama de Git, estado), autocompletado. La idea no es memorizar comandos, sino sentirte cómodo combinándolos.

### Edición potente

El tercer tema: **alcanza la fluidez en tu editor**. El libro no te dice qué editor usar (Vim, Neovim, VS Code, Emacs...), sino que domines uno. ¿Por qué? Porque si cada edición te cuesta unos segundos de más, a lo largo de un año son horas, y lo que es peor, la fricción te distrae del problema.

¿Qué significa ser fluido? El libro propone una prueba: ¿puedes hacer estas cosas sin ratón?

- Mover y seleccionar por caracteres, palabras, líneas y párrafos.
- Indentar, comentar y descomentar bloques.
- Deshacer y rehacer.
- Dividir la ventana y moverte entre paneles.
- Ir a una línea concreta, a una definición, buscar y reemplazar.
- Ordenar líneas seleccionadas.
- Renombrar un símbolo en todo el proyecto (refactoring automático).

El método que sugiere: obsérvate. Cada vez que hagas algo repetitivo, busca si hay un atajo o una extensión que lo haga. Aprende uno nuevo, practícalo hasta que sea automático y luego busca el siguiente. También recomienda aprender las extensiones y, si hace falta, escribir las tuyas.

### Control de versiones

El cuarto tema dice algo que hoy parece obvio pero no siempre lo fue: **usa siempre control de versiones**, para todo, incluso para proyectos personales y para cosas que no son código (documentación, notas, configuración de tu máquina). El control de versiones es una "máquina del tiempo": puedes volver a cualquier punto, ver quién cambió qué y por qué, comparar versiones y trabajar en paralelo con ramas. El libro también lo menciona como pieza central de la automatización: desde él se disparan los builds, los tests y los despliegues. Lo verás en profundidad en la sesión 28.

### Debugging: la psicología primero

El tema 20 es el más largo del capítulo, y empieza por la actitud.

**Arregla el problema, no busques culpables.** No importa si el bug es tuyo o de otra persona: es tu problema ahora. El debugging es resolver un problema, no un juicio.

**No entres en pánico.** Es fácil agobiarse con un plazo encima o con alguien preguntando cada cinco minutos. Respira y piensa en qué podría causar los síntomas que ves. El libro insiste: no pierdas tiempo pensando "eso no puede pasar". Obviamente puede, porque ha pasado.

**Ten cuidado con la miopía.** Resiste la tentación de arreglar solo el síntoma que ves. El fallo real puede estar varios pasos más allá. Busca la causa raíz.

### Por dónde empezar

1. **Asegúrate de que el código compila sin advertencias.** No pierdas tiempo buscando un bug que el compilador o el linter ya te están señalando. En TypeScript: `tsc --noEmit` y ESLint limpios.
2. **Reúne datos.** Habla con quien reportó el bug, consigue los pasos exactos, los datos y el entorno. Los informes de bugs suelen ser imprecisos ("no funciona"), así que hay que preguntar.
3. **Reprodúcelo.** El mejor primer paso es poder reproducir el bug, idealmente con un solo comando. Si no lo puedes reproducir, ¿cómo sabrás que lo arreglaste?

El libro da un consejo muy concreto: **escribe un test que falle antes de arreglar el código**. Ese test reproduce el bug de forma automática, demuestra que el arreglo funciona y evita que el bug vuelva (es la regla de Beyoncé aplicada a tus propios bugs).

```ts
// Reporte: "el resumen dice NaN% cuando el módulo no tiene sesiones"
it("devuelve 0% cuando no hay sesiones", () => {
  expect(progressSummary([])).toBe("0% (0/0h)"); // falla hoy: "NaN% (0/0h)"
});
```

### Técnicas de debugging

**Lee el maldito mensaje de error.** Parece obvio, pero mucha gente salta directamente al código sin leer el mensaje completo, la pila (*stack trace*) y la causa (`cause`). La respuesta suele estar ahí.

**Resultados incorrectos.** Si el programa no se cae pero da resultados equivocados, usa el depurador (en Node.js, `node --inspect` o el depurador de VS Code) para seguir el valor problemático hacia atrás: ¿dónde se calculó?, ¿de dónde vinieron sus entradas?

**Sensibilidad a los valores de entrada.** A veces el bug solo aparece con ciertos datos. Si tienes un conjunto de datos grande que falla, ve partiéndolo por la mitad hasta encontrar el registro mínimo que reproduce el problema.

**Regresiones entre versiones: búsqueda binaria.** Si algo funcionaba en una versión y dejó de funcionar en otra, la causa está en algún commit intermedio. La búsqueda binaria encuentra ese commit en un número logarítmico de pasos. Git lo automatiza con `git bisect`:

```bash
git bisect start
git bisect bad                 # la versión actual tiene el bug
git bisect good v1.4.0         # esta versión no lo tenía
# Git hace checkout de un commit intermedio; pruebas y dices:
git bisect good                # o: git bisect bad
# ...repites hasta que Git te dice "X is the first bad commit"
git bisect reset

# Mejor aún, automatizado con un test:
git bisect run npx vitest run test/progress.test.ts
```

Con 1,000 commits entre la versión buena y la mala, `git bisect` encuentra el culpable en unos 10 pasos.

**Logging y trazas.** Los depuradores muestran el estado en un instante; los logs muestran cómo evoluciona el estado en el tiempo. Son especialmente útiles en sistemas concurrentes, en tiempo real o basados en eventos, donde detener la ejecución cambia el comportamiento. Usa un formato consistente y fácil de procesar (por ejemplo, JSON por línea) para poder filtrarlo con herramientas de texto.

**El patito de goma.** Una técnica muy simple y muy eficaz: explicar el problema a otra persona (o a un patito de goma en tu escritorio), línea por línea. La otra persona no necesita decir nada: el simple acto de verbalizar cada paso y cada suposición hace que descubras la que es falsa. "Y aquí, como el usuario ya está autenticado... un momento, ¿lo está?".

**Proceso de eliminación.** En la mayoría de los proyectos, el código que depuras es una mezcla del tuyo, del de tu equipo, de librerías y del sistema operativo. Es posible que haya un bug en Node.js o en una librería muy usada, pero **no debe ser tu primera hipótesis**. El libro lo resume con la frase "`select` no está roto": es mucho más probable que el bug esté en tu código. Descarta primero lo tuyo.

**El elemento sorpresa.** Cuando te sorprende un bug ("¡eso es imposible!"), es una señal de que una de tus creencias sobre el código es falsa. El libro dice: **no supongas, demuéstralo**. Comprueba esa creencia con los datos reales, con las condiciones de borde reales. Y cuando encuentres el bug, pregúntate: ¿por qué no lo detectaron los tests?, ¿hay otros lugares con el mismo problema?, ¿se pueden añadir aserciones o comprobaciones para que salga a la luz antes? Si arreglarlo te llevó mucho tiempo, ¿por qué? ¿Puedes hacer que la próxima vez sea más fácil (mejores logs, mejores herramientas de prueba)?

### Lista de verificación de debugging

El libro cierra el tema con una lista que conviene tener a mano:

1. ¿El problema es un síntoma de un bug subyacente o es el bug en sí?
2. ¿El bug está realmente en el framework o librería que usas, o en tu código?
3. Si se lo explicaras a un compañero, ¿qué le dirías?
4. Si el código sospechoso pasa sus tests unitarios, ¿los tests son suficientemente completos? ¿Qué pasa si ejecutas los tests con estos datos?
5. ¿Las condiciones que causaron este bug existen en algún otro lugar del sistema? ¿Hay otros bugs en fase larvaria esperando para salir?

### Ejemplo trabajado de debugging

Reporte: "En la vista de hoy, los sábados aparece la sesión equivocada".

1. **Reunir datos**: ¿qué sábado?, ¿qué sesión esperaba y cuál apareció?, ¿en qué zona horaria está el navegador?
2. **Reproducir con un test**: `planFor(new Date("2026-10-24T08:00:00-05:00"))` debería devolver una sesión de 3 h, y devuelve una de 2 h.
3. **Leer el error y los datos**: no hay excepción, el resultado es incorrecto. Con el depurador ves que `date.getDay()` devuelve 5 (viernes) en lugar de 6.
4. **Elemento sorpresa**: "¡pero si le paso un sábado!". Demuéstralo: el servidor está en UTC y la fecha se construyó en otra zona horaria; según dónde se convierta a medianoche, el día de la semana cambia.
5. **Causa raíz**: el código mezcla fechas locales y UTC. El síntoma (sesión equivocada) está lejos de la causa (conversión de zona horaria).
6. **Arreglo**: representar el "día de estudio" como una fecha de calendario (`"2026-10-24"`) sin hora ni zona, y calcular el día de la semana a partir de ella.
7. **Prevención**: tests con fechas en varias zonas horarias y alrededor de la medianoche (T5 y T6 de la sesión 16), y un comentario de intención explicando por qué se usa una fecha de calendario.

### Tu caja de herramientas de debugging en TypeScript

Algunas herramientas concretas que conviene dominar en el ecosistema que usas:

| Herramienta | Para qué | Cómo |
| --- | --- | --- |
| Depurador de VS Code o Chrome DevTools | Pausar, inspeccionar variables, recorrer la pila | `node --inspect-brk dist/app.js` o "JavaScript Debug Terminal" |
| `debugger;` | Punto de parada desde el código | Se ignora si no hay depurador conectado; bórralo antes del commit |
| Puntos de parada condicionales | Parar solo cuando `userId === "42"` | Clic derecho sobre el punto de parada en el editor |
| `console.table` | Ver arreglos de objetos como tabla | `console.table(sessions)` |
| Source maps | Ver líneas de TypeScript en la pila, no del JavaScript compilado | `"sourceMap": true` en `tsconfig.json` |
| `vitest --watch` con filtro | Reejecutar solo el test del bug al guardar | `npx vitest -t "0% cuando no hay sesiones"` |
| `Error.cause` | Conservar la causa original al relanzar | `throw new AppError("...", { cause: error })` |

Un consejo que combina el libro con estas herramientas: cuando añadas `console.log` para depurar, añádelos con un prefijo reconocible (por ejemplo, `[dbg]`) y bórralos todos antes del commit. Si un log resultó útil para entender el sistema, conviértelo en un log de verdad, con nivel y formato, en lugar de dejar el `console.log` provisional. Y si descubres que te faltaba información para depurar, es una señal para mejorar la observabilidad del sistema (los logs estructurados que verás en los módulos de sistemas).

### Manipulación de texto

El tema 21 recomienda **aprender un lenguaje de manipulación de texto**: herramientas o lenguajes de scripting para transformar texto rápidamente (el libro menciona Ruby, Python, `awk` y `sed`; en tu caso, también te sirven scripts de Node con TypeScript). El libro cuenta cómo sus propios libros se escriben en texto plano y se procesan con scripts para generar índices, comprobar ejemplos de código o convertir formatos.

Ejemplos útiles en tu día a día:

```ts
// scripts/check-content.ts — validar todos los archivos de contenido
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
for (const file of readdirSync(dir).filter((name) => /^\d\d-.*\.md$/.test(name))) {
  const text = readFileSync(join(dir, file), "utf8");
  const hasTitle = /^title: .+$/m.test(text);
  if (!hasTitle) console.error(`${file}: falta title`);
}
```

Un script de veinte líneas como este, ejecutado en CI, evita errores que de otro modo descubrirías a mano.

### El cuaderno de ingeniería

El último tema del capítulo recomienda llevar un **cuaderno de ingeniería** (*engineering daybook*): un registro diario de lo que haces, lo que aprendes, ideas, lecturas de instrumentos (valores de un experimento), dudas y decisiones. Los autores cuentan que lo aprendieron en un trabajo donde los ingenieros de hardware lo usaban.

Beneficios:

- **Es más fiable que la memoria.** "¿Cómo arreglé aquel problema del pool de conexiones el mes pasado?" Está en el cuaderno.
- **Te da un lugar para aparcar ideas** que no tienen que ver con la tarea actual, sin perderlas ni distraerte.
- **Actúa como un patito de goma**: escribir te obliga a ordenar el pensamiento, y a menudo descubres el error mientras escribes.

El libro sugiere papel (algo menos distraído que una pantalla), pero lo importante es el hábito. En este plan de estudio, la consigna Feynman al final de cada sesión cumple una función parecida.

### Errores comunes

- **Depurar sin reproducir**: "creo que ya está" no es un arreglo verificable.
- **Arreglar el síntoma** (un `if` que evita el `NaN`) sin entender la causa.
- **Culpar al framework** antes de descartar tu propio código.
- **Ignorar advertencias del compilador y del linter**.
- **No escribir un test del bug**, para que vuelva a aparecer meses después.
- **Usar el ratón para todo** y no invertir en conocer tu editor y tu shell.
- **No anotar nada**: resolver el mismo problema dos veces porque no quedó registro en el cuaderno.

## Conceptos clave

- **Texto plano**: formato legible por humanos que sobrevive a las herramientas y funciona con todas ellas.
- **Fluidez en el editor**: dominar movimientos, selección, búsqueda y refactorings sin fricción.
- **Test que falla primero**: test que reproduce el bug antes del arreglo y evita su regreso.
- **Búsqueda binaria / `git bisect`**: localizar el commit que introdujo una regresión dividiendo el rango a la mitad en cada paso.
- **Patito de goma**: explicar el problema en voz alta para descubrir la suposición falsa.
- **"select no está roto"**: el bug casi siempre está en tu código, no en la plataforma.
- **Cuaderno de ingeniería**: registro diario de trabajo, decisiones, aprendizajes e ideas.

## Preguntas de repaso

1. Da tres razones por las que The Pragmatic Programmer recomienda guardar el conocimiento en texto plano.
   R: Es un seguro contra la obsolescencia (los formatos legibles sobreviven a las aplicaciones), permite aprovechar casi cualquier herramienta (Git, diff, grep, editores, scripts) y facilita las pruebas, porque los datos y la configuración de prueba se crean y comparan fácilmente.
2. ¿Por qué conviene escribir un test que falle antes de arreglar un bug?
   R: Porque reproduce el bug de forma automática, demuestra que el arreglo realmente lo corrige y queda como protección para que el bug no vuelva a aparecer en el futuro.
3. Explica cómo funciona `git bisect` y por qué es eficiente.
   R: Se marca un commit malo y uno bueno, y Git hace checkout de commits intermedios para que indiques si tienen el bug, reduciendo el rango a la mitad cada vez (o lo automatiza con `git bisect run` y un test). Es eficiente porque es una búsqueda binaria: con 1,000 commits encuentra el culpable en unos 10 pasos.
4. ¿Qué es la técnica del patito de goma y por qué funciona?
   R: Explicar el problema en voz alta, paso a paso, a otra persona o a un objeto. Funciona porque verbalizar cada paso y cada suposición obliga a hacerlas explícitas, y así se descubre la que es falsa sin necesidad de que el oyente diga nada.
5. ¿Qué significa "select no está roto" y qué haces cuando un bug te sorprende?
   R: Que es mucho más probable que el bug esté en tu código que en la plataforma o en una librería muy usada, así que se descarta primero lo propio. Cuando un bug sorprende, significa que una creencia sobre el código es falsa: no hay que suponer, sino demostrarla con datos reales, y después preguntarse por qué los tests no lo detectaron y si existe en otros lugares.
6. ¿Qué beneficios tiene un cuaderno de ingeniería?
   R: Es más fiable que la memoria para recordar cómo se resolvió algo, da un lugar para aparcar ideas sin perderlas ni distraerse y, al obligar a escribir el razonamiento, funciona como un patito de goma que ayuda a encontrar errores.

## Ejercicio

En un repositorio de práctica, crea una función con un bug sutil (por ejemplo, un cálculo de días hábiles que falla cuando el rango cruza un fin de semana) y haz al menos 15 commits pequeños después de introducirlo (cambios inocuos o funcionalidades nuevas). Etiqueta un commit anterior al bug como `v1`. Después, como si fuera un bug reportado: (1) escribe el test que falla; (2) usa `git bisect run` con ese test para encontrar el commit culpable; (3) arregla la causa raíz; (4) escribe en un archivo `DEBUG-LOG.md` tu entrada de cuaderno de ingeniería con síntomas, hipótesis descartadas, causa y prevención. Terminado cuando `git bisect run` identifica el commit correcto, el test pasa tras el arreglo y la entrada del cuaderno responde las cinco preguntas de la lista de verificación de debugging.

## Explícalo con tus palabras

Explica cómo encontrarías un error en una receta que antes salía bien y ahora sale mal, usando la idea de la búsqueda binaria.
