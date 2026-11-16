import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlaceCard } from '@/components/place-card';
import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge, Button, Center, Chip, Field, Section } from '@/components/ui';
import { MaxContentWidth, Radii, Shadows, Spacing, WebTopInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  deleteSuggestion,
  fetchPlaceStats,
  fetchPlaces,
  fetchSuggestions,
  fetchVisitStats,
  isDemo,
  setPublished,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { confirmAsync, notify } from '@/lib/confirm';
import { normalize } from '@/lib/format';
import type { PlaceStats, PlaceSuggestion, PlaceWithRelations, VisitStat } from '@/lib/types';

type StatDays = 7 | 30;
const SUGGESTIONS_PREVIEW = 3;

function errMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  return (e as { message?: string } | null)?.message ?? 'Đã có lỗi xảy ra.';
}

function statTotal(s: PlaceStats) {
  return s.views + s.directions + s.calls + s.shares;
}

function statLine(s: PlaceStats) {
  const parts: string[] = [];
  if (s.views) parts.push(`${s.views} xem`);
  if (s.directions) parts.push(`${s.directions} chỉ đường`);
  if (s.calls) parts.push(`${s.calls} gọi`);
  if (s.shares) parts.push(`${s.shares} chia sẻ`);
  return parts.join(' · ');
}

/** "vừa xong", "5 phút trước", "3 ngày trước", hoặc dd/mm/yyyy nếu quá 30 ngày. */
function relativeTime(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (Number.isNaN(diff)) return '';
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'vừa xong';
  if (min < 60) return `${min} phút trước`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} giờ trước`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days} ngày trước`;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

const SOURCE_LABELS: Record<string, string> = {
  tiktok: 'TikTok',
  zalo: 'Zalo',
  facebook: 'Facebook / Messenger',
  instagram: 'Instagram',
  youtube: 'YouTube',
  threads: 'Threads',
  x: 'X (Twitter)',
  google: 'Google',
  'tim-kiem': 'Công cụ tìm kiếm khác',
  'truc-tiep': 'Vào thẳng / không rõ',
  app: 'App trên điện thoại',
  khac: 'Khác',
};
const sourceLabel = (s: string) => SOURCE_LABELS[s] ?? s;

function StatTile({ icon, label, value }: { icon: IconName; label: string; value: number }) {
  const t = useTheme();
  return (
    <View style={[styles.statTile, { backgroundColor: t.backgroundElement }]}>
      <Icon name={icon} size={16} themeColor="tint" />
      <ThemedText type="subtitle" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </ThemedText>
    </View>
  );
}

function SuggestionItem({
  item,
  deleting,
  onCreate,
  onDelete,
}: {
  item: PlaceSuggestion;
  deleting: boolean;
  onCreate: () => void;
  onDelete: () => void;
}) {
  const t = useTheme();
  const openLink = () => {
    if (!item.maps_url) return;
    Linking.openURL(item.maps_url).catch(() => notify('Không mở được link', item.maps_url ?? undefined));
  };
  return (
    <View style={[styles.suggestionItem, { backgroundColor: t.card, borderColor: t.cardBorder }, Shadows.soft]}>
      <View style={styles.suggestionTop}>
        <View style={[styles.suggestionIcon, { backgroundColor: t.tintSubtle }]}>
          <Icon name="lightbulb" size={18} themeColor="tint" />
        </View>
        <View style={styles.flexShrink}>
          <ThemedText type="defaultBold" numberOfLines={2}>
            {item.name}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {relativeTime(item.created_at)}
          </ThemedText>
        </View>
      </View>
      {item.note ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={4}>
          {item.note}
        </ThemedText>
      ) : null}
      {item.maps_url ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Mở link Google Maps"
          onPress={openLink}
          style={({ pressed }) => [
            styles.suggestionLink,
            { backgroundColor: t.backgroundElement, opacity: pressed ? 0.7 : 1 },
          ]}>
          <Icon name="map-pin" size={16} themeColor="tint" />
          <ThemedText
            type="small"
            numberOfLines={1}
            ellipsizeMode="middle"
            style={[styles.flexShrink, { color: t.tint }]}>
            {item.maps_url}
          </ThemedText>
        </Pressable>
      ) : null}
      <View style={styles.suggestionActions}>
        <Button
          title="Tạo quán"
          icon={<Icon name="plus" size={17} themeColor="tint" />}
          variant="tintSubtle"
          size="sm"
          style={styles.flex}
          onPress={onCreate}
          disabled={deleting}
        />
        <Button
          title="Xoá"
          icon={<Icon name="trash-2" size={17} themeColor="danger" />}
          variant="secondary"
          size="sm"
          style={styles.flex}
          onPress={onDelete}
          loading={deleting}
        />
      </View>
    </View>
  );
}

