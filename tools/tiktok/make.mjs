#!/usr/bin/env node
// Tạo bài ảnh lướt (carousel) TikTok 1080×1920 từ quán đang hiển thị trong Chốt Lẹ.
// Cách dùng: xem tools/tiktok/README.md. Ví dụ:
//   node tools/tiktok/make.mjs --mon oc --gia 100 --khu "Bình Thạnh"
//   node tools/tiktok/make.mjs --dip hen-ho --tien-ich may-lanh --so 4
//   node tools/tiktok/make.mjs --quan "bò né 68, phan thiết" --tieu-de "2 quán ruột của team"
//   node tools/tiktok/make.mjs --mau        (dùng dữ liệu mẫu, không cần mạng tới Supabase)
//
// Chỉ đọc quán is_published = true bằng khoá publishable (giống app), không cần khoá bí mật.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { renderSlides } from './template.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT_ROOT = path.join(ROOT, 'tiktok-posts');
const HANDLE = '@chotle';

const OCCASIONS = {
  'ban-be': 'Đi nhóm bạn',
  'hen-ho': 'Hẹn hò',
  'mot-minh': 'Đi một mình',
  'gia-dinh': 'Gia đình',
  'cong-viec': 'Làm việc / Gặp đối tác',
};
const OCCASION_TITLE = {
  'ban-be': 'đi nhóm bạn',
  'hen-ho': 'để hẹn hò',
  'mot-minh': 'đi một mình',
  'gia-dinh': 'cho cả nhà',
  'cong-viec': 'để tiếp khách',
};
const AMENITIES = {
  'may-lanh': 'Máy lạnh',
  'giu-xe': 'Chỗ để xe máy',
  'o-to': 'Chỗ đậu ô tô',
  wifi: 'Wifi',
  the: 'Nhận thẻ / chuyển khoản',
  'phong-rieng': 'Phòng riêng',
  'ngoai-troi': 'Ngồi ngoài trời',
};

// ---------- Tham số dòng lệnh ----------
const HELP = `Tạo bài ảnh TikTok từ quán trong Chốt Lẹ.

  --khu "Bình Thạnh"      Lọc theo quận (nhiều quận: "Quận 1, Quận 3")
  --gia 100               Giá tối đa, đơn vị nghìn (100 = dưới 100k)
  --mon oc                Món/danh mục: so với danh mục, tên quán, tên món (không cần dấu)
  --dip hen-ho            Dịp: ${Object.keys(OCCASIONS).join(', ')}
  --tien-ich may-lanh     Tiện ích (nhiều: "may-lanh,giu-xe"): ${Object.keys(AMENITIES).join(', ')}
  --quan "tên 1, tên 2"   Chọn đúng các quán này (theo một phần tên), giữ thứ tự
  --so 5                  Số quán (mặc định 5, tối đa 10)
  --ngau-nhien            Trộn ngẫu nhiên thay vì ưu tiên quán nổi bật
  --tieu-de "..."         Tự đặt tiêu đề ảnh bìa
  --phu-de "..."          Tự đặt dòng phụ dưới tiêu đề
  --mau                   Dùng dữ liệu mẫu (thử giao diện)
  --chi-html              Chỉ xuất file HTML, không chụp PNG
`;

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) continue;
    const key = k.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) a[key] = true;
    else {
      a[key] = next;
      i++;
    }
  }
  return a;
}

