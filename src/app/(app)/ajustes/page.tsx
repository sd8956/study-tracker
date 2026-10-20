import type { Metadata } from "next";
import { buttonSecondary } from "@/components/ui";
import { loadAppState } from "@/lib/data";
import { dbPath } from "@/lib/db";
import { getTutorConfig } from "@/lib/tutor";
import { ImportBackup } from "./import-backup";

export const metadata: Metadata = { title: "Ajustes · Study Tracker" };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5 text-[15px]">
      <dt className="text-stone-600">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{value}</dd>
    </div>
  );
}

export default async function AjustesPage() {
  const { tz, plan } = await loadAppState();
  const tutor = getTutorConfig();

  return (
    <main className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold">Ajustes</h1>
      </header>

      <section aria-labelledby="tutor" className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 id="tutor" className="text-lg font-semibold">
          Tutor (NaN Builders)
        </h2>
        <dl className="mt-2 divide-y divide-stone-100">
          <Row label="Configurado" value={tutor ? "Sí" : "No"} />
          {tutor ? (
            <>
              <Row label="Modelo de chat" value={tutor.chatModel} />
              <Row label="Voz a texto" value={tutor.sttModel} />
              <Row label="API" value={tutor.baseUrl} />
            </>
          ) : null}
        </dl>
        {!tutor ? (
          <p className="mt-2 text-[15px] text-stone-600">
            Añade <code>NAN_API_KEY</code> a <code>.env.local</code> y reinicia la app. Sin clave, te autoevalúas con las respuestas modelo.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="datos" className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 id="datos" className="text-lg font-semibold">
          Datos
        </h2>
        <dl className="mt-2 divide-y divide-stone-100">
          <Row label="Base de datos" value={<span title={dbPath()}>{dbPath().split(/[\\/]/).slice(-2).join("/")}</span>} />
          <Row label="Zona horaria" value={tz} />
          <Row label="Sesiones en la ruta" value={plan.sessions.length} />
        </dl>
        <h3 className="mt-5 text-[15px] font-semibold">Copia de seguridad</h3>
        <p className="mt-1 text-[15px] text-stone-600">
          Descarga tu progreso (sesiones, inglés, tarjetas, respuestas, notas y chats) como JSON. Importarlo reemplaza todo lo actual.
        </p>
        <a href="/api/export" download className={`${buttonSecondary} mt-3`}>
          Exportar progreso
        </a>
        <ImportBackup />
      </section>
    </main>
  );
}
