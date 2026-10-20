---
title: Integración y entrega continuas, y el kit de inicio pragmático
kind: lesson
hours: 2
sources: Software Engineering at Google, cap. 23 Continuous Integration (pp. 538–567) | Software Engineering at Google, cap. 24 Continuous Delivery (pp. 568–579) | The Pragmatic Programmer, temas 50–51 Coconuts Don't Cut It, Pragmatic Starter Kit (pp. 446–461)
links: Documentación de GitHub Actions | https://docs.github.com/actions
---

## Objetivo

Entender la integración continua (CI) como un sistema de feedback rápido y accionable (presubmit, postsubmit, release candidates, pruebas en producción, tests herméticos) y la entrega continua (CD) como la práctica de desplegar cambios pequeños, aislados por feature flags y evaluados con datos. Completar el kit de inicio pragmático: control de versiones, tests de regresión y automatización total. Al terminar vas a poder escribir un pipeline de CI para un proyecto TypeScript y justificar cada paso.

## Estudio

### Qué es la integración continua

La definición clásica (de Martin Fowler, citada en el capítulo 23 de *Software Engineering at Google*) describe la CI como una práctica en la que los miembros de un equipo integran su trabajo con frecuencia, al menos a diario, y cada integración se verifica con un build automático que incluye tests, para detectar errores de integración lo antes posible.

El libro propone una definición más amplia y moderna: la CI es **la integración continua de todo el ecosistema complejo y cambiante** del que depende tu software. No solo tu código cambia: cambian las librerías, los servicios de otros equipos, la configuración, las versiones del lenguaje. La CI es el sistema que te avisa, lo antes posible, de que algo en ese ecosistema dejó de encajar.

### Feedback rápido

El costo de un bug crece casi exponencialmente cuanto más tarde se detecta (la idea de *shifting left* de la sesión 1). Un bug detectado tarde tiene varios costos: alguien que no conoce el cambio tiene que investigarlo, el autor tiene que recordar un cambio que hizo hace días y otros se ven afectados mientras tanto. Por eso la CI busca los **bucles de feedback más rápidos posibles**. El libro los ordena de más rápido a más lento:

| Bucle de feedback | Quién se entera |
| --- | --- |
| Editar, compilar y depurar en local | El autor, en segundos |
| Tests automáticos en presubmit | El autor, en minutos, antes del commit |
| Error de integración entre dos proyectos, tras el commit | El equipo, en minutos u horas |
| Incompatibilidad con un servicio del que dependes, en staging | Varios equipos, en horas |
| Bugs reportados por usuarios internos que prueban antes | Antes del lanzamiento |
| Bugs o caídas reportados por usuarios externos o la prensa | Todos, demasiado tarde |

El feedback además tiene que ser **accesible y accionable**: el autor tiene que poder ver fácilmente qué falló, por qué y cómo reproducirlo. Un "build roto" sin logs claros ni enlace al test que falló es casi inútil.

### Automatización: build continuo y entrega continua

La CI automatiza el camino desde el código hasta el release:

- **Build continuo** (*continuous build*, CB): integra los últimos cambios de la rama principal y ejecuta los tests automáticamente en cada cambio. El resultado es saber, en todo momento, si la cabeza de trunk está "verde" (es decir, si compila y pasa los tests).
- **Entrega continua** (*continuous delivery*, CD): automatiza la creación de **candidatos a release** (*release candidates*, RC): versiones desplegables que se promocionan por entornos (desarrollo, staging, producción), ejecutando tests en cada etapa.

```
Commit ─► Presubmit ─► Merge a trunk ─► Build continuo ─► Release candidate ─► Staging ─► Producción
          (tests        (cambio en        (todos los        (versión           (tests     (probers,
          rápidos)      fuente de         tests,            congelada)         grandes)   canarios)
                        verdad)           postsubmit)
```

### Presubmit y postsubmit

**Presubmit** son las comprobaciones que se ejecutan **antes** de integrar el cambio (en GitHub, las comprobaciones del pull request). **Postsubmit** son las que se ejecutan **después**, sobre trunk.

