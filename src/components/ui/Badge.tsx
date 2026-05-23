type Tone = "default" | "accent" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  default: "bg-white/6 text-muted border-white/8",
  accent: "bg-accent-dim text-accent border-accent/20",
  success: "bg-emerald-500/12 text-success border-emerald-500/20",
  warning: "bg-amber-500/12 text-warning border-amber-500/20",
  danger: "bg-red-500/12 text-danger border-red-500/20",
};

export function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
