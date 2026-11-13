import { Platform } from 'react-native';

import { normalize } from './format';
import { coordsFromMapsUrl, distanceKm, type Coords } from './location';
import { DISTRICTS } from './types';

/** Thông tin tự điền được từ một link Google Maps. */
export type MapsLinkInfo = {
  name?: string;
  address?: string;
  district?: string;
  /** true nếu quận được đoán theo toạ độ (không có trong địa chỉ) → admin nên kiểm tra lại. */
  districtGuessed?: boolean;
  coords?: Coords;
  /** Giờ mở/đóng "HH:MM" lấy từ OpenStreetMap (ít quán có). Bằng nhau = mở cả ngày. */
  hours?: { open: string; close: string; approx: boolean };
};

/** Có phải link Google Maps (đầy đủ hoặc rút gọn) không. */
export function isMapsLink(text: string): boolean {
  return /^https?:\/\/(?:[\w-]+\.)*(?:google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)/i.test(
    text.trim()
  );
}

/**
 * Đọc link Google Maps admin dán vào → tên, địa chỉ, quận, toạ độ.
 * Thứ tự: mở link rút gọn (chỉ trên điện thoại; web bị CORS chặn) → đọc tên/toạ độ trong URL
 * → tiêu đề trang (như bản xem trước link) → OpenStreetMap theo toạ độ → đoán quận theo toạ độ.
 */
export async function importFromMapsLink(link: string): Promise<MapsLinkInfo> {
  const input = link.trim();
  const page = await fetchPage(input);
  const url = page?.finalUrl ?? input;

  const info: MapsLinkInfo = {};
  const coords = coordsFromMapsUrl(url) ?? coordsFromMapsUrl(input);
  if (coords) info.coords = coords;

  const fromUrl = textFromUrl(url);
  info.name = fromUrl.name;
  let fullAddress = fromUrl.address;

  const title = page ? ogTitle(page.html) : null;
  if (title) {
    const [n, ...rest] = title.split(' · ');
    if (!info.name && n) info.name = n.trim();
    if (!fullAddress && rest.length) fullAddress = rest.join(', ');
  }

  let openingHours: string | undefined;
  if (coords) {
    const osm = await reverseGeocode(coords);
    if (osm) {
      if (!fullAddress) fullAddress = osm.address;
      if (!info.name && osm.name) info.name = osm.name;
      openingHours = osm.openingHours;
    }
    if (!openingHours && info.name) openingHours = await osmHoursByName(info.name, coords);
  }
  const hours = openingHours ? parseOpeningHours(openingHours) : null;
  if (hours) info.hours = hours;

  const district = fullAddress ? districtFromText(fullAddress) : null;
  if (district) info.district = district;
  else if (coords) {
    info.district = guessDistrict(coords);
    info.districtGuessed = true;
  }
  if (fullAddress) info.address = cleanAddress(fullAddress) || undefined;
  return info;
}

// ---------- Tải trang ----------

async function fetchPage(url: string): Promise<{ finalUrl: string; html: string } | null> {
  if (Platform.OS === 'web') return null; // trình duyệt chặn đọc trang google.com (CORS)
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'vi' }, signal: ctrl.signal });
    const html = await res.text();
    return { finalUrl: res.url || url, html };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function decode(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '));
  } catch {
    return s.replace(/\+/g, ' ');
  }
}

/** "/maps/place/Phở+Hòa/@…" → tên; "?q=Phở Hòa, 260C Pasteur…" → tên + địa chỉ. */
function textFromUrl(url: string): { name?: string; address?: string } {
  const place = url.match(/\/maps\/place\/([^/@?]+)/);
  if (place) {
    const text = decode(place[1]).trim();
    const [name, ...rest] = text.split(',');
    return { name: name.trim() || undefined, address: rest.join(',').trim() || undefined };
  }
  const q = url.match(/[?&](?:q|query)=([^&]+)/);
  if (q) {
    const text = decode(q[1]).trim();
    if (/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(text) || text.startsWith('place_id:')) return {};
    const [name, ...rest] = text.split(',');
    return { name: name.trim() || undefined, address: rest.join(',').trim() || undefined };
  }
  return {};
}

