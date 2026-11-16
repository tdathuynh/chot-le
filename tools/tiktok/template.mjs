// Mẫu hình ảnh cho bài TikTok dạng ảnh (photo mode, 1080x1920).
// renderSlides(post) -> string[]: mỗi phần tử là một trang HTML độc lập (bìa, từng quán, kết).
// Không dùng JS trong trang; mọi cỡ chữ được chọn sẵn theo độ dài chuỗi lúc render.
//
// Vùng an toàn TikTok: chữ quan trọng nằm trong x 72..940, y 160..1540
// (trên 160px, phải 140px, dưới 380px bị giao diện TikTok che). Ảnh được phép tràn ra ngoài.

const W = 1080;
const H = 1920;
const SAFE = { top: 160, right: 140, bottom: 380, left: 72 };

const C = {
  orange: '#E0590E',
  orangeDeep: '#C94705',
  orangeDark: '#8A2E02',
  ink: '#1F1A17',
  cream: '#FAF6F0',
  creamDeep: '#F3EEE6',
  muted: '#5E554B',
  border: '#E8E1D7',
  tintSubtle: '#FFF2EB',
};

const FONT_LINK =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@500;600;700;800;900&display=block" rel="stylesheet">';

// ---------- tiện ích ----------

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** URL ảnh chỉ nhận http(s); trả về chuỗi đã escape để đặt trong thuộc tính. */
function safeUrl(url) {
  const s = String(url ?? '').trim();
  return /^https?:\/\//i.test(s) ? esc(s) : '';
}

const len = (s) => [...String(s ?? '')].length;

/** Chọn bậc theo độ dài: tiers = [[maxLen, value], ...], fallback = giá trị cuối. */
function tier(s, tiers) {
  const n = len(s);
  for (const [max, v] of tiers) if (n <= max) return v;
  return tiers[tiers.length - 1][1];
}

const ICON_PATHS = {
  pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  wallet:
    '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
  utensils:
    '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  percent:
    '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m15 9-6 6"/><path d="M9 9h.01"/><path d="M15 15h.01"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  dot: '<circle cx="12" cy="12" r="3.5" fill="currentColor"/>',
};

function icon(name, size, color = 'currentColor', stroke = 2.2) {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name]}</svg>`;
}

const DOT_PATTERN =
  'radial-gradient(rgba(255,255,255,0.10) 2px, transparent 2.5px) 0 0 / 34px 34px';
const BRAND_GRADIENT = `linear-gradient(160deg, #F07A2E 0%, ${C.orange} 38%, ${C.orangeDeep} 72%, ${C.orangeDark} 100%)`;

const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{position:relative;font-family:'Be Vietnam Pro',system-ui,sans-serif;color:${C.ink};background:${C.cream};
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;font-kerning:normal}
.ic{flex:none;display:block}
.clamp{display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden}
.abs{position:absolute}
img{display:block}
.brand{display:inline-flex;align-items:center;gap:12px;font-weight:900;letter-spacing:-0.5px}
.brand-mark{width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center}
`;

function brandMark(bg, fg) {
  return `<span class="brand-mark" style="background:${bg}">${icon('utensils', 26, fg, 2.4)}</span>`;
}

function debugOverlay() {
  return `<div class="abs" style="left:${SAFE.left}px;top:${SAFE.top}px;width:${W - SAFE.left - SAFE.right}px;height:${H - SAFE.top - SAFE.bottom}px;outline:4px dashed #00E5FF;z-index:99;pointer-events:none"></div>
<div class="abs" style="left:0;top:${H - SAFE.bottom}px;width:${W}px;height:${SAFE.bottom}px;background:rgba(255,0,80,.25);z-index:99"></div>
<div class="abs" style="left:${W - SAFE.right}px;top:0;width:${SAFE.right}px;height:${H}px;background:rgba(255,0,80,.18);z-index:99"></div>
<div class="abs" style="left:0;top:0;width:${W}px;height:${SAFE.top}px;background:rgba(255,0,80,.18);z-index:99"></div>`;
}

function doc(title, css, body, opts) {
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${W}, height=${H}, initial-scale=1">
<title>${esc(title)}</title>
${FONT_LINK}
<style>${BASE_CSS}${css}</style>
</head>
<body>
${body}
${opts?.debugSafeZone ? debugOverlay() : ''}
</body>
</html>`;
}

