import type { ComponentTheme } from '@/theme/types/theme';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

type AllStyle = {} & Record<string, ImageStyle | TextStyle | ViewStyle>;

const generateComponentStyles = ({
  backgrounds,
  fonts,
  layout,
}: ComponentTheme) => {
  return {
    buttonCircle: {
      ...layout.itemsCenter,
      ...backgrounds.tintColor,
      ...fonts.gray400,
      borderRadius: 20,
      height: 40,
      width: 40,
    },
    circle250: {
      borderRadius: 140,
      height: 250,
      width: 250,
    },
  } as const satisfies AllStyle;
};

export default generateComponentStyles;
