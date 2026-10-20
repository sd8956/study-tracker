---
title: Seguridad en microservicios y en Kubernetes
kind: lesson
hours: 2
sources: Building Microservices 2nd ed., cap. 11 "Security" (pp. 431–480) | Hands-On Microservices with Kubernetes, cap. 6 "Securing Microservices on Kubernetes" (pp. 160–196)
links: OWASP — Microservices Security Cheat Sheet | https://cheatsheetseries.owasp.org/cheatsheets/Microservices_Security_Cheat_Sheet.html ; Kubernetes — Security checklist | https://kubernetes.io/docs/concepts/security/security-checklist/ ; JWT — Introduction | https://jwt.io/introduction
---

## Objetivo

Aplicar los principios de seguridad (menor privilegio, defensa en profundidad, automatización) a un sistema de microservicios: gestionar credenciales, elegir entre confianza implícita y zero trust, proteger datos en tránsito y en reposo, autenticar y autorizar humanos y servicios (SSO, JWT, confused deputy), y endurecer un cluster de Kubernetes con service accounts, RBAC, network policies y security contexts.

## Estudio

### 1. Por qué los microservicios cambian el panorama de seguridad

Un monolito tiene pocas puertas: el tráfico entra por un lugar y casi todo ocurre en memoria. Con microservicios, la **superficie de ataque crece**: más procesos, más tráfico en red, más credenciales, más imágenes, más configuraciones. Pero también hay una oportunidad: puedes aplicar **defensa en profundidad** y aislar los datos sensibles en pocos servicios, de forma que comprometer uno no comprometa todo.

### 2. Principios centrales

**Menor privilegio (least privilege).** Cada persona, servicio o proceso recibe solo los permisos que necesita, durante el tiempo que los necesita. Si las credenciales de `notifications` se filtran, deberían permitir enviar emails, no leer la tabla de pagos.

**Defensa en profundidad.** Varias capas de protección, de forma que si una falla, otra detenga el ataque. Los microservicios ayudan: puedes aplicar controles distintos a cada servicio según su sensibilidad, y separar datos en distintos almacenes reduce lo que un atacante obtiene de una sola brecha.

```
 internet → [WAF / rate limit] → [gateway: authn] → [servicio: authz] → [red: network policy]
          → [container: no root, FS de solo lectura] → [datos: cifrado en reposo, acceso mínimo]
```

**Automatización.** Con decenas de servicios no puedes rotar credenciales, parchear o revisar permisos a mano. La automatización (pipelines que escanean, rotación automática de secretos, infraestructura reconstruible) es una herramienta de seguridad.

**Seguridad integrada en la entrega.** No es una revisión al final, sino parte del pipeline: análisis de dependencias, escaneo de imágenes, análisis estático, revisión de cambios en permisos.

### 3. Las cinco funciones de la ciberseguridad

Un marco útil (del NIST) organiza el trabajo en cinco funciones:

| Función | Pregunta | Ejemplos en microservicios |
| --- | --- | --- |
| Identify | ¿Qué tenemos y qué riesgos corre? | Inventario de servicios y datos, modelado de amenazas |
| Protect | ¿Cómo lo protegemos? | Authn/authz, cifrado, menor privilegio, parches |
| Detect | ¿Cómo nos enteramos de un ataque? | Logs de auditoría, alertas de comportamiento anómalo |
| Respond | ¿Qué hacemos cuando pasa? | Plan de incidentes, rotación de credenciales, comunicación |
| Recover | ¿Cómo volvemos a la normalidad? | Backups probados, reconstrucción de entornos |

Muchos equipos invierten casi todo en "Protect" y casi nada en detectar, responder y recuperar. Un incidente de seguridad no es cuestión de si, sino de cuándo.

**Modelado de amenazas.** Antes de decidir protecciones, piensa como atacante: ¿qué tiene valor en tu sistema?, ¿quién querría obtenerlo?, ¿por dónde podría entrar? Un ejercicio simple: para cada servicio, lista los datos que maneja, quién lo llama y qué pasaría si alguien lo controlara.

### 4. Fundamentos de seguridad de aplicaciones

**Credenciales.** Contraseñas de usuarios, claves de APIs, certificados, credenciales de bases de datos. Buenas prácticas:

- No las guardes en el código ni en el repositorio. Herramientas de escaneo (por ejemplo, gitleaks) detectan secretos en commits.
- **Rotación**: cambiar credenciales periódicamente y, sobre todo, poder hacerlo **rápido** cuando se filtran. Mejor aún, credenciales de vida corta generadas bajo demanda (por ejemplo, un gestor de secretos que emite credenciales de base de datos válidas por una hora).
- **Limitar el alcance**: cada servicio con sus propias credenciales, con permisos mínimos. Así sabes quién usó qué y puedes revocar una sin afectar a las demás.

**Parches.** Las vulnerabilidades conocidas en dependencias, imágenes base y sistema operativo son una de las principales vías de ataque. En containers, parchear significa **reconstruir la imagen** con la base actualizada y redesplegar; si tus imágenes no se reconstruyen con regularidad, envejecen con vulnerabilidades dentro. Usa herramientas de escaneo de dependencias e imágenes en el pipeline.

**Backups.** Copias regulares, **probadas** (un backup que nunca restauraste es una esperanza, no un backup), y guardadas fuera del alcance de las mismas credenciales que el sistema principal, para que un atacante (o un ransomware) no pueda borrarlas.

**Reconstruir.** Si sospechas que una máquina o container fue comprometido, lo más seguro es destruirlo y reconstruirlo desde una fuente confiable. La infraestructura como código y los containers inmutables lo hacen viable.

### 5. Confianza implícita vs. zero trust

**Confianza implícita.** "Si la llamada viene de dentro de nuestra red, es confiable." Todo el esfuerzo se pone en el perímetro. Es el modelo más común, y a menudo no por decisión consciente sino por desconocimiento. Problema: si un atacante entra (por una dependencia vulnerable, un portátil comprometido, un servicio expuesto por error), puede moverse libremente, leer el tráfico y hacerse pasar por otros servicios.

**Zero trust.** Asumes que el entorno **ya está comprometido**. Cada llamada se autentica y autoriza, todo el tráfico se cifra, los datos se guardan protegidos. El concepto de perímetro deja de tener sentido. Zero trust es una **mentalidad**, no un producto que se compra.

En la práctica es un **espectro**: no todo necesita el máximo nivel. Clasifica los datos y servicios por sensibilidad (públicos, internos, sensibles, altamente sensibles) y aplica más controles donde más importa. Un servicio que sirve el catálogo público no necesita las mismas medidas que el que guarda datos de tarjetas.

### 6. Proteger los datos

**En tránsito.** Cuatro propiedades a considerar: **confidencialidad** (que nadie lea los datos), **integridad** (que nadie los modifique), **autenticidad del servidor** (que hablas con quien crees) y **autenticidad del cliente** (que el servidor sepa quién eres).

- **TLS** cifra y garantiza integridad y autenticidad del servidor. Para tráfico externo es obligatorio.
- **mTLS** (TLS mutuo): ambos lados presentan certificados, así el servidor también autentica al cliente. Es la base de la autenticación entre servicios en un mesh. Gestionar certificados a mano para decenas de servicios es inviable; los service meshes automatizan su emisión y rotación (sesión 06).

**En reposo.**

- Usa los mecanismos de cifrado probados de tu base de datos o plataforma; **nunca inventes tu propia criptografía**.
- Las claves de cifrado deben guardarse **separadas** de los datos (en un gestor de claves).
- **Cifra lo que importa** y, mejor aún, **no guardes lo que no necesitas**: el dato que no guardas no puede filtrarse. Minimiza los datos personales (también es un requisito legal en muchas jurisdicciones).
- Cifra también los **backups**.

### 7. Autenticación y autorización

- **Autenticación (authn)**: ¿quién eres?
- **Autorización (authz)**: ¿qué puedes hacer?
- **Principal**: la entidad (persona o servicio) sobre la que se decide.

**Entre servicios.** mTLS, o claves de API, o tokens emitidos por un proveedor de identidad para servicios. El objetivo es que `payments` sepa con certeza que quien llama es `orders`.

**Humanos.** Usuario y contraseña, idealmente con **MFA** (segundo factor: app, llave física, biometría). Para accesos críticos (consolas de producción, código fuente), MFA debería ser obligatorio.

**Single sign-on (SSO).** El usuario se autentica una vez ante un **proveedor de identidad** (IdP) y accede a varios servicios. Hoy el estándar dominante es **OpenID Connect**, construido sobre **OAuth 2.0**. El IdP dice **quién** es el principal; cada sistema decide **qué** puede hacer.

**SSO gateway.** En lugar de que cada servicio implemente el flujo con el IdP, un gateway en el perímetro gestiona el login y pasa la identidad hacia dentro (en cabeceras o, mejor, en un token). Cuidado: si **solo** el gateway verifica, vuelves a la confianza implícita dentro del perímetro.