/** Ô ảnh: ảnh thật nếu có, không thì nền cam thương hiệu có icon (không emoji). */
function photoBox(url, style, { placeholderLabel = 'Chốt Lẹ', iconSize = 120, lift = 0 } = {}) {
  const src = safeUrl(url);
  if (src) {
    return `<div class="abs" style="${style};overflow:hidden;background:#2a1a10"><img src="${src}" alt="" style="width:100%;height:100%;object-fit:cover"></div>`;
  }
  return `<div class="abs" style="${style};overflow:hidden;background:${DOT_PATTERN},${BRAND_GRADIENT};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding-bottom:${lift}px">
  <div style="width:${iconSize * 1.7}px;height:${iconSize * 1.7}px;border-radius:50%;border:4px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center">${icon('utensils', iconSize, 'rgba(255,255,255,.92)', 1.6)}</div>
  ${placeholderLabel ? `<div style="font-weight:900;font-size:${Math.round(iconSize * 0.42)}px;color:rgba(255,255,255,.9);letter-spacing:-0.5px">${esc(placeholderLabel)}</div>` : ''}
</div>`;
}

// ---------- bìa ----------

function coverCollage(urls) {
  const g = 8; // khe giữa ảnh
  const n = urls.length;
  if (n === 0) {
    return `<div class="abs" style="inset:0;background:${DOT_PATTERN},${BRAND_GRADIENT}"></div>`;
  }
  const boxes = [];
  const top = 0;
  const hh = 1180; // lưới ảnh ở phần trên, mờ dần vào nền cam đậm phía dưới
  if (n === 1) {
    boxes.push([0, top, W, hh]);
  } else if (n === 2) {
    const half = (W - g) / 2;
    boxes.push([0, top, half, hh], [half + g, top, half, hh]);
  } else if (n === 3) {
    const half = (W - g) / 2;
    const r1 = Math.round(hh * 0.55);
    boxes.push([0, top, W, r1], [0, r1 + g, half, hh - r1 - g], [half + g, r1 + g, half, hh - r1 - g]);
  } else {
    const half = (W - g) / 2;
    const r = (hh - g) / 2;
    boxes.push([0, 0, half, r], [half + g, 0, half, r], [0, r + g, half, r], [half + g, r + g, half, r]);
  }
  const imgs = boxes
    .map(([x, y, w, h], i) => photoBox(urls[i], `left:${x}px;top:${y}px;width:${w}px;height:${h}px`))
    .join('\n');
  return `<div class="abs" style="inset:0;background:${C.orangeDark}"></div>
<div class="abs" style="left:0;top:0;width:${W}px;height:${hh}px;background:#1a0f08">${imgs}</div>
<div class="abs" style="left:0;top:${hh}px;width:${W}px;height:${H - hh}px;background:${DOT_PATTERN},linear-gradient(180deg, #8E3003 0%, #4A1700 100%)"></div>
<div class="abs" style="left:0;top:0;width:${W}px;height:${hh + 2}px;background:linear-gradient(180deg, rgba(20,10,4,.6) 0%, rgba(20,10,4,.05) 15%, rgba(20,10,4,0) 30%, rgba(142,48,3,.55) 52%, rgba(142,48,3,.9) 72%, #8E3003 100%)"></div>`;
}

