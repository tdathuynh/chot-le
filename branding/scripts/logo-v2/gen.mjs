// Chốt Lẹ – logo vòng 2. Sinh toàn bộ SVG + PNG vào branding/logo-options-v2.
// Chạy: node gen.mjs   (cần Microsoft Edge; chữ lockup dùng Google Fonts Be Vietnam Pro 900)
import fs from 'node:fs';
import { iconSvg, grad, SYMBOLS, pinPath, INK } from './symbols.mjs';
import { render, page, ROOT } from './render.mjs';
import { TEXT } from './gen-config.mjs';

const OUT = ROOT + '/logo-options-v2';
const CONCEPTS = [
  {
    key: 'A',
    dir: 'A-con-dau-chot',
    name: 'Con Dấu Chốt',
    idea: 'Con dấu “CHỐT” vừa đóng cái cộp: chốt đơn, chốt kèo, chốt chỗ đi.',
  },
  {
    key: 'B',
    dir: 'B-dau-nang-ghim',
    name: 'Dấu Nặng Thành Ghim',
    idea: 'Dấu nặng dưới chữ “ẹ” chính là cái ghim bản đồ: chỉ tiếng Việt mới có.',
  },
  {
    key: 'C',
    dir: 'C-ghim-toc-do',
    name: 'Ghim Một Nét',
    idea: 'Cái ghim vẽ bằng một nét lia nhanh từ trái sang: tìm chỗ, chốt lẹ.',
  },
];

const LIGHT = { bg: '#FAF6F0', card: '#FFFFFF', chot: INK, le: '#C94705' };
const DARK = { bg: '#121110', card: '#1C1A18', chot: '#F5F2EB', le: '#FF7A33' };
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@900&amp;display=block');`;

/* ---------- vị trí chữ e (Hướng B) ---------- */
// Đo bằng measure-text.mjs (getExtentOfChar trong Edge, font Be Vietnam Pro 900, cỡ 168, letter-spacing -4):
// e: x=827.8, advance=101.9 → tâm nét chữ ≈ 827.8 + (101.9 + 4) / 2
const MEASURED = { eCenter: 880.7 };

/* ---------- lockup: icon + chữ ---------- */
let lid = 0;
function lockupSvg(c, theme, m, { standalone = true } = {}) {
  const p = `L${lid++}_`;
  const icon = `<g transform="translate(18 30) scale(${220 / 1024})"><defs>${grad(p + 'g')}</defs><rect width="1024" height="1024" rx="229" fill="url(#${p}g)"/>${SYMBOLS[c.key](p)}</g>`;
  const style = `${standalone ? FONT_IMPORT : ''}.${p}w{font-family:'Be Vietnam Pro',sans-serif;font-weight:900;font-size:${TEXT.size}px;letter-spacing:${TEXT.ls}px}`;
  let text;
  if (c.key === 'B') {
    // "Lẹ" không dùng dấu nặng của font: thay bằng ghim nhỏ màu cam
    const ex = m.eCenter;
    const pr = 15.5, pcy = TEXT.y + 11 + pr;
    text = `<text class="${p}w" x="${TEXT.x}" y="${TEXT.y}" fill="${theme.chot}">Chốt <tspan fill="${theme.le}">Le</tspan></text>
<mask id="${p}pm" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="280"><rect width="1000" height="280" fill="#fff"/><circle cx="${ex.toFixed(1)}" cy="${pcy}" r="5.8" fill="#000"/></mask>
<path d="${pinPath(ex, pcy, pr, 35)}" fill="${theme.le}" mask="url(#${p}pm)"/>`;
  } else {
    text = `<text class="${p}w" x="${TEXT.x}" y="${TEXT.y}" fill="${theme.chot}">Chốt <tspan fill="${theme.le}">Lẹ</tspan></text>`;
  }
  const ns = standalone ? ' xmlns="http://www.w3.org/2000/svg"' : '';
  return `<svg${ns} viewBox="0 0 1000 280" width="1000" height="280"><style>${style}</style>${icon}${text}</svg>`;
}

/* ---------- ghi file từng hướng ---------- */
const m = MEASURED;



