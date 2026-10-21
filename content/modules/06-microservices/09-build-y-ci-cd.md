---
title: Build, CI/CD y organización del código por servicio
kind: lesson
hours: 2
sources: Building Microservices 2nd ed., cap. 7 "Build" (pp. 250–275) | Hands-On Microservices with Kubernetes, cap. 4 "Setting Up the CI/CD Pipeline" (pp. 98–127)
links: Trunk Based Development | https://trunkbaseddevelopment.com/ ; Argo CD — documentación | https://argo-cd.readthedocs.io/en/stable/ ; Docker — multi-stage builds | https://docs.docker.com/build/building/multi-stage/
---

## Objetivo

Diseñar el camino de un cambio desde el commit hasta un artefacto desplegable para un microservicio: integración continua de verdad, pipelines de entrega continua, artefactos construidos una sola vez, la elección entre multirepo y monorepo, y la idea de GitOps.

## Estudio

### 1. Integración continua: la práctica, no la herramienta

La **integración continua (CI)** busca que todo el equipo trabaje sobre una versión común y actualizada del código. Cada vez que alguien integra un cambio, un servidor de CI descarga el código, compila, ejecuta análisis estático y tests, y produce un artefacto.

Beneficios:

- **Feedback rápido** sobre la calidad del cambio.
- **Artefactos automatizados y reproducibles**: todo lo necesario para construirlos está en control de versiones.
- **Trazabilidad**: de un artefacto desplegado puedes volver al commit exacto y a los tests que pasaron.

Pero tener Jenkins, GitHub Actions o CircleCI no significa hacer CI. Tres preguntas clásicas para saber si de verdad practicas CI:

1. **¿Integras en la rama principal al menos una vez al día?** Si tu rama de feature vive dos semanas, no estás integrando de forma continua; estás posponiendo los conflictos.
2. **¿Tienes un conjunto de tests que valida tus cambios?** Sin tests, CI solo comprueba que compila.
3. **Cuando el build se rompe, ¿arreglarlo es la prioridad número uno del equipo?** Un build roto que se deja así durante días hace que nadie confíe en él y que los errores se acumulen.

### 2. Modelos de ramas

Las ramas de larga duración son lo contrario de la integración continua: cuanto más tiempo vive una rama aislada, más divergen el código y las suposiciones, y más doloroso es el merge.

```
 Ramas largas (feature branches de semanas)
 main ──●────────────────────────────────●── merge gigante, conflictos
         \──●──●──●──●──●──●──●──●──●──/

 Trunk-based development
 main ──●──●──●──●──●──●──●──●──●──●──●──   cambios pequeños, varias veces al día
         \●/   \●/      \●/                 ramas de horas, no de semanas
```

Con **trunk-based development**, todos integran en la rama principal (el "trunk") con frecuencia, en cambios pequeños. Lo que no está terminado se esconde detrás de **feature toggles** en lugar de vivir en una rama aparte. Las pull requests se mantienen, pero son pequeñas y se revisan en horas.

Las ramas largas tienen sentido en otro contexto: proyectos open source con muchos contribuidores externos poco frecuentes, donde los mantenedores necesitan revisar todo antes de aceptarlo. En un equipo de producto que se conoce y trabaja a diario, la evidencia apunta a que integrar seguido se asocia con mejor rendimiento de entrega.

### 3. Pipelines y entrega continua

Un **pipeline** encadena etapas que dan cada vez más confianza en un cambio:

```
 commit ─► [compilar + tests rápidos] ─► [construir imagen] ─► [tests lentos / de servicio]
              (minutos)                     (artefacto v1.4.2)       │
                                                                     ▼
          producción ◄─ [aprobación o automático] ◄─ [staging / pruebas de aceptación]
```

- Las etapas tempranas son **rápidas** y fallan pronto (compilación, lint, unit tests).
- Las etapas tardías son más **lentas** y más parecidas a producción.
- Cada etapa que pasa aumenta la confianza en el artefacto.

**Continuous delivery (CD)**: cada cambio que pasa el pipeline **está listo** para ir a producción; el paso final puede ser manual (un clic). **Continuous deployment**: ese paso final también es automático; todo lo que pasa el pipeline va a producción sin intervención humana.

