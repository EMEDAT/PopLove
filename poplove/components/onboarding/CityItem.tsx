// components/onboarding/CityItem.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CityItemProps {
  item: {
    name: string;
    country?: string; // Make country optional since your API might not include it
  };
  onSelect: (city: string) => void;
}

const CityItem = React.memo(({ item, onSelect }: CityItemProps) => {
  // If the item has a country field, it will be displayed
  // If not, just display the city name
  const displayName = item.country ? `${item.name}, ${item.country}` : item.name;
  
  return (
    <TouchableOpacity 
      style={styles.listItem}
      onPress={() => onSelect(item.name)}
    >
      <View style={styles.itemContent}>
        <Ionicons name="location-outline" size={16} color="#999" style={styles.icon} />
        <Text style={styles.listItemText}>{displayName}</Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  listItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 10,
  },
  listItemText: {
    fontSize: 16,
  },
});

export default CityItem;