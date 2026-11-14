// Dữ liệu mẫu cho CHẾ ĐỘ DEMO: dùng khi chưa cấu hình Supabase (chưa có file app/.env).
// Tên quán là hư cấu; ảnh minh họa từ Unsplash. Dữ liệu chỉ nằm trong bộ nhớ, tải lại trang là mất thay đổi.
import type { Category, PlaceWithRelations } from './types';

const img = (id: string) => `https://images.unsplash.com/${id}?w=1000&q=70&auto=format&fit=crop`;

export const demoCategories: Category[] = [
  { id: 1, name: 'Bún / Phở', emoji: null, icon: 'soup', sort_order: 1 },
  { id: 2, name: 'Cơm', emoji: null, icon: 'egg-fried', sort_order: 2 },
  { id: 3, name: 'Bánh mì', emoji: null, icon: 'sandwich', sort_order: 3 },
  { id: 4, name: 'Ốc / Hải sản', emoji: null, icon: 'shell', sort_order: 4 },
  { id: 5, name: 'Lẩu / Nướng', emoji: null, icon: 'flame', sort_order: 5 },
  { id: 6, name: 'Ăn vặt', emoji: null, icon: 'cookie', sort_order: 6 },
  { id: 7, name: 'Cà phê / Trà', emoji: null, icon: 'coffee', sort_order: 7 },
  { id: 8, name: 'Chè / Tráng miệng', emoji: null, icon: 'ice-cream-bowl', sort_order: 8 },
];

const now = '2026-11-13T00:00:00Z';
let photoId = 1;
let dishId = 1;

function place(
  p: Omit<
    PlaceWithRelations,
    'created_at' | 'updated_at' | 'place_photos' | 'dishes' | 'cover_image_url' | 'is_published' | 'deal_title' | 'deal_until'
  > &
    Partial<Pick<PlaceWithRelations, 'deal_title' | 'deal_until'>> & {
    photos: string[];
    dishes: [string, number, boolean?][];
  }
): PlaceWithRelations {
  const { photos, dishes, ...rest } = p;
  return {
    deal_title: null,
    deal_until: null,
    ...rest,
    is_published: true,
    cover_image_url: img(photos[0]),
    created_at: now,
    updated_at: now,
    place_photos: photos.map((id, i) => ({ id: photoId++, place_id: p.id, url: img(id), storage_path: null, sort_order: i })),
    dishes: dishes.map(([name, price, sig], i) => ({ id: dishId++, place_id: p.id, name, price, is_signature: Boolean(sig), sort_order: i })),
  };
}