Un pipeline es también un **modelo explícito** de cómo llega el software a producción. Si hay pasos manuales (QA revisa, alguien aprueba por un ticket), deben aparecer en el pipeline, aunque sea como etapas de aprobación, para que la ruta sea visible.

### 4. Entornos: el trade-off entre feedback rápido y realismo

Cada entorno (local, CI, staging, producción) es un compromiso:

| Entorno | Ventaja | Limitación |
| --- | --- | --- |
| Local | Feedback inmediato, barato | Poco parecido a producción |
| CI con dependencias simuladas | Rápido, reproducible | Simulaciones que pueden mentir |
| Staging con servicios reales | Más realista | Caro, compartido, a veces inestable |
| Producción | La verdad | Riesgo para usuarios reales |

Cuantos más entornos tengas, más lento el camino a producción y más caro mantenerlos. Más adelante (sesiones 12 y 13) verás que parte de la confianza se puede obtener **en producción** con canaries y pruebas seguras, reduciendo la dependencia de entornos previos pesados.

### 5. Construir el artefacto una sola vez

Una regla esencial: **construye el artefacto una sola vez y despliega ese mismo artefacto en todos los entornos**. Si reconstruyes para staging y otra vez para producción, lo que desplegaste en producción no es exactamente lo que probaste: una dependencia pudo cambiar de versión entre builds.

Consecuencia: el artefacto debe ser **independiente del entorno**. La configuración específica de cada entorno (URLs, credenciales, flags) se inyecta al desplegar, no al construir (sesión 11).

En el mundo de containers, el artefacto es una **imagen** etiquetada de forma inmutable. Un `Dockerfile` multi-stage para un servicio TypeScript:

```dockerfile
# Etapa 1: compilar
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# Etapa 2: imagen final mínima
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

La primera etapa tiene compiladores y dependencias de desarrollo; la final solo lo necesario para ejecutar. Resultado: imágenes más pequeñas, más rápidas de distribuir y con menos superficie de ataque. Etiqueta la imagen con algo inmutable, como el hash del commit (`orders:3f9c2ab`), en lugar de reutilizar `latest`.

### 6. Mapear código fuente y builds a servicios

¿Dónde vive el código de cada servicio y cómo se dispara su build? Tres patrones.

#### 6.1 Un repositorio gigante, un build gigante

Todo el código en un repositorio y **un solo** build que produce todos los artefactos. Un cambio de una línea en `users` recompila y vuelve a testear todo, y genera artefactos nuevos de todos los servicios, empujando a desplegarlos juntos. Si el build se rompe, nadie puede integrar. Es el peor punto de partida para servicios independientes; solo se ve al inicio de proyectos.

#### 6.2 Multirepo: un repositorio por microservicio

Cada servicio tiene su repositorio y su pipeline. Un cambio en `users` dispara solo el build de `users`.

**Ventajas:**

- Mapeo simple y claro: repositorio = servicio = pipeline.
- Propiedad clara: cada equipo controla permisos de sus repos.
- Fomenta la independencia: es difícil acoplarse "sin querer".

**Desventajas:**

- Cambios que cruzan servicios exigen varios commits y varias PRs, **sin atomicidad**.
- Reutilizar código requiere publicar librerías versionadas y actualizar dependencias en cada consumidor.
- Los desarrolladores trabajan con muchos repos a la vez; herramientas de búsqueda global se vuelven necesarias.

Un matiz: si te ves con frecuencia haciendo cambios coordinados en varios repos, el problema probablemente no es el multirepo, sino que **tus fronteras de servicio están mal**. El multirepo hace visible ese dolor.

#### 6.3 Monorepo: un repositorio, muchos builds

Todo el código en un repositorio, pero **cada servicio tiene su propio build**, disparado solo cuando cambian sus carpetas (o sus dependencias internas).

```
 repo/
 ├── services/
 │   ├── orders/      ── cambio aquí → build de orders
 │   ├── payments/    ── cambio aquí → build de payments
 │   └── catalog/
 ├── libs/
 │   └── http-client/ ── cambio aquí → build de los servicios que la usan
 └── CODEOWNERS       ── quién revisa cada carpeta
