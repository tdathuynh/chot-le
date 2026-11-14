// Trợ lý "Hỏi" chạy hoàn toàn trên máy (không AI, không tốn phí):
// hiểu câu bằng parseQueryLocal → lọc quán → soạn câu trả lời + gợi ý câu hỏi tiếp.
// Nhớ tiêu chí của lượt trước để hỏi tiếp: "rẻ hơn", "gần hơn", "còn quán khác", "quận 3 thì sao".
// Sau này có thể thay bằng AI (Edge Function) mà màn chat giữ nguyên: cùng trả về AssistantReply.

import { normalize } from './format';
import {
  applyFilters,
  describeFilters,
  EMPTY_FILTERS,
  parsedToFilters,
  parseQueryLocal,
  PRICE_OPTIONS,
  type Filters,
  type PlaceWithDistance,
} from './filters';
import type { Coords } from './location';
import type { Category, PlaceWithRelations } from './types';

export const PAGE_SIZE = 4;

export type AssistantReply = {
  text: string;
  places: PlaceWithDistance[];
  /** Câu bấm nhanh để hỏi tiếp. */
  suggestions: string[];
  /** Tiêu chí dùng cho câu trả lời này (lượt sau dựa vào đây để hỏi tiếp). */
  filters: Filters | null;
  /** Đã hiện tới quán thứ mấy (cho "còn quán khác"). */
  shown: number;
  /** Cần vị trí người dùng (màn chat sẽ xin quyền rồi hỏi lại). */
  needsLocation?: boolean;
};

export type AssistantContext = {
  places: PlaceWithRelations[];
  categories: Category[];
  me: Coords | null;
  /** Câu trả lời trước của trợ lý (để hiểu câu hỏi tiếp). */
  prev: AssistantReply | null;
  /** 0 ≤ x < 1, để chọn ngẫu nhiên; truyền vào cho dễ kiểm thử. */
  random: number;
};

export const STARTER_SUGGESTIONS = [
  'Lẩu cho nhóm 5 người dưới 200k',
  'Quán hẹn hò ở Quận 1',
  'Cà phê có wifi đang mở',
  'Quán đang có ưu đãi',
  'Ăn gì cũng được, chọn giùm',
];

const has = (t: string, ...words: string[]) => words.some((w) => new RegExp(`(^|\\s)${w}(\\s|$)`).test(t));

const pick = <T,>(arr: T[], r: number) => arr[Math.min(arr.length - 1, Math.floor(r * arr.length))];

export function greeting(): AssistantReply {
  return {
    text: 'Chào bạn! Mình giúp tìm quán ngon ở Sài Gòn. Cứ nói kiểu "bún bò gần đây dưới 50k" hoặc "chỗ hẹn hò có máy lạnh ở Bình Thạnh" nhé.',
    places: [],
    suggestions: STARTER_SUGGESTIONS,
    filters: null,
    shown: 0,
  };
}

