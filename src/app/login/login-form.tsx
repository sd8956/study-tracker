"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

const initial: LoginState = { status: "idle", message: "" };

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState(sendMagicLink, initial);
  const error = state.status === "error" ? state.message : state.status === "idle" ? initialError : undefined;

  if (state.status === "sent") {
    return (
      <p role="status" className="rounded-xl border border-stone-200 bg-white p-4 text-[15px] leading-relaxed">
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "login-error" : undefined}
          className="block h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
      </div>
      {error ? (
        <p id="login-error" role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-xl bg-accent px-4 text-base font-medium text-white hover:bg-accent-strong disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Enviar enlace"}
      </button>
    </form>
  );
}
