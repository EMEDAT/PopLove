// components/onboarding/InterestsSelection.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Switch,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Import only categorizedInterests
import { categorizedInterests } from '../../utils/interests';

// Category button with gradient border
const CategoryButton = ({ title, isActive, onPress }) => {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={styles.categoryButtonContainer}
    >
      {isActive ? (
        <LinearGradient
          colors={['#EC5F61', '#F0B433']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBorder}
        >
          <View style={styles.categoryButtonInner}>
            <Text style={[styles.categoryText, styles.activeCategoryText]}>
              {title}
            </Text>
          </View>
        </LinearGradient>
      ) : (
        <View style={styles.inactiveCategoryButton}>
          <Text style={styles.categoryText}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

interface InterestsSelectionProps {
  selectedInterests: string[];
  onSelectInterests: (interests: string[]) => void;
  dealBreaker: boolean;
  onToggleDealBreaker: (value: boolean) => void;
}

export default function InterestsSelection({ 
  selectedInterests, 
  onSelectInterests,
  dealBreaker,
  onToggleDealBreaker
}: InterestsSelectionProps) {
  
  // State to track which category is active
  const [activeCategory, setActiveCategory] = useState<string>('outdoorActivities');
  
  // Category display names mapping
  const categoryNames = {
    outdoorActivities: 'Outdoor',
    sports: 'Sports',
    foodAndDrink: 'Food & Drink',
    artsAndCreative: 'Arts',
    entertainment: 'Entertainment',
    travel: 'Travel',
    lifestyle: 'Lifestyle', 
    social: 'Social',
    intellectual: 'Intellectual',
    digital: 'Digital'
  };
  
  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      onSelectInterests(selectedInterests.filter(item => item !== interest));
    } else {
      // Only add if we have less than 5 interests selected
      if (selectedInterests.length < 5) {
        onSelectInterests([...selectedInterests, interest]);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Select your interests
      </Text>
      <Text style={styles.subtitle}>
        Choose what you love so others can see what you're passionate about.
      </Text>
      
      {/* Category selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {Object.keys(categoryNames).map((category) => (
          <CategoryButton
            key={category}
            title={categoryNames[category]}
            isActive={activeCategory === category}
            onPress={() => setActiveCategory(category)}
          />
        ))}
      </ScrollView>
      
      {/* Interests section */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.interestsContainer}>
        {categorizedInterests[activeCategory].map((interest) => {
            const isSelected = selectedInterests.includes(interest);
            const isDisabled = !isSelected && selectedInterests.length >= 5;
            
            return (
              <TouchableOpacity
                key={interest}
                onPress={() => toggleInterest(interest)}
                disabled={isDisabled}
                style={[
                  styles.interestChip,
                  isSelected ? styles.selectedChip : isDisabled ? styles.disabledChip : styles.unselectedChip
                ]}
              >
                <Text style={[
                  styles.interestText,
                  isSelected ? styles.selectedText : isDisabled ? styles.disabledText : styles.unselectedText
                ]}>
                  {interest}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      
      {/* Selected interests counter */}
      <View style={styles.counterContainer}>
        <Text style={styles.counterText}>
          {selectedInterests.length} of 5 selected
        </Text>
      </View>
      
      <View style={styles.dealBreakerContainer}>
        <View style={styles.dealBreakerTextContainer}>
          <Text style={styles.dealBreakerTitle}>Deal Breaker</Text>
          <Text style={styles.dealBreakerSubtitle}>
            Turn on to avoid matching with people who don't align with these values
          </Text>
        </View>
        <Switch
          trackColor={{ false: '#E5E5E5', true: '#FF6B6B' }}
          thumbColor={dealBreaker ? '#fff' : '#fff'}
          ios_backgroundColor="#E5E5E5"
          onValueChange={onToggleDealBreaker}
          value={dealBreaker}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginTop: 10,
    marginBottom: 8,
    lineHeight: 24,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  categoryScroll: {
    maxHeight: 50,
    marginBottom: 16,
  },
  categoryContainer: {
    paddingRight: 20,
  },
  categoryButtonContainer: {
    marginRight: 8,
    height: 40,
  },
  gradientBorder: {
    borderRadius: 20,
    padding: 2,
    height: '100%',
  },
  categoryButtonInner: {
    backgroundColor: '#FFE4E4',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: '100%',
    justifyContent: 'center',
  },
  inactiveCategoryButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: '100%',
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 14,
    color: '#667185',
  },
  activeCategoryText: {
    color: '#FF6B6B',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    height: 220,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
    marginRight: 2,
    alignItems: 'center',
  },
  selectedChip: {
    backgroundColor: '#FFE4E4',
    borderColor: '#FF6B6B',
  },
  unselectedChip: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E5E5E5',
  },
  interestText: {
    fontSize: 13,
  },
  selectedText: {
    color: '#475367',
    fontWeight: '500',
  },
  unselectedText: {
    color: '#667185',
  },
  counterContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  counterText: {
    fontSize: 14,
    color: '#667185',
  },
  dealBreakerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  dealBreakerTextContainer: {
    flex: 1,
  },
  dealBreakerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#101928',
  },
  dealBreakerSubtitle: {
    fontSize: 12,
    color: '#667185',
    marginTop: 4,
  },
  disabledChip: {
    backgroundColor: '#F0F0F0',
    borderColor: '#DDDDDD',
    opacity: 0.6,
  },
  disabledText: {
    color: '#AAAAAA',
  },
});