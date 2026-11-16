// Chốt Lẹ – logo vòng 2: định nghĩa ký hiệu (vector thuần, không phụ thuộc font).
// Mọi ký hiệu vẽ trong khung 1024x1024, màu trắng; phần khoét dùng mask để nền nào cũng đúng.

export const ORANGE_A = '#F57A2C';
export const ORANGE_B = '#C94705';
export const INK = '#1E1A16';

export const grad = (id) =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1024" y2="1024"><stop offset="0" stop-color="${ORANGE_A}"/><stop offset="1" stop-color="${ORANGE_B}"/></linearGradient>`;

const f = (n) => +n.toFixed(1);

// Ghim bản đồ hình học: đầu tròn tâm (cx,cy) bán kính r, mũi nhọn cách tâm d (hướng xuống).
export function pinPath(cx, cy, r, d, tipRound = 0.12) {
  const s = r / d; // sin góc tiếp tuyến
  const c = Math.sqrt(1 - s * s);
  const rx = cx + r * c, ry = cy + r * s; // tiếp điểm phải
  const lx = cx - r * c;
  const tipY = cy + d;
  // bo nhẹ mũi ghim
  const k = tipRound;
  const pRx = cx + (rx - cx) * k, pRy = tipY + (ry - tipY) * k;
  const pLx = cx - (rx - cx) * k;
  return `M${f(rx)} ${f(ry)}A${r} ${r} 0 1 0 ${f(lx)} ${f(ry)}L${f(pLx)} ${f(pRy)}Q${f(cx)} ${f(tipY + 4)} ${f(pRx)} ${f(pRy)}Z`;
}

/* ---------------- A. CON DẤU CHỐT ---------------- */
// Con dấu chữ nhật bo góc, nghiêng -9°, viền đôi, chữ CHỐT khối đậm (vẽ tay bằng nét).
function stampLetters(sw) {
  const T = -47, B = 163, W = 150, G = 24; // đỉnh chữ, chân chữ, rộng chữ, khoảng cách
  const x0 = -(4 * W + 3 * G) / 2;
  const h = sw / 2;
  const xs = [0, 1, 2, 3].map((i) => x0 + i * (W + G));
  const mid = (T + B) / 2 + 4;
  const rr = 46;
  const [c, hh, o, t] = xs;
  const C = `M${c + W - 6} ${T + h}H${c + h + rr}A${rr} ${rr} 0 0 0 ${c + h} ${T + h + rr}V${B - h - rr}A${rr} ${rr} 0 0 0 ${c + h + rr} ${B - h}H${c + W - 6}`;
  const H = `M${hh + h} ${T}V${B}M${hh + W - h} ${T}V${B}M${hh + h} ${mid}H${hh + W - h}`;
  const O = `M${o + h + rr} ${T + h}H${o + W - h - rr}A${rr} ${rr} 0 0 1 ${o + W - h} ${T + h + rr}V${B - h - rr}A${rr} ${rr} 0 0 1 ${o + W - h - rr} ${B - h}H${o + h + rr}A${rr} ${rr} 0 0 1 ${o + h} ${B - h - rr}V${T + h + rr}A${rr} ${rr} 0 0 1 ${o + h + rr} ${T + h}Z`;
  const Tt = `M${t} ${T + h}H${t + W}M${t + W / 2} ${T + h}V${B}`;
  // dấu mũ + dấu sắc trên Ô
  const hat = `M${o + 26} ${T - 22}L${o + 72} ${T - 66}L${o + 118} ${T - 22}`;
  const acute = `M${o + 124} ${T - 74}L${o + 160} ${T - 116}`;
  return { body: `${C}${H}${O}${Tt}`, hat, acute };
}

export function symbolA(p, { texture = true } = {}) {
  const W = 840, H = 500, R = 74, sw = 46;
  const L = stampLetters(54);
  const inset = 44;
  // vết mực: vài lỗ nhỏ trên viền và chữ (vector, không nhiễu)
  const nicks = texture
    ? [
        // "cắn" vào mép ngoài viền: chỗ mực không ăn
        [-250, -276, 21], [-205, -280, 11], [70, -277, 12], [300, 277, 25], [345, 280, 10], [-120, 278, 12],
        [446, -110, 19], [-446, 92, 17], [-446, 130, 8],
      ]
        .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#000"/>`)
        .join('')
    : '';
  // hai đoạn viền bị "mất mực"
  const gaps = texture
    ? `<path d="M120 -212h84v-24h-84z M-392 -20v62h20v-62z" fill="#000"/>`
    : '';
  return `<defs><mask id="${p}m" maskUnits="userSpaceOnUse" x="-600" y="-600" width="1200" height="1200"><rect x="-600" y="-600" width="1200" height="1200" fill="#fff"/>${nicks}${gaps}</mask></defs>
<g transform="translate(512 520) rotate(-9) scale(0.84)"><g mask="url(#${p}m)" fill="none" stroke="#fff">
<rect x="${-W / 2}" y="${-H / 2}" width="${W}" height="${H}" rx="${R}" stroke-width="${sw}"/>
<rect x="${-W / 2 + inset}" y="${-H / 2 + inset}" width="${W - 2 * inset}" height="${H - 2 * inset}" rx="${R - inset + 6}" stroke-width="12"/>
<path d="${L.body}" stroke-width="54" stroke-linejoin="round"/>
<path d="${L.hat}" stroke-width="30" stroke-linejoin="miter"/>
<path d="${L.acute}" stroke-width="30"/>
</g></g>`;
}

