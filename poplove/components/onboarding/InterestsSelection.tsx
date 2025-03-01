// components/onboarding/InterestsSelection.tsx
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Switch
} from 'react-native';

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
  
  // All available interests
  const interests = [
    'Swimming',
    'Photography',
    'Shopping',
    'Karaoke',
    'Cooking',
    'K-Pop',
    'Table-Tennis',
    'Art',
    'Musics',
    'Video games',
    'Drinks',
    'Yoga',
    'Extreme sports',
    'Travels',
    'Gym',
    'Skin-care',
    'House parties',
    'Running'
  ];

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      onSelectInterests(selectedInterests.filter(item => item !== interest));
    } else {
      onSelectInterests([...selectedInterests, interest]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Select a few of your interests and let everyone know what you're passionate about.
      </Text>
      
      <View style={styles.interestsContainer}>
        {interests.map((interest) => {
          const isSelected = selectedInterests.includes(interest);
          
          return (
            <TouchableOpacity
              key={interest}
              onPress={() => toggleInterest(interest)}
              style={[
                styles.interestChip,
                isSelected ? styles.selectedChip : styles.unselectedChip
              ]}
            >
              <Text style={[
                styles.interestText,
                isSelected ? styles.selectedText : styles.unselectedText
              ]}>
                {interest}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      <View style={styles.dealBreakerContainer}>
        <View style={styles.dealBreakerTextContainer}>
          <Text style={styles.dealBreakerTitle}>Deal Breaker</Text>
          <Text style={styles.dealBreakerSubtitle}>
            don't match with people who don't align with your values
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
    fontSize: 18,
    marginTop: 20,
    marginBottom: 30,
    lineHeight: 24,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 30,
  },
  interestChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
    marginRight: 8,
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
    fontSize: 14,
  },
  selectedText: {
    color: '#FF6B6B',
  },
  unselectedText: {
    color: '#666',
  },
  dealBreakerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  dealBreakerTextContainer: {
    flex: 1,
  },
  dealBreakerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  dealBreakerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  }
});