export function answer(input: string, ctx: AssistantContext): AssistantReply {
  const raw = input.trim();
  const t = ` ${normalize(raw).replace(/[.,!?;:/()“”"]/g, ' ').replace(/\s+/g, ' ')} `;
  const prev = ctx.prev?.filters ?? null;

  // ---- Câu xã giao ----
  if (/^\s*(xin chao|chao|hi|hello|hey|alo|chao ban)\s*$/.test(t)) return greeting();
  if (has(t, 'cam on', 'thanks', 'thank you', 'cam on nhe', 'ok cam on')) {
    return { text: 'Không có chi! Chúc bạn ăn ngon miệng. Cần tìm quán khác cứ hỏi mình nhé.', places: [], suggestions: STARTER_SUGGESTIONS, filters: prev, shown: ctx.prev?.shown ?? 0 };
  }
  if (has(t, 'ban la ai', 'ban lam duoc gi', 'giup gi', 'huong dan', 'help')) {
    return {
      text: 'Mình tìm quán theo món, khu vực, giá, giờ mở cửa, dịp đi ăn (hẹn hò, đi nhóm, gia đình…) và tiện ích (máy lạnh, chỗ để xe, wifi…), cả quán đang có ưu đãi riêng cho khách dùng app. Sau đó bạn có thể nói "rẻ hơn", "gần hơn" hoặc "còn quán khác không".',
      places: [],
      suggestions: STARTER_SUGGESTIONS,
      filters: null,
      shown: 0,
    };
  }

  // ---- Hỏi tiếp dựa trên lượt trước ----
  // Vừa chọn ngẫu nhiên 1 quán → "chọn quán khác" = chọn lại.
  if (ctx.prev?.places.length === 1 && has(t, 'chon quan khac', 'doi quan khac', 'quan khac di', 'chon lai', 'doi quan')) {
    return answer('chọn giùm', { ...ctx, prev: null, random: (ctx.random + 0.37) % 1 });
  }
  if (prev && ctx.prev) {
    // "còn quán khác", "thêm nữa", "xem thêm"
    if (has(t, 'con nua', 'them nua', 'xem them', 'quan khac', 'cho khac', 'con quan nao', 'con gi nua', 'nua khong', 'tiep')) {
      return listReply(prev, ctx, ctx.prev.shown, 'more');
    }
    // "rẻ hơn"
    if (has(t, 're hon', 'mem hon', 'it tien hon', 'tiet kiem hon')) {
      const cur = prev.maxPrice ?? Infinity;
      const lower = [...PRICE_OPTIONS].reverse().find((p) => p < cur) ?? Math.max(20000, Math.round((cur * 0.6) / 10000) * 10000);
      return listReply({ ...prev, maxPrice: Number.isFinite(lower) ? lower : 50000 }, ctx, 0, 'refine');
    }
    // "gần hơn"
    if (has(t, 'gan hon', 'gan nua', 'gan day hon')) {
      const r = prev.radiusKm != null ? Math.max(1, Math.floor(prev.radiusKm / 2)) : 3;
      return listReply({ ...prev, nearMe: true, radiusKm: r }, ctx, 0, 'refine');
    }
    // "đang mở thôi"
    if (has(t, 'dang mo', 'mo cua', 'bay gio')) {
      const p = parseQueryLocal(raw, ctx.categories);
      return listReply(parsedToFilters({ ...p, keywords: '' }, { ...prev, openOnly: true }), ctx, 0, 'refine');
    }
  }

  // ---- "Ăn gì cũng được" → chọn ngẫu nhiên ----
  if (has(t, 'cung duoc', 'gi cung duoc', 'chon giup', 'chon gium', 'chon dum', 'ngau nhien', 'random', 'bat ky', 'tuy ban', 'goi y di', 'an gi')) {
    const p = parseQueryLocal(raw, ctx.categories);
    const base = parsedToFilters({ ...p, keywords: '' }, EMPTY_FILTERS);
    const pool = applyFilters(ctx.places, base, ctx.me);
    const list = pool.length ? pool : applyFilters(ctx.places, EMPTY_FILTERS, ctx.me);
    if (!list.length) return emptyDb();
    const chosen = pick(list, ctx.random);
    return {
      text: pick(
        [`Hôm nay thử ${chosen.name} nhé!`, `Mình chọn ${chosen.name} cho bạn.`, `Vậy đi ${chosen.name} đi, nghe ổn đó!`],
        ctx.random
      ),
      places: [chosen],
      suggestions: ['Chọn quán khác', 'Rẻ hơn', 'Gần tôi'],
      filters: base,
      shown: 1,
    };
  }

  // ---- Câu tìm quán ----
  const p = parseQueryLocal(raw, ctx.categories);
  const structured =
    p.maxPrice != null || p.nearMe || p.occasion != null || p.openOnly || p.district != null || p.categoryId != null || p.amenities.length > 0 || p.dealOnly;
  // Câu ngắn kiểu "quận 3 thì sao", "còn lẩu?" → giữ tiêu chí cũ, thay phần mới.
  const followUp = prev && structured && (has(t, 'thi sao', 'con', 'the con', 'vay con', 'nhung', 'them', 'ma') || raw.split(/\s+/).length <= 4);
  let f = followUp ? parsedToFilters(p, { ...prev, query: '' }) : parsedToFilters(p);
  // Không nhận ra tiêu chí nào và không khớp tên/món → coi như tìm theo từ khóa.
  if (!structured) f = { ...EMPTY_FILTERS, query: raw };

  const reply = listReply(f, ctx, 0, 'new');
  if (p.unsupported.length) {
    reply.text += ` (Mình chưa lọc được theo "${p.unsupported.join('", "')}", bạn xem mô tả từng quán nhé.)`;
  }
  return reply;
}

function emptyDb(): AssistantReply {
  return { text: 'Hiện app chưa có quán nào. Quay lại sau nhé!', places: [], suggestions: [], filters: null, shown: 0 };
}

