import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-slate-950 shadow-[0_0_24px_-4px_var(--accent-glow)] hover:brightness-110",
  secondary:
    "border border-border-strong bg-card-solid/80 text-foreground hover:border-accent/40 hover:bg-accent-dim",
  ghost: "text-muted hover:bg-white/5 hover:text-foreground",
  danger:
    "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20",
};

const sizes: Record<"sm" | "md", string> = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-10 gap-2 px-4 text-sm",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-45 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
