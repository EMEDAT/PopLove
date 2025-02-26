// components/ui/GradientButton.tsx

import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, TouchableOpacityProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
}

export function GradientButton({ 
  title, 
  loading = false, 
  variant = 'primary', 
  disabled,
  style,
  ...props 
}: GradientButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        disabled && styles.disabled,
        style
      ]}
      disabled={disabled || loading}
      {...props}
    >
      <LinearGradient
        colors={variant === 'primary' ? ['#F0B433', '#EC5F61'] : ['#ffffff', '#ffffff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        locations={[0.3, 1]}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? 'white' : '#F0B433'} />
        ) : (
          <Text style={[
            styles.buttonText,
            variant === 'primary' ? styles.primaryText : styles.secondaryText
          ]}>
            {title}
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 56,
    borderRadius: 28, // Using 28 for rounded pill shape
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.5,
  },
  gradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  primaryText: {
    color: 'white',
  },
  secondaryText: {
    color: '#000',
  },
});