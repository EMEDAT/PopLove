import React from 'react';
import { 
  View, 
  Image,
  StyleSheet
} from 'react-native';

interface WelcomeProps {
  onContinue: () => void;
}

export default function Welcome({ onContinue }: WelcomeProps) {
  return (
    <View style={styles.container}>
      <Image 
        source={require('../../assets/images/onboarding/Final_Onboard.png')}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});