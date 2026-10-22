---
title: Microservicios
phase: books
summary: Decidir cuándo conviene (y cuándo no) partir un sistema en microservicios, diseñar sus fronteras, contratos y datos, y operar servicios pequeños en un cluster local de Kubernetes.
---

## Para qué sirve este módulo

En el módulo 03 aprendiste a encontrar *bounded contexts* con DDD y en el módulo 05 repasaste los bloques de un diseño de sistemas (load balancers, caches, colas, particionado). Este módulo junta las dos cosas y responde una pregunta práctica: **¿cómo se construye, despliega y opera un sistema hecho de muchos servicios pequeños que se pueden desplegar por separado?**

El hilo conductor es una sola idea: el *independent deployability*. Casi todo lo que vas a estudiar (fronteras, contratos, datos propios, sagas, pipelines, despliegue progresivo, contract tests, observabilidad, resiliencia operativa) existe para que puedas cambiar y desplegar un servicio sin coordinar con todos los demás.

## Estructura

1. **Fundamentos (sesiones 01–03)**: qué es un microservicio, cuándo no usarlos, cómo trazar fronteras sin acoplamiento, cómo dividir un monolito de forma incremental.
2. **Comunicación y workflow (04–07)**: estilos sync/async, REST, gRPC, eventos, evolución de contratos, gateways y service mesh, sagas.
3. **Proyecto de diseño (08)**: descomponer un monolito descrito en un documento de diseño (fronteras, contratos, datos, plan strangler fig).
4. **Entrega y plataforma (09–12)**: CI/CD, despliegue, Kubernetes para desarrolladores, configuración, secretos, probes y NetworkPolicy, despliegue progresivo y resiliencia operativa (degradación, chaos engineering y autoescalado con HPA).
5. **Calidad operativa (13–14)**: testing y observabilidad.
6. **Proyecto práctico (17)**: dos servicios TypeScript en un cluster local (kind o minikube) con probes, ConfigMap/Secret y rolling update.
7. **Personas (18)**: Conway, ownership, interfaces de usuario (micro frontends, BFF).
8. **Evaluación (19)**.

## Fuentes

- *Building Microservices*, 2.ª ed. (Sam Newman): fuente principal de conceptos y trade-offs.
- *Hands-On Microservices with Kubernetes* (Gigi Sayfan): Kubernetes visto por un desarrollador, configuración, seguridad, despliegue y monitoreo. Su ejemplo está en Go; aquí los ejercicios usan TypeScript.

## Qué no se repite aquí

- **Seguridad de aplicación** (autenticación y autorización, JWT, OAuth/OIDC, mTLS, zero trust): módulo 05, sesión 13, y la ruta Cloud al final del plan. Aquí solo queda lo propio de Kubernetes: NetworkPolicy y el endurecimiento mínimo del Pod (sesión 11).
- **Patrones de estabilidad** (timeouts, backoff con jitter, bulkheads, circuit breakers, idempotencia): módulo 05, sesión 12. La sesión 12 de este módulo añade solo la degradación por funcionalidad, el chaos engineering y el HPA.

## Límites

Kubernetes se estudia a nivel de conceptos y de cluster **local** (kind o minikube). No hay gasto en la nube: la ruta Cloud posterior aclara que EKS no entra. Si algo requiere un proveedor, lo verás como concepto y no como práctica.