**Roles gruesos en el IdP, decisiones finas en el servicio.** El IdP puede decir "esta persona es agente del call center". Pero la regla "un agente puede hacer reembolsos de hasta 50 dólares" debe vivir **en el servicio** que hace reembolsos. Si pones roles ultra específicos en el directorio corporativo (`CALL_CENTER_REFUND_50`), parte de la lógica del servicio vive en un sistema de otro equipo y pierdes el despliegue independiente.

### 8. El problema del confused deputy

Un usuario autenticado pide a `WebShop` (un BFF) ver `/orderStatus/12345`. `WebShop` llama a `Orders` y a `Shipping` para obtener los datos. `Orders` confía en `WebShop` porque es un servicio interno autenticado con mTLS. Pero ¿y si el pedido 12345 **no es de ese usuario**? El usuario está autenticado, el servicio también, y aun así nadie verificó que **ese usuario** pueda ver **ese pedido**. `WebShop` es el "ayudante confundido": usa su autoridad legítima para hacer algo que el usuario no debería poder hacer. Así se filtran datos de otros clientes probando IDs.

```
 usuario A (autenticado) ──GET /orderStatus/12345──► WebShop ──GET /orders/12345──► Orders
                                                       ▲                              │
                                    ¿alguien comprobó que 12345 es de A? ─────────────┘
```

Dos formas de resolverlo:

**Autorización centralizada aguas arriba.** El gateway o el BFF comprueba todo antes de llamar a los servicios. Simple, pero implica confianza implícita hacia abajo, y obliga al gateway a conocer las reglas de cada servicio (acoplamiento).

**Autorización descentralizada.** Se propaga la **identidad del usuario** junto con la petición y **cada servicio decide** según sus propias reglas ("`Orders` solo devuelve el pedido si su `customerId` coincide con el del token"). Más alineado con zero trust y con servicios autónomos.

### 9. JSON Web Tokens (JWT)

Un **JWT** es un token firmado que contiene **claims** (afirmaciones) sobre el principal. Tiene tres partes en base64url separadas por puntos: cabecera, payload y firma.

```json
{
  "iss": "https://idp.example.com",
  "sub": "customer-981",
  "aud": "shop-api",
  "exp": 1792569600,
  "roles": ["customer"],
  "tier": "gold"
}
```

Cómo encaja: el gateway, tras autenticar al usuario, obtiene o genera un JWT y lo pasa a los servicios. Cada servicio **verifica la firma** (con la clave pública del emisor, sin llamar a nadie), comprueba `exp`, `aud` e `iss`, y usa los claims para decidir.

```ts
import { createRemoteJWKSet, jwtVerify } from "jose";

const jwks = createRemoteJWKSet(new URL("https://idp.example.com/.well-known/jwks.json"));

export async function authorizeOrderRead(token: string, order: { customerId: string }) {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: "https://idp.example.com",
    audience: "shop-api",
  });
  if (payload.sub !== order.customerId && !(payload.roles as string[])?.includes("support")) {
    throw new Error("forbidden"); // decisión local del servicio Orders
  }
}
```

Cuidados con los JWT:

- **Vida corta**: un JWT firmado es válido hasta que expira; revocarlo antes es difícil. Usa expiraciones de minutos y renueva.
- **Valida siempre** firma, algoritmo esperado, emisor, audiencia y expiración. No aceptes tokens sin firma.
- **No pongas secretos** en el payload: está codificado, no cifrado; cualquiera lo lee.
- **Token por audiencia**: considera emitir tokens con alcance limitado para cada servicio downstream en lugar de reenviar el mismo token con todos los permisos a todas partes.

### 9.1 Ejemplo trabajado: la identidad de punta a punta

Une las piezas en un flujo concreto: una clienta, Ana, consulta el estado de su pedido en una tienda con `WebShop` (BFF), `Orders` y `Shipping`.

