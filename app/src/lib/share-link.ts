import * as Linking from 'expo-linking';
import { Platform, Share } from 'react-native';

/** Link mở bình chọn: bạn bè bấm là vào được (bản web, không cần cài app). */
export function pollUrl(id: string): string {
  const path = `/vote/${encodeURIComponent(id)}`;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin + path;
  }
  const web = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/+$/, '');
  if (web) return web + path;
  return Linking.createURL(path);
}

/** Chép chữ vào bộ nhớ tạm (web). Trả về false nếu trình duyệt chặn. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // trình duyệt / webview chặn quyền clipboard
  }
  return false;
}

function isCancel(e: unknown): boolean {
  const name = (e as { name?: string } | null)?.name;
  const msg = String((e as { message?: string } | null)?.message ?? e).toLowerCase();
  return name === 'AbortError' || msg.includes('cancel') || msg.includes('abort');
}

/** Máy/trình duyệt có bảng chia sẻ hệ thống không (web: navigator.share). */
export function canNativeShare(): boolean {
  if (Platform.OS !== 'web') return true;
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

/**
 * Gửi link bình chọn qua Zalo/Messenger…
 * Web không có bảng chia sẻ → chép link. KHÔNG bao giờ ném lỗi và không dùng
 * prompt/alert (nhiều webview như Zalo chặn) — màn hình tự hiện phản hồi theo kết quả.
 */
export async function sharePoll(id: string, title: string): Promise<ShareResult> {
  const url = pollUrl(id);
  const name = title.trim() || 'Đi ăn gì đây?';
  const message = `Đi ăn hông? Chốt lẹ: ${name}\nBấm để bình chọn quán: ${url}`;

  if (Platform.OS === 'web') {
    if (canNativeShare()) {
      try {
        await navigator.share({ title: `Chốt Lẹ: ${name}`, text: `Đi ăn hông? Chốt lẹ: ${name}`, url });
        return 'shared';
      } catch (e) {
        if (isCancel(e)) return 'cancelled';
        // share lỗi (vd không có thao tác của người dùng) → chép link
      }
    }
    return (await copyText(message)) ? 'copied' : 'failed';
  }

  try {
    const r = await Share.share(
      Platform.OS === 'ios' ? { message: `Đi ăn hông? Chốt lẹ: ${name}`, url } : { message, title: name },
      { dialogTitle: 'Gửi link cho bạn bè' }
    );
    return r.action === Share.dismissedAction ? 'cancelled' : 'shared';
  } catch (e) {
    return isCancel(e) ? 'cancelled' : 'failed';
  }
}
