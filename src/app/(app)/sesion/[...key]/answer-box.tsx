"use client";

import { MicButton } from "@/components/mic-button";

/** Textarea + dictation. Dictated text is appended to what is already written. */
export function AnswerBox({
  id,
  value,
  onChange,
  tutorEnabled,
  placeholder = "Tu respuesta, sin mirar…",
  rows = 4,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  tutorEnabled: boolean;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="sr-only">
        Respuesta
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-[15px] leading-relaxed placeholder:text-stone-400 disabled:bg-stone-50"
      />
      {tutorEnabled ? (
        <MicButton disabled={disabled} onText={(t) => onChange(value.trim() ? `${value.trim()} ${t}` : t)} />
      ) : null}
    </div>
  );
}
