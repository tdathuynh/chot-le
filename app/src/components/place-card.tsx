import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FavoriteButton } from '@/components/favorite-button';
import { Icon } from '@/components/icon';
import { Badge } from '@/components/ui';
import { Radii, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatPriceRange, isDealActive, isOpenNow, shortTime } from '@/lib/format';
import { formatDistance } from '@/lib/location';
import type { Place } from '@/lib/types';

/**
 * Thẻ quán dùng ở mọi danh sách.
 * `admin`: dùng trong màn Quản trị — không viền/bóng riêng (thẻ cha đã có), không nút tim,
 * hiện nhãn "Đang hiển thị / Đang ẩn".
 */
export function PlaceCard({
  place,
  admin = false,
  distanceKm,
  reason,
}: {
  place: Place;
  admin?: boolean;
  /** Khoảng cách tới người dùng (km); không truyền thì không hiện. */
  distanceKm?: number | null;
  /** Dòng "Vì sao hợp" khi là kết quả tìm bằng câu nói. */
  reason?: string;
}) {
  const showFavorite = !admin;
  const t = useTheme();
  const open = isOpenNow(place);
  const price = formatPriceRange(place);
  const deal = isDealActive(place) ? place.deal_title?.trim() : null;

  return (
    <View style={styles.cardShell}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Xem chi tiết quán ${place.name}${deal ? `, ưu đãi: ${deal}` : ''}`}
      onPress={() => router.push({ pathname: '/place/[id]', params: { id: place.id } })}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: t.card,
          borderColor: admin ? 'transparent' : t.cardBorder,
          borderWidth: admin ? 0 : 1,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.992 : 1 }],
        },
        admin ? null : Shadows.soft,
      ]}>
      {/* Image thumbnail */}
      <View style={styles.imageWrap}>
        {place.cover_image_url ? (
          <Image
            source={{ uri: place.cover_image_url }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.image, styles.placeholder, { backgroundColor: t.backgroundElement }]}>
            <Icon name="utensils-crossed" size={36} themeColor="textMuted" strokeWidth={1.5} />
          </View>
        )}
      </View>

      {/* Info Body */}
      <View style={styles.body}>
        <View style={styles.topRow}>
          <ThemedText type="defaultBold" numberOfLines={2} style={[styles.name, admin && { paddingRight: 0 }]}>
            {place.name}
          </ThemedText>

        </View>

        {reason ? (
          <View style={styles.reasonRow}>
            <Icon name="sparkles" size={12} themeColor="tint" />
            <ThemedText type="captionBold" numberOfLines={1} style={[styles.reasonText, { color: t.tint }]}>
              Hợp: {reason}
            </ThemedText>
          </View>
        ) : null}

        {deal ? (
          <View style={[styles.dealRow, !admin && styles.dealRowFav]}>
            <View style={[styles.dealPill, { backgroundColor: t.tintSubtle }]}>
              <Icon name="gift" size={12} themeColor="tint" />
              <ThemedText type="captionBold" numberOfLines={1} style={[styles.dealText, { color: t.tint }]}>
                {deal}
              </ThemedText>
            </View>
          </View>
        ) : null}

        {admin ? (
          <View style={styles.adminBadgeRow}>
            {place.is_published ? (
              <View style={styles.visibleRow}>
                <Icon name="eye" size={14} themeColor="textSecondary" />
                <ThemedText type="caption" themeColor="textSecondary">
                  Đang hiển thị
                </ThemedText>
              </View>
            ) : (
              <Badge variant="danger" label="Đang ẩn" icon={<Icon name="eye-off" size={12} themeColor="danger" />} />
            )}
          </View>
        ) : null}

        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.location}>
          {distanceKm != null ? (
            <ThemedText type="smallBold" style={{ color: t.text }}>
              {formatDistance(distanceKm)} ·{' '}
            </ThemedText>
          ) : null}
          {place.district} · {place.address}
        </ThemedText>

        <View style={styles.bottomRow}>
          {price ? (
            <ThemedText type="smallBold" style={{ color: t.tint }}>
              {price}
            </ThemedText>
          ) : (
            <View />
          )}

          <View style={styles.statusWrap}>
            {open !== null ? (
              <Badge
                variant={open ? 'success' : 'neutral'}
                label={open ? 'Đang mở' : 'Đã đóng'}
                icon={
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: open ? t.success : t.textMuted },
                    ]}
                  />
                }
              />
            ) : null}

            {place.open_time && place.close_time ? (
              <ThemedText type="caption" themeColor="textSecondary">
                {shortTime(place.open_time)}–{shortTime(place.close_time)}
              </ThemedText>
            ) : null}

          </View>
        </View>
      </View>
    </Pressable>
      {showFavorite ? (
        <View style={styles.favBtn}>
          <FavoriteButton placeId={place.id} />
        </View>
      ) : null}
    </View>
  );
}

/** Thẻ ảnh lớn cuộn ngang dành cho mục Nổi bật trên trang chủ */
export function FeaturedPlaceCard({ place, distanceKm }: { place: Place; distanceKm?: number | null }) {
  const t = useTheme();
  const open = isOpenNow(place);
  const price = formatPriceRange(place);
  const deal = isDealActive(place);

  return (
    <View style={styles.featuredShell}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Xem quán nổi bật ${place.name}${deal ? ', đang có ưu đãi' : ''}`}
      onPress={() => router.push({ pathname: '/place/[id]', params: { id: place.id } })}
      style={({ pressed }) => [
        styles.featuredCard,
        {
          backgroundColor: t.card,
          borderColor: t.cardBorder,
          opacity: pressed ? 0.92 : 1,
        },
        Shadows.medium,
      ]}>
      <View style={styles.featuredImageWrap}>
        {place.cover_image_url ? (
          <Image
            source={{ uri: place.cover_image_url }}
            style={styles.featuredImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.featuredImage, styles.placeholder, { backgroundColor: t.backgroundElement }]}>
            <Icon name="utensils-crossed" size={44} themeColor="textMuted" strokeWidth={1.5} />
          </View>
        )}
        <View style={styles.featuredOverlayTop}>
          <View style={[styles.featuredBadge, { backgroundColor: t.tint }]}>
            <ThemedText type="captionBold" style={{ color: t.tintText }}>
              Tuyển chọn
            </ThemedText>
          </View>
          {deal ? (
            <View style={[styles.featuredBadge, styles.featuredDealBadge, { backgroundColor: t.card }]}>
              <Icon name="gift" size={12} themeColor="tint" />
              <ThemedText type="captionBold" style={{ color: t.tint }}>
                Ưu đãi
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.featuredContent}>
        <ThemedText type="subtitle" numberOfLines={1} style={{ fontSize: 16, lineHeight: 22 }}>
          {place.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {distanceKm != null ? (
            <ThemedText type="smallBold" style={{ color: t.text }}>
              {formatDistance(distanceKm)} ·{' '}
            </ThemedText>
          ) : null}
          {place.district} · {place.address}
        </ThemedText>
        <View style={styles.featuredMeta}>
          {price ? (
            <ThemedText type="smallBold" style={{ color: t.tint }}>
              {price}
            </ThemedText>
          ) : null}
          {open !== null ? (
            <Badge
              variant={open ? 'success' : 'neutral'}
              label={open ? 'Đang mở' : 'Đã đóng'}
            />
          ) : null}
        </View>
      </View>
    </Pressable>
      <View style={styles.featuredFavBtn}>
        <FavoriteButton placeId={place.id} floating />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShell: { position: 'relative' },
  featuredShell: { position: 'relative', width: 260 },
  card: {
    flexDirection: 'row',
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.two + 4,
    gap: Spacing.three,
    alignItems: 'center',
  },
  imageWrap: {
    width: 88,
    height: 104,
    borderRadius: Radii.md,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  body: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 104,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  name: {
    paddingRight: 40,
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  adminBadgeRow: { flexDirection: 'row' },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 40 },
  reasonText: { flexShrink: 1 },
  // Hàng chứa pill ưu đãi: pill co lại theo nội dung, dài quá thì cắt "…" trong 1 dòng.
  dealRow: { flexDirection: 'row' },
  dealRowFav: { paddingRight: 40 },
  dealPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
    minWidth: 0,
    flexShrink: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  dealText: { flexShrink: 1, minWidth: 0 },
  visibleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  favBtn: { position: 'absolute', top: Spacing.two, right: Spacing.two },
  location: {
    lineHeight: 18,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
    marginTop: 2,
  },
  statusWrap: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  /* Featured Card Styles */
  featuredCard: {
    width: 260,
    borderRadius: Radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  featuredImageWrap: {
    width: '100%',
    height: 148,
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlayTop: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    right: Spacing.two + 48,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
    alignItems: 'center',
  },
  featuredDealBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  featuredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  featuredFavBtn: { position: 'absolute', top: Spacing.two, right: Spacing.two },
  featuredContent: {
    padding: Spacing.three,
    gap: Spacing.one,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
});
