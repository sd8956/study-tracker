---
title: Tests más grandes y property-based testing
kind: lesson
hours: 2
sources: Software Engineering at Google, cap. 14 Larger Testing (pp. 321–354) | The Pragmatic Programmer, tema 42 Property-Based Testing (pp. 375–384)
---

## Objetivo

Entender qué detectan los tests más grandes que los unitarios no pueden detectar (fidelidad, configuración, carga, comportamientos emergentes), cómo se estructura un test grande (sistema bajo prueba, datos, acciones, verificación), qué tipos existen y cómo complementar todo con **property-based testing**, que genera cientos de entradas automáticamente para buscar casos que no imaginaste. Al terminar vas a poder escribir propiedades con `fast-check` en TypeScript.

## Estudio

### Por qué no bastan los tests unitarios

En la sesión 19 viste que la mayoría de tus tests deberían ser pequeños y de alcance estrecho. Pero un sistema formado por piezas que funcionan bien por separado no funciona necesariamente bien en conjunto. El capítulo 14 de *Software Engineering at Google* habla de los **tests más grandes**: los que no cumplen las restricciones de un test unitario. Pueden ser lentos (minutos u horas), no herméticos (usan recursos compartidos) o no deterministas.

Lo que justifica su costo es una propiedad: la **fidelidad**, es decir, cuánto se parece el entorno del test a la realidad de producción. Un test unitario con dobles tiene baja fidelidad; un test contra el sistema desplegado con tráfico real tiene la máxima. Entre ambos extremos hay un espectro.

```
Fidelidad baja                                                  Fidelidad alta
Test unitario ── Test con fakes ── Varios binarios ── Staging ── Producción
   rápido                                                           lento
   determinista                                                     ruidoso
```

### Lo que se escapa a los tests unitarios

El libro enumera las brechas típicas:

- **Dobles infieles.** Un mock o un stub refleja lo que su autor creía que hacía la dependencia. Si la dependencia real cambia (o el autor se equivocó), el test unitario pasa y producción falla. Por eso en la sesión 21 viste los tests de contrato para los fakes.
- **Problemas de configuración.** Los tests unitarios prueban el código, pero los sistemas también dependen de archivos de configuración, variables de entorno, scripts de despliegue y esquemas de base de datos. El libro señala que en Google los cambios de configuración son una de las causas principales de incidentes graves. Un test unitario no verifica que la configuración de producción sea válida.
- **Problemas bajo carga.** Rendimiento, concurrencia, límites de recursos. Un test unitario no te dirá que el endpoint tarda 3 segundos con 10,000 registros.
- **Comportamientos, entradas y efectos inesperados.** Los tests unitarios están limitados por la imaginación de quien los escribe. Los usuarios reales hacen cosas que nadie previó. Y, por la ley de Hyrum, dependen de comportamientos que nadie documentó.
- **Comportamientos emergentes y el "efecto vacío".** Un test unitario prueba la pieza en el vacío. Ciertos problemas solo aparecen cuando todas las piezas interactúan.

### Por qué no todo son tests grandes

Si dan más confianza, ¿por qué no escribir solo tests grandes? Porque tienen problemas propios que el libro reconoce:

- **Fiabilidad**: con más piezas, más posibilidades de fallar por causas ajenas al cambio (red, datos, entorno).
- **Velocidad**: si tardan horas, no se ejecutan en cada cambio.
- **Propiedad**: a menudo nadie se siente responsable de ellos, porque cruzan los límites de varios equipos. Se rompen y nadie los arregla.
- **Estandarización**: cada equipo los monta a su manera, sin herramientas comunes.

Por eso la pirámide: muchos tests pequeños para la velocidad y la precisión, y algunos tests grandes para la fidelidad.

### Estructura de un test grande

Google describe un flujo común a casi todos los tests grandes:

1. **Obtener un sistema bajo prueba** (SUT, *system under test*).
2. **Sembrar los datos de prueba necesarios.**
3. **Realizar acciones** con el sistema.
4. **Verificar comportamientos.**

**El sistema bajo prueba** puede tener distintos grados de **hermeticidad** (aislamiento de otros sistemas y del tráfico real) y de fidelidad:

