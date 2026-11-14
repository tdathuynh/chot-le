import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImageManipulatorContext, ImageRef } from 'expo-image-manipulator';
import { useEffect, useReducer, useRef, useState } from 'react';
import type { ComponentRef, JSX } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type PanResponderGestureState,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Button, Chip } from '@/components/ui';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type EditedPhoto = { uri: string; mimeType: string; width: number; height: number };
/** 'free' = giữ nguyên toàn bộ ảnh (không cắt), vẫn xoay/lật được. */
export type CropAspect = 'free' | '4:3' | '1:1' | '16:9';

type PhotoEditorProps = {
  visible: boolean;
  /** Uri cục bộ từ expo-image-picker (file:// trên điện thoại, blob:/data: trên web). */
  uri: string | null;
  /** Mặc định '4:3'. */
  initialAspect?: CropAspect;
  title?: string;
  onCancel: () => void;
  onDone: (photo: EditedPhoto) => void;
};

// ---- Hằng số ----

const ASPECTS: { value: CropAspect; label: string }[] = [
  { value: 'free', label: 'Gốc' },
  { value: '4:3', label: '4:3' },
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
];
const RATIOS: Record<Exclude<CropAspect, 'free'>, number> = { '4:3': 4 / 3, '1:1': 1, '16:9': 16 / 9 };

const MAX_ZOOM = 5;
const ZOOM_STEP = 1.25;
/** Cạnh dài nhất của ảnh xuất ra. */
const MAX_OUTPUT_SIDE = 1600;
const JPEG_QUALITY = 0.8;
/** Khoảng chừa quanh khung cắt trong vùng ảnh. */
const STAGE_PAD_X = 20;
const STAGE_PAD_Y = 24;

// Vùng ảnh luôn tối như trình chỉnh ảnh trên điện thoại (không theo light/dark).
const STAGE_BG = Colors.dark.background;
const FRAME_LINE = Colors.dark.text;
const MASK = 'rgba(0, 0, 0, 0.62)';
const GRID_LINE = 'rgba(255, 255, 255, 0.38)';

// ---- Trạng thái chỉnh ảnh (reducer thuần, dễ kẹp pan/zoom) ----

type EditorState = {
  natW: number; // kích thước gốc của ảnh (chưa xoay)
  natH: number;
  stageW: number; // kích thước vùng hiển thị
  stageH: number;
  aspect: CropAspect;
  rotation: 0 | 90 | 180 | 270; // theo chiều kim đồng hồ, áp dụng TRƯỚC khi lật
  flipped: boolean; // lật ngang (sau khi xoay)
  zoom: number; // 1 = ảnh vừa phủ kín khung
  ox: number; // độ lệch tâm ảnh so với tâm khung (px màn hình)
  oy: number;
};

type EditorAction =
  | { type: 'natural'; w: number; h: number }
  | { type: 'stage'; w: number; h: number }
  | { type: 'pan'; dx: number; dy: number }
  | { type: 'zoom'; factor: number }
  | { type: 'rotate'; dir: 1 | -1 }
  | { type: 'flip' }
  | { type: 'aspect'; aspect: CropAspect }
  | { type: 'reset'; aspect: CropAspect };

type Geometry = {
  rw: number; // kích thước ảnh sau khi xoay
  rh: number;
  frameW: number;
  frameH: number;
  scale: number; // px màn hình / px ảnh
  maxOx: number;
  maxOy: number;
};

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function geometry(s: EditorState): Geometry | null {
  if (!s.natW || !s.natH || !s.stageW || !s.stageH) return null;
  const turned = s.rotation % 180 !== 0;
  const rw = turned ? s.natH : s.natW;
  const rh = turned ? s.natW : s.natH;
  const ratio = s.aspect === 'free' ? rw / rh : RATIOS[s.aspect];
  const availW = Math.max(s.stageW - STAGE_PAD_X * 2, 40);
  const availH = Math.max(s.stageH - STAGE_PAD_Y * 2, 40);
  const frameW = Math.min(availW, availH * ratio);
  const frameH = frameW / ratio;
  // Phủ kín khung (với 'free' khung đúng tỉ lệ ảnh → vừa khít).
  const scale = Math.max(frameW / rw, frameH / rh) * s.zoom;
  return {
    rw,
    rh,
    frameW,
    frameH,
    scale,
    maxOx: Math.max(0, (rw * scale - frameW) / 2),
    maxOy: Math.max(0, (rh * scale - frameH) / 2),
  };
}

