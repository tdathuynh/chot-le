// Web: dùng localStorage của trình duyệt (bỏ qua khi render phía server).
const memory = new Map<string, string>();
const fallback: Storage = {
  get length() {
    return memory.size;
  },
  clear: () => memory.clear(),
  getItem: (k) => memory.get(k) ?? null,
  key: (i) => Array.from(memory.keys())[i] ?? null,
  removeItem: (k) => void memory.delete(k),
  setItem: (k, v) => void memory.set(k, String(v)),
};

function pick(): Storage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {
    // trình duyệt chặn storage → dùng bộ nhớ tạm
  }
  return fallback;
}

export const storage: Storage = pick();
