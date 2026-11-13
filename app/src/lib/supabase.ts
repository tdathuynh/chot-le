import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { storage } from './local-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = createClient(
  supabaseUrl || 'https://chua-cau-hinh.supabase.co',
  supabaseKey || 'chua-cau-hinh',
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export const PHOTO_BUCKET = 'place-photos';

// Trên điện thoại: chỉ tự làm mới phiên đăng nhập khi app đang mở.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
