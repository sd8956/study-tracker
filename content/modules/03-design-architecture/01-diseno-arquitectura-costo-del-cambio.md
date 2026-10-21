---
title: Diseño, arquitectura y el costo del cambio
kind: lesson
hours: 2
sources: Clean Architecture, parte I, caps. 1–2 (pp. 25–36) | Clean Architecture, cap. 15 "What Is Architecture?" (pp. 117–124)
---

## Objetivo

Entender qué buscan el diseño y la arquitectura de software (reducir el esfuerzo humano para construir y mantener un sistema), por qué la estructura vale más que el comportamiento a largo plazo y cómo reconocer las señales de un sistema que se está volviendo caro de cambiar.

## Estudio

### Diseño y arquitectura no son dos cosas distintas

Mucha gente usa "arquitectura" para hablar de las decisiones grandes (microservicios o monolito, qué base de datos, qué nube) y "diseño" para las pequeñas (cómo nombras una clase, cómo divides una función). La distinción parece útil, pero se rompe en cuanto miras cómo trabaja un arquitecto de edificios. Los planos de una casa incluyen la forma general, la fachada y la distribución de las habitaciones, pero también dónde va cada enchufe, qué interruptor enciende qué lámpara, dónde se instala el calentador y cómo se construyen los cimientos. Las decisiones de alto nivel y los detalles forman una sola tela: no hay una línea que diga "a partir de aquí ya no es arquitectura".

En software pasa igual. La decisión de que tu dominio no conozca la base de datos (alto nivel) solo se sostiene si cada clase concreta respeta esa regla (bajo nivel). Si un desarrollador importa el cliente de PostgreSQL dentro de una entidad del negocio "porque era más rápido", la arquitectura cambió aunque nadie haya dibujado un diagrama nuevo. Por eso en este módulo vas a ver diseño y arquitectura como un continuo de decisiones, desde el nombre de un método hasta la forma de desplegar el sistema.

### La meta: minimizar el esfuerzo humano

La definición más práctica que puedes llevarte es esta: **el objetivo de la arquitectura es minimizar los recursos humanos necesarios para construir y mantener el sistema**. La calidad de un diseño se mide por cuánto esfuerzo cuesta satisfacer las necesidades del cliente, y sobre todo por cómo evoluciona ese esfuerzo con el tiempo:

- Si el esfuerzo es bajo y **se mantiene bajo** release tras release, el diseño es bueno.
- Si el esfuerzo **crece** con cada release, el diseño es malo, aunque hoy todo funcione.

Fíjate en que la definición no habla de elegancia, de usar el patrón de moda ni de tener muchas capas. Habla de costo. Esto te da un criterio objetivo para discutir con tu equipo: "¿esta decisión hace que el próximo cambio cueste menos o más?".

### La firma de un desastre

Martin describe un caso real con cuatro curvas que vale la pena tener grabadas:

```
Tamaño del equipo        Líneas por release        Costo por línea
   │          ╱             │   ╱‾‾‾‾‾‾‾‾‾          │            ╱
   │        ╱               │  ╱                    │          ╱
   │      ╱                 │ ╱                     │       ╱
   │   ╱                    │╱                      │ __ ╱
   └──────────── release    └──────────── release   └──────────── release
```

1. El equipo crece mucho: parece éxito.
2. La cantidad de código producido se aplana: cada vez se agrega menos funcionalidad por release.
3. El costo por línea de código se dispara (en el ejemplo, unas 40 veces más caro en el release 8 que en el 1).
4. La nómina mensual pasa de cientos de miles a millones, mientras lo que se entrega es casi nada.

Desde dentro, los desarrolladores no están vagueando: trabajan horas extra, con dedicación. Pero su energía ya no va a las funcionalidades; va a **mover el desorden de un lado a otro** para poder meter una característica más. Esa es la firma de un sistema construido a la carrera, donde la única palanca de producción fue sumar gente.

### La mentira de "lo limpiamos después"

La fábula de la liebre y la tortuga resume el error: la liebre confía tanto en su velocidad que se duerme. Los equipos modernos no se duermen, pero sí apagan la parte del cerebro que sabe que el código limpio importa. Se repiten dos mentiras:

