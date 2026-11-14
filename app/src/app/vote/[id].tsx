import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { type ComponentRef, useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge, Button, Center, Field, HomeButtonIfNoBack, ModalSheet } from '@/components/ui';
import { MaxContentWidth, Radii, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { castVote, closePoll, fetchPlaces, fetchPoll, trackEvent } from '@/lib/api';
import { notify } from '@/lib/confirm';
import { setMyName, useMyName } from '@/lib/device';
import { formatPriceRange, isDealActive } from '@/lib/format';
import { directionsUrl } from '@/lib/location';
import { canNativeShare, copyText, pollUrl, sharePoll } from '@/lib/share-link';
import type { PlaceWithRelations, Poll, PollOption } from '@/lib/types';

const REFRESH_MS = 4000;

function timeLeft(expiresAt: string, now: number): string | null {
  const ms = new Date(expiresAt).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const min = Math.ceil(ms / 60000);
  if (min < 60) return `Còn ${min} phút`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Còn ${h} giờ`;
  return `Còn ${Math.floor(h / 24)} ngày`;
}

/** Áp phiếu của mình ngay trên giao diện (trước khi máy chủ trả lời). */
function applyMyVote(poll: Poll, placeId: string, name: string): Poll {
  return {
    ...poll,
    options: poll.options.map((o) => {
      if (o.place_id === placeId) {
        return o.mine ? o : { ...o, mine: true, voters: [...o.voters, name] };
      }
      if (!o.mine) return o;
      const voters = [...o.voters];
      const idx = voters.lastIndexOf(name);
      voters.splice(idx >= 0 ? idx : voters.length - 1, 1);
      return { ...o, mine: false, voters };
    }),
  };
}

export default function VoteScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; share?: string }>();
  const id = String(params.id ?? '');
  const myName = useMyName();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [places, setPlaces] = useState<Record<string, PlaceWithRelations>>({});
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading');
  const [now, setNow] = useState(0);
  const [nameDraft, setNameDraft] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [voting, setVoting] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  // Chốt quán bằng bảng trong app (không dùng confirm: webview Zalo/Messenger chặn hộp thoại).
  // Nội dung bảng được giữ nguyên khi đóng để lúc mờ dần không bị nháy sang bước khác.
  const [sheet, setSheet] = useState<null | { step: 'pick' } | { step: 'confirm'; placeId: string }>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [nameError, setNameError] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  // Phản hồi ngay trên nút (không dùng alert: nhiều webview như Zalo chặn hộp thoại).
  const [shareFeedback, setShareFeedback] = useState<'copied' | 'failed' | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const placesLoaded = useRef(false);
  const sharedOnce = useRef(false);
  const seq = useRef(0); // bỏ qua kết quả cũ về muộn (sau khi vừa bỏ phiếu)
  const busy = useRef(false);

  const load = useCallback(() => {
    const mySeq = ++seq.current;
    const needPlaces = !placesLoaded.current;
    Promise.all([fetchPoll(id), needPlaces ? fetchPlaces() : Promise.resolve(null)])
      .then(([p, list]) => {
        if (list) {
          placesLoaded.current = true;
          const map: Record<string, PlaceWithRelations> = {};
          for (const x of list) map[x.id] = x;
          setPlaces(map);
        }
        if (mySeq !== seq.current || busy.current) return;
        setNow(Date.now());
        if (!p) {
          setPoll(null);
          setStatus('notfound');
          return;
        }
        setPoll(p);
        setStatus('ready');
        if (Platform.OS !== 'web' && params.share === '1' && !sharedOnce.current && !p.closed_at) {
          sharedOnce.current = true;
          void sharePoll(p.id, p.title);
        }
      })
      .catch(() => {
        if (mySeq !== seq.current) return;
        // Lần đầu lỗi → báo lỗi; khi đang tự làm mới thì giữ dữ liệu cũ.
        setStatus((s) => (s === 'ready' ? s : 'error'));
      });
  }, [id, params.share]);

  const closed = Boolean(poll?.closed_at);

  useFocusEffect(
    useCallback(() => {
      load();
      if (closed) return undefined;
      const timer = setInterval(load, REFRESH_MS);
      return () => clearInterval(timer);
    }, [load, closed])
  );

  const total = poll ? poll.options.reduce((s, o) => s + o.voters.length, 0) : 0;
  const leaderId = useMemo(() => {
    if (!poll) return null;
    let best: PollOption | null = null;
    let tie = false;
    for (const o of poll.options) {
      if (!best || o.voters.length > best.voters.length) {
        best = o;
        tie = false;
      } else if (o.voters.length === best.voters.length) {
        tie = true;
      }
    }
    return best && best.voters.length > 0 && !tie ? best.place_id : null;
  }, [poll]);

  const left = poll ? timeLeft(poll.expires_at, now) : null;
  const expired = Boolean(poll && !poll.closed_at && now > 0 && !left);
  const open = Boolean(poll && !poll.closed_at && !expired);
  const needName = !myName || editingName;

  async function vote(placeId: string) {
    if (!poll || !open || voting || busy.current) return;
    let name = myName;
    if (needName) {
      name = nameDraft.trim();
      if (!name) {
        // Báo ngay trên ô nhập tên (alert bị chặn trong nhiều webview).
        setNameError(true);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        return;
      }
      setNameError(false);
      setMyName(name);
      setEditingName(false);
    }
    const target = poll.options.find((o) => o.place_id === placeId);
    if (target?.mine && !needName) return;

    busy.current = true;
    seq.current++;
    setVoteError(null);
    setVoting(placeId);
    const before = poll;
    setPoll(applyMyVote(poll, placeId, name));
    try {
      await castVote(poll.id, name, placeId);
    } catch (e) {
      setPoll(before);
      setVoteError(e instanceof Error && e.message ? e.message : 'Kiểm tra kết nối mạng rồi thử lại.');
    } finally {
      busy.current = false;
      setVoting(null);
      load();
    }
  }

  async function finish(placeId: string) {
    if (!poll || closing) return;
    setCloseError(null);
    setClosing(true);
    busy.current = true;
    try {
      await closePoll(poll.id, placeId);
      seq.current++;
      setPoll({ ...poll, winner_place_id: placeId, closed_at: new Date().toISOString() });
      setSheetOpen(false);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (e) {
      setCloseError(e instanceof Error && e.message ? e.message : 'Kiểm tra kết nối mạng rồi thử lại.');
    } finally {
      busy.current = false;
      setClosing(false);
      load();
    }
  }

  function flash(kind: 'copied' | 'failed') {
    setShareFeedback(kind);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setShareFeedback(null), 2500);
  }

  async function shareLink() {
    if (!poll) return;
    const r = await sharePoll(poll.id, poll.title);
    if (r === 'copied' || r === 'failed') flash(r);
  }

  async function copyLink() {
    if (!poll) return;
    flash((await copyText(pollUrl(poll.id))) ? 'copied' : 'failed');
  }

  function onClosePress() {
    setCloseError(null);
    setSheet(leaderId ? { step: 'confirm', placeId: leaderId } : { step: 'pick' });
    setSheetOpen(true);
  }

  function closeSheet() {
    if (!closing) setSheetOpen(false);
  }

  const homeHeader = <HomeButtonIfNoBack />;

  // ---------- Trạng thái tải / lỗi ----------
  if (status === 'loading') {
    return (
      <ThemedView style={styles.flex}>
        {homeHeader}
        <Center>
          <ActivityIndicator color={t.tint} />
          <ThemedText type="small" themeColor="textSecondary">
            Đang mở bình chọn…
          </ThemedText>
        </Center>
      </ThemedView>
    );
  }

  if (status !== 'ready' || !poll) {
    const notFound = status === 'notfound';
    return (
      <ThemedView style={styles.flex}>
        {homeHeader}
        <Center>
          <View style={[styles.stateIcon, { backgroundColor: t.tintSubtle }]}>
            <Icon name={notFound ? 'vote' : 'wifi'} size={32} themeColor="tint" />
          </View>
          <ThemedText type="subtitle" style={styles.centerText}>
            {notFound ? 'Không tìm thấy bình chọn' : 'Không tải được bình chọn'}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={[styles.centerText, styles.stateDesc]}>
            {notFound
              ? 'Link có thể đã hết hạn hoặc bị gõ sai. Bạn vẫn có thể tự tìm quán ngon và rủ hội bạn nhé!'
              : 'Kiểm tra kết nối mạng rồi thử lại.'}
          </ThemedText>
          {notFound ? null : (
            <Button
              title="Thử lại"
              variant="outline"
              icon={<Icon name="rotate-ccw" size={18} themeColor="text" />}
              onPress={() => {
                setStatus('loading');
                load();
              }}
              style={styles.stateBtn}
            />
          )}
          <Button
            title="Về trang chủ"
            icon={<Icon name="house" size={18} color={t.tintText} />}
            onPress={() => router.replace('/')}
            style={styles.stateBtn}
          />
        </Center>
      </ThemedView>
    );
  }

  const winner = poll.winner_place_id ? places[poll.winner_place_id] : undefined;
  const winnerVotes = poll.options.find((o) => o.place_id === poll.winner_place_id)?.voters.length ?? 0;
  const statusLabel = poll.closed_at ? 'Đã chốt' : expired ? 'Đã hết hạn' : left;
  const showShareBox = open && (poll.is_creator || params.share === '1');
  const confirmId = sheet?.step === 'confirm' ? sheet.placeId : null;
  const confirmPlace = confirmId ? places[confirmId] : undefined;
  const confirmVotes = confirmId ? (poll.options.find((o) => o.place_id === confirmId)?.voters.length ?? 0) : 0;

  return (
    <ThemedView style={styles.flex}>
      {homeHeader}
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: Spacing.five + insets.bottom }]}
        keyboardShouldPersistTaps="handled">
        {/* Quán thắng */}
        {poll.closed_at ? (
          <View style={[styles.winner, { backgroundColor: t.tint }, Shadows.medium]}>
            <View style={styles.winnerTop}>
              <View style={[styles.trophy, { backgroundColor: t.tintText }]}>
                <Icon name="trophy" size={26} color={t.tint} />
              </View>
              <View style={styles.flexShrink}>
                <ThemedText type="captionBold" style={[styles.kicker, { color: t.tintText }]}>
                  CHỐT ĐƠN!
                </ThemedText>
                <ThemedText type="title" style={{ color: t.tintText }} numberOfLines={2}>
                  {winner?.name ?? 'Quán đã chốt'}
                </ThemedText>
              </View>
            </View>
            {winner ? (
              <>
                {winner.cover_image_url ? (
                  <Image
                    source={{ uri: winner.cover_image_url }}
                    style={styles.winnerImage}
                    contentFit="cover"
                    transition={200}
                  />
                ) : null}
                <View style={styles.winnerMeta}>
                  <Icon name="map-pin" size={16} color={t.tintText} />
                  <ThemedText type="small" style={[styles.flexShrink, { color: t.tintText }]}>
                    {winner.address}, {winner.district}
                  </ThemedText>
                </View>
                <ThemedText type="caption" style={{ color: t.tintText, opacity: 0.85 }}>
                  {winnerVotes > 0 ? `${winnerVotes}/${total} phiếu · ` : ''}Hẹn cả hội ở đó nhé!
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Chỉ đường tới ${winner.name}`}
                  onPress={() => {
                    trackEvent(winner.id, 'directions');
                    Linking.openURL(directionsUrl(winner)).catch(() =>
                      notify('Không mở được bản đồ', 'Hãy thử lại sau.')
                    );
                  }}
                  style={({ pressed }) => [
                    styles.directionsBtn,
                    { backgroundColor: t.tintText, opacity: pressed ? 0.88 : 1 },
                  ]}>
                  <Icon name="navigation" size={20} color={t.tint} />
                  <ThemedText type="defaultBold" style={{ color: t.tint, fontSize: 17 }}>
                    Chỉ đường
                  </ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => router.push({ pathname: '/place/[id]', params: { id: winner.id } })}
                  style={styles.winnerLink}>
                  <ThemedText type="smallBold" style={{ color: t.tintText }}>
                    Xem thực đơn & chi tiết quán
                  </ThemedText>
                  <Icon name="chevron-right" size={16} color={t.tintText} />
                </Pressable>
              </>
            ) : (
              <ThemedText type="small" style={{ color: t.tintText }}>
                Quán này hiện không còn hiển thị trên app.
              </ThemedText>
            )}
          </View>
        ) : null}

        {/* Tiêu đề */}
        <View style={styles.header}>
          <ThemedText type="display" style={styles.title}>
            {poll.title}
          </ThemedText>
          <View style={styles.metaRow}>
            {poll.creator_name ? (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.flexShrink}>
                do <ThemedText type="smallBold">{poll.creator_name}</ThemedText> tạo
              </ThemedText>
            ) : null}
            <Badge
              variant="tint"
              label={`${total} phiếu`}
              icon={<Icon name="users" size={12} themeColor="tint" />}
            />
            {statusLabel ? (
              <Badge
                variant={poll.closed_at ? 'success' : 'neutral'}
                label={statusLabel}
                icon={
                  <Icon
                    name={poll.closed_at ? 'check' : 'clock'}
                    size={12}
                    themeColor={poll.closed_at ? 'success' : 'textSecondary'}
                  />
                }
              />
            ) : null}
          </View>
        </View>

        {/* Ô link: người tạo (và người vừa tạo xong) thấy ngay để dán vào nhóm chat */}
        {showShareBox ? (
          <View style={[styles.shareBox, { backgroundColor: t.card, borderColor: t.tint }, Shadows.soft]}>
            <View style={styles.shareHead}>
              <Icon name="link" size={18} themeColor="tint" />
              <ThemedText type="defaultBold" style={styles.flexShrink}>
                Gửi link này vào nhóm chat
              </ThemedText>
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              Bạn bè bấm link là bình chọn được ngay, không cần cài app.
            </ThemedText>
            <View style={[styles.linkRow, { backgroundColor: t.backgroundElement }]}>
              <ThemedText type="small" numberOfLines={1} selectable style={styles.linkText}>
                {pollUrl(poll.id)}
              </ThemedText>
            </View>
            {shareFeedback === 'failed' ? (
              <ThemedText type="caption" themeColor="danger">
                Trình duyệt này không cho chép tự động. Nhấn giữ vào link ở trên để chép.
              </ThemedText>
            ) : null}
            <View style={styles.shareBtns}>
              <Button
                title={shareFeedback === 'copied' ? 'Đã chép link' : 'Chép link'}
                variant={shareFeedback === 'copied' ? 'tintSubtle' : 'primary'}
                icon={
                  <Icon
                    name={shareFeedback === 'copied' ? 'check' : 'copy'}
                    size={18}
                    color={shareFeedback === 'copied' ? t.tint : t.tintText}
                  />
                }
                onPress={copyLink}
                style={styles.flex}
              />
              {canNativeShare() ? (
                <Button
                  title="Chia sẻ"
                  variant="outline"
                  icon={<Icon name="share" size={18} themeColor="text" />}
                  onPress={shareLink}
                  style={styles.flex}
                />
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Tên người bình chọn */}
        {open ? (
          needName ? (
            <View style={[styles.nameCard, { backgroundColor: t.tintSubtle, borderColor: t.cardBorder }]}>
              <Field
                label="Tên của bạn"
                placeholder="Nhập tên rồi bấm chọn quán bên dưới"
                value={nameDraft}
                onChangeText={(v) => {
                  setNameDraft(v);
                  if (v.trim()) setNameError(false);
                }}
                maxLength={40}
                autoComplete="name"
                autoFocus={editingName}
                icon={<Icon name="user" size={18} themeColor="textMuted" />}
                hint="Chỉ cần nhập một lần, lần sau app tự nhớ."
              />
              {nameError ? (
                <ThemedText type="captionBold" themeColor="danger" accessibilityLiveRegion="polite">
                  Nhập tên trước để cả hội biết ai chọn quán nào nhé.
                </ThemedText>
              ) : null}
              {editingName ? (
                <View style={styles.nameBtns}>
                  {myName ? (
                    <Button
                      title="Hủy"
                      size="sm"
                      variant="ghost"
                      onPress={() => {
                        setEditingName(false);
                        setNameError(false);
                      }}
                      style={styles.flex}
                    />
                  ) : null}
                  <Button
                    title="Lưu tên"
                    size="sm"
                    variant="tintSubtle"
                    disabled={!nameDraft.trim()}
                    onPress={() => {
                      setMyName(nameDraft);
                      setEditingName(false);
                    }}
                    style={styles.flex}
                  />
                </View>
              ) : null}
            </View>
          ) : (
            <View style={[styles.youRow, { backgroundColor: t.backgroundElement }]}>
              <Icon name="user" size={16} themeColor="textSecondary" />
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.flexShrink}>
                Bạn chọn với tên <ThemedText type="smallBold">{myName}</ThemedText>
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đổi tên"
                onPress={() => {
                  setNameDraft(myName);
                  setEditingName(true);
                }}
                hitSlop={8}
                style={styles.youEdit}>
                <ThemedText type="smallBold" style={{ color: t.tint }}>
                  Đổi
                </ThemedText>
              </Pressable>
            </View>
          )
        ) : null}

        {open ? (
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            CHẠM VÀO QUÁN ĐỂ BÌNH CHỌN
          </ThemedText>
        ) : (
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            KẾT QUẢ BÌNH CHỌN
          </ThemedText>
        )}

        {voteError ? (
          <View style={[styles.errorBox, { backgroundColor: t.dangerSubtle }]} accessibilityLiveRegion="polite">
            <Icon name="circle-x" size={18} themeColor="danger" />
            <ThemedText type="small" themeColor="danger" style={styles.flexShrink}>
              Chưa bỏ phiếu được. {voteError}
            </ThemedText>
          </View>
        ) : null}

        {/* Các lựa chọn */}
        <View style={styles.options}>
          {poll.options.map((o) => (
            <OptionCard
              key={o.place_id}
              option={o}
              place={places[o.place_id]}
              total={total}
              leader={o.place_id === leaderId}
              winner={o.place_id === poll.winner_place_id}
              open={open}
              voting={voting === o.place_id}
              disabled={Boolean(voting) || closing}
              onVote={() => vote(o.place_id)}
            />
          ))}
        </View>

        {/* Hành động */}
        {open ? (
          <View style={styles.actions}>
            <Button
              title={shareFeedback === 'copied' ? 'Đã chép link, dán vào nhóm nhé' : 'Gửi link cho bạn bè'}
              size="lg"
              variant={poll.is_creator ? 'tintSubtle' : 'primary'}
              icon={
                <Icon
                  name={shareFeedback === 'copied' ? 'check' : 'share'}
                  size={18}
                  color={poll.is_creator ? t.tint : t.tintText}
                />
              }
              onPress={shareLink}
            />
            {shareFeedback === 'failed' && !showShareBox ? (
              <View style={[styles.linkRow, { backgroundColor: t.backgroundElement }]}>
                <ThemedText type="caption" themeColor="danger">
                  Trình duyệt này không cho chép tự động. Nhấn giữ vào link dưới đây để chép:
                </ThemedText>
                <ThemedText type="small" selectable style={styles.linkText}>
                  {pollUrl(poll.id)}
                </ThemedText>
              </View>
            ) : null}
            {poll.is_creator ? (
              <Button
                title="Chốt quán"
                size="lg"
                icon={<Icon name="crown" size={18} color={t.tintText} />}
                onPress={onClosePress}
                loading={closing}
                disabled={Boolean(voting)}
              />
            ) : null}
            <ThemedText type="caption" themeColor="textMuted" style={styles.centerText}>
              {poll.is_creator
                ? 'Bạn là người tạo: chốt khi cả hội đã chọn xong.'
                : 'Kết quả tự cập nhật khi bạn bè bình chọn.'}
            </ThemedText>
          </View>
        ) : (
          <Button
            title="Tạo bình chọn mới"
            variant="outline"
            icon={<Icon name="plus" size={18} themeColor="text" />}
            onPress={() => router.push('/vote/new')}
          />
        )}
      </ScrollView>

      <ModalSheet
        visible={sheetOpen}
        onClose={closeSheet}
        title={sheet?.step === 'confirm' ? 'Chốt quán này?' : 'Chốt quán nào?'}>
        {sheet?.step === 'confirm' ? (
          <View style={styles.sheetContent}>
            <View style={[styles.sheetRow, { borderColor: t.tint, backgroundColor: t.tintSubtle }]}>
              <Icon name="crown" size={18} themeColor="tint" />
              <ThemedText type="defaultBold" numberOfLines={2} style={styles.flex}>
                {confirmPlace?.name ?? 'Quán không còn hiển thị'}
              </ThemedText>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {confirmVotes} phiếu
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              Bình chọn sẽ kết thúc, cả hội sẽ thấy quán được chốt và nút chỉ đường.
            </ThemedText>
            {closeError ? (
              <ThemedText type="captionBold" themeColor="danger" accessibilityLiveRegion="polite">
                Chưa chốt được. {closeError}
              </ThemedText>
            ) : null}
            <Button
              title="Chốt quán"
              size="lg"
              icon={<Icon name="crown" size={18} color={t.tintText} />}
              loading={closing}
              onPress={() => {
                if (confirmId) void finish(confirmId);
              }}
            />
            <Button
              title="Chọn quán khác"
              variant="outline"
              disabled={closing}
              onPress={() => {
                setCloseError(null);
                setSheet({ step: 'pick' });
              }}
            />
          </View>
        ) : (
          <ScrollView style={styles.sheetList} contentContainerStyle={styles.sheetContent}>
            <ThemedText type="small" themeColor="textSecondary">
              {leaderId
                ? 'Chọn quán bạn muốn chốt.'
                : total
                  ? 'Đang hoà phiếu, bạn quyết định nhé!'
                  : 'Chưa ai bình chọn. Bạn có thể tự chốt một quán.'}
            </ThemedText>
            {poll.options.map((o) => {
              const p = places[o.place_id];
              return (
                <Pressable
                  key={o.place_id}
                  accessibilityRole="button"
                  accessibilityLabel={`Chốt ${p?.name ?? 'quán này'}, ${o.voters.length} phiếu`}
                  onPress={() => {
                    setCloseError(null);
                    setSheet({ step: 'confirm', placeId: o.place_id });
                  }}
                  style={({ pressed }) => [
                    styles.sheetRow,
                    { borderColor: t.border, backgroundColor: pressed ? t.backgroundElement : t.card },
                  ]}>
                  <ThemedText type="defaultBold" numberOfLines={1} style={styles.flex}>
                    {p?.name ?? 'Quán không còn hiển thị'}
                  </ThemedText>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {o.voters.length} phiếu
                  </ThemedText>
                  <Icon name="chevron-right" size={16} themeColor="textMuted" />
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </ModalSheet>
    </ThemedView>
  );
}

function OptionCard({
  option,
  place,
  total,
  leader,
  winner,
  open,
  voting,
  disabled,
  onVote,
}: {
  option: PollOption;
  place: PlaceWithRelations | undefined;
  total: number;
  leader: boolean;
  winner: boolean;
  open: boolean;
  voting: boolean;
  disabled: boolean;
  onVote: () => void;
}) {
  const t = useTheme();
  const count = option.voters.length;
  const pct = total ? Math.round((count / total) * 100) : 0;
  const price = place ? formatPriceRange(place) : '';
  const deal = place ? isDealActive(place) : false;
  const highlight = option.mine || winner;

  return (
    <View
      style={[
        styles.option,
        {
          backgroundColor: t.card,
          borderColor: highlight ? t.tint : t.cardBorder,
          borderWidth: highlight ? 2 : 1,
        },
        Shadows.soft,
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? `Bình chọn ${place?.name ?? 'quán này'}` : place?.name}
        accessibilityState={{ selected: option.mine, disabled: !open || disabled }}
        disabled={!open || disabled}
        onPress={onVote}
        style={({ pressed }) => [styles.optionMain, { opacity: pressed ? 0.85 : 1 }]}>
        <View style={styles.optionTop}>
          <View style={styles.thumbWrap}>
            {place?.cover_image_url ? (
              <Image source={{ uri: place.cover_image_url }} style={styles.thumb} contentFit="cover" transition={150} />
            ) : (
              <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: t.backgroundElement }]}>
                <Icon name="utensils-crossed" size={24} themeColor="textMuted" strokeWidth={1.5} />
              </View>
            )}
            {leader || winner ? (
              <View style={[styles.crown, { backgroundColor: t.tint, borderColor: t.card }]}>
                <Icon name={winner ? 'trophy' : 'crown'} size={14} color={t.tintText} />
              </View>
            ) : null}
          </View>

          <View style={styles.optionBody}>
            <ThemedText type="defaultBold" numberOfLines={2} style={styles.optionName}>
              {place?.name ?? 'Quán không còn hiển thị'}
            </ThemedText>
            {place ? (
              <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                {place.district}
                {price ? (
                  <ThemedText type="captionBold" style={{ color: t.tint }}>
                    {'  ·  '}
                    {price}
                  </ThemedText>
                ) : null}
              </ThemedText>
            ) : null}
            {deal && place?.deal_title ? (
              <View style={styles.dealRow}>
                <View style={[styles.dealTag, { backgroundColor: t.successSubtle }]}>
                  <Icon name="gift" size={12} themeColor="success" />
                  <ThemedText type="captionBold" numberOfLines={1} style={[styles.flexShrink, { color: t.success }]}>
                    {place.deal_title}
                  </ThemedText>
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.voteSide}>
            {voting ? (
              <ActivityIndicator size="small" color={t.tint} />
            ) : option.mine ? (
              <Icon name="square-check" size={26} color={t.tint} />
            ) : open ? (
              <Icon name="square" size={26} color={t.textMuted} />
            ) : null}
          </View>
        </View>

        {/* Thanh phiếu */}
        <View style={styles.barRow}>
          <View style={[styles.barTrack, { backgroundColor: t.backgroundElement }]}>
            <View
              style={[
                styles.barFill,
                { width: `${pct}%`, backgroundColor: leader || winner || option.mine ? t.tint : t.textMuted },
              ]}
            />
          </View>
          <ThemedText type="smallBold" style={styles.barCount} numberOfLines={1}>
            {count} phiếu
          </ThemedText>
        </View>

        {option.mine || count ? (
          <View style={styles.votersRow}>
            {option.mine ? (
              <View style={styles.mineTag}>
                <Icon name="check" size={13} themeColor="tint" />
                <ThemedText type="captionBold" style={{ color: t.tint }}>
                  Phiếu của bạn
                </ThemedText>
              </View>
            ) : null}
            {count ? (
              <ThemedText type="caption" themeColor="textSecondary" style={styles.voters} numberOfLines={3}>
                {option.voters.join(', ')}
              </ThemedText>
            ) : null}
          </View>
        ) : null}
      </Pressable>

      {place ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Xem quán ${place.name}`}
          onPress={() => router.push({ pathname: '/place/[id]', params: { id: place.id } })}
          style={({ pressed }) => [styles.viewLink, { borderTopColor: t.border, opacity: pressed ? 0.7 : 1 }]}>
          <ThemedText type="smallBold" style={{ color: t.tint }}>
            Xem quán
          </ThemedText>
          <Icon name="chevron-right" size={16} themeColor="tint" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shareBox: { borderWidth: 1.5, borderRadius: Radii.lg, padding: Spacing.three, gap: Spacing.two },
  shareHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  linkRow: { borderRadius: Radii.md, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 2, gap: 4 },
  linkText: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
  shareBtns: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  centerText: { textAlign: 'center' },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  stateIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateDesc: { maxWidth: 360, lineHeight: 22 },
  stateBtn: { minWidth: 220 },

  winner: {
    borderRadius: Radii.xl,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  winnerTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  trophy: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: { letterSpacing: 1.2 },
  winnerImage: { width: '100%', height: 160, borderRadius: Radii.lg },
  winnerMeta: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  directionsBtn: {
    minHeight: 56,
    borderRadius: Radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  winnerLink: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  header: { gap: Spacing.two },
  title: { fontSize: 26, lineHeight: 32 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two },

  nameCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  youRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
    borderRadius: Radii.md,
    minHeight: 44,
  },
  youEdit: {
    marginLeft: 'auto',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { letterSpacing: 0.8, marginTop: Spacing.one },
  nameBtns: { flexDirection: 'row', gap: Spacing.two },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radii.md,
  },

  options: { gap: Spacing.three },
  option: { borderRadius: Radii.lg, overflow: 'hidden' },
  optionMain: { padding: Spacing.three, gap: Spacing.two + 2 },
  optionTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  thumbWrap: { position: 'relative' },
  thumb: { width: 72, height: 72, borderRadius: Radii.md },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  crown: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBody: { flex: 1, minWidth: 0, gap: 3 },
  optionName: { fontSize: 16, lineHeight: 22 },
  dealRow: { flexDirection: 'row', marginTop: 2 },
  dealTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  voteSide: { width: 32, alignItems: 'center', justifyContent: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  barTrack: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  barCount: { minWidth: 56, textAlign: 'right' },
  votersRow: { gap: 4 },
  mineTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  voters: { lineHeight: 17 },
  viewLink: {
    minHeight: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  actions: { gap: Spacing.two + 2, marginTop: Spacing.two },

  sheetList: { maxHeight: 420 },
  sheetContent: { gap: Spacing.two },
  sheetRow: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
