import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';

const svg = readFileSync('./public/fenr-icon.svg', 'utf8');

function render(size, outPath) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
  });
  const png = resvg.render().asPng();
  writeFileSync(outPath, png);
  console.log(`Generated ${outPath} (${size}x${size})`);
}

render(512, './public/pwa-512x512.png');
render(192, './public/pwa-192x192.png');
render(180, './public/apple-touch-icon.png');
render(32,  './public/favicon.png');
