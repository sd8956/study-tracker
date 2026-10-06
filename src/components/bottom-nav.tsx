"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountIcon, RouteIcon, TodayIcon } from "./icons";

const ITEMS = [
  { href: "/", label: "Hoy", Icon: TodayIcon, match: (p: string) => p === "/" },
  { href: "/ruta", label: "Ruta", Icon: RouteIcon, match: (p: string) => p.startsWith("/ruta") },
  { href: "/cuenta", label: "Cuenta", Icon: AccountIcon, match: (p: string) => p.startsWith("/cuenta") },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid h-16 max-w-md grid-cols-3">
        {ITEMS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-0.5 text-xs ${
                  active ? "font-semibold text-accent" : "text-stone-600 hover:text-ink"
                }`}
              >
                <Icon />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
