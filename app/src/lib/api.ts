import { demoCategories, demoPlaces } from './demo-data';
import { parseQueryLocal, type ParsedQuery } from './filters';
import { isSupabaseConfigured, PHOTO_BUCKET, supabase } from './supabase';
import { getDeviceId } from './device';
import {
  AMENITIES,
  DISTRICTS,
  OCCASIONS,
  type Category,
  type Dish,
  type Photo,
  type Place,
  type PlaceEventKind,
  type PlaceStats,
  type PlaceSuggestion,
  type PlaceWithRelations,
  type VisitPlatform,
  type VisitStat,
  type Poll,
} from './types';

/** Chưa có app/.env → chạy bằng dữ liệu mẫu trong bộ nhớ (xem demo-data.ts). */
export const isDemo = !isSupabaseConfigured;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const sortPlaces = (a: PlaceWithRelations, b: PlaceWithRelations) =>
  Number(b.is_featured) - Number(a.is_featured) || b.created_at.localeCompare(a.created_at);

export async function fetchCategories(): Promise<Category[]> {
  if (isDemo) return clone(demoCategories);
  const { data, error } = await supabase.from('categories').select('*').order('sort_order');
  if (error) throw error;
  return data ?? [];
}

/** Danh sách quán (RLS tự lọc: khách chỉ thấy quán đang hiển thị, admin thấy tất cả). */
export async function fetchPlaces(): Promise<PlaceWithRelations[]> {
  if (isDemo) return clone([...demoPlaces].sort(sortPlaces));
  const { data, error } = await supabase
    .from('places')
    .select('*, place_categories(category_id)')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PlaceWithRelations[];
}