| SUT | Descripción | Ejemplo en tu contexto |
| --- | --- | --- |
| Un solo proceso | Todo el sistema empaquetado en un proceso | La app Next.js arrancada en el test con SQLite en memoria |
| Una sola máquina | Varios procesos en una máquina | App + base de datos en contenedores locales con Docker Compose |
| Varias máquinas | Un entorno real distribuido | Staging en la nube |
| Híbridos | Parte local, parte compartida | App local contra una API de staging de un tercero |

Cuanto más hermético, más fiable y reproducible; cuanto más fiel, más bugs reales encuentra. Un buen diseño busca **fronteras** donde sustituir lo que no es esencial para el test: por ejemplo, reemplazar el servicio de correo por un fake, pero usar la base de datos real.

**Los datos de prueba** pueden ser:

- **Sembrados**: datos que el test carga antes de empezar (un usuario, cinco sesiones).
- **Tráfico de prueba**: las peticiones que el test envía durante su ejecución.
- **Datos del dominio**: tablas de referencia, configuraciones.

Y pueden construirse a mano, copiarse de producción (con cuidado con la privacidad) o muestrearse. Google insiste en usar **APIs de siembra** (funciones que crean datos a través de la API del sistema) en lugar de insertar filas directamente en la base de datos, para no depender de la estructura interna.

**La verificación** puede hacerse con aserciones explícitas (como en un test unitario) o comparando resultados entre dos versiones (diff testing, más abajo).

### Tipos de tests grandes

El libro describe una variedad de tests grandes. Un resumen:

| Tipo | Qué verifica | Ejemplo |
| --- | --- | --- |
| **Funcional de uno o varios binarios** | Que los componentes interactúan bien | Llamar al API del servidor y comprobar lo guardado en la base de datos |
| **Navegador y dispositivos** | Que la interfaz funciona en navegadores reales | Playwright o WebDriver recorriendo "abrir hoy, iniciar temporizador, marcar sesión" |
| **Rendimiento, carga y estrés** | Comportamiento bajo volumen | 1,000 peticiones por segundo a `/api/today` |
| **Configuración de despliegue** | Que la configuración real es válida y arranca | Arrancar el binario con la configuración de producción y comprobar que responde a `/health` |
| **Exploratorio** | Bugs que nadie previó | Personas probando a propósito cosas raras; los *bug bashes* (sesiones de caza de bugs en grupo) |
| **Diff de regresión A/B** | Que la nueva versión responde igual que la anterior | Enviar el mismo tráfico a ambas versiones y comparar respuestas |
| **Aceptación de usuario (UAT)** | Que el sistema cumple lo que el usuario pidió | Tests escritos en el lenguaje del negocio |
| **Probers y análisis canario** | Que producción funciona ahora mismo | Una petición sintética cada minuto; desplegar a un 1 % y comparar métricas |
| **Recuperación ante desastres y caos** | Que el sistema resiste fallos | Apagar una réplica a propósito y comprobar que el servicio sigue |
| **Evaluación de usuarios** | Que los usuarios reales prefieren el cambio | Experimentos A/B, versiones para probadores internos |

El **diff testing A/B** merece una mención: en lugar de escribir aserciones, envías las mismas peticiones a la versión actual (A) y a la nueva (B) y comparas las respuestas. Cualquier diferencia se revisa: o es un cambio intencionado, o es una regresión. Es muy útil en refactors grandes. Su limitación: necesita a alguien que apruebe las diferencias, y solo cubre el tráfico que envías.

### Ejemplo: un test grande pequeño

Para una app local con Next.js y SQLite, un test "grande" muy útil y barato sería un test funcional que arranca la app de verdad contra una base de datos temporal y recorre un flujo:

```ts
// test/e2e/today-flow.test.ts (tamaño mediano: una máquina)
let app: RunningApp;

beforeAll(async () => {
  const dbPath = join(await mkdtemp(join(tmpdir(), "study-")), "test.db");
  app = await startApp({ dbPath, port: 0, now: () => new Date("2026-10-24T09:00:00") });
  await seedViaApi(app.url, { module: "02-craft", sessions: 3 }); // siembra por la API
});

afterAll(async () => app.stop());

it("un sábado propone una sesión de 3 horas tras el inglés", async () => {
  const today = await (await fetch(`${app.url}/api/today`)).json();
  expect(today.english.minutes).toBe(60);
  expect(today.study.hours).toBe(3);
});
```

