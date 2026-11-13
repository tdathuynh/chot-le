import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { FeaturedPlaceCard, PlaceCard } from '@/components/place-card';
import { PlacesMap } from '@/components/places-map';
import { RandomPicker } from '@/components/random-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Chip } from '@/components/ui';
import { MaxContentWidth, Radii, Shadows, Spacing, WebTopInset } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { fetchCategories, fetchPlaces, isDemo, smartParse } from '@/lib/api';
import { notify } from '@/lib/confirm';
import { formatPrice } from '@/lib/format';
import {
  applyFilters,
  describeFilters,
  EMPTY_FILTERS,
  filterItems,
  matchReason,
  isFilterActive,
  looksLikeRequest,
  parsedToFilters,
  PRICE_OPTIONS,
  priceLabel,
  RADIUS_OPTIONS,
  type Filters,
} from '@/lib/filters';
import { placeDistance, requestLocation, useUserLocation } from '@/lib/location';
import { AMENITIES, amenityLabel, DISTRICTS, OCCASIONS, type Category, type PlaceWithRelations } from '@/lib/types';

/** Câu mẫu gợi ý cho ô tìm bằng câu nói (hiện khi ô trống và đang được chọn). */
const EXAMPLE_QUERIES = [
  'lẩu dưới 200k gần tôi đi nhóm 4 người',
  'cà phê yên tĩnh để làm việc quận 3',
  'hẹn hò ăn ốc đang mở',
  'bún phở rẻ trong 2 km',
];