/** Lọc theo f và soạn câu trả lời; không có quán thì thử nới bớt tiêu chí. */
function listReply(f: Filters, ctx: AssistantContext, offset: number, mode: 'new' | 'refine' | 'more'): AssistantReply {
  if (!ctx.places.length) return emptyDb();
  if ((f.nearMe || f.radiusKm != null) && !ctx.me) {
    return { text: 'Cho mình biết vị trí của bạn để tìm quán gần nhé.', places: [], suggestions: [], filters: f, shown: 0, needsLocation: true };
  }

  const all = rank(applyFilters(ctx.places, f, ctx.me), f);
  // Từ khóa trùng danh mục ("phở" khi đã chọn Bún / Phở) thì khỏi nhắc lại.
  const labels = describeFilters(f, ctx.categories).filter((l) => !(f.categoryId != null && f.query && l === `“${f.query}”`));
  const crit = labels.length ? labels.join(' · ') : 'mọi quán';

  if (mode === 'more') {
    const page = all.slice(offset, offset + PAGE_SIZE);
    if (!page.length) {
      return { text: 'Hết quán hợp rồi bạn ơi. Thử nới tiêu chí (khu vực, giá, tiện ích) hoặc hỏi món khác nhé.', places: [], suggestions: suggestFor(f, false), filters: f, shown: offset };
    }
    return { text: `Thêm ${page.length} quán nữa (${crit}):`, places: page, suggestions: suggestFor(f, offset + page.length < all.length), filters: f, shown: offset + page.length };
  }

  if (all.length) {
    const page = all.slice(0, PAGE_SIZE);
    const head =
      all.length === 1
        ? `Có 1 quán hợp: ${crit}.`
        : all.length > PAGE_SIZE
          ? `Có ${all.length} quán hợp (${crit}). Đây là ${PAGE_SIZE} quán nổi bật:`
          : `Có ${all.length} quán hợp (${crit}):`;
    return { text: head, places: page, suggestions: suggestFor(f, all.length > PAGE_SIZE), filters: f, shown: page.length };
  }

  // Không có quán: nới lần lượt từng tiêu chí "phụ" xem bỏ cái nào thì có kết quả.
  const relaxers: [string, Partial<Filters>][] = [
    ['tiện ích', { amenities: [] }],
    ['"đang mở"', { openOnly: false }],
    ['ưu đãi', { dealOnly: false }],
    ['dịp đi ăn', { occasion: null }],
    ['khu vực', { district: null }],
    ['bán kính', { radiusKm: null }],
    ['mức giá', { maxPrice: null }],
    ['từ khóa', { query: '' }],
  ];
  for (const [name, change] of relaxers) {
    const key = Object.keys(change)[0] as keyof Filters;
    const cur = f[key];
    if (cur == null || cur === false || cur === '' || (Array.isArray(cur) && !cur.length)) continue;
    const loose = { ...f, ...change };
    const found = rank(applyFilters(ctx.places, loose, ctx.me), loose);
    if (found.length) {
      const page = found.slice(0, PAGE_SIZE);
      return {
        text: `Chưa có quán nào khớp hết (${crit}). Nếu bỏ ${name} thì có ${found.length} quán:`,
        places: page,
        suggestions: suggestFor(loose, found.length > PAGE_SIZE),
        filters: loose,
        shown: page.length,
      };
    }
  }
  return {
    text: `Chưa có quán nào hợp (${crit}). App đang cập nhật thêm quán, bạn thử hỏi kiểu khác nhé.`,
    places: [],
    suggestions: STARTER_SUGGESTIONS,
    filters: f,
    shown: 0,
  };
}

/** Khi không sắp theo khoảng cách: quán tuyển chọn lên trước, rồi quán có ảnh. */
function rank(list: PlaceWithDistance[], f: Filters): PlaceWithDistance[] {
  if (f.nearMe) return list;
  return [...list].sort(
    (a, b) => Number(b.is_featured) - Number(a.is_featured) || Number(!!b.cover_image_url) - Number(!!a.cover_image_url)
  );
}

function suggestFor(f: Filters, hasMore: boolean): string[] {
  const out: string[] = [];
  if (hasMore) out.push('Còn quán khác không?');
  if (f.maxPrice == null || f.maxPrice > 30000) out.push('Rẻ hơn');
  out.push(f.nearMe ? 'Gần hơn' : 'Gần tôi');
  if (!f.openOnly) out.push('Đang mở thôi');
  if (!f.dealOnly) out.push('Có ưu đãi không?');
  return out.slice(0, 4);
}
