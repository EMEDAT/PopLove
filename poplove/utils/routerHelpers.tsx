// utils/routerHelpers.tsx
import React, { useEffect } from 'react';
import { router } from 'expo-router';
import { useFocusEffect as useNavFocusEffect } from '@react-navigation/native';
import { Text, TouchableOpacity, TextProps, TouchableOpacityProps } from 'react-native';

// Create a custom Link component - since expo-router doesn't export it
export interface LinkProps extends TouchableOpacityProps {
  href: string;
  children: React.ReactNode;
}

export function Link({ href, children, style, ...props }: LinkProps) {
  return (
    <TouchableOpacity 
      onPress={() => router.push(href)}
      style={style}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
}

// Custom Redirect component that uses router.replace
export function Redirect({ href }: { href: string }) {
  useEffect(() => {
    router.replace(href);
  }, [href]);
  
  return null;
}

// Re-export useFocusEffect from React Navigation
export const useFocusEffect = useNavFocusEffect;

// Define the interface for search params
interface SearchParams {
  [key: string]: string | string[] | undefined;
  highlight?: string;
  feature?: string;
}

// Typed implementation of useLocalSearchParams
export function useLocalSearchParams(): SearchParams {
  // Return a typed object with potential properties
  return {} as SearchParams;
}