1. **Login.** El navegador redirige a Ana al proveedor de identidad (OpenID Connect). Ana introduce su contraseña y un código de su app de autenticación (MFA). El IdP devuelve al BFF un token de identidad y un token de acceso.
2. **Sesión con el navegador.** El BFF guarda los tokens del lado del servidor y entrega al navegador una cookie de sesión `HttpOnly`, `Secure` y `SameSite`. El JavaScript del navegador nunca toca los tokens, lo que reduce el riesgo si hay una vulnerabilidad XSS.
3. **Petición.** Ana abre `/orders/o-77`. El BFF valida la sesión y llama a `Orders` con un **JWT de corta duración** que contiene `sub: customer-981` y `aud: orders`. La llamada viaja por mTLS: `Orders` sabe que habla con `WebShop`, y el JWT le dice en nombre de **quién**.
4. **Decisión local.** `Orders` verifica firma, emisor, audiencia y expiración. Carga el pedido y compara su `customerId` con el `sub`. Coinciden: responde. Si no coincidieran, devolvería 404 (en lugar de 403, para no confirmar que el pedido existe).
5. **Llamada en cadena.** `Orders` necesita el estado del envío. En lugar de reenviar el mismo token con audiencia `orders`, obtiene (o el BFF le proporciona) un token con audiencia `shipping` y los permisos mínimos. `Shipping` hace su propia comprobación.
6. **Auditoría.** Cada servicio registra en su log de auditoría quién (`sub`), qué (`read order o-77`) y desde qué servicio, con el correlation ID. Si mañana hay que investigar un acceso indebido, existe el rastro.

Comparemos con un diseño ingenuo: el navegador guarda un token de larga duración con todos los permisos, el BFF lo reenvía tal cual a todos los servicios, y los servicios solo comprueban que el token sea válido. Si ese token se filtra, el atacante tiene semanas de acceso total, y ningún servicio verifica propiedad de los recursos. Las diferencias entre ambos diseños son, una por una, las ideas de esta sesión: vida corta, alcance limitado, decisión local, menor privilegio y defensa en profundidad.

### 10. Seguridad en Kubernetes

El libro de Sayfan dedica un capítulo entero a cómo Kubernetes ayuda (y qué hay que configurar):

**Cuentas de usuario y service accounts.** Los humanos se autentican con cuentas de usuario (certificados, OIDC). Los **Pods** se identifican ante la API de Kubernetes con una **service account**. Cada servicio debería tener la suya, y la mayoría **no necesita** acceder a la API de Kubernetes en absoluto: desactiva el montaje automático del token (`automountServiceAccountToken: false`).

**RBAC.** Define qué puede hacer cada identidad con objetos `Role`/`ClusterRole` (permisos: verbos sobre recursos) y `RoleBinding`/`ClusterRoleBinding` (a quién se le otorgan).

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata: { name: read-config, namespace: shop }
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata: { name: orders-read-config, namespace: shop }
subjects:
  - kind: ServiceAccount
    name: orders
    namespace: shop
roleRef: { kind: Role, name: read-config, apiGroup: rbac.authorization.k8s.io }
```

El flujo de cada petición a la API es: **autenticación** (¿quién?), **autorización** (RBAC: ¿puede?) y **admisión** (controladores que validan o modifican el objeto, por ejemplo rechazar Pods que corren como root).

**Network policies.** Por defecto, cualquier Pod puede hablar con cualquier otro: confianza implícita dentro del cluster. Las NetworkPolicies restringen el tráfico (necesitan un plugin de red que las soporte):

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: payments-ingress, namespace: shop }
spec:
  podSelector: { matchLabels: { app: payments } }
  policyTypes: ["Ingress"]
  ingress:
    - from:
        - podSelector: { matchLabels: { app: orders } }   # solo orders puede llamar a payments
      ports: [{ port: 3000 }]
```

