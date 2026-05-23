"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconDevices, IconHome, IconLayers, IconMap, IconScan, IconTag } from "@/components/icons";

const links = [
  { href: "/", label: "Devices", icon: IconDevices },
  { href: "/organize", label: "Organize", icon: IconLayers },
  { href: "/scan", label: "Scan", icon: IconScan },
  { href: "/labels", label: "Labels", icon: IconTag },
  { href: "/areas", label: "Areas", icon: IconMap },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-dim text-accent ring-1 ring-accent/25 transition group-hover:ring-accent/50">
            <IconHome className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-muted uppercase">
              Home Assistant
            </p>
            <p className="text-sm font-semibold text-foreground">Device Manager</p>
          </div>
        </Link>

        <nav className="flex items-center gap-1 rounded-xl border border-border bg-card-solid/60 p-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" || pathname.startsWith("/devices") : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  active
                    ? "bg-accent text-slate-950 shadow-sm"
                    : "text-muted hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