No es tan rápido como un test unitario, pero verifica que la configuración, la base de datos real, las rutas y el dominio encajan.

### Property-based testing: que la máquina invente los casos

Pasamos a *The Pragmatic Programmer*. El tema 42 parte de un problema: cuando escribes tests, tú eliges los datos. Y tus datos reflejan tus suposiciones. Si no pensaste en las listas vacías, en los números negativos o en los strings con emojis, tus tests tampoco.

La solución que propone es el **property-based testing** (pruebas basadas en propiedades). En lugar de escribir ejemplos concretos ("para [3, 1, 2] devuelve [1, 2, 3]"), describes **propiedades** que deben cumplirse para cualquier entrada, y una librería genera cientos de entradas aleatorias para intentar romperlas.

El libro conecta esto con el diseño por contrato de la sesión 8: las propiedades son, muchas veces, las postcondiciones e invariantes de la función. Para una función de ordenamiento:

- El resultado tiene la **misma longitud** que la entrada.
- Cada elemento del resultado es **menor o igual** que el siguiente.
- El resultado contiene **exactamente los mismos elementos** que la entrada.

En TypeScript, la librería más usada es `fast-check`:

```ts
import fc from "fast-check";
import { describe, expect, it } from "vitest";

describe("sortNumbers", () => {
  it("devuelve una lista ordenada con los mismos elementos", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (input) => {
        const output = sortNumbers(input);
        expect(output).toHaveLength(input.length);
        for (let i = 1; i < output.length; i++) expect(output[i - 1]).toBeLessThanOrEqual(output[i]);
        expect([...output].sort((a, b) => a - b)).toEqual([...input].sort((a, b) => a - b));
      }),
    );
  });
});
```

(Aquí sí hay un bucle dentro del test: en las propiedades, la verificación es en sí una pequeña lógica general. Mantenla lo más simple posible.)

### Encontrar suposiciones equivocadas

El ejemplo del libro: una función que gestiona un almacén con existencias. Escriben una propiedad que dice "después de pedir una cantidad de un producto, el stock nunca es negativo". La librería genera combinaciones aleatorias de productos y cantidades y encuentra un caso que falla: pedir más de lo que hay. El código lo permitía porque nadie lo había pensado.

Cuando una propiedad falla, la librería hace algo muy útil: **shrinking** (reducción). Intenta simplificar el caso que falló hasta encontrar el **mínimo** que sigue fallando. En lugar de mostrarte una lista de 87 números aleatorios, te muestra algo como `[0, -1]`. Eso convierte un fallo misterioso en un bug obvio.

```ts
it("el stock nunca queda negativo", () => {
  fc.assert(
    fc.property(fc.nat({ max: 100 }), fc.nat({ max: 200 }), (initialStock, requested) => {
      const warehouse = new Warehouse({ widget: initialStock });
      warehouse.order("widget", requested); // puede fallar, pero no dejar stock negativo
      expect(warehouse.stockOf("widget")).toBeGreaterThanOrEqual(0);
    }),
  );
});
// Contraejemplo reducido: initialStock = 0, requested = 1
```

Cuando una propiedad encuentra un bug, el libro recomienda añadir ese contraejemplo como **test de ejemplo normal**: así queda documentado y protegido para siempre, aunque la generación aleatoria no vuelva a dar con él.

### Propiedades útiles que puedes buscar

Encontrar propiedades al principio cuesta. Algunos patrones frecuentes:

| Patrón | Idea | Ejemplo |
| --- | --- | --- |
| **Ida y vuelta** | Codificar y decodificar devuelve el original | `parse(serialize(x))` es igual a `x` |
| **Invariante** | Algo que no cambia con la operación | Ordenar no cambia la longitud ni los elementos |
| **Idempotencia** | Aplicar dos veces es igual que una | `normalize(normalize(s)) === normalize(s)` |
| **Oráculo** | Comparar con una implementación simple y lenta pero obviamente correcta | Tu búsqueda optimizada frente a un `filter` lineal |
| **Postcondición** | Lo que la función promete | El total de una factura es la suma de sus líneas |
| **Conmutatividad** | El orden de ciertas operaciones no importa | Añadir A y luego B al carrito da el mismo total que B y luego A |

