import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const INK = '#17191c'; // theme.colors.header
const ACCENT = '#c6f24e'; // theme.colors.accent

// Brand mark (rotated paper-plane / compass needle), authored on a 512 grid.
const mark = `
  <g transform="rotate(45 256 256)">
    <path d="M256 80 L320 256 L192 256 Z" fill="${ACCENT}" />
    <path d="M256 432 L320 256 L192 256 Z" fill="${ACCENT}" fill-opacity="0.4" />
  </g>`;

// Standard icon: rounded square, used for `purpose: any`.
const standardSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${INK}" />
  ${mark}
</svg>`;

const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${INK}" />
  <g transform="translate(256 256) scale(0.6) translate(-256 -256)">${mark}</g>
</svg>`;

async function png(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

async function main() {
  await mkdir(join(root, 'public/icons'), { recursive: true });

  await Promise.all([
    png(standardSvg, 192).then((b) =>
      sharp(b).toFile(join(root, 'public/icons/icon-192.png')),
    ),
    png(standardSvg, 512).then((b) =>
      sharp(b).toFile(join(root, 'public/icons/icon-512.png')),
    ),
    png(maskableSvg, 192).then((b) =>
      sharp(b).toFile(join(root, 'public/icons/maskable-192.png')),
    ),
    png(maskableSvg, 512).then((b) =>
      sharp(b).toFile(join(root, 'public/icons/maskable-512.png')),
    ),
    // Apple touch icon: iOS applies its own mask, so use the full-bleed variant at 180px.
    png(maskableSvg, 180).then((b) =>
      sharp(b).toFile(join(root, 'app/apple-icon.png')),
    ),
  ]);

  console.log('Generated PWA icons in public/icons/ and app/apple-icon.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
