import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

import { useTheme } from '@/hooks/use-theme';
import type { Coords } from '@/lib/location';
import { buildMapHtml, type MapPin } from '@/lib/map-html';

/** Bản đồ quán (điện thoại): trang Leaflet trong WebView, bấm ghim → onSelect(id). */
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
  const html = useMemo(
    () => buildMapHtml({ pins, me, dark, tint: t.tint, tintText: t.tintText }),
    [pins, me, dark, t.tint, t.tintText]
  );
  return (
    <WebView
      originWhitelist={['*']}
      source={{ html, baseUrl: 'https://localhost/' }}
      style={[styles.map, { backgroundColor: t.background }]}
      onMessage={(e) => {
        try {
          const msg = JSON.parse(e.nativeEvent.data) as { type?: string; id?: string | null };
          if (msg.type === 'select') onSelect(msg.id ?? null);
        } catch {
          // bỏ qua tin nhắn không phải của bản đồ
        }
      }}
    />
  );
}

const styles = StyleSheet.create({ map: { flex: 1 } });