function renderCover(post, opts) {
  const covers = post.places
    .map((p) => (p.photos || []).find((u) => safeUrl(u)))
    .filter(Boolean)
    .slice(0, 4);

  const titleSize = tier(post.title, [
    [14, 150],
    [20, 140],
    [28, 116],
    [38, 104],
    [52, 96],
  ]);
  const titleLines = len(post.title) > 52 ? 4 : 3;
  const subSize = tier(post.subtitle, [
    [18, 76],
    [28, 64],
    [44, 52],
  ]);
  const count = post.places.length;

  const css = `
.cover-top{left:${SAFE.left}px;top:${SAFE.top + 24}px;right:${SAFE.right}px;display:flex;align-items:center;justify-content:space-between}
.brand-pill{background:#fff;color:${C.orangeDeep};font-size:38px;padding:10px 26px 10px 12px;border-radius:999px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
.count-pill{font-size:34px;font-weight:800;color:#fff;background:rgba(0,0,0,.6);border:2px solid rgba(255,255,255,.35);padding:12px 26px;border-radius:999px}
.text{left:${SAFE.left}px;width:${W - SAFE.left - SAFE.right}px;bottom:${SAFE.bottom + 140}px;display:flex;flex-direction:column;align-items:flex-start;gap:26px}
.kicker{font-size:38px;font-weight:800;color:${C.orangeDeep};background:#fff;padding:10px 28px;border-radius:999px;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.title{font-size:${titleSize}px;line-height:1.12;font-weight:900;color:#fff;letter-spacing:-0.02em;-webkit-line-clamp:${titleLines};
  text-shadow:0 4px 24px rgba(60,18,0,.45);padding-top:0.08em;text-wrap:balance}
.subtitle{font-size:${subSize}px;line-height:1.25;font-weight:800;color:${C.ink};background:#FFE3CF;padding:6px 26px 10px;border-radius:20px;max-width:100%;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transform:rotate(-1.5deg);box-shadow:0 10px 30px rgba(60,18,0,.3)}
.hint{left:${SAFE.left}px;bottom:${SAFE.bottom + 36}px;display:flex;align-items:center;gap:16px;font-size:40px;font-weight:800;color:#fff}
.hint-btn{width:72px;height:72px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center}
`;
  const body = `
${coverCollage(covers)}
<div class="abs cover-top">
  <span class="brand brand-pill">${brandMark(C.orange, '#fff')}Chốt Lẹ</span>
  ${count > 0 ? `<span class="count-pill">${count} quán</span>` : ''}
</div>
<div class="abs text">
  ${post.kicker ? `<div class="kicker">${esc(post.kicker)}</div>` : ''}
  <h1 class="title clamp">${esc(post.title)}</h1>
  ${post.subtitle ? `<div class="subtitle">${esc(post.subtitle)}</div>` : ''}
</div>
<div class="abs hint">Lướt để xem<span class="hint-btn">${icon('arrow', 40, C.orangeDeep, 3)}</span></div>
`;
  return doc(`${post.title} ${post.subtitle ?? ''}`, css, body, opts);
}

// ---------- trang quán ----------

const PHOTO_H = 1180; // ảnh rõ ở ~55-60% trên, mờ dần vào nền tối phía dưới
const INK_BG = '#17100B';