```

**Ventajas:**

- **Commits atómicos** que cruzan servicios (útil para refactors y librerías compartidas).
- Reutilizar código es trivial: importas desde `libs/`.
- Visibilidad total del código; un único lugar para herramientas y convenciones.

**Desventajas:**

- Requiere herramientas para construir solo lo afectado (Nx, Turborepo, Bazel, o filtros por ruta en el CI). Sin ellas, cada cambio construye todo.
- La propiedad es menos explícita; se necesita `CODEOWNERS` o equivalente.
- **Riesgo de acoplamiento fácil**: como todo está a mano, es tentador importar código interno de otro servicio. Y un commit atómico que toca dos servicios puede inducir a desplegarlos juntos.
- A gran escala, el propio repositorio exige inversión en herramientas (empresas que lo hacen a gran escala tienen equipos dedicados).

Un ejemplo de filtro por rutas en GitHub Actions:

```yaml
on:
  push:
    paths:
      - "services/orders/**"
      - "libs/http-client/**"
jobs:
  build-orders:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test --workspace services/orders
      - run: docker build -t orders:${{ github.sha }} services/orders
```

#### 6.4 ¿Cuál elegir?

| Criterio | Multirepo | Monorepo |
| --- | --- | --- |
| Cambios atómicos entre servicios | No | Sí |
| Reutilizar código | Librerías versionadas | Import directo |
| Propiedad | Por repositorio, explícita | Por carpeta, con CODEOWNERS |
| Herramientas necesarias | Pocas | Builds selectivos, caché de builds |
| Riesgo de acoplamiento | Bajo | Mayor si no hay disciplina |

No hay una respuesta universal. Para equipos pequeños con pocos servicios, un monorepo con builds por servicio es cómodo. Para organizaciones con equipos muy autónomos y propiedad fuerte, el multirepo encaja bien. También existen híbridos (un monorepo por equipo). Lo que importa es que **cada servicio tenga su propio pipeline y se despliegue de forma independiente**, sea cual sea el repositorio.

Sayfan menciona las mismas tres opciones (monorepo, multirepo, híbrido) y añade un punto práctico: con multirepo, las librerías compartidas y los clientes de cada servicio deben versionarse y publicarse, y conviene automatizarlo desde el principio.

### 7. GitOps y entrega continua en Kubernetes

En Kubernetes, un patrón muy extendido separa CI de CD:

```
 Desarrollador ─push─► repo de código ─► CI: tests + build + push imagen orders:3f9c2ab
                                                         │
                                       actualiza el tag  ▼
                                   repo de configuración (manifiestos YAML)
                                                         │
                                       Argo CD observa   ▼
                                   cluster ◄── sincroniza el estado deseado