export async function fetchPlace(id: string): Promise<PlaceWithRelations | null> {
  if (isDemo) return clone(demoPlaces.find((p) => p.id === id) ?? null);
  const { data, error } = await supabase
    .from('places')
    .select('*, place_categories(category_id), dishes(*), place_photos(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const p = data as PlaceWithRelations;
  p.dishes?.sort((a, b) => a.sort_order - b.sort_order);
  p.place_photos?.sort((a, b) => a.sort_order - b.sort_order);
  return p;
}

export type PlaceInput = Omit<Place, 'id' | 'created_at' | 'updated_at'>;

export async function savePlace(
  id: string | null,
  input: PlaceInput,
  categoryIds: number[],
  dishes: Dish[]
): Promise<string> {
  if (isDemo) return demoSave(id, input, categoryIds, dishes);
  let placeId = id;
  if (placeId) {
    const { error } = await supabase.from('places').update(input).eq('id', placeId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from('places').insert(input).select('id').single();
    if (error) throw error;
    placeId = data.id as string;
  }

  // Danh mục: xóa hết rồi thêm lại
  const delCats = await supabase.from('place_categories').delete().eq('place_id', placeId);
  if (delCats.error) throw delCats.error;
  if (categoryIds.length) {
    const { error } = await supabase
      .from('place_categories')
      .insert(categoryIds.map((category_id) => ({ place_id: placeId, category_id })));
    if (error) throw error;
  }

  // Món ăn: xóa hết rồi thêm lại
  const delDishes = await supabase.from('dishes').delete().eq('place_id', placeId);
  if (delDishes.error) throw delDishes.error;
  const cleanDishes = dishes.filter((d) => d.name.trim());
  if (cleanDishes.length) {
    const { error } = await supabase.from('dishes').insert(
      cleanDishes.map((d, i) => ({
        place_id: placeId,
        name: d.name.trim(),
        price: d.price,
        is_signature: d.is_signature,
        sort_order: i,
      }))
    );
    if (error) throw error;
  }

  return placeId;
}

export async function deletePlace(id: string, photos: Photo[]) {
  if (isDemo) {
    const i = demoPlaces.findIndex((p) => p.id === id);
    if (i >= 0) demoPlaces.splice(i, 1);
    return;
  }
  const paths = photos.map((p) => p.storage_path).filter((p): p is string => Boolean(p));
  if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths);
  const { error } = await supabase.from('places').delete().eq('id', id);
  if (error) throw error;
}

export async function setPublished(id: string, value: boolean) {
  if (isDemo) return void (demoFind(id).is_published = value);
  const { error } = await supabase.from('places').update({ is_published: value }).eq('id', id);
  if (error) throw error;
}

function extFromMime(mime?: string | null) {
  if (mime?.includes('png')) return 'png';
  if (mime?.includes('webp')) return 'webp';
  return 'jpg';
}

/** Upload 1 ảnh (uri từ image picker) và ghi vào bảng place_photos. */
export async function uploadPhoto(
  placeId: string,
  uri: string,
  mimeType: string | null | undefined,
  sortOrder: number
): Promise<Photo> {
  if (isDemo) {
    const p = demoFind(placeId);
    const photo: Photo = { id: Date.now() + sortOrder, place_id: placeId, url: uri, storage_path: null, sort_order: sortOrder };
    p.place_photos = [...(p.place_photos ?? []), photo];
    return photo;
  }
  const body = await (await fetch(uri)).arrayBuffer();
  const contentType = mimeType || 'image/jpeg';
  const path = `${placeId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extFromMime(contentType)}`;
  const up = await supabase.storage.from(PHOTO_BUCKET).upload(path, body, { contentType });
  if (up.error) throw up.error;
  const { data: pub } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  const { data, error } = await supabase
    .from('place_photos')
    .insert({ place_id: placeId, url: pub.publicUrl, storage_path: path, sort_order: sortOrder })
    .select('*')
    .single();
  if (error) throw error;
  return data as Photo;
}

export async function deletePhoto(photo: Photo) {
  if (isDemo) {
    const p = demoFind(photo.place_id);
    p.place_photos = (p.place_photos ?? []).filter((x) => x.id !== photo.id);
    return;
  }
  if (photo.storage_path) await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
  const { error } = await supabase.from('place_photos').delete().eq('id', photo.id);
  if (error) throw error;
}

/** Lưu thứ tự ảnh: `orderedIds[i]` có sort_order = i (chỉ ghi ảnh đổi vị trí). */
export async function reorderPhotos(placeId: string, orderedIds: number[]) {
  if (isDemo) {
    const p = demoFind(placeId);
    const byId = new Map((p.place_photos ?? []).map((x) => [x.id, x]));
    p.place_photos = orderedIds
      .map((id, i) => {
        const ph = byId.get(id);
        return ph ? { ...ph, sort_order: i } : null;
      })
      .filter((x): x is Photo => x != null);
    return;
  }
  const current = await supabase.from('place_photos').select('id, sort_order').eq('place_id', placeId);
  if (current.error) throw current.error;
  const now = new Map((current.data ?? []).map((r) => [r.id as number, r.sort_order as number]));
  const changed = orderedIds.map((id, i) => ({ id, i })).filter(({ id, i }) => now.has(id) && now.get(id) !== i);
  for (const { id, i } of changed) {
    const { error } = await supabase.from('place_photos').update({ sort_order: i }).eq('id', id);
    if (error) throw error;
  }
}

export async function setCover(placeId: string, url: string | null) {
  if (isDemo) return void (demoFind(placeId).cover_image_url = url);
  const { error } = await supabase.from('places').update({ cover_image_url: url }).eq('id', placeId);
  if (error) throw error;
}

// ---------- Tìm bằng câu nói ----------

/**
 * Hiểu câu tìm kiếm tự nhiên ("lẩu dưới 200k gần tôi đi nhóm 4 người") thành bộ lọc.
 * Có Supabase: gọi Edge Function `parse-query` (Claude). Demo, lỗi mạng hoặc chưa
 * deploy function → dùng bộ hiểu câu chạy trên máy (cùng kết quả dạng ParsedQuery).
 */
export async function smartParse(text: string, categories: Category[]): Promise<ParsedQuery> {
  const local = parseQueryLocal(text, categories);
  if (isDemo) return local;
  try {
    const { data, error } = await supabase.functions.invoke('parse-query', {
      body: {
        text,
        categories: categories.map((c) => ({ id: c.id, name: c.name })),
        districts: DISTRICTS,
        occasions: OCCASIONS.map((o) => ({ key: o.key, label: o.label })),
        amenities: AMENITIES.map((a) => ({ key: a.key, label: a.label })),
      },
    });
    if (error || !data) return local;
    return sanitizeParsed(data as Partial<ParsedQuery>, categories) ?? local;
  } catch {
    return local;
  }
}

/** Chỉ nhận giá trị hợp lệ từ AI (danh mục/quận/mục đích phải có thật). */
function sanitizeParsed(d: Partial<ParsedQuery>, categories: Category[]): ParsedQuery | null {
  if (typeof d !== 'object' || d == null) return null;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);
  return {
    categoryId: categories.some((c) => c.id === d.categoryId) ? (d.categoryId as number) : null,
    district: DISTRICTS.includes(d.district as string) ? (d.district as string) : null,
    maxPrice: num(d.maxPrice),
    openOnly: d.openOnly === true,
    occasion: OCCASIONS.some((o) => o.key === d.occasion) ? (d.occasion as string) : null,
    nearMe: d.nearMe === true || num(d.radiusKm) != null,
    radiusKm: num(d.radiusKm),
    amenities: Array.isArray(d.amenities) ? d.amenities.filter((a) => AMENITIES.some((x) => x.key === a)) : [],
    dealOnly: d.dealOnly === true,
    keywords: typeof d.keywords === 'string' ? d.keywords.slice(0, 60) : '',
    unsupported: Array.isArray(d.unsupported) ? d.unsupported.filter((x): x is string => typeof x === 'string').slice(0, 5) : [],
    source: 'ai',
  };
}

