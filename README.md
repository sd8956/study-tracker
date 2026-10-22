# Study Tracker

Plan de estudio personal que corre **en tu equipo**. Abres la web y ves qué toca hoy:

1. **Inglés**: temporizador de 60 minutos con aviso sonoro; luego lo marcas como hecho.
2. **Repaso**: tarjetas de repetición espaciada (Leitner) que vencen hoy, unos 15 minutos.
3. **Sesión técnica**: la siguiente sesión de la ruta, con guía de estudio, preguntas de repaso,
   ejercicio, explicación Feynman y tutor.

La ruta sigue `content/plan-order.txt`: primero los módulos de libros y repos, después DataCamp (con el
libro de AI Engineering justo antes de los tracks de IA) y Scrimba, y al final los 6 bloques de
**Cloud Security** (139 sesiones). Lunes a viernes 2 h de ruta, sábado 3 h, domingo descanso. Las sesiones
son secuenciales y se reparten por horas: una sesión de 3 h puede ocupar dos días de semana
("Avancé X h hoy" en Hoy) y la siguiente empieza en las horas que quedan. Cada sesión es un "Día N" de la ruta (sin fechas previstas): si un día no estudias, el siguiente número espera.

- Next.js 16 (App Router, TypeScript) + Tailwind 4
- SQLite con `node:sqlite` (sin servicios externos, sin login)
- Tutor opcional con NaN Builders: evalúa respuestas, chat por sesión y voz a texto

## Requisitos

- Node.js **22.13 o superior** (incluye `node:sqlite`).

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # opcional: añade NAN_API_KEY para el tutor
npm run build
npm start                    # http://127.0.0.1:3000
```

Para desarrollo: `npm run dev`. Las dos órdenes escuchan solo en `127.0.0.1`.

La base de datos se crea sola en `data/study.db` (la carpeta está en `.gitignore`).
`STUDY_DB_PATH` cambia la ruta y `STUDY_TZ` la zona horaria (por defecto `America/Bogota`).

## Tutor (NaN Builders)

En `.env.local`:

| Variable | Por defecto | Descripción |
| --- | --- | --- |
| `NAN_API_KEY` | — | Clave de NaN Builders. **Solo servidor**: nunca llega al navegador ni a los logs |
| `NAN_BASE_URL` | `https://api.nan.builders/v1` | API compatible con OpenAI |
| `NAN_CHAT_MODEL` | `deepseek-v4-flash` | Modelo para evaluar y conversar |
| `NAN_STT_MODEL` | `whisper` | Modelo de voz a texto |

Con clave aparecen el botón de micrófono, **Evaluar con tutor** y el chat de cada sesión. El
servidor busca la pregunta y la respuesta modelo en el contenido (no confía en lo que mande el
navegador), pide una nota de 0 a 10 con feedback y la guarda. Sin clave, la app oculta esas
opciones y te autoevalúas con las respuestas modelo.

## Contenido

```
content/agenda.md                 Ruta Cloud Security (6 bloques, al final según plan-order.txt)
content/plan-order.txt            Orden de estudio: un módulo o bloque cloud-bN por línea
content/modules/NN-tema/          Un módulo: module.md + una sesión por archivo NN-slug.md
docs/CONTENT-FORMAT.md            Contrato del formato (secciones, preguntas, links)
```

La app lee `content/` en cada carga (si cambias un archivo, se recarga solo). La clave de una
sesión es `<módulo>/<archivo>`: **no renumeres** archivos de sesiones ya hechas, añade al final.
Si un archivo no cumple el formato, `npm test` dice cuál y por qué.

## Pantallas

- **Hoy** (`/`): inglés, repaso y sesión del día. El domingo, descanso.
- **Ruta** (`/ruta`): fases → módulos → sesiones con estado (hecha y fecha, actual, fecha prevista).
- **Sesión** (`/sesion/<módulo>/<archivo>`): guía, preguntas en modo recuerdo activo, Feynman,
  evaluación (aprobada con ≥ 70 %, no bloquea) y chat con el tutor.
- **Repaso** (`/repaso`): tarjetas que vencen hoy (máx. 15). Bien / Dudé / Mal.
- **Progreso** (`/progreso`): racha, días de inglés, horas, % por fase, evaluaciones, cajas y mapa de 12 semanas.
- **Ajustes** (`/ajustes`): estado del tutor y copia de seguridad.

## Reglas

- Solo se marca la **sesión actual** (la primera sin completar) y solo se deshace la **última
  completada**. Se aplica en el servidor dentro de una transacción (`BEGIN IMMEDIATE`).
- Al marcar una lección o curso, sus preguntas de repaso entran al mazo (caja 1, vence mañana).
  Deshacer quita las tarjetas que todavía no repasaste.
- Leitner: caja 1 → 1 día, 2 → 3, 3 → 7, 4 → 21, 5 → 60. Bien sube de caja; Dudé repite mañana;
  Mal vuelve a la caja 1.
- Sin login: la app solo atiende peticiones dirigidas a `localhost`/`127.0.0.1` (Host) y las
  APIs rechazan con 403 cualquier `Origin` externo.

## Copia de seguridad

En **Ajustes → Exportar progreso** descargas un JSON con todo (progreso, inglés, tarjetas,
respuestas, notas y chats). **Importar** valida el archivo y reemplaza los datos actuales en una
sola transacción. También puedes copiar `data/study.db` con la app detenida.

## Calidad

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest: formato de contenido, reglas, calendario, Leitner, tutor, origen
npm run build
```