```

**GitOps** significa que el **estado deseado** del sistema (qué imágenes, cuántas réplicas, qué configuración) vive en un repositorio Git. Un agente dentro del cluster (Argo CD, Flux) compara constantemente lo que hay en Git con lo que corre en el cluster y corrige las diferencias.

Ventajas:

- Cada cambio en producción es un commit: historial, revisión por PR, auditoría.
- Rollback = revertir un commit.
- El cluster no necesita que el CI tenga credenciales de producción; el agente "tira" de Git desde dentro.
- Si alguien cambia algo a mano en el cluster, el agente lo detecta (drift) y puede revertirlo.

Argo CD, que usa Sayfan, añade una interfaz para ver el estado de cada aplicación, políticas de sincronización (automática o manual, con o sin borrar recursos que ya no están en Git) y soporte para manifiestos planos, Helm o Kustomize. En tu proyecto de la sesión 17 aplicarás los manifiestos a mano con `kubectl`; GitOps es el paso siguiente cuando el número de servicios crece.

### 7.1 Ejemplo trabajado: el pipeline completo de `orders`

Juntemos todo en el diseño de un pipeline realista para un servicio `orders` en un monorepo, con GitOps:

| Etapa | Qué hace | Tiempo objetivo | Si falla |
| --- | --- | --- | --- |
| 1. Verificación rápida | `npm ci`, `tsc --noEmit`, lint, unit tests | < 3 min | Se bloquea el merge de la PR |
| 2. Compatibilidad de contratos | Compara el OpenAPI y los schemas de eventos contra `main` | < 1 min | Se bloquea si hay ruptura estructural no anunciada |
| 3. Build del artefacto | `docker build` multi-stage, tag `orders:<sha>`, push al registry | < 4 min | Se reintenta una vez; si sigue fallando, alerta al equipo |
| 4. Escaneo de seguridad | Escaneo de vulnerabilidades de la imagen y dependencias | < 2 min | Bloquea si hay vulnerabilidades críticas con parche disponible |
| 5. Tests de servicio | Levanta `orders` con sus dependencias simuladas y prueba la API real | < 6 min | Bloquea la promoción |
| 6. Promoción a staging | Un commit automático cambia el tag en el repo de configuración de staging | inmediato | — |
| 7. Verificación en staging | Smoke tests y contract tests contra consumidores | < 5 min | Revertir el commit de configuración |
| 8. Promoción a producción | PR al repo de configuración de producción; aprobación con un clic o automática | — | Revertir el commit (rollback GitOps) |

Varios detalles importan:

- **Las etapas 1 y 2 se ejecutan en cada PR**; las demás, después del merge en `main`. Así el feedback para el desarrollador llega en minutos.
- **El artefacto se construye solo en la etapa 3.** Staging y producción usan exactamente `orders:<sha>`.
- **La promoción es un cambio de configuración, no un rebuild.** Cambiar de entorno es editar una línea:

```yaml
# config-repo/production/orders/kustomization.yaml
images:
  - name: registry.local/orders
    newTag: 3f9c2ab   # el pipeline actualiza esta línea mediante una PR
```

- **Cada etapa tiene un dueño y una respuesta clara al fallo.** Un pipeline que falla "a veces" y se relanza hasta que pasa enseña al equipo a ignorarlo.

### 7.2 Registro de artefactos y trazabilidad

Las imágenes se guardan en un **registry** (Docker Hub, GitHub Container Registry, o uno local como el que usarás con kind). Buenas prácticas:

- Tags **inmutables** por commit; si quieres un tag legible (`v1.4.2`), que apunte al mismo digest y no se reutilice.
- Etiquetas (labels) en la imagen con el commit, la fecha de build y la URL del repositorio, para poder responder "¿qué código corre en producción?" en segundos.
- Política de retención: borrar imágenes viejas no desplegadas para no acumular gigabytes, pero conservar las que estuvieron en producción para poder hacer rollback.

```dockerfile
LABEL org.opencontainers.image.revision=$GIT_SHA \
      org.opencontainers.image.source="https://example.com/shop/monorepo"