function renderPlace(post, place, index, opts) {
  const total = post.places.length;
  const photos = (place.photos || []).filter((u) => safeUrl(u));
  const hasPhoto = photos.length > 0;
  const hasInset = photos.length > 1;

  const dishes = [...(place.dishes || [])]
    .filter((d) => d && d.name)
    .sort((a, b) => Number(!!b.signature) - Number(!!a.signature))
    .slice(0, 3);
  const tags = (place.tags || []).filter(Boolean).slice(0, 3);

  const nameSize = tier(place.name, [
    [14, 100],
    [22, 84],
    [32, 72],
    [999, 64],
  ]);
  const nameLines = len(place.name) > 32 ? 3 : 2;
  // Địa chỉ được 2 dòng khi còn chỗ, 1 dòng khi có đủ 3 món.
  const addressLines = dishes.length >= 3 ? 1 : 2;
  const dealSize = tier(place.deal, [
    [26, 40],
    [40, 36],
  ]);

  const metaParts = [];
  if (place.district) metaParts.push(`<span class="meta-item">${icon('pin', 40, C.orange, 2.4)}<span class="mt">${esc(place.district)}</span></span>`);
  if (place.priceText) metaParts.push(`<span class="meta-item price">${icon('wallet', 40, C.orange, 2.4)}<span class="mt">${esc(place.priceText)}</span></span>`);

  const css = `
body{background:${INK_BG}}
.shade{left:0;top:0;width:${W}px;height:${PHOTO_H + 2}px;background:linear-gradient(180deg, rgba(23,16,11,.55) 0%, rgba(23,16,11,0) 20%, rgba(23,16,11,0) 38%, rgba(23,16,11,.6) 60%, rgba(23,16,11,.94) 86%, ${INK_BG} 100%)}
.toprow{left:${SAFE.left}px;top:${SAFE.top + 20}px;display:flex;align-items:center;gap:18px}
.num{display:flex;align-items:baseline;gap:4px;background:${C.orange};color:#fff;padding:8px 26px 12px;border-radius:24px;font-weight:900;box-shadow:0 10px 30px rgba(0,0,0,.3)}
.num b{font-size:72px;line-height:1}
.num span{font-size:38px;opacity:.85}
.brand-sm{font-size:32px;color:#fff;background:rgba(0,0,0,.42);padding:10px 22px 12px;border-radius:999px}
.inset{right:60px;top:${SAFE.top + 30}px;width:330px;height:330px;border:10px solid #fff;border-radius:28px;overflow:hidden;transform:rotate(4deg);
  box-shadow:0 18px 50px rgba(0,0,0,.45);background:#2a1a10}
.inset img{width:100%;height:100%;object-fit:cover}
.deal{left:${SAFE.left}px;top:${SAFE.top + 150}px;max-width:${hasInset ? 560 : W - SAFE.left - SAFE.right}px;display:flex;align-items:center;gap:14px;
  background:#FFD84D;color:${C.ink};font-size:${dealSize}px;font-weight:800;line-height:1.22;padding:16px 26px;border-radius:22px;transform:rotate(-2deg);
  box-shadow:0 12px 34px rgba(0,0,0,.35)}
.deal .t{-webkit-line-clamp:2;padding-top:0.06em}
.content{left:${SAFE.left}px;width:${W - SAFE.left - SAFE.right}px;top:${SAFE.top + 330}px;bottom:${SAFE.bottom}px;
  display:flex;flex-direction:column;justify-content:flex-end;gap:20px;overflow:hidden}
.tags{display:flex;flex-wrap:wrap;gap:12px;max-height:68px;overflow:hidden}
.tag{font-size:32px;font-weight:700;color:${C.ink};background:rgba(255,255,255,.94);padding:8px 22px;border-radius:999px;white-space:nowrap}
.name{font-size:${nameSize}px;line-height:1.17;font-weight:900;color:#fff;letter-spacing:-0.015em;-webkit-line-clamp:${nameLines};
  text-shadow:0 3px 20px rgba(0,0,0,.5);padding-top:0.12em;word-break:break-word;text-wrap:balance;flex:none}
.meta{display:flex;align-items:center;gap:34px;font-size:44px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;flex:none;margin-top:4px}
.meta-item{display:inline-flex;align-items:center;gap:12px;min-width:0}
.meta-item .mt{overflow:hidden;text-overflow:ellipsis}
.meta-item.price{color:#FF9A5C}
.line{display:flex;align-items:flex-start;gap:14px;font-size:36px;font-weight:600;color:#D9CFC4;line-height:1.3;flex:none}
.line .ic{margin-top:4px}
.addr{-webkit-line-clamp:${addressLines}}
.dishes{margin-top:8px;background:#fff;border-radius:28px;padding:8px 28px;display:flex;flex-direction:column;flex:none}
.dish{display:flex;align-items:center;gap:16px;height:68px;font-size:37px;font-weight:700;color:${C.ink}}
.dish + .dish{border-top:2px dashed ${C.border}}
.dish-name{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dish-price{flex:none;font-weight:800;color:${C.orangeDeep}}
.sig{flex:none;width:44px;height:44px;border-radius:50%;background:${C.tintSubtle};display:flex;align-items:center;justify-content:center}
.note{margin-top:8px;display:flex;align-items:center;gap:18px;font-size:36px;font-weight:700;color:#fff;line-height:1.3;
  border:2px solid rgba(255,255,255,.22);padding:22px 28px;border-radius:24px;flex:none}
`;

  const photoHtml = hasPhoto
    ? photoBox(photos[0], `left:0;top:0;width:${W}px;height:${PHOTO_H}px`)
    : photoBox(null, `left:0;top:0;width:${W}px;height:${PHOTO_H}px`, { placeholderLabel: '', iconSize: 130, lift: 120 });

  const dishesHtml = dishes.length
    ? `<div class="dishes">${dishes
        .map(
          (d) => `<div class="dish">
      ${d.signature ? `<span class="sig">${icon('star', 26, C.orange, 2.4).replace('fill="none"', `fill="${C.orange}"`)}</span>` : `<span class="sig" style="background:${C.creamDeep}">${icon('dot', 26, C.muted)}</span>`}
      <span class="dish-name">${esc(d.name)}</span>
      ${d.priceText ? `<span class="dish-price">${esc(d.priceText)}</span>` : ''}
    </div>`,
        )
        .join('')}</div>`
    : '';

  // Quán ít dữ liệu: thêm lời nhắc nhẹ để trang không trống trơn.
  const sparse = !dishes.length;

  const body = `
${photoHtml}
<div class="abs shade"></div>
<div class="abs toprow"><div class="num"><b>${index + 1}</b><span>/${total}</span></div>${hasInset ? '' : '<span class="brand brand-sm">Chốt Lẹ</span>'}</div>
${hasInset ? `<div class="abs inset"><img src="${safeUrl(photos[1])}" alt=""></div>` : ''}
${place.deal ? `<div class="abs deal">${icon('percent', 44, C.orangeDeep, 2.4)}<span class="t clamp">${esc(place.deal)}</span></div>` : ''}
<div class="abs content">
  ${tags.length ? `<div class="tags">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
  <h2 class="name clamp">${esc(place.name)}</h2>
  ${metaParts.length ? `<div class="meta">${metaParts.join('')}</div>` : ''}
  ${place.address ? `<div class="line">${icon('pin', 36, 'rgba(255,255,255,0)', 0)}<span class="addr clamp">${esc(place.address)}</span></div>` : ''}
  ${place.hours ? `<div class="line">${icon('clock', 36, '#D9CFC4', 2.4)}<span>Mở cửa ${esc(place.hours)}</span></div>` : ''}
  ${dishesHtml}
  ${sparse ? `<div class="note">${icon('bookmark', 40, C.orange, 2.4)}<span>Thực đơn, giờ mở cửa và chỉ đường có trong app Chốt Lẹ</span></div>` : ''}
</div>
`;
  return doc(`${index + 1}. ${place.name}`, css, body, opts);
}

// ---------- trang kết ----------

function renderOutro(post, opts) {
  const n = post.places.length;
  const rowSize = n <= 5 ? 40 : n <= 7 ? 36 : 32;
  const rowH = n <= 5 ? 82 : n <= 7 ? 70 : 58;
  const shown = post.places.slice(0, 10);
  // Cùng một khu vực thì cột phụ hiện giá, khác khu vực thì hiện khu vực.
  const sameDistrict = new Set(shown.map((p) => p.district)).size <= 1;
  const side = (p) => (sameDistrict ? p.priceText : p.district) || '';
  const line1Size = tier(post.outro?.line1, [
    [18, 96],
    [26, 84],
    [40, 72],
  ]);

  const css = `
body{background:${DOT_PATTERN},${BRAND_GRADIENT}}
.fade{left:0;bottom:0;width:${W}px;height:${SAFE.bottom + 120}px;background:linear-gradient(180deg, rgba(60,18,0,0), rgba(60,18,0,.55))}
.wrap{left:${SAFE.left}px;top:${SAFE.top + 30}px;width:${W - SAFE.left - SAFE.right}px;height:${H - SAFE.top - SAFE.bottom - 30}px;
  display:flex;flex-direction:column;justify-content:center;gap:34px;overflow:hidden}
.brand-big{gap:26px;font-size:120px;line-height:1.2;color:#fff;font-weight:900;letter-spacing:-0.03em;padding-top:0.06em}
.line1{font-size:${line1Size}px;line-height:1.15;font-weight:900;color:#fff;-webkit-line-clamp:2;padding-top:0.08em}
.card{background:#fff;border-radius:36px;padding:22px 34px;display:flex;flex-direction:column}
.card-h{font-size:30px;font-weight:800;color:${C.orangeDeep};letter-spacing:0.08em;text-transform:uppercase;padding:6px 0 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row{display:flex;align-items:center;gap:20px;height:${rowH}px;font-size:${rowSize}px;font-weight:800;color:${C.ink}}
.row + .row{border-top:2px dashed ${C.border}}
.row i{flex:none;font-style:normal;width:${rowH - 22}px;height:${rowH - 22}px;border-radius:50%;background:${C.orange};color:#fff;
  display:flex;align-items:center;justify-content:center;font-size:${Math.round(rowSize * 0.8)}px;font-weight:900}
.row span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row em{flex:none;font-style:normal;font-size:${rowSize - 6}px;font-weight:800;color:${sameDistrict ? C.orangeDeep : C.muted}}
.line2{display:flex;align-items:center;gap:18px;font-size:38px;font-weight:700;color:#fff;line-height:1.3}
.line2 .clamp{-webkit-line-clamp:2}
.handle{align-self:flex-start;display:inline-flex;align-items:center;gap:14px;background:${C.ink};color:#fff;font-size:44px;font-weight:900;
  padding:14px 34px 16px;border-radius:999px;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
`;
  const body = `
<div class="abs fade"></div>
<div class="abs wrap">
  <div class="brand brand-big"><span class="brand-mark" style="width:112px;height:112px;border-radius:32px;background:#fff">${icon('utensils', 64, C.orange, 2.4)}</span>Chốt Lẹ</div>
  ${post.outro?.line1 ? `<div class="line1 clamp">${esc(post.outro.line1)}</div>` : ''}
  ${shown.length ? `<div class="card">
    <div class="card-h">${esc(post.title)}</div>
    ${shown
      .map(
        (p, i) =>
          `<div class="row"><i>${i + 1}</i><span>${esc(p.name)}</span>${side(p) ? `<em>${esc(side(p))}</em>` : ''}</div>`,
      )
      .join('')}
  </div>` : ''}
  ${post.outro?.line2 ? `<div class="line2">${icon('bookmark', 44, '#fff', 2.4)}<span class="clamp">${esc(post.outro.line2)}</span></div>` : ''}
  ${post.handle ? `<div class="handle">${esc(post.handle)}</div>` : ''}
</div>
`;
  return doc(`${post.title} — Chốt Lẹ`, css, body, opts);
}

// ---------- API ----------

/**
 * @param {object} post xem hợp đồng trong tools/tiktok (title, subtitle, kicker, handle, places[], outro)
 * @param {{debugSafeZone?: boolean}} [opts] debugSafeZone: vẽ khung vùng an toàn để kiểm tra
 * @returns {string[]} HTML từng trang: bìa, mỗi quán một trang, trang kết
 */
export function renderSlides(post, opts = {}) {
  const p = {
    title: post?.title ?? '',
    subtitle: post?.subtitle ?? '',
    kicker: post?.kicker ?? null,
    handle: post?.handle ?? '',
    places: Array.isArray(post?.places) ? post.places : [],
    outro: post?.outro ?? { line1: '', line2: '' },
  };
  return [
    renderCover(p, opts),
    ...p.places.map((place, i) => renderPlace(p, place, i, opts)),
    renderOutro(p, opts),
  ];
}

export const SLIDE_SIZE = { width: W, height: H };
export const SAFE_ZONE = SAFE;