function LoginForm() {
  const t = useTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const err = await signIn(email, password);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <View style={styles.loginWrapper}>
      <View
        style={[
          styles.loginCard,
          {
            backgroundColor: t.card,
            borderColor: t.cardBorder,
          },
          Shadows.medium,
        ]}>
        <View style={styles.loginHeader}>
          <View style={[styles.loginIconCircle, { backgroundColor: t.tintSubtle }]}>
            <Icon name="lock" size={30} themeColor="tint" />
          </View>
          <ThemedText type="title" style={{ textAlign: 'center' }}>
            Đăng nhập quản trị
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
            {isDemo
              ? 'Chế độ demo: nhập email và mật khẩu bất kỳ để thử.'
              : 'Dành cho quản trị viên thêm mới và cập nhật quán ăn.'}
          </ThemedText>
        </View>

        <Field
          label="Email quản trị"
          value={email}
          onChangeText={setEmail}
          placeholder="admin@chotle.vn"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Field
          label="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          autoComplete="password"
          onSubmitEditing={submit}
        />

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: t.dangerSubtle }]}>
            <ThemedText type="smallBold" style={{ color: t.danger }}>
              {error}
            </ThemedText>
          </View>
        ) : null}

        <Button
          title="Đăng nhập hệ thống"
          variant="primary"
          onPress={submit}
          loading={busy}
          disabled={!email || !password}
          style={{ marginTop: Spacing.two }}
        />
      </View>
    </View>
  );
}

