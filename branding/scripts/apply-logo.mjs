// Xuất logo hướng B (Dấu nặng thành ghim) ra mọi kích thước app cần.
// Chạy lại được: node branding/scripts/apply-logo.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/AI_appreview';
const SRC = `${ROOT}/branding/logo-options-v2/B-dau-nang-ghim/mark.svg`;
const IMG = `${ROOT}/app/assets/images`;
const PUB = `${ROOT}/app/public`;
const OUT_BRAND = `${ROOT}/branding/logo`;
const TMP = `${ROOT}/branding/.tmp-apply`;
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const svg = fs.readFileSync(SRC, 'utf8');
// Nội dung chữ "Lẹ" + ghim (phần trong <g mask>), dùng lại để vẽ bản trắng nền trong suốt.
const defsMask = svg.match(/<defs><mask[\s\S]*?<\/mask><\/defs>/)[0];
const glyphGroup = svg.match(/<g mask="url\(#B2_m\)">[\s\S]*?<\/g>/)[0];
const GRAD = '<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1024" y2="1024"><stop offset="0" stop-color="#F57A2C"/><stop offset="1" stop-color="#C94705"/></linearGradient></defs>';
// Khung bao của chữ trong toạ độ 1024: x 196..830, y 132..914
const BOX = { x: 196, y: 132, w: 634, h: 782 };

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
let n = 0;
function render(svgMarkup, out, w, h) {
  fs.mkdirSync(TMP, { recursive: true });
  const html = `<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}svg{display:block}</style></head><body>${svgMarkup}</body></html>`;
  const file = `${TMP}/p${n++}.html`;
  fs.writeFileSync(file, html);
  if (fs.existsSync(out)) fs.rmSync(out);
  spawnSync(
    EDGE,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--hide-scrollbars',
      '--default-background-color=00000000',
      `--user-data-dir=${TMP}/profile`,
      `--window-size=${w},${h}`,
      `--screenshot=${out}`,
      'file:///' + file,
    ],
    { timeout: 60000, stdio: 'ignore' }
  );
  for (let i = 0; i < 100 && !fs.existsSync(out); i++) sleep(200);
  if (!fs.existsSync(out)) throw new Error('Không xuất được ' + out);
  sleep(150);
  console.log('✓', path.relative(ROOT, out), `${w}x${h}`);
}

/** Icon vuông đầy đủ (nền cam + chữ trắng). */
const fullIcon = (size) => svg.replace('width="1024" height="1024"', `width="${size}" height="${size}"`);

/** Chữ trắng nền trong suốt, chiều cao chữ = frac × khung, căn giữa. */
function glyph(size, frac, color = '#fff') {
  const s = (size * frac) / BOX.h;
  const tx = size / 2 - (BOX.x + BOX.w / 2) * s;
  const ty = size / 2 - (BOX.y + BOX.h / 2) * s;
  const g = glyphGroup.replaceAll('#fff', color);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><g transform="translate(${tx} ${ty}) scale(${s})">${defsMask}${g}</g></svg>`;
}

/** Chữ trắng vừa khít khung (không chừa lề), dùng cho màn hình chờ trong app. */
function glyphTight(height, color = '#fff') {
  const width = Math.round((height * BOX.w) / BOX.h);
  const g = glyphGroup.replaceAll('#fff', color);
  return {
    width,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${BOX.x} ${BOX.y} ${BOX.w} ${BOX.h}">${defsMask}${g}</svg>`,
  };
}

/** Icon bo góc (favicon, apple-touch). */
function roundedIcon(size, radiusFrac = 0.22) {
  const r = 1024 * radiusFrac;
  return svg
    .replace('width="1024" height="1024"', `width="${size}" height="${size}"`)
    .replace('<rect width="1024" height="1024" fill="url(#B2_g)"/>', `<rect width="1024" height="1024" rx="${r}" fill="url(#B2_g)"/>`);
}

fs.mkdirSync(OUT_BRAND, { recursive: true });

// App icon (iOS/Android/Expo): vuông, hệ điều hành tự bo góc.
render(fullIcon(1024), `${IMG}/icon.png`, 1024, 1024);
// Android adaptive: nền cam + chữ trắng nằm gọn trong vùng an toàn (~66% giữa).
render(
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 1024 1024">${GRAD}<rect width="1024" height="1024" fill="url(#g)"/></svg>`,
  `${IMG}/android-icon-background.png`,
  512,
  512
);
render(glyph(512, 0.5), `${IMG}/android-icon-foreground.png`, 512, 512);
render(glyph(432, 0.5), `${IMG}/android-icon-monochrome.png`, 432, 432);
// Màn hình chờ: chữ trắng trên nền cam (màu nền đặt trong app.json).
const splash = glyphTight(300);
render(splash.svg, `${IMG}/splash-icon.png`, splash.width, 300);
// Màn hình chờ dạng hoạt hình trong app (animated-icon.tsx).
const glyph3x = glyphTight(282);
render(glyph3x.svg, `${IMG}/logo-glyph.png`, glyph3x.width, 282);
// Web
render(roundedIcon(48), `${IMG}/favicon.png`, 48, 48);
render(fullIcon(180), `${PUB}/apple-touch-icon.png`, 180, 180);
render(roundedIcon(512), `${PUB}/icon-512.png`, 512, 512);
// Bộ logo dùng chung (TikTok, video, tài liệu)
fs.copyFileSync(SRC, `${OUT_BRAND}/icon.svg`);
fs.writeFileSync(`${OUT_BRAND}/glyph-white.svg`, glyphTight(782).svg);
for (const f of ['lockup.svg', 'lockup-dark.svg', 'lockup-preview.png', 'lockup-dark-preview.png'])
  fs.copyFileSync(`${ROOT}/branding/logo-options-v2/B-dau-nang-ghim/${f}`, `${OUT_BRAND}/${f}`);
render(fullIcon(1024), `${OUT_BRAND}/icon-1024.png`, 1024, 1024);

// Dọn: tắt Edge của script này (nếu còn) và xoá thư mục tạm.
spawnSync('powershell', [
  '-NoProfile',
  '-Command',
  `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | ? { $_.CommandLine -like '*tmp-apply*' } | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`,
]);
sleep(500);
fs.rmSync(TMP, { recursive: true, force: true });
console.log('Xong.');
