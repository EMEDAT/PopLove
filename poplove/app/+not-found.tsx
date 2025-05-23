// poplove\app\+not-found.tsx
import { Link } from '../utils/routerHelpers';
import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <ThemedText type="title" style={styles.title}>This screen doesn't exist.</ThemedText>
        <Link href="/" style={styles.link}>
          <ThemedText type="link">Go to home screen!</ThemedText>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    marginBottom: 15,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});