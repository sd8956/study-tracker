// URL helpers shared by server and client components.
export function sessionHref(key: string): string {
  return `/sesion/${key.split("/").map(encodeURIComponent).join("/")}`;
}
