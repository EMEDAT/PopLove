import React from 'react';
import { 
  ImageBackground, 
  StyleSheet, 
  View, 
  ViewProps 
} from 'react-native';
import { SplashImage } from '../../app/(onboarding)/splash';

export const AuthBackground: React.FC<ViewProps> = ({ children, style, ...props }) => (
  <ImageBackground
    source={SplashImage}
    style={[styles.background, style]}
    resizeMode="cover"
  >
    {children}
  </ImageBackground>
);

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  }
});