function ogTitle(html: string): string | null {
  const m =
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/) ??
    html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/);
  if (!m) return null;
  const text = m[1]
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
  return text && !/^google maps$/i.test(text) ? text : null;
}

// ---------- OpenStreetMap (Nominatim): miễn phí, được lưu, cần ghi nguồn ----------

type NominatimResult = {
  name?: string;
  lat?: string;
  lon?: string;
  address?: Record<string, string>;
  extratags?: Record<string, string> | null;
};

const NOMINATIM = 'https://nominatim.openstreetmap.org';
// Nominatim yêu cầu định danh ứng dụng (trình duyệt tự gửi Referer, không cho đặt User-Agent).
const NOMINATIM_INIT = Platform.OS === 'web' ? undefined : { headers: { 'User-Agent': 'AnGiHCM/1.0 (Expo app)' } };

async function reverseGeocode(c: Coords): Promise<{ name?: string; address: string; openingHours?: string } | null> {
  try {
    const res = await fetch(
      `${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&extratags=1&zoom=18&accept-language=vi&lat=${c.latitude}&lon=${c.longitude}`,
      NOMINATIM_INIT
    );
    if (!res.ok) return null;
    const d = (await res.json()) as NominatimResult;
    const a = d.address ?? {};
    const street = [a.house_number, a.road].filter(Boolean).join(' ');
    const ward = a.quarter ?? a.suburb ?? a.village ?? a.town;
    const address = [street, ward, a.city_district].filter(Boolean).join(', ');
    if (!address) return null;
    const name = a.amenity ?? a.shop ?? d.name;
    return { name: name || undefined, address, openingHours: d.extratags?.opening_hours };
  } catch {
    return null;
  }
}

/** Tìm quán cùng tên trong bán kính ~150 m có ghi giờ mở cửa trên OSM. */
async function osmHoursByName(name: string, c: Coords): Promise<string | undefined> {
  const d = 0.0015;
  const viewbox = [c.longitude - d, c.latitude + d, c.longitude + d, c.latitude - d].join(',');
  try {
    const res = await fetch(
      `${NOMINATIM}/search?format=jsonv2&extratags=1&limit=5&bounded=1&viewbox=${viewbox}&q=${encodeURIComponent(name)}`,
      NOMINATIM_INIT
    );
    if (!res.ok) return undefined;
    const list = (await res.json()) as NominatimResult[];
    const hit = list
      .filter((r) => r.extratags?.opening_hours && r.lat && r.lon)
      .map((r) => ({ r, km: distanceKm(c, { latitude: Number(r.lat), longitude: Number(r.lon) }) }))
      .sort((a, b) => a.km - b.km)[0];
    return hit && hit.km <= 0.15 ? hit.r.extratags!.opening_hours : undefined;
  } catch {
    return undefined;
  }
}

// ---------- Giờ mở cửa dạng OSM ("Mo-Su 06:00-22:00; Sa 07:00-23:00") ----------

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function countDays(rule: string): number {
  const spec = rule.split(/\d{1,2}:\d{2}/)[0];
  let n = 0;
  for (const m of spec.matchAll(/(Mo|Tu|We|Th|Fr|Sa|Su)(?:\s*-\s*(Mo|Tu|We|Th|Fr|Sa|Su))?/g)) {
    const a = DAYS.indexOf(m[1]);
    const b = m[2] ? DAYS.indexOf(m[2]) : a;
    n += ((b - a + 7) % 7) + 1;
  }
  return n || 7; // không ghi thứ = mọi ngày
}

const hhmm = (h: string, m: string) => `${String(Number(h) % 24).padStart(2, '0')}:${m}`;

/**
 * Lấy 1 khung giờ mở/đóng đại diện: luật áp dụng cho nhiều ngày nhất; nếu chia ca
 * (06:00-10:00,16:00-21:00) thì lấy giờ mở ca đầu → giờ đóng ca cuối. approx = có ngày/ca khác.
 */
