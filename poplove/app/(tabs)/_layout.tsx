// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Log immediately when module loads
console.log('[DEBUG] Tabs layout module loading');

// Create custom tab component
function CustomTabButton(props) {
  console.log('[DEBUG] Rendering custom tab button', props?.children?.props?.label);
  try {
    return (
      <View style={{flex: 1}}>
        {props.children}
      </View>
    );
  } catch (error) {
    console.log('[DEBUG] Error in CustomTabButton:', error);
    return null;
  }
}

export default function TabsLayout() {
  console.log('[DEBUG] TabsLayout function executing');
  
  const insets = useSafeAreaInsets();
  console.log('[DEBUG] Safe area insets:', insets);
  
  // Create tab options with extensive logging
  const getScreenOptions = () => {
    console.log('[DEBUG] Creating screen options');
    try {
      return {
        headerShown: false,
        tabBarActiveTintColor: '#EC5F61',
        tabBarInactiveTintColor: '#161616',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 4,
          ffontWeight: '600' as const,
        },
        tabBarStyle: {
          height: 68 + insets.bottom,
          paddingTop: 2,
          paddingBottom: insets.bottom,
          backgroundColor: '#F2F1ED',
          borderTopWidth: 0,
          borderTopColor: '#F9F6F2',
        },
        // REMOVE THE CUSTOM TAB BUTTON - this is causing the issue
        // tabBarButton: (props) => <CustomTabButton {...props} />
      };
    } catch (error) {
      console.log('[DEBUG] Error creating screen options:', error);
      return {}; 
    }
  };

  // Extensive debug logging for each tab icon
  const renderHomeIcon = ({color, size}) => {
    console.log('[DEBUG] Rendering home icon');
    return <Ionicons name="home-outline" size={size} color={color} />;
  };

  const renderLiveLoveIcon = ({color, size}) => {
    console.log('[DEBUG] Rendering live love icon');
    return (
      <View style={styles.loveIconContainer}>
        <Ionicons name="heart-outline" size={size-4} color={color} style={styles.loveIcon} />
        <Ionicons name="heart" size={size-4} color="white" style={[styles.loveIcon, styles.overlappingIcon]} />
        <Ionicons name="heart-outline" size={size-4} color={color} style={[styles.loveIcon, styles.overlappingIcon]} />
      </View>
    );
  };

  console.log('[DEBUG] About to render Tabs');
  
  try {
    return (
      <Tabs
        screenOptions={getScreenOptions()}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: renderHomeIcon,
          }}
        />
        <Tabs.Screen
          name="live-love"
          options={{
            title: 'LiveLove',
            tabBarIcon: renderLiveLoveIcon,
          }}
        />  
        <Tabs.Screen
          name="favorites"
          options={{
            title: 'Favorites',
            tabBarIcon: ({color, size}) => <Ionicons name="star-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="matches"
          options={{
            title: 'Chats',
            tabBarIcon: ({color, size}) => <Ionicons name="chatbubble-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({color, size}) => <Ionicons name="person-outline" size={size} color={color} />,
          }}
        />
      </Tabs>
    );
  } catch (error: any) { // Add ": any" here
    console.log('[DEBUG] Error rendering Tabs:', error);
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text>Error loading tabs: {error.message}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  loveIconContainer: {
    width: 30,
    height: 24,
    position: 'relative',
  },
  loveIcon: {
    position: 'absolute',
    transform: [{ rotate: '-15deg' }],
    zIndex: 1,
    overflow: 'hidden',
  },
  overlappingIcon: {
    left: 6,
    top: 8,
    transform: [{ rotate: '15deg' }],
    zIndex: 2,
  },
});