¿Por qué no ejecutar todo en presubmit? El libro explica que **el presubmit no es suficiente** ni puede serlo a escala: ejecutar todos los tests de todo lo afectado por cada cambio sería demasiado lento y caro. Además, dos cambios pueden pasar sus presubmits por separado y romper algo al combinarse en trunk. Por eso se reparte:

- **Presubmit**: tests rápidos y fiables, normalmente los del proyecto afectado. Objetivo: proteger al autor de errores evidentes sin hacerle esperar mucho.
- **Postsubmit**: la batería completa, incluidos tests más lentos y los de otros proyectos que dependen del cambio. Si algo falla, hay que encontrar el cambio culpable y arreglarlo o revertirlo rápido.

### Tests del release candidate y en producción

El libro explica por qué se vuelven a ejecutar tests sobre el **release candidate**, aunque el código ya pasó por CI: para comprobar que nada raro pasó al construirlo, para tener un registro auditable de los resultados de esa versión concreta, porque a veces se aplican *cherry-picks* que cambian el código respecto a lo probado y para los despliegues de emergencia.

Y la CI no termina en el despliegue: las **pruebas en producción** (probers, canarios, sesión 22) cierran el ciclo. El capítulo también relaciona la CI con las **alertas**: ambas buscan detectar problemas lo antes posible, una antes del despliegue y otra después. Y del mismo modo que no todas las alertas merecen despertar a alguien, no todo fallo de test merece el mismo tratamiento: hay que distinguir entre lo que bloquea y lo que se investiga después.

### Desafíos de la CI

El libro enumera los retos principales:

- **Optimizar el presubmit**: qué tests ejecutar en cada etapa para equilibrar velocidad y confianza.
- **Encontrar al culpable** (*culprit finding*): cuando falla un test en postsubmit con muchos cambios recientes, ¿cuál lo rompió? (Es la búsqueda binaria de la sesión 18, automatizada.)
- **Recursos limitados**: ejecutar tests cuesta máquinas y tiempo.
- **Gestión de fallos**: tener un procedimiento claro cuando trunk está roto. En Google, la prioridad es **revertir primero y preguntar después**: dejar trunk roto bloquea a todos.
- **Tests inestables**: destruyen la confianza en la CI (sesión 19).

**Tests herméticos.** Hablar con servicios reales desde la CI es poco fiable. Por eso Google usa con frecuencia **tests herméticos**: el sistema bajo prueba se levanta con todas sus dependencias en un entorno aislado (*sandbox*), sin depender de servicios compartidos. El libro advierte de sus dos riesgos: **falsos positivos** (el test falla por un problema del entorno de prueba, no del código) y **falsos negativos** (el test pasa porque el entorno hermético no reproduce un problema que sí existe en producción). Es otra vez el equilibrio entre hermeticidad y fidelidad de la sesión 22.

**La CI en Google.** El sistema de Google, TAP (*Test Automation Platform*), ejecuta los tests afectados de cada cambio en presubmit y, tras el commit, ejecuta de forma asíncrona todos los tests afectados agrupando cambios en lotes. Si un lote falla, lo divide automáticamente para encontrar el cambio culpable. Es la búsqueda binaria a escala industrial.

### Entrega continua: idiomas clave

El capítulo 24 trata la **entrega continua**. Sus ideas principales:

- **Agilidad**: publicar **con frecuencia y en lotes pequeños**. Cada release pequeño tiene menos riesgo y es más fácil de diagnosticar si algo falla.
- **Automatización**: reducir o eliminar la sobrecarga manual de publicar.
- **Aislamiento de cambios**: proteger las funcionalidades nuevas con **feature flags**, de modo que se puedan activar, desactivar y evaluar por separado sin un nuevo despliegue.
- **Fiabilidad**: medir métricas clave como fallos y latencia, y comprobar que mejoran o al menos no empeoran.
- **Toma de decisiones con datos**: evaluar el efecto de cada cambio con experimentos (A/B) en lugar de suposiciones.
- **Despliegue por fases**: activar los cambios gradualmente, para una parte de los usuarios primero.

