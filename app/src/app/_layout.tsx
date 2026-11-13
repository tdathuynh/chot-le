import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';
import { AuthProvider } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
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
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Ăn Gì HCM' }} />
          <Stack.Screen name="place/[id]" options={{ headerShown: false, title: 'Chi tiết quán' }} />
          <Stack.Screen name="edit-place/[id]" options={{ headerShown: true, title: 'Thông tin quán' }} />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}
