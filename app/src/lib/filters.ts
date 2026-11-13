import { formatPrice, isOpenNow, normalize } from './format';
import { placeDistance, type Coords } from './location';
import { amenityLabel, DISTRICTS, OCCASIONS, occasionLabel, type Category, type PlaceWithRelations } from './types';

/** Toàn bộ tiêu chí lọc ở trang chủ (dùng chung cho danh sách, "Gợi ý" và tìm bằng câu nói). */
export type Filters = {
  query: string;
  categoryId: number | null;
  district: string | null;
  maxPrice: number | null;
  openOnly: boolean;
  occasion: string | null;
  /** Bật "Gần tôi": sắp xếp theo khoảng cách. */
  nearMe: boolean;
  /** Bán kính (km); chỉ có tác dụng khi biết vị trí. */
  radiusKm: number | null;
  /** Tiện ích bắt buộc phải có (máy lạnh, chỗ để xe…). */
  amenities: string[];
};

export const EMPTY_FILTERS: Filters = {
  query: '',
  categoryId: null,
  district: null,
  maxPrice: null,
  openOnly: false,
  occasion: null,
  nearMe: false,
  radiusKm: null,
  amenities: [],
};

export const RADIUS_OPTIONS = [1, 3, 5, 10];
export const PRICE_OPTIONS = [50000, 100000, 200000];

export const priceLabel = (max: number) => `Dưới ${formatPrice(max)}`;

export type PlaceWithDistance = PlaceWithRelations & { distanceKm: number | null };

/** Lọc + (khi bật Gần tôi) sắp xếp theo khoảng cách. */
export function applyFilters(places: PlaceWithRelations[], f: Filters, me: Coords | null): PlaceWithDistance[] {
  const q = normalize(f.query);
  const out: PlaceWithDistance[] = [];
  for (const p of places) {
    const d = placeDistance(p, me);
    if (q) {
      const dishNames = (p.dishes ?? []).map((x) => x.name).join(' ');
      if (!normalize(`${p.name} ${p.address} ${p.district} ${p.description ?? ''} ${dishNames}`).includes(q)) continue;
    }
    if (f.categoryId != null && !p.place_categories.some((c) => c.category_id === f.categoryId)) continue;
    if (f.district && p.district !== f.district) continue;
    if (f.maxPrice != null && (p.price_min ?? 0) > f.maxPrice) continue;
    if (f.openOnly && isOpenNow(p) === false) continue;
    if (f.occasion && !(p.occasions ?? []).includes(f.occasion)) continue;
    if (f.radiusKm != null && me && (d == null || d > f.radiusKm)) continue;
    if (f.amenities.length && !f.amenities.every((a) => (p.amenities ?? []).includes(a))) continue;
    out.push({ ...p, distanceKm: d });
  }
  if (f.nearMe && me) {
    out.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }
  return out;
}

export function isFilterActive(f: Filters) {
  return Boolean(
    f.query || f.categoryId != null || f.district || f.maxPrice != null || f.openOnly || f.occasion || f.nearMe || f.radiusKm != null || f.amenities.length
  );
}

/** Tóm tắt tiêu chí thành các nhãn ngắn, vd ["Gần tôi ≤ 3 km", "Hẹn hò", "Dưới 200k"]. */
export function describeFilters(f: Filters, categories: Category[]): string[] {
  const out: string[] = [];
  if (f.nearMe || f.radiusKm != null) out.push(f.radiusKm != null ? `Trong ${f.radiusKm} km` : 'Gần tôi');
  if (f.categoryId != null) {
    const c = categories.find((x) => x.id === f.categoryId);
    if (c) out.push(c.name);
  }
  if (f.occasion) out.push(occasionLabel(f.occasion));
  if (f.maxPrice != null) out.push(priceLabel(f.maxPrice));
  if (f.openOnly) out.push('Đang mở');
  if (f.district) out.push(f.district);
  f.amenities.forEach((a) => out.push(amenityLabel(a)));
  if (f.query) out.push(`“${f.query}”`);
  return out;
}