/** Kẹp zoom/pan để ảnh luôn phủ kín khung, không lộ khoảng trống. */
function clampState(s: EditorState): EditorState {
  const zoom = s.aspect === 'free' ? 1 : clamp(s.zoom, 1, MAX_ZOOM);
  const next = { ...s, zoom };
  const g = geometry(next);
  if (!g) return next;
  return {
    ...next,
    ox: s.aspect === 'free' ? 0 : clamp(s.ox, -g.maxOx, g.maxOx),
    oy: s.aspect === 'free' ? 0 : clamp(s.oy, -g.maxOy, g.maxOy),
  };
}

function reducer(s: EditorState, a: EditorAction): EditorState {
  switch (a.type) {
    case 'natural':
      return clampState({ ...s, natW: a.w, natH: a.h });
    case 'stage':
      if (a.w === s.stageW && a.h === s.stageH) return s;
      return clampState({ ...s, stageW: a.w, stageH: a.h });
    case 'pan':
      return clampState({ ...s, ox: s.ox + a.dx, oy: s.oy + a.dy });
    case 'zoom': {
      const zoom = clamp(s.zoom * a.factor, 1, MAX_ZOOM);
      const k = zoom / s.zoom; // phóng quanh tâm khung
      return clampState({ ...s, zoom, ox: s.ox * k, oy: s.oy * k });
    }
    case 'rotate': {
      // Khi đã lật, xoay ngược dấu để trên màn hình vẫn đúng chiều người dùng bấm.
      const step = (s.flipped ? -a.dir : a.dir) * 90;
      const rotation = (((s.rotation + step) % 360) + 360) % 360 as EditorState['rotation'];
      // Xoay luôn độ lệch để giữ phần ảnh đang chọn.
      const ox = a.dir === 1 ? -s.oy : s.oy;
      const oy = a.dir === 1 ? s.ox : -s.ox;
      return clampState({ ...s, rotation, ox, oy });
    }
    case 'flip':
      return clampState({ ...s, flipped: !s.flipped, ox: -s.ox });
    case 'aspect':
      return clampState({ ...s, aspect: a.aspect });
    case 'reset':
      return clampState({ ...s, aspect: a.aspect, rotation: 0, flipped: false, zoom: 1, ox: 0, oy: 0 });
  }
}

// ---- Component chính ----

/**
 * Trình chỉnh ảnh toàn màn hình: chọn tỉ lệ cắt, kéo/phóng ảnh trong khung, xoay 90°, lật ngang.
 * Bấm "Xong" → xoay → lật → cắt → thu nhỏ (cạnh dài ≤ 1600px) → JPEG.
 */
export function PhotoEditor({
  visible,
  uri,
  initialAspect = '4:3',
  title = 'Chỉnh ảnh',
  onCancel,
  onDone,
}: PhotoEditorProps): JSX.Element {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onCancel}>
      <SafeAreaProvider>
        {/* key theo uri: mở ảnh mới → trạng thái chỉnh sửa tự đặt lại. */}
        {visible && uri ? (
          <EditorBody
            key={uri}
            uri={uri}
            initialAspect={initialAspect}
            title={title}
            onCancel={onCancel}
            onDone={onDone}
          />
        ) : (
          <View style={[styles.fill, { backgroundColor: STAGE_BG }]} />
        )}
      </SafeAreaProvider>
    </Modal>
  );
}