export default function AdminScreen() {
  const t = useTheme();
  const { session, isAdmin, loading, signOut } = useAuth();
  const [places, setPlaces] = useState<PlaceWithRelations[]>([]);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [statDays, setStatDays] = useState<StatDays>(7);
  const [stats, setStats] = useState<PlaceStats[]>([]);
  const [visits, setVisits] = useState<VisitStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const statsReq = useRef(0);
  const statDaysRef = useRef<StatDays>(7);

  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadStats = useCallback((days: StatDays) => {
    const req = ++statsReq.current;
    setStatsLoading(true);
    Promise.all([fetchPlaceStats(days), fetchVisitStats(days)]).then(
      ([data, v]) => {
        if (req !== statsReq.current) return;
        setStats(data);
        setVisits(v);
        setStatsError(null);
        setStatsLoading(false);
      },
      (e: unknown) => {
        if (req !== statsReq.current) return;
        setStatsError(errMessage(e));
        setStatsLoading(false);
      }
    );
  }, []);

  const loadSuggestions = useCallback(() => {
    fetchSuggestions().then(
      (data) => {
        setSuggestions(data);
        setSuggestionsError(null);
        setSuggestionsLoaded(true);
      },
      (e: unknown) => {
        setSuggestionsError(errMessage(e));
        setSuggestionsLoaded(true);
      }
    );
  }, []);

  const changeStatDays = (d: StatDays) => {
    if (d === statDaysRef.current) return;
    statDaysRef.current = d;
    setStatDays(d);
    loadStats(d);
  };

  const visitTotal = visits.find((v) => v.source === null) ?? { visits: 0, visitors: 0, new_visitors: 0 };
  const visitSources = useMemo(
    () => visits.filter((v): v is VisitStat & { source: string } => v.source !== null).sort((a, b) => b.visits - a.visits),
    [visits]
  );

  const statsByPlace = useMemo(() => new Map(stats.map((s) => [s.place_id, s])), [stats]);
  const statSum = useMemo(
    () =>
      stats.reduce(
        (a, s) => ({
          views: a.views + s.views,
          directions: a.directions + s.directions,
          calls: a.calls + s.calls,
          shares: a.shares + s.shares,
        }),
        { views: 0, directions: 0, calls: 0, shares: 0 }
      ),
    [stats]
  );

  const removeSuggestion = async (s: PlaceSuggestion) => {
    if (deletingId !== null) return;
    const ok = await confirmAsync('Xoá gợi ý?', `Xoá gợi ý “${s.name}” khỏi danh sách?`, 'Xoá');
    if (!ok) return;
    setDeletingId(s.id);
    deleteSuggestion(s.id).then(
      () => {
        setSuggestions((list) => list.filter((x) => x.id !== s.id));
        setDeletingId(null);
        loadSuggestions();
      },
      (e: unknown) => {
        setDeletingId(null);
        notify('Không xoá được', errMessage(e));
      }
    );
  };

  const createFromSuggestion = (s: PlaceSuggestion) => {
    router.push({ pathname: '/edit-place/[id]', params: { id: 'new', maps: s.maps_url ?? '', name: s.name } });
  };

  const visibleSuggestions = showAllSuggestions ? suggestions : suggestions.slice(0, SUGGESTIONS_PREVIEW);

  const load = useCallback(async () => {
    setRefreshing(true);
    loadStats(statDaysRef.current);
    loadSuggestions();
    try {
      setPlaces(await fetchPlaces());
    } catch (e) {
      notify('Lỗi tải dữ liệu', (e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, [loadStats, loadSuggestions]);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) load();
    }, [isAdmin, load])
  );

  const filtered = useMemo(() => {
    const q = normalize(query);
    return q ? places.filter((p) => normalize(`${p.name} ${p.address} ${p.district}`).includes(q)) : places;
  }, [places, query]);

  const publishedCount = places.filter((p) => p.is_published).length;
  const hiddenCount = places.length - publishedCount;

  const togglePublished = async (p: PlaceWithRelations) => {
    try {
      await setPublished(p.id, !p.is_published);
      setPlaces((list) => list.map((x) => (x.id === p.id ? { ...x, is_published: !p.is_published } : x)));
    } catch (e) {
      notify('Không cập nhật được', (e as Error).message);
    }
  };

  let content;
  if (loading) {
    content = (
      <Center>
        <ThemedText themeColor="textSecondary">Đang tải dữ liệu quản trị…</ThemedText>
      </Center>
    );
  } else if (!session) {
    content = <LoginForm />;
  } else if (!isAdmin) {
    content = (
      <Center>
        <View
          style={[
            styles.notAdminCard,
            {
              backgroundColor: t.card,
              borderColor: t.cardBorder,
            },
            Shadows.soft,
          ]}>
          <Icon name="ban" size={44} themeColor="textSecondary" strokeWidth={1.5} />
          <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
            Không có quyền quản trị
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
            Tài khoản <ThemedText type="defaultBold">{session.user.email}</ThemedText> chưa được phân quyền quản trị viên.
          </ThemedText>
          <Button title="Đăng xuất tài khoản" variant="secondary" onPress={signOut} style={{ marginTop: Spacing.two }} />
        </View>
      </Center>
    );
  } else {
    content = (
      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        onRefresh={load}
        refreshing={refreshing}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.three }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Admin Profile & Stats Card */}
            <View
              style={[
                styles.adminProfileCard,
                {
                  backgroundColor: t.card,
                  borderColor: t.cardBorder,
                },
                Shadows.soft,
              ]}>
              <View style={styles.adminTopRow}>
                <View style={styles.adminIdentity}>
                  <View style={[styles.adminAvatar, { backgroundColor: t.tintSubtle }]}>
                    <Icon name="user" size={20} themeColor="tint" />
                  </View>
                  <View style={styles.flexShrinkText}>
                    <ThemedText type="smallBold">Quản trị viên</ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                      {session.user.email}
                    </ThemedText>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Đăng xuất"
                  onPress={signOut}
                  hitSlop={8}
                  style={[styles.signOutBtn, { backgroundColor: t.backgroundElement }]}>
                  <ThemedText type="captionBold" style={{ color: t.danger }}>
                    Đăng xuất
                  </ThemedText>
                </Pressable>
              </View>

              {/* Stats row */}
              <View style={styles.statsRow}>
                <View style={[styles.statItem, { backgroundColor: t.backgroundElement }]}>
                  <ThemedText type="caption" themeColor="textSecondary">
                    Tổng số quán
                  </ThemedText>
                  <ThemedText type="subtitle" style={{ color: t.tint }}>
                    {places.length}
                  </ThemedText>
                </View>
                <View style={[styles.statItem, { backgroundColor: t.backgroundElement }]}>
                  <ThemedText type="caption" themeColor="textSecondary">
                    Đang hiển thị
                  </ThemedText>
                  <ThemedText type="subtitle" style={{ color: t.success }}>
                    {publishedCount}
                  </ThemedText>
                </View>
                <View style={[styles.statItem, { backgroundColor: t.backgroundElement }]}>
                  <ThemedText type="caption" themeColor="textSecondary">
                    Đang ẩn
                  </ThemedText>
                  <ThemedText type="subtitle" style={{ color: t.textSecondary }}>
                    {hiddenCount}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Add New Place Action */}
            <Button
              title="Thêm quán ăn mới"
              icon={<Icon name="plus" size={20} themeColor="tintText" />}
              variant="primary"
              size="lg"
              onPress={() => router.push({ pathname: '/edit-place/[id]', params: { id: 'new' } })}
            />

            {/* Gợi ý từ người dùng */}
            <Section
              title="Gợi ý từ người dùng"
              action={suggestions.length ? <Badge label={String(suggestions.length)} variant="tint" /> : null}>
              {!suggestionsLoaded ? (
                <View style={[styles.emptyBox, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
                  <ActivityIndicator color={t.tint} />
                </View>
              ) : suggestionsError ? (
                <View style={[styles.emptyBox, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
                  <ThemedText type="small" style={{ color: t.danger, textAlign: 'center' }}>
                    Không tải được gợi ý: {suggestionsError}
                  </ThemedText>
                  <Button title="Thử lại" variant="secondary" size="sm" onPress={loadSuggestions} />
                </View>
              ) : suggestions.length === 0 ? (
                <View style={[styles.emptyBox, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
                  <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
                    Chưa có gợi ý nào. Quán người dùng gửi qua mục “Gợi ý quán ngon” sẽ hiện ở đây.
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.suggestionList}>
                  {visibleSuggestions.map((s) => (
                    <SuggestionItem
                      key={s.id}
                      item={s}
                      deleting={deletingId === s.id}
                      onCreate={() => createFromSuggestion(s)}
                      onDelete={() => removeSuggestion(s)}
                    />
                  ))}
                  {suggestions.length > SUGGESTIONS_PREVIEW ? (
                    <Button
                      title={showAllSuggestions ? 'Thu gọn' : `Xem tất cả (${suggestions.length})`}
                      icon={
                        <Icon name={showAllSuggestions ? 'chevron-up' : 'chevron-down'} size={17} themeColor="tint" />
                      }
                      variant="ghost"
                      size="sm"
                      onPress={() => setShowAllSuggestions((v) => !v)}
                    />
                  ) : null}
                </View>
              )}
            </Section>

            {/* Thống kê lượt quan tâm */}
            <Section title="Thống kê">
              <View style={[styles.statsCard, { backgroundColor: t.card, borderColor: t.cardBorder }, Shadows.soft]}>
                <View style={styles.statsHeader}>
                  <View style={styles.statsTitle}>
                    <Icon name="chart-column" size={18} themeColor="tint" />
                    <ThemedText type="smallBold" numberOfLines={1} style={styles.flexShrinkText}>
                      {statDays} ngày gần nhất
                    </ThemedText>
                    {statsLoading ? <ActivityIndicator size="small" color={t.tint} /> : null}
                  </View>
                  <View style={styles.daysToggle}>
                    <Chip label="7 ngày" selected={statDays === 7} onPress={() => changeStatDays(7)} />
                    <Chip label="30 ngày" selected={statDays === 30} onPress={() => changeStatDays(30)} />
                  </View>
                </View>
                {statsError ? (
                  <View style={styles.statsErrorRow}>
                    <ThemedText type="small" style={[styles.flexShrink, { color: t.danger }]}>
                      Không tải được thống kê: {statsError}
                    </ThemedText>
                    <Button title="Thử lại" variant="secondary" size="sm" onPress={() => loadStats(statDays)} />
                  </View>
                ) : (
                  <View style={[styles.statsBody, statsLoading && stats.length === 0 ? styles.dimmed : null]}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      LƯỢT VÀO APP
                    </ThemedText>
                    <View style={styles.statTiles}>
                      <StatTile icon="trending-up" label="Lượt vào" value={visitTotal.visits} />
                      <StatTile icon="users" label="Người dùng" value={visitTotal.visitors} />
                      <StatTile icon="user" label="Người mới" value={visitTotal.new_visitors} />
                    </View>
                    {visitSources.length ? (
                      <View style={styles.sourceList}>
                        {visitSources.map((s) => (
                          <View key={s.source} style={[styles.sourceRow, { borderBottomColor: t.border }]}>
                            <ThemedText type="small" numberOfLines={1} style={styles.flexShrinkText}>
                              {sourceLabel(s.source)}
                            </ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                              {s.visits} lượt · {s.visitors} người
                            </ThemedText>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <ThemedText type="small" themeColor="textSecondary">
                        Chưa có lượt vào nào trong {statDays} ngày.
                      </ThemedText>
                    )}
                    <ThemedText type="caption" themeColor="textSecondary">
                      Link đặt ở bio/bài đăng nên thêm ?utm_source=tiktok (hoặc zalo, facebook…) để đếm đúng nguồn.
                    </ThemedText>

                    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.statsSubhead}>
                      QUAN TÂM TỚI QUÁN
                    </ThemedText>
                    <View style={styles.statTiles}>
                      <StatTile icon="eye" label="Lượt xem" value={statSum.views} />
                      <StatTile icon="navigation" label="Chỉ đường" value={statSum.directions} />
                      <StatTile icon="phone" label="Gọi" value={statSum.calls} />
                      <StatTile icon="share" label="Chia sẻ" value={statSum.shares} />
                    </View>
                  </View>
                )}
                <ThemedText type="caption" themeColor="textSecondary">
                  Số liệu quán dùng để báo cáo cho chủ quán (gói quán đối tác).
                </ThemedText>
              </View>
            </Section>

            {/* Search Manage Places */}
            <View
              style={[
                styles.searchWrap,
                {
                  backgroundColor: t.card,
                  borderColor: t.cardBorder,
                },
                Shadows.soft,
              ]}>
              <View style={{ marginRight: 8 }}>
                <Icon name="search" size={18} themeColor="textSecondary" />
              </View>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Tìm kiếm quán trong danh sách quản lý…"
                placeholderTextColor={t.textMuted}
                style={[styles.searchInput, { color: t.text }]}
              />
              {query ? (
                <Pressable accessibilityLabel="Xóa tìm kiếm" accessibilityRole="button" style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }} onPress={() => setQuery('')}>
                  <Icon name="circle-x" size={18} themeColor="textMuted" />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.listSubtitleRow}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                DANH SÁCH QUÁN ({filtered.length})
              </ThemedText>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.adminItemCard,
              {
                backgroundColor: t.card,
                borderColor: t.cardBorder,
              },
              Shadows.soft,
            ]}>
            <PlaceCard place={item} admin />
            <PlaceStatLine stat={statsByPlace.get(item.id)} days={statDays} />
            <View style={[styles.adminActionsRow, { borderTopColor: t.border }]}>
              <Button
                title="Sửa"
                icon={<Icon name="square-pen" size={17} />}
                variant="secondary"
                size="sm"
                style={styles.flex}
                onPress={() => router.push({ pathname: '/edit-place/[id]', params: { id: item.id } })}
              />
              <Button
                title={item.is_published ? 'Ẩn khỏi app' : 'Cho hiển thị'}
                icon={<Icon name={item.is_published ? 'eye-off' : 'eye'} size={17} themeColor={item.is_published ? 'text' : 'tint'} />}
                variant={item.is_published ? 'secondary' : 'tintSubtle'}
                size="sm"
                style={styles.flex}
                onPress={() => togglePublished(item)}
              />
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={[styles.emptyBox, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
            <ThemedText themeColor="textSecondary">
              {query ? 'Không tìm thấy quán nào theo từ khóa.' : 'Chưa có quán nào. Bấm “Thêm quán ăn mới” để bắt đầu.'}
            </ThemedText>
          </View>
        }
      />
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView edges={['top']} style={[styles.flex, { paddingTop: WebTopInset }]}>
        {content}
      </SafeAreaView>
    </ThemedView>
  );
}

function PlaceStatLine({ stat, days }: { stat?: PlaceStats; days: StatDays }) {
  if (!stat || statTotal(stat) === 0) return null;
  return (
    <View style={styles.placeStatRow}>
      <Icon name="trending-up" size={14} themeColor="textSecondary" />
      <ThemedText type="caption" themeColor="textSecondary" style={styles.flexShrink}>
        {statLine(stat)} · {days} ngày
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flex: 1, minWidth: 0 },
  flexShrinkText: { flexShrink: 1, minWidth: 0 },
  dimmed: { opacity: 0.5 },
  statsCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  statsHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  statsTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
    minWidth: 0,
  },
  daysToggle: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statTiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  statsBody: { gap: Spacing.two },
  statsSubhead: { marginTop: Spacing.two },
  sourceList: { gap: 0 },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statTile: {
    flexGrow: 1,
    flexBasis: 64,
    minWidth: 64,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.one,
    borderRadius: Radii.md,
    alignItems: 'center',
    gap: 2,
  },
  statsErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  placeStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
  },
  suggestionList: {
    gap: Spacing.two + 2,
  },
  suggestionItem: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two + 2,
  },
  suggestionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  suggestionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.md,
  },
  suggestionActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  list: {
    padding: Spacing.three,
    paddingBottom: Spacing.six * 2,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  adminProfileCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  adminTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adminIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
    minWidth: 0,
    marginRight: Spacing.two,
  },
  adminAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.full,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statItem: {
    flex: 1,
    padding: Spacing.two + 2,
    borderRadius: Radii.md,
    alignItems: 'center',
    gap: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    minHeight: 46,
  },
  searchInput: {
    ...Platform.select({ web: { outlineWidth: 0 } }),
    minWidth: 0,
    flex: 1,
    fontSize: 15,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  listSubtitleRow: {
    marginTop: Spacing.one,
  },
  adminItemCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: 0,
    overflow: 'hidden',
    gap: Spacing.two,
  },
  adminActionsRow: {
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  emptyBox: {
    padding: Spacing.four,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },

  /* Login Form */
  loginWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  loginCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  loginHeader: {
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  loginIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  errorBox: {
    padding: Spacing.two + 2,
    borderRadius: Radii.md,
  },

  /* Not Admin */
  notAdminCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.two,
  },
});