export const demoPlaces: PlaceWithRelations[] = [
  place({
    id: 'demo-pho',
    deal_title: 'Tặng 1 phần quẩy khi đưa app Ăn Gì HCM',
    amenities: ['giu-xe', 'the'],
    latitude: 10.7769,
    longitude: 106.7009,
    occasions: ['mot-minh', 'gia-dinh'],
    name: 'Phở Bò Gia Truyền Cô Ba',
    address: '12 Pasteur, Phường Bến Nghé',
    district: 'Quận 1',
    price_min: 55000,
    price_max: 95000,
    open_time: '05:30:00',
    close_time: '22:00:00',
    description: 'Nước dùng ninh xương 12 tiếng, trong và ngọt thanh. Bò tái thái mỏng, bánh phở mềm. Nên đi trước 8h sáng để khỏi chờ.',
    phone: '0901 234 567',
    google_maps_url: null,
    is_featured: true,
    place_categories: [{ category_id: 1 }],
    photos: ['photo-1582878826629-29b7ad1cdc43', 'photo-1576577445504-6af96477db52'],
    dishes: [
      ['Phở tái nạm gầu', 75000, true],
      ['Phở tái', 60000],
      ['Phở đặc biệt', 95000],
      ['Quẩy', 5000],
    ],
  }),
  place({
    id: 'demo-bunbo',
    amenities: ['giu-xe'],
    latitude: 10.7766,
    longitude: 106.6913,
    occasions: ['mot-minh', 'ban-be'],
    name: 'Bún Bò Huế O Hương',
    address: '88 Võ Văn Tần, Phường 6',
    district: 'Quận 3',
    price_min: 45000,
    price_max: 75000,
    open_time: '06:00:00',
    close_time: '13:30:00',
    description: 'Chuẩn vị Huế: sả thơm, mắm ruốc vừa phải, có chả cua và giò heo to. Cay nhiều thì xin thêm sa tế nhà làm.',
    phone: '0912 345 678',
    google_maps_url: null,
    is_featured: true,
    place_categories: [{ category_id: 1 }],
    photos: ['photo-1555126634-323283e090fa', 'photo-1631709497146-a239ef373cf1'],
    dishes: [
      ['Bún bò đặc biệt', 75000, true],
      ['Bún bò giò nạm', 55000],
      ['Bún bò chả cua', 50000],
    ],
  }),
  place({
    id: 'demo-comtam',
    amenities: ['may-lanh', 'giu-xe', 'wifi', 'the'],
    latitude: 10.8006,
    longitude: 106.689,
    occasions: ['mot-minh', 'gia-dinh', 'cong-viec'],
    name: 'Cơm Tấm Sườn Nướng Bà Năm',
    address: '210 Phan Xích Long, Phường 2',
    district: 'Phú Nhuận',
    price_min: 40000,
    price_max: 85000,
    open_time: '06:30:00',
    close_time: '21:00:00',
    description: 'Sườn nướng than hoa, ướp đậm, mỡ hành thơm. Bì chả trứng đầy đủ, nước mắm pha vừa miệng.',
    phone: null,
    google_maps_url: null,
    is_featured: false,
    place_categories: [{ category_id: 2 }],
    photos: ['photo-1625398407796-82650a8c135f', 'photo-1504674900247-0877df9cc836'],
    dishes: [
      ['Cơm sườn bì chả', 65000, true],
      ['Cơm sườn', 45000],
      ['Cơm sườn trứng ốp la', 55000],
      ['Canh khổ qua', 15000],
    ],
  }),
  place({
    id: 'demo-oc',
    amenities: ['giu-xe', 'ngoai-troi'],
    latitude: 10.7608,
    longitude: 106.7037,
    occasions: ['ban-be', 'hen-ho'],
    name: 'Ốc Đêm Vĩnh Khánh 79',
    address: '79 Vĩnh Khánh, Phường 8',
    district: 'Quận 4',
    price_min: 60000,
    price_max: 250000,
    open_time: '16:00:00',
    close_time: '01:00:00',
    description: 'Quán vỉa hè đông vui, ốc tươi. Ốc hương rang muối ớt và sò điệp nướng mỡ hành là must-try. Đi nhóm 3–4 người là hợp nhất.',
    phone: '0933 456 789',
    google_maps_url: null,
    is_featured: false,
    place_categories: [{ category_id: 4 }, { category_id: 5 }],
    photos: ['photo-1559847844-5315695dadae', 'photo-1562565652-a0d8f0c59eb4'],
    dishes: [
      ['Ốc hương rang muối ớt', 120000, true],
      ['Sò điệp nướng mỡ hành', 90000, true],
      ['Nghêu hấp sả', 70000],
      ['Tôm nướng muối ớt', 180000],
    ],
  }),
  place({
    id: 'demo-dimsum',
    amenities: ['may-lanh', 'o-to', 'the', 'phong-rieng'],
    latitude: 10.7505,
    longitude: 106.659,
    occasions: ['gia-dinh', 'ban-be', 'cong-viec'],
    name: 'Dimsum Phố Người Hoa',
    address: '35 Hải Thượng Lãn Ông, Phường 10',
    district: 'Quận 5',
    price_min: 30000,
    price_max: 120000,
    open_time: '07:00:00',
    close_time: '14:00:00',
    description: 'Há cảo, xíu mại làm tay mỗi sáng. Không gian kiểu tiệm trà Quảng Đông, hợp đi ăn sáng cuối tuần với gia đình.',
    phone: null,
    google_maps_url: null,
    is_featured: false,
    place_categories: [{ category_id: 6 }],
    photos: ['photo-1534422298391-e4f8c172dddb', 'photo-1583077874340-79db6564672e'],
    dishes: [
      ['Há cảo tôm', 45000, true],
      ['Xíu mại', 40000],
      ['Bánh cuốn tôm', 50000],
      ['Trà hoa cúc (bình)', 30000],
    ],
  }),
  place({
    id: 'demo-mixao',
    amenities: ['giu-xe', 'ngoai-troi', 'wifi'],
    latitude: 10.802,
    longitude: 106.711,
    occasions: ['ban-be', 'hen-ho'],
    name: 'Mì Xào Giòn Chú Tư',
    address: '150 Xô Viết Nghệ Tĩnh, Phường 21',
    district: 'Bình Thạnh',
    price_min: 45000,
    price_max: 90000,
    open_time: '17:00:00',
    close_time: '23:30:00',
    description: 'Mì xào giòn thập cẩm phần to, sốt sệt vừa. Gà chiên nước mắm ăn kèm rất cuốn.',
    phone: '0944 567 890',
    google_maps_url: null,
    is_featured: false,
    place_categories: [{ category_id: 6 }],
    photos: ['photo-1585032226651-759b368d7246', 'photo-1569058242253-92a9c755a0ec'],
    dishes: [
      ['Mì xào giòn thập cẩm', 70000, true],
      ['Gà chiên nước mắm', 90000],
      ['Hủ tiếu xào bò', 60000],
    ],
  }),
];
