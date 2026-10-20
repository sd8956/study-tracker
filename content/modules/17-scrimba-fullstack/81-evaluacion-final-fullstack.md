---
title: Evaluación final — Scrimba Fullstack Developer Path
kind: evaluation
hours: 3
sources: Scrimba Fullstack Developer Path — Módulos 1 a 19
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — HTTP | https://developer.mozilla.org/es/docs/Web/HTTP
---

## Objetivo

Comprobar que puedes razonar sobre una aplicación fullstack completa: backend con Node y Express, SQL, autenticación, TypeScript, Next.js, testing e IA. Responde sin consultar material; el tutor corrige tus respuestas.

## Estudio

Cómo hacer esta evaluación (3 h):

1. (≈ 2 h 15 min) Responde todas las preguntas por escrito; en las de diseño, haz un esquema antes de redactar.
2. (≈ 45 min) Revisa con el tutor y anota los temas débiles: entran a tu repaso antes de empezar la ruta de Cloud y seguridad en la nube, donde vas a desplegar y asegurar apps como estas.

## Preguntas de evaluación

1. Describe todo lo que ocurre desde que un usuario envía un formulario de login en una app Express con sesiones hasta que ve su panel privado. Incluye qué se guarda y dónde.
   R: El navegador envía `POST /login` con email y contraseña por HTTPS. El servidor valida la entrada, busca al usuario por email con una consulta parametrizada y compara la contraseña con el hash bcrypt guardado (`bcrypt.compare`). Si coincide, crea una sesión (guarda `userId` en el almacén de sesiones del servidor) y responde con una cookie `httpOnly`, `secure` y `sameSite` que contiene el id de sesión. El navegador redirige al panel y en esa petición envía la cookie; un middleware `requireAuth` recupera la sesión, carga al usuario y deja pasar; la ruta consulta solo los datos de ese usuario. Si falla, responde con un mensaje genérico.
2. ¿Qué imprime este código de Express al pedir `GET /api/x` y por qué? `app.use((req, res, next) => { console.log("A"); next() }); app.get("/api/x", (req, res) => { console.log("B"); res.json({}) }); app.use((req, res, next) => { console.log("C"); next() })`
   R: Imprime `A` y luego `B`. Los middlewares se ejecutan en orden de registro: el primero imprime A y llama a `next()`; la ruta coincide, imprime B y envía la respuesta sin llamar a `next()`, así que el tercer middleware nunca se ejecuta para esa petición.
3. Tienes las tablas `users(id, name)` y `orders(id, user_id, total)`. Escribe la consulta que lista todos los usuarios con su número de pedidos, incluidos los que no tienen ninguno, ordenados de más a menos pedidos.
   R: `SELECT u.id, u.name, COUNT(o.id) AS order_count FROM users u LEFT JOIN orders o ON o.user_id = u.id GROUP BY u.id, u.name ORDER BY order_count DESC;` El `LEFT JOIN` conserva a los usuarios sin pedidos y `COUNT(o.id)` cuenta 0 para ellos porque ignora los `NULL` (con `COUNT(*)` contarías 1).
4. Explica por qué este código es vulnerable y corrígelo: `db.all("SELECT * FROM books WHERE title LIKE '%" + req.query.q + "%' ORDER BY " + req.query.sort)`.
   R: Concatena input del usuario en el SQL, así que es vulnerable a SQL injection tanto en `q` como en `sort`. Corrección: parametrizar el valor del `LIKE` (`WHERE title LIKE ?` con `["%" + q + "%"]`) y, como un nombre de columna no se puede parametrizar, mapear `sort` contra una lista blanca (`{ title: "title", year: "year" }[sort] ?? "title"`) antes de interpolarlo.
5. En Next.js con App Router, una página de producto muestra datos de la base de datos, un botón "Añadir al carrito" y el número de unidades en el carrito del usuario. ¿Qué partes son Server Components, cuáles Client Components y qué estrategia de renderizado usarías?
   R: La página y la información del producto son Server Components: leen la base de datos directamente y no envían JavaScript. El botón "Añadir al carrito" es un Client Component pequeño (necesita `onClick` y estado de envío) que llama a una Server Action, la cual valida y escribe en el servidor. El contador del carrito depende del usuario (cookie o sesión), así que esa parte es dinámica; la página puede ser estática con revalidación para los datos del producto y aislar lo personalizado en un componente dinámico dentro de `Suspense`, o renderizarse dinámicamente entera si es más simple.
