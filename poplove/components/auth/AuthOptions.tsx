// components/auth/AuthOptions.tsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { EmailSignIn } from './EmailSignIn';

interface AuthOptionsProps {
  mode: 'signup' | 'login';
}

export const AuthOptions: React.FC<AuthOptionsProps> = ({ mode }) => {
  return (
    <View style={styles.container}>
      <EmailSignIn mode={mode} />
      {/* Google and Apple sign-in removed */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 16,
  },
});