/* ---------------- B. DẤU NẶNG THÀNH GHIM ---------------- */
// chữ e đậm vẽ tay: vòng cung dày + thanh ngang; mở ở góc dưới phải.
function eGlyph(cx, cy, R, sw, bar) {
  const a1 = (6 * Math.PI) / 180, a2 = (38 * Math.PI) / 180;
  const sx = cx + R * Math.cos(a1), sy = cy + R * Math.sin(a1);
  const ex = cx + R * Math.cos(a2), ey = cy + R * Math.sin(a2);
  const arc = `<path d="M${f(sx)} ${f(sy)}A${R} ${R} 0 1 0 ${f(ex)} ${f(ey)}" fill="none" stroke="#fff" stroke-width="${sw}"/>`;
  const barRect = `<rect x="${f(cx - R)}" y="${f(cy - bar / 2 + 6)}" width="${f(2 * R + sw / 2)}" height="${bar}" fill="#fff"/>`;
  return arc + barRect;
}

export function symbolB(p, { variant = 'Le' } = {}) {
  if (variant === 'e') {
    const R = 186, sw = 128, pr = 80, pd = 182, gap = 34;
    const total = 2 * (R + sw / 2) + gap + pr + pd;
    const cx = 512, cy = (1024 - total) / 2 + R + sw / 2;
    const pcy = cy + R + sw / 2 + gap + pr;
    return `<defs><mask id="${p}m" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024"><rect width="1024" height="1024" fill="#fff"/><circle cx="512" cy="${pcy}" r="31" fill="#000"/></mask></defs>
<g mask="url(#${p}m)">${eGlyph(cx, cy, R, sw, 96)}<path d="${pinPath(512, pcy, pr, pd)}" fill="#fff"/></g>`;
  }
  // "Lẹ"
  const base = 622; // chân chữ
  const sw = 104, R = 136, ox = 0;
  const Ltop = 132, Lx = 196 + ox, Lw = 118, footW = 238;
  const cx = 642 + ox, cy = base - R - sw / 2;
  const pr = 76, pcy = base + 40 + pr;
  return `<defs><mask id="${p}m" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024"><rect width="1024" height="1024" fill="#fff"/><circle cx="${cx}" cy="${pcy}" r="30" fill="#000"/></mask></defs>
<g mask="url(#${p}m)">
<path d="M${Lx} ${Ltop}h${Lw}v${base - Ltop - Lw + 8}h${footW - Lw}v${Lw - 8}h${-footW}z" fill="#fff"/>
${eGlyph(cx, cy, R, sw, 84)}
<path d="${pinPath(cx, pcy, pr, 172)}" fill="#fff"/></g>`;
}

// Round 1 (tham chiếu): ghim + dấu tích
export function symbolV1(p) {
  return `<path d="M298.8 585.7A270 270 0 1 1 725.2 585.7L538 838Q512 872 486 838Z" fill="#fff"/>
<path d="M378 432L470 522L760 232" fill="none" stroke="url(#${p}g)" stroke-width="80" stroke-linecap="round" stroke-linejoin="round"/>`;
}

export const SYMBOLS = {
  A: (p, o) => symbolA(p, o),
  B: (p, o) => symbolB(p, o),
  C: (p, o) => symbolCstroke(p, o),
  V1: (p) => symbolV1(p),
};

/* ---------------- C. GHIM TỐC ĐỘ ---------------- */
// Ghim vẽ bằng MỘT nét nhanh – nét vào từ bên trái (vệt tốc độ),
// ôm đầu ghim, xuống mũi, quay lên và dừng, khép kín vòng ngay dưới nét vào (nối liền, không lộ đầu nét).
export function symbolCstroke(p, { cx = 630, cy = 412, R = 186, D = 404, sw = 108, x0 = 190, endDeg = 270, dot = true, extra = true } = {}) {
  const s = R / D, c = Math.sqrt(1 - s * s);
  const rtx = cx + R * c, rty = cy + R * s, ltx = cx - R * c;
  const tipY = cy + D;
  const a = (endDeg * Math.PI) / 180;
  const ex = cx + R * Math.cos(a), ey = cy + R * Math.sin(a);
  const d = `M${x0} ${cy - R}H${cx}A${R} ${R} 0 0 1 ${f(rtx)} ${f(rty)}L${cx} ${tipY}L${f(ltx)} ${f(rty)}A${R} ${R} 0 0 1 ${f(ex)} ${f(ey)}`;
  const extraLine = extra ? `<path d="M${x0 + 40} ${cy - R + 150}H${cx - R - 130}" stroke="#fff" stroke-width="${sw * 0.7}" stroke-linecap="round"/>` : '';
  return `<path d="${d}" fill="none" stroke="#fff" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>${
    dot ? `<circle cx="${cx}" cy="${cy}" r="${R * 0.36}" fill="#fff"/>` : ''
  }${extraLine}`;
}

// Icon hoàn chỉnh: nền gradient + ký hiệu. rounded = bo góc kiểu iOS (cho bản xem trước).
let uid = 0;
export function iconSvg(key, { size = 1024, rounded = false, opts = {}, standalone = true } = {}) {
  const p = `${key}${uid++}_`;
  const rx = rounded ? ' rx="229"' : '';
  const inner = `<defs>${grad(p + 'g')}</defs><rect width="1024" height="1024"${rx} fill="url(#${p}g)"/>${SYMBOLS[key](p, opts)}`;
  const ns = standalone ? ' xmlns="http://www.w3.org/2000/svg"' : '';
  return `<svg${ns} viewBox="0 0 1024 1024" width="${size}" height="${size}">${inner}</svg>`;
}
