import {
  ArrowLeft,
  Ban,
  Bike,
  Camera,
  Briefcase,
  Car,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleX,
  Clock,
  Coffee,
  Cookie,
  CreditCard,
  Croissant,
  EggFried,
  Eye,
  EyeOff,
  Flame,
  Heart,
  Hourglass,
  House,
  IceCreamBowl,
  Images,
  KeyRound,
  List,
  Locate,
  LocateFixed,
  Lock,
  Map,
  MapPin,
  Navigation,
  Phone,
  RotateCcw,
  SendHorizontal,
  Plus,
  Sandwich,
  Search,
  Share,
  Shell,
  Shuffle,
  SlidersHorizontal,
  Snowflake,
  Soup,
  Sparkles,
  SquarePen,
  Star,
  Sun,
  Tag,
  Trash2,
  User,
  Users,
  UtensilsCrossed,
  Wifi,
  Wine,
  X,
  Crown,
  Gift,
  Link,
  Lightbulb,
  ChartColumn,
  TrendingUp,
  Vote,
  Copy,
  Trophy,
  MessageCircle,
  Square,
  SquareCheck,
  RotateCw,
  FlipHorizontal2,
  ZoomIn,
  ZoomOut,
  Crop,
  Undo2,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Chỉ import icon thực sự dùng (giữ bundle nhỏ). Tên theo lucide.dev/icons.
const ICONS = {
  'arrow-left': ArrowLeft,
  ban: Ban,
  bike: Bike,
  camera: Camera,
  briefcase: Briefcase,
  car: Car,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'circle-x': CircleX,
  clock: Clock,
  coffee: Coffee,
  cookie: Cookie,
  'credit-card': CreditCard,
  croissant: Croissant,
  'egg-fried': EggFried,
  eye: Eye,
  'eye-off': EyeOff,
  flame: Flame,
  heart: Heart,
  hourglass: Hourglass,
  house: House,
  'ice-cream-bowl': IceCreamBowl,
  images: Images,
  'key-round': KeyRound,
  list: List,
  locate: Locate,
  'locate-fixed': LocateFixed,
  lock: Lock,
  map: Map,
  'map-pin': MapPin,
  navigation: Navigation,
  phone: Phone,
  'rotate-ccw': RotateCcw,
  'send-horizontal': SendHorizontal,
  plus: Plus,
  sandwich: Sandwich,
  search: Search,
  share: Share,
  shell: Shell,
  shuffle: Shuffle,
  'sliders-horizontal': SlidersHorizontal,
  snowflake: Snowflake,
  soup: Soup,
  sparkles: Sparkles,
  'square-pen': SquarePen,
  star: Star,
  sun: Sun,
  tag: Tag,
  'trash-2': Trash2,
  user: User,
  users: Users,
  'utensils-crossed': UtensilsCrossed,
  wifi: Wifi,
  wine: Wine,
  x: X,
  'crown': Crown,
  'gift': Gift,
  'link': Link,
  'lightbulb': Lightbulb,
  'chart-column': ChartColumn,
  'trending-up': TrendingUp,
  'vote': Vote,
  'copy': Copy,
  'trophy': Trophy,
  'message-circle': MessageCircle,
  'square': Square,
  'square-check': SquareCheck,
  'rotate-cw': RotateCw,
  'flip-horizontal-2': FlipHorizontal2,
  'zoom-in': ZoomIn,
  'zoom-out': ZoomOut,
  crop: Crop,
  'undo-2': Undo2,
  'triangle-alert': TriangleAlert,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function isIconName(name: string | null | undefined): name is IconName {
  return !!name && name in ICONS;
}

/** Icon của danh mục (cột categories.icon); thiếu hoặc sai tên → icon dao nĩa. */
export function categoryIcon(c: { icon?: string | null }): IconName {
  return isIconName(c.icon) ? c.icon : 'utensils-crossed';
}

/**
 * Icon đơn sắc dùng chung toàn app (Lucide, dạng nét). Không dùng emoji.
 * `filled` tô kín icon (vd trái tim đã thích, sao món đặc trưng).
 */
export function Icon({
  name,
  size = 20,
  color,
  themeColor = 'text',
  filled = false,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  color?: string;
  themeColor?: ThemeColor;
  filled?: boolean;
  strokeWidth?: number;
}) {
  const t = useTheme();
  const c = color ?? t[themeColor];
  const Cmp = ICONS[name];
  return <Cmp size={size} color={c} fill={filled ? c : 'none'} strokeWidth={strokeWidth} />;
}
