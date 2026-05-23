import type { HaAutomation, HaState } from "./types";

export function parseAutomation(state: HaState): HaAutomation {
  const attrs = state.attributes ?? {};
  const current =
    typeof attrs.current === "number" ? attrs.current : Number(attrs.current) || 0;

  return {
    entity_id: state.entity_id,
    config_id: typeof attrs.id === "string" ? attrs.id : null,
    friendly_name:
      typeof attrs.friendly_name === "string"
        ? attrs.friendly_name
        : state.entity_id.replace(/^automation\./, "").replace(/_/g, " "),
    enabled: state.state === "on",
    running: current > 0,
    running_count: current,
    mode: typeof attrs.mode === "string" ? attrs.mode : null,
    last_triggered:
      typeof attrs.last_triggered === "string" ? attrs.last_triggered : null,
    state: state.state,
  };
}

export function automationsFromStates(states: HaState[]): HaAutomation[] {
  return states
    .filter((s) => s.entity_id.startsWith("automation."))
    .map(parseAutomation)
    .sort((a, b) => a.friendly_name.localeCompare(b.friendly_name));
}
