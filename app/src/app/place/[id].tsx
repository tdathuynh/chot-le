import { Image } from 'expo-image';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { FavoriteButton } from '@/components/favorite-button';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge, Button, Center } from '@/components/ui';
import { MaxContentWidth, Radii, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchCategories, fetchPlace } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { notify } from '@/lib/confirm';
import { formatPrice, formatPriceRange, isOpenNow, shortTime } from '@/lib/format';
import { directionsUrl, formatDistance, placeDistance, requestLocation, useUserLocation } from '@/lib/location';
import { AMENITIES, occasionLabel, OCCASIONS, type Category, type PlaceWithRelations } from '@/lib/types';

export default function PlaceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isAdmin } = useAuth();
  const [place, setPlace] = useState<PlaceWithRelations | null | undefined>(undefined);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const loc = useUserLocation();

  useFocusEffect(
    useCallback(() => {
      fetchPlace(id).then(setPlace).catch(() => setPlace(null));
      fetchCategories().then(setCategories).catch(() => {});
    }, [id])
  );

  if (place === undefined) {
    return (
      <ThemedView style={styles.flex}>
        <Stack.Screen options={{ title: 'Đang tải…', headerShown: true }} />
        <Center>
          <ThemedText themeColor="textSecondary">Đang tải thông tin quán…</ThemedText>
        </Center>
      </ThemedView>
    );
  }

  if (place === null) {
    return (
      <ThemedView style={styles.flex}>
        <Stack.Screen options={{ title: 'Không tìm thấy', headerShown: true }} />
        <Center>
          <Icon name="utensils-crossed" size={44} themeColor="textSecondary" strokeWidth={1.5} />
          <ThemedText type="subtitle">Không tìm thấy quán</ThemedText>
          <ThemedText themeColor="textSecondary">Quán ăn này không tồn tại hoặc đã bị xóa.</ThemedText>
          <Button title="Quay lại trang chủ" variant="primary" onPress={() => router.back()} />
        </Center>
      </ThemedView>
    );
  }

  const contentWidth = Math.min(width, MaxContentWidth);
  const photos = [
    ...(place.cover_image_url ? [place.cover_image_url] : []),
    ...(place.place_photos ?? []).map((p) => p.url).filter((u) => u !== place.cover_image_url),
  ];
  const open = isOpenNow(place);
  const cats = categories.filter((c) => place.place_categories.some((pc) => pc.category_id === c.id));
  const price = formatPriceRange(place);
  const dist = placeDistance(place, loc.status === 'granted' ? loc.coords : null);
  const occasions = (place.occasions ?? []).filter((o) => OCCASIONS.some((x) => x.key === o));

  const onScrollPhotos = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(e.nativeEvent.contentOffset.x / contentWidth);
    if (slide !== activePhotoIndex) {
      setActivePhotoIndex(slide);
    }
  };

  /** Chia sẻ quán: bảng chia sẻ của máy; web không hỗ trợ thì chép vào bộ nhớ tạm. */
  const sharePlace = async () => {
    const text = `${place.name}${price ? ` (${price})` : ''}
${place.address}, ${place.district}
${directionsUrl(place)}`;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && typeof navigator.share !== 'function') {
        await navigator.clipboard.writeText(text);
        return notify('Đã chép thông tin quán', 'Dán vào tin nhắn để gửi cho bạn bè.');
      }
      await Share.share({ title: place.name, message: text });
    } catch {
      // người dùng đóng bảng chia sẻ: không làm gì
    }
  };

  const signatureDishes = place.dishes?.filter((d) => d.is_signature) ?? [];
  const regularDishes = place.dishes?.filter((d) => !d.is_signature) ?? [];

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen
        options={{
          title: place.name,
          headerShown: false,
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 110 + insets.bottom }]}>
        {/* Full-width Image Hero Carousel */}
        <View style={[styles.heroContainer, { width: contentWidth, height: Math.min(contentWidth * 0.72, 360) }]}>
          {photos.length ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onScrollPhotos}
              style={styles.flex}>
              {photos.map((uri, index) => (
                <Image
                  key={`${uri}-${index}`}
                  source={{ uri }}
                  style={{ width: contentWidth, height: '100%' }}
                  contentFit="cover"
                  transition={200}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.heroPlaceholder, { backgroundColor: t.backgroundElement }]}>
              <Icon name="utensils-crossed" size={64} themeColor="textMuted" strokeWidth={1.25} />
            </View>
          )}

          {/* Floating Top Nav Buttons */}
          <SafeAreaView edges={['top']} style={styles.floatingHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              onPress={() => router.back()}
              style={[styles.floatingIconBtn, { backgroundColor: t.card }]}>
              <Icon name="arrow-left" size={22} />
            </Pressable>

            <View style={styles.floatingRightBtns}>
              {isAdmin ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Chỉnh sửa quán"
                  onPress={() => router.push({ pathname: '/edit-place/[id]', params: { id: place.id } })}
                  style={[styles.floatingIconBtn, { backgroundColor: t.card }]}>
                  <Icon name="square-pen" size={20} />
                </Pressable>
              ) : null}

              <View style={styles.floatingShadow}>
                <FavoriteButton placeId={place.id} floating />
              </View>
            </View>
          </SafeAreaView>

          {/* Carousel Pagination Dots / Badge */}
          {photos.length > 1 ? (
            <View style={styles.photoIndicatorsWrap}>
              <View style={[styles.photoCounterBadge, { backgroundColor: 'rgba(0, 0, 0, 0.65)' }]}>
                <Icon name="images" size={13} color="#FFFFFF" />
                <ThemedText type="captionBold" style={{ color: '#FFFFFF' }}>
                  {activePhotoIndex + 1}/{photos.length}
                </ThemedText>
              </View>
            </View>
          ) : null}
        </View>

        {/* Content Body */}
        <View style={styles.body}>
          {/* Title & Category Tags */}
          <View style={styles.titleBlock}>
            <View style={styles.badgeRow}>
              {place.is_featured ? (
                <Badge variant="tint" label="Tuyển chọn" />
              ) : null}
              {!place.is_published ? (
                <Badge variant="danger" label="Đang ẩn đối với người dùng" />
              ) : null}
            </View>

            <ThemedText type="display" style={styles.placeTitle}>
              {place.name}
            </ThemedText>

            {cats.length ? (
              <View style={styles.categoryPillsWrap}>
                {cats.map((c) => (
                  <View key={c.id} style={[styles.catPill, { backgroundColor: t.tintSubtle, borderColor: t.border }]}>
                    <ThemedText type="smallBold" style={{ color: t.tint }}>
                      {c.name}
                    </ThemedText>
                  </View>
                ))}
              </View>
            ) : null}

            {occasions.length ? (
              <View style={styles.occasionRow}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Hợp để:
                </ThemedText>
                {occasions.map((o) => {
                  const icon = OCCASIONS.find((x) => x.key === o)?.icon ?? 'check';
                  return (
                    <View key={o} style={[styles.occasionPill, { backgroundColor: t.backgroundElement }]}>
                      <Icon name={icon} size={14} themeColor="text" />
                      <ThemedText type="smallBold">{occasionLabel(o)}</ThemedText>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>

          {/* Quick Info Card (Icons + Details) */}
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: t.card,
                borderColor: t.cardBorder,
              },
              Shadows.soft,
            ]}>
            {/* Address */}
            <Pressable
              onPress={() => Linking.openURL(directionsUrl(place))}
              style={styles.infoRow}>
              <View style={[styles.iconCircle, { backgroundColor: t.tintSubtle }]}>
                <Icon name="map-pin" size={18} themeColor="tint" />
              </View>
              <View style={styles.infoTextGroup}>
                <ThemedText type="smallBold">Địa chỉ</ThemedText>
                <ThemedText type="default" themeColor="textSecondary">
                  {place.address}, {place.district.replace(/ /g, ' ')}
                </ThemedText>
              </View>
              <View style={styles.distanceCol}>
                {dist != null ? (
                  <ThemedText type="defaultBold" style={{ color: t.text }}>
                    {formatDistance(dist)}
                  </ThemedText>
                ) : null}
                <ThemedText type="small" style={{ color: t.tint }}>
                  Bản đồ
                </ThemedText>
              </View>
            </Pressable>
            {dist == null && place.latitude != null && loc.status !== 'denied' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => requestLocation()}
                style={[styles.distanceLink, { borderTopColor: t.border }]}>
                <Icon name="navigation" size={15} themeColor="tint" />
                <ThemedText type="smallBold" style={{ color: t.tint }}>
                  {loc.status === 'loading' ? 'Đang định vị…' : 'Xem quán cách bạn bao xa'}
                </ThemedText>
              </Pressable>
            ) : null}

            {/* Price */}
            {price ? (
              <View style={[styles.infoRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}>
                <View style={[styles.iconCircle, { backgroundColor: t.tintSubtle }]}>
                  <Icon name="tag" size={18} themeColor="tint" />
                </View>
                <View style={styles.infoTextGroup}>
                  <ThemedText type="smallBold">Mức giá tham khảo</ThemedText>
                  <ThemedText type="default" style={{ color: t.tint, fontWeight: '600' }}>
                    {price}
                  </ThemedText>
                </View>
              </View>
            ) : null}

            {/* Operating Hours */}
            {place.open_time && place.close_time ? (
              <View style={[styles.infoRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}>
                <View style={[styles.iconCircle, { backgroundColor: t.tintSubtle }]}>
                  <Icon name="clock" size={18} themeColor="tint" />
                </View>
                <View style={styles.infoTextGroup}>
                  <ThemedText type="smallBold">Giờ hoạt động</ThemedText>
                  <ThemedText type="default" themeColor="textSecondary">
                    {shortTime(place.open_time)} – {shortTime(place.close_time)}
                  </ThemedText>
                </View>
                {open !== null ? (
                  <Badge variant={open ? 'success' : 'neutral'} label={open ? 'Đang mở' : 'Đã đóng'} />
                ) : null}
              </View>
            ) : null}

            {/* Phone Number */}
            {place.phone ? (
              <Pressable
                onPress={() => Linking.openURL(`tel:${place.phone!.replace(/\s/g, '')}`)}
                style={[styles.infoRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}>
                <View style={[styles.iconCircle, { backgroundColor: t.tintSubtle }]}>
                  <Icon name="phone" size={18} themeColor="tint" />
                </View>
                <View style={styles.infoTextGroup}>
                  <ThemedText type="smallBold">Số điện thoại</ThemedText>
                  <ThemedText type="default" themeColor="textSecondary">
                    {place.phone}
                  </ThemedText>
                </View>
                <ThemedText type="small" style={{ color: t.tint }}>
                  Gọi
                </ThemedText>
              </Pressable>
            ) : null}
          </View>

          {/* Tiện ích: danh sách tick (chỉ hiện khi admin đã khai báo) */}
          {place.amenities?.length ? (
            <View style={[styles.descriptionCard, { backgroundColor: t.card, borderColor: t.cardBorder }, Shadows.soft]}>
              <ThemedText type="subtitle" style={styles.sectionHeadingText}>
                Tiện ích
              </ThemedText>
              <View style={styles.amenityGrid}>
                {AMENITIES.filter((a) => place.amenities.includes(a.key)).map((a) => (
                  <View key={a.key} style={styles.amenityItem}>
                    <Icon name={a.icon} size={18} themeColor="tint" />
                    <ThemedText type="small">{a.label}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Description / Review Section */}
          {place.description ? (
            <View
              style={[
                styles.descriptionCard,
                {
                  backgroundColor: t.card,
                  borderColor: t.cardBorder,
                },
                Shadows.soft,
              ]}>
              <View style={styles.sectionTitleRow}>
                <ThemedText type="subtitle" style={styles.sectionHeadingText}>
                  Nhận xét
                </ThemedText>
              </View>
              <ThemedText type="default" style={styles.descriptionText}>
                {place.description}
              </ThemedText>
            </View>
          ) : null}

          {/* Menu Section */}
          {place.dishes?.length ? (
            <View
              style={[
                styles.menuCard,
                {
                  backgroundColor: t.card,
                  borderColor: t.cardBorder,
                },
                Shadows.soft,
              ]}>
              <View style={styles.sectionTitleRow}>
                <ThemedText type="subtitle" style={styles.sectionHeadingText}>
                  Thực đơn
                </ThemedText>
                <ThemedText type="captionBold" themeColor="textSecondary" style={{ marginLeft: 'auto' }}>
                  {place.dishes.length} món
                </ThemedText>
              </View>

              {/* Signature dishes */}
              {signatureDishes.length > 0 ? (
                <View style={styles.signatureGroup}>
                  <ThemedText type="captionBold" style={{ color: t.tint, letterSpacing: 0.6 }}>
                    NÊN THỬ
                  </ThemedText>
                  {signatureDishes.map((d) => (
                    <View
                      key={d.id ?? d.name}
                      style={[
                        styles.dishRow,
                        styles.signatureDishRow,
                        { backgroundColor: t.tintSubtle, borderColor: t.tint },
                      ]}>
                      <View style={styles.dishNameGroup}>
                        <ThemedText type="defaultBold" style={{ color: t.text }}>
                          {d.name}
                        </ThemedText>
                      </View>
                      <ThemedText type="defaultBold" style={{ color: t.tint }}>
                        {formatPrice(d.price)}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Regular dishes */}
              {regularDishes.map((d, index) => (
                <View
                  key={d.id ?? d.name}
                  style={[
                    styles.dishRow,
                    {
                      borderTopColor: t.border,
                      borderTopWidth: signatureDishes.length > 0 || index > 0 ? StyleSheet.hairlineWidth : 0,
                    },
                  ]}>
                  <ThemedText type="default" style={styles.dishName}>
                    {d.name}
                  </ThemedText>
                  <ThemedText type="defaultBold" style={{ color: t.textSecondary }}>
                    {formatPrice(d.price)}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View
        style={[
          styles.stickyBottomBar,
          {
            backgroundColor: t.card,
            borderTopColor: t.border,
            paddingBottom: Math.max(insets.bottom, 12),
          },
          Shadows.strong,
        ]}>
        <View style={styles.stickyContent}>
          <FavoriteButton placeId={place.id} size={48} shape="rounded" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chia sẻ quán"
            onPress={sharePlace}
            style={({ pressed }) => [
              styles.bottomIconBtn,
              { borderColor: t.border, backgroundColor: t.card, opacity: pressed ? 0.7 : 1 },
            ]}>
            <Icon name="share" size={22} themeColor="text" />
          </Pressable>

          {place.phone ? (
            <Button
              title="Gọi"
              variant="secondary"
              size="lg"
              icon={<Icon name="phone" size={18} />}
              onPress={() => Linking.openURL(`tel:${place.phone!.replace(/\s/g, '')}`)}
              style={styles.bottomCallBtn}
            />
          ) : null}

          <Button
            title="Chỉ đường"
            variant="primary"
            size="lg"
            icon={<Icon name="navigation" size={18} themeColor="tintText" />}
            onPress={() => Linking.openURL(directionsUrl(place))}
            style={styles.bottomDirectionsBtn}
          />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  heroContainer: {
    position: 'relative',
    alignSelf: 'center',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Platform.OS === 'ios' ? 4 : Spacing.two,
  },
  floatingShadow: { borderRadius: 22, ...Shadows.medium },
  floatingRightBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  floatingIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.medium,
  },
  photoIndicatorsWrap: {
    position: 'absolute',
    bottom: Spacing.three,
    right: Spacing.three,
  },
  photoCounterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
  },
  body: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  titleBlock: {
    gap: Spacing.one + 2,
    marginTop: Spacing.one,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    alignItems: 'center',
  },
  placeTitle: {
    fontSize: 26,
    lineHeight: 32,
    marginTop: 2,
  },
  categoryPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: 2,
  },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  occasionRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.one + 2, marginTop: 4 },
  occasionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
  },
  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.two + 2 },
  amenityItem: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingRight: Spacing.two },
  infoCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextGroup: {
    flex: 1,
    gap: 2,
  },
  descriptionCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.three + 2,
    gap: Spacing.two,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sectionHeadingText: {
    fontSize: 17,
    lineHeight: 22,
  },
  descriptionText: {
    lineHeight: 24,
  },
  menuCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.three + 2,
    gap: Spacing.two + 2,
  },
  signatureGroup: {
    gap: Spacing.two,
    marginVertical: Spacing.one,
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two + 2,
    gap: Spacing.two,
  },
  signatureDishRow: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
  },
  dishNameGroup: {
    flex: 1,
  },
  dishName: {
    flex: 1,
  },

  /* Sticky Bottom Bar */
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: Spacing.two + 4,
    paddingHorizontal: Spacing.three,
  },
  stickyContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  bottomCallBtn: {
    minWidth: 0,
    paddingHorizontal: Spacing.three,
  },
  bottomIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceCol: { alignItems: 'flex-end', gap: 2 },
  distanceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bottomDirectionsBtn: {
    flex: 1,
  },
});
