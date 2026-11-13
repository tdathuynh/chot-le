import * as Location from 'expo-location';
import { useSyncExternalStore } from 'react';

import type { Place } from './types';

export type Coords = { latitude: number; longitude: number };

export type LocationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'granted'; coords: Coords }
  | { status: 'denied' }
  | { status: 'error'; message: string };

// Vị trí người dùng: giữ trong bộ nhớ cho cả phiên, các màn hình dùng chung.
let state: LocationState = { status: 'idle' };
const listeners = new Set<() => void>();

function set(next: LocationState) {
  state = next;
  listeners.forEach((l) => l());
}

/** Hỏi quyền và lấy vị trí hiện tại. Gọi khi người dùng bấm "Gần tôi". */
export async function requestLocation(): Promise<Coords | null> {
  if (state.status === 'loading') return null;
  set({ status: 'loading' });
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      set({ status: 'denied' });
      return null;
    }
    // Vị trí cũ (≤ 5 phút) trả về ngay; nếu không có thì lấy vị trí mới.
    const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 }).catch(() => null);
    const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    set({ status: 'granted', coords });
    return coords;
  } catch (e) {
    set({ status: 'error', message: e instanceof Error ? e.message : 'Không lấy được vị trí' });
    return null;
  }
}

export function useUserLocation(): LocationState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state
  );
}

/** Khoảng cách đường chim bay (km), công thức haversine. */
export function distanceKm(a: Coords, b: Coords): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Khoảng cách từ người dùng tới quán; null nếu thiếu toạ độ. */
export function placeDistance(p: Pick<Place, 'latitude' | 'longitude'>, me: Coords | null | undefined): number | null {
  if (!me || p.latitude == null || p.longitude == null) return null;
  return distanceKm(me, { latitude: p.latitude, longitude: p.longitude });
}

/** 0.65 → "650 m", 1.234 → "1,2 km", 12.6 → "13 km" */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}

/**
 * Lấy toạ độ từ link Google Maps dạng đầy đủ:
 * ".../@10.77,106.70,17z", "...!3d10.77!4d106.70", "?q=10.77,106.70", "?ll=10.77,106.70".
 * Link rút gọn (maps.app.goo.gl) không chứa toạ độ → trả null.
 */
export function coordsFromMapsUrl(url: string | null | undefined): Coords | null {
  if (!url) return null;
  const s = decodeURIComponent(url);
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|ll|query|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) {
      const latitude = Number(m[1]);
      const longitude = Number(m[2]);
      if (Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) return { latitude, longitude };
    }
  }
  return null;
}

/** "10.7769, 106.7009" → toạ độ (dùng cho ô nhập tay trong form admin). */
export function parseCoords(text: string): Coords | null {
  const m = text.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return coordsFromMapsUrl(text);
  const latitude = Number(m[1]);
  const longitude = Number(m[2]);
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null;
}

/** Link chỉ đường: ưu tiên link Google Maps admin nhập, sau đó toạ độ, cuối cùng tên + địa chỉ. */
export function directionsUrl(p: Pick<Place, 'google_maps_url' | 'latitude' | 'longitude' | 'name' | 'address' | 'district'>) {
  if (p.google_maps_url) return p.google_maps_url;
  const q =
    p.latitude != null && p.longitude != null
      ? `${p.latitude},${p.longitude}`
      : `${p.name}, ${p.address}, ${p.district}, TP. Hồ Chí Minh`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
