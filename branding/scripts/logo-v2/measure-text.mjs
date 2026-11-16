// Đo vị trí chữ "L" và "e" trong logo chữ (để đặt ghim Hướng B). Edge trên Windows không trả --dump-dom ra stdout,
// nên trang in số đo lên màn hình rồi chụp lại: node measure-text.mjs → .tmp/measure.png, đọc số và cập nhật gen.mjs (MEASURED).
import { render, page, TMP } from './render.mjs';
import { TEXT } from './gen-config.mjs';
const svg = `<svg viewBox="0 0 1000 280" width="1000" height="280"><text id="t" x="${TEXT.x}" y="${TEXT.y}" style="font-family:'Be Vietnam Pro';font-weight:900;font-size:${TEXT.size}px;letter-spacing:${TEXT.ls}px">Chốt <tspan>Le</tspan></text></svg>`;
const html = page(`${svg}<pre id="out" style="font:32px monospace;padding:20px">...</pre><script>
setTimeout(()=>{try{
  const t=document.getElementById('t');const r=i=>{const b=t.getExtentOfChar(i);return [b.x,b.width,b.y,b.height].map(v=>v.toFixed(1)).join(' ')};
  document.getElementById('out').textContent='L: '+r(5)+' | e: '+r(6)+' | len: '+t.getComputedTextLength().toFixed(1)+' | font ok: '+document.fonts.check('900 ${TEXT.size}px "Be Vietnam Pro"');
}catch(err){document.getElementById('out').textContent='ERR '+err}},2500);</script>`);
render(html, `${TMP}/measure.png`, 1000, 520);
