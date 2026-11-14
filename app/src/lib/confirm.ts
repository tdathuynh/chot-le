import { Alert, Platform } from 'react-native';

/** Hộp thoại xác nhận chạy được cả trên web lẫn điện thoại. */
export function confirmAsync(title: string, message: string, okLabel = 'Đồng ý'): Promise<boolean> {
  if (Platform.OS === 'web') {
    // Một số webview (Zalo, Messenger…) chặn hộp thoại → coi như Hủy (an toàn cho thao tác xoá).
    try {
      return Promise.resolve(window.confirm(`${title}\n\n${message}`));
    } catch {
      return Promise.resolve(false);
    }
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Hủy', style: 'cancel', onPress: () => resolve(false) },
      { text: okLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    try {
      window.alert(message ? `${title}\n\n${message}` : title);
    } catch {
      // webview chặn alert: bỏ qua, không làm vỡ màn hình
    }
  } else Alert.alert(title, message);
}
