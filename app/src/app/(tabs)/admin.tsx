import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlaceCard } from '@/components/place-card';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Center, Field } from '@/components/ui';
import { MaxContentWidth, Radii, Shadows, Spacing, WebTopInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchPlaces, isDemo, setPublished } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { notify } from '@/lib/confirm';
import { normalize } from '@/lib/format';
import type { PlaceWithRelations } from '@/lib/types';

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
            <Icon name="lock-closed-outline" size={30} themeColor="tint" />
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
          placeholder="admin@angi.hcm"
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

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setPlaces(await fetchPlaces());
    } catch (e) {
      notify('Lỗi tải dữ liệu', (e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, []);

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
          <ThemedText style={{ fontSize: 44 }}>🚫</ThemedText>
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
                    <Icon name="person-outline" size={20} themeColor="tint" />
                  </View>
                  <View>
                    <ThemedText type="smallBold">Quản trị viên</ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary">
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
              icon={<Icon name="add" size={20} themeColor="tintText" />}
              variant="primary"
              size="lg"
              onPress={() => router.push({ pathname: '/edit-place/[id]', params: { id: 'new' } })}
            />

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
                  <Icon name="close-circle" size={18} themeColor="textMuted" />
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
            <View style={[styles.adminActionsRow, { borderTopColor: t.border }]}>
              <Button
                title="Sửa"
                icon={<Icon name="create-outline" size={17} />}
                variant="secondary"
                size="sm"
                style={styles.flex}
                onPress={() => router.push({ pathname: '/edit-place/[id]', params: { id: item.id } })}
              />
              <Button
                title={item.is_published ? 'Ẩn khỏi app' : 'Cho hiển thị'}
                icon={<Icon name={item.is_published ? 'eye-off-outline' : 'eye-outline'} size={17} themeColor={item.is_published ? 'text' : 'tint'} />}
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
