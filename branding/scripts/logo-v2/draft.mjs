// Bảng nháp để lặp nhanh: ký hiệu ở 360 / 60 / 29 px trên nền sáng + tối.
// node draft.mjs A B C  → branding/.tmp/draft.png
import { iconSvg } from './symbols.mjs';
import { render, page, TMP } from './render.mjs';

const keys = process.argv.slice(2).length ? process.argv.slice(2) : ['A', 'B', 'C', 'V1'];
const parse = (a) => { const [k, j] = a.split("|"); return { k, o: j ? JSON.parse(j) : {} }; };
const cell = (a, s) =>
  `<div style="width:${s}px;height:${s}px;border-radius:${s * 0.2237}px;overflow:hidden;flex:none">${iconSvg(parse(a).k, { size: s, standalone: false, opts: parse(a).o })}</div>`;
const row = (k) =>
  `<div style="display:flex;align-items:center;gap:24px;padding:16px">${cell(k, 360)}${cell(k, 60)}${cell(k, 29)}<div style="background:#121110;display:flex;gap:24px;align-items:center;padding:20px;border-radius:20px">${cell(k, 60)}${cell(k, 29)}</div></div>`;
const html = page(`<div>${keys.map(row).join('')}</div>`);
const out = `${TMP}/draft.png`;
render(html, out, 1400, keys.length * 392 + 40);
console.log(out);
