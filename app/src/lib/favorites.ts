import { useSyncExternalStore } from 'react';

import { storage } from './local-storage';

const KEY = 'favorite-place-ids';
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const raw = storage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

let cache = read();
const EMPTY: string[] = [];

function write(ids: string[]) {
  cache = ids;
  try {
    storage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // bỏ qua nếu không ghi được
  }
  listeners.forEach((l) => l());
}

export function toggleFavorite(id: string) {
  write(cache.includes(id) ? cache.filter((x) => x !== id) : [id, ...cache]);
}

/** Danh sách id quán yêu thích, lưu ngay trên máy (không cần tài khoản). */
export function useFavorites(): string[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => cache,
    () => EMPTY
  );
}
