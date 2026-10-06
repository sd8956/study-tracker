# Study Tracker — UX Spec (Fase 1)

Producto personal de Santiago Duque. Ruta Cloud Security Architect: 6 bloques, 139 sesiones. Solo él marca progreso. ES. Mobile-first. $0 stack.

Fuente de contenido: `Agenda-Cloud-Security-Architect.md` (seed estático en DB o JSON en repo).

---

## Principio rector

La agenda es **secuencial**. El “próximo día” es exactamente el primer día no completado. No se salta. Si no estudia un día de calendario, el número de sesión espera.

---

## Usuarios y auth

- Un solo usuario real (allowlist de email en server).
- Login: **magic link** vía Supabase Auth (acordado con QA/Security: menos superficie, sin password reset).
- Sin signup público. Si el email no está en allowlist → mensaje claro: “No tienes acceso.” Sin hint de si el email existe en el sistema más allá de eso.
- Sesión persistente. Logout visible en menú.
- Sin roles, sin multi-tenant, sin compartir progreso.

---

## Modelo mental (datos)

| Entidad | Campos clave |
|--------|----------------|
| Bloque | id 1–6, título, meta, certificación (texto o null), total_días |
| Sesión | bloque_id, día (1..N), horas (2\|3), título, descripción, links[] |
| Progreso | user_id, sesión_id, completed_at (null = pendiente). Solo marcar/desmarcar la sesión activa o la última completada (undo). |

Estado derivado:
- `current` = primera sesión sin `completed_at` en orden (bloque 1 día 1 → … → bloque 6 día 22).
- Bloque completado = todas sus sesiones completed.
- % bloque = completed / total.
- % ruta = completed / 139.

---

## Flujos

### F1 — Entrada
1. Abre app → si no hay sesión → **Login**.
2. Login OK + allowlist → **Hoy**.
3. Email no allowlist → error, no entra.

### F2 — Estudiar hoy (happy path)
1. **Hoy** muestra la sesión `current`: bloque, día X/N, horas, título, descripción corta, CTA “Abrir sesión”.
2. Tap → **Detalle sesión**.
3. Lee descripción, abre links (externos, `target=_blank`).
4. Al terminar → checkbox “Marcar como hecha”.
5. Confirmación breve → avanza `current` → vuelve a **Hoy** con la siguiente, o estado “Ruta completa” si no queda nada.

### F3 — Explorar bloques
1. Tab **Ruta** → lista de 6 bloques con barra de progreso y estado (bloqueado / en curso / hecho).
2. Tap bloque → lista de días de ese bloque.
3. Días futuros (después de `current`) → visibles en lectura, **sin** checkbox activo; tap muestra detalle read-only + banner “Completa el día actual primero”.
4. Días pasados (completados) → check visible; tap abre detalle; puede **desmarcar** solo el último completado (undo de un paso).

### F4 — Undo
- Solo se puede desmarcar la última sesión marcada (para corregir un tap accidental).
- No se puede desmarcar una sesión intermedia dejando huecos.

---

## Pantallas clave

### 1. Login (`/login`)
- Logo/nombre: **Study Tracker**.
- Subtítulo: “Ruta Cloud Security Architect”.
- Campo email + botón “Enviar enlace” (o Continuar).
- Copy ES, tono serio y corto.
- Error allowlist: “Este correo no tiene acceso.”
- Mobile: formulario centrado, mucho aire, sin decoración AI.

### 2. Hoy (`/` o `/hoy`) — home post-login
Jerarquía:
1. Saludo mínimo + progreso global (“47 / 139 · 34%”) en una línea.
2. Card grande **Sesión de hoy** (la `current`):
   - Chip: `Bloque 1 · Día 12 · 2 h`
   - Título (ej. “OIDC”)
   - 1–2 líneas de descripción
   - Botón primario: **Empezar** / **Continuar**
3. Debajo, opcional: “Siguiente” preview (solo título del día+1) en muted — no es CTA de salto.
4. Si no hay `current`: estado vacío de victoria — “Ruta completa.” + resumen por bloque.

Bottom nav (3 tabs):
- **Hoy**
- **Ruta**
- **Cuenta** (email + logout; versión app opcional)

### 3. Detalle sesión (`/sesion/[bloque]/[dia]` o `/s/[id]`)
- Header: back + `Bloque N · Día D`
- Título H1
- Meta: `2 h` o `3 h` (chip; 3 h = “Proyecto”)
- Cuerpo: descripción completa
- Sección **Material**: lista de links (si hay). Cada fila = título corto + dominio. Tap abre externo.
- Sticky bottom (mobile): checkbox grande **Marcar como hecha** — solo si esta sesión es `current`.
- Si es futura: banner + checkbox disabled.
- Si es pasada (completada): checkbox checked; si es la última completada, permitir desmarcar.
- Sin comentarios, likes, ni “notas” en Fase 1 (scope creep).

### 4. Ruta / Bloques (`/ruta`)
- Lista vertical de 6 cards:
  - Título del bloque
  - Meta en 1 línea (ellipsis)
  - Progress bar + `12/30`
  - Badge: `En curso` | `Hecho` | `Pendiente` (pendiente = aún no empezado, no “bloqueado” visual agresivo — la secuencia ya gobierna el detalle)
