import { useEffect, useMemo, useRef } from 'react';

import { useTheme } from '@/hooks/use-theme';
import type { Coords } from '@/lib/location';
import { buildMapHtml, type MapPin } from '@/lib/map-html';

/**
 * Bản đồ quán (web): cùng trang Leaflet trong iframe. Cho phép cùng origin để yêu cầu ảnh nền
 * bản đồ có Referer (nhà cung cấp ảnh nền chặn yêu cầu không có Referer). Nội dung iframe do app tự tạo.
 */
export function PlacesMap({
  pins,
  me,
  dark,
  onSelect,
}: {
  pins: MapPin[];
  me: Coords | null;
  dark: boolean;
  onSelect: (id: string | null) => void;
}) {
  const t = useTheme();
  const frame = useRef<HTMLIFrameElement>(null);
  const html = useMemo(
    () => buildMapHtml({ pins, me, dark, tint: t.tint, tintText: t.tintText }),
    [pins, me, dark, t.tint, t.tintText]
  );

  // Giữ callback mới nhất mà không phải gỡ/gắn lại listener mỗi lần render.
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // Chỉ nhận tin nhắn từ đúng iframe bản đồ này.
      if (e.source !== frame.current?.contentWindow || typeof e.data !== 'string') return;
      try {
        const msg = JSON.parse(e.data) as { type?: string; id?: string | null };
        if (msg.type === 'select') onSelectRef.current(msg.id ?? null);
      } catch {
        // bỏ qua
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <iframe
      ref={frame}
      title="Bản đồ quán ăn"
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin"
      style={{ flex: 1, width: '100%', height: '100%', border: 0, background: t.background }}
    />
  );
}
