// hooks/useColorScheme.ts
import { useColorScheme as _useColorScheme } from 'react-native';

export function useColorScheme(): 'light' | 'dark' {
  // Get the native color scheme
  const colorScheme = _useColorScheme();
  
  // Return 'light' if colorScheme is null or undefined
  return colorScheme === 'dark' ? 'dark' : 'light';
}