// ---------- Chọn quán cùng hội bạn ----------
// Khách không đăng nhập: mọi thao tác qua RPC (xem schema.sql), kèm mã máy getDeviceId().

/** Tạo bình chọn từ 2–8 quán, trả về id (dùng làm link /vote/<id>). */
export async function createPoll(title: string, creatorName: string, placeIds: string[]): Promise<string> {
  const device = getDeviceId();
  if (isDemo) {
    const id = `demo-poll-${Date.now()}`;
    demoPolls.set(id, {
      id,
      title: title.trim() || 'Đi ăn gì đây?',
      creator_name: creatorName.trim() || null,
      creator_device: device,
      winner_place_id: null,
      closed_at: null,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 864e5).toISOString(),
      place_ids: [...new Set(placeIds)],
      votes: [],
    });
    return id;
  }
  const { data, error } = await supabase.rpc('create_poll', {
    p_title: title,
    p_creator_name: creatorName,
    p_device: device,
    p_place_ids: placeIds,
  });
  if (error) throw error;
  return data as string;
}

/** Xem bình chọn (null nếu không có). */
export async function fetchPoll(id: string): Promise<Poll | null> {
  const device = getDeviceId();
  if (isDemo) {
    const p = demoPolls.get(id);
    if (!p) return null;
    return {
      id: p.id,
      title: p.title,
      creator_name: p.creator_name,
      is_creator: p.creator_device === device,
      winner_place_id: p.winner_place_id,
      closed_at: p.closed_at,
      expires_at: p.expires_at,
      created_at: p.created_at,
      options: p.place_ids.map((place_id) => ({
        place_id,
        voters: p.votes.filter((v) => v.place_id === place_id).map((v) => v.name),
        mine: p.votes.some((v) => v.place_id === place_id && v.device === device),
      })),
    };
  }
  const { data, error } = await supabase.rpc('get_poll', { p_id: id, p_device: device });
  if (error) throw error;
  return (data as Poll | null) ?? null;
}

/** Bỏ phiếu cho 1 quán (mỗi máy 1 phiếu, bỏ lại là đổi phiếu). */
export async function castVote(pollId: string, name: string, placeId: string) {
  const device = getDeviceId();
  if (isDemo) {
    const p = demoPolls.get(pollId);
    if (!p || p.closed_at) throw new Error('Bình chọn đã kết thúc');
    p.votes = [...p.votes.filter((v) => v.device !== device), { device, name: name.trim(), place_id: placeId }];
    return;
  }
  const { error } = await supabase.rpc('cast_vote', { p_poll: pollId, p_device: device, p_name: name, p_place: placeId });
  if (error) throw error;
}