fs.mkdirSync(OUT, { recursive: true });
for (const c of CONCEPTS) {
  const dir = `${OUT}/${c.dir}`;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}/mark.svg`, iconSvg(c.key) + '\n');
  // lockup đứng riêng: nền trong suốt
  fs.writeFileSync(`${dir}/lockup.svg`, lockupSvg(c, LIGHT, m) + '\n');
  fs.writeFileSync(`${dir}/lockup-dark.svg`, lockupSvg(c, DARK, m) + '\n');

  render(
    page(`<div style="width:1024px;height:1024px;display:flex;align-items:center;justify-content:center"><div style="width:824px;height:824px;border-radius:184px;overflow:hidden;box-shadow:0 30px 60px rgba(120,50,10,.25)">${iconSvg(c.key, { size: 824, standalone: false })}</div></div>`),
    `${dir}/mark-preview.png`,
    1024,
    1024,
  );
  for (const [theme, file] of [
    [LIGHT, 'lockup-preview.png'],
    [DARK, 'lockup-dark-preview.png'],
  ]) {
    render(
      page(`<div style="padding:40px 50px">${lockupSvg(c, theme, m, { standalone: false })}</div>`, { bg: theme.bg }),
      `${dir}/${file}`,
      1100,
      360,
    );
  }
  console.log('xong', c.dir);
}

/* ---------- bảng so sánh ---------- */
const ic = (k, s, shadow = true) =>
  `<div style="width:${s}px;height:${s}px;border-radius:${(s * 0.2237).toFixed(1)}px;overflow:hidden;flex:none;${shadow && s > 50 ? 'box-shadow:0 6px 16px rgba(80,30,0,.18)' : ''}">${iconSvg(k, { size: s, standalone: false })}</div>`;
const sizes = (k, big, gap = 22) =>
  `<div style="display:flex;align-items:center;gap:${gap}px">${ic(k, big)}${ic(k, 60)}${ic(k, 29)}</div>`;

const col = (c) => `
<div class="col">
  <div class="head"><span class="tag">Hướng ${c.key}</span><h2>${c.name}</h2><p>${c.idea}</p></div>
  <div class="panel light">${sizes(c.key, 180)}</div>
  <div class="panel dark">${sizes(c.key, 180)}</div>
  <div class="lk light">${lockupSvg(c, LIGHT, m, { standalone: false })}</div>
  <div class="lk dark">${lockupSvg(c, DARK, m, { standalone: false })}</div>
</div>`;
const v1 = {
  key: 'V1',
  name: 'Ghim Chốt',
};
const v1col = `
<div class="col v1">
  <div class="head"><span class="tag gray">Vòng 1</span><h2>${v1.name}</h2><p>Tham chiếu: rõ nhưng giống icon “check-in” có sẵn.</p></div>
  <div class="panel light">${sizes('V1', 96, 14)}</div>
  <div class="panel dark">${sizes('V1', 96, 14)}</div>
  <div class="lk light">${lockupSvg(v1, LIGHT, m, { standalone: false })}</div>
  <div class="lk dark">${lockupSvg(v1, DARK, m, { standalone: false })}</div>
