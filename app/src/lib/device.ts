import { useSyncExternalStore } from 'react';

import { storage } from './local-storage';

// Mã máy ngẫu nhiên (không phải tài khoản): dùng để biết phiếu bầu nào là của mình,
// ai là người tạo bình chọn, và giới hạn spam. Lưu trên máy, xoá app là mất.
const DEVICE_KEY = 'device-id';
const NAME_KEY = 'my-display-name';

function uuid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function safeGet(k: string): string | null {
  try {
    return storage.getItem(k);
  } catch {
    return null;
  }
}
function safeSet(k: string, v: string) {
  try {
    storage.setItem(k, v);
  } catch {
    // bỏ qua
  }
}

let deviceId: string | null = null;
export function getDeviceId(): string {
  if (deviceId) return deviceId;
  deviceId = safeGet(DEVICE_KEY) || uuid();
  safeSet(DEVICE_KEY, deviceId);
  return deviceId;
}

// Tên hiển thị khi bình chọn (nhớ cho lần sau).
let name = safeGet(NAME_KEY) ?? '';
const listeners = new Set<() => void>();
export function setMyName(v: string) {
  name = v.trim().slice(0, 40);
  safeSet(NAME_KEY, name);
  listeners.forEach((l) => l());
}
export function useMyName(): string {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => name,
    () => ''
  );
}
