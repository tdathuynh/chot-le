import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';
import { toggleFavorite, useFavorites } from '@/lib/favorites';

/**
 * Nút tim dùng chung ở mọi nơi: tim nét xám khi chưa lưu, tim đặc màu cam khi đã lưu.
 * Vùng chạm tối thiểu 44×44.
 */
export function FavoriteButton({
  placeId,
  size = 44,
  floating,
  shape = 'circle',
}: {
  placeId: string;
  size?: number;
  floating?: boolean;
  shape?: 'circle' | 'rounded';
}) {
  const t = useTheme();
  const fav = useFavorites().includes(placeId);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={fav ? 'Bỏ lưu quán yêu thích' : 'Lưu quán yêu thích'}
      accessibilityState={{ selected: fav }}
      hitSlop={size < 44 ? (44 - size) / 2 : 0}
      onPress={(e) => {
        e.stopPropagation();
        toggleFavorite(placeId);
      }}
      style={({ pressed }) => [
        styles.btn,
        {
          width: size,
          height: size,
          borderRadius: shape === 'circle' ? size / 2 : 12,
          backgroundColor: fav ? t.tintSubtle : floating ? t.card : 'transparent',
          borderColor: fav ? t.tint : t.border,
          opacity: pressed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
      ]}>
      <Icon name={fav ? 'heart' : 'heart-outline'} size={Math.round(size * 0.48)} themeColor={fav ? 'tint' : 'textSecondary'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
