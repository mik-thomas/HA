import {
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

export function Input({
  label,
  hint,
  icon,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">
          {label}
        </span>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        )}
        <input
          className={`h-10 w-full rounded-xl border border-border bg-background-elevated/80 px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-accent/50 focus:ring-2 focus:ring-accent/20 ${icon ? "pl-10" : ""} ${className}`}
          {...props}
        />
      </div>
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function Select({
  label,
  children,
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">
          {label}
        </span>
      )}
      <select
        className={`h-10 w-full appearance-none rounded-xl border border-border bg-background-elevated/80 px-3 text-sm text-foreground outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/20 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
