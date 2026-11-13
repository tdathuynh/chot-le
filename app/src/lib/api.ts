import { demoCategories, demoPlaces } from './demo-data';
import { parseQueryLocal, type ParsedQuery } from './filters';
import { isSupabaseConfigured, PHOTO_BUCKET, supabase } from './supabase';
import { AMENITIES, DISTRICTS, OCCASIONS, type Category, type Dish, type Photo, type Place, type PlaceWithRelations } from './types';

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
    keywords: typeof d.keywords === 'string' ? d.keywords.slice(0, 60) : '',
    unsupported: Array.isArray(d.unsupported) ? d.unsupported.filter((x): x is string => typeof x === 'string').slice(0, 5) : [],
    source: 'ai',
  };
}

// ---------- Chế độ demo: ghi vào bộ nhớ ----------
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
