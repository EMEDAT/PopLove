import React from 'react';
import { TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function HapticTab(props) {
  console.log('[HapticTab] Rendering tab button');
  
  return (
    <TouchableOpacity
      {...props}
      onPress={(e) => {
        console.log('[HapticTab] Tab pressed');
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPress?.(e);
      }}
    />
  );
}