const AVATAR_PALETTES = [
  { bg: "#e8f4fd", fg: "#1d6fa3" },
  { bg: "#fce8f3", fg: "#be185d" },
  { bg: "#e7f8ef", fg: "#15803d" },
  { bg: "#fff4e5", fg: "#c47a00" },
  { bg: "#ede9fe", fg: "#6d28d9" },
  { bg: "#e0f2fe", fg: "#0369a1" },
] as const;

export function avatarColorsForName(name: string) {
  const trimmed = name.trim();
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash + trimmed.charCodeAt(i) * (i + 1)) % 9973;
  }
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length]!;
}
