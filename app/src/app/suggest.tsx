import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Card, Field, HomeButtonIfNoBack } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { suggestPlace } from '@/lib/api';
import { isMapsLink } from '@/lib/maps-link';

const NAME_MAX = 120;
const NOTE_MAX = 500;

export default function SuggestScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [linkTouched, setLinkTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedLink = mapsUrl.trim();
  const linkInvalid = trimmedLink.length > 0 && !isMapsLink(trimmedLink);
  // Link sai không khoá nút: bấm Gửi sẽ hiện lỗi ngay dưới ô link (rõ hơn một nút xám không lý do).
  const canSubmit = name.trim().length > 0 && !busy;

  const submit = () => {
    if (busy) return;
    if (!name.trim()) return;
    if (linkInvalid) {
      setLinkTouched(true);
      return;
    }
    setError(null);
    setBusy(true);
    suggestPlace(name.trim(), trimmedLink, note.trim()).then(
      () => {
        setBusy(false);
        setSent(true);
      },
      (e: unknown) => {
        setBusy(false);
        const msg = e instanceof Error ? e.message : (e as { message?: string })?.message;
        setError(msg || 'Vui lòng thử lại sau.');
      }
    );
  };

  const reset = () => {
    setName('');
    setMapsUrl('');
    setNote('');
    setLinkTouched(false);
    setError(null);
    setSent(false);
  };

  const goHome = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <ThemedView style={styles.flex}>
      <HomeButtonIfNoBack />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: Spacing.five + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {sent ? (
            <Card style={styles.successCard}>
              <View style={[styles.iconCircle, { backgroundColor: t.successSubtle }]}>
                <Icon name="check" size={32} themeColor="success" strokeWidth={2.5} />
              </View>
              <ThemedText type="title" style={styles.center}>
                Cảm ơn bạn!
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.center}>
                Tụi mình đã nhận được gợi ý. Admin sẽ ghé thử và đăng lên app nếu quán ngon.
              </ThemedText>
              <View style={styles.successActions}>
                <Button
                  title="Gợi ý quán khác"
                  icon={<Icon name="plus" size={18} themeColor="tintText" />}
                  onPress={reset}
                />
                <Button title="Về trang chủ" variant="secondary" onPress={goHome} />
              </View>
            </Card>
          ) : (
            <View style={styles.form}>
              <View style={styles.intro}>
                <View style={[styles.iconCircle, { backgroundColor: t.tintSubtle }]}>
                  <Icon name="lightbulb" size={30} themeColor="tint" />
                </View>
                <ThemedText type="subtitle" style={styles.center}>
                  Biết quán ngon mà app chưa có?
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.center}>
                  Gửi cho tụi mình, admin sẽ ghé thử và đăng lên. Không cần đăng nhập.
                </ThemedText>
              </View>

              <Card style={styles.fields}>
                <Field
                  label="Tên quán *"
                  value={name}
                  onChangeText={setName}
                  placeholder="VD: Bún bò Cô Ba"
                  maxLength={NAME_MAX}
                  returnKeyType="next"
                  editable={!busy}
                />
                <View style={styles.fieldWithError}>
                  <Field
                    label="Link Google Maps"
                    value={mapsUrl}
                    onChangeText={setMapsUrl}
                    onBlur={() => setLinkTouched(true)}
                    placeholder="https://maps.app.goo.gl/..."
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    icon={<Icon name="link" size={18} themeColor="textSecondary" />}
                    hint="Không bắt buộc. Trong Google Maps, mở quán → bấm Chia sẻ → Sao chép đường liên kết, rồi dán vào đây."
                    editable={!busy}
                  />
                  {linkInvalid && linkTouched ? (
                    <ThemedText type="captionBold" style={{ color: t.danger }}>
                      Link này không phải link Google Maps (vd https://maps.app.goo.gl/...).
                    </ThemedText>
                  ) : null}
                </View>
                <Field
                  label="Vì sao ngon? / Món nên thử"
                  value={note}
                  onChangeText={setNote}
                  placeholder="VD: Nước lèo đậm đà, nên gọi tô đặc biệt. Đông vào buổi sáng."
                  multiline
                  maxLength={NOTE_MAX}
                  editable={!busy}
                />
              </Card>

              {error ? (
                <ThemedText type="captionBold" themeColor="danger" style={styles.center} accessibilityLiveRegion="polite">
                  Không gửi được gợi ý. {error}
                </ThemedText>
              ) : null}
              <Button
                title="Gửi gợi ý"
                size="lg"
                icon={<Icon name="send-horizontal" size={18} themeColor="tintText" />}
                onPress={submit}
                loading={busy}
                disabled={!canSubmit}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    padding: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  center: { textAlign: 'center' },
  form: { gap: Spacing.three },
  intro: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  fields: { gap: Spacing.three },
  fieldWithError: { gap: Spacing.one },
  successCard: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    marginTop: Spacing.four,
  },
  successActions: {
    alignSelf: 'stretch',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
