# Study Tracker

App personal para seguir la ruta **Cloud Security Architect**: 6 bloques, 139 sesiones secuenciales.
Solo un usuario (allowlist de email) puede entrar y marcar progreso. Stack de $0: **Vercel Hobby + Supabase Free**.

- Next.js 16 (App Router, TypeScript) + Tailwind 4
- Supabase Auth (magic link, sin contraseñas) + Postgres con RLS
- Reglas en el servidor y en la base de datos: no se salta días; solo se deshace el último

## Estructura

```
content/agenda.md                   Agenda fuente (markdown)
scripts/agenda-parser.mjs           Parser puro (con tests)
scripts/parse-agenda.mjs            CLI: content/agenda.md -> supabase/seed.sql
supabase/migrations/*.sql           Esquema, RLS, trigger de reglas y funciones RPC
supabase/seed.sql                   GENERADO: 6 bloques + 139 sesiones (idempotente)
supabase/tests/                     Tests de migraciones/RLS sobre PGlite (Postgres en WASM)
scripts/dev/fake-supabase.mjs       Solo local: simula Supabase para previsualizar sin proyecto
src/proxy.ts                        Guard: refresca sesión, exige login + allowlist
src/app/login, src/app/auth/confirm Login por magic link y destino del enlace
src/app/(app)/                      Hoy, Detalle, Ruta, Lista de días, Cuenta + server actions
src/app/api/cron/keepalive          Ping para que Supabase Free no se pause
```

## 1. Crear el proyecto en Supabase

1. En <https://supabase.com> crea un proyecto (plan Free). Guarda la contraseña de la base de datos.
2. **SQL Editor → New query**: pega y ejecuta el contenido de
   `supabase/migrations/20261005000001_schema.sql`.
3. **SQL Editor → New query**: pega y ejecuta `supabase/seed.sql`.
   Comprueba: `select count(*) from public.sessions;` → **139**.
   (El seed es idempotente: si cambias la agenda, regenera con `npm run seed` y vuelve a ejecutarlo.
   Nunca toca el progreso.)
4. **Project Settings → API Keys**: copia la *Project URL* y la clave pública
   (`anon` legacy o `publishable`). **No** uses la `service_role`/`secret` en esta app.

## 2. Configurar Auth (magic link, sin signup)

En **Authentication** del dashboard:

1. **Users → Add user → Create new user**: tu email, marca *Auto Confirm User*
   (la contraseña da igual, no se usa). La app pide el enlace con `shouldCreateUser: false`,
   así que el usuario tiene que existir antes.
2. **Sign In / Providers**:
   - *Email* habilitado (magic link / OTP).
   - Desactiva **Allow new users to sign up**. Así nadie puede crear cuentas aunque llame
     a la API de Supabase directamente (la allowlist de la app es la segunda barrera).
3. **URL Configuration**:
   - *Site URL*: `https://<tu-app>.vercel.app`
   - *Redirect URLs*: `https://<tu-app>.vercel.app/auth/confirm` y
     `http://localhost:3000/auth/confirm`
4. **Emails → Templates → Magic Link** (recomendado): cambia el enlace por

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Entrar a Study Tracker</a>
   ```

   Con esta plantilla el enlace funciona aunque lo abras en otro dispositivo (p. ej. pides el
   enlace en el portátil y lo abres en el móvil). Con la plantilla por defecto también funciona,
   pero solo en el mismo navegador que pidió el enlace (flujo PKCE).
5. Correo: el SMTP incluido en Supabase solo envía a emails que sean **miembros del equipo de la
   organización** de Supabase y tiene un límite bajo (≈2 correos/hora). Para un único usuario que
   es el dueño del proyecto basta. Si necesitas más, configura un SMTP propio.

## 3. Variables de entorno

Ver `.env.example`.

| Variable | Dónde | Descripción |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | pública | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | pública | clave anon / publishable |
| `ALLOWED_EMAILS` | **solo servidor** | emails permitidos, separados por coma. Vacía = nadie entra |
| `CRON_SECRET` | **solo servidor** | ≥16 caracteres aleatorios (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_SITE_URL` | pública | `https://<tu-app>.vercel.app` (local: `http://localhost:3000`) |

No hay `SUPABASE_SERVICE_ROLE_KEY`: todo se escribe con la sesión del usuario y RLS.

## 4. Desplegar en Vercel (Hobby)

1. Sube el repo a GitHub (privado) e impórtalo en Vercel (*Add New → Project*). Framework: Next.js.
2. Añade las 5 variables de la tabla en *Settings → Environment Variables* (Production y Preview).
3. Deploy. Después actualiza en Supabase la *Site URL* y las *Redirect URLs* con el dominio final
   si cambió, y `NEXT_PUBLIC_SITE_URL` en Vercel (redeploy).
4. El cron de `vercel.json` llama a `/api/cron/keepalive` lunes y jueves a las 13:00 UTC
   (08:00 en Bogotá). Vercel envía `Authorization: Bearer $CRON_SECRET` automáticamente.
   Supabase Free pausa proyectos tras ~7 días sin actividad; dos pings por semana lo evitan.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # rellena con tu proyecto Supabase
npm run dev                  # http://localhost:3000
```

Sin proyecto Supabase puedes previsualizar con el simulador local (solo desarrollo; no verifica JWT):

```bash
npm run dev:fake-supabase    # imprime una cookie de sesión para santiago@example.com
# .env.local:
#   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=dev-anon-key
#   ALLOWED_EMAILS=santiago@example.com
npm run dev
# En el navegador, crea la cookie impresa (sb-localhost-auth-token=...) para localhost.
```

### Calidad

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest: parser, allowlist, reglas TS, cron, y migraciones+RLS en PGlite
npm run build
```

## Reglas y seguridad

- **Allowlist fail-closed** (`ALLOWED_EMAILS`, solo servidor): se comprueba antes de enviar el
  magic link (server action), al volver del enlace (`/auth/confirm`), en el proxy en cada request
  (si la sesión no está permitida se cierra) y otra vez en cada página y server action.
- **RLS**: `blocks`/`sessions` solo lectura para `authenticated`; `progress` solo filas propias
  (`user_id = auth.uid()`) para select/insert/delete. `anon` no tiene privilegios sobre ninguna
  tabla. No hay UPDATE ni TRUNCATE para los roles de la API.
- **Secuencia en Postgres**: el trigger `enforce_progress_rules` permite insertar solo la sesión
  `current` (primera sin completar) y borrar solo la última completada, con un advisory lock por
  usuario (doble tap / dos pestañas). Vale también para escrituras directas vía API, no solo para
  las RPC `complete_next_session(p_session_id)` y `undo_last_session(p_session_id)`.
- `completed_at` lo fija el servidor (`now()`).
- Desde el SQL Editor (rol `postgres`) las reglas no aplican: sirve para correcciones manuales.

## Regenerar el seed

```bash
npm run seed   # content/agenda.md -> supabase/seed.sql (valida 6 bloques / días declarados)
```
