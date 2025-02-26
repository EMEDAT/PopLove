// components/onboarding/CountryItem.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface CountryItemProps {
  item: {
    name: string;
    code: string;
  };
  onSelect: (name: string) => void;
}

const CountryItem = React.memo(({ item, onSelect }: CountryItemProps) => (
  <TouchableOpacity 
    style={styles.listItem}
    onPress={() => onSelect(item.name)}
  >
    <Text style={styles.listItemText}>{item.name}</Text>
  </TouchableOpacity>
));

const styles = StyleSheet.create({
  listItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  listItemText: {
    fontSize: 16,
  },
});

export default CountryItem;