- **"Lo limpiamos después, primero hay que salir al mercado."** Después nunca llega, porque la presión del mercado no desaparece; tras el primer lanzamiento viene el segundo competidor, el cliente grande, la ronda de inversión.
- **"Escribir código desordenado nos hace ir más rápido a corto plazo."** Ni siquiera eso es cierto. Experimentos de práctica deliberada (por ejemplo, repetir una kata con y sin TDD) muestran que la disciplina no te frena ni siquiera en la escala de un día. Lo que te hace ir rápido es ir bien.

La consecuencia es incómoda: la forma de ir rápido es ir bien. Y el exceso de confianza del tipo "si lo reescribimos desde cero, esta vez sí lo haremos bien" suele producir el mismo desastre, porque el equipo que creó el primer desorden es el mismo que va a escribir el segundo.

### Los dos valores del software

Todo sistema entrega dos valores a quien lo paga:

| Valor | Qué es | Quién lo pide |
| --- | --- | --- |
| **Comportamiento** | Que la máquina haga lo que el negocio necesita: calcular, guardar, notificar. | Lo piden explícitamente los stakeholders; aparece en tickets y requisitos. |
| **Estructura (arquitectura)** | Que el sistema sea fácil de cambiar. | Casi nadie lo pide en voz alta, pero todos lo dan por hecho. |

La palabra *software* lo dice: *soft* significa blando. El software se inventó para cambiar fácilmente el comportamiento de las máquinas. Si quisiéramos que fuera difícil de cambiar, lo llamaríamos hardware. Para cumplir su propósito, el costo de un cambio debería ser **proporcional al alcance del cambio**, no a la **forma** del sistema.

#### Alcance contra forma

Imagina que el negocio te pide cambios de tamaño parecido cada semana: un campo nuevo, una regla de descuento, un reporte. Desde su punto de vista todos son "del mismo tamaño". Desde el tuyo, cada pedido es una pieza de rompecabezas que tienes que encajar en un rompecabezas cada vez más complejo. Si la arquitectura favorece una forma (por ejemplo, todo está organizado alrededor de pantallas), los cambios con otra forma (una regla que atraviesa varias pantallas) se vuelven cada vez más caros. Por eso conviene que la arquitectura sea lo más **agnóstica a la forma** posible: que no obligue a que todo cambio tenga una silueta concreta.

### ¿Qué vale más: que funcione o que se pueda cambiar?

Si preguntas a un gerente, probablemente diga "que funcione". Analiza los extremos:

- Un programa que **funciona perfectamente pero es imposible de cambiar** dejará de funcionar en cuanto cambien los requisitos, y no podrás arreglarlo. Su valor tiende a cero.
- Un programa que **no funciona pero es fácil de cambiar** se puede hacer funcionar y mantener funcionando. Su valor crece.

Esto no significa que puedas entregar cosas rotas. Significa que, cuando hay tensión, la estructura es el valor que se protege a largo plazo. Además, en la práctica "imposible de cambiar" no es binario: es un costo de cambio tan alto que el negocio decide no hacerlo. Ese es el sistema que la empresa "no se atreve a tocar".

### La matriz de Eisenhower aplicada al código

Eisenhower decía que lo importante rara vez es urgente y lo urgente rara vez es importante. Aplicado al software:

```
                 URGENTE                 NO URGENTE
            ┌────────────────────┬────────────────────┐
IMPORTANTE  │ 1. Arquitectura    │ 2. Arquitectura    │
            │    urgente (raro)  │    (el día a día)  │
            ├────────────────────┼────────────────────┤
NO          │ 3. Comportamiento  │ 4. Ni lo uno       │
IMPORTANTE  │    urgente         │    ni lo otro      │
            └────────────────────┴────────────────────┘
```

El comportamiento suele ser urgente pero no siempre importante; la arquitectura es importante pero casi nunca urgente. El error típico es elevar el cuadrante 3 (lo urgente sin importancia) por encima del cuadrante 2 (lo importante sin urgencia). Los gerentes no están preparados para evaluar la importancia de la arquitectura; **eso es trabajo tuyo**. Para eso te contratan.

