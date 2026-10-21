import Link from "next/link";
import type { Metadata } from "next";
import { loadAppState } from "@/lib/data";
import { getDueCards, listCards } from "@/lib/store";
import { Flashcards, type Flashcard } from "./flashcards";

export const metadata: Metadata = { title: "Repaso · Study Tracker" };

export default async function RepasoPage() {
  const { plan, db, today, tutorEnabled } = await loadAppState();
  const cards: Flashcard[] = getDueCards(db, today).flatMap((c) => {
    const session = plan.byKey.get(c.sessionKey);
    const q = session?.review.find((x) => x.index === c.questionIndex);
    if (!session || !q) return [];
    return [{ cardKey: c.cardKey, sessionKey: c.sessionKey, sessionTitle: session.title, index: q.index, question: q.question, answer: q.answer, box: c.box }];
  });
  const total = listCards(db).length;

  return (
    <main>
      <header>
        <h1 className="text-xl font-semibold">Repaso</h1>
        <p className="mt-1 text-[15px] text-stone-600">
          Repetición espaciada: lo que recuerdas bien vuelve más tarde; lo que fallas, mañana.
        </p>
      </header>
      {cards.length > 0 ? (
        <Flashcards cards={cards} tutorEnabled={tutorEnabled} />
      ) : (
        <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
          <p className="text-[17px] font-semibold">Nada que repasar hoy.</p>
          <p className="mt-1 text-[15px] text-stone-600">
            {total === 0
              ? "Las preguntas de repaso de cada lección entran al mazo cuando marcas la sesión como hecha."
              : `Tienes ${total} tarjetas en el mazo; ninguna vence hoy.`}
          </p>
          <Link href="/" className="mt-4 inline-block text-[15px] font-medium text-accent-strong underline underline-offset-4">
            Volver a Hoy
          </Link>
        </section>
      )}
    </main>
  );
}
