/**
 * Lưới kéo-thả để sắp xếp thứ tự (ví dụ: ảnh của quán).
 *
 * - Cảm ứng (điện thoại, web trên điện thoại): giữ ~250ms trên một ô để nhấc lên rồi kéo.
 *   Chạm nhanh vẫn đi xuống các nút Pressable bên trong ô (chọn ảnh, nút xoá…).
 * - Chuột (web máy tính): nhấn giữ và di chuyển > 6px là bắt đầu kéo (giữ lâu cũng được).
 * - Chỉ dùng PanResponder + Animated của React Native nên chạy cả native lẫn web,
 *   không cần GestureHandlerRootView.
 *
 * Cách hoạt động: mỗi ô tự lắng nghe pha "capture" của hệ thống responder. Lúc chạm xuống ô
 * không giành responder (để nút bên trong và ScrollView cha hoạt động bình thường), chỉ hẹn giờ
 * nhấn giữ. Khi đã "nhấc" (hết giờ, hoặc chuột kéo đủ xa), lần di chuyển kế tiếp ô sẽ giành
 * responder và không nhả cho tới khi thả tay.
 */
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type PanResponderGestureState,
} from 'react-native';

import { Radii, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const LONG_PRESS_MS = 250;
const MOUSE_DRAG_SLOP = 6;
const TOUCH_CANCEL_SLOP = 10;
const CLICK_SUPPRESS_MS = 400;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const IS_WEB = Platform.OS === 'web';

type Point = { x: number; y: number };

export type SortableGridAction = {
  name: string;
  label: string;
  onAction: () => void;
};

export type SortableGridProps<T extends { key: string }> = {
  items: T[];
  /** Gọi một lần khi thả, chỉ khi vị trí thay đổi. Nên cập nhật `items` ngay (đồng bộ). */
  onReorder: (from: number, to: number) => void;
  /** Nội dung của một ô (kích thước ô do lưới quyết định: itemSize × itemSize). */
  renderItem: (item: T, index: number, state: { dragging: boolean }) => ReactNode;
  /** Cạnh ô vuông (px), mặc định 96. */
  itemSize?: number;
  /** Khoảng cách giữa các ô (px), mặc định 8. */
  gap?: number;
  /** Ô cuối không kéo được (ví dụ nút "Thêm ảnh"), cùng kích thước. */
  trailing?: ReactNode;
  disabled?: boolean;
  /**
   * Tuỳ chọn: báo khi một ô được nhấc lên (true) / thả ra (false). Dùng để tắt cuộn của
   * ScrollView cha (`scrollEnabled={!dragging}`) cho chắc chắn trên Android.
   */
  onDragActiveChange?: (active: boolean) => void;
  /** Tuỳ chọn: thêm hành động trợ năng cho từng ô (ví dụ "Xoá ảnh"), ngoài Chuyển trái/phải. */
  itemActions?: (item: T, index: number) => SortableGridAction[];
  /** Tuỳ chọn: nhãn trợ năng của từng ô (ví dụ "Ảnh 2 trên 5"). */
  itemAccessibilityLabel?: (item: T, index: number) => string;
};

export function SortableGrid<T extends { key: string }>({
  items,
  onReorder,
  renderItem,
  itemSize = 96,
  gap = 8,
  trailing,
  disabled,
  onDragActiveChange,
  itemActions,
  itemAccessibilityLabel,
}: SortableGridProps<T>) {
  const [width, setWidth] = useState(0);
  // Ô đang kéo (theo key) và vị trí đích hiện tại.
  const [drag, setDrag] = useState<{ key: string; to: number } | null>(null);

  // Key của ô đang nhấc/kéo (chỉ một ô một lúc).
  const activeKeyRef = useRef<string | null>(null);
  // Thời điểm thả gần nhất: chặn "click" giả ngay sau khi kéo trên web.
  const droppedAtRef = useRef(0);
  // Loại con trỏ của lần nhấn gần nhất (web): 'mouse' | 'touch' | 'pen'.
  const pointerTypeRef = useRef<string>('touch');
  const containerRef = useRef<ComponentRef<typeof View>>(null);

  const step = itemSize + gap;
  const cols = Math.max(1, Math.floor((width + gap) / step));
  const count = items.length;
  const totalSlots = count + (trailing != null ? 1 : 0);
  const rows = Math.ceil(totalSlots / cols);
  const height = rows > 0 ? rows * step - gap : 0;

  const slotPos = (slot: number): Point => ({
    x: (slot % cols) * step,
    y: Math.floor(slot / cols) * step,
  });

  // Ô đích theo toạ độ tâm của ô đang kéo (trong hệ toạ độ của lưới).
  const targetFor = (cx: number, cy: number): number => {
    const col = Math.min(cols - 1, Math.max(0, Math.floor((cx + gap / 2) / step)));
    const row = Math.max(0, Math.floor((cy + gap / 2) / step));
    return Math.min(count - 1, Math.max(0, row * cols + col));
  };

  const dragFrom = drag ? items.findIndex((it) => it.key === drag.key) : -1;
  const dragTo = drag && dragFrom >= 0 ? Math.min(Math.max(drag.to, 0), count - 1) : -1;

  // Vị trí hiển thị của ô thứ i khi đang kéo (các ô khác dạt sang để chừa chỗ).
  const slotOf = (i: number): number => {
    if (dragFrom < 0) return i;
    if (i === dragFrom) return dragTo;
    if (dragFrom < dragTo && i > dragFrom && i <= dragTo) return i - 1;
    if (dragFrom > dragTo && i >= dragTo && i < dragFrom) return i + 1;
    return i;
  };

  // Web: chặn cuộn trang / chọn chữ / kéo ảnh mặc định / menu chuột phải khi đang kéo.
  useEffect(() => {
    if (!IS_WEB) return;
    const el = containerRef.current as unknown as HTMLElement | null;
    if (!el?.addEventListener) return;
    const active = () => activeKeyRef.current != null;
    const onPointerDown = (e: PointerEvent) => {
      pointerTypeRef.current = e.pointerType || 'mouse';
    };
    const onTouchMove = (e: TouchEvent) => {
      if (active() && e.cancelable) e.preventDefault();
    };
    const preventIfActive = (e: Event) => {
      if (active()) e.preventDefault();
    };
    const onDragStart = (e: Event) => e.preventDefault();
    const onClick = (e: MouseEvent) => {
      if (Date.now() - droppedAtRef.current < CLICK_SUPPRESS_MS) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    el.addEventListener('pointerdown', onPointerDown, true);
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('contextmenu', preventIfActive);
    el.addEventListener('selectstart', preventIfActive);
    el.addEventListener('dragstart', onDragStart);
    el.addEventListener('click', onClick, true);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown, true);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('contextmenu', preventIfActive);
      el.removeEventListener('selectstart', preventIfActive);
      el.removeEventListener('dragstart', onDragStart);
      el.removeEventListener('click', onClick, true);
    };
  }, []);

  const controller: TileController = {
    isMouse: () => IS_WEB && pointerTypeRef.current === 'mouse',
    arm: (key) => {
      if (activeKeyRef.current != null && activeKeyRef.current !== key) return false;
      if (activeKeyRef.current == null) {
        activeKeyRef.current = key;
        onDragActiveChange?.(true);
      }
      return true;
    },
    disarm: (key) => {
      if (activeKeyRef.current !== key) return;
      activeKeyRef.current = null;
      // Nhấc lên rồi buông không kéo: trên web chặn luôn "click" theo sau (không chọn nhầm ô).
      droppedAtRef.current = Date.now();
      setDrag((d) => (d && d.key === key ? null : d));
      onDragActiveChange?.(false);
    },
    start: (key) => {
      const from = items.findIndex((it) => it.key === key);
      if (from >= 0) setDrag({ key, to: from });
    },
    move: (key, cx, cy) => {
      if (count === 0) return;
      const to = targetFor(cx, cy);
      setDrag((d) => (d && d.key === key && d.to !== to ? { key, to } : d));
    },
    drop: (key, cx, cy, cancel) => {
      const from = items.findIndex((it) => it.key === key);
      const to = cancel || from < 0 ? from : targetFor(cx, cy);
      if (activeKeyRef.current === key) {
        activeKeyRef.current = null;
        onDragActiveChange?.(false);
      }
      droppedAtRef.current = Date.now();
      setDrag(null);
      if (from >= 0 && to !== from) onReorder(from, to);
      return slotPos(Math.max(0, to));
    },
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setWidth((prev) => (prev === w ? prev : w));
  };

  return (
    <View
      ref={containerRef}
      onLayout={onLayout}
      style={[styles.container, { height: width > 0 ? height : itemSize }]}>
      {width > 0 &&
        items.map((item, index) => {
          const home = slotPos(index);
          const shown = slotPos(slotOf(index));
          const actions: SortableGridAction[] = [];
          if (!disabled && index > 0) {
            actions.push({
              name: 'moveLeft',
              label: 'Chuyển sang trái',
              onAction: () => onReorder(index, index - 1),
            });
          }
          if (!disabled && index < count - 1) {
            actions.push({
              name: 'moveRight',
              label: 'Chuyển sang phải',
              onAction: () => onReorder(index, index + 1),
            });
          }
          if (itemActions) actions.push(...itemActions(item, index));
          return (
            <SortableTile
              key={item.key}
              itemKey={item.key}
              x={shown.x}
              y={shown.y}
              homeX={home.x}
              homeY={home.y}
              size={itemSize}
              disabled={!!disabled}
              controller={controller}
              actions={actions}
              accessibilityLabel={itemAccessibilityLabel?.(item, index)}
              render={(dragging) => renderItem(item, index, { dragging })}
            />
          );
        })}
      {width > 0 && trailing != null && (
        <TrailingTile x={slotPos(count).x} y={slotPos(count).y} size={itemSize}>
          {trailing}
        </TrailingTile>
      )}
    </View>
  );
}