### Pelear por la arquitectura

Un equipo de desarrollo sano es uno de varios actores que tiran de la cuerda: producto quiere funcionalidades, ventas quiere fechas, operaciones quiere estabilidad. Tú representas un valor que nadie más defiende: la capacidad de seguir cambiando el sistema. Si no lo defiendes, nadie lo hará. Defenderlo no es negarte a entregar; es explicar en términos de costo ("si metemos esto así, el siguiente cambio de pagos costará el triple") y negociar como un adulto profesional.

### Para qué sirve una buena arquitectura (vista general)

Más adelante en el módulo (sesión 30) verás esto en detalle, pero conviene tener el mapa desde ya. Una buena arquitectura facilita cuatro cosas a lo largo del ciclo de vida:

| Etapa | Qué facilita | Señal de que falla |
| --- | --- | --- |
| **Desarrollo** | Que varios equipos trabajen sin pisarse. | Cada cambio exige coordinar con tres equipos. |
| **Despliegue** | Desplegar con una sola acción, sin scripts frágiles. | Desplegar requiere un ritual de 40 pasos y alguien de guardia. |
| **Operación** | Escalar y observar el sistema según lo que hace. | Nadie sabe qué casos de uso existen mirando el código. |
| **Mantenimiento** | Encontrar dónde cambiar y hacerlo sin romper otra cosa. | "Tocar esto es peligroso", "mejor no lo toques". |

Y una idea central que irá apareciendo en todo el módulo: **mantener las opciones abiertas**. Un buen arquitecto separa las *políticas* (las reglas del negocio, lo que da dinero) de los *detalles* (base de datos, framework web, protocolo de mensajería) y retrasa las decisiones sobre los detalles todo lo posible. Mientras más tarde decides, más información tienes. Un ejemplo clásico: un sistema que se escribió sin saber si iba a usar una base de datos relacional o archivos, y que gracias a eso pudo empezar con archivos planos y no necesitó una base de datos durante mucho tiempo.

#### Analogía de construcción

Piensa en un edificio de oficinas con paredes interiores de tablaroca (drywall) en lugar de muros de carga. La estructura (columnas, losas, núcleo de escaleras) es la política: estable y difícil de cambiar. Las divisiones interiores son detalles: si mañana una empresa quiere un open space y otra quiere oficinas cerradas, el edificio lo soporta sin tocar la estructura. Un mal diseño es aquel donde cada pared interior resulta ser un muro de carga.

### Cómo se ve en TypeScript

Mira dos versiones de la misma regla: "un pedido con más de 3 productos tiene 10 % de descuento".

Versión acoplada a los detalles:

```ts
// order-controller.ts
import express from "express";
import { Pool } from "pg";

const db = new Pool();
export const router = express.Router();

router.post("/orders", async (req, res) => {
  const items = req.body.items as { price: number; qty: number }[];
  let total = items.reduce((s, i) => s + i.price * i.qty, 0);
  if (items.length > 3) total = total * 0.9; // regla de negocio escondida
  await db.query("INSERT INTO orders(total) VALUES ($1)", [total]);
  res.json({ total });
});
```

Si mañana la misma regla debe aplicarse a un import por CSV o a un job nocturno, tienes que copiarla. Si cambias de Express a otro framework, la regla se mueve con él. La regla de negocio (la parte valiosa) está atrapada dentro de los detalles.

Versión donde la política no conoce los detalles:

```ts
// domain/pricing.ts  (no importa nada de infraestructura)
export interface Line { price: number; qty: number }

export function orderTotal(lines: Line[]): number {
  const gross = lines.reduce((s, l) => s + l.price * l.qty, 0);
  return lines.length > 3 ? gross * 0.9 : gross;
}

// application/place-order.ts
import { orderTotal, Line } from "../domain/pricing";
export interface OrderStore { save(total: number): Promise<void> }

export async function placeOrder(lines: Line[], store: OrderStore) {
  const total = orderTotal(lines);
  await store.save(total);
  return total;
}
```

