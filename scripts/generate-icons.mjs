import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const OUT = join(process.cwd(), "public", "icons");
mkdirSync(OUT, { recursive: true });

// Building2 icon path from lucide-react, on rounded-square blue background
const baseSvg = (size, padding = 0.18, bg = "#2563eb", fg = "#fff", rounded = true) => {
  const radius = rounded ? size * 0.22 : 0;
  const inner = size * (1 - padding * 2);
  const offset = size * padding;
  // Building2 icon (24×24 viewBox), scaled to inner size
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>
  <g transform="translate(${offset},${offset}) scale(${inner / 24})" fill="none" stroke="${fg}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
    <path d="M10 6h4"/>
    <path d="M10 10h4"/>
    <path d="M10 14h4"/>
    <path d="M10 18h4"/>
  </g>
</svg>`;
};

// Maskable: full-bleed background, icon padded to safe area (10% inset)
const maskableSvg = (size) => baseSvg(size, 0.22, "#2563eb", "#fff", false);

const tasks = [
  { name: "icon-192.png", svg: baseSvg(192), size: 192 },
  { name: "icon-512.png", svg: baseSvg(512), size: 512 },
  { name: "icon-maskable-192.png", svg: maskableSvg(192), size: 192 },
  { name: "icon-maskable-512.png", svg: maskableSvg(512), size: 512 },
  { name: "apple-touch-icon.png", svg: baseSvg(180), size: 180 },
  { name: "favicon-32.png", svg: baseSvg(32, 0.12), size: 32 },
];

for (const t of tasks) {
  await sharp(Buffer.from(t.svg))
    .resize(t.size, t.size)
    .png()
    .toFile(join(OUT, t.name));
  console.log("✓", t.name);
}

// Save SVG for high-DPI displays
writeFileSync(join(OUT, "icon.svg"), baseSvg(512));
console.log("✓ icon.svg");

console.log("\n✅ Icons generated in public/icons/");
