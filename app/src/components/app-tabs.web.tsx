import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  type TabTriggerSlotProps,
  type TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet, useWindowDimensions, type PressableProps } from 'react-native';

import { MaxContentWidth, Radii, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from './themed-text';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>Khám phá</TabButton>
          </TabTrigger>
          <TabTrigger name="favorites" href="/favorites" asChild>
            <TabButton>Yêu thích</TabButton>
          </TabTrigger>
          <TabTrigger name="admin" href="/admin" asChild>
            <TabButton>Quản trị</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const t = useTheme();

  return (
    <Pressable
      {...(props as PressableProps)}
      style={({ pressed }) => [
        styles.tabButton,
        {
          backgroundColor: isFocused ? t.tint : 'transparent',
          opacity: pressed ? 0.8 : 1,
        },
        isFocused ? Shadows.soft : null,
      ]}>
      <ThemedText
        type="smallBold"
        style={{
          color: isFocused ? t.tintText : t.textSecondary,
        }}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const t = useTheme();
  const compact = useWindowDimensions().width < 600;

  return (
    <View {...props} style={styles.tabListContainer}>
      <View
        style={[
          styles.innerContainer,
          compact && { paddingHorizontal: 6 },
          {
            backgroundColor: t.card,
            borderColor: t.cardBorder,
          },
          Shadows.medium,
        ]}>
        <View style={[styles.brandRow, compact && { paddingLeft: 6 }]}>
          <Ionicons name="restaurant" size={20} color={t.tint} />
          {!compact && <ThemedText type="defaultBold" style={{ color: t.tint }}>
            Ăn Gì HCM
          </ThemedText>}
        </View>

        <View style={[styles.tabsRow, compact && { flex: 1 }]}>{props.children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  innerContainer: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.four,
    borderRadius: Radii.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.two,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radii.full,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