Ahora Express y PostgreSQL son enchufes: el controlador llama a `placeOrder` y un adaptador implementa `OrderStore`. Esto es un adelanto de lo que verás con DIP, DDD y Clean Architecture. Por ahora quédate con la intuición: **la regla valiosa no debería depender de las herramientas**.

### Señales tempranas de que el costo del cambio sube

| Señal | Qué suele indicar |
| --- | --- |
| "Para este cambio hay que tocar 12 archivos en 5 carpetas." | Responsabilidades dispersas; falta cohesión. |
| Los tests se rompen cuando cambias algo no relacionado. | Acoplamiento excesivo o tests atados a detalles. |
| Nadie quiere tocar un módulo concreto. | Rigidez y fragilidad acumuladas. |
| Las estimaciones de cambios "pequeños" crecen release a release. | La forma del sistema ya no encaja con la forma de los pedidos. |
| Los merges generan conflictos constantes en los mismos archivos. | Módulos con varias razones para cambiar (lo verás con SRP). |

### Deuda técnica: el interés compuesto del desorden

Una forma útil de hablar de todo esto con el negocio es la metáfora de la **deuda técnica**. Cada atajo que tomas (copiar una regla en vez de extraerla, meter una consulta SQL dentro de una pantalla, saltarte un test) es un préstamo: hoy entregas antes, pero desde mañana pagas intereses. El interés se paga en tiempo: cada cambio futuro que toca esa zona tarda un poco más, porque hay que entender el atajo, rodearlo o repetirlo.

Lo peligroso es que el interés es **compuesto**. Un atajo obliga a otro: como la regla de descuento está copiada en tres controladores, cuando llega la regla de envío gratis también se copia en tres sitios, y ahora hay seis lugares que mantener sincronizados. Las curvas del caso de estudio son exactamente el gráfico de una deuda que nadie amortizó.

No toda deuda es mala. Pedir prestado de forma consciente para validar una idea en una semana puede ser una gran decisión de negocio, igual que una hipoteca. La diferencia está en tres cosas:

| Deuda sana | Deuda tóxica |
| --- | --- |
| Se toma a propósito y se registra (un ticket, un comentario con fecha). | Aparece sin que nadie la decida. |
| Está localizada: el atajo vive en un solo lugar, detrás de una interfaz. | Está esparcida por todo el código. |
| Se paga pronto, antes de construir encima. | Se construye encima hasta que pagarla es impensable. |

Fíjate en que la segunda fila conecta con todo lo que verás después: si el atajo vive detrás de una interfaz (un puerto, un adaptador, una fachada), puedes reemplazarlo sin tocar lo demás. El buen diseño no evita toda la deuda; **la contiene**.

### Un ejercicio mental: el costo de la siguiente pregunta

Cuando dudes entre dos diseños, haz esta prueba rápida. Escribe las tres preguntas de cambio más probables para los próximos seis meses ("¿y si aceptamos pagos con otra pasarela?", "¿y si el descuento depende del tipo de cliente?", "¿y si hay que exponer esto también por una cola de mensajes?") y estima, para cada diseño, cuántos archivos y cuántos módulos tendrías que tocar. El diseño que hace que esas preguntas cuesten poco es el mejor para tu contexto, aunque tenga menos capas o parezca menos sofisticado. Esta prueba te protege tanto del código espagueti como del sobrediseño: no inventas flexibilidad para cambios que nadie va a pedir, pero tampoco ignoras los que sí son probables.

### Errores comunes

- **Confundir arquitectura con tecnología.** "Nuestra arquitectura es React + Node + Mongo" describe herramientas, no la forma del sistema.
- **Creer que la arquitectura es un documento que se hace al inicio.** Se decide y se defiende en cada commit.
- **Sobrediseñar por miedo.** Mantener opciones abiertas no es crear diez capas "por si acaso"; es no atar la política a los detalles. El costo de la abstracción también cuenta.
- **No hablar en términos de costo.** "Esto está feo" no convence a nadie; "este diseño hará que cada nueva forma de pago cueste dos semanas en vez de dos días" sí.

