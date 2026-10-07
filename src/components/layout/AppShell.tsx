"use client";

import clsx from "clsx";
import { ArrowLeftRight, LayoutDashboard, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ChatWidget } from "@/components/ai/ChatWidget";
import { Logo } from "./Logo";

const NAV = [
  { href: "/", label: "Огляд", icon: LayoutDashboard },
  { href: "/transactions", label: "Операції", icon: ArrowLeftRight },
  { href: "/settings", label: "Налаштування", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/unlock") {
    return <main className="mx-auto w-full max-w-[1400px] px-4 py-10">{children}</main>;
  }

  const isActive = (href: string) => (href === "/" ? pathname === "/" || pathname.startsWith("/assets") : pathname.startsWith(href));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1400px]">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-8 px-4 py-6 lg:flex">
        <Link href="/" className="flex items-center gap-3 px-2">
          <Logo size={34} />
          <span className="font-display text-xl font-medium tracking-tight">Статки</span>
        </Link>
        <nav aria-label="Основна навігація" className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={clsx(
                "pressable flex h-12 items-center gap-3 rounded-xl px-3 text-base font-medium",
                isActive(href) ? "bg-surface text-ink shadow-sm" : "text-muted hover:bg-surface/60 hover:text-ink",
              )}
            >
              <Icon size={18} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-[calc(env(safe-area-inset-bottom)+6.5rem)] md:px-8 md:pt-8 lg:pb-28">
        {children}
      </main>

      <nav
        aria-label="Основна навігація"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
      >
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={clsx(
              "pressable flex h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium",
              isActive(href) ? "text-accent" : "text-muted",
            )}
          >
            <Icon size={21} aria-hidden />
            {label}
          </Link>
        ))}
      </nav>

      <ChatWidget />
    </div>
  );
}