function EditorBody({
  uri,
  initialAspect,
  title,
  onCancel,
  onDone,
}: {
  uri: string;
  initialAspect: CropAspect;
  title: string;
  onCancel: () => void;
  onDone: (photo: EditedPhoto) => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [state, dispatch] = useReducer(reducer, null, () => ({
    natW: 0,
    natH: 0,
    stageW: 0,
    stageH: 0,
    aspect: initialAspect,
    rotation: 0 as const,
    flipped: false,
    zoom: 1,
    ox: 0,
    oy: 0,
  }));
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lấy kích thước gốc của ảnh (callback chạy được cả native và web).
  useEffect(() => {
    let alive = true;
    Image.getSize(
      uri,
      (w, h) => {
        if (alive) dispatch({ type: 'natural', w, h });
      },
      () => {
        if (alive) setLoadError(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [uri]);

  // Cử chỉ: 1 ngón/chuột = kéo, 2 ngón = chụm phóng to. PanResponder chạy cả native lẫn web.
  const [responder] = useState(() => {
    // Mốc cử chỉ hiện tại (biến cục bộ của responder, không phải state).
    const ref = { dx: 0, dy: 0, pinchDist: 0 };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        ref.dx = 0;
        ref.dy = 0;
        ref.pinchDist = 0;
      },
      onPanResponderMove: (e: GestureResponderEvent, g: PanResponderGestureState) => {
        const touches = e.nativeEvent.touches ?? [];
        if (touches.length >= 2) {
          const dist = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY,
          );
          if (ref.pinchDist > 0 && dist > 0) dispatch({ type: 'zoom', factor: dist / ref.pinchDist });
          ref.pinchDist = dist;
          ref.dx = g.dx;
          ref.dy = g.dy;
          return;
        }
        if (ref.pinchDist > 0) {
          // Vừa nhấc bớt một ngón: lấy mốc mới để ảnh không bị giật.
          ref.pinchDist = 0;
          ref.dx = g.dx;
          ref.dy = g.dy;
          return;
        }
        dispatch({ type: 'pan', dx: g.dx - ref.dx, dy: g.dy - ref.dy });
        ref.dx = g.dx;
        ref.dy = g.dy;
      },
    });
  });

  // Web: cuộn chuột / chụm trên touchpad để phóng to.
  const stageRef = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = stageRef.current as unknown as HTMLElement | null;
    if (!el?.addEventListener) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      dispatch({ type: 'zoom', factor: Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)) });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onStageLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    dispatch({ type: 'stage', w: Math.round(width), h: Math.round(height) });
  };

  const g = geometry(state);
  const isFree = state.aspect === 'free';

  async function handleDone() {
    if (busy || !g) return;
    setBusy(true);
    setError(null);
    const toRelease: { release: () => void }[] = [];
    try {
      // Bước 1: xoay + lật để có ảnh đúng hướng như trên màn hình (lấy kích thước thật sau xoay).
      const ctx1: ImageManipulatorContext = ImageManipulator.manipulate(uri);
      toRelease.push(ctx1);
      if (state.rotation) ctx1.rotate(state.rotation);
      if (state.flipped) ctx1.flip('horizontal');
      const oriented: ImageRef = await ctx1.renderAsync();
      toRelease.push(oriented);
      const RW = oriented.width;
      const RH = oriented.height;

      // Bước 2: tính vùng cắt theo tỉ lệ (0..1) của ảnh đã xoay → đổi ra pixel ảnh thật.
      let cropW = RW;
      let cropH = RH;
      let originX = 0;
      let originY = 0;
      if (!isFree) {
        const dispW = g.rw * g.scale;
        const dispH = g.rh * g.scale;
        const fx = (dispW / 2 - state.ox - g.frameW / 2) / dispW;
        const fy = (dispH / 2 - state.oy - g.frameH / 2) / dispH;
        originX = clamp(Math.round(fx * RW), 0, RW - 1);
        originY = clamp(Math.round(fy * RH), 0, RH - 1);
        cropW = clamp(Math.round((g.frameW / dispW) * RW), 1, RW - originX);
        cropH = clamp(Math.round((g.frameH / dispH) * RH), 1, RH - originY);
      }

      // Bước 3: cắt + thu nhỏ + lưu JPEG.
      const ctx2 = ImageManipulator.manipulate(oriented);
      toRelease.push(ctx2);
      if (!isFree) ctx2.crop({ originX, originY, width: cropW, height: cropH });
      if (Math.max(cropW, cropH) > MAX_OUTPUT_SIDE) {
        ctx2.resize(cropW >= cropH ? { width: MAX_OUTPUT_SIDE } : { height: MAX_OUTPUT_SIDE });
      }
      const finalRef = await ctx2.renderAsync();
      toRelease.push(finalRef);
      const result = await finalRef.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
      setBusy(false);
      onDone({ uri: result.uri, mimeType: 'image/jpeg', width: result.width, height: result.height });
    } catch (e) {
      console.warn('PhotoEditor', e);
      setBusy(false);
      setError('Không xử lý được ảnh. Thử lại hoặc chọn ảnh khác.');
    } finally {
      // Giải phóng bộ nhớ ảnh trung gian (ảnh đã lưu vẫn dùng được).
      for (const o of toRelease) {
        try {
          o.release();
        } catch {
          // bỏ qua
        }
      }
    }
  }

  const disabled = busy || !g;
  const zoomPct = Math.round(state.zoom * 100);
  const zoomFill = (state.zoom - 1) / (MAX_ZOOM - 1);

  return (
    <View style={[styles.fill, { backgroundColor: t.background }]}>
      {/* Thanh trên: Hủy | tiêu đề | Xong */}
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + Spacing.two, borderBottomColor: t.border, backgroundColor: t.background },
        ]}>
        <View style={styles.topSide}>
          <Button title="Hủy" variant="secondary" size="sm" onPress={onCancel} />
        </View>
        <ThemedText type="defaultBold" numberOfLines={1} style={styles.topTitle} accessibilityRole="header">
          {title}
        </ThemedText>
        <View style={[styles.topSide, styles.topRight]}>
          <Button
            title="Xong"
            size="sm"
            onPress={handleDone}
            loading={busy}
            disabled={disabled}
            style={styles.doneBtn}
          />
        </View>
      </View>

      {/* Vùng ảnh */}
      <View
        ref={stageRef}
        style={[styles.stage, { backgroundColor: STAGE_BG }]}
        onLayout={onStageLayout}
        {...(isFree || busy ? {} : responder.panHandlers)}>
        {loadError ? (
          <View style={styles.stageCenter}>
            <Icon name="triangle-alert" size={28} color={FRAME_LINE} />
            <ThemedText type="small" style={{ color: FRAME_LINE, textAlign: 'center' }}>
              Không mở được ảnh này. Hãy chọn ảnh khác.
            </ThemedText>
          </View>
        ) : !g ? (
          <View style={styles.stageCenter}>
            <ActivityIndicator color={FRAME_LINE} />
          </View>
        ) : (
          <StageContent uri={uri} state={state} g={g} />
        )}
        {busy ? (
          <View style={[StyleSheet.absoluteFill, styles.stageCenter, styles.busyLayer]} pointerEvents="none">
            <ActivityIndicator size="large" color={FRAME_LINE} />
            <ThemedText type="small" style={{ color: FRAME_LINE }}>
              Đang xử lý ảnh…
            </ThemedText>
          </View>
        ) : null}
      </View>

      {/* Thanh công cụ dưới */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + Spacing.three, borderTopColor: t.border, backgroundColor: t.background },
        ]}>
        <View style={styles.bottomInner}>
          {error ? (
            <View
              accessibilityRole="alert"
              style={[styles.errorBox, { backgroundColor: t.dangerSubtle }]}>
              <Icon name="triangle-alert" size={18} color={t.danger} />
              <ThemedText type="small" style={{ color: t.danger, flex: 1 }}>
                {error}
              </ThemedText>
            </View>
          ) : null}

          {/* Phóng to / thu nhỏ */}
          <View style={styles.zoomRow}>
            <ToolIconButton
              icon="zoom-out"
              label="Thu nhỏ ảnh"
              disabled={disabled || isFree || state.zoom <= 1}
              onPress={() => dispatch({ type: 'zoom', factor: 1 / ZOOM_STEP })}
            />
            <View style={styles.zoomMid}>
              <View style={[styles.zoomTrack, { backgroundColor: t.backgroundSelected }]}>
                <View
                  style={[
                    styles.zoomFill,
                    { backgroundColor: isFree ? t.textMuted : t.tint, width: `${Math.round(zoomFill * 100)}%` },
                  ]}
                />
              </View>
              <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                {isFree
                  ? 'Gốc: giữ nguyên toàn bộ ảnh'
                  : `${zoomPct}% · ${Platform.OS === 'web' ? 'Kéo để di chuyển, cuộn để phóng' : 'Kéo để di chuyển, chụm để phóng'}`}
              </ThemedText>
            </View>
            <ToolIconButton
              icon="zoom-in"
              label="Phóng to ảnh"
              disabled={disabled || isFree || state.zoom >= MAX_ZOOM}
              onPress={() => dispatch({ type: 'zoom', factor: ZOOM_STEP })}
            />
          </View>

          {/* Tỉ lệ cắt */}
          <View style={styles.chipRow} accessibilityLabel="Tỉ lệ cắt ảnh">
            {ASPECTS.map((a) => (
              <Chip
                key={a.value}
                label={a.label}
                selected={state.aspect === a.value}
                icon={
                  a.value === 'free' ? (
                    <Icon
                      name="images"
                      size={16}
                      color={state.aspect === a.value ? t.tintText : t.textSecondary}
                    />
                  ) : undefined
                }
                onPress={() => !busy && dispatch({ type: 'aspect', aspect: a.value })}
                style={styles.chip}
              />
            ))}
          </View>

          {/* Xoay / lật / đặt lại */}
          <View style={styles.toolRow}>
            <ToolButton
              icon="rotate-ccw"
              label="Xoay trái"
              a11y="Xoay trái 90 độ"
              disabled={disabled}
              onPress={() => dispatch({ type: 'rotate', dir: -1 })}
            />
            <ToolButton
              icon="rotate-cw"
              label="Xoay phải"
              a11y="Xoay phải 90 độ"
              disabled={disabled}
              onPress={() => dispatch({ type: 'rotate', dir: 1 })}
            />
            <ToolButton
              icon="flip-horizontal-2"
              label="Lật ngang"
              a11y="Lật ảnh theo chiều ngang"
              active={state.flipped}
              disabled={disabled}
              onPress={() => dispatch({ type: 'flip' })}
            />
            <ToolButton
              icon="undo-2"
              label="Đặt lại"
              a11y="Đặt lại mọi chỉnh sửa"
              disabled={disabled}
              onPress={() => {
                setError(null);
                dispatch({ type: 'reset', aspect: initialAspect });
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

/** Ảnh + lớp tối bên ngoài khung + lưới 1/3. Không nhận chạm (cử chỉ nằm ở vùng ảnh cha). */
function StageContent({ uri, state, g }: { uri: string; state: EditorState; g: Geometry }) {
  const { stageW, stageH, natW, natH, rotation, flipped, ox, oy } = state;
  const imgW = natW * g.scale; // kích thước ảnh CHƯA xoay trên màn hình
  const imgH = natH * g.scale;
  const cx = stageW / 2 + ox;
  const cy = stageH / 2 + oy;
  const fl = (stageW - g.frameW) / 2;
  const ft = (stageH - g.frameH) / 2;
  const isFree = state.aspect === 'free';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={{ uri }}
        resizeMode="stretch"
        accessibilityIgnoresInvertColors
        style={{
          position: 'absolute',
          left: cx - imgW / 2,
          top: cy - imgH / 2,
          width: imgW,
          height: imgH,
          // Thứ tự transform: xoay trước, rồi lật ngang (giống thứ tự khi xuất ảnh).
          transform: [{ scaleX: flipped ? -1 : 1 }, { rotate: `${rotation}deg` }],
        }}
      />
      {isFree ? null : (
        <>
          {/* Lớp tối 4 phía quanh khung */}
          <View style={[styles.mask, { left: 0, top: 0, right: 0, height: ft }]} />
          <View style={[styles.mask, { left: 0, bottom: 0, right: 0, height: ft }]} />
          <View style={[styles.mask, { left: 0, top: ft, width: fl, height: g.frameH }]} />
          <View style={[styles.mask, { right: 0, top: ft, width: fl, height: g.frameH }]} />
          {/* Khung + lưới 1/3 + góc đậm */}
          <View style={[styles.frame, { left: fl, top: ft, width: g.frameW, height: g.frameH }]}>
            <View style={[styles.gridV, { left: '33.333%' }]} />
            <View style={[styles.gridV, { left: '66.666%' }]} />
            <View style={[styles.gridH, { top: '33.333%' }]} />
            <View style={[styles.gridH, { top: '66.666%' }]} />
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </>
      )}
    </View>
  );
}

/** Nút công cụ: icon trong ô 44px + nhãn tiếng Việt bên dưới. */
function ToolButton({
  icon,
  label,
  a11y,
  active,
  disabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  a11y: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.tool, { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}>
      <View
        style={[
          styles.toolIcon,
          { backgroundColor: active ? t.tintSubtle : t.backgroundElement, borderColor: active ? t.tint : 'transparent' },
        ]}>
        <Icon name={icon} size={22} color={active ? t.tint : t.text} />
      </View>
      <ThemedText type="caption" themeColor={active ? 'tint' : 'textSecondary'} numberOfLines={1}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** Nút tròn chỉ có icon (phóng to/thu nhỏ). */
function ToolIconButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconBtn,
        { backgroundColor: t.backgroundElement, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}>
      <Icon name={icon} size={20} color={t.text} />
    </Pressable>
  );
}

const CORNER = 18;
const CORNER_W = 3;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topSide: { minWidth: 76, flexDirection: 'row' },
  topRight: { justifyContent: 'flex-end' },
  topTitle: { flex: 1, textAlign: 'center' },
  doneBtn: { minWidth: 76 },
  stage: {
    flex: 1,
    overflow: 'hidden',
    ...Platform.select({ web: { cursor: 'grab', touchAction: 'none', userSelect: 'none' } as object }),
  },
  stageCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  busyLayer: { backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  mask: { position: 'absolute', backgroundColor: MASK },
  frame: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: FRAME_LINE,
  },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: GRID_LINE },
  gridH: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: GRID_LINE },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: FRAME_LINE },
  cornerTL: { left: -CORNER_W, top: -CORNER_W, borderLeftWidth: CORNER_W, borderTopWidth: CORNER_W },
  cornerTR: { right: -CORNER_W, top: -CORNER_W, borderRightWidth: CORNER_W, borderTopWidth: CORNER_W },
  cornerBL: { left: -CORNER_W, bottom: -CORNER_W, borderLeftWidth: CORNER_W, borderBottomWidth: CORNER_W },
  cornerBR: { right: -CORNER_W, bottom: -CORNER_W, borderRightWidth: CORNER_W, borderBottomWidth: CORNER_W },
  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  bottomInner: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: Spacing.three,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radii.md,
  },
  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  zoomMid: { flex: 1, gap: 6, alignItems: 'center' },
  zoomTrack: { alignSelf: 'stretch', height: 4, borderRadius: 2, overflow: 'hidden' },
  zoomFill: { height: 4, borderRadius: 2 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  chip: { minWidth: 64, justifyContent: 'center' },
  toolRow: { flexDirection: 'row', justifyContent: 'space-between' },
  tool: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  toolIcon: {
    width: 48,
    height: 44,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