Una idea poderosa del capítulo: **la velocidad es un deporte de equipo**. Un release grande que espera a que todos los equipos terminen avanza al ritmo del más lento. Con **trenes de release** (un release sale a horas fijas con lo que esté listo, y lo que no esté listo espera al siguiente tren), nadie bloquea a nadie. Y otra: **ningún binario es perfecto**. Siempre habrá algún bug; lo importante es poder detectarlo y corregirlo rápido, no retrasar indefinidamente el release buscando la perfección. Por eso se protege la **fecha del release**: si una funcionalidad no está lista, se queda fuera (detrás de su flag), y el tren sale.

El capítulo añade dos enfoques de calidad: **publicar solo lo que se usa** (si nadie usa una funcionalidad, eliminarla reduce costos, como en la deprecación de la sesión 28) y **desplazar a la izquierda** también las decisiones de producto, recogiendo datos lo antes posible.

### Los cocos no sirven

*The Pragmatic Programmer* tiene un tema con un título curioso: "Los cocos no sirven". Cuenta la historia de los **cultos cargo**: tras la Segunda Guerra Mundial, algunos isleños del Pacífico construyeron pistas de aterrizaje y torres de control falsas, con auriculares hechos de cocos, imitando lo que habían visto hacer a los militares, esperando que volvieran los aviones con mercancías. Copiaban la forma sin entender el fondo.

En software pasa lo mismo cuando un equipo copia las prácticas de otra empresa (sprints, microservicios, un pipeline sofisticado) sin entender por qué funcionan allí. El consejo: **haz lo que funciona, no lo que está de moda**, y recuerda que **el contexto importa** (como el pensamiento crítico de la sesión 2). El libro también menciona que el objetivo final es **entregar cuando los usuarios lo necesitan**, y que la entrega continua es la forma de poder hacerlo en cualquier momento, no un ritual.

### El kit de inicio pragmático

El tema 51 resume la base mínima que todo proyecto debería tener, en tres pilares:

**1. Control de versiones.** Todo lo necesario para construir el proyecto está bajo control de versiones (sesión 28). Y el libro añade una idea concreta: **los builds y los releases se hacen desde el control de versiones**, no desde la máquina de alguien. Las máquinas de build son reproducibles; tu portátil no.

**2. Tests de regresión.** El libro da varias reglas:

- **Prueba pronto, prueba a menudo, prueba automáticamente.** Los tests que dependen de alguien que se acuerde de ejecutarlos acaban sin ejecutarse.
- **El código no está terminado hasta que pasan todos los tests.**
- **Usa saboteadores para probar tus tests.** Introduce bugs a propósito y comprueba que los tests los detectan (es la idea del *mutation testing*; en TypeScript existe Stryker para automatizarlo).
- **Prueba la cobertura de estados, no la cobertura de código.** Que una línea se ejecute no significa que se hayan probado todos los estados relevantes (por eso las propiedades de la sesión 22).
- **Encuentra cada bug una sola vez.** Cuando un humano encuentra un bug, debe ser la última vez que un humano lo encuentra: a partir de ahí, lo detecta un test.

**3. Automatización total.** Todo lo que se hace más de una vez se automatiza: build, tests, despliegue, generación de documentación. El libro lo dice claro: **no uses procedimientos manuales**. Un procedimiento manual es inconsistente, depende de que la persona correcta esté disponible y no escala.

### Un pipeline de CI para un proyecto TypeScript

Con todo lo anterior, este es un pipeline razonable con GitHub Actions para un proyecto como esta app:

```yaml
# .github/workflows/ci.yml
name: ci
on:
  pull_request:
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci                    # instalación reproducible desde el lockfile
      - run: npm run typecheck         # tsc --noEmit
      - run: npm run lint              # ESLint
      - run: npx prettier --check .    # formato
      - run: npm test -- --coverage    # tests pequeños y medianos
      - run: npm run build             # el build de producción compila
```