```

### 7.3 El pipeline también es superficie de ataque

El pipeline tiene permisos para construir y, a veces, para desplegar. Si alguien compromete una dependencia o un script del pipeline, puede llegar a producción. Mínimos razonables: secretos del CI con el menor privilegio posible, dependencias fijadas (lockfile), imágenes base con versión fijada, y separación entre quien construye (CI) y quien despliega (agente GitOps dentro del cluster). Lo retomarás en la sesión 15.

### 8. Historia de fallo

Un equipo con monorepo configuró un solo pipeline para todos los servicios "temporalmente". Seis meses después, cada commit tardaba 45 minutos en pasar CI porque se construían y testeaban 18 servicios. Los desarrolladores empezaron a agrupar cambios para no esperar tanto; las PRs crecieron, la revisión empeoró y los fallos se volvieron más difíciles de aislar. Para colmo, el pipeline desplegaba los 18 servicios juntos: tenían un monolito distribuido con apariencia de microservicios. La solución fue separar un pipeline por servicio con filtros de rutas y un grafo de dependencias de `libs/`, lo que bajó el tiempo medio de CI a 6 minutos.

### 9. Errores comunes

- Confundir "tenemos una herramienta de CI" con "practicamos CI".
- Ramas de feature que viven semanas.
- Dejar el build roto mientras se sigue integrando.
- Reconstruir el artefacto para cada entorno.
- Etiquetar imágenes como `latest` y no saber qué versión corre en producción.
- Un solo build que construye y despliega todos los servicios juntos.
- Monorepo sin builds selectivos ni `CODEOWNERS`.
- Tests "flaky" que se relanzan hasta que pasan: enseñan al equipo a ignorar el pipeline. Aísla el test inestable, arréglalo o bórralo, pero no lo normalices.
- Pasos manuales de aprobación escondidos fuera del pipeline (un correo, un ticket): si existen, modélalos como una etapa visible para medir cuánto tiempo añaden.

## Conceptos clave

- **Integración continua**: integrar cambios pequeños en la rama principal con frecuencia, validados automáticamente.
- **Trunk-based development**: todos integran en la rama principal con ramas de vida muy corta.
- **Pipeline**: secuencia de etapas automatizadas que aumentan la confianza en un artefacto.
- **Continuous delivery**: todo cambio que pasa el pipeline está listo para producción.
- **Continuous deployment**: todo cambio que pasa el pipeline se despliega automáticamente.
- **Build once, deploy many**: el mismo artefacto inmutable se despliega en todos los entornos.
- **Multirepo / monorepo**: un repositorio por servicio / un repositorio con builds por servicio.
- **GitOps**: el estado deseado vive en Git y un agente lo aplica y vigila en el cluster.

## Preguntas de repaso

1. ¿Cuáles son las tres preguntas para saber si realmente practicas integración continua?
   R: Si integras en la rama principal al menos una vez al día, si tienes tests que validan los cambios y si arreglar un build roto es la prioridad número uno del equipo.
2. ¿Por qué hay que construir el artefacto una sola vez y qué implica para la configuración?
   R: Para que lo que llega a producción sea exactamente lo que se probó; reconstruir puede introducir diferencias (versiones de dependencias, entorno de build). Implica que el artefacto no puede contener configuración de entorno: esta se inyecta al desplegar.
3. Compara multirepo y monorepo en atomicidad de cambios y riesgo de acoplamiento.
   R: El monorepo permite commits atómicos que cruzan servicios, pero facilita importar código interno de otros y desplegar juntos. El multirepo no permite cambios atómicos entre servicios, lo que hace más visible el costo de las fronteras mal trazadas, y reduce el acoplamiento accidental.
4. ¿Qué es GitOps y qué ventajas tiene sobre que el CI despliegue directamente en el cluster?
   R: Es mantener el estado deseado del sistema en Git y que un agente en el cluster lo sincronice y vigile. Da historial y revisión de cada cambio, rollback revirtiendo un commit, detección de cambios manuales, y evita darle al CI credenciales de producción.
5. ¿Para qué sirve un Dockerfile multi-stage?
   R: Para compilar en una etapa con todas las herramientas de desarrollo y copiar a la imagen final solo lo necesario para ejecutar, logrando imágenes más pequeñas, más rápidas de distribuir y con menos superficie de ataque.
6. ¿Por qué las ramas largas son lo opuesto a la integración continua?
   R: Porque el código de la rama diverge durante días o semanas del principal y los conflictos y las suposiciones incompatibles se descubren tarde, en un merge grande y arriesgado, en vez de resolverse en cambios pequeños diarios.

## Ejercicio

Prepara el empaquetado de un servicio TypeScript mínimo (`GET /health` y `GET /hello`) que reutilizarás en la sesión 17. Escribe un `Dockerfile` multi-stage que ejecute como usuario no root, un `.dockerignore`, y un script `build.sh` que etiquete la imagen con el hash corto del commit (`git rev-parse --short HEAD`). Escribe también un workflow de GitHub Actions (no hace falta ejecutarlo en la nube) que corra `npm ci`, `npm test` y `docker build` solo cuando cambie la carpeta del servicio. Criterio de terminado: `docker build` funciona localmente, `docker images` muestra la imagen con el tag del commit y un tamaño menor a 200 MB, y `docker run -p 3000:3000` responde en `/health`.

## Explícalo con tus palabras

Explica por qué "construir una vez y desplegar el mismo artefacto en todas partes" evita el clásico "en staging funcionaba".
