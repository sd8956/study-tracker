---
title: Consistent hashing
kind: lesson
hours: 2
sources: System Design Interview (Alex Xu), cap. 5 "Design consistent hashing" (pp. 71–86) | karanpratapsingh/system-design, cap. II "Consistent Hashing" y "Sharding" | System Design Primer, "Sharding"
links: Karan — Consistent Hashing | https://github.com/karanpratapsingh/system-design#consistent-hashing ; Karan — Sharding | https://github.com/karanpratapsingh/system-design#sharding ; Primer — Sharding | https://github.com/donnemartin/system-design-primer#sharding
---

## Objetivo

Entender por qué `hash(key) mod N` falla cuando cambia el número de nodos, cómo el anillo de hash con nodos virtuales reduce la redistribución a aproximadamente `K/N` claves, e implementarlo y aplicarlo a caches, bases particionadas y balanceadores.

## Estudio

### El problema: redistribuir casi todo

Tienes N servidores de cache y quieres repartir claves entre ellos. La idea más simple es:

```
 servidor = hash(clave) mod N
```

Con un hash uniforme, el reparto es parejo. Funciona perfectamente **mientras N no cambie**. Pero en producción N cambia todo el tiempo: agregas un servidor porque creció el tráfico, o uno se cae.

Mira qué pasa con 8 claves al pasar de 4 a 3 servidores (los hashes son ilustrativos):

| Clave | hash | mod 4 | mod 3 |
| --- | --- | --- | --- |
| k0 | 18358617 | 1 | 0 |
| k1 | 26143584 | 0 | 0 |
| k2 | 18131146 | 2 | 1 |
| k3 | 35863496 | 0 | 2 |
| k4 | 34085809 | 1 | 1 |
| k5 | 27581703 | 3 | 0 |
| k6 | 38164978 | 2 | 1 |
| k7 | 22530351 | 3 | 0 |

Solo `k1` y `k4` siguen en el mismo servidor; las otras seis se movieron, aunque solo desapareció un servidor. En general, al pasar de N a N+1 servidores con módulo, se reasigna una fracción `N/(N+1)` de las claves: con 10 servidores, ¡el 91 %!

En una cache, eso significa que casi todas las lecturas se vuelven misses de golpe, y toda la carga cae sobre la base de datos (el fallo en cascada de la sesión 01). En una base particionada, significa mover casi todos los datos por la red. Necesitas un esquema donde agregar o quitar un nodo mueva **solo las claves que le corresponden**.

### La idea: un anillo

**Consistent hashing** pone servidores y claves en el mismo espacio de hash, y ese espacio se trata como un círculo.

1. Toma una función de hash con salida en un rango grande, por ejemplo de 0 a 2³²−1 (o los 2¹⁶⁰ valores de SHA-1). Une los extremos: el valor máximo queda junto al 0. Eso es el **anillo**.
2. Ubica cada servidor en el anillo hasheando su nombre o su IP.
3. Ubica cada clave en el anillo con la misma función.
4. Para encontrar el servidor de una clave, avanza en sentido horario desde la posición de la clave hasta el primer servidor.

```
                 0 / 2^32
                    s0
            k3 •          • k0
        s3                      s1
            k2 •          
                    s2   • k1

 k0 → s1 (primer servidor en sentido horario)
 k1 → s2
 k2 → s3
 k3 → s0
```

### Agregar y quitar servidores

**Agregar** un servidor `s4` entre `s3` y `s0`: solo las claves ubicadas entre `s3` y `s4` (que antes iban a `s0`) pasan a `s4`. Todas las demás siguen donde estaban.

**Quitar** `s1`: solo las claves que estaban en `s1` (entre `s0` y `s1`) pasan al siguiente servidor en sentido horario, `s2`. Nadie más se mueve.

En promedio, con K claves y N nodos, un cambio mueve solo **K/N** claves: las que corresponden al nodo afectado. Con 10 servidores pasas de mover el 91 % a mover alrededor del 10 %.

### Dos problemas del anillo básico

