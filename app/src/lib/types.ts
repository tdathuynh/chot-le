export type Category = {
  id: number;
  name: string;
  emoji: string | null;
  sort_order: number;
};

export type Dish = {
  id?: number;
  place_id?: string;
  name: string;
  price: number | null;
  is_signature: boolean;
  sort_order: number;
};

export type Photo = {
  id: number;
  place_id: string;
  url: string;
  storage_path: string | null;
  sort_order: number;
};

export type Place = {
  id: string;
  name: string;
  address: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  price_min: number | null;
  price_max: number | null;
  open_time: string | null; // "06:00:00"
  close_time: string | null;
  description: string | null;
  phone: string | null;
  google_maps_url: string | null;
  cover_image_url: string | null;
  /** Mục đích phù hợp: khóa trong OCCASIONS (vd 'hen-ho'). */
  occasions: string[];
  /** Tiện ích: khóa trong AMENITIES (vd 'may-lanh'). */
  amenities: string[];
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type PlaceWithRelations = Place & {
  place_categories: { category_id: number }[];
  dishes?: Dish[];
  place_photos?: Photo[];
};

/** Mục đích đi ăn — lưu khóa (key) trong cột places.occasions. */
export const OCCASIONS = [
  { key: 'ban-be', label: 'Đi nhóm bạn', icon: 'people-outline' },
  { key: 'hen-ho', label: 'Hẹn hò', icon: 'wine-outline' },
  { key: 'mot-minh', label: 'Đi một mình', icon: 'person-outline' },
  { key: 'gia-dinh', label: 'Gia đình', icon: 'home-outline' },
  { key: 'cong-viec', label: 'Làm việc / Gặp đối tác', icon: 'briefcase-outline' },
] as const;

export type OccasionKey = (typeof OCCASIONS)[number]['key'];

export const occasionLabel = (key: string) => OCCASIONS.find((o) => o.key === key)?.label ?? key;

/** Tiện ích quán — lưu khóa trong cột places.amenities. */
export const AMENITIES = [
  { key: 'may-lanh', label: 'Máy lạnh', icon: 'snow-outline' },
  { key: 'giu-xe', label: 'Chỗ để xe máy', icon: 'bicycle-outline' },
  { key: 'o-to', label: 'Chỗ đậu ô tô', icon: 'car-outline' },
  { key: 'wifi', label: 'Wifi', icon: 'wifi-outline' },
  { key: 'the', label: 'Nhận thẻ / chuyển khoản', icon: 'card-outline' },
  { key: 'phong-rieng', label: 'Phòng riêng', icon: 'key-outline' },
  { key: 'ngoai-troi', label: 'Ngồi ngoài trời', icon: 'sunny-outline' },
] as const;

export const amenityLabel = (key: string) => AMENITIES.find((a) => a.key === key)?.label ?? key;

export const DISTRICTS = [
  'Quận 1',
  'Quận 3',
  'Quận 4',
  'Quận 5',
  'Quận 6',
  'Quận 7',
  'Quận 8',
  'Quận 10',
  'Quận 11',
  'Quận 12',
  'Bình Thạnh',
  'Phú Nhuận',
  'Gò Vấp',
  'Tân Bình',
  'Tân Phú',
  'Bình Tân',
  'Thủ Đức',
  'Nhà Bè',
  'Bình Chánh',
  'Hóc Môn',
  'Củ Chi',
  'Cần Giờ',
];