const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
const list = (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

// ---------- Định dạng ----------
function k(n) {
  if (n == null) return null;
  if (n < 1000) return `${n}đ`;
  const v = Math.round(n / 100) / 10;
  return `${String(v).replace('.', ',')}k`;
}
function priceText(p) {
  if (p.price_min && p.price_max && p.price_max !== p.price_min) return `${k(p.price_min)} – ${k(p.price_max)}`;
  if (p.price_min || p.price_max) return `~${k(p.price_min ?? p.price_max)}`;
  return null;
}
const hhmm = (t) => (t ? String(t).slice(0, 5) : null);
function hoursText(p) {
  const o = hhmm(p.open_time);
  const c = hhmm(p.close_time);
  return o && c ? `${o} – ${c}` : null;
}

// ---------- Dữ liệu ----------
function readEnv() {
  const file = path.join(ROOT, 'app', '.env');
  if (!fs.existsSync(file)) fail('Không thấy app/.env (cần EXPO_PUBLIC_SUPABASE_URL và _PUBLISHABLE_KEY). Dùng --mau để thử với dữ liệu mẫu.');
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) fail('app/.env thiếu EXPO_PUBLIC_SUPABASE_URL hoặc EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  return { url: url.replace(/\/$/, ''), key };
}

async function rest(env, pathAndQuery) {
  const res = await fetch(`${env.url}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: env.key, Authorization: `Bearer ${env.key}` },
  });
  if (!res.ok) fail(`Supabase trả lỗi ${res.status}: ${await res.text()}`);
  return res.json();
}

async function loadPlaces() {
  const env = readEnv();
  const [places, cats] = await Promise.all([
    rest(env, 'places?select=*,place_categories(category_id),dishes(*),place_photos(*)&is_published=eq.true'),
    rest(env, 'categories?select=id,name'),
  ]);
  // Bỏ ảnh trình duyệt không hiển thị được (vd HEIC từ iPhone mang đuôi .jpg).
  const urls = [...new Set(places.flatMap((p) => [p.cover_image_url, ...(p.place_photos ?? []).map((x) => x.url)]).filter(Boolean))];
  const okType = /^image\/(jpeg|png|webp|gif|avif)/;
  const bad = new Set();
  await Promise.all(
    urls.map((u) =>
      fetch(u, { method: 'HEAD' })
        .then((r) => {
          if (!r.ok || !okType.test(r.headers.get('content-type') ?? '')) bad.add(u);
        })
        .catch(() => bad.add(u))
    )
  );
  if (bad.size) console.warn(`! Bỏ qua ${bad.size} ảnh không hiển thị được trên web (thường là ảnh HEIC của iPhone).`);
  for (const p of places) {
    if (bad.has(p.cover_image_url)) p.cover_image_url = null;
    p.place_photos = (p.place_photos ?? []).filter((x) => !bad.has(x.url));
  }

  const catName = new Map(cats.map((c) => [c.id, c.name]));
  for (const p of places) {
    p.categoryNames = (p.place_categories ?? []).map((c) => catName.get(c.category_id)).filter(Boolean);
    p.place_photos = (p.place_photos ?? []).sort((a, b) => a.sort_order - b.sort_order);
    p.dishes = (p.dishes ?? []).sort((a, b) => Number(b.is_signature) - Number(a.is_signature) || a.sort_order - b.sort_order);
  }
  return places;
}

// ---------- Lọc & chọn ----------
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(places, args) {
  const count = Math.min(10, Math.max(1, Number(args.so) || 5));

  const named = list(args.quan);
  if (named.length) {
    const chosen = [];
    for (const q of named) {
      const hit = places.find((p) => norm(p.name).includes(norm(q)) && !chosen.includes(p));
      if (!hit) fail(`Không tìm thấy quán nào có tên chứa "${q}".`);
      chosen.push(hit);
    }
    return chosen;
  }

  let out = places;
  const khu = list(args.khu).map(norm);
  if (khu.length) out = out.filter((p) => khu.some((d) => norm(p.district) === d || norm(p.district).includes(d)));
  if (args.gia) {
    const max = Number(args.gia) * 1000;
    if (!max) fail('--gia phải là số (nghìn đồng), vd --gia 100');
    out = out.filter((p) => {
      const top = p.price_max ?? p.price_min;
      return top != null && top <= max;
    });
  }
  if (args.mon && args.mon !== true) {
    const q = norm(args.mon);
    out = out.filter(
      (p) =>
        p.categoryNames.some((c) => norm(c).includes(q)) ||
        norm(p.name).includes(q) ||
        p.dishes.some((d) => norm(d.name).includes(q))
    );
  }
  if (args.dip) {
    if (!OCCASIONS[args.dip]) fail(`--dip không hợp lệ. Chọn một trong: ${Object.keys(OCCASIONS).join(', ')}`);
    out = out.filter((p) => (p.occasions ?? []).includes(args.dip));
  }
  for (const a of list(args['tien-ich'])) {
    if (!AMENITIES[a]) fail(`--tien-ich "${a}" không hợp lệ. Chọn trong: ${Object.keys(AMENITIES).join(', ')}`);
    out = out.filter((p) => (p.amenities ?? []).includes(a));
  }

  if (!out.length) fail('Không có quán nào khớp bộ lọc. Thử nới điều kiện (bỏ --gia, --khu…).');

  // Ưu tiên quán nổi bật, có ảnh, có món; --ngau-nhien thì trộn.
  const score = (p) => (p.is_featured ? 4 : 0) + (p.cover_image_url || p.place_photos.length ? 3 : 0) + (p.dishes.length ? 1 : 0);
  out = args['ngau-nhien'] ? shuffle(out) : [...out].sort((a, b) => score(b) - score(a));
  if (out.length < count) console.warn(`! Chỉ có ${out.length} quán khớp (muốn ${count}).`);
  return out.slice(0, count);
}

function toSlidePlace(p, args) {
  const photos = [p.cover_image_url, ...p.place_photos.map((x) => x.url)].filter(Boolean);
  const tags = [];
  if (args.dip && OCCASIONS[args.dip]) tags.push(OCCASIONS[args.dip]);
  for (const a of list(args['tien-ich'])) tags.push(AMENITIES[a]);
  for (const o of p.occasions ?? []) if (OCCASIONS[o] && !tags.includes(OCCASIONS[o])) tags.push(OCCASIONS[o]);
  for (const a of p.amenities ?? []) if (AMENITIES[a] && !tags.includes(AMENITIES[a])) tags.push(AMENITIES[a]);
  const dealActive = p.deal_title && (!p.deal_until || p.deal_until >= new Date().toISOString().slice(0, 10));
  return {
    name: p.name,
    district: p.district,
    address: p.address,
    priceText: priceText(p),
    hours: hoursText(p),
    photos: [...new Set(photos)],
    dishes: p.dishes.slice(0, 3).map((d) => ({ name: d.name, priceText: k(d.price), signature: !!d.is_signature })),
    tags: tags.slice(0, 3),
    deal: dealActive ? p.deal_title : null,
  };
}

function buildPost(places, args) {
  const n = places.length;
  const khu = list(args.khu);
  const mon = args.mon && args.mon !== true ? String(args.mon).trim() : '';
  let title = `${n} quán ${mon || 'ngon'}`;
  if (args.dip && OCCASION_TITLE[args.dip]) title += ` ${OCCASION_TITLE[args.dip]}`;
  if (args.gia) title += ` dưới ${args.gia}k`;
  const subtitle = khu.length === 1 ? `ở ${khu[0]}` : khu.length ? `ở ${khu.join(', ')}` : 'ở Sài Gòn';
  const amen = list(args['tien-ich']).map((a) => AMENITIES[a]);
  return {
    title: typeof args['tieu-de'] === 'string' ? args['tieu-de'] : title,
    subtitle: typeof args['phu-de'] === 'string' ? args['phu-de'] : subtitle,
    kicker: args.dip ? OCCASIONS[args.dip] : amen.length ? amen.join(' · ') : null,
    handle: HANDLE,
    places: places.map((p) => toSlidePlace(p, args)),
    outro: { line1: 'Lưu lại để đi ăn nhé', line2: `Theo dõi ${HANDLE} để chốt quán mỗi ngày` },
  };
}

// ---------- Caption + hashtag ----------
function hashtag(s) {
  return '#' + norm(s).replace(/[^a-z0-9]+/g, '');
}
function caption(post, args) {
  const lines = [`${post.title} ${post.subtitle} 👇`, ''];
  post.places.forEach((p, i) => {
    lines.push(`${i + 1}. ${p.name} – ${p.district}${p.priceText ? ` – ${p.priceText}` : ''}`);
  });
  lines.push('', 'Bạn đã thử quán nào chưa? Comment quán ruột của bạn nhé!', '');
  const tags = new Set(['#chotle', '#angisaigon', '#ancungtiktok', '#reviewanngon', '#saigonfood']);
  for (const d of new Set(post.places.map((p) => p.district))) tags.add(hashtag(`an ngon ${d}`));
  if (args.mon && args.mon !== true) tags.add(hashtag(String(args.mon))).add(hashtag(`${args.mon} sai gon`));
  if (args.dip === 'hen-ho') tags.add('#hendo').add('#quanhendo');
  if (args.gia) tags.add('#angire');
  lines.push([...tags].slice(0, 10).join(' '));
  return lines.join('\n');
}

// ---------- Chụp ảnh bằng Edge headless (CDP) ----------
function findEdge() {
  const cands = [
    process.env.EDGE_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
  ].filter(Boolean);
  const hit = cands.find((p) => fs.existsSync(p));
  if (!hit) fail('Không tìm thấy Microsoft Edge/Chrome. Đặt biến EDGE_PATH tới file trình duyệt.');
  return hit;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let s = '';
        res.on('data', (c) => (s += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(s));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

async function withBrowser(fn) {
  const profile = fs.mkdtempSync(path.join(OUT_ROOT, '.edge-'));
  const proc = spawn(
    findEdge(),
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--allow-file-access-from-files',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    let port = null;
    for (let i = 0; i < 100 && !port; i++) {
      await sleep(100);
      try {
        // File có thể đang được ghi dở (EBUSY trên Windows) → thử lại ở vòng sau.
        const txt = fs.readFileSync(portFile, 'utf8');
        if (txt.includes('\n')) port = Number(txt.split('\n')[0]) || null;
      } catch {
        // chưa có hoặc đang khoá
      }
    }
    if (!port) throw new Error('Trình duyệt không khởi động được.');
    const targets = await getJson(`http://127.0.0.1:${port}/json/list`);
    const page = targets.find((t) => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });
    let id = 0;
    const pending = new Map();
    const waiters = [];
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const w of [...waiters]) if (w.method === msg.method) {
          waiters.splice(waiters.indexOf(w), 1);
          w.resolve(msg.params);
        }
      }
    };
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const mid = ++id;
        pending.set(mid, { resolve, reject });
        ws.send(JSON.stringify({ id: mid, method, params }));
      });
    const once = (method, timeout = 20000) =>
      new Promise((resolve) => {
        const w = { method, resolve };
        waiters.push(w);
        setTimeout(() => {
          const i = waiters.indexOf(w);
          if (i >= 0) waiters.splice(i, 1);
          resolve(null);
        }, timeout);
      });
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });
    const result = await fn({ send, once });
    ws.close();
    // Đóng cả trình duyệt (kể cả tiến trình con) qua kết nối cấp trình duyệt.
    try {
      const { webSocketDebuggerUrl } = await getJson(`http://127.0.0.1:${port}/json/version`);
      const bws = new WebSocket(webSocketDebuggerUrl);
      await new Promise((res, rej) => {
        bws.onopen = res;
        bws.onerror = rej;
      });
      bws.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
      await sleep(800);
    } catch {
      // sẽ buộc tắt ở dưới
    }
    return result;
  } finally {
    if (proc.exitCode === null) {
      if (process.platform === 'win32') spawn('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
      else proc.kill();
    }
    await sleep(600);
    for (let i = 0; i < 5; i++) {
      try {
        fs.rmSync(profile, { recursive: true, force: true });
        break;
      } catch {
        await sleep(400);
      }
    }
  }
}