Cada paso responde a algo del módulo:

| Paso | Por qué |
| --- | --- |
| `npm ci` con lockfile | Builds reproducibles y una sola versión de cada dependencia (sesión 28) |
| `typecheck`, `lint`, `prettier --check` | Reglas automatizadas, no discutidas en review (sesión 25) |
| `npm test` | Tests de regresión automáticos: el código no está terminado si no pasan (tema 51) |
| `npm run build` | Detecta errores de configuración y de build antes del despliegue (sesión 22) |
| `timeout-minutes` | Un pipeline colgado es feedback que nunca llega |
| En `pull_request` y en `push` a `main` | Presubmit para el autor y postsubmit sobre la fuente de verdad |

Y algunas reglas de funcionamiento que lo completan: proteger la rama `main` para que solo se pueda integrar con la CI en verde y un review aprobado; si `main` se rompe, **revertir primero**; mantener el pipeline por debajo de unos minutos para que el feedback sea rápido; y convertir cada fallo de CI investigado en una mejora (un test, un mensaje más claro, una regla nueva).

### Ejemplo: un saboteador en acción

La regla "usa saboteadores para probar tus tests" se entiende mejor con un caso. Tienes esta función y su test:

```ts
export function isWeekend(date: CalendarDate): boolean {
  const day = date.dayOfWeek(); // 0 = domingo ... 6 = sábado
  return day === 0 || day === 6;
}

it("el sábado es fin de semana", () => {
  expect(isWeekend(CalendarDate.parse("2026-10-24"))).toBe(true);
});
```

El saboteador cambia `day === 0 || day === 6` por `day === 6`. ¿Falla algún test? No: solo probamos el sábado. El saboteador "sobrevive", y eso revela un hueco: falta el test del domingo (y el de un día laborable, que detectaría `return true`). Las herramientas de *mutation testing* como Stryker hacen esto automáticamente con cientos de pequeñas mutaciones (cambiar operadores, borrar líneas, invertir condiciones) y te dicen cuáles sobrevivieron. Son lentas para ejecutarlas en cada cambio, pero muy útiles de vez en cuando para medir la calidad real de una suite, mucho mejor que el porcentaje de cobertura.

### Resumen

La integración continua es un sistema de feedback: detecta lo antes posible que algo del ecosistema dejó de encajar, con mensajes accesibles y accionables. Se reparte entre presubmit (rápido, para el autor) y postsubmit (completo, sobre trunk), sigue con los release candidates y termina en producción con probers y canarios. Cuando trunk se rompe, se revierte primero. La entrega continua publica cambios pequeños y frecuentes, aislados con feature flags, evaluados con datos y con trenes de release que no esperan a nadie. Y el kit de inicio pragmático lo resume: todo en control de versiones, tests de regresión automáticos que se prueban con saboteadores y ningún procedimiento manual. Sin cocos: cada paso del pipeline existe porque resuelve un problema concreto.

### Errores comunes

- **CI lenta** (20 minutos o más) que la gente aprende a no esperar.
- **Trunk roto durante horas** mientras se busca un arreglo en lugar de revertir.
- **Mensajes de fallo crípticos** que no dicen qué test falló ni cómo reproducirlo.
- **Pasos manuales en el release** ("acuérdate de cambiar la versión y subir el archivo").
- **Builds desde el portátil de alguien.**
- **Copiar el pipeline de una gran empresa** sin entender qué problema resuelve cada paso (culto cargo).
- **Tests que nunca se probaron con un saboteador**: nadie sabe si detectan algo.
- **Ignorar los fallos "conocidos"**: una CI que está roja por costumbre deja de comunicar nada, igual que una alarma que suena siempre. Si un fallo es conocido y no se puede arreglar hoy, se desactiva ese test con un ticket y una fecha, de forma visible, y la CI vuelve a verde.

Una última observación: todo lo de esta sesión es la culminación del módulo. Los nombres, las funciones pequeñas, los tests limpios, los dobles bien elegidos, las reglas de estilo, los reviews y los commits pequeños existen para que este pipeline pueda decir "verde" con confianza muchas veces al día, y para que cuando diga "rojo" sepas en segundos qué pasó y cómo arreglarlo.