</div>`;
const boardCss = `
.wrap{padding:36px 40px}
h1{font-size:40px;font-weight:900;color:${INK};letter-spacing:-1px}
h1 em{font-style:normal;color:#C94705}
.sub{font-size:17px;color:#7A6F66;margin-top:6px}
.grid{display:flex;gap:22px;margin-top:26px}
.col{width:404px;display:flex;flex-direction:column;gap:14px}
.col.v1{width:252px}
.head{height:128px}
.tag{display:inline-block;background:#C94705;color:#fff;font-weight:800;font-size:14px;padding:5px 12px;border-radius:99px}
.tag.gray{background:#8C8178}
h2{font-size:27px;font-weight:900;color:${INK};margin-top:9px;letter-spacing:-.4px}
.head p{font-size:15px;line-height:1.4;color:#5E544C;margin-top:5px}
.panel{height:262px;border-radius:24px;display:flex;align-items:center;justify-content:center}
.light{background:#fff;border:1px solid #EDE5DA}
.dark{background:#121110}
.lk{height:140px;border-radius:20px;display:flex;align-items:center;justify-content:center;padding:0 14px}
.lk svg{width:372px;height:auto}.v1 .lk svg{width:226px}
.foot{margin-top:22px;font-size:14px;color:#8C8178;line-height:1.5}
.note{font-size:14px;color:#8C8178;text-align:center}
.lk.dark.note{color:#555}`;
const board = page(
  `<div class="wrap"><h1>Logo <em>Chốt Lẹ</em> vòng 2: 3 hướng mới</h1><div class="sub">Icon 180 / 60 / 29 px trên nền sáng và tối, kèm logo chữ. Cột trái là phương án vòng 1 để so sánh.</div>
  <div class="grid">${v1col}${CONCEPTS.map(col).join('')}</div>
  <div class="foot">Ký hiệu trong icon là vector thuần (không cần font). Chữ “Chốt Lẹ” dùng Be Vietnam Pro 900 qua Google Fonts. Hướng B: dấu nặng dưới chữ e được thay bằng ghim.</div></div>`,
  { extraCss: boardCss },
);
render(board, `${OUT}/so-sanh.png`, 1600, 1200);
console.log('xong so-sanh.png');

/* ---------- màn hình điện thoại ---------- */
// icon chung chung (không phải logo thật): nền màu + hình khối đơn giản
const G = {
  sun: '<circle cx="50" cy="50" r="17" fill="#fff"/><g stroke="#fff" stroke-width="6" stroke-linecap="round"><path d="M50 18v8M50 74v8M18 50h8M74 50h8M27 27l6 6M67 67l6 6M27 73l6-6M67 33l6-6"/></g>',
  cal: '<rect x="24" y="28" width="52" height="48" rx="8" fill="#fff"/><rect x="24" y="28" width="52" height="13" rx="6" fill="rgba(0,0,0,.18)"/><text x="50" y="69" text-anchor="middle" font-size="24" font-weight="800" fill="#E5484D" font-family="Be Vietnam Pro">16</text>',
  photo: '<g opacity=".95"><circle cx="40" cy="40" r="15" fill="#FFB020"/><circle cx="60" cy="40" r="15" fill="#3DD68C" opacity=".85"/><circle cx="40" cy="60" r="15" fill="#5B8DEF" opacity=".85"/><circle cx="60" cy="60" r="15" fill="#F25F8C" opacity=".85"/></g>',
  cam: '<rect x="20" y="34" width="60" height="40" rx="9" fill="#fff"/><rect x="38" y="27" width="24" height="10" rx="3" fill="#fff"/><circle cx="50" cy="54" r="12" fill="#444"/>',
  chat: '<path d="M22 46c0-14 13-24 28-24s28 10 28 24-13 24-28 24c-4 0-8-1-11-2l-12 5 3-10c-5-4-8-10-8-17z" fill="#fff"/>',
  mail: '<rect x="20" y="30" width="60" height="42" rx="7" fill="#fff"/><path d="M22 34l28 20 28-20" fill="none" stroke="#2F7CF6" stroke-width="5"/>',
  note: '<rect x="27" y="20" width="46" height="60" rx="7" fill="#fff"/><path d="M35 36h30M35 48h30M35 60h18" stroke="#E0B32C" stroke-width="5" stroke-linecap="round"/>',
  music: '<path d="M42 66V30l28-6v36" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round"/><circle cx="36" cy="66" r="9" fill="#fff"/><circle cx="64" cy="60" r="9" fill="#fff"/>',
  wallet: '<rect x="20" y="28" width="60" height="44" rx="9" fill="#fff"/><rect x="54" y="42" width="26" height="16" rx="5" fill="#1C1C1E" opacity=".25"/>',
  heart: '<path d="M50 76S22 58 22 39c0-9 7-15 15-15 6 0 10 3 13 8 3-5 7-8 13-8 8 0 15 6 15 15 0 19-28 37-28 37z" fill="#fff"/>',
  clock: '<circle cx="50" cy="50" r="27" fill="#fff"/><path d="M50 34v17l11 7" stroke="#111" stroke-width="5" fill="none" stroke-linecap="round"/>',
  gear: '<circle cx="50" cy="50" r="22" fill="none" stroke="#fff" stroke-width="10" stroke-dasharray="9 5.4"/><circle cx="50" cy="50" r="15" fill="none" stroke="#fff" stroke-width="7"/>',
  book: '<path d="M22 30c10-4 20-4 28 2v44c-8-6-18-6-28-2zM78 30c-10-4-20-4-28 2v44c8-6 18-6 28-2z" fill="#fff"/>',
  play: '<circle cx="50" cy="50" r="28" fill="#fff"/><path d="M44 38l18 12-18 12z" fill="#7A3CF0"/>',
  phone: '<path d="M33 22l10 1 5 15-7 5c3 8 9 14 17 17l5-7 15 5 1 10c-1 6-6 9-12 8-23-3-41-21-44-44-1-6 2-11 10-10z" fill="#fff"/>',
  grid: '<g fill="#fff"><rect x="24" y="24" width="22" height="22" rx="6"/><rect x="54" y="24" width="22" height="22" rx="6"/><rect x="24" y="54" width="22" height="22" rx="6"/><rect x="54" y="54" width="22" height="22" rx="11"/></g>',
  bank: '<path d="M50 20l30 15H20z" fill="#fff"/><g fill="#fff"><rect x="25" y="40" width="8" height="26"/><rect x="40" y="40" width="8" height="26"/><rect x="55" y="40" width="8" height="26"/><rect x="69" y="40" width="7" height="26"/><rect x="20" y="68" width="60" height="8" rx="2"/></g>',
  bag: '<path d="M26 38h48l-4 38H30z" fill="#fff"/><path d="M38 40v-8a12 12 0 0124 0v8" fill="none" stroke="#fff" stroke-width="6"/>',
  wave: '<path d="M18 56c8-14 16-14 24 0s16 14 24 0 12-10 16-6" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/>',
  globe: '<circle cx="50" cy="50" r="27" fill="none" stroke="#fff" stroke-width="6"/><ellipse cx="50" cy="50" rx="11" ry="27" fill="none" stroke="#fff" stroke-width="5"/><path d="M24 50h52" stroke="#fff" stroke-width="5"/>',
  folder: '<path d="M20 32c0-4 3-7 7-7h14l6 6h26c4 0 7 3 7 7v28c0 4-3 7-7 7H27c-4 0-7-3-7-7z" fill="#fff"/>',
  grid2: '<g><rect x="24" y="24" width="22" height="22" rx="6" fill="#FF5F57"/><rect x="54" y="24" width="22" height="22" rx="6" fill="#34C759"/><rect x="24" y="54" width="22" height="22" rx="6" fill="#0A84FF"/><rect x="54" y="54" width="22" height="22" rx="6" fill="#FFD60A"/></g>',
  car: '<path d="M22 60l6-16c2-5 5-7 10-7h24c5 0 8 2 10 7l6 16v10H22z" fill="#fff"/><circle cx="34" cy="70" r="6" fill="#1D3B2A"/><circle cx="66" cy="70" r="6" fill="#1D3B2A"/>',
};
const gen = (bg, g, label) => ({ bg, g, label });
const apps = [
  gen('linear-gradient(#5AC8FA,#2D7FF9)', 'sun', 'Thời tiết'),
  gen('#FFFFFF', 'cal', 'Lịch'),
  'A',
  gen('#FFFFFF', 'photo', 'Ảnh'),
  gen('linear-gradient(#4A4A4F,#1C1C1E)', 'cam', 'Máy ảnh'),
  gen('linear-gradient(#5EE17B,#22B74B)', 'chat', 'Tin nhắn'),
  gen('linear-gradient(#FFE27A,#F5C335)', 'note', 'Ghi chú'),
  gen('linear-gradient(#FF6B8B,#E6304F)', 'music', 'Nhạc'),
  'B',
  gen('linear-gradient(#3A3A3C,#111)', 'wallet', 'Ví'),
  gen('linear-gradient(#FF8A3D,#E85A1B)', 'book', 'Sách'),
  gen('linear-gradient(#9B6BFF,#6B3CF0)', 'play', 'Podcast'),
  gen('linear-gradient(#2E2E30,#000)', 'clock', 'Đồng hồ'),
  gen('linear-gradient(#26C6A8,#0E8F7A)', 'bank', 'Ngân hàng'),
  gen('linear-gradient(#FF5F57,#D9302A)', 'heart', 'Sức khỏe'),
  'C',
  gen('linear-gradient(#3EB0FF,#1468E0)', 'globe', 'Trình duyệt'),
  gen('linear-gradient(#FFD23F,#F7A400)', 'bag', 'Mua sắm'),
  gen('linear-gradient(#4CD964,#1F9E3F)', 'car', 'Đặt xe'),
  gen('linear-gradient(#8E8E93,#5A5A5F)', 'gear', 'Cài đặt'),
  gen('linear-gradient(#6FA8FF,#3D6BF2)', 'folder', 'Tệp'),
  gen('linear-gradient(#FF9F0A,#F06A00)', 'wave', 'Radio'),
  gen('#FFFFFF', 'grid2', 'Tiện ích'),
  gen('linear-gradient(#34C3B5,#1A8C99)', 'globe', 'Dịch'),
];
const dock = [
  gen('linear-gradient(#5EE17B,#22B74B)', 'phone', ''),
  gen('linear-gradient(#5AC8FA,#1E7CF0)', 'mail', ''),
  gen('linear-gradient(#FF7AA8,#7A5CFF)', 'grid', ''),
  gen('linear-gradient(#00C2FF,#0A6CFF)', 'wave', ''),
];
const S = 74;
const appIcon = (a, labelColor) => {
  if (typeof a === 'string')
    return `<div class="app">${ic(a, S, false)}<div class="lbl ours" style="color:${labelColor}">${a}</div></div>`;
  return `<div class="app"><div class="ai" style="background:${a.bg}"><svg viewBox="0 0 100 100" width="${S}" height="${S}">${G[a.g]}</svg></div>${a.label !== undefined ? `<div class="lbl" style="color:${labelColor}">${a.label}</div>` : ''}</div>`;
};
const phone = (wall, labelColor, statusColor) => `
<div class="phone"><div class="screen" style="background:${wall}">
  <div class="status" style="color:${statusColor}"><span>9:41</span><span class="island"></span><span class="bat"><i></i><i></i><i></i><b style="border-color:${statusColor}"><em style="background:${statusColor}"></em></b></span></div>
  <div class="gridA">${apps.map((a) => appIcon(a, labelColor)).join('')}</div>
  <div class="dots"><i style="background:${statusColor}"></i><i style="background:${statusColor};opacity:.4"></i></div>
  <div class="dock">${dock.map((a) => appIcon({ ...a, label: undefined }, labelColor)).join('')}</div>
</div></div>`;
const phoneCss = `
body{display:flex;flex-direction:column;align-items:center;min-height:100vh}
.top{width:100%;padding:26px 40px 0;display:flex;justify-content:space-between;align-items:baseline}
.top h1{font-size:28px;font-weight:900;color:${INK}}.top p{font-size:15px;color:#7A6F66}
.row{display:flex;gap:48px;margin-top:18px}
.phone{width:520px;height:1130px;border-radius:78px;background:#1A1A1A;padding:14px;box-shadow:0 30px 70px rgba(0,0,0,.28), inset 0 0 0 2px #3A3A3A}
.screen{width:100%;height:100%;border-radius:66px;overflow:hidden;position:relative;padding:0 28px}
.status{height:64px;display:flex;align-items:center;justify-content:space-between;padding:10px 18px 0;font-weight:700;font-size:19px}
.island{width:124px;height:36px;background:#000;border-radius:20px}
.bat{display:flex;align-items:center;gap:3px}.bat i{width:4px;background:currentColor;border-radius:1px;display:inline-block}
.bat i:nth-child(1){height:6px}.bat i:nth-child(2){height:9px}.bat i:nth-child(3){height:12px;margin-right:8px}
.bat b{width:27px;height:13px;border:2px solid;border-radius:4px;padding:1px;display:inline-block}.bat em{display:block;height:100%;width:80%;border-radius:1px}
.gridA{display:grid;grid-template-columns:repeat(4,${S}px);justify-content:space-between;row-gap:30px;margin-top:34px}
.app{display:flex;flex-direction:column;align-items:center;width:${S}px}
.ai{width:${S}px;height:${S}px;border-radius:${(S * 0.2237).toFixed(1)}px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.lbl{font-size:12.5px;margin-top:7px;font-weight:500;white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,.25)}
.lbl.ours{font-weight:800}
.dots{display:flex;gap:9px;justify-content:center;position:absolute;left:0;right:0;bottom:150px}.dots i{width:8px;height:8px;border-radius:50%}
.dock{position:absolute;left:18px;right:18px;bottom:22px;height:110px;border-radius:40px;background:rgba(255,255,255,.28);backdrop-filter:blur(20px);display:flex;justify-content:space-around;align-items:center}
.dock .app .lbl{display:none}`;
const phones = page(
  `<div class="top"><h1>Chốt Lẹ trên màn hình chính</h1><p>Hướng A, B, C nằm lẫn giữa các app khác · nền sáng và nền tối</p></div>
  <div class="row">${phone('linear-gradient(160deg,#B9D7F2 0%,#C9C3EE 45%,#F2C6D6 100%)', '#1B1B1F', '#111')}${phone('linear-gradient(165deg,#1B2440 0%,#0E1220 55%,#2A1630 100%)', '#F2F2F5', '#fff')}</div>`,
  { extraCss: phoneCss },
);
render(phones, `${OUT}/man-hinh-dien-thoai.png`, 1200, 1300);
console.log('xong man-hinh-dien-thoai.png');
