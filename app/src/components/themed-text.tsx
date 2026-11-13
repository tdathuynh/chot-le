import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'display'
    | 'title'
    | 'subtitle'
    | 'default'
    | 'defaultBold'
    | 'small'
    | 'smallBold'
    | 'caption'
    | 'captionBold'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  display: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  default: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  defaultBold: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  small: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  smallBold: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  captionBold: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  link: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  linkPrimary: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' }) ?? '500',
    fontSize: 12,
  },
});
