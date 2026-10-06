import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar · Study Tracker" };

const ERRORS: Record<string, string> = {
  no_access: "Este correo no tiene acceso.",
  link: "El enlace no es válido o ya expiró. Pide uno nuevo.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { error } = await searchParams;
  const initialError = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Study Tracker</h1>
      <p className="mt-1 text-[15px] text-stone-600">Ruta Cloud Security Architect</p>
      <div className="mt-10">
        <LoginForm initialError={initialError} />
      </div>
      <p className="mt-8 text-sm text-stone-600">Te enviamos un enlace de acceso. Sin contraseñas.</p>
    </main>
  );
}
