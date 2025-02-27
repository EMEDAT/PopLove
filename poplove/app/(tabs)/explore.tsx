// app/(tabs)/explore.tsx
import React from 'react';
import { StyleSheet, Image, Platform, SafeAreaView, View, Text, ScrollView } from 'react-native';

export default function ExploreScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Explore</Text>
        </View>
        
        <Text style={styles.subtitle}>Discover new people nearby</Text>
        
        {/* Placeholder content - will be replaced with actual explore functionality */}
        <View style={styles.placeholderContent}>
          <Text style={styles.placeholderText}>
            Coming soon: Browse and discover new matches in your area!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
  },
  titleContainer: {
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  placeholderContent: {
    padding: 30,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
  },
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  }
});