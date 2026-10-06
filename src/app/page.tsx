import { requireUser } from "@/lib/auth";

export default async function Page() {
  const { user } = await requireUser();
  return <main className="p-6">Hola, {user.email}</main>;
}
