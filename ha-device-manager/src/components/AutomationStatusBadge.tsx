import { Badge } from "@/components/ui/Badge";
import type { HaAutomation } from "@/lib/ha/types";

export function AutomationStatusBadge({ automation }: { automation: HaAutomation }) {
  if (automation.running) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/15 px-2.5 py-0.5 text-xs font-medium text-warning">
        <span className="power-dot-on h-1.5 w-1.5 rounded-full bg-warning" />
        Running
      </span>
    );
  }

  if (automation.enabled) {
    return (
      <span className="power-badge-on inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
        <span className="power-dot-on mr-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full" />
        Enabled
      </span>
    );
  }

  return (
    <span className="power-badge-off inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
      <span className="power-dot-off mr-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full" />
      Disabled
    </span>
  );
}

export function AutomationModeBadge({ mode }: { mode: string | null }) {
  if (!mode) return null;
  return <Badge tone="accent">{mode}</Badge>;
}