El esquema básico tiene dos defectos:

1. **Particiones de tamaño desigual**. La posición de cada servidor es pseudoaleatoria, así que el tramo de anillo de cada uno (su "partición") puede ser muy grande o muy chico. Y cuando un servidor se va, su tramo entero se suma al del vecino, que pasa a tener el doble de carga.
2. **Distribución desigual de claves**. Aun con tramos parecidos, las claves pueden concentrarse en una zona del anillo.

```
 Anillo con 4 servidores mal repartidos
   s0 ──── s1 ─ s2 ─────────────────────── s3 ──
   └ 30 % ┘└5%┘└────────── 55 % ──────────┘└10%┘
```

### La solución: nodos virtuales

Cada servidor físico se representa con **muchos puntos** en el anillo, llamados **nodos virtuales** (vnodes). En lugar de hashear `s0` una vez, hasheas `s0#0`, `s0#1`, …, `s0#199`. Cada servidor queda dueño de muchos tramos pequeños repartidos por todo el anillo.

```
 s0#0  s1#0  s0#1  s2#0  s1#1  s2#1  s0#2  s1#2  s2#2 ...
 ──●─────●─────●─────●─────●─────●─────●─────●─────●──
```

Beneficios:

- **Reparto más parejo**: con más puntos, la varianza de la porción de cada servidor baja. Con 100–200 vnodes por servidor, la desviación estándar de la carga queda en torno al 5–10 % de la media; con más vnodes baja aún más, a costa de memoria para guardar el anillo (que sigue siendo pequeña: unos miles de entradas).
- **Redistribución repartida**: cuando un servidor cae, sus muchos tramos pequeños se reparten entre **muchos** vecinos distintos, en vez de sobrecargar a uno solo.
- **Heterogeneidad**: un servidor con el doble de capacidad recibe el doble de vnodes y, por lo tanto, el doble de claves.

### Encontrar las claves afectadas

Cuando agregas `s4`, las claves que deben moverse son las ubicadas entre `s4` y el primer nodo **anterior** en sentido antihorario. Cuando quitas `s1`, las claves afectadas son las comprendidas entre el nodo anterior a `s1` y `s1`, que pasan al siguiente en sentido horario. Con vnodes, repites ese cálculo para cada vnode del servidor afectado.

### Una traza con números pequeños

Para fijar la mecánica, usa un anillo de juguete con posiciones de 0 a 99. Tres servidores caen en `A=10`, `B=45` y `C=80`. Seis claves caen en 5, 20, 44, 60, 85 y 99.

| Clave (posición) | Primer servidor en sentido horario |
| --- | --- |
| 5 | A (10) |
| 20 | B (45) |
| 44 | B (45) |
| 60 | C (80) |
| 85 | A (10), porque después de 99 se vuelve a 0 |
| 99 | A (10) |

Reparto: A tiene 3 claves, B tiene 2 y C tiene 1. Ya ves el desbalance: el tramo de A (de 81 a 10, pasando por 0) mide 30 posiciones; el de B (11 a 45), 35; el de C (46 a 80), 35; pero las claves no cayeron de forma pareja.

Ahora agrega `D=95`. Solo cambian las claves entre C (80) y D (95): la clave 85 pasa de A a D. Las otras cinco no se mueven. Ahora quita B: las claves 20 y 44 pasan al siguiente servidor horario, C. Una vez más, nadie más se mueve. Con módulo, cualquiera de esos dos cambios habría movido la mayoría de las claves.

Con vnodes, A, B, C y D aparecerían cada uno en, digamos, 4 posiciones distintas del anillo de 0 a 99, y las 6 claves (o 6 millones) se repartirían de forma mucho más pareja. Haz la prueba en papel: cuantos más puntos por servidor, más se parecen las porciones entre sí.

### Implementación

La estructura de datos clave es un **arreglo ordenado** de posiciones (o un árbol ordenado) y una búsqueda binaria:

```ts
import { createHash } from "node:crypto";

function hash32(s: string): number {
  return createHash("md5").update(s).digest().readUInt32BE(0);
}

class ConsistentHashRing {
  private ring: { pos: number; node: string }[] = [];

  constructor(private vnodes = 150) {}

  add(node: string): void {
    for (let i = 0; i < this.vnodes; i++) {
      this.ring.push({ pos: hash32(`${node}#${i}`), node });
    }
    this.ring.sort((a, b) => a.pos - b.pos);
  }

  remove(node: string): void {
    this.ring = this.ring.filter((v) => v.node !== node);
  }

  get(key: string): string {
    if (this.ring.length === 0) throw new Error("empty ring");
    const h = hash32(key);
    let lo = 0, hi = this.ring.length;          // primer pos >= h
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.ring[mid].pos < h) lo = mid + 1; else hi = mid;
    }
    return this.ring[lo % this.ring.length].node; // si pasamos el final, volvemos al inicio
  }
}
```

Costos: `get` es O(log V), donde V es el total de vnodes (por ejemplo, 10 servidores × 150 = 1.500 entradas: unas 11 comparaciones). `add` y `remove` son O(V log V) por el reordenamiento, aceptable porque son poco frecuentes.

### Replicación sobre el anillo

Para replicar una clave en R nodos, se recorre el anillo en sentido horario desde la clave y se toman los **primeros R servidores físicos distintos** (saltando vnodes de servidores ya elegidos). Si además quieres tolerar la caída de un datacenter, eliges réplicas en zonas distintas. Esta es exactamente la técnica de Dynamo y Cassandra, que verás al diseñar el key-value store en la sesión 17.

```
 clave k → s2#7 (s2) → s0#3 (s0) → s2#1 (s2, se salta) → s3#9 (s3)
 Réplicas (R=3): s2, s0, s3
