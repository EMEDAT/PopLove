// components/live-love/LineUpScreens/NoMatchesScreen.tsx
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLineUp } from './LineUpContext';

const { width } = Dimensions.get('window');

export default function NoMatchesScreen() {
  const { setStep } = useLineUp();

  console.log("NoMatchesScreen rendering - Try Again button should navigate to selection");

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image 
          source={require('../../../assets/images/main/no-matches.png')} 
          style={styles.image}
          resizeMode="contain"
          defaultSource={require('../../../assets/images/main/no-matches.png')}
        />

        <Text style={styles.title}>No matches found</Text>
        
        <Text style={styles.description}>
          Your time in the spotlight is over, but no matches were found this time. 
          Don't worry, you can try again in the next round!
        </Text>
        
        <TouchableOpacity 
          style={styles.tryAgainButton}
          onPress={() => {
            console.log("Try Again button pressed - navigating to selection screen");
            setStep('selection');
          }}
        >
          <LinearGradient
            colors={['#EC5F61', '#F0B433']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: width * 0.85,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  image: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 24,
  },
  tryAgainButton: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});