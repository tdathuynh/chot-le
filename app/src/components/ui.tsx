import { router, Stack, useNavigation } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radii, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'tintSubtle';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();

  let bg: string = t.tint;
  let fg: string = t.tintText;
  let border: string | undefined = undefined;

  if (variant === 'secondary') {
    bg = t.backgroundElement;
    fg = t.text;
  } else if (variant === 'danger') {
    bg = t.danger;
    fg = '#FFFFFF';
  } else if (variant === 'outline') {
    bg = 'transparent';
    fg = t.text;
    border = t.border;
  } else if (variant === 'ghost') {
    bg = 'transparent';
    fg = t.tint;
  } else if (variant === 'tintSubtle') {
    bg = t.tintSubtle;
    fg = t.tint;
  }

  const height = size === 'sm' ? 44 : size === 'lg' ? 52 : 46;
  const paddingH = size === 'sm' ? Spacing.two + 4 : size === 'lg' ? Spacing.four : Spacing.three;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight: height,
          paddingHorizontal: paddingH,
          backgroundColor: bg,
          borderColor: border,
          borderWidth: border ? 1 : 0,
          opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        variant === 'primary' && !disabled ? Shadows.soft : null,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <View style={styles.buttonContent}>
          {icon ? <View style={styles.buttonIcon}>{icon}</View> : null}
          <ThemedText
            type={size === 'sm' ? 'smallBold' : 'defaultBold'}
            style={{ color: fg, textAlign: 'center' }}>
            {title}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  icon,
  onPress,
  onRemove,
  style,
}: {
  label: string;
  selected?: boolean;
  icon?: ReactNode;
  onPress?: () => void;
  onRemove?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onRemove ?? onPress}
      accessibilityLabel={onRemove ? `Bỏ bộ lọc ${label}` : label}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? t.tint : t.card,
          borderColor: selected ? t.tint : t.border,
          borderWidth: 1,
          opacity: pressed ? 0.8 : 1,
        },
        selected ? Shadows.soft : null,
        style,
      ]}>
      {icon ? <View style={styles.chipIcon}>{icon}</View> : null}
      <ThemedText
        type="smallBold"
        style={{
          color: selected ? t.tintText : t.text,
        }}>
        {label}
      </ThemedText>
      {onRemove ? (
        <View style={styles.chipRemove}>
          <Icon name="x" size={16} color={selected ? t.tintText : t.textSecondary} />
        </View>
      ) : null}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  icon,
  ...props
}: TextInputProps & { label: string; hint?: string; icon?: ReactNode }) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" style={{ color: t.text }}>
        {label}
      </ThemedText>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: t.card,
            borderColor: focused ? t.tint : t.border,
          },
          props.multiline && { minHeight: 96, alignItems: 'flex-start' },
        ]}>
        {icon ? <View style={styles.inputIcon}>{icon}</View> : null}
        <TextInput
          placeholderTextColor={t.textMuted}
          {...props}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          style={[
            styles.input,
            { color: t.text },
            props.multiline && { minHeight: 88, textAlignVertical: 'top' },
            props.style,
          ]}
        />
      </View>
      {hint ? (
        <ThemedText type="caption" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

export function Section({
  title,
  action,
  children,
  style,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
          {title.toUpperCase()}
        </ThemedText>
        {action}
      </View>
      {children}
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: t.card,
          borderColor: t.cardBorder,
        },
        Shadows.soft,
        style,
      ]}>
      {children}
    </View>
  );
}

export function Badge({
  label,
  variant = 'neutral',
  icon,
}: {
  label: string;
  variant?: 'neutral' | 'success' | 'danger' | 'tint';
  icon?: ReactNode;
}) {
  const t = useTheme();
  let bg: string = t.backgroundElement;
  let fg: string = t.textSecondary;

  if (variant === 'success') {
    bg = t.successSubtle;
    fg = t.success;
  } else if (variant === 'danger') {
    bg = t.dangerSubtle;
    fg = t.danger;
  } else if (variant === 'tint') {
    bg = t.tintSubtle;
    fg = t.tint;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon ? <View style={{ marginRight: 4 }}>{icon}</View> : null}
      <ThemedText type="captionBold" style={{ color: fg }}>
        {label}
      </ThemedText>
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: t.border }, style]} />;
}

export function Center({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.center, style]}>{children}</View>;
}

/**
 * Màn hình mở thẳng từ link (web: link Zalo/Messenger, hoặc tải lại trang) không có trang trước
 * → header không có nút quay lại. Đặt component này trong màn hình để hiện nút về trang chủ.
 */
export function HomeButtonIfNoBack() {
  // Dùng navigation của màn hình (router.canGoBack() ném lỗi ở lần render đầu khi mở thẳng link).
  const navigation = useNavigation();
  if (navigation.canGoBack()) return null;
  return (
    <Stack.Screen
      options={{
        headerLeft: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Về trang chủ"
            onPress={() => router.replace('/')}
            hitSlop={8}
            style={styles.headerHome}>
            <Icon name="house" size={22} themeColor="tint" />
          </Pressable>
        ),
      }}
    />
  );
}

export function ModalSheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const t = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: t.overlay }]}>
        <Pressable style={styles.modalDismissArea} onPress={onClose} />
        <View
          style={[
            styles.modalSheet,
            {
              backgroundColor: t.card,
              borderColor: t.border,
            },
            Shadows.strong,
          ]}>
          <View style={styles.modalHandleWrap}>
            <View style={[styles.modalHandle, { backgroundColor: t.border }]} />
          </View>
          <View style={[styles.modalHeader, { borderBottomColor: t.border }]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {title}
            </ThemedText>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Đóng"
              style={[styles.modalCloseBtn, { backgroundColor: t.backgroundElement }]}>
              <Icon name="x" size={16} color={t.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.modalBody}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one + 2,
  },
  buttonIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    minHeight: 44,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRemove: {
    marginLeft: 2,
    padding: 2,
  },
  field: {
    gap: Spacing.one + 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
  },
  inputIcon: {
    marginRight: Spacing.two,
  },
  input: {
    ...Platform.select({ web: { outlineWidth: 0 } }),
    minWidth: 0,
    flex: 1,
    minHeight: 46,
    fontSize: 15,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  section: {
    gap: Spacing.two + 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    letterSpacing: 0.8,
  },
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.three,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '88%',
  },
  modalHandleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    flex: 1,
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerHome: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: Spacing.four,
  },
});
