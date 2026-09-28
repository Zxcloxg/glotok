// Рисует иконку приложения в PNG: node scripts/make-icons.mjs
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync, mkdirSync } from 'node:fs';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFE6F3"/><stop offset="1" stop-color="#7CC7E8"/></linearGradient>
    <radialGradient id="drop" cx="38%" cy="35%" r="75%"><stop offset="0" stop-color="#8FD6F2"/><stop offset=".6" stop-color="#2F9FD0"/><stop offset="1" stop-color="#1F6F97"/></radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <ellipse cx="256" cy="440" rx="120" ry="18" fill="#1F6F97" opacity=".18"/>
  <path d="M256 70 C210 140 120 230 120 300 A136 136 0 0 0 392 300 C392 230 302 140 256 70 Z" fill="url(#drop)"/>
  <ellipse cx="200" cy="215" rx="30" ry="48" transform="rotate(28 200 215)" fill="#fff" opacity=".45"/>
  <circle cx="210" cy="310" r="17" fill="#15323B"/><circle cx="302" cy="310" r="17" fill="#15323B"/>
  <circle cx="216" cy="303" r="6" fill="#fff"/><circle cx="308" cy="303" r="6" fill="#fff"/>
  <ellipse cx="180" cy="345" rx="20" ry="11" fill="#F4978E" opacity=".75"/><ellipse cx="332" cy="345" rx="20" ry="11" fill="#F4978E" opacity=".75"/>
  <path d="M236 342 Q256 364 276 342" stroke="#15323B" stroke-width="9" fill="none" stroke-linecap="round"/>
</svg>`;

mkdirSync('web/icons', { recursive: true });
for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync('web/icons/' + name, png);
  console.log('web/icons/' + name);
}
