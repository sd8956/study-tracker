---
title: Seguridad en el diseño — identidad, OAuth/OIDC, SSO y TLS
kind: lesson
hours: 2
sources: karanpratapsingh/system-design, cap. IV "OAuth 2.0 and OpenID Connect (OIDC)", "Single Sign-On (SSO)" y "SSL, TLS, mTLS" | System Design Primer, "Security"
links: Primer — Security | https://github.com/donnemartin/system-design-primer#security ; Karan — OAuth 2.0 and OIDC | https://github.com/karanpratapsingh/system-design#oauth-20-and-openid-connect-oidc ; Karan — Single Sign-On | https://github.com/karanpratapsingh/system-design#single-sign-on-sso ; Karan — SSL, TLS, mTLS | https://github.com/karanpratapsingh/system-design#ssl-tls-mtls
---

## Objetivo

Incorporar la seguridad al diseño desde el inicio: separar autenticación de autorización, elegir entre sesiones y tokens, entender los flujos de OAuth 2.0 y OpenID Connect, SSO con SAML u OIDC, el papel de TLS y mTLS, y los principios básicos (cifrado, mínimo privilegio, validación de entradas) que todo design doc debe cubrir.

## Estudio

### Seguridad como requisito no funcional

En un diseño, la seguridad no es una caja más del diagrama: atraviesa todas. Las preguntas que debes responder siempre son: ¿quién puede llamar a esto?, ¿cómo lo sabemos?, ¿qué puede hacer?, ¿qué pasa si alguien intercepta el tráfico o roba la base de datos?, ¿qué pasa si un componente interno es comprometido? Esta sesión da el vocabulario y los patrones para responderlas a nivel de diseño. La fase final de tu ruta (seguridad en la nube) profundiza en la implementación.

### Lo básico que el primer recomienda siempre

- **Cifrar en tránsito y en reposo**: TLS en toda conexión y cifrado de discos, backups y object storage.
- **Validar y sanear toda entrada** que venga del usuario para prevenir XSS e inyecciones.
- **Consultas parametrizadas** para prevenir inyección SQL: nunca concatenes entradas en una consulta.
- **Principio de mínimo privilegio**: cada usuario, servicio y credencial con los permisos mínimos para su función.

Son simples de enunciar y responsables de una gran parte de las brechas reales cuando se omiten.

### Autenticación frente a autorización

- **Autenticación** (authn): ¿quién eres? Verificar identidad (contraseña, passkey, segundo factor, certificado).
- **Autorización** (authz): ¿qué puedes hacer? Verificar permisos sobre un recurso concreto.

Un error clásico es autenticar bien y autorizar mal: el usuario 42 está logueado y pide `GET /orders/981`, que pertenece al usuario 77. Si el servidor no verifica la propiedad, cualquiera puede leer pedidos ajenos cambiando el ID (*IDOR*, insecure direct object reference). **Cada endpoint** que accede a un recurso debe verificar permisos sobre **ese** recurso.

Modelos de autorización comunes: **RBAC** (roles con permisos: admin, editor, lector), **ABAC** (reglas sobre atributos: "puede editar si es dueño y el documento no está archivado") y **ReBAC** (basado en relaciones: "puede ver si es miembro de un equipo que tiene acceso a la carpeta", como Google Drive; lo verás en la sesión 26).

### Sesiones frente a tokens

Después de autenticar, el sistema debe recordar quién eres en cada petición:

**Sesión en el servidor**: el servidor crea un ID de sesión aleatorio, lo guarda (en Redis, por ejemplo) con los datos del usuario y lo envía como cookie `HttpOnly; Secure; SameSite`. En cada petición busca la sesión.

- Ventajas: revocación inmediata (borras la sesión), el cliente no ve datos internos.
- Costos: una búsqueda por petición en un almacén compartido (que debe ser rápido y altamente disponible).

**Token autocontenido (JWT)**: el servidor emite un token firmado que contiene los datos (`sub`, `exp`, roles). Cualquier servicio puede verificar la firma con la clave pública, sin consultar a nadie.

- Ventajas: sin estado en el servidor, ideal entre muchos servicios.
- Costos: **difícil de revocar** antes de su expiración (si roban un token válido por 24 h, sirve 24 h), tamaño mayor en cada petición, y los datos del token pueden quedar desactualizados (roles cambiados).