/** Người tạo chốt quán thắng (kết thúc bình chọn). */
export async function closePoll(pollId: string, placeId: string) {
  const device = getDeviceId();
  if (isDemo) {
    const p = demoPolls.get(pollId);
    if (!p || p.creator_device !== device) throw new Error('Chỉ người tạo được chốt quán');
    p.winner_place_id = placeId;
    p.closed_at = new Date().toISOString();
    return;
  }
  const { error } = await supabase.rpc('close_poll', { p_poll: pollId, p_device: device, p_place: placeId });
  if (error) throw error;
}

// ---------- Khách gợi ý quán ----------

export async function suggestPlace(name: string, mapsUrl: string, note: string) {
  if (isDemo) {
    demoSuggestions.unshift({
      id: Date.now(),
      name: name.trim(),
      maps_url: mapsUrl.trim() || null,
      note: note.trim() || null,
      created_at: new Date().toISOString(),
    });
    return;
  }
  const { error } = await supabase.rpc('suggest_place', { p_name: name, p_maps_url: mapsUrl, p_note: note, p_device: getDeviceId() });
  if (error) throw error;
}

/** Admin: danh sách gợi ý mới nhất. */
export async function fetchSuggestions(): Promise<PlaceSuggestion[]> {
  if (isDemo) return clone(demoSuggestions);
  const { data, error } = await supabase
    .from('place_suggestions')
    .select('id, name, maps_url, note, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as PlaceSuggestion[];
}

/** Admin: xoá gợi ý (đã xử lý hoặc rác). */
export async function deleteSuggestion(id: number) {
  if (isDemo) {
    const i = demoSuggestions.findIndex((s) => s.id === id);
    if (i >= 0) demoSuggestions.splice(i, 1);
    return;
  }
  const { error } = await supabase.from('place_suggestions').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Thống kê & Đang hot ----------

/** Ghi 1 lượt xem/chỉ đường/gọi/chia sẻ. Không bao giờ ném lỗi (không làm phiền người dùng). */
export function trackEvent(placeId: string, kind: PlaceEventKind) {
  if (isDemo) {
    demoEvents.push({ place_id: placeId, kind, at: Date.now() });
    return;
  }
  supabase.rpc('track_event', { p_place: placeId, p_kind: kind }).then(
    () => {},
    () => {}
  );
}

/** Admin: thống kê theo quán trong `days` ngày gần nhất. */
export async function fetchPlaceStats(days = 7): Promise<PlaceStats[]> {
  if (isDemo) {
    const since = Date.now() - days * 864e5;
    const map = new Map<string, PlaceStats>();
    for (const e of demoEvents) {
      if (e.at < since) continue;
      const s = map.get(e.place_id) ?? { place_id: e.place_id, views: 0, directions: 0, calls: 0, shares: 0 };
      if (e.kind === 'view') s.views++;
      else if (e.kind === 'directions') s.directions++;
      else if (e.kind === 'call') s.calls++;
      else s.shares++;
      map.set(e.place_id, s);
    }
    return [...map.values()];
  }
  const { data, error } = await supabase.rpc('place_stats', { p_days: days });
  if (error) throw error;
  return ((data ?? []) as PlaceStats[]).map((s) => ({
    place_id: s.place_id,
    views: Number(s.views),
    directions: Number(s.directions),
    calls: Number(s.calls),
    shares: Number(s.shares),
  }));
}

/** Ghi 1 lượt vào app (server tự bỏ qua nếu máy này vừa vào trong 30 phút). Không bao giờ ném lỗi. */
export function trackVisit(source: string, platform: VisitPlatform, landing: string) {
  const device = getDeviceId();
  if (isDemo) {
    const last = demoVisits.findLast((v) => v.device === device);
    if (!last || Date.now() - last.at > 30 * 60e3) demoVisits.push({ device, source, at: Date.now() });
    return;
  }
  supabase.rpc('track_visit', { p_device: device, p_source: source, p_platform: platform, p_landing: landing }).then(
    () => {},
    () => {}
  );
}

/** Admin: lượt vào app theo nguồn trong `days` ngày (kèm 1 dòng tổng source = null). */
export async function fetchVisitStats(days = 7): Promise<VisitStat[]> {
  if (isDemo) {
    const since = Date.now() - days * 864e5;
    const first = new Map<string, number>();
    for (const v of demoVisits) if (!first.has(v.device)) first.set(v.device, v.at);
    const groups = new Map<string | null, { visits: number; devs: Set<string> }>();
    for (const v of demoVisits) {
      if (v.at < since) continue;
      for (const key of [v.source, null]) {
        const g = groups.get(key) ?? { visits: 0, devs: new Set<string>() };
        g.visits++;
        g.devs.add(v.device);
        groups.set(key, g);
      }
    }
    return [...groups.entries()].map(([source, g]) => ({
      source,
      visits: g.visits,
      visitors: g.devs.size,
      new_visitors: [...g.devs].filter((d) => (first.get(d) ?? 0) >= since).length,
    }));
  }
  const { data, error } = await supabase.rpc('visit_stats', { p_days: days });
  if (error) throw error;
  return ((data ?? []) as VisitStat[]).map((s) => ({
    source: s.source,
    visits: Number(s.visits),
    visitors: Number(s.visitors),
    new_visitors: Number(s.new_visitors),
  }));
}

/** Quán "Đang hot" 7 ngày (id theo thứ tự điểm giảm dần). */
export async function fetchTrending(limit = 10): Promise<string[]> {
  if (isDemo) {
    const score = new Map<string, number>();
    for (const e of demoEvents) score.set(e.place_id, (score.get(e.place_id) ?? 0) + (e.kind === 'view' ? 1 : 3));
    for (const p of demoPolls.values()) for (const v of p.votes) score.set(v.place_id, (score.get(v.place_id) ?? 0) + 2);
    // Demo chưa có ai dùng → lấy vài quán mẫu cho có nội dung.
    if (!score.size) return demoPlaces.slice(0, 4).map((p) => p.id);
    return [...score.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
  }
  const { data, error } = await supabase.rpc('trending_places', { p_limit: limit });
  if (error) throw error;
  return ((data ?? []) as { place_id: string }[]).map((r) => r.place_id);
}

// ---------- Chế độ demo: ghi vào bộ nhớ ----------
type DemoPoll = Omit<Poll, 'is_creator' | 'options'> & {
  creator_device: string;
  place_ids: string[];
  votes: { device: string; name: string; place_id: string }[];
};
const demoPolls = new Map<string, DemoPoll>();
const demoSuggestions: PlaceSuggestion[] = [];
const demoEvents: { place_id: string; kind: PlaceEventKind; at: number }[] = [];
const demoVisits: { device: string; source: string; at: number }[] = [];

function demoFind(id: string): PlaceWithRelations {
  const p = demoPlaces.find((x) => x.id === id);
  if (!p) throw new Error('Không tìm thấy quán');
  return p;
}

function demoSave(id: string | null, input: PlaceInput, categoryIds: number[], dishes: Dish[]): string {
  const placeId = id ?? `demo-${Date.now()}`;
  const ts = new Date().toISOString();
  const existing = id ? demoFind(id) : null;
  const next: PlaceWithRelations = {
    ...(existing ?? { created_at: ts, place_photos: [] }),
    ...input,
    id: placeId,
    updated_at: ts,
    place_categories: categoryIds.map((category_id) => ({ category_id })),
    dishes: dishes
      .filter((d) => d.name.trim())
      .map((d, i) => ({ ...d, id: i + 1, place_id: placeId, name: d.name.trim(), sort_order: i })),
  } as PlaceWithRelations;
  if (existing) Object.assign(existing, next);
  else demoPlaces.push(next);
  return placeId;
}
