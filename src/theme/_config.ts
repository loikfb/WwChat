import type { ThemeConfiguration } from '@/theme/types/config';

import { DarkTheme, DefaultTheme } from '@react-navigation/native';

export const enum Variant {
  DARK = 'dark',
}

const colorsLight = {
  gray100: '#DFDFDF',
  gray200: '#A1A1A1',
  gray400: '#4D4D4D',
  gray50: '#EFEFEF',
  gray800: '#303030',
  label: '#000000',
  placeholder: '#EFEFEF',
  primary: '#EFEFEF',
  purple100: '#E1E1EF',
  purple500: '#44427D',
  red500: '#C13333',
  secondary: '#DFDFDF',
  secondaryLabel: '#1B1A23',
  skeleton: '#A1A1A1',
  tintColor: '#FB5628',
} as const;

const colorsDark = {
  gray100: '#000000',
  gray200: '#BABABA',
  gray400: '#969696',
  gray50: '#EFEFEF',
  gray800: '#E0E0E0',
  label: '#FFFFFF',
  placeholder: '#EFEFEF',
  primary: '#0C1621',
  purple100: '#252732',
  purple500: '#A6A4F0',
  red500: '#C13333',
  secondary: '#172534',
  secondaryLabel: '#1B1A23',
  skeleton: '#303030',
  tintColor: '#FB5628',
} as const;

const sizes = [12, 16, 24, 32, 40, 80] as const;

export const config = {
  backgrounds: colorsLight,
  borders: {
    colors: colorsLight,
    radius: [4, 16],
    widths: [1, 2],
  },
  colors: colorsLight,
  fonts: {
    colors: colorsLight,
    sizes,
  },
  gutters: sizes,
  navigationColors: {
    ...DefaultTheme.colors,
    background: colorsLight.primary,
    card: colorsLight.secondary,
  },
  variants: {
    dark: {
      backgrounds: colorsDark,
      borders: {
        colors: colorsDark,
      },
      colors: colorsDark,
      fonts: {
        colors: colorsDark,
      },
      navigationColors: {
        ...DarkTheme.colors,
        background: colorsDark.primary,
        card: colorsDark.secondary,
      },
    },
  },
} as const satisfies ThemeConfiguration;
