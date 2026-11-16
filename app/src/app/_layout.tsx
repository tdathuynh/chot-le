import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';
import { AuthProvider } from '@/lib/auth';
import { recordVisit } from '@/lib/visit';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useEffect(() => {
    recordVisit();
  }, []);
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[theme];

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AnimatedSplashOverlay />
        <Stack
          screenOptions={{
            headerBackTitle: 'Quay lại',
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.tint,
            headerTitleStyle: { color: colors.text, fontWeight: '700' },
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Chốt Lẹ' }} />
          <Stack.Screen name="place/[id]" options={{ headerShown: false, title: 'Chi tiết quán' }} />
          <Stack.Screen name="edit-place/[id]" options={{ headerShown: true, title: 'Thông tin quán' }} />
          <Stack.Screen name="vote/new" options={{ headerShown: true, title: 'Rủ hội bạn chọn quán' }} />
          <Stack.Screen name="vote/[id]" options={{ headerShown: true, title: 'Bình chọn quán' }} />
          <Stack.Screen name="suggest" options={{ headerShown: true, title: 'Gợi ý quán ngon' }} />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}