```

### Dónde se usa

- **Caches distribuidas**: el cliente de Memcached elige el servidor con un anillo; al agregar un nodo, solo una fracción de claves se vuelve miss.
- **Bases de datos particionadas**: Cassandra y DynamoDB reparten particiones con un anillo y vnodes. (Recuerda de DDIA que otras bases prefieren un número fijo de particiones asignadas a nodos; Redis Cluster usa 16.384 hash slots, una variante de esta idea.)
- **Balanceadores con afinidad**: enviar a cada usuario al mismo servidor para aprovechar su cache local sin perder la afinidad de todos al cambiar el tamaño de la flota (Maglev de Google y la estrategia `ring_hash` de Envoy).
- **CDNs**: elegir qué servidor del PoP guarda qué objeto.
- **Sistemas de almacenamiento de objetos y chat**: decidir qué servidor de chat maneja qué conversación o qué usuario.

### Variantes que conviene conocer

| Variante | Idea | Ventaja |
| --- | --- | --- |
| Anillo con vnodes | Varios puntos por servidor | Simple, flexible, estándar |
| Rendezvous (HRW) hashing | Para cada clave, calcula `hash(clave, servidor)` para todos y elige el mayor | Sin anillo; redistribución mínima; O(N) por consulta |
| Jump consistent hash | Fórmula que mapea una clave a un bucket 0..N−1 sin memoria | Muy rápido y parejo; solo permite agregar/quitar al final |
| Hash slots fijos | Número fijo de slots (por ejemplo 16.384) asignados a nodos | Mover un slot es explícito y controlable |
| Consistent hashing con carga acotada | Si un nodo supera (1+ε)× la carga media, la clave pasa al siguiente | Evita sobrecarga por claves populares |

### Elegir la función de hash

La función de hash del anillo no necesita ser criptográfica; necesita ser **rápida, uniforme y estable**:

- **Uniforme**: que distribuya posiciones de forma pareja en todo el rango. MD5, SHA-1, MurmurHash o xxHash cumplen.
- **Estable entre versiones y lenguajes**: todos los clientes (quizás escritos en Go, Java y TypeScript) deben calcular el mismo hash para la misma clave. No uses el `hashCode` del lenguaje, que puede variar entre plataformas o incluso entre ejecuciones.
- **Rápida**: se calcula en cada petición. Hashes no criptográficos como MurmurHash3 o xxHash son varias veces más rápidos que SHA-1 y suficientes, porque aquí no hay un adversario que quiera provocar colisiones (si lo hubiera, por ejemplo con claves elegidas por usuarios maliciosos, conviene un hash con semilla secreta).

### Lo que consistent hashing **no** resuelve

- **Hot keys**: si una sola clave recibe el 30 % del tráfico, ningún reparto de claves la divide. Necesitas replicar esa clave, cachearla localmente o partirla (sesión 05).
- **Movimiento de datos**: reduce cuántos datos se mueven, pero no elimina el movimiento. Mover el 10 % de 50 TB son 5 TB por la red: hay que limitar el ancho de banda de rebalanceo para no afectar al tráfico normal.
- **Consultas por rango**: hashear destruye el orden; "todas las claves entre A y B" requiere consultar a todos los nodos.
- **Membresía consistente**: todos los clientes deben ver el **mismo anillo**. Si un cliente cree que `s4` existe y otro no, escriben la misma clave en lugares distintos. La membresía se gestiona con un servicio de coordinación (ZooKeeper, etcd) o con un protocolo gossip.

### Membresía: quién está en el anillo

El anillo es tan bueno como la información sobre qué nodos lo componen. Hay dos enfoques:

- **Coordinador central**: un servicio de coordinación (ZooKeeper, etcd) guarda la lista oficial de nodos y su estado. Los clientes se suscriben a cambios. Es simple de razonar y consistente, pero el coordinador debe ser altamente disponible (normalmente es un cluster con consenso).
- **Gossip**: cada nodo mantiene una lista de miembros con un contador de *heartbeat* y, cada segundo, comparte su lista con unos pocos nodos al azar. Si el contador de un miembro no aumenta durante cierto tiempo, se lo considera caído. La información se propaga como un rumor: en O(log N) rondas llega a todos. Es descentralizado y tolera fallos, pero la vista de cada nodo converge de forma eventual. Lo verás aplicado en el key-value store (sesión 17).

Un detalle importante: **detectar** que un nodo no responde no siempre significa sacarlo del anillo. Si cada fallo transitorio de 10 segundos provocara una redistribución, el sistema pasaría la vida moviendo datos. Por eso se distingue entre un fallo temporal (otros nodos atienden sus peticiones de forma provisoria, *hinted handoff*) y una baja permanente (el operador o una política lo saca del anillo y se rebalancea).

### Rebalanceo controlado en producción

Agregar un nodo a un cluster de datos no es solo actualizar el anillo. Una secuencia segura:

1. El nodo nuevo entra al anillo en estado "uniéndose": recibe copias de los datos de sus tramos, pero todavía no atiende lecturas.
2. Se transfieren los datos con un ancho de banda limitado para no degradar el tráfico normal.
3. Mientras dura la transferencia, las escrituras de esos tramos van tanto al dueño viejo como al nuevo.
4. Cuando termina, el nodo pasa a "activo", empieza a atender lecturas y el dueño anterior borra las copias que ya no le corresponden.

Para caches, la versión ligera es calentar el nodo nuevo (copiar las claves más populares de sus tramos) antes de anunciarlo a los clientes.

### Un cálculo de ejemplo

Una cache de 10 nodos guarda 200 M de claves, con 50.000 lecturas/s y un hit ratio de 95 % (la base recibe 2.500/s). Agregas un nodo:

- **Con módulo**: se reasigna ≈ 10/11 ≈ 91 % de las claves. Durante el calentamiento, el hit ratio cae cerca del 9 %: la base recibe ≈ 45.000 lecturas/s, 18 veces su carga normal. Probablemente cae.
- **Con consistent hashing**: se reasigna ≈ 1/11 ≈ 9 % de las claves. El hit ratio cae a ≈ 86 %: la base recibe ≈ 7.000 lecturas/s durante unos minutos, menos de 3 veces lo normal. Molesto, pero sobrevivible, y puedes suavizarlo calentando el nodo nuevo antes de darle tráfico.

Este cálculo es el argumento que debes usar en una entrevista o en un design doc para justificar consistent hashing.

Ahora el caso de una **caída**: con 10 nodos sin vnodes, si cae un nodo, todo su tramo (≈ 10 % de las claves, unos 5.000 lecturas/s) pasa a **un solo** vecino, que de golpe recibe el doble de tráfico y misses de todas esas claves. Con 150 vnodes por nodo, esos 5.000 lecturas/s se reparten entre los 9 nodos restantes: cada uno recibe ≈ 550/s extra, un aumento del 11 %. Esta diferencia, más que la uniformidad del reparto, es la razón principal para usar vnodes.

## Conceptos clave

- **Hash con módulo**: `hash(key) mod N`; reasigna casi todas las claves si N cambia.
- **Anillo de hash**: espacio de hash cerrado en círculo donde se ubican servidores y claves.
- **Búsqueda en sentido horario**: una clave pertenece al primer servidor que aparece después de ella en el anillo.
- **K/N**: fracción aproximada de claves que se mueve al agregar o quitar un nodo.
- **Nodo virtual (vnode)**: cada uno de los múltiples puntos que representan a un servidor físico en el anillo.
- **Replicación en el anillo**: guardar la clave en los primeros R servidores físicos distintos en sentido horario.
- **Rendezvous hashing**: cada clave elige el servidor con mayor `hash(clave, servidor)`.
- **Membresía**: conocimiento compartido de qué nodos forman el anillo.

## Preguntas de repaso

1. ¿Por qué `hash(key) mod N` es un problema en una cache cuando se agrega un servidor?
   R: Porque al cambiar N casi todas las claves cambian de servidor (una fracción N/(N+1)), así que la cache se vacía en la práctica, el hit ratio se desploma y toda la carga cae sobre la base de datos, que puede colapsar.
2. ¿Qué claves se mueven cuando agregas un servidor al anillo?
   R: Solo las ubicadas en el tramo entre el nuevo servidor y el servidor anterior en sentido antihorario; antes iban al siguiente servidor en sentido horario y ahora van al nuevo. En promedio, una fracción K/N de las claves.
3. ¿Qué dos problemas resuelven los nodos virtuales?
   R: Las particiones de tamaño desigual (con muchos puntos por servidor, la porción de cada uno se acerca a la media) y la sobrecarga de un único vecino cuando un servidor cae (sus muchos tramos se reparten entre muchos servidores). Además permiten dar más vnodes a servidores con más capacidad.
4. ¿Qué no resuelve consistent hashing y cómo tratarías cada caso?
   R: No resuelve las hot keys (replicar la clave, cache local o partirla con sufijos), no elimina el movimiento de datos (limitar el ancho de banda de rebalanceo y calentar el nodo nuevo), no permite consultas por rango eficientes (usar particionado por rango si se necesitan) y requiere membresía consistente (usar un servicio de coordinación o gossip).
5. ¿Cuál es la complejidad de buscar el servidor de una clave y qué estructura se usa?
   R: O(log V), con V el total de vnodes, usando un arreglo ordenado de posiciones (o un árbol balanceado) y búsqueda binaria del primer punto mayor o igual al hash de la clave, volviendo al inicio si se pasa del final.

## Ejercicio

Completa la clase `ConsistentHashRing` en TypeScript con `getN(key, n)` (n servidores físicos distintos para réplicas) y escribe un experimento: con 10 nodos y 1 M de claves, mide (a) la desviación estándar de claves por nodo con 1, 10, 100 y 500 vnodes, y (b) el porcentaje de claves movidas al agregar un nodo, comparado con `hash mod N`. Terminado cuando tengas una tabla con los resultados, pruebas para `get` y `getN`, y una frase que diga qué número de vnodes elegirías y por qué.

## Explícalo con tus palabras

Explica consistent hashing con la imagen de un reloj donde los empleados se reparten las horas y, si uno renuncia, solo su vecino toma sus horas.
