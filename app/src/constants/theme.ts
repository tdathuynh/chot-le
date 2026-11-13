import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1F1A17',
    background: '#FAF6F0',
    card: '#FFFFFF',
    backgroundElement: '#F3EEE6',
    backgroundSelected: '#E7DFD4',
    textSecondary: '#5E554B',
    textMuted: '#736859',
    tint: '#C94705',
    tintHover: '#CF4E07',
    tintSubtle: '#FFF2EB',
    tintText: '#FFFFFF',
    border: '#E8E1D7',
    cardBorder: '#EFE9E0',
    danger: '#D92D20',
    dangerSubtle: '#FEE4E2',
    success: '#067647',
    successSubtle: '#D1FADF',
    overlay: 'rgba(31, 26, 23, 0.45)',
  },
  dark: {
    text: '#F5F2EB',
    background: '#121110',
    card: '#1C1A17',
    backgroundElement: '#26221E',
    backgroundSelected: '#36302B',
    textSecondary: '#C2B8AC',
    textMuted: '#A89E92',
    tint: '#FF7A33',
    tintHover: '#FF8F52',
    tintSubtle: '#331F14',
    tintText: '#21140B',
    border: '#40382F',
    cardBorder: '#332D26',
    danger: '#F97066',
    dangerSubtle: '#3B1816',
    success: '#32D583',
    successSubtle: '#0F2E1E',
    overlay: 'rgba(0, 0, 0, 0.72)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    rounded: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 999,
} as const;

export const Shadows = {
  soft: {
    shadowColor: '#2C1D11',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  medium: {
    shadowColor: '#2C1D11',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  strong: {
    shadowColor: '#2C1D11',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 840;

/** Trên web, thanh tab nằm đè phía trên nội dung → chừa khoảng trống. */
export const WebTopInset = Platform.OS === 'web' ? 84 : 0;
