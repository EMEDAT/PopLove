// poplove\app\(tabs)\matches.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MatchesScreen() {
  return (
    <View style={styles.container}>
      <Text>Matches Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
});
