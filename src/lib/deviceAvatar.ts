const PALETTES = [
  ["#38bdf8", "#0ea5e9"],
  ["#a78bfa", "#7c3aed"],
  ["#34d399", "#059669"],
  ["#f472b6", "#db2777"],
  ["#fbbf24", "#d97706"],
  ["#fb7185", "#e11d48"],
  ["#2dd4bf", "#0d9488"],
  ["#818cf8", "#4f46e5"],
];

export function deviceInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name.slice(0, 2) || "??").toUpperCase();
}

export function deviceGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const [a, b] = PALETTES[Math.abs(hash) % PALETTES.length];
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}