export function parseOpeningHours(raw: string): { open: string; close: string; approx: boolean } | null {
  const s = raw.trim();
  if (/^24\/7$/.test(s)) return { open: '00:00', close: '00:00', approx: false };
  const rules = s.split(/\s*;\s*/).filter(Boolean);
  let best: { days: number; ranges: [string, string][] } | null = null;
  for (const rule of rules) {
    if (/\b(off|closed)\b/i.test(rule)) continue;
    const ranges = [...rule.matchAll(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g)].map(
      (m) => [hhmm(m[1], m[2]), hhmm(m[3], m[4])] as [string, string]
    );
    if (!ranges.length) continue;
    const days = countDays(rule);
    if (!best || days > best.days) best = { days, ranges };
  }
  if (!best) return null;
  return {
    open: best.ranges[0][0],
    close: best.ranges[best.ranges.length - 1][1],
    approx: rules.length > 1 || best.ranges.length > 1,
  };
}

// ---------- Quận ----------

// "Quận 1" không được khớp nhầm với "Quận 10/11/12".
const districtPatterns = DISTRICTS.map((d) => ({
  d,
  re: new RegExp(`(^|[^\\w])${normalize(d).replace(/ /g, '\\s+')}(?!\\d)`),
}));

function districtFromText(text: string): string | null {
  const s = normalize(text);
  return districtPatterns.find(({ re }) => re.test(s))?.d ?? null;
}

// Tâm gần đúng và diện tích (km²) của các quận/huyện CŨ. Đoán quận = quận có
// (khoảng cách / bán kính) nhỏ nhất, để quận lớn (Thủ Đức, Bình Chánh…) không bị quận nhỏ lấn.
const DISTRICT_CENTERS: Record<(typeof DISTRICTS)[number], [number, number, number]> = {
  'Quận 1': [10.7756, 106.7004, 7.7],
  'Quận 3': [10.7843, 106.6844, 4.9],
  'Quận 4': [10.7579, 106.704, 4.2],
  'Quận 5': [10.754, 106.6634, 4.3],
  'Quận 6': [10.748, 106.6352, 7.2],
  'Quận 7': [10.734, 106.7216, 35.7],
  'Quận 8': [10.724, 106.6286, 19.1],
  'Quận 10': [10.7728, 106.668, 5.7],
  'Quận 11': [10.7629, 106.6505, 5.1],
  'Quận 12': [10.8672, 106.6413, 52.8],
  'Bình Thạnh': [10.8106, 106.7091, 20.8],
  'Phú Nhuận': [10.7992, 106.6803, 4.9],
  'Gò Vấp': [10.8387, 106.6653, 19.7],
  'Tân Bình': [10.8015, 106.6527, 22.4],
  'Tân Phú': [10.7918, 106.6282, 16],
  'Bình Tân': [10.7652, 106.6038, 52],
  'Thủ Đức': [10.8231, 106.769, 211],
  'Nhà Bè': [10.695, 106.74, 100],
  'Bình Chánh': [10.688, 106.594, 252],
  'Hóc Môn': [10.889, 106.595, 109],
  'Củ Chi': [10.973, 106.493, 435],
  'Cần Giờ': [10.411, 106.954, 704],
};

function guessDistrict(c: Coords): string {
  let best: string = DISTRICTS[0];
  let bestScore = Infinity;
  for (const d of DISTRICTS) {
    const [lat, lng, area] = DISTRICT_CENTERS[d];
    const score = distanceKm(c, { latitude: lat, longitude: lng }) / Math.sqrt(area / Math.PI);
    if (score < bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

/** Bỏ phần thừa: thành phố, quốc gia, mã bưu chính, khu phố, và quận (đã có ô riêng). */
function cleanAddress(text: string): string {
  return text
    .split(',')
    .map((p) => p.trim())
    .filter((p) => {
      const n = normalize(p);
      return (
        p &&
        !/ho chi minh|^tp\.? ?hcm$|viet ?nam|^\d{5,6}$|^khu pho /.test(n) &&
        // bỏ "Quận 3", "Bình Thạnh"… nhưng giữ phường trùng tên ("Phường Bình Thạnh")
        !(districtFromText(p) && !/^(phuong|xa|p\.) /.test(n))
      );
    })
    .join(', ');
}
