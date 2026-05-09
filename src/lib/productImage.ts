// Returns a public illustrative image URL for a product name.
// Uses pollinations.ai (free, no API key) to generate a clean square image.
// Cached on their CDN by prompt, so repeated names return the same image.

const EMOJI_MAP: Record<string, string> = {
  tomate: "🍅",
  banana: "🍌",
  maca: "🍎",
  maçã: "🍎",
  laranja: "🍊",
  limao: "🍋",
  limão: "🍋",
  uva: "🍇",
  morango: "🍓",
  abacaxi: "🍍",
  manga: "🥭",
  melancia: "🍉",
  pera: "🍐",
  abacate: "🥑",
  cenoura: "🥕",
  batata: "🥔",
  milho: "🌽",
  pimentao: "🫑",
  pimentão: "🫑",
  cebola: "🧅",
  alho: "🧄",
  alface: "🥬",
  couve: "🥬",
  brocolis: "🥦",
  brócolis: "🥦",
  pepino: "🥒",
  berinjela: "🍆",
  ovo: "🥚",
  pao: "🍞",
  pão: "🍞",
  queijo: "🧀",
  leite: "🥛",
  feijao: "🫘",
  feijão: "🫘",
  arroz: "🍚",
  coco: "🥥",
  mamao: "🥭",
  mamão: "🥭",
  cogumelo: "🍄",
};

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getProductEmoji(name: string): string | null {
  const n = norm(name);
  if (EMOJI_MAP[n]) return EMOJI_MAP[n];
  // partial match
  for (const key of Object.keys(EMOJI_MAP)) {
    if (n.includes(key) || key.includes(n)) return EMOJI_MAP[key];
  }
  return null;
}

export function getProductImageUrl(name: string): string {
  const clean = encodeURIComponent(name.trim());
  // Pollinations free image generation, square illustrative image
  return `https://image.pollinations.ai/prompt/${clean}%20fresh%20produce%20isolated%20on%20white%20background%20product%20photo?width=128&height=128&nologo=true`;
}
