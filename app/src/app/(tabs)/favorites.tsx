import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { PlaceCard } from '@/components/place-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui';
import { MaxContentWidth, Radii, Shadows, Spacing, WebTopInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchPlaces } from '@/lib/api';
import { useFavorites } from '@/lib/favorites';
import type { PlaceWithRelations } from '@/lib/types';

export default function FavoritesScreen() {
  const t = useTheme();
  const favIds = useFavorites();
  const [places, setPlaces] = useState<PlaceWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    fetchPlaces()
      .then((p) => {
        setPlaces(p.filter((x) => x.is_published));
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  const data = favIds
    .map((id) => places.find((p) => p.id === id))
    .filter((p): p is PlaceWithRelations => Boolean(p));

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <FlatList
          data={data}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PlaceCard place={item} />}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two + 4 }} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.header}>
              <ThemedText type="display" style={styles.headerTitle}>
                Quán yêu thích
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {data.length ? `Đã lưu ${data.length} quán ngon cho riêng bạn` : 'Lưu lại những quán ngon bạn yêu thích'}
              </ThemedText>
              {data.length >= 2 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Rủ hội bạn chọn 1 quán"
                  onPress={() =>
                    router.push({
                      pathname: '/vote/new',
                      params: { ids: data.slice(0, 8).map((p) => p.id).join(',') },
                    })
                  }
                  style={({ pressed }) => [
                    styles.voteCard,
                    { backgroundColor: t.tint, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
                    Shadows.medium,
                  ]}>
                  <View style={[styles.voteIcon, { backgroundColor: t.tintText }]}>
                    <Icon name="users" size={22} color={t.tint} />
                  </View>
                  <View style={styles.voteText}>
                    <ThemedText type="defaultBold" style={{ color: t.tintText }} numberOfLines={1}>
                      Rủ hội bạn chọn 1 quán
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: t.tintText, opacity: 0.9 }} numberOfLines={2}>
                      Gửi link vào nhóm chat, cả hội cùng bình chọn
                    </ThemedText>
                  </View>
                  <Icon name="chevron-right" size={20} color={t.tintText} />
                </Pressable>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyContainer}>
                <ThemedText themeColor="textSecondary">Đang tải danh sách…</ThemedText>
              </View>
            ) : failed && favIds.length ? (
              // Có quán đã lưu nhưng tải lỗi: đừng báo "chưa có quán yêu thích".
              <View style={styles.emptyContainer}>
                <Icon name="wifi" size={28} themeColor="textMuted" />
                <ThemedText themeColor="textSecondary" style={styles.emptyDesc}>
                  Không tải được quán yêu thích. Kiểm tra mạng rồi thử lại.
                </ThemedText>
                <Button
                  title="Thử lại"
                  variant="outline"
                  icon={<Icon name="rotate-ccw" size={18} themeColor="text" />}
                  onPress={load}
                  style={styles.exploreBtn}
                />
              </View>
            ) : (
              <View
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor: t.card,
                    borderColor: t.cardBorder,
                  },
                  Shadows.soft,
                ]}>
                <View style={[styles.emptyIconCircle, { backgroundColor: t.tintSubtle }]}>
                  <Icon name="heart" size={34} themeColor="tint" />
                </View>
                <ThemedText type="subtitle" style={styles.emptyTitle}>
                  Chưa có quán yêu thích nào
                </ThemedText>
                <ThemedText type="default" themeColor="textSecondary" style={styles.emptyDesc}>
                  Khi lướt thấy quán ăn ưng ý, hãy chạm vào biểu tượng trái tim để lưu lại vào đây và xem lại bất cứ khi nào!
                </ThemedText>
                <Button
                  title="Khám phá quán ngon"
                  variant="primary"
                  onPress={() => router.push('/')}
                  style={styles.exploreBtn}
                />
              </View>
            )
          }
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
    paddingBottom: Spacing.six * 2,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.one,
    marginBottom: Spacing.four,
    paddingTop: Spacing.one,
  },
  voteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radii.lg,
    marginTop: Spacing.three,
    minHeight: 72,
  },
  voteIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteText: { flex: 1, minWidth: 0, gap: 2 },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.two,
  },
  emptyCard: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyDesc: {
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 380,
  },
  exploreBtn: {
    marginTop: Spacing.two,
    minWidth: 220,
  },
});
