import { Platform } from 'react-native';

import { trackVisit } from './api';

// Nguồn của lượt vào app, để biết người dùng đến từ TikTok, Zalo, Facebook…
// Trình duyệt trong app TikTok/Zalo thường KHÔNG gửi trang giới thiệu (referrer), nên link
// đặt ở bio/bài đăng nên kèm ?utm_source=tiktok (hoặc ?ref=tiktok) để đếm chính xác.

const KNOWN_HOSTS: [RegExp, string][] = [
  [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)zalo\.(me|vn)$|(^|\.)zaloapp\.com$/, 'zalo'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, 'facebook'],
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
  [/(^|\.)(threads\.net|threads\.com)$/, 'threads'],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, 'x'],
  [/(^|\.)google\.[a-z.]+$/, 'google'],
  [/(^|\.)(bing\.com|coccoc\.com)$/, 'tim-kiem'],
];

function clean(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** Nguồn trên web: ?utm_source / ?ref / ?src → trang giới thiệu → "truc-tiep". */
export function detectWebSource(search: string, referrer: string, ownHost: string): string {
  const q = new URLSearchParams(search);
  const tagged = q.get('utm_source') || q.get('ref') || q.get('src');
  if (tagged && clean(tagged)) return clean(tagged);
  if (referrer) {
    try {
      const host = new URL(referrer).hostname.replace(/^www\./, '');
      if (host && host !== ownHost.replace(/^www\./, '')) {
        for (const [re, name] of KNOWN_HOSTS) if (re.test(host)) return name;
        return clean(host) || 'khac';
      }
    } catch {
      // referrer lạ → coi như vào thẳng
    }
  }
  return 'truc-tiep';
}

let sent = false;

/** Ghi 1 lượt vào app cho lần mở này (gọi 1 lần ở layout gốc). */
export function recordVisit() {
  if (sent) return;
  sent = true;
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    const { search, pathname, hostname } = window.location;
    const ref = typeof document !== 'undefined' ? document.referrer : '';
    trackVisit(detectWebSource(search, ref, hostname), 'web', pathname);
    return;
  }
  trackVisit('app', Platform.OS === 'ios' ? 'ios' : 'android', '');
}
