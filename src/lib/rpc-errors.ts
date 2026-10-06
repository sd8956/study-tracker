// Traduce los errores de las funciones SQL a mensajes en español.

const MESSAGES: Record<string, string> = {
  not_current_session: "Solo puedes marcar el día actual.",
  not_last_session: "Solo puedes desmarcar el último día completado.",
  route_complete: "La ruta ya está completa.",
  nothing_to_undo: "No hay nada que deshacer.",
  progress_is_immutable: "El progreso no se puede editar.",
  not_authenticated: "Tu sesión expiró. Vuelve a entrar.",
};

export const GENERIC_ERROR = "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.";

export function rpcErrorMessage(error: { message?: string | null } | null | undefined): string {
  const msg = error?.message ?? "";
  for (const [code, text] of Object.entries(MESSAGES)) {
    if (msg.includes(code)) return text;
  }
  return GENERIC_ERROR;
}
