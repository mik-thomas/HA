import { type ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  stats,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  stats?: ReactNode;
}) {
  return (
    <header className="mb-8 animate-in">
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-accent uppercase">
          {eyebrow}
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-base leading-relaxed text-muted">{description}</p>
          )}
        </div>
        {stats}
      </div>
    </header>
  );
}

export function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-panel rounded-xl px-4 py-3 text-center min-w-[100px]">
      <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}