El patrón habitual combina ambos: **access tokens de vida corta** (5–15 minutos) más **refresh tokens** de vida larga guardados de forma segura y revocables en el servidor. Si un access token se filtra, sirve por poco tiempo; para cortar el acceso de un usuario, revocas su refresh token.

### Cómo se verifica un JWT en cada servicio

Un JWT tiene tres partes separadas por puntos: cabecera, carga útil (claims) y firma, todas codificadas en base64url. Verificarlo correctamente implica:

1. **Comprobar la firma** con la clave pública del emisor (el IdP publica sus claves en un endpoint JWKS, que los servicios cachean). Nunca aceptes el algoritmo `none` ni dejes que el token elija libremente el algoritmo.
2. **Comprobar la expiración** (`exp`) y, si existe, la fecha desde la que es válido (`nbf`), con una pequeña tolerancia por diferencias de reloj.
3. **Comprobar el emisor** (`iss`) y la **audiencia** (`aud`): un token emitido para la API de facturación no debe aceptarse en la de pagos.
4. **Leer los permisos** (`scope`, roles) y aplicar la autorización por recurso.

Como las claves de firma rotan, los servicios deben refrescar el JWKS periódicamente y aceptar durante un tiempo la clave vieja y la nueva. Es un buen ejemplo de un detalle operativo que conviene mencionar en un diseño: la verificación es local y rápida (sin llamada de red por petición), pero depende de una configuración compartida que hay que mantener actualizada.

### OAuth 2.0: autorización delegada

**OAuth 2.0** permite que una aplicación acceda a recursos de un usuario en otro servicio **sin conocer su contraseña**. Ejemplo: una app de impresión de fotos accede a tus fotos de Google sin que le des tu contraseña de Google.

Actores:

- **Resource owner**: el usuario dueño de los datos.
- **Client**: la aplicación que quiere acceso.
- **Authorization server**: emite tokens tras autenticar al usuario y obtener su consentimiento.
- **Resource server**: la API que guarda los recursos y valida los tokens.
- **Scopes**: el alcance del permiso (`photos.read`, no "todo").
- **Access token**: la credencial que representa el permiso concedido.

El flujo recomendado para apps web y móviles es **Authorization Code con PKCE**:

```
 1. Usuario ──"Conectar con Fotos"──> [Client]
 2. [Client] redirige al usuario ──> [Authorization server]
       ?client_id=...&scope=photos.read&redirect_uri=...&code_challenge=hash(verifier)
 3. Usuario se autentica y consiente ──> [Authorization server]
 4. [Authorization server] redirige ──> redirect_uri?code=XYZ
 5. [Client] ──POST code + code_verifier──> [Authorization server] ──> access_token (+ refresh_token)
 6. [Client] ──GET /photos (Authorization: Bearer token)──> [Resource server]
```

PKCE (el `code_verifier` y su hash) evita que alguien que intercepte el `code` en la redirección pueda canjearlo, porque no conoce el verificador original. Otros flujos: **Client Credentials** para comunicación entre máquinas (un servicio pidiendo un token para llamar a otro, sin usuario).

Desventajas que señala Karan: OAuth es un framework más que un protocolo rígido, así que las implementaciones varían, no define scopes comunes, y es fácil implementarlo de forma insegura (redirect URIs abiertas, tokens en URLs, falta de validación de `state`). Usa librerías y proveedores probados.

### OpenID Connect: identidad sobre OAuth

OAuth 2.0 es de **autorización** ("esta app puede leer tus fotos"), no de **autenticación** ("este usuario es Ana"). **OpenID Connect** (OIDC) es una capa fina sobre OAuth que agrega login: además del access token, el authorization server (ahora llamado **Identity Provider**, IdP) emite un **ID token**, un JWT firmado con la identidad del usuario (`sub`, `email`, `name`), y expone un endpoint `UserInfo`. "Iniciar sesión con Google" es OIDC.

En tu diseño, OIDC te permite **delegar la autenticación**: no guardas contraseñas, no implementas recuperación de cuenta ni segundo factor; confías en un IdP especializado. Es una decisión de seguridad excelente para la mayoría de los productos.

### SSO: una identidad para muchas aplicaciones

**Single Sign-On** permite que un usuario se autentique una vez y acceda a muchas aplicaciones. Es la norma en empresas: un empleado entra con su cuenta corporativa a correo, CRM, wiki y herramientas internas.