- Certificación del bloque, si aplica, como texto secundario (“SAP-C03 · día 29”).
- Tap → **Lista de días del bloque**.

### 5. Lista de días (`/ruta/[bloque]`)
- Header: nombre bloque + meta + progress
- Lista: `Día N · 2h · Título` + check o círculo vacío
- `current` resaltado (borde o fondo sutil)
- Futuros: opacidad menor, sin check interactivo
- Tap cualquier día → Detalle (con reglas de checkbox arriba)

### 6. Cuenta (`/cuenta`)
- Email
- Logout
- Texto fijo: “Acceso personal. Sin compartir.”

---

## Reglas UX (no negociables en Fase 1)

1. **No saltar días.** Solo la sesión `current` se puede marcar hecha.
2. **Undo de un paso.** Solo desmarcar la última completada.
3. **Mobile-first.** Ancho útil 390px. Bottom nav. Sticky CTA en detalle. Targets ≥44px.
4. **Español.** UI y errores en ES. Contenido de la agenda ya viene en ES.
5. **Links externos** siempre claros (icono o “Abre en…”); no embeber tutoriales.
6. **Sin paywall, sin onboarding multi-step, sin streak gamification** en Fase 1. Un número de progreso basta.
7. **Vacío / error:** estados explícitos (sin sesión, red caída, no autorizado).
8. **Accesibilidad mínima:** contraste AA en texto, labels en checkbox, focus visible.

---

## Visual (dirección, no tokens finales)

- Oscuro o claro: **claro preferido** para estudio (menos “dashboard SaaS genérico”). Fondo `#FAFAF9`, texto `#1C1917`, acento único `#0F766E` (teal sobrio) para progreso y CTA.
- Tipografía: system UI (Inter o system stack). Sin display fancy.
- Cards con borde 1px, radio 12, sombra casi nula.
- Progress: barra fina, no circular hero.
- Evitar look AI: no gradientes púrpura, no glassmorphism, no ilustraciones stock.

Si Dev prefiere dark por default: mismo acento teal, superficies `#0C0A09` / `#1C1917`, texto `#FAFAF9`. Una sola theme en Fase 1.

---

## Info architecture (rutas)

```
/login
/                 → Hoy (redirige a /login si anon)
/sesion/[b]/[d]  → Detalle
/ruta             → 6 bloques
/ruta/[b]         → días del bloque
/cuenta
```

Middleware: rutas app requieren auth + allowlist.

---

## Contenido seed

Parsear la agenda:
- 6 bloques: (30, 30, 20, 22, 15, 22) = **139** sesiones.
- Por sesión: horas, título, descripción (párrafo bajo el heading), URLs en el párrafo.
- Bloques 2 y 6 tienen certificación en día concreto — mostrar en card de bloque y chip en ese día.

IA opcional / “Qué no entra” del markdown: **fuera de Fase 1** (no trackear).

---

## Criterios de done (UX → Dev)

- [ ] Login + rechazo allowlist
- [ ] Hoy = siempre la siguiente sesión real
- [ ] Detalle con links y checkbox solo en current
- [ ] Ruta con 6 bloques y progress correcto
- [ ] No se puede marcar un día futuro
- [ ] Undo solo del último
- [ ] Usable a 390px
- [ ] Copy ES

---

## Fuera de scope Fase 1

Notas por sesión, recordatorios push, calendario vs número de sesión, multi-device sync UI especial (Supabase ya sincroniza), modo offline, export PDF, dark/light toggle, i18n EN.

---

## Fase 1.1 — Preguntar a Grok ($0)

Sin API. CTA externo que abre la sub de Grok del usuario con contexto de la sesión.

### Placement
- **Detalle sesión** (primario): debajo de Material, encima del sticky “Marcar como hecha”. Secundario outline/ghost, no compite con el checkbox.
- **Hoy** (opcional, mismo estilo): debajo del CTA Empezar — solo si no alarga la card; si duda, solo en Detalle.

Label: **Preguntar a Grok**  
Helper (1 línea muted): “Abre Grok con el contexto de esta sesión (tu suscripción).”

### Comportamiento
1. Preferido: `https://grok.com/?q=` + prompt URL-encoded (`target=_blank`, `rel="noopener noreferrer"`).
2. Fallback si `?q=` falla en prueba de Dev: copiar prompt al clipboard + toast “Prompt copiado” + abrir `https://grok.com/` sin query.
3. Dominio fijo `https://grok.com` — no open redirect.
4. Prompt = solo curriculum (bloque, día, horas, título, descripción, links https). **Nunca** email, user_id ni progreso.

### Plantilla de prompt (ES)

```
Sos mi tutor de estudio para la ruta Cloud Security Architect.

Sesión: Bloque {N} — {título_bloque} · Día {D} · {horas} h
Título: {título_sesión}
Descripción:
{descripción}

Material:
- {url1}
- {url2}

Ayudame a completar esta sesión: explicá el mínimo necesario, un orden de pasos concreto, y qué debo poder demostrar al terminar. Sé directo. No inventes links.
```

Cap práctico: si el `q` supera ~1800 chars, truncar descripción con “…” y mantener título + links.

### Fuera de 1.1
Chat embebido, historial en la app, API xAI, multi-modelo.