/** "Vì sao hợp": các tiêu chí quán khớp với câu người dùng, vd "Hẹn hò · Ngồi ngoài trời · cách 1,4 km". */
export function matchReason(p: PlaceWithDistance, f: Filters): string {
  // Chỉ lý do "mềm" (mục đích, tiện ích): giá và khoảng cách đã hiện sẵn trên thẻ. Tối đa 2 lý do cho gọn.
  const out: string[] = [];
  if (f.occasion && (p.occasions ?? []).includes(f.occasion)) out.push(occasionLabel(f.occasion));
  f.amenities.forEach((a) => (p.amenities ?? []).includes(a) && out.push(amenityLabel(a)));
  return out.slice(0, 2).join(' · ');
}

/** Từng tiêu chí đang bật kèm cách bỏ riêng nó (cho các chip có nút ✕). */
export function filterItems(f: Filters, categories: Category[]): { key: string; label: string; clear: Partial<Filters> }[] {
  const out: { key: string; label: string; clear: Partial<Filters> }[] = [];
  if (f.nearMe || f.radiusKm != null)
    out.push({ key: 'near', label: f.radiusKm != null ? `Trong ${f.radiusKm} km` : 'Gần tôi', clear: { nearMe: false, radiusKm: null } });
  const c = categories.find((x) => x.id === f.categoryId);
  if (c) out.push({ key: 'cat', label: c.name, clear: { categoryId: null } });
  if (f.occasion) out.push({ key: 'occ', label: occasionLabel(f.occasion), clear: { occasion: null } });
  if (f.maxPrice != null) out.push({ key: 'price', label: priceLabel(f.maxPrice), clear: { maxPrice: null } });
  if (f.openOnly) out.push({ key: 'open', label: 'Đang mở', clear: { openOnly: false } });
  if (f.district) out.push({ key: 'dist', label: f.district, clear: { district: null } });
  f.amenities.forEach((a) =>
    out.push({ key: `am-${a}`, label: amenityLabel(a), clear: { amenities: f.amenities.filter((x) => x !== a) } })
  );
  if (f.query) out.push({ key: 'q', label: `“${f.query}”`, clear: { query: '' } });
  return out;
}

// ---------------------------------------------------------------------------
// Hiểu câu tìm kiếm tiếng Việt (chạy trên máy, không cần AI).
// Vd: "lẩu dưới 200k gần tôi 3km đi nhóm 4 người" → Lẩu/Nướng, ≤200k, ≤3 km, Đi nhóm bạn.
// Bản AI (Supabase Edge Function) trả về cùng cấu trúc ParsedQuery.
// ---------------------------------------------------------------------------

export type ParsedQuery = {
  categoryId: number | null;
  district: string | null;
  maxPrice: number | null;
  openOnly: boolean;
  occasion: string | null;
  nearMe: boolean;
  radiusKm: number | null;
  amenities: string[];
  /** Từ khóa còn lại để tìm theo tên quán/món (vd "phở", "sườn"). */
  keywords: string;
  /** Yêu cầu app chưa hỗ trợ (vd "máy lạnh") — hiện cho người dùng biết. */
  unsupported: string[];
  source: 'local' | 'ai';
};

const OCCASION_WORDS: Record<string, string[]> = {
  'hen-ho': ['hen ho', 'nguoi yeu', 'date', 'lang man', 'cap doi', 'ban gai', 'ban trai', 'vo chong'],
  'ban-be': ['nhom', 'ban be', 'hoi ban', 'dong nguoi', 'tu tap', 'lien hoan', 'nhau', 'ca nhom'],
  'mot-minh': ['mot minh', 'di le', 'an le'],
  'gia-dinh': ['gia dinh', 'bo me', 'ong ba', 'tre em', 'con nho', 'cac con'],
  'cong-viec': ['lam viec', 'doi tac', 'cong viec', 'hop mat', 'tiep khach', 'laptop', 'yen tinh'],
};

