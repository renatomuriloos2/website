// Procedural SVG artwork for demo mode: supplier logos, fabric swatches and
// specimen "photos". Returned as data: URLs so the demo needs no file storage.

const enc = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export function logoSvg(initials: string, a: string, b: string, shape: "hex" | "circle" | "shield" | "square" = "hex"): string {
  const shapes = {
    hex: `<polygon points="60,6 108,33 108,87 60,114 12,87 12,33" fill="url(#g)"/>`,
    circle: `<circle cx="60" cy="60" r="54" fill="url(#g)"/>`,
    shield: `<path d="M60 6 L106 22 V60 C106 88 86 106 60 114 C34 106 14 88 14 60 V22 Z" fill="url(#g)"/>`,
    square: `<rect x="10" y="10" width="100" height="100" rx="26" fill="url(#g)"/>`,
  };
  return enc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>${shapes[shape]}<text x="60" y="73" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="38" fill="#fff" text-anchor="middle" letter-spacing="-1">${initials}</text></svg>`);
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  const r = c(n >> 16), g = c((n >> 8) & 255), b = c(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function swatchSvg(hex: string, construction: string): string {
  const light = shade(hex, 28);
  const dark = shade(hex, -26);
  const c = construction.toLowerCase();
  let pattern: string;
  if (c.includes("mesh")) {
    pattern = `<pattern id="p" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="${hex}"/><circle cx="7" cy="7" r="3.2" fill="${dark}"/><circle cx="0" cy="0" r="1.6" fill="${light}"/><circle cx="14" cy="14" r="1.6" fill="${light}"/></pattern>`;
  } else if (c.includes("pique") || c.includes("piqué")) {
    pattern = `<pattern id="p" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${hex}"/><rect x="1" y="1" width="3.5" height="3.5" rx="1" fill="${dark}"/><rect x="6" y="6" width="3.5" height="3.5" rx="1" fill="${dark}"/></pattern>`;
  } else if (c.includes("fleece")) {
    pattern = `<pattern id="p" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${hex}"/><circle cx="2" cy="3" r="1.4" fill="${light}" opacity=".6"/><circle cx="6" cy="6" r="1.2" fill="${dark}" opacity=".6"/></pattern>`;
  } else {
    // jersey / interlock / double knit: V-stitch columns
    pattern = `<pattern id="p" width="8" height="10" patternUnits="userSpaceOnUse"><rect width="8" height="10" fill="${hex}"/><path d="M0 0 L4 6 L8 0" stroke="${light}" stroke-width="1.6" fill="none" opacity=".75"/><path d="M0 4 L4 10 L8 4" stroke="${dark}" stroke-width="1.2" fill="none" opacity=".7"/></pattern>`;
  }
  return enc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><defs>${pattern}<radialGradient id="v" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></radialGradient></defs><rect width="320" height="220" fill="url(#p)"/><rect width="320" height="220" fill="url(#v)"/></svg>`);
}

/** Specimen photo: fabric with a white printed square showing the given amount of bleed (grade 1–5). */
export function specimenSvg(hex: string, grade: number, label: string): string {
  const bleed = Math.max(0, Math.min(1, (5 - grade) / 4));
  const tint = shade(hex, 120);
  return enc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><defs><radialGradient id="v" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient></defs><rect width="320" height="220" fill="${hex}"/><rect x="95" y="45" width="130" height="130" rx="4" fill="#fbfbf8"/><rect x="95" y="45" width="130" height="130" rx="4" fill="${tint}" opacity="${(bleed * 0.85).toFixed(2)}"/><rect width="320" height="220" fill="url(#v)"/><rect x="10" y="190" width="300" height="22" rx="4" fill="#000" opacity=".55"/><text x="18" y="205" font-family="Arial" font-size="12" fill="#fff">${label}</text></svg>`);
}

/** Decorated garment photo for wash trials: after washing, the print shows cracks / fading by grade. */
export function garmentSvg(hex: string, label: string, washed: boolean, grade: number, printHex = "#FBFBF8"): string {
  const damage = washed ? Math.max(0, Math.min(1, (5 - grade) / 3)) : 0;
  const cracks = Array.from({ length: Math.round(damage * 14) }, (_, i) => {
    const x = 120 + ((i * 37) % 90);
    const y = 92 + ((i * 53) % 70);
    return `<path d="M${x} ${y} l${6 + (i % 5)} ${8 - (i % 7)} l${5 - (i % 4)} ${7 + (i % 3)}" stroke="${hex}" stroke-width="1.6" fill="none" opacity=".8"/>`;
  }).join("");
  const fade = washed ? (0.15 + damage * 0.45).toFixed(2) : "0";
  return enc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240"><rect width="320" height="240" fill="#EEF0F3"/><path d="M95 30 L135 18 Q160 34 185 18 L225 30 L275 70 L250 102 L230 90 L230 222 L90 222 L90 90 L70 102 L45 70 Z" fill="${hex}" stroke="#00000033" stroke-width="2"/><path d="M135 18 Q160 40 185 18" fill="none" stroke="#00000044" stroke-width="2"/><g><rect x="118" y="88" width="84" height="80" rx="4" fill="${printHex}"/><text x="160" y="140" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="44" fill="${hex}">23</text><rect x="118" y="88" width="84" height="80" rx="4" fill="${hex}" opacity="${fade}"/>${cracks}</g><rect x="8" y="212" width="304" height="22" rx="4" fill="#000" opacity=".55"/><text x="16" y="227" font-family="Arial" font-size="11" fill="#fff">${washed ? "AFTER" : "BEFORE"} · ${label}</text></svg>`);
}