async function shoot(htmlFiles) {
  return withBrowser(async ({ send, once }) => {
    for (const file of htmlFiles) {
      const loaded = once('Page.loadEventFired');
      await send('Page.navigate', { url: pathToFileURL(file).href });
      await loaded;
      // Chờ font + mọi ảnh tải xong (tối đa 15 giây), rồi thêm chút cho chắc.
      await send('Runtime.evaluate', {
        awaitPromise: true,
        expression: `Promise.race([
          Promise.all([document.fonts.ready, ...[...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))]),
          new Promise(r => setTimeout(r, 15000))
        ]).then(() => [...document.images].filter(i => !i.naturalWidth).map(i => i.src))`,
        returnByValue: true,
      }).then((r) => {
        const broken = r?.result?.value ?? [];
        if (broken.length) console.warn(`! ${path.basename(file)}: ${broken.length} ảnh không tải được`);
      });
      await sleep(250);
      const { data } = await send('Page.captureScreenshot', {
        format: 'png',
        clip: { x: 0, y: 0, width: 1080, height: 1920, scale: 1 },
      });
      fs.writeFileSync(file.replace(/\.html$/, '.png'), Buffer.from(data, 'base64'));
      process.stdout.write('.');
    }
    process.stdout.write('\n');
  });
}