Componentes: el **Identity Provider** (Okta, Entra ID, Google Workspace) que autentica y guarda las identidades; los **Service Providers** (las aplicaciones) que confían en el IdP; y a veces un **identity broker** que conecta muchas aplicaciones con varios IdPs.

Flujo: el usuario pide un recurso a la aplicación → la aplicación lo redirige al IdP → el usuario se autentica (si ya tenía sesión en el IdP, no se le pide nada) → el IdP devuelve una aserción firmada → la aplicación concede acceso.

Protocolos: **SAML** (XML, maduro, muy usado en entornos empresariales y aplicaciones web tradicionales) frente a **OIDC** (JSON y REST, más simple, mejor para móviles y aplicaciones modernas).

Ventajas: una sola credencial para el usuario, menos contraseñas reutilizadas, alta y baja centralizadas (cuando alguien deja la empresa, se le revoca todo en un lugar), políticas uniformes de segundo factor. Desventajas: el IdP es un punto único de compromiso (si roban esa credencial, se accede a todo; por eso el segundo factor es obligatorio) y un punto único de fallo (si el IdP cae, nadie entra a nada).

### TLS: cifrado, autenticación e integridad

**TLS** (el sucesor de SSL; el nombre "certificado SSL" sobrevive por costumbre) protege la comunicación con tres garantías:

- **Cifrado**: terceros no pueden leer los datos.
- **Autenticación**: el cliente verifica, mediante el certificado firmado por una autoridad de confianza, que habla con el servidor legítimo.
- **Integridad**: los datos no pueden alterarse en tránsito sin que se detecte.

En TLS 1.3 el handshake cuesta 1 RTT (sesión 03) y puede reanudarse con 0-RTT en conexiones repetidas. En tu diseño, decide **dónde termina TLS** (en la CDN, en el load balancer o en cada servicio) y si el tráfico interno va cifrado.

### mTLS y zero trust

En TLS normal, solo el servidor presenta certificado. En **mTLS** (mutual TLS), **ambos lados** presentan certificados y se verifican mutuamente. Así un servicio sabe con certeza criptográfica qué otro servicio lo está llamando.

Esto es la base del modelo **zero trust**: no confiar en nada por estar "dentro de la red". El modelo antiguo (castillo y foso) protegía el perímetro y confiaba en todo lo interno; si un atacante entraba, se movía libremente. Con zero trust, cada llamada interna se autentica (mTLS) y se autoriza (políticas como "solo el servicio de pedidos puede llamar a pagos"). Un service mesh (sesión 04) automatiza la emisión y rotación de certificados para cada servicio.

### Secretos y cifrado de datos

- **Gestión de secretos**: contraseñas de bases, claves de API y certificados nunca en el código ni en variables de repositorio; en un gestor de secretos (Vault, Secrets Manager) con acceso auditado y rotación periódica.
- **Cifrado en reposo**: discos, backups y buckets cifrados con claves gestionadas por un KMS. Para datos muy sensibles, **cifrado a nivel de campo** (el número de documento cifrado en la aplicación, de modo que ni un administrador de base de datos lo lee).
- **Hash de contraseñas** con algoritmos lentos y con sal (bcrypt, scrypt, Argon2); nunca cifrado reversible ni hashes rápidos como SHA-256 solo.
- **Minimización**: el dato más seguro es el que no guardas. ¿Necesitas el número completo de tarjeta? Normalmente no: un proveedor de pagos lo tokeniza y tú guardas el token.

### Modelado de amenazas en cinco minutos

Antes de proponer controles, conviene preguntarse de forma sistemática qué puede salir mal. Un método simple es recorrer el diagrama de flujo de datos y, en cada frontera de confianza (internet → gateway, gateway → servicio, servicio → base, tu sistema → tercero), hacerse las preguntas del modelo STRIDE:

- **Spoofing** (suplantación): ¿alguien puede hacerse pasar por otro usuario o servicio?
- **Tampering** (alteración): ¿alguien puede modificar datos en tránsito o en reposo?
- **Repudiation** (repudio): ¿alguien puede negar haber hecho algo porque no queda registro?
- **Information disclosure** (filtración): ¿qué datos se exponen si este componente se compromete?
- **Denial of service** (denegación): ¿cómo se puede saturar este componente?
- **Elevation of privilege** (escalada): ¿alguien con pocos permisos puede obtener más?