### Resumen

Diseño y arquitectura son el mismo continuo de decisiones. Su objetivo es que el esfuerzo para cambiar el sistema sea bajo y se mantenga bajo. La estructura es el valor más importante a largo plazo, aunque casi nunca sea urgente, y defenderla es responsabilidad del desarrollador. Una buena arquitectura separa políticas de detalles para poder decidir los detalles lo más tarde posible.

## Conceptos clave

- **Arquitectura de software**: la forma que se le da al sistema (división en componentes, cómo se comunican y cómo se organizan) para facilitar su desarrollo, despliegue, operación y mantenimiento.
- **Meta de la arquitectura**: minimizar los recursos humanos necesarios para construir y mantener el sistema a lo largo del tiempo.
- **Comportamiento**: el valor de que el sistema haga lo que el negocio necesita hoy.
- **Estructura**: el valor de que el sistema sea fácil de cambiar mañana.
- **Alcance vs. forma**: el costo de un cambio debería depender de su alcance y no de la forma que ya tiene el sistema.
- **Política vs. detalle**: reglas de negocio frente a mecanismos (base de datos, web, frameworks) que deberían poder cambiarse.
- **Mantener opciones abiertas**: retrasar decisiones sobre detalles hasta tener información suficiente.

## Preguntas de repaso

1. ¿Por qué se dice que no hay una frontera clara entre diseño y arquitectura?
   R: Porque las decisiones de alto nivel solo se sostienen si los detalles las respetan, igual que en los planos de una casa conviven la distribución de habitaciones y la ubicación de cada enchufe. Es un continuo de decisiones desde la estructura general hasta cada clase y función.
2. ¿Cómo mides si un diseño es bueno según Clean Architecture?
   R: Por el esfuerzo humano necesario para satisfacer las necesidades del cliente y su evolución: si el esfuerzo es bajo y se mantiene bajo release tras release, el diseño es bueno; si crece con cada release, es malo.
3. ¿Por qué la estructura es más valiosa que el comportamiento a largo plazo?
   R: Porque un sistema que funciona pero no se puede cambiar deja de ser útil en cuanto cambian los requisitos, mientras que uno fácil de cambiar se puede hacer funcionar y mantener funcionando. El software existe para ser "blando", es decir, cambiable.
4. ¿Qué significa que el costo de un cambio sea proporcional al alcance y no a la forma?
   R: Que un pedido pequeño debe costar poco aunque no encaje con la organización actual del sistema. Cuando la arquitectura favorece una forma concreta, los cambios con otra silueta se encarecen; por eso conviene una arquitectura agnóstica a la forma.
5. ¿Por qué es responsabilidad del desarrollador defender la arquitectura?
   R: Porque es importante pero rara vez urgente, y los gerentes no están preparados para evaluar su importancia. Si el equipo técnico no la defiende, lo urgente (funcionalidades) siempre ganará y el costo del cambio crecerá sin control.
6. ¿Qué significa "mantener las opciones abiertas"?
   R: Separar la política del negocio de los detalles técnicos para poder retrasar decisiones como qué base de datos o framework usar, tomándolas cuando hay más información y pudiendo cambiarlas sin reescribir las reglas.

## Ejercicio

Toma un endpoint real de algún proyecto tuyo (o el `order-controller.ts` de esta lección) y sepáralo en tres archivos: `domain/` (regla pura, sin imports de librerías), `application/` (orquesta la regla y usa una interfaz para persistir) y `infrastructure/` (Express y la implementación de la interfaz). Escribe un test con Vitest para la regla de dominio sin levantar servidor ni base de datos. **Terminado cuando:** el archivo de dominio no importa nada externo, el test pasa en menos de 50 ms y puedes cambiar la implementación de persistencia por una en memoria sin tocar `domain/` ni `application/`.

## Explícalo con tus palabras

Explícale a alguien de negocio, sin tecnicismos, por qué "hacerlo rápido y limpiarlo después" termina costando más dinero, usando la analogía de un edificio con muros de carga en lugar de tablaroca.
