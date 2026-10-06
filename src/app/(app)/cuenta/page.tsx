import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { signOutAction } from "../actions";

export const metadata: Metadata = { title: "Cuenta · Study Tracker" };

export default async function CuentaPage() {
  const { user } = await requireUser();

  return (
    <main>
      <h1 className="text-xl font-semibold">Cuenta</h1>
      <section className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
        <p className="text-sm text-stone-600">Correo</p>
        <p className="mt-0.5 break-all text-[17px] font-medium">{user.email}</p>
      </section>
      <form action={signOutAction} className="mt-4">
        <button
          type="submit"
          className="h-12 w-full rounded-xl border border-stone-300 bg-white text-base font-medium hover:bg-stone-50"
        >
          Cerrar sesión
        </button>
      </form>
      <p className="mt-6 text-sm text-stone-600">Acceso personal. Sin compartir.</p>
      <p className="mt-1 text-xs text-stone-600">Study Tracker v0.1.0</p>
    </main>
  );
}
