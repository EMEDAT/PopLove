// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#EC5F61',
        tabBarInactiveTintColor: '#141414',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 4,
          fontWeight: 900,
        },
        tabBarStyle: {
          height: 65 + insets.bottom,
          paddingTop: 5,
          paddingBottom: insets.bottom,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="love-actions"
        options={{
          title: 'Love',
          tabBarIcon: ({ color, size }) => (
            <View style={styles.loveIconContainer}>
              <Ionicons name="heart-outline" size={size-4} color={color} style={styles.loveIcon} />
              <Ionicons name="heart-outline" size={size-4} color={color} style={[styles.loveIcon, styles.overlappingIcon]} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="star-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loveIconContainer: {
    width: 30,
    height: 24,
    position: 'relative',
  },
  loveIcon: {
    position: 'absolute',
  },
  overlappingIcon: {
    left: 8,
  },
});