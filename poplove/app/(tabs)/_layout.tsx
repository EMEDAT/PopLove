// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#FF6B6B',
      headerShown: false 
    }}>
      <Tabs.Screen 
        name="index" 
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => 
            <Ionicons name="home" size={size} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="explore" 
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => 
            <Ionicons name="compass" size={size} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="matches" 
        options={{
          title: 'Matches',
          tabBarIcon: ({ color, size }) => 
            <Ionicons name="heart" size={size} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => 
            <Ionicons name="person" size={size} color={color} />
        }} 
      />
    </Tabs>
  );
}