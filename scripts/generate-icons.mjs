// Renders the app icon set into public/icons: node scripts/generate-icons.mjs
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const OUT = "public/icons";
const R = 150;
const C = (2 * Math.PI * R).toFixed(1);

/** `scale` shrinks the ring for maskable icons; `radius` rounds the tile (0 = full bleed). */
function icon({ scale = 1, radius = 116 }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#16243d"/>
      <stop offset="1" stop-color="#0a101c"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${radius}" fill="url(#bg)"/>
  <g fill="none" stroke-width="60" stroke-linecap="round"
     transform="translate(256 256) scale(${scale}) rotate(-90) translate(-256 -256)">
    <circle cx="256" cy="256" r="${R}" stroke="#f2b550" stroke-dasharray="305 ${C}" stroke-dashoffset="0"/>
    <circle cx="256" cy="256" r="${R}" stroke="#7088ff" stroke-dasharray="237 ${C}" stroke-dashoffset="-393"/>
    <circle cx="256" cy="256" r="${R}" stroke="#3ccdb6" stroke-dasharray="136 ${C}" stroke-dashoffset="-718"/>
  </g>
</svg>`;
}

const png = (svg, size) => sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png().toBuffer();

await mkdir(OUT, { recursive: true });
const rounded = icon({});
// iOS and maskable launchers apply their own mask, so those tiles are full bleed.
const fullBleed = icon({ radius: 0, scale: 0.92 });
const maskable = icon({ radius: 0, scale: 0.72 });

await writeFile(`${OUT}/favicon.svg`, rounded);
await writeFile(`${OUT}/favicon-32.png`, await png(rounded, 32));
await writeFile(`${OUT}/icon-192.png`, await png(rounded, 192));
await writeFile(`${OUT}/icon-512.png`, await png(rounded, 512));
await writeFile(`${OUT}/maskable-512.png`, await png(maskable, 512));
await writeFile(`${OUT}/apple-touch-icon.png`, await png(fullBleed, 180));

// favicon.ico for browsers that still request it: a single PNG-encoded 48px entry.
const ico = await png(rounded, 48);
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // image count
header.writeUInt8(48, 6); // width
header.writeUInt8(48, 7); // height
header.writeUInt16LE(1, 10); // color planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(ico.length, 14);
header.writeUInt32LE(22, 18); // offset of image data
await writeFile("public/favicon.ico", Buffer.concat([header, ico]));

console.log("Icons written to", OUT);
