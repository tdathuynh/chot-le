import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Icon đơn sắc dùng chung toàn app (Ionicons, dạng nét).
 * Dùng thay emoji cho nút và nhãn để giao diện nhất quán, đổi màu theo theme.
 */
export function Icon({
  name,
  size = 20,
  color,
  themeColor = 'text',
}: {
  name: IconName;
  size?: number;
  color?: string;
  themeColor?: ThemeColor;
}) {
  const t = useTheme();
  return <Ionicons name={name} size={size} color={color ?? t[themeColor]} />;
}
