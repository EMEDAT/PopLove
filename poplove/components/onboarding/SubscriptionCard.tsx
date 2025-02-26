// poplove\components\onboarding\SubscriptionCard.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type SubscriptionCardProps = {
  title: string;
  price: string;
  features: string[];
  isSelected: boolean;
  onSelect: () => void;
  isPremium?: boolean;
};

export function SubscriptionCard({
  title,
  price,
  features,
  isSelected,
  onSelect,
  isPremium = false
}: SubscriptionCardProps) {
  return (
    <TouchableOpacity 
      onPress={onSelect}
      style={[
        styles.card, 
        isSelected ? styles.selectedCard : styles.unselectedCard
      ]}
    >
      <View style={styles.headerContainer}>
        <Text style={[
          styles.title,
          isPremium ? styles.premiumTitle : styles.regularTitle
        ]}>
          {title}
        </Text>
        
        {isSelected && (
          <View style={styles.checkIcon}>
            <MaterialIcons name="check" size={18} color="white" />
          </View>
        )}
      </View>
      
      <Text style={styles.price}>
        {price}
      </Text>
      
      <View style={styles.featuresContainer}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <MaterialIcons name="check-circle" size={18} color="#FF6B6B" />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  selectedCard: {
    borderColor: '#FF6B6B',
  },
  unselectedCard: {
    borderColor: '#E5E5E5',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  premiumTitle: {
    color: '#FF6B6B',
  },
  regularTitle: {
    color: '#333',
  },
  checkIcon: {
    backgroundColor: '#FF6B6B',
    borderRadius: 9999,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  featuresContainer: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    marginLeft: 8,
    color: '#666',
  },
});