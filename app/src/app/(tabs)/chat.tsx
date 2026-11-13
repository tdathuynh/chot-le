import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { PlaceCard } from '@/components/place-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radii, Spacing, WebTopInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchCategories, fetchPlaces } from '@/lib/api';
import { answer, greeting, type AssistantReply } from '@/lib/assistant';
import { matchReason } from '@/lib/filters';
import { requestLocation, useUserLocation, type Coords } from '@/lib/location';
import type { Category, PlaceWithRelations } from '@/lib/types';

// Giống trang chủ: trên iOS nội dung tràn xuống dưới thanh tab kính mờ.
const IOS_TAB_BAR_HEIGHT = 56;

type Msg = { id: string; role: 'user'; text: string } | { id: string; role: 'bot'; reply: AssistantReply };

let msgId = 0;
const nextId = () => String(++msgId);

export default function ChatScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const loc = useUserLocation();
  const me: Coords | null = loc.status === 'granted' ? loc.coords : null;

  const [places, setPlaces] = useState<PlaceWithRelations[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(() => [{ id: nextId(), role: 'bot', reply: greeting() }]);
  const [input, setInput] = useState('');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  useEffect(() => {
    Promise.all([fetchPlaces(), fetchCategories()])
      .then(([p, c]) => {
        setPlaces(p.filter((x) => x.is_published));
        setCategories(c);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const lastReply = useCallback((list: Msg[]) => {
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i];
      if (m.role === 'bot') return m.reply;
    }
    return null;
  }, []);

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || !ready) return;
      setInput('');
      const prev = lastReply(messages);
      const userMsg: Msg = { id: nextId(), role: 'user', text: q };
      let reply = answer(q, { places, categories, me, prev, random: Math.random() });
      // Cần vị trí → xin quyền rồi trả lời lại.
      if (reply.needsLocation) {
        setMessages((m) => [...m, userMsg, { id: nextId(), role: 'bot', reply }]);
        const c = await requestLocation();
        reply = c
          ? answer(q, { places, categories, me: c, prev, random: Math.random() })
          : { ...reply, text: 'Chưa lấy được vị trí. Bạn cho phép quyền vị trí, hoặc nói khu vực (vd "Quận 3") nhé.', needsLocation: false };
        setMessages((m) => [...m, { id: nextId(), role: 'bot', reply }]);
        return;
      }
      setMessages((m) => [...m, userMsg, { id: nextId(), role: 'bot', reply }]);
    },
    [ready, messages, places, categories, me, lastReply]
  );

  const reset = () => setMessages([{ id: nextId(), role: 'bot', reply: greeting() }]);

  const bottomPad = keyboardOpen ? Spacing.two : Spacing.two + (Platform.OS === 'ios' ? insets.bottom + IOS_TAB_BAR_HEIGHT : 0);
  const lastBotId = [...messages].reverse().find((m) => m.role === 'bot')?.id;

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView edges={['top']} style={[styles.flex, { paddingTop: WebTopInset }]}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.header, { borderBottomColor: t.border }]}>
            <View style={[styles.avatar, { backgroundColor: t.tint }]}>
              <Icon name="sparkles" size={18} color={t.tintText} />
            </View>
            <View style={styles.flex}>
              <ThemedText type="defaultBold">Hỏi Ăn Gì</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Trợ lý tìm quán, chạy ngay trên máy
              </ThemedText>
            </View>
            <Pressable
              onPress={reset}
              accessibilityRole="button"
              accessibilityLabel="Bắt đầu lại cuộc trò chuyện"
              hitSlop={10}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: t.backgroundElement, opacity: pressed ? 0.7 : 1 }]}>
              <Icon name="rotate-ccw" size={18} themeColor="textSecondary" />
            </Pressable>
          </View>

          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) =>
              item.role === 'user' ? (
                <View style={[styles.bubble, styles.userBubble, { backgroundColor: t.tint }]}>
                  <ThemedText style={{ color: t.tintText }}>{item.text}</ThemedText>
                </View>
              ) : (
                <View style={styles.botBlock}>
                  <View style={[styles.bubble, styles.botBubble, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
                    <ThemedText>{item.reply.text}</ThemedText>
                  </View>
                  {item.reply.places.map((p) => (
                    <PlaceCard
                      key={p.id}
                      place={p}
                      distanceKm={p.distanceKm}
                      reason={item.reply.filters ? matchReason(p, item.reply.filters) || undefined : undefined}
                    />
                  ))}
                  {item.id === lastBotId && item.reply.suggestions.length ? (
                    <View style={styles.suggestions}>
                      {item.reply.suggestions.map((s) => (
                        <Pressable
                          key={s}
                          onPress={() => send(s)}
                          accessibilityRole="button"
                          style={({ pressed }) => [
                            styles.suggestion,
                            { borderColor: t.tint, backgroundColor: t.tintSubtle, opacity: pressed ? 0.7 : 1 },
                          ]}>
                          <ThemedText type="smallBold" style={{ color: t.tint }}>
                            {s}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              )
            }
          />

          <View style={[styles.inputBar, { borderTopColor: t.border, backgroundColor: t.background, paddingBottom: bottomPad }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={ready ? 'Hỏi mình: "lẩu gần đây dưới 200k"…' : 'Đang tải danh sách quán…'}
              placeholderTextColor={t.textMuted}
              style={[styles.input, { backgroundColor: t.card, borderColor: t.border, color: t.text }]}
              returnKeyType="send"
              onSubmitEditing={() => send(input)}
              editable={ready}
              maxLength={200}
            />
            <Pressable
              onPress={() => send(input)}
              disabled={!input.trim() || !ready}
              accessibilityRole="button"
              accessibilityLabel="Gửi"
              style={({ pressed }) => [
                styles.sendBtn,
                { backgroundColor: input.trim() && ready ? t.tint : t.backgroundElement, opacity: pressed ? 0.8 : 1 },
              ]}>
              <Icon name="send-horizontal" size={20} color={input.trim() && ready ? t.tintText : t.textMuted} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  avatar: { width: 36, height: 36, borderRadius: Radii.full, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: Radii.full, alignItems: 'center', justifyContent: 'center' },
  list: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  bubble: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 2, borderRadius: Radii.lg, maxWidth: '88%' },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  botBubble: { alignSelf: 'flex-start', borderWidth: 1, borderBottomLeftRadius: 4 },
  botBlock: { gap: Spacing.two },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  suggestion: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + 3, borderRadius: Radii.full, borderWidth: 1 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    ...Platform.select({ web: { outlineWidth: 0 } }),
  },
  sendBtn: { width: 44, height: 44, borderRadius: Radii.full, alignItems: 'center', justifyContent: 'center' },
});
