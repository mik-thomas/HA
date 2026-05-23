import { Badge } from "@/components/ui/Badge";
import type { DevicePowerStatus, EntityStateInfo } from "@/lib/ha/types";

function PowerDot({ variant }: { variant: "on" | "off" | "mixed" | "other" }) {
  const className =
    variant === "on"
      ? "power-dot-on"
      : variant === "off"
        ? "power-dot-off"
        : variant === "mixed"
          ? "bg-warning shadow-[0_0_6px_rgba(251,191,36,0.6)]"
          : "bg-danger";

  return (
    <span
      className={`mr-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${className}`}
      aria-hidden
    />
  );
}

export function PowerBadge({ status }: { status: DevicePowerStatus }) {
  if (status === "none") return null;

  const labels: Record<DevicePowerStatus, string> = {
    on: "On",
    off: "Off",
    mixed: "Mixed",
    unavailable: "Unavailable",
    none: "—",
  };

  if (status === "on") {
    return (
      <span className="power-badge-on inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
        <PowerDot variant="on" />
        {labels.on}
      </span>
    );
  }

  if (status === "off") {
    return (
      <span className="power-badge-off inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
        <PowerDot variant="off" />
        {labels.off}
      </span>
    );
  }

  const tone = status === "mixed" ? "warning" : "danger";
  return (
    <Badge tone={tone}>
      <PowerDot variant={status === "mixed" ? "mixed" : "other"} />
      {labels[status]}
    </Badge>
  );
}

export function EntityPowerBadge({ info }: { info: EntityStateInfo }) {
  if (info.isOn === null) return null;

  if (info.isOn) {
    return (
      <span className="power-badge-on inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
        <PowerDot variant="on" />
        On
      </span>
    );
  }

  return (
    <span className="power-badge-off inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
      <PowerDot variant="off" />
      Off
    </span>
  );
}
