// One-off generator for simple placeholder dish images (SVG), run manually:
//   node backend/scripts/generate-images.js
const fs = require('node:fs');
const path = require('node:path');

const ICONS = {
  e1: '🍲', e2: '🐌', e3: '🥗', e4: '🍖',
  p1: '🍗', p2: '🍖', p3: '🍆', p4: '🥩', p5: '🦆', p6: '🥧',
  d1: '🍮', d2: '🥧', d3: '🍫', d4: '🍡',
  b1: '🍷', b2: '🥂', b3: '🍾', b4: '☕',
};

const BG_COLORS = {
  e1: '#f4e3c1', e2: '#dce8d5', e3: '#e6f0d8', e4: '#ecd9c6',
  p1: '#f0d9c4', p2: '#e7ccc0', p3: '#d9e8cf', p4: '#e8cfc4', p5: '#e3d4bd', p6: '#f2e2b6',
  d1: '#f7e6c4', d2: '#f0d9b8', d3: '#ddc7bb', d4: '#f2e0d4',
  b1: '#e3c9cf', b2: '#efe9d6', b3: '#e9d9c6', b4: '#e0d3c2',
};

const OUT_DIR = path.join(__dirname, '..', 'public', 'images');
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const [id, emoji] of Object.entries(ICONS)) {
  const bg = BG_COLORS[id] || '#e8e2d4';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <rect width="300" height="200" rx="10" fill="${bg}"/>
  <circle cx="150" cy="88" r="52" fill="#ffffff" fill-opacity="0.55"/>
  <text x="150" y="108" font-size="64" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
</svg>`;
  fs.writeFileSync(path.join(OUT_DIR, `${id}.svg`), svg);
}

console.log(`Generated ${Object.keys(ICONS).length} images in ${OUT_DIR}`);