// ---------- Chạy ----------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    console.log(HELP);
    return;
  }
  fs.mkdirSync(OUT_ROOT, { recursive: true });

  let post;
  if (args.mau) {
    const { samplePost } = await import('./sample-post.mjs');
    post = samplePost;
  } else {
    const places = await loadPlaces();
    if (!places.length) fail('Chưa có quán nào đang hiển thị trên Supabase.');
    post = buildPost(pick(places, args), args);
  }

  const date = new Date().toISOString().slice(0, 10);
  const slug = norm(`${post.title} ${post.subtitle}`).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  let dir = path.join(OUT_ROOT, `${date}-${slug}`);
  for (let i = 2; fs.existsSync(dir); i++) dir = path.join(OUT_ROOT, `${date}-${slug}-${i}`);
  fs.mkdirSync(dir, { recursive: true });

  const slides = renderSlides(post);
  const files = slides.map((html, i) => {
    const f = path.join(dir, `${String(i + 1).padStart(2, '0')}.html`);
    fs.writeFileSync(f, html, 'utf8');
    return f;
  });
  fs.writeFileSync(path.join(dir, 'caption.txt'), caption(post, args), 'utf8');
  fs.writeFileSync(path.join(dir, 'post.json'), JSON.stringify(post, null, 2), 'utf8');

  console.log(`Bài: ${post.title} ${post.subtitle} (${post.places.length} quán, ${slides.length} ảnh)`);
  post.places.forEach((p, i) => console.log(`  ${i + 1}. ${p.name} – ${p.district}`));

  if (!args['chi-html']) {
    process.stdout.write('Đang chụp ảnh ');
    await shoot(files);
    for (const f of files) fs.rmSync(f);
  }
  console.log(`\n✓ Xong: ${dir}${os.EOL}  Ảnh 01.png… + caption.txt (dán làm mô tả bài đăng).`);
}

main().catch((e) => fail(e?.stack || String(e)));