6. ¿Qué garantiza TypeScript y qué no garantiza en una API que recibe JSON? ¿Cómo cubres lo que no garantiza?
   R: TypeScript garantiza en tiempo de compilación que tu código usa los datos de forma coherente con los tipos que declaraste. No garantiza nada sobre los datos reales en ejecución: el body que llega por la red puede tener cualquier forma, porque los tipos se borran al compilar. Se cubre validando en el borde con un esquema en ejecución (por ejemplo, Zod), del que además puedes inferir el tipo, y respondiendo 400 si no cumple.
7. Diseña la estrategia de tests de una app fullstack (API Express + frontend React). ¿Qué testeas en cada nivel y qué herramientas usas?
   R: Unitarios (muchos): funciones puras y servicios de negocio, y la capa de datos contra una base SQLite temporal, con Vitest. Integración: la API con peticiones HTTP reales a la app en memoria (por ejemplo, Supertest) para comprobar rutas, validación, autenticación y códigos de estado; los componentes React con Testing Library y la red sustituida por dobles (MSW), incluidos estados de carga y error. End-to-end (pocos): los flujos críticos (registro, login, compra) en un navegador real con Playwright. Todo se ejecuta en CI en cada pull request.
8. ¿Qué es RAG, qué piezas necesita y qué ventaja tiene frente a ajustar (fine-tuning) un modelo con tus documentos?
   R: Retrieval-Augmented Generation: antes de preguntar al modelo, recuperas los fragmentos más relevantes de tus documentos y los añades al prompt. Necesita trocear los documentos, calcular embeddings, guardarlos en una base vectorial (por ejemplo, pgvector), calcular el embedding de la pregunta, hacer búsqueda por similitud y construir el prompt con el contexto. Frente al fine-tuning, es más barato, se actualiza al instante al cambiar los documentos, permite citar fuentes y reduce las alucinaciones sobre hechos concretos.
9. Lee este componente y señala dos problemas: `function Search({ items }) { const [q, setQ] = useState(""); const [filtered, setFiltered] = useState(items); useEffect(() => { setFiltered(items.filter(i => i.name.includes(q))) }, [q]); return <>{/* input y lista */}</> }`.
   R: (1) `filtered` es estado derivado: duplica información y necesita un efecto para sincronizarse, lo que provoca un render extra; debería calcularse en el render (`const filtered = items.filter(...)`, con `useMemo` si es caro). (2) El efecto no incluye `items` en las dependencias, así que si llegan items nuevos la lista filtrada queda desactualizada. Además, la búsqueda distingue mayúsculas; normalizar con `toLowerCase()` mejoraría la experiencia.
10. Explica Server-Sent Events, WebSockets y polling: cómo funcionan y cuándo usarías cada uno.
    R: Polling: el cliente pregunta cada cierto tiempo; simple pero con latencia y peticiones desperdiciadas, aceptable para datos que cambian poco. SSE: una conexión HTTP que el servidor mantiene abierta para enviar eventos al cliente (unidireccional), con reconexión automática; ideal para notificaciones o para transmitir la respuesta de un LLM. WebSockets: canal bidireccional y persistente; para chat, juegos o colaboración en tiempo real donde el cliente también envía mensajes frecuentes.
11. ¿Cuándo usarías Supabase con Row Level Security y cuándo una API propia con Express? Da un criterio de seguridad para cada caso.
    R: Supabase con RLS cuando quieres ir rápido con un CRUD y autenticación estándar y el cliente puede consultar la base directamente; el criterio es que toda tabla expuesta tenga RLS activado con políticas por usuario y que la service role key nunca llegue al cliente. Una API propia cuando hay lógica de negocio compleja, integraciones con secretos, reglas difíciles de expresar como políticas o necesitas control total; el criterio es que el servidor autentique y autorice cada petición (filtrar por dueño), valide la entrada y nunca confíe en el cliente.
12. Explica por qué este código de un agente es peligroso y cómo lo harías seguro: el modelo puede llamar a una herramienta `runSql(query)` que ejecuta cualquier SQL que proponga contra la base de producción.
    R: Porque el modelo puede generar (por error o por una inyección de prompt en los datos del usuario) consultas destructivas o que leen datos de otros usuarios; le estás dando a un componente no confiable el máximo privilegio. Para hacerlo seguro: no exponer SQL libre, sino herramientas específicas y acotadas (`getOrdersForCurrentUser(limit)`) con parámetros validados; usar un usuario de base de datos de solo lectura con permisos mínimos; filtrar siempre por el usuario autenticado en el servidor; limitar las iteraciones y registrar cada llamada para auditoría.