No hace falta un documento extenso: una tabla con las fronteras y una línea por pregunta relevante ya obliga a pensar en controles concretos, y es exactamente lo que se espera en la sección de seguridad de un design doc.

### Superficie de ataque y defensa en profundidad

En el diagrama, marca la superficie expuesta y las capas de defensa:

```
 Internet
   │  [CDN + WAF + protección DDoS]   ← filtra ataques volumétricos y patrones conocidos
   │  [API Gateway: authn, rate limit] ← sesión 16
   │  [Servicios: authz por recurso]   ← cada endpoint verifica permisos
   │  [mTLS entre servicios]           ← zero trust interno
   │  [BD en subred privada, cifrada]  ← mínimo privilegio en credenciales
   └─ [Logs de auditoría inmutables]   ← detectar y reconstruir incidentes
```

Ninguna capa es perfecta; juntas hacen que un fallo en una no comprometa todo (**defensa en profundidad**). Una forma práctica de comprobarlo es preguntar, capa por capa: "si esta falla o se salta, ¿qué detiene al atacante después?". Si la respuesta es "nada", falta una capa.

Amenazas que todo design doc debería mencionar con su mitigación:

| Amenaza | Mitigación de diseño |
| --- | --- |
| DDoS volumétrico | CDN/anycast, protección del proveedor, autoscaling con límites |
| Abuso de API, scraping, fuerza bruta | Rate limiting por usuario/IP/clave, CAPTCHA, bloqueo progresivo |
| Inyección (SQL, comandos) | Consultas parametrizadas, validación de entradas |
| XSS | Escapar salidas, Content-Security-Policy, cookies `HttpOnly` |
| CSRF | Cookies `SameSite`, tokens anti-CSRF |
| IDOR | Autorización por recurso en cada endpoint, IDs no secuenciales como defensa adicional |
| Robo de tokens | Vida corta, refresh revocable, TLS siempre |
| Movimiento lateral interno | Zero trust, mTLS, segmentación de red, mínimo privilegio |
| Filtración de backups | Cifrado, cuentas aisladas, acceso auditado |

### Auditoría y detección

Prevenir no basta: tienes que poder **detectar** y **reconstruir** un incidente. Un buen diseño incluye:

- **Logs de auditoría** de acciones sensibles (quién accedió a qué dato, quién cambió qué permiso), escritos en un almacenamiento de solo inserción al que ni los administradores del sistema pueden borrar, y retenidos según exigencias legales.
- **Alertas de comportamiento anómalo**: un usuario que descarga diez mil registros en un minuto, logins desde países inusuales, picos de errores `401`/`403`.
- **Trazabilidad de identidades técnicas**: cada servicio usa su propia credencial, de modo que el log dice qué servicio hizo cada acceso (con una credencial compartida, nunca sabrías cuál fue).

### Privacidad y cumplimiento

Muchos sistemas manejan datos personales sujetos a leyes de protección de datos (por ejemplo, el RGPD en Europa o las leyes de habeas data en Latinoamérica) o a normas sectoriales (PCI DSS para tarjetas, normas de salud para historias clínicas). Las consecuencias de diseño más habituales:

- **Residencia de datos**: algunos datos deben permanecer en una región o país; esto condiciona el diseño multi-región (sesión 07, región dueña).
- **Derecho al olvido**: debes poder borrar los datos de una persona en todos los almacenamientos, incluidos caches, índices de búsqueda, data lakes y, de forma razonable, backups. Diseña desde el inicio un mapa de dónde vive cada dato personal; en logs inmutables o event sourcing, una técnica es cifrar los datos de cada persona con su propia clave y destruir la clave para "borrarlos" (*crypto-shredding*).
- **Reducción del alcance**: usar un proveedor de pagos que tokeniza las tarjetas saca a casi todo tu sistema del alcance de PCI.
- **Consentimiento y finalidad**: registrar para qué se usa cada dato y respetar las preferencias del usuario (lo verás en las notificaciones, sesión 21).

### Un ejemplo aplicado: una API B2B

Una empresa expone su API a clientes corporativos y a su propia app móvil:

1. **App móvil**: login con OIDC (Authorization Code + PKCE) contra el IdP propio; access token JWT de 10 minutos y refresh token revocable.
2. **Clientes B2B**: OAuth Client Credentials; cada cliente tiene scopes limitados (`invoices.read`) y su propio rate limit.
3. **Gateway**: valida firmas y expiración de tokens, aplica rate limiting y registra cada llamada con el `client_id`.
4. **Servicios**: autorizan por recurso (el cliente B2B solo ve facturas de su organización); se llaman entre sí con mTLS.
5. **Datos**: cifrados en reposo; los números fiscales, cifrados a nivel de campo; backups en otra cuenta.
6. **Empleados**: acceden al panel de administración con SSO corporativo y segundo factor obligatorio.

## Conceptos clave

- **Autenticación / autorización**: verificar identidad / verificar permisos sobre un recurso.
- **IDOR**: acceso a recursos ajenos por no verificar la propiedad del recurso solicitado.
- **JWT**: token firmado y autocontenido; verificable sin estado, difícil de revocar.
- **Refresh token**: credencial de larga vida y revocable que obtiene nuevos access tokens cortos.
- **OAuth 2.0**: framework de autorización delegada mediante access tokens con scopes.
- **PKCE**: protección del flujo Authorization Code contra la intercepción del código.
- **OpenID Connect**: capa de identidad sobre OAuth que emite un ID token.
- **SSO**: una autenticación para acceder a muchas aplicaciones mediante un Identity Provider.
- **mTLS**: TLS con certificados en ambos extremos; base del zero trust entre servicios.
- **Defensa en profundidad**: varias capas de protección independientes.

## Preguntas de repaso

1. ¿Qué diferencia hay entre OAuth 2.0 y OpenID Connect?
   R: OAuth 2.0 es un framework de autorización delegada: permite que una aplicación obtenga un access token para acceder a recursos de un usuario con un alcance limitado, sin conocer su contraseña. OpenID Connect es una capa sobre OAuth que agrega autenticación: emite un ID token con la identidad del usuario y un endpoint de información de usuario, lo que permite el "iniciar sesión con".
2. ¿Por qué se combinan access tokens cortos con refresh tokens?
   R: Porque los access tokens autocontenidos son difíciles de revocar antes de su expiración; si su vida es corta, un token robado sirve poco tiempo. El refresh token, guardado de forma segura y revocable en el servidor, permite obtener nuevos access tokens sin pedir login y cortar el acceso de un usuario revocándolo.
3. ¿Qué es un IDOR y cómo se previene en el diseño?
   R: Es acceder a un recurso ajeno cambiando su identificador en la petición porque el servidor solo verifica que el usuario esté autenticado y no que tenga permiso sobre ese recurso. Se previene verificando la autorización sobre el recurso concreto en cada endpoint (propiedad, pertenencia a la organización o relación), usando IDs no adivinables solo como defensa adicional.
4. ¿Qué aporta mTLS en una arquitectura de microservicios?
   R: Autenticación mutua criptográfica: cada servicio verifica la identidad del otro con certificados, además de cifrar el tráfico interno. Permite aplicar políticas de autorización entre servicios y adoptar zero trust, de modo que un atacante dentro de la red no pueda hacerse pasar por otro servicio ni leer el tráfico.
5. Nombra dos ventajas y dos riesgos del SSO.
   R: Ventajas: una sola credencial para el usuario (menos contraseñas reutilizadas) y alta y baja centralizadas con políticas uniformes como el segundo factor. Riesgos: si se compromete la credencial del IdP se accede a todas las aplicaciones, y si el IdP cae nadie puede autenticarse en ninguna.

## Ejercicio

Escribe la sección de seguridad de un design doc para una app de historias clínicas de una red de clínicas: actores, flujo de login (con diagrama ASCII), modelo de autorización (quién ve qué historia), tokens y su vida útil, cifrado en tránsito y en reposo, datos cifrados a nivel de campo, comunicación entre servicios y una tabla de al menos seis amenazas con su mitigación. Implementa en TypeScript un middleware de autorización `canReadRecord(user, record)` con reglas de tipo ABAC y pruebas para médico tratante, médico de otra clínica, paciente dueño y administrativo. Terminado cuando el documento tenga todas las secciones y las cuatro pruebas pasen.

## Explícalo con tus palabras

Explica la diferencia entre autenticación y autorización usando la imagen de la recepción de un edificio de oficinas y las tarjetas que abren solo ciertos pisos.
