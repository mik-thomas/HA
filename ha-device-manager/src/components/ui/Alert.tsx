import { IconAlert, IconCheck } from "@/components/icons";
import { Button } from "./Button";

type Variant = "error" | "success" | "info";

const styles: Record<Variant, { box: string; icon: string }> = {
  error: {
    box: "border-danger/30 bg-danger/8",
    icon: "text-danger",
  },
  success: {
    box: "border-success/30 bg-emerald-500/8",
    icon: "text-success",
  },
  info: {
    box: "border-accent/30 bg-accent-dim",
    icon: "text-accent",
  },
};

export function Alert({
  variant = "info",
  title,
  children,
  onRetry,
}: {
  variant?: Variant;
  title: string;
  children?: React.ReactNode;
  onRetry?: () => void;
}) {
  const s = styles[variant];
  const Icon = variant === "success" ? IconCheck : IconAlert;

  return (
    <div className={`animate-in rounded-2xl border p-5 ${s.box}`}>
      <div className="flex gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.icon}`} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{title}</p>
          {children && <p className="mt-1.5 text-sm text-muted">{children}</p>}
          {onRetry && (
            <Button variant="primary" size="sm" className="mt-4" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Toast({
  message,
  variant = "success",
}: {
  message: string;
  variant?: "success" | "error";
}) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-2xl animate-in ${
        variant === "success"
          ? "border-success/30 bg-card-solid text-foreground"
          : "border-danger/30 bg-card-solid text-foreground"
      }`}
      role="status"
    >
      {variant === "success" ? (
        <IconCheck className="h-4 w-4 text-success" />
      ) : (
        <IconAlert className="h-4 w-4 text-danger" />
      )}
      {message}
    </div>
  );
}