export default function HomeScreen() {
  const t = useTheme();
  const [places, setPlaces] = useState<PlaceWithRelations[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Toàn bộ tiêu chí lọc nằm trong 1 object (dùng chung cho danh sách, Gợi ý, tìm bằng câu nói)
  const [f, setF] = useState<Filters>(EMPTY_FILTERS);
  const upd = useCallback((patch: Partial<Filters>) => setF((prev) => ({ ...prev, ...patch })), []);
  const { query, categoryId, district, maxPrice, openOnly, occasion, nearMe, radiusKm, amenities } = f;
  const toggleAmenity = (k: string) =>
    upd({ amenities: amenities.includes(k) ? amenities.filter((x) => x !== k) : [...amenities, k] });
  const setQuery = (v: string) => {
    upd({ query: v });
    setUnderstood(null);
  };
  const setCategoryId = (v: number | null) => upd({ categoryId: v });
  const setDistrict = (v: string | null) => upd({ district: v });
  const setMaxPrice = (v: number | null) => upd({ maxPrice: v });
  const setOpenOnly = (v: boolean) => upd({ openOnly: v });
  const setOccasion = (v: string | null) => upd({ occasion: v });

  // Vị trí người dùng (chỉ hỏi khi bấm "Gần tôi" hoặc chọn bán kính)
  const loc = useUserLocation();
  const me = loc.status === 'granted' ? loc.coords : null;

  // Tìm bằng câu nói: trạng thái "đang hiểu" và kết quả để hiện lại cho người dùng
  const [parsing, setParsing] = useState(false);
  const [understood, setUnderstood] = useState<{ unsupported: string[]; ai: boolean } | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [randomOpen, setRandomOpen] = useState(false);
  // Chế độ xem: danh sách hoặc bản đồ (giữ nguyên bộ lọc khi chuyển)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dark = useColorScheme() === 'dark';

  // Modal filter sheet visibility
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const fetchAll = useCallback(
    () =>
      Promise.all([fetchPlaces(), fetchCategories()])
        .then(([p, c]) => {
          setPlaces(p.filter((x) => x.is_published));
          setCategories(c);
          setError(null);
        })
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false)),
    []
  );

  const load = useCallback(() => {
    setLoading(true);
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Greeting by hour
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return 'Chào buổi sáng';
    if (h >= 11 && h < 14) return 'Bữa trưa ngon miệng';
    if (h >= 14 && h < 18) return 'Buổi chiều thư thả';
    return 'Tối nay ăn gì nào?';
  }, []);

  // Districts with active place counts
  const districts = useMemo(() => {
    const count = new Map<string, number>();
    places.forEach((p) => count.set(p.district, (count.get(p.district) ?? 0) + 1));
    const order = (d: string) => (DISTRICTS.indexOf(d) + 1 || 999);
    return [...count.entries()].sort((a, b) => order(a[0]) - order(b[0]));
  }, [places]);

  // Lọc + sắp xếp theo khoảng cách khi bật Gần tôi
  // Đang gõ một câu yêu cầu (chưa bấm Hiểu câu) → tạm không lọc theo chữ để khỏi báo "0 quán".
  const typingRequest = query.trim().length > 0 && !understood && looksLikeRequest(query, categories);
  const filtered = useMemo(
    () => applyFilters(places, typingRequest ? { ...f, query: '' } : f, me),
    [places, f, me, typingRequest]
  );

  // Số tiêu chí trong bảng Bộ lọc (không tính ô tìm kiếm và hàng danh mục)
  const activeModalFiltersCount =
    Number(openOnly) + Number(district != null) + Number(maxPrice != null) + Number(occasion != null) + Number(radiusKm != null) + amenities.length;

  // Featured places list (only shown when not searching/filtering)
  const isFiltering = isFilterActive(f);
  const featuredPlaces = useMemo(() => {
    if (isFiltering) return [];
    const feat = places.filter((p) => p.is_featured);
    return feat.length ? feat : places.slice(0, 4);
  }, [places, isFiltering]);

  // Không lặp lại quán đã hiện ở mục Tuyển chọn trong danh sách bên dưới.
  const listData = useMemo(() => {
    if (!featuredPlaces.length) return filtered;
    const ids = new Set(featuredPlaces.map((p) => p.id));
    return filtered.filter((p) => !ids.has(p.id));
  }, [filtered, featuredPlaces]);

  const pickRandom = () => {
    if (!places.length) return notify('Chưa có quán nào để chọn');
    setRandomOpen(true);
  };

  /** Bật vị trí; nếu bị từ chối thì tắt Gần tôi và báo cho người dùng. */
  const ensureLocation = useCallback(async () => {
    if (me) return true;
    const c = await requestLocation();
    if (!c) {
      upd({ nearMe: false, radiusKm: null });
      notify('Chưa lấy được vị trí', 'Hãy cho phép app dùng vị trí trong cài đặt trình duyệt hoặc điện thoại, rồi thử lại.');
      return false;
    }
    return true;
  }, [me, upd]);

  const toggleNearMe = () => {
    if (nearMe) return upd({ nearMe: false, radiusKm: null });
    upd({ nearMe: true });
    ensureLocation();
  };

  const setRadius = (km: number | null) => {
    upd(km == null ? { radiusKm: null } : { radiusKm: km, nearMe: true });
    if (km != null) ensureLocation();
  };

  /** Hiểu câu tìm kiếm (AI nếu có, không thì bộ hiểu câu trên máy) → đổi thành bộ lọc. */
  const runSmartSearch = async (text: string) => {
    if (!text.trim()) return;
    setParsing(true);
    try {
      const parsed = await smartParse(text, categories);
      setF(parsedToFilters(parsed));
      setUnderstood({ unsupported: parsed.unsupported, ai: parsed.source === 'ai' });
      if (parsed.nearMe) ensureLocation();
    } finally {
      setParsing(false);
    }
  };

  const clearAllFilters = () => {
    setF(EMPTY_FILTERS);
    setUnderstood(null);
  };

  const clearModalFilters = () =>
    upd({ district: null, maxPrice: null, openOnly: false, occasion: null, radiusKm: null, amenities: [] });

  const canUnderstand = typingRequest;

  // Ghim bản đồ: chỉ quán có toạ độ; nhãn là giá khởi điểm ("55k").
  const pins = useMemo(
    () =>
      filtered
        .filter((p) => p.latitude != null && p.longitude != null)
        .map((p) => ({
          id: p.id,
          lat: p.latitude as number,
          lng: p.longitude as number,
          label: p.price_min != null ? formatPrice(p.price_min) : p.name.split(' ').slice(0, 2).join(' '),
          name: p.name,
        })),
    [filtered]
  );
  const selectedPlace = viewMode === 'map' ? filtered.find((p) => p.id === selectedId) ?? null : null;
  const understoodExtra = filterItems(f, categories).filter((it) => it.key !== 'near' && it.key !== 'occ');

  // Ô tìm kiếm + hiểu câu + hàng chip nhanh: dùng chung cho chế độ Danh sách và Bản đồ.
  const controls = (
    <>
      {/* Search Input + Filter Button */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchInputWrap,
            {
              backgroundColor: t.card,
              borderColor: t.cardBorder,
            },
            Shadows.soft,
          ]}>
          <View style={styles.searchIcon}>
            <Icon name="search" size={18} themeColor="textSecondary" />
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm hoặc gõ cả câu"
            placeholderTextColor={t.textMuted}
            style={[styles.searchInput, { color: t.text }]}
            returnKeyType="search"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            onSubmitEditing={() => (looksLikeRequest(query, categories) ? runSmartSearch(query) : undefined)}
          />
          {canUnderstand || parsing ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hiểu câu tìm kiếm thành bộ lọc"
              onPress={() => runSmartSearch(query)}
              disabled={parsing}
              style={[styles.understandBtn, { backgroundColor: t.tint }]}>
              <Icon name={parsing ? 'hourglass-outline' : 'sparkles'} size={17} themeColor="tintText" />
            </Pressable>
          ) : query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xóa tìm kiếm"
              onPress={() => setQuery('')}
              hitSlop={8}
              style={styles.clearSearchBtn}>
              <Icon name="close-circle" size={18} themeColor="textMuted" />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Mở bộ lọc, có ${activeModalFiltersCount} bộ lọc đang chọn`}
          onPress={() => setFilterModalVisible(true)}
          style={({ pressed }) => [
            styles.filterTriggerBtn,
            {
              backgroundColor: activeModalFiltersCount > 0 ? t.tint : t.card,
              borderColor: activeModalFiltersCount > 0 ? t.tint : t.cardBorder,
              opacity: pressed ? 0.8 : 1,
            },
            Shadows.soft,
          ]}>
          <Icon name="options-outline" size={18} color={activeModalFiltersCount > 0 ? t.tintText : t.text} />
          <ThemedText
            type="smallBold"
            style={{
              color: activeModalFiltersCount > 0 ? t.tintText : t.text,
            }}>
            Bộ lọc
          </ThemedText>
          {activeModalFiltersCount > 0 ? (
            <View style={[styles.filterBadgeCount, { backgroundColor: t.tintText }]}>
              <ThemedText type="captionBold" style={{ color: t.tint, fontSize: 11 }}>
                {activeModalFiltersCount}
              </ThemedText>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* Câu mẫu: hiện khi ô tìm kiếm trống và đang được chọn (1 hàng chip cuộn ngang) */}
      {searchFocused && !query ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeChipsRow}>
          {EXAMPLE_QUERIES.map((q) => (
            <Chip
              key={q}
              label={q}
              icon={<Icon name="sparkles-outline" size={14} themeColor="tint" />}
              onPress={() => {
                upd({ query: q });
                runSmartSearch(q);
              }}
            />
          ))}
        </ScrollView>
      ) : null}

      {/* Đang gõ câu: nhắc bấm Hiểu câu thay vì hiện "0 quán" */}
      {typingRequest && !parsing ? (
        <View style={styles.understoodHead}>
          <Icon name="sparkles-outline" size={15} themeColor="tint" />
          <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
            Bấm nút <ThemedText type="smallBold" style={{ color: t.tint }}>✦</ThemedText> hoặc Enter để app hiểu câu này
          </ThemedText>
        </View>
      ) : null}

      {/* Kết quả "hiểu câu": 1 hàng gọn; chỉ hiện tiêu chí chưa có chip ở hàng nhanh bên dưới
          (Gần tôi và mục đích đã hiện sẵn ở đó). Mỗi chip có ✕ để bỏ riêng. */}
      {understood ? (
        <View style={[styles.understoodBox, { backgroundColor: t.tintSubtle, borderColor: t.border }]}>
          <View style={styles.understoodChips}>
            <Icon name="sparkles" size={16} themeColor="tint" />
            <ThemedText type="smallBold" style={[styles.flex, { color: t.tint }]}>
              {understoodExtra.length || nearMe || occasion ? 'App đã hiểu' : 'Chưa hiểu được tiêu chí nào'}
            </ThemedText>
            <Pressable accessibilityRole="button" hitSlop={10} onPress={clearAllFilters} style={styles.clearAllLink}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={{ textDecorationLine: 'underline' }}>
                Xóa hết
              </ThemedText>
            </Pressable>
          </View>
          {understoodExtra.length ? (
            <View style={[styles.understoodChips, { flexWrap: 'wrap' }]}>
              {understoodExtra.map((it) => (
                <Chip
                  key={it.key}
                  label={it.label}
                  onRemove={() => upd(it.clear)}
                  style={[styles.smallChip, { borderColor: t.tint }]}
                />
              ))}
            </View>
          ) : null}
          {understood.unsupported.length ? (
            <ThemedText type="caption" themeColor="textSecondary" style={{ paddingHorizontal: Spacing.two + 4 }}>
              Chưa lọc được theo: {understood.unsupported.join(', ')}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      {/* Hàng chip nhanh: Gần tôi + mục đích + tiêu chí khác đang bật (bấm ✕ để bỏ) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeChipsRow}>
        <Chip
          label={
            loc.status === 'loading'
              ? 'Đang định vị…'
              : nearMe
              ? radiusKm != null
                ? `Gần tôi · ${radiusKm} km`
                : 'Gần tôi'
              : 'Gần tôi'
          }
          icon={<Icon name={nearMe ? 'navigate' : 'navigate-outline'} size={14} color={nearMe ? t.tintText : t.tint} />}
          selected={nearMe}
          onPress={toggleNearMe}
        />
        {OCCASIONS.map((o) => (
          <Chip
            key={o.key}
            label={o.label}
            selected={occasion === o.key}
            onPress={() => setOccasion(occasion === o.key ? null : o.key)}
          />
        ))}
        {!understood && maxPrice != null ? <Chip label={priceLabel(maxPrice)} selected onRemove={() => setMaxPrice(null)} /> : null}
        {!understood && openOnly ? <Chip label="Đang mở" selected onRemove={() => setOpenOnly(false)} /> : null}
        {!understood && district ? <Chip label={district} selected onRemove={() => setDistrict(null)} /> : null}
        {(understood ? [] : amenities).map((a) => (
          <Chip key={a} label={amenityLabel(a)} selected onRemove={() => toggleAmenity(a)} />
        ))}
      </ScrollView>
    </>
  );

  const header = (
    <View style={styles.header}>
      {/* Greeting & Title & Compact Random Suggestion Button */}
      <View style={styles.topBar}>
        <View style={styles.topTitleGroup}>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {greeting}
            {/* Chế độ demo: nhãn nhỏ thay cho cả một băng thông báo */}
            {isDemo ? <ThemedText type="smallBold" style={{ color: t.tint }}> · Dữ liệu mẫu</ThemedText> : null}
          </ThemedText>
          <ThemedText type="display" style={styles.mainTitle}>
            Hôm nay ăn gì?
          </ThemedText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chọn ngẫu nhiên một quán ngon"
          onPress={pickRandom}
          style={({ pressed }) => [
            styles.randomBtn,
            {
              backgroundColor: t.tint,
              borderColor: t.tint,
              opacity: pressed ? 0.78 : 1,
            },
            Shadows.soft,
          ]}>
          <Icon name="shuffle" size={18} themeColor="tintText" />
          <ThemedText type="smallBold" style={{ color: t.tintText }}>
            Gợi ý
          </ThemedText>
        </Pressable>
      </View>

      {controls}

      {/* 1 Single Horizontal Category Row (Emoji + Label) */}
      <View style={styles.categoriesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setCategoryId(null)}
            style={({ pressed }) => [
              styles.categoryCard,
              {
                backgroundColor: categoryId === null ? t.tint : t.card,
                borderColor: categoryId === null ? t.tint : t.cardBorder,
                opacity: pressed ? 0.8 : 1,
              },
              Shadows.soft,
            ]}>
            <View style={[styles.categoryEmojiBox, { backgroundColor: categoryId === null ? 'rgba(255,255,255,0.2)' : t.backgroundElement }]}>
              <ThemedText style={{ fontSize: 18 }}>🍽️</ThemedText>
            </View>
            <ThemedText
              type="smallBold"
              style={[
                styles.categoryName,
                { color: categoryId === null ? t.tintText : t.text },
              ]}>
              Tất cả
            </ThemedText>
          </Pressable>

          {categories.map((c) => {
            const isSelected = categoryId === c.id;
            return (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                onPress={() => setCategoryId(isSelected ? null : c.id)}
                style={({ pressed }) => [
                  styles.categoryCard,
                  {
                    backgroundColor: isSelected ? t.tint : t.card,
                    borderColor: isSelected ? t.tint : t.cardBorder,
                    opacity: pressed ? 0.8 : 1,
                  },
                  Shadows.soft,
                ]}>
                <View
                  style={[
                    styles.categoryEmojiBox,
                    { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : t.backgroundElement },
                  ]}>
                  <ThemedText style={{ fontSize: 18 }}>{c.emoji || '🍲'}</ThemedText>
                </View>
                <ThemedText
                  type="smallBold"
                  numberOfLines={1}
                  style={[
                    styles.categoryName,
                    { color: isSelected ? t.tintText : t.text },
                  ]}>
                  {c.name}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Featured Section (Only shown when not searching/filtering) */}
      {featuredPlaces.length > 0 ? (
        <View style={styles.featuredSection}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText type="subtitle" style={styles.sectionHeading}>
              Quán tuyển chọn
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Vuốt ngang để xem
            </ThemedText>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredScroll}>
            {featuredPlaces.map((place) => (
              <FeaturedPlaceCard key={place.id} place={place} distanceKm={placeDistance(place, me)} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Places List Title & Count */}
      <View style={styles.listTitleRow}>
        <ThemedText type="subtitle" style={styles.listHeading}>
          {nearMe && me
            ? 'Gần bạn nhất'
            : isFiltering
            ? 'Kết quả tìm kiếm'
            : featuredPlaces.length
            ? 'Quán khác'
            : 'Khám phá quán ngon'}
        </ThemedText>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.listCount}>
          {listData.length} quán
        </ThemedText>
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        {viewMode === 'map' ? (
          <View style={styles.flex}>
            <View style={styles.mapControls}>
              {controls}
              <ThemedText type="caption" themeColor="textSecondary">
                {pins.length === filtered.length
                  ? `${pins.length} quán trên bản đồ`
                  : `${pins.length}/${filtered.length} quán có vị trí trên bản đồ`}
              </ThemedText>
            </View>
            <View style={[styles.flex, styles.mapWrap, { borderColor: t.cardBorder }]}>
              <PlacesMap pins={pins} me={me} dark={dark} onSelect={setSelectedId} />
              {selectedPlace ? (
                <View style={styles.mapCard}>
                  <PlaceCard place={selectedPlace} distanceKm={selectedPlace.distanceKm} />
                </View>
              ) : null}
            </View>
          </View>
        ) : (
        <FlatList
          data={listData}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PlaceCard place={item} distanceKm={item.distanceKm} reason={understood ? matchReason(item, f) : undefined} />
          )}
          ListHeaderComponent={header}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two + 4 }} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={t.tint} />}
          ListEmptyComponent={
            loading ? undefined : (
              <View style={[styles.emptyBox, { backgroundColor: t.card, borderColor: t.cardBorder }, Shadows.soft]}>
                <Icon name="restaurant-outline" size={40} themeColor="textMuted" />
                <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
                  {error ? 'Không thể tải dữ liệu' : 'Không tìm thấy quán nào'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
                  {error
                    ? error
                    : places.length
                    ? 'Hãy thử bỏ bớt bộ lọc hoặc tìm kiếm từ khóa khác xem sao nhé!'
                    : 'Chưa có quán nào trong hệ thống.'}
                </ThemedText>
                {isFiltering ? (
                  <Button
                    title="Đặt lại tất cả bộ lọc"
                    variant="tintSubtle"
                    onPress={clearAllFilters}
                    style={{ marginTop: Spacing.two }}
                  />
                ) : null}
              </View>
            )
          }
        />
        )}

        {/* Nút nổi chuyển Bản đồ ⇄ Danh sách */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={viewMode === 'list' ? 'Xem trên bản đồ' : 'Xem dạng danh sách'}
          onPress={() => {
            setSelectedId(null);
            setViewMode(viewMode === 'list' ? 'map' : 'list');
          }}
          style={({ pressed }) => [
            styles.viewToggle,
            { backgroundColor: t.text, bottom: selectedPlace ? 168 : Spacing.four, opacity: pressed ? 0.85 : 1 },
            Shadows.strong,
          ]}>
          <Icon name={viewMode === 'list' ? 'map-outline' : 'list-outline'} size={18} color={t.background} />
          <ThemedText type="smallBold" style={{ color: t.background }}>
            {viewMode === 'list' ? 'Bản đồ' : 'Danh sách'}
          </ThemedText>
        </Pressable>

        {/* Filter Modal Sheet */}
        <Modal
          visible={filterModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setFilterModalVisible(false)}>
          <View style={[styles.modalBackdrop, { backgroundColor: t.overlay }]}>
            <Pressable style={styles.modalDismiss} onPress={() => setFilterModalVisible(false)} />
            <View
              style={[
                styles.modalSheet,
                {
                  backgroundColor: t.card,
                  borderColor: t.cardBorder,
                },
                Shadows.strong,
              ]}>
              {/* Drag bar */}
              <View style={styles.modalHandleWrap}>
                <View style={[styles.modalHandle, { backgroundColor: t.border }]} />
              </View>

              {/* Sheet Header */}
              <View style={[styles.sheetHeader, { borderBottomColor: t.border }]}>
                <View>
                  <ThemedText type="subtitle">Bộ lọc quán</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    Tùy chỉnh tiêu chí để tìm món hợp gu
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => setFilterModalVisible(false)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Đóng bộ lọc"
                  style={[styles.closeIconBtn, { backgroundColor: t.backgroundElement }]}>
                  <ThemedText type="smallBold" style={{ color: t.textSecondary }}>
                    ✕
                  </ThemedText>
                </Pressable>
              </View>

              {/* Scrollable Filters Content */}
              <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                {/* Khoảng cách: chọn bán kính sẽ bật Gần tôi và hỏi quyền vị trí */}
                <View style={styles.filterBlock}>
                  <ThemedText type="smallBold" themeColor="textSecondary" style={styles.filterLabel}>
                    KHOẢNG CÁCH TỪ BẠN
                  </ThemedText>
                  <View style={styles.filterChipGroup}>
                    <Chip label="Mọi khoảng cách" selected={radiusKm == null} onPress={() => setRadius(null)} />
                    {RADIUS_OPTIONS.map((km) => (
                      <Chip
                        key={km}
                        label={`Trong ${km} km`}
                        selected={radiusKm === km}
                        onPress={() => setRadius(radiusKm === km ? null : km)}
                      />
                    ))}
                  </View>
                  {loc.status === 'denied' || loc.status === 'error' ? (
                    <ThemedText type="caption" style={{ color: t.danger }}>
                      Chưa có quyền vị trí nên chưa lọc theo khoảng cách được.
                    </ThemedText>
                  ) : null}
                </View>

                {/* Mục đích đi ăn */}
                <View style={styles.filterBlock}>
                  <ThemedText type="smallBold" themeColor="textSecondary" style={styles.filterLabel}>
                    ĐI ĂN ĐỂ
                  </ThemedText>
                  <View style={styles.filterChipGroup}>
                    <Chip label="Bất kỳ" selected={occasion == null} onPress={() => setOccasion(null)} />
                    {OCCASIONS.map((o) => (
                      <Chip
                        key={o.key}
                        label={o.label}
                        selected={occasion === o.key}
                        onPress={() => setOccasion(occasion === o.key ? null : o.key)}
                      />
                    ))}
                  </View>
                </View>

                {/* Tiện ích: quán phải có đủ các tiện ích được chọn */}
                <View style={styles.filterBlock}>
                  <ThemedText type="smallBold" themeColor="textSecondary" style={styles.filterLabel}>
                    TIỆN ÍCH CẦN CÓ
                  </ThemedText>
                  <View style={styles.filterChipGroup}>
                    {AMENITIES.map((a) => {
                      const on = amenities.includes(a.key);
                      return (
                        <Chip
                          key={a.key}
                          label={a.label}
                          selected={on}
                          icon={<Icon name={a.icon} size={14} themeColor={on ? 'tintText' : 'textSecondary'} />}
                          onPress={() => toggleAmenity(a.key)}
                        />
                      );
                    })}
                  </View>
                </View>

                {/* 1. Status Filter */}
                <View style={styles.filterBlock}>
                  <ThemedText type="smallBold" themeColor="textSecondary" style={styles.filterLabel}>
                    TÌNH TRẠNG QUÁN
                  </ThemedText>
                  <View style={styles.filterChipGroup}>
                    <Chip
                      label="Đang mở"
                      selected={openOnly}
                      onPress={() => setOpenOnly(!openOnly)}
                    />
                  </View>
                </View>

                {/* 2. Price Filter */}
                <View style={styles.filterBlock}>
                  <ThemedText type="smallBold" themeColor="textSecondary" style={styles.filterLabel}>
                    MỨC GIÁ
                  </ThemedText>
                  <View style={styles.filterChipGroup}>
                    <Chip
                      label="Tất cả giá"
                      selected={maxPrice == null}
                      onPress={() => setMaxPrice(null)}
                    />
                    {PRICE_OPTIONS.map((max) => (
                      <Chip
                        key={max}
                        label={priceLabel(max)}
                        selected={maxPrice === max}
                        onPress={() => setMaxPrice(maxPrice === max ? null : max)}
                      />
                    ))}
                  </View>
                </View>

                {/* 3. District Filter */}
                <View style={styles.filterBlock}>
                  <ThemedText type="smallBold" themeColor="textSecondary" style={styles.filterLabel}>
                    KHU VỰC (QUẬN / HUYỆN)
                  </ThemedText>
                  <View style={styles.filterChipGroup}>
                    <Chip
                      label="Tất cả khu vực"
                      selected={district == null}
                      onPress={() => setDistrict(null)}
                    />
                    {districts.map(([d, n]) => (
                      <Chip
                        key={d}
                        label={`${d} (${n})`}
                        selected={district === d}
                        onPress={() => setDistrict(district === d ? null : d)}
                      />
                    ))}
                  </View>
                </View>
              </ScrollView>

              {/* Sheet Footer Actions */}
              <View style={[styles.sheetFooter, { borderTopColor: t.border }]}>
                {activeModalFiltersCount > 0 ? (
                  <Button title="Xóa lọc" variant="outline" onPress={clearModalFilters} style={styles.sheetResetBtn} />
                ) : null}
                <Button
                  title={`Xem ${filtered.length} quán`}
                  variant="primary"
                  onPress={() => setFilterModalVisible(false)}
                  style={styles.sheetApplyBtn}
                />
              </View>
            </View>
          </View>
        </Modal>

        <RandomPicker
          visible={randomOpen}
          pool={filtered.length ? filtered : applyFilters(places, EMPTY_FILTERS, me)}
          criteria={filtered.length ? describeFilters(f, categories) : []}
          onClose={() => setRandomOpen(false)}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: {
    padding: Spacing.three,
    paddingTop: Spacing.two + WebTopInset,
    paddingBottom: Spacing.six * 2 + 48, // chừa chỗ cho nút Bản đồ nổi
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  demoBanner: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.one,
  },
  topTitleGroup: {
    flex: 1,
    gap: 2,
  },
  mainTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  randomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.full,
    borderWidth: 1,
    minHeight: 44,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radii.xl,
    paddingHorizontal: Spacing.three,
    minHeight: 48,
  },
  understandBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  mapControls: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two + WebTopInset,
    paddingBottom: Spacing.two,
    gap: Spacing.two + 4,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  mapWrap: { overflow: 'hidden', borderTopWidth: StyleSheet.hairlineWidth },
  mapCard: { position: 'absolute', left: Spacing.three, right: Spacing.three, bottom: Spacing.three, maxWidth: MaxContentWidth, alignSelf: 'center' },
  viewToggle: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three + 4,
    minHeight: 46,
    borderRadius: Radii.full,
  },
  understoodChips: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 2, paddingHorizontal: Spacing.two + 4 },
  understoodBox: { borderWidth: 1, borderRadius: Radii.md, paddingVertical: Spacing.two, gap: 4 },
  smallChip: { minHeight: 36, paddingVertical: 4 },
  clearAllLink: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 4 },
  understoodHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    ...Platform.select({ web: { outlineWidth: 0 } }),
    minWidth: 0,
    flex: 1,
    fontSize: 15,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  clearSearchBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  filterTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: Radii.xl,
    borderWidth: 1,
    position: 'relative',
  },
  filterBadgeCount: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  activeChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 2,
  },
  resetTextBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    minHeight: 44,
    justifyContent: 'center',
  },

  /* Categories Bar */
  categoriesSection: {
    marginTop: 2,
  },
  categoryScroll: {
    gap: Spacing.two,
    paddingVertical: 4,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 4,
    paddingLeft: 6,
    paddingRight: 14,
    borderWidth: 1,
    gap: 6,
    minWidth: 72,
    borderRadius: Radii.full,
  },
  categoryEmojiBox: {
    width: 32,
    height: 32,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },

  /* Featured Carousel */
  featuredSection: {
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  sectionHeaderRow: {
    flexWrap: 'wrap',
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeading: {
    fontSize: 17,
    lineHeight: 22,
  },
  featuredScroll: {
    gap: Spacing.three,
    paddingVertical: 4,
  },

  /* Place List Heading */
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  listHeading: {
    fontSize: 18,
    lineHeight: 24,
  },
  listCount: {
    fontSize: 13,
  },

  /* Empty state */
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
    borderRadius: Radii.xl,
    borderWidth: 1,
    marginTop: Spacing.four,
    gap: Spacing.two,
  },

  /* Filter Modal Sheet */
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalDismiss: {
    flex: 1,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '85%',
  },
  modalHandleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  filterBlock: {
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  filterLabel: {
    fontSize: 12,
    letterSpacing: 0.8,
  },
  filterChipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sheetResetBtn: {
    minWidth: 100,
  },
  sheetApplyBtn: {
    flex: 1,
  },
});