El libro destaca también un efecto lateral: pensar en propiedades **mejora el diseño**, porque te obliga a precisar qué promete tu código (su contrato) en lugar de pensar solo en ejemplos.

### Tests de ejemplo y tests de propiedades: juntos

Los tests de propiedades no sustituyen a los de ejemplo. Se complementan:

| Tests de ejemplo | Tests de propiedades |
| --- | --- |
| Documentan casos concretos y legibles | Exploran miles de casos que no imaginaste |
| Fijan comportamientos específicos del negocio | Verifican reglas generales (invariantes, contratos) |
| Deterministas por naturaleza | Aleatorios; reproducibles con la semilla que reporta la librería |
| Fáciles de leer como especificación | Encuentran bordes y suposiciones falsas |

Para que sigan siendo repetibles (la R de F.I.R.S.T.), `fast-check` informa la **semilla** de cada fallo y permite reejecutar con ella (`fc.assert(property, { seed: 1234 })`).

### Probers y canarios a escala pequeña

Los probers y el análisis canario suenan a cosas de empresas gigantes, pero tienen versiones sencillas que puedes usar en cualquier proyecto:

- **Un endpoint de salud que verifica de verdad.** No basta con devolver `200 OK`: un `/health` útil comprueba que la base de datos responde y que la configuración se cargó. Un servicio externo de monitorización (o un `cron` en otra máquina) lo consulta cada minuto y te avisa si falla. Eso es un prober.
- **Un test de humo tras cada despliegue.** Un script que, justo después de desplegar, recorre el flujo más importante (por ejemplo, abrir la vista de hoy) y revierte el despliegue si falla.
- **Despliegue gradual.** Si tienes varios usuarios, activar una funcionalidad primero para un grupo pequeño con una feature flag (sesión 13) y comparar errores antes de activarla para todos es un análisis canario manual.

```ts
// Un /health que verifica dependencias reales
export async function health(deps: { db: Database; config: Config }): Promise<HealthReport> {
  const checks = {
    database: await deps.db.ping().then(() => "ok" as const, () => "down" as const),
    config: deps.config.port > 0 ? ("ok" as const) : ("invalid" as const),
  };
  const healthy = Object.values(checks).every((status) => status === "ok");
  return { status: healthy ? "ok" : "degraded", checks };
}
```

La idea común es la misma que en el capítulo de Google: la máxima fidelidad solo existe en producción, así que una parte de la verificación tiene que vivir allí.

### Resumen

Los tests unitarios son rápidos y precisos, pero tienen baja fidelidad: no detectan dobles infieles, errores de configuración, problemas de carga ni comportamientos emergentes. Los tests grandes llenan ese hueco a cambio de velocidad y fiabilidad, así que se usan en menor número y con dueños claros. Todo test grande sigue la misma estructura: obtener el sistema bajo prueba, sembrar datos, actuar y verificar, buscando el equilibrio entre hermeticidad y fidelidad. Y el property-based testing complementa los ejemplos: describes propiedades del contrato y dejas que la máquina busque, y reduzca, los contraejemplos que tu imaginación no encontró.

### Errores comunes

- **Creer que los tests unitarios bastan** y descubrir en producción problemas de configuración o integración.
- **Tests grandes sin dueño**, que se rompen y nadie arregla.
- **Sembrar datos insertando filas directamente** en lugar de usar la API del sistema.
- **Propiedades que reimplementan la función** (si la propiedad es la misma lógica, comparte sus bugs).
- **No convertir los contraejemplos encontrados** en tests de ejemplo permanentes.
- **Ignorar la semilla** de un fallo aleatorio y perder la forma de reproducirlo.
- **Tests grandes que comparten datos entre sí**, de modo que uno deja basura que hace fallar al siguiente. Cada test grande debería crear sus propios datos y no depender de lo que dejó otro.

## Conceptos clave