## Conceptos clave

- **Integración continua**: integrar y verificar automáticamente cada cambio con el ecosistema completo, lo antes posible.
- **Presubmit / postsubmit**: comprobaciones antes de integrar un cambio / después, sobre la rama principal.
- **Release candidate**: versión congelada y desplegable que se promociona por entornos con tests en cada etapa.
- **Test hermético**: test que levanta el sistema y sus dependencias en un entorno aislado, sin servicios compartidos.
- **Entrega continua**: publicar con frecuencia en lotes pequeños, automatizados, aislados con flags y evaluados con datos.
- **Tren de release**: releases que salen a horas fijas con lo que esté listo.
- **Kit de inicio pragmático**: control de versiones, tests de regresión y automatización total.

## Preguntas de repaso

1. ¿Cómo amplía Software Engineering at Google la definición clásica de integración continua?
   R: La define como la integración continua de todo el ecosistema complejo y cambiante del que depende el software (librerías, servicios de otros equipos, configuración, versiones del lenguaje), no solo de los cambios del propio código, con el objetivo de detectar lo antes posible cualquier incompatibilidad.
2. ¿Por qué el presubmit no es suficiente y cómo se reparte el trabajo con el postsubmit?
   R: Porque ejecutar todos los tests afectados por cada cambio sería demasiado lento y caro, y porque dos cambios que pasan por separado pueden romper algo al combinarse en trunk. El presubmit ejecuta tests rápidos y fiables para proteger al autor; el postsubmit ejecuta la batería completa sobre trunk y busca al culpable si algo falla.
3. ¿Qué riesgos tienen los tests herméticos?
   R: Falsos positivos, cuando el test falla por un problema del entorno aislado y no del código, y falsos negativos, cuando el test pasa porque el entorno hermético no reproduce un problema que sí existe en producción.
4. Menciona cuatro ideas clave de la entrega continua según Google.
   R: Publicar con frecuencia en lotes pequeños, automatizar el proceso de release, aislar los cambios con feature flags, medir la fiabilidad y decidir con datos (experimentos A/B), desplegar por fases y usar trenes de release que no esperan a funcionalidades que no están listas.
5. ¿Qué es un culto cargo en software y qué consejo da The Pragmatic Programmer?
   R: Copiar las prácticas visibles de otros (sprints, microservicios, pipelines) sin entender por qué funcionan en su contexto, como los isleños que construían torres de control falsas. El consejo es hacer lo que funciona en tu contexto, no lo que está de moda.
6. Enumera los tres pilares del kit de inicio pragmático y dos reglas sobre los tests de regresión.
   R: Control de versiones, tests de regresión y automatización total. Reglas: probar pronto, a menudo y automáticamente; el código no está terminado hasta que pasan todos los tests; usar saboteadores para probar los tests; probar la cobertura de estados y no solo de código; encontrar cada bug una sola vez.

## Ejercicio

Crea el pipeline de CI de un proyecto TypeScript tuyo con GitHub Actions (o la plataforma que uses) siguiendo el ejemplo de la lección, con una tabla en el README que explique el porqué de cada paso. Configura la protección de la rama principal para exigir la CI en verde. Después aplica el "saboteador": introduce a propósito tres bugs distintos (un error de tipos, una violación de lint y un bug de lógica que un test debería detectar) en tres pull requests y comprueba que la CI falla en cada uno con un mensaje que te lleva directamente al problema. Si algún bug pasa la CI, escribe el test que faltaba. Mide el tiempo total del pipeline y anótalo. Terminado cuando el pipeline pasa en `main`, los tres saboteadores fueron detectados (o se añadió el test que faltaba) y el pipeline tarda menos de cinco minutos.

## Explícalo con tus palabras

Explica a alguien por qué publicar diez cambios pequeños en una semana es menos arriesgado que publicar un único cambio grande con los mismos diez cambios.
