// app/index.tsx
import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function Index() {
  useEffect(() => {
    try {
      console.log('Attempting navigation to signup');
      router.push('/(auth)/signup');
    } catch (error) {
      console.error('Navigation Error:', error);
    }
  }, []);
  
  
  // Simple static view with no images, no animations
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
  }
});