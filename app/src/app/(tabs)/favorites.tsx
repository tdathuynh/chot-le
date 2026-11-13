import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
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

  useFocusEffect(
    useCallback(() => {
      fetchPlaces()
        .then((p) => setPlaces(p.filter((x) => x.is_published)))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

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
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyContainer}>
                <ThemedText themeColor="textSecondary">Đang tải danh sách…</ThemedText>
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
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
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