// Từ khóa → tên danh mục (khớp gần đúng với Category.name đã bỏ dấu).
const CATEGORY_WORDS: [string[], string][] = [
  [['pho', 'bun', 'hu tieu', 'mi quang', 'banh canh'], 'bun'],
  [['com'], 'com'],
  [['banh mi'], 'banh mi'],
  [['oc', 'hai san', 'tom', 'cua', 'muc', 'ngheu', 'so diep'], 'oc'],
  [['lau', 'nuong', 'bbq', 'buffet'], 'lau'],
  [['an vat', 'dimsum', 'xien', 'banh trang'], 'an vat'],
  [['ca phe', 'cafe', 'coffee', 'tra sua', 'tra'], 'ca phe'],
  [['che', 'trang mieng', 'kem', 'banh ngot'], 'che'],
];


const AMENITY_WORDS: Record<string, string[]> = {
  'may-lanh': ['may lanh', 'dieu hoa', 'mat me'],
  'giu-xe': ['giu xe', 'cho de xe', 'de xe', 'bai xe', 'gui xe'],
  'o-to': ['o to', 'oto', 'xe hoi', 'dau xe'],
  wifi: ['wifi', 'wi fi', 'internet'],
  the: ['quet the', 'the tin dung', 'chuyen khoan', 'thanh toan the'],
  'phong-rieng': ['phong rieng', 'phong vip'],
  'ngoai-troi': ['ngoai troi', 'via he', 'san vuon', 'san thuong', 'rooftop'],
};

const UNSUPPORTED_WORDS = ['view', 'chay', 'pet', 'thu cung', 'karaoke', 'ship', 'giao hang'];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const has = (text: string, word: string) => new RegExp(`(^|\\s)${word}(\\s|$)`).test(text);