**Security contexts.** Restringen lo que puede hacer el container:

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities: { drop: ["ALL"] }
```

**Seguridad de imágenes.** Imágenes base mínimas (alpine, distroless), versiones fijadas, escaneo de vulnerabilidades, dependencias actualizadas, registry protegido y con acceso controlado.

**Cuotas y límites.** `ResourceQuota` por namespace y `limits` por container reducen el **radio de impacto** de un servicio comprometido o descontrolado (por ejemplo, alguien que usa tus Pods para minar criptomonedas).

**Pod Security Standards.** Perfiles (`privileged`, `baseline`, `restricted`) que se aplican por namespace mediante admisión, para impedir Pods inseguros.

### 11. Historia de fallo

Una tienda tenía un BFF que llamaba a `Orders` con un token de servicio con permisos totales. `Orders` confiaba en cualquier llamada con ese token. Un usuario curioso notó que los IDs de pedido eran correlativos y, cambiando el número en la URL, pudo ver pedidos de miles de clientes con nombre y dirección. El sistema estaba "seguro" (TLS, autenticación de usuarios, mTLS interno), pero ningún componente verificaba que el pedido perteneciera al usuario. La corrección: propagar un JWT del usuario y que `Orders` comprobara el `sub` contra el dueño del pedido, más IDs no predecibles y una alerta ante patrones de enumeración.

### 12. Errores comunes

- Confiar en todo lo que viene "de dentro" del perímetro.
- Credenciales compartidas entre servicios o guardadas en el repositorio.
- Imágenes que no se reconstruyen y acumulan vulnerabilidades.
- Backups nunca restaurados en una prueba.
- JWT de larga duración, sin validar audiencia o algoritmo.
- Poner reglas de negocio finas en el proveedor de identidad.
- Pods que corren como root, con el token de la API montado y sin network policies.

## Conceptos clave

- **Menor privilegio**: conceder solo los permisos necesarios, durante el tiempo necesario.
- **Defensa en profundidad**: varias capas de protección independientes.
- **Zero trust**: asumir que el entorno ya está comprometido y verificar cada interacción.
- **mTLS**: TLS en el que cliente y servidor se autentican mutuamente con certificados.
- **OpenID Connect**: estándar de SSO basado en OAuth 2.0.
- **Confused deputy**: un intermediario autorizado es engañado para actuar en nombre de quien no tiene permiso.
- **JWT**: token firmado con claims que los servicios verifican localmente.
- **RBAC**: control de acceso basado en roles; en Kubernetes, Roles y RoleBindings.
- **NetworkPolicy**: regla que limita qué Pods pueden comunicarse entre sí.

## Preguntas de repaso

1. ¿Por qué la confianza implícita dentro del perímetro es peligrosa en microservicios?
   R: Porque si un atacante entra en la red por cualquier vía, puede leer y modificar el tráfico interno y hacerse pasar por servicios, moviéndose libremente. Con muchos servicios y mucho tráfico interno, la superficie es grande y una sola brecha compromete todo.
2. Explica el problema del confused deputy con un ejemplo y dos formas de evitarlo.
   R: Un usuario autenticado pide al BFF un pedido ajeno; el BFF, que es un servicio de confianza, lo pide a Orders y Orders lo entrega porque confía en el BFF. Se evita autorizando aguas arriba (el gateway o BFF verifica la propiedad) o, mejor, propagando la identidad del usuario para que cada servicio decida con sus propias reglas.
3. ¿Qué validaciones debe hacer un servicio al recibir un JWT y qué limitaciones tiene?
   R: Verificar la firma con la clave del emisor, el algoritmo esperado, el emisor, la audiencia y la expiración. Sus limitaciones: es difícil revocarlo antes de que expire, por eso debe tener vida corta, y su payload es legible por cualquiera, así que no debe contener secretos.
4. ¿Dónde deben vivir las reglas de autorización finas y por qué?
   R: En el servicio que implementa la funcionalidad, porque forman parte de su lógica de negocio. Si viven en el proveedor de identidad o en un gateway central, cambiar el servicio obliga a coordinar con otro equipo y se pierde el despliegue independiente.
5. Nombra cuatro medidas para endurecer Pods y namespaces en Kubernetes.
   R: Service account propia sin montar el token si no lo necesita, RBAC con permisos mínimos, NetworkPolicies que solo permitan el tráfico esperado, security contexts sin root y con sistema de archivos de solo lectura, imágenes mínimas escaneadas y cuotas de recursos.
6. ¿Por qué parchear en containers significa reconstruir imágenes?
   R: Porque los containers son inmutables: las librerías y el sistema base van dentro de la imagen. Para incorporar un parche hay que reconstruir la imagen con la base actualizada y redesplegar; si no se reconstruyen con regularidad, las vulnerabilidades se quedan.

## Ejercicio

Haz una revisión de seguridad del servicio que vienes construyendo. (1) Añade a su Deployment un `securityContext` restrictivo (no root, sistema de archivos de solo lectura con un `emptyDir` para `/tmp`, sin capabilities) y verifica que sigue arrancando. (2) Crea una service account propia con `automountServiceAccountToken: false`. (3) Implementa en TypeScript un middleware que verifique un JWT firmado con una clave local (usa `jose` para generar un par de claves de prueba) y una regla de autorización por propiedad del recurso. Criterio de terminado: un test de vitest demuestra que un usuario autenticado no puede leer el recurso de otro (403), que un token expirado da 401, y `kubectl exec` muestra que el proceso corre con UID 1000 y no puede escribir en `/app`.

## Explícalo con tus palabras

Explica el problema del confused deputy con la analogía de un recepcionista de hotel que entrega llaves de habitaciones.
