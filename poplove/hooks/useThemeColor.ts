/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// Update this type definition to match your actual Colors structure
type ColorTheme = {
  background: { primary: string; secondary: string; tertiary: string; };
  brand: { primary: string; secondary: string; tertiary: string; };
  text: { primary: string; secondary: string; muted: string; light: string; };
  ui: any;
  gradients: any;
  system: any;
  special: any;
}

// Define the proper type for Colors that matches the expected structure
type ColorsType = {
  light: ColorTheme;
  dark: ColorTheme;
}

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof ColorTheme
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    // Cast Colors to the correct type
    return (Colors as unknown as ColorsType)[theme][colorName];
  }
}