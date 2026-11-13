import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, View } from 'react-native';

import { FavoriteButton } from '@/components/favorite-button';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button } from '@/components/ui';
import { MaxContentWidth, Radii, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PlaceWithDistance } from '@/lib/filters';
import { formatPriceRange, isOpenNow, shortTime } from '@/lib/format';
import { directionsUrl, formatDistance } from '@/lib/location';
import { occasionLabel } from '@/lib/types';

/** Chọn 1 quán ngẫu nhiên, tránh lặp lại quán vừa gợi ý trong cùng phiên. */
function pickFrom(pool: PlaceWithDistance[], seen: Set<string>, exclude?: string): PlaceWithDistance | null {
  if (!pool.length) return null;
  let candidates = pool.filter((p) => !seen.has(p.id) && p.id !== exclude);
  if (!candidates.length) {
    seen.clear();
    candidates = pool.filter((p) => p.id !== exclude);
    if (!candidates.length) candidates = pool;
  }
  const p = candidates[Math.floor(Math.random() * candidates.length)];
  seen.add(p.id);
  return p;
}

/**
 * Bảng "Hôm nay ăn gì?": gợi ý 1 quán theo đúng bộ lọc đang chọn
 * (gần tôi, mục đích, giá, đang mở…), có Đổi quán khác và Chỉ đường.
 */