- **Fidelidad**: cuánto se parece el entorno de un test a producción.
- **Hermeticidad**: grado de aislamiento de un test respecto a sistemas y datos externos.
- **SUT (sistema bajo prueba)**: el conjunto de componentes que un test grande pone en marcha.
- **Diff testing A/B**: comparar respuestas de la versión actual y la nueva ante el mismo tráfico.
- **Prober / canario**: verificaciones continuas en producción y despliegues graduales comparando métricas.
- **Property-based testing**: describir propiedades generales y dejar que una librería genere entradas para intentar romperlas.
- **Shrinking**: reducción automática de un contraejemplo hasta el caso mínimo que falla.

## Preguntas de repaso

1. Menciona cuatro tipos de problemas que los tests unitarios no detectan y que justifican tests más grandes.
   R: Dobles infieles que no reflejan la dependencia real, problemas de configuración (archivos, variables de entorno, esquemas), problemas bajo carga (rendimiento, concurrencia) y comportamientos, entradas o efectos inesperados y emergentes que solo aparecen cuando todas las piezas interactúan.
2. ¿Por qué no conviene que todos los tests sean grandes?
   R: Porque son menos fiables (más piezas que pueden fallar por causas ajenas), más lentos (no se ejecutan en cada cambio), suelen no tener un dueño claro y cada equipo los monta de forma distinta. Los tests pequeños dan velocidad y precisión, los grandes dan fidelidad; se necesitan ambos en la proporción de la pirámide.
3. Describe los cuatro pasos de la estructura de un test grande.
   R: Obtener un sistema bajo prueba (con el grado adecuado de hermeticidad y fidelidad), sembrar los datos necesarios (idealmente mediante APIs del sistema), realizar acciones con el sistema y verificar los comportamientos, con aserciones o comparando versiones.
4. ¿Qué es el diff testing A/B y cuál es su limitación?
   R: Enviar el mismo tráfico a la versión actual y a la nueva y comparar sus respuestas; las diferencias se revisan para decidir si son cambios intencionados o regresiones. Sus limitaciones: necesita aprobación humana de las diferencias y solo cubre el tráfico que se envía.
5. ¿Qué es el property-based testing y qué es el shrinking?
   R: Es una técnica en la que describes propiedades que deben cumplirse para cualquier entrada y una librería genera muchas entradas aleatorias para intentar romperlas. El shrinking es la reducción automática del caso que falla hasta el contraejemplo mínimo, para que el bug sea fácil de entender.
6. Da tres patrones de propiedades con un ejemplo de cada uno.
   R: Ida y vuelta: `parse(serialize(x))` es igual a `x`. Idempotencia: normalizar dos veces da lo mismo que una. Oráculo: comparar una búsqueda optimizada con un `filter` lineal obviamente correcto. (Otros: invariantes como que ordenar conserva longitud y elementos, postcondiciones y conmutatividad.)

## Ejercicio

Instala `fast-check` en un proyecto TypeScript con Vitest. Implementa (o reutiliza) un parser y un serializador del frontmatter de las sesiones de este plan (`title`, `kind`, `hours`, `sources`). Escribe al menos cuatro propiedades: ida y vuelta (`parse(serialize(x))` igual a `x` para frontmatters válidos generados con `fc.record`), que `hours` siempre sea 2 o 3 tras un parse exitoso, que el parser nunca lance una excepción con strings arbitrarios (debe devolver un `Result`), y que la normalización de espacios sea idempotente. Si alguna propiedad encuentra un contraejemplo, conviértelo en un test de ejemplo con nombre descriptivo y arregla el código. Añade además un test mediano que lea los archivos reales de `content/modules/02-craft` y compruebe que todos se parsean sin errores. Terminado cuando las cuatro propiedades pasan con al menos 1,000 ejecuciones cada una (`{ numRuns: 1000 }`), cada contraejemplo encontrado tiene su test de ejemplo y el test mediano pasa.

## Explícalo con tus palabras

Explica a alguien la diferencia entre probar "que 2 + 3 da 5" y probar "que sumar dos números en cualquier orden da lo mismo", y por qué la segunda forma puede encontrar bugs que la primera no.