export function parseQueryLocal(input: string, categories: Category[]): ParsedQuery {
  let t = ` ${normalize(input).replace(/[.,!?;:/()“”"]/g, ' ').replace(/\s+/g, ' ')} `;
  const res: ParsedQuery = {
    categoryId: null,
    district: null,
    maxPrice: null,
    openOnly: false,
    occasion: null,
    nearMe: false,
    radiusKm: null,
    amenities: [],
    keywords: '',
    unsupported: [],
    source: 'local',
  };
  const cut = (re: RegExp) => {
    t = t.replace(re, ' ');
  };

  // Giá: "dưới 200k", "< 150k", "200 nghìn", "tầm 100k/người", "rẻ"
  const price = t.match(/(?:duoi|<|toi da|khong qua|it hon|tam|khoang)?\s*(\d+(?:[.,]\d+)?)\s*(k|nghin|ngan|tr|trieu)\b(?:\s*\/?\s*(?:nguoi|suat|phan))?/);
  if (price) {
    const n = Number(price[1].replace(',', '.'));
    const unit = price[2];
    res.maxPrice = Math.round(unit === 'tr' || unit === 'trieu' ? n * 1_000_000 : n * 1000);
    cut(new RegExp(esc(price[0])));
  } else if (has(t, 're') || has(t, 'binh dan')) {
    res.maxPrice = 50000;
  }

  // Khoảng cách: "3 km", "trong 2km", "500m", "gần tôi", "quanh đây"
  const km = t.match(/(\d+(?:[.,]\d+)?)\s*(km|cay so|m)\b/);
  if (km) {
    const n = Number(km[1].replace(',', '.'));
    res.radiusKm = km[2] === 'm' ? Math.max(0.5, n / 1000) : n;
    res.nearMe = true;
    cut(new RegExp(esc(km[0])));
  }
  if (/\b(gan toi|gan day|quanh day|gan nha|gan minh|xung quanh)\b/.test(t)) {
    res.nearMe = true;
    cut(/\b(gan toi|gan day|quanh day|gan nha|gan minh|xung quanh)\b/g);
  }

  // Số người "4 người" → đi nhóm (≥3), 2 người → hẹn hò không chắc nên bỏ qua.
  const people = t.match(/(\d+)\s*nguoi/);
  if (people) {
    if (Number(people[1]) >= 3) res.occasion = 'ban-be';
    cut(/\d+\s*nguoi/);
  }

  // Mục đích
  for (const [key, words] of Object.entries(OCCASION_WORDS)) {
    for (const w of words) {
      if (!has(t, w)) continue;
      res.occasion ??= key;
      cut(new RegExp(`(^|\\s)${w}(?=\\s|$)`, 'g'));
    }
  }

  // Đang mở
  if (/\b(dang mo|mo cua|bay gio|luc nay)\b/.test(t)) {
    res.openOnly = true;
    cut(/\b(dang mo cua|dang mo|mo cua|ngay bay gio|bay gio|luc nay)\b/g);
  }

  // Quận: "quận 1", "q1", "q.3", "bình thạnh"
  for (const d of DISTRICTS) {
    const nd = normalize(d);
    const num = nd.match(/^quan (\d+)$/)?.[1];
    const re = num ? new RegExp(`\\b(quan|q)\\s*${num}\\b`) : new RegExp(`\\b${nd}\\b`);
    if (re.test(t)) {
      res.district = d;
      cut(re);
      break;
    }
  }

  // Danh mục
  for (const [words, catKey] of CATEGORY_WORDS) {
    const w = words.find((x) => has(t, x));
    if (!w) continue;
    const cat = categories.find((c) => normalize(c.name).includes(catKey));
    if (cat) {
      res.categoryId = cat.id;
      // Giữ tên món cụ thể (phở, bún bò…) làm từ khóa nếu khác tên danh mục chung.
      if (!['lau', 'nuong', 'com', 'oc', 'hai san', 'an vat', 'che', 'ca phe', 'cafe'].includes(w)) res.keywords = w;
      cut(new RegExp(`(^|\\s)${w}(?=\\s|$)`));
      break;
    }
  }

  // Tiện ích (cắt cụm "chỗ đậu ô tô" trước "ô tô")
  for (const [key, words] of Object.entries(AMENITY_WORDS)) {
    for (const w of [...words].sort((a, b) => b.length - a.length)) {
      if (!has(t, w)) continue;
      if (!res.amenities.includes(key)) res.amenities.push(key);
      cut(new RegExp(`(^|\\s)${w}(?=\\s|$)`, 'g'));
    }
  }

  // Yêu cầu chưa hỗ trợ
  for (const w of UNSUPPORTED_WORDS) {
    if (has(t, w)) {
      res.unsupported.push(w);
      cut(new RegExp(`(^|\\s)${w}(?=\\s|$)`));
    }
  }

  // Câu không chứa tiêu chí nào → tìm theo tên quán/món như bình thường.
  const structured =
    res.maxPrice != null ||
    res.nearMe ||
    res.occasion != null ||
    res.openOnly ||
    res.district != null ||
    res.categoryId != null ||
    res.amenities.length > 0;
  if (!structured) res.keywords = input.trim();
  return res;
}

/** Câu có vẻ là "yêu cầu" (nhiều tiêu chí) chứ không chỉ là tên quán? */
export function looksLikeRequest(input: string, categories: Category[]): boolean {
  const p = parseQueryLocal(input, categories);
  const hits = [p.maxPrice != null, p.nearMe, p.occasion != null, p.openOnly, p.district != null, p.categoryId != null, p.amenities.length > 0].filter(Boolean).length;
  return hits >= 1 && input.trim().split(/\s+/).length >= 2;
}

export function parsedToFilters(p: ParsedQuery, base: Filters = EMPTY_FILTERS): Filters {
  return {
    ...base,
    query: p.keywords,
    categoryId: p.categoryId ?? base.categoryId,
    district: p.district ?? base.district,
    maxPrice: p.maxPrice ?? base.maxPrice,
    openOnly: p.openOnly || base.openOnly,
    occasion: p.occasion ?? base.occasion,
    nearMe: p.nearMe || base.nearMe,
    radiusKm: p.radiusKm ?? base.radiusKm,
    amenities: p.amenities.length ? p.amenities : base.amenities,
  };
}

export const OCCASION_KEYS = OCCASIONS.map((o) => o.key) as string[];
