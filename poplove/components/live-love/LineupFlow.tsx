//live-love/LineupFlow.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthContext } from '../auth/AuthProvider';
import LineUpMode from './LineUpMode';


export default function LineupFlow() {
  const { user } = useAuthContext();
  
  if (!user) {
    return <View style={styles.container}><ActivityIndicator size="large" color="#FF6B6B" /></View>;
  }
  
  // Remove the LineUpProvider wrapper - use LineUpMode's wrapper instead
  return <LineUpMode onBack={() => {}} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
  },
});