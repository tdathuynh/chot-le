import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Field, HomeButtonIfNoBack } from '@/components/ui';
import { MaxContentWidth, Radii, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createPoll, fetchPlaces } from '@/lib/api';
import { setMyName, useMyName } from '@/lib/device';
import { useFavorites } from '@/lib/favorites';
import { formatPriceRange, normalize } from '@/lib/format';
import type { PlaceWithRelations } from '@/lib/types';

const MAX = 8;
const MIN = 2;

export default function NewVoteScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ ids?: string }>();
  const favIds = useFavorites();
  const myName = useMyName();

  const [initialIds] = useState<string[]>(() =>
    String(params.ids ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const [places, setPlaces] = useState<PlaceWithRelations[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<string[]>(initialIds.slice(0, MAX));
  const [title, setTitle] = useState('');
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const name = nameDraft ?? myName;

  useEffect(() => {
    let alive = true;
    fetchPlaces()
      .then((p) => {
        if (!alive) return;
        setPlaces(p.filter((x) => x.is_published));
        setStatus('ready');
      })
      .catch(() => {
        if (alive) setStatus('error');
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  // Thứ tự cố định: yêu thích trước, rồi quán được chọn sẵn, rồi các quán còn lại.
  const ordered = useMemo(() => {
    const rank = (p: PlaceWithRelations) => {
      const f = favIds.indexOf(p.id);
      if (f >= 0) return f;
      if (initialIds.includes(p.id)) return 1000;
      return 2000;
    };
    return places
      .map((p, i) => ({ p, i }))
      .sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i)
      .map((x) => x.p);
  }, [places, favIds, initialIds]);

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return ordered;
    return ordered.filter((p) => normalize(`${p.name} ${p.district} ${p.address}`).includes(q));
  }, [ordered, query]);

  // Chỉ tính các quán còn tồn tại (link cũ có thể chứa quán đã ẩn).
  const validSelected = useMemo(
    () => (status === 'ready' ? selected.filter((id) => places.some((p) => p.id === id)) : selected),
    [selected, places, status]
  );
  const count = validSelected.length;
  const full = count >= MAX;

  function toggle(id: string) {
    setSubmitError(null);
    // Đủ 8 quán: dòng nhắc ở thanh dưới đã báo (không dùng alert: webview Zalo/Messenger chặn).
    if (!validSelected.includes(id) && full) return;
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      return [...cur.filter((x) => places.some((p) => p.id === x)), id].slice(-MAX);
    });
  }

  async function submit() {
    if (submitting) return;
    const n = name.trim();
    if (!n || count < MIN) return; // nút đã bị khoá, dòng nhắc ở thanh dưới giải thích lý do
    setSubmitError(null);
    setSubmitting(true);
    try {
      setMyName(n);
      const id = await createPoll(title.trim() || 'Tối nay ăn gì?', n, validSelected);
      router.replace({ pathname: '/vote/[id]', params: { id, share: '1' } });
    } catch (e) {
      setSubmitting(false);
      setSubmitError(e instanceof Error && e.message ? e.message : 'Hãy thử lại sau.');
    }
  }

  const canSubmit = count >= MIN && name.trim().length > 0;
  const hint = submitError
    ? `Chưa tạo được bình chọn. ${submitError}`
    : count < MIN
      ? `Chọn thêm ${MIN - count} quán nữa`
      : !name.trim()
        ? 'Nhập tên của bạn ở trên để gửi'
        : full
          ? 'Đã đủ 8 quán, bỏ bớt nếu muốn đổi'
          : 'Sẵn sàng gửi cho hội bạn';
  const hintColor = submitError ? 'danger' : count < MIN || !name.trim() ? 'textSecondary' : 'success';

  return (
    <ThemedView style={styles.flex}>
      <HomeButtonIfNoBack />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: t.tintSubtle, borderColor: t.cardBorder }]}>
          <View style={[styles.heroIcon, { backgroundColor: t.tint }]}>
            <Icon name="users" size={22} color={t.tintText} />
          </View>
          <View style={styles.flexShrink}>
            <ThemedText type="subtitle">Hết cãi nhau ăn gì!</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Chọn vài quán, gửi link vào nhóm chat. Bạn bè bấm là bình chọn được, không cần cài app.
            </ThemedText>
          </View>
        </View>

        <View style={styles.fields}>
          <Field
            label="Tên bình chọn"
            placeholder="Tối nay ăn gì?"
            value={title}
            onChangeText={setTitle}
            maxLength={60}
            returnKeyType="next"
            icon={<Icon name="vote" size={18} themeColor="textMuted" />}
          />
          <Field
            label="Tên của bạn"
            placeholder="Vd: Minh"
            value={name}
            onChangeText={setNameDraft}
            maxLength={40}
            autoComplete="name"
            hint="Để bạn bè biết ai đang rủ đi ăn."
            icon={<Icon name="user" size={18} themeColor="textMuted" />}
          />
        </View>

        <View style={styles.listHeader}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            CHỌN 2–8 QUÁN
          </ThemedText>
          <View style={[styles.counter, { backgroundColor: count >= MIN ? t.tint : t.backgroundElement }]}>
            <ThemedText type="captionBold" style={{ color: count >= MIN ? t.tintText : t.textSecondary }}>
              Đã chọn {count}/{MAX}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.search, { backgroundColor: t.card, borderColor: t.border }]}>
          <Icon name="search" size={18} themeColor="textMuted" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm quán theo tên, quận…"
            placeholderTextColor={t.textMuted}
            style={[styles.searchInput, { color: t.text }]}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query ? (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Xoá tìm kiếm"
              style={styles.clearBtn}>
              <Icon name="x" size={16} themeColor="textSecondary" />
            </Pressable>
          ) : null}
        </View>

        {status === 'loading' ? (
          <View style={styles.state}>
            <ActivityIndicator color={t.tint} />
            <ThemedText type="small" themeColor="textSecondary">
              Đang tải danh sách quán…
            </ThemedText>
          </View>
        ) : status === 'error' ? (
          <View style={styles.state}>
            <Icon name="circle-x" size={28} themeColor="danger" />
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              Không tải được danh sách quán. Kiểm tra mạng rồi thử lại.
            </ThemedText>
            <Button
              title="Thử lại"
              variant="outline"
              size="sm"
              icon={<Icon name="rotate-ccw" size={16} themeColor="text" />}
              onPress={() => {
                setStatus('loading');
                setReloadKey((k) => k + 1);
              }}
            />
          </View>
        ) : visible.length === 0 ? (
          <View style={styles.state}>
            <Icon name="search" size={28} themeColor="textMuted" />
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              {places.length ? `Không thấy quán nào khớp “${query.trim()}”.` : 'Chưa có quán nào.'}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.list}>
            {visible.map((p) => (
              <PlaceRow
                key={p.id}
                place={p}
                checked={validSelected.includes(p.id)}
                favorite={favIds.includes(p.id)}
                dimmed={full && !validSelected.includes(p.id)}
                onPress={() => toggle(p.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Thanh dưới cố định */}
      <View
        style={[
          styles.footer,
          { backgroundColor: t.card, borderTopColor: t.border, paddingBottom: Spacing.three + insets.bottom },
        ]}>
        <View style={styles.footerInner}>
          <View style={styles.footerText}>
            <ThemedText type="defaultBold" numberOfLines={1}>
              {count}/{MAX} quán
            </ThemedText>
            <ThemedText type="caption" themeColor={hintColor} numberOfLines={2} accessibilityLiveRegion="polite">
              {hint}
            </ThemedText>
          </View>
          <Button
            title="Tạo & gửi link"
            size="lg"
            icon={<Icon name="share" size={18} color={t.tintText} />}
            onPress={submit}
            loading={submitting}
            disabled={!canSubmit || status !== 'ready'}
            style={styles.footerBtn}
          />
        </View>
      </View>
    </ThemedView>
  );
}

function PlaceRow({
  place,
  checked,
  favorite,
  dimmed,
  onPress,
}: {
  place: PlaceWithRelations;
  checked: boolean;
  favorite: boolean;
  dimmed: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const price = formatPriceRange(place);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={place.name}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: checked ? t.tintSubtle : t.card,
          borderColor: checked ? t.tint : t.cardBorder,
          opacity: dimmed ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}>
      {place.cover_image_url ? (
        <Image source={{ uri: place.cover_image_url }} style={styles.thumb} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: t.backgroundElement }]}>
          <Icon name="utensils-crossed" size={20} themeColor="textMuted" strokeWidth={1.5} />
        </View>
      )}
      <View style={styles.rowBody}>
        <View style={styles.rowTitle}>
          {favorite ? <Icon name="heart" size={13} themeColor="tint" filled /> : null}
          <ThemedText type="defaultBold" numberOfLines={1} style={styles.flexShrink}>
            {place.name}
          </ThemedText>
        </View>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {place.district}
          {price ? (
            <ThemedText type="captionBold" style={{ color: t.tint }}>
              {'  ·  '}
              {price}
            </ThemedText>
          ) : null}
        </ThemedText>
      </View>
      <Icon name={checked ? 'square-check' : 'square'} size={24} color={checked ? t.tint : t.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  center: { textAlign: 'center' },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fields: { gap: Spacing.three },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  sectionTitle: { letterSpacing: 0.8 },
  counter: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: Radii.md,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    minHeight: 44,
    ...Platform.select({ web: { outlineWidth: 0 } }),
  },
  clearBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  state: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  list: { gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    paddingRight: Spacing.three,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    minHeight: 64,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: Radii.sm,
  },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    ...Shadows.medium,
  },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  footerText: { flex: 1, minWidth: 0 },
  footerBtn: { minWidth: 168 },
});