export function RandomPicker({
  visible,
  pool,
  criteria,
  onClose,
}: {
  visible: boolean;
  pool: PlaceWithDistance[];
  /** Nhãn tiêu chí đang áp dụng, vd ["Trong 3 km", "Hẹn hò"]. */
  criteria: string[];
  onClose: () => void;
}) {
  const t = useTheme();
  const seen = useRef(new Set<string>());
  const [pick, setPick] = useState<PlaceWithDistance | null>(null);
  const [round, setRound] = useState(0);

  // Ưu tiên quán đang mở (hoặc không rõ giờ); nếu không còn quán nào mở thì mới chọn quán đang đóng.
  const openPool = pool.filter((p) => isOpenNow(p) !== false);
  const activePool = openPool.length ? openPool : pool;
  const onlyClosed = !openPool.length && pool.length > 0;

  const reroll = () => {
    setPick(pickFrom(activePool, seen.current, pick?.id));
    setRound((r) => r + 1);
  };

  // "Không ưng? Thử 2 quán này": 2 quán khác trong cùng nhóm, gần nhất trước nếu biết vị trí.
  const alternatives = pick
    ? activePool
        .filter((p) => p.id !== pick.id)
        .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
        .slice(0, 2)
    : [];

  const open = pick ? isOpenNow(pick) : null;
  const price = pick ? formatPriceRange(pick) : '';
  const meta = pick
    ? [price, pick.distanceKm != null ? formatDistance(pick.distanceKm) : null, pick.district].filter(Boolean).join(' · ')
    : '';

  return (
    <Modal visible={visible} transparent animationType="fade" onShow={reroll} onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: t.overlay }]}>
        <Pressable style={styles.flex} onPress={onClose} accessibilityLabel="Đóng" />
        <View style={[styles.sheet, { backgroundColor: t.card, borderColor: t.cardBorder }, Shadows.strong]}>
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: t.border }]} />
          </View>

          <View style={styles.headerRow}>
            <View style={styles.flex}>
              <ThemedText type="subtitle">Gợi ý cho bạn</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                {onlyClosed
                  ? 'Các quán phù hợp đều đang đóng cửa'
                  : criteria.length
                  ? `Theo: ${criteria.join(' · ')}`
                  : `Chọn trong ${activePool.length} quán đang mở`}
              </ThemedText>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Đóng"
              style={[styles.closeBtn, { backgroundColor: t.backgroundElement }]}>
              <Icon name="close" size={20} themeColor="textSecondary" />
            </Pressable>
          </View>

          {pick ? (
            <View key={`${pick.id}-${round}`} style={styles.body}>
              <View style={[styles.imageWrap, { backgroundColor: t.backgroundElement }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Xem chi tiết ${pick.name}`}
                  onPress={() => {
                    onClose();
                    router.push({ pathname: '/place/[id]', params: { id: pick.id } });
                  }}
                  style={styles.image}>
                  {pick.cover_image_url ? (
                    <Image source={{ uri: pick.cover_image_url }} style={styles.image} contentFit="cover" transition={250} />
                  ) : (
                    <View style={[styles.image, styles.center]}>
                      <ThemedText style={{ fontSize: 48 }}>🍲</ThemedText>
                    </View>
                  )}
                </Pressable>
                {/* Nút tim nằm cạnh (không lồng trong) vùng bấm ảnh */}
                <View style={styles.favWrap}>
                  <FavoriteButton placeId={pick.id} floating />
                </View>
              </View>

              <View style={styles.info}>
                <ThemedText type="title" numberOfLines={2} style={styles.name}>
                  {pick.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {meta}
                </ThemedText>
                <View style={styles.badges}>
                  {open !== null ? (
                    <Badge
                      variant={open ? 'success' : 'neutral'}
                      label={
                        open
                          ? `Đang mở${pick.close_time ? ` · đến ${shortTime(pick.close_time)}` : ''}`
                          : `Đã đóng${pick.open_time ? ` · mở ${shortTime(pick.open_time)}` : ''}`
                      }
                    />
                  ) : null}
                  {(pick.occasions ?? []).slice(0, 2).map((o) => (
                    <Badge key={o} variant="tint" label={occasionLabel(o)} />
                  ))}
                </View>
              </View>

              <View style={styles.actions}>
                <Button
                  title="Đổi quán khác"
                  variant="secondary"
                  size="lg"
                  icon={<Icon name="shuffle" size={18} />}
                  onPress={reroll}
                  disabled={activePool.length < 2}
                  style={styles.flex}
                />
                <Button
                  title="Chỉ đường"
                  variant="primary"
                  size="lg"
                  icon={<Icon name="navigate" size={18} themeColor="tintText" />}
                  onPress={() => Linking.openURL(directionsUrl(pick))}
                  style={styles.flex}
                />
              </View>
              {alternatives.length ? (
                <View style={styles.altBox}>
                  <ThemedText type="captionBold" themeColor="textSecondary">
                    KHÔNG ƯNG? THỬ 2 QUÁN NÀY
                  </ThemedText>
                  <View style={styles.altRow}>
                    {alternatives.map((a) => (
                      <Pressable
                        key={a.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Chọn ${a.name}`}
                        onPress={() => {
                          seen.current.add(a.id);
                          setPick(a);
                          setRound((r) => r + 1);
                        }}
                        style={({ pressed }) => [
                          styles.altCard,
                          { backgroundColor: t.backgroundElement, opacity: pressed ? 0.8 : 1 },
                        ]}>
                        {a.cover_image_url ? (
                          <Image source={{ uri: a.cover_image_url }} style={styles.altImg} contentFit="cover" />
                        ) : null}
                        <View style={styles.flex}>
                          <ThemedText type="smallBold" numberOfLines={2}>
                            {a.name}
                          </ThemedText>
                          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                            {[formatPriceRange(a), a.distanceKm != null ? formatDistance(a.distanceKm) : a.district]
                              .filter(Boolean)
                              .join(' · ')}
                          </ThemedText>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onClose();
                  router.push({ pathname: '/place/[id]', params: { id: pick.id } });
                }}
                style={styles.detailLink}>
                <ThemedText type="smallBold" style={{ color: t.tint }}>
                  Xem thực đơn và chi tiết
                </ThemedText>
                <Icon name="chevron-forward" size={16} themeColor="tint" />
              </Pressable>
            </View>
          ) : (
            <View style={[styles.body, styles.center, { paddingVertical: Spacing.five }]}>
              <Icon name="search-outline" size={36} themeColor="textMuted" />
              <ThemedText type="defaultBold" style={{ textAlign: 'center' }}>
                Không có quán nào khớp bộ lọc
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
                Thử nới bán kính hoặc bỏ bớt tiêu chí rồi bấm Gợi ý lại.
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
  },
  handleWrap: { alignItems: 'center', paddingVertical: Spacing.two },
  handle: { width: 40, height: 4, borderRadius: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.three },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  body: { gap: Spacing.three },
  altBox: { gap: Spacing.one + 2 },
  altRow: { flexDirection: 'row', gap: Spacing.two },
  altCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: 6, borderRadius: Radii.md, minHeight: 52 },
  altImg: { width: 40, height: 40, borderRadius: Radii.sm },
  imageWrap: { height: 170, borderRadius: Radii.lg, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  favWrap: { position: 'absolute', top: Spacing.two, right: Spacing.two },
  info: { gap: 4 },
  name: { fontSize: 24, lineHeight: 30 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one + 2, marginTop: 4 },
  actions: { flexDirection: 'row', gap: Spacing.two },
  detailLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 44 },
});