type TileController = {
  isMouse: () => boolean;
  /** Trả về false nếu đang có ô khác được kéo. */
  arm: (key: string) => boolean;
  disarm: (key: string) => void;
  start: (key: string) => void;
  move: (key: string, cx: number, cy: number) => void;
  /** Thả (hoặc huỷ): trả về vị trí ô sẽ nằm sau khi thả. */
  drop: (key: string, cx: number, cy: number, cancel: boolean) => Point;
};

/** Giữ props mới nhất cho các callback cử chỉ (tạo một lần), cập nhật sau mỗi lần render. */
class Latest<P> {
  value: P;
  constructor(value: P) {
    this.value = value;
  }
  set(value: P) {
    this.value = value;
  }
}

type TileProps = {
  itemKey: string;
  /** Vị trí hiển thị (đã tính chỗ dạt sang khi đang kéo ô khác). */
  x: number;
  y: number;
  /** Vị trí gốc theo thứ tự hiện tại. */
  homeX: number;
  homeY: number;
  size: number;
  disabled: boolean;
  controller: TileController;
  actions: SortableGridAction[];
  accessibilityLabel?: string;
  render: (dragging: boolean) => ReactNode;
};

function SortableTile(props: TileProps) {
  const { x, y, size, actions, accessibilityLabel, render } = props;
  const theme = useTheme();
  const [pos] = useState(() => new Animated.ValueXY({ x, y }));
  const [lift] = useState(() => new Animated.Value(0));
  // Đang nhấc lên (đã giữ đủ lâu) hoặc đang kéo.
  const [active, setActive] = useState(false);

  // Props mới nhất cho các callback của PanResponder (tạo một lần).
  const [latest] = useState(() => new Latest(props));
  useEffect(() => {
    latest.set(props);
  });

  const [responder] = useState(() => {
    // Trạng thái cử chỉ (biến cục bộ của responder, không phải state, không gây render).
    const g = {
      armed: false,
      dragging: false,
      timer: null as ReturnType<typeof setTimeout> | null,
      base: { x: 0, y: 0 } as Point,
      last: { x: 0, y: 0 } as Point,
    };

    const clearTimer = () => {
      if (g.timer != null) {
        clearTimeout(g.timer);
        g.timer = null;
      }
    };

    const arm = () => {
      clearTimer();
      if (g.armed) return true;
      const p = latest.value;
      if (p.disabled || !p.controller.arm(p.itemKey)) return false;
      g.armed = true;
      setActive(true);
      Animated.spring(lift, {
        toValue: 1,
        useNativeDriver: USE_NATIVE_DRIVER,
        speed: 28,
        bounciness: 6,
      }).start();
      return true;
    };

    const settle = (to: Point) => {
      Animated.spring(pos, {
        toValue: to,
        useNativeDriver: USE_NATIVE_DRIVER,
        speed: 22,
        bounciness: 4,
      }).start();
    };

    const lower = () => {
      setActive(false);
      Animated.spring(lift, {
        toValue: 0,
        useNativeDriver: USE_NATIVE_DRIVER,
        speed: 28,
        bounciness: 0,
      }).start();
    };

    // Thả tay khi chưa kéo (nhấc lên rồi buông, hoặc chạm nhanh): huỷ trạng thái nhấc.
    const disarm = () => {
      clearTimer();
      if (g.dragging || !g.armed) return;
      g.armed = false;
      lower();
      latest.value.controller.disarm(latest.value.itemKey);
    };

    const finish = (cancel: boolean) => {
      clearTimer();
      if (!g.dragging) {
        disarm();
        return;
      }
      g.dragging = false;
      g.armed = false;
      lower();
      const p = latest.value;
      const half = p.size / 2;
      const to = p.controller.drop(p.itemKey, g.last.x + half, g.last.y + half, cancel);
      settle(cancel ? { x: p.homeX, y: p.homeY } : to);
    };

    const r = PanResponder.create({
      // Không giành responder lúc chạm xuống: chỉ hẹn giờ nhấn giữ.
      onStartShouldSetPanResponderCapture: (e: GestureResponderEvent) => {
        clearTimer();
        if (g.dragging) return false;
        if (g.armed) disarm();
        const touches = e.nativeEvent.touches;
        if (latest.value.disabled || (touches && touches.length > 1)) return false;
        g.timer = setTimeout(() => {
          g.timer = null;
          arm();
        }, LONG_PRESS_MS);
        return false;
      },
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (
        e: GestureResponderEvent,
        gs: PanResponderGestureState,
      ) => {
        if (latest.value.disabled) return false;
        if (gs.numberActiveTouches > 1) {
          disarm();
          return false;
        }
        if (g.armed) return true;
        const dist = Math.hypot(gs.dx, gs.dy);
        if (latest.value.controller.isMouse()) {
          return dist > MOUSE_DRAG_SLOP ? arm() : false;
        }
        // Ngón tay đã di chuyển trước khi đủ thời gian giữ: người dùng đang cuộn trang.
        if (dist > TOUCH_CANCEL_SLOP) clearTimer();
        return false;
      },
      onMoveShouldSetPanResponder: () => g.armed,
      onPanResponderGrant: () => {
        const p = latest.value;
        g.dragging = true;
        pos.stopAnimation();
        g.base = { x: p.homeX, y: p.homeY };
        g.last = g.base;
        p.controller.start(p.itemKey);
      },
      onPanResponderMove: (_e: GestureResponderEvent, gs: PanResponderGestureState) => {
        if (!g.dragging) return;
        const p = latest.value;
        g.last = { x: g.base.x + gs.dx, y: g.base.y + gs.dy };
        pos.setValue(g.last);
        p.controller.move(p.itemKey, g.last.x + p.size / 2, g.last.y + p.size / 2);
      },
      // Đang kéo thì không nhả cho ScrollView cha.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderRelease: () => finish(false),
      onPanResponderTerminate: () => finish(true),
    });

    return {
      handlers: r.panHandlers,
      disarm,
      clearTimer,
      isDragging: () => g.dragging,
      forget: () => {
        const wasActive = g.armed || g.dragging;
        g.armed = false;
        g.dragging = false;
        return wasActive;
      },
    };
  });

  // Ô dạt sang chỗ mới khi thứ tự / số cột / vị trí đích thay đổi.
  useEffect(() => {
    if (responder.isDragging()) return;
    Animated.spring(pos, {
      toValue: { x, y },
      useNativeDriver: USE_NATIVE_DRIVER,
      speed: 22,
      bounciness: 3,
    }).start();
  }, [x, y, pos, responder]);

  // Ô bị gỡ khỏi lưới giữa chừng: dọn hẹn giờ và trả trạng thái kéo cho lưới.
  useEffect(() => {
    const { clearTimer, forget } = responder;
    return () => {
      clearTimer();
      if (forget()) latest.value.controller.disarm(latest.value.itemKey);
    };
  }, [responder, latest]);

  const scale = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });
  const opacity = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.92],
  });

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    actions.find((a) => a.name === e.nativeEvent.actionName)?.onAction();
  };

  return (
    <Animated.View
      {...responder.handlers}
      onTouchEnd={responder.disarm}
      onTouchCancel={responder.disarm}
      onPointerUp={responder.disarm}
      onPointerCancel={responder.disarm}
      accessible={!IS_WEB}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={props.disabled ? undefined : 'Giữ và kéo để đổi thứ tự'}
      accessibilityActions={actions.map(({ name, label }) => ({ name, label }))}
      onAccessibilityAction={onAccessibilityAction}
      style={[
        styles.tile,
        { width: size, height: size },
        active && [styles.tileActive, Shadows.strong, { backgroundColor: theme.card }],
        IS_WEB && (active ? styles.webGrabbing : props.disabled ? null : styles.webGrab),
        {
          opacity,
          transform: [{ translateX: pos.x }, { translateY: pos.y }, { scale }],
        },
      ]}>
      {render(active)}
    </Animated.View>
  );
}

function TrailingTile({
  x,
  y,
  size,
  children,
}: {
  x: number;
  y: number;
  size: number;
  children: ReactNode;
}) {
  const [pos] = useState(() => new Animated.ValueXY({ x, y }));
  useEffect(() => {
    Animated.spring(pos, {
      toValue: { x, y },
      useNativeDriver: USE_NATIVE_DRIVER,
      speed: 22,
      bounciness: 3,
    }).start();
  }, [x, y, pos]);
  return (
    <Animated.View
      style={[
        styles.tile,
        styles.trailing,
        {
          width: size,
          height: size,
          transform: [{ translateX: pos.x }, { translateY: pos.y }],
        },
      ]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'stretch',
    ...Platform.select({
      web: {
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      } as object,
    }),
  },
  tile: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 1,
    borderRadius: Radii.md,
  },
  tileActive: {
    zIndex: 100,
  },
  trailing: {
    zIndex: 0,
  },
  webGrab: { cursor: 'grab' } as object,
  webGrabbing: { cursor: 'grabbing' } as object,
});
