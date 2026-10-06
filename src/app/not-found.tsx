import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-md px-4 pt-16">
      <h1 className="text-xl font-semibold">No encontrado.</h1>
      <p className="mt-1 text-[15px] text-stone-600">Esta página o sesión no existe.</p>
      <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-xl bg-accent px-4 text-sm font-medium text-white">
        Volver a Hoy
      </Link>
    </main>
  );
}
