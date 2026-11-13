export type Category = {
  id: number;
  name: string;
  emoji: string | null;
  /** Tên icon Lucide (lucide.dev/icons), vd 'soup'. App hiển thị cái này, không dùng emoji. */
  icon: string | null;
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
  { key: 'ban-be', label: 'Đi nhóm bạn', icon: 'users' },
  { key: 'hen-ho', label: 'Hẹn hò', icon: 'wine' },
  { key: 'mot-minh', label: 'Đi một mình', icon: 'user' },
  { key: 'gia-dinh', label: 'Gia đình', icon: 'house' },
  { key: 'cong-viec', label: 'Làm việc / Gặp đối tác', icon: 'briefcase' },
] as const;

export type OccasionKey = (typeof OCCASIONS)[number]['key'];

export const occasionLabel = (key: string) => OCCASIONS.find((o) => o.key === key)?.label ?? key;

/** Tiện ích quán — lưu khóa trong cột places.amenities. */
export const AMENITIES = [
  { key: 'may-lanh', label: 'Máy lạnh', icon: 'snowflake' },
  { key: 'giu-xe', label: 'Chỗ để xe máy', icon: 'bike' },
  { key: 'o-to', label: 'Chỗ đậu ô tô', icon: 'car' },
  { key: 'wifi', label: 'Wifi', icon: 'wifi' },
  { key: 'the', label: 'Nhận thẻ / chuyển khoản', icon: 'credit-card' },
  { key: 'phong-rieng', label: 'Phòng riêng', icon: 'key-round' },
  { key: 'ngoai-troi', label: 'Ngồi ngoài trời', icon: 'sun' },
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
