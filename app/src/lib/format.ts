import type { Place } from './types';

export function formatPrice(v: number | null | undefined): string {
  if (v == null) return '';
  if (v >= 1000 && v % 1000 === 0) return `${v / 1000}k`;
  return `${v.toLocaleString('vi-VN')}đ`;
}

export function formatPriceRange(p: Pick<Place, 'price_min' | 'price_max'>): string {
  const { price_min: a, price_max: b } = p;
  if (a == null && b == null) return '';
  if (a != null && b != null && a !== b) return `${formatPrice(a)} – ${formatPrice(b)}`;
  return formatPrice(a ?? b);
}

/** "06:00:00" → "06:00" */
export function shortTime(t: string | null | undefined): string {
  return t ? t.slice(0, 5) : '';
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** null = không rõ giờ. Hỗ trợ quán mở qua đêm (vd 18:00 – 02:00). */
export function isOpenNow(p: Pick<Place, 'open_time' | 'close_time'>, now = new Date()): boolean | null {
  if (!p.open_time || !p.close_time) return null;
  const cur = now.getHours() * 60 + now.getMinutes();
  const o = toMinutes(p.open_time);
  const c = toMinutes(p.close_time);
  if (o === c) return true;
  return o < c ? cur >= o && cur < c : cur >= o || cur < c;
}

/** Bỏ dấu tiếng Việt để tìm kiếm "bun bo" ra "Bún bò". */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/** "65000" / "65k" / "65.000" → 65000 */
export function parsePrice(s: string): number | null {
  const t = s.trim().toLowerCase().replace(/[.,\sđ]/g, '');
  if (!t) return null;
  const k = t.endsWith('k');
  const n = Number(k ? t.slice(0, -1) : t);
  if (!Number.isFinite(n)) return null;
  return Math.round(k ? n * 1000 : n);
}

/** "6:00" / "06:00" / "6h" → "06:00" (hoặc null nếu sai) */
export function parseTime(s: string): string | null {
  const t = s.trim().toLowerCase().replace('h', ':');
  if (!t) return null;
  const m = t.match(/^(\d{1,2})(?::(\d{0,2}))?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2] || 0);
  if (h > 23 || mi > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
}
