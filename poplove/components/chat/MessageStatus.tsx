// components/chat/MessageStatus.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',     // Single gray tick - sent from device
  DELIVERED = 'delivered', // Double gray tick - delivered to recipient device
  READ = 'read'      // Double blue tick - opened by recipient
}

interface MessageStatusProps {
  status: MessageStatus;
  size?: number;
}

export function MessageStatusIndicator({ status, size = 12 }: MessageStatusProps) {
  if (status === MessageStatus.SENDING) {
    return (
      <View style={styles.statusContainer}>
        <Ionicons name="time-outline" size={size} color="#aaa" />
      </View>
    );
  }
  
  if (status === MessageStatus.SENT) {
    return (
      <View style={styles.statusContainer}>
        <Ionicons name="checkmark" size={size} color="#aaa" />
      </View>
    );
  }
  
  if (status === MessageStatus.DELIVERED) {
    return (
      <View style={styles.doubleTickContainer}>
        <Ionicons name="checkmark" size={size} color="#aaa" style={styles.firstTick} />
        <Ionicons name="checkmark" size={size} color="#aaa" />
      </View>
    );
  }
  
  if (status === MessageStatus.READ) {
    return (
      <View style={styles.doubleTickContainer}>
        <Ionicons name="checkmark" size={size} color="#5B93FF" style={styles.firstTick} />
        <Ionicons name="checkmark" size={size} color="#5B93FF" />
      </View>
    );
  }
  
  return null;
}

const styles = StyleSheet.create({
  statusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  doubleTickContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  firstTick: {
    marginRight: -5,
  }
});